import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankEvent,compileDocumentV2,cloneMeasures} from '../src/etudes/scoreModel.js';
import {scorePlaybackReadiness} from '../src/etudes/scorePlaybackReadiness.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {editWholeBeat} from '../src/etudes/scoreBeatCommands.js';
import {scoreRangeSelection} from '../src/etudes/scoreRangeClipboard.js';
const imported=()=>{const d=createBlankDocument();d.measures[0].pdfImport={needsReview:true};d.measures[0].events[0]={...blankEvent(0,'8'),blank:false,rest:false,notes:[{id:crypto.randomUUID(),string:6,fret:3}]};return d;};
const ready=d=>scorePlaybackReadiness(d,compileDocumentV2(d));
test('PDF review and missing time allow audible known frets without mutating review or inventing pitches',()=>{
 const d=imported(),before=JSON.stringify(d),compiled=compileDocumentV2(d);
 assert.ok(compiled.issues.length);assert.deepEqual(ready(d),{allowed:true,preview:true});assert.equal(JSON.stringify(d),before);
 const timeline=scoreTimeline(compiled.score,60);assert.equal(timeline.events.length,1);assert.equal(timeline.events[0].midi,43);
 assert.equal(compiled.score.measures[0][0].pitch.letter,'G');assert.equal(compiled.score.measures[0][0].pitch.octave,2);
});
test('normal unfinished score remains blocked; imported structural errors also remain blocked',()=>{
 const ordinary=imported();delete ordinary.measures[0].pdfImport;ordinary.measures[0].events.pop();assert.equal(ready(ordinary).allowed,false);
 for(const breakScore of [d=>d.measures[0].events[0].notes[0].fret=99,d=>d.measures[0].events[1].onset=0,d=>d.measures[0].events[0].tieTo='missing',d=>d.measures[0].events[0].duration='1']){
  const d=imported();breakScore(d);assert.equal(ready(d).allowed,false);
 }
});
test('only event provenance is sufficient after copying imported events into another document',()=>{
 const d=imported();delete d.measures[0].pdfImport;d.measures[0].events[0].pdfImport={status:'unresolved'};assert.equal(ready(d).preview,true);
});
test('beat slicing of a long sounding note creates unique tone identities and remains compilable',()=>{
 const d=imported();d.measures[0].events[0].duration='1';d.measures[0].events=d.measures[0].events.slice(0,1);
 for(const copy of [false,true]){const next=editWholeBeat(d,{bar:0,event:0,string:6},{copy}).document;assert.deepEqual(compileDocumentV2(next).errors,[]);assert.equal(ready(next).allowed,true);}
});
test('cloned triplet group cannot expand a range selection into the original bar',()=>{
 const d=createBlankDocument();d.measures[0].events=[0,160,320].map(onset=>({...blankEvent(onset,'8'),tuplet:{groupId:'original',actualNotes:3,normalNotes:2}}));
 d.measures.push(...cloneMeasures(d.measures));const range=scoreRangeSelection(d,{start:{bar:1,event:0},end:{bar:1,event:0}});
 assert.equal(range.items.length,3);assert.ok(range.items.every(x=>x.bar===1));assert.notEqual(d.measures[1].events[0].tuplet.groupId,'original');
});
