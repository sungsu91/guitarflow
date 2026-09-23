import ko from "../i18n/locales/ko.js";
import { getMetronomeVolumeSnapshot } from './metronomeVolumeStore.js';

// A separate one-voice preview bus never touches the running transport or its sources.
let context;
let voice;
let generation = 0;
const buffers = new Map();
export function stopMetronomePreview() {
  generation += 1;
  if (voice) { try { voice.stop(); } catch {} voice = null; }
}
export async function previewMetronomeTone(option, accent = true) {
  stopMetronomePreview();
  const request = generation;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  context ??= new AudioContext();
  await context.resume();
  let buffer;
  if (option.src) {
    if (!buffers.has(option.src)) {
      buffers.set(option.src, fetch(option.src).then(r => {
        if (!r.ok) throw new Error(ko["audio.couldnTLoadAudio"]);
        return r.arrayBuffer();
      }).then(data => context.decodeAudioData(data)).catch(error => { buffers.delete(option.src); throw error; }));
    }
    buffer = await buffers.get(option.src);
  }
  if (request !== generation) return;
  const now = context.currentTime;
  const gain = context.createGain();
  const volume = getMetronomeVolumeSnapshot().volume;
  const source = buffer ? context.createBufferSource() : context.createOscillator();
  if (buffer) {
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume * (accent ? 1 : .5), now);
    gain.gain.setTargetAtTime(.0001, now + Math.min(buffer.duration, .75), .015);
  } else {
    source.type = 'square';
    source.frequency.setValueAtTime(accent ? 1840 : 920, now);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, volume * .4), now + (accent ? .003 : .008));
    gain.gain.exponentialRampToValueAtTime(.0001, now + (accent ? .07 : .05));
  }
  source.connect(gain); gain.connect(context.destination);
  voice = source;
  source.onended = () => { source.disconnect(); gain.disconnect(); if (voice === source) voice = null; };
  source.start(now); source.stop(now + (buffer ? Math.min(buffer.duration, .85) : .07));
}
