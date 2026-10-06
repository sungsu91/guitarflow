// Local audit entry only: observe real Web Audio scheduling without replacing audio.
import {getMetronomePlaybackClock} from '../src/audio/metronomePlaybackClock.js';
const events=[];
const nodes=new Map();
const contexts=new Set();
for(const Type of [AudioBufferSourceNode,OscillatorNode]) {
  const start=Type.prototype.start, stop=Type.prototype.stop;
  Type.prototype.start=function(when=0,offset=0,...rest) {
    if(!(this.context instanceof OfflineAudioContext)) {
      const event={id:events.length,type:Type.name,at:Math.max(when,this.context.currentTime),requested:when,
        calledAt:this.context.currentTime,offset,loop:this.loop||false,duration:this.buffer?.duration||0};
      this.__auditEvent=event;events.push(event);contexts.add(this.context);nodes.set(event.id,this);
    }
    return start.call(this,when,...(Type===AudioBufferSourceNode?[offset,...rest]:[]));
  };
  Type.prototype.stop=function(when=0) {
    if(this.__auditEvent)this.__auditEvent.stopAt=Math.max(when,this.context.currentTime);
    return stop.call(this,when);
  };
}
const panel=document.createElement('details');
panel.style.cssText='position:fixed;bottom:0;right:0;z-index:99999;max-width:460px;max-height:180px;overflow:auto;background:#fff;color:#111;font:11px monospace';
const summary=document.createElement('summary');summary.textContent='Local audio audit';panel.append(summary);
const stall=document.createElement('button');stall.textContent='Audit: 320ms layout stall';
stall.onclick=()=>{const until=performance.now()+320;while(performance.now()<until){};};panel.append(stall);
const output=document.createElement('pre');output.setAttribute('aria-label','Audio audit measurements');panel.append(output);document.body.append(panel);
setInterval(()=>{
  const clock=getMetronomePlaybackClock();
  const shown=[...new Set([...events.filter(e=>e.loop),...events.slice(-500)])];
  output.textContent=JSON.stringify({clocks:[...contexts].map(c=>({time:c.currentTime,state:c.state})),
    metronome:clock?{originTime:clock.originTime,secondsPerBeat:clock.secondsPerBeat}:null,
    events:shown.map(e=>({...e,rate:nodes.get(e.id)?.playbackRate?.value||1}))});
},250);
await import('../src/main.jsx');
