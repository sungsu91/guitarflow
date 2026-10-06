import test from 'node:test';
import assert from 'node:assert/strict';
import {attachDetachedQuarterRhythm} from '../src/pdf/tab-import/detachedQuarterRhythm.js';
import {findPhotoTupletBrackets} from '../src/pdf/tab-import/photoTupletBracket.js';
import {resolveImageTuplets} from '../src/pdf/tab-import/imageTuplets.js';
import {supplementPhotoRhythm,preservePhotoTupletReview} from '../src/pdf/tab-import/zoomConsensus.js';

function quarterFixture(direction=-1){
 const width=300,height=400,ink=new Uint8Array(width*height),edge=direction===-1?160:260,yy=y=>direction===-1?y:420-y;
 const box=(x,y,w,h)=>{for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++)ink[yy(py)*width+px]=1;};
 box(60,100,3,40);box(100,100,3,40);box(60,100,43,4);box(160,100,7,40);
 const staff={spacing:20,x:20,width:240,lines:[160,180,200,220,240,260],candidates:[{cx:163,stringDistance:0}],measures:[{x:20,width:240,rhythm:[60,100].map(x=>({x,y:yy(100),direction,beamCount:1,duration:'8'}))}]};
 return {width,height,ink,staff,box,edge};
}
for(const direction of [-1,1])test(`separate ${direction<0?'upper':'lower'} rhythm accepts a wide bare quarter without moving existing notes`,()=>{
 const f=quarterFixture(direction),old=structuredClone(f.staff.measures[0].rhythm);
 attachDetachedQuarterRhythm(f.ink,f.width,f.height,f.staff);
 assert.deepEqual(f.staff.measures[0].rhythm.slice(0,2),old);
 assert.equal(f.staff.measures[0].rhythm[2].duration,'4');assert.equal(f.staff.measures[0].rhythm[2].x,163);
});
test('detached quarter recovery rejects flags, beams, picking marks, missing anchors and unsupported baselines',()=>{
 for(const change of [f=>f.box(163,100,18,5),f=>f.box(163,100,60,10),f=>{for(let y=114;y<140;y++)f.ink.fill(0,y*f.width+160,y*f.width+167);},f=>{f.staff.candidates=[];},f=>{f.staff.measures[0].rhythm.forEach(r=>r.y=80);},f=>{f.staff.measures[0].rhythm=[];}]){
  const f=quarterFixture();change(f);const old=structuredClone(f.staff.measures[0].rhythm);attachDetachedQuarterRhythm(f.ink,f.width,f.height,f.staff);assert.deepEqual(f.staff.measures[0].rhythm,old);
 }
});
function tripletFixture(){
 const width=300,height=300,g=20,ink=new Uint8Array(width*height),rgba=new Uint8ClampedArray(width*height*4).fill(255);
 const box=(x,y,w,h,value=1)=>{for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++){ink[py*width+px]=value;rgba.set([value?0:255,value?0:255,value?0:255,255],(py*width+px)*4);}};
 for(const x of [100,140,180])box(x,170,3,34);box(100,200,83,4);
 box(100,212,33,3);box(148,212,35,3);box(100,207,3,8);box(180,207,3,8);box(137,207,7,11);
 const staff={id:1,spacing:g,measures:[{rhythm:[100,140,180].map((x,i)=>({x,y:i===1?203:214,direction:1,beamCount:i===1?1:2,duration:i===1?'8':'16',confidence:.97}))}]};
 return {width,height,ink,rgba,staff,box};
}
test('a separate bracket corrects false outer sixteenths only after its numeral is independently read',()=>{
 const f=tripletFixture(),old=structuredClone(f.staff.measures[0].rhythm);f.staff.tupletCandidates=findPhotoTupletBrackets(f.rgba,f.ink,f.width,f.height,f.staff);assert.equal(f.staff.tupletCandidates.length,1);
 const label=f.staff.tupletCandidates[0];assert.deepEqual(label.stems,[100,140,180]);
 for(const ocr of [{text:'3',agrees:false,confidence:.99},{text:'3',agrees:true,confidence:.8},{text:'6',agrees:true,confidence:.99}]){label.ocr=ocr;resolveImageTuplets(f.staff);assert(f.staff.measures[0].rhythm.every(r=>r.duration===null&&r.confidence===0&&r.photoTupletUnverified));assert.deepEqual(f.staff.measures[0].rhythm.map(r=>r.x),old.map(r=>r.x));}
 label.ocr={text:'3',agrees:true,confidence:.98};resolveImageTuplets(f.staff);
 assert(f.staff.measures[0].rhythm.every(r=>r.duration==='8'&&r.beamCount===1&&r.tuplet.actualNotes===3&&r.tuplet.normalNotes===2));
});
test('a second scale cannot silently replace an unread bracket with ordinary beamed timing',()=>{
 const target={x:0,width:200,rhythm:[{x:100,duration:null,photoTupletUnverified:true}]},source={x:0,width:400},candidates=[{cx:100,stringDistance:0}];
 const reading={x:200,duration:'16',confidence:.99};supplementPhotoRhythm(target,source,[reading],candidates,.03);assert.equal(target.rhythm[0].duration,null);
 reading.duration='8';reading.tuplet={actualNotes:3,normalNotes:2,groupId:'verified'};supplementPhotoRhythm(target,source,[reading],candidates,.03);assert.equal(target.rhythm[0].duration,'8');assert.equal(target.rhythm[0].photoTupletUnverified,undefined);
});
test('a genuine second beam or missing bracket endpoint cannot become a triplet',()=>{
 for(const change of [f=>f.box(100,212,83,3),f=>f.box(100,207,3,5,0),f=>f.box(137,207,7,11,0)]){
  const f=tripletFixture();change(f);assert.equal(findPhotoTupletBrackets(f.rgba,f.ink,f.width,f.height,f.staff).length,0);
 }
});
test('selecting a zoom measure preserves an unread bracket but accepts independently verified tuplets',()=>{
 const source={x:0,width:200,rhythm:[{x:100,duration:null,photoTupletUnverified:true}]};
 const target={x:0,width:400,rhythm:[{x:200,duration:'16',confidence:.99},{x:300,duration:'8',confidence:.99}]};
 preservePhotoTupletReview(target,source,.03);
 assert.equal(target.rhythm[0].duration,null);assert.equal(target.rhythm[1].duration,'8');
 target.rhythm[0]={x:200,duration:'8',confidence:.99,tuplet:{actualNotes:3,normalNotes:2},tupletEvidence:{confidence:.98}};
 preservePhotoTupletReview(target,source,.03);assert.equal(target.rhythm[0].duration,'8');
 target.rhythm=[{x:198,duration:'16'},{x:202,duration:'16'}];
 preservePhotoTupletReview(target,source,.03);assert(target.rhythm.every(r=>r.duration==='16'));
});
