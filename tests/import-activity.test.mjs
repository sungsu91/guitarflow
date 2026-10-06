import test from 'node:test';
import assert from 'node:assert/strict';
import {importActivityDetails,importSourceRegion} from '../src/pdf/tab-import/importActivity.js';
import {importScanMessage} from '../src/pdf/tab-import/importProgress.js';
import {setLanguage} from '../src/i18n/core.js';
import {recognizeStaffSystem} from '../src/omr/staffRecognition.js';
import {refineStaffMeasures} from '../src/omr/staffMeasureRecognition.js';
import {parseStaffTokens} from '../src/omr/staffTokens.js';

test('running source follows the job page and clears the old highlight at page boundaries',()=>{
 const files={photos:[{fileName:'First.png'},{fileName:'Second.png'}]},preview={url:'data:image/jpeg;base64,test',width:100,height:200};
 const running=importActivityDetails({source:{fileName:'Second.png',page:2,pages:2,preview},detail:{phase:'symbols',staff:2,total:4,measure:3,operation:'measure',seconds:100,region:importSourceRegion({x:20,y:40,width:80,height:10},200,400)}},files);
 assert.equal(running.fileName,'Second.png');assert.equal(running.pageLabel,'2 / 2페이지');assert.equal(running.location,'오선 2/4 · 이 줄의 3번째 마디');
 assert.equal(running.stage,'마디의 음높이·리듬 대조');assert(running.longWait);assert.deepEqual(running.region,{x:10,y:20,width:40,height:5});
 const next=importActivityDetails({source:{fileName:'Third.png',page:3,pages:3,preview:null},detail:{phase:'structure'}},files);
 assert.equal(next.fileName,'Third.png');assert.equal(next.location,'');assert.equal(next.region,null);assert.equal(next.longWait,false);
 assert.equal(importActivityDetails({},files).fileName,'First.png');assert.equal(importActivityDetails({},{pdfFile:{name:'Selected.pdf'}}).fileName,'Selected.pdf');
});

test('loading/chord stages do not invent staff, attempt, or seconds; localization retains filenames',()=>{
 for(const phase of ['structure','model','chords','convert'])assert(!/undefined|NaN/.test(importScanMessage('staff',{detail:{phase}})));
 setLanguage('en');try{
  const activity=importActivityDetails({source:{fileName:'(보컬)도레미파.pdf',page:2,pages:3},detail:{phase:'symbols',operation:'system',staff:1,total:9}});
  assert.equal(activity.fileName,'(보컬)도레미파.pdf');assert.equal(activity.pageLabel,'Page 2 / 3');assert.equal(activity.stage,'Reading notes and rhythm across the staff');
 }finally{setLanguage('ko');}
});

test('reporting labels distinguish whole-staff reads from padding and measure checks without changing notes',async()=>{
 const calls=[],system={width:20,height:8,rgba:new Uint8ClampedArray(640).fill(255).buffer,staff:{spacing:1},rect:{x:0,y:0}},raw='clef-G2+note-C5_half+barline';
 const parsed=await recognizeStaffSystem({recognize:async(input,detail)=>{calls.push(detail);return {text:raw};}},system);
 assert.deepEqual(calls,[{operation:'system'},{operation:'rhythm'}]);assert.deepEqual(parsed.measures,parseStaffTokens(raw).measures);
 const before=parseStaffTokens('clef-G2+note-C5_whole+barline'),checkCalls=[];
 const checked=await refineStaffMeasures({recognize:async(input,detail)=>{checkCalls.push(detail);return {text:before.raw};}},{...system,measures:[{x:0,width:20,stems:[],slashes:[]}]},before);
 assert.deepEqual(checkCalls,[{operation:'measure',measure:1},{operation:'measure',measure:1}]);assert.equal(checked.measures[0].events[0].notes[0].midi,72);assert.equal(checked.measures[0].events[0].duration,'1');
});
