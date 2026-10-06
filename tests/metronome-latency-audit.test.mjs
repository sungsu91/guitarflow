import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as clock from '../src/audio/transportClock.js';
import * as playbackClock from '../src/audio/metronomePlaybackClock.js';
import * as runtime from '../src/metronome/runtime.js';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const scheduler = app.slice(app.indexOf('  const runMetronomeAudioScheduler ='), app.indexOf('  // Menu mounting'));
function fixture() {
  const events = [];
  const ctx = {...clock, ...playbackClock, ...runtime, useCallback: fn => fn,
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

test('a reached bar limit is re-armed when its limit or completion options change during playback',()=>{
  const base={bpm:120,trackerMode:'bars',trackerBarLimitEnabled:true,trackerBarLimit:2};
  const reached=runtime.advanceMetronomeRuntime(runtime.createMetronomeRuntimeState(),4000,base).state;
  assert.equal(reached.trackerBarLimitReached,true);
  const reset=runtime.advanceMetronomeRuntime(reached,4000,{...base,trackerBarLimit:4,trackerBarResetWhenReached:true});
  assert.equal(reset.state.trackerBars,0);
  const stop=runtime.advanceMetronomeRuntime(reached,10,{...base,trackerBarStopWhenReached:true});
  assert.equal(stop.shouldStop,true);
  const raised=runtime.advanceMetronomeRuntime(reached,2000,{...base,trackerBarLimit:4}).state;
  assert.equal(raised.trackerBarLimitReached,false);
  assert.equal(runtime.advanceMetronomeRuntime(raised,2000,{...base,trackerBarLimit:4}).trackerBarLimitReached,true);
});

test('a completed timer accepts a new duration, reset or stop option without toggling the mode',()=>{
  const base={bpm:120,trackerMode:'timer',trackerTimerTotalMs:60000};
  const reached=runtime.advanceMetronomeRuntime(runtime.createMetronomeRuntimeState(),60000,base).state;
  const reset=runtime.advanceMetronomeRuntime(reached,500,{...base,trackerTimerResetWhenReached:true});
  assert.equal(reset.state.trackerElapsedMs,500);
  assert.equal(runtime.advanceMetronomeRuntime(reached,1,{...base,trackerTimerStopWhenReached:true}).shouldStop,true);
  const extended=runtime.advanceMetronomeRuntime(reached,30000,{...base,trackerTimerTotalMs:120000}).state;
  assert.equal(extended.trackerTimerLimitReached,false);
  assert.equal(runtime.advanceMetronomeRuntime(extended,30000,{...base,trackerTimerTotalMs:120000}).trackerTimerLimitReached,true);
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

test('Timer OFF freezes its elapsed time and cannot stop playback in the background',()=>{
  let state=runtime.createMetronomeRuntimeState();
  const configuration={bpm:120,trackerTimerTotalMs:60000,trackerTimerStopWhenReached:true};
  const off=runtime.advanceMetronomeRuntime(state,65000,{
    ...configuration,trackerMode:runtime.getActiveMetronomeTrackerMode('timer',false),
  });
  assert.equal(off.state.trackerElapsedMs,0);assert.equal(off.shouldStop,false);
  state=runtime.advanceMetronomeRuntime(off.state,59000,{
    ...configuration,trackerMode:runtime.getActiveMetronomeTrackerMode('timer',true),
  }).state;
  const paused=runtime.advanceMetronomeRuntime(state,20000,{
    ...configuration,trackerMode:runtime.getActiveMetronomeTrackerMode('timer',false),
  });
  assert.equal(paused.state.trackerElapsedMs,59000);assert.equal(paused.shouldStop,false);
  const on=runtime.advanceMetronomeRuntime(paused.state,1000,{
    ...configuration,trackerMode:runtime.getActiveMetronomeTrackerMode('timer',true),
  });
  assert.equal(on.shouldStop,true);
});

test('equivalent beat arrays from Tracker UI renders leave queued audio untouched',()=>{
  const {ctx,events}=fixture();ctx.metronomeBeatPatternRef.current=['accent','normal','normal','normal'];ctx.run(4);
  const count=events.length;
  for(let i=0;i<20;i++) {
    ctx.audioRef.current.currentTime=.1;
    ctx.metronomeBeatPatternRef.current=['accent','normal','normal','normal'];ctx.run(.75);
  }
  assert.equal(events.length,count);
  assert.ok(events.every(e=>!e.cancelled));
});

test('dot and circle display changes do not replace or cut playing clicks',()=>{
  const {ctx,events}=fixture();ctx.grooveModeRef.current='dot';ctx.run(4);
  const cursor=ctx.metronomeAudioCursorRef.current;const count=events.length;
  ctx.audioRef.current.currentTime=.1;ctx.grooveModeRef.current='circle';ctx.run(.75);
  assert.equal(events.length,count);assert.ok(events.every(e=>!e.cancelled));
  assert.equal(ctx.metronomeAudioCursorRef.current.originTime,cursor.originTime);
});
