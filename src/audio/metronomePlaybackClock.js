// A musical timeline, shared by the standalone metronome and groove backing.
// AudioContext time remains the authority; rendering and timer cadence do not.
let current = null;
const listeners = new Set();

export function getMetronomePlaybackClock() { return current; }
export function subscribeMetronomePlaybackClock(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function setMetronomePlaybackClock(next) {
  if (current === next || (current && next
    && current.context === next.context && current.originTime === next.originTime
    && current.secondsPerBeat === next.secondsPerBeat)) return;
  current = next;
  listeners.forEach(listener => listener(current));
}

export function getGrooveClockPosition(clock, { context, duration, beats, when = context.currentTime }) {
  if (!clock || clock.context !== context || !(beats > 0) || !(duration > 0)) return null;
  const startTime = Math.max(when, clock.originTime);
  const elapsedBeats = Math.max(0, startTime - clock.originTime) / clock.secondsPerBeat;
  // Correct the fractional sample lost when a rendered WAV is rounded to frames.
  // Thus even thousands of repeats occupy exactly the same musical duration.
  const playbackRate = duration / (beats * clock.secondsPerBeat);
  return { startTime, offset: (elapsedBeats % beats) * duration / beats, playbackRate };
}
