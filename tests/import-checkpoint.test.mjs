import test from 'node:test';
import assert from 'node:assert/strict';
import {createImportCheckpoint,retainImportPages,importFileKey,photoImportKey,pageBatchEnd} from '../src/pdf/tab-import/importCheckpoint.js';
import {createTabPageAnalyzer} from '../src/pdf/tab-import/analyzeTabPage.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
const page=n=>({page:n,staffs:[]});
const args={base:{fileName:'nine.pdf'},keys:Array(9).fill(1),settings:{mode:'tab'}};
test('nine pages retain successful prefixes across batch limits, failure and retry',()=>{
 let resume,calls=[],events=[];
 for(const failAt of [0,0,5,0,0,0]){
  const batch=createImportCheckpoint({...args,resume,onCheckpoint:r=>events.push(r)}),end=pageBatchEnd(batch.count,9,2);
  for(let n=batch.count+1;n<=end;n++){
   calls.push(n);if(n===failAt)break;
   batch.commit(page(n),{meter:[3,4],analyzer:{notationContext:{key:'D',meter:[3,4]},previous:[{string:1,fret:n}]}});
  }
  resume=batch.snapshot();
 }
 assert.deepEqual(calls,[1,2,3,4,5,5,6,7,8,9]);
 assert.equal(resume.complete,true);assert.equal(resume.nextPage,null);
 assert.deepEqual(events.map(e=>e.completed),[1,2,3,4,5,6,7,8,9]);
 assert.deepEqual(events[3].checkpoint.entries.at(-1).context.analyzer.previous,[{string:1,fret:4}]);
 assert.equal(events[0].pages.length,1,'later pages cannot mutate an earlier checkpoint');
});
test('editing page five retains pages one through four, reordering or settings changes invalidates dependent pages',()=>{
 const batch=createImportCheckpoint(args);for(let n=1;n<=6;n++)batch.commit(page(n),{meter:[n,4]});
 const resume=batch.snapshot(),keys=[1,1,1,1,2,1,1,1,1];
 const edited=createImportCheckpoint({...args,keys,resume});assert.equal(edited.count,4);assert.deepEqual(edited.context.meter,[4,4]);
 assert.equal(createImportCheckpoint({...args,settings:{mode:'grand'},resume}).count,0);
 const trimmed=retainImportPages(resume,3);assert.equal(trimmed.completed,3);assert.equal(trimmed.nextPage,4);assert.deepEqual(trimmed.checkpoint.entries.at(-1).context.meter,[3,4]);
 assert.throws(()=>edited.commit(page(6),{}),/페이지 순서/);
 const appended=retainImportPages(resume,6,10);assert.equal(appended.totalPages,10);assert.equal(appended.completed,6);assert.equal(appended.complete,false);
 const removed=retainImportPages(resume,4,5);assert.equal(removed.totalPages,5);assert.equal(removed.nextPage,5);
});
test('file identity, photo rotation and correction are part of resume identity',()=>{
 const a={name:'same.png',size:100},b={...a};assert.notEqual(importFileKey(a),importFileKey(b));assert.equal(importFileKey(a),importFileKey(a));
 const photo={file:a,rotation:0};assert.notEqual(photoImportKey(photo),photoImportKey({...photo,rotation:1}));assert.notEqual(photoImportKey(photo),photoImportKey({...photo,scan:{enabled:false}}));
});
test('restarted notation analyzer preserves meter, key and previous fingering without shared mutation',()=>{
 const context={notationContext:{meter:[6,8],key:'F'},previous:[{string:2,fret:6}]};
 const analyzer=createTabPageAnalyzer(undefined,context);context.notationContext.key='C';
 const saved=analyzer.getContext();assert.equal(saved.notationContext.key,'F');saved.previous[0].fret=1;assert.equal(analyzer.getContext().previous[0].fret,6);
});
test('incomplete results cannot silently open as a full score and batch limits are bounded',()=>{
 assert.throws(()=>analysisToDocument({complete:false}),/아직 읽지 않은/);
 assert.equal(pageBatchEnd(8,9,2),9);assert.equal(pageBatchEnd(4,9),9);
 for(const n of [0,-1,1.5,NaN])assert.throws(()=>pageBatchEnd(0,9,n));
});
