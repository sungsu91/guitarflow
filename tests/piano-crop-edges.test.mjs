import test from 'node:test';
import assert from 'node:assert/strict';
import {pianoCropEdges} from '../src/omr/pianoCropEvidence.js';
import {cropPianoMeasure,pianoHeaderWidth,recognizePianoStaff} from '../src/omr/pianoStaffRecognition.js';
import {parsePianoTokens} from '../src/omr/pianoPolyphony.js';
import {pianoPrintedHeadPositions} from '../src/omr/pianoTieEvidence.js';
import {readFileSync} from 'node:fs';

function fixture(){
 const width=440,height=240,top=50,below=70,rgba=new Uint8ClampedArray(width*height*4).fill(255),extension=new Uint8ClampedArray(width*below*4).fill(255),pianoTop=new Uint8ClampedArray(width*top*4).fill(255);
 const system={id:2,width,height,rect:{x:0,y:50},staff:{x:0,y:130,height:80,spacing:20,thickness:1,lines:[130,150,170,190,210]},rgba:rgba.buffer,extension:extension.buffer,extensionHeight:below,pianoTop:pianoTop.buffer,pianoTopHeight:top,pianoExtendedCrop:true,measures:[{x:0,width:200,stems:[]},{x:200,width:240,stems:[]}]};
 const dot=(x,y)=>{const data=y<0?pianoTop:y<height?rgba:extension,yy=y<0?y+top:y<height?y:y-height;data.set([0,0,0,255],(yy*width+x)*4);};
 return {system,dot};
}
test('only a continuous note stem crossing a crop edge authorizes expansion',()=>{
 const {system,dot}=fixture();assert.deepEqual(pianoCropEdges(system,1),{top:false,bottom:false});
 for(let y=4;y<=32;y++)dot(270,y);assert.deepEqual(pianoCropEdges(system,1),{top:true,bottom:false});
 for(let y=218;y<=249;y++)dot(330,y);assert.deepEqual(pianoCropEdges(system,1),{top:true,bottom:true});
 const short=fixture();for(let x=260;x<=280;x++)short.dot(x,10);assert.deepEqual(pianoCropEdges(short.system,1),{top:false,bottom:false},'a horizontal text stroke is insufficient');
});
test('ordinary piano crops stay byte-identical when extra source pixels are available',()=>{
 const {system,dot}=fixture();for(let y=-35;y<290;y++){dot(270,y);dot(100,y);}
 const original={...system,extension:system.extension.slice(0),pianoTop:undefined,pianoTopHeight:0};
 for(const index of [0,1])for(const header of [null,130]){
  const a=cropPianoMeasure(original,index,.5,header),b=cropPianoMeasure(system,index,.5,header);
  assert.deepEqual(b,a);
  const c=cropPianoMeasure(system,index,.5,header,{extended:'both'});
  assert(c.height>b.height);assert(new Uint8Array(c.rgba).some(v=>v===0));
 }
});
test('an uncut unsupported bar stops after the original three reads',async()=>{
 const {system}=fixture();system.measures=system.measures.slice(0,1);let calls=0;
 await assert.rejects(recognizePianoStaff({recognize:async()=>{calls++;return {text:'clef-G2+rest-half+barline'};}},system,{key:'C',meter:[4,4]},'clef-G2'),/부분 결과/);
 assert.equal(calls,3);
});
test('cancel before an expanded retry does not start more model work',async()=>{
 const {system,dot}=fixture();system.measures=system.measures.slice(1);for(let y=4;y<=32;y++)dot(270,y);let calls=0;const controller=new AbortController();
 await assert.rejects(recognizePianoStaff({recognize:async()=>{if(++calls===3)controller.abort();return {text:'clef-G2+rest-half+barline'};}},system,{key:'C',meter:[4,4]},'clef-G2',{signal:controller.signal}),{name:'AbortError'});
 assert.equal(calls,3);
});
test('a visibly clipped bar gets at most three extended reads and still requires two exact agreements',async()=>{
 const {system,dot}=fixture();system.measures=[{x:0,width:440,stems:[]}];for(let y=4;y<=32;y++)dot(270,y);
 let calls=0;
 const parsed=await recognizePianoStaff({recognize:async()=>({text:`clef-G2+note-${++calls===5?'D':'C'}4_${calls<=3?'half':'whole'}+barline`})},system,{key:'C',meter:[4,4]},'clef-G2');
 assert.equal(calls,6);assert.equal(parsed.pianoMeasureRetry[0].extendedRaw.length,3);assert.equal(parsed.measures[0].events[0].notes[0].midi,60);
 calls=0;
 await assert.rejects(recognizePianoStaff({recognize:async()=>({text:`clef-G2+note-${'CDEFGA'[++calls-1]}4_${calls<=3?'half':'whole'}+barline`})},system,{key:'C',meter:[4,4]},'clef-G2'),/부분 결과/);
 assert.equal(calls,6);
});
test('a later ambiguous head does not cut a clearly located first attack header in half',()=>{
 const {system,dot}=fixture();system.measures=[{x:0,width:440,stems:[]}];
 const oval=(x,y)=>{for(let dy=-7;dy<=7;dy++)for(let dx=-11;dx<=11;dx++)if((dx/11)**2+(dy/7)**2<=1)dot(x+dx,y+dy);};
 oval(220,110);
 const parsed=parsePianoTokens('clef-G2+note-C5_quarter+note-D5_half.+barline');
 const width=pianoHeaderWidth(system,parsed);assert(width>180&&width<210);
 oval(170,100);
 const earlier=parsePianoTokens('clef-G2+note-C5_half+note-D5_quarter+note-C5_quarter+barline');
 assert.equal(pianoHeaderWidth(system,earlier),null,'ambiguous or earlier note ink cannot enter a guessed header');
});
test('failed hollow-head header location uses measured staff span without changing the original note/tie path',()=>{
 const sample=JSON.parse(readFileSync(new URL('./fixtures/piano-hollow-head-span.json',import.meta.url),'utf8'));
 const width=440,height=180,rgba=new Uint8ClampedArray(width*height*4).fill(255),lines=[60,77,94,112,129];
 const dot=(x,y)=>rgba.set([0,0,0,255],(y*width+x)*4);
 for(const line of lines)for(let y=line-1;y<=line+1;y++)for(let x=0;x<width;x++)dot(x,y);
 sample.rows.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='1')dot(x+sample.x,y+sample.y);}));
 const system={width,height,rgba:rgba.buffer,rect:{x:0,y:0},staff:{x:0,y:60,height:69,spacing:17,lines,thickness:3},measures:[{x:0,width:440,stems:[]}]};
 const parsed=parsePianoTokens('clef-G2+note-D5_whole|note-G5_whole+barline');
 assert.equal(pianoPrintedHeadPositions(system,parsed.measures[0],0,parsed.clef),null);
 assert.equal(pianoHeaderWidth(system,parsed),202);
 assert.equal(system.staff.spacing,17,'original note and tie geometry is untouched');
 assert.equal(pianoHeaderWidth({...system,rgba:new Uint8ClampedArray(width*height*4).fill(255).buffer},parsed),null,'no fallback without visible heads');
});
test('two aligned companion heads bound a ledger chord header; a missing in-staff head cannot',()=>{
 const sample=JSON.parse(readFileSync(new URL('./fixtures/piano-ledger-header.json',import.meta.url),'utf8'));
 const width=440,height=180,rgba=new Uint8ClampedArray(width*height*4).fill(255),lines=[60,77,95,112,129];
 const dot=(x,y)=>rgba.set([0,0,0,255],(y*width+x)*4);
 for(const line of lines)for(let y=line-1;y<=line+1;y++)for(let x=0;x<width;x++)dot(x,y);
 sample.rows.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='1')dot(x+sample.x,y+sample.y);}));
 const system={width,height,rgba:rgba.buffer,rect:{x:0,y:0},staff:{x:0,y:60,height:69,spacing:17,lines,thickness:3},measures:[{x:0,width:440,stems:[]}]};
 const reading=parsePianoTokens('clef-F4+note-C3_half.|note-G3_half.|note-C4_half.+barline');
 assert.equal(pianoPrintedHeadPositions(system,reading.measures[0],0,reading.clef),null);
 assert.equal(pianoHeaderWidth(system,reading),202);
 const missing=parsePianoTokens(reading.raw.replace('note-C4','note-E3'));
 assert.equal(pianoHeaderWidth(system,missing),null,'do not guess the header from two notes when an expected staff note is missing');
});
