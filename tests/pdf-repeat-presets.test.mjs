import test from 'node:test';
import assert from 'node:assert/strict';
import {addPdfRepeatPreset,previewPdfRepeatPreset} from '../src/pdf/pdfRepeatPresets.js';
import {pdfRepeatRoute} from '../src/pdf/pdfRepeatRoute.js';
import {pdfRepeatPlan} from '../src/pdf/pdfRepeats.js';
const bars=[1,2,3,5,6,7].map((number,index)=>({number,page:index<3?1:2,beats:4}));
const settings={mode:'range',start:1,end:3,marks:{7:{endBarline:'final',lift:20}}};
test('quick repeat places a complete pair and preserves other symbols and saved data',()=>{
 const before=structuredClone(settings),next=addPdfRepeatPreset(settings,bars,{start:1,end:3});
 assert.deepEqual(pdfRepeatPlan(bars,next).order.map(b=>b.number),[1,2,3,1,2,3,5,6,7]);
 assert.deepEqual(next.marks[7],settings.marks[7]);assert.deepEqual(settings,before);
});
test('quick endings use the actual next mapped measure across a page and numbering gap',()=>{
 const next=addPdfRepeatPreset(settings,bars,{start:1,end:3,kind:'endings'}),plan=pdfRepeatPlan(bars,next);
 assert.deepEqual(plan.issues,[]);assert.deepEqual(plan.order.map(b=>b.number),[1,2,3,1,2,5,6,7]);
 assert.deepEqual(next.marks[3],{repeatEnd:true,ending:1});assert.deepEqual(next.marks[5],{ending:2});
});
test('invalid ranges and a missing second ending never produce a partial preset',()=>{
 for(const [start,end,kind] of [[7,7,'endings'],[3,2,'repeat'],[4,6,'repeat'],['',3,'repeat'],[1,3,'unknown']])assert.equal(addPdfRepeatPreset(settings,bars,{start,end,kind}),null);
});

test('editing a quick pair replaces old endpoints and endings without erasing other symbols',()=>{
 const original=addPdfRepeatPreset(settings,bars,{start:1,end:3,kind:'endings'});
 original.marks[3].marker='segno';
 const next=previewPdfRepeatPreset(original,bars,{start:2,end:6,kind:'repeat'},{start:1,end:3});
 assert.equal(next.marks[1],undefined);assert.deepEqual(next.marks[3],{marker:'segno'});
 assert.equal(next.marks[5],undefined);assert.equal(next.marks[2].repeatStart,true);
 assert.equal(next.marks[6].repeatEnd,true);assert.deepEqual(next.marks[7],settings.marks[7]);
 assert.equal(original.marks[3].ending,1);
});

test('invalid quick edits leave the existing pair intact',()=>{
 const original=addPdfRepeatPreset(settings,bars,{start:1,end:3});
 const before=structuredClone(original);
 assert.equal(previewPdfRepeatPreset(original,bars,{start:1,end:7,kind:'endings'},{start:1,end:3}),null);
 assert.deepEqual(original,before);
});

test('route groups adjacent mapped measures and marks returns and skips',()=>{
 const order=[1,2,3,1,2,5,6,7].map(number=>bars.find(b=>b.number===number));
 assert.deepEqual(pdfRepeatRoute(bars,order),[
  {start:1,end:3,from:null,change:null},{start:1,end:2,from:3,change:'return'},
  {start:5,end:7,from:2,change:'skip'},
 ]);
});

test('route retains late Coda jumps after the old 48-measure preview limit',()=>{
 const long=Array.from({length:100},(_,i)=>({number:i+1}));
 const route=pdfRepeatRoute(long,[...long.slice(0,70),...long.slice(50,60),...long.slice(90)]);
 assert.deepEqual(route.map(s=>[s.start,s.end,s.change]),[[1,70,null],[51,60,'return'],[91,100,'skip']]);
});
