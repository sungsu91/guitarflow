import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseStaffTokens,staffSystemToAnalysis} from '../src/omr/staffTokens.js';
import {cropStaffMeasure,anchorStaffMeasure,selectStaffMeasureReading,refineStaffMeasures} from '../src/omr/staffMeasureRecognition.js';
import {analysisToDocument,reconcileImportedEdits} from '../src/pdf/tab-import/scoreAdapter.js';
import {attachPageChords} from '../src/pdf/tab-import/chordRecognition.js';
import {compileDocumentV2,ticksOf} from '../src/etudes/scoreModel.js';
import {staffMeasureInk} from '../src/omr/staffMeasureInk.js';
import {notationBarBounds} from '../src/pdf/tab-import/chordGeometry.js';
import {chordWordsInRegion} from '../src/pdf/tab-import/chordRecognition.js';
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/staff-measure-readings.json',import.meta.url)));
const parse=raw=>parseStaffTokens('clef-G2+keySignature-CM+'+raw);

const expected=[
 ['C5 F5 A5:4','E5 G5:8','D5 F5:8','C4 C5 E5:4','E5:16','D5:16','C5:8'],
 ['/:4','/:4','/:2'],
 ['G3 G4 B4:4','A4 C5:4','C4 G4 C5:4','/:8','G3:16','A3:16'],
 ['C5:4','/:8','/:8','/:4','rest:8.','E4:16'],
 ['C5 F5 A5:4','E5 G5:8','D5 F5:8','C4 C5 E5:4','rest:8.','E4:16'],
 ['C5:4','/:8','/:8','/:4','E5:16','D5:16','C5:8'],
 ['C5:4','/:8','/:8','/:4','E5:16','D5:16','C5:8'],
 ['C5 F5 A5:4','E5 G5:8','D5 F5:8','C4 C5 E5:4','B4 D5:8','A4 C5:8'],
 ['C5 F5 A5:4','E5 G5:8','D5 F5:8','C4 C5 E5:4','rest:8.','G4:16'],
 ['C5 F5 A5:4','E5 G5:8','D5 F5:8','C4 C5 E5:4','rest:8.','E4:16'],
 ['C4:8','C4:8','D4:16','E4:16','D4:16','C4:8','D4:8','D4:8','G3:16','A3:16','C4:16','D4:16'],
 ['D4:16','E4:16','D4:16','C4:8','A4:8','G4:16','E5:16','E5:16','D5:16','C5:16','D5:16','A4:8','G4:8'],
 ['C5 F5 A5:4','E5 G5:8','D5 F5:8','C4 C5 E5:4','E5:16','D5:16','C5:8'],
 ['/:4','/:8','/:8','/:4','/:8','/:8'],
];
for(const [i,f] of fixtures.entries())test(`source-checked chord/slash phrase ${f.page}/${f.staff}/${f.bar}`,()=>{
 const original=parseStaffTokens(f.original).measures[f.bar-1];
 const chosen=selectStaffMeasureReading(original,f.readings.map(r=>parseStaffTokens(r)),f.ink);
 assert(chosen);assert.equal(chosen.events.reduce((s,e)=>s+ticksOf(e),0),1920);
 assert.deepEqual(chosen.events.map(e=>(e.rhythmSlash?'/':e.rest?'rest':e.notes.map(n=>n.spelling.letter+n.spelling.octave).join(' '))+':'+e.duration+(e.dotted?'.':'')),expected[i]);
 if(f.ink.triplets?.length){assert.equal(chosen.events.filter(e=>e.tuplet).length,3);assert(chosen.events.some(e=>e.notes.some(n=>n.midi===63&&n.spelling.alter===-1)));}
});

test('a missing printed triplet mark cannot be supplied merely to make the bar fit',()=>{
 const f=fixtures.find(f=>f.page===2&&f.staff===2);
 const chosen=selectStaffMeasureReading(parseStaffTokens(f.original).measures[0],f.readings.map(r=>parseStaffTokens(r)),{...f.ink,triplets:[]});
 assert.equal(chosen,null);
});

