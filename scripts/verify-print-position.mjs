import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const {createCanvas}=await import(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const engine=process.env.PRINT_BROWSER||'chromium',base=process.env.PRINT_TEST_URL||'http://127.0.0.1:4193';
const out=process.env.PRINT_OUTPUT||`artifacts/print-position-20260927/${engine}`;await mkdir(out,{recursive:true});
const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});
async function setRange(locator,value){await locator.evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);}
let p;
try{
 for(const width of (process.env.PRINT_WIDTHS||'390,1440').split(',').map(Number))for(const route of ['etudes','rhythm-trainer']){
  const mobile=width<1024,context=await browser.newContext({viewport:{width,height:mobile?844:900},isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});});
  p=await context.newPage();p.setDefaultTimeout(20000);const errors=[];p.on('pageerror',error=>errors.push(error.message));
  await p.goto(`${base}/#${route}`);await p.locator('.launchSplash').waitFor({state:'detached'});
  if(route==='rhythm-trainer'){
   await p.locator('.rt-library-print').click();for(let i=0;i<3;i++)await p.locator('.rt-card').nth(i).click();await p.getByRole('button',{name:/선택한 팩 (인쇄|미리보기)/}).click();
   await p.getByRole('combobox',{name:'편집할 팩',exact:true}).selectOption('2');
  }else{await p.getByRole('button',{name:/악보 PDF (미리보기|저장 · 인쇄)/}).click();await p.locator('.score-print-page svg').first().waitFor();}
  await p.getByRole('textbox',{name:'출력 제목',exact:true}).fill('CENTER TITLE');
  await p.getByRole('textbox',{name:'출력 설명 1 · 왼쪽',exact:true}).fill('LEFT DESCRIPTION');
  await p.getByRole('textbox',{name:'출력 설명 2 · 오른쪽',exact:true}).fill('AUTHOR RIGHT');
  await p.getByText('표시 · 여백 설정',{exact:true}).click();
  if(route==='rhythm-trainer'){
   const before=await p.locator('[data-print-section]').evaluateAll(elements=>elements.slice(0,2).map(el=>el.style.top));
   const vertical=p.getByRole('slider',{name:'세로 위치',exact:true});await vertical.press('Home');
   assert.equal(Number(await vertical.inputValue()),10,'pack can move above its original slot and earlier packs');
   assert.deepEqual(await p.locator('[data-print-section]').evaluateAll(elements=>elements.slice(0,2).map(el=>el.style.top)),before);
   await vertical.press('End');assert.ok(Number(await vertical.inputValue())>500,'movement is not capped at 240 pixels');
   await p.getByRole('combobox',{name:'배치할 페이지',exact:true}).selectOption('1');
   await setRange(vertical,'120');
   assert.equal(await p.getByRole('slider',{name:'가로 위치',exact:true}).count(),0,'horizontal placement stays fixed');
   assert.equal(await p.locator('[data-print-page]').count(),2);assert.equal(await p.getByRole('combobox',{name:'미리보기 페이지',exact:true}).inputValue(),'1');
  }else{
   // Desktop's default four bars per row fits on one page. The page-2 regression
   // is exercised using the phone's authored one-bar-per-row layout.
   if(await p.locator('[data-print-page]').count()>1)await p.getByRole('button',{name:'다음 페이지',exact:true}).click();
  }
  const countBefore=await p.locator('[data-print-page]').count(),pageIndex=countBefore>1?1:0;
  await p.locator('.rt-print-preview').scrollIntoViewIfNeeded();
  await p.evaluate(index=>{window.testFrame=document.querySelectorAll('[data-print-frame]')[index];window.testFirstPadding=document.querySelector('[data-print-page]').style.paddingTop;window.testScroll=document.querySelector('.rt-print-scroll').scrollTop;},pageIndex);
  if(mobile)await p.getByRole('button',{name:'위치 조절',exact:true}).click();
  const frame=p.locator('[data-print-frame]').nth(pageIndex),scroller=p.locator('.rt-print-scroll');
  const touch=mobile&&engine==='chromium'?await context.newCDPSession(p):null;
  for(let n=0;n<3;n++){
   const box=await scroller.boundingBox(),paper=await frame.boundingBox();
   const target=route==='rhythm-trainer'?await p.locator('[data-print-section="2:0"]').boundingBox():null;
   const x=paper.x+paper.width*.4,y=target?target.y+30:Math.max(box.y+40,paper.y+70);
   if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let step=1;step<=5;step++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+4*step/5,y:y+12*step/5}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+4,y+12,{steps:5});await p.mouse.up();}
   assert.equal(await p.evaluate(index=>window.testFrame===document.querySelectorAll('[data-print-frame]')[index],pageIndex),true,'the active page frame survives layout changes');
   const scroll=await scroller.evaluate(el=>el.scrollTop);assert.ok(Math.abs(scroll-await p.evaluate(()=>window.testScroll))<2,'drag keeps the page in view');
   assert.equal(await p.getByRole('combobox',{name:'미리보기 페이지',exact:true}).inputValue(),String(pageIndex));
  }
  if(route==='etudes'&&pageIndex===1){
   assert.equal(await p.locator('[data-print-page]').first().evaluate(el=>el.style.paddingTop),await p.evaluate(()=>window.testFirstPadding),'page 2 drag does not edit page 1');
   assert.ok(await p.locator('[data-print-page]').nth(1).evaluate(el=>parseFloat(el.style.paddingTop)>45));
  }
  await p.getByRole('textbox',{name:'출력 설명 2 · 오른쪽',exact:true}).fill('AUTHOR RIGHT UPDATED');
  assert.ok(Math.abs(await scroller.evaluate(el=>el.scrollTop)-await p.evaluate(()=>window.testScroll))<2,'metadata edits retain the current page');
  const alignment=await p.locator('.print-description-row').evaluateAll(rows=>rows.map(row=>({left:getComputedStyle(row.children[0]).textAlign,right:getComputedStyle(row.children[1]).textAlign,leftBox:row.children[0].getBoundingClientRect().toJSON(),rightBox:row.children[1].getBoundingClientRect().toJSON()})));
  for(const row of alignment){assert.equal(row.left,'left');assert.equal(row.right,'right');assert.ok(row.leftBox.x<row.rightBox.x);assert.ok(Math.abs(row.leftBox.y-row.rightBox.y)<1,'both descriptions share a baseline');}
  if(route==='rhythm-trainer'){const geometry=await p.locator('[data-print-section]').evaluateAll(sections=>sections.map(section=>({description:section.querySelector('.print-description-row')?.getBoundingClientRect().bottom,music:section.querySelector('.rt-print-music').getBoundingClientRect().top})));for(const item of geometry)assert.ok(item.description<=item.music,'descriptions stay above the notation');}
  await p.locator('.rt-print-preview').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/${width}-${route}.png`});
  const pageCount=await p.locator('[data-print-page]').count();
  const qrBounds=await p.locator('[data-print-page]').nth(route==='rhythm-trainer'?1:0).locator('.rt-print-qr,.scoreSourceQr').evaluate(el=>{const qr=el.getBoundingClientRect(),page=el.closest('[data-print-page]').getBoundingClientRect();return{x:(qr.x-page.x)/page.width,y:(qr.y-page.y)/page.height,w:qr.width/page.width,h:qr.height/page.height};});
  await p.getByRole('button',{name:'PDF 저장',exact:true}).click();
  const downloading=p.waitForEvent('download',{timeout:90000});await p.getByRole('button',{name:mobile?'PDF 만들기':'이 이름으로 저장',exact:true}).click();
  if(mobile)await p.getByRole('button',{name:'저장·공유',exact:true}).click({timeout:90000});
  const download=await downloading,filename=`${out}/${width}-${route}.pdf`;await download.saveAs(filename);
  const pdf=await getDocument({url:filename,useSystemFonts:true}).promise;
  try{assert.equal(pdf.numPages,pageCount);const page=await pdf.getPage(route==='rhythm-trainer'?2:1),viewport=page.getViewport({scale:1}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const ctx=canvas.getContext('2d'),pixels=ctx.getImageData(Math.round(qrBounds.x*canvas.width),Math.round(qrBounds.y*canvas.height),Math.floor(qrBounds.w*canvas.width),Math.floor(qrBounds.h*canvas.height)).data;let qrInk=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<100)qrInk++;assert.ok(qrInk>150,'exported QR contains its image');await writeFile(`${out}/${width}-${route}-pdf.png`,canvas.toBuffer('image/png'));}finally{await pdf.destroy();}
  if(engine==='chromium'){
   const native=await p.pdf({preferCSSPageSize:true,printBackground:true}),pdf=await getDocument({data:new Uint8Array(native),useSystemFonts:true}).promise;
   try{assert.equal(pdf.numPages,pageCount);let text='';for(let n=1;n<=pageCount;n++){const page=await pdf.getPage(n),words=(await page.getTextContent()).items.map(item=>item.str).join(' ');assert.match(words,/guitarflow\.vercel\.app/);text+=' '+words;}assert.match(text,/LEFT DESCRIPTION/);assert.match(text,/AUTHOR RIGHT UPDATED/);assert.match(text,/CENTER TITLE/);}finally{await pdf.destroy();}
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${engine} ${width} ${route}: stable page edits, independent placement, left/right credits and ${pageCount}-page PDF`);await context.close();
 }
}catch(error){if(p&&!p.isClosed())await p.screenshot({path:`${out}/failure.png`});throw error;}finally{await browser.close();}
