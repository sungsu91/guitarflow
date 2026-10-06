import test from 'node:test';
import assert from 'node:assert/strict';
import {detectPracticeMeasures,practiceMeasureMap} from '../src/pdf/autoMeasures.js';
import {isPhotographicPage,photoPaperPoint} from '../src/pdf/photoPracticeMeasures.js';
import {cleanTrackPoints} from '../src/pdf/photoPracticeRows.js';
import {photoBars} from '../src/pdf/photoPracticeBarlines.js';
import {pdfBarRegions,normalizePdfBarEntry,movePdfRow} from '../src/pdf/pdfBarRows.js';
import {practiceOrder,barAtTick} from '../src/pdf/pdfModel.js';

function photograph(staves,{connect=false,white=false}={}){
 const width=1300,height=1000,rgba=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*4,gray=white?255:175+Math.round(x/width*35+y/height*20);rgba.set([gray,gray,gray,255],p);}
 const ink=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=width||y>=height)return;const p=(y*width+x)*4;rgba[p]=rgba[p+1]=rgba[p+2]=40;};
 const line=(x1,y1,x2,y2)=>{const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let i=0;i<=n;i++){const x=x1+(x2-x1)*i/n,y=y1+(y2-y1)*i/n;ink(x,y);ink(x,y+1);}};
 const bend=x=>Math.sin(x/600)*5+x*.015;
 for(const {top,count,bars=[120,450,840,1180]} of staves){
  for(let i=0;i<count;i++)for(let x=120;x<=1180;x++){ink(x,top+i*15+bend(x));ink(x,top+i*15+bend(x)+1);}
  for(const x of bars)line(x,top+bend(x),x,top+(count-1)*15+bend(x));
  // Detached short rhythm beams and up/down picking marks do not cross the staff.
  for(let x=180;x<1100;x+=130){const y=top+count*15+bend(x)+12;line(x,y,x,y+16);line(x,y+16,x+24,y+16);line(x+24,y+16,x+24,y);line(x+40,y+27,x+48,y+38);line(x+48,y+38,x+56,y+27);}
 }
 if(connect)line(120,staves[0].top+bend(120),120,staves.at(-1).top+(staves.at(-1).count-1)*15+bend(120));
 return {rgba,width,height,page:1};
}

