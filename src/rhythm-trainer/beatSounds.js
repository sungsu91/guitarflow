import {METRONOME_TONE_OPTIONS} from '../metronome/options.js';
const cache=new WeakMap();
export async function prepareBeatSounds(context,tone) {
  if(!cache.has(context))cache.set(context,new Map());
  const buffers=cache.get(context);
  const files=tone==='voice'?['one','two','three','four'].map(word=>`/sounds/rhythm-count/${word}.wav`):[METRONOME_TONE_OPTIONS.find(o=>o.id===tone)?.src].filter(Boolean);
  return Promise.all(files.map(url=>{
    if(!buffers.has(url))buffers.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('Beat sound unavailable');return r.arrayBuffer();}).then(data=>context.decodeAudioData(data)).catch(error=>{buffers.delete(url);throw error;}));
    return buffers.get(url);
  }));
}
export function countInNumber(tick,meter) {
  if(tick < -meter*12)return 0;
  return tick<0?Math.max(1,Math.min(meter,Math.floor((tick+meter*12)/12)+1)):null;
}
