import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraBarlineColumns} from '../src/pdf/tab-import/cameraBarlines.js';
import {detectBarlines} from '../src/pdf/tab-import/geometry.js';
const width=800,height=240,staff={x:20,width:740,y:60,height:100,lines:[60,80,100,120,140,160],spacing:20,thickness:1};
const segment=(a,x1,y1,x2,y2)=>{const steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));for(let i=0;i<=steps;i++)a[Math.round(y1+(y2-y1)*i/steps)*width+Math.round(x1+(x2-x1)*i/steps)]=1;};
function ruled(start=20){const a=new Uint8Array(width*height);for(const y of staff.lines)segment(a,start,y,760,y);return a;}
test('a faint ruled line corroborates a dark slanted bar without brightening the bar itself',()=>{
 const rules=ruled(),ink=rules.slice();for(let x=20;x<500;x++)ink[120*width+x]=0;
 segment(ink,397,60,403,160);
 assert.equal(cameraBarlineColumns(ink,width,staff).length,0);
 assert(cameraBarlineColumns(ink,width,staff,[],rules).some(x=>Math.abs(x-400)<2));
 const split=detectBarlines(ink,width,staff,{camera:true,ruleInk:rules});
 assert.equal(split.measures.length,2);
 assert(split.measures.every(m=>m.boundaryEvidence==='faint-rules'));
 const clear=rules.slice();segment(clear,397,60,403,160);
 assert(detectBarlines(clear,width,staff,{camera:true,ruleInk:rules}).measures.every(m=>!m.boundaryEvidence),'normal rules retain the established zoom policy');
 const broken=ink.slice();for(let y=108;y<=112;y++)for(let x=395;x<=405;x++)broken[y*width+x]=0;
 assert.equal(cameraBarlineColumns(broken,width,staff,[],rules).length,0,'a missing vertical segment remains unproven');
 const five=rules.slice();five.fill(0,120*width,121*width);
 assert.equal(cameraBarlineColumns(ink,width,staff,[],five).length,0,'a beam beside five ruled lines is not a six-string staff');
});
test('ink outside the left rule does not create a phantom measure; a true short bar is preserved',()=>{
 const photo=ruled(100);for(const x of [100,400,760])segment(photo,x,60,x,160);
 for(const y of staff.lines)segment(photo,20,y,35,y);
 const repaired=detectBarlines(photo,width,staff,{camera:true});assert.equal(repaired.measures.length,2);assert.equal(repaired.measures[0].x,100);
 assert.equal(detectBarlines(photo,width,staff,{trimUnruledMargins:true}).measures.length,2,'straight deskew also rejects an unruled paper margin');
 assert.equal(detectBarlines(photo,width,staff).measures.length,3,'ordinary scan path is unchanged');
 const pickup=ruled();for(const x of [100,400,760])segment(pickup,x,60,x,160);
 assert.equal(detectBarlines(pickup,width,staff,{camera:true}).measures.length,3,'horizontal rules retain an empty/pickup bar');
 assert.equal(detectBarlines(pickup,width,staff,{trimUnruledMargins:true}).measures.length,3);
 const shadow=photo.slice();for(let y=0;y<height;y++)for(let x=20;x<=85;x++)shadow[y*width+x]=1;
 assert.equal(detectBarlines(shadow,width,staff,{trimUnruledMargins:true}).measures.length,2,'a solid edge shadow is not horizontal-rule evidence');
});
