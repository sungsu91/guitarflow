import {drumStrokes} from '../etudes/drumTechniques.js';
import {drumForMidi} from '../etudes/scoreInstruments.js';
const noises=new WeakMap();
const sampleFiles={35:'kick.wav',36:'kick.wav',37:'rim.wav',38:'snare.wav',40:'electronic-snare.wav',41:'tom-low.wav',43:'tom-low.wav',45:'tom-mid.wav',47:'tom-mid.wav',48:'tom-high.wav',50:'tom-high.wav',42:'closed hihat.wav',44:'pedal-hihat.wav',46:'openhihat.wav',49:'crash.wav',57:'crash.wav',51:'ride.wav',53:'ride-bell.wav',59:'ride.wav'};
const samples=new WeakMap(),loading=new WeakMap();
export async function prepareDrumSamples(audio){
 if(!loading.has(audio)){const cache=new Map();samples.set(audio,cache);loading.set(audio,Promise.all([...new Set(Object.values(sampleFiles))].map(async file=>{const response=await fetch('/sounds/'+encodeURIComponent(file));if(!response.ok)throw Error('드럼 음원을 불러오지 못했습니다: '+file);cache.set(file,await audio.decodeAudioData(await response.arrayBuffer()));})).catch(error=>{loading.delete(audio);throw error;}));}
 return loading.get(audio);
}
// Composite voices keep all grace/repeated hits under the transport's release lifecycle.
export function scheduleDrum(audio,phrase,when,output,level){
 const strokes=drumStrokes(phrase),first=strokes[0].offset;
 const lead=first<0?Math.min(1,Math.max(0,when-audio.currentTime)/-first):1;
 const sources=strokes.flatMap(hit=>{
  const at=when+(hit.offset<0?hit.offset*lead:hit.offset);
  // No authenticated rimshot sample is shipped: explicitly synthesized snare + rim approximation.
  return phrase.drumArticulation==='rimshot'
   ?[scheduleDrumHit(audio,{midi:38},at,output,level*hit.gain*.75),scheduleDrumHit(audio,{midi:37},at,output,level*hit.gain*.65)]
   :[scheduleDrumHit(audio,phrase,at,output,level*hit.gain)];
 });
 const voice=new EventTarget();let remaining=sources.length;
 voice.release=(at=audio.currentTime)=>sources.forEach(source=>source.release(at));
 sources.forEach(source=>source.addEventListener('ended',()=>{if(!--remaining)voice.dispatchEvent(new Event('ended'));},{once:true}));
 return voice;
}
function scheduleDrumHit(audio,phrase,when,output,level){
 const buffer=samples.get(audio)?.get(sampleFiles[phrase.midi]);
 if(buffer){const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;gain.gain.setValueAtTime(level,when);source.connect(gain);gain.connect(output);let ended=false;source.release=(at=audio.currentTime)=>{if(ended)return;const t=Math.max(at,audio.currentTime);gain.gain.setTargetAtTime(0,t,.005);source.stop(t+.03);};source.addEventListener('ended',()=>{ended=true;source.disconnect();gain.disconnect();},{once:true});source.start(when);return source;}
 const kind=drumForMidi(phrase.midi)?.sound??'snare',tonal=kind==='kick'||kind==='tom',duration=kind==='cymbal'?1.1:kind==='open-hat'?.5:kind==='hat'?.09:.25;
 const source=tonal?audio.createOscillator():audio.createBufferSource(),gain=audio.createGain(),filter=audio.createBiquadFilter();
 if(tonal){const frequency=kind==='kick'?130:100+(phrase.midi-41)*18;source.frequency.setValueAtTime(frequency,when);source.frequency.exponentialRampToValueAtTime(kind==='kick'?42:frequency*.6,when+duration*.7);source.type='sine';}
 else{if(!noises.has(audio)){const b=audio.createBuffer(1,Math.ceil(audio.sampleRate*1.2),audio.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;noises.set(audio,b);}source.buffer=noises.get(audio);}
 filter.type=tonal?'lowpass':'highpass';filter.frequency.value=tonal?1200:kind==='snare'?1000:6500;
 gain.gain.setValueAtTime(Math.max(.001,level)*(tonal?1.3:.55),when);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
 source.connect(filter);filter.connect(gain);gain.connect(output);let stopped=false;
 source.release=(at=audio.currentTime)=>{if(stopped)return;const t=Math.max(at,audio.currentTime);gain.gain.cancelScheduledValues(t);gain.gain.setTargetAtTime(.0001,t,.004);source.stop(t+.02);};
 source.addEventListener('ended',()=>{stopped=true;source.disconnect();filter.disconnect();gain.disconnect();},{once:true});source.start(when);source.stop(when+duration+.01);return source;
}

