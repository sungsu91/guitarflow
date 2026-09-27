import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const {createCanvas}=await import(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const engine=process.env.PRINT_BROWSER||'chromium',base=process.env.PRINT_TEST_URL||'http://127.0.0.1:4193';
const out=process.env.PRINT_OUTPUT||`artifacts/print-flow-20260927/${engine}`;await mkdir(out,{recursive:true});
const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});
let p;
try{
 for(const width of (process.env.PRINT_WIDTHS||'390,1440').split(',').map(Number))for(const route of (process.env.PRINT_ROUTES||'rhythm-trainer,etudes').split(',')){
  const mobile=width<1024,context=await browser.newContext({viewport:{width,height:mobile?844:900},isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>Object.defineProperty(navigator,'share',{value:undefined,configurable:true}));
  p=await context.newPage();p.setDefaultTimeout(20000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`${base}/#${route}`);await p.locator('.launchSplash').waitFor({state:'detached'});
  if(route==='rhythm-trainer'){await p.locator('.rt-library-print').click();for(let i=0;i<3;i++)await p.locator('.rt-card').nth(i).click();await p.getByRole('button',{name:/선택한 팩 (인쇄|미리보기)/}).click();}
  else{await p.getByRole('button',{name:/악보 PDF (저장 · 인쇄|미리보기)/}).click();await p.locator('.score-print-page svg').first().waitFor();}
  assert.equal(await p.locator('.rt-print-edit details').count(),0,'editing controls are directly accessible');
  assert.equal(await p.getByRole('slider').count(),0,'duplicate placement sliders are removed');
  const title=p.getByRole('textbox',{name:'출력 제목',exact:true}),left=p.getByRole('textbox',{name:'출력 설명 1 · 왼쪽',exact:true}),right=p.getByRole('textbox',{name:'출력 설명 2 · 오른쪽',exact:true});
  const useLeft=p.getByRole('checkbox',{name:'설명 1 표시',exact:true}),useRight=p.getByRole('checkbox',{name:'설명 2 표시',exact:true});
  await title.fill('CENTER TITLE');await left.fill('LEFT DESCRIPTION');await right.fill('AUTHOR RIGHT');
  await useLeft.uncheck();assert.equal(await left.isDisabled(),true);assert.equal(await left.inputValue(),'LEFT DESCRIPTION');
  assert.equal(await p.locator('[data-print-page] .print-description-left').filter({hasText:'LEFT DESCRIPTION'}).count(),0);
  const rightOnly=await p.locator('[data-print-page] .print-description-right').filter({hasText:'AUTHOR RIGHT'}).evaluate(el=>({column:getComputedStyle(el).gridColumnStart,align:getComputedStyle(el).textAlign}));assert.deepEqual(rightOnly,{column:'2',align:'right'});
  await useRight.uncheck();assert.equal(await right.inputValue(),'AUTHOR RIGHT');assert.equal(await p.locator('[data-print-page] .print-description-right').filter({hasText:'AUTHOR RIGHT'}).count(),0);
  if(route==='rhythm-trainer'){
   const pack=p.getByRole('combobox',{name:'편집할 팩',exact:true});assert.equal(await pack.evaluate(el=>el.closest('.rt-print-field').contains(document.querySelector('.rt-print-field input'))),true);
   await pack.selectOption('1');assert.equal(await useLeft.isChecked(),true);assert.equal(await useRight.isChecked(),true);await pack.selectOption('0');assert.equal(await useLeft.isChecked(),false);assert.equal(await useRight.isChecked(),false);
   const density=p.getByRole('combobox',{name:'선택한 팩 · 한 줄 보기',exact:true});
   if(mobile){const a=await density.boundingBox(),b=await p.getByRole('button',{name:'위치 조절',exact:true}).boundingBox();assert.ok(a.x+a.width<=b.x+1);assert.ok(Math.abs(a.y+a.height/2-b.y-b.height/2)<2,'bars per row sits immediately before positioning');}
   else assert.equal(await density.evaluate(el=>Boolean(el.closest('.rt-print-controls'))),true);
   await density.selectOption('3');assert.equal(await p.locator('[data-print-section="0:0"] .rt-print-music').getAttribute('data-columns'),'3');await density.selectOption('2');
   assert.equal(await p.getByRole('button',{name:'자동 배치로 되돌리기',exact:true}).isVisible(),true);
  }
  await useLeft.check();await useRight.check();
  const originalNotes=await p.locator('[data-print-page] svg').count();
  const scroller=p.locator('.rt-print-scroll'),nav=p.getByRole('combobox',{name:'미리보기 페이지',exact:true});
  const cdp=mobile&&engine==='chromium'?await context.newCDPSession(p):null;
  const pointer=async(type,x,y)=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:{down:'touchStart',move:'touchMove',up:'touchEnd'}[type],touchPoints:type==='up'?[]:[{x,y}]});else if(type==='down'){await p.mouse.move(x,y);await p.mouse.down();}else if(type==='move')await p.mouse.move(x,y);else await p.mouse.up();};
  const drag=async(target,delta,untilSplit=false)=>{await target.scrollIntoViewIfNeeded();const box=await target.boundingBox(),view=await scroller.boundingBox(),x=box.x+box.width*.4,y=Math.max(box.y+15,view.y+20);await pointer('down',x,y);let endY=y;for(let i=1;i<=8;i++){endY=y+delta*i/8;await pointer('move',x,endY);await p.waitForTimeout(20);if(untilSplit&&await p.locator('[data-print-page=""][data-page-index="1"] [data-print-section="2:2"]').count())break;}await pointer('up',x,endY);await p.waitForTimeout(80);};
  const brands=async()=>p.locator('[data-print-page]').evaluateAll(pages=>pages.map(page=>{const box=page.getBoundingClientRect(),branding=page.querySelector('.print-page-branding');if(!branding)return null;const mark=branding.getBoundingClientRect();return {x:Math.round((mark.x-box.x)/box.width*794),y:Math.round((mark.y-box.y)/box.height*1123)};}));
  const firstBrand=(await brands())[0];
  if(mobile&&route==='rhythm-trainer')await p.getByRole('button',{name:'위치 조절',exact:true}).click();
  await p.locator('.rt-print-preview').scrollIntoViewIfNeeded();
  if(route==='rhythm-trainer'){
   const state=async()=>p.locator('[data-print-section]').evaluateAll(els=>els.map(el=>({id:el.dataset.printSection,page:Number(el.closest('[data-print-page]').dataset.pageIndex),top:parseFloat(el.style.top),height:parseFloat(el.style.height),left:parseFloat(el.style.left),notes:el.querySelectorAll('svg').length})));
   const before=await state();await drag(p.locator('[data-print-section="1:0"]'),mobile?70:140);const blocked=await state();
   assert.deepEqual(blocked.find(s=>s.id==='2:0'),before.find(s=>s.id==='2:0'),'lower pack is not pushed');
   assert.ok(blocked.find(s=>s.id==='1:0').top+blocked.find(s=>s.id==='1:0').height<=blocked.find(s=>s.id==='2:0').top);
   await p.getByRole('combobox',{name:'편집할 팩',exact:true}).selectOption('2');await drag(p.locator('[data-print-section="2:0"]'),mobile?120:300,true);
   await p.waitForFunction(()=>document.querySelectorAll('[data-print-section^="2:"]').length===2);
   const split=await state();assert.equal(split.find(s=>s.id==='2:0').page,0);assert.equal(split.find(s=>s.id==='2:2').page,1);assert.equal(split.find(s=>s.id==='2:0').notes,2);assert.equal(split.find(s=>s.id==='2:2').notes,2);
   assert.equal(await p.locator('[data-print-page] svg').count(),originalNotes,'no lost or duplicated measures across the boundary');
   // Repeated edits on the continuation retain page 2 and the same frame.
   await nav.selectOption('1');await p.evaluate(()=>window.testFrame=document.querySelectorAll('[data-print-frame]')[1]);
   await drag(p.locator('[data-print-section="2:2"]'),mobile?10:25);
   assert.equal(await p.evaluate(()=>window.testFrame===document.querySelectorAll('[data-print-frame]')[1]),true);assert.equal(await nav.inputValue(),'1');
   // Drag far upward: it must stop at the preceding pack, not cover branding.
   await nav.selectOption('0');await drag(p.locator('[data-print-section="0:0"]'),-80);
   assert.ok((await state()).find(s=>s.id==='0:0').top>=130);
  }else{
   assert.equal(await p.getByRole('button',{name:'위치 조절',exact:true}).count(),0);
   assert.equal(await p.getByRole('slider').count(),0,'fixed scores expose no spacing controls');
   assert.equal(await p.locator('.print-page-branding').count(),1,'only the first sheet has branding');
   const fixedLayout=()=>p.locator('[data-print-page]').evaluateAll(pages=>pages.map(page=>({padding:page.style.paddingTop,rows:[...page.querySelectorAll(':scope > section')].map(row=>({top:row.offsetTop,height:row.offsetHeight}))})));
   const before=await fixedLayout();assert.equal(parseFloat(before[0].padding),130);for(const item of before.slice(1))assert.equal(parseFloat(item.padding),45);
   for(const blank of [true,false]){
    await nav.selectOption('0');await p.locator('.rt-print-preview').scrollIntoViewIfNeeded();
    const page=p.locator('[data-print-page]').first(),paper=await page.boundingBox(),view=await scroller.boundingBox();
    const x=blank?paper.x+5:paper.x+paper.width*.5,y=view.y+Math.min(180,view.height-30);
    await pointer('down',x,y);for(let i=1;i<=6;i++){await pointer('move',x,y-i*18);await p.waitForTimeout(20);}await pointer('up',x,y-108);
    if(cdp)await p.waitForFunction(()=>document.querySelector('.rt-print-scroll').scrollTop>20);
    assert.deepEqual(await fixedLayout(),before,'both score and margin swipes preserve the fixed layout');
   }
   if(await p.locator('[data-print-page]').count()>1)await nav.selectOption('1');

  }
  for(const mark of (await brands()).filter(Boolean))assert.deepEqual(mark,firstBrand,'branding stays at fixed coordinates on every page');
  const geometry=await p.locator('[data-print-page]').evaluateAll(pages=>pages.map(page=>{const box=page.getBoundingClientRect();return [...page.querySelectorAll(':scope > section')].map(el=>{const r=el.getBoundingClientRect();return {minTop:page.dataset.pageIndex!=='0'&&page.classList.contains('score-print-page')?45:130,top:(r.top-box.top)/box.height*1123,bottom:(r.bottom-box.top)/box.height*1123};});}));
  for(const sections of geometry){for(const section of sections){assert.ok(section.top>=section.minTop-.1);assert.ok(section.bottom<=1050.1);}for(let i=1;i<sections.length;i++)assert.ok(sections[i-1].bottom<=sections[i].top+.1,'packs/rows never overlap');}
  const pageCount=await p.locator('[data-print-page]').count();assert.equal(await p.locator('.print-page-branding').count(),route==='rhythm-trainer'?pageCount:1);
  const qrBounds=await p.locator('[data-print-page]').evaluateAll(pages=>pages.map(page=>{const p=page.getBoundingClientRect(),image=page.querySelector('.rt-print-qr,.scoreSourceQr');if(!image)return null;const q=image.getBoundingClientRect();return {x:(q.x-p.x)/p.width,y:(q.y-p.y)/p.height,w:q.width/p.width,h:q.height/p.height};}));
  if(route==='rhythm-trainer'){
   const headings=await p.locator('[data-print-page]').evaluateAll(pages=>pages.map(page=>{const heading=page.querySelector('.rt-print-brand-title'),title=heading.getBoundingClientRect(),logo=page.querySelector('.rt-print-brand').getBoundingClientRect(),qr=page.querySelector('.rt-print-qr').getBoundingClientRect();return {id:heading.dataset.printPackTitle,first:page.querySelector('[data-print-section]').dataset.printSection,left:title.left,right:title.right,logoRight:logo.right,qrLeft:qr.left,titleY:title.y,logoY:logo.y};}));
   for(const heading of headings){assert.equal(heading.id,heading.first);assert.ok(heading.left>=heading.logoRight&&heading.right<=heading.qrLeft);assert.ok(Math.abs(heading.titleY-heading.logoY)<1);}
   await p.getByRole('combobox',{name:'편집할 팩',exact:true}).selectOption('0');
  }
  const pageNumbers=p.getByRole('checkbox',{name:'페이지 번호',exact:true});await pageNumbers.uncheck();assert.equal(await p.locator('.rt-print-page-number:visible,.scorePageNumber:visible').count(),0);await pageNumbers.check();
  await useLeft.uncheck();await useRight.uncheck();
  const exportCount=await p.locator('[data-print-page]').count();
  await p.screenshot({path:`${out}/${width}-${route}.png`});
  await p.getByRole('button',{name:'PDF 저장',exact:true}).click();const downloading=p.waitForEvent('download',{timeout:90000});await p.getByRole('button',{name:mobile?'PDF 만들기':'이 이름으로 저장',exact:true}).click();if(mobile)await p.getByRole('button',{name:'저장·공유',exact:true}).click({timeout:90000});const download=await downloading,filename=`${out}/${width}-${route}.pdf`;await download.saveAs(filename);
  const pdf=await getDocument({url:filename,useSystemFonts:true}).promise;
  try{assert.equal(pdf.numPages,exportCount);for(let n=1;n<=exportCount;n++){const page=await pdf.getPage(n),viewport=page.getViewport({scale:1}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const ctx=canvas.getContext('2d'),qr=qrBounds[n-1];if(qr){const pixels=ctx.getImageData(Math.round(qr.x*canvas.width),Math.round(qr.y*canvas.height),Math.floor(qr.w*canvas.width),Math.floor(qr.h*canvas.height)).data;let ink=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<100)ink++;assert.ok(ink>150,`page ${n}: fixed QR survives export`);}await writeFile(`${out}/${width}-${route}-${n}.png`,canvas.toBuffer('image/png'));}}finally{await pdf.destroy();}
  if(engine==='chromium'){const bytes=await p.pdf({preferCSSPageSize:true,printBackground:true}),pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;try{assert.equal(pdf.numPages,pageCount);for(let n=1;n<=pageCount;n++)assert.match((await(await pdf.getPage(n)).getTextContent()).items.map(item=>item.str).join(' '),/guitarflow\.vercel\.app/);}finally{await pdf.destroy();}}
  assert.deepEqual(errors,[]);console.log(`PASS ${engine} ${width} ${route}: preview controls, row flow or fixed score, branding and ${pageCount}-page PDF`);await context.close();
 }
}catch(error){if(p&&!p.isClosed())await p.screenshot({path:`${out}/failure.png`});throw error;}finally{await browser.close();}
