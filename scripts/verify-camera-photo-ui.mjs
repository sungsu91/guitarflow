// Local photos are supplied on the command line; no personal score is bundled.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
const files=process.argv.slice(2);assert(files.length,'Supply one or more JPG/PNG test paths');
const playwright=await import(process.env.PLAYWRIGHT_MODULE),engine=process.env.PHOTO_BROWSER||'chromium';
const browser=await playwright[engine].launch({headless:true,...(engine==='chromium'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
const out=process.env.CAMERA_PHOTO_OUTPUT||`artifacts/camera-tab/${engine}`,origin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:4174';await mkdir(out,{recursive:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
try{
 await page.addInitScript(()=>localStorage.setItem('language','ko'));
 await page.goto(`${origin}/#etudes`);await page.locator('.launchSplash').waitFor({state:'detached'});
 await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/제작|만들기/}).click();await page.getByRole('button',{name:'PDF 메뉴',exact:true}).click();await page.getByRole('menuitem',{name:'불러오기(전환)',exact:true}).click();
 await page.getByRole('radio',{name:'TAB → TAB',exact:true}).check();await page.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles([...files].reverse());await page.getByRole('img',{name:'악보 사진 미리보기'}).waitFor();
 assert.equal(await page.getByLabel('사진 페이지 순서',{exact:true}).locator('option').count(),files.length);
 const start=Date.now();await page.getByRole('button',{name:'분석하기',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.mobilePdfTabImport .scoreImportError')||[...document.querySelectorAll('.mobilePdfTabImport h3')].some(e=>e.textContent==='TAB 분석 완료'),null,{timeout:300000});
 assert.equal(await page.locator('.mobilePdfTabImport .scoreImportError').count(),0,await page.locator('.mobilePdfTabImport').innerText());
 const summaryText=await page.locator('.mobilePdfTabImport').innerText();assert.match(summaryText,/그림자와 기울기를 보정/);
 await page.screenshot({path:`${out}/mobile-result.png`});
 await page.getByRole('button',{name:'제작실에서 열기',exact:true}).click();await page.locator('.mobilePdfTabReview').waitFor();
 const records=Object.values((await readBrowserScoreLibrary(page)).records),doc=records.at(-1).document;
 assert.equal(doc.pdfTabImport.imageSources.length,files.length);assert(doc.pdfTabImport.photoCorrections.length>=files.length);
 if(process.env.EXPECTED_PHOTO_MEASURES)assert.equal(doc.measures.length,Number(process.env.EXPECTED_PHOTO_MEASURES));
 assert(doc.measures.some(m=>m.pdfImport.needsReview),'camera draft remains explicitly unreviewed');
 await writeFile(`${out}/document.json`,JSON.stringify(doc));await page.screenshot({path:`${out}/mobile-editor.png`});
 await page.reload();await page.locator('.launchSplash').waitFor({state:'detached'});
 const reopened=Object.values((await readBrowserScoreLibrary(page)).records).find(r=>r.document.id===doc.id)?.document;assert.deepEqual(reopened,doc,'saved draft survives reload unchanged');
 assert.deepEqual(errors,[]);
 const result={engine,passed:true,seconds:(Date.now()-start)/1000,pages:files.length,measures:doc.measures.length,summary:doc.pdfTabImport.summary,correctionVariants:doc.pdfTabImport.photoCorrections.length,errors};
 await writeFile(`${out}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/failure.json`,JSON.stringify({error:error.message,errors,text:await page.locator('body').innerText()},null,2));throw error;}
finally{await browser.close();}
