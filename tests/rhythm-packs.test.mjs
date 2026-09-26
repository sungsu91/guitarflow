import test from 'node:test';
import assert from 'node:assert/strict';
import {builtinPacks,resizeFoundation,blankPack,copyPack,PACK_FAMILIES,LEVELS,STAGES,currentBuiltinDraft,BUILTIN_CURRICULUM_VERSION} from '../src/rhythm-trainer/packs.js';
import {validBeat,validPattern,timeline,positionAt,readStore,clone,BEATS} from '../src/rhythm-trainer/model.js';
import {tuplet,tupletGroups,units,writtenTicks} from '../src/rhythm-trainer/rhythmMath.js';
import {beatPositions,scoreCursorX} from '../src/rhythm-trainer/notationLayout.js';
import {RhythmTransport} from '../src/rhythm-trainer/transport.js';
globalThis.cancelAnimationFrame=()=>{};
const packs=builtinPacks();

test('every family has exactly three distinct lessons per level, including six reference motifs',()=>{
  assert.equal(packs.length,PACK_FAMILIES.length*LEVELS.length*3);
  assert.equal(new Set(packs.map(p=>JSON.stringify(p.measures))).size,packs.length);
  for(const [family] of PACK_FAMILIES)for(const [level] of LEVELS){
    const lessons=packs.filter(p=>p.family===family&&p.difficulty===level);
    assert.deepEqual(lessons.map(p=>p.levelOrder),[1,2,3],`${family}/${level}`);
    assert.ok(lessons.every(p=>p.objective&&p.curriculumVersion===BUILTIN_CURRICULUM_VERSION));
  }
  assert.equal(new Set(packs.map(p=>p.id)).size,packs.length);
  for(const [family] of PACK_FAMILIES)assert.ok(packs.some(p=>p.family===family),family);
  assert.equal(packs.filter(p=>p.reference).length,6);
  assert.deepEqual(new Set(packs.map(p=>p.core.length)),new Set([1,2]));
  const pair=packs.find(p=>p.reference==='reference-paired');
  assert.deepEqual(pair.core.map(b=>b.map(n=>n.rest?-n.ticks:n.ticks)),[[6,3,3],[-3,3,6]]);
  const tail=packs.find(p=>p.reference==='reference-triplet-tail').core[0];
  assert.deepEqual(tail.map(n=>n.ticks),[6,2,2,2]);
  assert.deepEqual(tupletGroups(tail).map(g=>[g.start,g.end,g.count]),[[1,3,3]]);
});
test('every core and bar has exact duration and the advertised motif occurs in the lesson',()=>{
  for(const p of packs){
    assert.ok(validPattern(p),p.id);
    assert.equal(p.core.flat().reduce((s,n)=>s+units(n),0),p.core.length*420);
    assert.equal(p.stages.length,p.measures.length);
    assert.ok(p.stages.every(stage=>STAGES[stage]?.length===2),p.id);
    assert.ok(p.measures.length>=4);
    assert.equal(p.measures.length,4,p.id);
    for(const bar of p.measures)assert.equal(bar.flat().reduce((s,n)=>s+units(n),0),p.meter*420,p.id);
    const beats=p.measures.flat();
    assert.ok(beats.some((_,i)=>JSON.stringify(beats.slice(i,i+p.core.length))===JSON.stringify(p.core)),p.id);
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
  for(const p of packs.filter(p=>p.family==='ties'&&p.learningStep==='application')){
    assert.ok(timeline(p).some(e=>e.continuation&&e.beat===0));
    assert.ok(timeline(p).some(e=>e.continuation&&e.beat!==0));
    assert.equal(p.core.length,2);
  }
});

test('difficulty changes notation and phrasing, not only BPM or labels',()=>{
 const notes=p=>p.measures.flat(2);
 for(const family of ['basic','sixteenth']){
  const easy=packs.filter(p=>p.family===family&&p.difficulty==='easy');
  assert.ok(easy.every(p=>notes(p).every(n=>!n.rest&&!n.tie&&!n.tuplet)),family);
  assert.ok(easy.every(p=>new Set(p.measures.map(JSON.stringify)).size===1),family);
  const middle=packs.filter(p=>p.family===family&&p.difficulty==='medium');
  assert.ok(middle.some(p=>notes(p).some(n=>n.rest)),family);
  assert.ok(middle.every(p=>notes(p).filter(n=>n.rest).length<=2),family);
 }
 // The basic family stays within quarter/eighth durations, even at the top level.
 for(const p of packs.filter(p=>p.family==='basic'))assert.ok(notes(p).every(n=>[6,12].includes(n.ticks)&&!n.tie&&!n.tuplet),p.id);
 for(const [family,count] of [['quintuplet',5],['sextuplet',6],['septuplet',7]]){
  for(const p of packs.filter(p=>p.family===family)){
   assert.ok(notes(p).every(n=>!n.rest&&!n.tie),p.id);
   assert.deepEqual([...new Set(notes(p).filter(n=>n.tuplet).map(n=>n.tuplet.count))],[count],p.id);
   const plain=notes(p).filter(n=>!n.tuplet);
   if(p.difficulty==='easy')assert.ok(plain.every(n=>n.ticks===12),p.id);
   if(p.difficulty==='medium')assert.ok(plain.every(n=>n.ticks>=6),p.id);
   if(p.difficulty==='hard')assert.ok(plain.some(n=>n.ticks===3),p.id);
  }
 }
});

test('retired built-in drafts refresh without modifying any saved user pack',()=>{
 const old={...clone(packs[0]),curriculumVersion:undefined,title:'Old title'};
 const before=JSON.stringify(old);
 const fresh=currentBuiltinDraft(old,packs);
 assert.equal(fresh.id,old.id);assert.equal(fresh.curriculumVersion,BUILTIN_CURRICULUM_VERSION);
 assert.equal(JSON.stringify(old),before);assert.notEqual(fresh,packs[0]);
 const retired={...old,id:'pack-7-rest-3',family:'septuplet'};
 const replacement=currentBuiltinDraft(retired,packs);
 assert.equal(replacement.family,'septuplet');assert.equal(replacement.difficulty,'easy');
 const copy=copyPack(retired);assert.equal(currentBuiltinDraft(copy,packs),copy);
 assert.equal(currentBuiltinDraft(packs[0],packs),packs[0]);
 assert.equal(currentBuiltinDraft(undefined,packs),undefined);
});

test('English and Korean use identical music, identifiers and difficulty',()=>{
 const en=builtinPacks('en');
 assert.equal(en.length,packs.length);
 packs.forEach((p,i)=>{assert.equal(p.id,en[i].id);assert.equal(p.difficulty,en[i].difficulty);assert.deepEqual(p.measures,en[i].measures);assert.ok(en[i].objective);});
});

test('foundations are curated, start at four bars and resize without mutating originals',()=>{
 const basics=packs.filter(p=>p.learningStep==='foundation');
 assert.ok(basics.every(p=>p.measures.length===4));
 assert.ok(!basics.some(p=>/7-rest/.test(p.id)));
 for(const p of basics)for(const count of [1,3,5,16]){
  const resized=resizeFoundation(p,count);
  assert.equal(resized.measures.length,count);assert.ok(validPattern(resized));assert.equal(p.measures.length,4);
 }
});
