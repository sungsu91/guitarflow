import test from 'node:test';
import assert from 'node:assert/strict';
import {techniqueScores} from './fixtures/guitar-technique-scores.mjs';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {guitarVoiceTimeline,scoreTimeline,voicesFrom} from '../src/etudes/scorePlayback.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';

for(const {id,document} of techniqueScores())test(`${id}: compiled display data shares pitches with independent playback voices`,()=>{
  const r=compileDocumentV2(document);assert.deepEqual(r.errors,[]);assert.deepEqual(r.issues,[]);
  const before=JSON.stringify(document),plan=guitarVoiceTimeline(r.score);
  assert.equal(plan.voices.length,['picked','slide'].includes(id)?2:1);
  assert.equal(plan.voices[0].segments.length,['picked','tie'].includes(id)?1:2);
  assert.equal(plan.voices[0].duration,['picked','slide'].includes(id)?2/3:4/3);
  assert.equal(plan.voices[0].midi,55+document.measures[0].events[0].notes[0].fret);
  assert.equal(JSON.stringify(document),before);
  const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  assert.ok(saveLibraryDocument(storage,document).saved);
  assert.deepEqual(guitarVoiceTimeline(compileDocumentV2(loadLibrary(storage).records[document.id].document).score),plan);
  const seek=voicesFrom(plan,2/3);assert.equal(seek.length,1);assert.equal(seek[0].start,2/3);assert.equal(seek[0].midi,55+document.measures[0].events[1].notes[0].fret);
});
test('chord ties sustain each string independently across barlines',()=>{
 const tone=(string,midi)=>({string,midi,fret:5});
 const score={bpm:60,meter:[1,4],measures:[[{id:'a',duration:'4',onset:0,tones:[tone(3,60),tone(2,64)],tieTo:'b'}],[{id:'b',duration:'4',onset:0,tones:[tone(3,60),tone(2,64)]}]]};
 const plan=guitarVoiceTimeline(score);assert.equal(plan.voices.length,2);assert.deepEqual(plan.voices.map(v=>[v.string,v.duration]),[[3,2],[2,2]]);
});
test('parallel string stays picked while another string connects; gaps and invalid direction never join',()=>{
 const a={id:'a',onset:0,duration:'4',string:3,fret:5,midi:60,technique:'H'};
 const b={id:'b',onset:480,duration:'4',string:3,fret:7,midi:62};
 const score={bpm:60,meter:[4,4],measures:[[a,{id:'c',onset:0,duration:'4',string:2,fret:5,midi:64},b]]};
 let plan=guitarVoiceTimeline(score);assert.equal(plan.voices.length,2);assert.equal(plan.voices[0].segments.length,2);assert.equal(plan.voices[1].segments.length,1);
 b.onset=960;assert.equal(guitarVoiceTimeline(score).voices.length,3);
 b.onset=480;b.midi=59;assert.equal(guitarVoiceTimeline(score).voices.length,3);
});
test('broken tie does not fill a silent gap',()=>{
 const score={bpm:60,meter:[4,4],measures:[[{id:'a',onset:0,duration:'4',string:3,midi:60,tieTo:'b'},{id:'b',onset:960,duration:'4',string:3,midi:60}]]};
 assert.equal(scoreTimeline(score).events.length,2);
});
