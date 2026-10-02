import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {originalGuitarPieces} from '../src/etudes/originalGuitarPieces.js';
import {scoreTimeline,guitarVoiceTimeline,voicesFrom} from '../src/etudes/scorePlayback.js';
import {playbackSlots,slotAtTick,seekTick} from '../src/etudes/scorePlaybackPosition.js';
import {performedMeasures,practiceClicks} from '../src/etudes/scoreMeters.js';
import {practiceCountIn} from '../src/etudes/practiceCountIn.js';

async function startPractice(sound,repeatCount=1,{countIn=false,from}={}){
 const source=fs.readFileSync(new URL('../src/etudes/ScorePlayback.jsx',import.meta.url),'utf8');
 const start=source.indexOf(' const play=async('),end=source.indexOf(' // Sound changes',start);
 assert(start>=0&&end>start);
 const calls=[],audio={currentTime:0},score=originalGuitarPieces[0],token={current:0},session={current:null};
 let timer,pulse;
 const context={countIn,practiceCountIn,score,bpm:score.bpm,repeatCount,practice:true,dock:false,optionalSound:true,practiceRange:null,startAt:{bar:0,event:0},instrument:'clean-guitar',voiceSettings:{current:{sound,volume:1}},session,token,pending:{current:null},trailing:{current:null},metroOptions:{},BACKING_TRANSPORT_LOOKAHEAD_SECONDS:.15,
  scoreTimeline,guitarVoiceTimeline,voicesFrom,playbackSlots,slotAtTick,seekTick,performedMeasures,practiceClicks,
  stop(){token.current++;},onBeforePlay:undefined,resumeSharedAudioContext:async()=>audio,prepareScoreInstrument:async()=>null,
  warmGuitarPhrase(ctx,voice,index){calls.push({type:'warm',index});ctx.currentTime+=.04;},
  metro:{async start(options){calls.push({type:'clock',time:audio.currentTime,options});return {origin:audio.currentTime+.06+(options.leadIn?.duration??0),countInOrigin:audio.currentTime+.06};},stop(){}},
  createScoreVoiceOutput:()=>({setVolume(){},schedule(group,time){calls.push({type:'audio',ids:group.map(v=>v.id),time});},finish(){}}),
  updateSound(){calls.push({type:'optional'});},setPlaying(){},setError(message){if(message)throw Error(message);},setPulse(value){pulse=typeof value==='function'?value(pulse):value;},publish(value){calls.push({type:'position',value});},
  setInterval:callback=>{timer=callback;return 1;},clearInterval(){},ko:{},Math,Number,Boolean,
 };
 vm.createContext(context);vm.runInContext(source.slice(start,end)+'\nglobalThis.startPractice=play;',context);
 await context.startPractice(from);return {calls,session:session.current,getPulse:()=>pulse,advance:time=>{audio.currentTime=time;timer();}};
}

test('cold optional guitar voices prepare before the clock and schedule the first note synchronously',async()=>{
 const {calls,session}=await startPractice(true);
 const clock=calls.findIndex(c=>c.type==='clock'),firstAudio=calls.find(c=>c.type==='audio');
 assert.equal(calls.filter(c=>c.type==='warm').length,6);
 assert(calls.slice(0,clock).every(c=>c.type==='warm'));
 assert(firstAudio);assert.equal(firstAudio.time,calls[clock].time+.06);
 assert.equal(calls.some(c=>c.type==='optional'),false,'first attack must not await a later timer after React renders');
 assert.equal(session.soundReady,true);assert(session.voiceTimeline.voices.length>0);
 assert.equal(session.repeats,1);
});

test('muted practice starts its visual clock without generating guitar PCM',async()=>{
 const {calls,session}=await startPractice(false);
 assert.equal(calls.filter(c=>c.type==='warm'||c.type==='audio').length,0);
 assert.equal(calls.filter(c=>c.type==='clock').length,1);
 assert.equal(session.voiceTimeline,null);
});

test('explicit continuous practice retains prepared voices for the next cycle',async()=>{
 const {session}=await startPractice(true,0);
 assert.equal(session.repeats,Infinity);
 assert.strictEqual(session.nextVoices,session.voiceTimeline.voices);
});

test('a checked count-in delays both the first note and playhead by one complete bar',async()=>{
 const run=await startPractice(true,0,{countIn:true}),clock=run.calls.find(c=>c.type==='clock');
 const count=clock.options.leadIn;
 assert.equal(count.clicks.length,4);assert.equal(count.duration,4*60/originalGuitarPieces[0].bpm);
 assert.equal(run.calls.some(c=>c.type==='audio'||c.type==='position'),false);
 assert.equal(run.getPulse().countingIn,true);
 const musicStart=clock.time+.06+count.duration;
 run.advance(musicStart-.1);
 assert.equal(run.calls.find(c=>c.type==='audio').time,musicStart);
 assert.equal(run.calls.some(c=>c.type==='position'),false);
 run.advance(musicStart+.01);assert.equal(run.getPulse().countingIn,false);
 assert.equal(run.calls.find(c=>c.type==='position').value.bar,0);
 assert.equal(clock.options.cycleSeconds,run.session.timeline.duration,'count-in is outside the repeated score');
});

test('resuming skips the count-in; choosing a starting bar while stopped still counts in',async()=>{
 const resumed=await startPractice(false,1,{countIn:true,from:{timelineTick:480,resume:true}});
 assert.equal(resumed.calls.find(c=>c.type==='clock').options.leadIn.duration,0);
 const selected=await startPractice(false,1,{countIn:true,from:{bar:1,event:0}});
 assert.ok(selected.calls.find(c=>c.type==='clock').options.leadIn.duration>0);
});

test('count-in clicks honor the time signature denominator and are quarter-subdivision independent',()=>{
 const compound=practiceCountIn(true,[6,8],120);
 assert.deepEqual(compound.clicks.map(c=>c.time),[0,.25,.5,.75,1,1.25]);assert.equal(compound.duration,1.5);
 assert.deepEqual(compound.clicks.map(c=>c.downbeat),[true,false,false,false,false,false]);
 assert.equal(practiceCountIn(false,[6,8],120).clicks.length,0);
});
