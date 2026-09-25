import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankMeasure,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';
import {fillDrumRow,enterDrumNotes,drumRowHasPitches,deleteDrumRow} from '../src/etudes/drumInput.js';
const rhythm={selectedDuration:'16',dottedMode:'off',tupletMode:'off'};
const blank=n=>({...convertScoreInstrument(createBlankDocument(),'drums'),viewSettings:{measuresPerRow:n},measures:Array.from({length:8},()=>blankMeasure())});
for(const count of [1,2,3,4])test(`${count}-bar fill starts at the row beginning and leaves other rows unchanged`,()=>{
 const d=blank(count),at={bar:count-1,event:2};
 const result=fillDrumRow(d,at,[42],rhythm);
 assert.deepEqual(result.filledBars,Array.from({length:count},(_,i)=>i));
 for(let i=0;i<count;i++){
  assert.equal(result.document.measures[i].events.length,16);
  assert.ok(result.document.measures[i].events.every(e=>e.notes.some(n=>n.midi===42)));
 }
 for(let i=count;i<8;i++)assert.equal(result.document.measures[i],d.measures[i]);
 assert.equal(result.document.measures[at.bar].events[result.cursor.event].onset,960);
 assert.deepEqual(compileDocumentV2(result.document).errors,[]);
});
test('refill changes hat rhythm and open/closed sound while preserving kicks',()=>{
 let d=blank(4);
 d=enterDrumNotes(d,{bar:1,event:0},[36],{...rhythm,selectedDuration:'4'}).document;
 d=fillDrumRow(d,{bar:2,event:0},[42],rhythm).document;
 d=fillDrumRow(d,{bar:1,event:0},[46],{...rhythm,selectedDuration:'8'}).document;
 for(const bar of d.measures.slice(0,4)){
  assert.equal(bar.events.filter(e=>e.notes.some(n=>n.midi===46)).length,8);
  assert.ok(bar.events.every(e=>e.notes.every(n=>n.midi!==42)));
 }
 assert.ok(d.measures[1].events[0].notes.some(n=>n.midi===36));
 assert.equal(d.measures[1].events[0].drumLowerRhythm.duration,'4');
 assert.deepEqual(compileDocumentV2(d).errors,[]);
});
test('manual line breaks and partial final rows define the fill range',()=>{
 const d=blank(4);d.viewSettings.systemBreaks=[d.measures[2].id];
 assert.deepEqual(fillDrumRow(d,{bar:1,event:1},[42],rhythm).filledBars,[0,1]);
 assert.deepEqual(fillDrumRow(d,{bar:3,event:1},[42],rhythm).filledBars,[2,3,4,5]);
 assert.deepEqual(fillDrumRow(d,{bar:7,event:1},[42],rhythm).filledBars,[6,7]);
});

for(const count of [1,2,3,4])test(count+'-bar deletion removes only the requested drum and preserves timing',()=>{
 let d=blank(count),at={bar:count-1,event:1};
 d=enterDrumNotes(d,{bar:0,event:0},[36],{...rhythm,selectedDuration:'4'}).document;
 d=fillDrumRow(d,at,[42],rhythm).document;
 assert.equal(drumRowHasPitches(d,at,[42]),true);
 const cleared=deleteDrumRow(d,at,[42]);
 assert.equal(drumRowHasPitches(cleared,at,[42]),false);
 assert.ok(cleared.measures[0].events[0].notes.some(n=>n.midi===36));
 for(let i=0;i<count;i++)assert.deepEqual(cleared.measures[i].events.map(e=>[e.id,e.onset,e.duration,e.drumLowerRhythm]),d.measures[i].events.map(e=>[e.id,e.onset,e.duration,e.drumLowerRhythm]));
 for(let i=count;i<8;i++)assert.equal(cleared.measures[i],d.measures[i]);
 assert.deepEqual(compileDocumentV2(cleared).errors,[]);
 assert.ok(fillDrumRow(cleared,at,[42],rhythm).document.measures[0].events.every(e=>e.notes.some(n=>n.midi===42)));
});
test('row toggle detects hits away from an empty cursor and deletion honors manual breaks',()=>{
 let d=blank(4);d.viewSettings.systemBreaks=[d.measures[2].id];
 d=fillDrumRow(d,{bar:0,event:0},[42],{...rhythm,selectedDuration:'2'}).document;
 d=fillDrumRow(d,{bar:2,event:0},[42],rhythm).document;
 const at={bar:1,event:1};assert.equal(d.measures[1].events[1].notes.length,0);
 assert.equal(drumRowHasPitches(d,at,[42]),true);
 const cleared=deleteDrumRow(d,at,[42]);
 assert.equal(drumRowHasPitches(cleared,at,[42]),false);
 assert.equal(cleared.measures[2],d.measures[2]);
 assert.equal(drumRowHasPitches(cleared,{bar:2,event:0},[42]),true);
});
