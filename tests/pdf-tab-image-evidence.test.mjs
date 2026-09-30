import test from 'node:test';
import assert from 'node:assert/strict';
import {glyphFeature,corroboratePageGlyphs} from '../src/pdf/tab-import/glyphConsensus.js';
import {attachImageRests} from '../src/pdf/tab-import/imageRests.js';
import {detectRhythm} from '../src/pdf/tab-import/geometry.js';
import {resolvePage} from '../src/pdf/tab-import/recognition.js';
import {recognizeCandidates} from '../src/pdf/tab-import/localOcr.js';

const glyph=(id,x,confidence=.98)=>({id,x,cx:x,width:20,height:24,parts:1,string:1,stringDistance:0,grayscale:Uint8Array.from({length:480},(_,i)=>{const x=i%20,y=Math.floor(i/20);return x<3||x>16||y<3||y>20?0:255;}),ocr:{text:'0',agrees:true,confidence,method:'test-ocr',alternatives:[]}});
const pageFor=cs=>({page:1,width:500,height:400,staffs:[{id:1,spacing:30,lines:[50,80,110,140,170,200],x:0,y:50,height:150,width:500,candidates:cs,measures:[{x:0,y:50,width:500,height:150,boundariesKnown:true,rhythm:cs.map(c=>({x:c.cx,duration:'4',confidence:.97}))}]}]});
const corroborate=page=>{const cs=page.staffs.flatMap(s=>s.candidates);corroboratePageGlyphs(page,new Map(cs.map(c=>[c.id,glyphFeature(c)])));};

test('candidate safety limit rejects oversized geometry before allocating glyph features',async()=>{
 const candidate={get grayscale(){throw Error('must not read pixels beyond the limit');}};
 await assert.rejects(recognizeCandidates({staffs:[{candidates:Array(1801).fill(candidate)}]},null),/기호가 너무 많습니다/);
});

test('two independent same-page glyph examples corroborate weak OCR without adding positions',()=>{
 const p=pageFor([glyph('a',100),glyph('b',200),glyph('weak',300,.9)]);corroborate(p);
 assert.equal(p.staffs[0].candidates[2].ocr.confidence,.95);assert.deepEqual(p.staffs[0].candidates[2].ocr.glyphEvidence.examples,['a','b']);
 assert.equal(resolvePage(p).staffs[0].measures[0].slots.length,3);
});
test('one seed, wrong shape, off-column digits and conflicting OCR cannot train or corroborate a glyph',()=>{
 const one=pageFor([glyph('a',100),glyph('weak',200,.9),glyph('weak2',300,.9)]);corroborate(one);assert.equal(one.staffs[0].candidates[1].ocr.confidence,.9);assert.equal(one.staffs[0].candidates[2].ocr.confidence,.9);
 for(const change of [c=>c.ocr.alternatives=[{text:'8',confidence:.9}],c=>c.ocr.shapeRejected='rest-like-seven',c=>c.grayscale.fill(255),c=>c.parts=2,c=>c.stringDistance=.3]){
  const p=pageFor([glyph('a',100),glyph('b',200),glyph('weak',300,.9)]);change(p.staffs[0].candidates[2]);corroborate(p);assert.equal(p.staffs[0].candidates[2].ocr.confidence,.9);
 }
 const off=pageFor([glyph('a',100),glyph('b',200),glyph('weak',300,.9)]);off.staffs[0].measures[0].rhythm.pop();corroborate(off);assert.equal(off.staffs[0].candidates[2].ocr.confidence,.9);
 const competing=pageFor([glyph('a',100),glyph('b',200),glyph('eight',250),glyph('weak',300,.9)]);competing.staffs[0].candidates[2].ocr.text='8';corroborate(competing);assert.equal(competing.staffs[0].candidates[3].ocr.confidence,.9);
});

const restFixture=(shift=0)=>{
 const width=400,height=340,ink=new Uint8Array(width*height),staff={x:20,y:50,width:350,height:200,spacing:40,thickness:2,lines:[50,90,130,170,210,250],candidates:[],measures:[{x:20,width:350,rhythm:[]}]};
 for(let y=136;y<=164;y++)for(let x=98;x<=125;x++)if(y<=141&&x<=122||y>141&&Math.abs(x-(121-(y-141)/3))<=2)ink[(y+shift)*width+x]=1;
 return {width,height,ink,staff};
};
test('image eighth rest between strings is retained as silence, while the same mark on a string is not a rest',()=>{
 const f=restFixture();attachImageRests(f.ink,f.width,f.height,f.staff);assert.equal(f.staff.measures[0].rhythm.length,1);assert.equal(f.staff.measures[0].rhythm[0].duration,'8');assert.equal(f.staff.measures[0].rhythm[0].rest,true);
 const onString=restFixture(-20);attachImageRests(onString.ink,onString.width,onString.height,onString.staff);assert.equal(onString.staff.measures[0].rhythm.length,0);
});
test('a note column, stacked fret, or native-text staff cannot be reclassified as an image rest',()=>{
 for(const change of [s=>s.measures[0].rhythm.push({x:112,duration:'4'}),s=>s.candidates.push({cx:112,cy:90,stringDistance:0}),s=>s.nativeText=true]){
  const f=restFixture();change(f.staff);attachImageRests(f.ink,f.width,f.height,f.staff);assert.equal(f.staff.measures[0].rhythm.filter(r=>r.rest).length,0);
 }
});
test('rest fragments cannot reappear as fret digits or duplicate source columns',()=>{
 const p=pageFor([glyph('rest-fragment',100)]);p.staffs[0].candidates[0].restSymbol=true;p.staffs[0].measures[0].rhythm[0].rest=true;
 const m=resolvePage(p).staffs[0].measures[0];assert.equal(m.slots.length,1);assert.equal(m.slots[0].notes.length,0);assert.equal(m.slots[0].rejections.length,0);
});
test('compact TAB hooks count as eighth flags while unmarked stems remain quarters',()=>{
 const width=350,height=320,ink=new Uint8Array(width*height),staff={spacing:25,lines:[50,75,100,125,150,175]};
 for(const x of [100,220])for(let y=180;y<=235;y++)ink[y*width+x]=1;
 for(let x=101;x<=113;x++)for(let dy=0;dy<3;dy++)ink[(235-Math.floor((x-101)/6)-dy)*width+x]=1;
 assert.deepEqual(detectRhythm(ink,width,height,staff,{x:30,width:290}).map(r=>r.duration),['8','4']);
});

test('a tiny separated flag edge cannot turn a normal eighth flag into a sixteenth',()=>{
 const width=350,height=320,ink=new Uint8Array(width*height),staff={spacing:20,lines:[50,70,90,110,130,150]};
 for(let y=154;y<=200;y++)ink[y*width+100]=1;
 for(let y=189;y<=196;y++)for(let x=106;x<=114;x++)ink[y*width+x]=1;
 for(let y=175;y<=176;y++)for(let x=106;x<=110;x++)ink[y*width+x]=1;
 assert.equal(detectRhythm(ink,width,height,staff,{x:30,width:290})[0].duration,'8');
});
