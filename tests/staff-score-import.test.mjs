import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStaffTokens,staffSystemToAnalysis} from '../src/omr/staffTokens.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {summarizeAnalysis} from '../src/pdf/tab-import/recognition.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {photoFilesToAdd} from '../src/pdf/tab-import/photoBatch.js';
import {createStaffOmrClient} from '../src/omr/staffOmrClient.js';
import {cropNotationSystems} from '../src/omr/staffSystems.js';
import {restoreStaffPitch,staffPitchRepairState} from '../src/omr/staffPitch.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
const header='clef-G2+keySignature-GM+timeSignature-4/4+';
const system={id:1,rect:{x:10,y:20,width:600,height:100},staff:{spacing:10,lines:[40,50,60,70,80]}};
test('wide single-staff crops retain page context while six-line TAB is not sent to staff OMR',()=>{
 const width=700,height=250,pixels=new Uint8ClampedArray(width*height*4).fill(255);
 for(let line=0;line<5;line++)for(let x=30;x<670;x++)for(let c=0;c<3;c++)pixels[((70+line*16)*width+x)*4+c]=0;
 assert.deepEqual(cropNotationSystems(pixels,width,height)[0].rect,{x:0,y:0,width,height});
 for(let x=30;x<670;x++)for(let c=0;c<3;c++)pixels[((70+5*16)*width+x)*4+c]=0;
 assert.equal(cropNotationSystems(pixels,width,height).length,0);
});
test('staff grammar applies key and explicit accidentals until the next barline',()=>{
 const p=parseStaffTokens(header+'note-F4_quarter+note-F4N_quarter+note-F4_quarter+note-A4#_quarter+barline+note-F4_whole+barline');
 assert.deepEqual(p.measures[0].events.map(e=>e.notes[0].midi),[66,65,65,70]);assert.equal(p.measures[1].events[0].notes[0].midi,66);
});
test('dots, same-duration chords, actual rest spelling and inherited meter are retained',()=>{
 const p=parseStaffTokens('clef-G2+keySignature-GM+note-D5_eighth.|note-F5_eighth.+rest-sixteenth+note-G5_half.+barline',{meter:[4,4]});
 assert.equal(p.measures.length,1);assert.equal(p.measures[0].events[0].notes.length,2);assert.equal(p.measures[0].events[0].dotted,true);assert.equal(p.measures[0].events[1].rest,true);
 const later=parseStaffTokens('clef-G2+note-C5_half.+barline',{meter:[6,8],key:'G'});assert.deepEqual(later.meter,[6,8]);assert.equal(later.key,'G');
});
test('unknown and independent-voice tokens remain explicit gaps, never silently become rests',()=>{
 const p=parseStaffTokens(header+'note-C4_quarter|note-E4_half+nonote_sixteenth+multirest-7+barline');
 assert.equal(p.measures[0].events.length,3);assert(p.measures[0].events.every(e=>e.unread&&!e.rest));assert.equal(p.warnings.length,3);
});
function convert(raw,octaveShift){
 const parsed=parseStaffTokens(raw),{staff}=staffSystemToAnalysis(parsed,{system,page:2,width:700,height:500,octaveShift});
 const pages=[{page:2,staffs:[staff],notation:true,octaveShift:staff.notation.octaveShift}],analysis={fileName:'staff.jpg',sourceType:'image',pages,summary:summarizeAnalysis(pages)};
 return analysisToDocument(analysis);
}
test('default guitar import becomes first-position TAB and remains unreviewed',()=>{
 const d=convert('clef-G2+keySignature-CM+timeSignature-4/4+note-C5_quarter+note-D5_quarter+note-E5_quarter+note-F5_quarter+barline');
 assert.deepEqual(d.measures[0].events.map(e=>[e.notes[0].string,e.notes[0].fret]),[[2,1],[2,3],[1,0],[1,1]]);
 assert.equal(d.pdfTabImport.notation.reviewed,false);assert.equal(d.measures[0].pdfImport.needsReview,true);assert.deepEqual(compileDocumentV2(d).errors,[]);
});

