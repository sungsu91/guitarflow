import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2,ticksOf} from '../src/etudes/scoreModel.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';
import {enterMidiNotes} from '../src/etudes/enterMidiNotes.js';
import {setDrumTechnique,drumStrokes} from '../src/etudes/drumTechniques.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
const cursor={bar:0,event:0},rhythm={selectedDuration:'4'};
const make=(pitches=[36,38,42])=>enterMidiNotes(convertScoreInstrument(createBlankDocument(),'drums'),cursor,pitches,rhythm).document;
const selected=d=>({...cursor,noteId:d.measures[0].events[0].notes.find(n=>n.midi===38).id});
test('individual drum techniques are exclusive within each group, with no implicit selection',()=>{
 const original=make(),at=selected(original);
 assert.equal(setDrumTechnique(original,cursor,'accent'),original);
 let d=setDrumTechnique(original,at,'accent');d=setDrumTechnique(d,at,'flam');
 assert.deepEqual(d.measures[0].events[0].notes.find(n=>n.midi===38).drumTechnique,{dynamic:'accent',ornament:'flam'});
 d=setDrumTechnique(d,at,'ghost');d=setDrumTechnique(d,at,'drag');d=setDrumTechnique(d,at,'roll-2');
 const e=d.measures[0].events[0];assert.deepEqual(e.notes.find(n=>n.midi===38).drumTechnique,{dynamic:'ghost',ornament:'roll-2'});
 assert(e.notes.filter(n=>n.midi!==38).every(n=>!n.drumTechnique));
 assert.equal(e.onset,0);assert.equal(ticksOf(e),480);assert.deepEqual(original.measures[0].events[0].notes.map(n=>n.drumTechnique),[undefined,undefined,undefined]);
 const cleared=setDrumTechnique(d,at,'clear');assert(!cleared.measures[0].events[0].notes.find(n=>n.midi===38).drumTechnique);
});
test('adding another drum preserves techniques and rimshot identity; compile/library/playback round trip',()=>{
 let d=make([38]),at=selected(d);d=setDrumTechnique(d,at,'ghost');d=setDrumTechnique(d,at,'drag');d.measures[0].events[0].notes[0].drumArticulation='rimshot';
 const single=compileDocumentV2(d);assert.equal(single.score.measures[0][0].tones[0].id,at.noteId);
 d=enterMidiNotes(d,cursor,[36,42],rhythm).document;
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 assert(saveLibraryDocument(storage,d).saved);const restored=loadLibrary(storage).records[d.id].document;assert.deepEqual(restored,d);
 const compiled=compileDocumentV2(restored);assert.deepEqual(compiled.errors,[]);assert.deepEqual(compiled.issues,[]);
 const timeline=scoreTimeline(compiled.score),snare=timeline.events.find(n=>n.midi===38);
 assert.equal(snare.drumArticulation,'rimshot');assert.equal(snare.drumTechnique.ornament,'drag');assert.equal(drumStrokes(snare).length,3);
 assert(timeline.events.filter(n=>n.midi!==38).every(n=>drumStrokes(n).length===1&&drumStrokes(n)[0].gain===1));
 assert.equal(timeline.duration,1);assert.equal(snare.start,0);assert.equal(snare.duration,1);
});
test('measured rolls follow note values and tempo, buzz bounces differ, grace attacks precede the main beat',()=>{
 const base={duration:1,beatSeconds:1,writtenDuration:'4'};
 for(const [ornament,count] of [['roll-1',2],['roll-2',4],['roll-3',8]]){
  const strokes=drumStrokes({...base,drumTechnique:{ornament}});assert.equal(strokes.length,count);assert(strokes.every(s=>s.offset>=0&&s.offset<1));
 }
 assert.equal(drumStrokes({...base,duration:2,writtenDuration:'2',drumTechnique:{ornament:'roll-1'}}).length,4);
 assert.equal(drumStrokes({...base,duration:.5,writtenDuration:'8',drumTechnique:{ornament:'roll-1'}}).length,2);
 assert.equal(drumStrokes({...base,duration:1.5,drumTechnique:{ornament:'roll-1'}}).length,3);
 const buzz=drumStrokes({...base,drumTechnique:{ornament:'buzz'}});assert(buzz.length>8);assert.notEqual(buzz[0].gain,buzz[1].gain);
 for(const ornament of ['flam','drag']){const strokes=drumStrokes({...base,drumTechnique:{ornament,dynamic:'accent'}});assert.equal(strokes.at(-1).offset,0);assert(strokes.slice(0,-1).every(s=>s.offset<0));}
 assert.equal(drumStrokes({...base,midi:42})[0].gain,1);
});
