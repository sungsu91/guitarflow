import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),out='artifacts/copy-layout-playback-20261005';
const doc=JSON.parse(await readFile('artifacts/pdf-tab-folder/copy-layout-playback-20261005/1-document.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),reports=[];
try{for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000},isMobile:width<600,hasTouch:width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(25000);
 try{
  await page.addInitScript(doc=>{localStorage.setItem('language','ko');localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[doc.id]:{document:doc,status:'draft',updatedAt:new Date().toISOString()}}}));localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:doc.id,pdfId:''}));},doc);
  await page.goto('http://127.0.0.1:5174/#etudes');await page.locator('.launchSplash').waitFor({state:'detached'});await page.locator('[data-playback-bar="62"]').waitFor({state:'attached'});
  const layout=await page.locator('.etudeNotation').evaluate(root=>({pages:[...root.querySelectorAll('article[data-score-page]')].map(p=>({first:Number(p.dataset.firstBar),last:Number(p.dataset.lastBar)})),bars:[...root.querySelectorAll('[data-playback-bar]')].map(b=>Number(b.dataset.playbackBar))}));
  assert.deepEqual(layout.bars,Array.from({length:63},(_,i)=>i));assert(layout.pages.some(p=>p.first===20));assert(layout.pages.some(p=>p.first===43));
  await page.screenshot({path:`${out}/flower-reader-${width}.png`});
  if(width>600){await page.getByRole('button',{name:'편집',exact:true}).click();await page.locator('.etudeEditorMeasure').last().waitFor({state:'attached'});const rows=await page.locator('.etudeEditorMeasure').evaluateAll(bars=>{const counts=new Map();for(const b of bars)counts.set(b.dataset.layoutRow,(counts.get(b.dataset.layoutRow)??0)+1);return [...counts.values()];});assert.deepEqual(rows,doc.pdfTabImport.sourceSystems.map(s=>s.count));layout.editorRows=rows;}
  assert.deepEqual(errors,[]);reports.push({width,...layout,errors});console.log(JSON.stringify({width,pages:layout.pages,passed:true}));
 }catch(e){await page.screenshot({path:`${out}/flower-failure-${width}.png`});throw e;}finally{await page.close();}
}}finally{await browser.close();await writeFile(`${out}/flower-layout.json`,JSON.stringify(reports,null,2));}
