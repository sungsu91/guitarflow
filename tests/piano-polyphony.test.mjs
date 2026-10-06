import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePianoTokens} from '../src/omr/pianoPolyphony.js';
import {staffSystemToAnalysis} from '../src/omr/staffTokens.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {groupGrandStaffReadings} from '../src/omr/grandStaffImport.js';
import {compileDocumentV2,cloneMeasures} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {arrangeGuitar} from '../src/etudes/arrangement/arrangeGuitar.js';
import {convertScoreInstrument} from '../src/etudes/convertScoreInstrument.js';
const raw='clef-G2+keySignature-GM+note-D4_whole|note-E4_whole|note-G4_half+note-A4_half+barline';
export function polyphonicDocument(input=raw){
 const sys=(id,y)=>({id,rect:{x:0,y,width:500,height:90},staff:{id,x:0,y,height:40,spacing:10,lines:[y,y+10,y+20,y+30,y+40]},measures:[{x:0,y,width:500,height:40}]});
 const rows=groupGrandStaffReadings([{system:sys(1,0),parsed:parsePianoTokens(input,{key:'G',meter:[4,4]})},{system:sys(2,120),parsed:parsePianoTokens('clef-F4+keySignature-GM+note-C3_whole+barline',{key:'G',meter:[4,4]})}]);
 const target={instrument:'piano',tuning:[],notationPitch:'concert'},staffs=rows.map(r=>staffSystemToAnalysis(r.parsed,{system:r.system,page:1,width:500,height:220,target}).staff);
 return analysisToDocument({fileName:'independent-voices.pdf',target,pages:[{page:1,width:500,height:220,notation:true,octaveShift:0,staffs}],summary:{}});
}
test('piano import, save/reload and copied bars preserve each independent attack and release',()=>{
 const doc=polyphonicDocument();
 for(const d of [doc,JSON.parse(JSON.stringify(doc)),{...doc,measures:cloneMeasures(doc.measures)}]){
  const compiled=compileDocumentV2(d);assert.deepEqual(compiled.errors,[]);
  assert.deepEqual(scoreTimeline(compiled.score,60).events.map(n=>[n.midi,n.start,n.duration]),[[62,0,4],[64,0,4],[67,0,2],[48,0,4],[69,2,2]]);
 }
 const broken=structuredClone(doc);broken.measures[0].events.find(e=>e.voice==='right'&&e.onset===960).notes[0].midi=63;
 assert(compileDocumentV2(broken).errors.some(s=>s.includes('지속음')));
 assert.throws(()=>arrangeGuitar(broken),/지속음/);
 assert.throws(()=>convertScoreInstrument(doc,'guitar'),/기타 편곡/);
});
test('independent-note ties crossing bars require continuous timing',()=>{
 const doc=polyphonicDocument(),copy=cloneMeasures(doc.measures)[0];doc.measures.push(copy);
 const last=doc.measures[0].events.find(e=>e.voice==='right'&&e.onset===960),next=copy.events.find(e=>e.voice==='right');
 last.notes.find(n=>n.midi===62).pianoTieTo=next.id;
 assert.deepEqual(compileDocumentV2(doc).errors,[]);
 next.onset=240;assert(compileDocumentV2(doc).errors.some(s=>s.includes('지속음')));
});
test('mixed piano voicing keeps the melody rhythm and stores the exact source for restoration',()=>{
 const doc=polyphonicDocument(),before=structuredClone(doc),out=arrangeGuitar(doc).document;
 assert.deepEqual(doc,before);assert.deepEqual(out.guitarArrangement.sourceDocument,doc);
 assert.deepEqual(scoreTimeline(compileDocumentV2(out).score,60).events.filter(n=>n.voice==='melody').map(n=>[n.midi,n.start,n.duration]),[[67,0,2],[69,2,2]]);
});
test('a sustained highest voice is not reattacked when an inner voice moves',()=>{
 const d=polyphonicDocument('clef-G2+keySignature-GM+note-D4_half|note-G4_whole+note-E4_half+barline'),out=arrangeGuitar(d).document;
 assert.deepEqual(scoreTimeline(compileDocumentV2(out).score,60).events.filter(n=>n.voice==='melody').map(n=>[n.midi,n.start,n.duration]),[[67,0,4]]);
});
test('out-of-bar and overlapping same-pitch voices stay unread instead of truncating held notes',()=>{
 for(const body of ['note-C4_whole|note-E4_half+note-C4_half','note-C4_whole|note-E4_half+note-F4_whole'])assert(parsePianoTokens('clef-G2+'+body+'+barline',{meter:[4,4]}).measures[0].events.some(e=>e.unread));
});
