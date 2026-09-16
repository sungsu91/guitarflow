import test from 'node:test';import assert from 'node:assert/strict';
import {createBlankDocument,blankEvent,compileDocumentV2,ticksOf} from '../src/etudes/scoreModel.js';
import {enterFretWithDuration,enterFret,setRestWithDuration,setRest,deleteTone,setEventDuration,setDottedEighth,enterMutedTone} from '../src/etudes/editorCommands.js';
import {setBeamBefore,setBeamRange,canJoinBeam} from '../src/etudes/beamOverrides.js';
import {ensureTriplet} from '../src/etudes/tuplets.js';
const at=(event=0,string=6)=>({bar:0,event,string});
test('editing frets, adding chord tones, or replacing a rest never retimes an entered event',()=>{
 for(const duration of ['8','16']){
 let d=enterFretWithDuration(createBlankDocument(),at(),9,duration);if(duration==='8')d=setDottedEighth(d,at());const before=d.measures[0].events.map(e=>[e.id,e.onset,ticksOf(e)]);
 d=enterFretWithDuration(d,at(0,5),7,'2');d=enterFretWithDuration(d,at(),12,'4');assert.equal(d.measures[0].events[0].notes.length,2);assert.deepEqual(d.measures[0].events.map(e=>[e.id,e.onset,ticksOf(e)]),before);
 const rest=setRest(d,at());assert.equal(ticksOf(enterMutedTone(rest,at(),'4').measures[0].events[0]),ticksOf(d.measures[0].events[0]));assert.equal(ticksOf(enterFretWithDuration(rest,at(),5,'4').measures[0].events[0]),ticksOf(d.measures[0].events[0]));
 }
});
test('extending into part of a blank splits the remainder without overlap',()=>{
 let d=createBlankDocument();d.measures[0].events=[blankEvent(0,'8'),blankEvent(240,'4'),blankEvent(720,'8'),blankEvent(960,'2')];d=enterFret(d,at(),3);const last=d.measures[0].events.at(-1),next=setEventDuration(d,at(),'4');
 assert.deepEqual(next.measures[0].events.map(e=>[e.onset,ticksOf(e)]),[[0,480],[480,240],[720,240],[960,960]]);assert.equal(next.measures[0].events.at(-1),last);assert.deepEqual(compileDocumentV2(next).issues,[]);
 assert.throws(()=>setEventDuration(d,at(3),'1'),/마디 끝/);
});
test('ordinary eighth button clears dot and safely preserves its vacated time',()=>{
 let d=enterFretWithDuration(createBlankDocument(),at(),5,'8');d=setDottedEighth(d,at());const next=setEventDuration(d,at(),'8');assert(!next.measures[0].events[0].dotted);assert.deepEqual(next.measures[0].events.slice(0,3).map(e=>e.onset),[0,240,360]);assert.deepEqual(compileDocumentV2(next).issues,[]);
});
test('beam reset works across a deleted note and an explicit rest',()=>{
 let d=createBlankDocument();d.measures[0].events=Array.from({length:8},(_,i)=>blankEvent(i*240,'8'));for(let i=0;i<8;i++)d=enterFret(d,at(i),3);d=setBeamRange(d,{bar:0,start:0,end:3},'join');d=deleteTone(d,at(1));d=setRest(d,at(2));const before=d.measures[0].events.map(({beamBefore,...e})=>e),restored=setBeamRange(d,{bar:0,start:0,end:3},'auto');assert.deepEqual(restored.measures[0].events,before);
});
test('individual beam control cannot link ordinary notes into a tuplet',()=>{
 let d=createBlankDocument();d=setEventDuration(d,at(),'8');d=enterFret(d,at(),3);d=ensureTriplet(d,at(2),'8');for(let i=2;i<5;i++)d=enterFret(d,at(i),5);d=enterFret(d,at(1),4);
 assert.equal(canJoinBeam(d.measures[0].events,2),false);assert.throws(()=>setBeamBefore(d,at(2),'join'),/3연음/);
 const cut=setBeamRange(d,{bar:0,start:2,end:3},'break');assert.deepEqual(cut.measures[0].events.map(e=>e.tuplet),d.measures[0].events.map(e=>e.tuplet));
});

test('a prepared dotted slot retains its length when the first fret, X, or rest is entered',()=>{
 let d=setEventDuration(createBlankDocument(),at(),'8');d=setDottedEighth(d,at());
 for(const next of [enterFretWithDuration(d,at(),5,'8'),enterMutedTone(d,at(),'8'),setRestWithDuration(d,at(),'8')]){
 assert.equal(ticksOf(next.measures[0].events[0]),360);assert.deepEqual(compileDocumentV2(next).issues,[]);
 }
});
