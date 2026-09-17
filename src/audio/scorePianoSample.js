// The bundled G4 sample has ~70 ms of recording noise before its attack.
// Remove that pre-roll once, before pitch shifting: at E2 it otherwise becomes
// ~330 ms of silence. Keep 1 ms before the attack for the voice's click-free ramp.
export function alignScorePianoAttack(audio, buffer) {
  const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
  let peak=0;
  for(const channel of channels)for(const value of channel)peak=Math.max(peak,Math.abs(value));
  if(peak<.0001)return buffer;
  const threshold=Math.max(.0001,peak*.01);
  const limit=Math.min(buffer.length,Math.ceil(buffer.sampleRate*.25));
  let attack=0;
  while(attack<limit&&!channels.some(channel=>Math.abs(channel[attack])>=threshold))attack++;
  if(attack===limit)return buffer;
  const offset=Math.max(0,attack-Math.round(buffer.sampleRate*.001));
  if(!offset)return buffer;
  const aligned=audio.createBuffer(buffer.numberOfChannels,buffer.length-offset,buffer.sampleRate);
  channels.forEach((channel,i)=>aligned.getChannelData(i).set(channel.subarray(offset)));
  return aligned;
}
