import test from 'node:test';
import assert from 'node:assert/strict';
import {navigationBottom,alignNavigationEndings} from '../src/etudes/drawScoreNavigation.js';
test('navigation stays six units above an empty stave',()=>assert.equal(navigationBottom(0,24,100,20,[]),94));
test('only overlapping visible notation moves a marker',()=>{
 assert.equal(navigationBottom(0,24,100,20,[{x:40,y:70,width:20,height:20}]),94);
 assert.equal(navigationBottom(0,24,100,20,[{x:0,y:100,width:20,height:20}]),94);
 assert.equal(navigationBottom(0,24,100,20,[{x:0,y:75,width:20,height:20}]),69);
 assert.equal(navigationBottom(0,24,100,20,[{x:0,y:75,width:20,height:20},{x:0,y:48,width:20,height:12}]),42);
});
test('removing notes restores the near-stave position',()=>{
 const boxes=[{x:0,y:75,width:20,height:20}];assert(navigationBottom(0,24,100,20,boxes)<94);assert.equal(navigationBottom(0,24,100,20,[]),94);
});
test('a spanning ending clears high notation across its whole bracket',()=>assert.equal(navigationBottom(0,200,100,18,[{x:140,y:10,width:20,height:10}],{span:true}),4));
test('ending spans align by row and number, and recover after an edit',()=>{
 const node=y=>({dataset:{endingY:String(y)},setAttribute(key,value){this[key]=value;}});
 const a=node(30),b=node(15),c=node(40),d=node(45);
 const entries=[{index:0,row:1,number:1,node:a},{index:1,row:1,number:1,node:b},{index:2,row:1,number:2,node:c},{index:3,row:2,number:2,node:d}];
 alignNavigationEndings(entries);assert.equal(a.transform,'translate(0 -15)');assert.equal(c.transform,'translate(0 0)');assert.equal(d.transform,'translate(0 0)');
 b.dataset.endingY='30';alignNavigationEndings(entries);assert.equal(a.transform,'translate(0 0)');
});
