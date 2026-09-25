import test from 'node:test';
import assert from 'node:assert/strict';
import {examplePattern,randomMeasure,validPattern,timeline,positionAt,readStore,STORAGE_KEY} from '../src/rhythm-trainer/model.js';
import {RhythmTransport} from '../src/rhythm-trainer/transport.js';
globalThis.cancelAnimationFrame=()=>{};
test('reference measure has exact onsets and silent second beat',()=>{const p=examplePattern();const e=timeline(p).filter(x=>x.measure===0);assert.deepEqual(e.map(x=>x.at/12),[0,.5,.75,1,2,2.5,3,3.25,3.5,3.75]);assert.equal(e[3].rest,true);assert.equal(e.reduce((s,n)=>s+n.ticks,0),48);assert.equal(positionAt(p,20).event.rest,true);assert.equal(positionAt(p,48).measure,1);assert.equal(positionAt(p,240).measure,0);});
test('random generation preserves every beat, meter and difficulty',()=>{for(const meter of [2,3,4])for(const d of ['easy','medium','hard'])for(let i=0;i<100;i++){const p=examplePattern();p.meter=meter;p.measures=[randomMeasure(meter,d)];assert.ok(validPattern(p));if(d==='easy')assert.ok(p.measures.flat(2).every(n=>n.ticks>=6));if(d==='medium')assert.ok(p.measures.flat(2).every(n=>n.ticks!==4));}});
test('storage survives roundtrip and rejects malformed data',()=>{const p=examplePattern();assert.equal(readStore({getItem:()=>JSON.stringify({patterns:[p,{}],draft:p})}).patterns.length,1);assert.equal(readStore({getItem:()=>'{'}).draft,null);assert.equal(validPattern({...p,measures:[[[{ticks:5,rest:false}]]]}),false);assert.equal(typeof STORAGE_KEY,'string');});
test('audio scheduler emits exact reference onsets and never plays rests',()=>{const ctx={currentTime:0};const e=new RhythmTransport(ctx,{},()=>{});const p=examplePattern();p.click=false;p.countIn=false;e.configure(p);e.anchorTime=0;e.anchorTick=0;e.next=0;const sounds=[];e.sound=(at,tone)=>sounds.push([at,tone]);for(let time=0;time<3;time+=.02){ctx.currentTime=time;e.schedule();}assert.deepEqual(sounds.slice(0,9).map(x=>x[0]),[0,.375,.5625,1.5,1.875,2.25,2.4375,2.625,2.8125]);});
test('tempo, pause and seek preserve musical position and cancel scheduled sources',()=>{globalThis.cancelAnimationFrame=()=>{};const ctx={currentTime:10};const e=new RhythmTransport(ctx,{},()=>{});e.configure(examplePattern());e.running=true;e.anchorTime=9;e.anchorTick=6;assert.equal(e.position(),22);let stopped=0;e.sources.add({stop(){stopped++;},disconnect(){}});e.stop();assert.equal(e.tick,22);assert.equal(stopped,1);ctx.currentTime=20;assert.equal(e.position(),22);e.configure({...examplePattern(),bpm:120});assert.equal(e.tick,22);e.seek(48);assert.equal(e.tick,48);});
test('scheduler stall skips expired notes instead of bursting',()=>{const e=new RhythmTransport({currentTime:20},{},()=>{});e.configure(examplePattern());e.anchorTime=0;e.anchorTick=0;e.next=0;const sounds=[];e.sound=(at)=>sounds.push(at);e.schedule();assert.ok(sounds.every(at=>at>=20));});
import { test as nodeTest } from 'node:test';
nodeTest('count-in uses only click sound and loop repeats on the same clock',()=>{const ctx={currentTime:0};const e=new RhythmTransport(ctx,{},()=>{});const p=examplePattern();p.click=false;e.configure(p);e.anchorTime=3;e.anchorTick=0;e.next=-48;const sounds=[];e.sound=(at,tone)=>sounds.push({at,tone});for(let time=0;time<3;time+=.02){ctx.currentTime=time;e.schedule();}assert.equal(sounds.filter(s=>s.tone==='click').length,4);assert.ok(sounds.filter(s=>s.at<3).every(s=>s.tone==='click'));ctx.currentTime=18;e.next=240;e.schedule();assert.ok(sounds.some(s=>s.at===18&&s.tone==='wood'));});

import {beatPositions,scoreCursorX} from '../src/rhythm-trainer/notationLayout.js';
test('optical spacing keeps cursor on each note/rest onset and moves through its duration',()=>{const p=examplePattern();for(const e of timeline(p)){const position=positionAt(p,e.at);const x=beatPositions(p.measures[e.measure][e.beat],e.beat,p.meter)[e.index];assert.equal(scoreCursorX(p.measures[e.measure],p.meter,position),x);const middle=positionAt(p,e.at+e.ticks/2);assert.ok(scoreCursorX(p.measures[e.measure],p.meter,middle)>x);}assert.equal(scoreCursorX(p.measures[0],p.meter,positionAt(p,240)),beatPositions(p.measures[0][0],0,p.meter)[0]);});

