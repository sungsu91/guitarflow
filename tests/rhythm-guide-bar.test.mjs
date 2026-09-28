import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDE_METERS,guidePatterns,compileGuideBar,GuideTransport} from '../src/rhythm-trainer/guideModel.js';
import {builtinPacks} from '../src/rhythm-trainer/packs.js';
import {meterInfo,timeSignature} from '../src/rhythm-trainer/meter.js';
import {beatPositions,guideCursorX} from '../src/rhythm-trainer/notationLayout.js';
globalThis.cancelAnimationFrame=()=>{};
const compile=(id,meter='4/4')=>compileGuideBar(guidePatterns(meter).find(p=>p.id===id),meter);

test('quarter notes display 1 e & a through 4 e & a, with a single attack per beat',()=>{
 const bar=compile('quarter');
 assert.equal(bar.total,48);assert.equal(bar.groups.length,4);
 assert.deepEqual(bar.events.map(e=>e.at),[0,12,24,36]);
 for(const [i,g] of bar.groups.entries()){
  assert.deepEqual(g.cells.map(c=>c.label),[String(i+1),'e','&','a']);
  assert.deepEqual(g.cells.map(c=>c.kind),['hit','hold','hold','hold']);
  assert.deepEqual(g.cells.map(c=>c.at),[0,3,6,9].map(n=>n+i*12));
  assert.equal(g.events[0].ticks,12);
 }
});

test('eighths, reordered sixteenths, dots and rests keep their precise attack and hold positions throughout a bar',()=>{
 for(const [id,expected] of [
  ['eighths',['hit','hold','hit','hold']],
  ['eighth-sixteenths',['hit','hold','hit','hit']],
  ['sixteenth-eighth-sixteenth',['hit','hit','hold','hit']],
  ['sixteenths-eighth',['hit','hit','hit','hold']],
  ['dotted-eighth',['hit','hold','hold','hit']],
  ['eighth-rest-sixteenth',['hit','hold','rest','hit']],
  ['quarter-rest',['rest','rest','rest','rest']],
 ])for(const [i,g] of compile(id).groups.entries()){
  assert.deepEqual(g.cells.map(c=>c.label),[String(i+1),'e','&','a']);
  assert.deepEqual(g.cells.map(c=>c.kind),expected,id);
 }
});

test('every guide and pack core fills the selected meter without modifying its source',()=>{
 for(const meter of GUIDE_METERS)for(const p of guidePatterns(meter)){
  const before=structuredClone(p),bar=compileGuideBar(p,meter),info=meterInfo(meter);
  assert.deepEqual(p,before);assert.equal(bar.groups.length,info.beats);assert.equal(bar.total,info.beats*info.beatTicks);
  for(const g of bar.groups){assert.ok(Math.abs(g.cells.reduce((sum,c)=>sum+c.ticks,0)-g.ticks)<1e-8);for(const e of g.events)assert.ok(g.cells.some(c=>Math.abs(c.at-e.at)<1e-8));}
 }
 for(const p of builtinPacks()){
  const before=structuredClone(p),bar=compileGuideBar({groups:p.core},timeSignature(p));
  assert.equal(bar.groups.length,p.meter);assert.deepEqual(p,before);
 }
});

test('compound meters count three eighths per main beat, while tuplets preserve their own equal divisions',()=>{
 for(const meter of ['6/8','9/8','12/8']){
  const bar=compile('compound-quarter',meter);assert.equal(bar.groups.length,parseInt(meter)/3);
  for(const [i,g] of bar.groups.entries()){
   assert.deepEqual(g.cells.map(c=>c.label),[1,2,3].map(n=>`${i+1}·${n}`));
   assert.deepEqual(g.cells.map(c=>c.kind),['hit','hold','hold']);
  }
 }
 for(const count of [3,5,6,7]){
  const bar=compile(count===3?'triplets':`tuplet-${count}-0`);
  for(const [i,g] of bar.groups.entries()){
   assert.equal(g.cells.length,count);assert.deepEqual(g.cells.map(c=>c.label),Array.from({length:count},(_,n)=>`${i+1}·${n+1}`));
   assert.ok(g.cells.every(c=>c.kind==='hit'));
  }
 }
});

test('two-beat ties repeat as complete motifs; an odd remaining beat is a rest',()=>{
 const four=compile('tie');assert.equal(four.events.filter(e=>!e.rest&&!e.continuation).length,6);
 assert.equal(four.groups[1].cells[0].kind,'hold');assert.equal(four.groups[3].cells[0].kind,'hold');
 const three=compile('tie','3/4');assert.equal(three.groups.length,3);assert.ok(three.groups[2].cells.every(c=>c.kind==='rest'));assert.equal(three.events.filter(e=>!e.rest&&!e.continuation).length,3);
});

test('voice counts advance across the bar and note onsets, cells and notation share the same clock',()=>{
 for(const [meter,id] of [['4/4','quarter'],['4/4','eighth-sixteenths'],['4/4','eighth-rest-sixteenth'],['4/4','tie'],['4/4','tuplet-7-0'],['6/8','compound-eighths'],['12/8','compound-quarter']]){
  const bar=compile(id,meter),ctx={currentTime:0},engine=new GuideTransport(ctx,{},()=>{}),notes=[],counts=[];
  const bpm=80,duration=bar.beats*60/bpm;
  engine.configureGuide(bar,bpm,'wood');engine.sound=at=>notes.push(at);engine.beatSound=(at,index)=>counts.push({at,index});engine.anchorTick=0;engine.anchorTime=0;engine.next=0;
  for(let time=0;time<duration*2-.09;time+=.01){ctx.currentTime=time;engine.schedule();}
  const expected=[0,1].flatMap(loop=>bar.events.filter(e=>!e.rest&&!e.continuation).map(e=>(loop*bar.total+e.at)/bar.beatTicks*60/bpm));
  assert.equal(notes.length,expected.length);notes.forEach((at,i)=>assert.ok(Math.abs(at-expected[i])<1e-8));
  assert.deepEqual(counts.map(c=>c.index),[0,1].flatMap(()=>Array.from({length:bar.beats},(_,i)=>i)));
  for(const g of bar.groups){
   const xs=beatPositions(g.notes,0,1,true,g.step);
   for(const e of g.events)assert.ok(Math.abs(guideCursorX(g.notes,e.at-g.at,g.step)-xs[e.index])<1e-8);
   for(const c of g.cells){
    const event=g.events.find(e=>c.at+1e-8>=e.at&&c.at<e.at+e.ticks-1e-8);
    const x=guideCursorX(g.notes,c.at-g.at,g.step);
    assert.ok(x>=xs[event.index]-1e-8&&x<(xs[event.index+1]??173));
   }
  }
 }
});
