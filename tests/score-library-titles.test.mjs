import test from 'node:test';
import assert from 'node:assert/strict';
import {saveLibraryDocument,loadLibrary,renameLibraryDocument} from '../src/etudes/scoreLibrary.js';
import {createBlankDocument} from '../src/etudes/scoreModel.js';
test('duplicate titles preserve documents, updates keep title, and renames avoid collisions',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const docs=Array.from({length:3},()=>({...createBlankDocument(),title:'test'}));
 const saved=docs.map(d=>saveLibraryDocument(storage,d));
 assert.ok(saved.every(r=>r.saved));assert.deepEqual(saved.map(r=>r.record.document.title),['test','test (1)','test (2)']);
 assert.equal(Object.keys(loadLibrary(storage).records).length,3);
 const updated=saveLibraryDocument(storage,{...saved[1].record.document,bpm:99});assert.equal(updated.record.document.title,'test (1)');
 assert.equal(loadLibrary(storage).records[docs[0].id].document.bpm,docs[0].bpm);
 assert.ok(renameLibraryDocument(storage,docs[2].id,'test').saved);
 assert.equal(loadLibrary(storage).records[docs[2].id].document.title,'test (2)');
});
