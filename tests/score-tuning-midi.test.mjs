import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2,ticksOf,pitchForMidi} from '../src/etudes/scoreModel.js';
import {enterFret,nextEntry,deleteTone,setRest} from '../src/etudes/editorCommands.js';
import {changeTuning,soundingMidi,tuningPresets,assignTab,normalizePitches} from '../src/etudes/scoreTuning.js';
import {enterMidiNotes} from '../src/etudes/enterMidiNotes.js';
import {createMidiStepInput} from '../src/etudes/midiStepInput.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';
const cursor={bar:0,event:0,string:1,mode:'tab'},rhythm={selectedDuration:'4'};
test('standard, down tunings and Drop D change the correct strings',()=>{const presets=tuningPresets('guitar');assert.deepEqual(presets.map(p=>p.tuning),[[64,59,55,50,45,40],[63,58,54,49,44,39],[62,57,53,48,43,38],[64,59,55,50,45,38]]);assert.equal(tuningPresets('ukulele').length,3);});
test('capo sounds F sharp, G, G sharp without double octave/capo application',()=>{for(let capo=0;capo<3;capo++){const d=enterFret({...createBlankDocument(),capo},cursor,2),n=compileDocumentV2(d).score.measures[0][0];assert.equal(n.midi,66+capo);assert.equal(n.pitch.octave,4);assert(n.pitch.key.endsWith('/5'));}});
test('physical fret limit includes capo and legacy sound is unchanged',()=>{const d=enterFret(createBlankDocument(),cursor,24);assert.equal(soundingMidi(d,d.measures[0].events[0].notes[0]),88);assert.throws(()=>enterFret({...d,capo:1},cursor,24));assert.equal(normalizePitches(d).capo,0);assert.equal(compileDocumentV2(d).score.measures[0][0].midi,compileDocumentV2(normalizePitches(d)).score.measures[0][0].midi);});
test('pitch preservation flags locked conflicts; fingering preservation changes sound',()=>{const d=normalizePitches(enterFret(createBlankDocument(),cursor,2));const pitch=changeTuning(d,{capo:2});assert.equal(pitch.conflicts.length,1);const n=pitch.document.measures[0].events[0].notes[0];assert(n.unplaced);assert.equal(n.midi,66);assert.equal(compileDocumentV2(pitch.document).score.measures[0][0].midi,66);const grip=changeTuning(d,{capo:2},'fingering').document;assert.equal(grip.measures[0].events[0].notes[0].fret,2);assert.equal(soundingMidi(grip,grip.measures[0].events[0].notes[0]),68);assert.equal(d.capo,0);});
test('automatic chord assignment preserves pitches, distinct strings and manual fingering',()=>{const d={...createBlankDocument(),capo:2};const r=enterMidiNotes(d,cursor,[64,68,71],rhythm);const e=r.document.measures[0].events[0];assert.equal(ticksOf(e),480);assert.equal(new Set(e.notes.map(n=>n.string)).size,3);assert.deepEqual(e.notes.map(n=>soundingMidi(d,n)),[64,68,71]);assert.equal(nextEntry(r.document,cursor).cursor.event,1);const manual={id:'locked',midi:69,string:1,fret:3,locked:true};const placed=assignTab(d,[manual,{midi:64,locked:false}]);assert.equal(placed[0].fret,3);assert.equal(placed[0].string,1);});
test('impossible chords keep every pitch and can be compiled, saved, deleted',()=>{const r=enterMidiNotes(createBlankDocument(),cursor,[20,21,22,23,24,25,26],rhythm).document;assert.equal(r.measures[0].events[0].notes.length,7);assert(r.measures[0].events[0].notes.every(n=>n.unplaced));const restored=JSON.parse(JSON.stringify(r));assert.equal(compileDocumentV2(restored).errors.length,0);assert.equal(compileDocumentV2(restored).score.measures[0][0].tones.length,7);const noteId=restored.measures[0].events[0].notes[0].id;assert.equal(deleteTone(restored,{...cursor,noteId}).measures[0].events[0].notes.length,6);});
test('preferred range is soft and MIDI never retunes pitch',()=>{const d={...createBlankDocument(),capo:12,autoTab:{mode:'range',min:8,max:12}};const notes=assignTab(d,[{midi:52,locked:false}]);assert.equal(notes[0].fret,0);assert(notes[0].outsidePreferred);assert.equal(soundingMidi(d,notes[0]),52);});
test('MIDI reuses dotted, triplet, rest and boundary rules',()=>{let d=createBlankDocument();const dotted=enterMidiNotes(d,cursor,[64,67],{selectedDuration:'8',dottedMode:'one-shot'});assert.equal(ticksOf(dotted.document.measures[0].events[0]),360);assert.equal(dotted.dottedMode,'off');assert.throws(()=>enterMidiNotes(d,{...cursor,event:3},[64],{selectedDuration:'2'}));let session=null;for(let i=0;i<3;i++){const changed=enterMidiNotes(d,{...cursor,event:i},[64+i],{selectedDuration:'8',tupletMode:'active',session});d=changed.document;session=changed.session;if(i===2)assert(changed.completed);}assert(d.measures[0].events.slice(0,3).every(e=>ticksOf(e)===160));assert.equal(compileDocumentV2(d).errors.length,0);});
test('instrument conversion accounts for capo and keeps source intact',()=>{const d=enterFret({...createBlankDocument(),capo:2},cursor,0);const bass=convertScoreInstrument(d,'bass');assert.equal(bass.capo,0);assert.equal(soundingMidi(bass,bass.measures[0].events[0].notes[0]),66);assert.equal(d.capo,2);});
test('MIDI groups overlapping notes, separates fast releases, ignores repeats and sustain',()=>{let pending;const events=[];let enabled=true;const engine=createMidiStepInput(n=>events.push(n),{schedule:fn=>(pending=fn,1),cancel:()=>{pending=null;},enabled:()=>enabled});engine.message([0x90,60,100]);engine.message([0x90,64,100]);engine.message([0x90,67,100]);pending();assert.deepEqual(events,[[60,64,67]]);engine.message([0x90,60,100]);engine.message([0xb0,64,127]);assert.equal(events.length,1);engine.message([0x90,60,0]);engine.message([0x90,60,100]);engine.message([0x80,60,0]);engine.message([0x90,62,100]);engine.message([0x80,62,0]);assert.deepEqual(events.slice(1),[[60],[62]]);engine.message([0x90,72,100]);enabled=false;pending();assert.equal(events.length,3);engine.reset();});
test('locked conflicts remain locked across further changes and MIDI additions',()=>{const original=normalizePitches(enterFret(createBlankDocument(),cursor,2));const conflict=changeTuning(original,{capo:1}).document;const again=changeTuning(conflict,{capo:2}).document;assert(again.measures[0].events[0].notes[0].unplaced);assert(again.measures[0].events[0].notes[0].locked);const added=enterMidiNotes(again,cursor,[70],rhythm).document;assert(added.measures[0].events[0].notes[0].unplaced);const restored=changeTuning(again,{capo:0}).document;assert.equal(restored.measures[0].events[0].notes[0].fret,2);assert(!restored.measures[0].events[0].notes[0].unplaced);});
test('late timer callbacks cannot combine notes outside chord window',()=>{let clock=0;const result=[];const engine=createMidiStepInput(n=>result.push(n),{now:()=>clock,schedule:()=>1,cancel:()=>{}});engine.message([0x90,60,100]);clock=90;engine.message([0x90,64,100]);engine.flush();assert.deepEqual(result,[[60],[64]]);});
test('flat keys and flat minor keys retain appropriate chromatic spelling',()=>{assert.equal(pitchForMidi(61,'Cm').letter,'D');assert.equal(pitchForMidi(61,'Cm').alter,-1);assert.equal(pitchForMidi(63,'Eb').letter,'E');assert.equal(pitchForMidi(66,'D').alter,1);});
test('MIDI replaces explicit rest without changing chosen duration',()=>{const d=setRest(createBlankDocument(),cursor),next=enterMidiNotes(d,cursor,[64],rhythm).document;assert.equal(next.measures[0].events[0].rest,false);assert.equal(next.measures[0].events[0].duration,'4');});
test('pending MIDI is discarded when cursor changes or setting takes focus',()=>{let current='a';const result=[];const engine=createMidiStepInput(n=>result.push(n),{context:()=>current,schedule:()=>1,cancel:()=>{}});engine.message([0x90,60,100]);current='b';engine.flush();assert.equal(result.length,0);engine.message([0x90,64,100]);engine.suspend();engine.flush();assert.equal(result.length,0);engine.message([0x90,64,100]);engine.flush();assert.equal(result.length,0);});


