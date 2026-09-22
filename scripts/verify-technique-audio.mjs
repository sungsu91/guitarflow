import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const out='artifacts/technique-audio';await mkdir(out,{recursive:true});
function wav(samples){const pcm=Buffer.from(samples,'base64'),h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+pcm.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);return Buffer.concat([h,pcm]);}
const browser=await chromium.launch({headless:true,channel:'msedge'}),report=[];
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:5173/#etudes');await page.getByRole('button',{name:'악보 만들기',exact:true}).waitFor();
for(const kind of ['slide','slur-slide','slide-in','slide-out','bend-quarter','bend-half','bend-full','bend-return','bend-hold-release','prebend','hammer','pull','vibrato','tie','palm','harmonic','arpeggio']){
 const r=await page.evaluate(async kind=>{
 const m=await import('/src/etudes/scoreModel.js'),{guitarVoiceTimeline}=await import('/src/etudes/scorePlayback.js'),{createScoreVoiceOutput}=await import('/src/audio/scoreInstrument.js');
 const d=m.createBlankDocument();d.bpm=60;
 d.measures[0].events=Array.from({length:4},(_,i)=>({...m.blankEvent(i*480,'4'),blank:false,rest:i>1,notes:i>1?[]:[{id:m.newId('tone'),string:2,fret:i?7:5}]}));
 const [a,b,c]=d.measures[0].events;
 if(['tie','bend-hold-release'].includes(kind))b.notes[0].fret=5;
 if(kind==='pull'){a.notes[0].fret=7;b.notes[0].fret=5;}
 if(kind==='harmonic')a.notes[0].fret=12;
 if(kind==='arpeggio')a.notes.push({id:m.newId('tone'),string:3,fret:5},{id:m.newId('tone'),string:4,fret:5});
 const plain=structuredClone(d);
 if(kind==='slide'||kind==='slur-slide'){a.technique='S';if(kind==='slur-slide')a.slurTo=b.id;}
 if(kind==='slide-in')a.slideIn='up';if(kind==='slide-out')a.slideOut='down';
 if(kind.startsWith('bend-'))a.notes[0].bendEffect={amount:kind==='bend-quarter'?.5:kind==='bend-half'?1:2,phase:kind==='bend-return'?'up-release':'up'};
 if(kind==='bend-hold-release'){b.notes[0].bendEffect={amount:1,phase:'hold'};c.rest=false;c.notes=[{id:m.newId('tone'),string:2,fret:5,bendEffect:{amount:1,phase:'release'}}];plain.measures[0].events[2]={...c,notes:c.notes.map(({bendEffect,...n})=>n)};}
 if(kind==='prebend')a.notes[0].bendEffect={amount:1,phase:'prebend'};
 if(kind==='hammer')a.technique='H';if(kind==='pull')a.technique='P';if(kind==='vibrato')a.vibrato=true;if(kind==='tie')a.tieTo=b.id;if(kind==='palm')a.palmMute=true;if(kind==='harmonic')a.notes[0].harmonic=true;if(kind==='arpeggio')a.arpeggio='up';
 const render=async doc=>{const compiled=m.compileDocumentV2(doc);if(!compiled.score||compiled.issues.length)throw Error(JSON.stringify(compiled));const timeline=guitarVoiceTimeline(compiled.score),ctx=new OfflineAudioContext(1,24000*4.2,24000);let starts=0,ends=0;const factory=ctx.createBufferSource.bind(ctx);ctx.createBufferSource=()=>{const n=factory();n.addEventListener('ended',()=>ends++);const start=n.start.bind(n);n.start=(...args)=>{starts++;start(...args);};return n;};const output=createScoreVoiceOutput(ctx);for(const v of timeline.voices)output.schedule([v],v.start+.03);output.finish();const buffer=await ctx.startRendering();return {data:buffer.getChannelData(0),starts,ends,duration:timeline.duration};};
 const before=await render(plain),after=await render(d);let difference=0,peak=0;for(let i=0;i<after.data.length;i++){difference+=(after.data[i]-before.data[i])**2;peak=Math.max(peak,Math.abs(after.data[i]));}
 const encode=data=>{const bytes=new Uint8Array(data.length*2),view=new DataView(bytes.buffer);for(let i=0;i<data.length;i++)view.setInt16(i*2,Math.round(Math.max(-1,Math.min(1,data[i]))*32767),true);let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
 return {before:encode(before.data),after:encode(after.data),difference:Math.sqrt(difference/after.data.length),peak,starts:[before.starts,after.starts],ends:after.ends,durations:[before.duration,after.duration]};
 },kind);
 assert.ok(r.difference>1e-6,kind);assert.deepEqual(r.durations,[4,4]);assert.equal(r.starts[1],r.ends);assert.ok(r.peak<1);await writeFile(`${out}/${kind}-before.wav`,wav(r.before));await writeFile(`${out}/${kind}-after.wav`,wav(r.after));delete r.before;delete r.after;report.push({kind,...r});console.log(kind,r.starts,r.difference);
}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));}finally{await browser.close();}
