import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {enterFret,setNoteConnection,enterMutedTone} from '../src/etudes/editorCommands.js';
import {guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
import {slidePairs} from '../src/etudes/slidePairs.js';
function chord(){let d=createBlankDocument();for(const [event,string,fret] of [[0,6,2],[0,5,4],[1,5,5],[1,6,3]])d=enterFret(d,{bar:0,event,string},fret);return d;}
test('double-stop slides match strings across reordered chord tones and survive saving',()=>{
 const d=setNoteConnection(chord(),{bar:0,event:0,string:6},'S');const r=compileDocumentV2(d);assert.deepEqual(r.errors,[]);assert.deepEqual(r.issues,[]);
 const voices=guitarVoiceTimeline(r.score).voices;assert.equal(voices.length,2);for(const v of voices){assert.equal(v.segments.length,2);assert.equal(v.segments[1].connection,'S');assert.equal(v.segments[0].string,v.segments[1].string);}
 const storage=new Map(),adapter={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};assert.equal(saveLibraryDocument(adapter,d).saved,true);assert.deepEqual(compileDocumentV2(loadLibrary(adapter).records[d.id].document).score.measures,r.score.measures);
 assert.equal(setNoteConnection(d,{bar:0,event:0},'S').measures[0].events[0].technique,null);
});
test('slides reject rests, gaps, different string sets and muted destinations',()=>{
 for(const change of [d=>d.measures[0].events[1].rest=true,d=>d.measures[0].events[1].onset+=120,d=>d.measures[0].events[1].notes[0].string=4,d=>d.measures[0].events[1].notes[0].dead=true]){const d=chord();change(d);assert.throws(()=>setNoteConnection(d,{bar:0,event:0},'S'));}
});
test('mixed muted and sounding chord preserves independent dead flags after roundtrip',()=>{
 let d=chord();d=enterMutedTone(d,{bar:0,event:0,string:6});const r=compileDocumentV2(JSON.parse(JSON.stringify(d)));assert.deepEqual(r.errors,[]);assert.equal(r.score.measures[0][0].tones.find(n=>n.string===6).dead,true);assert.notEqual(r.score.measures[0][0].tones.find(n=>n.string===5).dead,true);
});
