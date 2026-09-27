import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const {createCanvas}=await import(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const engine=process.env.PRINT_BROWSER||'chromium';
const base=process.env.PRINT_TEST_URL||'http://127.0.0.1:4193';
const out=process.env.PRINT_OUTPUT||`artifacts/rhythm-print-pages-20260927/${engine}`;
await mkdir(out,{recursive:true});
const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});
async function checkPdf(bytes,name,count){
 await writeFile(`${out}/${name}.pdf`,Buffer.from(bytes));
 const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;
 try{
  assert.equal(pdf.numPages,count);
  for(let i=1;i<=count;i++){
   const page=await pdf.getPage(i),viewport=page.getViewport({scale:1}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
   await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   let ink=0,footerInk=0;
   for(let p=0;p<pixels.length;p+=4){
    assert.equal(pixels[p],pixels[p+1],`${name} page ${i}: no red/green tint`);
    assert.equal(pixels[p],pixels[p+2],`${name} page ${i}: no blue tint`);
    if(pixels[p]<180){ink++;if(p/4>=canvas.width*(canvas.height-30))footerInk++;}
   }
   assert.ok(ink>1000,`${name} page ${i}: score is not blank`);
   assert.ok(footerInk>20,`${name} page ${i}: footer stays on page`);
   await writeFile(`${out}/${name}-${i}.png`,canvas.toBuffer('image/png'));
  }
 }finally{await pdf.destroy();}
}
let p;
try{
 for(const width of (process.env.PRINT_WIDTHS||'390,1440').split(',').map(Number)){
  const mobile=width<1024,context=await browser.newContext({viewport:{width,height:mobile?844:900},isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob.type==='application/pdf')window.testPdf=blob.arrayBuffer().then(b=>[...new Uint8Array(b)]);return create(blob);};});
  p=await context.newPage();p.setDefaultTimeout(20000);
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`${base}/#rhythm-trainer`);await p.locator('.launchSplash').waitFor({state:'detached'});
  await p.locator('.rt-library-print').click();for(let i=0;i<3;i++)await p.locator('.rt-card').nth(i).click();await p.getByRole('button',{name:/선택한 팩 (인쇄|미리보기)/}).click();
  assert.equal(await p.locator('.rt-print-page').count(),1);
  await p.locator('.rt-print-edit > label select').selectOption('2');
  await p.getByText('표시 · 여백 설정',{exact:true}).click();
  const range=p.getByRole('slider',{name:'세로 위치'});
  await range.press('End');
  await p.getByRole('combobox',{name:'배치할 페이지',exact:true}).selectOption('1');
  await p.getByRole('combobox',{name:'미리보기 페이지',exact:true}).selectOption('0');
  assert.equal(await p.locator('.rt-print-page').count(),2,'spacing moves the selected pack onto page 2');
  const pageSelect=p.getByRole('combobox',{name:'미리보기 페이지',exact:true});
  await p.getByRole('button',{name:'다음 페이지',exact:true}).click();assert.equal(await pageSelect.inputValue(),'1');
  const visible=await p.locator('.rt-print-scroll').evaluate(el=>{const box=el.getBoundingClientRect(),page=el.querySelectorAll('.rt-print-frame')[1].getBoundingClientRect();return{scroll:el.scrollTop,top:page.top,viewport:box.top,bottom:box.bottom};});
  assert.ok(visible.scroll>0);assert.ok(visible.top>=visible.viewport-1&&visible.top<visible.bottom-60,JSON.stringify(visible));
  await p.screenshot({path:`${out}/${width}-second-page.png`});
  await p.getByRole('button',{name:'이전 페이지',exact:true}).click();assert.equal(await pageSelect.inputValue(),'0');
  await pageSelect.selectOption('1');assert.equal(await pageSelect.inputValue(),'1');
  if(mobile){
   assert.equal(await p.locator('.rt-print-section').first().evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
   await p.getByRole('button',{name:'위치 조절',exact:true}).click();
   assert.equal(await p.locator('.rt-print-section').first().evaluate(el=>getComputedStyle(el).touchAction),'none');
   await p.getByRole('button',{name:'위치 조절 완료',exact:true}).click();
   assert.equal(await p.locator('.rt-print-section').first().evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
   // A real touch swipe over notation must scroll, without changing spacing.
   if(engine==='chromium'){
    await p.getByRole('button',{name:'이전 페이지',exact:true}).click();await p.locator('.rt-print-preview').scrollIntoViewIfNeeded();
    const cdp=await context.newCDPSession(p),box=await p.locator('.rt-print-scroll').boundingBox();
    const x=box.x+box.width*.25,y=box.y+Math.min(box.height-15,180);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*18}]});await p.waitForTimeout(20);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await p.waitForFunction(()=>document.querySelector('.rt-print-scroll').scrollTop>20);
    assert.equal(Number(await range.inputValue()),Number(await range.getAttribute('max')));
   }
   assert.equal(await p.getByRole('button',{name:'인쇄용 PDF 열기',exact:true}).count(),0);
  }
  // Saved PDF uses the same grayscale converter on desktop and mobile.
  await p.getByRole('button',{name:'PDF 저장',exact:true}).click();const downloading=p.waitForEvent('download',{timeout:90000});await p.getByRole('button',{name:mobile?'PDF 만들기':'이 이름으로 저장',exact:true}).click();if(mobile)await p.getByRole('button',{name:'저장·공유',exact:true}).click({timeout:90000});await downloading;
  await checkPdf(await p.evaluate(()=>window.testPdf),`${width}-saved`,2);
  if(engine==='chromium'){
   await p.emulateMedia({media:'print'});
   assert.equal(await p.locator('.rt-print-navigation').evaluate(el=>getComputedStyle(el).display),'none');
   const bytes=await p.pdf({preferCSSPageSize:true,printBackground:true});
   await writeFile(`${out}/${width}-native.pdf`,bytes);
   const native=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;
   try{assert.equal(native.numPages,2);for(let i=1;i<=2;i++){const page=await native.getPage(i);assert.match((await page.getTextContent()).items.map(item=>item.str).join(' '),/guitarflow\.vercel\.app/);}}finally{await native.destroy();}
   await p.emulateMedia({media:'screen'});
  }
  await p.getByRole('button',{name:'자동 배치로 되돌리기',exact:true}).click();assert.equal(await p.locator('.rt-print-page').count(),1);assert.equal(await pageSelect.inputValue(),'0');
  assert.ok(await p.getByRole('button',{name:'다음 페이지',exact:true}).isDisabled());
  await p.screenshot({path:`${out}/${width}-one-page.png`});
  assert.deepEqual(errors,[]);console.log(`PASS ${engine} ${width}: page creation/navigation/removal, touch modes and grayscale PDF pixels`);await context.close();
 }
}catch(error){console.error(error);if(p&&!p.isClosed())await p.screenshot({path:`${out}/failure.png`});throw error;}finally{await browser.close();}
