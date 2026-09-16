import test from 'node:test';
import assert from 'node:assert/strict';
import {synthesizeString,getStringBuffer,stringCacheStats} from '../src/audio/pluckedString.js';
import {scoreTimeline,guitarVoiceTimeline} from '../src/etudes/scorePlayback.js';

const rms=(data,a,b)=>Math.sqrt(data.slice(a,b).reduce((sum,n)=>sum+n*n,0)/(b-a));
function measuredPitch(data,rate,expected){
 const base=rate/expected,lo=Math.floor(base*.94),hi=Math.ceil(base*1.06),start=Math.floor(rate*.1),length=4000,scores=[];
 for(let lag=lo;lag<=hi;lag++){let a=0,b=0,c=0;for(let i=start;i<start+length;i++){const x=data[i],y=data[i+lag];a+=x*y;b+=x*x;c+=y*y;}scores.push(a/Math.sqrt(b*c));}
 const i=scores.indexOf(Math.max(...scores)),left=scores[i-1],right=scores[i+1],adjust=(left-right)/(2*(left-2*scores[i]+right));
 return rate/(lo+i+(Number.isFinite(adjust)?adjust:0));
}
test('fractional KS delay keeps E2–E6 within 6 cents at 44.1 and 48 kHz',()=>{
 for(const sampleRate of [44100,48000])for(const midi of [40,45,52,64,76,88]){
  const frequency=440*2**((midi-69)/12),data=synthesizeString({sampleRate,frequency,string:6,seconds:2});
  const actual=measuredPitch(data,sampleRate,frequency),cents=1200*Math.log2(actual/frequency);
  assert(Math.abs(cents)<6,`${sampleRate}/${midi}: ${cents} cents`);
  assert.equal(Math.abs(data[0]),0);assert.equal(Math.abs(data.at(-1)),0);assert(data.every(Number.isFinite));
 }
});
test('attack variants differ, same pitch on different strings differs, tails decay and mutes end',()=>{
 const params={sampleRate:48000,frequency:196,string:6,seconds:2};
 const normal=synthesizeString(params),variant=synthesizeString({...params,variant:1}),highString=synthesizeString({...params,string:1});
 assert.notDeepEqual(normal.slice(0,4000),variant.slice(0,4000));assert.notDeepEqual(normal,highString);
 assert(rms(normal,48000,60000)<rms(normal,1000,13000)*.3);
 assert(rms(normal,48000,60000)>rms(highString,48000,60000));
 const mute=synthesizeString({...params,muted:true,seconds:.075});assert.equal(mute.at(-1),0);assert(rms(mute,2400,3500)<rms(mute,30,800)*.08);
});
test('cache reuses PCM across rhythm lengths and keeps bounded LRU memory',()=>{
 const audio={sampleRate:44100,createBuffer:(_,length)=>{const data=new Float32Array(length);return {length,getChannelData:()=>data};}};
 const p={stringNumber:6,midi:40,frequency:82.4069};assert.equal(getStringBuffer(audio,p,2.3),getStringBuffer(audio,p,2.8));
 for(let midi=40;midi<90;midi++)getStringBuffer(audio,{...p,midi,frequency:440*2**((midi-69)/12)},3);
 const stats=stringCacheStats(audio);assert(stats.bytes<=stats.limitBytes);assert.equal(stats.hits,2);assert(stats.entries<50);
});
test('8ths, 16ths and simultaneous 9/7 preserve BPM onsets and picking metadata; rests are silent',()=>{
 for(const count of [8,16]){
  const score={bpm:120,meter:[4,4],measures:[Array.from({length:count},(_,i)=>({id:String(i),onset:i*1920/count,duration:String(count),pickStroke:i%2?'up':'down',tones:[{string:6,fret:9,midi:49},{string:5,fret:7,midi:52}]}))]};
  const timeline=scoreTimeline(score);assert.equal(timeline.duration,2);assert.equal(timeline.events.length,count*2);
  for(let i=0;i<count;i++){const pair=timeline.events.slice(i*2,i*2+2);assert(pair.every(n=>n.start===i*2/count));assert(pair.every(n=>n.pickStroke===(i%2?'up':'down')));}
  score.measures[0][0].rest=true;assert.equal(scoreTimeline(score).events.length,count*2-2);
 }
});

test('an entered rest damps existing tails without changing note duration; blank drafting slots do not',()=>{
 const score={bpm:120,meter:[4,4],measures:[[{id:'note',onset:0,duration:'4',string:6,fret:0,midi:40},{id:'rest',onset:480,duration:'4',rest:true}]]};
 const voice=guitarVoiceTimeline(score).voices[0];assert.equal(voice.silenceAt,.5);assert.equal(voice.duration,.5);
 score.measures[0][1].blank=true;assert.equal(guitarVoiceTimeline(score).voices[0].silenceAt,undefined);
});
