import test from 'node:test';import assert from 'node:assert/strict';
import {normalizePageEdits,cropMargins,pageCrop,resizeCrop,FULL_PAGE,originalPoint,projectRect,moveStroke} from '../src/pdf/pdfAnnotations.js';
test('pen/text/crop round trip uses original-page coordinates and preserves legacy notes',()=>{
 const edits={1:{crop:null,margins:{top:.1,right:.1,bottom:.2,left:.1},notes:[{id:'old',x:.3,y:.4,text:'반복',size:.035,color:'brown'}],strokes:[{id:'pen',points:[[.2,.3],[.4,.5]],color:'red',width:.003,opacity:.5}]},2:{crop:{x:.1,y:.1,width:.8,height:.8},notes:[]}};
 const result=normalizePageEdits(JSON.parse(JSON.stringify(edits)),2);assert.deepEqual(result,edits);
 for(const [x,y] of result[1].strokes[0].points){const crop=pageCrop(result[1]),p=projectRect({x,y,width:0,height:0},crop),back=originalPoint(p,crop);assert.ok(Math.abs(back.x-x)<1e-10&&Math.abs(back.y-y)<1e-10);}
 assert.deepEqual(normalizePageEdits({1:{crop:null,notes:[]}},1),{1:{crop:null,notes:[]}});
});
test('all eight crop handles keep a rectangular retained region and cannot invert it',()=>{
 for(const h of ['nw','n','ne','e','se','s','sw','w']){const r=resizeCrop(FULL_PAGE,h,{x:.3,y:.2});assert.ok(r.width>=.05&&r.height>=.05);const c=pageCrop({margins:cropMargins(r)});for(const k of ['x','y','width','height'])assert.ok(Math.abs(c[k]-r[k])<1e-10);}
 const r=resizeCrop({x:.1,y:.1,width:.5,height:.5},'nw',{x:.99,y:.99});assert.ok(r.width>=.05-1e-10&&r.height>=.05-1e-10);
});
test('moving a pen stroke clamps the whole path, keeps spacing and leaves source unchanged',()=>{
 const s={id:'p',points:[[.2,.3],[.8,.7]],color:'red',width:.003,opacity:.5},before=JSON.stringify(s),m=moveStroke(s,1,-1);assert.equal(JSON.stringify(s),before);assert.equal(m.points[1][0],1);assert.equal(m.points[0][1],0);assert.ok(Math.abs(m.points[1][0]-m.points[0][0]-.6)<1e-10);
});
test('malformed ink and unsupported colors are bounded before backup restoration',()=>{
 const r=normalizePageEdits({1:{notes:[],strokes:[{id:'x',points:[[NaN,1],[-1,2],[.4,.4]],width:99,color:'url(invalid)',opacity:99},{id:'empty',points:[]}]}},1);assert.equal(r[1].strokes.length,1);assert.deepEqual(r[1].strokes[0].points,[[0,1],[.4,.4]]);assert.equal(r[1].strokes[0].color,'brown');assert.equal(r[1].strokes[0].width,.02);assert.equal(r[1].strokes[0].opacity,1);
});
