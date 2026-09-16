import test from 'node:test';import assert from 'node:assert/strict';
import {createBlankDocument,blankMeasure,compileDocumentV2,compileStats} from '../src/etudes/scoreModel.js';
import {enterFretWithDuration,nextEntry,applyPicking,resolveFretInput} from '../src/etudes/editorCommands.js';
import {rhythmGroups} from '../src/etudes/tabRhythm.js';import {scoreTimeline} from '../src/etudes/scorePlayback.js';
for(const duration of ['1','2','4','8','16'])test(`continuous ${duration}th entries cross measures without changing string`,()=>{let d=createBlankDocument(),c={bar:0,event:0,string:6};const count=Number(duration);for(let i=0;i<count+1;i++){d=enterFretWithDuration(d,c,i%10,duration);const next=nextEntry(d,c);d=next.document;c=next.cursor;}assert.equal(d.measures[0].events.length,count);assert.equal(d.measures[1].events[0].notes[0].string,6);assert.equal(d.measures[1].events[0].notes[0].fret,count%10);assert.deepEqual(compileDocumentV2(d).issues,[]);});
test('6/8 uses measure capacity and eighth-note grouping',()=>{let d=createBlankDocument();d={...d,meter:[6,8],measures:[blankMeasure([6,8])]};let c={bar:0,event:0,string:2};for(let i=0;i<7;i++){d=enterFretWithDuration(d,c,5,'8');({document:d,cursor:c}=nextEntry(d,c));}assert.equal(d.measures[0].events.length,6);assert.equal(c.bar,1);assert.deepEqual(rhythmGroups(d.measures[0].events,[6,8]),[[0,1,2],[3,4,5]]);});
test('beam grouping splits at quarter boundaries and rests',()=>{const events=Array.from({length:8},(_,i)=>({onset:i*120,duration:'16',rest:i===1}));assert.deepEqual(rhythmGroups(events),[[0],[2,3],[4,5,6,7]]);});
test('one edited bar compiles without recomputing other bars',()=>{let d=createBlankDocument();d={...d,measures:Array.from({length:32},()=>blankMeasure())};compileDocumentV2(d);const before=compileStats.bars,n=enterFretWithDuration(d,{bar:30,event:0,string:3},7,'4');compileDocumentV2(n);assert.equal(compileStats.bars-before,1);assert.equal(n.measures[0],d.measures[0]);assert.equal(n.measures[31],d.measures[31]);});
test('picking is one per event and does not alter rhythm or tones',()=>{let d=createBlankDocument();for(let i=0;i<4;i++){d=enterFretWithDuration(d,{bar:0,event:i,string:6},3,'4');d=enterFretWithDuration(d,{bar:0,event:i,string:2},1,'4');}const n=applyPicking(d);assert.deepEqual(n.measures[0].events.map(e=>e.pickStroke),['down','up','down','up']);n.measures[0].events.forEach((e,i)=>assert.equal(e.notes,d.measures[0].events[i].notes));});
test('mute notes remain valid and carry unpitched playback flag',()=>{let d=enterFretWithDuration(createBlankDocument(),{bar:0,event:0,string:6},0,'4');d.measures[0].events[0].dead=true;const r=compileDocumentV2(d);assert.deepEqual(r.issues,[]);assert.equal(scoreTimeline(r.score).events[0].dead,true);});
test('digits compose at the same location without a mode or timeout',()=>{
 const one=resolveFretInput(null,'1','a');assert.equal(resolveFretInput({...one,time:-999999},'2','a').value,12);
 const two=resolveFretInput(null,'2','a');assert.equal(resolveFretInput(two,'3','a').value,23);
 assert.equal(resolveFretInput(one,'2','b').value,2);
 assert.equal(resolveFretInput(resolveFretInput(one,'2','a'),'5','a').value,5);
 assert.equal(resolveFretInput(two,'9','a').value,9);
});
