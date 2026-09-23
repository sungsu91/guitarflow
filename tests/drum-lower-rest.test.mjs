import test from 'node:test';
import assert from 'node:assert/strict';
import {insertDrumLowerRest} from '../src/etudes/drumInput.js';
const fixture=()=>({measures:[{events:Array.from({length:16},(_,i)=>({onset:i*120,duration:'16',notes:[{midi:i===0||i===4?36:i===2||i===6?38:42}]}))}]});
test('lower rest fits before next kick without changing upper notes',()=>{
 const d=fixture(),next=insertDrumLowerRest(d,{bar:0,event:2});
 assert.equal(next.measures[0].events[2].lowerRestDuration,'8');
 assert.deepEqual(next.measures[0].events.map(e=>e.notes),d.measures[0].events.map(e=>e.notes));
 assert.equal(insertDrumLowerRest(d,{bar:0,event:6}).measures[0].events[6].lowerRestDuration,'4');
 assert.throws(()=>insertDrumLowerRest(d,{bar:0,event:0}),/현재 위치/);
 assert.equal(insertDrumLowerRest(d,{bar:0,event:15}).measures[0].events[15].lowerRestDuration,'16');
});
