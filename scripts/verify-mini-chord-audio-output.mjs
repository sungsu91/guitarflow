import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const cpu=Number(process.env.MINI_AUDIO_CPU||1);
const tag=process.env.MINI_AUDIO_TAG||`before-${cpu}`;
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
const p=await b.newPage({viewport:{width:390,height:844}});
await p.addInitScript(()=>{
 const Native=window.AudioContext;
 window.contexts=[];window.finalNodes=[];window.starts=[];window.longTasks=[];window.compressors=[];
 window.AudioContext=class extends Native {constructor(...args){super(...args);window.contexts.push(this);} createDynamicsCompressor(){const n=super.createDynamicsCompressor();window.compressors.push(n);return n;}};
 const connect=AudioNode.prototype.connect;
 AudioNode.prototype.connect=function(target,...args){if(target===this.context.destination && !window.finalNodes.includes(this))window.finalNodes.push(this);return connect.call(this,target,...args);};
 const start=AudioBufferSourceNode.prototype.start;
 AudioBufferSourceNode.prototype.start=function(time=0,...args){window.firstSampleAt ??= performance.now();window.starts.push({now:this.context.currentTime,time,duration:this.buffer?.duration});return start.call(this,time,...args);};
 new PerformanceObserver(list=>{window.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})));}).observe({type:'longtask',buffered:true});
});
await p.goto('http://127.0.0.1:5174/#mini-chord');
await p.locator('.miniChordLoadPicker button').first().click();await p.getByRole('option').filter({hasText:'첫 번째 드라이브'}).click();
await p.getByRole('button',{name:'반주 사운드 전체 끄기',exact:true}).waitFor();
await p.evaluate(async()=>{
 const ctx=window.contexts.find(c=>c.state==='running');if(!ctx)throw Error('No running audio context');
 const code=`class Capture extends AudioWorkletProcessor {constructor(){super();this.samples=[];} process(inputs){const channels=inputs[0];if(channels?.[0]){for(let i=0;i<channels[0].length;i++)this.samples.push(channels.reduce((s,c)=>s+c[i],0)/channels.length);if(this.samples.length>=4096){this.port.postMessage(this.samples);this.samples=[];}}return true;}} registerProcessor('capture',Capture);`;
 const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));await ctx.audioWorklet.addModule(url);URL.revokeObjectURL(url);
 window.pcm=[];window.recordingNode=new AudioWorkletNode(ctx,'capture');window.recordingNode.port.onmessage=e=>window.pcm.push(...e.data);
 for(const node of window.finalNodes)node.connect(window.recordingNode);
 const mute=ctx.createGain();mute.gain.value=0;window.recordingNode.connect(mute);mute.connect(ctx.destination);
 window.sampleRate=ctx.sampleRate;window.starts=[];window.longTasks=[];window.firstSampleAt=null;window.recordStart=performance.now();
});
const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
await p.getByRole('button',{name:'미니코드 반주 시작',exact:true}).click();
await p.getByRole('button',{name:'미니코드 반주 정지',exact:true}).waitFor();
await p.waitForTimeout(16000);
const data=await p.evaluate(()=>({pcm:window.pcm,rate:window.sampleRate,starts:window.starts,longTasks:window.longTasks,firstSampleAt:window.firstSampleAt,compressors:window.compressors.map(c=>({threshold:c.threshold.value,reduction:c.reduction})),recordStart:window.recordStart}));
const pcm=data.pcm;delete data.pcm;
const out=Buffer.alloc(44+pcm.length*2);out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);out.writeUInt32LE(data.rate,24);out.writeUInt32LE(data.rate*2,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(pcm.length*2,40);pcm.forEach((x,i)=>out.writeInt16LE(Math.round(Math.max(-1,Math.min(1,x))*32767),44+i*2));
fs.writeFileSync(`output/mini-audio-${tag}.wav`,out);
fs.writeFileSync(`output/mini-audio-${tag}.json`,JSON.stringify(data));
const starts=data.starts.filter(s=>s.duration>0.2);const leads=starts.map(s=>(s.time-s.now)*1000);
console.log(JSON.stringify({tag,samples:pcm.length,seconds:pcm.length/data.rate,starts:starts.length,minLead:Math.min(...leads),nearLate:leads.filter(l=>l<5).length,longTasks:data.longTasks.length,maxTask:Math.max(0,...data.longTasks.map(t=>t.duration)),compressors:data.compressors}));
const origin=Math.min(...data.starts.map(s=>s.time));
assert.ok(data.starts.filter(s=>s.time<origin+15).length>=140,'first 15 seconds must retain the arranged attacks');
assert.equal(data.longTasks.filter(t=>t.start>data.firstSampleAt+250 && t.duration>180).length,0,'playback must not block beyond the scheduler horizon');
assert.ok(pcm.some(sample=>Math.abs(sample)>0.01),'captured output must contain audible samples');
await p.getByRole('button',{name:'미니코드 반주 정지',exact:true}).click();
}finally{await b.close();}
