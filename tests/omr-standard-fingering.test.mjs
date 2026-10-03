import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTromr,recommendTromrPositions,convertTromr} from '../src/omr/tromrAdapter.js';
const header='clef-G2+keySignature-CM+timeSignature-4/4+';
test('OMR suggestions use ordinary first-position C major fingerings',()=>{
 const parsed=parseTromr(header+'note-C4_quarter+note-D4_quarter+note-E4_quarter+note-F4_quarter+barline');
 const result=recommendTromrPositions(parsed,{octaveShift:0});
 assert.deepEqual(Object.values(result.positions),[{string:2,fret:1},{string:2,fret:3},{string:1,fret:0},{string:1,fret:1}]);
 assert.deepEqual(result.unplaced,[]);
 const converted=convertTromr(parsed,{octaveShift:0,positions:result.positions,bpm:60,title:'First position'});
 assert.equal(converted.document.omr.reviewed,false,'suggested fingering does not certify recognition');
});
test('chosen guitar transposition is applied once, out-of-range notes are never silently moved',()=>{
 const parsed=parseTromr(header+'note-E3_half+note-E5_half+barline');
 const result=recommendTromrPositions(parsed,{octaveShift:-12});
 assert.deepEqual(Object.values(result.positions),[{string:6,fret:0},{string:1,fret:0}]);
 const low=parseTromr(header+'note-C2_whole+barline');
 const unplayable=recommendTromrPositions(low,{octaveShift:0});
 assert.deepEqual(unplayable.positions,{});assert.deepEqual(unplayable.unplaced,[3]);
 assert.throws(()=>convertTromr(low,{octaveShift:0,positions:unplayable.positions,bpm:60,title:'Too low'}));
});
test('explicit octave choice and supported notation remain required for recommendations',()=>{
 const parsed=parseTromr(header+'note-C4_whole+barline');
 assert.throws(()=>recommendTromrPositions(parsed,{}));
 assert.throws(()=>recommendTromrPositions(parseTromr(header+'unknown'),{octaveShift:0}));
 assert.deepEqual(recommendTromrPositions(parseTromr(header+'rest_whole+barline'),{octaveShift:0}),{positions:{},unplaced:[]});
});
