import test from 'node:test';
import assert from 'node:assert/strict';
import {editorChangeLocation,editorLocationLabel} from '../src/etudes/editorChangeLocation.js';

const fixture=()=>({instrument:'guitar',meter:[4,4],measures:Array.from({length:40},(_,i)=>({id:`m${i}`,events:Array.from({length:4},(_,j)=>({id:`e${i}-${j}`,onset:j*480,duration:'4',notes:[{id:`n${i}-${j}`,string:2,fret:3}]}))}))});
test('history finds the edited note even when the user has moved to another bar',()=>{
 const before=fixture(),after=structuredClone(before);after.measures[28].events[2].notes[0].fret=7;
 for(const [a,b] of [[before,after],[after,before]]){const result=editorChangeLocation(a,b);assert.deepEqual(result.bars,[28]);assert.equal(result.cursor.bar,28);assert.equal(result.cursor.event,2);assert.equal(result.cursor.string,2);}
 assert.equal(before.measures[28].events[2].notes[0].fret,3);
});
test('bar insertion and deletion do not label every shifted bar as changed',()=>{
 const before=fixture(),after=structuredClone(before),inserted={id:'new',events:[{id:'new-event',onset:0,duration:'w',rest:true,notes:[]}]};after.measures.splice(12,0,inserted);
 assert.deepEqual(editorChangeLocation(before,after).bars,[12]);assert.deepEqual(editorChangeLocation(after,before).bars,[12]);
 const last=structuredClone(before);last.measures.pop();assert.equal(editorChangeLocation(before,last).cursor.bar,38);
});
test('deleting the last note focuses the surviving preceding note',()=>{
 const before=fixture(),after=structuredClone(before);after.measures[8].events.pop();
 assert.equal(editorChangeLocation(before,after).cursor.event,2);
});
test('deleting one chord tone points to its string, not an unchanged chord tone',()=>{
 const before=fixture();before.measures[3].events[1].notes.push({id:'removed',string:5,fret:2});
 const after=structuredClone(before);after.measures[3].events[1].notes.pop();
 assert.equal(editorChangeLocation(before,after).cursor.string,5);
});
test('batch changes expose their extent and settings changes do not invent a note location',()=>{
 const before=fixture(),after=structuredClone(before);for(const index of [3,7,20])after.measures[index].events[1].notes[0].fret=5;
 assert.deepEqual(editorChangeLocation(before,after).bars,[3,7,20]);assert.equal(editorChangeLocation(before,after).cursor.bar,3);
 assert.deepEqual(editorChangeLocation(before,{...before,bpm:100}),{bars:[],cursor:null});
});
test('rests and inherited time signatures have accurate location labels',()=>{
 const doc=fixture();doc.measures[1].meter=[6,8];doc.measures[5].events[1]={id:'rest',onset:480,rest:true,notes:[]};
 assert.equal(editorLocationLabel(doc,{bar:5,event:1,string:2}),'6마디 · 3박 · 2번째 쉼표');
});
