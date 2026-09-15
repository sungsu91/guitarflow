import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const out='artifacts/mobile-pinch';await mkdir(out,{recursive:true});const report=[];
async function pan(page,cdp,selector) {
 const v=page.locator(selector).first(),r=await v.boundingBox(),x=r.x+r.width*.65,y=Math.max(r.y+50,Math.min(r.y+r.height*.5,600));
 const before=await v.evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}));
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:0}]});
 for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*6,y:y-i*4,id:0}]});await page.waitForTimeout(20);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(250);
 const after=await v.evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}));assert.ok(after.x>before.x+15||after.y>before.y+15,JSON.stringify({before,after}));return {before,after};
}
async function pinch(page,cdp,selector,ratio=2,shift={x:0,y:0}) {
 const v=page.locator(selector).first(),r=await v.boundingBox();
 const center={x:r.x+r.width*.5,y:Math.max(r.y+45,Math.min(r.y+r.height*.42,650))};
 const before=await v.evaluate((el,c)=>{const targets=[...el.querySelectorAll('[data-pinch-anchor]')],node=targets.find(n=>{const r=n.getBoundingClientRect();return c.y>=r.top&&c.y<=r.bottom;});if(!node)throw Error('No anchor');node.dataset.testAnchor='true';const r=node.getBoundingClientRect();return {x:(c.x-r.left)/r.width,y:(c.y-r.top)/r.height,scale:visualViewport.scale,draws:[...document.querySelectorAll('[data-draw-count]')].map(n=>n.dataset.drawCount),renders:[...el.querySelectorAll('[data-render-count]')].map(n=>n.dataset.renderCount)};},center);
 const point=(x,y,id)=>({x,y,id,radiusX:3,radiusY:3,force:1});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(center.x-27,center.y,0)]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(center.x-27,center.y,0),point(center.x+27,center.y,1)]});
 for(let i=1;i<=12;i++){const t=i/12,d=27*(1+(ratio-1)*t);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(center.x+shift.x*t-d,center.y+shift.y*t,0),point(center.x+shift.x*t+d,center.y+shift.y*t,1)]});await page.waitForTimeout(16);}
 const during=await v.evaluate(el=>({pinching:el.dataset.pinching,draws:[...document.querySelectorAll('[data-draw-count]')].map(n=>n.dataset.drawCount),renders:[...el.querySelectorAll('[data-render-count]')].map(n=>n.dataset.renderCount)}));
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(600);
 const after=await v.evaluate((el,{a,c,shift})=>{const node=el.querySelector('[data-test-anchor=true]'),r=node.getBoundingClientRect();delete node.dataset.testAnchor;return {errorX:r.left+r.width*a.x-c.x-shift.x,errorY:r.top+r.height*a.y-c.y-shift.y,scrollTop:el.scrollTop,scrollLeft:el.scrollLeft,scale:visualViewport.scale,pinching:el.dataset.pinching,draws:[...document.querySelectorAll('[data-draw-count]')].map(n=>n.dataset.drawCount)};},{a:before,c:center,shift});
 assert.equal(during.pinching,'true');assert.deepEqual(during.draws,before.draws,'no music redraw during gesture');assert.deepEqual(during.renders,before.renders,'no PDF rendering during gesture');assert.equal(after.scale,before.scale,'browser itself never zooms');
 return {before,after,during};
}
try {
 for(const [width,height] of (process.env.PINCH_PDF_ONLY?[]:process.env.PINCH_EDITOR_ONLY?[[390,844]]:[[360,800],[375,812],[390,844],[393,852],[430,932]])) {
  const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const cdp=await ctx.newCDPSession(p);
  await p.goto('http://127.0.0.1:5173/#etudes');
  await p.evaluate(async()=>{const {createBlankDocument,blankMeasure}=await import('/src/etudes/scoreModel.js'),{saveLibraryDocument}=await import('/src/etudes/scoreLibrary.js');const d=createBlankDocument();d.title='핀치 확인';d.measures=Array.from({length:8},()=>blankMeasure());d.measures.forEach(m=>m.events.forEach((e,i)=>Object.assign(e,{rest:false,pickStroke:'down',notes:[{id:crypto.randomUUID(),string:3,fret:5+i,locked:true}]})));saveLibraryDocument(localStorage,d);});
  await p.reload();await p.getByRole('button',{name:'핀치 확인 열기',exact:true}).click();await p.getByRole('button',{name:'악보 편집',exact:true}).click();await p.locator('[data-draw-count]').first().waitFor();
  assert.equal(await p.locator('select[aria-label*="확대"]').count(),0);assert.equal(await p.getByLabel('악보 현재 배율').textContent(),'100%');
  const selection=await p.locator('.mobileCursorPad output').textContent(),data=await p.evaluate(()=>localStorage.getItem('fretiva.etude.library.v2'));
  const result=await pinch(p,cdp,'.etudeEditorCanvas',2,{x:8,y:9});
  assert.ok(Math.abs(result.after.errorX)<5&&Math.abs(result.after.errorY)<5,JSON.stringify(result.after));assert.equal(await p.getByLabel('악보 현재 배율').textContent(),'200%');assert.deepEqual(result.after.draws,result.before.draws);
  assert.equal(await p.locator('.mobileCursorPad output').textContent(),selection,'pinch does not select a note/TAB/pick');
  assert.equal(await p.evaluate(()=>localStorage.getItem('fretiva.etude.library.v2')),data);
  if(width===390){await pan(p,cdp,'.etudeEditorCanvas');const smaller=await pinch(p,cdp,'.etudeEditorCanvas',.65);assert.ok(Math.abs(smaller.after.errorX)<5&&Math.abs(smaller.after.errorY)<5);assert.equal(await p.getByLabel('악보 현재 배율').textContent(),'130%');}
  const panel=await p.locator('.mobileScoreInput').boundingBox();assert.ok(panel.y+panel.height<=height+1);
  if(width===390)await p.screenshot({path:`${out}/390-editor-130.png`});
  const viewport=p.locator('.etudeEditorCanvas');await viewport.evaluate(e=>e.scrollTop=450);
  await p.getByRole('button',{name:'악보 너비 맞춤',exact:true}).click();await p.waitForTimeout(150);
  assert.ok(await viewport.evaluate(e=>e.scrollTop)>50,'fit preserves current vertical reading position');assert.ok(await viewport.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  if(width===390)await p.screenshot({path:`${out}/390-editor-fit.png`});
  if(width===390){
   await viewport.evaluate(e=>{e.scrollTop=0;e.scrollLeft=0;});await p.waitForTimeout(300);
   for(const [selector,beat] of [['.etudeNoteHandle[data-mode=tab][data-string="3"][data-event="1"]',2],['.etudeNoteHandle[data-mode=staff][data-event="2"]',3],['.etudePickHit[data-event="3"]',4]]){
    const rect=await p.locator('[data-bar-index="0"]').locator(selector).first().boundingBox();await p.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);await p.waitForTimeout(180);assert.match(await p.locator('.mobileCursorPad output').textContent(),new RegExp(`${beat}박`));
   }
   await p.locator('.mobileInputExtras').getByRole('button',{name:'메뉴',exact:true}).click();await p.locator('.mobileEditorSheet').getByText('입력 설정',{exact:true}).click();await p.getByLabel('음표 드래그 이동',{exact:true}).check();await p.getByRole('button',{name:'상세 설정 닫기'}).click();
   const selected=await p.locator('.mobileCursorPad output').textContent();await pinch(p,cdp,'.etudeEditorCanvas',1.5);assert.equal(await p.locator('.mobileCursorPad output').textContent(),selected);
  }
  assert.deepEqual(errors,[]);report.push({width,height,editor:result.after});await ctx.close();
 }
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),p=await ctx.newPage(),cdp=await ctx.newCDPSession(p),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/#etudes');await p.getByLabel('PDF 파일 선택',{exact:true}).setInputFiles('C:/Users/User/Desktop/sheet music/Flower Dance.pdf');
 const dialog=p.getByRole('dialog',{name:'PDF 악보 정보'});await dialog.getByRole('button',{name:'기기에 저장',exact:true}).click();await dialog.waitFor({state:'hidden'});await p.getByRole('button',{name:'Flower Dance 열기',exact:true}).click();
 const ready=()=>p.waitForFunction(()=>document.querySelector('.pdfPaper canvas')&&!document.querySelector('.pdfViewport[aria-busy=true]'));await ready();
 assert.equal(await p.getByLabel('PDF 확대',{exact:true}).count(),0);assert.equal(await p.getByLabel('PDF 현재 배율').textContent(),'100%');
 const single=await pinch(p,cdp,'.pdfScoreStage>.pdfViewport',2,{x:0,y:0});assert.ok(Math.abs(single.after.errorX)<5&&Math.abs(single.after.errorY)<5,JSON.stringify(single.after));await ready();
 await p.screenshot({path:`${out}/390-pdf-200.png`});
 await p.getByRole('button',{name:'PDF 너비 맞춤',exact:true}).click();await ready();
 await p.getByRole('button',{name:'PDF 간단 편집',exact:true}).click();
 const mapped=await pinch(p,cdp,'.pdfScoreStage>.pdfViewport',1.5);assert.equal(await p.locator('.pdfFirstPoint,.pdfRowDraft').count(),0,'pinch must not start a bar rectangle');
 await p.getByRole('button',{name:'PDF 간단 편집',exact:true}).click();
 await p.locator('.pdfMobileSettings>summary').click();await p.getByLabel('PDF 연속 스크롤').check();await p.locator('.pdfMobileSettings>summary').click();await p.locator('.pdfViewTools').scrollIntoViewIfNeeded();await p.locator('.pdfContinuous').waitFor();await ready();
 await p.locator('.pdfContinuous').evaluate(e=>e.scrollTop=650);await p.waitForTimeout(400);
 const continuous=await pinch(p,cdp,'.pdfContinuous',1.6);assert.ok(Math.abs(continuous.after.errorX)<5&&Math.abs(continuous.after.errorY)<7,JSON.stringify(continuous.after));
 await pan(p,cdp,'.pdfContinuous');
 await p.screenshot({path:`${out}/390-pdf-continuous.png`});assert.deepEqual(errors,[]);report.push({pdf:{single:single.after,mapping:mapped.after,continuous:continuous.after},errors});
 await p.locator('.pdfPracticeHeader').getByRole('button').first().click();await p.getByRole('button',{name:'Flower Dance 열기',exact:true}).click();await ready();assert.equal(await p.getByLabel('PDF 현재 배율').textContent(),'100%');
 await ctx.close();
 const desktop=await browser.newContext({viewport:{width:1440,height:1000}}),dp=await desktop.newPage();await dp.goto('http://127.0.0.1:5173/#etudes');await dp.getByRole('button',{name:'+ 간단 악보 만들기',exact:true}).click();await dp.getByLabel('편집 악보 확대',{exact:true}).selectOption('150');assert.equal(await dp.getByLabel('편집 악보 확대',{exact:true}).inputValue(),'150');assert.equal(await dp.locator('.mobileScoreZoom').count(),0);await desktop.close();
 await writeFile(`${out}/results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
