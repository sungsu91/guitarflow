// Run the actual file picker, conversion dialog, editor hand-off and persisted library.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
const [file,pages='3',bars='63']=process.argv.slice(2);assert(file,'Supply a local PDF');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const output=process.env.PDF_TAB_UI_OUTPUT||'artifacts/ocr-stress-20261004/full-ui',origin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174',results=[];await mkdir(output,{recursive:true});
const expectedTechniques=process.env.PDF_TAB_EXPECT_TECHNIQUES?JSON.parse(process.env.PDF_TAB_EXPECT_TECHNIQUES):null;
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:width<600?844:1000},isMobile:width<600,hasTouch:width<600}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 try{
  await page.addInitScript(()=>localStorage.setItem('language','ko'));await page.goto(`${origin}/#etudes`);await page.locator('.launchSplash').waitFor({state:'detached'});
  if(width<600){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/제작|만들기/}).click();await page.getByRole('button',{name:'PDF 메뉴',exact:true}).click();await page.getByRole('menuitem',{name:'불러오기(전환)',exact:true}).click();}
  else {await page.getByRole('button',{name:'제작',exact:true}).click();await page.getByRole('button',{name:'PDF·사진에서 TAB 초안 생성',exact:true}).click();}
  await page.getByRole('radio',{name:'TAB → TAB',exact:true}).check();const start=Date.now();await page.getByLabel(width<600?'PDF·사진 선택':'TAB 분석용 PDF·사진 선택',{exact:true}).setInputFiles(file);
  const dialog=page.locator('.mobilePdfTabImport,.desktopPdfTabImport');await dialog.getByRole('heading',{name:'TAB 분석 완료',exact:true}).waitFor({timeout:300000});
  assert.equal(await dialog.locator('progress').count(),0,'progress is removed after completion');
  const text=await dialog.innerText();assert.match(text,new RegExp(`${bars}`));await page.screenshot({path:`${output}/result-${width}.png`});
  await page.getByRole('button',{name:'제작실에서 열기',exact:true}).click();await page.locator(width<600?'.mobilePdfTabReview':'.desktopSourceReview').waitFor();
  const docs=Object.values((await readBrowserScoreLibrary(page)).records).map(r=>r.document),doc=docs.at(-1);assert(doc);assert.equal(doc.measures.length,Number(bars));assert.equal(doc.pdfTabImport.summary.pages,Number(pages));
  let techniques;
  if(expectedTechniques){
   const events=doc.measures.flatMap(m=>m.events);
   techniques={harmonics:events.flatMap(e=>e.notes).filter(n=>n.harmonic).length,arpeggios:events.filter(e=>e.arpeggio).length,ties:events.filter(e=>e.tieTo).length};
   assert.deepEqual(techniques,expectedTechniques,'techniques persist through the real import dialog');
   await page.locator('.tabArpeggioArrow').first().waitFor();
   await page.screenshot({path:`${output}/editor-${width}.png`});
  }
  await page.reload();await page.locator('.launchSplash').waitFor({state:'detached'});const saved=Object.values((await readBrowserScoreLibrary(page)).records).find(r=>r.document.id===doc.id)?.document;assert.deepEqual(saved,doc);assert.deepEqual(errors,[]);
  results.push({width,seconds:(Date.now()-start)/1000,measures:doc.measures.length,pages:doc.pdfTabImport.summary.pages,...(techniques?{techniques}:{}),errors});console.log(JSON.stringify(results.at(-1)));await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
 }catch(e){await page.screenshot({path:`${output}/failure-${width}.png`});throw e;}finally{await context.close();}
}}finally{await browser.close();}
