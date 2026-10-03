// Captured recognition output isolates the octave regression from model variance.
// Browser checks use separate temporary profiles, never the user's score library.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseStaffTokens,staffSystemToAnalysis} from '../src/omr/staffTokens.js';
import {restoreStaffPitch,staffPitchRepairState} from '../src/omr/staffPitch.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {soundingMidi} from '../src/etudes/scoreTuning.js';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
const out='artifacts/staff-pitch-regression';await mkdir(out,{recursive:true});
const captured=await Promise.all([1,2].map(n=>readFile(`artifacts/staff-photo/raw-page-${n}.json`,'utf8').then(JSON.parse)));
function convert(octaveShift){
 let previous=[],context={meter:[4,4],key:'C'};
 const pages=captured.map((systems,index)=>({page:index+1,notation:true,octaveShift:octaveShift??-12,staffs:systems.map(s=>{
  const parsed=parseStaffTokens(s.text,context);context={meter:parsed.meter,key:parsed.key};
  const converted=staffSystemToAnalysis(parsed,{system:{id:s.staff,rect:s.rect,staff:{}},page:index+1,width:2083,height:2947,octaveShift,previous});previous=converted.previous;return converted.staff;
 })}));
 return analysisToDocument({fileName:'풀잎사랑 · 음높이 회귀 검증.jpg',sourceType:'image',pages,summary:summarizeAnalysis(pages)});
}
const legacy=convert(0),fresh=convert(),repaired=restoreStaffPitch(legacy);
const music=d=>d.measures.map(m=>m.events.map(e=>({onset:e.onset,duration:e.duration,dotted:e.dotted,rest:e.rest,blank:e.blank,notes:e.notes.map(n=>[n.string,n.fret,soundingMidi(d,n)])})));
assert.deepEqual(music(repaired),music(fresh));assert.equal(staffPitchRepairState(repaired),null);
const first=d=>compileDocumentV2(d).score.measures[0][1];
assert.equal(first(legacy).pitch.key,'b/6');assert.equal(first(repaired).pitch.key,'b/5');
assert.equal(first(legacy).fret,19);assert.equal(first(repaired).fret,7);
const notes=repaired.measures.flatMap(m=>m.events.flatMap(e=>e.notes));
for(const n of notes)assert.equal(soundingMidi(repaired,n)+12,n.source.writtenMidi);
await writeFile(`${out}/legacy.json`,JSON.stringify(legacy));
const results=[{case:'same-raw-18-systems-repair-equals-fresh-import',passed:true,measures:fresh.measures.length,notes:notes.length,oldFirst:{fret:19,staff:'B6'},newFirst:{fret:7,staff:'B5'}}];
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const origin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174';
try{
 for(const mobile of [true,false]){
  const name=mobile?'mobile':'desktop',page=await browser.newPage({viewport:{width:440,height:956}}),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('language','ko'));
  await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
  await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/제작|만들기/}).click();
  await page.locator('.etudeEditor input[type=file]').setInputFiles(`${out}/legacy.json`);
  const repair=page.getByRole('button',{name:'원본 음표 위치로 복원',exact:true});await repair.waitFor();
  await page.locator('.scoreNotationSelect').selectOption('both');
  if(!mobile)await page.setViewportSize({width:1440,height:960});
  await page.screenshot({path:`${out}/${name}-before.png`});
  await repair.click();await repair.waitFor({state:'detached'});
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();await repair.waitFor();
  await page.getByRole('button',{name:'다시 실행',exact:true}).click();await repair.waitFor({state:'detached'});
  await page.locator('.etudeEditorSave').click();await page.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();await page.locator('.scoreSaveDialog').waitFor({state:'detached'});
  const saved=Object.values((await readBrowserScoreLibrary(page)).records)[0].document;
  assert.deepEqual(music(saved),music(repaired));assert.equal(saved.pdfTabImport.notation.octaveShift,-12);
  assert(saved.measures.flatMap(m=>m.events).every(e=>e.pdfImport.status==='unresolved'));
  assert.equal(await page.locator('.editorTabWarning').count(),0);
  await page.screenshot({path:`${out}/${name}-restored.png`});
  await page.reload({waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});
  const reloaded=(await readBrowserScoreLibrary(page)).records[saved.id].document;assert.deepEqual(music(reloaded),music(repaired));
  assert.deepEqual(errors,[]);results.push({case:`${name}-restore-undo-redo-save-reload`,passed:true,errors});await page.close();
 }
}finally{await browser.close();await writeFile(`${out}/recovery-results.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
