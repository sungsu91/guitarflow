import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankDocument,blankEvent,newId,compileDocumentV2,ticksOf} from '../src/etudes/scoreModel.js';
import {tabRepeatMask,tabRepeatState,toggleTabRepeat} from '../src/etudes/tabRepeat.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {copyScoreRange,pasteScoreRange} from '../src/etudes/scoreRangeClipboard.js';
import {reconcileImportedEdits} from '../src/pdf/tab-import/scoreAdapter.js';
import {drawTabRhythm} from '../src/etudes/tabRhythm.js';

function fixture(){
 const d=createBlankDocument();
 d.measures=Array.from({length:2},()=>({id:newId('bar'),chord:null,events:Array.from({length:8},(_,i)=>({...blankEvent(i*240,'8'),rest:false,blank:false,pickStroke:i%2?'up':'down',notes:[{id:newId('tone'),string:1,fret:0},{id:newId('tone'),string:2,fret:2},{id:newId('tone'),string:3,fret:2}]}))}));
 return d;
}

test('repeat display preserves exact pitches, rhythms, directions, playback and persisted data',()=>{
 const d=fixture(),before=structuredClone(d),enabled=toggleTabRepeat(d,0);
 assert.deepEqual(d,before);
 assert.deepEqual(tabRepeatMask(enabled.measures[0].events),[false,true,true,true,true,true,true,true]);
 assert.deepEqual(enabled.measures[1],d.measures[1]);
 const compiled=compileDocumentV2(JSON.parse(JSON.stringify(enabled)));
 assert.deepEqual(compiled.errors,[]);
 assert.deepEqual(scoreTimeline(compiled.score),scoreTimeline(compileDocumentV2(d).score));
 assert.deepEqual(tabRepeatMask(compiled.score.measures[0]),tabRepeatMask(enabled.measures[0].events));
 assert.deepEqual(toggleTabRepeat(enabled,0),d);
});

test('changed frets, rests and unselected boundaries reveal numbers again',()=>{
 let d=toggleTabRepeat(fixture(),0),events=d.measures[0].events;
 events[2].notes[0].fret=3;
 events[4]={...blankEvent(960,'8'),rest:true,blank:false};
 events[6].tabRepeat=false;
 assert.deepEqual(tabRepeatMask(events),[false,true,false,false,false,false,false,false]);
 events[2].notes[0].fret=0;
 assert.equal(tabRepeatMask(events)[2],true,'recomputed after a fret edit');
 events[1].onset=300;
 assert.equal(tabRepeatMask(events)[1],false,'a silent gap must not inherit a hidden grip');
});

test('reverse selections span bars while retaining each bar and range first grip',()=>{
 const d=fixture(),range={start:{bar:1,event:3},end:{bar:0,event:2}},enabled=toggleTabRepeat(d,0,range);
 assert.deepEqual(tabRepeatMask(enabled.measures[0].events),[false,false,false,true,true,true,true,true]);
 assert.deepEqual(tabRepeatMask(enabled.measures[1].events),[false,true,true,true,false,false,false,false]);
 assert.equal(tabRepeatState(enabled,0,range).enabled,true);
 assert.deepEqual(toggleTabRepeat(enabled,0,range),d);
 assert.equal(tabRepeatState(d,0,{start:{bar:7,event:0},end:{bar:8,event:1}}).available,false);
});

test('copy/paste keeps preference, but pasted first or changed grip is visible',()=>{
 const d=toggleTabRepeat(fixture(),0),clip=copyScoreRange(d,{start:{bar:0,event:1},end:{bar:0,event:3}});
 const pasted=pasteScoreRange(d,{bar:1,event:0},clip);
 assert.deepEqual(tabRepeatMask(pasted.measures[1].events),[false,true,true,false,false,false,false,false]);
 pasted.measures[1].events[1].notes[0].fret=7;
 assert.deepEqual(tabRepeatMask(pasted.measures[1].events).slice(0,3),[false,false,false]);
});

