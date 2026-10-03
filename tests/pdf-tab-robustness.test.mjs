import test from 'node:test';
import assert from 'node:assert/strict';
import {groupFretComponents,fretComponents,binaryPage,detectRhythm,detectStaffs} from '../src/pdf/tab-import/geometry.js';
import {classifyFret,resolvePage} from '../src/pdf/tab-import/recognition.js';
import {combineZoomReadings} from '../src/pdf/tab-import/zoomConsensus.js';

const piece=(x,overrides={})=>({x,y:91,width:6,height:24,cx:x+3,cy:103,string:1,stringDistance:0,...overrides});
test('quantized six-line scans retain their staff while irregular grids stay rejected',()=>{
 for(const [lines,count] of [[[80,110,140,174,204,237],1],[[80,110,140,186,204,237],0]]){
  const width=1200,height=300,pixels=new Uint8Array(width*height);
  for(const y of lines)for(let x=30;x<1170;x++)pixels[y*width+x]=1;
  const found=detectStaffs(pixels,width,height);assert.equal(found.length,count);
  if(count){assert.deepEqual(found[0].lines,lines);assert.equal(found[0].spacing,31.4);}
 }
});
test('wide whitespace between narrow digits is grouped only around one actual stem',()=>{
 const a=piece(90),b=piece(107),parts=[a,b];
 const joined=groupFretComponents(parts,{spacing:30},[{x:102}]);
 assert.equal(joined.length,1);assert.equal(joined[0].parts,2);assert.equal(joined[0].width,23);
 assert.equal(a.width,6,'input geometry remains unchanged');
 for(const stems of [[],[{x:93},{x:110}],[{x:110}]])assert.equal(groupFretComponents(parts,{spacing:30},stems).length,2);
 assert.equal(groupFretComponents([a,{...b,string:2}],{spacing:30},[{x:102}]).length,2);
});
test('grouping retains the complete bounding box when the second glyph starts higher',()=>{
 const result=groupFretComponents([piece(90),piece(101,{y:89,cy:101})],{spacing:30});
 assert.equal(result.length,1);assert.equal(result[0].y,89);assert.equal(result[0].height,26);
});
test('thin serif components survive until grouping, while one-pixel stems are excluded',()=>{
 const width=180,height=250,pixels=new Uint8Array(width*height);
 for(let y=88;y<=111;y++){
  for(let x=80;x<=83;x++)pixels[y*width+x]=1;
  pixels[y*width+120]=1;
 }
 const staff={x:20,y:100,width:130,height:150,spacing:30,lines:[100,130,160,190,220,250]};
 const parts=fretComponents(pixels,width,height,staff);
 assert.equal(parts.length,1);assert.equal(parts[0].x,80);
});
test('native monospaced two-digit text is retained without relaxing raster-width checks',()=>{
 const candidate={x:90,y:91,cx:100,width:43,height:25,string:1,stringDistance:0,parts:2,ocr:{text:'24',confidence:1,agrees:true,method:'pdf-text-on-tab-line'}};
 const slot={x:100,confidence:.99},staff={spacing:31};
 assert.equal(classifyFret(candidate,slot,staff).fret,24);
 assert.equal(classifyFret({...candidate,ocr:{...candidate.ocr,method:'pdf-text-on-tab-line-cross-scale'}},slot,staff).fret,24);
 assert.notEqual(classifyFret({...candidate,ocr:{...candidate.ocr,method:'local-tesseract-character-multiscale'}},slot,staff).status,'confirmed');
});
test('one pale beam interruption is repairable, white separation remains disconnected',()=>{
 for(const gray of [185,255]){
  const width=340,height=300,rgba=new Uint8ClampedArray(width*height*4).fill(255),paint=(x,y,v)=>rgba.set([v,v,v,255],(y*width+x)*4);
  const staff={spacing:20,lines:[80,100,120,140,160,180]};
  for(let y=183;y<=230;y++)paint(100,y,0);
  for(let y=227;y<=230;y++)for(let x=100;x<=145;x++)paint(x,y,x===102?gray:0);
  const r=detectRhythm(binaryPage(rgba,width,height),width,height,staff,{x:30,width:290},[],binaryPage(rgba,width,height,145));
  assert.equal(r[0].beamCount,gray===185?1:0);
 }
});
test('zoom can recover a completely undetected page without fabricating coordinates',()=>{
 const empty={page:1,width:600,height:400,staffs:[]};
 const zoom=resolvePage({page:1,width:1200,height:800,staffs:[{id:1,x:60,y:100,width:1000,height:150,spacing:30,lines:[100,130,160,190,220,250],candidates:[],measures:[{x:60,y:100,width:1000,height:150,boundariesKnown:true,rhythm:[]}]}]});
 const result=combineZoomReadings(empty,zoom);
 assert.equal(result.zoom.reason,'staff-recovered');assert.equal(result.width,1200);assert.equal(result.staffs[0].measures[0].source.pageWidth,1200);
 assert.equal(empty.staffs.length,0);
});
test('faint connected beams are read on both sides without turning plain stems into eighths',()=>{
 for(const direction of [1,-1])for(const beams of [0,1,2]){
  const width=340,height=300,rgba=new Uint8ClampedArray(width*height*4).fill(255);
  const paint=(x,y)=>rgba.set([175,175,175,255],(y*width+x)*4);
  const staff={spacing:20,lines:[80,100,120,140,160,180]},edge=direction===1?180:80,end=edge+direction*50;
  for(let k=3;k<=50;k++)paint(100,edge+direction*k);
  for(let b=0;b<beams;b++)for(let dy=0;dy<4;dy++)for(let x=100;x<=145;x++)paint(x,end-direction*(b*12+dy));
  const r=detectRhythm(binaryPage(rgba,width,height),width,height,staff,{x:30,width:290},[],binaryPage(rgba,width,height,145));
  assert.equal(r.length,1);assert.equal(r[0].duration,['4','8','16'][beams]);
 }
});
