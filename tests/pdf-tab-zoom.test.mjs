import test from 'node:test';
import assert from 'node:assert/strict';
import {binaryPage,detectRhythm,removeStaffRules} from '../src/pdf/tab-import/geometry.js';
import {resolvePage,summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {combineZoomReadings} from '../src/pdf/tab-import/zoomConsensus.js';
import {agreeReadings} from '../src/pdf/tab-import/localOcr.js';
const staff={id:1,x:30,y:100,width:250,height:100,lines:[100,120,140,160,180,200],spacing:20,thickness:3};
const measure={x:30,width:250};
test('dark beam mask separates two beams even when antialiasing joins their pale gap',()=>{
 const w=320,h=300,rgba=new Uint8ClampedArray(w*h*4).fill(255),paint=(x,y,value)=>rgba.set([value,value,value,255],(y*w+x)*4);
 for(let y=202;y<=250;y++)paint(100,y,0);
 for(let x=100;x<145;x++)for(let y=235;y<=250;y++)paint(x,y,y>239&&y<247?190:0);
 const dark=binaryPage(rgba,w,h,145),ink=binaryPage(rgba,w,h,205),r=detectRhythm(ink,w,h,staff,measure,[],dark);
 assert.equal(r.length,1);assert.equal(r[0].beamCount,2);assert.equal(r[0].duration,'16');
});
test('one and two disconnected flags work on upward and downward stems',()=>{
 for(const direction of [-1,1])for(const count of [1,2]){
  const w=320,h=300,ink=new Uint8Array(w*h),end=direction===1?250:50,edge=direction===1?200:100;
  for(let k=2;k<=50;k++)ink[(edge+direction*k)*w+100]=1;
  for(let flag=0;flag<count;flag++)for(let k=flag*16;k<flag*16+8;k++)for(let x=106;x<=113;x++)ink[(end-direction*k)*w+x]=1;
  const r=detectRhythm(ink,w,h,staff,measure);assert.equal(r.length,1);assert.equal(r[0].duration,count===1?'8':'16');
 }
});
test('staff rule erasure preserves digit strokes crossing the line while removing the long rule',()=>{
 const w=320,h=300,ink=new Uint8Array(w*h);
 for(const line of staff.lines)for(let y=line-1;y<=line+1;y++)for(let x=30;x<=280;x++)ink[y*w+x]=1;
 for(let y=92;y<=108;y++)for(const x of [70,71,79,80])ink[y*w+x]=1;
 const clean=removeStaffRules(ink,w,h,staff);assert.equal(clean[100*w+70],1);assert.equal(clean[100*w+140],0);assert.equal(ink[100*w+140],1);
});
test('detached picking marks cannot turn quarters into flags or eighths into sixteenths',()=>{
 for(const direction of [1,-1])for(const beam of [false,true]){
  const w=320,h=300,ink=new Uint8Array(w*h),edge=direction===1?200:100,end=edge+direction*50;
  for(let k=2;k<=50;k++)ink[(edge+direction*k)*w+100]=1;
  if(beam)for(let k=0;k<4;k++)for(let x=100;x<145;x++)ink[(end-direction*k)*w+x]=1;
  // An isolated down-pick bracket just beyond the end of the true stem.
  for(let k=9;k<13;k++)for(let x=95;x<=112;x++)ink[(end+direction*k)*w+x]=1;
  const r=detectRhythm(ink,w,h,staff,measure);assert.equal(r.length,1);assert.equal(r[0].duration,beam?'8':'4');
 }
});
test('a two-pixel antialiasing break before a beam does not turn an eighth into a quarter',()=>{
 const w=320,h=300,ink=new Uint8Array(w*h);
 for(let y=202;y<=245;y++)ink[y*w+100]=1;
 for(let y=248;y<=254;y++)ink[y*w+100]=1;
 for(let y=251;y<=254;y++)for(let x=100;x<145;x++)ink[y*w+x]=1;
 assert.equal(detectRhythm(ink,w,h,staff,measure)[0].duration,'8');
});
const fixture=(scale=1,text='3',confidence=.93)=>resolvePage({page:1,width:600*scale,height:400*scale,staffs:[{...staff,spacing:20*scale,candidates:[80,130,180,230].map((x,i)=>({id:`c${i}`,cx:x*scale,x:(x-5)*scale,y:95*scale,width:10*scale,height:10*scale,string:1,stringDistance:0,parts:1,ocr:{text,confidence,agrees:true,alternatives:[]}})),measures:[{x:30*scale,y:100*scale,width:250*scale,height:100*scale,boundariesKnown:true,rhythm:[80,130,180,230].map(x=>({x:x*scale,y:250*scale,duration:'4',confidence:.98}))}]}]});
test('matching reads at different source resolutions can confirm a fret without duplicating positions',()=>{
 const a=fixture(),b=fixture(2),before=JSON.stringify(a),r=combineZoomReadings(a,b);assert.equal(summarizeAnalysis([r]).confirmed,4);assert.equal(r.staffs[0].measures[0].slots.length,4);assert.equal(JSON.stringify(a),before);assert.equal(r.staffs[0].measures[0].source.pageWidth,1200);
});
test('zoom disagreement, layout mismatch and weaker enlarged readings never overwrite confirmed notes',()=>{
 const a=fixture(1,'3',.99),b=fixture(2,'8');assert.equal(combineZoomReadings(a,b).staffs[0].measures[0].slots[0].notes[0].fret,3);
 const incomplete=fixture(2);incomplete.staffs[0].candidates.pop();assert.equal(summarizeAnalysis([combineZoomReadings(a,incomplete)]).confirmed,4);
 const wrongLayout=fixture(2);wrongLayout.staffs=[];assert.equal(combineZoomReadings(a,wrongLayout).zoom.reason,'layout-disagreement');
});
test('multiple OCR attempts never outvote a conflicting high-confidence digit',()=>{
 const r=agreeReadings([{text:'3',confidence:.97},{text:'3',confidence:.96},{text:'8',confidence:.98}]);assert.equal(r.agrees,false);
 assert.equal(agreeReadings([{text:'3',confidence:.96},{text:'3',confidence:.95}]).agrees,true);
});
