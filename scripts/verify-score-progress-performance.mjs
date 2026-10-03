import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {ETUDES} from '../src/etudes/catalog.js';
import {toScoreDocument,compileScoreDocument} from '../src/etudes/scoreDocument.js';
import {readBrowserScoreLibrary} from './read-browser-score-library.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const generated=process.env.PROGRESS_FIXTURE==='generated';
const etude=ETUDES.find(e=>e.id==='G-scale-rhythm-bridge');
const source=generated?toScoreDocument({...etude,document:undefined,id:'progress-generated',measures:Array.from({length:64},(_,i)=>etude.measures[i%etude.measures.length])}):JSON.parse(await readFile('artifacts/staff-pitch-regression/real-photos/converted-document.json','utf8'));
if(generated)assert.deepEqual(compileScoreDocument(source).errors,[]);
source.bpm=110;source.viewSettings={...source.viewSettings,notationView:'both'};
const origin=process.env.PROGRESS_ORIGIN||'http://127.0.0.1:5174';
const out=process.env.PROGRESS_OUTPUT||'artifacts/score-progress/verified';await mkdir(out,{recursive:true});
const mobile=process.env.PROGRESS_MOBILE==='1',throttle=Number(process.env.PROGRESS_THROTTLE)||1;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[];
try{
 const page=await browser.newPage({viewport:mobile?{width:440,height:956}:{width:1920,height:912}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(source=>{
  localStorage.setItem('language','ko');localStorage.setItem('fretiva.score.sound','true');
  localStorage.setItem('fretiva.etude.library.v2',JSON.stringify({version:2,records:{[source.id]:{status:'draft',document:source}}}));
  localStorage.setItem('fretiva.score.last-open.v1',JSON.stringify({lessonId:'G-triad-start',savedId:source.id,pdfId:''}));
  window.__meters=[];const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(destination,...rest){const result=connect.call(this,destination,...rest);if(destination instanceof AudioDestinationNode){const a=this.context.createAnalyser();a.fftSize=2048;connect.call(this,a);window.__meters.push(a);}return result;};
 },source);
 await page.goto(`${origin}/#etudes`,{waitUntil:'networkidle'});
 await page.locator('.launchSplash').waitFor({state:'detached'});
 await page.locator('[data-playback-bar="37"]').waitFor({state:'attached'});
 await page.getByRole('button',{name:'메트로놈 상세 설정',exact:true}).click();
 const count=page.getByRole('checkbox',{name:/카운트|예비/});if(await count.first().isChecked())await count.first().uncheck();
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'메트로놈 볼륨',exact:true}).click();const mute=page.getByRole('button',{name:'클릭 음소거',exact:true});if(await mute.getAttribute('aria-pressed')!=='true')await mute.click();await page.keyboard.press('Escape');
 // Later pages exercise horizontal/vertical following and page boundaries.
 await page.locator('[data-start-bar="37"]').click({force:true});
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:throttle});
 await cdp.send('Performance.enable');
 await page.evaluate(()=>{
  window.__progress={frames:[],longTasks:[],insertions:[],peak:0};
  window.__observer=new PerformanceObserver(list=>window.__progress.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));window.__observer.observe({type:'longtask',buffered:false});
  window.__mutations=new MutationObserver(list=>window.__progress.insertions.push(...list.flatMap(e=>[...e.addedNodes].map(n=>({name:n.nodeName,cls:n.getAttribute?.('class'),t:performance.now()})))));window.__mutations.observe(document.querySelector('.etudeNotation'),{childList:true,subtree:true});
  const frame=t=>{
   const line=document.querySelector('.savedScorePlayhead');window.__progress.frames.push({t,bar:line?.dataset.bar,tick:Number(line?.dataset.tick),x:Number(line?.getAttribute('x1')),page:line?.ownerSVGElement.dataset.scorePage});
   if(window.__progress.frames.length%15===0)for(const a of window.__meters){const values=new Float32Array(a.fftSize);a.getFloatTimeDomainData(values);for(const v of values)window.__progress.peak=Math.max(window.__progress.peak,Math.abs(v));}
   window.__progress.raf=requestAnimationFrame(frame);
  };window.__progress.raf=requestAnimationFrame(frame);
 });
 const start=await cdp.send('Performance.getMetrics');
 await page.locator('.etudePracticeStart').click();
 if(process.env.PROGRESS_SUSPEND)await page.locator('.etudeScoreViewport').dispatchEvent('wheel',{deltaY:0});
 await page.waitForTimeout(12000);
 const end=await cdp.send('Performance.getMetrics');
 const data=await page.evaluate(()=>{cancelAnimationFrame(window.__progress.raf);window.__observer.disconnect();window.__mutations.disconnect();return window.__progress;});
 await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}.png`});
 const steady=data.frames.filter(f=>f.bar&&f.bar!=='37'),gaps=steady.slice(1).map((f,i)=>f.t-steady[i].t).sort((a,b)=>a-b),baseline=Object.fromEntries(start.metrics.map(m=>[m.name,m.value]));
 const result={mobile,generated,origin,throttle,steadyFrames:gaps.length,p95:gaps[Math.floor(gaps.length*.95)],max:Math.max(...gaps),over50ms:gaps.filter(g=>g>50).length,longTasks:data.longTasks,insertions:data.insertions,peak:data.peak,bars:[...new Set(data.frames.map(f=>f.bar))],pages:[...new Set(data.frames.map(f=>f.page))],metrics:Object.fromEntries(end.metrics.filter(m=>/Duration|Count$/.test(m.name)).map(m=>[m.name,m.value-baseline[m.name]])),errors};
 results.push(result);await writeFile(`${out}/frames.json`,JSON.stringify(data));
 assert.deepEqual(errors,[]);assert(result.bars.filter(Boolean).length>=4);assert.deepEqual(result.insertions,[]);assert(result.peak>.0001,'guitar audio must be audible');
 assert(result.max<(throttle>1?250:150),`steady playback stalled for ${result.max} ms`);
 // Pause freezes the cursor; native keyboard selection still seeks correctly.
 await page.locator('.etudePracticeStart').click();
 const paused=await page.locator('.savedScorePlayhead').getAttribute('x1');await page.waitForTimeout(300);assert.equal(await page.locator('.savedScorePlayhead').getAttribute('x1'),paused);
 if(!mobile){
  const picker=page.getByRole('combobox',{name:'악보 재생 마디',exact:true});await picker.focus();await picker.selectOption('5');
  await page.waitForFunction(()=>document.querySelector('.savedScorePlayhead')?.dataset.bar==='5');
  await picker.press('ArrowDown');await page.waitForFunction(()=>document.querySelector('.savedScorePlayhead')?.dataset.bar==='6');await picker.press('Escape');
  assert.equal(await picker.inputValue(),'');assert.equal(await picker.locator('option:checked').innerText(),'7마디');
  await picker.focus();await picker.dispatchEvent('pointerdown',{pointerType:'mouse',button:0});await picker.selectOption('7');
  await page.waitForFunction(()=>document.querySelector('.savedScorePlayhead')?.dataset.bar==='7');
  assert.equal(await picker.inputValue(),'');assert.equal(await picker.locator('option:checked').innerText(),'8마디');
 }
 await page.locator('.etudePracticeStart').click();await page.waitForTimeout(500);assert.notEqual(await page.locator('.savedScorePlayhead').getAttribute('x1'),paused);
 await page.locator('.etudePracticeStop').click();assert.equal(await page.locator('.savedScorePlayhead').count(),0);
 const saved=(await readBrowserScoreLibrary(page)).records[source.id].document;assert.deepEqual(saved,source);
 assert.deepEqual(errors,[]);
 result.transportAndPickerPassed=true;console.log(JSON.stringify(result));
 await page.close();
}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));}
