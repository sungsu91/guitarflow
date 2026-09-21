import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,compileDocumentV2,ticksOf} from '../src/etudes/scoreModel.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';
import {enterMidiNotes} from '../src/etudes/enterMidiNotes.js';
import {advanceDrum,drumRest} from '../src/etudes/drumInput.js';
const blank=()=>convertScoreInstrument(createBlankDocument(),'drums');
const cursor={bar:0,event:0,string:1};
test('drum hits deduplicate without advancing, retain existing duration and refuse destructive rests',()=>{
 let d=blank();
 for(const pitch of [36,42,36])d=enterMidiNotes(d,cursor,[pitch],{selectedDuration:'8'}).document;
 assert.deepEqual(d.measures[0].events[0].notes.map(n=>n.midi),[36,42]);
 d=enterMidiNotes(d,cursor,[38],{selectedDuration:'16'}).document;
 assert.equal(ticksOf(d.measures[0].events[0]),240);
 assert.throws(()=>drumRest(d,cursor,{selectedDuration:'8'}),/타격/);
 const next=advanceDrum(d,cursor,{selectedDuration:'8'});
 assert.equal(next.document.measures[0].events[next.cursor.event].onset,240);
 assert.deepEqual(compileDocumentV2(next.document).errors,[]);
});
test('skipping blank drum positions commits timed rests and creates the next bar',()=>{
 let d=blank(),c=cursor;
 for(let i=0;i<8;i++){const r=advanceDrum(d,c,{selectedDuration:'8'});d=r.document;c=r.cursor;}
 assert.equal(d.measures.length,2);assert.equal(c.bar,1);assert.equal(c.event,0);
 assert(d.measures[0].events.every(e=>e.rest&&!e.blank&&ticksOf(e)===240));
 assert.deepEqual(compileDocumentV2(d).errors,[]);
});
