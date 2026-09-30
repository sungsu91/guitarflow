import assert from 'node:assert/strict';
import test from 'node:test';
import {PRACTICE_SELECTION_KEY,readPracticeSelection,writePracticeSelection,resolveLessonSelection} from '../src/pdf/practiceSelection.js';

const memory=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};
const empty={lessonId:'',savedId:'',pdfId:''};

test('the last opened score persists by identifier without replacing score content',()=>{
 const storage=memory();storage.setItem('library','original');
 for(const selection of [
  {lessonId:'night-blooms',savedId:'',pdfId:''},
  {lessonId:'night-blooms',savedId:'custom-score',pdfId:''},
  {lessonId:'night-blooms',savedId:'custom-score',pdfId:'imported-pdf'},
 ]){
  assert.equal(writePracticeSelection({...selection,blob:'not a preference',playing:true},storage),true);
  assert.deepEqual(readPracticeSelection(storage),selection);
 }
 assert.equal(storage.getItem('library'),'original');
});

test('missing, corrupt, and inaccessible storage cannot prevent opening practice',()=>{
 const storage=memory();assert.deepEqual(readPracticeSelection(storage),empty);
 for(const value of ['{invalid','null','[]','42','{"lessonId":42,"savedId":{},"pdfId":false}']){
  storage.setItem(PRACTICE_SELECTION_KEY,value);assert.deepEqual(readPracticeSelection(storage),empty);
 }
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};
 assert.deepEqual(readPracticeSelection(blocked),empty);
 assert.equal(writePracticeSelection({lessonId:'night-blooms'},blocked),false);
});

test('deleted or unreadable saved scores fall back to the previous built-in score',()=>{
 const lessons=[{id:'beginner'},{id:'night-blooms'}];
 const records={saved:{status:'ready'},broken:{status:'unreadable'}};
 const resolve=selection=>resolveLessonSelection(selection,lessons,records,'beginner');
 assert.deepEqual(resolve({lessonId:'night-blooms',savedId:'saved'}),{lessonId:'night-blooms',savedId:'saved'});
 for(const savedId of ['deleted','broken','__proto__']){
  assert.deepEqual(resolve({lessonId:'night-blooms',savedId}),{lessonId:'night-blooms',savedId:''});
 }
 assert.deepEqual(resolve({lessonId:'removed',savedId:'deleted'}),{lessonId:'beginner',savedId:''});
});
