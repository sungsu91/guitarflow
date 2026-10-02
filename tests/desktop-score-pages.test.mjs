import test from 'node:test';
import assert from 'node:assert/strict';
import {paginateScoreRows} from '../src/etudes/desktopScorePages.js';

test('pages preserve every complete system and reserve the first-page heading',()=>{
  const rows=Array.from({length:14},(_,row)=>({start:row*300,end:(row+1)*300}));
  const pages=paginateScoreRows(rows,{height:1400,heading:144});
  assert.deepEqual(pages.map(p=>[p.first,p.last]),[[0,3],[4,7],[8,11],[12,13]]);
  assert.equal(pages[0].start,0);assert.equal(pages.at(-1).end,4200);
  for(let i=1;i<pages.length;i++)assert.equal(pages[i-1].end,pages[i].start);
});

test('an oversized system fits on one page without losing its tail',()=>{
  const pages=paginateScoreRows([{start:40,end:2040},{start:2040,end:2200}],{height:1000,heading:100});
  assert.equal(pages.length,2);assert.equal(pages[0].scale,.45);assert.equal(pages[1].scale,1);
  assert.equal(pages[0].end,2040);
});

test('engraving width scale determines page capacity, not the screen zoom',()=>{
  const rows=Array.from({length:6},(_,row)=>({start:row*300,end:(row+1)*300}));
  assert.equal(paginateScoreRows(rows,{scale:.5,height:1000,heading:100}).length,1);
  assert.equal(paginateScoreRows([]).length,0);
});

test('mobile paper holds multiple complete two-bar systems without gaps or duplicate rows',()=>{
 const rows=Array.from({length:20},(_,row)=>({start:row*280,end:(row+1)*280}));
 for(const width of [258,328,378]){
  const pages=paginateScoreRows(rows,{scale:(width-22)/600,height:width*297/210-20-36,heading:0});
  assert(pages.length>1);
  assert(pages.every(page=>page.last>page.first));
  assert.deepEqual(pages.flatMap(page=>Array.from({length:page.last-page.first+1},(_,i)=>page.first+i)),rows.map((_,i)=>i));
 }
});
