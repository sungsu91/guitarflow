import {createGrooveBufferPlayback} from './grooveBufferPlayback.js';
import {getMetronomePlaybackClock, subscribeMetronomePlaybackClock, getGrooveClockPosition} from '../audio/metronomePlaybackClock.js';

// Only catalog grooves have a reliable beat count. Untimed recordings/imports
// continue to use their original transport and are never tempo-guessed.
export function createSynchronizedGroovePlayback({beats, ...options}) {
  const player = createGrooveBufferPlayback(options);
  if (!(beats > 0)) return player;
  const {context, buffer} = options;
  const play = player.play.bind(player);
  const dispose = player.dispose.bind(player);
  function align(clock, when = context.currentTime) {
    const plan = getGrooveClockPosition(clock, {context, duration: buffer.duration, beats, when});
    if (!plan) return false;
    const difference = Math.abs(player.currentTime - plan.offset);
    const phaseError = Math.min(difference, Math.abs(buffer.duration - difference));
    if (!player.paused && plan.startTime <= context.currentTime
      && phaseError < 1 / (context.sampleRate || 44100)) {
      // Tempo changes preserve phase: retime the existing source, without a cut.
      player.playbackRate = plan.playbackRate;
    } else {
      // Decode/UI work may straddle an audio quantum. Schedule a little ahead
      // and derive the offset at that exact instant, not at the click event.
      const start = getGrooveClockPosition(clock, {context, duration: buffer.duration, beats,
        when: Math.max(when, context.currentTime + .02)});
      player.pause();
      player.currentTime = start.offset;
      player.playbackRate = start.playbackRate;
      void play(start.startTime);
    }
    return true;
  }
  player.play = async (when) => {
    if (!player.paused) return;
    // Explicit origins belong to another synchronized transport (score practice).
    if (when == null) {
      if (align(getMetronomePlaybackClock())) return;
      player.playbackRate = 1;
    }
    return play(when);
  };
  const unsubscribe = subscribeMetronomePlaybackClock(clock => {
    if (!player.paused) align(clock);
  });
  player.dispose = () => { unsubscribe(); dispose(); };
  return player;
}
