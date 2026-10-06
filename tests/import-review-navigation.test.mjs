import test from 'node:test';
import assert from 'node:assert/strict';
import {importReviewTargets,pdfTabReview} from '../src/pdf/tab-import/pdfTabReview.js';
import {confirmImportedMeasure} from '../src/pdf/tab-import/scoreAdapter.js';
import {createBlankDocument} from '../src/etudes/scoreModel.js';

const note=(onset=0)=>({onset,duration:'4',notes:[{string:2,fret:0}],rest:false,blank:false});
test('one-click review includes unread notes, rhythm-only bars and chord-only issues in source order',()=>{
 const document={tuning:Array(6),measures:[
  {events:[note(),{...note(480),pdfImport:{status:'unresolved',pendingStrings:[1],rhythmVerified:true}}]},
  {events:[note()],pdfImport:{needsReview:true,rhythmVerified:false}},
  {events:[note(),note(480)],harmonyChanges:[{onset:480,name:'Am',needsReview:true}]},
  {events:[note()],harmonyReview:{reason:'unread-chord-label'}},
 ]};
 const before=structuredClone(document),targets=importReviewTargets(document);
 assert.deepEqual(targets.map(t=>[t.cursor.bar,t.cursor.event,t.reasons]),[[0,1,['notes']],[1,0,['rhythm']],[2,1,['chord']],[3,0,['chord']]]);
 let cursor={bar:0,event:0},moves=[];const move=direction=>pdfTabReview(document,cursor,(next,target)=>{cursor=next;moves.push(target);}).move(direction);
 for(let i=0;i<5;i++)move(1);
 assert.deepEqual(moves.map(t=>t.cursor.bar),[0,1,2,3,0]);move(-1);assert.equal(cursor.bar,3);
 assert.equal(pdfTabReview(document,cursor,()=>{}).currentIndex,3);
 assert.deepEqual(document,before,'navigation must not confirm or rewrite the music');
});

test('a readable rest only requests rhythm review, not a missing fret',()=>{
 const d={measures:[{events:[{rest:true,blank:false,notes:[],pdfImport:{status:'unresolved',pendingStrings:[1],rhythmVerified:false}}]}]};
 assert.deepEqual(importReviewTargets(d)[0].reasons,['rhythm']);
});

test('confirmation removes the reviewed bar, while empty lists and repeated navigation remain safe',()=>{
 const doc=createBlankDocument();doc.measures=[{id:'bar',events:[0,480,960,1440].map(note),pdfImport:{needsReview:true}}];
 const confirmed=confirmImportedMeasure(doc,0);assert.equal(importReviewTargets(confirmed).length,0);
 pdfTabReview(confirmed,{bar:0,event:0},()=>assert.fail('nothing to select')).move(1);
 doc.measures[0].harmonyReview={reason:'unread-chord-label'};
 assert.deepEqual(importReviewTargets(confirmImportedMeasure(doc,0))[0].reasons,['chord'],'checking notes cannot silently dismiss an unread chord name');
 doc.measures[0].events[1].blank=true;
 assert.throws(()=>confirmImportedMeasure(doc,0),/빈칸/,'unread notes cannot be dismissed as confirmed');
});

test('targets more than 100 events apart do not collide and selection remains ordered',()=>{
 const unresolved={...note(),pdfImport:{status:'unresolved',pendingStrings:[1]}};
 const doc={tuning:Array(6),measures:[{events:Array.from({length:102},(_,i)=>i===101?unresolved:note())},{events:[unresolved]}]};
 let next;pdfTabReview(doc,{bar:0,event:101},c=>next=c).move(1);assert.equal(next.bar,1);
 pdfTabReview(doc,{bar:1,event:0},c=>next=c).move(-1);assert.deepEqual([next.bar,next.event],[0,101]);
});

test('blanket notation review flags do not turn all readable music into quick stops',()=>{
 const d={pdfTabImport:{notation:{}},measures:Array.from({length:40},()=>({
  pdfImport:{needsReview:true,rhythmVerified:true,reasons:['staff-omr-review','ties-and-repeats-unverified']},
  events:[0,480,960,1440].map(onset=>({...note(onset),pdfImport:{status:'unresolved',rhythmVerified:true,pendingStrings:[]}})),
 }))};
 assert.deepEqual(importReviewTargets(d),[]);
 Object.assign(d.measures[4].events[1],{blank:true,notes:[]});
 d.measures[4].events[2].pdfImport.pendingStrings=[3];
 d.measures[4].harmonyReview={reason:'unread-chord-label'};
 d.measures[30].pdfImport.rhythmVerified=false;
 const targets=importReviewTargets(d);
 assert.deepEqual(targets.map(t=>[t.cursor.bar,t.reasons]),[[4,['notes','chord']],[30,['rhythm']]]);
 let cursor={bar:0,event:0};const move=n=>pdfTabReview(d,cursor,c=>cursor=c).move(n);
 move(1);assert.equal(cursor.bar,4);move(1);assert.equal(cursor.bar,30);
 move(-1);assert.equal(cursor.bar,4);move(-1);assert.equal(cursor.bar,30);
 assert(d.measures[0].pdfImport.needsReview,'navigation does not falsely confirm the remaining score');
});

test('whole notes and readable rests are preserved; unplaced notes and bar boundary mismatches remain reviewable',()=>{
 const whole={...note(),duration:'1',pdfImport:{status:'unresolved',rhythmVerified:true}};
 const d={measures:[{events:[whole],pdfImport:{needsReview:true,rhythmVerified:true}},
  {events:[{...whole,notes:[{string:1,fret:0,unplaced:true}]}]},
  {events:[whole],pdfImport:{rhythmVerified:true,reasons:['source-bar-count-mismatch']}}]};
 assert.deepEqual(importReviewTargets(d).map(t=>[t.cursor.bar,t.reasons]),[[1,['notes']],[2,['layout']]]);
});
