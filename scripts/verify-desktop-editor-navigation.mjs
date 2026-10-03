import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
import {normalizePitches} from '../src/etudes/scoreTuning.js';
import {isDeepStrictEqual} from 'node:util';
const out='artifacts/desktop-editor-navigation';await mkdir(out,{recursive:true});
const doc=JSON.parse(await readFile('artifacts/omr-source-layout/other-final/after.json','utf8'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
const origin=process.env.EDITOR_TEST_ORIGIN??'http://localhost:5174';
try{for(const config of [{width:1920,height:1000,theme:'light'},{width:1280,height:900,theme:'brand'},{width:1024,height:768,theme:'light'},{width:390,height:844,theme:'light',mobile:true}]){
 const {mobile=false,theme}=config,label=`${config.width}-${theme}`;
 console.log(`Checking ${label}`);
 const page=await browser.newPage({viewport:{width:config.width,height:config.height},isMobile:mobile,hasTouch:mobile}),errors=[];page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 const clickNote=async(bar,event,string)=>{
  const hit=page.locator(`.etudeEditorMeasure[data-bar-index="${bar}"] .etudeEditorHit[data-event="${event}"][data-mode="tab"][data-string="${string}"]`).first();
  await hit.scrollIntoViewIfNeeded();await hit.click({force:true});
 };
 const mark=()=>page.locator('.desktopLocationMarker');
 const assertMarker=async bar=>{
  await mark().waitFor();assert.equal(await page.locator('.desktopLocationTarget').getAttribute('data-bar-index'),String(bar));
  const b=await mark().boundingBox(),v=await page.locator('.etudeEditorCanvas').boundingBox();
  assert.ok(b.x>=v.x-1&&b.x+b.width<=v.x+v.width+1,'marker visible horizontally');
  assert.ok(b.y>=v.y-1&&b.y+b.height<=v.y+v.height+1,'marker visible vertically');
 };
 try{
  await page.addInitScript(({d,theme})=>{localStorage.setItem('language','ko');localStorage.setItem('rifflabThemeMode',theme);localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{status:'draft',document:d}}}));localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:d.id,pdfId:''}));},{d:doc,theme});
  await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});
  if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/편집/}).click();}else await page.getByRole('button',{name:/현재 악보 편집|편집/}).first().click();
  await page.locator('.etudeEditor [data-draw-count]').first().waitFor();
  assert.equal(await page.locator('.etudeEditor').evaluate(e=>e.scrollWidth<=e.clientWidth+2),true);
  await page.screenshot({path:`${out}/${label}-layout.png`});
  if(mobile){
   assert.equal(await page.locator('.desktopEditorHeader,.desktopEditorNotice').count(),0);
   const before=JSON.parse(await readFile(`${out}/mobile-before.json`,'utf8'));
   const after=await page.locator('.mobileScoreWorkspace').evaluate(el=>({text:el.innerText,boxes:[...el.querySelectorAll('.mobileScoreHeader,.mobileNotationTools,.etudeEditorPreview,.mobileFretPad')].map(e=>({class:e.className,rect:e.getBoundingClientRect().toJSON()}))}));
   assert.deepEqual(after,before,'mobile content and layout remain identical');results.push({label,mobileUnchanged:true,errors});continue;
  }
  assert.equal(await page.locator('.desktopToolColumn .desktopEditorActions').count(),0);
  assert.equal(await page.locator('.desktopEditorHeader .desktopEditorActions button').count(),6);
  const header=await page.locator('.desktopEditorHeader').boundingBox();
  for(const b of await page.locator('.desktopEditorActions button').all()){const box=await b.boundingBox();assert.ok(box.x>=header.x&&box.x+box.width<=header.x+header.width+1);assert.ok(box.y+box.height<=header.y+header.height+1);}
  await page.locator('.desktopSourceReviewToggle').click();await page.getByRole('button',{name:'다음 확인 위치',exact:true}).click();
  await mark().waitFor();const reviewBar=Number(await page.locator('.desktopLocationTarget').getAttribute('data-bar-index'));await assertMarker(reviewBar);
  assert.match(await page.locator('.desktopEditorNotice').innerText(),/원본 확인 위치/);
  assert.equal(await page.locator('.desktopSourceReviewPanel').count(),0);
  const bar=25,event=doc.measures[bar].events.findIndex(e=>e.notes.length),string=doc.measures[bar].events[event].notes[0].string;
  await clickNote(bar,event,string);await page.keyboard.press('9');
  await clickNote(0,0,1);await page.getByRole('button',{name:'실행 취소',exact:true}).click();await assertMarker(bar);
  assert.match(await page.locator('.desktopEditorNotice').innerText(),/되돌리기.*26마디/s);
  const colors=await page.locator('.desktopEditorNotice').evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,border:getComputedStyle(e).borderColor}));
  await page.locator('.desktopEditorNotice').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});await page.screenshot({path:`${out}/${label}-undo.png`});
  await page.mouse.move(1,1);await page.locator('.desktopEditorNotice').waitFor({state:'detached',timeout:6500});await assertMarker(bar);
  await clickNote(0,0,1);await page.getByRole('button',{name:'다시 실행',exact:true}).click();await assertMarker(bar);
  await page.locator('.desktopEditorNotice').getByRole('button',{name:'알림 닫기'}).click();assert.equal(await page.locator('.desktopEditorNotice').count(),0);
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();await assertMarker(bar);await page.mouse.move(1,1);await page.locator('.desktopEditorNotice').waitFor({state:'detached',timeout:6500});
  await page.getByRole('button',{name:'이 브라우저에 저장',exact:true}).click();await page.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();await page.locator('.scoreSaveDialog').waitFor({state:'detached'});
  const saved=(await readBrowserScoreLibrary(page)).records[doc.id].document;assert.ok(isDeepStrictEqual(saved.measures,normalizePitches(doc).measures),'undo restores all original musical/import data');
  await page.locator('.desktopEditorHelpButton').click();await page.locator('.desktopScoreEditorHelp').waitFor();await page.keyboard.press('Escape');
  await page.locator('.desktopEditorFileActions').getByRole('button',{name:/제작 악보 불러오기|저장.*악보|불러오기/}).click();await page.locator('.scoreOpenDialog').waitFor();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'PDF·사진에서 TAB 초안 생성',exact:true}).click();await page.locator('.desktopPdfTabImport').waitFor();await page.keyboard.press('Escape');
  await clickNote(0,0,1);await page.locator('.desktopSourceReviewToggle').click();await page.getByRole('button',{name:'1마디 확인 완료로 표시',exact:true}).click();assert.match(await page.locator('.desktopEditorNotice').innerText(),/1마디 원본 확인 완료/);
  assert.match(await page.locator('.desktopSourceReviewToggle').innerText(),/48마디 확인 전/);
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();await assertMarker(0);assert.match(await page.locator('.desktopSourceReviewToggle').innerText(),/49마디 확인 전/);
  assert.deepEqual(errors,[]);results.push({label,headerActions:true,reviewNavigation:true,undoRedoScroll:true,toastDismisses:true,originalDataRestored:true,colors,errors});
 }catch(e){await page.screenshot({path:`${out}/${label}-failure.png`});console.log((await page.locator('body').innerText()).slice(-2500));throw e;}finally{await page.close();}
}}finally{await browser.close();await writeFile(`${out}/ui-results.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
