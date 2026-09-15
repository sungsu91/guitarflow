import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePageEdits,projectRect,originalPoint,pageCrop,removalCrop,FULL_PAGE} from '../src/pdf/pdfAnnotations.js';
test('Crop projects overlays without changing original bar coordinates',()=>{
 const bar=Object.freeze({page:1,number:1,x:.2,y:.3,width:.2,height:.1}),crop={x:.1,y:.1,width:.8,height:.8};
 const displayed=projectRect(bar,crop),original=originalPoint(displayed,crop);
 assert.equal(displayed.width,.25);assert.ok(Math.abs(original.x-bar.x)<1e-12);assert.ok(Math.abs(original.y-bar.y)<1e-12);assert.equal(bar.width,.2);
 assert.deepEqual(projectRect(bar),bar);
});
test('Old metadata needs no migration and invalid annotations do not reach the renderer',()=>{
 assert.deepEqual(normalizePageEdits(undefined,3),{});
 const result=normalizePageEdits({1:{crop:{x:0,y:0,width:2,height:1},notes:[{id:'n',text:'hello',x:.2,y:.3,size:100,color:'script'},{id:'bad',x:NaN,y:0}]},4:{crop:null}},3);
 assert.deepEqual(result,{1:{crop:null,notes:[{id:'n',text:'hello',x:.2,y:.3,size:.08,color:'brown'}]}});
});
test('JSON serialization and metadata normalization preserve saved page edits',()=>{
 const edits={2:{crop:{x:.1,y:.2,width:.8,height:.7},notes:[{id:'stable-id',text:'풀링\n가볍게',x:.3,y:.4,size:.035,color:'red'}]}};
 assert.deepEqual(normalizePageEdits(JSON.parse(JSON.stringify(edits)),3),edits);
});
test('Edge selections remove a full margin strip; center holes and whole-page removal are rejected',()=>{
 for(const [edge,rect] of Object.entries({top:{x:.1,y:0,width:.8,height:.12},bottom:{x:.1,y:.9,width:.8,height:.1},left:{x:0,y:.1,width:.08,height:.8},right:{x:.9,y:.1,width:.1,height:.8}})){
  const proposal=removalCrop(rect);assert.equal(proposal.edge,edge);assert.ok(proposal.margins[edge]>0);
  const kept=pageCrop(proposal);assert.ok(kept.width*kept.height<1);
  assert.ok(Math.abs(kept.width*kept.height+proposal.removed.width*proposal.removed.height-1)<1e-12);
 }
 assert.equal(removalCrop({x:.2,y:.2,width:.2,height:.2}),null);
 assert.equal(removalCrop(FULL_PAGE),null);
});
test('Repeated edge removals accumulate, retaining original overlay coordinates and legacy crop',()=>{
 const legacy={crop:{x:.1,y:.1,width:.8,height:.8},notes:[]};
 assert.deepEqual(pageCrop(legacy),legacy.crop);
 const proposal=removalCrop({x:.1,y:.2,width:.08,height:.5},legacy);
 assert.equal(proposal.edge,'left');assert.ok(Math.abs(proposal.margins.left-.18)<1e-12);
 const metadata={1:{crop:null,margins:proposal.margins,notes:[]},2:legacy};
 assert.deepEqual(normalizePageEdits(JSON.parse(JSON.stringify(metadata)),2),metadata);
 assert.deepEqual(pageCrop({crop:null,margins:null}),FULL_PAGE);
 assert.deepEqual(pageCrop({margins:{top:1,right:0,bottom:0,left:0}}),FULL_PAGE);
});
