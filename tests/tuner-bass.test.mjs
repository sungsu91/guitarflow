import assert from 'node:assert/strict';
import test from 'node:test';
import {createTunerPresets} from '../src/tuner/tunerPresets.js';
import {getTunerAnalysisConfig} from '../src/tuner/tunerAnalysisConfig.js';
import {detectPitchYinDetailed,centsBetween,frequencyToChromaticPitch,getTunerTrackingState,midiToFrequency} from '../src/tuner/tunerMath.js';
import {createTunerFrequencyState,updateTunerFrequencyState} from '../src/tuner/tunerStability.js';
const presets=createTunerPresets('bass');
function wave(f,rate,length,h=[1],phase=0){return Float32Array.from({length},(_,i)=>h.reduce((s,a,j)=>s+a*Math.sin(2*Math.PI*f*(j+1)*(i/rate+phase)),0)*0.1);}
test('bass 4/5/6 standard and four-string drop D targets',()=>{
 assert.deepEqual(presets.map(p=>p.noteSummary),['E1 A1 D2 G2','B0 E1 A1 D2 G2','B0 E1 A1 D2 G2 C3','D1 A1 D2 G2']);
 const six=presets[2].strings;
 [30.8677,41.2034,55,73.4162,97.9989,130.8128].forEach((f,i)=>{assert.ok(Math.abs(six[i].frequency-f)<0.0001);assert.equal(six[i].stringNumber,6-i);});
});
test('shared YIN covers B0 -200 cents through C3, strong second harmonic, sample rates',()=>{
 for(const rate of [44100,48000,96000]){
  const cfg=getTunerAnalysisConfig('bass',rate);assert.ok(cfg.fftSize>2*rate/cfg.minFrequency);assert.equal(cfg.highpassFrequency,18);
  for(const midi of [21,22,23,24,26,28,33,38,43,48])for(const h of [[1],[0.12,1,0.3],[0.2,1,0]]){
   const f=midiToFrequency(midi),r=detectPitchYinDetailed(wave(f,rate,cfg.fftSize,h),rate,cfg.minFrequency,1200,0.16);
   assert.ok(r,`${rate}/${midi}`);assert.ok(Math.abs(centsBetween(r.frequency,f))<1,`${rate}/${midi} harmonic ${h}: ${r.frequency}`);assert.equal(frequencyToChromaticPitch(r.frequency).midi,midi);
  }
 }
});
test('all bass presets chromatic AUTO, manual fixed octaves, cents boundary margin',()=>{
 for(const p of presets)for(const target of p.strings){
  for(const offset of [-100,-25,0,25,100]){const f=target.frequency*2**(offset/1200),r=getTunerTrackingState(f,p.strings,null,{autoTarget:true});assert.equal(r.target.stringNumber,target.stringNumber);assert.equal(r.currentPitch.midi,target.midi+Math.round(offset/100));assert.equal(r.cents,offset);}
  const manual=getTunerTrackingState(target.frequency*2,p.strings,target.stringNumber,{autoTarget:true});assert.equal(manual.cents,1200);assert.equal(manual.currentPitch.midi,target.midi+12);
 }
 const p=presets[2],mid=Math.sqrt(p.strings[0].frequency*p.strings[1].frequency);
 assert.equal(getTunerTrackingState(mid*2**(15/1200),p.strings,null,{autoTarget:true,previousTargetString:6}).target.stringNumber,6);
 assert.equal(getTunerTrackingState(mid*2**(25/1200),p.strings,null,{autoTarget:true,previousTargetString:6}).target.stringNumber,5);
});
test('bass sustain, tuning drift, short octave spike and genuine note switch',()=>{
 const rate=48000,cfg=getTunerAnalysisConfig('bass',rate),s=createTunerFrequencyState();let r;
 for(let now=0;now<6000;now+=40){const f=midiToFrequency(23)*2**((now>2000?25:0)/1200);const yin=detectPitchYinDetailed(wave(f,rate,cfg.fftSize,[0.15,1,0.25],now/1000),rate,24,1200,0.16);r=updateTunerFrequencyState(s,{now,rawFrequency:yin.frequency});}
 assert.ok(Math.abs(centsBetween(r.frequency,midiToFrequency(23))-25)<1);
 const prev=s.frequency;for(let now=6000;now<6080;now+=40)assert.equal(updateTunerFrequencyState(s,{now,rawFrequency:prev*2}).accepted,false);
 for(let now=6080;now<6500;now+=40)r=updateTunerFrequencyState(s,{now,rawFrequency:midiToFrequency(28)});
 assert.ok(Math.abs(centsBetween(r.frequency,midiToFrequency(28)))<1);
});
test('non-bass analysis windows and filters are unchanged',()=>{
 for(const id of ['guitar','ukulele','violin'])assert.deepEqual(getTunerAnalysisConfig(id,48000),{minFrequency:50,fftSize:2048,highpassFrequency:62});
});
