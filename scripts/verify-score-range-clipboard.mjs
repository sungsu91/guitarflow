import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createBlankDocument,blankMeasure} from '../src/etudes/scoreModel.js';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const draft=createBlankDocument();
draft.viewSettings.measuresPerRow=2;
draft.measures.push(blankMeasure(),blankMeasure(),blankMeasure());
draft.measures[0].events.forEach((event,i)=>Object.assign(event,{rest:false,blank:false,notes:[{id:'tone-'+i,string:1,fret:i+1}]}));
const out='artifacts/desktop-range-selection';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(doc=>{localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[doc.id]:{document:doc,status:'saved'}}}));},draft);
 await page.goto('http://127.0.0.1:5173/#etudes');
 await page.locator('.launchSplash').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'제작',exact:true}).click();
 await page.locator('[data-score-input]').waitFor();
 const load=async doc=>{
  if(await page.locator('.etudeHeaderActions').count()){
   await page.locator('.etudeHeaderActions').getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();
   await page.locator('.scoreOpenItem').filter({hasText:doc.title}).click();
  }else await page.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'range.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});
  await page.waitForFunction(count=>document.querySelectorAll('[data-bar-index] [data-draw-count]').length===count,doc.measures.length);
 };
 await load(draft);
 const point=async(bar,event,string=1)=>{
  const host=page.locator(`[data-bar-index="${bar}"] [data-draw-count]`);await host.scrollIntoViewIfNeeded();
  return host.evaluate((host,{event,string})=>{
   const mode=host.dataset.view==='staff'?'staff':'tab';
   const hit=host.shadowRoot.querySelector(`.etudeEditorHit[data-event="${event}"][data-mode="${mode}"]${mode==='tab'?`[data-string="${string}"]`:''}`),point=hit.ownerSVGElement.createSVGPoint();
   point.x=Number(hit.dataset.cursorX)+12;point.y=mode==='tab'?Number(hit.dataset.cursorY)+7:hit.getBBox().y+hit.getBBox().height/2;
   const position=point.matrixTransform(hit.ownerSVGElement.getScreenCTM());return {x:position.x,y:position.y};
  },{event,string});
 };
 const markers=()=>page.locator('.etudeScoreRangeSelection').evaluateAll(nodes=>nodes.map(node=>({bar:Number(node.getRootNode().host.closest('[data-bar-index]').dataset.barIndex),events:node.dataset.selectedEvents,width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,fill:getComputedStyle(node).fill,opacity:Number(node.getAttribute('fill-opacity'))})));
 const counts=()=>page.locator('[data-draw-count]').evaluateAll(nodes=>nodes.map(node=>node.dataset.drawCount));
 const click=async(bar,event,string=1)=>{const p=await point(bar,event,string);await page.mouse.click(p.x,p.y);};
 const drag=async(from,to,{release=true}={})=>{
  const a=await point(...from),b=await point(...to);
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:12});
  if(release)await page.mouse.up();
 };
 // Ordinary clicks must reach every actual TAB string, including empty beats.
 for(const bar of [0,1,2,3])for(let string=1;string<=6;string++){
  await click(bar,1,string);
  const cursor=await page.locator(`[data-bar-index="${bar}"] [data-draw-count]`).evaluate((host,string)=>{
   const root=host.shadowRoot,marker=root.querySelector('.etudeInputCursor'),hit=root.querySelector(`[data-event="1"][data-mode="tab"][data-string="${string}"]`);
   return {count:root.querySelectorAll('.etudeInputCursor').length,y:marker?.getAttribute('y'),expected:hit.dataset.cursorY};
  },string);
  assert.equal(cursor.count,1,JSON.stringify({bar,string,cursor}));assert.equal(cursor.y,cursor.expected);
 }
 const before=await counts();
 await drag([0,0,3],[0,1,5],{release:false});
 let selected=await markers();assert.deepEqual(selected.map(x=>[x.bar,x.events]),[[0,'0,1']]);
 assert(selected.every(x=>x.width>20&&x.height>20&&x.opacity>0&&x.fill!=='none'));
 await page.screenshot({path:`${out}/during-drag.png`});
 await page.mouse.up();assert.deepEqual(await markers(),selected);assert.deepEqual(await counts(),before,'range changes do not re-engrave music');
 await page.keyboard.press('Control+c');assert.match(await page.locator('.etudeEditorStatusMessage').innerText(),/선택 구간을 복사/);
 await click(0,2);assert.equal((await markers()).length,0);
 await page.getByRole('button',{name:'줄 복사',exact:true}).click();
 await click(1,0);await page.keyboard.press('Control+v');
 await page.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();
 await page.locator('.scoreSaveDialog button[type=submit]').click();
 const doc=await page.evaluate(id=>JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records[id].document,draft.id);
 assert.deepEqual(doc.measures[1].events.slice(0,2).map(e=>e.notes[0]?.fret),[1,2]);
 assert.deepEqual(doc.measures[0].events.map(e=>e.notes[0]?.fret),[1,2,3,3]);
 await drag([1,1,5],[0,2,2]);assert.deepEqual((await markers()).map(x=>[x.bar,x.events]),[[0,'2,3'],[1,'0,1']]);
 await page.keyboard.press('Escape');assert.equal((await markers()).length,0);assert(await page.locator('[data-score-input]').isVisible());
 await drag([0,3,3],[2,1,4]);assert.deepEqual((await markers()).map(x=>[x.bar,x.events]),[[0,'3'],[1,'0,1,2,3'],[2,'0,1']]);
 await page.screenshot({path:`${out}/multiple-rows.png`});
 await page.keyboard.press('Escape');
 await drag([0,0,2],[0,2,5],{release:false});await page.keyboard.press('Escape');await page.mouse.up();assert.equal((await markers()).length,0);
 await click(1,2,6);assert.equal(await page.locator('[data-bar-index="1"] .etudeInputCursor').count(),1);
 await page.getByRole('button',{name:'오선보+TAB',exact:true}).click();
 await drag([0,0,2],[0,1,5]);assert.deepEqual((await markers()).map(x=>[x.bar,x.events]),[[0,'0,1']]);
 const normalWidth=(await markers())[0].width;
 await page.locator('.etudeToolbarZoom select').selectOption('125');
 assert((await markers())[0].width>normalWidth*1.2,'selection follows editor zoom');
 await page.locator('.etudeToolbarZoom select').selectOption('100');
 await page.getByRole('button',{name:'오선보',exact:true}).click();
 await drag([0,0],[0,1]);
 assert.deepEqual((await markers()).map(x=>[x.bar,x.events]),[[0,'0,1']]);
 await page.getByRole('button',{name:'TAB',exact:true}).click();
 await click(0,0,1);
 const from=await point(0,0,1),to=await point(0,0,2);
 await page.keyboard.down('Alt');await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();await page.keyboard.up('Alt');
 assert.equal(await page.locator('[data-bar-index="0"] .etudeNoteHandle[data-event="0"][data-mode="tab"][data-string="2"]').count(),1);
 assert.equal((await markers()).length,0);
 assert.deepEqual(errors,[]);
 console.log('PASS: 24 string clicks, live visible range, reverse/multiple rows, independent clipboard, Escape, view/zoom changes, Alt note movement, no engraving redraws or browser errors');
 await page.close();
 page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(15000);
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:5173/#etudes');
 await page.locator('.launchSplash').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:'제작',exact:true}).click();
 await page.locator('[data-score-input]').waitFor();await load(draft);
 for(let string=1;string<=6;string++){
  const p=await point(0,1,string);await page.touchscreen.tap(p.x,p.y);
  const cursor=await page.locator('[data-bar-index="0"] [data-draw-count]').evaluate((host,string)=>{
   const root=host.shadowRoot,marker=root.querySelector('.etudeInputCursor'),hit=root.querySelector(`[data-event="1"][data-mode="tab"][data-string="${string}"]`);
   return {y:Number(marker?.getAttribute('y')),expected:Number(hit.dataset.cursorY)+2};
  },string);
  assert.equal(cursor.y,cursor.expected);
 }
 assert.equal(await page.locator('.etudeRangeHint').count(),0);assert.equal((await markers()).length,0);assert.deepEqual(errors,[]);
 await page.screenshot({path:`${out}/mobile.png`});console.log('PASS: mobile six-string touch selection retains separate UI');
}catch(error){await page?.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}finally{await browser.close();}
