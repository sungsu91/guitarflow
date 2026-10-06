import test from 'node:test';
import assert from 'node:assert/strict';
import {addPdfRepeatPreset} from '../src/pdf/pdfRepeatPresets.js';
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
