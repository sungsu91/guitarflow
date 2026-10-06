// Real-source challenge runner. Oracles stay in Node and are never sent to OCR.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
import {assessExternalBars} from './assess-external-score.mjs';
const [manifestPath='artifacts/external-ocr-20261005/manifest.json',out='artifacts/external-ocr-20261005/before',...selection]=process.argv.slice(2);
const manifest=JSON.parse(await readFile(manifestPath));
const items=manifest.cases.filter(c=>!selection.length||selection.some(s=>c.id===s||c.group===s));
if(!items.length)throw Error('Empty challenge selection');
await mkdir(out,{recursive:true});
await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2));
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,strictPort:true,open:false}});
let browser;
const reports=[];
try{
 if(!process.env.RESCORE){await server.listen();browser=await qualityBrowser();}
 const url=browser?`http://127.0.0.1:${server.httpServer.address().port}`:null;
 for(const item of items){
  if(process.env.RESCORE){
   const saved=JSON.parse(await readFile(`${out}/${item.id}.json`));
   const bars=saved.analysis?.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures))??[];
   saved.report={...saved.report,...assessExternalBars(bars,manifest.oracles?.[item.oracle])};
   await writeFile(`${out}/${item.id}.json`,JSON.stringify(saved));reports.push(saved.report);continue;
  }
  const page=await browser.newPage(),pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await page.route('**/__external-test',r=>r.fulfill({contentType:'text/html',body:'<input id="file" type="file" multiple>'}));
  await page.goto(`${url}/__external-test`);
  await page.addScriptTag({content:`window.testWorkers=[];const W=window.Worker;window.Worker=class extends W{constructor(...args){super(...args);window.testWorkers.push(this)}terminate(){this.closed=true;return super.terminate()}}`});
  await page.locator('#file').setInputFiles(await Promise.all((item.paths??[item.path]).map(async p=>({name:`${randomUUID()}.${p.split('.').at(-1)}`,mimeType:p.endsWith('.pdf')?'application/pdf':p.endsWith('.png')?'image/png':'image/jpeg',buffer:await readFile(p)}))));
  const start=Date.now();
  const result=await page.evaluate(async item=>{
   const options={sourceMode:item.mode??'tab',signal:AbortSignal.timeout(item.timeout??240000)};
   const {analysisToDocument}=await import('/src/pdf/tab-import/scoreAdapter.js'),{compileDocumentV2}=await import('/src/etudes/scoreModel.js'),{analysisPartOptions}=await import('/src/pdf/tab-import/photoParts.js');
   try{
    const files=[...document.querySelector('#file').files];let analysis;
    if(item.image){const {preparePhoto,importPhotoBatch}=await import('/src/pdf/tab-import/photoBatch.js');const photos=[];for(const file of files)photos.push(await preparePhoto(file,{signal:options.signal,scan:item.scanning===true}));analysis=await importPhotoBatch(photos,options);}
    else {const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js');analysis=await importPdfTab(files[0],options);}
    try{
     const parts=analysisPartOptions(analysis);
     if(parts.length){const documents=parts.map(part=>{try{return {part,document:analysisToDocument(analysis,{part})};}catch(e){return {part,error:e.message};}});return {analysis,documents,compileErrors:documents.filter(d=>d.document).flatMap(d=>compileDocumentV2(d.document).errors)};}
     const doc=analysisToDocument(analysis);return {analysis,document:doc,compileErrors:compileDocumentV2(doc).errors};
    }catch(e){return {analysis,conversionError:e.message,compileErrors:[e.message]};}
   }catch(e){return {error:e.message,name:e.name};}
  },{image:item.image,mode:item.mode,timeout:item.timeout,scanning:item.scanning});
  const liveWorkers=await page.evaluate(()=>window.testWorkers.filter(w=>!w.closed).length);
  const bars=result.analysis?.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures))??[];
  const audit=manifest.oracles?.[item.oracle];
  const report={id:item.id,group:item.group,seconds:(Date.now()-start)/1000,error:result.error,summary:result.analysis?.summary,detectedBars:bars.length,expectedBars:item.expectedBars,barCountCorrect:item.expectedBars==null?null:bars.length===item.expectedBars,auditScope:audit?'sampled-events':item.expectedBars==null?'unlabeled':'bar-count-only',compileErrors:result.compileErrors,liveWorkers,pageErrors,...assessExternalBars(bars,audit),expectedError:!!item.expectedError};
  await writeFile(`${out}/${item.id}.json`,JSON.stringify({...result,report}));reports.push(report);
  await writeFile(`${out}/report.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify({...report,failures:report.failures.length}));await page.close();
 }
}finally{await writeFile(`${out}/report.json`,JSON.stringify(reports,null,2));await browser?.close();await server.close();}
// Adverse inputs can fail recognition; leaked workers or browser errors are always bugs.
if(reports.some(r=>r.liveWorkers||r.pageErrors.length||r.expectedError&&!r.error))process.exitCode=1;
