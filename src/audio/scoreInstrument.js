import {scheduleScoreExpressions} from './scoreExpressions.js';
import {scheduleDrum,prepareDrumSamples} from './scoreDrums.js';
import {getAudioBusInput,AUDIO_BUS_IDS} from './audioBus.js';
import {scheduleGuitarPhrase,warmGuitarPhrase} from './fretboardPreviewEngine.js';
import {alignScorePianoAttack} from './scorePianoSample.js';
import {createPalmMuteGate} from './scorePalmMute.js';

const pianoBuffers=new WeakMap();
export async function prepareScoreInstrument(audio,instrument){
 if(instrument==='drums')return prepareDrumSamples(audio);
 if(instrument!=='piano')return;
 if(!pianoBuffers.has(audio)){
  const load=fetch('/sounds/gpg4.wav').then(r=>{if(!r.ok)throw Error('피아노 음원을 불러오지 못했습니다.');return r.arrayBuffer();}).then(data=>audio.decodeAudioData(data)).then(buffer=>alignScorePianoAttack(audio,buffer)).catch(e=>{pianoBuffers.delete(audio);throw e;});
  pianoBuffers.set(audio,load);
 }
 return pianoBuffers.get(audio);
}
function pianoVoice(audio,phrase,when,output,buffer,level){
 const source=audio.createBufferSource(),gain=audio.createGain(),release=audio.createGain();
 source.buffer=buffer;const rate=2**((phrase.midi-67)/12),duration=Math.min(Math.max(phrase.duration,.7)+.25,buffer.duration/rate);
 source.playbackRate.setValueAtTime(rate,when);
 for(const segment of phrase.segments?.slice(1)??[])source.playbackRate.setValueAtTime(2**((segment.midi-67)/12),when+segment.start-phrase.start);
 scheduleScoreExpressions(source,phrase,when);
 gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(level,when+.003);
 gain.gain.setTargetAtTime(.0001,when+.06,.4);gain.gain.setValueAtTime(0,when+duration);
 release.gain.value=1;source.connect(gain);gain.connect(release);release.connect(output);
 let releaseAt=Infinity;source.release=(at=audio.currentTime)=>{const t=Math.max(at,audio.currentTime);if(t>=releaseAt)return;releaseAt=t;release.gain.cancelScheduledValues(t);release.gain.setValueAtTime(1,t);release.gain.linearRampToValueAtTime(0,t+.012);source.stop(t+.014);};
 source.onended=()=>{source.disconnect();gain.disconnect();release.disconnect();};source.start(when);source.stop(when+duration);return source;
}

// A transport owns at most one sounding voice per physical string, plus the
// 12 ms release tails. Equal-onset chords are scheduled as a single batch.
export function createScoreVoiceOutput(audio){
 const output=audio.createGain();output.gain.value=.8;output.connect(getAudioBusInput(AUDIO_BUS_IDS.INSTRUMENT,audio));
 const strings=new Map(),sources=new Set();let disposed=false;
 const releaseAll=()=>{for(const source of sources)source.release();strings.clear();};
 return {
  setVolume(value){output.gain.setTargetAtTime(Math.max(0,Math.min(1,value))*.8,audio.currentTime,.01);},
  get activeCount(){return sources.size;},
  schedule(phrases,when,instrument='clean-guitar',pianoBuffer=null){
   if(disposed)return [];
   if(instrument==='clean-guitar')phrases.forEach((phrase,index)=>warmGuitarPhrase(audio,phrase,index));
   const level=.46/Math.sqrt(Math.max(1,phrases.length));
   // Read the clock once, after any cache misses, so a late chord still has
   // sample-identical starts rather than one clock read per string.
   const at=Math.max(when,audio.currentTime+.016);
   return phrases.map(phrase=>{
    const voiceKey=instrument==='drums'&&[42,44,46].includes(phrase.midi)?'hi-hat':phrase.string;
    strings.get(voiceKey)?.release(at);
    const palmGate=phrase.dead?null:createPalmMuteGate(audio,phrase,at,output),destination=palmGate??output;
    const source=instrument==='drums'?scheduleDrum(audio,phrase,at,destination,level):instrument==='piano'&&!phrase.dead?pianoVoice(audio,phrase,at,destination,pianoBuffer,level):scheduleGuitarPhrase(audio,phrase,at,destination,level);
    if(phrase.silenceAt!==undefined)source.release(at+phrase.silenceAt-phrase.start-.014);
    strings.set(voiceKey,source);sources.add(source);
    source.addEventListener('ended',()=>{palmGate?.disconnect();sources.delete(source);if(strings.get(voiceKey)===source)strings.delete(voiceKey);if(disposed&&!sources.size)output.disconnect();},{once:true});
    return source;
   });
  },
  releaseAll,
  finish(){disposed=true;if(!sources.size)output.disconnect();},
  dispose(){disposed=true;releaseAll();if(!sources.size)output.disconnect();},
 };
}
