import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const report=[];await mkdir('artifacts/editor-audit',{recursive:true});
try{for(const instrument of ['guitar','bass','ukulele']){
 const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});p.setDefaultTimeout(8000);const errors=[];p.on('pageerror',e=>errors.push(e.message));const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('tab',{name:'에튀드',exact:true}).click();await p.getByRole('button',{name:'악보 편집',exact:true}).click();const d=p.getByRole('dialog',{name:'악보 편집',exact:true}),b=name=>d.getByRole('button',{name,exact:true});
 const fixture=await p.evaluate(async instrument=>{const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js'),i=await import('/src/etudes/convertScoreInstrument.js');let doc=i.convertScoreInstrument(m.createBlankDocument(),instrument);doc.title='QA-'+instrument;doc.bpm=120;doc.measures.push(...Array.from({length:7},()=>m.blankMeasure()));for(let bar=0;bar<8;bar++)for(let event=0;event<4;event++)doc=c.enterFret(doc,{bar,event,string:1},[5,7,7,5][event]);return doc;},instrument);
 await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'qa.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await p.locator('[data-draw-count]').first().waitFor();
 const draws=()=>p.locator('[data-draw-count]').evaluateAll(nodes=>nodes.reduce((sum,n)=>sum+Number(n.dataset.drawCount),0));
 await p.evaluate(()=>{const node=document.querySelector('[data-score-input]');node.inputMeasurements=[];});const before=await draws();
 for(let i=0;i<12;i++){await b('다음 입력 위치').click();await b('위 기타 줄').click();await b('아래 기타 줄').click();}
 const moved=await draws();assert.equal(moved,before,'cursor-only moves must not engrave');
 for(let i=0;i<10;i++){await b('프렛 3').click();await b('다음 입력 위치').click();}
 const perf=await p.locator('[data-score-input]').evaluate(n=>{const a=[...n.inputMeasurements].sort((a,b)=>a-b);return {samples:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};});
 for(const view of ['오선보','TAB','오선보+TAB']){await b(view).click();assert.equal(await b(view).getAttribute('aria-pressed'),'true');}
 await b('마디 추가').click();assert.equal(await p.locator('[data-bar-index]').count(),9);await b('프렛 5').click();await b('삭제').click();await b('프렛 7').click();await b('마디 삭제').click();assert.equal(await p.locator('[data-bar-index]').count(),8);
 await b('한 줄 2마디').click();await b('줄 편집').click();await b('2마디 새 줄로 나누기').click();await b('줄 편집').click();
 await b('피킹 도구 열기').click();await b('다운 업 교대').click();await b('도구 닫기').click();await b('빔 도구 열기').click();await b('TAB 빔 위 표시').click();await b('도구 닫기').click();
 await b('악보 저장').click();const save=p.getByRole('dialog',{name:'악보 저장 정보'});if(await save.count())await save.getByRole('button',{name:'저장하기'}).click();
 const saved=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records).find(r=>r.document.title.startsWith('QA-')).document);assert.equal(saved.instrument,instrument);assert.equal(saved.measures.length,8);assert(saved.viewSettings.systemBreaks.length);assert(saved.measures.some(m=>m.events.some(e=>e.pickStroke)));
 // Playback remains active after a BPM edit.
 await b('악보 재생').click();await p.waitForTimeout(400);await d.getByLabel('악보 재생 BPM',{exact:true}).fill('90');await d.getByLabel('악보 재생 BPM',{exact:true}).press('Enter');await p.waitForTimeout(400);const bpmKeepsPlaying=await b('악보 재생 정지').count();assert.equal(bpmKeepsPlaying,1,'BPM edit must retain playback');
 await p.screenshot({path:`artifacts/editor-audit/${instrument}.png`});report.push({instrument,perf,cursorRedraws:moved-before,bpmKeepsPlaying,errors});console.log(report.at(-1));await p.close();
}await writeFile('artifacts/editor-audit/results.json',JSON.stringify(report,null,2));}finally{await browser.close();}