test('staff -> TAB -> rendered staff preserves the source note positions by default',()=>{
 const raw='clef-G2+keySignature-CM+timeSignature-4/4+note-C4_quarter+note-D4_quarter+note-E4_quarter+note-F4_quarter+barline';
 const normal=convert(raw);
 const pitches=d=>d.measures[0].events.map(e=>d.tuning[e.notes[0].string-1]+e.notes[0].fret);
 assert.deepEqual(pitches(normal),[48,50,52,53]);assert.equal(normal.pdfTabImport.notation.octaveShift,-12);
 assert.deepEqual(compileDocumentV2(normal).score.measures[0].map(e=>e.pitch.key),['c/4','d/4','e/4','f/4']);
});

const firstBar=header+'rest-quarter+note-B5_eighth+note-B5_eighth+note-B5_eighth.+note-B5_sixteenth+note-B5_eighth+note-B5_eighth+barline';
const rhythms=d=>d.measures.map(m=>m.events.map(e=>({id:e.id,onset:e.onset,duration:e.duration,dotted:e.dotted,rest:e.rest,blank:e.blank,tieTo:e.tieTo})));
test('reported B5 regression: source ledger note maps to fret 7 and B5, not fret 19 and B6',()=>{
 const legacy=convert(firstBar,0),fixed=convert(firstBar);
 assert.equal(legacy.measures[0].events[1].notes[0].fret,19);
 assert.equal(compileDocumentV2(legacy).score.measures[0][1].pitch.key,'b/6');
 assert.equal(fixed.measures[0].events[1].notes[0].fret,7);
 assert.equal(compileDocumentV2(fixed).score.measures[0][1].pitch.key,'b/5');
 assert.deepEqual(fixed.measures[0].events.map(e=>[e.duration,!!e.dotted,e.onset]),[['4',false,0],['8',false,480],['8',false,720],['8',true,960],['16',false,1320],['8',false,1440],['8',false,1680]]);
});
test('legacy repair preserves rhythm, ties, IDs and raw evidence without confirming recognition',()=>{
 const legacy=convert(firstBar,0);legacy.measures[0].events[1].tieTo='next';
 const snapshot=structuredClone(legacy),fixed=restoreStaffPitch(legacy);
 assert.deepEqual(legacy,snapshot);assert.deepEqual(rhythms(fixed),rhythms(legacy));
 assert.deepEqual(fixed.measures[0].events.map(e=>e.notes.map(n=>n.id)),legacy.measures[0].events.map(e=>e.notes.map(n=>n.id)));
 assert.equal(fixed.measures[0].events[1].notes[0].fret,7);assert.equal(fixed.measures[0].events[1].notes[0].source.writtenMidi,83);
 assert.deepEqual(fixed.autoTab,legacy.autoTab);assert(fixed.measures[0].events.every(e=>e.notes.every(n=>!n.outsidePreferred)));
 assert.equal(fixed.pdfTabImport.notation.systems[0].raw,legacy.pdfTabImport.notation.systems[0].raw);
 assert.equal(fixed.pdfTabImport.notation.systems[0].octaveShift,-12);assert.equal(staffPitchRepairState(fixed),null);
 assert(fixed.measures[0].events.every(e=>e.pdfImport.status==='unresolved'));assert.equal(restoreStaffPitch(fixed),fixed);
});
test('repair does not overwrite edited pitches, added notes, changed tuning or TAB imports',()=>{
 for(const mutate of [d=>d.measures[0].events[1].notes[0].fret++,d=>d.tuning[0]--,d=>d.measures[0].events[1].notes.push({id:'manual',string:2,fret:0})]){
  const d=convert(firstBar,0);mutate(d);const before=structuredClone(d);
  assert.equal(staffPitchRepairState(d).canRepair,false);assert.throws(()=>restoreStaffPitch(d),/수정/);assert.deepEqual(d,before);
 }
 const tab=convert(firstBar,0);delete tab.pdfTabImport.notation;
 assert.equal(staffPitchRepairState(tab),null);assert.equal(restoreStaffPitch(tab),tab);
});
test('repair keeps an out-of-range source pitch explicit instead of silently shifting it again',()=>{
 const d=restoreStaffPitch(convert(header+'note-C3_whole+barline',0)),n=d.measures[0].events[0].notes[0];
 assert.equal(n.unplaced,true);assert.equal(n.midi,36);assert.deepEqual(compileDocumentV2(d).errors,[]);
});
test('a bar longer than the meter retains recognized durations rather than compressing rhythm',()=>{
 const d=convert(header+'note-D5_half.+note-D5_half.+barline');
 assert.deepEqual(d.measures[0].events.map(e=>[e.duration,e.dotted]),[['2',true],['2',true]]);assert(compileDocumentV2(d).issues.length);
});

