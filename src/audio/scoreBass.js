import {scheduleScoreExpressions} from './scoreExpressions.js';

// Measured fundamentals of the bundled samples, in sounding MIDI. Their
// filenames name pitch classes; C/D are in octave 2 and E–B in octave 1.
export const BASS_SAMPLES=Object.freeze([
 {midi:28,url:'/sounds/bass_e.wav'},{midi:29,url:'/sounds/bass_f.wav'},
 {midi:31,url:'/sounds/bass_g.wav'},{midi:33,url:'/sounds/bass_a.wav'},
 {midi:35,url:'/sounds/bass_b.wav'},{midi:36,url:'/sounds/bass_c.wav'},
 {midi:38,url:'/sounds/bass_d.wav'},
]);
const buffers=new WeakMap();
export function bassSampleForMidi(midi){return BASS_SAMPLES.reduce((best,s)=>Math.abs(s.midi-midi)<Math.abs(best.midi-midi)?s:best);}
export function prepareBassSamples(audio){
 if(!buffers.has(audio))buffers.set(audio,Promise.all(BASS_SAMPLES.map(async sample=>{
  const response=await fetch(sample.url);if(!response.ok)throw Error('베이스 음원을 불러오지 못했습니다. 다시 재생해 주세요.');
  return [sample.midi,await audio.decodeAudioData(await response.arrayBuffer())];
 })).then(entries=>new Map(entries)).catch(error=>{buffers.delete(audio);throw error;}));
 return buffers.get(audio);
}
export function scheduleBassPhrase(audio,phrase,when,output,samples,level){
 const sample=bassSampleForMidi(phrase.midi),buffer=samples?.get(sample.midi);
 if(!buffer)throw Error('베이스 음원이 아직 준비되지 않았습니다.');
 const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;
 const rate=midi=>2**((midi-sample.midi)/12);
 source.playbackRate.setValueAtTime(rate(phrase.midi),when);
 for(const segment of phrase.segments?.slice(1)??[]){
  const at=when+segment.start-phrase.start;
  if(segment.connection==='S'){
   const previous=phrase.segments[phrase.segments.indexOf(segment)-1];
   source.playbackRate.setValueAtTime(rate(previous.midi),Math.max(when,at-.075));
   source.playbackRate.linearRampToValueAtTime(rate(segment.midi),at);
  }else source.playbackRate.setValueAtTime(rate(segment.midi),at);
 }
 scheduleScoreExpressions(source,phrase,when);
 gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(level,when+.004);
 source.connect(gain);gain.connect(output);
 let releaseAt=Infinity;
 source.release=(at=audio.currentTime)=>{
  const t=Math.max(at,audio.currentTime);if(t>=releaseAt)return;releaseAt=t;
  gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(level,t);gain.gain.linearRampToValueAtTime(0,t+.018);source.stop(t+.02);
 };
 source.onended=()=>{source.disconnect();gain.disconnect();};
 source.start(when);source.release(when+Math.max(.04,phrase.duration)+(phrase.releaseTail??.08));
 return source;
}
