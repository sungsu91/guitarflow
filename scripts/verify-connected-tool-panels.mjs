import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const out='artifacts/connected-tool-panels',results=[];await mkdir(out,{recursive:true});
try{for(const [width,height] of [[375,667],[360,800],[390,844],[430,932],[1440,1000]]){
 const p=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:/악보 만들기/}).click();await p.locator('[data-draw-count]').first().waitFor();
 const fixture=await p.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js');let d=m.createBlankDocument();for(let i=0;i<8;i++)d=c.enterFretWithDuration(d,{bar:0,event:i,string:6},i%2?7:5,'8');return d;});
 await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'panels.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 const note=i=>p.locator(`[data-bar-index="0"] .etudeNoteHandle[data-mode="tab"][data-event="${i}"][data-string="6"]`).last();await note(0).click();
 for(const kind of ['picking','note','beam','repeat']){
  const toggle=p.locator(`[data-mobile-tool-toggle="${kind}"]`);await toggle.click();await p.waitForTimeout(200);
  const pop=p.locator('.mobileDockPopover,.mobileScoreSmallSheet.is-anchored');assert.equal(await pop.count(),1);
  if(kind==='beam'){await note(0).click();await note(3).click();await p.getByRole('button',{name:'선택 범위 빔 연결',exact:true}).waitFor();}
  else await note(0).click();
  if(kind==='note'){
   for(const name of ['해머온','풀오프','슬라이드','붙임줄','비브라토','하모닉스','아르페지오 상행','아르페지오 하행','주법 지우기'])assert.equal(await pop.getByRole('button',{name,exact:true}).count(),1);
   await pop.getByRole('button',{name:'비브라토',exact:true}).click();assert.equal(await pop.getByRole('button',{name:'비브라토',exact:true}).getAttribute('aria-pressed'),'true');await p.getByRole('button',{name:'실행 취소',exact:true}).click();
  }
  if(kind==='picking'){await pop.getByRole('button',{name:'직접 피킹 다운',exact:true}).click();await note(0).click();assert.equal(await pop.getByRole('button',{name:'직접 피킹 다운',exact:true}).getAttribute('aria-pressed'),'true');await p.getByRole('button',{name:'실행 취소',exact:true}).click();}
  await p.waitForTimeout(200);
  const bounds=await pop.evaluate(el=>{const dock=el.closest('.mobileToolDock'),button=dock.querySelector('[aria-expanded=true]'),bridge=dock.querySelector('.toolPanelBridge'),body=el.children[1];return {panel:el.getBoundingClientRect().toJSON(),button:button.getBoundingClientRect().toJSON(),bridge:bridge.getBoundingClientRect().toJSON(),scroll:body.scrollHeight-body.clientHeight,color:getComputedStyle(el.firstElementChild).backgroundColor};});
  assert.equal(bounds.color,'rgb(73, 56, 44)');assert(Math.abs(bounds.bridge.top-bounds.button.bottom+1)<1);assert(bounds.bridge.bottom>=bounds.panel.top+1);assert(bounds.bridge.left>=0&&bounds.bridge.right<=width);
  if(width<600){assert(bounds.scroll<=1,JSON.stringify({kind,width,bounds}));const audio=await p.locator('.editorAudioDock').boundingBox();assert(bounds.panel.bottom<=audio.y);const d=p.locator('dialog.editorDesign');assert(await d.evaluate(e=>e.scrollHeight<=e.clientHeight+1));assert.equal(await p.locator('.mobileFretPad').getAttribute('inert'),'');}
  await p.screenshot({path:`${out}/${width}-${kind}.png`});results.push({width,height,kind,panelHeight:bounds.panel.height,bodyOverflow:bounds.scroll,bridge:bounds.bridge,panel:bounds.panel});
  await pop.locator('header button').click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 }
 assert.deepEqual(errors,[]);await p.close();
}}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));}
console.log(results.map(({bridge,panel,...r})=>r));
