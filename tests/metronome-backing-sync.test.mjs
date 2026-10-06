import test from 'node:test';
import assert from 'node:assert/strict';
import {createSynchronizedGroovePlayback} from '../src/backing-loop/synchronizedGroovePlayback.js';
import {getGrooveClockPosition, setMetronomePlaybackClock, subscribeMetronomePlaybackClock} from '../src/audio/metronomePlaybackClock.js';

const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
function fixture({beats = 32, duration = 15.60975} = {}) {
  setMetronomePlaybackClock(null);
  const sources = [];
  const context = {currentTime: 10, sampleRate: 48000,
    createGain: () => ({gain: {value:1}, connect(){}, disconnect(){}}),
    createBufferSource() {
      const source = {playbackRate:{value:1},connect(){},disconnect(){},
        start(time, offset) {this.time=time;this.offset=offset;}, stop(){this.stopped=true;}};
      sources.push(source);return source;
    },
  };
  const player=createSynchronizedGroovePlayback({context,buffer:{duration},output:{},beats});
  player.loop=true;
  const clock = (bpm=123, originTime=10.06) => ({context,originTime,secondsPerBeat:60/bpm});
  return {context,sources,player,clock,duration,beats};
}

test('backing started between beats joins the playing four-bar groove at the same musical position', async () => {
  const {context,player,sources,clock,duration}=fixture();
  const timeline=clock();setMetronomePlaybackClock(timeline);
  context.currentTime=14.072;await player.play();
  close(sources[0].offset/duration*32,(sources[0].time-10.06)*123/60);
  close(sources[0].playbackRate.value,duration/(32*60/123));
  // Hundreds of cycles, including non-integral PCM frame durations.
  for(let bar=0;bar<5000;bar++) {
    context.currentTime=14.092+bar*4*60/123;
    const expected=getGrooveClockPosition(timeline,{context,duration,beats:32}).offset;
    close(player.currentTime,expected);
  }
  assert.equal(sources.length,1);player.dispose();
});

test('metronome started after backing realigns it once, then stable clock publication never restarts it', async () => {
  const {context,player,sources,clock}=fixture();
  await player.play();context.currentTime=12;
  setMetronomePlaybackClock(clock(120,12.06));
  assert.equal(sources.length,2);assert.equal(sources[0].stopped,true);
  close(sources[1].time,12.06);close(sources[1].offset,0);
  for(let i=0;i<100;i++) setMetronomePlaybackClock(clock(120,12.06));
  assert.equal(sources.length,2);player.dispose();
});

test('tempo automation retimes the active buffer without cutting a voice or changing phase', async () => {
  const {context,player,sources,clock,duration}=fixture();
  let timeline=clock(120);setMetronomePlaybackClock(timeline);await player.play();
  for(let i=1;i<=100;i++) {
    context.currentTime+=.317;
    const elapsedBeats=(context.currentTime-timeline.originTime)/timeline.secondsPerBeat;
    const secondsPerBeat=60/(120+i);
    timeline={context,secondsPerBeat,originTime:context.currentTime-elapsedBeats*secondsPerBeat};
    const before=player.currentTime;setMetronomePlaybackClock(timeline);
    close(player.currentTime,before);
    context.currentTime+=.013;
    close(player.currentTime,getGrooveClockPosition(timeline,{context,duration,beats:32}).offset);
  }
  assert.equal(sources.length,1);player.dispose();
});

test('a restarted future metronome origin replaces the old pending backing attack', async () => {
  const {context,player,sources,clock}=fixture();
  setMetronomePlaybackClock(clock(120,15));await player.play();
  context.currentTime=11;setMetronomePlaybackClock(clock(120,16));
  assert.equal(sources[0].stopped,true);assert.equal(sources.at(-1).time,16);
  assert.equal(sources.at(-1).offset,0);player.dispose();
});

test('stop, pause, resume, navigation and disposal do not leave a second backing source', async () => {
  const {context,player,sources,clock}=fixture();
  setMetronomePlaybackClock(clock());await player.play();context.currentTime=15;
  const before=player.currentTime;setMetronomePlaybackClock(null);
  close(player.currentTime,before);assert.equal(player.paused,false);
  player.pause();setMetronomePlaybackClock(clock(95,20));assert.equal(player.paused,true);
  context.currentTime=20;await player.play();close(sources.at(-1).time,20.02);
  assert.equal(sources.filter(s=>!s.stopped).length,1);
  player.dispose();setMetronomePlaybackClock(clock(100,30));
  assert.equal(sources.filter(s=>!s.stopped).length,0);
});

test('untimed recordings and a different AudioContext never acquire a guessed tempo', async () => {
  const {player,sources,clock}=fixture({beats:0});
  setMetronomePlaybackClock(clock(200));await player.play();
  assert.equal(sources[0].playbackRate.value,1);assert.equal(sources[0].offset,0);player.dispose();
  const second=fixture();setMetronomePlaybackClock({...second.clock(),context:{}});
  await second.player.play();assert.equal(second.sources[0].offset,0);
  assert.equal(second.sources[0].playbackRate.value,1);second.player.dispose();
});

test('clock listeners are released and fractional sample compensation holds for 24 hours', () => {
  const {context,duration,clock,player}=fixture();
  let calls=0;const unsubscribe=subscribeMetronomePlaybackClock(()=>calls++);
  setMetronomePlaybackClock(clock());unsubscribe();setMetronomePlaybackClock(null);assert.equal(calls,1);
  const timeline=clock();
  const plan=getGrooveClockPosition(timeline,{context,duration,beats:32});
  for(const seconds of [1,60,600,3600,86400]) {
    const cycles=Math.floor(seconds/(32*60/123));
    close(cycles*duration/plan.playbackRate,cycles*32*60/123);
  }
  player.dispose();
});
