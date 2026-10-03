// Isolated browser profiles: never clear or fill the user's actual browser.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const origin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174',out='artifacts/score-storage-quota';
await mkdir(out,{recursive:true});
const large=JSON.parse(await readFile('artifacts/staff-photo/converted-document.json'));
const analysis=JSON.parse(await readFile('artifacts/pdf-tab-adaptive/release/1-analysis.json'));
const results=[];
async function setup(mobile){
 const page=await browser.newPage({viewport:{width:mobile?440:1440,height:960}});page.setDefaultTimeout(30000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('language','ko'));
 await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
 return {page,errors};
}
async function createEditor(page,mobile){
 if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/제작|만들기/}).click();}
 else await page.getByRole('button',{name:'제작',exact:true}).click();
 await page.locator('.etudeEditor').waitFor();
}
async function readRecords(page){return page.evaluate(async()=> (await (await import('/src/etudes/browserScoreLibrary.js')).createBrowserScoreLibrary().load()).records);}
async function fillStorage(page){return page.evaluate(()=>{
 let size=0;for(let step=1024*1024;step>=16;step=Math.floor(step/2))while(true){try{localStorage.setItem('test-quota-filler','x'.repeat(size+step));size+=step;}catch{break;}}
 return size;
});}
try{
 // Migrate an actual full legacy library, preserve the backup, serialize concurrent writes.
 const {page,errors}=await setup(false);
 const checks=await page.evaluate(async large=>{
  const {createBrowserScoreLibrary,SCORE_LIBRARY_DB}=await import('/src/etudes/browserScoreLibrary.js');
  const {createBlankDocument}=await import('/src/etudes/scoreModel.js');
  const {saveLibraryDocument,LIBRARY_KEY}=await import('/src/etudes/scoreLibrary.js');
  // A separate database starts with no migration marker in this isolated profile.
  await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(SCORE_LIBRARY_DB);r.onsuccess=resolve;r.onerror=()=>reject(r.error);});
  const a=createBlankDocument();a.title='보존할 기존 악보';saveLibraryDocument(localStorage,a);
  const backup=localStorage.getItem(LIBRARY_KEY);
  let size=0;for(let step=1024*1024;step>=16;step=Math.floor(step/2))while(true){try{localStorage.setItem('test-quota-filler','x'.repeat(size+step));size+=step;}catch{break;}}
  const oldFailure=saveLibraryDocument(localStorage,large).saved===false;
  const repo=createBrowserScoreLibrary(),migrated=await repo.load(),saved=await repo.save(large);
  const docs=Array.from({length:3},()=>createBlankDocument()),parallel=await Promise.all(docs.map(d=>repo.save(d)));
  const renamed=await repo.rename(a.id,'이름을 바꾼 기존 악보'),removed=await repo.remove(docs[0].id),reloaded=await createBrowserScoreLibrary().load();
  const originalPut=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(...args){const request=originalPut.apply(this,args);request.addEventListener('success',()=>this.transaction.abort(),{once:true});return request;};
  const aborted=await repo.save({...large,title:'저장되면 안 되는 변경'});IDBObjectStore.prototype.put=originalPut;
  const afterAbort=await repo.load();
  return {oldFailure,size,migrated:Boolean(migrated.records[a.id]),saved:saved.saved,parallel:parallel.every(r=>r.saved),renamed:renamed.saved,removed:removed.saved,deletedStaysDeleted:!reloaded.records[docs[0].id],count:Object.keys(reloaded.records).length,backupPreserved:backup===localStorage.getItem(LIBRARY_KEY),notesPreserved:JSON.stringify(reloaded.records[large.id].document.measures)===JSON.stringify(large.measures),aborted:!aborted.saved,abortPreservesTitle:afterAbort.records[large.id].document.title===large.title};
 },large);
 for(const key of ['oldFailure','migrated','saved','parallel','renamed','removed','deletedStaysDeleted','backupPreserved','notesPreserved','aborted','abortPreservesTitle'])assert.equal(checks[key],true,key);
 assert.equal(checks.count,4);assert.deepEqual(errors,[]);results.push({case:'real-full-localStorage-migration-atomicity',passed:true,...checks});await page.close();

 for(const mobile of [true,false]){
  const {page,errors}=await setup(mobile),name=mobile?'mobile':'desktop';
  await fillStorage(page);
  await createEditor(page,mobile);
  if(!mobile)await page.setViewportSize({width:440,height:960});
  await page.locator('.etudeEditor input[type=file]').setInputFiles('artifacts/staff-photo/converted-document.json');
  if(!mobile)await page.setViewportSize({width:1440,height:960});
  await page.locator(mobile?'.mobilePdfTabReview':'.pdfTabReviewBar').waitFor();
  await page.locator('.etudeEditorSave').click();await page.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();await page.locator('.scoreSaveDialog').waitFor({state:'detached'});
  const records=await readRecords(page),saved=Object.values(records)[0];assert.equal(saved.document.measures.length,81);
  assert.deepEqual(saved.document.measures.slice(8,12).map(m=>m.events.map(e=>e.duration)),large.measures.slice(8,12).map(m=>m.events.map(e=>e.duration)));
  assert.equal(await page.locator('.pdfTabStorageNotice,.mobilePdfTabStorageNotice').count(),0);
  await page.screenshot({path:`out/${name}-large-saved.png`.replace('out/',`${out}/`)});
  await page.reload({waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});
  assert.equal((await readRecords(page))[saved.document.id].document.measures.length,81);
  // Verify the saved score is exposed through the actual library, not just a DB record.
  await page.setViewportSize({width:1440,height:960});await createEditor(page,false);
  await page.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await page.locator('.scoreOpenItem').filter({hasText:saved.document.title}).click();await page.locator('.pdfTabReviewBar').waitFor();
  assert.equal(await page.locator('.pdfTabStorageNotice').count(),0);assert.deepEqual(errors,[]);
  results.push({case:`${name}-81-bars-full-storage-save-reload-open`,passed:true});await page.close();
 }

 // An actual DB failure keeps a recoverable draft; retry clears the notice only after commit.
 for(const mobile of [true,false]){
  const {page,errors}=await setup(mobile),name=mobile?'mobile':'desktop';
  await page.route('**/src/pdf/tab-import/importPdfTab.js*',r=>r.fulfill({contentType:'application/javascript',body:`export async function importPdfTab(){return ${JSON.stringify(analysis)};}`}));
  await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;window.failScoreWrites=true;IDBObjectStore.prototype.put=function(...args){if(window.failScoreWrites&&this.name==='library')throw new DOMException('test quota','QuotaExceededError');return put.apply(this,args);};});
  await createEditor(page,mobile);
  if(mobile){await page.getByRole('button',{name:'PDF 메뉴',exact:true}).click();await page.getByRole('menuitem',{name:'불러오기(전환)',exact:true}).click();}
  else await page.getByRole('button',{name:'PDF·사진에서 TAB 초안 생성',exact:true}).click();
  await page.getByLabel(mobile?'PDF·사진 선택':'TAB 분석용 PDF·사진 선택',{exact:true}).setInputFiles({name:'test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF storage test')});
  await page.getByRole('heading',{name:'TAB 분석 완료',exact:true}).waitFor();await page.getByRole('button',{name:'제작실에서 열기',exact:true}).click();
  const notice=page.locator('.pdfTabStorageNotice,.mobilePdfTabStorageNotice');await notice.waitFor();assert.match(await notice.innerText(),/저장 공간이 부족/);
  assert.equal(Object.keys(await readRecords(page)).length,0);
  await page.locator('.etudeEditorSave').click();const dialog=page.locator('.scoreSaveDialog');await dialog.getByRole('button',{name:'저장하기',exact:true}).click();await dialog.getByRole('alert').waitFor();assert.match(await dialog.getByRole('alert').innerText(),/저장 공간이 부족/);
  await page.evaluate(()=>window.failScoreWrites=false);
  await dialog.getByRole('button',{name:'저장하기',exact:true}).click();await dialog.waitFor({state:'detached'});await notice.waitFor({state:'detached'});
  assert.equal(Object.keys(await readRecords(page)).length,1);assert.deepEqual(errors,[]);
  await page.screenshot({path:`${out}/${name}-retry-cleared.png`});results.push({case:`${name}-db-failure-draft-retry-notice-cleared`,passed:true});await page.close();
 }
}finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify(results,null,2));
