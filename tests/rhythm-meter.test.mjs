import test from 'node:test';
import assert from 'node:assert/strict';
import {TIME_SIGNATURES,meterInfo,timeSignature,beatTicks,secondsPerTick} from '../src/rhythm-trainer/meter.js';
import {createPattern,validPattern,changePatternMeter,beatPresets,beatTuplet,editorPresets,generateMeasures,randomizeRange,timeline,playbackTicks,measureStartTick,positionAt,readStore,clone} from '../src/rhythm-trainer/model.js';
import {blankPack,resizeFoundation} from '../src/rhythm-trainer/packs.js';
import {compileGuide,guidePatterns} from '../src/rhythm-trainer/guideModel.js';
import {units,validateBeat} from '../src/rhythm-trainer/rhythmMath.js';
import {RhythmTransport} from '../src/rhythm-trainer/transport.js';
import {countInNumber} from '../src/rhythm-trainer/beatSounds.js';
import {beatPositions,scoreCursorX} from '../src/rhythm-trainer/notationLayout.js';
globalThis.requestAnimationFrame=()=>0;
globalThis.cancelAnimationFrame=()=>{};

test('six time signatures create valid, independently stored packs; legacy packs remain 4-denominator',()=>{
 const patterns=TIME_SIGNATURES.map(meter=>blankPack(meter));
 for(const p of patterns){assert.ok(validPattern(p));assert.equal(p.measures[0].length,meterInfo(p).beats);assert.ok(p.measures.flat().every(b=>b.reduce((v,n)=>v+units(n),0)===beatTicks(p)*35));}
 const legacy=createPattern(3);delete legacy.meterDenominator;
 assert.ok(validPattern(legacy));assert.equal(timeSignature(legacy),'3/4');
 const storage={getItem:()=>JSON.stringify({patterns:[...patterns,legacy],draft:patterns[5]})};
 assert.deepEqual(readStore(storage),{patterns:[...patterns,legacy],draft:patterns[5]});
 assert.equal(validPattern({...patterns[0],meterDenominator:16}),false);
 assert.equal(validPattern({...patterns[0],meter:6,meterDenominator:8}),false);
});

test('compound shortcuts, rests, dots and 3/5/6/7 tuplets fill a real dotted-quarter beat',()=>{
 for(const signature of TIME_SIGNATURES){
  for(const preset of beatPresets(signature)){assert.ok(validateBeat(preset.beat,beatTicks(signature)),`${signature}: ${preset.id}`);assert.doesNotThrow(()=>compileGuide({groups:[preset.beat]},signature));}
  for(const count of [3,5,6,7]){const b=beatTuplet(count,signature,[1]);assert.ok(validateBeat(b,beatTicks(signature)));assert.doesNotThrow(()=>compileGuide({groups:[b]},signature));}
 }
 for(const signature of ['6/8','9/8','12/8']){
  const eighths=editorPresets('basic',signature).find(p=>p.id==='compound-eighths');
  assert.deepEqual(eighths.beat.map(n=>n.ticks),[6,6,6]);
  assert.equal(validateBeat(eighths.beat),false);
  for(const pattern of guidePatterns(signature))for(const group of pattern.groups)assert.ok(validateBeat(group,18),pattern.id);
 }
 const incomplete=beatTuplet(7,'6/8').slice(1);assert.equal(validateBeat(incomplete,18),false);
});

test('changing meter preserves fitting notes and produces complete bars, cores and tuplets without mutating the source',()=>{
 for(const from of TIME_SIGNATURES)for(const to of TIME_SIGNATURES)for(const preset of beatPresets(from)){
  const p=blankPack(from);p.measures=p.measures.map(row=>row.map(()=>clone(preset.beat)));p.core=clone(p.measures[0]);p.measureRepeats=p.measures.map((_,i)=>i===0);
  const before=clone(p),next=changePatternMeter(p,to);
  assert.deepEqual(p,before);assert.ok(validPattern(next),`${from} → ${to}: ${preset.id}`);assert.equal(timeSignature(next),to);assert.deepEqual(next.measureRepeats,p.measureRepeats);
  if(beatTicks(from)===beatTicks(to)&&!preset.beat.every(n=>n.rest))assert.deepEqual(next.measures[0][0],p.measures[0][0]);
 }
 const p=blankPack('4/4');p.measures[0][0]=[{ticks:6,rest:false},{ticks:3,rest:false},{ticks:3,rest:false}];
 const compound=changePatternMeter(p,'6/8');assert.deepEqual(compound.measures[0][0].map(n=>[n.ticks,n.rest]),[[6,false],[3,false],[3,false],[6,true]]);
 const uneven=blankPack('9/8');uneven.core=[...clone(uneven.core),...clone(uneven.core)];assert.ok(validPattern(resizeFoundation(uneven,4)));
});

