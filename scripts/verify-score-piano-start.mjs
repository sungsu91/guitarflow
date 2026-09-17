import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('artifacts/piano-start',{recursive:true});
try{
 const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await p.goto('http://127.0.0.1:5173/#etudes');
 const measurements=await p.evaluate(async()=>{
  const {prepareScoreInstrument,createScoreVoiceOutput}=await import('/src/audio/scoreInstrument.js');
  const data=await (await fetch('/sounds/gpg4.wav')).arrayBuffer(),results=[];
  for(const midi of [40,49,64,67,76]){
   const compare={midi};
   for(const mode of ['original','aligned','guitar']){
    const ctx=new OfflineAudioContext(2,48000*2,48000),raw=await ctx.decodeAudioData(data.slice(0));
    const prepared=await prepareScoreInstrument(ctx,'piano');if(await prepareScoreInstrument(ctx,'piano')!==prepared)throw Error('cache miss');
    compare.trimmedMs=(raw.length-prepared.length)/ctx.sampleRate*1000;
    const output=createScoreVoiceOutput(ctx),start=.12,phrase={string:6,fret:midi-40,midi,start:0,duration:.5,segments:[]};
    output.schedule([phrase],start,mode==='guitar'?'clean-guitar':'piano',mode==='original'?raw:prepared);
    const rendered=await ctx.startRendering(),signal=rendered.getChannelData(0);let peak=0;for(const value of signal)peak=Math.max(peak,Math.abs(value));
    const first=signal.findIndex(value=>Math.abs(value)>=peak*.05);compare[mode+'AttackMs']=(first/ctx.sampleRate-start)*1000;
    compare[mode+'Peak']=peak;
   }
   results.push(compare);
  }
  // A simultaneous chord uses a single onset; render preparation must not alter
  // the source's scheduled time, score data, or introduce per-string staggering.
  const ctx=new OfflineAudioContext(2,96000,48000),buffer=await prepareScoreInstrument(ctx,'piano');
  const starts=[],create=ctx.createBufferSource.bind(ctx);ctx.createBufferSource=()=>{const node=create(),start=node.start.bind(node);node.start=(...args)=>{starts.push(args[0]);return start(...args);};return node;};
  const output=createScoreVoiceOutput(ctx);output.schedule([40,45,50,55,59,64].map((midi,i)=>({string:6-i,midi,fret:0,start:0,duration:.25,segments:[]})),.1,'piano',buffer);
  await ctx.startRendering();await new Promise(resolve=>setTimeout(resolve,20));return {results,starts,remainingVoices:output.activeCount};
 });
 for(const result of measurements.results){assert(result.trimmedMs>68&&result.trimmedMs<71);assert(result.alignedAttackMs>=0&&result.alignedAttackMs<20,JSON.stringify(result));assert(result.originalAttackMs-result.alignedAttackMs>25);assert(result.guitarAttackMs<25);}
 assert.deepEqual(measurements.starts,Array(6).fill(.1));assert.equal(measurements.remainingVoices,0);
 // Selecting piano preloads once; playback and subsequent restarts share it.
 let requests=0;p.on('request',r=>{if(r.url().includes('/sounds/gpg4.wav'))requests++;});
 await p.getByRole('button',{name:/악보 만들기/}).click();await p.locator('[data-draw-count]').first().waitFor();
 await p.getByRole('button',{name:'피아노',exact:true}).click();await p.waitForFunction(async()=>{const {getSharedAudioContext}=await import('/src/audio/audioBus.js'),{prepareScoreInstrument}=await import('/src/audio/scoreInstrument.js');return Boolean(await prepareScoreInstrument(getSharedAudioContext(),'piano'));});assert.equal(requests,1);
 const fixture=await p.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js'),c=await import('/src/etudes/editorCommands.js');let d=m.createBlankDocument();for(let i=0;i<8;i++){d=c.enterFretWithDuration(d,{bar:0,event:i,string:6},9,'8');d=c.enterFret(d,{bar:0,event:i,string:5},7);}return d;});
 await p.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'piano-onset.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await p.evaluate(async()=>{const {getSharedAudioContext}=await import('/src/audio/audioBus.js'),ctx=getSharedAudioContext(),create=ctx.createBufferSource.bind(ctx);window.pianoStartCheck={starts:[],clicks:[]};ctx.createBufferSource=()=>{const n=create(),start=n.start.bind(n);n.start=(...args)=>{window.pianoStartCheck.starts.push({time:args[0],calledAt:ctx.currentTime});return start(...args);};return n;};document.addEventListener('click',e=>{if(e.target.closest('button')?.textContent.includes('재생'))window.pianoStartCheck.clicks.push(ctx.currentTime);},true);});
 for(let run=0;run<2;run++){
  await p.evaluate(()=>{window.pianoStartCheck.starts=[];});await p.getByRole('button',{name:'악보 재생',exact:true}).click();
  await p.waitForFunction(()=>window.pianoStartCheck.starts.length>=4);
  const timing=await p.evaluate(()=>window.pianoStartCheck);assert.equal(timing.starts[0].time,timing.starts[1].time);assert(Math.abs(timing.starts[2].time-timing.starts[0].time-.5)<.001);assert(timing.starts[0].time-timing.clicks.at(-1)<.2);
  await p.getByRole('button',{name:'악보 재생 정지',exact:true}).click();
 }
 assert.equal(requests,1);
 await writeFile('artifacts/piano-start/results.json',JSON.stringify({...measurements,preloadRequests:requests},null,2));console.log(measurements);console.log({preloadRequests:requests});
}finally{await browser.close();}
