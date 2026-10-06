import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {navigationScores,copyLayoutAnalysis} from '../tests/fixtures/copy-playback-scores.mjs';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {saveLibraryDocument} from '../src/etudes/scoreLibrary.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),out='artifacts/copy-layout-playback-20261005';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),reports=[];
try{for(const width of [1440,390]){
 const fixture=navigationScores()[1],doc=fixture.document;doc.bpm=120;
 const store={},storage={getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v};assert(saveLibraryDocument(storage,doc).saved);
 store['fretiva.score.last-open.v1']=JSON.stringify({lessonId:'G-triad-start',savedId:doc.id,pdfId:''});store.language='ko';store['fretiva.score.sound']='true';
 const page=await browser.newPage({viewport:{width,height:1000},isMobile:width<600,hasTouch:width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 try{
  await page.addInitScript(store=>{for(const [k,v] of Object.entries(store))localStorage.setItem(k,v);},store);
  await page.goto('http://127.0.0.1:5174/#etudes');await page.locator('.launchSplash').waitFor({state:'detached'});await page.locator('[data-start-bar="0"]').waitFor();
  await page.locator('.etudeRemoteControls>button').last().click();await page.getByRole('checkbox',{name:'카운트인',exact:true}).uncheck();await page.keyboard.press('Escape');
  await page.evaluate(()=>{
   window.trace=[];new MutationObserver(records=>{for(const r of records){if(r.attributeName!=='data-bar')continue;const v=r.target.getAttribute('data-bar');if(v!==null&&window.trace.at(-1)!==Number(v))window.trace.push(Number(v));}}).observe(document.querySelector('.etudeNotation'),{subtree:true,attributes:true,attributeFilter:['data-bar']});
  });
  const play=page.locator('.etudePracticeStart'),stop=page.locator('.etudePracticeStop');
  await play.click();await page.waitForFunction(()=>window.trace.length===4);await play.click(); // pause in pass 2
  await page.locator('.etudeRemoteBpm').click();await page.getByLabel('연습 BPM',{exact:true}).fill('160');await page.keyboard.press('Escape');await play.click();
  await page.waitForFunction(n=>window.trace.length>=n,fixture.expected.length);await page.waitForTimeout(500);
  const resumed=await page.evaluate(()=>window.trace);assert.deepEqual(resumed,fixture.expected);
  await page.locator('[data-start-bar="1"]').click();await page.evaluate(()=>window.trace=[]);await play.click();
  await page.waitForFunction(()=>window.trace.length>=2);await play.click();await play.click();
  await page.waitForFunction(()=>window.trace.length>=5);await page.waitForTimeout(500);const linear=await page.evaluate(()=>window.trace);assert.deepEqual(linear,[1,2,3,4,5]);
  await page.locator('.etudeRemoteControls>button').last().click();await page.getByLabel('반복 시작 마디',{exact:true}).selectOption('1');await page.getByLabel('반복 끝 마디',{exact:true}).selectOption('3');assert.equal(await page.getByLabel('반복 횟수',{exact:true}).inputValue(),'0');await page.keyboard.press('Escape');
  await page.locator('[data-start-bar="0"]').click();await page.evaluate(()=>window.trace=[]);await play.click();await page.waitForFunction(()=>window.trace.length>=7);await stop.click();
  const loop=await page.evaluate(()=>window.trace);assert.deepEqual(loop.slice(0,7),[1,2,3,1,2,3,1]);const n=loop.length;await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.trace.length),n);
  // Print uses the same copied rows/page boundaries, without rewriting music.
  const copy=analysisToDocument(copyLayoutAnalysis());
  await page.evaluate(async copy=>{const {printEditorScore}=await import('/src/etudes/printScore.js');printEditorScore(document.querySelector('.etudeNotation'),copy.title,'tab',copy);},copy);
  await page.locator('.score-print-page').nth(2).waitFor({state:'attached'});
  const printRows=await page.locator('.score-print-page').evaluateAll(pages=>pages.map(p=>[...p.querySelectorAll('section')].map(s=>s.children.length)));assert.deepEqual(printRows,[[4,5],[3,4],[2]]);
  await page.screenshot({path:`${out}/print-layout-${width}.png`});assert.deepEqual(errors,[]);reports.push({width,resumed,linear,loop,printRows,errors});console.log(JSON.stringify({width,passed:true}));
 }catch(e){await page.screenshot({path:`${out}/resume-failure-${width}.png`});throw e;}finally{await page.close();}
}}finally{await browser.close();await writeFile(`${out}/resume-loop-print.json`,JSON.stringify(reports,null,2));}
