import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveImportTarget} from '../src/pdf/tab-import/importTarget.js';
import {detectTabStaffs} from '../src/pdf/tab-import/geometry.js';
import {parseStaffTokens,staffSystemToAnalysis} from '../src/omr/staffTokens.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {soundingMidi} from '../src/etudes/scoreTuning.js';
import {chordRegions} from '../src/pdf/tab-import/chordGeometry.js';
import {chordProgression} from '../src/etudes/arpeggioChords.js';

const bass4={instrument:'bass',tuning:[43,38,33,28]},bass5={instrument:'bass',tuning:[43,38,33,28,23]};
const system={id:1,rect:{x:10,y:20,width:600,height:100},staff:{spacing:10,lines:[40,50,60,70,80]}};
test('imported bass chord names survive editor previews without six-string grip searches',()=>{
 for(const target of [bass4,bass5]){
  const document={...target,measures:[{harmonyChanges:[{onset:0,name:'Em'},{onset:960,name:'B7'}]},{harmony:'D7'}]};
  const before=structuredClone(document),progression=chordProgression(document);
  assert.deepEqual(progression.flatMap(c=>c.map(n=>n.name)),['Em','B7','D7']);
  assert(progression.flat().every(n=>n.shape===null));assert.deepEqual(document,before);
 }
});
function convert(raw,target){
  const parsed=parseStaffTokens(raw),{staff}=staffSystemToAnalysis(parsed,{system,page:1,width:700,height:250,target});
  const pages=[{page:1,staffs:[staff],notation:true,octaveShift:staff.notation.octaveShift}];
  return analysisToDocument({fileName:'independent.pdf',target,pages,summary:summarizeAnalysis(pages)});
}
test('import settings are copied, validated and keep legacy guitar defaults',()=>{
  assert.deepEqual(resolveImportTarget(),{instrument:'guitar',tuning:[64,59,55,50,45,40],capo:0});
  const source={...bass5,capo:2,measures:[{}]},target=resolveImportTarget(source);target.tuning[0]++;
  assert.equal(source.tuning[0],43);assert.equal(target.measures,undefined);
  for(const bad of [{instrument:'drums'},{instrument:'bass',tuning:[64,59,55,50,45,40]},{...bass4,capo:-1}])assert.throws(()=>resolveImportTarget(bad));
});
test('TAB geometry uses exactly the selected string count; guitar rejects four/five-line grids',()=>{
  const w=700,h=320;
  for(const count of [4,5,6,7]){
    const pixels=new Uint8Array(w*h);
    for(let line=0;line<count;line++)for(let x=30;x<670;x++)pixels[(60+line*16)*w+x]=1;
    for(const requested of [4,5,6])assert.equal(detectTabStaffs(pixels,w,h,undefined,requested).length,count===requested?1:0,`${count} / ${requested}`);
  }
});
test('five-string TAB systems do not borrow the previous system as paired staff notation',()=>{
  const w=700,h=450,rgba=new Uint8ClampedArray(w*h*4).fill(255);
  const targets=[60,260].map((y,i)=>({id:i+1,kind:'tab',x:30,y,width:640,height:64,spacing:16,thickness:1,lines:Array.from({length:5},(_,s)=>y+s*16)}));
  for(const s of targets)for(const y of s.lines)for(let x=30;x<670;x++)for(let c=0;c<3;c++)rgba[(y*w+x)*4+c]=0;
  assert.deepEqual(chordRegions(rgba,w,h,targets).map(r=>r.staffY),[60,260]);
});
test('bass staff conversion preserves written octave and uses the selected bass strings',()=>{
  const d=convert('clef-F4+keySignature-CM+timeSignature-4/4+note-E2_quarter+note-A2_quarter+note-D3_quarter+note-G3_quarter+barline',bass4);
  assert.equal(d.instrument,'bass');assert.deepEqual(d.tuning,bass4.tuning);
  assert.deepEqual(d.measures[0].events.map(e=>soundingMidi(d,e.notes[0])),[28,33,38,43]);
  const result=compileDocumentV2(d);assert.deepEqual(result.errors,[]);
  assert.deepEqual(result.score.measures[0].map(e=>e.pitch.key),['e/2','a/2','d/3','g/3']);
});
test('low B belongs to string five, while four-string bass keeps an explicit out-of-range pitch',()=>{
  const raw='clef-F4+keySignature-CM+timeSignature-4/4+note-B1_whole+barline';
  const five=convert(raw,bass5),four=convert(raw,bass4);
  assert.deepEqual(five.measures[0].events[0].notes.map(n=>[n.string,n.fret]),[[5,0]]);
  assert.equal(four.measures[0].events[0].notes[0].unplaced,true);assert.equal(four.measures[0].events[0].notes[0].midi,23);
});
test('staff fingering uses custom tuning/capo; four-string ukulele does not inherit guitar octave shift',()=>{
  const dropped=convert('clef-F4+keySignature-CM+timeSignature-4/4+note-D2_whole+barline',{...bass4,tuning:[43,38,33,26]});
  assert.deepEqual(dropped.measures[0].events[0].notes.map(n=>[n.string,n.fret]),[[4,0]]);
  const uke=convert('clef-G2+keySignature-CM+timeSignature-4/4+note-C4_whole+barline',{instrument:'ukulele',tuning:[69,64,60,67]});
  assert.equal(uke.pdfTabImport.notation.octaveShift,0);assert.deepEqual(uke.measures[0].events[0].notes.map(n=>[n.string,n.fret]),[[3,0]]);
  const capo=convert('clef-G2+keySignature-CM+timeSignature-4/4+note-F5_whole+barline',{instrument:'guitar',tuning:[64,59,55,50,45,40],capo:1});
  assert.equal(capo.capo,1);assert.deepEqual(capo.measures[0].events[0].notes.map(n=>[n.string,n.fret]),[[1,0]]);
});
