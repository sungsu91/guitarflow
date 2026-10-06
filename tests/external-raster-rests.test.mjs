import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyQuarterRest,classifyBlockRest} from '../src/pdf/tab-import/rasterRestShapes.js';
import {detectRhythm,discardSystemConnectorRhythm} from '../src/pdf/tab-import/geometry.js';

test('a real quarter rest crossing a TAB rule is not a two-hook sixteenth rest',()=>{
 const rows=readFileSync(new URL('./fixtures/external-score/quarter-rest.txt',import.meta.url),'utf8').trim().split(/\r?\n/);
 for(const scale of [.5,1,1.5,2]){
  const width=Math.round(rows[0].length*scale),height=Math.round(rows.length*scale),points=[];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(rows[Math.min(rows.length-1,Math.floor(y/scale))][Math.min(rows[0].length-1,Math.floor(x/scale))]==='#')points.push({x,y});
  assert.equal(classifyQuarterRest(points,width,height,61*scale),'4');
 }
});
test('existing hooked rest fonts cannot become quarter rests',()=>{
 for(const file of ['bravura-rests','ruled-hooked-rests','exported-rests']){
  const shapes=JSON.parse(readFileSync(new URL(`./fixtures/thirty-second/${file}.json`,import.meta.url)));
  for(const s of shapes)assert.equal(classifyQuarterRest(s.points,s.width,s.height,s.spacing),null);
 }
});
test('block rests need solid ink touching an interior rule, with direction retained',()=>{
 const rectangle=(w,h)=>Array.from({length:w*h},(_,i)=>({x:i%w,y:Math.floor(i/w)}));
 const lines=[100,120,140,160,180,200],ps=rectangle(16,6);
 assert.equal(classifyBlockRest(ps,16,6,20,151,lines,2),'2');
 assert.equal(classifyBlockRest(ps,16,6,20,163,lines,2),'1');
 assert.equal(classifyBlockRest(ps,16,6,20,147,lines,2),null,'floating block');
 assert.equal(classifyBlockRest(ps.slice(0,70),16,6,20,151,lines,2),null,'not solid');
 assert.equal(classifyBlockRest(rectangle(5,6),5,6,20,151,lines,2),null,'augmentation dot');
 assert.equal(classifyBlockRest(rectangle(3,18),3,18,20,143,lines,2),null,'fret 1 or stem');
});
test('a leading full-height system connector is not a ghost rhythmic onset',()=>{
 const w=600,h=400,ink=new Uint8Array(w*h),staff={x:40,lines:[120,140,160,180,200,220],spacing:20};
 for(const x of [52,110,180])for(let y=x===52?70:120;y<=270;y++)ink[y*w+x]=1;
 const measure={x:40,width:240},anchors=[{cx:110},{cx:180}];
 const found=detectRhythm(ink,w,h,staff,measure,anchors);
 const make=candidates=>({...staff,candidates,measures:[{...measure,rhythm:found}]});
 const without=make(anchors);discardSystemConnectorRhythm(ink,w,without);
 assert.deepEqual(without.measures[0].rhythm.map(s=>s.x),[110,180]);
 const withFret=make([{cx:52},...anchors]);discardSystemConnectorRhythm(ink,w,withFret);
 assert(withFret.measures[0].rhythm.some(s=>s.x===52),'a nearby fret retains a genuine first note');
});
