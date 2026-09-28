import test from 'node:test';
import assert from 'node:assert/strict';
import {setNoteAction,validateBeat} from '../src/rhythm-trainer/rhythmMath.js';
import {createPattern,validPattern,repairTies,readStore,STORAGE_KEY,replacePatternBeat,matchesBeatPreset} from '../src/rhythm-trainer/model.js';
import {compileGuideBar,guidePatterns,GUIDE_METERS,GuideTransport} from '../src/rhythm-trainer/guideModel.js';
import {beatPositions,guideCursorX,scoreCursorX} from '../src/rhythm-trainer/notationLayout.js';
globalThis.cancelAnimationFrame=()=>{};
const note=ticks=>({ticks,rest:false});
const mute=ticks=>setNoteAction(note(ticks),'mute');

test('muted hits persist separately from rests and cannot sustain a tie',()=>{
 const source={...note(6),tie:true};
 assert.deepEqual(setNoteAction(source,'mute'),{ticks:6,rest:false,muted:true});assert.equal(source.tie,true);
 assert.deepEqual(setNoteAction(mute(6),'hit'),note(6));assert.deepEqual(setNoteAction(mute(6),'rest'),{ticks:6,rest:true});
 assert.equal(validateBeat([{...mute(12),rest:true}]),false);assert.equal(validateBeat([{...mute(12),tie:true}]),false);
 let p=createPattern();p.title='Muted strum';p.measures[0][0]=[note(6),{...note(6),tie:true}];
 p=replacePatternBeat(p,0,1,[mute(12)]);assert.equal(p.measures[0][0][1].tie,undefined);assert.equal(validPattern(p),true);
 assert.equal(matchesBeatPreset([mute(12)],[note(12)]),false);
 const store=readStore({getItem:key=>key===STORAGE_KEY?JSON.stringify({patterns:[p],draft:p}):null});assert.deepEqual(store.patterns[0],p);
 assert.deepEqual(repairTies(p),p);
});

test('every meter has muted guide examples with an audible attack and silence after release',()=>{
 for(const meter of GUIDE_METERS){
  const p=guidePatterns(meter).find(p=>p.id==='mute-eighths'),bar=compileGuideBar(p,meter);
  assert.ok(bar.groups.every(g=>g.cells.some(c=>c.kind==='mute')));
  if(!bar.compound)assert.deepEqual(bar.groups[0].cells.map(c=>c.kind),['hit','hold','mute','rest']);
  const mixed=compileGuideBar(guidePatterns(meter).find(p=>p.id==='mute-rest'),meter);
  assert.ok(mixed.groups[0].cells.some(c=>c.kind==='rest'));assert.ok(mixed.events.some(e=>e.rest));
 }
});

test('muted notes sound at their written onset, while rests never trigger audio',()=>{
 const compiled=compileGuideBar(guidePatterns('4/4').find(p=>p.id==='mute-rest'),'4/4');
 const ctx={currentTime:0},engine=new GuideTransport(ctx,{},()=>{}),calls=[];
 engine.configureGuide(compiled,60,'wood');engine.sound=(at,tone)=>calls.push({at,tone});engine.beatSound=()=>{};
 engine.anchorTime=0;engine.anchorTick=0;engine.next=0;
 for(let time=0;time<3.9;time+=.01){ctx.currentTime=time;engine.schedule();}
 assert.deepEqual(calls,[0,1,2,3].flatMap(beat=>[{at:beat,tone:'wood'},{at:beat+.5,tone:'mute'}]));
});

test('connected guide rows place each onset and count at the same coordinate for every meter and tuplet',()=>{
 for(const meter of GUIDE_METERS)for(const pattern of guidePatterns(meter)){
  const bar=compileGuideBar(pattern,meter),measure=bar.groups.map(g=>g.notes),steps=bar.groups.map(g=>g.step);
  for(const [bi,g] of bar.groups.entries())for(const event of g.events){
   const x=beatPositions(g.notes,bi,bar.beats,true,g.step)[event.index];
   const countX=180*bi+guideCursorX(g.notes,event.at-g.at,g.step);
   assert.ok(Math.abs(x-countX)<1e-8);
   assert.ok(Math.abs(scoreCursorX(measure,bar.beats,{tick:event.at,event:{...event,beat:bi}},true,steps)-x)<1e-8);
  }
 }
});
