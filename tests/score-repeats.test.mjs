import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankMeasure,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {enterFret} from '../src/etudes/editorCommands.js';
import {setScoreRepeat,scoreBarOrder,repeatIssues} from '../src/etudes/scoreRepeats.js';
import {scoreTimeline,guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';

function fixture(count=4){let d=createBlankDocument();d.measures=Array.from({length:count},()=>blankMeasure());for(let bar=0;bar<count;bar++)for(let event=0;event<4;event++)d=enterFret(d,{bar,event,string:6},bar+2);return d;}
const compile=d=>compileDocumentV2(d).score;
test('repeat range plays twice, with untouched written rhythm and simultaneous chords',()=>{
 let d=fixture();d=enterFret(d,{bar:1,event:0,string:5},7);const before=structuredClone(d);
 d=setScoreRepeat(setScoreRepeat(d,1,'start'),2,'end');
 assert.deepEqual(before.measures.map(m=>m.events),d.measures.map(m=>m.events));
 assert.deepEqual(scoreBarOrder(compile(d)),[0,1,2,1,2,3]);
 const t=scoreTimeline(compile(d),120);assert.equal(t.duration,12);
 assert.deepEqual(t.events.filter(e=>e.string===6).map(e=>e.start),Array.from({length:24},(_,i)=>i/2));
 assert.deepEqual(t.events.filter(e=>e.string===5).map(e=>e.start),[2,6]);
 assert.deepEqual(guitarVoiceTimeline(compile(d),120).order,t.order);
 assert.deepEqual(before.measures.map(m=>m.events),d.measures.map(m=>m.events));
});
test('single-bar and consecutive independent ranges are bounded to two passes',()=>{
 let d=fixture(3);for(const bar of [0,1])d=setScoreRepeat(setScoreRepeat(d,bar,'start'),bar,'end');
 assert.deepEqual(scoreBarOrder(compile(d)),[0,0,1,1,2]);
 assert.equal(scoreTimeline(compile(d),60).duration,20);
});
test('incomplete pairs are editable, reported by save validation and cannot play',()=>{
 const original=fixture(),started=setScoreRepeat(original,0,'start');
 assert(compileDocumentV2(started).issues.some(s=>s.includes('반복 끝')));
 assert.throws(()=>scoreTimeline(compile(started)),/반복 끝/);
 assert.throws(()=>setScoreRepeat(original,2,'end'),/반복 시작/);
 assert.throws(()=>setScoreRepeat(started,1,'start'),/중첩/);
 const paired=setScoreRepeat(started,2,'end'),cleared=setScoreRepeat(paired,0,'clear');
 assert.equal(cleared.measures[0].repeatStart,undefined);assert.equal(cleared.measures[2].repeatEnd,true);
 assert(compileDocumentV2(cleared).issues.some(s=>s.includes('반복 시작')));
 assert.equal(repeatIssues(setScoreRepeat(cleared,2,'clear').measures).length,0);
 assert.equal(paired.measures[0].repeatStart,true);
});
test('save and reload retain marks, invalid imported marks are preserved for repair',()=>{
 const d=setScoreRepeat(setScoreRepeat(fixture(),0,'start'),3,'end');
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 assert.equal(saveLibraryDocument(storage,d).saved,true);
 const loaded=loadLibrary(storage).records[d.id].document;assert.deepEqual(loaded,d);
 assert.deepEqual(scoreBarOrder(compile(loaded)),[0,1,2,3,0,1,2,3]);
 const invalid=structuredClone(d);invalid.measures[1].repeatStart=true;const copy=structuredClone(invalid);
 assert(compileDocumentV2(invalid).issues.some(s=>s.includes('중첩')));assert.deepEqual(invalid,copy);
 assert.equal(repeatIssues(setScoreRepeat(invalid,1,'clear').measures).length,0);
});
test('ties do not leak across repeat jumps, but survive ordinary bar transitions',()=>{
 let d=fixture(2);d.measures[1].events[0].notes[0].fret=2;
 d.measures[0].events[3].tieTo=d.measures[1].events[0].id;
 d=setScoreRepeat(setScoreRepeat(d,0,'start'),1,'end');
 const t=scoreTimeline(compile(d),60);assert.equal(t.events.length,14);
 assert.deepEqual(t.events.filter(e=>e.duration===2).map(e=>e.start),[3,11]);
 assert.equal(t.duration,16);
});
