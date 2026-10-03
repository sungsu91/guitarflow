import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createBlankDocument,blankMeasure} from '../src/etudes/scoreModel.js';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
const out='artifacts/mobile-measure-menu';await mkdir(out,{recursive:true});
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
const base=createBlankDocument();base.title='마디 배치 검사';base.measures=Array.from({length:16},()=>blankMeasure());base.viewSettings.measuresPerRow=4;
const seed=async(page,doc,theme)=>page.addInitScript(({doc,theme})=>{localStorage.setItem('language','ko');localStorage.setItem('rifflabThemeMode',theme);localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[doc.id]:{status:'draft',document:doc}}}));localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:doc.id,pdfId:''}));},{doc,theme});
const open=async(page,origin,mobile)=>{await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/편집/}).click();}else await page.getByRole('button',{name:/현재 악보 편집|편집/}).first().click();await page.locator('.etudeEditor [data-draw-count]').first().waitFor();};
try{
 for(const config of [{width:440,theme:'light'},{width:440,theme:'brand'},{width:390,theme:'light'},{width:320,theme:'brand'},{width:390,theme:'brand',legacy:true}]){
  const page=await browser.newPage({viewport:{width:config.width,height:956},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  const doc=structuredClone(base);if(config.legacy){doc.viewSettings.measuresPerRow=12;doc.viewSettings.systemBreaks=[doc.measures[7].id];}
  const label=`${config.width}-${config.theme}${config.legacy?'-saved12':''}`;
  try{
   await seed(page,doc,config.theme);await open(page,'http://localhost:5174',true);
   const trigger=page.locator('.mobileMeasureRowTrigger'),menu=page.locator('.mobileMeasureRowMenu');
   assert.equal(await page.locator('.editorBarCount select').count(),0);
   const sizes=await page.locator('.editorBarCount button').evaluateAll(nodes=>nodes.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,font:getComputedStyle(e).fontSize})));
   assert.deepEqual(sizes.at(-1),sizes[0],'more button matches the adjacent number buttons');
   if(config.legacy)assert.equal(await trigger.innerText(),'12');
   await trigger.tap();await menu.waitFor();await menu.evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished));});
   assert.deepEqual(await menu.getByRole('option').allTextContents(),['5','6','8']);
   const geometry=await menu.boundingBox();assert.ok(geometry.x>=0&&geometry.x+geometry.width<=config.width&&geometry.y+geometry.height<=956);assert.ok(geometry.height<100);
   const colors=await menu.evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}));
   await page.screenshot({path:`${out}/${label}-open.png`});
   await page.keyboard.press('Escape');await menu.waitFor({state:'detached'});assert.equal(await trigger.evaluate(e=>document.activeElement===e),true);
   if(config.legacy){
    // Opening and dismissing the new UI must not clamp legacy/source layouts.
    await page.getByRole('button',{name:'악보 저장',exact:true}).click();await page.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();await page.locator('.scoreSaveDialog').waitFor({state:'detached'});
    const saved=(await readBrowserScoreLibrary(page)).records[doc.id].document;assert.equal(saved.viewSettings.measuresPerRow,12);assert.deepEqual(saved.viewSettings.systemBreaks,doc.viewSettings.systemBreaks);
   }else{
    await trigger.tap();await menu.getByRole('option',{name:'한 줄 6마디',exact:true}).tap();await menu.waitFor({state:'detached'});assert.equal(await trigger.innerText(),'6');
    await trigger.tap();assert.equal(await menu.getByRole('option',{selected:true}).innerText(),'6');
    await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await menu.waitFor({state:'detached'});assert.equal(await trigger.innerText(),'8');
    await page.locator('.editorBarCount').getByRole('button',{name:'한 줄 4마디',exact:true}).tap();assert.equal(await trigger.getAttribute('aria-pressed'),'false');
    await trigger.tap();await page.locator('.mobileScoreHeader').tap({position:{x:140,y:18}});await menu.waitFor({state:'detached'});
   }
   assert.deepEqual(errors,[]);results.push({label,sizes,geometry,colors,errors});console.log(JSON.stringify(results.at(-1)));
  }catch(error){await page.screenshot({path:`${out}/${label}-failure.png`});throw error;}finally{await page.close();}
 }
 // Compare the untouched desktop control with the preceding production build.
 const snapshots=[];
 for(const origin of ['http://127.0.0.1:4174','http://localhost:5174']){
  const page=await browser.newPage({viewport:{width:1440,height:900}});await seed(page,base,'light');await open(page,origin,false);
  snapshots.push(await page.locator('.editorBarCount').evaluate(e=>({text:e.innerText,html:e.innerHTML,rect:e.getBoundingClientRect().toJSON()})));await page.close();
 }
 assert.deepEqual(snapshots[1],snapshots[0],'desktop remains identical');results.push({desktopUnchanged:true});
}finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();}
