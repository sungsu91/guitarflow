import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveImportTarget,importOctaveShift,withImportPitchDefault} from '../src/pdf/tab-import/importTarget.js';
import {selectImportInstrument,selectImportTuning,importTargetOptions} from '../src/pdf/tab-import/importTargetOptions.js';
import {parseStaffTokens,staffSystemToAnalysis} from '../src/omr/staffTokens.js';
import {groupGrandStaffReadings,selectGrandStaffReading} from '../src/omr/grandStaffImport.js';
import {analysisToDocument,confirmImportedMeasure,reconcileImportedEdits} from '../src/pdf/tab-import/scoreAdapter.js';
import {applyPairedNotationChecks} from '../src/pdf/tab-import/pairedNotation.js';
import {summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {importReviewTargets,pdfTabReview} from '../src/pdf/tab-import/pdfTabReview.js';
import {compileDocumentV2,createBlankDocument,hasEditableShape} from '../src/etudes/scoreModel.js';
import {assignTab,soundingMidi,changeTuning} from '../src/etudes/scoreTuning.js';
import {staffPitchRepairState} from '../src/omr/staffPitch.js';
import {detectTabStaffs} from '../src/pdf/tab-import/geometry.js';
import {scorePlaybackReadiness} from '../src/etudes/scorePlaybackReadiness.js';

const system=(id=1,y=40)=>({id,rect:{x:10,y:y-30,width:650,height:130},staff:{id,x:20,y,width:620,height:40,spacing:10,lines:[0,10,20,30,40].map(n=>n+y)},measures:[{x:20,y,width:620,height:40}]});
const parsed=(raw,clef='G2')=>parseStaffTokens(`clef-${clef}+keySignature-CM+timeSignature-4/4+${raw}+barline`);
function documentFor(readings,target){
 const staffs=readings.map(r=>staffSystemToAnalysis(r.parsed,{system:r.system,target,page:1,width:700,height:550}).staff);
 const pages=[{page:1,width:700,height:550,staffs,notation:true,octaveShift:importOctaveShift(target)}];
 return analysisToDocument({fileName:'independent.pdf',target,pages,summary:summarizeAnalysis(pages)});
}
const target=(instrument,tuning)=>resolveImportTarget({instrument,tuning,notationPitch:'concert'});

for(const [name,t,midi,expected] of [
 ['guitar C4',target('guitar'),60,[2,1]],
 ['seven-string B1',target('guitar',[64,59,55,50,45,40,35]),35,[7,0]],
 ['Drop A A1',target('guitar',[64,59,55,50,45,40,33]),33,[7,0]],
 ['four-string bass E1',target('bass'),28,[4,0]],
 ['five-string bass B0',target('bass',[43,38,33,28,23]),23,[5,0]],
 ['High-G G4',target('ukulele'),67,[4,0]],
 ['Low-G G3',target('ukulele',[69,64,60,55]),55,[4,0]],
 ['Drop D D2',target('guitar',[64,59,55,50,45,38]),38,[6,0]],
])test(`${name}: actual tuning round-trip without target-dependent octave shifts`,()=>{
 const [note]=assignTab(t,[{midi,locked:false}]);assert.deepEqual([note.string,note.fret],expected);assert.equal(soundingMidi(t,note),midi);
 assert.equal(importOctaveShift(t),0);
});

test('new concert imports preserve C4 through editor compilation and never offer legacy octave repair',()=>{
 const d=documentFor([{system:system(),parsed:parsed('note-C4_whole')}],withImportPitchDefault());
 const n=d.measures[0].events[0].notes[0];assert.deepEqual([n.string,n.fret],[2,1]);
 assert.deepEqual(compileDocumentV2(d).errors,[]);assert.equal(compileDocumentV2(d).score.measures[0][0].midi,60);assert.equal(staffPitchRepairState(d),null);
 assert.equal(importOctaveShift(resolveImportTarget()),-12,'unchanged legacy caller');
 assert.equal(importOctaveShift({...target('ukulele'),notationPitch:'octave-down'}),-12,'source convention independent of destination');
});
test('7-string selection, custom tuning, JSON reload and removal preserve low pitches',()=>{
 const seven=selectImportInstrument(target('guitar'),'guitar:7'),drop=selectImportTuning(seven,'guitar-7-drop-a');
 assert.deepEqual(seven.tuning,[64,59,55,50,45,40,35]);assert.equal(drop.tuning[6],33);assert(importTargetOptions(drop).tunings.every(p=>p.tuning.length===7));
 const d=documentFor([{system:system(),parsed:parsed('note-B1_whole')}],seven),copy=JSON.parse(JSON.stringify(d));
 assert(hasEditableShape(copy));assert.deepEqual(compileDocumentV2(copy).errors,[]);
 const removed=changeTuning(copy,{tuning:[64,59,55,50,45,40]},'pitch').document;
 assert(removed.measures[0].events[0].notes[0].unplaced);assert.equal(removed.measures[0].events[0].notes[0].midi,35);
});
test('seven ruled lines are recognized only as seven strings, not a six-line subset',()=>{
 const w=800,h=300,pixels=new Uint8Array(w*h);
 for(let s=0;s<7;s++)for(let x=20;x<780;x++)pixels[(70+s*16)*w+x]=1;
 assert.equal(detectTabStaffs(pixels,w,h,undefined,7).length,1);assert.equal(detectTabStaffs(pixels,w,h,undefined,6).length,0);
});
test('unplayable chords retain all original pitches and never duplicate strings',()=>{
 const t=target('ukulele'),impossible=[48,60,64,67,69].map(midi=>({midi,locked:false}));
 const notes=assignTab(t,impossible);assert(notes.every(n=>n.unplaced));assert.deepEqual(notes.map(n=>n.midi),[48,60,64,67,69]);
 const possible=assignTab(t,[69,64,60,67].map(midi=>({midi,locked:false})));assert.equal(new Set(possible.map(n=>n.string)).size,4);
});

const grand=(right='note-C4_quarter+note-D4_quarter+note-E4_quarter+note-F4_quarter',left='note-C3_half+note-G2_half')=>[
 {system:system(1,40),parsed:parsed(right)},
 {system:system(2,180),parsed:parsed(left,'F4')},
];
test('Grand Staff retains one bar, independent hands, rests, chords, onsets and pitches',()=>{
 const readings=grand('note-C4_quarter|note-E4_quarter+rest_quarter+note-G4_half','note-C3_half+note-G2_half');
 const d=documentFor(groupGrandStaffReadings(readings),target('piano'));
 assert.equal(d.measures.length,1);assert.equal(d.viewSettings.notationView,'staff');assert.deepEqual(compileDocumentV2(d).errors,[]);
 const events=d.measures[0].events;
 assert.deepEqual(events.filter(e=>e.voice==='right').map(e=>[e.onset,e.duration,e.notes.map(n=>n.midi)]),[[0,'4',[60,64]],[480,'4',[]],[960,'2',[67]]]);
 assert.deepEqual(events.filter(e=>e.voice==='left').map(e=>[e.onset,e.duration,e.notes[0].midi]),[[0,'2',48],[960,'2',43]]);
 assert(events.flatMap(e=>e.notes).every(n=>n.string===undefined&&n.fret===undefined));
 assert.deepEqual(compileDocumentV2(JSON.parse(JSON.stringify(d))).errors,[]);
});
test('Grand Staff refuses missing staves, mismatched boundaries, meters or clefs rather than doubling bars',()=>{
 assert.throws(()=>groupGrandStaffReadings(grand().slice(0,1)),/Grand Staff/);
 for(const change of [r=>r[1].system.measures[0].x+=40,r=>r[1].parsed.clef='clef-G2',r=>r[1].parsed.measures[0].meter=[3,4]]){const r=grand();change(r);assert.throws(()=>groupGrandStaffReadings(r),/Grand Staff/);}
});
test('empty recognized staff bars remain rhythm-invalid rather than passing an empty voice check',()=>{
 const r=parsed('rest_whole');r.measures[0].events=[];
 for(const instrument of ['guitar','piano']){
  const {staff}=staffSystemToAnalysis(r,{system:system(),target:target(instrument),page:1,width:700,height:550});
  assert.equal(staff.measures[0].rhythmValid,false);
  assert(staff.measures[0].reasons.includes('measure-rhythm-unverified'));
 }
});
test('Grand Staff crop consensus requires matching clef, complete bars, pitch and rhythm',()=>{
 const a=parsed('note-C3_half+note-G2_half','F4'),b=structuredClone(a);
 assert.equal(selectGrandStaffReading([a,b],'clef-F4',1),a);
 assert.equal(selectGrandStaffReading([a],'clef-F4',1),null);
 assert.equal(selectGrandStaffReading([a,b],'clef-G2',1),null);
 assert.equal(selectGrandStaffReading([a,b],'clef-F4',2),null);
 b.measures[0].events[1].notes[0].midi++;
 assert.equal(selectGrandStaffReading([a,b],'clef-F4',1),null);
 const incomplete=parsed('note-C3_half','F4');
 assert.equal(selectGrandStaffReading([incomplete,structuredClone(incomplete)],'clef-F4',1),null);
});
test('Grand Staff user review validates each hand and piano pitch edits resolve only the edited event',()=>{
 const doc=documentFor(groupGrandStaffReadings(grand()),target('piano'));
 assert.deepEqual(scorePlaybackReadiness(doc,compileDocumentV2(doc)),{allowed:true,preview:true});
 const reviewed=confirmImportedMeasure(doc,0);
 assert.equal(reviewed.measures[0].pdfImport.needsReview,false);
 let cursor;pdfTabReview(doc,{bar:0,event:0},value=>{cursor=value;}).movePage(1);
 assert.equal(cursor.mode,'staff');assert.equal(cursor.hand,'right');
 const broken=structuredClone(doc);broken.measures[0].events.find(e=>e.voice==='left').duration='4';
 assert.throws(()=>confirmImportedMeasure(broken,0),/음가|빈칸/);
 assert.equal(scorePlaybackReadiness(broken,compileDocumentV2(broken)).allowed,false);
 const empty=structuredClone(doc);empty.measures[0].events=[];
 assert.throws(()=>confirmImportedMeasure(empty,0),/음가/);
 const edited=structuredClone(doc);edited.measures[0].events[0].notes[0].midi++;
 const reconciled=reconcileImportedEdits(doc,edited);
 assert.equal(reconciled.measures[0].events[0].pdfImport.reviewedBy,'user');
 assert.equal(reconciled.measures[0].events[1].pdfImport.reviewedBy,undefined);
});
test('explicit Grand Staff TAB conversion rejects independent rhythms; unreachable combined chords remain unplaced',()=>{
 assert.throws(()=>groupGrandStaffReadings(grand(),target('guitar')),/재배치/);
 const r=grand('note-C4_whole|note-E4_whole|note-G4_whole','note-C2_whole|note-G2_whole');
 const d=documentFor(groupGrandStaffReadings(r,target('guitar')),target('guitar'));
 assert(d.measures[0].events[0].notes.every(n=>n.unplaced));assert.equal(d.measures[0].events[0].notes.length,5);
});

function pairedPage(fret=1){return {page:1,width:700,height:550,pairedNotation:[{tabY:180/550,staff:1,parsed:parsed('note-C4_whole')}],staffs:[{id:1,y:180,measures:[{source:{page:1,staff:1,pageWidth:700,pageHeight:550},meter:[4,4],rhythmValid:true,needsReview:false,reasons:[],orphan:[],slots:[{duration:'1',rest:false,status:'confirmed',confidence:.99,source:{},rejections:[],notes:[{string:2,fret,status:'confirmed',confidence:{fret:.99,string:1,rhythm:1}}]}]}]}]};}
test('paired independent C4 corroborates TAB string 2 fret 1, without certifying or rewriting the TAB',()=>{
 const page=pairedPage(),before=structuredClone(page),result=applyPairedNotationChecks(page,target('guitar'));
 assert.equal(result.staffs[0].measures[0].slots[0].notationCheck.status,'match');assert.deepEqual(page,before);
 assert.deepEqual(result.staffs[0].measures[0].slots[0].notes,page.staffs[0].measures[0].slots[0].notes);
});
test('paired mismatched fret remains visible and the quick review jumps only to that bar',()=>{
 const t=target('guitar'),p=applyPairedNotationChecks(pairedPage(2),t);
 const d=analysisToDocument({fileName:'pair.pdf',target:t,pages:[p],summary:summarizeAnalysis([p])});
 assert.equal(d.measures[0].events[0].notes[0].fret,2);assert.equal(d.measures[0].events[0].pdfImport.notationCheck.status,'mismatch');
 assert.deepEqual(importReviewTargets(d).map(v=>[v.cursor.bar,v.reasons]),[[0,['notes']]]);
});
test('different subdivisions and unconfirmed frets cannot falsely confirm a pitch',()=>{
 for(const alter of [p=>p.staffs[0].measures[0].slots[0].notes[0].status='unresolved',p=>p.pairedNotation[0].parsed=parsed('note-C4_half+note-C4_half')]){
  const p=pairedPage();alter(p);assert.equal(applyPairedNotationChecks(p,target('guitar')).staffs[0].measures[0].slots[0].notationCheck,undefined);
 }
});
test('drum source/target is rejected explicitly, never assigned pitched guitar frets',()=>{
 assert.throws(()=>resolveImportTarget({instrument:'drums'}),/드럼 PDF 인식/);
 assert.throws(()=>staffSystemToAnalysis(parsed('note-F4_quarter','percussion'),{system:system(),target:target('guitar'),page:1,width:700,height:550}),/타악기/);
});
