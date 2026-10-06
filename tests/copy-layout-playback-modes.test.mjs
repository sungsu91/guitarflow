import test from 'node:test';
import assert from 'node:assert/strict';
import {navigationScores,copyLayoutAnalysis} from './fixtures/copy-playback-scores.mjs';
import {compileDocumentV2,createBlankDocument} from '../src/etudes/scoreModel.js';
import {analysisToDocument} from '../src/pdf/tab-import/scoreAdapter.js';
import {scoreLineSettings,measureLayout} from '../src/etudes/measureLayout.js';
import {scoreBarOrder} from '../src/etudes/scoreRepeats.js';
import {scoreTimeline,guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';
import {playbackRoute,playbackCycles} from '../src/etudes/scorePlaybackMode.js';
import {playbackSlots,seekTick,slotAtTick} from '../src/etudes/scorePlaybackPosition.js';
import {rhythmTimeline,rhythmStateAt} from '../src/etudes/rhythmProgress.js';
import {paginateScoreRows} from '../src/etudes/desktopScorePages.js';

for(const {name,document,expected} of navigationScores())test(`${name}: full route, middle start, pause/tempo resume, restart and loop precedence`,()=>{
 const before=structuredClone(document),compiled=compileDocumentV2(document);assert.deepEqual(compiled.errors,[]);assert.deepEqual(compiled.issues,[]);const score=compiled.score;
 const full=playbackRoute(score);assert.equal(full.mode,'score');assert.deepEqual(scoreBarOrder(score,full),expected);
 assert.equal(playbackCycles({practice:true,route:full}),1);
 for(let iteration=0;iteration<12;iteration++){
  const from={bar:iteration%5+1,event:0},route=playbackRoute(score,from),linear=Array.from({length:6-from.bar},(_,i)=>from.bar+i);
  assert.equal(route.mode,'linear');assert.deepEqual(scoreBarOrder(score,route),linear);
  assert.equal(playbackCycles({practice:true,route,repeatCount:0}),1);
  for(const bpm of [60,137,240]){
   const t=scoreTimeline(score,bpm,true,route),voices=guitarVoiceTimeline(score,bpm,route),slots=playbackSlots(score,t.order);
   assert.deepEqual(t.order,linear);assert.deepEqual(voices.order,linear);assert.equal(t.events[0].bar,from.bar);assert.equal(t.events[0].start,0);
   const paused={timelineTick:240,route,resume:true},resumed=playbackRoute(score,paused);assert.deepEqual(resumed,route);assert.equal(seekTick(slots,paused),240);assert.equal(slotAtTick(slots,240).bar,from.bar);
   assert.deepEqual(rhythmStateAt(rhythmTimeline(score,route),0).notes,[`${from.bar}:0`]);
  }
  // Seeking back to bar 1 starts a fresh repeat state, every time.
  assert.deepEqual(scoreBarOrder(score,playbackRoute(score,{bar:0,event:0})),expected);
 }
 const loopScore={...score,practiceRange:{start:1,end:3}},route=playbackRoute(loopScore,{bar:5,event:0});
 assert.equal(route.mode,'practice-loop');assert.deepEqual(scoreBarOrder(loopScore,route),[1,2,3]);assert.equal(playbackCycles({practice:true,route,repeatCount:0}),Infinity);
 assert.deepEqual(document,before);
});

test('repeat-pass position survives resume; a seek does not inherit an old repeat visit',()=>{
 const score=compileDocumentV2(navigationScores()[0].document).score,route=playbackRoute(score),slots=playbackSlots(score,scoreBarOrder(score));
 const from={timelineTick:4*480+120,route,resume:true};assert.deepEqual(playbackRoute(score,from),route);assert.equal(slotAtTick(slots,seekTick(slots,from)).visit,4);
 assert.deepEqual(scoreBarOrder(score,playbackRoute(score,{bar:1,event:0})),[1,2,3,4,5]);
});

test('linear checks and practice loops ignore even incomplete navigation',()=>{
 const score=compileDocumentV2(navigationScores()[0].document).score;delete score.document.measures[2].repeatEnd;
 assert.throws(()=>scoreBarOrder(score));assert.deepEqual(scoreBarOrder(score,{mode:'linear',startBar:2}),[2,3,4,5]);
 assert.deepEqual(scoreBarOrder({...score,practiceRange:{start:0,end:1}}),[0,1]);
});

test('PDF copy preserves uneven source rows and page boundaries through serialization and reader Auto',()=>{
 const analysis=copyLayoutAnalysis(),before=structuredClone(analysis),doc=JSON.parse(JSON.stringify(analysisToDocument(analysis))),settings=scoreLineSettings(doc);
 const placements=measureLayout(doc.measures,settings.perRow,settings.breaks),rows=[...new Set(placements.map(p=>p.row))].map(row=>placements.filter(p=>p.row===row));
 assert.deepEqual(rows.map(row=>row.length),[4,5,3,4,2]);
 const pages=paginateScoreRows(rows.map((row,i)=>({start:i*100,end:(i+1)*100,pageBreak:settings.pageBreaks.includes(row[0].id)})),{height:1000,heading:0});
 assert.deepEqual(pages.map(p=>[p.first,p.last]),[[0,1],[2,3],[4,4]]);
 assert.deepEqual(analysis,before);assert.equal(doc.measures.length,18);assert.deepEqual(compileDocumentV2(doc).errors,[]);
 const manual=scoreLineSettings(doc,2);assert.deepEqual(manual.breaks,[]);assert.deepEqual(manual.pageBreaks,[]);assert.deepEqual(scoreLineSettings(doc),settings);
});

test('incomplete source evidence falls back without duplicating, discarding or changing any musical event',()=>{
 for(const corrupt of [d=>d.pdfTabImport.sourceSystems[0].measureIds.pop(),d=>d.pdfTabImport.sourceSystems[0].count=40,d=>d.pdfTabImport.sourceSystems[1].page=0,d=>d.measures[0].pdfImport.reasons.push('source-bar-count-mismatch')]){
  const doc=analysisToDocument(copyLayoutAnalysis());corrupt(doc);const before=structuredClone(doc),settings=scoreLineSettings(doc);
  assert.equal(settings.source,false);assert.equal(settings.perRow,4);assert.deepEqual(settings.pageBreaks,[]);
  assert.equal(measureLayout(doc.measures,settings.perRow,settings.breaks).length,doc.measures.length);assert.deepEqual(doc,before);
 }
});

test('ordinary scores, photo imports and manual editing do not get forced PDF page layout',()=>{
 const plain=createBlankDocument();plain.viewSettings.measuresPerRow=3;assert.equal(scoreLineSettings(plain).perRow,3);assert.deepEqual(scoreLineSettings(plain).pageBreaks,[]);
 const image=analysisToDocument({...copyLayoutAnalysis(),sourceType:'image'});assert.deepEqual(scoreLineSettings(image).pageBreaks,[]);
 const manual=analysisToDocument(copyLayoutAnalysis());manual.viewSettings={...manual.viewSettings,sourceLayout:false,measuresPerRow:2,systemBreaks:[]};assert.equal(scoreLineSettings(manual).perRow,2);assert.deepEqual(scoreLineSettings(manual).pageBreaks,[]);
});

test('unpaired repeat evidence in a TAB PDF does not crash import or replace recognized notes',()=>{
 const analysis=copyLayoutAnalysis([[4]]);analysis.pages[0].staffs[0].measures[2].repeatEnd=true;
 const doc=analysisToDocument(analysis);assert.equal(doc.measures.length,4);assert(doc.pdfTabImport.repeatNavigationPending);
 assert(!doc.measures[2].repeatEnd);assert(doc.measures[2].pdfImport.repeatMarks.repeatEnd);
 assert.deepEqual(doc.measures.map(m=>m.events[0].notes[0].fret),[1,2,3,4]);
 assert.deepEqual(scoreBarOrder(compileDocumentV2(doc).score),[0,1,2,3]);
});

test('a crowded source page overflows readably before respecting the next source page boundary',()=>{
 const rows=Array.from({length:7},(_,i)=>({start:i*300,end:(i+1)*300,pageBreak:i===5}));
 const pages=paginateScoreRows(rows,{height:1000,heading:0});assert.deepEqual(pages.map(p=>[p.first,p.last]),[[0,2],[3,4],[5,6]]);
 assert.deepEqual(pages.flatMap(p=>Array.from({length:p.last-p.first+1},(_,i)=>p.first+i)),[0,1,2,3,4,5,6]);
});
