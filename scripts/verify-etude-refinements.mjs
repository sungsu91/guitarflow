import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const reports=[];
try{for(const mobile of [false,true]){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:'악보 편집',exact:true}).click();const d=p.getByRole('dialog',{name:'악보 편집',exact:true}),canvas=d.getByRole('group',{name:'악보 키보드 입력'});await canvas.locator('svg').first().waitFor();
 const clickTool=async name=>{const button=d.getByRole('button',{name,exact:true});if(!mobile&&!await button.isVisible())await d.locator('.etudeToolbarMore summary').click();await button.click();};
 const save=()=>d.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click(),doc=()=>p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);
 await save();const baseline=await doc();const width100=await canvas.locator('svg').first().evaluate(e=>e.getBoundingClientRect().width);
 await d.getByLabel('편집 악보 확대').selectOption('50');const width50=await canvas.locator('svg').first().evaluate(e=>e.getBoundingClientRect().width);assert.ok(Math.abs(width50/width100-.5)<.01);
 // Probe the previously dead gap on either side of a beat midpoint, and
 // the boundaries halfway between TAB lines, in scaled SVG coordinates.
 await d.evaluate(el=>el.scrollTop=0);await canvas.evaluate(el=>el.scrollTop=0);
 const coords=await canvas.locator('[data-bar-index="0"] svg').evaluate(svg=>{const first=svg.querySelector('[data-event="0"][data-string="3"]'),second=svg.querySelector('[data-event="1"][data-string="3"]'),toScreen=(x,y)=>{const p=svg.createSVGPoint();p.x=x;p.y=y;const s=p.matrixTransform(svg.getScreenCTM());return {x:s.x,y:s.y};};const mid=Number(second.getAttribute('x')),y=Number(first.dataset.cursorY)+7,height=Number(first.getAttribute('height'));return [toScreen(mid-3,y),toScreen(mid+3,y),toScreen(mid+3,y+height/2-3),toScreen(mid+3,y+height/2+3)];});
 for(const [i,pt] of coords.entries()){await p.mouse.click(pt.x,pt.y);const label=await d.locator(mobile?'.etudeInputPalette strong':'.etudeCurrentNote small').innerText();assert.match(label,new RegExp(`1마디 · ${i===0?1:2}음 · ${i===3?4:3}번줄`));}
 await save();assert.deepEqual(await doc(),baseline,'click/zoom must not change music');
 await clickTool('피킹 일괄 설정');await d.getByLabel('일괄 피킹 패턴').selectOption('alternate-up');await d.getByRole('button',{name:'피킹 패턴 적용',exact:true}).click();await save();let updated=await doc();assert.deepEqual(updated.measures[0].events.map(e=>e.pickStroke),['up','down','up','down']);
 await d.getByRole('button',{name:'실행 취소',exact:true}).click();await save();assert.deepEqual(await doc(),baseline);
 await clickTool('초기화');await d.getByRole('button',{name:'빈 한 마디로 초기화',exact:true}).click();await save();updated=await doc();assert.equal(updated.measures.length,1);assert.ok(updated.measures[0].events.every(e=>e.rest));
 await d.getByRole('button',{name:'실행 취소',exact:true}).click();await save();assert.deepEqual(await doc(),baseline);
 await clickTool('음표 · 마디');
 await d.getByRole('button',{name:'현재 박 나누기',exact:true}).click();await save();updated=await doc();assert.deepEqual(updated.measures[0].events.slice(0,2).map(e=>e.duration),['8','8']);assert.equal(updated.measures[0].events[2].onset,baseline.measures[0].events[1].onset);
 await d.getByRole('button',{name:'뒤에 박 삽입',exact:true}).click();await save();updated=await doc();assert.deepEqual(updated.measures[0].events.slice(0,4).map(e=>e.onset),[0,240,480,720]);
 await clickTool('초기화');await d.getByRole('button',{name:'편집 시작 상태로 되돌리기',exact:true}).click();await save();assert.deepEqual(await doc(),baseline);
 assert.deepEqual(errors,[]);reports.push({mobile,scaleRatio:width50/width100,nearestBeatAndString:true,resetAndUndo:true,bulkPickingAndUndo:true,splitAndInsert:true,errors});await p.close();
}}finally{await browser.close();await writeFile('artifacts/etude-input/refinements-verification.json',JSON.stringify(reports,null,2));}console.log(reports);
