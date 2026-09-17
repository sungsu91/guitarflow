import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreMetadata,scoreCredit} from '../src/etudes/scoreMetadata.js';
import {playheadX} from '../src/etudes/scorePlayhead.js';
import {createBlankDocument} from '../src/etudes/scoreModel.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';
test('save metadata preserves rhythm and survives library reload',()=>{
 const before=createBlankDocument(),updated=scoreMetadata(before,{title:'  연습곡  ',artist:'작곡가',bpm:'92'});
 assert.strictEqual(updated.measures,before.measures);assert.equal(before.title,'새 악보');
 const store=new Map(),storage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
 assert.equal(saveLibraryDocument(storage,updated).saved,true);
 const loaded=loadLibrary(storage).records[updated.id].document;
 assert.equal(loaded.title,'연습곡');assert.equal(loaded.artist,'작곡가');assert.equal(loaded.bpm,92);assert.deepEqual(loaded.measures,before.measures);
 assert.equal(scoreCredit(loaded),'작곡가 · 92 BPM · 4/4 · C');
});
test('invalid save metadata cannot mutate the score',()=>{
 const d=createBlankDocument(),copy=structuredClone(d);
 for(const values of [{title:' ',bpm:60},{title:'곡',bpm:0},{title:'곡',bpm:241},{title:'곡',bpm:60.5}])assert.throws(()=>scoreMetadata(d,values));
 assert.deepEqual(d,copy);
});
test('playhead follows tick positions with proportional dotted and triplet intervals',()=>{
 const points=[{tick:0,x:40},{tick:360,x:100},{tick:480,x:150},{tick:640,x:190},{tick:800,x:230},{tick:960,x:270},{tick:1920,x:450}];
 assert.equal(playheadX(points,180),70);assert.equal(playheadX(points,420),125);assert.equal(playheadX(points,560),170);assert.equal(playheadX(points,1440),360);
 assert.equal(playheadX(points,-20),40);assert.equal(playheadX(points,2000),450);
});
