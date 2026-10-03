import test from 'node:test';
import assert from 'node:assert/strict';
import {scrollPracticePage} from '../src/etudes/practiceScrollChain.js';

function surface({page=300,score=0,pageLimit=600,scoreLimit=1000}={}) {
 const view={scrollY:page,getComputedStyle:()=>({scrollMarginTop:'8px'}),scrollBy({top}){this.scrollY=Math.max(0,Math.min(pageLimit,this.scrollY+top));}};
 const reader={ownerDocument:{defaultView:view},scrollTop:score,scrollHeight:scoreLimit+500,clientHeight:500,
  getBoundingClientRect:()=>({top:308-view.scrollY}),scrollTo({top}){this.scrollTop=top;}};
 return {view,reader,move:delta=>scrollPracticePage(reader,{},delta)};
}

test('an upward drag immediately reveals controls while retaining the score position',()=>{
 const s=surface({score:600});assert.equal(s.move(-160),-160);assert.equal(s.reader.scrollTop,600);assert.equal(s.view.scrollY,140);
});
test('the same upward drag continues into the score after the controls are visible',()=>{
 const s=surface({page:100,score:600});assert.equal(s.move(-160),-160);assert.equal(s.reader.scrollTop,540);assert.equal(s.view.scrollY,0);
});
test('a drag through the bottom carries only the remaining distance to the page',()=>{
 const s=surface({score:960});assert.equal(s.move(140),140);assert.equal(s.reader.scrollTop,1000);assert.equal(s.view.scrollY,400);
});
test('downward scrolling stays in the reader after the controls are hidden',()=>{
 const s=surface({score:500});s.move(120);assert.equal(s.reader.scrollTop,620);assert.equal(s.view.scrollY,300);
});
test('one opening drag hides the controls and continues into the score',()=>{
 const s=surface({page:0});s.move(420);assert.equal(s.view.scrollY,300);assert.equal(s.reader.scrollTop,120);
});
test('a short score passes movement straight to the surrounding page',()=>{
 const s=surface({scoreLimit:0});s.move(-120);assert.equal(s.reader.scrollTop,0);assert.equal(s.view.scrollY,180);
});
test('the two outer boundaries stop momentum instead of inventing more movement',()=>{
 const top=surface({page:20,score:10});assert.equal(top.move(-100),-30);assert.equal(top.move(-100),0);
 const bottom=surface({page:590,score:990});assert.equal(bottom.move(100),20);assert.equal(bottom.move(100),0);
});
test('reversing direction after handoff immediately starts revealing the page',()=>{
 const s=surface({score:980});s.move(80);assert.equal(s.view.scrollY,360);
 s.move(-40);assert.equal(s.reader.scrollTop,1000);assert.equal(s.view.scrollY,320);
});
