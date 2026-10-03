import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankMeasure,ticksOf} from '../src/etudes/scoreModel.js';
import {compileScoreDocument} from '../src/etudes/scoreDocument.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {applyArpeggio,planArpeggio,ARPEGGIO_PATTERNS,arpeggioPresets,arpeggioBarChord,arpeggioFitsMeter} from '../src/etudes/arpeggioPattern.js';
import {OPEN_CHORD_SHAPES} from '../src/etudes/openChordStudies.js';
import {applyPicking} from '../src/etudes/editorCommands.js';

const score=names=>({...createBlankDocument(),measures:names.map(name=>({...blankMeasure(),harmony:name}))});
const strings=bar=>bar.events.map(e=>e.notes.map(n=>n.string));

test('C, G and D use their actual bass string and retain chord frets through repetitions',()=>{
 const d=score(['C','G','D']),before=structuredClone(d),next=applyArpeggio(d,{end:2});
 assert.deepEqual(d,before);
 for(const [i,bass,frets] of [[0,5,[3,0,0,0]],[1,6,[3,0,3,0]],[2,4,[0,2,2,2]]]){
  const events=next.measures[i].events;
  assert.deepEqual(strings(next.measures[i]),[bass,3,1,3,bass,3,1,3].map(s=>[s]));
  assert.deepEqual(events.map(e=>e.notes[0].fret),[...frets,...frets]);
  assert.deepEqual(events.slice(0,4).map(e=>e.notes[0].rightFinger),['p','i','a','i']);
  assert.equal(events.reduce((sum,e)=>sum+ticksOf(e),0),1920);
 }
 assert.deepEqual(compileScoreDocument(next).errors,[]);
});

test('all patterns and all provided chord presets compile with audible timeline events',()=>{
 for(const p of ARPEGGIO_PATTERNS)for(const name of arpeggioPresets(createBlankDocument())){
  const d=score([name]);if(p.steps.length===6){d.meter=[6,8];d.measures=[{...blankMeasure(d.meter),harmony:name}];}
  const next=applyArpeggio(d,{chord:name,pattern:p.id}),result=compileScoreDocument(next);
  assert.deepEqual(result.errors,[],`${p.id} ${name}`);
  const timeline=scoreTimeline(result.score);
  assert(timeline.events.length>0,`${p.id} ${name} audio`);
  const ids=next.measures.flatMap(m=>m.events.flatMap(e=>[e.id,...e.notes.map(n=>n.id)]));
  assert.equal(new Set(ids).size,ids.length);
 }
});

test('123 is a simultaneous three-string pinch and slap is a dead-note hit in playback',()=>{
 const next=applyArpeggio(score(['C']),{pattern:'bass-slap'}),bar=next.measures[0];
 assert.deepEqual(strings(bar),[[5],[1,2,3],[1,2,3],[1,2,3],[5],[1,2,3],[1,2,3],[1,2,3]]);
 assert.deepEqual(bar.events.map(e=>e.onset),[0,240,480,720,960,1200,1440,1680]);
 assert.deepEqual(bar.events[1].notes.map(n=>n.fret),[0,1,0]);
 assert(bar.events[2].notes.every(n=>n.dead));
 assert(bar.events[1].notes.every(n=>!n.dead));
 const timeline=scoreTimeline(compileScoreDocument(next).score);
 assert.equal(timeline.events.filter(e=>e.dead).length,6);
 assert.deepEqual([...new Set(timeline.events.filter(e=>e.dead).map(e=>e.start))],[1,3]);
});

test('range replacement keeps unaffected bars, repeat metadata and removes incoming stale connections',()=>{
 const d=score(['C','D','G']);d.measures[1].repeatEnd=2;
 const prior=d.measures[0].events.at(-1),target=d.measures[1].events[0];
 prior.tieTo=target.id;prior.slurTo=target.id;prior.technique='H';
 const next=applyArpeggio(d,{start:1,end:1});
 assert.equal(next.measures[2],d.measures[2]);
 assert.equal(next.measures[0].events[0],d.measures[0].events[0]);
 assert.equal(next.measures[0].events.at(-1).tieTo,null);
 assert.equal(next.measures[0].events.at(-1).slurTo,null);
 assert.equal(next.measures[0].events.at(-1).technique,null);
 assert.equal(next.measures[1].id,d.measures[1].id);
 assert.equal(next.measures[1].repeatEnd,2);
});

test('custom inversions, altered tuning and capo use the explicit shape with correct sounding pitches',()=>{
 const d=score([null]);d.capo=2;d.tuning[5]=38;
 d.measures[0].chord={name:'C/E',frets:[2,3,2,0,1,0],fingers:[null,3,2,null,1,null]};
 assert.deepEqual(arpeggioPresets(d),[]);
 const next=applyArpeggio(d,{}),notes=next.measures[0].events.map(e=>e.notes[0]);
 assert.equal(notes[0].string,6);assert.equal(notes[0].midi,42);
 assert.equal(notes[2].midi,66);
 assert.deepEqual(compileScoreDocument(next).errors,[]);
});

