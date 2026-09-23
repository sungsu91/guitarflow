import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[];
const save=()=>fs.writeFileSync('artifacts/i18n/editor-flow.json',JSON.stringify(results,null,2));
const switchLanguage=async(page,language)=>{await page.evaluate(language=>{localStorage.setItem('language',language);dispatchEvent(new StorageEvent('storage',{key:'language'}));},language);await page.waitForTimeout(120);};
async function inspect(page){return page.locator('.etudeEditor').evaluate(root=>{
 const visible=e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(e).visibility!=='hidden';};
 return {korean:[...root.querySelectorAll('*')].filter(e=>!e.children.length&&visible(e)&&/[가-힣]/.test(e.textContent)).map(e=>e.textContent.trim()),overflow:[...root.querySelectorAll('button,summary,strong')].filter(visible).filter(e=>e.clientWidth&&e.scrollWidth>e.clientWidth+3).map(e=>({text:e.textContent.trim(),width:e.clientWidth,scroll:e.scrollWidth})),scrollWidth:document.documentElement.scrollWidth};
 });}
try{
 for(const[width,height]of [[360,800],[375,812],[390,844],[393,852],[430,932],[1440,900]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<1000,hasTouch:width<1000});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('language','en'));
  await page.goto('http://127.0.0.1:5175/#etudes');await page.waitForTimeout(4000);
  await page.getByRole('button',{name:'Create or edit score',exact:true}).click();await page.getByRole('button',{name:'Create new score',exact:true}).click();await page.waitForTimeout(500);
  await page.getByRole('button',{name:'Fret 3',exact:true}).click();
  const states={};for(const lang of ['ko','en','ko']){await switchLanguage(page,lang);states[lang==='ko'&&states.ko?'returnedKo':lang]=await inspect(page);}
  await switchLanguage(page,'en');
  const panels=[];for(const kind of ['picking','note','beam','repeat']){
   const button=page.locator(`[data-mobile-tool-toggle="${kind}"]`);if(!await button.count())continue;
   await button.click();await switchLanguage(page,'ko');assert.equal(await button.getAttribute('aria-expanded'),'true');await switchLanguage(page,'en');assert.equal(await button.getAttribute('aria-expanded'),'true');panels.push({kind,...await inspect(page)});await button.click();
  }
  await page.screenshot({path:`artifacts/i18n/editor-${width}-en.png`});
  await page.locator('button.etudeEditorSave').click();const dialog=page.locator('.scoreSaveDialog');await dialog.waitFor();
  const title='저장 / My score '+width;await dialog.locator('input:not([type])').first().fill(title);
  await switchLanguage(page,'ko');assert.equal(await dialog.locator('input:not([type])').first().inputValue(),title);await switchLanguage(page,'en');
  await dialog.locator('button[type=submit]').click();await dialog.waitFor({state:'hidden'});
  const snapshot=await page.evaluate(()=>localStorage.getItem('fretiva.etude.library.v2'));assert.ok(snapshot);
  const library=JSON.parse(snapshot),record=Object.values(library.records).find(r=>r.document.title===title);assert.ok(record);assert.ok(record.document.measures.some(m=>m.events.some(e=>e.notes.some(n=>n.fret===3))));
  await switchLanguage(page,'ko');await switchLanguage(page,'en');assert.equal(await page.evaluate(()=>localStorage.getItem('fretiva.etude.library.v2')),snapshot);
  await page.reload();await page.waitForTimeout(3500);await page.getByRole('tab',{name:'My Scores',exact:true}).click();await page.locator('.libraryScoreOpen').filter({hasText:title}).click();await page.waitForTimeout(500);assert.ok((await page.locator('body').innerText()).includes(title));const reopened=JSON.parse(await page.evaluate(()=>localStorage.getItem('fretiva.etude.library.v2')));assert.deepEqual(reopened.records[record.document.id].document,record.document);
  assert.deepEqual(errors,[]);results.push({width,height,states,panels,editedFret:3,savedAndReloaded:true,userTitlePreserved:true,storedDocumentUnchangedAcrossLanguages:true,errors});save();console.log('Editor verified',width);await page.close();
 }
}finally{save();await browser.close();}

