import test from 'node:test';
import assert from 'node:assert/strict';
import {playbackSlots,slotAtTick,seekTick} from '../src/etudes/scorePlaybackPosition.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {playheadX} from '../src/etudes/scorePlayhead.js';

const note=(duration,extra={})=>({duration,midi:60,string:2,fret:1,...extra});
const score={meter:[4,4],bpm:60,measures:[[
  note('4',{dotted:true}),note('8',{rest:true}),
  ...Array.from({length:3},()=>note('8',{tuplet:{normalNotes:2,actualNotes:3}})),note('4'),
],[note('1',{rest:true})]],repeatMarks:[{repeatStart:true},{repeatEnd:true}]};

test('position ticks share dotted/rest/triplet duration and repeated route with audio',()=>{
 const audio=scoreTimeline(score),slots=playbackSlots(score,audio.order);
 assert.deepEqual(audio.order,[0,1,0,1]);
 assert.deepEqual(slots.slice(0,6).map(s=>s.tick),[0,720,960,1120,1280,1440]);
 assert.equal(slotAtTick(slots,800).event,1); // explicit rest still advances
 assert.equal(slotAtTick(slots,1120).event,3);
 assert.equal(slotAtTick(slots,3840).visit,2);
 assert.equal(slotAtTick(slots,3840).bar,0);
 for(const event of audio.events){const slot=slotAtTick(slots,event.start*480);assert.equal(slot.bar,event.bar);assert.equal(slot.visit,event.visit);}
});

test('seek/resume in a repeated visit preserves ticks independently of BPM',()=>{
 const slots=playbackSlots(score,scoreTimeline(score).order),tick=seekTick(slots,{bar:0,event:3,visit:2});
 assert.equal(tick,4960);
 assert.equal(seekTick(slots,{timelineTick:tick+53}),5013);
 for(const bpm of [40,90,240]){
  const audio=scoreTimeline(score,bpm);
  const event=audio.events.find(e=>e.visit===2&&Math.abs(e.start*480*bpm/60-tick)<1e-6);
  assert.ok(event);
 }
});

test('engraved spacing and accidentals cannot alter the musical timeline',()=>{
 const points=[{tick:0,x:96},{tick:720,x:211},{tick:960,x:235},{tick:1120,x:300},{tick:1280,x:328},{tick:1440,x:410},{tick:1920,x:460}];
 assert.equal(playheadX(points,720),211);
 assert.equal(playheadX(points,840),223); // rest duration, not equal screen divisions
 assert.equal(playheadX(points,1040),267.5);
 const changed={...score,measures:score.measures.map(m=>m.map(e=>({...e,pitch:'c#/5',accidental:'#'})))};
 assert.deepEqual(playbackSlots(changed,scoreTimeline(changed).order),playbackSlots(score,scoreTimeline(score).order));
});

test('editing duration regenerates positions without stale engraving indices',()=>{
 const before={meter:[4,4],measures:[[note('4'),note('4'),note('2')]]};
 const after={meter:[4,4],measures:[[note('4',{dotted:true}),note('8'),note('2')]]};
 assert.equal(playbackSlots(before,[0])[1].tick,480);
 assert.equal(playbackSlots(after,[0])[1].tick,720);
 assert.equal(slotAtTick(playbackSlots(after,[0]),600).event,0);
});
