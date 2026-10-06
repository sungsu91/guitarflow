import test from 'node:test';
import assert from 'node:assert/strict';
import {builtinPacks,copyPack,resizeFoundation} from '../src/rhythm-trainer/packs.js';
import {clone,validPattern,measureOrder,createPattern,beatTuplet} from '../src/rhythm-trainer/model.js';
import {secondsPerTick} from '../src/rhythm-trainer/meter.js';
import {RhythmTransport} from '../src/rhythm-trainer/transport.js';

globalThis.cancelAnimationFrame=()=>{};
globalThis.requestAnimationFrame=()=>0;

test('resizing a copied foundation pack keeps edited notes, rests and repeats',()=>{
 const pattern=copyPack(builtinPacks()[0]);
 pattern.measures[0][0]=[{ticks:6,rest:false},{ticks:6,rest:false}];
 pattern.measures[0][2]=[{ticks:12,rest:true}];
 pattern.measureRepeats=[true,false,true,false];
 const before=clone(pattern);
 const longer=resizeFoundation(pattern,5);
 assert.deepEqual(longer.measures.slice(0,4),before.measures);
 assert.deepEqual(longer.measureRepeats,[true,false,true,false,false]);
 assert.deepEqual(measureOrder(longer),[0,0,1,2,2,3,4]);
 assert.ok(validPattern(longer));
 const shorter=resizeFoundation(longer,3);
 assert.deepEqual(shorter.measures,before.measures.slice(0,3));
 assert.deepEqual(shorter.measureRepeats,[true,false,true]);
 assert.ok(validPattern(shorter));
 assert.deepEqual(pattern,before);
});

test('shortening a copied score repairs only a tie that has lost its target',()=>{
 const pattern=copyPack(builtinPacks()[0]);
 pattern.measures[0][3][0].tie=true;
 pattern.measures[1][3][0].tie=true;
 const shorter=resizeFoundation(pattern,2);
 assert.equal(shorter.measures[0][3][0].tie,true);
 assert.equal(shorter.measures[1][3][0].tie,undefined);
 assert.ok(validPattern(shorter));
});

test('changing loop and count-in options during playback never shifts the next beat',()=>{
 const pattern={...builtinPacks()[0],bpm:60,countIn:false,click:false};
 const ctx={currentTime:0},sounds=[];
 const engine=new RhythmTransport(ctx,{},()=>{});
 engine.sound=at=>sounds.push(at);
 engine.configure(pattern);
 engine.start(false);
 try {
  const anchor=engine.anchorTime;
  for(let i=1;i<=20;i++){
   ctx.currentTime=i*.02;
   engine.configure({...engine.pattern,loop:!engine.pattern.loop,countIn:!engine.pattern.countIn});
  }
  assert.equal(engine.anchorTime,anchor);
  ctx.currentTime=1;
  engine.schedule();
  assert.deepEqual(sounds,[.045,1.045]);
 } finally {engine.dispose();}
});

test('turning looping off during a later pass finishes that pass and cancels queued next-pass notes',()=>{
 let draw;
 globalThis.requestAnimationFrame=callback=>{draw=callback;return 1;};
 const original=builtinPacks()[0];
 const pattern={...original,measures:[original.measures[0]],bpm:60,countIn:false,click:false};
 const ctx={currentTime:0},frames=[];
 const engine=new RhythmTransport(ctx,{},(tick,running)=>frames.push({tick,running}));
 engine.sound=()=>{};engine.configure(pattern);engine.start(false);
 try {
  ctx.currentTime=11.99; // Third 4-second pass, just before its end at 12.045.
  let futureStops=0,activeStops=0;
  const future={stop(){futureStops++;},disconnect(){}};
  const active={stop(){activeStops++;},disconnect(){}};
  engine.sources.add(future);engine.sourceStarts.set(future,12.045);
  engine.sources.add(active);engine.sourceStarts.set(active,11.045);
  const before=engine.position()%engine.total;
  engine.configure({...pattern,loop:false});
  assert.ok(Math.abs(engine.position()-before)<1e-9);
  assert.equal(futureStops,1);assert.equal(activeStops,0);
  draw();assert.equal(frames.at(-1).running,true);
  ctx.currentTime=12.05;draw();
  assert.deepEqual(frames.at(-1),{tick:0,running:false});
 } finally {engine.dispose();}
});

test('enabling looping inside the final lookahead schedules the next first beat once',()=>{
 globalThis.requestAnimationFrame=()=>0;
 const original=builtinPacks()[0];
 const pattern={...original,measures:[original.measures[0]],bpm:60,countIn:false,click:false,loop:false};
 const ctx={currentTime:0},sounds=[];
 const engine=new RhythmTransport(ctx,{},()=>{});
 engine.sound=at=>sounds.push(at);engine.configure(pattern);engine.start(false);
 try {
  ctx.currentTime=4;engine.schedule();
  engine.configure({...pattern,loop:true});engine.schedule();engine.schedule();
  assert.equal(sounds.filter(at=>Math.abs(at-4.045)<1e-9).length,1);
 } finally {engine.dispose();}
});

test('ten simulated minutes of compound septuplets and repeats have no accumulated timing drift',()=>{
 for(const bpm of [73,240]){
  const pattern={...createPattern('6/8'),bpm,countIn:false,click:false,
   measures:Array.from({length:2},()=>[beatTuplet(7,'6/8'),beatTuplet(7,'6/8')]),measureRepeats:[true,false]};
  const ctx={currentTime:0},sounds=[],engine=new RhythmTransport(ctx,{},()=>{});
  engine.sound=at=>{if(at<600)sounds.push(at);};
  engine.configure(pattern);engine.start(false);
  try {
   const second=secondsPerTick(pattern),expected=[];
   for(let cycle=0;engine.anchorTime+cycle*engine.total*second<600;cycle++){
    for(const event of engine.events){
     const at=engine.anchorTime+(cycle*engine.total+event.at)*second;
     if(at<600)expected.push(at);
    }
   }
   let index=0;
   while(ctx.currentTime<600){ctx.currentTime+=[.011,.037,.023][index++%3];engine.schedule();}
   assert.equal(sounds.length,expected.length);
   assert.ok(sounds.every((at,i)=>Math.abs(at-expected[i])<1e-9));
  } finally {engine.dispose();}
 }
});
