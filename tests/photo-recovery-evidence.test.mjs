import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptPhotoGlyphRetry,trustedGlyphReading} from '../src/pdf/tab-import/photoGlyphRetry.js';
import {cameraBarlineColumns} from '../src/pdf/tab-import/cameraBarlines.js';
import {supplementPhotoRhythm} from '../src/pdf/tab-import/zoomConsensus.js';

const reading=(text,confidence=.97,alternatives=[])=>({parts:1,ocr:{text,confidence,agrees:true,alternatives}});
test('complete photo crops never overwrite established frets or supply an unobserved digit',()=>{
 assert.equal(trustedGlyphReading(reading('0')),true);
 assert.equal(trustedGlyphReading(reading('0',.97,[{text:'23',confidence:.96}])),true,'a two-digit crop alternative cannot invalidate a confirmed single digit');
 assert.equal(acceptPhotoGlyphRetry(reading('0'),reading('9')),false);
 assert.equal(acceptPhotoGlyphRetry(reading('9',.89,[{text:'0',confidence:.91}]),reading('0')),true);
 assert.equal(acceptPhotoGlyphRetry(reading('9',.89),reading('0')),false);
 assert.equal(acceptPhotoGlyphRetry({...reading('0',.8),parts:2},reading('0')),false);
 assert.equal(acceptPhotoGlyphRetry({...reading('0',.8),ocr:{...reading('0',.8).ocr,method:'geometry-rejected'}},reading('0')),false);
 assert.equal(acceptPhotoGlyphRetry(reading('0',.8),reading('0',.98,[{text:'9',confidence:.97}])),false);
});
test('sloping camera separators need six full rules and cannot be extended note stems',()=>{
 const width=600,height=220,g=20,staff={x:30,y:50,width:540,height:100,spacing:g,thickness:1,lines:[50,70,90,110,130,150]};
 for(const drift of [-8,-5,5,8]){
  const make=(extension=false,missingRule=false)=>{
   const ink=new Uint8Array(width*height);
   for(const y of staff.lines.slice(0,missingRule?5:6))for(let x=30;x<=570;x++)ink[y*width+x]=1;
   for(let y=extension?25:50;y<=(extension?175:150);y++){const x=Math.round(300+(y-100)*drift/100);ink[y*width+x]=1;ink[y*width+x+1]=1;}
   return ink;
  };
  assert.ok(cameraBarlineColumns(make(),width,staff).some(x=>Math.abs(x-300)<=2));
  assert.deepEqual(cameraBarlineColumns(make(true),width,staff),[]);
  assert.deepEqual(cameraBarlineColumns(make(false,true),width,staff),[]);
 }
});
test('cross-scale rhythm supplements unknown columns only, with real fret anchors',()=>{
 const target={x:100,width:400,y:20,height:50,rhythm:[{x:200,duration:null},{x:300,duration:'4',confidence:.97}]},source={x:200,width:800};
 const readings=[{x:400,duration:'8',confidence:.97},{x:600,duration:'16',confidence:.97},{x:800,duration:'8',confidence:.97}];
 const candidates=[200,300].map(cx=>({cx,string:1,ocr:{text:'0',confidence:.97,agrees:true}}));
 supplementPhotoRhythm(target,source,readings,candidates,.02);
 assert.deepEqual(target.rhythm.map(r=>r.duration),['8','4']);
 assert.equal(target.rhythm.length,2,'unanchored column is not invented');
});
