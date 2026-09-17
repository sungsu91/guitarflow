import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankMeasure,blankEvent,compileDocumentV2,ticksOf} from '../src/etudes/scoreModel.js';
import {enterFret,setRest,setEventDuration,setDotted,enterFretWithDuration} from '../src/etudes/editorCommands.js';
import {inputRhythm} from '../src/etudes/rhythmInput.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
const cursor={bar:4,event:3,string:4};
function fixture(){let d=createBlankDocument();d.measures=Array.from({length:8},()=>blankMeasure());for(let event=0;event<3;event++)d=enterFret(d,{...cursor,event},[9,9,8][event]);d.measures[4].events[3]=blankEvent(1440,'8');return d;}
test('fifth bar accepts the fourth quarter when a short blank ends before the barline',()=>{
 const d=fixture(),before=structuredClone(d),result=inputRhythm(d,cursor,{selectedDuration:'4'},'note',8).document;
 assert.deepEqual(result.measures[4].events.map(e=>e.onset),[0,480,960,1440]);assert(result.measures[4].events.every(e=>ticksOf(e)===480));
 assert.deepEqual(result.measures[4].events.slice(0,3),d.measures[4].events.slice(0,3));assert.deepEqual(d,before);
 assert.strictEqual(result.measures[5],d.measures[5]);assert.deepEqual(compileDocumentV2(result).issues,[]);
 assert.equal(scoreTimeline(compileDocumentV2(result).score,60).events.at(-1).start,19);
});
test('sparse vacant subdivisions and stale picking on empty slots do not block entry',()=>{
 const d=fixture();d.measures[4].events[3]=blankEvent(1440,'16');d.measures[4].events.push({...blankEvent(1800,'16'),pickStroke:'down'});
 const result=enterFretWithDuration(d,cursor,8,'4');assert.equal(result.measures[4].events.length,4);assert.equal(ticksOf(result.measures[4].events[3]),480);
});
test('length changes use a raw gap without shifting the next sound',()=>{
 let d=fixture();d.measures[4].events=[...d.measures[4].events.slice(0,2),blankEvent(960,'8'),blankEvent(1680,'8')];
 d=enterFret(d,{...cursor,event:3},7);const following=d.measures[4].events[3];
 const next=setEventDuration(d,{...cursor,event:2},'4');assert.strictEqual(next.measures[4].events.at(-1),following);assert.equal(next.measures[4].events.at(-1).onset,1680);
 assert.throws(()=>setEventDuration(d,{...cursor,event:2},'2'),/겹칩니다/);
});
test('entered rests and sounds still block extension; short input remains available',()=>{
 for(const kind of ['note','rest']){let d=fixture();d.measures[4].events.push(blankEvent(1680,'8'));const at={...cursor,event:4};d=kind==='rest'?setRest(d,at):enterFret(d,at,5);const before=structuredClone(d);
  assert.throws(()=>inputRhythm(d,cursor,{selectedDuration:'4'},'note',8),/겹칩니다/);assert.deepEqual(d,before);
  const result=inputRhythm(d,cursor,{selectedDuration:'8'},'note',8).document;assert.strictEqual(result.measures[4].events[4],d.measures[4].events[4]);
 }
});
test('dotted input uses actual free time and still respects the bar boundary',()=>{
 const d=fixture();d.measures[4].events[3]=blankEvent(1440,'16');const eighth=setEventDuration(d,cursor,'8'),dotted=setDotted(eighth,cursor,true);assert.equal(ticksOf(dotted.measures[4].events[3]),360);
 assert.throws(()=>setDotted(setEventDuration(d,cursor,'4'),cursor,true),/마디 끝/);
});
test('an empty reserved tuplet slot still blocks a length change',()=>{
 const d=fixture();d.measures[4].events.push({...blankEvent(1680,'8'),tuplet:{groupId:'reserved',actualNotes:3,normalNotes:2}});
 assert.throws(()=>setEventDuration(d,cursor,'4'),/셋잇단/);
});
