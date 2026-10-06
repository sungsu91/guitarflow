import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkTabRegression,failureLocation} from '../scripts/check-tab-32-regression.mjs';
import {oraclePositionMatches} from '../scripts/tab-oracle-position.mjs';
import {diagnoseNoteFailure} from '../scripts/tab-failure-diagnostics.mjs';
const baseline=JSON.parse(readFileSync(new URL('./fixtures/thirty-second/baseline.json',import.meta.url)));
test('OCR quality gate rejects missing results, corrupt counts and hidden per-case losses',()=>{
 assert(checkTabRegression(baseline,structuredClone(baseline)).passed);
 for(const mutate of [r=>r.pop(),r=>r.push(r[0]),r=>{delete r[0].totals.correct;},r=>{r[0].totals.correct=NaN;},r=>{r[0].totals.correct=-1;},r=>{r[0].totals.correct--;r[1].totals.correct++;},r=>{r[0].byDuration['16'].rhythmCorrect--;},r=>{r[0].totals.added++;},r=>{r[0].error='timeout';}]){
  const rows=structuredClone(baseline);mutate(rows);assert(!checkTabRegression(baseline,rows).passed);
 }
 assert(!checkTabRegression([],[]).passed);
 const old=structuredClone(baseline.slice(0,1));
 old[0].failureLocations=[failureLocation({type:'missing',page:1,bar:2,event:3,expected:{string:1,fret:0}})];
 const relocated=structuredClone(old);
 relocated[0].failureLocations=[failureLocation({type:'missing',page:1,bar:5,event:3,expected:{string:1,fret:0}})];
 assert(!checkTabRegression(old,relocated).passed,'equal totals cannot hide a newly lost note elsewhere');
});
test('rectified photos compare positions inside known bars without matching neighboring notes',()=>{
 const options={measure:{x:68,width:1923},pageWidth:2083,bar:{x:32,width:778},oracleWidth:842,tolerance:3.36,photo:true};
 const x=options.measure.x+(54-options.bar.x)/options.bar.width*options.measure.width;
 assert(oraclePositionMatches(x,54,options));
 assert(!oraclePositionMatches(x+24,54,options));
 assert(!oraclePositionMatches(x,54,{...options,photo:false}));
});
test('conversion losses cannot hide behind a correct OCR analysis',()=>{
 const old=structuredClone(baseline.slice(0,1));old[0].documentStats={exactBars:8};
 const next=structuredClone(old);next[0].documentStats.exactBars=7;assert(!checkTabRegression(old,next).passed);
 delete next[0].documentStats;assert(!checkTabRegression(old,next).passed);
});

test('missing notes distinguish absent positions from explicitly rejected readings',()=>{
 const measure={},base={measure,string:1,type:'missing'};
 assert.equal(diagnoseNoteFailure({...base,measure:null}).stage,'measure-not-found');
 assert.equal(diagnoseNoteFailure(base).stage,'rhythm-position-not-found');
 const slot={notes:[],rejections:[{string:1,reading:'0',reasons:['ocr-disagreement'],confidence:{fret:.7}}]};
 const rejected=diagnoseNoteFailure({...base,slot});
 assert.equal(rejected.stage,'candidate-rejected');assert.equal(rejected.candidates[0].reading,'0');
 assert.deepEqual(rejected.candidates[0].reasons,['ocr-disagreement']);
 assert.equal(diagnoseNoteFailure({...base,slot,string:2}).stage,'no-candidate-assigned-to-string');
 assert.equal(diagnoseNoteFailure({...base,slot:{rest:true,notes:[]}}).stage,'position-classified-as-rest');
 assert.equal(diagnoseNoteFailure({...base,slot,type:'stringErrors',actual:{string:2}}).stage,'string-assignment-mismatch');
});
