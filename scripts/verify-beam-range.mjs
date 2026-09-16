import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),out='artifacts/beam-range';await mkdir(out,{recursive:true});const results=[];
try{for(const [width,height] of [[390,844],[360,800],[444,849],[1440,1000]]){
 const p=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('rifflabThemeMode','light'));await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:/간단 악보 만들기/}).click();await p.locator('[data-draw-count]').first().waitFor();
 const d=p.getByRole('dialog',{name:'악보 편집',exact:true}),btn=name=>d.getByRole('button',{name,exact:true}),dismiss=async()=>{if(await p.locator('.mobileEditorNotice').count())await p.locator('.mobileEditorNotice').click();};
 const fixture=await p.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js');let doc=m.createBlankDocument();doc.title='빔 범위 확인';doc.measures[0].events=Array.from({length:8},(_,i)=>m.blankEvent(i*240,'8'));for(let i=0;i<8;i++){doc=c.enterFret(doc,{bar:0,event:i,string:6},9);doc=c.enterFret(doc,{bar:0,event:i,string:5},7);}return doc;});
 await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'beam.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await dismiss();
 const groups=()=>p.locator('[data-bar-index="0"] [data-beam-events]').evaluateAll(es=>es.map(e=>e.dataset.beamEvents));
 assert.deepEqual(await groups(),['0,1','2,3','4,5','6,7']);if(width===390)await p.screenshot({path:`${out}/390-auto.png`});
 await btn('빔 범위 선택').click();
 const note=i=>p.locator(`[data-bar-index="0"] .etudeNoteHandle[data-mode="tab"][data-event="${i}"][data-string="6"]`);
 const select=async(a,b)=>{await note(a).click();await note(b).click();await p.locator('.etudeBeamRangeSelection').waitFor();};
 await select(0,3);assert.equal(await p.getByRole('group',{name:'범위 빔 편집',exact:true}).count(),1);await btn('선택 범위 빔 묶기').click();assert.deepEqual(await groups(),['0,1,2,3','4,5','6,7']);
 await select(4,7);await btn('선택 범위 빔 묶기').click();assert.deepEqual(await groups(),['0,1,2,3','4,5,6,7']);
 assert.equal(await p.locator('[data-bar-index="0"] .tabRhythmBeam').count(),6);assert.equal(await p.locator('[data-bar-index="0"] .tabRhythmStem').count(),8);
 if(width===390)await p.screenshot({path:`${out}/390-manual-4-4.png`});
 const input=p.locator('[data-score-input]');await input.press('Control+z');assert.deepEqual(await groups(),['0,1,2,3','4,5','6,7']);await input.press('Control+y');assert.deepEqual(await groups(),['0,1,2,3','4,5,6,7']);
 await btn(width<600?'악보 저장':'이 브라우저에 저장').click();await dismiss();const saved=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);
 assert.deepEqual(saved.measures[0].events.map(({beamBefore,...e})=>e),fixture.measures[0].events);
 await btn('빔 범위 선택 닫기').click();await btn(width<600?'악보 편집 뒤로':'닫기').click();await p.reload();await p.getByRole('button',{name:'빔 범위 확인 열기',exact:true}).click();await p.locator('.scoreLibraryPractice svg').first().waitFor();
 assert.deepEqual(await p.locator('.scoreLibraryPractice [data-beam-events]').evaluateAll(es=>es.map(e=>e.dataset.beamEvents)),['0,1,2,3','4,5,6,7']);
 await p.getByRole('button',{name:'악보 편집',exact:true}).click();await p.locator('[data-draw-count]').first().waitFor();await btn('빔 범위 선택').click();await select(0,3);await btn('선택 범위 빔 끊기').click();assert.deepEqual(await groups(),['4,5,6,7']);
 await btn('선택 범위 빔 자동').click();await select(4,7);await btn('선택 범위 빔 자동').click();assert.deepEqual(await groups(),['0,1','2,3','4,5','6,7']);
 // Invalid range leaves all data untouched and explains the failure.
 const invalid=structuredClone(fixture);invalid.measures[0].events[2]={...invalid.measures[0].events[2],rest:true,notes:[],blank:false};
 await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});await dismiss();await select(0,3);await btn('선택 범위 빔 묶기').click();await p.getByText('쉼표·빈 자리·4분음표 이상을 포함한 범위는 빔으로 묶을 수 없습니다.',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);results.push({width,auto2222:true,manual44:true,tabSingleBeams:true,undoRedo:true,saveReload:true,restoreAuto:true,rejectRest:true,errors});console.log(results.at(-1));await p.close();
}}finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();}