test('editing a confirmed slash grip restores pitched notation; duration-only changes preserve the slash',()=>{
 const before={pdfTabImport:{},measures:[{events:[{id:'slash',rhythmSlash:true,rest:false,duration:'4',notes:[{string:1,fret:3},{string:2,fret:0}],pdfImport:{status:'confirmed'}}]}]};
 const after=structuredClone(before);after.measures[0].events[0].notes[0].fret=5;
 assert.equal(reconcileImportedEdits(before,after).measures[0].events[0].rhythmSlash,undefined);
 const rhythm=structuredClone(before);rhythm.measures[0].events[0].duration='8';
 assert.equal(reconcileImportedEdits(before,rhythm).measures[0].events[0].rhythmSlash,true);
});

test('normal noteheads cannot become slashes without pixel evidence or with mismatched stem counts',()=>{
 const bar=parse('note-G4_quarter+note-F4_quarter+note-C4_half').measures[0],ink=fixtures[1].ink;
 const plain=anchorStaffMeasure(bar,{...ink,slashes:[]});assert(plain.events.every(e=>!e.rhythmSlash));
 assert.equal(anchorStaffMeasure(bar,{...ink,stems:ink.stems.slice(1)}),bar);
 const fake=parse('nonote_quarter+note-G4_half');assert(fake.measures[0].events[0].unread);
});

const engraving=()=>{
 const width=600,height=200,ink=new Uint8Array(width*height),staff={x:20,y:70,width:560,height:64,spacing:16,thickness:1,lines:[70,86,102,118,134]};
 const rect=(x,y,w,h)=>{for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)ink[row*width+col]=1;};
 for(const y of staff.lines)rect(20,y,560,1);
 return {width,height,ink,staff,rect};
};
test('pixel detector distinguishes a rhythmic slash from oval heads, staff rules and ordinary beams',()=>{
 const {ink,width,height,staff,rect}=engraving();
 rect(180,50,2,54);
 for(let y=102;y<134;y++)rect(Math.round(180-(y-102)*.65)-6,y,10,1);
 for(const x of [280,340]){
  rect(x,50,2,63);
  for(let dy=-6;dy<=6;dy++)for(let dx=-10;dx<=10;dx++)if((dx/10)**2+(dy/6)**2<1)rect(x-8+dx,111+dy,1,1);
 }
 rect(280,50,62,4);
 const found=staffMeasureInk(ink,width,height,staff,{x:20,width:560});
 assert.equal(found.slashes.length,1);assert(Math.abs(found.slashes[0].x-180)<3);assert.equal(found.slashes[0].duration,'4');
});
test('bar boundaries retain a tie crossing and thick repeat strokes without inventing a clef-only bar',()=>{
 const {ink,width,staff,rect}=engraving();
 rect(92,70,2,65);rect(280,70,1,65);rect(450,70,5,65);rect(463,70,2,65);rect(578,70,2,65);
 // Thin tie tangent just above the top rule crosses the real middle bar.
 rect(255,68,52,3);
 const bars=notationBarBounds(ink,width,staff);
 assert.equal(bars.length,3);assert.equal(bars[0].x,93);assert.equal(bars[0].width,187);
});
test('OCR lowercase chord roots are accepted only in a chord-sized, spatially eligible band',()=>{
 const region={x:0,y:0,width:500,staffY:100,spacing:16};
 const words=chordWordsInRegion([{text:'c',x:40,y:20,width:25,height:30,confidence:.9},{text:'am',x:80,y:20,width:35,height:30,confidence:.9},{text:'c',x:120,y:110,width:25,height:30,confidence:.9}],region);
 assert.deepEqual(words.map(w=>w.name),['C','Am']);
});

