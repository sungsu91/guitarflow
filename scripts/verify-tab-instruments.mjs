import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {qualityBrowser} from './quality-runtime.mjs';
import {createServer} from 'vite';
const fixture=process.env.TAB_INSTRUMENT_FIXTURES??'artifacts/ocr-instruments-20261005',out=process.env.TAB_INSTRUMENT_OUTPUT??fixture,manifest=JSON.parse(await readFile(`${fixture}/manifest.json`));await mkdir(out,{recursive:true});
const server=process.env.QUALITY_BASE_URL?null:await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,strictPort:true,open:false}});
await server?.listen();
const origin=process.env.QUALITY_BASE_URL??`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await qualityBrowser(),reports=[];
try{for(const item of manifest.cases){
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__instrument-import',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`${origin}/__instrument-import`);
 const ext=item.path.split('.').at(-1);
 await page.locator('input').setInputFiles({name:`${randomUUID()}.${ext}`,mimeType:ext==='pdf'?'application/pdf':ext==='png'?'image/png':'image/jpeg',buffer:await readFile(item.path)});
 try{
 const data=await page.evaluate(async ({target,scanning})=>{
  const file=document.querySelector('input').files[0],options={target,sourceMode:'tab',signal:AbortSignal.timeout(180000)};let analysis;
  if(file.name.endsWith('.pdf'))analysis=await(await import('/src/pdf/tab-import/importPdfTab.js')).importPdfTab(file,options);
  else{const m=await import('/src/pdf/tab-import/photoBatch.js');analysis=await m.importPhotoBatch([await m.preparePhoto(file,{scan:scanning})],options);}
  const doc=(await import('/src/pdf/tab-import/scoreAdapter.js')).analysisToDocument(analysis),compiled=(await import('/src/etudes/scoreModel.js')).compileDocumentV2(doc);
  return {analysis,doc,compileErrors:compiled.errors};
 },{target:item.target,scanning:process.env.PHOTO_SCAN==='1'});
 await writeFile(`${out}/${item.id}-analysis.json`,JSON.stringify(data.analysis));
 const actual=data.analysis.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures)),report={id:item.id,bars:actual.length,correct:0,missing:0,unflaggedMissing:0,wrong:0,rhythm:0,errors};
 for(const [b,expected] of item.bars.entries()){
  const m=actual[b];let exact=m?.slots.length===expected.events.length;
  for(const [i,e] of expected.events.entries()){
   const slot=m?.slots[i],notes=slot?.notes.filter(n=>n.status==='confirmed')??[];
   if(slot?.duration!==e.duration||slot?.dotted||slot?.tuplet)exact=false;
   for(const n of e.notes){if(notes.some(a=>a.string===n.string&&a.fret===n.fret))report.correct++;else{report.missing++;if(slot?.status!=='unresolved')report.unflaggedMissing++;}}
   for(const n of notes)if(!e.notes.some(a=>a.string===n.string&&a.fret===n.fret))report.wrong++;
  }
  if(exact)report.rhythm++;
 }
 report.chords=actual.map(m=>m.harmonyChanges?.[0]?.name??null);
 assert.deepEqual(report.chords,['Em','A','D','B7']);
 assert.equal(data.doc.instrument,item.target.instrument);assert.deepEqual(data.doc.tuning,item.target.tuning);assert.deepEqual(data.compileErrors,[]);assert.deepEqual(errors,[]);
 reports.push(report);console.log(JSON.stringify(report));
 }catch(e){reports.push({id:item.id,error:e.message,errors});console.error(item.id,e.message);}finally{await page.close();await writeFile(`${out}/bass-results.json`,JSON.stringify(reports,null,2));}
}}finally{await browser.close();await server?.close();}
// Exact digital/PNG inputs are the accuracy gate. Lossy photos also require
// every uncertain position to stay explicitly reviewable, never silently drop.
assert(reports.every(r=>!r.error&&r.bars===4&&r.wrong===0&&r.unflaggedMissing===0&&(r.id.endsWith('-jpg')||r.missing===0)&&r.rhythm===4),JSON.stringify(reports));
