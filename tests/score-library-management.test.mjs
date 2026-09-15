import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument} from '../src/etudes/scoreModel.js';
import {LIBRARY_KEY,saveLibraryDocument,loadLibrary,renameLibraryDocument,deleteLibraryDocument,markLibraryPracticed} from '../src/etudes/scoreLibrary.js';
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
test('Library rename and delete preserve other documents and musical data',()=>{
 const storage=memory(),a=createBlankDocument(),b=createBlankDocument();saveLibraryDocument(storage,a);saveLibraryDocument(storage,b);
 const before=loadLibrary(storage).records;
 assert.equal(renameLibraryDocument(storage,a.id,'이름 변경').saved,true);
 const renamed=loadLibrary(storage).records;assert.deepEqual(renamed[a.id].document.measures,before[a.id].document.measures);assert.deepEqual(renamed[b.id],before[b.id]);
 assert.equal(markLibraryPracticed(storage,a.id).saved,true);const practiced=loadLibrary(storage).records[a.id].lastPracticedAt;
 saveLibraryDocument(storage,renamed[a.id].document);assert.equal(loadLibrary(storage).records[a.id].lastPracticedAt,practiced);
 assert.equal(deleteLibraryDocument(storage,a.id).saved,true);assert.deepEqual(loadLibrary(storage).records,{[b.id]:before[b.id]});
});
test('Unreadable library and failed writes cannot silently replace saved content',()=>{
 const storage=memory();storage.setItem(LIBRARY_KEY,'not json');const before=storage.getItem(LIBRARY_KEY);
 assert.equal(deleteLibraryDocument(storage,'missing').saved,false);assert.equal(storage.getItem(LIBRARY_KEY),before);
 const valid=memory(),d=createBlankDocument();saveLibraryDocument(valid,d);const raw=valid.getItem(LIBRARY_KEY);valid.setItem=()=>{throw Error('quota');};
 assert.equal(renameLibraryDocument(valid,d.id,'new').saved,false);assert.equal(valid.getItem(LIBRARY_KEY),raw);
});
