import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2,blankMeasure} from '../src/etudes/scoreModel.js';
import {enterFretWithDuration,setEventDuration} from '../src/etudes/editorCommands.js';
import {copyGripToNext,deleteGrip} from '../src/etudes/scoreLineCommands.js';
const c={bar:0,event:0,string:6};
function source(){let d=createBlankDocument();for(const [i,fret] of [0,2,0,0,2].entries())d=enterFretWithDuration(d,{...c,string:6-i},fret,'8');return setEventDuration(d,{...c,event:1},'16');}
test('02002 copies once from an eighth into a sixteenth without multiplying or shifting slots',()=>{
 const d=source(),before=structuredClone(d),timing=d.measures[0].events.map(e=>[e.id,e.onset,e.duration]),r=copyGripToNext(d,c),events=r.document.measures[0].events;
 assert.deepEqual(d,before);assert.deepEqual(events.map(e=>[e.id,e.onset,e.duration]),timing);
 assert.deepEqual(events[1].notes.map(n=>n.fret),[0,2,0,0,2]);assert.equal(events[1].duration,'16');assert(events.slice(2).every(e=>e.blank));
 assert(events[1].notes.every(n=>!events[0].notes.some(old=>old.id===n.id)));assert.equal(r.cursor.event,1);
 assert.deepEqual(compileDocumentV2(r.document).errors,[]);
});
test('successive copy targets one position each; occupied target is replaced, not merged',()=>{
 let d=source();d=enterFretWithDuration(d,{...c,event:1,string:1},9,'16');
 const r=copyGripToNext(d,c);assert(r.replaced);assert.equal(r.document.measures[0].events[1].notes.length,5);
 const next=copyGripToNext(r.document,r.cursor);assert.equal(next.cursor.event,2);assert(next.document.measures[0].events[3].blank);
});
test('delete clears the entire vertical grip while retaining duration, dot, tuplet and position',()=>{
 const d=copyGripToNext(source(),c).document,target={...c,event:1},e=d.measures[0].events[1],next=deleteGrip(d,target);
 assert.equal(next.measures[0].events.length,d.measures[0].events.length);assert.deepEqual(next.measures[0].events[1].notes,[]);
 for(const key of ['id','duration','onset','dotted','tuplet'])assert.deepEqual(next.measures[0].events[1][key],e[key]);
 assert(next.measures[0].events[1].blank);assert.equal(next.measures[0].events[0],d.measures[0].events[0]);
 assert.deepEqual(compileDocumentV2(next).issues,[]);
});
test('copy crosses a barline and adds just one measure only at a completed score end',()=>{
 let d=enterFretWithDuration(createBlankDocument(),{...c,event:3},2,'4');
 const r=copyGripToNext(d,{...c,event:3});assert.equal(r.document.measures.length,2);assert.equal(r.cursor.bar,1);assert.equal(r.document.measures[1].events[0].notes[0].fret,2);
 assert(r.document.measures[1].events.slice(1).every(e=>e.blank));
 d={...d,measures:Array.from({length:64},()=>blankMeasure())};d=enterFretWithDuration(d,{...c,bar:63,event:3},2,'4');assert.throws(()=>copyGripToNext(d,{...c,bar:63,event:3}),/64마디/);
});
