import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankEvent,newId,ticksOf} from '../src/etudes/scoreModel.js';
import {applyPicking} from '../src/etudes/editorCommands.js';

const bar=spec=>{
 let onset=0;
 return {id:newId('bar'),chord:null,events:spec.map(item=>{
  const options=typeof item==='string'?{duration:item}:item;
  const e={...blankEvent(onset,options.duration),rest:false,blank:false,notes:[{id:newId('tone'),string:1,fret:3}],...options};
  if(e.rest)e.notes=[];onset+=ticksOf(e);return e;
 })};
};
const doc=(...bars)=>({...createBlankDocument(),measures:bars.map(bar)});
const directions=d=>d.measures.map(m=>m.events.map(e=>e.pickStroke??null));

test('rhythm grid returns to downbeats after an odd number of attacks and preserves every other field',()=>{
 const d=doc(['2','4','4'],['4','4','4','4']),before=structuredClone(d);
 assert.equal(directions(applyPicking(d))[1][0],'up','legacy continuous alternation demonstrates the reported issue');
 const result=applyPicking(d,{pattern:'rhythm-auto'});
 assert.deepEqual(directions(result),[['down','down','down'],['down','down','down','down']]);
 assert.deepEqual(d,before);
 result.measures.forEach((m,b)=>m.events.forEach((e,i)=>{const {pickStroke,...data}=e;assert.deepEqual(data,d.measures[b].events[i]);assert.equal(e.notes,d.measures[b].events[i].notes);}));
});

test('eight-note pendulum accounts for rests, dotted lengths and offbeat entrances',()=>{
 const d=doc([{duration:'8',rest:true},'8','4',{duration:'4',dotted:true},'8']);
 assert.deepEqual(directions(applyPicking(d,{pattern:'rhythm-auto'})),[[null,'up','down','down','up']]);
});

test('mixed dotted eighth and sixteenth strums use actual time, not their order',()=>{
 const d=doc([{duration:'8',dotted:true},'16','8','16','16','8','8','8','8']);
 assert.deepEqual(directions(applyPicking(d,{pattern:'rhythm-auto'})),[['down','up','down','down','up','down','down','down','down']]);
 assert.deepEqual(directions(applyPicking(d,{pattern:'rhythm-16'})),directions(applyPicking(d,{pattern:'rhythm-auto'})));
 const eight=doc(Array(8).fill('8'));
 assert.deepEqual(directions(applyPicking(eight,{pattern:'rhythm-8'})),[['down','up','down','up','down','up','down','up']]);
 assert.deepEqual(directions(applyPicking(eight,{pattern:'rhythm-16'})),[Array(8).fill('down')]);
});

test('auto chooses each bar independently and handles finer subdivisions without flipping later beats',()=>{
 const d=doc(['8','8'],['32','32','16','8','4']);
 assert.deepEqual(directions(applyPicking(d,{pattern:'rhythm-auto'})),[['down','up'],['down','up','down','down','down']]);
});

test('sequential picking restarts on bars, beats or rests only when selected',()=>{
 const d=doc(['2','4','4'],['4','4','4','4']);
 assert.deepEqual(directions(applyPicking(d,{restart:'bar'})),[['down','up','down'],['down','up','down','up']]);
 assert.deepEqual(directions(applyPicking(d,{restart:'bar',pattern:'alternate-up'})),[['up','down','up'],['up','down','up','down']]);
 const beats=doc(['8','8','4','8','8','4']);
 assert.deepEqual(directions(applyPicking(beats,{restart:'beat'})),[['down','up','down','down','up','down']]);
 const rests=doc(['8',{duration:'8',rest:true},'4','4','4']);
 assert.deepEqual(directions(applyPicking(rests,{restart:'rest'})),[['down',null,'down','up','down']]);
 rests.measures[0].events.splice(1,1);
 assert.deepEqual(directions(applyPicking(rests,{restart:'rest'})),[['down','down','up','down']],'implicit silence also restarts');
});

test('beat restart respects compound and changed meters, including triplet groups',()=>{
 const d=doc(Array(6).fill('8'),Array(4).fill('8'));d.meter=[6,8];d.measures[1].meter=[2,4];
 assert.deepEqual(directions(applyPicking(d,{restart:'beat'})),[['down','up','down','down','up','down'],['down','up','down','up']]);
 const triplets=doc(Array.from({length:6},(_,i)=>({duration:'8',tuplet:{actualNotes:3,normalNotes:2,groupId:`t-${Math.floor(i/3)}`}})));
 assert.deepEqual(directions(applyPicking(triplets,{restart:'beat'})),[['down','up','down','down','up','down']]);
});

test('range boundaries preserve tied arrivals and legato while rhythmic phase is unchanged',()=>{
 const d=doc(['2','2'],Array(8).fill('8'));d.measures[0].events[1].tieTo=d.measures[1].events[0].id;
 d.measures[1].events[2].technique='H';
 const result=applyPicking(d,{pattern:'rhythm-auto',start:1,end:1});
 assert.equal(result.measures[0],d.measures[0]);
 assert.deepEqual(directions(result)[1],[null,'up','down',null,'down','up','down','up']);
 assert.equal(directions(applyPicking(d,{pattern:'rhythm-auto',start:1,end:1,skipLegato:false}))[1][3],'up');
});

test('an incompatible grid never partly overwrites the document; unsupported tuplets stay explicit',()=>{
 const d=doc(['4','4','4','4'],['16','16','8','4','2']),before=structuredClone(d);
 assert.throws(()=>applyPicking(d,{pattern:'rhythm-8'}),/2마디/);assert.deepEqual(d,before);
 const triplets=doc(['4'],Array.from({length:3},()=>({duration:'8',tuplet:{actualNotes:3,normalNotes:2,groupId:'t'}})));
 assert.throws(()=>applyPicking(triplets,{pattern:'rhythm-auto'}),/셋잇단음/);
 assert.doesNotThrow(()=>applyPicking(triplets,{pattern:'rhythm-auto',start:0,end:0}),'unselected tuplets do not block selected bars');
});
