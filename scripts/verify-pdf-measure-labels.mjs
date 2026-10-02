import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='work/pdf-measure-labels';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
let page=await browser.newPage({viewport:{width:440,height:956},hasTouch:true});
const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
const read=()=>page.evaluate(async()=> (await (await import('/src/pdf/pdfLibrary.js')).listPdfs())[0]);
const ready=()=>page.waitForFunction(()=>document.querySelector('.pdfViewport[aria-busy="false"] .pdfCanvas[data-page]'));
const trigger=()=>page.getByRole('button',{name:'마디리듬설정',exact:true});
const menu=()=>page.getByRole('menu',{name:'마디리듬설정',exact:true});
try{
 await page.addInitScript(()=>localStorage.setItem('rifflabThemeMode','light'));
 await page.goto(process.env.AUDIT_URL??'http://127.0.0.1:5173/#etudes');await page.locator('.launchSplash').waitFor({state:'hidden'});
 await page.getByLabel('PDF 파일 선택',{exact:true}).setInputFiles(process.env.PDF_FIXTURE??'C:/Users/User/Desktop/sheet music/Flower Dance.pdf');
 const info=page.getByRole('dialog',{name:'PDF 악보 정보'});await info.getByRole('button',{name:'기기에 저장',exact:true}).click();await info.waitFor({state:'hidden'});await ready();
 await trigger().click();assert.deepEqual(await menu().getByRole('menuitem').allTextContents(),['마디 자동 인식','마디 영역 초기화']);
 assert.equal(await menu().getByRole('menuitem',{name:'마디 영역 초기화'}).isDisabled(),true);
 await menu().getByRole('menuitem',{name:'마디 자동 인식'}).click();
 const analysisDialog=page.getByRole('dialog',{name:'마디 자동 인식',exact:true});await analysisDialog.getByRole('button',{name:'분석 시작',exact:true}).click();
 const done=page.locator('.pdfAutoMeasures').getByRole('button',{name:'완료',exact:true});await done.waitFor({timeout:120000});await done.click();
 await ready();
 assert.equal(await page.locator('.etudePracticeStop').isDisabled(),true,'Applying detected measures must not start playback');
 assert.equal(await page.locator('.etudeRemote .etudeBeatRow').getAttribute('data-beat'),'-1');
 const original=await read();assert.equal(original.barMap.length,63);
 for(const number of [1,2,3]){
  if(number>1)await page.getByRole('button',{name:'다음 PDF 페이지',exact:true}).click();
  await page.waitForFunction(n=>document.querySelector('.pdfCanvas')?.dataset.page===String(n)&&document.querySelector('.pdfViewport')?.getAttribute('aria-busy')==='false',number);
  const bars=original.barMap.filter(b=>b.page===number),starts=[...new Map(bars.map(b=>[b.system,bars.find(c=>c.system===b.system).number])).values()];
  assert.deepEqual((await page.locator('[data-number-kind="start"]').allTextContents()).map(Number),starts);
  const target=bars[1].number;
  await page.locator(`[data-pdf-row="${target}"]`).click();
  assert.deepEqual(await page.locator('[data-number-kind="selected"]').allTextContents(),[String(target)]);
  assert(await page.locator('[data-number-kind="selected"]').evaluate(e=>e.getBoundingClientRect().top>=e.parentElement.getBoundingClientRect().bottom),'Selected number must stay clear of the printed chord symbols and staff.');
  assert.equal(await page.locator(`[data-pdf-measure-number="${target}"]`).count(),1);
  await page.locator(`[data-pdf-row="${bars[0].number}"]`).click();
  assert.equal(await page.locator('[data-number-kind="selected"]').count(),0);
  await page.locator(`[data-pdf-row="${target}"]`).click();
  results.push({page:number,systemStarts:starts,selected:target});
 }
 for(const width of [440,390,320]){
  await page.setViewportSize({width,height:956});await ready();
  const toolbar=await page.locator('.etudeViewTools').evaluate(e=>({overflow:e.scrollWidth-e.clientWidth,rects:[...e.children].map(c=>{const r=c.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})}));
  assert(toolbar.overflow<=1,JSON.stringify({width,toolbar}));
  await trigger().click();const bounds=await menu().boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width);
  await page.screenshot({path:`${out}/mobile-${width}-menu.png`});
  await menu().getByRole('menuitem',{name:'마디 영역 초기화',exact:true}).click();
  const reset=page.getByRole('dialog',{name:'마디 영역 초기화',exact:true});await reset.getByRole('button',{name:'취소',exact:true}).click();assert.deepEqual((await read()).barMap,original.barMap);
  results.push({width,toolbarOverflow:toolbar.overflow,menuInViewport:true,resetCancelPreserved:true});
 }
 // A wide touchscreen still uses the touch layout. Verify desktop in a separate
 // mouse context, loading the same detected mapping through the saved PDF.
 await page.close();page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('rifflabThemeMode','light'));
 await page.goto(process.env.AUDIT_URL??'http://127.0.0.1:5173/#etudes');await page.locator('.launchSplash').waitFor({state:'hidden'});
 await page.getByLabel('PDF 파일 선택',{exact:true}).setInputFiles(process.env.PDF_FIXTURE??'C:/Users/User/Desktop/sheet music/Flower Dance.pdf');
 const desktopInfo=page.getByRole('dialog',{name:'PDF 악보 정보'});await desktopInfo.getByRole('button',{name:'기기에 저장',exact:true}).click();await desktopInfo.waitFor({state:'hidden'});await ready();
 await page.evaluate(async barMap=>{const lib=await import('/src/pdf/pdfLibrary.js'),r=(await lib.listPdfs())[0];await lib.patchPdf(r.id,{barMap,lastPage:3,highlight:true});},original.barMap);
 await page.reload();await page.locator('.launchSplash').waitFor({state:'hidden'});await ready();
 assert.equal(await trigger().count(),0);
 assert.equal(await page.locator('.desktopPdfTools').getByRole('button',{name:'마디 자동 인식',exact:true}).count(),1);
 assert.equal(await page.locator('.desktopPdfTools').getByRole('button',{name:'마디 영역 초기화',exact:true}).count(),1);
 await page.locator('[data-pdf-row="45"]').click();assert.deepEqual(await page.locator('[data-number-kind="selected"]').allTextContents(),['45']);
 assert((await page.locator('.pdfRowStartNumber').allTextContents()).every(text=>/^\d+$/.test(text)));
 await page.screenshot({path:`${out}/desktop.png`});
 assert.deepEqual((await read()).barMap,original.barMap);assert.deepEqual(errors,[]);
 await writeFile(`${out}/verification.json`,JSON.stringify({results,desktop:true,originalMappingUnchanged:true,errors},null,2));
 console.log('PASS: actual 63-measure detection, three pages, selection, mobile menus at 440/390/320, desktop controls, saved map unchanged.');
}catch(error){await page.screenshot({path:`${out}/failure.png`});await writeFile(`${out}/failure.txt`,await page.locator('body').innerText());throw error;}finally{await browser.close();}
