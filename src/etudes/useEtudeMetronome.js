import { useCallback, useEffect, useRef, useState } from 'react';
import { AUDIO_BUS_IDS, getAudioBusInput, resumeSharedAudioContext, smoothAudioParam } from '../audio/audioBus.js';
import { createAudioTransportCursor, collectAudioTransportSteps, getAudioTransportStepSeconds } from '../audio/transportClock.js';
import { useMetronomeVolume } from '../audio/metronomeVolumeStore.js';

// The etude reader is commonly used with an unamplified guitar, so start near
// full digital level and let the device volume control the listening level.
// The shared master limiter remains the final peak guard.
const ETUDE_CLICK_PEAK = 1.08;
const ETUDE_WEAK_CLICK_PEAK = 0.9;

export default function useEtudeMetronome(bpm, { beatsPerBar = 4, beatUnit = 4, audible = true, downbeatAt, clickAccent, liveTempo = false, clicksPerBeat = 1, toneSrc } = {}) {
  const { volume } = useMetronomeVolume();
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [tick, setTick] = useState(-1);
  const [error, setError] = useState('');
  const session = useRef(null), heldPosition=useRef(-1);
  const [paused,setPaused]=useState(false);
  const clickAccentRef=useRef(clickAccent); clickAccentRef.current=clickAccent;
  const downbeatRef = useRef(downbeatAt); downbeatRef.current = downbeatAt;
  const config=useRef({beatsPerBar,clicksPerBeat});config.current={beatsPerBar,clicksPerBeat};
  const token = useRef(0);
  const toneBuffer = useRef(null);
  useEffect(()=>{let live=true;toneBuffer.current=null;if(toneSrc)resumeSharedAudioContext().then(async context=>{const response=await fetch(toneSrc);if(!response.ok)throw Error("음색을 불러오지 못했습니다.");const buffer=await context.decodeAudioData(await response.arrayBuffer());if(live)toneBuffer.current=buffer;}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[toneSrc]);
  const stop = useCallback(() => {
    token.current++;
    const s = session.current;
    session.current = null;
    if (s) {
      clearInterval(s.timer); cancelAnimationFrame(s.frame);
      s.gain.disconnect();
      s.oscillators.forEach(o => { try { o.stop(); } catch {} });
    }
    heldPosition.current=-1;setPaused(false);setPlaying(false); setBeat(-1); setTick(-1);
  }, []);
  const start = useCallback(async ({beatOffset=0,durationSeconds=Infinity,clicks=null,cycleSeconds=0,cycleOffset=0,repeatCount=1}={}) => {
    stop();
    const request = token.current;
    try {
      const context = await resumeSharedAudioContext();
      if (request !== token.current) return;
      if (!context || context.state !== 'running') throw new Error('오디오를 시작할 수 없습니다. 다시 눌러 주세요.');
      const gain = context.createGain();
      gain.gain.setValueAtTime(audible ? volume : 0, context.currentTime);
      gain.connect(getAudioBusInput(AUDIO_BUS_IDS.METRONOME));
      const origin = context.currentTime + 0.06;
      const stepSeconds = getAudioTransportStepSeconds(bpm) * 4 / beatUnit;
      const fraction=beatOffset-Math.floor(beatOffset),clickOrigin=origin+(fraction?1-fraction:0)*stepSeconds,firstBeat=Math.ceil(beatOffset);
      const s = { context, gain, origin, stepSeconds, positionOffset:beatOffset, firstBeat, oscillators: new Set(), cursor: createAudioTransportCursor({ originTime: clickOrigin, stepSeconds:stepSeconds/clicksPerBeat }), frame: 0, timer: 0 };
      session.current = s;
      let clickIndex=0,clickCycle=cycleSeconds?Math.floor(cycleOffset/cycleSeconds):0;
      const schedule = () => {
        if (session.current !== s) return;
        const batch = clicks ? {steps:[]} : collectAudioTransportSteps(s.cursor, { currentTime: context.currentTime, horizonSeconds: 0.1 });
        if (clicks) {
          while(clicks.length){
            if(clickIndex===clicks.length){if(!cycleSeconds||clickCycle+1>=repeatCount)break;clickIndex=0;clickCycle++;}
            const click=clicks[clickIndex],time=origin+click.time+(cycleSeconds?clickCycle*cycleSeconds-cycleOffset:0);
            if(time>=origin+durationSeconds-1e-7||time>=context.currentTime+0.1)break;
            clickIndex++;
            if(time>=origin-1e-7)batch.steps.push({...click,time});
          }
        } else s.cursor = batch.cursor;
        batch.steps.filter(step=>step.time<origin+durationSeconds-1e-7).forEach(step => {
          const accent=clickAccentRef.current?.(step);
          if(accent==='mute')return;
          const buffer=toneBuffer.current;
          const o = buffer ? context.createBufferSource() : context.createOscillator(), envelope = context.createGain();
          const downbeat = accent ?? step.downbeat ?? (downbeatRef.current ? downbeatRef.current(step.index/config.current.clicksPerBeat+s.firstBeat) : (step.index/config.current.clicksPerBeat+s.firstBeat) % config.current.beatsPerBar === 0);
          if(buffer)o.buffer=buffer;else o.frequency.value = downbeat ? 1200 : 850;
          envelope.gain.setValueAtTime(0.0001, step.time);
          envelope.gain.exponentialRampToValueAtTime(downbeat ? ETUDE_CLICK_PEAK : ETUDE_WEAK_CLICK_PEAK, step.time + 0.002);
          envelope.gain.exponentialRampToValueAtTime(0.0001, step.time + (buffer ? Math.min(buffer.duration,.18) : .045));
          o.connect(envelope); envelope.connect(gain);
          s.oscillators.add(o);
          o.onended = () => { s.oscillators.delete(o); o.disconnect(); envelope.disconnect(); };
          o.start(step.time); o.stop(step.time + (buffer ? Math.min(buffer.duration,.2) : .05));
        });
      };
      const paint = () => {
        if (session.current !== s) return;
        const step = context.currentTime < s.origin ? -1 : Math.floor(s.positionOffset+(context.currentTime-s.origin)/s.stepSeconds);
        setBeat(step < 0 ? -1 : step % config.current.beatsPerBar); setTick(step);
        s.frame = requestAnimationFrame(paint);
      };
      schedule(); s.timer = setInterval(schedule, 25); paint(); setPlaying(true); setError('');
      return {context,origin};
    } catch (e) { stop(); setError(e.message); }
  }, [bpm, stop, volume, beatsPerBar, beatUnit, audible, clicksPerBeat]);
  useEffect(() => {
    const s = session.current;
    if (s) smoothAudioParam(s.gain.gain, audible ? volume : 0, s.context, { timeConstant: 0.01 });
  }, [volume, audible]);
  useEffect(() => {
    const s=session.current;if(!liveTempo){stop();return;}
    if(!s)return;
    const now=s.context.currentTime,position=s.positionOffset+Math.max(0,(now-s.origin)/s.stepSeconds),stepSeconds=getAudioTransportStepSeconds(bpm)*4/beatUnit;
    s.oscillators.forEach(o=>{try{o.stop();}catch{}});
    s.origin=now;s.positionOffset=position;s.stepSeconds=stepSeconds;s.firstBeat=Math.ceil(position*clicksPerBeat)/clicksPerBeat;
    s.cursor=createAudioTransportCursor({originTime:now+(s.firstBeat-position)*stepSeconds,stepSeconds:stepSeconds/clicksPerBeat});
  },[bpm,beatsPerBar,beatUnit,liveTempo,clicksPerBeat,stop]);
  useEffect(()=>stop,[stop]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [stop]);
  // Read the shared audio clock without publishing React state on every animation frame.
  const getPosition = useCallback(() => {
    const s = session.current;
    return s ? s.positionOffset+Math.max(0,(s.context.currentTime-s.origin)/s.stepSeconds) : heldPosition.current;
  }, []);
  const pause=useCallback(()=>{const position=getPosition();stop();heldPosition.current=position;setPaused(position>=0);setTick(Math.floor(position));setBeat(position<0?-1:Math.floor(position)%beatsPerBar);},[getPosition,stop,beatsPerBar]);
  const seek=useCallback(position=>{const resume=Boolean(session.current);stop();heldPosition.current=Math.max(0,position);setPaused(true);setTick(Math.floor(position));setBeat(Math.floor(position)%beatsPerBar);if(resume)void start({beatOffset:position});},[stop,start,beatsPerBar]);
  return { playing, paused, beat, tick, error, start, stop, pause, seek, getPosition, toggle: playing ? stop : start };
}
