import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const out='artifacts/clean-guitar';await mkdir(out,{recursive:true});const results=[];
function wav(pcm,rate){const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);return Buffer.concat([header,pcm]);}
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>{localStorage.setItem('rifflabThemeMode','light');window.audioQA={active:new Set(),starts:[],ended:0};const original=AudioContext.prototype.createBufferSource;AudioContext.prototype.createBufferSource=function(){const node=original.call(this),start=node.start.bind(node),ctx=this;node.start=(at,...args)=>{window.audioQA.active.add(node);window.audioQA.starts.push({at,now:ctx.currentTime});return start(at,...args);};node.addEventListener('ended',()=>{window.audioQA.active.delete(node);window.audioQA.ended++;});return node;};});await page.goto('http://127.0.0.1:5173/#etudes');
 for(const scenario of (process.env.SKIP_RENDERS?[]:['low-high','same-pitch-strings','chord-9-7','six-strings','eighths','sixteenths','down','up','mute','rest','piano'])){
  const rendered=await page.evaluate(async scenario=>{
   const {createScoreVoiceOutput,prepareScoreInstrument}=await import('/src/audio/scoreInstrument.js'),{guitarVoiceStats}=await import('/src/audio/fretboardPreviewEngine.js'),{stringCacheStats}=await import('/src/audio/pluckedString.js');
   const audio=new OfflineAudioContext(1,48000*7,48000),starts=[],sources=[],costs=[];let oscillators=0;
   const factory=audio.createBufferSource.bind(audio);audio.createBufferSource=()=>{const node=factory(),start=node.start.bind(node);node.start=t=>{starts.push(t);start(t);};node.addEventListener('ended',()=>node.qaEnded=true);sources.push(node);return node;};
   const osc=audio.createOscillator.bind(audio);audio.createOscillator=()=>{oscillators++;return osc();};
   const output=createScoreVoiceOutput(audio),tuning=[64,59,55,50,45,40],instrument=scenario==='piano'?'piano':'clean-guitar',piano=await prepareScoreInstrument(audio,instrument);
   const phrase=(string=6,fret=0,pickStroke=null,dead=false)=>({string,fret,midi:tuning[string-1]+fret,pickStroke,dead,start:0,duration:.25,segments:[]});
   const schedule=(notes,at)=>{const now=performance.now();output.schedule(notes,at,instrument,piano);costs.push(performance.now()-now);};
   if(scenario==='low-high'){schedule([phrase(6)],.1);schedule([phrase(1)],3.1);}
   if(scenario==='same-pitch-strings'){schedule([phrase(6,12)],.1);schedule([phrase(5,7)],3.1);}
   if(scenario==='chord-9-7')schedule([phrase(6,9),phrase(5,7)],.1);
   if(scenario==='six-strings')schedule([6,5,4,3,2,1].map(s=>phrase(s,0)),.1);
   if(scenario==='eighths'||scenario==='sixteenths'){const count=scenario==='eighths'?8:16;for(let i=0;i<count;i++)schedule([phrase(6,9),phrase(5,7)],.1+i*2/count);}
   if(scenario==='down'||scenario==='up')for(let i=0;i<4;i++)schedule([phrase(4,2,scenario)],.1+i*.5);
   if(scenario==='mute')for(let i=0;i<4;i++)schedule([phrase(6,0,null,true)],.1+i*.5);
   if(scenario==='rest')schedule([{...phrase(6,9),silenceAt:.5}],.1);
   if(scenario==='piano')schedule([phrase(6,9),phrase(5,7)],.1);
   output.finish();const rendered=await audio.startRendering();await new Promise(r=>setTimeout(r,20));const data=rendered.getChannelData(0);let peak=0,energy=0,jump=0;
   const bytes=new Uint8Array(data.length*2),view=new DataView(bytes.buffer);for(let i=0;i<data.length;i++){peak=Math.max(peak,Math.abs(data[i]));energy+=data[i]*data[i];if(i)jump=Math.max(jump,Math.abs(data[i]-data[i-1]));view.setInt16(i*2,Math.max(-32768,Math.min(32767,Math.round(data[i]*32767))),true);}
   let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   return {scenario,starts,oscillators,costs,restTail:scenario==='rest'?data.slice(48000).reduce((sum,n)=>sum+n*n,0):null,peak,rms:Math.sqrt(energy/data.length),jump,active:sources.filter(n=>!n.qaEnded).length,pcm:btoa(binary)};
  },scenario);
  const {pcm,...metrics}=rendered;if(scenario==='rest')assert(metrics.restTail<1e-12);assert.equal(metrics.oscillators,0);assert.equal(metrics.active,0);assert(metrics.peak>0&&metrics.peak<.95);assert(metrics.jump<.15);
  if(['chord-9-7','six-strings','piano'].includes(scenario))assert.equal(new Set(metrics.starts).size,1);
  if(['eighths','sixteenths'].includes(scenario)){const count=scenario==='eighths'?8:16;assert.equal(metrics.starts.length,count*2);for(let i=0;i<count;i++){assert.equal(metrics.starts[i*2],metrics.starts[i*2+1]);assert(Math.abs(metrics.starts[i*2]-(.1+i*2/count))<1e-10);}}
  await writeFile(`${out}/${scenario}.wav`,wav(Buffer.from(pcm,'base64'),48000));results.push(metrics);
 }
 // Actual UI: shared default, input preview, no loading of piano until selected,
 // rapid start/stop with CPU throttling, and voice cleanup.
 await page.getByRole('button',{name:/간단 악보 만들기/}).click();await page.locator('[data-draw-count]').first().waitFor();const dialog=page.getByRole('dialog',{name:'악보 편집',exact:true}),btn=name=>dialog.getByRole('button',{name,exact:true});
 assert.equal(await btn('클린 기타').getAttribute('aria-pressed'),'true');
 await btn('프렛 9').click();await page.waitForTimeout(70);
 const active=await page.evaluate(()=>window.audioQA.active.size);assert(active>0);
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 for(let i=0;i<12;i++){await btn('다음 입력 위치').click();await btn(`프렛 ${i%8+1}`).click();}
 await page.waitForTimeout(3000);
 const after=await page.evaluate(()=>window.audioQA.active.size);assert.equal(after,0);
 for(let i=0;i<8;i++){await btn('악보 재생 정지').click();await page.waitForTimeout(100);await btn('악보 재생 정지').click();await page.waitForTimeout(45);}
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>window.audioQA.active.size),0);
 await page.screenshot({path:`${out}/390-clean-guitar.png`});
 const sixteenths=await page.evaluate(async()=>{const m=await import('/src/etudes/scoreModel.js');const d=m.createBlankDocument();d.bpm=120;d.measures[0].events=Array.from({length:16},(_,i)=>({...m.blankEvent(i*120,'16'),rest:false,blank:false,pickStroke:i%2?'up':'down',notes:[{id:m.newId('tone'),string:6,fret:9},{id:m.newId('tone'),string:5,fret:7}]}));return d;});
 await page.getByLabel('악보 파일 선택',{exact:true}).setInputFiles({name:'sixteenths.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sixteenths))});
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await page.evaluate(()=>window.audioQA.starts=[]);
 await btn('악보 재생 정지').click();await page.waitForTimeout(600);await page.screenshot({path:`${out}/390-playback.png`});await page.waitForTimeout(4400);
 const starts=await page.evaluate(()=>window.audioQA.starts);await writeFile(`${out}/live-starts.json`,JSON.stringify(starts,null,2));assert.equal(starts.length,32);
 for(let i=0;i<16;i++){assert.equal(starts[i*2].at,starts[i*2+1].at);assert(Math.abs(starts[i*2].at-starts[0].at-i*.125)<.00001);}
 assert.equal(await page.evaluate(()=>window.audioQA.active.size),0);await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 await btn('피아노').click();await btn('프렛 2').click();await page.waitForTimeout(200);assert.equal(await btn('피아노').getAttribute('aria-pressed'),'true');await page.screenshot({path:`${out}/390-piano.png`});
 const layouts=[];
 for(const width of [360,430,1440]){
  const p=await browser.newPage({viewport:{width,height:width===1440?1000:844},isMobile:width<600,hasTouch:width<600});p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>localStorage.setItem('rifflabThemeMode','light'));await p.goto('http://127.0.0.1:5173/#etudes');await p.getByRole('button',{name:/간단 악보 만들기/}).click();await p.locator('[data-draw-count]').first().waitFor();
  const d=p.getByRole('dialog',{name:'악보 편집',exact:true});assert.equal(await d.getByRole('button',{name:'클린 기타',exact:true}).getAttribute('aria-pressed'),'true');
  if(width===1440)await p.getByLabel('빠른 프렛 입력',{exact:true}).fill('5');else await p.locator('[data-score-input]').press('5');await d.getByRole('button',{name:width<600?'악보 재생 정지':'악보 음정·리듬 듣기',exact:true}).click();await p.waitForTimeout(250);
  const bounds=await d.locator('.etudeSoundControls').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);
  await p.screenshot({path:`${out}/${width}-layout.png`});await d.getByRole('button',{name:'악보 재생 정지',exact:true}).click();layouts.push(width);await p.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({renders:results,ui:{layouts,width:390,cpuThrottle:4,rapidInputs:12,restarts:8,liveSixteenths:starts,remainingGuitarVoices:0,errors}},null,2));
 console.log(JSON.stringify({renders:results,ui:'passed'},null,2));
}finally{await browser.close();}
