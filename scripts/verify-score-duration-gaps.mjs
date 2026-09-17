import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/score-duration-gaps',{recursive:true});const results=[];
try{for(const width of [390,1440]){
 const mobile=width<500,p=await browser.newPage({viewport:{width,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:/악보 만들기/}).click();await p.locator('[data-draw-count]').first().waitFor();
 const editor=p.getByRole('dialog',{name:'악보 편집',exact:true});
 const fixture=await p.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js');let d=m.createBlankDocument();d.measures=Array.from({length:8},()=>m.blankMeasure());for(let event=0;event<3;event++)d=c.enterFret(d,{bar:4,event,string:4},[9,9,8][event]);d.measures[4].events[3]=m.blankEvent(1440,'8');d.viewSettings.measuresPerRow=4;d.title='다섯째 마디 입력 확인';return d;});
 await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'duration-gap.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await p.locator('.etudeEditorMeasure[data-bar-index="7"]').waitFor();
 await editor.getByRole('button',{name:'TAB',exact:true}).click();
 const bar=p.locator('.etudeEditorMeasure[data-bar-index="4"]'),blank=bar.locator('.etudeEditorHit[data-event="3"][data-mode="tab"][data-string="4"]'),note=bar.locator('.etudeNoteHandle[data-event="3"][data-mode="tab"][data-string="4"]');
 await blank.click();await editor.getByRole('button',{name:'4분음표',exact:true}).click();
 if(mobile)await p.getByRole('button',{name:'프렛 8',exact:true}).click();else await p.getByRole('group',{name:'악보 키보드 입력',exact:true}).press('8');
 await note.waitFor();assert.equal(await bar.locator('.etudeNoteHandle[data-mode="tab"][data-string="4"]').count(),4);
 await editor.getByRole('button',{name:'실행 취소',exact:true}).first().click();await note.waitFor({state:'detached'});await editor.getByRole('button',{name:'다시 실행',exact:true}).first().click();await note.waitFor();
 await p.screenshot({path:`artifacts/score-duration-gaps/${width}-fourth-note.png`});
 await editor.getByRole('button',{name:mobile?'악보 저장':'이 브라우저에 저장',exact:true}).click();const modal=p.getByRole('dialog',{name:'악보 저장 정보'});await modal.getByRole('button',{name:'저장하기'}).click();await modal.waitFor({state:'detached'});
 const stored=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);
 assert.deepEqual(stored.measures[4].events.map(e=>[e.onset,e.duration,e.notes[0]?.fret]),[[0,'4',9],[480,'4',9],[960,'4',8],[1440,'4',8]]);
 assert.deepEqual(stored.measures.slice(5),fixture.measures.slice(5));assert.deepEqual(errors,[]);results.push({width,fourthNote:true,undoRedo:true,saved:true});await p.close();
}}finally{await browser.close();await writeFile('artifacts/score-duration-gaps/results.json',JSON.stringify(results,null,2));}
console.log(results);
