import test from 'node:test';
import assert from 'node:assert/strict';
import {wholePianoRestEvidence} from '../src/omr/pianoRestEvidence.js';
import {singleWholePianoReading} from '../src/omr/pianoStaffRecognition.js';
import {parsePianoTokens} from '../src/omr/pianoPolyphony.js';
import {refinePianoChordHeads} from '../src/omr/pianoHeadEvidence.js';
const g=20,width=440,height=180,lines=[40,60,80,100,120];
function sheet(){
 const rgba=new Uint8ClampedArray(width*height*4).fill(255);
 const dot=(x,y)=>{if(x>=0&&x<width&&y>=0&&y<height)rgba.set([0,0,0,255],(y*width+x)*4);};
 const rect=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)dot(xx,yy);};
 lines.forEach(y=>rect(0,y,width,1));
 const system={id:1,width,height,rgba:rgba.buffer,rect:{x:0,y:0},staff:{spacing:g,lines,thickness:1,height:80},measures:[{x:0,width:140,stems:[]},{x:140,width:300,stems:[]}]};
 return {system,rect,dot};
}
test('whole-rest recovery requires the hanging block and excludes half rests and other musical ink',()=>{
 const whole=sheet();whole.rect(270,61,20,8);assert.equal(wholePianoRestEvidence(whole.system,1)?.duration,'1');
 const half=sheet();half.rect(270,72,20,8);assert.equal(wholePianoRestEvidence(half.system,1),null);
 whole.rect(340,90,18,12);assert.equal(wholePianoRestEvidence(whole.system,1),null);
 assert.equal(wholePianoRestEvidence(sheet().system,1),null);
});
test('thick beam intersections do not count as chord heads; real extra heads and thin ledger lines still block repair',()=>{
 const make=kind=>{
  const s=sheet(),stems=[];
  for(const x of [190,250,310,370]){
   const oval=y=>{for(let yy=y-6;yy<=y+6;yy++)for(let xx=x-8;xx<=x+8;xx++)if(((xx-x)/8)**2+((yy-y)/6)**2<=1)s.dot(xx,yy);};
   oval(90);oval(160);
   if(kind==='beam')s.rect(x-42,45,52,11);
   else{oval(50);s.rect(x-42,50,52,1);}
   stems.push({x:x+8,heads:[{step:-4,support:1},{step:3,support:1},{step:7,support:1}]});
  }
  s.system.measures[1].stems=stems;return s.system;
 };
 const reading=parsePianoTokens('clef-F4+timeSignature-4/4+'+Array(4).fill('note-C2_quarter|note-E3_quarter').join('+')+'+barline');
 const repaired=refinePianoChordHeads(reading,make('beam'),1);
 assert.deepEqual(repaired.measures[0].events.map(e=>e.notes.map(n=>n.midi)),Array(4).fill([36,48]));
 assert.equal(repaired.originalRaw,reading.raw);
 assert.equal(refinePianoChordHeads(reading,make('head'),1),reading,'a real third head must not be dropped to match the decoder');
});
test('filled piano octave correction needs matching strong heads and rejects ambiguous or explicitly altered notes',()=>{
 const s=sheet(),heads=[{step:-4,support:1},{step:3,support:1}],stems=[];
 for(const x of [190,250,310,370]){
  for(const y of [90,160])for(let yy=y-6;yy<=y+6;yy++)for(let xx=x-8;xx<=x+8;xx++)if(((xx-x)/8)**2+((yy-y)/6)**2<=1)s.dot(xx,yy);
  stems.push({x:x+8,heads:structuredClone(heads)});
 }
 s.system.measures[1].stems=stems;
 const raw='clef-F4+timeSignature-4/4+'+Array(4).fill('note-C2_quarter|note-E3_quarter').join('+')+'+barline',reading=parsePianoTokens(raw);
 const fixed=refinePianoChordHeads(reading,s.system,1);
 assert.deepEqual(fixed.measures[0].events.map(e=>e.notes.map(n=>n.midi)),Array(4).fill([36,48]));assert.equal(fixed.headEvidence.changes.length,4);assert.equal(fixed.originalRaw,raw);
 stems[0].heads.push({step:5,support:.8});assert.equal(refinePianoChordHeads(reading,s.system,1),reading,'ambiguous ink cannot be replaced');stems[0].heads.pop();
 const altered=parsePianoTokens(raw.replace('note-E3_quarter','note-E3N_quarter'));assert.equal(refinePianoChordHeads(altered,s.system,1),altered);
 const blank=sheet();blank.system.measures[1].stems=stems;assert.equal(refinePianoChordHeads(reading,blank.system,1),reading,'metadata alone cannot repair pitch without actual pixels');
});
test('duplicate whole-chord decoder bars need a unique set of printed hollow heads',()=>{
 const body='note-E4_whole|note-G4_whole',reading=parsePianoTokens(`clef-G2+timeSignature-4/4+${body}+barline+${body}+barline`);
 const s=sheet();
 const head=(x,y)=>{for(let yy=y-12;yy<=y+12;yy++)for(let xx=x-20;xx<=x+20;xx++){const d=((xx-x)/14)**2+((yy-y)/7)**2;if(d>.6&&d<1.4)s.dot(xx,yy);}};
 head(270,120);head(270,100);
 const recovered=singleWholePianoReading(reading,s.system,1);assert.equal(recovered.measures.length,1);assert.equal(recovered.singleChordEvidence.decodedBars,2);
 assert.equal(singleWholePianoReading(reading,sheet().system,1),reading,'blank staff is not evidence');
 head(350,120);head(350,100);assert.equal(singleWholePianoReading(reading,s.system,1),reading,'multiple printed attacks stay unresolved');
});
