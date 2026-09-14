import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankMeasure,patchEvent} from '../src/etudes/scoreModel.js';
import {insertEvent,splitEvent,enterFret,applyPicking,moveTone} from '../src/etudes/editorCommands.js';
import {compileScoreDocument} from '../src/etudes/scoreDocument.js';
const cursor={bar:0,event:0,string:3};
test('insert before preserves the prefix and moves the selected beat and suffix only',()=>{
 const d=enterFret(createBlankDocument(),cursor,7);d.measures.push(blankMeasure());const next=insertEvent(d,{...cursor,event:1},{before:true});
 assert.strictEqual(next.measures[0].events[0],d.measures[0].events[0]);assert.strictEqual(next.measures[1],d.measures[1]);assert.equal(next.measures[0].events[1].rest,true);assert.equal(next.measures[0].events[2].id,d.measures[0].events[1].id);assert.deepEqual(next.measures[0].events.map(e=>e.onset),[0,480,960,1440,1920]);
 const first=insertEvent(d,cursor,{before:true});assert.equal(first.measures[0].events[0].rest,true);assert.equal(first.measures[0].events[1].notes[0].fret,7);
});
test('drag moves one tone into a rest without changing unrelated music or timing',()=>{
 const d=enterFret(createBlankDocument(),cursor,7);d.measures.push(blankMeasure());const snapshot=structuredClone(d),to={bar:1,event:1,string:3,mode:'tab'},next=moveTone(d,cursor,to);
 assert.deepEqual(d,snapshot);assert.equal(next.measures[0].events[0].rest,true);assert.equal(next.measures[1].events[1].notes[0].id,d.measures[0].events[0].notes[0].id);assert.strictEqual(next.measures[0].events[1],d.measures[0].events[1]);assert.strictEqual(next.measures[1].events[0],d.measures[1].events[0]);assert.deepEqual(compileScoreDocument(next).issues,[]);
 assert.deepEqual(next.measures.map(m=>m.events.map(e=>[e.id,e.onset,e.duration])),d.measures.map(m=>m.events.map(e=>[e.id,e.onset,e.duration])));
});
test('vertical drag synchronizes sounding pitch and only changes the selected chord tone',()=>{
 let d=enterFret(createBlankDocument(),cursor,7);d=enterFret(d,{...cursor,string:1},5);
 const next=moveTone(d,cursor,{...cursor,string:4,mode:'tab'}),tone=next.measures[0].events[0].notes.find(n=>n.string===4);
 assert.equal(tone.fret,7);assert.equal(next.tuning[3]+tone.fret,57);assert.strictEqual(next.measures[0].events[0].notes[1],d.measures[0].events[0].notes[1]);
 const staff=moveTone(d,cursor,{...cursor,mode:'staff',midi:64});assert.equal(staff.measures[0].events[0].notes[0].fret,9);
 assert.throws(()=>moveTone(d,cursor,{...cursor,string:1,mode:'tab'}),/이미/);assert.throws(()=>moveTone(d,cursor,{...cursor,mode:'staff',midi:100}),/현재 줄/);
});
test('drag refuses occupied, unequal-duration and linked destinations without deleting music',()=>{
 let d=enterFret(createBlankDocument(),cursor,7);d=enterFret(d,{...cursor,event:1},9);const to={...cursor,event:1,mode:'tab'};
 assert.throws(()=>moveTone(d,cursor,to),/이미/);
 assert.throws(()=>moveTone(patchEvent(d,0,2,{duration:'8'}),cursor,{...to,event:2}),/같은 길이/);
 assert.throws(()=>moveTone(patchEvent(d,0,0,{technique:'H'}),cursor,{...to,event:2}),/연결/);
 const tied=patchEvent(d,0,0,{tieTo:d.measures[0].events[1].id});assert.throws(()=>moveTone(tied,{...cursor,event:1},{...to,event:2}),/연결/);
});
test('inserting a beat shifts only the explicit suffix and reports excess rather than overlapping',()=>{
 const d=createBlankDocument();d.measures.push(blankMeasure());const original=structuredClone(d),next=insertEvent(d,cursor);
 assert.deepEqual(next.measures[0].events.map(e=>e.onset),[0,480,960,1440,1920]);assert.strictEqual(next.measures[1],d.measures[1]);assert.deepEqual(d,original);
 const r=compileScoreDocument(next);assert.ok(r.issues.some(e=>e.includes('초과')));assert.ok(!r.issues.some(e=>e.includes('겹침')));
 const copied=insertEvent(enterFret(d,cursor,7),cursor,{duplicate:true});assert.equal(copied.measures[0].events[1].notes[0].fret,7);assert.notEqual(copied.measures[0].events[1].notes[0].id,copied.measures[0].events[0].notes[0].id);
});
test('splitting a beat creates an empty second half without moving later music',()=>{
 const d=enterFret(createBlankDocument(),cursor,7),next=splitEvent(d,cursor);assert.deepEqual(next.measures[0].events.slice(0,2).map(e=>[e.onset,e.duration,e.rest]),[[0,'8',false],[240,'8',true]]);assert.strictEqual(next.measures[0].events[2],d.measures[0].events[1]);assert.deepEqual(compileScoreDocument(next).issues,[]);
 assert.throws(()=>splitEvent(patchEvent(d,0,0,{technique:'H'}),cursor));
});
test('bulk picking continues across bars, skips rests and legato arrivals and never changes notes',()=>{
 let d=createBlankDocument();d.measures.push(blankMeasure());for(const [bar,event,fret] of [[0,0,5],[0,1,7],[0,3,5],[1,0,5],[1,1,5],[1,2,7]])d=enterFret(d,{...cursor,bar,event},fret);d=patchEvent(d,0,0,{technique:'H'});d=patchEvent(d,1,0,{tieTo:d.measures[1].events[1].id});
 const next=applyPicking(d);assert.deepEqual(next.measures.flatMap(m=>m.events.map(e=>e.pickStroke??null)),['down',null,null,'up','down',null,'up',null]);
 next.measures.forEach((m,b)=>m.events.forEach((e,i)=>{const {pickStroke,...rest}=e;assert.deepEqual(rest,d.measures[b].events[i]);}));
 const range=applyPicking(d,{start:1,end:1,pattern:'alternate-up'});assert.strictEqual(range.measures[0],d.measures[0]);assert.equal(range.measures[1].events[0].pickStroke,'up');assert.equal(range.measures[1].events[2].pickStroke,'down');
 assert.ok(applyPicking(next,{pattern:'clear'}).measures.flatMap(m=>m.events).every(e=>!e.pickStroke));
});
