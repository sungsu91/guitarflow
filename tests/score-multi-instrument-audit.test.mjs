import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2,hasEditableShape,ticksOf,blankMeasure} from '../src/etudes/scoreModel.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';
import {changeTuning,tuningName,tuningPresets,soundingMidi} from '../src/etudes/scoreTuning.js';
import {scoreStringCount} from '../src/etudes/scoreInstruments.js';
import {enterFret,nextEntry,setEventDuration} from '../src/etudes/editorCommands.js';
import {enterMidiNotes} from '../src/etudes/enterMidiNotes.js';
import {enterDrumNotes,fillDrumMeasure} from '../src/etudes/drumInput.js';
import {drumVoiceEvents} from '../src/etudes/drumVoices.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
const blank=id=>convertScoreInstrument(createBlankDocument(),id);
const at={bar:0,event:0,string:1,mode:'tab'};
const rhythm={selectedDuration:'8',dottedMode:'off',tupletMode:'off'};
const five=d=>changeTuning(d,{tuning:[43,38,33,28,23]}).document;
const checked=d=>{const result=compileDocumentV2(d);assert.deepEqual(result.errors,[]);assert.deepEqual(result.issues,[]);return result.score;};

test('five-string bass presets distinguish four strings, sound B0, and persist',()=>{
 for(const preset of tuningPresets('bass')){
  let d=changeTuning(blank('bass'),{tuning:preset.tuning}).document;
  assert.equal(tuningName(d),preset.label);assert(hasEditableShape(d));assert.equal(scoreStringCount(d),preset.tuning.length);
  for(let string=1;string<=d.tuning.length;string++){
   const note=enterFret(d,{...at,string},0),score=checked(note);
   assert.equal(score.measures[0][0].midi,preset.tuning[string-1]);
   assert.equal(scoreTimeline(score).events[0].midi,preset.tuning[string-1]);
  }
 }
 const d=enterFret(five(blank('bass')),{...at,string:5},0);
 assert.equal(checked(d).measures[0][0].pitch.key,'b/1');
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 assert(saveLibraryDocument(storage,d).saved);assert.deepEqual(loadLibrary(storage).records[d.id].document,d);
 assert.equal(scoreStringCount(checked(d)),5);
 assert(compileDocumentV2({...d,instrument:'ukulele'}).errors.length);
});
test('removing fifth string preserves pitches without NaN or silent note loss',()=>{
 const source=enterFret(five(blank('bass')),{...at,string:5},0),before=structuredClone(source);
 const changed=changeTuning(source,{tuning:[43,38,33,28]},'pitch',{reassignLocked:true});
 assert.equal(changed.unplaced,1);assert.equal(changed.document.measures[0].events[0].notes[0].midi,23);checked(changed.document);
 assert.throws(()=>changeTuning(source,{tuning:[43,38,33,28]},'fingering'),/줄/);
 assert.deepEqual(source,before);
 const playable=enterFret(five(blank('bass')),{...at,string:5},5);
 const moved=changeTuning(playable,{tuning:[43,38,33,28]},'pitch',{reassignLocked:true});
 assert.equal(moved.unplaced,0);assert.equal(checked(moved.document).measures[0][0].midi,28);
});
test('adding and removing low string resizes chord diagrams and keeps existing strings',()=>{
 let d=enterFret(blank('bass'),{...at,string:4},0);
 d.measures[0].chord={name:'Em',frets:[0,2,2,0],fingers:[null,2,3,null],barre:null};
 const next=five(d);checked(next);
 assert.deepEqual(next.measures[0].chord.frets,[null,0,2,2,0]);
 assert.equal(soundingMidi(next,next.measures[0].events[0].notes[0]),28);
 const restored=changeTuning(next,{tuning:d.tuning}).document;checked(restored);assert.deepEqual(restored.measures[0].chord,d.measures[0].chord);
});
for(const instrument of ['guitar','ukulele','bass','bass5','piano','drums']){
 test(`${instrument}: eighth-note chords fill 4/4 and overflow is rejected atomically`,()=>{
  let d=instrument==='bass5'?five(blank('bass')):blank(instrument),cursor={...at};
  const pitches=instrument==='drums'?[36,42,42]:instrument==='piano'?[60,64,67,60]:d.tuning.slice(0,3);
  for(let i=0;i<8;i++){
   const input=enterMidiNotes(d,cursor,pitches,rhythm);d=input.document;
   assert.equal(d.measures[0].events[i].notes.length,3-(instrument==='drums'?1:0));
   assert.equal(d.measures[0].events[i].onset,i*240);
   ({document:d,cursor}=nextEntry(d,cursor));
  }
  assert.equal(cursor.bar,1);assert.equal(d.measures.length,2);checked(d);
  const before=structuredClone(d);assert.throws(()=>setEventDuration(d,{...at,event:7},'2'),/마디 끝/);assert.deepEqual(d,before);
 });
 test(`${instrument}: dotted and triplet chords obey 3/4 and 6/8 capacity`,()=>{
  for(const meter of [[3,4],[6,8]]){
   let d=instrument==='bass5'?five(blank('bass')):blank(instrument);d={...d,meter,measures:[blankMeasure(meter)]};
   const pitches=instrument==='drums'?[36,42]:instrument==='piano'?[60,64,67]:d.tuning.slice(0,2);
   let c={...at};
   for(let i=0;i<4;i++){d=enterMidiNotes(d,c,pitches,{...rhythm,dottedMode:'one-shot'}).document;assert.equal(ticksOf(d.measures[0].events[i]),360);({document:d,cursor:c}=nextEntry(d,c));}
   checked(d);assert.equal(c.bar,1);
   d={...d,measures:[blankMeasure(meter)]};c={...at};let session=null;
   for(let i=0;i<9;i++){const result=enterMidiNotes(d,c,pitches,{...rhythm,tupletMode:'active',session});d=result.document;session=result.completed?null:result.session;({document:d,cursor:c}=nextEntry(d,c));}
   checked(d);assert.equal(c.bar,1);assert.equal(d.measures[0].events.reduce((sum,e)=>sum+ticksOf(e),0),1440);
  }
 });
}
test('drum pad entry validates and deduplicates simultaneous hits like MIDI',()=>{
 const d=blank('drums'),before=structuredClone(d);
 const entered=enterDrumNotes(d,at,[36,42,42,36],rhythm).document;
 assert.deepEqual(entered.measures[0].events[0].notes.map(n=>n.midi),[36,42]);checked(entered);
 for(const pitches of [[36,60],[36,128],[],[36,38.5]])assert.throws(()=>enterDrumNotes(d,at,pitches,rhythm));
 assert.deepEqual(d,before);
});
test('sixteenth hats, quarter kicks and backbeat snare keep independent durations without duplicates',()=>{
 let d=fillDrumMeasure(blank('drums'),at,[42],{...rhythm,selectedDuration:'16'}).document;
 for(const event of [0,4,8,12])d=enterDrumNotes(d,{...at,event},[36],{...rhythm,selectedDuration:'4'}).document;
 for(const event of [4,12])d=enterDrumNotes(d,{...at,event},[38],{...rhythm,selectedDuration:'16'}).document;
 const score=checked(d);assert.equal(d.measures[0].events.flatMap(e=>e.notes).length,22);
 assert.equal(drumVoiceEvents(score.measures[0],false).voiceEvents.length,16);
 assert.equal(drumVoiceEvents(score.measures[0],true).voiceEvents.length,4);
 const before=structuredClone(d);assert.throws(()=>enterDrumNotes(d,{...at,event:1},[36],rhythm));assert.deepEqual(d,before);
});
