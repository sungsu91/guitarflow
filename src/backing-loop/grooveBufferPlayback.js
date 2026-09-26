import { smoothAudioParam } from '../audio/audioBus.js';

// The audio thread wraps the buffer itself; no ended event, seek, or JS timer
// participates in a loop boundary. Timers are only used to paint the playhead.
export function createGrooveBufferPlayback({ context, buffer, output, level = 1, onEnded }) {
  const transportGain = context.createGain();
  const programGain = context.createGain();
  transportGain.connect(programGain);
  let connected = false;
  let source = null;
  let offset = 0;
  let startedAt = 0;
  let looping = false;
  let disposed = false;
  const duration = buffer.duration;
  const clampTime = value => Math.max(0, Math.min(duration, Number(value) || 0));
  const position = () => {
    const elapsed = offset + (source ? Math.max(0, context.currentTime - startedAt) : 0);
    return looping && duration ? elapsed % duration : clampTime(elapsed);
  };
  const stopSource = () => {
    const previous = source;
    source = null;
    if (!previous) return;
    previous.onended = null;
    previous.stop();
    previous.disconnect();
  };
  const graph = {
    context,
    programGain,
    transportGain,
    connect() {
      if (connected || disposed) return;
      programGain.connect(output);
      connected = true;
    },
    disconnect() {
      if (!connected) return;
      programGain.disconnect();
      connected = false;
    },
    setLevel(value, options) { smoothAudioParam(programGain.gain, value, context, options); },
    setTransportLevel(value, options) { smoothAudioParam(transportGain.gain, value, context, options); },
    setGrooveEnabled() {},
  };
  graph.setLevel(level, { immediate: true });
  graph.connect();
  const player = {
    graph,
    duration,
    get paused() { return !source; },
    get currentTime() { return position(); },
    set currentTime(value) {
      const playing = Boolean(source);
      stopSource();
      offset = clampTime(value);
      if (playing) player.play();
    },
    get loop() { return looping; },
    set loop(value) {
      offset = position();
      startedAt = context.currentTime;
      looping = Boolean(value);
      if (source) source.loop = looping;
    },
    async play() {
      if (disposed) throw new Error('Backing player has been disposed');
      if (source) return;
      if (offset >= duration) offset = 0;
      graph.connect();
      const next = context.createBufferSource();
      next.buffer = buffer;
      next.loop = looping;
      next.loopStart = 0;
      next.loopEnd = duration;
      next.connect(transportGain);
      next.onended = () => {
        if (source !== next) return;
        source = null;
        offset = duration;
        next.disconnect();
        onEnded?.();
      };
      startedAt = context.currentTime;
      source = next;
      next.start(startedAt, offset);
    },
    pause() {
      offset = position();
      stopSource();
    },
    dispose() {
      player.pause();
      graph.disconnect();
      transportGain.disconnect();
      disposed = true;
    },
  };
  return player;
}
