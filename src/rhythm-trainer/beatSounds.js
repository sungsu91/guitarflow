import {METRONOME_TONE_OPTIONS} from '../metronome/options.js';
const cache=new WeakMap();
// Align audible voice onset with the transport beat, not file-leading silence.
export function alignCountVoice(context,buffer) {
  const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
  let peak=0;
  for(const channel of channels)for(const sample of channel)peak=Math.max(peak,Math.abs(sample));
  if(!peak)return buffer;
  let start=0;
  while(start<buffer.length&&channels.every(channel=>Math.abs(channel[start])<peak*.02))start++;
  if(!start||start===buffer.length)return buffer;
  const aligned=context.createBuffer(buffer.numberOfChannels,buffer.length-start,buffer.sampleRate);
  channels.forEach((channel,i)=>aligned.getChannelData(i).set(channel.subarray(start)));
  return aligned;
}
export async function prepareBeatSounds(context,tone) {
  if(!cache.has(context))cache.set(context,new Map());
  const buffers=cache.get(context);
  const files=tone==='voice'?['one','two','three','four'].map(word=>`/sounds/rhythm-count/${word}.wav?v=original-one-2`):[METRONOME_TONE_OPTIONS.find(o=>o.id===tone)?.src].filter(Boolean);
  return Promise.all(files.map(url=>{
    if(!buffers.has(url))buffers.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('Beat sound unavailable');return r.arrayBuffer();}).then(data=>context.decodeAudioData(data)).then(buffer=>tone==='voice'?alignCountVoice(context,buffer):buffer).catch(error=>{buffers.delete(url);throw error;}));
    return buffers.get(url);
  }));
}
export function countInNumber(tick,meter,beatTicks=12) {
  if(tick < -meter*beatTicks)return 0;
  return tick<0?Math.max(1,Math.min(meter,Math.floor((tick+meter*beatTicks)/beatTicks)+1)):null;
}
