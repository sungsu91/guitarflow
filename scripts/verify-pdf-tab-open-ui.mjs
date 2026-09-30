// Exercise the real analysis-complete -> save/open UI using a recorded analysis.
// OCR is replaced only in this harness; this is not an OCR accuracy test.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const folder=process.env.PDF_TAB_OPEN_OUTPUT||'artifacts/pdf-tab-open/final';await mkdir(folder,{recursive:true});
const analysis=JSON.parse(await readFile('artifacts/pdf-tab-adaptive/release/1-analysis.json'));analysis.fileName='Flower Dance.pdf';
const existing=JSON.parse(await readFile('artifacts/pdf-tab-adaptive/release/6-document.json'));existing.title='보존할 소나기';
const cases=[{name:'saved'},{name:'quota-full',full:true},{name:'quota-dirty-cancel-retry',full:true,dirty:true},{name:'saved-dirty-cancel-retry',dirty:true},{name:'storage-denied',denied:true},{name:'conversion-error',invalid:true}];
const results=[];
try{for(const test of cases){
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.setDefaultTimeout(30000);p.on('pageerror',e=>errors.push(e.message));let moduleLoads=0;
 await p.route('**/src/pdf/tab-import/importPdfTab.js*',r=>{moduleLoads++;return r.fulfill({contentType:'application/javascript',body:`export async function importPdfTab(file,{onProgress}){window.__analysisCalls=(window.__analysisCalls||0)+1;onProgress({progress:1,message:'완료'});return ${JSON.stringify(test.invalid?{...analysis,pages:[]}:analysis)};}`});});
 await p.addInitScript(d=>{localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{document:d,status:'draft'}}}));},existing);
 try{
  await p.goto(`${process.env.PDF_TAB_OPEN_ORIGIN||'http://127.0.0.1:5174'}/#etudes`,{waitUntil:'networkidle'});await p.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
  const oldLibrary=await p.evaluate(()=>localStorage.getItem('fretiva.etude.library.v2'));
  await p.getByRole('button',{name:'제작',exact:true}).click();if(test.dirty)await p.locator('[data-score-input]').press('7');
  if(test.full)await p.evaluate(()=>{let size=0;for(let step=1024*1024;step>=128;step=Math.floor(step/2))while(true){try{localStorage.setItem('test-quota-filler','x'.repeat(size+step));size+=step;}catch{break;}}});
  if(test.denied)await p.evaluate(()=>{const original=Storage.prototype.setItem;window.__restoreStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(key,value){if(key==='fretiva.etude.library.v2')throw new DOMException('Storage access denied','SecurityError');return original.call(this,key,value);};});
  await p.getByRole('button',{name:'PDF에서 TAB 초안 생성',exact:true}).click();await p.getByLabel('TAB 분석용 PDF 선택',{exact:true}).setInputFiles({name:'Flower Dance.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF post-analysis open test')});
  await p.getByRole('heading',{name:'TAB 분석 완료',exact:true}).waitFor();await p.getByRole('button',{name:'제작실에서 열기',exact:true}).click();
  if(test.invalid){await p.locator('.desktopPdfTabImport [role="alert"]').waitFor();assert.match(await p.locator('.desktopPdfTabImport [role="alert"]').innerText(),/1~512마디/);assert.equal(await p.locator('.pdfTabReviewBar').count(),0);assert.equal(await p.evaluate(()=>localStorage.getItem('fretiva.etude.library.v2')),oldLibrary);}
  else{
   if(test.dirty){
    const prompt=p.locator('.etudeEditorClosePrompt');await prompt.waitFor();assert.equal(await p.locator('.desktopPdfTabImport').isVisible(),false);
    await prompt.getByRole('button').nth(2).click();await p.getByRole('heading',{name:'TAB 분석 완료',exact:true}).waitFor();
    assert.equal(await p.evaluate(()=>window.__analysisCalls),1,'cancel preserves the completed analysis');
    await p.getByRole('button',{name:'제작실에서 열기',exact:true}).click();await prompt.waitFor();await prompt.getByRole('button').nth(1).click();
   }
   await p.locator('.pdfTabReviewBar').waitFor();assert.match(await p.locator('.pdfTabReviewBar').innerText(),/전체 63마디/);assert.equal(await p.locator('.desktopPdfTabImport').count(),0);
   if(test.full||test.denied){
    await p.locator('.pdfTabStorageNotice').waitFor();assert.equal(await p.locator('.desktopEditorActions [role="status"]').count(),0);
    assert.equal(await p.evaluate(()=>localStorage.getItem('fretiva.etude.library.v2')),oldLibrary,'failed save preserves existing library exactly');
    await p.locator('[data-bar-index="0"] .etudeNoteHandle[data-event="0"][data-mode="tab"][data-string="2"]').first().click();await p.locator('[data-score-input]').press('5');
    const downloading=p.waitForEvent('download');await p.getByRole('button',{name:'제작 악보 파일로 저장',exact:true}).click();const download=await downloading;const path=`${folder}/${test.name}-backup.json`;await download.saveAs(path);const backup=JSON.parse(await readFile(path));
    assert.equal(backup.measures.length,63);assert.equal(backup.measures[0].events[0].notes.find(n=>n.string===2).fret,5);assert.equal(backup.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).length,analysis.summary.confirmed);
    await p.locator('.desktopEditorActions').getByRole('button',{name:'닫기',exact:true}).click();await p.locator('.etudeEditorClosePrompt').waitFor();await p.locator('.etudeEditorClosePrompt').getByRole('button').nth(2).click();
    await p.evaluate(()=>{localStorage.removeItem('test-quota-filler');window.__restoreStorage?.();});
    await p.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();await p.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();await p.locator('.scoreSaveDialog').waitFor({state:'detached'});
    assert.equal(await p.locator('.pdfTabStorageNotice').count(),0);assert.equal(await p.locator('.desktopEditorActions [role="status"]').count(),0);
   }
   const records=await p.evaluate(()=>JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records);assert.equal(Object.keys(records).length,2,'cancel/retry never duplicates the imported score');assert.deepEqual(records[existing.id],JSON.parse(oldLibrary).records[existing.id]);
   const saved=Object.values(records).find(r=>r.document.id!==existing.id);assert.equal(saved.document.measures.length,63);
   await p.locator('.desktopEditorActions').getByRole('button',{name:'닫기',exact:true}).click();await p.locator('.etudeEditor').waitFor({state:'detached'});
   await p.getByRole('button',{name:'제작',exact:true}).click();assert.equal(await p.locator('.pdfTabStorageNotice').count(),0,'a new editor never inherits the previous storage warning');
   await p.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await p.locator('.scoreOpenItem').filter({hasText:saved.document.title}).click();await p.locator('.pdfTabReviewBar').waitFor();assert.equal(await p.locator('.pdfTabStorageNotice').count(),0);
  }
  assert.equal(moduleLoads,1);assert.deepEqual(errors,[]);await p.screenshot({path:`${folder}/${test.name}.png`});results.push({case:test.name,passed:true,errors});console.log(JSON.stringify(results.at(-1)));
 }catch(e){await p.screenshot({path:`${folder}/${test.name}-error.png`});throw e;}finally{await p.close();await writeFile(`${folder}/results.json`,JSON.stringify(results,null,2));}
}}finally{await browser.close();}
