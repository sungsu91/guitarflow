import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const b=await chromium.launch({headless:true,channel:'msedge'});
try{const p=await b.newPage();await p.goto('http://127.0.0.1:5176/');const data=await p.evaluate(async()=>{
 const {RECOMMENDED_GROOVE_PACKS:packs}=await import('/src/metronome/recommendedGrooves.js');const {scheduleGrooveStep,createGrooveVoiceState}=await import('/src/metronome/groove.js');const {METRONOME_TONE_OPTIONS}=await import('/src/metronome/options.js');
 const decode=new AudioContext(),buffers={};for(const o of METRONOME_TONE_OPTIONS.filter(o=>o.src))buffers[o.id]=await decode.decodeAudioData(await(await fetch(o.src)).arrayBuffer());await decode.close();
 const results=[];
 for(const pack of packs){const bar=240/pack.bpm,div=pack.subdivision==='sixteenth'?4:3,ctx=new OfflineAudioContext(2,Math.ceil((bar*3+2)*44100),44100),state=createGrooveVoiceState(),starts=[];
 for(let i=0;i<4*div*3;i++)scheduleGrooveStep({audio:ctx,output:ctx.destination,buffers,pattern:pack.pattern,index:i%(4*div),time:.05+i*60/pack.bpm/div,volume:1,voiceState:state,track:(s,g,t)=>{starts.push(t);s.onended=()=>{s.disconnect();g.disconnect();};}});
 const out=await ctx.startRendering();let peak=0,sum=0,n=0;for(let ch=0;ch<out.numberOfChannels;ch++){for(const v of out.getChannelData(ch)){peak=Math.max(peak,Math.abs(v));sum+=v*v;n++;}}
 results.push({title:pack.title,bpm:pack.bpm,tracks:pack.pattern.rows.length,barSeconds:bar,scheduledHits:starts.length,peak,rms:Math.sqrt(sum/n),firstStep:starts[0]});}
 async function single(velocity,muted=false){const ctx=new OfflineAudioContext(1,44100,44100),pattern={rows:[{tone:'snare',steps:[true],velocities:[velocity],volume:1,muted}]};scheduleGrooveStep({audio:ctx,output:ctx.destination,buffers,pattern,index:0,time:0,volume:1,track:()=>{}});const out=await ctx.startRendering();return Math.max(...out.getChannelData(0).map(Math.abs));}
 const strong=await single(100),ghost=await single(25),muted=await single(100,true);
 const stress=new OfflineAudioContext(2,44100*4,44100),tones=['kick','snare','hihat','clap','ride','cowbell','rim','triangle'];const pattern={rows:tones.map(tone=>({tone,steps:[true],velocities:[100],volume:1}))};const state=createGrooveVoiceState();for(let i=0;i<16;i++)scheduleGrooveStep({audio:stress,output:stress.destination,buffers,pattern,index:0,time:i*.125,volume:1,voiceState:state,track:()=>{}});const stressOut=await stress.startRendering();let stressPeak=0;for(let c=0;c<2;c++)for(const v of stressOut.getChannelData(c))stressPeak=Math.max(stressPeak,Math.abs(v));
 return {results,strong,ghost,muted,stressPeak};});
writeFileSync('output/groove-render-audit.json',JSON.stringify(data,null,2));for(const r of data.results){assert.ok(r.peak>0&&r.peak<1);assert.ok(r.rms>0);console.log(`${r.title}: peak=${r.peak.toFixed(3)}, RMS=${r.rms.toFixed(4)}, ${r.scheduledHits} hits / 3 bars`);}assert.ok(Math.abs(data.strong/data.ghost-4)<.001);assert.equal(data.muted,0);assert.ok(data.stressPeak<1);console.log('PASS rendered velocity ratio 4:1, mute zero, 8 simultaneous tracks repeated peak',data.stressPeak);
}finally{await b.close();}
