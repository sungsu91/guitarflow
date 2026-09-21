import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2,hasEditableShape,ticksOf} from '../src/etudes/scoreModel.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';
import {enterMidiNotes} from '../src/etudes/enterMidiNotes.js';
import {normalizePitches,soundingMidi,changeTuning} from '../src/etudes/scoreTuning.js';
import {deleteTone,setNoteConnection,enterFret,nextEntry} from '../src/etudes/editorCommands.js';
import {guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
import {DRUMS} from '../src/etudes/scoreInstruments.js';
const cursor={bar:0,event:0,string:1,mode:'staff'},rhythm={selectedDuration:'4'};
const blank=id=>convertScoreInstrument(createBlankDocument(),id);
test('piano, keyboard and drums create editable documents with staff-only notation and no strings',()=>{
 for(const id of ['piano','keyboard','drums']){const d=blank(id);assert(hasEditableShape(d));assert.deepEqual(d.tuning,[]);assert.equal(d.viewSettings.notationView,'staff');assert.deepEqual(compileDocumentV2(d).errors,[]);}
});
test('piano chords exceed string count and preserve sounding MIDI, hand, persistence and independent playback voices',()=>{
 const pitches=[21,48,60,64,67,72,76,108],d=enterMidiNotes(blank('piano'),cursor,pitches,rhythm).document;
 const restored=normalizePitches(JSON.parse(JSON.stringify(d))),notes=restored.measures[0].events[0].notes;
 assert.deepEqual(notes.map(n=>soundingMidi(restored,n)),pitches);assert(notes.every(n=>n.string===undefined&&n.fret===undefined&&!n.unplaced));assert.equal(notes[0].hand,'left');assert.equal(notes[3].hand,'right');
 const result=compileDocumentV2(restored);assert.deepEqual(result.errors,[]);const voices=guitarVoiceTimeline(result.score).voices;assert.equal(voices.length,pitches.length);assert.equal(new Set(voices.map(n=>n.string)).size,pitches.length);
});
test('unified piano preserves full MIDI range and rejects invalid MIDI atomically',()=>{
 const d=blank('piano'),before=JSON.stringify(d);for(const pitch of [-1,128,60.5])assert.throws(()=>enterMidiNotes(d,cursor,[60,pitch],rhythm),/MIDI/);assert.equal(JSON.stringify(d),before);
 assert.deepEqual(compileDocumentV2(enterMidiNotes(blank('keyboard'),cursor,[0,127],rhythm).document).errors,[]);
});
test('drums accept GM kit notes and reject unsupported pitches without altering the score',()=>{
 const d=blank('drums');for(const {midi} of DRUMS){const entered=enterMidiNotes(d,cursor,[midi],rhythm).document;assert.deepEqual(compileDocumentV2(entered).errors,[]);assert.equal(soundingMidi(entered,entered.measures[0].events[0].notes[0]),midi);}
 const chord=enterMidiNotes(d,cursor,[36,38,42,42],rhythm).document;assert.equal(chord.measures[0].events[0].notes.length,3);assert.throws(()=>enterMidiNotes(d,cursor,[36,60],rhythm),/지원하지 않는 드럼/);assert(d.measures[0].events[0].blank);
});
test('nonfretted input reuses dotted and triplet capacity rules and MIDI advances once',()=>{
 for(const id of ['piano','drums']){const pitches=id==='drums'?[36,42]:[48,60];let d=blank(id);const dotted=enterMidiNotes(d,cursor,pitches,{selectedDuration:'8',dottedMode:'one-shot'});assert.equal(ticksOf(dotted.document.measures[0].events[0]),360);assert.equal(dotted.dottedMode,'off');assert.throws(()=>enterMidiNotes(d,{...cursor,event:3},pitches,{selectedDuration:'2'}));
 let session=null;for(let event=0;event<3;event++){const result=enterMidiNotes(d,{...cursor,event},pitches,{selectedDuration:'8',tupletMode:'active',session});d=result.document;session=result.session;if(event===2)assert(result.completed);}assert.deepEqual(compileDocumentV2(d).errors,[]);assert.equal(nextEntry(d,cursor).cursor.event,1);}
});
test('selected piano chord tones delete independently and ties compare actual pitches',()=>{
 let d=enterMidiNotes(blank('piano'),cursor,[60,64],rhythm).document;const note=d.measures[0].events[0].notes[0];d=deleteTone(d,{...cursor,noteId:note.id});assert.deepEqual(d.measures[0].events[0].notes.map(n=>n.midi),[64]);d=enterMidiNotes(d,{...cursor,event:1},[64],rhythm).document;d=setNoteConnection(d,cursor,'tie');assert.deepEqual(compileDocumentV2(d).issues,[]);assert.equal(guitarVoiceTimeline(compileDocumentV2(d).score).voices[0].duration,2);
 const changed=structuredClone(d);changed.measures[0].events[1].notes[0].midi=65;assert.throws(()=>setNoteConnection({...changed,measures:changed.measures.map(m=>({...m,events:m.events.map(e=>({...e,tieTo:null}))}))},cursor,'tie'));
});
test('conversion between guitar and piano preserves pitch and returning TAB has playable frets',()=>{
 const source=enterFret({...createBlankDocument(),capo:2},cursor,3),piano=convertScoreInstrument(source,'piano');assert.equal(piano.measures[0].events[0].notes[0].midi,69);const guitar=convertScoreInstrument(piano,'guitar');assert.equal(soundingMidi(guitar,guitar.measures[0].events[0].notes[0]),69);assert.deepEqual(compileDocumentV2(guitar).errors,[]);assert.equal(source.capo,2);
 assert.throws(()=>convertScoreInstrument(piano,'drums'),/자동 변환/);assert.throws(()=>convertScoreInstrument(enterMidiNotes(blank('drums'),cursor,[36],rhythm).document,'piano'),/자동 변환/);
});
test('nonfretted documents reject guitar-only operations and invalid imported note data',()=>{
 const d=enterMidiNotes(blank('piano'),cursor,[60],rhythm).document;assert.throws(()=>changeTuning(d,{capo:1}),/튜닝/);assert.throws(()=>enterFret(d,cursor,1),/건반/);assert.throws(()=>setNoteConnection(d,cursor,'H'),/주법/);
 const invalid=structuredClone(d);invalid.measures[0].events[0].notes[0].fret=1;assert(compileDocumentV2(invalid).errors.length);assert.throws(()=>setNoteConnection(enterMidiNotes(blank('drums'),cursor,[36],rhythm).document,cursor,'tie'),/드럼/);
});
import {SCORE_INSTRUMENTS,scoreInstrument} from '../src/etudes/scoreInstruments.js';
import {upgradeDocument} from '../src/etudes/scoreModel.js';
import {toScoreDocument} from '../src/etudes/scoreDocument.js';
import {LIBRARY_KEY,loadLibrary,saveLibraryDocument} from '../src/etudes/scoreLibrary.js';

test('legacy keyboard aliases preserve complete documents across import, conversion, compilation and storage',()=>{
 assert.deepEqual(Object.keys(SCORE_INSTRUMENTS),['guitar','bass','ukulele','piano','drums']);
 assert.equal(scoreInstrument('keyboard'),scoreInstrument('piano'));
 const legacy=enterMidiNotes(blank('piano'),cursor,[0,48,72,127],{selectedDuration:'8',dottedMode:'one-shot'}).document;
 legacy.instrument='keyboard';legacy.bpm=87;legacy.playbackSettings={sound:false,volume:.37,repeat:true};
 const before=structuredClone(legacy),expected={...before,instrument:'piano'};
 assert.deepEqual(upgradeDocument(legacy),expected);
 assert.deepEqual(toScoreDocument({document:legacy}),expected);
 assert.deepEqual(convertScoreInstrument(legacy,'piano'),expected);
 assert.deepEqual(normalizePitches(legacy),normalizePitches(expected));
 const compiled=compileDocumentV2(legacy);assert.deepEqual(compiled.errors,[]);assert.equal(compiled.score.instrument,'piano');
 assert.deepEqual(compiled.score.document,expected);
 let writes=0;const values=new Map([[LIBRARY_KEY,JSON.stringify({version:2,records:{[legacy.id]:{document:legacy,status:'saved',updatedAt:'unchanged'}}})]]);
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{writes++;values.set(k,v);}};
 const loaded=loadLibrary(storage);assert.deepEqual(loaded.records[legacy.id].document,expected);assert.equal(loaded.records[legacy.id].updatedAt,'unchanged');assert.equal(writes,0);
 assert(saveLibraryDocument(storage,legacy).saved);assert.deepEqual(JSON.parse(values.get(LIBRARY_KEY)).records[legacy.id].document,expected);
 assert.deepEqual(legacy,before);
});
