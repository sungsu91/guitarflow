import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {midiAtStaffStep} from '../src/etudes/scoreModel.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),reports=[];
try{for(const mobile of [false,true]){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:'기존 연습곡 · 에튀드',exact:true}).click();await p.getByRole('button',{name:'악보 편집',exact:true}).click();const dialog=p.getByRole('dialog',{name:'악보 편집',exact:true}),canvas=dialog.getByRole('group',{name:'악보 키보드 입력'});
 const clickTool=async name=>{const button=dialog.getByRole('button',{name,exact:true});if(!mobile&&!await button.isVisible())await dialog.locator('.etudeToolbarMore summary').click();await button.click();};
 await clickTool('초기화');await dialog.getByRole('button',{name:'빈 한 마디로 초기화',exact:true}).click();
 await canvas.focus();for(const k of ['ArrowUp','ArrowUp','ArrowUp','7'])await p.keyboard.press(k);
 const save=()=>dialog.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click(),doc=()=>p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records)[0].document);
 await save();const baseline=await doc();
 const point=async(selector,dy=0)=>{
  await canvas.locator('svg').first().scrollIntoViewIfNeeded();
  return canvas.locator(selector).first().evaluate((el,dy)=>{const svg=el.ownerSVGElement,p=svg.createSVGPoint();p.x=Number(el.dataset.cursorX)+12;p.y=Number(el.dataset.cursorY)+7+dy;const at=p.matrixTransform(svg.getScreenCTM());return {x:at.x,y:at.y};},dy);
 };
 const startSelector='[data-drag-tone="3"][data-event="0"][data-mode="tab"]',destSelector='[data-event="0"][data-string="4"][data-mode="tab"]';
 const a=await point(startSelector),b=await point(destSelector);
 // Pointer down and movement must not re-engrave or commit musical data.
 await p.mouse.move(a.x,a.y);await p.mouse.down();const before=await canvas.locator('[data-draw-count]').evaluateAll(es=>es.map(e=>e.dataset.drawCount));
 await p.mouse.move(b.x,b.y,{steps:12});assert.equal(await canvas.locator('.etudeDragPreview').isVisible(),true);assert.deepEqual(await canvas.locator('[data-draw-count]').evaluateAll(es=>es.map(e=>e.dataset.drawCount)),before);
 await p.mouse.up();await save();let updated=await doc();assert.equal(updated.measures[0].events[0].notes[0].string,4);assert.equal(updated.measures[0].events[0].notes[0].fret,7);
 await dialog.getByRole('button',{name:'실행 취소',exact:true}).click();await save();assert.deepEqual(await doc(),baseline);
 // Horizontal move into a rest preserves all event timings and IDs.
 const c=await point(startSelector),d=await point('[data-event="1"][data-string="3"][data-mode="tab"]');await p.mouse.move(c.x,c.y);await p.mouse.down();await p.mouse.move(d.x,d.y,{steps:12});await p.mouse.up();await save();updated=await doc();assert.equal(updated.measures[0].events[0].rest,true);assert.equal(updated.measures[0].events[1].notes[0].id,baseline.measures[0].events[0].notes[0].id);
 await dialog.getByRole('button',{name:'실행 취소',exact:true}).click();
 // Escape while held cancels; releasing afterwards must not commit.
 const e=await point(startSelector),f=await point(destSelector);await p.mouse.move(e.x,e.y);await p.mouse.down();await p.mouse.move(f.x,f.y,{steps:10});await p.keyboard.press('Escape');await p.mouse.up();await save();assert.deepEqual(await doc(),baseline);
 // Staff drag at 50% changes pitch on the same string, maintaining vector geometry.
 await dialog.getByLabel('편집 악보 확대').selectOption('50');const g=await point('[data-drag-tone="3"][data-event="0"][data-mode="staff"]'),h=await point('[data-drag-tone="3"][data-event="0"][data-mode="staff"]',-10);
 const step=await canvas.locator('[data-drag-tone="3"][data-event="0"][data-mode="staff"]').evaluate(el=>Math.round((Number(el.dataset.staffBottom)-Number(el.dataset.cursorY)-7)/5));
 await p.mouse.move(g.x,g.y);await p.mouse.down();await p.mouse.move(h.x,h.y,{steps:12});await p.mouse.up();await save();updated=await doc();assert.equal(updated.measures[0].events[0].notes[0].string,3);assert.equal(updated.measures[0].events[0].notes[0].fret,midiAtStaffStep(step+2,baseline.keySignature)-baseline.tuning[2]);
 await dialog.getByRole('button',{name:'실행 취소',exact:true}).click();
 if(mobile){
  await dialog.getByLabel('편집 악보 확대').selectOption('100');const ta=await point(startSelector),tb=await point(destSelector),session=await p.context().newCDPSession(p);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...ta,id:1}]});
  for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:ta.x+(tb.x-ta.x)*i/8,y:ta.y+(tb.y-ta.y)*i/8,id:1}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await save();updated=await doc();assert.equal(updated.measures[0].events[0].notes[0].string,4);
  await dialog.getByRole('button',{name:'실행 취소',exact:true}).click();await save();assert.deepEqual(await doc(),baseline);await session.detach();
 }
 await clickTool('음표 · 마디');
 await dialog.getByRole('button',{name:'앞에 박 삽입',exact:true}).click();await save();updated=await doc();assert.equal(updated.measures[0].events[0].rest,true);assert.equal(updated.measures[0].events[1].notes[0].fret,7);assert.equal(updated.measures[0].events[1].onset,480);
 await dialog.getByRole('button',{name:'실행 취소',exact:true}).click();await save();assert.deepEqual(await doc(),baseline);
 assert.deepEqual(errors,[]);reports.push({mobile,insertBefore:true,verticalTabDrag:true,horizontalRestDrop:true,staffAt50Percent:true,undo:true,escapeCancels:true,noEngravingDuringDrag:true,touchDrag:mobile,errors});await p.close();
}}finally{await browser.close();await writeFile('artifacts/etude-input/drag-verification.json',JSON.stringify(reports,null,2));}console.log(reports);
