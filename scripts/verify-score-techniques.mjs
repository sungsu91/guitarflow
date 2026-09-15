import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const out='artifacts/score-techniques';await mkdir(out,{recursive:true});
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/#etudes');
 const rendered=await page.evaluate(async()=>{
  const {techniqueScores}=await import('/tests/fixtures/guitar-technique-scores.mjs');
  const {compileDocumentV2}=await import('/src/etudes/scoreModel.js');
  const {guitarVoiceTimeline}=await import('/src/etudes/scorePlayback.js');
  const {scheduleGuitarPhrase}=await import('/src/audio/fretboardPreviewEngine.js');
  const {encodePcmWav}=await import('/src/audio/audioPostProcessing.js');
  const {saveLibraryDocument}=await import('/src/etudes/scoreLibrary.js');
  const result=[],pcm=[],sampleRate=48000;
  const rms=(samples,start,end)=>{const a=samples.slice(Math.floor(start*sampleRate),Math.floor(end*sampleRate));return Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length);};
  // Normalized autocorrelation around the known register; not a MIDI assertion.
  const pitch=(samples,time)=>{const a=samples.slice(Math.floor(time*sampleRate),Math.floor((time+.04)*sampleRate));let best=0,lagBest=0;for(let lag=140;lag<210;lag++){let xy=0,xx=0,yy=0;for(let i=0;i<a.length-lag;i++){xy+=a[i]*a[i+lag];xx+=a[i]*a[i];yy+=a[i+lag]*a[i+lag];}const r=xy/Math.sqrt(xx*yy);if(r>best){best=r;lagBest=lag;}}return sampleRate/lagBest;};
  for(const {id,document} of techniqueScores()) {
   const checked=compileDocumentV2(document),plan=guitarVoiceTimeline(checked.score),ctx=new OfflineAudioContext(1,sampleRate*3,sampleRate),nodes=[];
   const original=ctx.createBufferSource.bind(ctx);
   ctx.createBufferSource=()=>{const source=original(),trace={rates:[],starts:[]};nodes.push(trace);for(const method of ['setValueAtTime','exponentialRampToValueAtTime']){const call=source.playbackRate[method].bind(source.playbackRate);source.playbackRate[method]=(...args)=>{trace.rates.push([method,...args]);return call(...args);};}const start=source.start.bind(source);source.start=(...args)=>{trace.starts.push(args);return start(...args);};return source;};
   const t=performance.now();for(const voice of plan.voices)scheduleGuitarPhrase(ctx,voice,.1+voice.start,ctx.destination);
   const scheduleMs=performance.now()-t,buffer=await ctx.startRendering(),samples=buffer.getChannelData(0);
   const wav=Array.from(new Uint8Array(await encodePcmWav([samples],sampleRate).arrayBuffer()));
   const metrics={sourceCount:nodes.length,nodes,scheduleMs,peak:samples.reduce((m,x)=>Math.max(m,Math.abs(x)),0),before:rms(samples,.65,.72),arrival:rms(samples,.78,.82),after:rms(samples,.9,.95),pitch:[.30,.62,.68,.72,.85].map(t=>pitch(samples,t))};
   result.push({id,document,wav,metrics});pcm.push(samples);saveLibraryDocument(localStorage,document);
  }
  const joined=new Float32Array(pcm.reduce((n,a)=>n+a.length,0));let cursor=0;for(const a of pcm){joined.set(a,cursor);cursor+=a.length;}
  const longCtx=new OfflineAudioContext(1,sampleRate*12,sampleRate),longVoice={midi:60,string:3,fret:5,start:0,duration:11,segments:[{midi:60,start:0,duration:11}]};
  const longSource=scheduleGuitarPhrase(longCtx,longVoice,.1,longCtx.destination),longPcm=(await longCtx.startRendering()).getChannelData(0);
  const sustain={loop:longSource.loop,bufferSeconds:longSource.buffer.duration,rmsAtTenSeconds:rms(longPcm,10,10.1)};
  return {result,sustain,combined:Array.from(new Uint8Array(await encodePcmWav([joined],sampleRate).arrayBuffer()))};
 });
 await writeFile(`${out}/comparison.wav`,Buffer.from(rendered.combined));
 for(const r of rendered.result){await writeFile(`${out}/${r.id}.wav`,Buffer.from(r.wav));await writeFile(`${out}/${r.id}.json`,JSON.stringify(r.document,null,2));assert.equal(r.metrics.sourceCount,r.id==='picked'?2:1);assert.ok(r.metrics.peak>0.001&&r.metrics.peak<1);const ramps=r.metrics.nodes[0].rates.filter(e=>e[0]==='exponentialRampToValueAtTime');assert.equal(ramps.length,['hammer','pull','slide'].includes(r.id)?1:0);}
 const metrics=Object.fromEntries(rendered.result.map(r=>[r.id,r.metrics]));
 assert.ok(metrics.picked.arrival>metrics.hammer.arrival*1.4,'picked destination has a materially stronger new attack');
 assert.ok(metrics.hammer.pitch.at(-1)>metrics.hammer.pitch[0]*1.09);
 assert.ok(metrics.pull.pitch.at(-1)<metrics.pull.pitch[0]/1.09);
 assert.ok(metrics.slide.pitch[1]<metrics.slide.pitch[2]&&metrics.slide.pitch[2]<metrics.slide.pitch[3]&&metrics.slide.pitch[3]<metrics.slide.pitch[4]);
 assert.ok(Math.abs(metrics.tie.pitch.at(-1)-metrics.tie.pitch[0])<3);
 assert.ok(rendered.sustain.loop&&rendered.sustain.bufferSeconds<=8&&rendered.sustain.rmsAtTenSeconds>0.0001);
 // Open each saved editable document in the real app and exercise its transport.
 await page.reload();
 for(const {id,document} of rendered.result){
  await page.locator('.pdfEditableRow').filter({hasText:document.title}).getByRole('button',{name:'열기',exact:true}).click();
  await page.locator('.etudeEditorCanvas svg').first().waitFor();
  if(id==='picked') {
   const surface=page.locator('.etudeEditorCanvas');
   await page.getByRole('button',{name:'H · 해머온',exact:true}).click();
   await surface.focus();await surface.press('Control+s');
   const read=()=>page.evaluate(async id=>{const {compileDocumentV2}=await import('/src/etudes/scoreModel.js'),{guitarVoiceTimeline}=await import('/src/etudes/scorePlayback.js');const d=JSON.parse(localStorage.getItem('fretiva.etude.library.v2')).records[id].document;return {d,voices:guitarVoiceTimeline(compileDocumentV2(d).score).voices.length};},document.id);
   assert.equal((await read()).voices,1);
   await surface.press('Control+z');await surface.press('Control+s');assert.equal((await read()).voices,2);
   await surface.press('Control+y');await surface.press('Control+s');assert.equal((await read()).voices,1);
   await surface.press('Control+z');await surface.press('Control+s');assert.deepEqual((await read()).d.measures,document.measures);
  }
  const play=page.locator('.etudeScorePlayback button').first();await play.click();
  await page.waitForTimeout(950);assert.equal(await play.getAttribute('aria-pressed'),'true');
  if(id==='hammer')await page.screenshot({path:`${out}/desktop-playing.png`});
  await play.click();assert.equal(await play.getAttribute('aria-pressed'),'false');
  await page.reload();
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('.pdfEditableRow').filter({hasText:'5→7 슬라이드'}).getByRole('button',{name:'열기',exact:true}).click();
 await page.locator('.etudeEditorCanvas svg').first().waitFor();await page.locator('.etudeScorePlayback button').first().click();await page.waitForTimeout(850);
 await page.screenshot({path:`${out}/mobile-playing.png`});
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({metrics,sustain:rendered.sustain,reactErrors:errors},null,2));console.log(JSON.stringify({metrics,sustain:rendered.sustain,reactErrors:errors},null,2));
} finally {await browser.close();}
