import test from 'node:test';
import assert from 'node:assert/strict';
import {detectTabStaffs,detectRhythm,groupFretComponents} from '../src/pdf/tab-import/geometry.js';
import {attachNativeTabSymbols} from '../src/pdf/tab-import/tabSymbols.js';
import {straightScanTrack,rectifyStraightScan} from '../src/pdf/tab-import/cameraPhotoGeometry.js';

test('short ending systems and partial annotations retain all six-line systems in order',()=>{
 const width=1200,height=850,ink=new Uint8Array(width*height);
 const line=(left,right,y)=>{for(let x=left;x<right;x++)ink[y*width+x]=1;};
 for(const [top,right] of [[80,1160],[330,1160],[580,500]])for(let s=0;s<6;s++)line(40,right,top+s*20);
 line(40,780,310);
 const result=detectTabStaffs(ink,width,height);
 assert.deepEqual(result.map(s=>[s.id,s.y,s.width]),[[1,80,1119],[2,330,1119],[3,580,459]]);
});

test('recovery still rejects seven/eight-line grids and tiny chord diagrams',()=>{
 for(const [count,right] of [[7,1160],[8,1160],[6,240]]){
  const width=1200,height=400,ink=new Uint8Array(width*height);
  for(let s=0;s<count;s++)for(let x=40;x<right;x++)ink[(80+s*20)*width+x]=1;
  assert.equal(detectTabStaffs(ink,width,height).length,0,`${count} lines / width ${right-40}`);
 }
});

test('a separate augmentation dot above the stem end restores dotted quarters without erasing hooks',()=>{
 for(const connected of [false,true]){
  const width=250,ink=new Uint8Array(width*280),g=30,r={x:90,y:240,direction:1,duration:'8',beamCount:0,beamYs:[]};
  for(let y=240-14;y<=240-6;y++)for(let x=100;x<=107;x++)ink[y*width+x]=1;
  if(connected)for(let x=90;x<=103;x++)ink[232*width+x]=1;
  const staff={nativeText:false,spacing:g,thickness:1,lines:[30,60,90,120,150,180],candidates:[{cx:90,stringDistance:0}],measures:[{x:20,width:210,rhythm:[r]}]};
  attachNativeTabSymbols(ink,width,staff);
  assert.equal(r.duration,connected?'8':'4');assert.equal(!!r.dotted,!connected);
 }
});

test('wide zero beside a narrow one groups as one fret only with a common stem',()=>{
 const parts=[{x:100,y:80,width:10,height:26,cx:105,cy:93,string:6},{x:122,y:80,width:20,height:26,cx:132,cy:93,string:6}];
 assert.equal(groupFretComponents(parts,{spacing:32},[{x:121}]).length,1);
 assert.equal(groupFretComponents(parts,{spacing:32},[{x:105},{x:132}]).length,2);
 assert.equal(groupFretComponents(parts,{spacing:32},[]).length,2);
});

test('two connected short beam strokes identify an isolated sixteenth, without inferring a second beam',()=>{
 for(const count of [0,1,2]){
  const width=240,height=260,ink=new Uint8Array(width*height),staff={spacing:20,lines:[40,60,80,100,120,140]};
  for(let y=143;y<=194;y++)for(let x=79;x<=81;x++)ink[y*width+x]=1;
  for(let j=0;j<count;j++)for(let y=192-j*11;y<=194-j*11;y++)for(let x=80;x<=94;x++)ink[y*width+x]=1;
  const rhythms=detectRhythm(ink,width,height,staff,{x:20,width:180},[{cx:80}]);
  assert.equal(rhythms.length,1);assert.equal(rhythms[0].duration,['4','8','16'][count]);
 }
});

test('scan deskew requires a long consistent grid and rotates barlines with the rules',()=>{
 const width=1000,height=500,spacing=20,slope=.025;
 const points=Array.from({length:20},(_,i)=>({x:50+i*45,center:200+slope*(50+i*45),spacing}));
 const track=straightScanTrack([{points,center:210,spacing}],width,height);assert(track);
 for(const ps of [points.slice(0,5),points.map((p,i)=>({...p,center:p.center+(i%2?10:0)})),points.map(p=>({...p,center:200}))])assert.equal(straightScanTrack([{points:ps,center:210,spacing}],width,height),null);
 const source=new Uint8ClampedArray(width*height*4).fill(255),angle=Math.atan(slope),cx=width/2,cy=height/2;
 // Independently draw an inclined staff and bar in source coordinates.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const tx=cx+Math.cos(angle)*(x-cx)+Math.sin(angle)*(y-cy),ty=cy-Math.sin(angle)*(x-cx)+Math.cos(angle)*(y-cy);
  if(tx>=70&&tx<=920&&Array.from({length:6},(_,i)=>100+i*spacing).some(row=>Math.abs(ty-row)<1.4)||Math.abs(tx-600)<1.4&&ty>=100&&ty<=200)source.set([0,0,0,255],(y*width+x)*4);
 }
 const result=rectifyStraightScan(source,width,height,track);
 let support=0;for(let y=102;y<=198;y++)if(result.rgba[(y*width+600)*4]<145)support++;
 assert(support>=94,'deskew must preserve a continuous vertical barline');
 assert(Math.abs(result.angle-angle)<1e-9);
});