test('invalid later bars reject the whole operation instead of silently dropping notes or changing earlier bars',()=>{
 const d=score(['C','unknown']),before=structuredClone(d);
 assert.throws(()=>applyArpeggio(d,{end:1}),/2마디/);assert.deepEqual(d,before);
 d.measures[1].chord={name:'partial',...OPEN_CHORD_SHAPES.C,frets:[null,3,2,0,1,null]};
 assert.throws(()=>applyArpeggio(d,{end:1}),/연주 줄/);
 const meters=score(['C','G']);meters.measures[1].meter=[3,4];
 assert.throws(()=>applyArpeggio(meters,{end:1}),/2마디.*박자/);
 assert.throws(()=>applyArpeggio(score(['C']),{pattern:'bass-32123'}),/박자/);
 assert.throws(()=>applyArpeggio(score(['C']),{start:2}),/범위/);
 assert.throws(()=>applyArpeggio(score(['C']),{pattern:'unknown'}),/패턴/);
 assert.throws(()=>applyArpeggio({...score(['C']),instrument:'bass'}),/6현/);
});

test('six-note cycles repeat exactly across 3/4 and 6/8 and respect inherited meter changes',()=>{
 const d=score(['C','G','D']);d.meter=[3,4];d.measures[1].meter=[6,8];
 const next=applyArpeggio(d,{pattern:'bass-32123',end:2});
 assert.deepEqual(next.measures.map(m=>m.events.length),[6,6,6]);
 assert.deepEqual(compileScoreDocument(next).errors,[]);
 assert(arpeggioFitsMeter('bass-32123',[6,8]));
 assert(!arpeggioFitsMeter('bass-32123',[4,4]));
});

test('duration is owned by the preset and an old duration argument cannot change its rhythm',()=>{
 for(const p of ARPEGGIO_PATTERNS){
  const d=score(['G']);if(p.steps.length===6)d.meter=[6,8];
  const next=applyArpeggio(d,{pattern:p.id,duration:'16'});
  assert(next.measures[0].events.every(e=>e.duration===p.duration));
 }
});

test('a melody-only imported bar needs a score chord name, never an all-bars override',()=>{
 const d=score([null]);d.measures[0].pdfImport={needsReview:true,source:{notation:true}};
 d.measures[0].events[0]={...d.measures[0].events[0],blank:false,rest:false,notes:[{string:1,fret:7,id:'melody-b'}]};
 const before=structuredClone(d);
 assert.equal(arpeggioBarChord(d,0),null);
 assert.throws(()=>applyArpeggio(d,{chord:'Am'}),/코드명/);
 assert.deepEqual(d,before);
 d.measures[0].harmony='G';
 const next=applyArpeggio(d);
 assert.deepEqual(strings(next.measures[0]),[6,3,1,3,6,3,1,3].map(s=>[s]));
 assert.deepEqual(compileScoreDocument(next).errors,[]);
 assert.equal(next.measures[0].pdfImport.needsReview,false);
 assert.equal(next.measures[0].pdfImport.generatedBy,'arpeggio-pattern');
 assert.deepEqual(compileScoreDocument(next).issues,[]);
});

test('preview is read-only and ordinary picking continues to change marks only',()=>{
 const d=score(['C']),before=structuredClone(d);
 assert.equal(planArpeggio(d)[0].repeats,2);assert.deepEqual(d,before);
 const next=applyArpeggio(d),picked=applyPicking(next,{pattern:'alternate-down'});
 assert.deepEqual(picked.measures[0].events.map(({pickStroke,...e})=>e),next.measures[0].events);
 assert.deepEqual(picked.measures[0].events.map(e=>e.pickStroke),['down','up','down','up','down','up','down','up']);
});


test('entire-score application follows changes and inherited names, ignoring an obsolete global chord option',()=>{
 const d=score(['G','Am',null,'D7',null,'G']),before=structuredClone(d);
 const next=applyArpeggio(d,{end:5,chord:'Am'});
 assert.deepEqual(next.measures.map(m=>m.harmony),before.measures.map(m=>m.harmony));
 assert(next.measures.every(m=>m.chord===null));
 assert.deepEqual(next.measures.map(m=>m.events[0].notes[0].string),[6,5,5,4,4,6]);
 assert.deepEqual(next.measures.map(m=>m.events[2].notes[0].fret),[3,0,0,2,2,3]);
 assert.equal(planArpeggio(d,{start:2})[0].shape.name,'Am');
 assert.deepEqual(d,before);
});

test('mid-bar chord changes preserve pattern phase and names, N.C. stops accompaniment until a new chord',()=>{
 const d=score(['G',null,'N.C.',null,'C']);
 d.measures[0].harmonyChanges=[{onset:0,name:'G'},{onset:960,name:'Am'}];
 const next=applyArpeggio(d,{end:4,pattern:'bass-slap'});
 assert.equal(next.measures[0].events[0].notes[0].string,6);
 assert.equal(next.measures[0].events[4].notes[0].string,5);
 assert.equal(next.measures[1].events[0].notes[0].string,5);
 assert(next.measures.slice(2,4).every(m=>m.events.every(e=>e.rest&&!e.blank&&!e.notes.length)));
 assert.equal(next.measures[4].events[0].notes[0].fret,3);
 assert.deepEqual(next.measures[0].harmonyChanges,d.measures[0].harmonyChanges);
 assert.deepEqual(compileScoreDocument(next).errors,[]);
 d.measures[0].harmonyChanges[1].needsReview=true;
 assert.throws(()=>applyArpeggio(d,{end:4}),/코드 변경 위치/);
});
