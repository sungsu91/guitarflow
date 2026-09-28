import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {originalGuitarPieces} from '../src/etudes/originalGuitarPieces.js';
import {scoreTimeline,guitarVoiceTimeline,voicesFrom} from '../src/etudes/scorePlayback.js';
import {playbackSlots,slotAtTick,seekTick} from '../src/etudes/scorePlaybackPosition.js';
import {performedMeasures,practiceClicks} from '../src/etudes/scoreMeters.js';

async function startPractice(sound,repeatCount=1){
 const source=fs.readFileSync(new URL('../src/etudes/ScorePlayback.jsx',import.meta.url),'utf8');
 const start=source.indexOf(' const play=async('),end=source.indexOf(' // Sound changes',start);
 assert(start>=0&&end>start);
 const calls=[],audio={currentTime:0},score=originalGuitarPieces[0],token={current:0},session={current:null};
 const context={score,bpm:score.bpm,repeatCount,practice:true,dock:false,optionalSound:true,practiceRange:null,startAt:{bar:0,event:0},instrument:'clean-guitar',voiceSettings:{current:{sound,volume:1}},session,token,pending:{current:null},trailing:{current:null},metroOptions:{},BACKING_TRANSPORT_LOOKAHEAD_SECONDS:.15,
  scoreTimeline,guitarVoiceTimeline,voicesFrom,playbackSlots,slotAtTick,seekTick,performedMeasures,practiceClicks,
  stop(){token.current++;},onBeforePlay:undefined,resumeSharedAudioContext:async()=>audio,prepareScoreInstrument:async()=>null,
  warmGuitarPhrase(ctx,voice,index){calls.push({type:'warm',index});ctx.currentTime+=.04;},
  metro:{async start(){calls.push({type:'clock',time:audio.currentTime});return {origin:audio.currentTime+.06};},stop(){}},
  createScoreVoiceOutput:()=>({setVolume(){},schedule(group,time){calls.push({type:'audio',ids:group.map(v=>v.id),time});},finish(){}}),
  updateSound(){calls.push({type:'optional'});},setPlaying(){},setError(message){if(message)throw Error(message);},setPulse(){},publish(){},
  setInterval:()=>1,clearInterval(){},ko:{},Math,Number,Boolean,
 };
 vm.createContext(context);vm.runInContext(source.slice(start,end)+'\nglobalThis.startPractice=play;',context);
 await context.startPractice();return {calls,session:session.current};
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
