import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankMeasure,compileDocumentV2,isBlankEvent} from '../src/etudes/scoreModel.js';
import {inputRhythm} from '../src/etudes/rhythmInput.js';
import {setRest,setEventDuration} from '../src/etudes/editorCommands.js';
import {toggleEntryTie,tieAtCursor} from '../src/etudes/scoreTieCommands.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';

const at=(event,bar=0)=>({bar,event,string:5});
const enter=(document,cursor,duration='8',fret=3)=>inputRhythm(document,cursor,{selectedDuration:duration},'note',fret).document;
test('offbeat eighth ties into the first sixteenth without skipping the remaining three',()=>{
 let d=enter(createBlankDocument(),at(0));d=enter(d,at(1));
 const before=structuredClone(d),source=d.measures[0].events[1];
 d=toggleEntryTie(d,at(2),'16');
 for(let i=3;i<=5;i++)d=enter(d,at(i),'16',i-1);
 const events=d.measures[0].events;
 assert.deepEqual(events.slice(0,6).map(e=>[e.onset,e.duration]),[[0,'8'],[240,'8'],[480,'16'],[600,'16'],[720,'16'],[840,'16']]);
 assert.equal(events[1].tieTo,events[2].id);assert.equal(events[2].notes[0].fret,3);assert.notEqual(events[2].notes[0].id,source.notes[0].id);
 assert.deepEqual(before.measures[0].events[1],source);assert(tieAtCursor(d,at(2)));
 const compiled=compileDocumentV2(d);assert.deepEqual(compiled.errors,[]);assert.deepEqual(compiled.issues,[]);
 const timeline=scoreTimeline(compiled.score,60).events;
 assert.equal(timeline.length,5);assert.equal(timeline[1].start,.5);assert.equal(timeline[1].duration,.75);assert.equal(timeline[2].start,1.25);
});
test('tie toggle preserves both notes and lets the continuation be played separately',()=>{
 let d=enter(createBlankDocument(),at(0));d=toggleEntryTie(d,at(1),'16');
 const held=d.measures[0].events[1];d=toggleEntryTie(d,at(1),'16');
 assert(!tieAtCursor(d,at(1)));assert.strictEqual(d.measures[0].events[1],held);
 assert.equal(scoreTimeline(compileDocumentV2(d).score).events.length,2);
 d=toggleEntryTie(d,at(0),'8');assert(tieAtCursor(d,at(0)));d=toggleEntryTie(d,at(0),'8');assert(!tieAtCursor(d,at(0)));
});
test('a chord continuation copies every pitch with fresh tone identities and no second picking mark',()=>{
 let d=enter(createBlankDocument(),at(0));d=enter(d,{...at(0),string:2},'8',0);
 d.measures[0].events[0].pickStroke='down';d=toggleEntryTie(d,at(1),'16');
 assert.deepEqual(d.measures[0].events[1].notes.map(n=>[n.string,n.fret]),[[5,3],[2,0]]);
 assert.equal(d.measures[0].events[1].pickStroke,null);
 const timeline=scoreTimeline(compileDocumentV2(d).score).events;assert.equal(timeline.length,2);assert(timeline.every(e=>e.duration===.75));
});
test('a tie can continue across the barline, preserving the next bar and its identity',()=>{
 let d=createBlankDocument();d.measures.push(blankMeasure());d=enter(d,at(3),'4');const id=d.measures[1].id;
 d=toggleEntryTie(d,at(0,1),'16');assert.equal(d.measures[0].events[3].tieTo,d.measures[1].events[0].id);assert.equal(d.measures[1].id,id);
 const result=compileDocumentV2(d);assert.deepEqual(result.issues,[]);const sounds=scoreTimeline(result.score).events;assert.equal(sounds.length,1);assert.equal(sounds[0].duration,1.25);
});
test('ties never fill a leading blank, replace an explicit rest or overwrite a different pitch',()=>{
 const blank=createBlankDocument();assert.throws(()=>toggleEntryTie(blank,at(0),'16'),/바로 앞에/);
 let d=enter(blank,at(0));d=setRest(setEventDuration(d,at(1),'16'),at(1));const snapshot=structuredClone(d);
 assert.throws(()=>toggleEntryTie(d,at(1),'16'));assert.deepEqual(d,snapshot);
 d=enter(d,at(1),'16',4);assert.throws(()=>toggleEntryTie(d,at(0),'8'));
 d=enter(createBlankDocument(),at(0));d=toggleEntryTie(d,at(1),'16');assert(isBlankEvent(d.measures[0].events[2]));
});
