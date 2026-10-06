import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {navigationScores,copyLayoutAnalysis} from '../tests/fixtures/copy-playback-scores.mjs';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {saveLibraryDocument} from '../src/etudes/scoreLibrary.js';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE);
const safari=process.env.COPY_BROWSER==='webkit',out=process.env.COPY_OUTPUT??'artifacts/copy-layout-playback-20261005';await mkdir(out,{recursive:true});
// The Windows WebKit runtime has no usable Web Audio device; verify its
// layout separately, and exercise the real transport in Chromium.
const browser=await (safari?webkit:chromium).launch({headless:true,...(!safari?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})}),reports=[];
async function open(document,width){
 const store={},storage={getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v};assert(saveLibraryDocument(storage,document).saved);
 store['fretiva.score.last-open.v1']=JSON.stringify({lessonId:'G-triad-start',savedId:document.id,pdfId:''});store.language='ko';store['fretiva.score.sound']='true';
 const page=await browser.newPage({viewport:{width,height:1000},isMobile:width<600,hasTouch:width<600});page.setDefaultTimeout(25000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(store=>{for(const [k,v] of Object.entries(store))localStorage.setItem(k,v);},store);
 await page.goto('http://127.0.0.1:5174/#etudes');await page.locator('.launchSplash').waitFor({state:'detached'});await page.locator('[data-playback-bar]').first().waitFor({state:'attached'});
 return {page,errors};
}
async function startTrace(page){
 await page.evaluate(()=>{
  window.barTrace=[];window.traceObserver?.disconnect();
  window.traceObserver=new MutationObserver(records=>{for(const record of records){const target=record.target;if(record.attributeName!=='data-bar'||target.getAttribute('data-bar')===null)continue;const bar=Number(target.getAttribute('data-bar'));if(window.barTrace.at(-1)!==bar)window.barTrace.push(bar);}});
  window.traceObserver.observe(document.querySelector('.etudeNotation'),{subtree:true,attributes:true,attributeFilter:['data-bar']});
 });
}
async function finishTrace(page,expected){
 await page.waitForFunction(n=>window.barTrace.length>=n,expected.length);
 await page.waitForTimeout(500);const trace=await page.evaluate(()=>window.barTrace);assert.deepEqual(trace,expected);
 // Completion must release the transport instead of automatically restarting.
 assert.equal(await page.locator('.etudePracticeStart').getAttribute('aria-label'),'연습 시작');return trace;
}
try{
 for(const width of (safari?[390]:[1440,390])){
  for(const {name,document,expected} of (safari?[]:navigationScores())){
   await writeFile(`${out}/${name}.json`,JSON.stringify(document,null,2));
   const {page,errors}=await open(document,width);
   try{
    await page.locator('.etudeRemoteControls>button').last().click();await page.getByRole('checkbox',{name:'카운트인',exact:true}).uncheck();await page.keyboard.press('Escape');
    const play=page.locator('.etudePracticeStart'),stop=page.locator('.etudePracticeStop');
    await startTrace(page);await play.click();const full=await finishTrace(page,expected);
    await page.locator('[data-start-bar="2"]').click();await startTrace(page);await play.click();const linear=await finishTrace(page,[2,3,4,5]);
    // Click the beginning again: repeat/jump flags must be reset for this run.
    await page.locator('[data-start-bar="0"]').click();await startTrace(page);await play.click();const restarted=await finishTrace(page,expected);
    assert.deepEqual(errors,[]);reports.push({width,name,full,linear,restarted,errors});console.log(JSON.stringify({width,name,passed:true}));
   }catch(e){await page.screenshot({path:`${out}/failure-${width}-${name}.png`});throw e;}finally{await page.close();}
  }
  const document=analysisToDocument(copyLayoutAnalysis());document.pdfTabImport.unverifiedSettings=[];
  const {page,errors}=await open(document,width);
  try{
   const geometry=await page.locator('.etudeNotation').evaluate(root=>{
    const pages=[...root.querySelectorAll('article[data-score-page]')].map(p=>({first:Number(p.dataset.firstBar),last:Number(p.dataset.lastBar)}));
    const rows=new Map();for(const b of root.querySelectorAll('[data-playback-bar]')){const row=b.dataset.row;rows.set(row,(rows.get(row)??0)+1);}return {pages,rows:[...rows.values()]};
   });
   assert.deepEqual(geometry.rows,[4,5,3,4,2]);assert(geometry.pages.some(p=>p.first===9));assert(geometry.pages.some(p=>p.first===16));
   await page.screenshot({path:`${out}/source-layout-${width}.png`});
   if(width>600)await page.getByRole('combobox',{name:'한 줄 마디 수',exact:true}).selectOption('2');
   else await page.getByRole('button',{name:'한 줄 2마디',exact:true}).click();
   await page.waitForFunction(()=>document.querySelectorAll('[data-source-page-break]').length===0);
   assert.deepEqual(errors,[]);reports.push({width,layout:geometry,manualOverride:true,errors});console.log(JSON.stringify({width,layout:geometry,passed:true}));
  }catch(e){await page.screenshot({path:`${out}/failure-layout-${width}.png`});throw e;}finally{await page.close();}
 }
}finally{await browser.close();await writeFile(`${out}/browser-results.json`,JSON.stringify(reports,null,2));}
