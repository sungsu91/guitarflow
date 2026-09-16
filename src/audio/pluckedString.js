// Noise-excited, fractional-delay Karplus–Strong string. No oscillators,
// samples, network requests or real-time JS audio callbacks are required.
const caches=new WeakMap();
const MAX_BYTES=8*1024*1024;
export const PLUCK_VARIANTS=4;
export function synthesizeString({sampleRate,frequency,string=6,seconds=3,variant=0,muted=false}){
 const data=new Float32Array(Math.ceil(sampleRate*seconds));
 let seed=(Math.round(frequency*100)*2654435761+string*7919+variant*104729)>>>0;
 const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 if(muted){
  let low=0,body=0;
  for(let i=0;i<data.length;i++){
   const n=noise();low+=.42*(n-low);body+=.075*(n-body);
   data[i]=(.34*low+.65*body)*Math.exp(-i/(sampleRate*(.008+string*.001)));
  }
 }else{
  const period=sampleRate/frequency,mix=.36+string*.023;
  // Compensate both the averaging filter and fractional delay, preserving pitch.
  const delay=Math.max(2,Math.floor(period-mix)),fraction=period-mix-delay;
  let previous=0,mean=0;
  for(let i=0;i<delay+2;i++){
   const n=noise();previous=n*(.78-string*.045)+previous*(.22+string*.045);
   data[i]=previous;mean+=previous;
  }
  mean/=delay+2;
  for(let i=0;i<delay+2;i++)data[i]-=mean;
  const decay=.65+string*.15,loss=Math.exp(-1/(frequency*decay));
  for(let i=delay+2;i<data.length;i++){
   const a=data[i-delay]*(1-fraction)+data[i-delay-1]*fraction;
   const b=data[i-delay-1]*(1-fraction)+data[i-delay-2]*fraction;
   data[i]=((1-mix)*a+mix*b)*loss;
  }
  let energy=0,peak=0;const window=Math.min(data.length,Math.round(sampleRate*.035));
  for(let i=0;i<window;i++){energy+=data[i]*data[i];peak=Math.max(peak,Math.abs(data[i]));}
  const scale=Math.min(.16/Math.sqrt(energy/window||1),.72/(peak||1));
  for(let i=0;i<data.length;i++)data[i]*=scale;
 }
 const attack=sampleRate*(muted?.0008:.0015),release=sampleRate*.035;
 for(let i=0;i<data.length;i++)data[i]*=Math.min(1,i/attack)*Math.min(1,(data.length-1-i)/release);
 return data;
}
export function getStringBuffer(audio,position,duration,{variant=0,muted=false}={}){
 let cache=caches.get(audio);if(!cache){cache={buffers:new Map(),bytes:0,hits:0,misses:0};caches.set(audio,cache);}
 const seconds=muted?.075:duration<=2?2:duration<=3?3:duration<=4?4:8;
 const key=[position.stringNumber,position.midi,seconds,variant,muted].join(':');
 if(cache.buffers.has(key)){const buffer=cache.buffers.get(key);cache.buffers.delete(key);cache.buffers.set(key,buffer);cache.hits++;return buffer;}
 const samples=synthesizeString({sampleRate:audio.sampleRate,frequency:position.frequency,string:position.stringNumber,seconds,variant,muted});
 const buffer=audio.createBuffer(1,samples.length,audio.sampleRate);buffer.getChannelData(0).set(samples);
 cache.buffers.set(key,buffer);cache.bytes+=samples.byteLength;cache.misses++;
 while(cache.bytes>MAX_BYTES&&cache.buffers.size>1){const first=cache.buffers.keys().next().value;cache.bytes-=cache.buffers.get(first).length*4;cache.buffers.delete(first);}
 return buffer;
}
export function stringCacheStats(audio){const c=caches.get(audio);return {entries:c?.buffers.size??0,bytes:c?.bytes??0,hits:c?.hits??0,misses:c?.misses??0,limitBytes:MAX_BYTES};}
