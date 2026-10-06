import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createBlankDocument,blankMeasure,compileDocumentV2} from '../src/etudes/scoreModel.js';
import {inputRhythm} from '../src/etudes/rhythmInput.js';
import {setEntryDuration,setEventDuration,nextEntry} from '../src/etudes/editorCommands.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {saveLibraryDocument,loadLibrary} from '../src/etudes/scoreLibrary.js';

// Independent quarter-beat recipes: never derive the oracle from ticksOf.
const recipes=[
 [{duration:'4',ticks:480}],
 Array.from({length:2},()=>({duration:'8',ticks:240})),
 Array.from({length:4},()=>({duration:'16',ticks:120})),
 Array.from({length:8},()=>({duration:'32',ticks:60})),
 [{duration:'8',ticks:360,dotted:true},{duration:'16',ticks:120}],
 [{duration:'16',ticks:180,dotted:true},{duration:'16',ticks:180,dotted:true},{duration:'16',ticks:120}],
 [{duration:'32',ticks:90,dotted:true},{duration:'32',ticks:90,dotted:true},{duration:'16',ticks:120},{duration:'16',ticks:120},{duration:'32',ticks:60}],
 Array.from({length:3},()=>({duration:'8',ticks:160,count:3})),
 Array.from({length:6},()=>({duration:'16',ticks:80,count:6})),
 Array.from({length:12},()=>({duration:'32',ticks:40,count:3})),
 Array.from({length:12},()=>({duration:'32',ticks:40,count:6})),
];
const toneArb=fc.record({string:fc.integer({min:1,max:6}),fret:fc.integer({min:0,max:24})});
const beatArb=fc.record({recipe:fc.integer({min:0,max:recipes.length-1}),tones:fc.array(toneArb,{minLength:12,maxLength:12}),rests:fc.array(fc.boolean(),{minLength:12,maxLength:12}),chord:fc.boolean()});
const scenario=fc.record({beats:fc.constantFrom(2,3,4,6),strings:fc.constantFrom(4,5,6),bpm:fc.integer({min:30,max:240}),chunks:fc.array(beatArb,{minLength:6,maxLength:6})});

test('generated mixed rhythms preserve notes, local meters, save/load and playback',()=>{
 const seed=Number(process.env.SCORE_CHECK_SEED??20261005),numRuns=Number(process.env.SCORE_CHECK_RUNS??250);
 assert(Number.isSafeInteger(seed)&&Number.isSafeInteger(numRuns)&&numRuns>0&&numRuns<=10000);
 const result=fc.check(fc.property(scenario,s=>{
  let d=createBlankDocument();d.measures=[blankMeasure([s.beats,4])];d.measures[0].meter=[s.beats,4];
  if(s.strings<6){d.instrument='bass';d.tuning=s.strings===4?[43,38,33,28]:[43,38,33,28,23];}
  const expected=[];let onset=0,index=0;
  for(const chunk of s.chunks.slice(0,s.beats))for(const [i,recipe] of recipes[chunk.recipe].entries()){
   const string=(chunk.tones[i].string-1)%s.strings+1,rest=chunk.rests[i];
   const notes=rest?[]:[{string,fret:chunk.tones[i].fret}];
   if(!rest&&chunk.chord)notes.push({string:string%s.strings+1,fret:(chunk.tones[i].fret+11)%25});
   const mode={selectedDuration:recipe.duration,dottedMode:recipe.dotted?'one-shot':'off',tupletMode:recipe.count?'active':'off',tupletCount:recipe.count??3};
   d=inputRhythm(d,{bar:0,event:index,string},mode,rest?'rest':'note',chunk.tones[i].fret).document;
   for(const n of notes.slice(1))d=inputRhythm(d,{bar:0,event:index,string:n.string},mode,'note',n.fret).document;
   expected.push({onset,...recipe,rest,notes});onset+=recipe.ticks;index++;
  }
  const compiled=compileDocumentV2(d);assert.deepEqual(compiled.errors,[]);assert.deepEqual(compiled.issues,[]);
  assert.equal(d.measures[0].events.length,expected.length);
  for(const [i,e] of expected.entries()){
   const actual=d.measures[0].events[i];assert.equal(actual.onset,e.onset);assert.equal(actual.duration,e.duration);
   assert.equal(!!actual.dotted,!!e.dotted);assert.equal(actual.rest,e.rest);assert.equal(actual.tuplet?.actualNotes,e.count);
   assert.deepEqual(actual.notes.map(({string,fret})=>({string,fret})),e.notes);
  }
  const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  assert(saveLibraryDocument(storage,d).saved);assert.deepEqual(loadLibrary(storage).records[d.id].document,d);
  const timeline=scoreTimeline(compiled.score,s.bpm),secondsPerTick=60/s.bpm/480;
  assert(Math.abs(timeline.duration-s.beats*60/s.bpm)<1e-8);
  assert.equal(timeline.events.length,expected.reduce((n,e)=>n+e.notes.length,0));
  const sounds=expected.flatMap(e=>e.notes.map(n=>({id:d.measures[0].events[expected.indexOf(e)].id,...n,onset:e.onset,ticks:e.ticks})));
  for(const e of sounds){const actual=timeline.events.find(n=>n.id===e.id&&n.string===e.string);assert(actual);assert.equal(actual.midi,d.tuning[e.string-1]+e.fret);assert(Math.abs(actual.start-e.onset*secondsPerTick)<1e-8);assert(Math.abs(actual.duration-e.ticks*secondsPerTick)<1e-8);}
 }),{seed,numRuns,...(process.env.SCORE_CHECK_PATH?{path:process.env.SCORE_CHECK_PATH}:{})});
 if(result.failed){
  mkdirSync('artifacts/quality-lab/failures',{recursive:true});
  writeFileSync('artifacts/quality-lab/failures/score-property.json',JSON.stringify({seed:result.seed,path:result.counterexamplePath,runs:result.numRuns,shrinks:result.numShrinks,counterexample:result.counterexample,error:String(result.errorInstance),replay:`SCORE_CHECK_SEED=${result.seed} SCORE_CHECK_PATH=${result.counterexamplePath} node --test tests/score-properties.test.mjs`},null,2));
 }
 assert.equal(result.failed,false,`seed=${result.seed} path=${result.counterexamplePath??''}: ${result.errorInstance??''}`);
});

test('editing and continuing a changed meter retains that measure capacity',()=>{
 for(const beats of [2,3,6]){
  let d=createBlankDocument();d.measures=[blankMeasure([beats,4])];d.measures[0].meter=[beats,4];
  const cursor={bar:0,event:0,string:1};
  d=inputRhythm(d,cursor,{selectedDuration:'4'},'note',12).document;
  d=setEntryDuration(d,cursor,'32');assert.deepEqual(compileDocumentV2(d).issues,[]);
  const last=d.measures[0].events.length-1,tail=d.measures[0].events[last];
  assert.equal(tail.onset+1920/Number(tail.duration),beats*480);
  assert.throws(()=>setEventDuration(d,{...cursor,event:last},'1'));
  const next=nextEntry(d,{...cursor,event:last});assert.equal(next.cursor.bar,1);
  assert.equal(next.document.measures[1].events.length,beats);
  assert.deepEqual(compileDocumentV2(next.document).issues,[]);
 }
});
