import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const {createCanvas}=await import(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const engine=process.env.PRINT_BROWSER||'chromium',base=process.env.PRINT_TEST_URL||'http://127.0.0.1:4193';
const out=process.env.PRINT_OUTPUT||`artifacts/print-flow-20260927/${engine}`;await mkdir(out,{recursive:true});
const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});
const setRange=async(locator,value)=>locator.evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},String(value));
let p;
try{
 for(const width of (process.env.PRINT_WIDTHS||'390,1440').split(',').map(Number))for(const route of (process.env.PRINT_ROUTES||'rhythm-trainer,etudes').split(',')){
  const mobile=width<1024,context=await browser.newContext({viewport:{width,height:mobile?844:900},isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>Object.defineProperty(navigator,'share',{value:undefined,configurable:true}));
  p=await context.newPage();p.setDefaultTimeout(20000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`${base}/#${route}`);await p.locator('.launchSplash').waitFor({state:'detached'});
  if(route==='rhythm-trainer'){await p.locator('.rt-library-print').click();for(let i=0;i<3;i++)await p.locator('.rt-card').nth(i).click();await p.getByRole('button',{name:/선택한 팩 (인쇄|미리보기)/}).click();}
  else{await p.getByRole('button',{name:/악보 PDF (저장 · 인쇄|미리보기)/}).click();await p.locator('.score-print-page svg').first().waitFor();}
  const originalNotes=await p.locator('[data-print-page] svg').count();
  await p.getByText('표시 · 여백 설정',{exact:true}).click();
  const range=p.getByRole('slider',{name:route==='rhythm-trainer'?'세로 위치':'위쪽 여백',exact:true});
  const scroller=p.locator('.rt-print-scroll'),nav=p.getByRole('combobox',{name:'미리보기 페이지',exact:true});
  const cdp=mobile&&engine==='chromium'?await context.newCDPSession(p):null;
  const pointer=async(type,x,y)=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:{down:'touchStart',move:'touchMove',up:'touchEnd'}[type],touchPoints:type==='up'?[]:[{x,y}]});else if(type==='down'){await p.mouse.move(x,y);await p.mouse.down();}else if(type==='move')await p.mouse.move(x,y);else await p.mouse.up();};
  const drag=async(target,delta,untilSplit=false)=>{await target.scrollIntoViewIfNeeded();const box=await target.boundingBox(),view=await scroller.boundingBox(),x=box.x+box.width*.4,y=Math.max(box.y+15,view.y+20);await pointer('down',x,y);let endY=y;for(let i=1;i<=8;i++){endY=y+delta*i/8;await pointer('move',x,endY);await p.waitForTimeout(20);if(untilSplit&&await p.locator('[data-print-page=""][data-page-index="1"] [data-print-section="2:2"]').count())break;}await pointer('up',x,endY);await p.waitForTimeout(80);};
  const brands=async()=>p.locator('[data-print-page]').evaluateAll(pages=>pages.map(page=>{const box=page.getBoundingClientRect(),mark=page.querySelector('.print-page-branding').getBoundingClientRect();return {x:Math.round((mark.x-box.x)/box.width*794),y:Math.round((mark.y-box.y)/box.height*1123)};}));
  const firstBrand=(await brands())[0];
  if(mobile)await p.getByRole('button',{name:'위치 조절',exact:true}).click();
  await p.locator('.rt-print-preview').scrollIntoViewIfNeeded();
  if(route==='rhythm-trainer'){
   const state=async()=>p.locator('[data-print-section]').evaluateAll(els=>els.map(el=>({id:el.dataset.printSection,page:Number(el.closest('[data-print-page]').dataset.pageIndex),top:parseFloat(el.style.top),height:parseFloat(el.style.height),left:parseFloat(el.style.left),notes:el.querySelectorAll('svg').length})));
   const before=await state();await drag(p.locator('[data-print-section="1:0"]'),mobile?70:140);const blocked=await state();
   assert.deepEqual(blocked.find(s=>s.id==='2:0'),before.find(s=>s.id==='2:0'),'lower pack is not pushed');
   assert.ok(blocked.find(s=>s.id==='1:0').top+blocked.find(s=>s.id==='1:0').height<=blocked.find(s=>s.id==='2:0').top);
   await p.getByRole('combobox',{name:'편집할 팩',exact:true}).selectOption('2');await setRange(range,650);await drag(p.locator('[data-print-section="2:0"]'),mobile?120:300,true);
   await p.waitForFunction(()=>document.querySelectorAll('[data-print-section^="2:"]').length===2);
   const split=await state();assert.equal(split.find(s=>s.id==='2:0').page,0);assert.equal(split.find(s=>s.id==='2:2').page,1);assert.equal(split.find(s=>s.id==='2:0').notes,2);assert.equal(split.find(s=>s.id==='2:2').notes,2);
   assert.equal(await p.locator('[data-print-page] svg').count(),originalNotes,'no lost or duplicated measures across the boundary');
   // Repeated edits on the continuation retain page 2 and the same frame.
   await nav.selectOption('1');await p.evaluate(()=>window.testFrame=document.querySelectorAll('[data-print-frame]')[1]);
   await drag(p.locator('[data-print-section="2:2"]'),mobile?10:25);
   assert.equal(await p.evaluate(()=>window.testFrame===document.querySelectorAll('[data-print-frame]')[1]),true);assert.equal(await nav.inputValue(),'1');
   // Drag far upward: it must stop at the preceding pack, not cover branding.
   await setRange(range,650);await nav.selectOption('0');await drag(p.locator('[data-print-section="0:0"]'),-80);
   assert.ok((await state()).find(s=>s.id==='0:0').top>=130);
   await p.getByRole('combobox',{name:'편집할 팩',exact:true}).selectOption('2');await setRange(range,850);
  }else{
   // White margins are scroll surfaces even with positioning enabled.
   const page=p.locator('[data-print-page]').first();await nav.selectOption('0');await p.locator('.rt-print-preview').scrollIntoViewIfNeeded();
   const paper=await page.boundingBox(),view=await scroller.boundingBox(),x=paper.x+5,y=view.y+Math.min(180,view.height-30),padding=await page.evaluate(el=>el.style.paddingTop),value=await range.inputValue();
   if(cdp){await pointer('down',x,y);for(let i=1;i<=6;i++){await pointer('move',x,y-i*18);await p.waitForTimeout(20);}await pointer('up',x,y-108);await p.waitForFunction(()=>document.querySelector('.rt-print-scroll').scrollTop>20);}
   else{await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x,y-60,{steps:6});await p.mouse.up();}
   assert.equal(await page.evaluate(el=>el.style.paddingTop),padding,'blank-margin gesture must not change spacing');assert.equal(await range.inputValue(),value);
   assert.equal(await page.evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
   await nav.selectOption('0');await drag(page.locator(':scope > section').first(),30);assert.ok(Number(await range.inputValue())>0,'notation itself remains draggable');
   // Spacing slider still edits only its chosen page.
   await setRange(range,100);assert.equal(await page.evaluate(el=>parseFloat(el.style.paddingTop)),230);
   if(await p.locator('[data-print-page]').count()>1){await nav.selectOption('1');const old=await page.evaluate(el=>el.style.paddingTop);await setRange(range,100);assert.equal(await page.evaluate(el=>el.style.paddingTop),old);assert.equal(await nav.inputValue(),'1');}
  }
  for(const mark of await brands())assert.deepEqual(mark,firstBrand,'branding stays at fixed coordinates on every page');
  const geometry=await p.locator('[data-print-page]').evaluateAll(pages=>pages.map(page=>{const box=page.getBoundingClientRect();return [...page.querySelectorAll(':scope > section')].map(el=>{const r=el.getBoundingClientRect();return {top:(r.top-box.top)/box.height*1123,bottom:(r.bottom-box.top)/box.height*1123};});}));
  for(const sections of geometry){for(const section of sections){assert.ok(section.top>=129.9);assert.ok(section.bottom<=1050.1);}for(let i=1;i<sections.length;i++)assert.ok(sections[i-1].bottom<=sections[i].top+.1,'packs/rows never overlap');}
  const pageCount=await p.locator('[data-print-page]').count();assert.equal(await p.locator('.print-page-branding').count(),pageCount);
  const qrBounds=await p.locator('[data-print-page]').evaluateAll(pages=>pages.map(page=>{const p=page.getBoundingClientRect(),q=page.querySelector('.rt-print-qr,.scoreSourceQr').getBoundingClientRect();return {x:(q.x-p.x)/p.width,y:(q.y-p.y)/p.height,w:q.width/p.width,h:q.height/p.height};}));
  await p.screenshot({path:`${out}/${width}-${route}.png`});
  await p.getByRole('button',{name:'PDF 저장',exact:true}).click();const downloading=p.waitForEvent('download',{timeout:90000});await p.getByRole('button',{name:mobile?'PDF 만들기':'이 이름으로 저장',exact:true}).click();if(mobile)await p.getByRole('button',{name:'저장·공유',exact:true}).click({timeout:90000});const download=await downloading,filename=`${out}/${width}-${route}.pdf`;await download.saveAs(filename);
  const pdf=await getDocument({url:filename,useSystemFonts:true}).promise;
  try{assert.equal(pdf.numPages,pageCount);for(let n=1;n<=pageCount;n++){const page=await pdf.getPage(n),viewport=page.getViewport({scale:1}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const ctx=canvas.getContext('2d'),qr=qrBounds[n-1],pixels=ctx.getImageData(Math.round(qr.x*canvas.width),Math.round(qr.y*canvas.height),Math.floor(qr.w*canvas.width),Math.floor(qr.h*canvas.height)).data;let ink=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<100)ink++;assert.ok(ink>150,`page ${n}: fixed QR survives export`);await writeFile(`${out}/${width}-${route}-${n}.png`,canvas.toBuffer('image/png'));}}finally{await pdf.destroy();}
  if(engine==='chromium'){const bytes=await p.pdf({preferCSSPageSize:true,printBackground:true}),pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;try{assert.equal(pdf.numPages,pageCount);for(let n=1;n<=pageCount;n++)assert.match((await(await pdf.getPage(n)).getTextContent()).items.map(item=>item.str).join(' '),/guitarflow\.vercel\.app/);}finally{await pdf.destroy();}}
  assert.deepEqual(errors,[]);console.log(`PASS ${engine} ${width} ${route}: row overflow, collision limits, blank-margin scrolling, fixed branding and ${pageCount}-page PDF`);await context.close();
 }
}catch(error){if(p&&!p.isClosed())await p.screenshot({path:`${out}/failure.png`});throw error;}finally{await browser.close();}
