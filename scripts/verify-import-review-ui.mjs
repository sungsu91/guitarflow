import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createBlankDocument,blankMeasure} from '../src/etudes/scoreModel.js';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE),safari=process.env.REVIEW_BROWSER==='webkit';
const output=process.env.REVIEW_OUTPUT??'artifacts/ocr-review-20261005';await mkdir(output,{recursive:true});
const doc=createBlankDocument();doc.title='빠른 확인 검증';doc.pdfTabImport={summary:{pages:2},notation:{}};
doc.viewSettings={...doc.viewSettings,measuresPerRow:4};
doc.measures=Array.from({length:24},(_,bar)=>{
 const m=blankMeasure();m.harmony='Cmaj7add6';m.harmonyChanges=[{onset:0,name:'Cmaj7add6'},{onset:960,name:'G'}];m.chordNameMode='manual';
 m.pdfImport={source:{page:bar<12?1:2},needsReview:true,rhythmVerified:true,reasons:['staff-omr-review','ties-and-repeats-unverified']};
 m.events.forEach((e,i)=>Object.assign(e,{rest:false,blank:false,notes:[{id:`${bar}-${i}`,string:1,fret:i}],pdfImport:{status:'unresolved',rhythmVerified:true,pendingStrings:[],source:{page:bar<12?1:2}}}));return m;
});
for(const [bar,index] of [[0,1],[8,2]])Object.assign(doc.measures[bar].events[index],{blank:true,rest:true,notes:[],pdfImport:{status:'unresolved',rhythmVerified:true,pendingStrings:[1]}});
Object.assign(doc.measures[12].pdfImport,{needsReview:true,rhythmVerified:false});
doc.measures[19].harmonyReview={reason:'unread-chord-label'};
doc.measures[8].events[3].pdfImport.pendingStrings=[4];
const browser=await (safari?webkit:chromium).launch({headless:true,...(!safari?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})}),results=[];
try{for(const [width,theme] of (safari?[[390,'light'],[390,'brand']]:[[1440,'light'],[1024,'brand'],[390,'light'],[390,'brand']])){
 const mobile=width<600,context=await browser.newContext({viewport:{width,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
 try{
  await page.addInitScript(({doc,theme})=>{localStorage.setItem('language','ko');localStorage.setItem('rifflabThemeMode',theme);localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[doc.id]:{document:doc,status:'draft',updatedAt:new Date().toISOString()}}}));},{doc,theme});
  await page.goto('http://127.0.0.1:5174/#etudes');await page.locator('.launchSplash').waitFor({state:'detached'});
  if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/제작|만들기/}).click();await page.locator('input[type=file][accept*="json"]').setInputFiles({name:'review.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});}
  else{await page.getByRole('button',{name:'제작',exact:true}).click();await page.getByRole('button',{name:'제작 악보 불러오기',exact:true}).click();await page.locator('.scoreOpenItem').filter({hasText:doc.title}).click();}
  if(mobile)await page.getByRole('button',{name:'악보 확인',exact:true}).click();
  const quick=page.locator(mobile?'.mobileReviewQuick':'.desktopReviewQuick');await quick.waitFor();
  assert.match(await quick.innerText(),/의심 구간 (?:1 \/ 4|4마디)/,'only the four suspect bars, not every imported note');
  const selected=[];
  for(const expected of [0,8,12,19,0]){
   await quick.getByRole('button',{name:'다음 확인 위치',exact:true}).click();
   const marker=page.locator(mobile?'.reviewLocationMarker':'.desktopLocationMarker');await marker.waitFor();
   const state=await marker.evaluate(mark=>{
    const host=mark.getRootNode().host,bar=host.closest('[data-bar-index]'),canvas=bar.closest('.etudeEditorCanvas'),m=mark.getBoundingClientRect(),c=canvas.getBoundingClientRect();
    return {bar:Number(bar.dataset.barIndex),label:mark.getAttribute('aria-label'),intersects:m.bottom>c.top&&m.top<c.bottom&&m.right>c.left&&m.left<c.right,scroll:canvas.scrollTop,marks:canvas.querySelectorAll('.desktopLocationTarget,.reviewLocationTarget').length};
   });assert.equal(state.bar,expected);assert(state.intersects,JSON.stringify(state));assert.equal(state.marks,1);assert.match(await quick.locator('output').innerText(),new RegExp(`${expected+1}마디`));selected.push(state);
  }
  await quick.getByRole('button',{name:'이전 확인 위치',exact:true}).click();assert.match(await quick.locator('output').innerText(),/20마디.*코드명 확인/s);
  assert.equal(await page.locator('[data-score-annotation="harmony"]').first().getAttribute('data-harmony-text'),'Cmaj7(6)');
  const bounds=await quick.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width);
  await page.screenshot({path:`${output}/review-${width}-${theme}.png`});
  assert.deepEqual(errors,[]);results.push({width,theme,selected,errors});console.log(JSON.stringify({width,theme,passed:true}));
 }catch(e){await page.screenshot({path:`${output}/review-failure-${width}-${theme}.png`});throw e;}finally{await context.close();}
}}finally{await browser.close();await writeFile(`${output}/review-ui.json`,JSON.stringify(results,null,2));}
