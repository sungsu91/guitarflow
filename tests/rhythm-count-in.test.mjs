import test from 'node:test';
import assert from 'node:assert/strict';
import {RhythmTransport} from '../src/rhythm-trainer/transport.js';
import {countInNumber} from '../src/rhythm-trainer/beatSounds.js';
import {createPattern,BEATS,clone} from '../src/rhythm-trainer/model.js';
globalThis.cancelAnimationFrame=()=>{};
test('count numbers advance on the audio clock and disappear exactly at the first score beat',()=>{
 for(const meter of [2,3,4]){
  assert.equal(countInNumber(-(meter+1)*12,meter),0);
  assert.equal(countInNumber(-meter*12-.01,meter),0);
  for(let i=0;i<meter;i++){
   assert.equal(countInNumber(-meter*12+i*12,meter),i+1);
   assert.equal(countInNumber(-meter*12+i*12+11.99,meter),i+1);
  }
  assert.equal(countInNumber(0,meter),null);
 }
});
test('start includes a silent preparation beat before count one',()=>{
 globalThis.requestAnimationFrame=()=>0;
 const ctx={currentTime:0},engine=new RhythmTransport(ctx,{},()=>{});
 engine.configure({...createPattern(),bpm:60});const counts=[];engine.beatSound=(at,index)=>counts.push({at,index});engine.sound=()=>{};
 engine.start();assert.equal(engine.anchorTick,-60);assert.equal(countInNumber(engine.audiblePosition(),4),0);
 ctx.currentTime=.95;engine.schedule();assert.equal(counts.length,0);
 ctx.currentTime=1;engine.schedule();assert.equal(counts.length,1);assert.equal(counts[0].index,0);assert.ok(Math.abs(counts[0].at-1.045)<1e-9);
 engine.stop();
});
test('voice and snare count-ins schedule meter beats and start the score one full beat after the last count',()=>{
 for(const meter of [2,3,4])for(const bpm of [30,80,240])for(const tone of ['voice','snare']){
  const starts=[];
  const ctx={currentTime:0,createBufferSource(){return {playbackRate:{value:1},connect(){},disconnect(){},start(at){starts.push({at,id:this.buffer.id,rate:this.playbackRate.value});},stop(){}};},createGain(){return {gain:{setValueAtTime(){}},connect(){},disconnect(){}};}};
  const engine=new RhythmTransport(ctx,{},()=>{}),p={...createPattern(meter),bpm,click:false,loop:false,measures:[Array.from({length:meter},()=>clone(BEATS[0]))]};
  engine.configure(p);engine.setBeatSound(tone,tone==='voice'?[1,2,3,4].map(id=>({id,duration:.45})):[{id:'snare',duration:.15}]);
  engine.anchorTick=-meter*12;engine.anchorTime=0;engine.next=-meter*12;
  const notes=[];engine.sound=(at)=>notes.push(at);
  for(let time=0;time<(meter+1)*60/bpm;time+=.02){ctx.currentTime=time;engine.schedule();}
  assert.equal(starts.length,meter);
  starts.forEach((s,i)=>{assert.ok(Math.abs(s.at-i*60/bpm)<1e-9);assert.equal(s.id,tone==='voice'?i+1:'snare');if(tone==='voice')assert.ok(.45/s.rate<=60/bpm*.85+1e-9);});
  assert.equal(notes[0],meter*60/bpm);
  assert.equal(countInNumber(-12,meter),meter);
 }
});

test('pause publishes the stopped audio position and count-in restarts from preparation',()=>{
 globalThis.requestAnimationFrame=()=>0;
 const ctx={currentTime:0},frames=[],engine=new RhythmTransport(ctx,{},(tick,running)=>frames.push({tick,running}));
 engine.configure({...createPattern(),bpm:60});engine.beatSound=()=>{};engine.sound=()=>{};
 engine.start();assert.deepEqual(frames.at(-1),{tick:-60,running:true});
 ctx.currentTime=3.2;engine.pause();
 assert.equal(frames.at(-1).running,false);assert.equal(frames.at(-1).tick,engine.tick);
 assert.equal(countInNumber(engine.tick,4),3);
 engine.start();assert.deepEqual(frames.at(-1),{tick:-60,running:true});engine.pause();
 engine.seek(18);engine.start();ctx.currentTime+=.3;engine.pause();const stopped=engine.tick;
 engine.start();assert.equal(engine.anchorTick,stopped);engine.stop();
});
