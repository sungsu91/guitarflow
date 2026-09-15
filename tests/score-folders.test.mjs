import test from 'node:test';
import assert from 'node:assert/strict';
import {SCORE_FOLDERS_KEY,loadScoreFolders,updateScoreFolders} from '../src/pdf/scoreFolders.js';
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
test('existing libraries need no migration and mixed documents move together',()=>{
 const s=storage();s.setItem('fretiva.etude.library.v2','untouched');assert.deepEqual(loadScoreFolders(s).folders,[]);
 updateScoreFolders(s,{type:'create',id:'a',name:'연습'});updateScoreFolders(s,{type:'move',keys:['pdf:1','score:1'],folderId:'a'});
 assert.deepEqual(loadScoreFolders(s).locations,{'pdf:1':'a','score:1':'a'});assert.equal(s.getItem('fretiva.etude.library.v2'),'untouched');
});
test('rename and folder deletion preserve other folders and return contents to root',()=>{
 const s=storage();for(const id of ['a','b'])updateScoreFolders(s,{type:'create',id,name:id});
 updateScoreFolders(s,{type:'move',keys:['pdf:1'],folderId:'a'});updateScoreFolders(s,{type:'move',keys:['score:1'],folderId:'b'});
 updateScoreFolders(s,{type:'rename',id:'a',name:'새 이름'});assert.equal(loadScoreFolders(s).locations['pdf:1'],'a');
 updateScoreFolders(s,{type:'remove',id:'a'});assert.deepEqual(loadScoreFolders(s).locations,{'score:1':'b'});
});
test('invalid destination and duplicate name cannot partially change storage',()=>{
 const s=storage();updateScoreFolders(s,{type:'create',id:'a',name:'연습'});const before=s.getItem(SCORE_FOLDERS_KEY);
 assert.throws(()=>updateScoreFolders(s,{type:'move',keys:['pdf:1'],folderId:'missing'}));assert.throws(()=>updateScoreFolders(s,{type:'create',id:'b',name:'연습'}));assert.equal(s.getItem(SCORE_FOLDERS_KEY),before);
});
test('storage failure and malformed saved data are never replaced by empty data',()=>{
 const s=storage();s.setItem(SCORE_FOLDERS_KEY,'broken');assert.throws(()=>updateScoreFolders(s,{type:'create',id:'a',name:'연습'}));assert.equal(s.getItem(SCORE_FOLDERS_KEY),'broken');
 const failing={getItem:()=>null,setItem:()=>{throw Error('quota');}};assert.throws(()=>updateScoreFolders(failing,{type:'create',id:'a',name:'연습'}),/quota/);
});
test('favorites extend existing v1 folders without changing document placement',()=>{
 const s=storage(),old={version:1,folders:[{id:'a',name:'교재'}],locations:{'pdf:1':'a'}};
 s.setItem(SCORE_FOLDERS_KEY,JSON.stringify(old));assert.deepEqual(loadScoreFolders(s).favorites,{});assert.equal(s.getItem(SCORE_FOLDERS_KEY),JSON.stringify(old));
 updateScoreFolders(s,{type:'favorite',keys:['pdf:1','score:2'],value:true});assert.deepEqual(loadScoreFolders(s).locations,old.locations);assert.deepEqual(loadScoreFolders(s).favorites,{'pdf:1':true,'score:2':true});
 updateScoreFolders(s,{type:'move',keys:['pdf:1'],folderId:null});assert.equal(loadScoreFolders(s).favorites['pdf:1'],true);
 updateScoreFolders(s,{type:'favorite',keys:['pdf:1'],value:false});assert.deepEqual(loadScoreFolders(s).favorites,{'score:2':true});
});
