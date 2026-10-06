import test from 'node:test';
import assert from 'node:assert/strict';
import {detectPaperQuad,fullPaperQuad,validPaperQuad,warpPaperPixels,enhancePaperPixels} from '../src/pdf/tab-import/paperScanGeometry.js';

function photo(w,h,pixel){const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=pixel(x,y),p=(y*w+x)*4;data[p]=data[p+1]=data[p+2]=v;data[p+3]=255;}return data;}
test('a complete flat score keeps its edges and exact pixels',()=>{
 const w=240,h=320,data=photo(w,h,(x,y)=>y%43<2&&x>15&&x<225?70:250);
 const result=detectPaperQuad(data,w,h);assert.equal(result.detected,false);assert.deepEqual(result.quad,fullPaperQuad());
 const warped=warpPaperPixels(data,w,h,result.quad);assert.equal(warped.width,w);assert.equal(warped.height,h);assert.deepEqual(warped.data,data);
});
test('paper in a busy dark background is isolated without cropping notation',()=>{
 const w=300,h=400,data=photo(w,h,(x,y)=>x>30&&x<275&&y>28&&y<370?(y%44<2&&x>48&&x<258?70:205):(x*19+y*7)%110);
 const {quad,detected}=detectPaperQuad(data,w,h);assert(detected);
 assert(quad[0].x<48/w&&quad[0].x>.03);assert(quad[0].y<45/h);assert(quad[2].x>258/w);assert(quad[2].y>350/h);
});
test('staff lines near page ends do not become cropping boundaries',()=>{
 const w=240,h=320,data=photo(w,h,(x,y)=>[40,44,48,52,56,60,258,262,266,270,274,278].includes(y)&&x>12&&x<230?15:210);
 assert.deepEqual(detectPaperQuad(data,w,h).quad,fullPaperQuad());
});
test('partial paper at the camera edge is preserved through a corner shadow',()=>{
 const w=240,h=320,data=photo(w,h,(x,y)=>x>w*.8&&y>h*.87?90:195);
 const q=detectPaperQuad(data,w,h).quad;assert.equal(q[2].y,1);assert.equal(q[3].y,1);
});
test('corners must be convex, finite, and large enough',()=>{
 for(const q of [null,[],[{x:NaN,y:0},...fullPaperQuad().slice(1)],[fullPaperQuad()[0],fullPaperQuad()[2],fullPaperQuad()[1],fullPaperQuad()[3]],fullPaperQuad().map(p=>({x:p.x*.1,y:p.y*.1}))])assert.equal(validPaperQuad(q),false);
 assert.throws(()=>warpPaperPixels(new Uint8ClampedArray(400),10,10,[]));
});
test('perspective sampling preserves corner orientation and bounds memory',()=>{
 const w=200,h=300,data=photo(w,h,(x,y)=>x/2+y/3),q=[{x:.1,y:.1},{x:.9,y:.2},{x:.8,y:.9},{x:.2,y:.8}];
 const result=warpPaperPixels(data,w,h,q,{maxPixels:2000,maxSide:90});assert(result.width*result.height<2100);assert(Math.max(result.width,result.height)<=90);assert(Math.abs(result.data[0]-20)<2);assert(result.data.at(-4)>150);
});
test('lighting correction preserves dark strokes and makes shaded paper bright',()=>{
 const w=240,h=320,data=photo(w,h,(x,y)=>y===160?35:110+x/3),copy=data.slice(),enhanced=enhancePaperPixels(data,w,h);
 assert.deepEqual(data,copy);assert(enhanced[(80*w+40)*4]>235);assert(enhanced[(160*w+40)*4]<60);assert(enhanced[(159*w+40)*4]>200);
});