test('confirmed capo recalculation relocates manual fingering without changing pitch or lock',()=>{
 const d=normalizePitches(enterFret(createBlankDocument(),cursor,2));
 const changed=changeTuning(d,{capo:2},'pitch',{reassignLocked:true});
 const n=changed.document.measures[0].events[0].notes[0];
 assert.equal(n.fret,0);assert.equal(n.string,1);assert.equal(n.locked,true);assert.equal(n.unplaced,false);
 assert.equal(soundingMidi(changed.document,n),66);assert.equal(changed.conflicts.length,1);
 assert.equal(d.measures[0].events[0].notes[0].fret,2);
});
test('confirmed recalculation recovers earlier conflicts and preserves unreachable low notes',()=>{
 const d=normalizePitches(enterFret(createBlankDocument(),cursor,2));
 const pending=changeTuning(d,{capo:1}).document;
 const recovered=changeTuning(pending,{capo:2},'pitch',{reassignLocked:true}).document;
 assert.equal(recovered.measures[0].events[0].notes[0].unplaced,false);
 const low=enterFret(createBlankDocument(),{...cursor,string:6},0);
 const changed=changeTuning(low,{capo:2},'pitch',{reassignLocked:true}).document;
 assert.equal(changed.measures[0].events[0].notes[0].unplaced,true);
 assert.equal(changed.measures[0].events[0].notes[0].midi,40);
 assert.equal(compileDocumentV2(changed).errors.length,0);
});
test('unresolved chord engraving uses one central marker and retains placed tones',async()=>{
 const {tabPositions}=await import('../src/etudes/tabPositions.js');
 assert.deepEqual(tabPositions({tones:[{unplaced:true},{unplaced:true},{unplaced:true}]},6),[{str:3,fret:'?'}]);
 const positions=tabPositions({tones:[{string:3,fret:2},{unplaced:true}]},4);
 assert.equal(new Set(positions.map(p=>p.str)).size,2);assert(positions.some(p=>p.fret===2));
});

test('confirmed manual chord recalculation uses distinct strings and retains every sounding note',()=>{
 let d=createBlankDocument();for(const string of [1,2,3,4])d=enterFret(d,{...cursor,string},2);
 const original=d.measures[0].events[0].notes.map(n=>soundingMidi(d,n));
 const next=changeTuning(d,{capo:2},'pitch',{reassignLocked:true}).document;
 const notes=next.measures[0].events[0].notes;
 assert.equal(notes.length,4);assert(notes.every(n=>!n.unplaced&&n.locked));
 assert.equal(new Set(notes.map(n=>n.string)).size,4);
 assert.deepEqual(notes.map(n=>soundingMidi(next,n)),original);
 assert.deepEqual(JSON.parse(JSON.stringify(next)).measures,next.measures);
});