test('single notes, special articulations, connections and unknown imports are never hidden',()=>{
 for(const transform of [e=>{e.notes=e.notes.slice(0,1);},e=>{e.dead=true;},e=>{e.notes[0].unplaced=true;},e=>{e.notes[0].harmonic=true;},e=>{e.notes[0].parenthesized=true;},e=>{e.notes[0].bendEffect={amount:2,phase:'up'};},e=>{e.technique='S';},e=>{e.voice='melody';},e=>{e.pdfImport={status:'unresolved',pendingStrings:[4]};}]){
  const d=fixture();transform(d.measures[0].events[1]);
  assert.equal(tabRepeatMask(toggleTabRepeat(d,0).measures[0].events)[1],false);
 }
 const d=fixture();d.measures[0].events[0].tieTo=d.measures[0].events[1].id;
 assert.deepEqual(tabRepeatMask(toggleTabRepeat(d,0).measures[0].events).slice(0,3),[false,false,false]);
 d.instrument='piano';assert.deepEqual(tabRepeatState(d,0),{available:false,enabled:false});
});

test('display edits cannot resolve imported review markers or accept invalid flags',()=>{
 const d=fixture();d.measures[0].events[1].pdfImport={status:'unresolved',rhythmVerified:false,pendingStrings:[4]};
 const after=toggleTabRepeat(d,0),reconciled=reconcileImportedEdits(d,after);
 assert.deepEqual(reconciled.measures[0].events[1].pdfImport,d.measures[0].events[1].pdfImport);
 after.measures[0].events[0].tabRepeat='yes';assert.ok(compileDocumentV2(after).errors.some(e=>e.includes('반복 운지')));
});

test('slash rhythm connects to slash endpoints, retaining beams, flags, dots and tuplets',()=>{
 const original=globalThis.document;
 const node=()=>({dataset:{},attributes:{},children:[],setAttribute(k,v){this.attributes[k]=v;},append(child){this.children.push(child);}});
 globalThis.document={createElementNS:node};
 try{
  const tab={getYForLine:i=>100+i*16,getNumLines:()=>6};
  const events=[{duration:'8',dotted:true,string:1,tones:[{string:1},{string:6}]},{duration:'16',string:1,tones:[{string:1},{string:6}]}];
  const tabs=[{getStemX:()=>50,tabRepeat:true},{getStemX:()=>90,tabRepeat:true}];
  for(const position of ['above','below','detached']){
   const svg=node();drawTabRhythm(svg,events,tabs,tab,[],position);
   const marks=svg.children[0].children,stems=marks.filter(n=>n.attributes.class==='tabRhythmStem');
   assert.equal(marks.filter(n=>n.attributes.class==='tabRhythmChordStem').length,0);
   assert.equal(stems[0].attributes.x1,position==='above'?55:45);
   if(position!=='detached')assert.equal(stems[0].attributes.y1,140+(position==='above'?-8.8:8.8));
   assert.equal(marks.filter(n=>n.attributes.class==='tabRhythmDot').length,1);
   assert.deepEqual(marks.filter(n=>n.attributes.class==='tabRhythmFlag').map(n=>n.dataset.flagDuration),['8','16']);
  }
  const tuplets=events.concat({...events[1]}).map((e,i)=>({...e,duration:'8',dotted:false,onset:i*160,tuplet:{actualNotes:3,normalNotes:2,groupId:'triplet'}}));
  const svg=node();drawTabRhythm(svg,tuplets,[...tabs,{getStemX:()=>130,tabRepeat:true}],tab,[{indices:[0,1,2],xs:[50,90,130],levels:[[{start:50,end:130}],[]]}]);
  assert.equal(svg.children[0].children.filter(n=>n.attributes.class==='tabRhythmBeam').length,2);
  assert.equal(svg.children[0].children.filter(n=>n.attributes.class==='tabRhythmTuplet').length,1);
  assert.equal(tuplets.reduce((n,e)=>n+ticksOf(e),0),480);
 }finally{globalThis.document=original;}
});
