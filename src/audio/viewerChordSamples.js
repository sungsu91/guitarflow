import { AUDIO_BUS_IDS, getAudioBusInput } from './audioBus.js';

// Measured from each recording; retain ~20 ms before the first string attack.
// Ignore isolated handling noise earlier in the recording (especially D/F).
const ATTACK_START_SECONDS = { C: 0.54, D: 2.85, E: 2.62, F: 1.59, G: 1.04, A: 1.66, B: 0.95 };

export const VIEWER_CHORD_SAMPLES = Object.freeze(Object.fromEntries(
  Object.entries({ C: 192199, D: 192200, E: 192201, F: 192204, G: 192203, A: 192197, B: 192198 })
    .map(([root, id]) => [root, {
      title: `${root} major (guitar).wav`,
      startSeconds: ATTACK_START_SECONDS[root],
      url: `/sounds/guitar-chords/${id}__biblicalbricksproductions__${root.toLowerCase()}-major-guitar.wav`,
      source: `https://freesound.org/people/BiblicalBricksProductions/sounds/${id}/`,
    }]),
));

export function getViewerChordSample(root, quality, extension) {
  return quality === 'major' && extension === 'none' ? VIEWER_CHORD_SAMPLES[root] ?? null : null;
}

// Decode each original only once per context. Failed requests remain retryable.
const caches = new WeakMap();
export function loadViewerChordSample(audio, sample) {
  let cache = caches.get(audio);
  if (!cache) { cache = new Map(); caches.set(audio, cache); }
  if (!cache.has(sample.url)) {
    const pending = fetch(sample.url).then(response => {
      if (!response.ok) throw new Error(`Chord sample HTTP ${response.status}`);
      return response.arrayBuffer();
    }).then(bytes => audio.decodeAudioData(bytes)).catch(error => {
      cache.delete(sample.url);
      throw error;
    });
    cache.set(sample.url, pending);
  }
  return cache.get(sample.url);
}

export function playViewerChordSample(audio, buffer, sample) {
  const source = audio.createBufferSource();
  const gain = audio.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(0, audio.currentTime);
  gain.gain.linearRampToValueAtTime(0.7, audio.currentTime + 0.003);
  source.connect(gain);
  gain.connect(getAudioBusInput(AUDIO_BUS_IDS.INSTRUMENT, audio) || audio.destination);
  source.onended = () => { source.disconnect(); gain.disconnect(); };
  source.start(0, sample?.startSeconds ?? 0);
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const now = audio.currentTime;
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.015);
    source.stop(now + 0.02);
  };
}
