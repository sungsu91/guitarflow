import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out='work/multi-instrument-audit';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const url=process.env.AUDIT_URL??'http://127.0.0.1:5174/';
const reports=[];
const click=(p,name)=>p.getByRole('button',{name,exact:true}).first().click();
async function save(p,width){await click(p,width<600?'악보 저장':'이 브라우저에 저장');await click(p,'저장하기');return p.evaluate(()=>window.auditSaved);}
async function verify(p){
 const result=await p.evaluate(async()=>{const {compileDocumentV2}=await import('/src/etudes/scoreModel.js');const {scoreTimeline}=await import('/src/etudes/scorePlayback.js');const r=compileDocumentV2(window.auditSaved);return {errors:r.errors,issues:r.issues,events:r.score?scoreTimeline(r.score).events.map(e=>({midi:e.midi,time:e.time,duration:e.duration})):[]};});
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.issues,[]);
 assert.equal(await p.getByText(/이 마디를 표시하지 못했습니다/).count(),0);return result;
}
async function strings(p,count){
 const actual=await p.locator('[data-bar-index="0"] [data-mode="tab"][data-string]').evaluateAll(es=>[...new Set(es.map(e=>Number(e.dataset.string)))].sort((a,b)=>a-b));
 assert.deepEqual(actual,Array.from({length:count},(_,i)=>i+1));
}
try{
 for(const width of [1440,390,360])for(const instrument of ['bass','bass5','ukulele','drums','piano']){
  console.log('START',width,instrument);
  const p=await browser.newPage({viewport:{width,height:width<600?844:1000},hasTouch:width<600}),errors=[];
  p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url);await p.evaluate(async({width,instrument})=>(await import('/scripts/instrument-audit-fixture.jsx')).mount(width,instrument==='bass5'?'bass':instrument),{width,instrument});
  await p.locator('[data-draw-count]').first().waitFor();
  const canvas=p.locator('[data-score-input]');
  if(['bass','bass5','ukulele'].includes(instrument)){
   if(instrument==='bass5'){
    await click(p,'표준 튜닝 ▾');await click(p,'5현 베이스');await strings(p,5);
    await click(p,'실행 취소');await strings(p,4);await click(p,'다시 실행');await strings(p,5);
   }
   const count=instrument==='bass5'?5:4;await strings(p,count);
   await click(p,'8분음표');
   // Actual keypad entry: a two-string chord in every eighth-note slot.
   for(let i=0;i<8;i++){
    for(const string of [count,1]){
     await p.locator(`[data-bar-index="0"] .etudeEditorHit[data-mode="tab"][data-event="${i}"][data-string="${string}"]`).first().click();
     await click(p,'프렛 0');
    }
    await click(p,'다음 입력 위치');
   }
   let d=await save(p,width);fs.writeFileSync(`${out}/${instrument}-${width}-document.json`,JSON.stringify(d,null,2));
   assert.equal(d.measures[0].events.length,8);
   for(const [i,e] of d.measures[0].events.entries()){assert.equal(e.onset,i*240);assert.equal(e.notes.length,2);assert.deepEqual(e.notes.map(n=>n.midi).sort((a,b)=>a-b),[d.tuning[count-1],d.tuning[0]].sort((a,b)=>a-b));}
   await verify(p);
   // A repeated input edits the selected string without inserting a duplicate.
   await p.locator('[data-bar-index="0"] .etudeNoteHandle[data-mode="tab"][data-event="0"][data-string="1"]').first().click();await click(p,'프렛 0');
   d=await save(p,width);assert.equal(d.measures[0].events[0].notes.length,2);
   if(instrument==='bass5')assert.equal(d.measures[0].events[0].notes.find(n=>n.string===5).midi,23);
  }else if(instrument==='drums'){
   await click(p,'8분음표');
   for(let i=0;i<8;i++){
    await click(p,'하이햇 닫힘');
    if(i%4===0)await click(p,'킥');if(i%4===2)await click(p,'스네어');
    await click(p,'다음 입력 위치');
   }
   const d=await save(p,width);assert.equal(d.measures[0].events.length,8);
   d.measures[0].events.forEach((e,i)=>{assert.equal(e.onset,i*240);assert.deepEqual(e.notes.map(n=>n.midi).sort(),(i%4===0?[36,42]:i%4===2?[38,42]:[42]).sort());});
   assert.equal(await p.locator('[data-mode="tab"]').count(),0);
  }else{
   await click(p,'8분음표');for(const key of ['C4','C4','D4','E4'])await click(p,key);
   await click(p,'화음 입력');for(const key of ['C4','E4','G4','C4'])await click(p,key);await click(p,'화음 입력');
   await p.locator('.scorePitchInput').getByRole('button',{name:'쉼표',exact:true}).click();
   await click(p,'A4');await click(p,'B4');
   await click(p,'2분음표');await click(p,'C3');await click(p,'G3');
   const d=await save(p,width),right=d.measures[0].events.filter(e=>e.voice==='right'),left=d.measures[0].events.filter(e=>e.voice==='left');
   assert.equal(right.length,8);assert.deepEqual(right.map(e=>e.onset),[0,240,480,720,960,1200,1440,1680]);
   assert.deepEqual(right[4].notes.map(n=>n.midi),[60,64,67]);assert(right[5].rest&&!right[5].blank);
   assert.deepEqual(left.map(e=>[e.onset,e.duration,e.notes[0]?.midi]),[[0,'2',48],[960,'2',55]]);
   assert.equal(await p.locator('[data-mode="tab"]').count(),0);
   assert.equal(await p.locator('.scorePianoKeys [aria-pressed="true"]').count(),0);
  }
  const saved=await save(p,width),compiled=await verify(p);
  await p.screenshot({path:`${out}/${instrument}-${width}.png`});
  // Re-open the actual saved library document and compare every field.
  await p.evaluate(async({width,instrument})=>(await import('/scripts/instrument-audit-fixture.jsx')).mount(width,instrument==='bass5'?'bass':instrument,true),{width,instrument});
  await p.locator('[data-draw-count]').first().waitFor();assert.deepEqual(await save(p,width),saved);await verify(p);
  if(instrument==='bass5')await strings(p,5);
  // Audition/playback must start and stop through the real editor controls.
  await canvas.focus();await canvas.press('Home');await click(p,'악보 재생');await p.getByRole('button',{name:'악보 재생 정지',exact:true}).waitFor();await click(p,'악보 재생 정지');
  if(width===1440&&['bass5','piano','drums'].includes(instrument)){
   await click(p,'PDF 저장');const print=p.locator('.print-preview-overlay');await print.locator('svg').first().waitFor();
   assert.equal(await print.getByText(/이 마디를 표시하지 못했습니다/).count(),0);
   await p.screenshot({path:`${out}/${instrument}-print.png`});await p.keyboard.press('Escape');
  }
  assert.deepEqual(errors,[]);reports.push({width,instrument,measures:saved.measures.length,notes:saved.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).length,playbackEvents:compiled.events.length,errors});
  console.log('PASS',width,instrument);await p.close();
 }
 fs.writeFileSync(`${out}/results.json`,JSON.stringify(reports,null,2));
}finally{await browser.close();}
