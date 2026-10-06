import test from 'node:test';
import assert from 'node:assert/strict';
import {measureRecognitionDiagnostics} from '../src/pdf/tab-import/recognitionDiagnostics.js';
import {normalizeGlyphPixels} from '../src/pdf/tab-import/glyphPreprocessing.js';
import {hasNarrowOneShape} from '../src/pdf/tab-import/glyphValidation.js';
import {classifyFret} from '../src/pdf/tab-import/recognition.js';

test('a narrow serif one needs a head and foot, not a uniform vertical stroke',()=>{
 const serif=[4,6,6,5,4,4,4,4,4,4,4,4,6,8,7];
 assert(hasNarrowOneShape(serif,31,24));
 assert(!hasNarrowOneShape(Array(20).fill(3),31,24));
 assert(!hasNarrowOneShape([8,8,...Array(18).fill(3)],31,24));
 assert(!hasNarrowOneShape(serif,31,8));
 const c={id:'narrow',narrowOneCandidate:true,string:4,stringDistance:0,cx:100,width:8,parts:1,ocr:{text:'1',confidence:.99,agrees:true}};
 assert.equal(classifyFret(c,{x:100,confidence:.99},{spacing:31}).status,'confirmed');
 assert.equal(classifyFret({...c,ocr:{...c.ocr,text:'7'}},{x:100,confidence:.99},{spacing:31}).status,'rejected');
});

test('diagnostics distinguish undetected, unread, uncertain and unaligned glyphs without guessing a note',()=>{
 const n=(id,reading='0')=>({candidateId:id,reading,status:'rejected',reasons:[]});
 const slots=[{notes:[],rejections:[],rest:false},{notes:[],rejections:[],rest:true},
  {notes:[n('weak')],rejections:[n('empty',''),n('conflict'),n('geometry')]},
  {notes:[{...n('ok'),status:'confirmed'}],rejections:[]}];
 const cs=[{id:'weak',ocr:{text:'0',agrees:true,confidence:.8}},{id:'conflict',ocr:{text:'0',agrees:false}},
  {id:'geometry',ocr:{method:'geometry-rejected'}}];
 const before=structuredClone(slots),issues=measureRecognitionDiagnostics(slots,[n('orphan')],cs);
 assert.deepEqual(issues.map(i=>i.stage),['candidate-not-found','low-confidence','glyph-unread','ocr-disagreement','geometry-rejected','slot-alignment']);
 assert.deepEqual(slots,before);
});

test('stroke retry retains a hollow zero and treats light background as white',()=>{
 const width=48,height=64,data=new Uint8ClampedArray(width*height*4).fill(235);
 for(let y=10;y<54;y++)for(let x=8;x<40;x++)if(x<14||x>=34||y<16||y>=48){const p=(y*width+x)*4;data[p]=data[p+1]=data[p+2]=40;}
 for(const stroke of [-1,1]){
  const result=normalizeGlyphPixels({data:data.slice(),width,height},{stroke});
  assert.equal(result.data[(32*width+24)*4],255);assert.equal(result.data[(32*width+10)*4],0);assert.equal(result.data[0],255);
 }
});
