import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,ticksOf,compileDocumentV2,isBlankEvent} from '../src/etudes/scoreModel.js';
import {inputRhythm,tripletProgress} from '../src/etudes/rhythmInput.js';
import {deleteTone} from '../src/etudes/editorCommands.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
import {setBeamRange} from '../src/etudes/beamOverrides.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
const at=(event=0,string=6)=>({bar:0,event,string});
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};
test('general one-shot dot uses exact ticks, clears once, preserves chord edits and following timing',()=>{
 for(const [duration,ticks] of [['2',1440],['4',720],['8',360],['16',180]]){
  const r=inputRhythm(createBlankDocument(),at(),{selectedDuration:duration,dottedMode:'one-shot'},'note',9);
  assert.equal(ticksOf(r.document.measures[0].events[0]),ticks);assert.equal(r.dottedMode,'off');
  const chord=inputRhythm(r.document,at(0,5),{selectedDuration:duration},'note',7);
  assert.equal(chord.document.measures[0].events[0].notes.length,2);assert.equal(ticksOf(chord.document.measures[0].events[0]),ticks);
  assert.deepEqual(compileDocumentV2(chord.document).errors,[]);assert.deepEqual(compileDocumentV2(chord.document).issues,[]);
  assert.equal(chord.document.measures[0].events.reduce((n,e)=>n+ticksOf(e),0),1920);
  const next=inputRhythm(chord.document,at(1),{selectedDuration:'16'},'note',5);assert.equal(next.document.measures[0].events[1].onset,ticks);assert.equal(ticksOf(next.document.measures[0].events[1]),120);
 }
});
test('locked dots repeat, ordinary entry after release and rests use the same modifier',()=>{
 let d=createBlankDocument();for(let i=0;i<3;i++){const r=inputRhythm(d,at(i),{selectedDuration:'16',dottedMode:'locked'},i===1?'rest':'note',3);assert.equal(r.dottedMode,'locked');d=r.document;assert.equal(ticksOf(d.measures[0].events[i]),180);}
 const normal=inputRhythm(d,at(3),{selectedDuration:'16'},'note',3);assert.equal(ticksOf(normal.document.measures[0].events[3]),120);
 assert.equal(d.measures[0].events[1].rest,true);assert.equal(d.measures[0].events[1].blank,false);
});
test('eighth/sixteenth tuplets count events, finish after three, preserve ratios and reject unfinished completion',()=>{
 for(const [duration,ticks] of [['8',160],['16',80]]){
  let d=createBlankDocument(),modes={selectedDuration:duration,tupletMode:'active'};
  for(let i=0;i<3;i++){
   const r=inputRhythm(d,at(i),modes,'note',9);d=r.document;modes={...modes,tupletMode:r.tupletMode,session:r.session};
   assert.equal(tripletProgress(d,r.session).count,i+1);assert.equal(ticksOf(d.measures[0].events[i]),ticks);
   const chord=inputRhythm(d,at(i,5),modes,'note',7);d=chord.document;assert.equal(tripletProgress(d,r.session).count,i+1);
   assert.equal(r.tupletMode,i===2?'off':'active');assert.equal(r.completed,i===2);
   assert.equal(compileDocumentV2(d).issues.some(x=>x.includes('그룹 미완성')),i<2);
   assert.equal(saveLibraryDocument(memory(),d).record.status,i<2?'draft':'saved');
  }
  const deleted=deleteTone(deleteTone(d,at(1)),at(1,5));assert(isBlankEvent(deleted.measures[0].events[1]));assert(compileDocumentV2(deleted).issues.some(x=>x.includes('그룹 미완성')));
  const storage=memory();saveLibraryDocument(storage,d);assert.deepEqual(loadLibrary(storage).records[d.id].document,d);
 }
});
test('beam edits preserve dotted rhythm, fret data and playback; failed insertion preserves source',()=>{
 let d=createBlankDocument();for(let i=0;i<3;i++)d=inputRhythm(d,at(i),{selectedDuration:'16',dottedMode:'locked'},'note',3).document;
 const connected=setBeamRange(d,{bar:0,start:0,end:2},'join'),split=setBeamRange(connected,{bar:0,start:0,end:2},'break');
 for(const next of [connected,split])assert.deepEqual(scoreTimeline(compileDocumentV2(next).score),scoreTimeline(compileDocumentV2(d).score));
 const before=JSON.stringify(d);assert.throws(()=>inputRhythm(d,at(3),{selectedDuration:'1',dottedMode:'one-shot'},'note',3));assert.equal(JSON.stringify(d),before);
});

test('an active triplet cannot silently switch to another event group',()=>{
 const first=inputRhythm(createBlankDocument(),at(),{selectedDuration:'8',tupletMode:'active'},'note',3);
 assert.throws(()=>inputRhythm(first.document,at(3),{selectedDuration:'8',tupletMode:'active',session:first.session},'note',4),/진행 중인/);
 assert.equal(tripletProgress(first.document,first.session).count,1);
});