test('disagreeing pitches, unsupported rhythm, wrong clef/key/count keep the original reading',()=>{
 const bar=parse('note-C4_half').measures[0],ink={stems:[{x:20,heads:[]}],slashes:[]};
 for(const readings of [[parse('note-C4_whole'),parse('note-D4_whole')],[parse('note-C4_half'),parse('note-C4_half')],[parse('note-C4_whole'),parse('note-C4_whole+barline+note-C4_whole')],[parse('note-C4_whole'),parseStaffTokens('clef-F4+note-C4_whole')],[parse('note-C4_whole'),parseStaffTokens('clef-G2+keySignature-GM+note-C4_whole')]])assert.equal(selectStaffMeasureReading(bar,readings,ink),null);
});

test('measure crop retains source pixels, extra lower stems, clef context, and never consumes its input',()=>{
 const rgba=new Uint8ClampedArray(20*8*4).fill(77),extension=new Uint8ClampedArray(20*2*4).fill(55);
 const s={rgba:rgba.buffer,extension:extension.buffer,extensionHeight:2,width:20,height:8,rect:{x:0,y:0},staff:{spacing:1},measures:[{x:0,width:10},{x:10,width:10}]};
 const crop=cropStaffMeasure(s,1,2),pixels=new Uint8ClampedArray(crop.rgba);
 assert.equal(crop.width,20);assert.equal(crop.height,14);
 assert.equal(pixels[((2+8)*20+2)*4],55);assert.equal(pixels[(2*20+2)*4],77);assert.equal(pixels[0],255);assert.equal(s.rgba.byteLength,640);
});

test('bounded retries can be cancelled without continuing through more bars',async()=>{
 const f=fixtures[1],parsed=parseStaffTokens(f.original),bar=parsed.measures[f.bar-1],controller=new AbortController();let calls=0;
 const s={width:1000,height:100,rgba:new Uint8ClampedArray(400000).buffer,staff:{spacing:10},rect:{x:0,y:0},measures:[{...f.ink,x:0,width:900}]};
 await assert.rejects(refineStaffMeasures({recognize:async()=>{calls++;controller.abort();return {text:f.readings[0]};}},s,{...parsed,measures:[bar]},{signal:controller.signal}),{name:'AbortError'});assert.equal(calls,1);
});

test('rhythmic slashes use the active imported chord at its actual note position and survive compilation',()=>{
 const f=fixtures[1],bar=selectStaffMeasureReading(parseStaffTokens(f.original).measures[0],f.readings.map(r=>parseStaffTokens(r)),f.ink);
 const system={id:1,rect:{x:0,y:0,width:1000,height:100},staff:{id:1,spacing:16}};
 const staff=staffSystemToAnalysis({...parse('note-C4_whole'),measures:[bar,bar]},{system,page:1,width:1000,height:100}).staff;
 const page={page:1,notation:true,staffs:[staff]};
 attachPageChords(page,[{staff:1,spacing:16,measures:[{x:0,width:700},{x:700,width:700}],words:bar.events.map((e,i)=>({x:e.x-5,name:['G','F','C'][i],width:15}))}]);
 const doc=analysisToDocument({fileName:'source.jpg',pages:[page],summary:{}});
 assert.deepEqual(doc.measures[0].harmonyChanges.map(c=>[c.name,c.onset,c.needsReview]),[['G',0,false],['F',480,false],['C',960,false]]);
 assert(doc.measures[0].events.every(e=>e.rhythmSlash&&!e.blank&&e.notes.length>=4));
 assert.deepEqual(doc.measures[1].events.map(e=>e.notes[0].source.chord),['C','C','C']);
 const compiled=compileDocumentV2(doc);assert.deepEqual(compiled.errors,[]);
 const unknown=analysisToDocument({fileName:'missing.jpg',pages:[{...page,staffs:[{...staff,measures:staff.measures.map(({harmony,harmonyChanges,...m})=>m)}]}],summary:{}});
 assert(unknown.measures[0].events.every(e=>e.blank));
});
