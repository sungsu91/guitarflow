import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out='artifacts/ocr-instruments-20261005',base='http://127.0.0.1:5174';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{
 const fixture=await browser.newPage();await fixture.goto(base);
 await fixture.evaluate(async()=>{
  const {default:VF}=await import('/node_modules/vexflow/build/esm/entry/vexflow.js');document.querySelectorAll('style,link[rel=stylesheet]').forEach(n=>n.remove());document.body.innerHTML='<div id="score"></div>';document.body.style.cssText='margin:0;background:white;color:black';
  const f=VF.Flow??VF,r=new f.Renderer(document.getElementById('score'),f.Renderer.Backends.SVG);r.resize(800,230);const c=r.getContext(),s=new f.Stave(30,60,740).addClef('bass').addTimeSignature('4/4').setContext(c);s.draw();
  const v=new f.Voice({num_beats:4,beat_value:4}).addTickables(['g/2','a/2','b/2','d/3'].map(k=>new f.StaveNote({clef:'bass',keys:[k],duration:'q'})));new f.Formatter().joinVoices([v]).format([v],600);v.draw(c,s);
 });
 await fixture.pdf({path:`${out}/bass-staff.pdf`,width:'850px',height:'300px',printBackground:true});await fixture.close();
 for(const count of [4,5]){
 const page=await browser.newPage();await page.route('**/__bass-staff',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(base+'/__bass-staff');await page.locator('input').setInputFiles(`${out}/bass-staff.pdf`);
 const result=await page.evaluate(async count=>{
  const target={instrument:'bass',tuning:[43,38,33,28,...(count===5?[23]:[])]};
  const analysis=await(await import('/src/pdf/tab-import/importPdfTab.js')).importPdfTab(document.querySelector('input').files[0],{target,sourceMode:'staff',signal:AbortSignal.timeout(180000)});
  const doc=(await import('/src/pdf/tab-import/scoreAdapter.js')).analysisToDocument(analysis),compiled=(await import('/src/etudes/scoreModel.js')).compileDocumentV2(doc);
  return {target,raw:analysis.pages.flatMap(p=>p.staffs.map(s=>s.notation.raw)),bars:doc.measures.length,frets:doc.measures.flatMap(m=>m.events.map(e=>e.notes.map(n=>({string:n.string,fret:n.fret,midi:doc.tuning[n.string-1]+n.fret})))),pitches:compiled.score?.measures.flatMap(m=>m.map(e=>e.pitch.key)),errors:compiled.errors};
 },count);results.push(result);console.log(JSON.stringify(result));await page.close();
 assert.deepEqual(result.errors,[]);assert.equal(result.bars,1);assert.deepEqual(result.frets.flatMap(e=>e.map(n=>n.midi)),[31,33,35,38]);assert.deepEqual(result.pitches,['g/2','a/2','b/2','d/3']);
 }
}finally{await writeFile(`${out}/bass-staff-results.json`,JSON.stringify(results,null,2));await browser.close();}
