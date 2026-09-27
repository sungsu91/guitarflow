import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutPrintPacks,movePrintPack,printPackBounds,printHeaderHeight,printDescriptionVisible,PRINT_TOP,PRINT_BOTTOM,PRINT_SPAN,PRINT_PACK_GAP} from '../src/rhythm-trainer/printLayout.js';
const pack=(key,count=4,columns=2)=>({printKey:key,printColumns:columns,measures:Array.from({length:count},(_,i)=>i),showMeta:true});
const check=layout=>{
 for(const item of layout.packs){assert.deepEqual(item.sections.flatMap(section=>section.measures),item.pattern.measures);for(const section of item.sections){assert.ok(section.top>=PRINT_TOP);assert.ok(section.top+section.height<=PRINT_BOTTOM+.01);assert.equal(section.left,45);}}
 for(let i=1;i<layout.packs.length;i++)assert.ok(layout.packs[i-1].end+PRINT_PACK_GAP<=layout.packs[i].start+.01);
};
test('pagination preserves every bar at every density and reserves branding and footers',()=>{for(const columns of [1,2,3,4])check(layoutPrintPacks([pack(0,40,columns),pack(1,16,columns)]));});
test('description visibility is independent and hiding both leaves a title-only header',()=>{
 for(const showMeta1 of [true,false])for(const showMeta2 of [true,false]){
  const pattern={...pack(0,32),showMeta1,showMeta2};
  assert.equal(printDescriptionVisible(pattern,1),showMeta1);assert.equal(printDescriptionVisible(pattern,2),showMeta2);
  assert.equal(printHeaderHeight(pattern),showMeta1||showMeta2?64:36);check(layoutPrintPacks([pattern,pack(1)]));
 }
});
test('only overflowing rows continue on page 2, then rejoin when moved up',()=>{
 const layout=layoutPrintPacks([pack(0),pack(1),pack(2)]),move=movePrintPack(layout,2,850-PRINT_TOP),next=layoutPrintPacks(layout.packs.map(p=>p.pattern),move.positions);
 assert.deepEqual(next.packs.slice(0,2),layout.packs.slice(0,2));assert.equal(next.packs[2].sections.length,2);
 assert.deepEqual(next.packs[2].sections.map(s=>s.measures),[[0,1],[2,3]]);assert.equal(next.packs[2].sections[0].page,0);assert.equal(next.packs[2].sections[1].page,1);check(next);
 const restored=layoutPrintPacks(layout.packs.map(p=>p.pattern),movePrintPack(next,2,layout.packs[2].start).positions);assert.equal(restored.pageCount,1);check(restored);
});
test('a pack stops at its neighbor instead of overlapping, pushing it, or jumping past it',()=>{
 const layout=layoutPrintPacks([pack(0),pack(1),pack(2)]);
 for(const target of [900,PRINT_SPAN*5]){
  const move=movePrintPack(layout,1,target),next=layoutPrintPacks(layout.packs.map(p=>p.pattern),move.positions);assert.equal(move.blocked,1);assert.deepEqual(next.packs[2],layout.packs[2]);check(next);
 }
 const upward=movePrintPack(layout,2,0);assert.equal(upward.blocked,-1);check(layoutPrintPacks(layout.packs.map(p=>p.pattern),upward.positions));
});
test('moving the last pack down opens space for the preceding pack across a page boundary',()=>{
 let layout=layoutPrintPacks([pack(0),pack(1),pack(2)]);
 layout=layoutPrintPacks(layout.packs.map(p=>p.pattern),movePrintPack(layout,2,PRINT_SPAN+450).positions);
 const third=layout.packs[2];layout=layoutPrintPacks(layout.packs.map(p=>p.pattern),movePrintPack(layout,1,PRINT_SPAN).positions);
 assert.equal(layout.packs[1].sections[0].page,1);assert.deepEqual(layout.packs[2],third);check(layout);
});
test('density and description changes repaginate without overlapping existing positions',()=>{
 let layout=layoutPrintPacks([pack(0,14,4),pack(1,24,4),pack(2,8,4)]);
 const positions=Object.fromEntries(layout.packs.map(p=>[p.key,p.start]));
 check(layoutPrintPacks([pack(0,14,1),{...pack(1,24,2),showMeta:false},pack(2,8,4)],positions));
});
test('collision limits remain valid across row and page transitions',()=>{
 for(const columns of [1,2,3,4])for(const count of [4,11,40]){
  const patterns=[pack(0,count,columns),pack(1,12,columns),pack(2,count,columns)];let layout=layoutPrintPacks(patterns);
  layout=layoutPrintPacks(patterns,movePrintPack(layout,2,layout.packs[2].start+PRINT_SPAN+200).positions);
  const bounds=printPackBounds(layout,1);
  for(const offset of [-1,0,.1,1,500])check(layoutPrintPacks(patterns,movePrintPack(layout,1,bounds.max+offset).positions));
 }
});
