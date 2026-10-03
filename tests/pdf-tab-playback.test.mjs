import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankEvent,compileDocumentV2,cloneMeasures} from '../src/etudes/scoreModel.js';
import {scorePlaybackReadiness} from '../src/etudes/scorePlaybackReadiness.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {editWholeBeat} from '../src/etudes/scoreBeatCommands.js';
import {scoreRangeSelection} from '../src/etudes/scoreRangeClipboard.js';
import {playbackSlots,seekTick} from '../src/etudes/scorePlaybackPosition.js';
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

function staffOverflow(){
 const d=imported();
 d.measures[0].pdfImport={needsReview:true,source:{notation:true}};
 d.measures.push(...cloneMeasures(d.measures),...cloneMeasures(d.measures));
 const second=d.measures[1];second.events=[...second.events,...cloneMeasures([second])[0].events];
 second.events.forEach((e,i)=>{e.onset=i*480;e.duration='4';});
 return d;
}
test('overfull unreviewed staff bar is silent only in a preview; surrounding notes and source remain intact',()=>{
 const d=staffOverflow(),before=structuredClone(d),result=ready(d);
 assert.equal(result.allowed,true);assert.equal(result.preview,true);assert.deepEqual(result.mutedMeasures,[1]);assert.deepEqual(d,before);
 const timeline=scoreTimeline(result.score,60);
 assert.deepEqual(timeline.events.map(e=>e.bar),[0,2]);assert.deepEqual(timeline.events.map(e=>e.midi),[43,43]);
 assert.equal(timeline.events[1].start,8);assert.equal(result.score.document,d);
 assert.equal(result.score.measures[0][0].notes[0].id,d.measures[0].events[0].notes[0].id);
 assert(result.score.measures[1].every(e=>e.rest&&!e.blank));
 const slots=playbackSlots(result.score,timeline.order);
 assert.equal(seekTick(slots,{bar:1,event:7}),1920);assert.equal(seekTick(slots,{bar:2,event:0}),3840);
});
test('correcting an imported overfull bar restores its audio automatically',()=>{
 const d=staffOverflow();d.measures[1].events=d.measures[1].events.slice(0,4);
 const result=ready(d);assert.equal(result.allowed,true);assert.equal(result.mutedMeasures,undefined);
 assert(scoreTimeline(compileDocumentV2(d).score,60).events.some(e=>e.bar===1));
});
test('partial preview does not bypass overlapping events, invalid frets, or reviewed overflows',()=>{
 for(const mutate of [d=>d.measures[1].events[1].onset=0,d=>d.measures[1].events[0].notes[0].fret=99,d=>d.measures[1].pdfImport.needsReview=false]){
  const d=staffOverflow();mutate(d);assert.equal(ready(d).allowed,false);
 }
 const only=staffOverflow();only.measures=[only.measures[1]];assert.equal(ready(only).allowed,false);
});
