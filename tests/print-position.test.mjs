import test from 'node:test';
import assert from 'node:assert/strict';
import {paginatePrintPacks,placePrintSections,positionPrintSection,PRINT_BOTTOM} from '../src/rhythm-trainer/printLayout.js';
const pack=(key,count=4,columns=2)=>({printKey:key,printColumns:columns,measures:Array.from({length:count},(_,i)=>i),showMeta:true});
test('automatic print layout retains every measure and stays above the footer',()=>{
 for(const columns of [1,2,3,4]){
  const pages=paginatePrintPacks([pack(0,40,columns),pack(1,16,columns)]);
  assert.deepEqual(pages.flat().filter(s=>s.pattern.printKey===0).flatMap(s=>s.measures),pack(0,40).measures);
  for(const page of pages)for(const section of page)assert.ok(section.top+section.height<=PRINT_BOTTOM+.01);
 }
});
test('a moved pack can pass earlier packs without moving them or inheriting their spacing',()=>{
 const pages=paginatePrintPacks([pack(0),pack(1),pack(2)]),initial=placePrintSections(pages,{});
 const moved=placePrintSections(pages,{'2:0':{top:10,left:20,page:0}});
 assert.equal(moved[2].top,10);assert.ok(moved[2].top<initial[0].top);
 assert.deepEqual(moved.slice(0,2),initial.slice(0,2));
 const lower=positionPrintSection(initial[2],{top:650});assert.equal(lower.top,650);
});
test('independent page placement uses paper bounds and never clips a score into the footer',()=>{
 const section=paginatePrintPacks([pack(0)])[0][0];
 const moved=positionPrintSection(section,{page:2,top:99999,left:-100});
 assert.equal(moved.page,2);assert.equal(moved.left,10);assert.equal(moved.top+section.height,PRINT_BOTTOM);
 assert.equal(placePrintSections([[section]],{'0:0':{page:1,top:100}})[0].page,1);
});
