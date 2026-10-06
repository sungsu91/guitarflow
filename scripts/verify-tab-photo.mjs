import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const origin=process.env.PDF_TAB_APP_ORIGIN||'http://127.0.0.1:5174',out=process.env.TAB_PHOTO_OUTPUT||'artifacts/tab-photo',fixtures='artifacts/tab-photo/fixtures';await mkdir(out,{recursive:true});
const results=[];
const fingerprint=result=>result.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures.map(m=>m.slots.map(slot=>({duration:slot.duration,notes:slot.notes.filter(n=>n.status==='confirmed').map(n=>[n.string,n.dead?'X':n.fret])})))));
try{
 let baseline;
 for(const [file,rotation=0,expectError=false] of (process.env.PHOTO_UI_ONLY?[]:[['score.png'],['score.JPG'],['compressed.jpeg'],['camera-exif.jpg'],['sideways.png',1],['transparent.png'],['blurred.jpg'],['skewed.png',0,true],['blank.jpg',0,true],['broken.png',0,true]])){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/__photo-test',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><input type="file">'}));await page.goto(`${origin}/__photo-test`);
  await page.addScriptTag({content:`window.workers=[];const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(...args){super(...args);window.workers.push(this);}terminate(){this.closed=true;return super.terminate();}}`});
  await page.locator('input').setInputFiles(`${fixtures}/${file}`);
  const result=await page.evaluate(async rotation=>{
   const {loadTabImage,importImageTab}=await import('/src/pdf/tab-import/imageTabSource.js');let source;
   try{source=await loadTabImage(document.querySelector('input').files[0]);return await importImageTab(source,{rotation,signal:AbortSignal.timeout(120000)});}catch(e){return {error:e.message};}finally{source?.close();}
  },rotation);
  assert.deepEqual(errors,[]);const live=await page.evaluate(()=>window.workers.filter(w=>!w.closed).length);assert.equal(live,0);
  if(expectError)assert.match(result.error,/인식 가능한|악보의 음|사진 파일/);
  else{
   assert.equal(result.error,undefined);assert.equal(result.summary.measures,4);assert(result.summary.confirmed>=30);
   if(file==='score.png')baseline=fingerprint(result);
   if(['score.JPG','camera-exif.jpg','sideways.png','transparent.png'].includes(file))assert.deepEqual(fingerprint(result),baseline,'clean formats and orientation retain the same notes and rhythm');
  }
  const report={file,rotation,passed:true,summary:result.summary,error:result.error,liveWorkers:live};results.push(report);await writeFile(`${out}/${file}.json`,JSON.stringify(result));console.log(JSON.stringify(report));await page.close();
 }
 for(const width of [320,390,440,1440].filter(width=>!process.env.PHOTO_WIDTH||width===Number(process.env.PHOTO_WIDTH))){
  const mobile=width<600,page=await browser.newPage({viewport:{width,height:mobile?844:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
  if(process.env.PHOTO_CPU_RATE){const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:Number(process.env.PHOTO_CPU_RATE)});}
  await page.addInitScript(()=>localStorage.setItem('language','ko'));
  await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});
  if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/제작|만들기/}).click();await page.getByRole('button',{name:'PDF 메뉴',exact:true}).click();await page.getByRole('menuitem',{name:'불러오기(전환)',exact:true}).click();}
  else{await page.getByRole('button',{name:'제작',exact:true}).click();await page.getByRole('button',{name:'PDF·사진에서 TAB 초안 생성',exact:true}).click();}
  const dialog=page.locator('.mobilePdfTabImport,.desktopPdfTabImport');
  assert.equal(await dialog.locator('input[capture]').count(),0);
  await page.getByRole('radio',{name:'TAB → TAB',exact:true}).check();
  const picker=page.getByLabel('PDF·사진 선택',{exact:true});await picker.setInputFiles(`${fixtures}/${mobile?'sideways.png':'score.JPG'}`);
  await page.getByRole('img',{name:'악보 사진 미리보기'}).waitFor();
  if(mobile)await page.getByRole('button',{name:'90° 회전',exact:true}).click();
  if(width===390){await page.setViewportSize({width:1440,height:1000});await page.locator('.desktopPdfTabImport').waitFor();await page.getByRole('img',{name:'악보 사진 미리보기'}).waitFor();await page.setViewportSize({width,height:844});await page.locator('.mobilePdfTabImport').waitFor();}
  await page.screenshot({path:`${out}/${process.env.PHOTO_LABEL||'preview'}-${width}.png`});
  assert(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1),'dialog has no horizontal overflow');
  await page.getByRole('button',{name:'분석하기',exact:true}).click();
  try{await page.getByRole('heading',{name:'TAB 분석 완료',exact:true}).waitFor();}
  catch(error){await page.screenshot({path:`${out}/failure-${width}.png`});await writeFile(`${out}/failure-${width}.txt`,JSON.stringify({errors,text:await page.locator('body').innerText()},null,2));throw error;}
  await page.getByRole('button',{name:'제작실에서 열기',exact:true}).click();await page.locator(mobile?'.mobilePdfTabReview':'.pdfTabReviewBar').waitFor();
  const saved=Object.values((await readBrowserScoreLibrary(page)).records)[0].document;
  assert.equal(saved.measures.length,4);assert.equal(saved.pdfTabImport.sourceType,'image');assert.equal(saved.pdfTabImport.imageRotation,mobile?90:0);assert(!/\.(jpg|png|jpeg)/i.test(saved.title));
  assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/editor-${width}.png`});results.push({uiWidth:width,passed:true,measures:saved.measures.length,sourceType:saved.pdfTabImport.sourceType});console.log(JSON.stringify(results.at(-1)));await page.close();
 }
}finally{await writeFile(`${out}/results${process.env.PHOTO_LABEL?`-${process.env.PHOTO_LABEL}`:''}.json`,JSON.stringify(results,null,2));await browser.close();}