test('randomization uses meter-specific note values at every level and retains untouched bars',()=>{
 for(const signature of TIME_SIGNATURES)for(const level of ['easy','medium','hard'])for(const fixed of [0,.5,.999]){
  const p=blankPack(signature);p.measures=generateMeasures(p,level,5,()=>fixed);
  assert.ok(validPattern(p),`${signature} ${level}`);
  const next=randomizeRange(p,1,3,level,()=>fixed);
  assert.ok(validPattern(next));assert.notDeepEqual(next.measures.slice(1,4),p.measures.slice(1,4));
  assert.deepEqual(next.measures[0],p.measures[0]);assert.deepEqual(next.measures[4],p.measures[4]);
  if(signature.endsWith('/8')&&level==='easy')assert.ok(p.measures.flat(2).every(n=>!n.rest&&[6,12,18].includes(n.ticks)));
 }
});

test('regenerating a single beginner compound bar does not add rests in the fallback',()=>{
 for(const signature of ['6/8','9/8','12/8'])for(const fixed of [0,.25,.5,.999]){
  const p=blankPack(signature);p.measures=generateMeasures(p,'easy',1,()=>fixed);
  const next=randomizeRange(p,0,0,'easy',()=>fixed);
  assert.ok(validPattern(next));assert.notDeepEqual(next.measures,p.measures);assert.ok(next.measures.flat(2).every(n=>!n.rest));
 }
});

test('compound count-in, notes, cursor, repeated bars and guide agree on the dotted-quarter BPM clock',()=>{
 for(const signature of TIME_SIGNATURES)for(const bpm of [30,80,200,240]){
  const p=blankPack(signature);p.bpm=bpm;p.click=false;
  const preset=beatPresets(p).find(x=>x.id===(meterInfo(p).compound?'compound-eighths':'eighths')).beat;
  p.measures=Array.from({length:2},()=>Array.from({length:p.meter},()=>clone(preset)));
  p.measures[0][0].at(-1).tie=true;p.measures[1][1][0].rest=true;
  p.core=clone(p.measures[0]);p.core.at(-1).forEach(n=>delete n.tie);p.measureRepeats=[true,false];
  assert.ok(validPattern(p));
  const duration=beatTicks(p),ctx={currentTime:0},engine=new RhythmTransport(ctx,{},()=>{}),counts=[],sounds=[];
  engine.configure(p);engine.beatSound=(at,index)=>counts.push({at,index});engine.sound=at=>sounds.push(at);engine.start();
  assert.equal(counts.length,p.meter);assert.deepEqual(counts.map(c=>c.index),Array.from({length:p.meter},(_,i)=>i));
  assert.equal(countInNumber(-(p.meter+1)*duration,p.meter,duration),0);
  for(let i=0;i<p.meter;i++){assert.equal(countInNumber(-p.meter*duration+i*duration,p.meter,duration),i+1);assert.ok(Math.abs(counts[i].at-(.045+(i+1)*60/bpm))<1e-8);}
  const total=playbackTicks(p),first=engine.anchorTime+(p.meter+1)*60/bpm;
  for(let time=0;time<first+total*secondsPerTick(p)*2-.1;time+=.01){ctx.currentTime=time;engine.schedule();}
  assert.ok(Math.abs(sounds[0]-counts.at(-1).at-60/bpm)<1e-8);
  const events=timeline(p),expected=[0,1].flatMap(cycle=>events.filter(e=>!e.rest&&!e.continuation).map(e=>first+(cycle*total+e.at)*secondsPerTick(p)));
  sounds.forEach((s,i)=>assert.ok(Math.abs(s-expected[i])<1e-8,`${signature} ${bpm}: ${i}`));
  assert.equal(measureStartTick(p,1),2*p.meter*duration);
  for(const event of events){const pos=positionAt(p,event.at);assert.equal(pos.event.index,event.index);assert.equal(scoreCursorX(p.measures[pos.measure],p.meter,pos),beatPositions(p.measures[pos.measure][event.beat],event.beat,p.meter)[event.index]);}
  const guide=compileGuide({groups:p.core},signature);
  assert.deepEqual(guide.events.map(e=>[e.at,e.ticks,e.continuation]),events.slice(0,guide.events.length).map(e=>[e.at,e.ticks,e.continuation]));
  engine.stop();
 }
});
