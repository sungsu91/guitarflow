import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
import {normalizePitches} from '../src/etudes/scoreTuning.js';
const doc=JSON.parse(await readFile('artifacts/omr-deep-audit/verified-other/after.json','utf8'));
doc.title='원본 줄 배치 검증 5·6·2';doc.measures=doc.measures.slice(0,13);
doc.viewSettings={...doc.viewSettings,notationView:'tab',measuresPerRow:6,systemBreaks:[doc.measures[5].id,doc.measures[11].id]};
doc.measures=normalizePitches(doc).measures;
const out='artifacts/omr-source-layout/ui';await mkdir(out,{recursive:true});
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile}),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(d=>{localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{status:'draft',document:d}}}));localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:d.id,pdfId:''}));},doc);
 const rows=()=>page.locator('.etudeScoreViewport [data-playback-bar]').evaluateAll(nodes=>{const bars=new Map(nodes.map(n=>[n.dataset.playbackBar,n.dataset.row])),counts={};for(const row of bars.values())counts[row]=(counts[row]??0)+1;return Object.values(counts);});
 try{
  await page.goto('http://127.0.0.1:4174/#etudes',{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});await page.waitForFunction(()=>document.querySelectorAll('.etudeScoreViewport [data-playback-bar]').length>=13);
  assert.deepEqual(await rows(),[5,6,2]);await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-auto.png`});
  const chooser=page.getByRole('combobox',{name:'한 줄 마디 수',exact:true});
  await chooser.selectOption('5');await page.waitForFunction(()=>[...document.querySelectorAll('.etudeScoreViewport [data-playback-bar]')].filter(n=>n.dataset.row==='2').length===5);assert.deepEqual(await rows(),[5,5,3]);
  if(mobile)await page.getByRole('button',{name:'한 줄 마디 수 자동',exact:true}).click();else await chooser.selectOption('0');
  await page.waitForFunction(()=>[...document.querySelectorAll('.etudeScoreViewport [data-playback-bar]')].filter(n=>n.dataset.row==='2').length===6);assert.deepEqual(await rows(),[5,6,2]);
  if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/편집/}).click();}else await page.getByRole('button',{name:/현재 악보 편집|편집/}).first().click();
  await page.locator('.etudeEditor [data-draw-count]').first().waitFor();
  const editorRows=()=>page.locator('.etudeEditorMeasure').evaluateAll(nodes=>{const counts={};for(const n of nodes)counts[n.dataset.layoutRow]=(counts[n.dataset.layoutRow]??0)+1;return Object.values(counts);});
  assert.deepEqual(await editorRows(),[5,6,2]);
  await page.locator('.editorBarCount select').selectOption('12');await page.waitForFunction(()=>document.querySelectorAll('.etudeEditorMeasure[data-layout-row="1"]').length===12);assert.deepEqual(await editorRows(),[12,1]);
  assert.equal(await page.locator('.etudeEditor').evaluate(n=>n.scrollWidth<=n.clientWidth+2),true);
  assert.equal(await page.locator('body').evaluate(n=>n.scrollWidth<=innerWidth+2),true);
  await page.getByRole('button',{name:mobile?'악보 저장':'이 브라우저에 저장',exact:true}).click();await page.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();await page.locator('.scoreSaveDialog').waitFor({state:'detached'});
  const saved=(await readBrowserScoreLibrary(page)).records[doc.id].document;assert.deepEqual(saved.measures,doc.measures);assert.equal(saved.viewSettings.measuresPerRow,12);assert.deepEqual(saved.viewSettings.systemBreaks,[]);
  await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-editor.png`});await page.reload({waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});await page.waitForFunction(()=>document.querySelectorAll('.etudeScoreViewport [data-playback-bar]').length>=13);assert.deepEqual(await rows(),[12,1]);assert.deepEqual(errors,[]);
  results.push({mobile,autoRows:[5,6,2],overrideRows:[5,5,3],savedRows:[12,1],sourceEventsUnchanged:true,noPageOverflow:true,errors});
 }catch(error){console.log((await page.locator('body').innerText()).slice(0,2500));await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-failure.png`});throw error;}finally{await page.close();}
}}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
