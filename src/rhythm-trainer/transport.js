import { timeline,playbackTicks } from './model.js';
// Schedule compiled event onsets directly; tuplets need no integer-tick approximation.
export class RhythmTransport {
  constructor(context, output, onFrame) {this.ctx=context;this.output=output;this.onFrame=onFrame;this.sources=new Set();this.tick=0;this.running=false;}
  configure(pattern) {const running=this.running;const tick=this.position();this.stop();this.pattern=pattern;this.events=timeline(pattern);this.total=playbackTicks(pattern);this.tick=tick>=this.total?tick%this.total:tick;if(running)this.start(false);}
  position() {return this.running?this.anchorTick+Math.max(0,this.ctx.currentTime-this.anchorTime)*this.pattern.bpm/5:this.tick;}
  audiblePosition() {const stamp=this.ctx.getOutputTimestamp?.(); const time=stamp?.contextTime>0?stamp.contextTime+(performance.now()-stamp.performanceTime)/1000:this.ctx.currentTime;return this.anchorTick+Math.max(0,time-this.anchorTime)*this.pattern.bpm/5;}
  start(count=true) {if(this.running)return; if(count&&this.tick<=0&&this.pattern.countIn)this.tick=-(this.pattern.meter+1)*12;this.anchorTick=this.tick;this.anchorTime=this.ctx.currentTime+.045;this.next=this.tick;this.running=true;this.onFrame(this.tick,true);this.timer=setInterval(()=>this.schedule(),20);this.schedule();const draw=()=>{if(!this.running)return;const t=this.audiblePosition();if(!this.pattern.loop&&t>=this.total){this.stop();this.tick=0;this.onFrame(0,false);return;}this.onFrame(t,true);this.raf=requestAnimationFrame(draw);};this.raf=requestAnimationFrame(draw);}
  stop() {this.tick=this.position();this.running=false;clearInterval(this.timer);cancelAnimationFrame(this.raf);for(const source of this.sources){try{source.stop();}catch{} source.disconnect();}this.sources.clear();}
  pause() {this.stop();this.onFrame(this.tick,false);}
  seek(tick) {const running=this.running;this.stop();this.tick=tick;this.onFrame(tick,running);if(running)this.start(false);}
  schedule() {
    const now=this.ctx.currentTime;
    const until=this.anchorTick+(now+.09-this.anchorTime)*this.pattern.bpm/5;
    const from=Math.max(this.next,this.anchorTick+(now-this.anchorTime)*this.pattern.bpm/5-1e-7);
    if(until<from)return;

    for(let beat=Math.ceil(from/12)*12;beat<until;beat+=12){
      if(beat>=this.total&&!this.pattern.loop)break;
      if((beat<0&&beat>=-this.pattern.meter*12)||(beat>=0&&this.pattern.click))this.beatSound(this.anchorTime+(beat-this.anchorTick)*5/this.pattern.bpm,((beat/12%this.pattern.meter)+this.pattern.meter)%this.pattern.meter,beat%(this.pattern.meter*12)===0);
    }
    for(let cycle=Math.max(0,Math.floor(from/this.total));cycle<=Math.floor(until/this.total);cycle++){
      if(cycle>0&&!this.pattern.loop)break;
      for(const event of this.events){const at=cycle*this.total+event.at;
        if(at>=from&&at<until&&!event.rest&&!event.continuation)this.sound(this.anchorTime+(at-this.anchorTick)*5/this.pattern.bpm,this.pattern.tone);
      }
    }
    this.next=until;
  }
  setBeatSound(tone,buffers=[]) {this.beatTone=tone;this.beatBuffers=buffers;}
  beatSound(when,index,accent) {
    const buffer=this.beatBuffers?.[this.beatTone==='voice'?index:0];
    if(!buffer){this.sound(when,'click',accent);return;}
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;
    const rate=this.beatTone==='voice'?Math.max(1,buffer.duration/(60/this.pattern.bpm*.85)):1;
    source.playbackRate.value=rate;gain.gain.setValueAtTime(this.beatTone==='voice'?.75:.45,when);
    source.connect(gain);gain.connect(this.output);this.sources.add(source);
    source.onended=()=>{this.sources.delete(source);source.disconnect();gain.disconnect();};
    source.start(when);source.stop(when+buffer.duration/rate);
  }
  sound(when,tone,accent=false) {const c=this.ctx;const gain=c.createGain();gain.connect(this.output);const duration=tone==='clap'?.1:.055;gain.gain.setValueAtTime(tone==='click'?.10:.28,when);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);let source;
    if(tone==='clap'||tone==='rim'){source=c.createBufferSource();const b=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(tone==='rim'?Math.sin(i*1.7):1);source.buffer=b;}
    else {source=c.createOscillator();source.type=tone==='click'?'sine':'triangle';source.frequency.setValueAtTime(tone==='click'?(accent?1800:1300):760,when);}
    source.connect(gain);this.sources.add(source);source.onended=()=>{this.sources.delete(source);source.disconnect();gain.disconnect();};source.start(when);source.stop(when+duration);
  }
  dispose(){this.stop();}
}
