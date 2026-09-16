import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankMeasure,isBlankEvent,compileDocumentV2,compileStats} from '../src/etudes/scoreModel.js';
import {enterFret,deleteTone,setRest,setEventDuration,applyPicking} from '../src/etudes/editorCommands.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
const at=event=>({bar:0,event,string:6});
test('blank slots preserve duration but explicit and legacy rests remain distinct',()=>{
 const d=createBlankDocument(),filled=enterFret(d,at(0),3),rest=setRest(filled,at(2));
 assert.deepEqual(rest.measures[0].events.map(isBlankEvent),[false,true,false,true]);
 const loaded=JSON.parse(JSON.stringify(rest));assert.deepEqual(loaded,rest);
 const {score,errors,issues}=compileDocumentV2(loaded);assert.deepEqual(errors,[]);assert.deepEqual(issues,[]);
 assert.deepEqual(score.measures[0].map(isBlankEvent),[false,true,false,true]);assert.equal(scoreTimeline(score).duration,3);
 const legacy={...loaded.measures[0].events[2]};delete legacy.blank;assert.equal(isBlankEvent(legacy),false);
});
test('deleting a note or explicit rest empties only its time position; blank delete is no-op',()=>{
 let d=enterFret(enterFret(createBlankDocument(),at(0),3),at(2),7);d=setRest(d,at(1));
 const deleted=deleteTone(d,at(0));assert.equal(isBlankEvent(deleted.measures[0].events[0]),true);
 assert.equal(deleted.measures[0].events[2],d.measures[0].events[2]);assert.deepEqual(deleted.measures[0].events.map(e=>e.onset),[0,480,960,1440]);
 const cleared=deleteTone(deleted,at(1));assert.equal(isBlankEvent(cleared.measures[0].events[1]),true);assert.equal(deleteTone(cleared,at(1)),cleared);
 assert.equal(d.measures[0].events[0].notes[0].fret,3);assert.equal(isBlankEvent(d.measures[0].events[1]),false);
 assert.equal(scoreTimeline(compileDocumentV2(cleared).score).events[0].start,2);
});
test('duration fillers are blank, but extending a note cannot consume an explicit rest',()=>{
 const d=createBlankDocument(),short=setEventDuration(d,at(0),'8');assert(short.measures[0].events.every(isBlankEvent));
 const rest=setRest(d,at(1));assert.throws(()=>setEventDuration(rest,at(0),'2'),/겹칩니다/);assert.equal(rest.measures[0].events[1].blank,false);
});
test('picking clear leaves tones, explicit rests, empty slots and timing untouched; edits compile only one bar',()=>{
 const d=createBlankDocument();d.measures.push(blankMeasure());let picked=applyPicking(enterFret(d,at(0),5),{pattern:'down'});
 compileDocumentV2(picked);const before=compileStats.bars,cleared=applyPicking(picked,{pattern:'clear'});compileDocumentV2(cleared);assert.equal(compileStats.bars-before,1);
 assert.equal(cleared.measures[0].events[0].notes,picked.measures[0].events[0].notes);assert.equal(cleared.measures[0].events[0].pickStroke,null);
 assert.equal(cleared.measures[1],picked.measures[1]);assert.deepEqual(cleared.measures[0].events.map(e=>e.onset),[0,480,960,1440]);
});

test('deleting a connected arrival removes dangling ties and techniques without shifting later events',()=>{
 let d=enterFret(enterFret(createBlankDocument(),at(0),5),at(1),5);d.measures[0].events[0].tieTo=d.measures[0].events[1].id;
 const next=deleteTone(d,at(1));assert.equal(next.measures[0].events[0].tieTo,null);assert.deepEqual(compileDocumentV2(next).issues,[]);
 d.measures[0].events[0].tieTo=null;d.measures[0].events[0].technique='H';d=enterFret(d,at(1),7);
 assert.equal(deleteTone(d,at(1)).measures[0].events[0].technique,null);
});
