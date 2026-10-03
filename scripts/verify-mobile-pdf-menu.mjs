import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const origin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174',folder='artifacts/mobile-pdf-menu';
await mkdir(folder,{recursive:true});
const results=[];
async function setup(width,height){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  await page.addInitScript(()=>localStorage.setItem('language','ko'));
  await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});
  await page.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
  if(width<600){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/제작|만들기/}).click();}
  else await page.getByRole('button',{name:'제작',exact:true}).click();
  await page.locator('.etudeEditor').waitFor();return {page,errors};
}
try{
  for(const [width,height] of [[320,740],[390,844],[440,956]].filter(([width])=>!process.env.MOBILE_PDF_WIDTH||width===Number(process.env.MOBILE_PDF_WIDTH))){
    const {page:p,errors}=await setup(width,height);
    try{
      assert.equal(await p.locator('.desktopEditorActions,.desktopPdfTabImport,.pdfTabReviewBar').count(),0);
      const trigger=p.getByRole('button',{name:'PDF 메뉴',exact:true});
      await trigger.click();const menu=p.getByRole('menu',{name:'PDF 메뉴',exact:true});await menu.waitFor();
      assert.deepEqual(await menu.getByRole('menuitem').allTextContents(),['불러오기(전환)','PDF 저장']);
      const bounds=await menu.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width,JSON.stringify(bounds));
      await p.screenshot({path:`${folder}/menu-${width}.png`});
      await trigger.press('ArrowDown');assert.equal(await p.evaluate(()=>document.activeElement.textContent),'불러오기(전환)');
      await p.keyboard.press('Escape');assert.equal(await menu.count(),0);assert.equal(await p.locator('.etudeEditor').count(),1);
      await trigger.click();await p.locator('[data-score-input]').click({position:{x:20,y:130}});assert.equal(await menu.count(),0);
      await trigger.click();await p.getByRole('menuitem',{name:'PDF 저장',exact:true}).click();
      await p.locator('.print-preview-overlay[open]').waitFor();assert.equal(await menu.count(),0);
      assert.equal(await p.locator('.print-preview-overlay').getAttribute('data-layout'),'mobile');
      await p.locator('.print-preview-overlay').getByRole('button',{name:'닫기',exact:true}).click();
      await trigger.click();await p.getByRole('menuitem',{name:'불러오기(전환)',exact:true}).click();
      const importer=p.locator('.mobilePdfTabImport');await importer.waitFor();
      await p.screenshot({path:`${folder}/import-${width}.png`});
      const box=await importer.boundingBox();assert(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=height,JSON.stringify(box));
      assert.equal(await importer.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'no horizontal overflow');
      if(width===390){
        // Real PDF.js + OCR path, with original edits preserved through retry.
        await importer.getByRole('button',{name:'취소',exact:true}).click();
        await p.locator('[data-score-input]').press('7');
        await trigger.click();await p.getByRole('menuitem',{name:'불러오기(전환)',exact:true}).click();
        await p.getByLabel('변환 방식',{exact:true}).selectOption('tab');
        await p.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles('artifacts/pdf-tab-corpus/helvetica-native.pdf');
        await importer.getByRole('heading',{name:'TAB 분석 완료',exact:true}).waitFor({timeout:180000});
        await p.screenshot({path:`${folder}/analysis-390.png`});
        await importer.getByRole('button',{name:'제작실에서 열기',exact:true}).click();
        const prompt=p.locator('.etudeEditorClosePrompt');await prompt.waitFor();assert.equal(await importer.isVisible(),false);
        await prompt.getByRole('button').nth(2).click();
        await importer.getByRole('heading',{name:'TAB 분석 완료',exact:true}).waitFor();
        await importer.getByRole('button',{name:'제작실에서 열기',exact:true}).click();
        await prompt.waitFor();await prompt.getByRole('button').nth(1).click();
        await p.locator('.mobilePdfTabReview').waitFor();assert.equal(await importer.count(),0);
        const records=Object.values((await readBrowserScoreLibrary(p)).records);
        assert.equal(records.length,1,'retry uses same imported document ID');assert.equal(records[0].document.measures.length,4);
        await p.screenshot({path:`${folder}/converted-390.png`});
        results.push({width,realImport:true,measures:4,frets:records[0].document.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).length,dirtyRetry:true});
      }else if(width===440){
        await p.getByLabel('변환 방식',{exact:true}).selectOption('tab');
        await p.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles({name:'invalid.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a PDF')});
        await importer.getByRole('alert').waitFor();
        await p.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles('artifacts/pdf-tab-corpus/helvetica-110dpi.pdf');
        await importer.getByRole('button',{name:'분석 취소',exact:true}).click();assert.equal(await importer.count(),0);
        assert.equal(await p.locator('.etudeEditor').count(),1);
        await trigger.click();await p.getByRole('menuitem',{name:'불러오기(전환)',exact:true}).click();
        await p.getByLabel('변환 방식',{exact:true}).selectOption('tab');
        await p.getByLabel('PDF·사진 선택',{exact:true}).setInputFiles('artifacts/pdf-tab-corpus/helvetica-110dpi.pdf');
        await importer.getByRole('heading',{name:'TAB 분석 완료',exact:true}).waitFor({timeout:180000});
        await importer.getByRole('button',{name:'제작실에서 열기',exact:true}).click();
        await p.locator('.mobilePdfTabReview').waitFor();
        await p.locator('.mobilePdfTabReview summary').click();
        await p.screenshot({path:`${folder}/raster-review-440.png`});
        const records=Object.values((await readBrowserScoreLibrary(p)).records);
        assert.equal(records.length,1);assert.equal(records[0].document.measures.length,4);
        results.push({width,invalidPdf:true,cancelAnalysis:true,rasterImport:true,measures:4,frets:records[0].document.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).length});
      }else{
        await importer.getByRole('button',{name:'취소',exact:true}).click();assert.equal(await importer.count(),0);
        results.push({width,menu:true,print:true,importDialog:true});
      }
      assert.deepEqual(errors,[]);
    }catch(error){await p.screenshot({path:`${folder}/failure-${width}.png`});throw error;}
    finally{await p.close();}
  }
  const {page:p,errors}=await setup(1440,1000);
  assert.equal(await p.locator('.mobileScorePdfMenu,.mobilePdfTabImport,.mobilePdfTabReview').count(),0);
  await p.getByRole('button',{name:'PDF·사진에서 TAB 초안 생성',exact:true}).click();await p.locator('.desktopPdfTabImport').waitFor();
  await p.screenshot({path:`${folder}/desktop.png`});assert.deepEqual(errors,[]);await p.close();
  results.push({desktop:true,unchanged:true});
  await writeFile(`${folder}/results${process.env.MOBILE_PDF_WIDTH?'-'+process.env.MOBILE_PDF_WIDTH:''}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
