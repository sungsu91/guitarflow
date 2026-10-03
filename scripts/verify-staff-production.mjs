import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const origin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:4174',out='artifacts/staff-photo';await mkdir(out,{recursive:true});const results=[];
try{
 for(const kind of ['staff-pdf','staff-pdf-mobile','tab-batch']){
  const mobile=kind!=='staff-pdf',page=await browser.newPage({viewport:{width:mobile?320:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
  await page.addInitScript(()=>localStorage.setItem('language','ko'));
  await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});
  if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/제작|만들기/}).click();await page.getByRole('button',{name:'PDF 메뉴',exact:true}).click();await page.getByRole('menuitem',{name:'불러오기(전환)',exact:true}).click();}
  else{await page.getByRole('button',{name:'제작',exact:true}).click();await page.getByRole('button',{name:'PDF·사진에서 TAB 초안 생성',exact:true}).click();}
  const dialog=page.locator('.mobilePdfTabImport,.desktopPdfTabImport'),mode=page.getByLabel('변환 방식',{exact:true});
  assert.equal(await mode.inputValue(),'staff');assert.deepEqual(await mode.locator('option').allTextContents(),['오선보 → TAB','TAB → TAB']);
  assert.equal(await dialog.locator('input[type=file]').count(),1);assert.equal(await dialog.locator('input[capture]').count(),0);
  assert.equal(await page.getByLabel('오선보 음높이 기준',{exact:true}).count(),0);assert.equal(await dialog.locator('.staffImportAdvanced').count(),0);
  await page.screenshot({path:`${out}/import-choices-${kind}.png`});
  const picker=page.getByLabel(mobile?'PDF·사진 선택':'TAB 분석용 PDF·사진 선택',{exact:true});
  if(kind.startsWith('staff-pdf'))await picker.setInputFiles('artifacts/omr-prototype/clean-staff-one-page.pdf');
  else{
   await picker.setInputFiles('artifacts/tab-photo/fixtures/score.png');await page.getByLabel('사진 페이지 순서',{exact:true}).waitFor();
   await page.getByRole('button',{name:'사진 분석',exact:true}).click();await dialog.getByRole('alert').waitFor();assert.match(await dialog.getByRole('alert').innerText(),/TAB → TAB/);
   await mode.selectOption('tab');assert.equal(await page.getByLabel('오선보 음높이 기준',{exact:true}).count(),0);
   await page.setViewportSize({width:1440,height:960});assert.equal(await mode.inputValue(),'tab');await page.setViewportSize({width:320,height:960});
   await page.getByLabel('사진 추가',{exact:true}).setInputFiles('artifacts/tab-photo/fixtures/score.JPG');
   await page.waitForFunction(()=>document.querySelector('.tabPhotoPreview select')?.options.length===2);
   await page.getByLabel('사진 추가',{exact:true}).setInputFiles('artifacts/tab-photo/fixtures/score.JPG');assert.equal(await page.getByLabel('사진 페이지 순서',{exact:true}).locator('option').count(),2);
   assert(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   await page.getByRole('button',{name:'사진 전체 분석',exact:true}).click();
  }
  await page.getByRole('heading',{name:'TAB 분석 완료',exact:true}).waitFor({timeout:120000}).catch(async error=>{await page.screenshot({path:`${out}/production-${kind}-error.png`});console.error(await dialog.innerText());console.error(errors);throw error;});await page.getByRole('button',{name:'제작실에서 열기',exact:true}).click();await page.locator(mobile?'.mobilePdfTabReview':'.pdfTabReviewBar').waitFor();
  const doc=Object.values((await readBrowserScoreLibrary(page)).records)[0].document;
  await writeFile(`${out}/production-${kind}.json`,JSON.stringify(doc,null,2));
  if(kind.startsWith('staff-pdf')){
   assert.equal(doc.measures.length,1);assert.equal(doc.pdfTabImport.notation.engine,'CrispEmbed/TrOMR Q8');
   assert.deepEqual(doc.measures[0].events.map(e=>doc.tuning[e.notes[0].string-1]+e.notes[0].fret),[48,50,52,53]);
   assert.equal(doc.pdfTabImport.notation.octaveShift,-12);
  }else{assert.equal(doc.measures.length,8);assert.deepEqual([...new Set(doc.measures.map(m=>m.pdfImport.source.page))],[1,2]);assert.equal(doc.pdfTabImport.imageSources.length,2);}
  assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/production-${kind}.png`});results.push({kind,passed:true,measures:doc.measures.length,errors});console.log(JSON.stringify(results.at(-1)));await page.close();
 }
}finally{await writeFile(`${out}/production.json`,JSON.stringify(results,null,2));await browser.close();}
