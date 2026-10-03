import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {blankEvent,newId} from '../src/etudes/scoreModel.js';
import {normalizePitches} from '../src/etudes/scoreTuning.js';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
const source=JSON.parse(await readFile(process.env.STAFF_UI_SOURCE??'artifacts/let-it-be-ocr/live/after.json','utf8'));
source.title='OMR 리듬·쉼표 회귀 검사';source.viewSettings={...source.viewSettings,notationView:'both',tabRhythm:true};
const targetBars=(process.env.STAFF_UI_BARS??'6,8,9').split(',').map(Number);
source.measures=targetBars.map(i=>source.measures[i]);
const control={id:newId('bar'),pdfImport:{needsReview:true},harmony:'C',events:[]};
for(let i=0;i<8;i++)control.events.push({...blankEvent(i*60,'32'),blank:false,rest:i===7,notes:i===7?[]:[{id:newId('tone'),string:2,fret:1}],pdfImport:{status:'unresolved',pendingStrings:[],rhythmVerified:true}});
control.events.push({...blankEvent(480,'2'),blank:false,rest:true,pdfImport:{status:'unresolved',pendingStrings:[],rhythmVerified:true}},{...blankEvent(1440,'4'),pdfImport:{status:'unresolved',pendingStrings:[]}});source.measures.push(control);
source.measures=normalizePitches(source).measures;
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE),out=process.env.STAFF_UI_OUTPUT??'artifacts/let-it-be-ocr/ui',origin=process.env.STAFF_UI_ORIGIN??'http://127.0.0.1:4174';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),results=[];
try{for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});page.on('requestfailed',r=>console.error(r.url(),r.failure()));page.setDefaultTimeout(30000);
 await page.addInitScript(d=>{
  localStorage.setItem('language','ko');localStorage.setItem('fretiva.score.sound','true');
  localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[d.id]:{status:'draft',document:d}}}));localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:d.id,pdfId:''}));
  window.__meters=[];const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);if(destination instanceof AudioDestinationNode){const meter=this.context.createAnalyser();meter.fftSize=2048;connect.call(this,meter);window.__meters.push(meter);}return result;};
 },source);
 try{
  await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached',timeout:60000});
  if(mobile){await page.getByRole('button',{name:'악보 작업',exact:true}).click();await page.getByRole('menuitem',{name:/편집/}).click();}
  else await page.getByRole('button',{name:/현재 악보 편집|편집/}).first().click();
  await page.locator('.etudeEditor').waitFor();await page.locator('.etudeEditor [data-draw-count]').first().waitFor();
  const dom=await page.locator('.etudeEditor [data-draw-count]').evaluateAll(hosts=>hosts.map(h=>({bar:Number(h.closest('[data-bar-index]').dataset.barIndex),tuplets:h.shadowRoot.querySelectorAll('.tabRhythmTuplet').length,slashes:h.shadowRoot.querySelectorAll('[data-rhythm-slash]').length,markers:h.shadowRoot.querySelectorAll('.pdfTabUnresolvedMarker').length,rests:h.shadowRoot.querySelectorAll('.tabRhythmRest').length,beamLevels:[...new Set([...h.shadowRoot.querySelectorAll('.tabRhythmBeam')].map(b=>b.getAttribute('y1')))],text:h.shadowRoot.textContent})));
  assert.equal(dom.length,4);for(const [i,m] of source.measures.entries()){assert.equal(dom[i].slashes,m.events.filter(e=>e.rhythmSlash&&!e.blank).length);assert.equal(dom[i].tuplets,new Set(m.events.filter(e=>e.tuplet).map(e=>e.tuplet.groupId)).size);}assert.equal(dom[0].markers,0);assert(dom[0].rests>=1);assert(dom[3].rests>=2);assert.equal(dom[3].markers,mobile?0:1);assert(dom[3].beamLevels.length>=3,JSON.stringify(dom[3]));assert(dom.every(d=>!d.text.includes('Could not')));
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  const dock=page.locator('.editorAudioDock');if(await dock.locator('.editorMute').getAttribute('aria-pressed')==='true')await dock.locator('.editorMute').click();assert(await dock.locator('.editorPlay').isEnabled());await dock.locator('.editorPlay').click();
  const peak=await page.evaluate(async()=>{let peak=0;for(let i=0;i<30;i++){for(const a of window.__meters){const v=new Float32Array(a.fftSize);a.getFloatTimeDomainData(v);for(const n of v)peak=Math.max(peak,Math.abs(n));}await new Promise(r=>setTimeout(r,100));}return peak;});assert(peak>.0001);await dock.locator('.editorPlay').click();
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  await page.getByRole('button',{name:mobile?'악보 저장':'이 브라우저에 저장',exact:true}).click();await page.locator('.scoreSaveDialog').getByRole('button',{name:'저장하기',exact:true}).click();await page.locator('.scoreSaveDialog').waitFor({state:'detached'});
  const saved=(await readBrowserScoreLibrary(page)).records[source.id].document;
  assert.deepEqual(saved.measures,source.measures);await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}.png`});
  await page.reload({waitUntil:'networkidle'});await page.locator('.launchSplash').waitFor({state:'detached'});assert.deepEqual((await readBrowserScoreLibrary(page)).records[source.id].document.measures,source.measures);assert.deepEqual(errors,[]);
  const result={mobile,restMarkers:0,unknownMarkerPreserved:!mobile,thirtySecondBeamLevels:dom[3].beamLevels.length,saveReload:true,cpuSlowdown:4,peak,errors};results.push(result);console.log(JSON.stringify(result));
 }catch(error){console.error(JSON.stringify({mobile,errors,body:(await page.locator('body').innerText()).slice(-4000)}));await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-failure.png`});throw error;}finally{await page.close();}
}}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));}
