import assert from 'node:assert/strict';
import test from 'node:test';
import {createTunerPresets} from '../src/tuner/tunerPresets.js';
import {centsBetween, detectPitchYinDetailed, frequencyToChromaticPitch, getTunerTrackingState, getTunerGuidance, isTrustedTunerPitch, midiToFrequency} from '../src/tuner/tunerMath.js';
import {createTunerFrequencyState, updateTunerFrequencyState, createTunerSignalState, updateTunerSignalState} from '../src/tuner/tunerStability.js';
const strings=createTunerPresets('violin')[0].strings;
const shifted=(f,c)=>f*2**(c/1200);
function signal(f,rate=48000,harmonics=[1],phase=0){return Float32Array.from({length:2048},(_,i)=>harmonics.reduce((sum,a,h)=>sum+a*Math.sin(2*Math.PI*f*(h+1)*(i/rate+phase)),0)*0.15);}

test('violin standard string numbers, notes, solfege and frequencies',()=>{
 assert.deepEqual(strings.map(s=>s.pitch),['G3','D4','A4','E5']);
 assert.deepEqual(strings.map(s=>s.stringNumber),[4,3,2,1]);
 assert.deepEqual(strings.map(s=>s.solfegeName),['솔','레','라','미']);
 [195.9977,293.6648,440,659.2551].forEach((f,i)=>assert.ok(Math.abs(strings[i].frequency-f)<0.0001));
});
test('shared YIN detects every semitone from F#3 to G5 and E5 +/- 200 cents',()=>{
 for(const rate of [44100,48000])for(let midi=54;midi<=79;midi++)for(const harmonics of [[1],[0.12,1,0.35,0.2]]){
  const f=midiToFrequency(midi);const result=detectPitchYinDetailed(signal(f,rate,harmonics),rate,50,1200,0.16);
  assert.ok(result,`${rate}/${midi}`);assert.ok(Math.abs(centsBetween(result.frequency,f))<2,`${midi}: ${result.frequency}`);
  assert.equal(frequencyToChromaticPitch(result.frequency).midi,midi);
 }
 for(const cents of [-200,-100,-25,0,25,100,200]){const f=shifted(strings[3].frequency,cents);const result=detectPitchYinDetailed(signal(f),48000);assert.ok(Math.abs(centsBetween(result.frequency,f))<1);}
});
test('AUTO preserves F#3 while targeting G3; manual fixes each target including wrong octaves',()=>{
 const f=midiToFrequency(54);const r=getTunerTrackingState(f,strings,null,{autoTarget:true});
 assert.equal(r.currentPitch.pitch,'F#3');assert.equal(r.target.pitch,'G3');assert.equal(r.cents,-100);assert.equal(r.manual,false);
 assert.match(getTunerGuidance({cents:r.cents,hasSignal:true,manual:r.target!=null}).message,/올려/);
 for(const target of strings)for(const cents of [-1200,-100,0,100,1200]){
  const r=getTunerTrackingState(shifted(target.frequency,cents),strings,target.stringNumber,{autoTarget:true});
  assert.equal(r.target.pitch,target.pitch);assert.equal(r.cents,cents);assert.equal(r.currentPitch.midi,target.midi+cents/100);
 }
});
test('AUTO uses geometric midpoints and hysteresis in both directions for every adjacent pair',()=>{
 for(let i=0;i<3;i++){
  const low=strings[i],high=strings[i+1],mid=Math.sqrt(low.frequency*high.frequency);
  assert.equal(getTunerTrackingState(shifted(mid,1),strings,null,{autoTarget:true}).target.pitch,high.pitch);
  let prev=low.stringNumber;
  for(const c of [-10,10,-5,15,-15,19]){const r=getTunerTrackingState(shifted(mid,c),strings,null,{autoTarget:true,previousTargetString:prev});assert.equal(r.target.pitch,low.pitch);prev=r.target.stringNumber;}
  assert.equal(getTunerTrackingState(shifted(mid,21),strings,null,{autoTarget:true,previousTargetString:prev}).target.pitch,high.pitch);
  assert.equal(getTunerTrackingState(shifted(mid,-19),strings,null,{autoTarget:true,previousTargetString:high.stringNumber}).target.pitch,high.pitch);
  assert.equal(getTunerTrackingState(shifted(mid,-21),strings,null,{autoTarget:true,previousTargetString:high.stringNumber}).target.pitch,low.pitch);
 }
});
test('30 second sustained harmonic signal keeps tracking, follows tuning changes and retains vibrato motion',()=>{
 const state=createTunerFrequencyState(),gate=createTunerSignalState();let last;const values=[];
 for(let now=0;now<=30000;now+=40){
  const vibrato=now>20000?18*Math.sin(2*Math.PI*5*now/1000):0;
  const f=shifted(440,(now>10000?30:0)+vibrato);
  const detection=detectPitchYinDetailed(signal(f,48000,[0.3,1,0.25],now/1000),48000);
  assert.ok(isTrustedTunerPitch({candidateFrequency:detection.frequency,confidence:detection.confidence,attackPresent:true,sustainPresent:true,recentPitch:gate.acquired,lastFrequency:state.frequency}));
  last=updateTunerFrequencyState(state,{now,rawFrequency:detection.frequency});
  const phase=updateTunerSignalState(gate,{now,pitchPresent:last.accepted,releasePresent:true});
  if(now>200)assert.equal(phase.hasSignal,true);
  if(now===19000)assert.ok(Math.abs(centsBetween(last.frequency,shifted(440,30)))<1);
  if(now>21000)values.push(centsBetween(last.frequency,440));
 }
 assert.ok(Math.max(...values)-Math.min(...values)>2,'vibrato must not be frozen');
 const before=state.frequency;
 for(let i=1;i<=2;i++)assert.equal(updateTunerFrequencyState(state,{now:30000+i*40,rawFrequency:before*2}).accepted,false);
 assert.ok(Math.abs(centsBetween(state.frequency,before))<0.01);
 for(let i=3;i<=12;i++)last=updateTunerFrequencyState(state,{now:30000+i*40,rawFrequency:659.2551});
 assert.ok(Math.abs(centsBetween(last.frequency,659.2551))<1);
});
test('existing instruments retain chromatic AUTO and manual targets',()=>{
 for(const id of ['guitar','bass','ukulele'])for(const p of createTunerPresets(id))for(const s of p.strings){
  const auto=getTunerTrackingState(shifted(s.frequency,20),p.strings);
  assert.equal(auto.target,null);assert.equal(auto.cents,20);
  assert.equal(getTunerTrackingState(s.frequency,p.strings,s.stringNumber).target.pitch,s.pitch);
 }
});
