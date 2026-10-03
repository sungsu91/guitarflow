import test from 'node:test';
import assert from 'node:assert/strict';
import {createScorePlayheadLayer} from '../src/etudes/scorePlayheadLayer.js';

test('playback, pause and page/repeat jumps reuse attached cursor nodes',()=>{
 let insertions=0,removals=0;
 const line=()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},cloneNode(){return {...line(),attrs:{...this.attrs}};},remove(){removals++;}});
 const pages=Array.from({length:6},()=>({children:[],append(...nodes){insertions+=nodes.length;this.children.push(...nodes);}}));
 const root={ownerDocument:{createElementNS:line},querySelectorAll:()=>pages};
 const layer=createScorePlayheadLayer(root);assert.equal(insertions,12);
 const first=layer.activate(pages[0]);assert.equal(first.line.attrs.visibility,'visible');
 for(const page of [pages[1],pages[5],pages[0],pages[5]]){
  const current=layer.activate(page);
  assert.equal(pages.flatMap(p=>p.children).filter(n=>n.attrs.class==='savedScorePlayhead').length,1);
  assert.equal(current.line.attrs.visibility,'visible');
  assert.equal(insertions,12);assert.equal(removals,0);
 }
 layer.hide();assert(pages.flatMap(p=>p.children).every(n=>n.attrs.visibility==='hidden'));
 assert.equal(layer.activate(pages[0]).line,first.line);assert.equal(insertions,12);
 layer.destroy();assert.equal(removals,12);
});
