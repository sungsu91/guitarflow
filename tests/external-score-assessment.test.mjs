import test from 'node:test';
import assert from 'node:assert/strict';
import {assessExternalBars} from '../scripts/assess-external-score.mjs';
const truth={bars:[{number:1,events:[{duration:'8',notes:[[1,0]]},{duration:'8',notes:[[1,2]]},{duration:'4',notes:[[1,2]]}]}]};
const slot=(fret,duration='8')=>({duration,notes:fret===null?[]:[{status:'confirmed',string:1,fret}]});
test('an inserted empty column is reported without corrupting later comparisons',()=>{
 const r=assessExternalBars([{slots:[slot(null),slot(0),slot(2),slot(2,'4')]}],truth);
 assert.equal(r.oracleEvents,3);assert.equal(r.correctNoteEvents,3);assert.equal(r.correctRhythmEvents,3);assert.equal(r.extraEvents,1);assert.equal(r.failures.length,1);
});
test('a missing event, wrong fret and wrong duration cannot pass the independent oracle',()=>{
 const missing=assessExternalBars([{slots:[slot(0),slot(2,'4')]}],truth);assert.equal(missing.correctNoteEvents,2);assert.equal(missing.failures.length,1);
 const wrong=assessExternalBars([{slots:[slot(1),slot(2),slot(2,'16')]}],truth);assert.equal(wrong.correctNoteEvents,2);assert.equal(wrong.correctRhythmEvents,2);assert.equal(wrong.failures.length,2);
 const empty=assessExternalBars([],truth);assert.equal(empty.correctNoteEvents,0);assert.equal(empty.failures.length,3);
});
