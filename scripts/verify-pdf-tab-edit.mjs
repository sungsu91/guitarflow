import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const source=JSON.parse(await readFile('artifacts/pdf-tab-import/flower-document.json','utf8'));
const bar=source.measures.find(m=>m.events.some(e=>e.blank&&e.duration==='16'&&e.pdfImport?.rhythmVerified&&e.pdfImport.pendingStrings.length===2));
assert.ok(bar,'Flower Dance contains a partially recognized 16th chord');
const doc={...source,title:'PDF TAB 수동 보완 검증',measures:[bar]},event=bar.events.findIndex(e=>e.blank&&e.duration==='16'&&e.pdfImport?.rhythmVerified&&e.pdfImport.pendingStrings.length===2);
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];
p.on('pageerror',e=>errors.push(e.message));
const read=()=>p.evaluate(id=>JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records[id].document,doc.id);
const save=async()=>{await p.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();await p.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();};
const assertMarkers=async document=>{const expected=document.measures[0].events.filter(e=>e.pdfImport?.status==='unresolved').reduce((sum,e)=>sum+Math.max(1,e.pdfImport.pendingStrings.length),0);assert.equal(await p.locator('.pdfTabUnresolvedMarker').count(),expected,'Unresolved markers survive score re-engraving');};
try{
 await p.goto('http://127.0.0.1:5174/#etudes',{waitUntil:'networkidle'});
 await p.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
 await p.evaluate(async d=>(await import('/src/etudes/scoreLibrary.js')).saveLibraryDocument(localStorage,d),doc);
 await p.reload({waitUntil:'networkidle'});await p.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
 await p.getByRole('button',{name:'제작',exact:true}).click();await p.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await p.locator('.scoreOpenItem').filter({hasText:doc.title}).click();
 await p.getByRole('button',{name:'오선보+TAB',exact:true}).click();await p.getByRole('button',{name:'TAB',exact:true}).click();await assertMarkers(doc);
 const strings=bar.events[event].pdfImport.pendingStrings;
 for(let i=0;i<strings.length;i++){
  await p.locator(`[data-bar-index="0"] .etudeEditorHit[data-event="${event}"][data-mode="tab"][data-string="${strings[i]}"]`).click();
  await p.locator('[data-score-input]').press('7');await save();
  const updated=(await read()).measures[0].events[event];
  assert.equal(updated.duration,'16');assert.equal(updated.onset,bar.events[event].onset);
  assert.equal(updated.pdfImport.status,i===strings.length-1?'confirmed':'unresolved');
  assert.deepEqual(updated.pdfImport.pendingStrings,strings.slice(i+1));
  assert.equal(updated.notes.filter(n=>n.fret===7).length,i+1);
  await assertMarkers(await read());
 }
 await p.screenshot({path:'artifacts/pdf-tab-import/flower-edited-16th.png'});
 assert.deepEqual(errors,[]);
 const report={sourcePage:bar.pdfImport.source.page,sourceMeasure:bar.pdfImport.source.measure,event,duration:'16',strings,partialChordRemainsUnresolved:true,completedChordConfirmed:true,sourceAndDurationPreserved:true,errors};
 await writeFile('artifacts/pdf-tab-import/edit-verification.json',JSON.stringify(report,null,2));console.log(report);
}finally{await b.close();}