import {BEATS,BEAT_PRESETS,PRESET_GROUPS,validBeat,generateMeasures,randomizeRange,practicePatterns,replacePatternBeat,clone} from '../src/rhythm-trainer/model.js';
test('27 categorized presets retain original seven and every beat totals exactly 12 ticks',()=>{
 assert.equal(BEAT_PRESETS.length,27);assert.equal(PRESET_GROUPS.length,5);
 assert.deepEqual(BEATS.slice(0,7).map(b=>b.map(n=>n.rest?-n.ticks:n.ticks)),[[12],[-12],[6,6],[6,3,3],[3,3,3,3],[6,-6],[4,4,4]]);
 for(const preset of BEAT_PRESETS){assert.ok(validBeat(preset.beat),preset.id);assert.ok(PRESET_GROUPS.some(g=>g[0]===preset.group));}
 for(const values of [[3,6,3],[3,3,6],[-6,6],[6,-6],[6,-3,3],[-3,3,6],[9,3],[3,9],[-4,4,4],[4,-4,4],[4,4,-4]])assert.ok(BEATS.some(b=>JSON.stringify(b.map(n=>n.rest?-n.ticks:n.ticks))===JSON.stringify(values)));
 assert.equal(validBeat([{ticks:9,rest:false},{ticks:4,rest:false}]),false);
});
test('one-bar and multi-bar curriculum contains all levels, dots, rest triplets and cross-bar ties',()=>{
 const ps=practicePatterns();assert.equal(ps.length,6);for(const p of ps)assert.ok(validPattern(p),p.id);
 for(const level of ['easy','medium','hard']){assert.ok(ps.some(p=>p.difficulty===level&&p.measures.length===1));assert.ok(ps.some(p=>p.difficulty===level&&p.measures.length>1));}
 const long=ps.find(p=>p.id==='practice-hard-five');assert.ok(long.measures[3].at(-1).at(-1).tie);assert.ok(timeline(long).some(e=>e.continuation&&e.measure===4&&e.beat===0));
});
test('seeded generation preserves meter and difficulty, avoids identical adjacent bars and repeated regenerations',()=>{
 let seed=42;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(const meter of [2,3,4])for(const level of ['easy','medium','hard'])for(let run=0;run<40;run++){
  const p={...examplePattern(),meter,measures:generateMeasures(meter,level,8,rng)};assert.ok(validPattern(p));
  for(let i=1;i<p.measures.length;i++)assert.notDeepEqual(p.measures[i],p.measures[i-1]);
  if(level==='easy')for(const m of p.measures)assert.ok(m.every(b=>JSON.stringify(b)===JSON.stringify(m[0])));
  if(level==='medium')assert.ok(p.measures.flat(2).every(n=>n.ticks!==4&&!n.tie));
  if(level==='hard')assert.ok(p.measures.every(m=>m.some(b=>b.at(-1).tie)));
 }
 for(const level of ['easy','medium','hard']){const p=examplePattern();p.measures=generateMeasures(4,level,5,()=>0);const next=randomizeRange(p,0,4,level,()=>0);assert.ok(validPattern(next));assert.notDeepEqual(next.measures,p.measures);}
});
test('partial randomization preserves untouched bars and replacing a tie target with a rest repairs the tie',()=>{
 const p=examplePattern();const changed=randomizeRange(p,1,2,'hard',()=>.5);assert.deepEqual(changed.measures[0],p.measures[0]);assert.deepEqual(changed.measures[3],p.measures[3]);assert.deepEqual(changed.measures[4],p.measures[4]);assert.ok(validPattern(changed));
 const tied=practicePatterns().find(p=>p.id==='practice-hard-bar');const edited=replacePatternBeat(tied,0,1,BEATS[1]);assert.equal(edited.measures[0][0].at(-1).tie,undefined);assert.ok(validPattern(edited));
 const broken=clone(tied);broken.measures[0].at(-1).at(-1).tie=true;assert.equal(validPattern(broken),false);
});
test('dotted onsets and tie continuations match scheduled percussion, including cross-bar ties and loop',()=>{
 const p=practicePatterns().find(p=>p.id==='practice-hard-five');p.click=false;p.countIn=false;p.bpm=120;
 const events=timeline(p);const secondsPerTick=5/p.bpm;const total=p.measures.length*p.meter*12;
 const ctx={currentTime:0};const engine=new RhythmTransport(ctx,{},()=>{});engine.configure(p);engine.anchorTime=0;engine.anchorTick=0;engine.next=0;const sounds=[];engine.sound=(time,tone)=>sounds.push({time,tone});
 for(let tick=0;tick<total*2;tick++){ctx.currentTime=tick*secondsPerTick;engine.schedule();}
 const expected=[0,1].flatMap(loop=>events.filter(e=>!e.rest&&!e.continuation).map(e=>(loop*total+e.at)*secondsPerTick));
 const actual=sounds.filter(s=>s.time<total*2*secondsPerTick).map(s=>s.time);assert.equal(actual.length,expected.length);actual.forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<1e-9));
 for(const e of events){const pos=positionAt(p,e.at);assert.equal(pos.event.continuation,e.continuation);assert.equal(scoreCursorX(p.measures[e.measure],p.meter,pos),beatPositions(p.measures[e.measure][e.beat],e.beat,p.meter)[e.index]);}
});
test('short hard bars also change with a constant random source',()=>{for(const meter of [2,3,4])for(const count of [1,5])for(const fixed of [0,.5,.999]){const p={...examplePattern(),meter,measures:generateMeasures(meter,'hard',count,()=>fixed)};const next=randomizeRange(p,0,count-1,'hard',()=>fixed);assert.ok(validPattern(next));assert.notDeepEqual(next.measures,p.measures);}});
