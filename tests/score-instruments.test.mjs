import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2,midiAtStaffStep,pitchForMidi,hasEditableShape} from '../src/etudes/scoreModel.js';
import {enterFret,moveTone} from '../src/etudes/editorCommands.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';
import {scoreInstrument,staffStepForPitch} from '../src/etudes/scoreInstruments.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';

const at=(string,event=0)=>({bar:0,event,string,mode:'tab'});
const compiled=d=>{const r=compileDocumentV2(d);assert.deepEqual(r.errors,[]);return r.score;};
for(const [instrument,expected] of [['guitar',[64,59,55,50,45,40]],['bass',[43,38,33,28]],['ukulele',[69,64,60,67]]]){
 test(`${instrument}: open strings, notation, hit testing and playback share sounding pitch`,()=>{
  let d=convertScoreInstrument(createBlankDocument(),instrument);
  expected.forEach((midi,i)=>{const n=compiled(enterFret(d,at(i+1),0)).measures[0][0];assert.equal(n.midi,midi);assert.equal(midiAtStaffStep(staffStepForPitch(n.pitch,instrument),'C',instrument),midi);assert.equal(Number(n.pitch.key.split('/')[1]),n.pitch.octave+scoreInstrument(instrument).octaveShift);});
  d=enterFret(d,at(expected.length),0);
  assert.equal(scoreTimeline(compiled(d)).events[0].midi,expected.at(-1));
  assert(hasEditableShape(d));
 });
}
test('guitar to bass preserves sounding pitch, timing and IDs without mutating source',()=>{
 const d=enterFret(createBlankDocument(),at(6),0),before=structuredClone(d),next=convertScoreInstrument(d,'bass');
 assert.deepEqual(d,before);assert.equal(next.measures[0].events[0].notes[0].id,d.measures[0].events[0].notes[0].id);
 assert.equal(compiled(next).measures[0][0].midi,40);assert.equal(next.measures[0].events[0].onset,0);
 assert.equal(compiled(convertScoreInstrument(next,'guitar')).measures[0][0].midi,40);
});
test('re-entrant ukulele chord assignment uses distinct strings and retains all pitches',()=>{
 let d=createBlankDocument();for(const [string,fret] of [[1,5],[2,5],[3,5],[4,17]])d=enterFret(d,at(string),fret);
 const next=convertScoreInstrument(d,'ukulele'),tones=compiled(next).measures[0][0].tones;
 assert.deepEqual(tones.map(n=>n.midi),[69,64,60,67]);assert.equal(new Set(tones.map(n=>n.string)).size,4);
});
test('unplayable range or more than four simultaneous tones fails atomically',()=>{
 const low=enterFret(createBlankDocument(),at(6),0),before=structuredClone(low);
 assert.throws(()=>convertScoreInstrument(low,'ukulele'),/1마디 1음/);assert.deepEqual(low,before);
 let chord=createBlankDocument();for(let string=1;string<=5;string++)chord=enterFret(chord,at(string),0);
 assert.throws(()=>convertScoreInstrument(chord,'bass'),/동시음/);
});
test('four-string documents reject a fifth string and invalid instrument metadata',()=>{
 const d=convertScoreInstrument(createBlankDocument(),'bass');
 assert(compileDocumentV2(enterFret(d,at(5),0)).errors.length);
 const note=enterFret(d,at(4),0);assert.throws(()=>moveTone(note,at(4),at(5)),/1–4/);
 assert(compileDocumentV2({...d,instrument:'other'}).errors.length);
});
test('four-string scores round-trip through the actual library and legacy guitar stays compatible',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const d=enterFret(convertScoreInstrument(createBlankDocument(),'ukulele'),at(4),0);
 assert(saveLibraryDocument(storage,d).saved);const restored=loadLibrary(storage).records[d.id].document;
 assert.deepEqual(restored,d);assert.equal(compiled(restored).measures[0][0].midi,67);
 const old=createBlankDocument();delete old.instrument;assert.equal(compiled(old).instrument,'guitar');
 assert.equal(pitchForMidi(40).key,'e/3');
});
test('natural harmonics retain sounding pitch and their harmonic notation',()=>{
 let d=enterFret(createBlankDocument(),at(6),12);d.measures[0].events[0].notes[0].harmonic=true;
 const next=convertScoreInstrument(d,'bass');assert(next.measures[0].events[0].notes[0].harmonic);
 assert.equal(compiled(next).measures[0][0].midi,52);
});
test('chord diagrams convert their strings; obsolete finger and barre markings are cleared',()=>{
 const d=createBlankDocument();d.measures[0].chord={name:'Em',frets:[0,2,2,null,null,null],fingers:[null,2,3,null,null,null],barre:null};
 const next=convertScoreInstrument(d,'bass');assert.equal(next.measures[0].chord.frets.length,4);assert.deepEqual(next.measures[0].chord.fingers,[null,null,null,null]);compiled(next);
});
