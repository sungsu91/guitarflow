import test from 'node:test';
import assert from 'node:assert/strict';
import {checkExternalScoreRegression,externalFailurePositions} from '../scripts/check-external-score-regression.mjs';

const reference={id:'sample',oracleEvents:3,detectedBars:1,correctNoteEvents:2,correctRhythmEvents:3,extraEvents:0,failedPositions:{notes:['1:2'],rhythm:[]}};
const result=()=>({id:'sample',oracleEvents:3,detectedBars:1,barCountCorrect:true,correctNoteEvents:2,correctRhythmEvents:3,extraEvents:0,liveWorkers:0,pageErrors:[],compileErrors:[],failures:[{bar:1,event:2,expected:{},notes:false,rhythm:true}]});
test('external gates retain known errors while allowing actual improvement',()=>{
 assert.equal(checkExternalScoreRegression([reference],[result()]).passed,true);
 const improved=result();improved.correctNoteEvents=3;improved.failures=[];
 assert.equal(checkExternalScoreRegression([reference],[improved]).passed,true);
});
test('same total cannot exchange an old failed position for a new one',()=>{
 const r=result();r.failures[0].event=3;
 assert.equal(checkExternalScoreRegression([reference],[r]).passed,false);
 r.failures[0]={bar:1,event:2,expected:{},notes:true,rhythm:false};
 assert.equal(checkExternalScoreRegression([reference],[r]).passed,false);
});
test('missing evidence, extra events and merged bars fail independently',()=>{
 for(const patch of [{failures:null},{oracleEvents:2},{extraEvents:1},{detectedBars:2},{liveWorkers:1},{error:'aborted'}])assert.equal(checkExternalScoreRegression([reference],[{...result(),...patch}]).passed,false);
 assert.equal(checkExternalScoreRegression([reference],[]).passed,false);
 assert.equal(checkExternalScoreRegression([],[]).passed,false);
});
test('an extra column is not treated as a failed expected position',()=>{
 const r=result();r.failures.push({bar:1,extraEvent:3,expected:null,notes:false,rhythm:false});
 assert.deepEqual(externalFailurePositions(r,'notes'),['1:2']);
});
