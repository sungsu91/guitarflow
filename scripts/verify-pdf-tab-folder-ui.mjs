import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{compileDocumentV2}from'../src/etudes/scoreModel.js';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE),b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const appOrigin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174';
const folder='artifacts/pdf-tab-folder',mode=process.env.PDF_TAB_RESULT_MODE||'whole',output=`${folder}/${mode}`,inventory=JSON.parse(await readFile(`${folder}/inventory.json`)),reports=await readFile(`${output}/ui-verification.json`,'utf8').then(JSON.parse).catch(()=>[]);
import {golden,laterGolden,verifyBar} from '../tests/fixtures/pdf-tab-golden.mjs';
try{for(const index of process.argv.slice(2).length?process.argv.slice(2).map(Number):[4,8,0,1,2,3,5,6,7,9]){
 const documents=JSON.parse(await readFile(`${output}/${index}-documents.json`));assert.equal(documents.length,1);
 for(let part=0;part<documents.length;part++){
  const doc=documents[part];assert.deepEqual(compileDocumentV2(doc).errors,[]);
  const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(30000);
  try{
   const useFilePicker=[0,4,6,8].includes(index);
   if(!useFilePicker){await p.route('**/__tab-ui-seed',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated library</title>'}));await p.goto(`${appOrigin}/__tab-ui-seed`);const saved=await p.evaluate(async d=>(await import('/src/etudes/scoreLibrary.js')).saveLibraryDocument(localStorage,d),doc);assert.ok(saved.saved);}
   await p.goto(`${appOrigin}/#etudes`,{waitUntil:'networkidle'});await p.locator('.launchSplash').waitFor({state:'detached',timeout:60000});await p.getByRole('button',{name:'제작',exact:true}).click();
   if(useFilePicker){await p.getByRole('button',{name:'PDF·사진에서 TAB 초안 생성',exact:true}).click();const modal=p.locator('.desktopPdfTabImport');assert.equal(await modal.getByRole('checkbox').count(),0);assert.doesNotMatch(await modal.innerText(),/개발용|Debug Overlay/);await p.getByLabel('TAB 분석용 PDF·사진 선택',{exact:true}).setInputFiles(inventory[index].path);await p.getByRole('heading',{name:'TAB 분석 완료',exact:true}).waitFor({timeout:120000});assert.equal(await p.getByLabel('가져올 마디 범위',{exact:true}).count(),0);assert.equal(await p.locator('.pdfTabPageResults li').count(),doc.pdfTabImport.summary.pages);await p.screenshot({path:`${output}/${index}-summary.png`});await p.getByRole('button',{name:'제작실에서 열기',exact:true}).click();}
   else{await p.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await p.locator('.scoreOpenItem').filter({hasText:doc.title}).click();}
   await p.locator('.pdfTabReviewBar').waitFor();await p.getByRole('button',{name:'한 줄 4마디',exact:true}).click();
   const save=async()=>{await p.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();await p.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();};
   await save();const stored=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records).find(r=>r.document.pdfTabImport).document);
   assert.equal(stored.measures.length,doc.measures.length);assert.equal(stored.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).length,doc.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).length);
   assert.equal(await p.locator('.etudeEditorMeasure').count(),doc.measures.length);
   if(index===4){for(let i=0;i<4;i++){verifyBar(stored.measures[i].events,golden[i]);assert.equal(stored.measures[i].pdfImport.needsReview,false);}for(const [number,expected]of laterGolden){verifyBar(stored.measures[number-1].events,expected);assert.equal(stored.measures[number-1].pdfImport.needsReview,false);}assert.deepEqual(compileDocumentV2(stored).issues,[]);}
   for(const sourcePage of doc.pdfTabImport.pages.filter(s=>s.count)){
    await p.getByLabel('원본 페이지로 이동',{exact:true}).selectOption(String(sourcePage.page));await p.waitForTimeout(150);
    const visible=await p.locator(`[data-bar-index="${sourcePage.start}"]`).evaluate(el=>{const canvas=el.closest('.etudeEditorCanvas').getBoundingClientRect(),bar=el.getBoundingClientRect();return bar.top<canvas.bottom&&bar.bottom>canvas.top;});assert.equal(visible,true,`source page ${sourcePage.page} scrolls into view`);
    assert.match(await p.locator('.pdfTabReviewBar').innerText(),new RegExp(`${sourcePage.start+1}마디`));await p.screenshot({path:`${output}/${index}-page-${sourcePage.page}.png`});
   }
   const last=p.locator('.etudeEditorMeasure').last();await last.scrollIntoViewIfNeeded();const lastText=await last.locator('[data-draw-count]').evaluate(el=>el.shadowRoot?.textContent||'');assert.ok(lastText.length>0);await p.screenshot({path:`${output}/${index}-last-bar.png`});
   await p.screenshot({path:`${folder}/${index}-${part}-editor.png`});await p.getByRole('button',{name:'닫기',exact:true}).click();await p.getByRole('button',{name:'제작',exact:true}).click();await p.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await p.locator('.scoreOpenItem').filter({hasText:stored.title}).click();await p.locator('.pdfTabReviewBar').waitFor();await save();
   const reopened=await p.evaluate(id=>JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records[id].document,stored.id);assert.ok(JSON.stringify(reopened.measures)===JSON.stringify(stored.measures));assert.deepEqual(errors,[]);
   const old=reports.findIndex(r=>r.index===index&&r.part===part+1);if(old>=0)reports.splice(old,1);
   reports.push({index,name:inventory[index].name,part:part+1,appOrigin,pages:stored.pdfTabImport.pages,measures:stored.measures.length,insertedFrets:stored.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).length,created:true,saved:true,reopened:true,errors,throughFilePicker:useFilePicker,goldenBars:index===4?[1,2,3,4,...laterGolden.keys()]:[],allPagesNavigated:true});console.log(reports.at(-1));
  }catch(error){await p.screenshot({path:`${folder}/${index}-${part}-ui-error.png`});throw error;}finally{await p.close();}
  await writeFile(`${output}/ui-verification.json`,JSON.stringify(reports,null,2));
 }
}}finally{await b.close();}
