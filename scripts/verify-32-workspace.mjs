import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {saveLibraryDocument} from '../src/etudes/scoreLibrary.js';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),root='artifacts/32nd-support/browser';
const source=JSON.parse(await readFile(`${root}/exercise.json`));source.bpm=240;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{for(const mobile of [false,true]){
 const store={},storage={getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v};assert(saveLibraryDocument(storage,source).saved);
 store.language='ko';store['fretiva.score.sound']='true';store['fretiva.score.last-open.v1']=JSON.stringify({lessonId:'G-triad-start',savedId:source.id,pdfId:''});
 const page=await browser.newPage({viewport:{width:mobile?390:1440,height:1000},isMobile:mobile,hasTouch:mobile}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(25000);
 await page.addInitScript(store=>{
  for(const [k,v] of Object.entries(store))localStorage.setItem(k,v);
  window.audioMeters=[];const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);if(destination instanceof AudioDestinationNode){const a=this.context.createAnalyser();a.fftSize=2048;connect.call(this,a);window.audioMeters.push(a);}return result;};
 },store);
 try{
  await page.goto('http://127.0.0.1:5174/#etudes');await page.locator('.launchSplash').waitFor({state:'detached'});await page.locator('[data-start-bar="0"]').waitFor();
  await page.locator('.etudeRemoteControls>button').last().click();await page.getByRole('checkbox',{name:'카운트인',exact:true}).uncheck();await page.keyboard.press('Escape');
  await page.evaluate(()=>{window.trace=[];window.audioPeak=0;window.meterTimer=setInterval(()=>{for(const a of window.audioMeters){const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);for(const v of data)window.audioPeak=Math.max(window.audioPeak,Math.abs(v));}},20);new MutationObserver(rs=>{for(const r of rs){const n=r.target.getAttribute('data-bar');if(n!==null&&window.trace.at(-1)!==Number(n))window.trace.push(Number(n));}}).observe(document.querySelector('.etudeNotation'),{subtree:true,attributes:true,attributeFilter:['data-bar']});});
  await page.locator('.etudePracticeStart').click();await page.waitForFunction(()=>window.trace.length>=4);await page.waitForTimeout(1200);
  const audio=await page.evaluate(()=>{clearInterval(window.meterTimer);return {trace:window.trace,peak:window.audioPeak};});assert.deepEqual(audio.trace,[0,1,2,3]);assert(audio.peak>0.0001,JSON.stringify(audio));
  if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/편집/}).click();}
  else await page.getByRole('button',{name:/현재 악보 편집|편집/}).first().click();
  await page.locator('.etudeEditor').waitFor();
  const duration=page.getByRole('button',{name:'32분음표',exact:true});await duration.click();assert.equal(await duration.getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'셋잇단음표',exact:true}).click();await page.getByRole('button',{name:'6연음',exact:true}).click();assert.equal(await page.getByRole('button',{name:'6연음',exact:true}).getAttribute('aria-pressed'),'true');await page.getByRole('button',{name:'6연음',exact:true}).click();
  if(!mobile){
   await page.locator('.etudeEditorMeasure[data-bar-index="2"] .etudeNoteHandle[data-event="0"][data-mode="tab"][data-string="1"]').first().click();
   assert.equal(await page.getByRole('button',{name:'셋잇단음표',exact:true}).count(),1);
   assert.equal(await page.getByRole('button',{name:'연음 편집',exact:true}).textContent(),'6 ▾');
   assert.equal(await page.getByRole('button',{name:'6연음',exact:true}).count(),0);
   await page.locator('.etudeEditorMeasure[data-bar-index="0"] .etudeNoteHandle[data-event="0"][data-mode="tab"][data-string="1"]').first().click();
  }
  const controls=await page.locator('.etudeDurationButtons button,.rhythmModifiers button').evaluateAll(ns=>ns.map(n=>({label:n.getAttribute('aria-label'),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,x:n.getBoundingClientRect().x,right:n.getBoundingClientRect().right})));
  assert(controls.some(b=>b.label==='6연음'));if(mobile)assert(controls.every(b=>b.width>=28&&b.right<=390&&b.x>=0),JSON.stringify(controls));
  const notation=await page.locator('.etudeMeasureGrid').evaluate(grid=>{const host=[...grid.querySelectorAll('*')].find(n=>n.shadowRoot?.querySelector('.vf-tabnote')),svg=host?.shadowRoot.querySelector('svg'),digits=[...svg?.querySelectorAll('.vf-tabnote text')??[]];return {digitHeight:Math.min(...digits.map(n=>n.getBoundingClientRect().height)),contentWidth:grid.scrollWidth,viewportWidth:grid.getBoundingClientRect().width};});
  if(mobile){assert(notation.digitHeight>=12,JSON.stringify(notation));assert(notation.contentWidth>notation.viewportWidth,JSON.stringify(notation));}
  await page.screenshot({path:`${root}/workspace-${mobile?'mobile':'desktop'}.png`});
  await page.getByRole('button',{name:mobile?'악보 저장':'이 브라우저에 저장',exact:true}).click();await page.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();await page.locator('.scoreSaveDialog').waitFor({state:'detached'});
  const saved=(await readBrowserScoreLibrary(page)).records[source.id].document;
  const musical=doc=>doc.measures.map(m=>({...m,events:m.events.map(e=>({...e,notes:e.notes.map(({midi,locked,...n})=>n)}))}));
  assert.deepEqual(musical(saved),musical(source));
  for(const m of saved.measures)for(const e of m.events)for(const n of e.notes)assert.equal(n.midi,saved.tuning[n.string-1]+n.fret);
  if(!mobile){
   await page.getByRole('button',{name:'PDF 저장',exact:true}).click();const preview=page.locator('.print-preview-overlay');await preview.waitFor();await preview.locator('[data-print-page] svg').first().waitFor();
   await preview.getByRole('button',{name:'PDF 저장',exact:true}).click();await preview.locator('.rt-pdf-filename input').fill('32nd-original-exercise');
   const downloading=page.waitForEvent('download',{timeout:120000});await preview.getByRole('button',{name:'이 이름으로 저장',exact:true}).click();await(await downloading).saveAs(`${root}/32nd-original-exercise.pdf`);
  }
  assert.deepEqual(errors,[]);results.push({mobile,audio,controls,notation,saveUnchanged:true,errors});
 }catch(error){await page.screenshot({path:`${root}/workspace-failure-${mobile}.png`});throw error;}finally{await page.close();}
}}finally{await browser.close();await writeFile(`${root}/workspace.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
