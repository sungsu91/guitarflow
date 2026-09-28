import test from 'node:test';
import assert from 'node:assert/strict';
import {audibleContextTime,RhythmTransport} from '../src/rhythm-trainer/transport.js';
import {GUIDE_METERS,guidePatterns,compileGuide,GuideTransport} from '../src/rhythm-trainer/guideModel.js';
import {builtinPacks} from '../src/rhythm-trainer/packs.js';
import {timeline,positionAt,createPattern} from '../src/rhythm-trainer/model.js';
import {beatPositions,scoreCursorX,guideCursorX} from '../src/rhythm-trainer/notationLayout.js';
import {secondsPerTick,timeSignature} from '../src/rhythm-trainer/meter.js';
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
globalThis.cancelAnimationFrame=()=>{};

test('every guide attack and held count arrives at the same printed cell center',()=>{
 const patterns=GUIDE_METERS.flatMap(meter=>guidePatterns(meter).map(pattern=>({meter,pattern})))
  .concat(builtinPacks().map(p=>({meter:timeSignature(p),pattern:{groups:p.core}})));
 for(const {meter,pattern} of patterns){
  const compiled=compileGuide(pattern,meter);
  for(const group of compiled.groups){
   const xs=beatPositions(group.notes,0,1,true,group.step);
   for(const [index,cell] of group.cells.entries()){
    const tick=cell.at-group.at,expected=15+(index+.5)*158/group.cells.length;
    close(guideCursorX(group.notes,tick,group.step),expected);
    const event=group.events.find(e=>cell.at+1e-9>=e.at&&cell.at<e.at+e.ticks-1e-9);
    const pos={tick,event:{...event,at:event.at-group.at}};
    close(scoreCursorX([group.notes],1,pos,true,group.step),expected);
    if(Math.abs(event.at-cell.at)<1e-7)close(xs[event.index],expected);
   }
   // The final half-cell remains visible to the end, without running off the staff.
   close(guideCursorX(group.notes,group.ticks,group.step),173);
   assert.ok(guideCursorX(group.notes,group.ticks-group.step/2,group.step)<173);
  }
 }
});

test('practice cursor reaches each optical note/rest center for all packs, including repeats',()=>{
 for(const p of builtinPacks())for(const event of timeline(p)){
  const position=positionAt(p,event.at),measure=p.measures[event.measure];
  close(scoreCursorX(measure,p.meter,position),beatPositions(measure[event.beat],event.beat,p.meter)[event.index]);
  assert.equal(position.event.index,event.index);
  assert.equal(position.event.continuation,event.continuation);
 }
});

test('valid output timestamps take precedence; fallback subtracts reported device latency',()=>{
 close(audibleContextTime({currentTime:10,getOutputTimestamp:()=>({contextTime:9.7,performanceTime:1000}),baseLatency:.01,outputLatency:.2},1020),9.72);
 close(audibleContextTime({currentTime:10,baseLatency:.01,outputLatency:.2},1020),9.79);
 close(audibleContextTime({currentTime:10,getOutputTimestamp:()=>({contextTime:0,performanceTime:0}),baseLatency:.01,outputLatency:.2},1020),9.79);
 close(audibleContextTime({currentTime:10},1020),10);
 close(audibleContextTime({currentTime:.1,outputLatency:.2},1020),0);
 close(audibleContextTime({currentTime:10,getOutputTimestamp:()=>({contextTime:9.9,performanceTime:1000})},2000),10);
});

test('practice and guide display an onset when its scheduled sound reaches output, at slow and fast tempos',()=>{
 for(const bpm of [30,96,240])for(const guide of [false,true]){
  const ctx={currentTime:0,baseLatency:.01,outputLatency:.12};
  const engine=guide?new GuideTransport(ctx,{},()=>{}):new RhythmTransport(ctx,{},()=>{});
  const pattern={...createPattern(),bpm,countIn:false,click:false,loop:true};
  if(guide)engine.configureGuide(compileGuide(guidePatterns('4/4').find(p=>p.id==='sixteenth-eighth-sixteenth'),'4/4'),bpm,'wood');
  else engine.configure(pattern);
  engine.anchorTime=1;engine.anchorTick=0;engine.next=0;
  const sounds=[];engine.sound=at=>sounds.push(at);engine.beatSound=()=>{};
  const seconds=secondsPerTick(engine.pattern);
  for(const event of engine.events){
   ctx.currentTime=engine.anchorTime+event.at*seconds-.01;engine.schedule();
   if(!event.rest&&!event.continuation)assert.ok(sounds.some(at=>Math.abs(at-(engine.anchorTime+event.at*seconds))<1e-8));
   ctx.currentTime=engine.anchorTime+event.at*seconds+.13;
   close(engine.audiblePosition(),event.at);
  }
 }
});

test('startup waits for output; pause and tempo edits preserve heard position instead of jumping ahead',()=>{
 let draw;globalThis.requestAnimationFrame=fn=>{draw=fn;return 1;};
 const ctx={currentTime:10,baseLatency:.01,outputLatency:.2},frames=[];
 const engine=new RhythmTransport(ctx,{},(...args)=>frames.push(args));
 engine.configure({...createPattern(),bpm:60,countIn:false,click:false});engine.sound=()=>{};
 engine.start(false);assert.equal(frames.at(-1)[2],false);
 ctx.currentTime=10.1;draw();assert.equal(frames.at(-1)[2],false);
 ctx.currentTime=11.255;draw();assert.equal(frames.at(-1)[2],true);close(frames.at(-1)[0],12);
 engine.pause();close(engine.tick,12);close(frames.at(-1)[0],12);
 engine.configure({...engine.pattern,bpm:120});close(engine.tick,12);
 engine.start(false);close(engine.anchorTick,12);engine.stop();
});
