// Isolated browser profiles only; generated PDFs contain built-in practice data.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const engine=process.env.PRINT_BROWSER||'chromium';
const base=process.env.PRINT_TEST_URL||'http://127.0.0.1:4193';
const out=`artifacts/mobile-print-20260927/${engine}`;await mkdir(out,{recursive:true});
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{channel:'msedge'}:{})});
const results=[];
async function verifyPdf(path,expected,{text=false}={}){
 const pdf=await getDocument({data:new Uint8Array(await readFile(path)),useSystemFonts:true}).promise;
 try{assert.equal(pdf.numPages,expected,`${path}: no extra blank page`);
  if(text)for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i),content=await page.getTextContent(),words=content.items.map(x=>x.str).join(' ');
   assert.match(words,/guitarflow\.vercel\.app/,`${path}: address on every score page`);
   assert.ok(words.replace(/https?:\/\/guitarflow\.vercel\.app\/?/g,'').trim().length>12,`${path}: every page includes score content`);
  }
 }finally{await pdf.destroy();}
}
async function printGeometry(page,selector){
 await page.emulateMedia({media:'print'});
 const data=await page.evaluate(selector=>({bodyDisplay:getComputedStyle(document.body).display,pages:[...document.querySelectorAll(selector)].map(el=>{const p=el.getBoundingClientRect(),f=el.querySelector('footer').getBoundingClientRect();return {page:{y:p.y,height:p.height,bottom:p.bottom},footer:{y:f.y,bottom:f.bottom},transform:getComputedStyle(el).transform};})}),selector);
 assert.equal(data.bodyDisplay,'block');
 for(const p of data.pages){assert.equal(p.transform,'none');assert.ok(p.footer.y>=p.page.y&&p.footer.bottom<=p.page.bottom,JSON.stringify(p));}
 return data;
}
try{
 for(const [width,height]of [[360,640],[390,844],[844,390],[1440,900]]){
  if(process.env.PRINT_WIDTHS&&!process.env.PRINT_WIDTHS.split(',').map(Number).includes(width))continue;
  const mobile=width<1024,context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.testCopiedLink=text;}},configurable:true});});
  await p.goto(`${base}/#rhythm-trainer`);await p.locator('.rt-library-print').waitFor();await p.locator('.launchSplash').waitFor({state:'detached'});
  await p.locator('.rt-library-print').click();await p.locator('.rt-card').nth(0).click();await p.locator('.rt-card').nth(1).click();await p.getByRole('button',{name:/선택한 팩 인쇄/}).click();
  const title=p.getByRole('textbox',{name:'출력 제목',exact:true}),description=p.getByRole('textbox',{name:'출력 설명',exact:true});
  await title.fill('모바일 출력 제목 확인');await description.fill('제목과 설명을 편집한 두 개의 연습팩');
  assert.equal(await p.locator('.rt-print-title').first().textContent(),'모바일 출력 제목 확인');
  assert.equal(await p.locator('.rt-print-description').first().textContent(),'제목과 설명을 편집한 두 개의 연습팩');
  assert.equal(await p.locator('.rt-print-page').count(),1);
  if(mobile){
   assert.equal(await p.locator('.rt-print-edit').evaluate(el=>getComputedStyle(el).maxHeight),'none');
   assert.ok(await title.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
   await p.setViewportSize({width,height:Math.min(height,430)});await description.fill('짧은 화면에서도 설명 수정');
   await description.scrollIntoViewIfNeeded();const field=await description.boundingBox(),dialog=await p.locator('.rt-dialog').boundingBox();assert.ok(field.y>=dialog.y&&field.y+field.height<=dialog.y+dialog.height,JSON.stringify({field,dialog}));
   await p.setViewportSize({width,height});
  }
  await p.locator('.rt-dialog-body').evaluate(el=>{el.scrollTop=0;});await p.screenshot({path:`${out}/${width}-rhythm.png`});
  const rhythm=await printGeometry(p,'.rt-print-page');
  if(engine==='chromium'){const file=`${out}/${width}-rhythm-native.pdf`;await p.pdf({path:file,preferCSSPageSize:true,printBackground:true});await verifyPdf(file,1,{text:true});}
  await p.emulateMedia({media:'screen'});
  if(width===390){
   await p.getByRole('button',{name:'PDF 저장',exact:true}).click();await p.locator('.rt-pdf-filename input').fill('mobile-rhythm-export');
   const downloading=p.waitForEvent('download',{timeout:60000});await p.getByRole('button',{name:'이 이름으로 저장',exact:true}).click();const download=await downloading;const file=`${out}/rhythm-export.pdf`;await download.saveAs(file);await verifyPdf(file,1);
  }
  await p.getByRole('button',{name:'닫기',exact:true}).click();
  if(width===390){
   for(let i=2;i<12;i++)await p.locator('.rt-card').nth(i).click();await p.getByRole('button',{name:/선택한 팩 인쇄/}).click();
   const count=await p.locator('.rt-print-page').count();assert.ok(count>1);await printGeometry(p,'.rt-print-page');
   if(engine==='chromium'){const file=`${out}/rhythm-multiple-native.pdf`;await p.pdf({path:file,preferCSSPageSize:true,printBackground:true});await verifyPdf(file,count,{text:true});}
   await p.emulateMedia({media:'screen'});await p.getByRole('button',{name:'닫기',exact:true}).click();
  }
  await p.goto(`${base}/#etudes`);await p.getByRole('button',{name:'악보 PDF 저장 · 인쇄',exact:true}).waitFor();await p.locator('.launchSplash').waitFor({state:'detached'});
  const opening=p.waitForEvent('popup');await p.getByRole('button',{name:'악보 PDF 저장 · 인쇄',exact:true}).click();const popup=await opening;popup.on('pageerror',e=>errors.push(e.message));await popup.waitForFunction(()=>document.body.dataset.previewReady==='true');await popup.setViewportSize({width,height});
  const initialCount=await popup.locator('.a4Sheet').count();
  await popup.getByRole('textbox',{name:'출력 제목',exact:true}).fill('악보연습실 출력 제목');await popup.getByRole('textbox',{name:'출력 설명',exact:true}).fill('수정한 인쇄 설명');
  assert.equal(await popup.locator('.scoreHeading h1').textContent(),'악보연습실 출력 제목');assert.equal(await popup.locator('.scoreCredit').textContent(),'수정한 인쇄 설명');
  await popup.getByRole('checkbox',{name:'설명 표시',exact:true}).uncheck();assert.equal(await popup.locator('.scoreCredit').isVisible(),false);await popup.getByRole('checkbox',{name:'설명 표시',exact:true}).check();
  assert.equal(await popup.locator('.a4Sheet').count(),initialCount,'metadata edits do not accumulate old pages');
  await popup.screenshot({path:`${out}/${width}-etudes.png`});const etudes=await printGeometry(popup,'.a4Sheet');
  // The score's grayscale filter is rasterized by Chromium's print renderer.
  if(engine==='chromium'){const file=`${out}/${width}-etudes-native.pdf`;await popup.pdf({path:file,preferCSSPageSize:true,printBackground:true});await verifyPdf(file,initialCount);}
  await popup.emulateMedia({media:'screen'});
  if(width===390){const downloading=popup.waitForEvent('download',{timeout:60000});await popup.getByRole('button',{name:'PDF 저장',exact:true}).click();const download=await downloading;const file=`${out}/etudes-export.pdf`;await download.saveAs(file);await verifyPdf(file,initialCount);}
  await popup.close();
  if(width<600){
   await p.goto(`${base}/#fretboard`);await p.locator('.integratedBottomNav button[aria-controls="utility-menu-panel"]').waitFor();await p.locator('.launchSplash').waitFor({state:'detached'});await p.locator('.integratedBottomNav button[aria-controls="utility-menu-panel"]').click();
   const footer=p.locator('.utilityMenuFooter');
   const metrics=await footer.locator(':scope > .utilityMenuItem').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),label=el.querySelector('strong'),l=getComputedStyle(label);return {width:r.width,y:r.y,height:r.height,radius:s.borderRadius,shadow:s.boxShadow,image:s.backgroundImage,font:l.fontSize,align:l.textAlign,labelY:label.getBoundingClientRect().y};}));
   assert.equal(metrics.length,3);for(const m of metrics){assert.ok(Math.abs(m.width-metrics[0].width)<1);assert.equal(m.y,metrics[0].y);assert.equal(m.height,metrics[0].height);assert.equal(m.radius,'0px');assert.equal(m.shadow,'none');assert.equal(m.image,'none');assert.equal(m.font,metrics[0].font);assert.equal(m.align,'center');assert.equal(m.labelY,metrics[0].labelY);}
   const contactBefore=await footer.locator('a').boundingBox();await footer.getByRole('button',{name:'공유하기',exact:true}).click();await p.waitForFunction(()=>window.testCopiedLink==='https://guitarflow.vercel.app/');
   assert.equal((await footer.locator('a').boundingBox()).x,contactBefore.x);await footer.getByRole('status').waitFor();
   await p.screenshot({path:`${out}/${width}-menu.png`});
  }
  assert.deepEqual(errors,[]);results.push({width,height,rhythm,etudes,errors});console.log(`PASS ${engine} ${width}x${height}: editable print metadata, page/footer bounds, PDF pages and mobile menu`);await context.close();
 }
}finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();}
