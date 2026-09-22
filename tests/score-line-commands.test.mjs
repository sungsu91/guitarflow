import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2,blankMeasure} from '../src/etudes/scoreModel.js';
import {enterFretWithDuration,setEventDuration,setRestWithDuration} from '../src/etudes/editorCommands.js';
import {copyGripToNext,deleteGrip} from '../src/etudes/scoreLineCommands.js';
const c={bar:0,event:0,string:6};
test('line deletion clears an entered rest while preserving its time slot',()=>{
 const d=setRestWithDuration(createBlankDocument(),c,'8'),before=structuredClone(d);
 const next=deleteGrip(d,c);
 assert.equal(next.measures[0].events[0].blank,true);
 assert.equal(next.measures[0].events[0].duration,'8');
 assert.equal(next.measures[0].events[0].onset,0);
 assert.equal(next.measures[0].events[0].id,d.measures[0].events[0].id);
 assert.deepEqual(next.measures[0].events.slice(1),d.measures[0].events.slice(1));
 assert.deepEqual(d,before);
 assert.strictEqual(deleteGrip(next,c),next);
});
function source(){let d=createBlankDocument();for(const [i,fret] of [0,2,0,0,2].entries())d=enterFretWithDuration(d,{...c,string:6-i},fret,'8');return setEventDuration(d,{...c,event:1},'16');}
test('02002 copies the source eighth duration into a sixteenth slot without shifting later music',()=>{
 const d=source(),before=structuredClone(d),timing=d.measures[0].events.map(e=>[e.id,e.onset,e.duration]),r=copyGripToNext(d,c),events=r.document.measures[0].events;
 assert.deepEqual(d,before);assert.deepEqual(events.slice(2).map(e=>[e.id,e.onset,e.duration]),timing.slice(3));
 assert.deepEqual(events[1].notes.map(n=>n.fret),[0,2,0,0,2]);assert.equal(events[1].duration,'8');assert(events.slice(2).every(e=>e.blank));
 assert(events[1].notes.every(n=>!events[0].notes.some(old=>old.id===n.id)));assert.equal(r.cursor.event,1);
 assert.deepEqual(compileDocumentV2(r.document).errors,[]);
});
test('sixteenth copy crosses a barline with source duration and repeated copies stay sixteenths',()=>{
 let d=enterFretWithDuration(createBlankDocument(),c,7,'16');
 for(let i=0;i<19;i++){
  const result=copyGripToNext(d,{...c,bar:i<16?0:1,event:i%16});d=result.document;
  assert.equal(d.measures[result.cursor.bar].events[result.cursor.event].duration,'16');
 }
 assert.equal(d.measures.length,2);assert.deepEqual(compileDocumentV2(d).errors,[]);
});
test('copy refuses to erase following entered music when source duration needs more room',()=>{
 let d=source();d=enterFretWithDuration(d,{...c,event:2},9,'16');
 const before=structuredClone(d);assert.throws(()=>copyGripToNext(d,c),/겹칩니다/);assert.deepEqual(d,before);
});
test('copy retains a source dotted duration and fills only its required vacant time',()=>{
 const d=setEventDuration(enterFretWithDuration(createBlankDocument(),c,5,'8'),c,'8',true);
 const result=copyGripToNext(d,c),event=result.document.measures[0].events[result.cursor.event];
 assert.equal(event.duration,'8');assert.equal(event.dotted,true);assert.equal(event.onset,360);
 assert.deepEqual(compileDocumentV2(result.document).errors,[]);
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
