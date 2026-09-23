// Offline rendering bypasses the live master limiter. Attenuate only mixes
// that would clip PCM encoding, with one gain for both channels and all hits.
export function limitGrooveRenderPeaks(channels) {
 let peak=0;
 for(const channel of channels)for(let i=0;i<channel.length;i++)peak=Math.max(peak,Math.abs(channel[i]));
 const gain=peak>.98?.98/peak:1;
 if(gain<1)for(const channel of channels)for(let i=0;i<channel.length;i++)channel[i]*=gain;
 return gain;
}
