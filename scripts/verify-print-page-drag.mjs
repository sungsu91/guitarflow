import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const engine=process.env.PRINT_BROWSER||'chromium',base=process.env.PRINT_TEST_URL||'http://127.0.0.1:4193';
const out=process.env.PRINT_OUTPUT||`artifacts/print-page-drag-20260927/${engine}`;await mkdir(out,{recursive:true});
const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});
let p;
try{
 for(const width of (process.env.PRINT_WIDTHS||'390,1440').split(',').map(Number)){
  const mobile=width<1024,context=await browser.newContext({viewport:{width,height:mobile?844:900},isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>Object.defineProperty(navigator,'share',{value:undefined,configurable:true}));
  p=await context.newPage();p.setDefaultTimeout(20000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`${base}/#rhythm-trainer`);await p.locator('.launchSplash').waitFor({state:'detached'});
  await p.locator('.rt-library-print').click();for(let i=0;i<3;i++)await p.locator('.rt-card').nth(i).click();await p.getByRole('button',{name:/선택한 팩 (인쇄|미리보기)/}).click();
  assert.equal(await p.locator('[data-print-page]').count(),1);
  await p.locator('.rt-print-preview').scrollIntoViewIfNeeded();
  if(mobile)await p.getByRole('button',{name:'위치 조절',exact:true}).click();
  const cdp=mobile&&engine==='chromium'?await context.newCDPSession(p):null;
  const pointer=async(type,x,y)=>{
   if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:{down:'touchStart',move:'touchMove',up:'touchEnd',cancel:'touchCancel'}[type],touchPoints:['up','cancel'].includes(type)?[]:[{x,y}]});
   else if(type==='down'){await p.mouse.move(x,y);await p.mouse.down();}else if(type==='move')await p.mouse.move(x,y);else await p.mouse.up();
  };
  const state=async()=>p.locator('[data-print-section]').evaluateAll(els=>Object.fromEntries(els.map(el=>[el.dataset.printSection,{page:Number(el.closest('[data-print-page]').dataset.pageIndex),top:parseFloat(el.style.top),left:parseFloat(el.style.left),width:parseFloat(el.style.width),height:parseFloat(el.style.height),notes:el.querySelectorAll('svg').length}])));
  const initial=await state();
  const dragAcross=async(id,targetPage,minTop,direction=1)=>{
   const section=p.locator(`[data-print-section="${id}"]`);await section.scrollIntoViewIfNeeded();
   const box=await section.boundingBox(),scroll=await p.locator('.rt-print-scroll').boundingBox();
   const x=box.x+box.width*.45,y=Math.max(box.y+15,scroll.y+20),end=direction>0?scroll.y+scroll.height-5:scroll.y+5;
   await pointer('down',x,y);
   for(let i=1;i<=8;i++)await pointer('move',x+20*i/8,y+(end-y)*i/8);
   await p.waitForFunction(({id,targetPage,minTop})=>{const section=document.querySelector(`[data-print-section="${id}"]`);return Number(section.closest('[data-print-page]').dataset.pageIndex)===targetPage&&parseFloat(section.style.top)>=minTop;},{id,targetPage,minTop},{timeout:15000,polling:'raf'});
   await pointer('up',x+20,end);
   await p.waitForFunction(()=>!document.querySelector('.rt-print-frame--draft'));
   await p.waitForFunction(target=>document.querySelector('.rt-print-page-controls select').value===String(target),targetPage);
   assert.equal(await p.getByRole('combobox',{name:'미리보기 페이지',exact:true}).inputValue(),String(targetPage),'release keeps the destination page visible');
  };
  await dragAcross('2:0',1,500);
  let placed=await state();assert.deepEqual(placed['0:0'],initial['0:0']);assert.deepEqual(placed['1:0'],initial['1:0']);
  await p.getByRole('combobox',{name:'미리보기 페이지',exact:true}).selectOption('0');
  await dragAcross('1:0',1,45);
  placed=await state();assert.equal(placed['1:0'].page,1);assert.equal(placed['2:0'].page,1);assert.deepEqual(placed['0:0'],initial['0:0']);
  assert.ok(placed['1:0'].top+placed['1:0'].height<placed['2:0'].top,'both packs can occupy separate positions on page 2');
  for(const [id,section] of Object.entries(placed))for(const key of ['left','width','height','notes'])assert.equal(section[key],initial[id][key],`${id} keeps ${key}`);
  assert.equal(await p.locator('[data-print-page]').count(),2,'unused drag destination is not kept as a blank page');
  await p.screenshot({path:`${out}/${width}-packs-2-and-3-on-page-2.png`});
  // The saved PDF must use the two occupied sheets after a real drag.
  await p.getByRole('button',{name:'PDF 저장',exact:true}).click();const downloading=p.waitForEvent('download',{timeout:90000});
  await p.getByRole('button',{name:mobile?'PDF 만들기':'이 이름으로 저장',exact:true}).click();
  if(mobile)await p.getByRole('button',{name:'저장·공유',exact:true}).click({timeout:90000});
  const download=await downloading,filename=`${out}/${width}-moved-packs.pdf`;await download.saveAs(filename);
  const pdf=await getDocument({url:filename,useSystemFonts:true}).promise;try{assert.equal(pdf.numPages,2);}finally{await pdf.destroy();}
  if(mobile&&await p.locator('.rt-pdf-filename').isVisible())await p.locator('.rt-pdf-filename').getByRole('button',{name:'취소',exact:true}).click();
  await p.locator('.rt-print-preview').scrollIntoViewIfNeeded();
  await dragAcross('2:0',0,0,-1);assert.equal((await state())['2:0'].page,0,'packs can also cross into the previous page');
  // Cancellation removes the temporary blank sheet and re-enables controls.
  const box=await p.locator('[data-print-section="0:0"]').boundingBox();
  await p.locator('[data-print-section="0:0"]').scrollIntoViewIfNeeded();
  const visible=await p.locator('[data-print-section="0:0"]').boundingBox();
  await pointer('down',visible.x+30,visible.y+20);
  if(!mobile){await p.emulateMedia({media:'print'});assert.equal(await p.locator('.rt-print-frame--draft').evaluate(el=>getComputedStyle(el).display),'none','the temporary sheet is excluded from native print');await p.emulateMedia({media:'screen'});}
  await pointer('cancel',box.x,box.y);
  await p.waitForFunction(()=>!document.querySelector('.rt-print-frame--draft'));
  assert.equal(await p.getByRole('button',{name:'PDF 저장',exact:true}).isEnabled(),true);
  if(mobile){
   await p.getByRole('button',{name:'위치 조절 완료',exact:true}).click();
   const before=await state();
   if(cdp){const rect=await p.locator('.rt-print-scroll').boundingBox(),x=rect.x+rect.width*.5,y=rect.y+170;await pointer('down',x,y);for(let i=1;i<=6;i++){await pointer('move',x,y-i*18);await p.waitForTimeout(20);}await pointer('up',x,y-108);await p.waitForFunction(()=>document.querySelector('.rt-print-scroll').scrollTop>20);}
   assert.deepEqual(await state(),before,'ordinary mobile swipes do not move packs');
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${engine} ${width}: pack 3 then pack 2 cross to page 2, return drag, fixed size/left, cancellation, two-page PDF`);await context.close();
 }
}catch(error){if(p&&!p.isClosed())await p.screenshot({path:`${out}/failure.png`});throw error;}finally{await browser.close();}
