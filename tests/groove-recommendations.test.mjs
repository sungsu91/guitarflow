import test from 'node:test';
import assert from 'node:assert/strict';
import {RECOMMENDED_GROOVE_PACKS as packs} from '../src/metronome/recommendedGrooves.js';
import {createGroovePattern,normalizeGroovePattern,scheduleGrooveStep,createGrooveVoiceState} from '../src/metronome/groove.js';
import {METRONOME_TONE_OPTIONS} from '../src/metronome/options.js';
import {existsSync} from 'node:fs';
const hits=[
 [[1,4,6,7,10,12],[4,10],[1,4,7,10]],
 [[1,3,4,6,7,9,10,12],[4,10],[1,7]],
 [[1,3,4,6,7,9,10,12],[4,10],[1,4,7,9,10]],
 [[1,3,4,6,7,9,10,12],[2,5,7,11],[1,6,9]],
 [[1,3,5,7,9,11,13,15],[5,13],[1,7,9]],
 [Array.from({length:16},(_,i)=>i+1),[4,5,8,12,13,16],[1,7,10,15]],
 [[3,7,11,15],[5,13],[1,5,9,13]],
 [[1,3,5,7,9,11,13,15],[5,13],[1,9,15]],
 [[1,4,6,7,10,12],[4,10],[1,7],[3,8,12],[1,3,4,6,7,9,10,12],[10]],
 [[1,3,4,6,7,9,10,12],[4,10],[1,7,9],[4,10],[10],[6,12]],
 [[1,7,9,15],[5,13],Array.from({length:16},(_,i)=>i+1),[4,7,12,15],[1,7,11],[3,7,11,15],[6,14],[1]],
 [[1,5,9,13],[5,13],[1,5,9,13],[3,7,11,15],Array.from({length:16},(_,i)=>i+1),[3,7,11,15],[13],[4,10,16]]
];
test('all 12 arrangements match the requested one-based hit positions, grid and existing samples',()=>{
 assert.equal(packs.length,12);assert.equal(new Set(packs.map(p=>JSON.stringify(p.pattern.rows))).size,12);
 packs.forEach((p,i)=>{
  assert.deepEqual(p.pattern.rows.map(r=>r.steps.flatMap((on,n)=>on?[n+1]:[])),hits[i]);
  const divisions=p.subdivision==='eighth-triplet'?3:4;
  assert.equal(p.timeSignature,'4/4');assert.ok(Math.abs(4*divisions*(60/p.bpm/divisions)-240/p.bpm)<1e-12);
  for(const r of p.pattern.rows){assert.ok(r.steps.slice(divisions*4).every(x=>!x));assert.ok(r.volume>0&&r.volume<=1);assert.ok(r.velocities.every(v=>[25,45,70,100].includes(v)));const tone=METRONOME_TONE_OPTIONS.find(t=>t.id===r.tone);assert.ok(tone?.src&&existsSync('public'+tone.src));}
 });
 assert.deepEqual(packs.map(p=>p.pattern.rows.length),[3,3,3,3,3,3,3,3,6,6,8,8]);
});
test('accent, ghost and alternating velocities preserve the requested distinctions',()=>{
 const jazz=packs[0].pattern.rows;assert.equal(jazz[0].velocities[3],100);assert.equal(jazz[0].velocities[5],45);assert.equal(jazz[2].velocities[0],25);
 const half=packs[3].pattern.rows[1];assert.equal(half.velocities[6],100);for(const i of [1,4,10])assert.equal(half.velocities[i],25);
 const funk=packs[5].pattern.rows;assert.equal(funk[1].velocities[4],100);assert.equal(funk[1].velocities[3],25);
 const latin=packs[10].pattern.rows[2];assert.deepEqual(latin.velocities.slice(0,4),[45,25,45,25]);
});
test('legacy saved rows receive volume/velocity defaults and never mutate originals',()=>{
 const old={rows:[{tone:'kick',steps:[true]}]};const next=normalizeGroovePattern(old);assert.equal(next.rows[0].velocities[0],70);assert.equal(next.rows[0].volume,.75);assert.equal(old.rows[0].velocities,undefined);
});
function mock(){const voices=[];return {voices,audio:{createGain:()=>({gain:{values:[],setValueAtTime(v,t){this.values.push([v,t]);},linearRampToValueAtTime(v,t){this.values.push([v,t]);},cancelScheduledValues(){}},connect(){},disconnect(){}}),createBufferSource:()=>({connect(){},start(t){this.startAt=t;},stop(t){this.stopAt=t;}})},track:(source,gain)=>voices.push({source,gain})};}
test('velocity, track gain and mute reach scheduled output independently',()=>{
 const m=mock(),pattern=createGroovePattern();pattern.rows=[pattern.rows[2]];const args={...m,output:{},buffers:{kick:{duration:.6}},pattern,index:0,time:1,volume:1};scheduleGrooveStep(args);const normal=m.voices[0].gain.gain.values[0][0];pattern.rows[0].velocities[0]=25;scheduleGrooveStep(args);assert.ok(Math.abs(m.voices[1].gain.gain.values[0][0]/normal-25/70)<1e-9);pattern.rows[0].volume=.375;scheduleGrooveStep(args);assert.equal(m.voices[2].gain.gain.values[0][0],m.voices[1].gain.gain.values[0][0]/2);pattern.rows[0].muted=true;scheduleGrooveStep(args);assert.equal(m.voices.length,3);
});
test('closed hat chokes the previous open hat at the audio-clock timestamp, including bar wrap',()=>{
 const m=mock(),voiceState=createGrooveVoiceState(),pattern={rows:[{tone:'openHihat',steps:[true,false]},{tone:'hihat',steps:[false,true]}]};const args={...m,output:{},buffers:{openHihat:{duration:.375},hihat:{duration:.12}},pattern,volume:1,voiceState};scheduleGrooveStep({...args,index:0,time:1});scheduleGrooveStep({...args,index:1,time:1.2});assert.ok(Math.abs(m.voices[0].source.stopAt-1.213)<1e-9);assert.equal(m.voices[1].source.startAt,1.2);
});