test('shaded curved TAB keeps unequal measure boundaries and rejects detached picking',()=>{
 const result=detectPracticeMeasures(photograph([{top:180,count:6},{top:500,count:6}]));
 assert.equal(result.source,'photo');assert.deepEqual(result.systems.map(s=>result.measures.filter(m=>m.system===s.system).length),[3,3]);
 for(const measure of result.measures){assert.equal(measure.regions.length,1);assert.ok(measure.x>=0&&measure.x+measure.width<=1);}
 assert.ok(Math.abs(result.measures[1].x-450/1300)<.01);assert.ok(Math.abs(result.measures[2].x-840/1300)<.01);
 assert.equal(result.requiresReview,true);
});
test('photographed notation and TAB share a logical number; two TAB systems stay separate',()=>{
 const result=detectPracticeMeasures(photograph([{top:120,count:5},{top:320,count:6},{top:620,count:6}]));
 assert.equal(result.systems.length,2);assert.equal(result.measures.length,6);assert.equal(result.measures[0].regions.length,2);
 const bars=practiceMeasureMap([result],[4,4]);assert.deepEqual(bars.map(b=>b.number),[1,2,3,4,5,6]);
 const order=practiceOrder({barMap:bars,loop:true,loopStart:2,loopEnd:3});
 assert.equal(barAtTick(order,8,true).bar.number,2);
});
test('photographed piano staves joined by a thin connector are simultaneous',()=>{
 const result=detectPracticeMeasures(photograph([{top:180,count:5},{top:400,count:5}],{connect:true}));
 assert.equal(result.measures.length,3);assert.equal(result.systems[0].staffCount,2);
});
test('clean white engravings retain the ordinary detector',()=>{
 const image=photograph([{top:180,count:6}],{white:true});assert.equal(isPhotographicPage(image),false);
});
test('a photographed full-height quarter-note stem with a head is not a measure edge',()=>{
 const image=photograph([{top:180,count:5}]),{width,rgba}=image,x=700,top=180+Math.sin(x/600)*5+x*.015;
 const paint=(xx,yy)=>{const p=(Math.round(yy)*width+Math.round(xx))*4;rgba[p]=rgba[p+1]=rgba[p+2]=20;};
 for(let y=top;y<=top+60;y++)for(let dx=0;dx<2;dx++)paint(x+dx,y);
 for(let dy=-5;dy<=5;dy++)for(let dx=-8;dx<=8;dx++)if(dx*dx/64+dy*dy/25<=1)paint(x-7+dx,top+60+dy);
 const result=detectPracticeMeasures(image);assert.equal(result.measures.length,3);assert.ok(!result.measures.some(m=>Math.abs(m.x-x/width)<.02));
});
test('an isolated shifted rule window is removed without flattening page curvature',()=>{
 const points=Array.from({length:7},(_,i)=>({x:i*100,center:100+i*i*.4,spacing:15,lines:[]}));
 points[3]={...points[3],center:points[3].center+16};
 const result=cleanTrackPoints(points);assert.equal(result.length,6);assert.ok(!result.includes(points[3]));assert.equal(result.at(-1),points.at(-1));
});
test('paper correction maps every corner back to its original photograph',()=>{
 const quad=[{x:.12,y:.04},{x:.95,y:.17},{x:.8,y:.92},{x:.03,y:.85}];
 [[0,0],[1,0],[1,1],[0,1]].forEach(([u,v],i)=>{const p=photoPaperPoint(quad,u,v);assert.ok(Math.abs(p.x-quad[i].x)<1e-10);assert.ok(Math.abs(p.y-quad[i].y)<1e-10);});
});
test('stacked TAB digits and a full-height rhythm stem are not new barlines',()=>{
 const width=500,height=180,ink=new Uint8Array(width*height),staff={x:20,width:460,lines:[40,56,72,88,104,120],spacing:16};
 const fill=(x,y,w,h)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)ink[j*width+i]=1;};
 for(const y of staff.lines)fill(20,y,460,1);for(const x of [20,250,480])fill(x,40,2,81);
 fill(160,40,2,105); // A stem continues below the bottom rule.
 for(const y of staff.lines){fill(330,y-5,2,11);fill(330,y-5,7,2);fill(330,y+4,7,2);fill(335,y-5,2,11);}
 const bars=photoBars(ink,width,staff).map(b=>b.x);
 assert.ok(bars.some(x=>Math.abs(x-250)<3));assert.ok(!bars.some(x=>Math.abs(x-160)<5||Math.abs(x-333)<10),JSON.stringify(bars));
});
test('separate part regions persist and move proportionally without extra playback beats',()=>{
 const row={number:1,page:1,count:1,beats:4,x:.1,y:.1,width:.4,height:.5,regions:[{x:.1,y:.1,width:.3,height:.1},{x:.15,y:.5,width:.35,height:.1}]};
 const normalized=normalizePdfBarEntry(JSON.parse(JSON.stringify(row)));assert.equal(pdfBarRegions(normalized).length,2);
 const moved=movePdfRow([normalized],1,{x:.2,y:.2,width:.2,height:.25})[0];
 assert.ok(Math.abs(moved.regions[1].x-.225)<1e-10);assert.ok(Math.abs(moved.regions[1].y-.4)<1e-10);assert.ok(Math.abs(moved.regions[1].width-.175)<1e-10);
 assert.equal(practiceOrder({barMap:[moved]}).length,1);
 assert.deepEqual(pdfBarRegions({...row,regions:[{x:NaN,y:0,width:1,height:1}]}).map(r=>r.number),[1]);
});
