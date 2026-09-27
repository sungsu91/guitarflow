import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const {createCanvas}=await import(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const engine=process.env.PRINT_BROWSER||'chromium',base=process.env.PRINT_TEST_URL||'http://127.0.0.1:4193';
const out=process.env.PRINT_OUTPUT||`artifacts/shared-print-20260927/${engine}`;await mkdir(out,{recursive:true});
const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});
try{
 for(const route of (process.env.PRINT_ROUTES||'rhythm-trainer,etudes').split(',')){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{
   window.testShareCount=0;window.testPrintCount=0;window.print=()=>window.testPrintCount++;
   Object.defineProperty(navigator,'canShare',{configurable:true,value:({files})=>files?.[0]?.type==='application/pdf'});
   Object.defineProperty(navigator,'share',{configurable:true,value:async({files})=>{window.testShareCount++;window.testSharedName=files[0].name;window.testSharedPdf=[...new Uint8Array(await files[0].arrayBuffer())];if(window.testShareCount===1)throw new DOMException('Cancelled','AbortError');}});
  });
  const p=await context.newPage(),errors=[];p.on('pageerror',error=>errors.push(error.message));p.setDefaultTimeout(20000);
  await p.goto(`${base}/#${route}`);await p.locator('.launchSplash').waitFor({state:'detached'});
  if(route==='rhythm-trainer'){await p.locator('.rt-library-print').click();for(let i=0;i<3;i++)await p.locator('.rt-card').nth(i).click();}
  const open=async()=>{
   await p.getByRole('button',{name:route==='rhythm-trainer'?/선택한 팩 (인쇄|미리보기)/:/악보 PDF (저장 · 인쇄|미리보기)/}).click();
   await p.locator('.print-preview-overlay[open]').waitFor();await p.locator('[data-print-page] svg').first().waitFor();
  };
  await open();
  const originalSvgCount=await p.locator('[data-print-page] svg').count();
  if(route==='rhythm-trainer')await p.getByRole('combobox',{name:'편집할 팩',exact:true}).selectOption('2');
  await p.getByRole('textbox',{name:'출력 제목',exact:true}).fill('공통 미리보기');
  await p.getByRole('textbox',{name:'출력 설명',exact:true}).fill('위치 조절과 저장 확인');
  await p.getByText('표시 · 여백 설정',{exact:true}).click();
  const spacing=p.getByRole('slider',{name:'위쪽 여백'});await spacing.press('End');
  const count=await p.locator('[data-print-page]').count();assert.ok(count>=2);
  assert.equal(await p.locator('[data-print-page] svg').count(),originalSvgCount,'pagination preserves every score measure');
  await p.getByRole('button',{name:'다음 페이지',exact:true}).click();
  assert.equal(await p.getByRole('combobox',{name:'미리보기 페이지',exact:true}).inputValue(),'1');
  await p.getByRole('button',{name:'위치 조절',exact:true}).click();await p.getByRole('button',{name:'위치 조절 완료',exact:true}).click();
  await p.screenshot({path:`${out}/${route}-second-page.png`});
  await p.getByRole('button',{name:'PDF 저장',exact:true}).click();await p.getByRole('button',{name:'PDF 만들기',exact:true}).click();
  const share=p.getByRole('button',{name:'저장·공유',exact:true});await share.waitFor({timeout:90000});await share.click();
  await p.waitForFunction(()=>window.testShareCount===1);await share.waitFor();assert.equal(await p.getByRole('alert').count(),0,'share cancellation is not an error');
  await share.click();await p.locator('.rt-pdf-filename').waitFor({state:'detached'});assert.equal(await p.evaluate(()=>window.testShareCount),2);
  const bytes=await p.evaluate(()=>window.testSharedPdf);await writeFile(`${out}/${route}.pdf`,Buffer.from(bytes));
  const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;
  try{assert.equal(pdf.numPages,count);for(let n=1;n<=count;n++){
   const page=await pdf.getPage(n),viewport=page.getViewport({scale:1}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
   await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let ink=0,footer=0;
   for(let i=0;i<data.length;i+=4){assert.equal(data[i],data[i+1]);assert.equal(data[i],data[i+2]);if(data[i]<180){ink++;if(i/4>canvas.width*(canvas.height-32))footer++;}}
   assert.ok(ink>1000,'every page contains score content');assert.ok(footer>20,'footer remains on the same page');
  }}finally{await pdf.destroy();}
  assert.equal(context.pages().length,1,'no mobile PDF popup');assert.equal(await p.evaluate(()=>window.testPrintCount),0);
  await p.evaluate(()=>history.back());await p.locator('.print-preview-overlay').waitFor({state:'detached'});
  assert.equal(new URL(p.url()).hash,`#${route}`);
  assert.equal(await p.locator('.appRuntime').evaluate(el=>getComputedStyle(el).filter),'none');
  await open();await p.getByRole('button',{name:'PDF 저장',exact:true}).click();await p.getByRole('button',{name:'PDF 만들기',exact:true}).click();await p.getByRole('button',{name:'닫기',exact:true}).click();await p.locator('.print-preview-overlay').waitFor({state:'detached'});
  await open();await p.getByRole('textbox',{name:'출력 설명',exact:true}).fill('닫은 뒤 다시 편집 가능');await p.getByRole('button',{name:'닫기',exact:true}).click();await p.locator('.print-preview-overlay').waitFor({state:'detached'});
  if(route==='etudes'){
   await p.locator('.scoreWorkspaceActionTrigger').click();await p.getByRole('menuitem',{name:'제작',exact:true}).click();
   await p.locator('.etudeEditor[open]').waitFor();await p.locator('.etudePrintPreview').click();await p.locator('.score-print-page svg').first().waitFor();
   await p.getByRole('button',{name:'위치 조절',exact:true}).click();await p.locator('.rt-print-preview').scrollIntoViewIfNeeded();
   const box=await p.locator('.rt-print-scroll').boundingBox();await p.mouse.move(box.x+box.width*.25,box.y+80);await p.mouse.down();await p.mouse.move(box.x+box.width*.25,box.y+110,{steps:4});await p.mouse.up();
   await p.getByText('표시 · 여백 설정',{exact:true}).click();assert.ok(Number(await p.getByRole('slider',{name:'위쪽 여백'}).inputValue())>0,'score can be repositioned by dragging');
   await p.keyboard.press('Escape');await p.locator('.print-preview-overlay').waitFor({state:'detached'});assert.ok(await p.locator('.etudeEditor').evaluate(el=>el.open),'preview close returns to the editor');
   await p.locator('.etudePrintPreview').click();await p.locator('.score-print-page svg').first().waitFor();await p.getByRole('button',{name:'닫기',exact:true}).click();await p.locator('.print-preview-overlay').waitFor({state:'detached'});
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${engine} ${route}: shared controls, grayscale ${count}-page PDF, cancelled sharing, back/reopen and close during export`);await context.close();
 }
}finally{await browser.close();}
