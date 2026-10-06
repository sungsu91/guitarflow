import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out=process.env.GRAND_LIVE_OUT??'artifacts/grand-color-20261006/live';await mkdir(out,{recursive:true});
const sources=JSON.parse(await readFile('artifacts/present-check-20261006/sources.json'));
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();const browser=await qualityBrowser();
try{for(const source of sources.filter(s=>s.id===(process.argv[2]??'now'))){
 const page=await browser.newPage();await page.route('**/__grand-live',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__grand-live`);await page.locator('input').setInputFiles(source.path);await page.exposeFunction('progress',p=>console.log(JSON.stringify(p)));
 const result=await page.evaluate(async()=>{
  const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js'),{analysisToDocument}=await import('/src/pdf/tab-import/scoreAdapter.js'),{compileDocumentV2}=await import('/src/etudes/scoreModel.js');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1200000),start=performance.now();
  try{const analysis=await importPdfTab(document.querySelector('input').files[0],{sourceMode:'grand',target:{instrument:'piano'},signal:controller.signal,onProgress:p=>window.progress(p)}),doc=analysisToDocument(analysis),compiled=compileDocumentV2(doc);return {ms:performance.now()-start,analysis,document:doc,errors:compiled.errors};}
  catch(e){return {ms:performance.now()-start,error:e.message,pianoReadings:e.pianoReadings};}finally{clearTimeout(timer);}
 });await writeFile(`${out}/${source.id}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({source:source.id,ms:result.ms,error:result.error,errors:result.errors,bars:result.document?.measures.length}));await page.close();
}}finally{await browser.close();await server.close();}
