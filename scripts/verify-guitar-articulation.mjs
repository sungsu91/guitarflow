import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {chromium} from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const baseline=process.argv.includes('--baseline'),out='work/guitar-articulation';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5173/#etudes');
 const results=await page.evaluate(async()=>{
  const {guitarVoiceTimeline}=await import('/src/etudes/scorePlayback.js');
  const {createScoreVoiceOutput}=await import('/src/audio/scoreInstrument.js');
  const {guitarVoiceStats}=await import('/src/audio/fretboardPreviewEngine.js');
  const tuning=[64,59,55,50,45,40],rate=48000,results=[];
  for(const kind of ['pull','long-pull','hammer','triplet','picked','roll-six','roll-three','roll-reverse','chord-six','release']){
   const chord=kind.startsWith('roll')||kind==='chord-six',gap=kind==='long-pull'?1.5:kind==='triplet'?1/6:.5;
   const note=(i,fret,technique=null)=>({id:String(i),onset:i*gap*480,duration:kind==='long-pull'?'4':kind==='triplet'?'16':'8',...(kind==='long-pull'?{dotted:true}:kind==='triplet'?{tuplet:{actualNotes:3,normalNotes:2}}:{}),string:1,fret,midi:64+fret,technique});
   const first=kind==='hammer'?5:7,events=chord?[{id:'chord',onset:0,duration:'2',arpeggio:kind==='chord-six'?undefined:kind==='roll-reverse'?'down':'up',tones:(kind==='roll-three'?[5,3,2]:[6,5,4,3,2,1]).map(string=>({string,fret:string===3?1:string===4||string===5?2:0,midi:tuning[string-1]+(string===3?1:string===4||string===5?2:0)}))}]:kind==='triplet'?[note(0,5,'H'),note(1,7,'P'),note(2,5)]:[note(0,first,kind==='picked'?null:kind==='hammer'?'H':'P'),note(1,kind==='hammer'?7:5)];
   const score={bpm:60,meter:[4,4],measures:[events]},timeline=guitarVoiceTimeline(score),ctx=new OfflineAudioContext(1,rate*4,rate),output=createScoreVoiceOutput(ctx),starts=[];
   const factory=ctx.createBufferSource.bind(ctx);ctx.createBufferSource=()=>{const source=factory(),start=source.start.bind(source);source.start=(...args)=>{starts.push(args[0]);start(...args);};return source;};
   for(let i=0;i<timeline.voices.length;){const at=timeline.voices[i].start,group=[];while(i<timeline.voices.length&&timeline.voices[i].start===at)group.push(timeline.voices[i++]);const sources=output.schedule(group,.1+at);if(kind==='release')sources.forEach(s=>s.release(.25));}
   output.finish();const pcm=(await ctx.startRendering()).getChannelData(0);await new Promise(r=>setTimeout(r,10));
   const rms=(a,b)=>{const samples=pcm.slice(Math.floor(a*rate),Math.floor(b*rate));return Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length);};
   const pitch=(at,expected)=>{const samples=pcm.slice(Math.floor(at*rate),Math.floor((at+.055)*rate));let best=-Infinity,result=0;for(let lag=Math.floor(rate/expected*.92);lag<=Math.ceil(rate/expected*1.08);lag++){let xy=0,xx=0,yy=0;for(let i=0;i<samples.length-lag;i++){const a=samples[i],b=samples[i+lag];xy+=a*b;xx+=a*a;yy+=b*b;}const score=xy/Math.sqrt(xx*yy);if(score>best){best=score;result=rate/lag;}}return result;};
   const metrics={starts,onsets:timeline.voices.map(v=>v.start),strings:timeline.voices.map(v=>v.string),duration:timeline.duration,peak:0,rms:rms(.1,.5),before:rms(.1+gap-.06,.1+gap-.01),arrival:rms(.1+gap+.01,.1+gap+.07),pitch:chord?null:pitch(.1+gap+.02,440*2**(((kind==='hammer'?71:kind==='triplet'?71:69)-69)/12)),tail:rms(.3,1),active:output.activeCount,guitarActive:guitarVoiceStats(ctx).active};
   metrics.peak=pcm.reduce((m,n)=>Math.max(m,Math.abs(n)),0);metrics.jump=pcm.reduce((m,n,i)=>i?Math.max(m,Math.abs(n-pcm[i-1])):m,0);
   const wav=new Uint8Array(44+pcm.length*2),view=new DataView(wav.buffer),text=(at,s)=>[...s].forEach((c,i)=>wav[at+i]=c.charCodeAt(0));text(0,'RIFF');view.setUint32(4,36+pcm.length*2,true);text(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,pcm.length*2,true);for(let i=0;i<pcm.length;i++)view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,pcm[i]))*32767),true);
   let binary='';for(let i=0;i<wav.length;i+=8192)binary+=String.fromCharCode(...wav.subarray(i,i+8192));results.push({kind,metrics,wav:btoa(binary)});
  }
  return results;
 });
 const report={};for(const {kind,metrics,wav} of results){report[kind]=metrics;await writeFile(`${out}/${kind}-${baseline?'before':'after'}.wav`,Buffer.from(wav,'base64'));assert(metrics.peak>0&&metrics.peak<.95,`${kind}: clipping`);assert.equal(metrics.active,0,`${kind}: transport cleanup`);assert.equal(metrics.guitarActive,0,`${kind}: string cleanup`);assert(metrics.jump<.12,`${kind}: sample discontinuity`);}
 await writeFile(`${out}/${baseline?'before':'after'}.json`,JSON.stringify(report,null,2));
 if(!baseline){
  const before=JSON.parse(await readFile(`${out}/before.json`,'utf8'));
  for(const kind of ['pull','long-pull']){assert(report[kind].arrival>before[kind].arrival*1.2,`${kind}: destination must regain energy`);assert(report[kind].arrival>report[kind].before*2,`${kind}: a fresh finger attack`);assert(Math.abs(1200*Math.log2(report[kind].pitch/440))<10,`${kind}: lower note settles to pitch`);}
  assert(report.pull.arrival<report.picked.arrival, 'finger pull-off remains softer than a new pick');
  assert(report['roll-six'].rms<before['roll-six'].rms*.7,'rolled chord must not use six full-volume solo attacks');
  assert.equal(report.release.tail,0,'stop cancels future finger attacks');
  for(const kind of Object.keys(report))assert.equal(report[kind].duration,before[kind].duration,`${kind}: written duration`);
 }
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
