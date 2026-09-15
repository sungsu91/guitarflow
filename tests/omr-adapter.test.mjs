import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTromr,convertTromr} from '../src/omr/tromrAdapter.js';
import {compileDocumentV2,patchEvent} from '../src/etudes/scoreModel.js';
import {scoreTimeline,guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
const raw='clef-G2+keySignature-CM+timeSignature-4/4+note-C4_quarter+note-D4_quarter+note-E4_quarter+note-F4_quarter+barline';
const options={octaveShift:0,positions:{3:{string:2,fret:1},4:{string:2,fret:3},5:{string:1,fret:0},6:{string:1,fret:1}},bpm:60,title:'OMR test',sourcePdfId:'pdf-1',runId:'run-1'};
test('actual benchmark token format compiles to shared staff/TAB/playback data',()=>{
 const d=convertTromr(parseTromr(raw),options).document,result=compileDocumentV2(d);
 assert.deepEqual(result.score.measures[0].map(e=>e.midi),[60,62,64,65]);
 assert.deepEqual(result.score.measures[0].map(e=>e.pitch.key),['c/5','d/5','e/5','f/5']); // Existing guitar 8vb staff: sounding MIDI unchanged.
 assert.deepEqual(scoreTimeline(result.score).events.map(e=>[e.midi,e.start,e.duration]),[[60,0,1],[62,1,1],[64,2,1],[65,3,1]]);
 assert.equal(d.omr.reviewed,false);assert.equal(d.omr.sourceMap[0].rect,null);assert.equal(d.origin.sourcePdfId,'pdf-1');
});
test('unsupported symbols and missing metadata block conversion rather than being lost',()=>{
 for(const token of ['note-C4_quarter.','note-C4_eighth_triplet','nonote_quarter','note-C4_quarter|note-E4_half','tie','clef-F4']){
  const p=parseTromr(raw.replace('note-C4_quarter',token));assert.ok(p.unsupported.length);assert.throws(()=>convertTromr(p,options));
 }
 assert.throws(()=>convertTromr(parseTromr(raw.replace('timeSignature-4/4+','')),options));
});
test('fingering and octave require valid explicit choices; mismatch never silently moved',()=>{
 assert.throws(()=>convertTromr(parseTromr(raw),{...options,octaveShift:undefined}));
 assert.throws(()=>convertTromr(parseTromr(raw),{...options,positions:{}}));
 assert.throws(()=>convertTromr(parseTromr(raw),{...options,octaveShift:-12}));
});
test('bar duration issue preserves notes; source and raw result survive save/reload and edits',()=>{
 const p=parseTromr(raw.replace('note-F4_quarter+','')), {document:d,issues}=convertTromr(p,options);assert.ok(issues.length);assert.equal(d.measures[0].events.length,3);
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 assert.equal(saveLibraryDocument(storage,d).record.status,'draft');assert.deepEqual(loadLibrary(storage).records[d.id].document,d);
 const changed=patchEvent(d,0,0,e=>({...e,notes:e.notes.map(n=>({...n,fret:2}))}));assert.equal(d.measures[0].events[0].notes[0].fret,1);assert.equal(changed.measures[0].events[1],d.measures[0].events[1]);assert.deepEqual(changed.omr,d.omr);
});

test('manual articulation on an OMR-origin score reaches shared playback without altering the PDF/source mapping',()=>{
 const d=convertTromr(parseTromr(raw),options).document;
 for(const technique of ['H','S']) {
  const edited=patchEvent(d,0,0,{technique}),checked=compileDocumentV2(edited);
  assert.deepEqual(checked.issues,[]);
  const voices=guitarVoiceTimeline(checked.score).voices;
  assert.equal(voices.length,3);assert.equal(voices[0].segments[1].connection,technique);
  assert.deepEqual(edited.omr,d.omr);assert.equal(edited.origin.sourcePdfId,'pdf-1');
 }
 assert.equal(d.measures[0].events[0].technique,null);
});
