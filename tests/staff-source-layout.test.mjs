import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStaffTokens,staffSystemToAnalysis} from '../src/omr/staffTokens.js';
import {reconcileStaffBarCount,boundedStaffReading} from '../src/omr/staffMeasureRecognition.js';
import {staffBarMarks,staffEndingBrackets} from '../src/omr/staffBarMarks.js';
import {applyImportedNavigation} from '../src/pdf/tab-import/importedNavigation.js';
import {notationBarBounds} from '../src/pdf/tab-import/chordGeometry.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {measureLayout,scoreLineSettings} from '../src/etudes/measureLayout.js';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';

const parse=body=>parseStaffTokens('clef-G2+keySignature-CM+'+body+'+barline');
const system=count=>({id:1,rect:{x:0,y:0,width:100*count,height:80},width:100*count,height:80,rgba:new Uint8ClampedArray(count*100*80*4).fill(255).buffer,staff:{spacing:10},measures:Array.from({length:count},(_,i)=>({x:i*100,width:100,height:40,stems:[],slashes:[]}))});
test('extra decoded end bars are removed only after two complete readings of every physical measure agree',async()=>{
 const original=parse('note-C5_whole+barline+note-D5_whole+barline+note-E5_whole');let calls=0;
 const fixed=await reconcileStaffBarCount({recognize:async()=>({text:'clef-G2+note-'+(++calls<=2?'C':'D')+'5_whole+barline'})},system(2),original);
 assert.equal(fixed.measures.length,2);assert.equal(calls,4);assert(fixed.barCountRetry.accepted);
 assert.deepEqual(fixed.measures.flatMap(b=>b.events.map(e=>e.notes[0].midi)),[72,74]);
 assert.equal(original.measures.length,3);assert.equal(fixed.raw,original.raw);
});
test('boundary disagreement, missing source evidence or failed rereads cannot silently delete real bars',async()=>{
 const original=parse('note-C5_whole+barline+note-D5_whole+barline+note-E5_whole');let calls=0;
 const fixed=await reconcileStaffBarCount({recognize:async()=>({text:'clef-G2+note-'+('CDEF'[calls++])+'5_whole'})},system(2),original);
 assert.deepEqual(fixed.measures,original.measures);assert(!fixed.barCountRetry.accepted);assert(fixed.warnings.includes('source-bar-count-mismatch'));assert.equal(calls,4);
 const failed=await reconcileStaffBarCount({recognize:async()=>{throw Error('offline');}},system(2),original);assert.deepEqual(failed.measures,original.measures);
 assert.equal(await reconcileStaffBarCount({},system(3),original),original);
 const controller=new AbortController();controller.abort();await assert.rejects(reconcileStaffBarCount({},system(2),original,{signal:controller.signal}),{name:'AbortError'});
});
test('a decoder tail on one physical crop is ignored only when all source stems are accounted for',()=>{
 const reading=parse('note-C5_half.+note-C5_eighth+note-D5_eighth+barline+note-E5_whole'),ink={height:40,stems:[{x:10},{x:30},{x:50}],slashes:[]};
 assert.equal(boundedStaffReading(reading,ink).measures.length,1);
 assert.equal(boundedStaffReading(reading,{...ink,stems:[...ink.stems,{x:70}]}),reading);
 const incomplete=parse('note-C5_half+note-D5_eighth+barline+note-E5_whole');assert.equal(boundedStaffReading(incomplete,{...ink,stems:ink.stems.slice(1)}),incomplete);
 const empty=parse('rest-whole+barline+rest-whole');assert.equal(boundedStaffReading(empty,{...ink,stems:[]}),empty);
});
test('more detected boxes alone cannot invent new bars from unknown ending symbols',async()=>{
 const original=parse('note-C5_whole');let calls=0;
 const fixed=await reconcileStaffBarCount({recognize:async()=>({text:'clef-G2+note-'+(++calls<=2?'C':'D')+'5_whole'})},system(2),original);
 assert.deepEqual(fixed.measures,original.measures);assert(!fixed.barCountRetry.accepted);assert.equal(calls,0);
});

