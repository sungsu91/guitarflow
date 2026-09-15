import { useCallback, useEffect, useRef, useState } from 'react';
import { AUDIO_BUS_IDS, getAudioBusInput, resumeSharedAudioContext, smoothAudioParam } from '../audio/audioBus.js';
import { createAudioTransportCursor, collectAudioTransportSteps, getAudioTransportStepSeconds } from '../audio/transportClock.js';
import { useMetronomeVolume } from '../audio/metronomeVolumeStore.js';

// The etude reader is commonly used with an unamplified guitar, so start near
// full digital level and let the device volume control the listening level.
// The shared master limiter remains the final peak guard.
const ETUDE_CLICK_PEAK = 1.08;
const ETUDE_WEAK_CLICK_PEAK = 0.9;

export default function useEtudeMetronome(bpm, { beatsPerBar = 4, beatUnit = 4, audible = true, downbeatAt } = {}) {
  const { volume } = useMetronomeVolume();
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [tick, setTick] = useState(-1);
  const [error, setError] = useState('');
  const session = useRef(null);
  const downbeatRef = useRef(downbeatAt); downbeatRef.current = downbeatAt;
  const token = useRef(0);
  const stop = useCallback(() => {
    token.current++;
    const s = session.current;
    session.current = null;
    if (s) {
      clearInterval(s.timer); cancelAnimationFrame(s.frame);
      s.gain.disconnect();
      s.oscillators.forEach(o => { try { o.stop(); } catch {} });
    }
    setPlaying(false); setBeat(-1); setTick(-1);
  }, []);
  const start = useCallback(async ({beatOffset=0}={}) => {
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
      const s = { context, gain, origin, stepSeconds, oscillators: new Set(), cursor: createAudioTransportCursor({ originTime: clickOrigin, stepSeconds }), frame: 0, timer: 0 };
      session.current = s;
      const schedule = () => {
        if (session.current !== s) return;
        const batch = collectAudioTransportSteps(s.cursor, { currentTime: context.currentTime, horizonSeconds: 0.1 });
        s.cursor = batch.cursor;
        batch.steps.forEach(step => {
          const o = context.createOscillator(), envelope = context.createGain();
          const downbeat = downbeatRef.current ? downbeatRef.current(step.index) : (step.index+firstBeat) % beatsPerBar === 0;
          o.frequency.value = downbeat ? 1200 : 850;
          envelope.gain.setValueAtTime(0.0001, step.time);
          envelope.gain.exponentialRampToValueAtTime(downbeat ? ETUDE_CLICK_PEAK : ETUDE_WEAK_CLICK_PEAK, step.time + 0.002);
          envelope.gain.exponentialRampToValueAtTime(0.0001, step.time + 0.045);
          o.connect(envelope); envelope.connect(gain);
          s.oscillators.add(o);
          o.onended = () => { s.oscillators.delete(o); o.disconnect(); envelope.disconnect(); };
          o.start(step.time); o.stop(step.time + 0.05);
        });
      };
      const paint = () => {
        if (session.current !== s) return;
        const step = context.currentTime < clickOrigin ? -1 : Math.floor((context.currentTime - clickOrigin) / stepSeconds)+firstBeat;
        setBeat(step < 0 ? -1 : step % beatsPerBar); setTick(step);
        s.frame = requestAnimationFrame(paint);
      };
      schedule(); s.timer = setInterval(schedule, 25); paint(); setPlaying(true); setError('');
      return {context,origin};
    } catch (e) { stop(); setError(e.message); }
  }, [bpm, stop, volume, beatsPerBar, beatUnit, audible]);
  useEffect(() => {
    const s = session.current;
    if (s) smoothAudioParam(s.gain.gain, audible ? volume : 0, s.context, { timeConstant: 0.01 });
  }, [volume, audible]);
  useEffect(() => { stop(); return stop; }, [bpm, beatsPerBar, beatUnit, stop]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [stop]);
  // Read the shared audio clock without publishing React state on every animation frame.
  const getPosition = useCallback(() => {
    const s = session.current;
    return s ? (s.context.currentTime - s.origin) / s.stepSeconds : -1;
  }, []);
  return { playing, beat, tick, error, start, stop, getPosition, toggle: playing ? stop : start };
}
