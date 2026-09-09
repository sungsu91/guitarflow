import { useCallback, useEffect, useRef, useState } from 'react';
import { AUDIO_BUS_IDS, getAudioBusInput, resumeSharedAudioContext } from '../audio/audioBus.js';
import { createAudioTransportCursor, collectAudioTransportSteps, getAudioTransportStepSeconds } from '../audio/transportClock.js';

export default function useEtudeMetronome(bpm) {
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [error, setError] = useState('');
  const session = useRef(null);
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
    setPlaying(false); setBeat(-1);
  }, []);
  const start = useCallback(async () => {
    stop();
    const request = token.current;
    try {
      const context = await resumeSharedAudioContext();
      if (request !== token.current) return;
      if (!context || context.state !== 'running') throw new Error('오디오를 시작할 수 없습니다. 다시 눌러 주세요.');
      const gain = context.createGain();
      gain.connect(getAudioBusInput(AUDIO_BUS_IDS.METRONOME));
      const origin = context.currentTime + 0.06;
      const stepSeconds = getAudioTransportStepSeconds(bpm);
      const s = { gain, oscillators: new Set(), cursor: createAudioTransportCursor({ originTime: origin, stepSeconds }), frame: 0, timer: 0 };
      session.current = s;
      const schedule = () => {
        if (session.current !== s) return;
        const batch = collectAudioTransportSteps(s.cursor, { currentTime: context.currentTime, horizonSeconds: 0.1 });
        s.cursor = batch.cursor;
        batch.steps.forEach(step => {
          const o = context.createOscillator(), envelope = context.createGain();
          o.frequency.value = step.index % 4 === 0 ? 1200 : 850;
          envelope.gain.setValueAtTime(0.0001, step.time);
          envelope.gain.exponentialRampToValueAtTime(0.22, step.time + 0.002);
          envelope.gain.exponentialRampToValueAtTime(0.0001, step.time + 0.045);
          o.connect(envelope); envelope.connect(gain);
          s.oscillators.add(o);
          o.onended = () => { s.oscillators.delete(o); o.disconnect(); envelope.disconnect(); };
          o.start(step.time); o.stop(step.time + 0.05);
        });
      };
      const paint = () => {
        if (session.current !== s) return;
        setBeat(context.currentTime < origin ? -1 : Math.floor((context.currentTime - origin) / stepSeconds) % 4);
        s.frame = requestAnimationFrame(paint);
      };
      schedule(); s.timer = setInterval(schedule, 25); paint(); setPlaying(true); setError('');
    } catch (e) { stop(); setError(e.message); }
  }, [bpm, stop]);
  useEffect(() => { stop(); return stop; }, [bpm, stop]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [stop]);
  return { playing, beat, error, stop, toggle: playing ? stop : start };
}
