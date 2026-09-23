import test from 'node:test';
import assert from 'node:assert/strict';
import {compositionSketch as score,SKETCH_VOICINGS,SKETCH_SECTIONS} from '../src/etudes/compositionSketch.js';
import {CHORD_TONE_INTERVALS as theory} from '../src/chords/chordTheory.js';
import {compileScoreDocument,toScoreDocument} from '../src/etudes/scoreDocument.js';
import {ticksOf} from '../src/etudes/scoreModel.js';
import {guitarVoiceTimeline,scoreTimeline} from '../src/etudes/scorePlayback.js';
import {chordCandidateDetails} from '../src/etudes/scoreChordDiagram.js';
import {rhythmGroups} from '../src/etudes/tabRhythm.js';
const roots={A:9,B:11,C:0,D:2,E:4,F:5,G:7};
const expected=name=>{
 const [chord,bass]=name.split('/'),suffix=chord.slice(1),minor=suffix.startsWith('m')&&!suffix.startsWith('maj');
 const type=suffix==='m'?'none':suffix==='m(add9)'?'add9':suffix||'none';
 return new Set([...theory[minor?'minor':'major'][type].map(n=>(n+roots[chord[0]])%12),...(bass?[roots[bass]]:[])]);
};
test('49 authored bars match complete chord tone sets, playable grips and exact rhythm',()=>{
 assert.equal(score.measures.length,49);
 score.document.measures.forEach((m,b)=>{
  assert.equal(m.events.reduce((s,e)=>s+ticksOf(e),0),1920,`bar ${b+1}`);
  for(const group of rhythmGroups(m.events)){
   assert.equal(new Set(group.map(i=>Math.floor(m.events[i].onset/480))).size,1,'beam stays within its beat');
   assert.ok(group.every(i=>!m.events[i].rest&&Number(m.events[i].duration)>=8));
  }
  for(const [index,v] of m.sketchVoicings.entries()){
   const wanted=expected(v.name),actual=new Set(v.frets.flatMap((f,i)=>f===null?[]:[(score.tuning[5-i]+f)%12]));
   assert.deepEqual(actual,wanted,v.key);
   const pressed=v.frets.filter(f=>f>0);assert.ok(Math.max(...pressed)-Math.min(...pressed)<=3,v.key);
   const events=m.events.filter(e=>!e.rest&&(m.sketchVoicings.length===1||Math.floor(e.onset/960)===index));
   const sounded=new Set(events.flatMap(e=>e.notes.map(n=>{
    assert.equal(n.fret,v.frets[6-n.string]);assert.ok(Number.isInteger(n.fret));return (score.tuning[n.string-1]+n.fret)%12;
   })));
   assert.deepEqual(sounded,wanted,`bar ${b+1} ${v.name} all characteristic tones audible`);
  }
 });
 assert.ok(new Set(score.measures.map(m=>m.map(e=>`${e.rest?'r':''}${e.duration}`).join(','))).size>20);
});
test('editable round trip and every playback attack preserve timing, final ring survives rests',()=>{
 const result=compileScoreDocument(JSON.parse(JSON.stringify(toScoreDocument(score))),score);
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.issues,[]);
 const timeline=scoreTimeline(result.score),voices=guitarVoiceTimeline(result.score);
 assert.equal(timeline.duration,49*4*60/64);
 assert.equal(timeline.events.length,score.document.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).length);
 for(const v of timeline.events){assert.ok(Number.isFinite(v.midi));assert.ok(v.duration>0);}
 for(const v of voices.voices.filter(v=>v.bar===48))assert.equal(v.start+v.duration,timeline.duration);
 assert.equal(voices.order.length,49);
 const densities=SKETCH_SECTIONS.map(([,start,count])=>score.measures.slice(start,start+count).reduce((s,m)=>s+m.filter(e=>!e.rest).length,0)/count);
 assert.ok(densities[0]<densities[1]&&densities[1]<densities[2]);assert.ok(densities[4]<densities[3]&&densities[5]>densities[3]&&densities[6]<densities[5]);
});
test('sus resolutions and both legitimate E7 candidates agree with chord engine',()=>{
 for(const b of [3,27,43,47]){
  const m=score.document.measures[b],string=b===3?3:2;
  const a=m.events.filter(e=>e.onset<960).flatMap(e=>e.notes).find(n=>n.string===string);
  const z=m.events.filter(e=>e.onset>=960).flatMap(e=>e.notes).find(n=>n.string===string);
  assert.equal(a.fret-z.fret,1);
 }
 for(const frets of [[0,2,0,1,0,0],[0,2,2,1,3,0]])assert.ok(chordCandidateDetails(score.document,frets).some(c=>c.name==='E7'&&!c.missing&&!c.extra));
 assert.equal(Object.keys(SKETCH_VOICINGS).length,29);
});

