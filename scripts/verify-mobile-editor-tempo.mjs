import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createBlankDocument} from '../src/etudes/scoreModel.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out='artifacts/mobile-editor-tempo',origin=process.env.EDITOR_ORIGIN??'http://127.0.0.1:5174';
await mkdir(out,{recursive:true});
const score=createBlankDocument();score.title='BPM 입력 검증';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{for(const [width,height,theme] of [[320,568,'light'],[390,844,'light'],[440,956,'brand'],[1440,1000,'light']]){
 const mobile=width<600,page=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 try{
  await page.addInitScript(({score,theme})=>{localStorage.setItem('language','ko');localStorage.setItem('rifflabThemeMode',theme);localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[score.id]:{status:'draft',document:score}}}));localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:score.id,pdfId:''}));},{score,theme});
  await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
  if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/편집/}).click();}else await page.getByRole('button',{name:'편집',exact:true}).click();
  const editor=page.locator('.etudeEditor'),input=editor.locator('.editorTempo input'),steps=editor.locator('.mobileTempoSteps');
  await editor.waitFor();if(mobile)await page.waitForFunction(()=>document.querySelector('.etudeEditorPreview')?.style.getPropertyValue('--mobile-score-height'));
  const paperHeight=(await editor.locator('.etudeEditorCanvas').boundingBox()).height;
  await input.click();
  if(mobile){
   await steps.waitFor();assert(await input.evaluate(e=>document.activeElement===e));
   assert.deepEqual(await steps.locator('button').allTextContents(),['−','−10','+10','+']);
   const bounds=await steps.boundingBox(),anchor=await editor.locator('.editorTempo').boundingBox();
   assert(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y>=0&&bounds.y+bounds.height<=height,JSON.stringify(bounds));
   assert(Math.abs(bounds.y+bounds.height+8-anchor.y)<2,JSON.stringify({bounds,anchor}));
   assert.equal((await editor.locator('.etudeEditorCanvas').boundingBox()).height,paperHeight);
   for(const [name,value] of [['BPM 1 낮추기','59'],['BPM 10 낮추기','49'],['BPM 10 올리기','59'],['BPM 1 올리기','60']]){await steps.getByRole('button',{name,exact:true}).tap();assert.equal(await input.inputValue(),value);assert(await steps.isVisible());assert(await input.evaluate(e=>document.activeElement===e));}
   await input.fill('123');await steps.getByRole('button',{name:'BPM 10 올리기',exact:true}).click();assert.equal(await input.inputValue(),'133');
   await editor.getByRole('button',{name:'BPM 확인',exact:true}).click();await steps.waitFor({state:'detached'});assert.equal(await input.inputValue(),'133');
   await input.click();await input.fill('239');await steps.getByRole('button',{name:'BPM 10 올리기',exact:true}).click();assert.equal(await input.inputValue(),'240');
   await input.fill('31');await steps.getByRole('button',{name:'BPM 10 낮추기',exact:true}).click();assert.equal(await input.inputValue(),'30');
   await input.fill('180');await input.press('Escape');await steps.waitFor({state:'detached'});assert.equal(await input.inputValue(),'30');assert(await editor.isVisible());
   await input.click();await input.fill('120.6');await input.press('Enter');await steps.waitFor({state:'detached'});assert.equal(await input.inputValue(),'121');
   await input.click();await input.fill('100');await editor.locator('.etudeEditorCanvas').click({position:{x:12,y:12}});await steps.waitFor({state:'detached'});assert.equal(await input.inputValue(),'100');
   await input.click();await input.press('Tab');assert(await steps.locator('button').first().evaluate(e=>document.activeElement===e));await page.keyboard.press('Enter');assert.equal(await input.inputValue(),'99');await page.keyboard.press('Escape');await steps.waitFor({state:'detached'});assert(await editor.isVisible());
   await input.click();await input.fill('120');assert((await input.boundingBox()).width>=32);await page.screenshot({path:`${out}/${width}-${theme}.png`});
  }else{
   assert.equal(await steps.count(),0);await input.fill('90');await input.press('Enter');assert.equal(await input.inputValue(),'90');await page.screenshot({path:`${out}/desktop.png`});
  }
  assert.deepEqual(errors,[]);results.push({width,height,mobile,paperHeight,passed:true,errors});console.log(JSON.stringify(results.at(-1)));
 }catch(e){await page.screenshot({path:`${out}/${width}-error.png`});console.error((await page.locator('body').innerText()).slice(-2000));throw e;}finally{await page.close();}
}}finally{await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify(results,null,2));}
