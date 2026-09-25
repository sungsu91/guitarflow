import test from 'node:test';
import assert from 'node:assert/strict';
import {builtinPacks,blankPack,copyPack,PACK_FAMILIES} from '../src/rhythm-trainer/packs.js';
import {validBeat,validPattern,timeline,positionAt,readStore,clone,BEATS} from '../src/rhythm-trainer/model.js';
import {tuplet,tupletGroups,units,writtenTicks} from '../src/rhythm-trainer/rhythmMath.js';
import {beatPositions,scoreCursorX} from '../src/rhythm-trainer/notationLayout.js';
import {RhythmTransport} from '../src/rhythm-trainer/transport.js';
globalThis.cancelAnimationFrame=()=>{};
const packs=builtinPacks();

test('coverage is driven by distinct core rhythms, including six reference motifs',()=>{
  assert.equal(new Set(packs.map(p=>JSON.stringify(p.core))).size,packs.length);
  assert.equal(new Set(packs.map(p=>p.id)).size,packs.length);
  for(const [family] of PACK_FAMILIES)assert.ok(packs.some(p=>p.family===family),family);
  assert.equal(packs.filter(p=>p.reference).length,6);
  assert.deepEqual(new Set(packs.map(p=>p.core.length)),new Set([1,2,4]));
  const pair=packs.find(p=>p.reference==='reference-paired');
  assert.deepEqual(pair.core.map(b=>b.map(n=>n.rest?-n.ticks:n.ticks)),[[6,3,3],[-3,3,6]]);
  const tail=packs.find(p=>p.reference==='reference-triplet-tail').core[0];
  assert.deepEqual(tail.map(n=>n.ticks),[6,2,2,2]);
  assert.deepEqual(tupletGroups(tail).map(g=>[g.start,g.end,g.count]),[[1,3,3]]);
});
test('every core and bar has exact integer duration and a composed, varied progression',()=>{
  for(const p of packs){
    assert.ok(validPattern(p),p.id);
    assert.equal(p.core.flat().reduce((s,n)=>s+units(n),0),p.core.length*420);
    assert.equal(p.stages.length,p.measures.length);
    assert.ok(p.measures.length>=5);
    assert.ok(new Set(p.stages).size>=3,p.id);
    assert.ok(new Set(p.measures.map(m=>JSON.stringify(m))).size>=p.measures.length-1,p.id);
    for(const bar of p.measures)assert.equal(bar.flat().reduce((s,n)=>s+units(n),0),p.meter*420,p.id);
    assert.deepEqual(p.measures[0].slice(0,p.core.length),p.core,p.id);
    if(p.difficulty==='easy')assert.ok(p.measures.flat(2).every(n=>n.ticks>=6&&!n.tuplet));
    if(p.difficulty==='medium')assert.ok(p.measures.flat(2).every(n=>!n.tuplet&&n.ticks!==4));
  }
});
test('tuplet notation and timing encode the real ratio; invalid labels or incomplete groups are rejected',()=>{
  for(const count of [3,5,6,7]){
    for(const rests of [[],[0],[Math.floor(count/2)],[count-1]]){
      const beat=tuplet(count,rests);assert.ok(validBeat(beat));
      assert.equal(beat.reduce((s,n)=>s+units(n),0),420);
      assert.equal(units(beat[0]),420/count);
      assert.equal(writtenTicks(beat[0]),count===3?6:3);
      const bad=clone(beat);bad[0].ticks=3;assert.equal(validBeat(bad),false);
      assert.equal(validBeat(beat.slice(1)),false);
      const badRatio=clone(beat);badRatio[0].tuplet.normal=1;assert.equal(validBeat(badRatio),false);
    }
    assert.ok(packs.some(p=>p.core.some(b=>tupletGroups(b).some(g=>g.count===count))));
    assert.ok(packs.some(p=>p.core.some(b=>tupletGroups(b).some(g=>g.count===count)&&b.some(n=>n.rest))));
  }
});
test('all packs schedule exact sounding onsets at 30, 73, 120 and 240 BPM across two loops',()=>{
  for(const original of packs)for(const bpm of [30,73,120,240]){
    const p={...original,bpm,click:false,countIn:false};const events=timeline(p);
    const total=p.meter*p.measures.length*12;const seconds=total*5/bpm;
    const ctx={currentTime:0};const engine=new RhythmTransport(ctx,{},()=>{});
    engine.configure(p);engine.anchorTick=0;engine.anchorTime=0;engine.next=0;
    const actual=[];engine.sound=(at,tone)=>{if(at<2*seconds-1e-8)actual.push({at,tone});};
    for(let time=0;time<2*seconds;time+=.031){ctx.currentTime=time;engine.schedule();}
    const expected=[0,1].flatMap(cycle=>events.filter(e=>!e.rest&&!e.continuation).map(e=>(cycle*total+e.at)*5/bpm));
    assert.equal(actual.length,expected.length,`${p.id}@${bpm}`);
    actual.forEach((event,i)=>{assert.ok(Math.abs(event.at-expected[i])<1e-8,`${p.id}@${bpm} #${i}`);assert.equal(event.tone,p.tone);});
  }
});
test('highlight and cursor use the identical event duration for notes, rests and tuplets',()=>{
  for(const p of packs)for(const event of timeline(p)){
    const pos=positionAt(p,event.at);assert.equal(pos.event.index,event.index,p.id);assert.equal(pos.event.beat,event.beat);
    const x=beatPositions(p.measures[event.measure][event.beat],event.beat,p.meter)[event.index];
    assert.equal(scoreCursorX(p.measures[event.measure],p.meter,pos),x);
    const mid=positionAt(p,event.at+event.ticks/2);assert.ok(scoreCursorX(p.measures[event.measure],p.meter,mid)>x);
  }
});
test('user copies and blank packs persist without modifying any built-in original',()=>{
  const original=packs.find(p=>p.id==='pack-7-even'),before=JSON.stringify(original);
  const copy=copyPack(original);copy.core[0][0].rest=true;copy.measures[0][0][1].rest=true;
  assert.notEqual(copy.id,original.id);assert.equal(copy.source,'user');assert.equal(JSON.stringify(original),before);
  const blank=blankPack();assert.ok(validPattern(blank));assert.ok(blank.measures.flat(2).every(n=>n.rest));
  const roundtrip=readStore({getItem:()=>JSON.stringify({patterns:[copy,blank],draft:copy})});
  assert.deepEqual(roundtrip.patterns,[copy,blank]);assert.deepEqual(roundtrip.draft,copy);
  const bad=clone(blank);bad.core=[clone(BEATS[2])];bad.core[0][0].tie=true;assert.equal(validPattern(bad),false);
});
test('ties across beat and bar boundaries suppress the continuation attack',()=>{
  for(const p of packs.filter(p=>p.family==='ties')){
    assert.ok(timeline(p).some(e=>e.continuation&&e.beat===0));
    assert.ok(timeline(p).some(e=>e.continuation&&e.beat!==0));
    assert.equal(p.core.length,2);
  }
});
