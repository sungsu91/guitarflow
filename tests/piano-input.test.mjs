import test from 'node:test';import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2,ticksOf} from '../src/etudes/scoreModel.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';
import {ensurePianoVoices,enterPiano,pianoCursor,pianoVoiceEdit,stepPiano,pianoPosition} from '../src/etudes/pianoInput.js';
import {setEventDuration,setNoteConnection} from '../src/etudes/editorCommands.js';
import {scoreTimeline,guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
const blank=()=>ensurePianoVoices(convertScoreInstrument(createBlankDocument(),'piano'));
const rhythm={selectedDuration:'8'};
const checked=d=>{const r=compileDocumentV2(d);assert.deepEqual(r.errors,[]);assert.deepEqual(r.issues,[]);return r.score;};
const written=(d,hand)=>d.measures.flatMap(m=>m.events.filter(e=>e.voice===hand&&!e.blank));
test('sequential repeated pitches, rests and automatic bar creation use actual rhythm',()=>{
 let d=blank(),c=pianoCursor(d);for(const pitch of [60,60,62,null,64,65,67,69,71]){const r=enterPiano(d,c,pitch==null?[]:[pitch],rhythm,{rest:pitch==null});d=r.document;c=r.cursor;}
 assert.equal(d.measures.length,2);assert.equal(c.bar,1);assert.equal(d.measures[c.bar].events[c.event].onset,240);assert.deepEqual(written(d,'right').map(e=>e.notes[0]?.midi??null),[60,60,62,null,64,65,67,69,71]);assert(written(d,'right').every(e=>ticksOf(e)===240));assert.equal(written(d,'left').length,0);checked(d);
});
test('each hand resumes its own cursor and rhythm; same-pitch overlapping hands remain independent',()=>{
 let d=blank(),c=pianoCursor(d);for(const pitch of [60,62,64]){const r=enterPiano(d,c,[pitch],rhythm);d=r.document;c=r.cursor;}const right=pianoPosition(d,c);
 let r=enterPiano(d,pianoCursor(d,{bar:0,onset:0},'left'),[60],{selectedDuration:'2'});d=r.document;const left=pianoPosition(d,r.cursor);
 r=enterPiano(d,pianoCursor(d,right,'right'),[65],rhythm);d=r.document;
 assert.equal(written(d,'right').at(-1).onset,720);assert.equal(pianoCursor(d,left,'left').hand,'left');assert.equal(d.measures[0].events[pianoCursor(d,left,'left').event].onset,960);
 const voices=scoreTimeline(checked(d)).events;assert.equal(voices.filter(e=>e.start===0).length,2);assert.equal(voices.find(e=>e.voice==='left').duration,2);
});
test('chord entry deduplicates and advances once, MIDI chord is one rhythmic group',()=>{
 let d=blank(),c=pianoCursor(d);for(const midi of [60,64,67,60]){const r=enterPiano(d,c,[midi],rhythm,{chord:true,advance:false});d=r.document;c=r.cursor;}
 assert.deepEqual(written(d,'right')[0].notes.map(n=>n.midi),[60,64,67]);const next=stepPiano(d,c);d=enterPiano(next.document,next.cursor,[62,65,69],rhythm).document;
 assert.deepEqual(written(d,'right').map(e=>e.onset),[0,240]);checked(d);
});
test('duration edits consume blanks in only the selected hand and reject occupied overlaps',()=>{
 let d=blank();d=enterPiano(d,pianoCursor(d),[60],rhythm).document;d=enterPiano(d,pianoCursor(d,{bar:0,onset:0},'left'),[48],{selectedDuration:'1'}).document;
 const before=structuredClone(written(d,'left'));d=pianoVoiceEdit(d,pianoCursor(d),(voice,c)=>setEventDuration(voice,c,'4')).document;assert.deepEqual(written(d,'left'),before);
 d=enterPiano(d,pianoCursor(d,{bar:0,onset:480}),[62],rhythm).document;assert.throws(()=>pianoVoiceEdit(d,pianoCursor(d),(voice,c)=>setEventDuration(voice,c,'2')),/겹칩니다/);checked(d);
});
test('dotted and triplet input reuse exact ticks independently of the other hand',()=>{
 let d=blank(),r=enterPiano(d,pianoCursor(d),[60],{selectedDuration:'8',dottedMode:'one-shot'});d=r.document;assert.equal(d.measures[0].events[r.cursor.event].onset,360);assert.equal(r.dottedMode,'off');
 let c=pianoCursor(d,{bar:0,onset:0},'left'),session=null;for(const midi of [48,50,52]){r=enterPiano(d,c,[midi],{selectedDuration:'8',tupletMode:'active',session});d=r.document;c=r.cursor;session=r.session;}
 assert(r.completed);assert.deepEqual(written(d,'left').map(e=>[e.onset,ticksOf(e)]),[[0,160],[160,160],[320,160]]);checked(d);
});
test('existing note edits preserve neighbors and untouched automatic input refuses to overwrite',()=>{
 let d=blank(),r=enterPiano(d,pianoCursor(d),[60],rhythm);d=enterPiano(r.document,r.cursor,[62],rhythm).document;const neighbor=structuredClone(written(d,'right')[1]);assert.throws(()=>enterPiano(d,pianoCursor(d),[65],rhythm),/이미 작성/);
 d=enterPiano(d,pianoCursor(d),[65],rhythm,{editing:true}).document;assert.deepEqual(written(d,'right')[1],neighbor);assert.equal(written(d,'right')[0].notes[0].midi,65);checked(d);
});
test('legacy mixed-hand chords, ties, settings and independent voices round-trip through storage',()=>{
 let legacy=convertScoreInstrument(createBlankDocument(),'piano');for(const e of legacy.measures[0].events){e.blank=false;e.rest=false;e.notes=[{id:e.id+'r',midi:60,hand:'right'},{id:e.id+'l',midi:48,hand:'left'}];}legacy.measures[0].events[0].tieTo=legacy.measures[0].events[1].id;legacy.playbackSettings={sound:false,volume:.4};
 const d=ensurePianoVoices(legacy),score=checked(d);assert.equal(scoreTimeline(score).events.filter(e=>e.start===0&&e.duration===2).length,2);assert.equal(legacy.measures[0].events.length,4);
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};assert(saveLibraryDocument(storage,d).saved);assert.deepEqual(loadLibrary(storage).records[d.id].document,d);
});
test('rests in one hand do not damp the other and ties cross bars within the same hand',()=>{
 let d=blank(),r=enterPiano(d,pianoCursor(d),[60],{selectedDuration:'1'});d=r.document;d=enterPiano(d,r.cursor,[60],{selectedDuration:'4'}).document;
 d=pianoVoiceEdit(d,pianoCursor(d),(voice,c)=>setNoteConnection(voice,c,'tie')).document;
 d=enterPiano(d,pianoCursor(d,{bar:0,onset:480},'left'),[],{selectedDuration:'4'},{rest:true}).document;
 const timeline=guitarVoiceTimeline(checked(d));const right=timeline.voices.find(e=>e.voice==='right');assert.equal(right.duration,5);assert.equal(right.silenceAt,undefined);
});
import {movePianoHand} from '../src/etudes/pianoInput.js';
test('explicit hand reassignment preserves pitch and onset without overwriting the target rhythm',()=>{
 let d=blank(),r=enterPiano(d,pianoCursor(d),[60],rhythm);d=enterPiano(r.document,r.cursor,[62],rhythm).document;const source=written(d,'right')[1],at={...pianoCursor(d,{bar:0,onset:240}),noteId:source.notes[0].id};
 const moved=movePianoHand(d,at,'left');assert.equal(written(moved.document,'left')[0].onset,240);assert.equal(written(moved.document,'left')[0].notes[0].midi,62);assert.equal(written(moved.document,'right').length,1);checked(moved.document);
 d=enterPiano(d,pianoCursor(d,{bar:0,onset:0},'left'),[48],{selectedDuration:'2'}).document;assert.throws(()=>movePianoHand(d,at,'left'),/겹칩니다/);
});
test('conversion never flattens independent hand rhythms destructively',()=>{
 let d=blank();d=enterPiano(d,pianoCursor(d),[60],rhythm).document;assert.equal(convertScoreInstrument(d,'guitar').instrument,'guitar');
 d=enterPiano(d,pianoCursor(d,{bar:0,onset:0},'left'),[48],{selectedDuration:'2'}).document;const before=structuredClone(d);assert.throws(()=>convertScoreInstrument(d,'guitar'),/독립 리듬/);assert.deepEqual(d,before);
});
