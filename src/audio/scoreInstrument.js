import {getAudioBusInput,AUDIO_BUS_IDS} from './audioBus.js';
import {scheduleGuitarPhrase,warmGuitarPhrase} from './fretboardPreviewEngine.js';
import {alignScorePianoAttack} from './scorePianoSample.js';

const pianoBuffers=new WeakMap();
export async function prepareScoreInstrument(audio,instrument){
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
  get activeCount(){return sources.size;},
  schedule(phrases,when,instrument='clean-guitar',pianoBuffer=null){
   if(disposed)return [];
   if(instrument!=='piano')phrases.forEach((phrase,index)=>warmGuitarPhrase(audio,phrase,index));
   const level=.46/Math.sqrt(Math.max(1,phrases.length));
   // Read the clock once, after any cache misses, so a late chord still has
   // sample-identical starts rather than one clock read per string.
   const at=Math.max(when,audio.currentTime+.016);
   return phrases.map(phrase=>{
    strings.get(phrase.string)?.release(at);
    const source=instrument==='piano'&&!phrase.dead?pianoVoice(audio,phrase,at,output,pianoBuffer,level):scheduleGuitarPhrase(audio,phrase,at,output,level);
    if(phrase.silenceAt!==undefined)source.release(at+phrase.silenceAt-phrase.start-.014);
    strings.set(phrase.string,source);sources.add(source);
    source.addEventListener('ended',()=>{sources.delete(source);if(strings.get(phrase.string)===source)strings.delete(phrase.string);if(disposed&&!sources.size)output.disconnect();},{once:true});
    return source;
   });
  },
  releaseAll,
  finish(){disposed=true;if(!sources.size)output.disconnect();},
  dispose(){disposed=true;releaseAll();if(!sources.size)output.disconnect();},
 };
}
