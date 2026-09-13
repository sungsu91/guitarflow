import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE_ETUDES} from '../src/etudes/catalog.js';
import {toScoreDocument,compileScoreDocument,updateDocumentChordFret,persistScoreEdit,readScoreEdits,EDITS_STORAGE_KEY} from '../src/etudes/scoreDocument.js';
const study=id=>BASE_ETUDES.find(e=>e.templateId===id);
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};

test('all 65 built-in scores round-trip through the portable editor format',()=>{
 for(const base of BASE_ETUDES){
  const doc=JSON.parse(JSON.stringify(toScoreDocument(base)));
  const {score,errors}=compileScoreDocument(doc,base);
  assert.deepEqual(errors,[],base.id);assert.ok(score);
  assert.deepEqual(score.measures.map(m=>m.map(n=>({rest:n.rest,duration:n.duration,technique:n.technique??null,tones:n.rest?[]:(n.tones??[n]).map(t=>[t.string,t.fret,t.midi,t.pitch.key])}))),base.measures.map(m=>m.map(n=>({rest:n.rest,duration:n.duration,technique:n.technique??null,tones:n.rest?[]:(n.tones??[n]).map(t=>[t.string,t.fret,t.midi,t.pitch.key])}))));
  assert.deepEqual(score.chordShapes,base.chordShapes?.map(g=>({...g,barre:g.barre??null})));
 }
});

test('changing TAB rebuilds MIDI and written guitar pitch without mutating the original',()=>{
 const base=study('triad-start'),doc=toScoreDocument(base);
 doc.measures[0].events[0].notes[0].fret=3;
 const {score,errors}=compileScoreDocument(doc,base);
 assert.deepEqual(errors,[]);assert.equal(score.measures[0][0].midi,43);assert.equal(score.measures[0][0].pitch.key,'g/3');
 assert.equal(base.measures[0][0].fret,2);
});

test('editing a chord fret synchronizes its notes and retains the six-to-one storage order',()=>{
 const base=study('chord-three-strings'),doc=toScoreDocument(base);
 const next=updateDocumentChordFret(doc,0,1,3);
 assert.equal(next.measures[0].chord.frets[5],3);
 assert.equal(doc.measures[0].chord.frets[5],0);
 assert.ok(next.measures[0].events.flatMap(e=>e.notes).filter(n=>n.string===1).every(n=>n.fret===3));
 const {score,errors}=compileScoreDocument(next,base);
 assert.deepEqual(errors,[]);
 assert.equal(score.measures[0][2].midi,67);
 assert.equal(score.measures[0][2].pitch.key,'g/5');
});

test('malformed notes, wrong chords, metre, duplicate strings and invalid links cannot be saved',()=>{
 const base=study('chord-three-strings');
 for(const mutate of [
  d=>d.measures[0].events[0].duration='8',
  d=>d.measures[0].events[0].notes[0].fret=4,
  d=>d.measures[0].events[0].notes[0].string=0,
  d=>d.measures[0].events[0].notes=[null],
  d=>d.measures[0].events[0].notes[1].string=5,
  d=>d.measures[0].events[0].technique='H',
  d=>d.measures[0].chord.name='Am',
  d=>d.measures[0].chord.frets.fill(null),
  d=>d.measures[0].chord.barre={fret:1,from:6,to:1},
  d=>d.measures=[],
  d=>d.measures[0].events[0].rest='true',
 ]){const doc=toScoreDocument(base);mutate(doc);const result=compileScoreDocument(doc,base);assert.equal(result.score,null);assert.ok(result.errors.length);}
 const wrong=toScoreDocument(study('chord-bass-answer'));assert.equal(compileScoreDocument(wrong,base).score,null);
});

test('save, reload and restore operate on one lesson and preserve other saved edits',()=>{
 const storage=memory(),one=study('triad-start'),two=study('chord-three-strings');
 const d1=toScoreDocument(one),d2=toScoreDocument(two);d1.bpm=61;d2.title='내 C 반주';
 assert.ok(persistScoreEdit(storage,one,d1).score);assert.ok(persistScoreEdit(storage,two,d2).score);
 const loaded=readScoreEdits(storage,BASE_ETUDES);assert.deepEqual(loaded.errors,[]);
 assert.equal(loaded.scores[one.id].bpm,61);assert.equal(loaded.scores[two.id].title,'내 C 반주');
 assert.ok(persistScoreEdit(storage,one,null).score);
 const restored=readScoreEdits(storage,BASE_ETUDES);assert.equal(restored.scores[one.id],undefined);assert.equal(restored.scores[two.id].title,'내 C 반주');
 const bad=toScoreDocument(one);bad.measures[0].events[0].duration='8';
 const before=storage.getItem(EDITS_STORAGE_KEY);assert.equal(persistScoreEdit(storage,one,bad).score,null);assert.equal(storage.getItem(EDITS_STORAGE_KEY),before);
});

test('corrupt storage and quota failures are reported without claiming success',()=>{
 const storage=memory();storage.setItem(EDITS_STORAGE_KEY,'broken');
 const loaded=readScoreEdits(storage,BASE_ETUDES);assert.ok(loaded.errors.length);assert.deepEqual(loaded.scores,{});
 const base=study('triad-start');
 const failed=persistScoreEdit({getItem:()=>null,setItem:()=>{throw Error('quota');}},base,toScoreDocument(base));
 assert.equal(failed.score,null);assert.ok(failed.errors.length);
});
