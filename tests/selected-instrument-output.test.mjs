import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareInstrumentOutput,recognitionTarget} from '../src/pdf/tab-import/instrumentOutput.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {parseStaffTokens,staffSystemToAnalysis} from '../src/omr/staffTokens.js';
import {summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {applySelectedInstrument} from '../src/etudes/selectedInstrument.js';
import {createBlankDocument,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {soundingMidi} from '../src/etudes/scoreTuning.js';
const bass={instrument:'bass',tuning:[43,38,33,28],capo:0};
function reading({target=bass,clef='clef-G2',chord='C',nativeTab=false,octaveShift}={}){
 const system={id:1,rect:{x:10,y:20,width:600,height:100},staff:{spacing:10,lines:[40,50,60,70,80]}};
 const {staff}=staffSystemToAnalysis(parseStaffTokens(`${clef}+keySignature-CM+timeSignature-4/4+note-${clef==='clef-F4'?'E2':'E5'}_whole+barline`),{system,page:1,width:700,height:250,target,octaveShift});
 staff.measures[0].harmony=chord;staff.measures[0].harmonyChanges=chord?[{onset:0,name:chord}]:[];
 const pages=[{page:1,staffs:[staff],notation:!nativeTab,octaveShift:staff.notation.octaveShift}];
 return {fileName:'independent.pdf',target,pages,summary:summarizeAnalysis(pages),complete:true};
}
test('selected bass automatically turns treble melody into low accompaniment in the selected tuning',()=>{
 const target={...bass,tuning:[42,37,32,27,22]},analysis=reading({target,chord:'G/B'}),before=structuredClone(analysis);
 const {document:d,reviewInstrument}=prepareInstrumentOutput(analysis,{sourceMode:'staff'});
 assert(!reviewInstrument);assert.equal(d.instrument,'bass');assert.deepEqual(d.tuning,target.tuning);
 assert.equal(d.measures[0].events.length,4);assert(d.measures[0].events.every(e=>soundingMidi(d,e.notes[0])===23));
 assert.equal(d.bassArrangement.automatic,true);assert.deepEqual(analysis,before);
 assert.deepEqual(compileDocumentV2(d).errors,[]);assert.deepEqual(compileDocumentV2(d).issues,[]);
});
test('native bass notation and TAB keep their played pitches and rhythm even when chords are present',()=>{
 for(const options of [{clef:'clef-F4'},{nativeTab:true}]){
  const analysis=reading(options),original=analysisToDocument(analysis),{document:d}=prepareInstrumentOutput(analysis);
  assert(!d.bassArrangement);assert.deepEqual(d.measures[0].events.map(e=>[e.duration,e.notes.map(n=>[n.string,n.fret])]),original.measures[0].events.map(e=>[e.duration,e.notes.map(n=>[n.string,n.fret])]));
 }
});
test('incomplete or missing chords route straight to correction without a high-register fallback',()=>{
 for(const chord of [null,'???']){const output=prepareInstrumentOutput(reading({chord}));assert.equal(output.reviewInstrument,'bass');assert.match(output.reviewMessage,/코드/);assert(output.document.pdfTabImport);}
 const partial=reading();partial.complete=false;partial.completed=2;partial.totalPages=9;partial.nextPage=3;
 assert.throws(()=>prepareInstrumentOutput(partial),/페이지/);
 const output=prepareInstrumentOutput(partial,{allowPartial:true});assert.equal(output.document.bassArrangement.importCoverage.completed,2);assert.equal(output.document.bassArrangement.importCoverage.totalPages,9);
});
test('Grand Staff recognition remains piano internally while output retains the selected bass settings',()=>{
 const target={...bass,tuning:[43,38,33,26],capo:1},internal=recognitionTarget(target,'grand');
 assert.equal(internal.instrument,'piano');assert.deepEqual(target.tuning,[43,38,33,26]);
 const output=prepareInstrumentOutput(reading({target:internal,chord:'F'}),{target,sourceMode:'grand'}).document;
 assert.equal(output.instrument,'bass');assert.deepEqual(output.tuning,target.tuning);assert.equal(output.capo,1);
 assert(output.measures[0].events.every(e=>soundingMidi(output,e.notes[0])===29));assert.equal(output.measures[0].harmony,'F');
});
test('guitar, ukulele and piano imports retain their selected instrument and source notes',()=>{
 for(const target of [{instrument:'guitar',tuning:[64,59,55,50,45,38],capo:2},{instrument:'ukulele',tuning:[69,64,60,67],capo:0},{instrument:'piano',tuning:[],capo:0}]){
  const analysis=reading({target}),d=prepareInstrumentOutput(analysis).document;
  assert.equal(d.instrument,target.instrument);assert.deepEqual(d.tuning,target.tuning);assert.equal(d.capo,target.capo);assert(!d.bassArrangement);
 }
});
test('editor selection creates bass accompaniment, leaves empty scores empty and fails without modifying missing harmony',()=>{
 const source=createBlankDocument();source.measures[0].harmony='C';const before=structuredClone(source);
 const d=applySelectedInstrument(source,'bass');assert(d.bassArrangement);assert.equal(d.measures[0].events[0].notes[0].midi,36);assert.deepEqual(source,before);
 const blank=applySelectedInstrument(createBlankDocument(),'bass');assert(!blank.bassArrangement);assert(blank.measures[0].events.every(e=>e.blank));
 const missing=createBlankDocument();missing.measures[0].events[0].notes=[{string:1,fret:0}];const saved=structuredClone(missing);
 assert.throws(()=>applySelectedInstrument(missing,'bass'),/코드/);assert.deepEqual(missing,saved);
});

test('automatic bass imports ignore stale source octaves and keep destination tuning and capo',()=>{
 const musical=d=>d.measures.map(m=>m.events.map(e=>[e.onset,e.duration,e.notes.map(n=>[n.midi,n.string,n.fret])]));
 const results=[];
 for(const notationPitch of ['concert','octave-down']){
  const selected={...bass,tuning:[42,37,32,27,22],capo:1,notationPitch},before=structuredClone(selected),target=recognitionTarget(selected,'staff');
  const analysis=reading({target,chord:'G/B',octaveShift:-12});
  assert.equal(analysis.pages[0].staffs[0].notation.octaveShift,0);
  const document=prepareInstrumentOutput(analysis,{target:selected,sourceMode:'staff'}).document;
  assert.deepEqual(document.tuning,selected.tuning);assert.equal(document.capo,1);
  assert(document.measures[0].events.every(e=>soundingMidi(document,e.notes[0])===23));
  assert.deepEqual(selected,before);results.push(musical(document));
 }
 assert.deepEqual(results[0],results[1]);
});
test('automatic bass source reading preserves native low bass and leaves TAB pitch comparison explicit',()=>{
 for(const notationPitch of ['concert','octave-down']){
  const selected={...bass,notationPitch},target=recognitionTarget(selected,'staff'),analysis=reading({target,clef:'clef-F4',octaveShift:0});
  assert.equal(analysis.pages[0].staffs[0].notation.octaveShift,-12);
  const document=prepareInstrumentOutput(analysis,{target:selected,sourceMode:'staff'}).document;
  assert.equal(document.notationPitch,selected.notationPitch);assert(!document.bassArrangement);assert.equal(soundingMidi(document,document.measures[0].events[0].notes[0]),28);
  assert.deepEqual(recognitionTarget(selected,'tab'),selected);
 }
 const guitar={instrument:'guitar',tuning:[64,59,55,50,45,40],capo:0,notationPitch:'octave-down'};
 assert.deepEqual(recognitionTarget(guitar,'staff'),guitar);
});
