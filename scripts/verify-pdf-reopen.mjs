import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const out='artifacts/pdf-reopen';await mkdir(out,{recursive:true});const report={};let page;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page=await context.newPage();const errors=[];let fileChoosers=0;page.on('pageerror',e=>errors.push(e.message));page.on('filechooser',()=>fileChoosers++);
 await page.addInitScript(()=>localStorage.setItem('rifflabThemeMode','light'));
 await page.goto('http://127.0.0.1:5173/#etudes');
 await page.getByLabel('PDF 파일 선택',{exact:true}).setInputFiles(process.env.PDF_TEST_FILE??'C:/Users/User/Desktop/sheet music/Flower Dance.pdf');
 await page.getByRole('dialog',{name:'PDF 악보 정보'}).getByRole('button',{name:'기기에 저장',exact:true}).click();await page.getByRole('dialog',{name:'PDF 악보 정보'}).waitFor({state:'hidden'});
 await page.reload();
 const record=await page.evaluate(async()=>{const lib=await import('/src/pdf/pdfLibrary.js'),r=(await lib.listPdfs())[0],blob=await lib.getPdf(r.id);return {id:r.id,title:r.title,fingerprint:r.fingerprint,pageCount:r.pageCount,blob:blob instanceof Blob,type:blob.type,bytes:blob.size,header:await blob.slice(0,5).text(),thumbnail:r.thumbnail.startsWith('data:image/')};});assert(record.blob&&record.bytes>0&&record.header==='%PDF-');report.storage=record;
 const stats=()=>page.evaluate(async()=> (await import('/src/pdf/pdfRenderer.js')).pdfPageCache.inspect());
 const ready=()=>page.waitForFunction(()=>document.querySelector('.pdfViewport[aria-busy="false"]')&&document.querySelector('.pdfCanvas[data-page]'));
 const open=async()=>{
  await page.getByRole('button',{name:`${record.title} 열기`,exact:true}).waitFor();
  return page.evaluate(title=>new Promise(resolve=>{
   const start=performance.now(),frames=[];document.querySelector(`[aria-label="${CSS.escape(title+' 열기')}"]`).click();
   function sample(){const viewport=document.querySelector('.pdfViewport'),canvas=document.querySelector('.pdfCanvas'),thumb=document.querySelector('.pdfThumbnailPreview img,.pdfOpeningPreview img'),status=document.querySelector('.pdfPageStatus');frames.push({ms:performance.now()-start,preview:!!thumb?.complete||!!canvas?.childElementCount,status:!!status,ready:viewport?.getAttribute('aria-busy')==='false'});
    if(frames.at(-1).ready){resolve({elapsedMs:performance.now()-start,firstPreviewMs:frames.find(f=>f.preview)?.ms,statusFirstMs:frames.find(f=>f.status)?.ms??null,cacheHit:canvas?.dataset.cacheHit,frames});return;}if(performance.now()-start>15000)throw Error('PDF timeout');requestAnimationFrame(sample);
   }requestAnimationFrame(sample);
  }),record.title);
 };
 report.first=await open();await ready();await page.screenshot({path:`${out}/first.png`});await page.waitForTimeout(700);report.firstStats=await stats();
 await page.getByLabel('내 악보 보관함으로 돌아가기',{exact:true}).click();
 report.second=await open();await ready();await page.screenshot({path:`${out}/second.png`});report.secondStats=await stats();
 assert.equal(report.second.cacheHit,'true');assert.equal(report.second.statusFirstMs,null);assert.equal(report.secondStats.documentsOpened,1);assert.equal(report.secondStats.renders,report.firstStats.renders);assert.equal(fileChoosers,0);
 await page.getByLabel('다음 PDF 페이지',{exact:true}).click();await page.waitForFunction(()=>document.querySelector('.pdfCanvas')?.dataset.page==='2'&&document.querySelector('.pdfViewport')?.getAttribute('aria-busy')==='false');report.nextCached=await page.locator('.pdfCanvas').getAttribute('data-cache-hit');
 await page.getByLabel('내 악보 보관함으로 돌아가기',{exact:true}).click();report.lastPageReopen=await open();await ready();assert.equal(await page.locator('.pdfCanvas').getAttribute('data-page'),'2');assert.equal(report.lastPageReopen.cacheHit,'true');
 // Deterministically delay document readiness to test the 200ms UI threshold without altering product code.
 await page.getByLabel('내 악보 보관함으로 돌아가기',{exact:true}).click();await page.evaluate(async()=>{const {pdfPageCache:c}=await import('/src/pdf/pdfRenderer.js');c.clear();const acquire=c.acquire;c.acquire=(...args)=>{const lease=acquire(...args);return {...lease,promise:Promise.all([lease.promise,new Promise(r=>setTimeout(r,600))]).then(([doc])=>doc)};};});
 const slowOpen=open();await page.locator('.pdfPageStatus').waitFor();await page.screenshot({path:`${out}/slow-loading.png`});report.slow=await slowOpen;assert(report.slow.firstPreviewMs<200);assert(report.slow.statusFirstMs>=190&&report.slow.statusFirstMs<500);await page.screenshot({path:`${out}/slow-finished.png`});assert.equal(await page.locator('.mobilePdfHud h1').textContent(),record.title);
 report.fileChoosers=fileChoosers;report.errors=errors;assert.deepEqual(errors,[]);console.log(JSON.stringify({...report,first:{...report.first,frames:undefined},second:{...report.second,frames:undefined},lastPageReopen:{...report.lastPageReopen,frames:undefined},slow:{...report.slow,frames:undefined}},null,2));
} catch(error){await page?.screenshot({path:`${out}/failure.png`});throw error;} finally{await writeFile(`${out}/results.json`,JSON.stringify(report,null,2));await browser.close();}
