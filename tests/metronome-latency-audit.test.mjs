import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as clock from '../src/audio/transportClock.js';
import * as runtime from '../src/metronome/runtime.js';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const scheduler = app.slice(app.indexOf('  const runMetronomeAudioScheduler ='), app.indexOf('  // Menu mounting'));
function fixture() {
  const events = [];
  const ctx = {...clock, ...runtime, useCallback: fn => fn,
    APP_MODES: {METRONOME: 'metronome', PRACTICE: 'practice'}, GAME_STATES: {PLAYING: 'playing'},
    getTimeSignatureOption: () => ({id:'4/4', beats:4}),
    getSubdivisionOption: () => ({id:'quarter', clicksPerBeat:1}),
    createGrooveVoiceState: () => ({}),
  };
  for (const [, name] of scheduler.matchAll(/\b(\w+Ref)\.current/g)) ctx[name] = {current: null};
  Object.assign(ctx, {
    audioRef: {current:{currentTime:0}}, appModeRef:{current:'metronome'}, gameStateRef:{current:'playing'},
    bpmRef:{current:120}, metronomeAudioSchedulerRunningRef:{current:true}, grooveModeRef:{current:'click'},
    metronomeAudioScheduleKeyRef:{current:'120:4/4:quarter:click'},
    metronomeAudioCursorRef:{current:clock.createAudioTransportCursor({originTime:.06,stepSeconds:.5})},
    metronomeRuntimeRef:{current:runtime.createMetronomeRuntimeState()}, metronomeLastAudioTimeRef:{current:.06},
    metronomeOnRef:{current:true}, coachModeEnabledRef:{current:false}, coachPlayBarsRef:{current:1}, coachMuteBarsRef:{current:1},
    metronomeTrackerModeRef:{current:'off'}, metronomeBarLimitEnabledRef:{current:false},
    metronomeBarLimitRef:{current:1}, metronomeBarStopWhenReachedRef:{current:false},
  });
  ctx.playPatternTick = (beat, subdivision, time) => events.push({beat,time,cancelled:false});
  ctx.cancelScheduledMetronomeTicks = ({futureOnly=false}={}) => {
    for(const event of events) if(!futureOnly || event.time>ctx.audioRef.current.currentTime) event.cancelled=true;
  };
  ctx.createMetronomeAudioCursor = () => {throw Error('An unchanged tempo must retain its audio origin');};
  vm.createContext(ctx);
  vm.runInContext(scheduler+'\nglobalThis.run=runMetronomeAudioScheduler;',ctx);
  return {ctx,events,live:()=>events.filter(e=>!e.cancelled)};
}

test('coach changes replace queued menu audio on the original beat grid',()=>{
  const {ctx,live}=fixture(); ctx.run(4);
  ctx.audioRef.current.currentTime=.2;
  ctx.coachModeEnabledRef.current=true;
  ctx.run(4);
  assert.deepEqual(live().map(e=>e.time),[.06,.56,1.06,1.56,4.06]);
  assert.equal(ctx.metronomeAudioCursorRef.current.originTime,.06);
});

test('tracker stop prevents the next bar being queued even before the UI frame arrives',()=>{
  const {ctx,live}=fixture();
  ctx.metronomeTrackerModeRef.current='bars'; ctx.metronomeBarLimitEnabledRef.current=true;
  ctx.metronomeBarLimitRef.current=1; ctx.metronomeBarStopWhenReachedRef.current=true;
  ctx.run(4);
  assert.deepEqual(live().map(e=>e.time),[.06,.56,1.06,1.56]);
});

test('timer auto-reset retains elapsed overshoot through delayed frames',()=>{
  let state=runtime.createMetronomeRuntimeState();
  for(let i=0;i<1000;i++) state=runtime.advanceMetronomeRuntime(state,1001,{
    bpm:120,trackerMode:'timer',trackerTimerTotalMs:60000,trackerTimerResetWhenReached:true,
  }).state;
  assert.equal(state.trackerElapsedMs,1001000%60000);
});

test('bar auto-reset retains complete bars crossed during a stalled UI frame',()=>{
  const frame=runtime.advanceMetronomeRuntime(runtime.createMetronomeRuntimeState(),10000,{
    bpm:120,trackerMode:'bars',trackerBarLimitEnabled:true,trackerBarLimit:2,trackerBarResetWhenReached:true,
  });
  assert.equal(frame.state.trackerBars,1);
});

test('changing a groove pattern or beat sound replaces only future ticks without drift',()=>{
  const {ctx,live}=fixture();ctx.run(4);
  for(let i=0;i<20;i++) {
    ctx.audioRef.current.currentTime=.1+i*.01;
    ctx.groovePatternRef.current={revision:i};
    ctx.metronomeWeakToneRef.current=`tone-${i}`;
    ctx.run(4);
  }
  assert.equal(ctx.metronomeAudioCursorRef.current.originTime,.06);
  assert.deepEqual(live().map(e=>e.time),[.06,.56,1.06,1.56,2.06,2.56,3.06,3.56,4.06]);
});

test('ten minutes of Coach cycles tolerate recurring 320ms stalls with exact attack times',()=>{
  const {ctx,live}=fixture();ctx.coachModeEnabledRef.current=true;
  const finish=600.06;
  for(let i=0;ctx.audioRef.current.currentTime<finish;i++) {
    ctx.run();ctx.audioRef.current.currentTime+=i%19===0?.32:.025;
  }
  const expected=Array.from({length:1200},(_,i)=>i).filter(i=>Math.floor(i/4)%2===0).map(i=>.06+i*.5);
  assert.deepEqual(live().map(e=>e.time).filter(t=>t<finish-1e-9),expected);
});

test('automatic BPM changes keep the audible phase without adding a 60ms startup delay',()=>{
  const {ctx,live}=fixture();ctx.run(4);
  ctx.audioRef.current.currentTime=1.07;ctx.bpmRef.current=121;ctx.run(1);
  const next=live().find(e=>e.time>1.07);
  const expected=1.07+(.5-.01)*120/121;
  assert.ok(Math.abs(next.time-expected)<1e-9, `${next.time} should be ${expected}`);
  assert.equal(live().filter(e=>Math.abs(e.time-1.06)<1e-9).length,1);
});
