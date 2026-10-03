// Compare the same inputs with the added chord pass enabled/disabled. The
// baseline route changes only that pass, without touching the user's checkout.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const origin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174';
const out='artifacts/chord-regression-audit/differential';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const musical=d=>({meter:d.meter,key:d.keySignature,tuning:d.tuning,capo:d.capo,measures:d.measures.map(m=>({meter:m.meter,review:m.pdfImport?.needsReview,rhythm:m.pdfImport?.rhythmVerified,events:m.events.map(e=>({onset:e.onset,duration:e.duration,dotted:e.dotted??false,tuplet:e.tuplet?{actualNotes:e.tuplet.actualNotes,normalNotes:e.tuplet.normalNotes}:null,rest:e.rest,blank:e.blank,notes:e.notes.map(n=>({string:n.string,fret:n.fret,dead:n.dead??false,midi:n.midi,unplaced:n.unplaced??false})),status:e.pdfImport?.status}))}))});
const fingerprint=d=>createHash('sha256').update(JSON.stringify(musical(d))).digest('hex');
const results=[];
async function run(file,mode='current'){
 const page=await browser.newPage(),errors=[];let routed=0;
 page.on('pageerror',e=>errors.push(e.message));
 if(mode==='without-chords')await page.route('**/src/pdf/tab-import/geometry.worker.js*',async route=>{
  const response=await route.fetch(),body=await response.text();
  const replaced=body.replace(/result\.chordRegions\s*=\s*chordRegions\([^;\n]+;/,'result.chordRegions=[];');
  assert.notEqual(replaced,body);routed++;await route.fulfill({response,body:replaced});
 });
 if(mode==='geometry-failure')await page.route('**/src/pdf/tab-import/chordGeometry.js*',async route=>{
  const response=await route.fetch(),body=await response.text();
  const replaced=body.replace(/export function chordRegions\([^\n]+\{/,match=>match+"throw Error('Injected chord crop failure');");
  assert.notEqual(replaced,body);routed++;await route.fulfill({response,body:replaced});
 });
 if(mode==='ocr-failure')await page.route('**/src/pdf/tab-import/chordRecognition.js*',async route=>{
  const response=await route.fetch(),body=await response.text();
  const replaced=body.replace(/export async function recognizePageChords\([^\n]+\{/,match=>match+"throw Error('Injected chord OCR failure');");
  assert.notEqual(replaced,body);routed++;await route.fulfill({response,body:replaced});
 });
 await page.route('**/__chord-regression',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><input type="file">'}));
 await page.goto(`${origin}/__chord-regression`);
 await page.evaluate(()=>{window.workers=[];const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(...args){super(...args);window.workers.push(this);}terminate(){this.closed=true;return super.terminate();}};});
 await page.locator('input').setInputFiles(file);const start=Date.now();
 try{
  const result=await page.evaluate(async mode=>{
   const controller=new AbortController();
   if(mode==='cancel'){
    const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(...args){super(...args);if(String(args[0]).includes('worker.min.js'))setTimeout(()=>controller.abort(),25);}};
   }
   const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js');
   try{return {analysis:await importPdfTab(document.querySelector('input').files[0],{sourceMode:'tab',autoZoom:false,signal:controller.signal})};}
   catch(error){return {error:error.message,name:error.name};}
  },mode);
  const liveWorkers=await page.evaluate(()=>window.workers.filter(w=>!w.closed).length);
  assert.equal(liveWorkers,0);assert.deepEqual(errors,[]);
  if(mode!=='current'&&mode!=='cancel')assert(routed>0);
  return {...result,seconds:(Date.now()-start)/1000,liveWorkers};
 }finally{await page.close();}
}
try{
 const manifest=JSON.parse(await readFile('artifacts/pdf-tab-corpus/manifest.json'));
 const ids=process.env.CHORD_AUDIT_ALL?manifest.cases.map(c=>c.id):['helvetica-native','helvetica-200dpi','helvetica-75dpi','helvetica-blur','times-roman-native','courier-110dpi','faint-rhythm','upward-holdout'];
 for(const item of manifest.cases.filter(c=>!process.env.CHORD_AUDIT_FAULTS_ONLY&&ids.includes(c.id))){
  const before=await run(item.path,'without-chords'),after=await run(item.path);
  assert.equal(before.error,undefined);assert.equal(after.error,undefined);
  const bd=analysisToDocument(before.analysis),ad=analysisToDocument(after.analysis);
  await writeFile(`${out}/${item.id}.json`,JSON.stringify(after.analysis));
  assert.deepEqual(musical(ad),musical(bd),`${item.id}: note/rhythm regression`);
  assert.equal(ad.measures.flatMap(m=>m.harmonyChanges??[]).length,0,`${item.id}: false chord`);
  const report={id:item.id,passed:true,sameMusic:true,fingerprint:fingerprint(ad),bars:ad.measures.length,confirmed:after.analysis.summary.confirmed,review:after.analysis.summary.needsReview,beforeSeconds:before.seconds,afterSeconds:after.seconds};
  results.push(report);console.log(JSON.stringify(report));await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
 }
 const file=manifest.cases.find(c=>c.id==='helvetica-native').path;
 const baseline=await run(file,'without-chords');
 for(const mode of ['ocr-failure','geometry-failure','cancel']){
  const result=await run(file,mode);
  if(mode==='cancel')assert.equal(result.name,'AbortError');
  else{
   assert.equal(result.error,undefined,`${mode}: chord errors must not break note import`);
   assert.deepEqual(musical(analysisToDocument(result.analysis)),musical(analysisToDocument(baseline.analysis)));
   assert(result.analysis.pages.every(p=>p.staffs.every(s=>s.measures.every(m=>m.harmonyReview))));
  }
  const report={id:mode,passed:true,liveWorkers:result.liveWorkers,seconds:result.seconds};results.push(report);console.log(JSON.stringify(report));
 }
}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));}

const previous='artifacts/chord-regression-audit/before-chord-document.json',current='artifacts/chord-regression-audit/real-photos/converted-document.json';
const before=JSON.parse(await readFile(previous)),after=JSON.parse(await readFile(current));
assert.deepEqual(musical(after),musical(before),'Actual two-photo score changed its music after adding chords');
const report={passed:true,bars:after.measures.length,notes:after.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).length,sameMusic:true,fingerprint:fingerprint(after),chordNames:after.measures.flatMap(m=>m.harmonyChanges??[]).length,reviewBars:after.measures.flatMap((m,i)=>m.harmonyReview||m.harmonyChanges?.some(c=>c.needsReview)?[i+1]:[])};
await writeFile('artifacts/chord-regression-audit/real-photo-comparison.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
