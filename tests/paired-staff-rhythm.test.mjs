import test from 'node:test';
import assert from 'node:assert/strict';
import {attachPairedStaffRhythm,pairedStemDuration} from '../src/pdf/tab-import/pairedStaffRhythm.js';
import {resolvePage} from '../src/pdf/tab-import/recognition.js';
import {detectStaffs} from '../src/pdf/tab-import/geometry.js';
import {staffMeasureInk} from '../src/omr/staffMeasureInk.js';

// Independent binary engraving: filled oval heads, ruled staff and beams.
function drawing(beams=1){
 const width=800,height=420,ink=new Uint8Array(width*height),g=20,upper={id:1,x:50,y:90,width:700,height:80,spacing:g,thickness:1,lines:[90,110,130,150,170]};
 const dot=(x,y)=>{if(x>=0&&x<width&&y>=0&&y<height)ink[Math.round(y)*width+Math.round(x)]=1;};
 for(const y of upper.lines)for(let x=50;x<=750;x++)dot(x,y);
 for(const x of [50,750])for(let y=90;y<=170;y++)dot(x,y);
 const xs=[170,240,310,380,450,520,590,660];
 for(const x of xs){
  for(let dy=-7;dy<=7;dy++)for(let dx=-10;dx<=10;dx++)if(dx*dx/100+dy*dy/49<=1)dot(x+dx,150+dy);
  for(let y=75;y<=150;y++)for(let dx=8;dx<=9;dx++)dot(x+dx,y);
 }
 for(let b=0;b<beams;b++)for(let x=178;x<=669;x++)for(let dy=0;dy<4;dy++)dot(x,75+b*11+dy);
 const tab={id:1,x:50,y:280,width:700,height:100,spacing:20,lines:[280,300,320,340,360,380],candidates:xs.map((cx,i)=>({id:String(i),cx,string:1,stringDistance:0})),measures:[{x:50,y:280,width:700,height:100,rhythm:[],boundariesKnown:true}]};
 return {width,height,ink,upper,tab};
}
test('aligned staff beams give a stemless TAB its measured eighth-note rhythm',()=>{
 const {ink,width,height,tab}=drawing();attachPairedStaffRhythm(ink,ink,width,height,[tab]);
 assert.equal(tab.measures[0].rhythm.length,8);
 assert.ok(tab.measures[0].rhythm.every(r=>r.duration==='8'));
});
test('existing TAB rhythm and mismatched bar edges are never replaced',()=>{
 const {ink,width,height,tab}=drawing();tab.measures[0].rhythm=[{x:170,duration:'4',confidence:.97}];
 attachPairedStaffRhythm(ink,ink,width,height,[tab]);assert.equal(tab.measures[0].rhythm.length,1);
 tab.measures[0].rhythm=[];tab.measures[0].width-=100;
 attachPairedStaffRhythm(ink,ink,width,height,[tab]);assert.equal(tab.measures[0].rhythm.length,0);
});
test('beam count supports 8/16/32 without manufacturing capacity',()=>{
 for(const [n,duration]of [[1,'8'],[2,'16'],[3,'32']]){
  const {ink,width,height,upper,tab}=drawing(n),stem={x:178,top:75,bottom:150,heads:[{step:2}]};
  assert.equal(pairedStemDuration(ink,width,height,upper,stem),duration);
  attachPairedStaffRhythm(ink,ink,width,height,[tab]);
  if(n>1)assert.equal(tab.measures[0].rhythm.length,0,JSON.stringify({n,staffs:detectStaffs(ink,width,height,undefined,5),stems:staffMeasureInk(ink,width,height,upper,{x:50,width:700},{first:true}).stems}));
 }
});
test('4/4 pairing cannot override the imported 3/4 time signature',()=>{
 const {tab}=drawing();tab.candidates=[];tab.measures[0].pairedRhythm={meter:[4,4]};tab.measures[0].rhythm=[{x:170,duration:'1',confidence:.97}];
 const r=resolvePage({page:1,width:800,height:420,meter:[3,4],staffs:[tab]});
 assert.equal(r.staffs[0].measures[0].slots.length,0);
});

test('a complete independent bar can mix quarters, eighths, sixteenths and 32nds',()=>{
 const width=1000,height=460,ink=new Uint8Array(width*height),lines=[130,150,170,190,210];
 const dot=(x,y)=>{ink[y*width+x]=1;};
 for(const y of lines)for(let x=50;x<=950;x++)dot(x,y);
 for(const x of [50,950])for(let y=130;y<=210;y++)dot(x,y);
 const groups=[{duration:'4',count:1,beams:0},{duration:'8',count:2,beams:1},{duration:'16',count:4,beams:2},{duration:'32',count:8,beams:3}],xs=[],expected=[];
 for(const group of groups){
  const start=xs.length;
  for(let i=0;i<group.count;i++){
   const x=170+xs.length*48;xs.push(x);expected.push(group.duration);
   for(let dy=-7;dy<=7;dy++)for(let dx=-10;dx<=10;dx++)if(dx*dx/100+dy*dy/49<=1)dot(x+dx,130+dy);
   for(let y=60;y<=130;y++)for(let dx=8;dx<=9;dx++)dot(x+dx,y);
  }
  for(let b=0;b<group.beams;b++)for(let x=xs[start]+8;x<=xs.at(-1)+9;x++)for(let dy=0;dy<4;dy++)dot(x,60+b*11+dy);
 }
 const tab={id:1,x:50,y:320,width:900,height:100,spacing:20,lines:[320,340,360,380,400,420],candidates:xs.map((cx,i)=>({id:String(i),cx,string:1,stringDistance:0})),measures:[{x:50,y:320,width:900,height:100,rhythm:[],boundariesKnown:true}]};
 attachPairedStaffRhythm(ink,ink,width,height,[tab]);
 assert.deepEqual(tab.measures[0].rhythm.map(r=>r.duration),expected);
});
