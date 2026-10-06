import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePdfRepeats,pdfRepeatPlan,setPdfRepeatMark} from '../src/pdf/pdfRepeats.js';
import {practicePlan,barAtTick} from '../src/pdf/pdfModel.js';
import {pdfRepeatShapes,drawPdfRepeatShapes} from '../src/pdf/pdfRepeatDrawing.js';
import {FULL_PAGE,projectRect} from '../src/pdf/pdfAnnotations.js';
import {exportPdfPractice,readBackup} from '../src/pdf/pdfLibrary.js';
const bars=Array.from({length:8},(_,i)=>({number:i+1,page:i<4?1:2,x:.1+(i%2)*.4,y:.2+Math.floor((i%4)/2)*.3,width:.4,height:.08,beats:i===2?3:4}));
const config=(marks={},mode='score',start=1,end=8)=>({mode,start,end,marks});
const numbers=plan=>plan.order.map(b=>b.number);

test('practice loop uses recognized bar numbers across pages, includes last beat and wraps exactly',()=>{
 const plan=pdfRepeatPlan(bars,config({},'range',3,5));
 assert.deepEqual(numbers(plan),[3,4,5]);assert.equal(plan.loop,true);
 assert.equal(barAtTick(plan.order,10.99,plan.loop).bar.number,5);
 assert.equal(barAtTick(plan.order,11,plan.loop).bar.number,3);
 assert.equal(barAtTick(plan.order,11,plan.loop).beat,0);
 const sparse=bars.filter(b=>![2,4].includes(b.number));
 assert.deepEqual(numbers(pdfRepeatPlan(sparse,config({},'range',3,6))),[3,5,6]);
 assert.deepEqual(numbers(pdfRepeatPlan(bars,config({},'range',8,8))),[8]);
 for(const [start,end] of [[5,3],[9,9]])assert.ok(pdfRepeatPlan(bars,config({},'range',start,end)).issues.length);
});
test('PDF repeats and numbered endings use the same performed order as editable notation',()=>{
 const settings=config({1:{repeatStart:true},3:{ending:1,repeatEnd:true},4:{ending:2},5:{repeatStart:true},6:{repeatEnd:true}}),before=structuredClone(bars);
 const plan=pdfRepeatPlan(bars,settings);
 assert.deepEqual(plan.issues,[]);assert.deepEqual(numbers(plan),[1,2,3,1,2,4,5,6,5,6,7,8]);assert.equal(plan.loop,false);assert.deepEqual(bars,before);
 const end=plan.order.reduce((n,b)=>n+b.beats,0);assert.equal(barAtTick(plan.order,end,false).ended,true);
});
for(const [command,expected] of [['dc',[1,2,3,4,5,6,1,2,3,4,5,6,7,8]],['ds',[1,2,3,4,5,6,2,3,4,5,6,7,8]],['dcAlFine',[1,2,3,4,5,6,1,2,3]],['dsAlFine',[1,2,3,4,5,6,2,3]],['dcAlCoda',[1,2,3,4,5,6,1,2,3,7,8]],['dsAlCoda',[1,2,3,4,5,6,2,3,7,8]]])test(`PDF ${command} follows musical destinations`,()=>{
 const marks={6:{command}};
 if(command.startsWith('ds'))marks[2]={marker:'segno'};
 if(command.endsWith('Fine'))marks[3]={marker:'fine'};
 if(command.endsWith('Coda')){marks[3]={marker:'toCoda'};marks[7]={marker:'coda'};}
 const plan=pdfRepeatPlan(bars,config(marks));assert.deepEqual(plan.issues,[]);assert.deepEqual(numbers(plan),expected);
});
test('incomplete pairs, missing targets and deleted marked bars block symbolic playback',()=>{
 for(const marks of [{1:{repeatStart:true}},{4:{repeatEnd:true}},{6:{command:'ds'}},{3:{marker:'toCoda'}},{9:{repeatStart:true}},{1:{repeatStart:true},3:{repeatEnd:true,ending:1}}]){
  const plan=pdfRepeatPlan(bars,config(marks));assert.ok(plan.issues.length);assert.deepEqual(plan.order,[]);
 }
 const off=pdfRepeatPlan(bars,config({1:{repeatStart:true}},'off'));assert.deepEqual(numbers(off),bars.map(b=>b.number));assert.deepEqual(off.issues,[]);
});
test('new settings coexist with old explicit rehearsal orders and survive binary backup',async()=>{
 const record={barMap:bars,repeatSettings:config({1:{repeatStart:true},3:{repeatEnd:true},8:{endBarline:'final'}}),practiceOrder:[8,8],loop:true};
 assert.deepEqual(numbers(practicePlan(record)),[1,2,3,1,2,3,4,5,6,7,8]);assert.equal(practicePlan(record).loop,false);
 assert.deepEqual(numbers(practicePlan({...record,repeatSettings:null})),[8,8]);
 const [{record:restored}]=await readBackup(exportPdfPractice(record,new Blob(['%PDF-test'])));assert.deepEqual(restored.repeatSettings,record.repeatSettings);assert.deepEqual(practicePlan(restored),practicePlan(record));
});
test('normalization is bounded and field edits do not mutate saved settings',()=>{
 const original=config({1:{repeatStart:true},8:{endBarline:'final'}}),before=structuredClone(original);
 const edited=setPdfRepeatMark(original,1,{repeatStart:false,ending:1});assert.deepEqual(original,before);assert.deepEqual(edited.marks[1],{ending:1});
 assert.deepEqual(normalizePdfRepeats(original),original);assert.equal(normalizePdfRepeats(null),null);
 assert.equal(normalizePdfRepeats(setPdfRepeatMark(original,1,{lift:0})).marks[1].lift,0);
 assert.deepEqual(normalizePdfRepeats({mode:'bad',marks:{'-1':{repeatEnd:true},1:{ending:20,marker:'bad'},2:{repeatStart:true}}}).marks,{2:{repeatStart:true}});
});
test('repeat and final barlines follow cropped/scaled measure boundaries in screen and PDF primitives',()=>{
 const bar={...bars[0],staves:[{top:.1,height:.3,lines:5},{top:.6,height:.3,lines:6}]},marks={1:{repeatStart:true,endBarline:'final'}};
 const crop={x:.05,y:.1,width:.9,height:.8},groups=pdfRepeatShapes([bar],marks,1,crop,900,800),r=projectRect(bar,crop);
 assert.equal(groups.length,1);assert.equal(groups[0].shapes.filter(s=>s.type==='circle').length,4);
 const endLines=groups[0].shapes.filter(s=>s.type==='line'&&s.x1>400);assert.equal(endLines.length,4);
 assert.ok(endLines.every(s=>Math.abs(s.x1-(r.x+r.width)*900)<10));
 const moved=pdfRepeatShapes([{...bar,x:bar.x+.1}],marks,1,crop,900,800);
 assert.ok(Math.abs(moved[0].shapes[0].x1-groups[0].shapes[0].x1-100)<1e-8);
 assert.deepEqual(pdfRepeatShapes([bar],marks,2,FULL_PAGE,600,800),[]);
 assert.deepEqual(pdfRepeatShapes([bar],marks,1,{...FULL_PAGE,cuts:[{start:.19,end:.3}]},600,700),[]);
 const calls=[],context=new Proxy({},{get:(o,k)=>o[k]??((...args)=>calls.push([k,...args]))});drawPdfRepeatShapes(context,groups);assert.equal(calls.filter(([k])=>k==='arc').length,4);
});
test('symbol spacing moves numbered endings without moving the recognized barline',()=>{
 const marks={1:{repeatEnd:true,ending:1,lift:0}},higher={1:{...marks[1],lift:20}};
 const a=pdfRepeatShapes(bars,marks,1,FULL_PAGE,600,800)[0].shapes,b=pdfRepeatShapes(bars,higher,1,FULL_PAGE,600,800)[0].shapes;
 assert.deepEqual(a[0],b[0]);assert.equal(a.find(s=>s.type==='text').y-b.find(s=>s.type==='text').y,20);
});
