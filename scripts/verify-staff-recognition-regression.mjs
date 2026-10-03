import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const name=process.env.STAFF_SCORE_NAME??'Let_It_Be(코드)',out=process.env.STAFF_REGRESSION_OUTPUT??'artifacts/let-it-be-ocr/live';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__staff-live',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><input type="file" multiple>'}));
 const before=(await readFile('artifacts/let-it-be-ocr/staffTokens-before.js','utf8')).replaceAll("'../etudes/","'/src/etudes/").replace("'./staffPitch.js'","'/src/omr/staffPitch.js'");
 await page.route('**/__beforeStaffTokens.js',r=>r.fulfill({contentType:'application/javascript',body:before}));
 await page.goto('http://127.0.0.1:5174/__staff-live');await page.locator('input').setInputFiles([1,2].map(n=>`C:/Users/User/Desktop/sheet music/${name}_페이지_${n}.jpg`));
 await page.exposeFunction('auditProgress',value=>console.log(JSON.stringify(value)));
 const start=Date.now(),result=await page.evaluate(async()=>{
  const {loadTabImage,importImageTab}=await import('/src/pdf/tab-import/imageTabSource.js');
  const {createTabPageAnalyzer}=await import('/src/pdf/tab-import/analyzeTabPage.js');
  const {analysisToDocument}=await import('/src/pdf/tab-import/scoreAdapter.js');
  const {summarizeAnalysis}=await import('/src/pdf/tab-import/recognition.js');
  const {parseStaffTokens,staffSystemToAnalysis}=await import('/__beforeStaffTokens.js');
  const {compileDocumentV2}=await import('/src/etudes/scoreModel.js');
  const {scorePlaybackReadiness}=await import('/src/etudes/scorePlaybackReadiness.js');
  const analyzer=createTabPageAnalyzer(),pages=[];let context={meter:[4,4],key:'C'},previous=[];
  try{for(const [index,file] of [...document.querySelector('input').files].entries()){
   const source=await loadTabImage(file);
   try{const a=await importImageTab(source,{analyzer,pageNumber:index+1,sourceMode:'staff',onProgress:p=>window.auditProgress({page:index+1,progress:p.progress})});pages.push(...a.pages);}
   finally{source.close();}
  }}finally{await analyzer.close();}
  const originalPages=pages.map(page=>({...page,staffs:page.staffs.map(staff=>{
   const parsed=parseStaffTokens(staff.notation.retry?.originalRaw??staff.notation.raw,context);context={meter:parsed.meter,key:parsed.key};
   const converted=staffSystemToAnalysis(parsed,{system:{id:staff.id,rect:staff.notation.rect,staff},page:page.page,width:page.width,height:page.height,previous});previous=converted.previous;return converted.staff;
  })}));
  const convert=ps=>analysisToDocument({fileName:document.querySelector('input').files[0].name,sourceType:'image',pages:ps,summary:summarizeAnalysis(ps)});
  const after=convert(pages),before=convert(originalPages),stats=d=>{const compiled=compileDocumentV2(d),ready=scorePlaybackReadiness(d,compiled);return {measures:d.measures.length,notes:d.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).length,gaps:d.measures.flatMap(m=>m.events).filter(e=>e.blank).length,completeRhythm:d.measures.filter(m=>m.pdfImport.rhythmVerified).length,rests:d.measures.flatMap(m=>m.events).filter(e=>e.rest&&!e.blank).length,errors:compiled.errors,playable:ready.allowed,mutedBars:(ready.mutedMeasures??[]).map(n=>n+1)};};
  return {before,after,stats:{before:stats(before),after:stats(after)},systems:pages.flatMap(p=>p.staffs.map(s=>({page:p.page,staff:s.id,...s.notation}))),chords:after.measures.map(m=>({harmony:m.harmony,changes:m.harmonyChanges}))};
 });
 await writeFile(`${out}/after.json`,JSON.stringify(result.after,null,2));await writeFile(`${out}/before.json`,JSON.stringify(result.before,null,2));
 await writeFile(`${out}/systems.json`,JSON.stringify(result.systems,null,2));
 assert.equal(result.stats.before.measures-result.stats.after.measures,result.systems.reduce((sum,s)=>sum+(s.barCountRetry?.accepted?s.barCountRetry.originalCount-s.barCountRetry.sourceCount:0),0));assert.deepEqual(result.stats.after.errors,[]);assert.equal(result.stats.after.playable,true);
 assert(result.stats.after.gaps<=result.stats.before.gaps);assert(result.stats.after.completeRhythm>=result.stats.before.completeRhythm);
 const sameRow=(a,b)=>a.pdfImport.source.page===b.pdfImport.source.page&&a.pdfImport.source.staff===b.pdfImport.source.staff;
 for(const [i,m] of result.before.measures.entries()){const beforeRow=result.before.measures.filter(b=>sameRow(m,b)),afterRow=result.after.measures.filter(b=>sameRow(m,b)),next=afterRow[beforeRow.indexOf(m)];if(beforeRow.length!==afterRow.length)continue;if(m.pdfImport.rhythmVerified&&!m.events.some(e=>e.notes.length>1)&&!next.events.some(e=>e.rhythmSlash)){
  const shape=b=>b.events.map(e=>({rest:e.rest,blank:e.blank,duration:e.duration,dotted:!!e.dotted,onset:e.onset,pitches:e.notes.map(n=>n.source.writtenMidi)}));
  assert.deepEqual(shape(next),shape(m),`previously complete bar ${i+1}`);
 }
 }
 if(name.startsWith('Let_It_Be')){
  const shape=b=>b.events.map(e=>[e.notes[0]?.source.writtenMidi,e.duration,!!e.dotted]);
  assert.deepEqual(shape(result.after.measures[8]),[[67,'16',false],[67,'8',true],[69,'8',false],[72,'16',false],[67,'16',false],[67,'16',false],[67,'8',true],[72,'16',false],[74,'8',true]]);
  assert.deepEqual(shape(result.after.measures[9]),[[74,'16',false],[76,'8',true],[76,'8',true],[74,'16',false],[74,'16',false],[72,'16',false],[72,'8',false],[72,'4',false]]);
 }
 assert.deepEqual(errors,[]);
 const report={passed:true,name,seconds:(Date.now()-start)/1000,...result.stats,retriedSystems:result.systems.filter(s=>s.retry).map(s=>({page:s.page,staff:s.staff,acceptedMeasures:s.retry.acceptedMeasures})),errors};
 await writeFile(`${out}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
