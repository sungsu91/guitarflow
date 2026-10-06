import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),root='artifacts/32nd-support/browser';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();await page.route('**/__32-export',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto('http://127.0.0.1:5174/__32-export');
 await page.locator('input').setInputFiles({name:`${randomUUID()}.pdf`,mimeType:'application/pdf',buffer:await readFile(`${root}/32nd-original-exercise.pdf`)});
 const analysis=await page.evaluate(async()=>{const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js');return importPdfTab(document.querySelector('input').files[0],{sourceMode:'tab',signal:AbortSignal.timeout(180000)});});
 await writeFile(`${root}/export-import-analysis.json`,JSON.stringify(analysis));
 const expected=JSON.parse(await readFile(`${root}/exercise.json`)).measures,actual=analysis.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures));
 const bars=expected.map((m,i)=>({bar:i+1,expectedEvents:m.events.length,actualEvents:actual[i]?.slots.length??0,correctNotes:m.events.reduce((n,e,j)=>n+e.notes.filter(q=>actual[i]?.slots[j]?.notes.some(a=>a.status==='confirmed'&&a.string===q.string&&a.fret===q.fret)).length,0),correctRhythms:m.events.filter((e,j)=>{const a=actual[i]?.slots[j];return a?.duration===e.duration&&!!a.rest===e.rest&&!!a.dotted===!!e.dotted&&(a.tuplet?.actualNotes??null)===(e.tuplet?.actualNotes??null)&&(a.tuplet?.normalNotes??null)===(e.tuplet?.normalNotes??null);}).length}));
 for(const [i,bar] of bars.entries()){
  bar.expectedNotes=expected[i].events.reduce((n,e)=>n+e.notes.length,0);
  bar.incorrectNotes=(actual[i]?.slots??[]).flatMap((s,j)=>s.notes.filter(n=>n.status==='confirmed'&&!expected[i].events[j]?.notes.some(q=>q.fret===n.fret&&q.string===n.string)).map(n=>({event:j+1,string:n.string,fret:n.fret})));
  bar.unmatchedExpectedNotes=bar.expectedNotes-bar.correctNotes;
 }
 await writeFile(`${root}/export-import.json`,JSON.stringify({summary:analysis.summary,bars},null,2));console.log(JSON.stringify(bars));
 assert.equal(actual.length,expected.length,'every exported measure survives re-import');
 for(const [i,bar] of bars.entries()){
  assert.equal(bar.actualEvents,bar.expectedEvents,`bar ${i+1}: event count`);
  assert.equal(bar.correctRhythms,bar.expectedEvents,`bar ${i+1}: rhythm`);
  assert(bar.correctNotes>=[24,20,20,32][i],`bar ${i+1}: fret regression`);
  assert(bar.incorrectNotes.length<=[0,0,0,1][i],`bar ${i+1}: incorrect confirmed fret regression`);
 }
}finally{await browser.close();}