const inkPage=()=>{
 const width=600,height=220,ink=new Uint8Array(width*height),staff={x:20,y:70,width:560,height:80,spacing:20,thickness:1,lines:[70,90,110,130,150]};
 const rect=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)ink[yy*width+xx]=1;};
 for(const y of staff.lines)rect(20,y,560,1);
 return {width,ink,staff,rect};
};
test('repeat dots plus double strokes survive scale-independent detection and exclude a long clef preamble',()=>{
 const {width,ink,staff,rect}=inkPage();rect(160,70,5,81);rect(173,70,1,81);rect(360,70,1,81);rect(560,70,1,81);rect(572,70,6,81);
 for(const y of [98,118]){rect(185,y,5,5);rect(546,y,5,5);}
 assert.equal(staffBarMarks(ink,width,staff,162).repeatStart,true);assert.equal(staffBarMarks(ink,width,staff,573).repeatEnd,true);
 const bars=notationBarBounds(ink,width,staff);assert.equal(bars.length,2);assert(bars[0].x>=160);
});
test('a plain/double/final barline and a single augmentation dot are not repeats',()=>{
 const {width,ink,staff,rect}=inkPage();rect(240,70,1,81);rect(400,70,1,81);rect(411,70,5,81);rect(385,98,5,5);
 assert.deepEqual(staffBarMarks(ink,width,staff,240),{});
 const mark=staffBarMarks(ink,width,staff,412);assert(!mark.repeatStart&&!mark.repeatEnd);assert.equal(mark.endBarline,'final');
});
test('ending brackets defer partial repeat navigation without touching notes; ordinary beams do not',()=>{
 const {width,ink,staff,rect}=inkPage();rect(100,25,300,1);rect(100,25,1,18);
 const brackets=staffEndingBrackets(ink,width,staff);assert.equal(brackets.length,1);
 const doc={pdfTabImport:{notation:{systems:[{endingBrackets:brackets}]}},measures:[{repeatStart:true,events:[{rest:true,duration:'1'}],pdfImport:{reasons:[]}},{repeatEnd:true,events:[{rest:true,duration:'1'}],pdfImport:{reasons:[]}}]},events=doc.measures.map(m=>m.events);
 const result=applyImportedNavigation(doc);assert(result.pdfTabImport.notation.repeatNavigationPending);assert(result.measures[0].pdfImport.repeatMarks.repeatStart);assert(result.measures[1].pdfImport.repeatMarks.repeatEnd);assert(result.measures.every(m=>!m.repeatStart&&!m.repeatEnd));assert.deepEqual(result.measures.map(m=>m.events),events);
 const beam=inkPage();beam.rect(100,25,300,6);beam.rect(100,25,1,60);assert.deepEqual(staffEndingBrackets(beam.ink,width,beam.staff),[]);
});
test('unmatched or nested imported repeat signs cannot disable previously working playback',()=>{
 for(const marks of [[{}, {repeatEnd:true}],[{repeatStart:true},{}],[{repeatStart:true},{repeatStart:true},{repeatEnd:true}]]){
  const doc={pdfTabImport:{notation:{systems:[]}},measures:marks.map(mark=>({...mark,events:[],pdfImport:{reasons:[]}}))};
  const result=applyImportedNavigation(doc);assert(result.pdfTabImport.notation.repeatNavigationPending);assert(result.measures.every(m=>!m.repeatStart&&!m.repeatEnd));
  assert(result.measures.some(m=>m.pdfImport.reasons.includes('repeat-pair-unverified')));
 }
});

test('import saves uneven 5/6/2-measure source systems and repeat marks without altering musical events',()=>{
 const makeStaff=(id,count)=>{const s=system(count);s.id=id;s.measures[0].repeatStart=id===1;s.measures.at(-1).repeatEnd=id===2;return staffSystemToAnalysis(parse(Array(count).fill('note-C5_whole').join('+barline+')),{system:s,page:1,width:1000,height:1000}).staff;};
 const doc=analysisToDocument({fileName:'any-photo.jpg',pages:[{page:1,notation:true,staffs:[makeStaff(1,5),makeStaff(2,6),makeStaff(3,2)]}],summary:{}});
 assert.equal(doc.measures.length,13);assert.equal(doc.viewSettings.measuresPerRow,6);assert.deepEqual(doc.pdfTabImport.sourceSystems.map(s=>s.count),[5,6,2]);
 assert(doc.measures[0].repeatStart);assert(doc.measures[10].repeatEnd);assert.deepEqual(compileDocumentV2(doc).errors,[]);
 const saved=JSON.parse(JSON.stringify(doc)),settings=scoreLineSettings(saved),layout=measureLayout(saved.measures,settings.perRow,settings.breaks);
 assert.deepEqual([1,2,3].map(row=>layout.filter(p=>p.row===row).length),[5,6,2]);
 const manual=scoreLineSettings(saved,5);assert.deepEqual(manual.breaks,[]);assert.deepEqual([1,2,3].map(row=>measureLayout(saved.measures,manual.perRow,manual.breaks).filter(p=>p.row===row).length),[5,5,3]);
 assert.deepEqual(scoreLineSettings(saved),settings);assert.deepEqual(saved.measures,doc.measures);
});
test('rows support 5 through 12 bars, incomplete last rows, and stable source break IDs after deletion',()=>{
 const bars=Array.from({length:25},(_,i)=>({id:String(i)}));
 for(let n=5;n<=12;n++){const layout=measureLayout(bars,n);assert.equal(layout.filter(p=>p.row===1).length,n);assert.equal(layout.length,25);assert(layout.every(p=>p.column+p.span<=13.000001));}
 const remaining=bars.filter(b=>b.id!=='5');assert.equal(measureLayout(remaining,6,['6']).find(p=>p.id==='6').row,2);
 assert.equal(measureLayout(bars,Infinity).filter(p=>p.row===1).length,12);
});
