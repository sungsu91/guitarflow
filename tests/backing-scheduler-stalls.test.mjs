import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as clock from '../src/audio/transportClock.js';
const source=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const scheduler=source.slice(source.indexOf('  const runBackingScheduler ='),source.indexOf('  const startBackingScheduler ='));
function simulate(horizon){
 const beatSeconds=60/72,cycleSeconds=beatSeconds*8,origin=.06;
 const events=Array.from({length:32},(_,i)=>({offsetSeconds:i*beatSeconds/4,id:i}));
 const ctx={...clock,BACKING_SCHEDULE_AHEAD_SECONDS:horizon,BACKING_SCHEDULER_MODES:{STAGE3:'stage3',MINI_CHORD:'mini'},GAME_STATES:{PLAYING:'playing'},useCallback:f=>f,getSubdivisionOption:()=>({clicksPerBeat:4,id:'sixteenth'}),cancelScheduledMetronomeTicks:()=>{}};
 for(const [,name] of scheduler.matchAll(/\b(\w+Ref)\.current/g))ctx[name]={current:null};
 ctx.audioRef.current={currentTime:0};ctx.backingSchedulerRunningRef.current=true;ctx.backingSchedulerModeRef.current='stage3';ctx.gameStateRef.current='playing';ctx.backingPreparedSessionRef.current={events,cycleSeconds,bpm:72,beatsPerMeasure:4,beatSeconds};ctx.backingCycleStartTimeRef.current=origin;ctx.backingNextEventIndexRef.current=0;
 const notes=[],clicks=[];ctx.schedulePreparedBackingEvent=(event,time)=>notes.push(time);ctx.playStage3PatternTick=(beat,sub,time)=>clicks.push(time);
 vm.createContext(ctx);vm.runInContext(scheduler+'\nglobalThis.run=runBackingScheduler;',ctx);
 const end=origin+cycleSeconds*4;let i=0;while(ctx.audioRef.current.currentTime<end){ctx.run();ctx.audioRef.current.currentTime += (++i%13===0 ? .32 : .025);}
 return {notes:notes.filter(t=>t<end-1e-8),clicks:clicks.filter(t=>t<end-1e-8),expected:128,origin,step:beatSeconds/4};
}
test('180ms backing buffer reproduces missing notes and clicks after 320ms main-thread stalls',()=>{const r=simulate(.18);assert.ok(r.notes.length<r.expected);assert.ok(r.clicks.length<r.expected);console.log(`Old buffer: ${r.expected-r.notes.length} backing notes, ${r.expected-r.clicks.length} clicks omitted`);});
test('backing buffer preserves every attack and click through repeated 320ms stalls and loop boundaries',()=>{const r=simulate(clock.BACKING_TRANSPORT_LOOKAHEAD_SECONDS);for(const times of [r.notes,r.clicks]){assert.equal(times.length,r.expected);assert.equal(new Set(times).size,r.expected);times.forEach((t,i)=>assert.ok(Math.abs(t-(r.origin+i*r.step))<1e-8));}});