test('beamed eighth-note patterns retain their half-beat onsets while awaiting source review',()=>{
 const d=convert(header+'rest-eighth+note-A4_eighth+note-A4_eighth+note-G4_eighth+note-A4_eighth+note-G4_eighth+note-A4_eighth+note-B4_eighth+barline+note-A4_eighth+note-G4_eighth+note-E4_eighth+note-D4_eighth+note-D4_half+barline');
 assert.deepEqual(d.measures[0].events.map(e=>e.duration),Array(8).fill('8'));
 assert.deepEqual(d.measures[0].events.map(e=>e.onset),[0,240,480,720,960,1200,1440,1680]);
 assert.deepEqual(d.measures[1].events.map(e=>e.duration),['8','8','8','8','2']);
 assert.equal(d.measures[0].pdfImport.needsReview,true);
 assert(d.measures[0].events.every(e=>e.pdfImport.rhythmVerified));
 assert.deepEqual(compileDocumentV2(d).errors,[]);
});

test('32nd notes and rests preserve pitches, timing and playback compilation instead of becoming gaps',()=>{
 const d=convert(header+'note-C5_thirty_second+rest-thirty_second+note-D5_sixteenth.+note-E5_thirty_second+note-F5_eighth.+note-G5_thirty_second+note-A5_half+note-A5_sixteenth.+barline');
 assert.deepEqual(d.measures[0].events.map(e=>e.duration),['32','32','16','32','8','32','2','16']);
 assert(d.measures[0].events.every(e=>!e.blank));assert.equal(d.measures[0].events[1].rest,true);
 assert.deepEqual(d.measures[0].events.map(e=>e.onset),[0,60,120,300,360,720,780,1740]);
 const compiled=compileDocumentV2(d);assert.equal(compiled.errors.length,0);assert.equal(d.measures[0].pdfImport.rhythmVerified,true);
 const timeline=scoreTimeline(compiled.score,60);assert.equal(timeline.duration,4);assert.equal(timeline.events[0].duration,.125);assert.equal(timeline.events[1].start,.25);
});
test('unplayable staff pitches are preserved and marked unplaced without an invented octave shift',()=>{
 const d=convert(header+'note-C2_whole+barline',0);assert.equal(d.measures[0].events[0].notes[0].midi,36);assert.equal(d.measures[0].events[0].notes[0].unplaced,true);assert.deepEqual(compileDocumentV2(d).errors,[]);
});
test('photo batches sort page numbers naturally, deduplicate and validate limits before replacement',()=>{
 const file=name=>({name,size:1,lastModified:1});
 assert.deepEqual(photoFilesToAdd([],['page10.jpg','page2.jpg','page1.jpg'].map(file)).map(f=>f.name),['page1.jpg','page2.jpg','page10.jpg']);
 assert.equal(photoFilesToAdd([file('page1.jpg')],[file('page1.jpg')]).length,0);
 assert.throws(()=>photoFilesToAdd([],Array.from({length:21},(_,i)=>file(`${i}.jpg`))),/20/);
 assert.throws(()=>photoFilesToAdd([],[file('file.pdf')]),/JPG/);
 assert.throws(()=>photoFilesToAdd([],[{...file('1.jpg'),size:25e6},{...file('2.jpg'),size:25e6}]),/40MB/);
});
test('staff engine cancellation and silence terminate the worker before readiness',async()=>{
 const OriginalWorker=globalThis.Worker,workers=[];globalThis.Worker=class{constructor(){workers.push(this);}postMessage(){}terminate(){this.closed=true;}};
 try{const controller=new AbortController(),promise=createStaffOmrClient(controller.signal);controller.abort();await assert.rejects(promise,{name:'AbortError'});assert(workers[0].closed);await assert.rejects(createStaffOmrClient(undefined,{timeout:5}),/초과/);assert(workers[1].closed);}finally{globalThis.Worker=OriginalWorker;}
});
