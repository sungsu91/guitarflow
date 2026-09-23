import {limitGrooveRenderPeaks} from './grooveRenderLevel.js';
import {normalizeGroovePattern, scheduleGrooveStep, createGrooveVoiceState} from '../metronome/groove.js';
import {METRONOME_TONE_OPTIONS, TIME_SIGNATURE_OPTIONS} from '../metronome/options.js';
import {getMetronomeSubdivisionOption} from '../metronome/subdivision.js';
import {encodePcmWav} from '../audio/audioPostProcessing.js';
import {defaults, readPacks} from '../metronome/groovePackLibrary.js';

export const isGrooveBackingId = id => String(id).startsWith('groove:');
export const grooveBackingId = pack => `groove:${pack.builtin ? 'builtin' : 'saved'}:${pack.id}`;

// Playlist entries contain only a reference. Pattern, title and tempo remain
// owned by the shared groove catalog; no second recording is ever persisted.
export function listGrooveBackingSources() {
  return [...readPacks().reverse(), ...defaults].map(pack => ({
    id: grooveBackingId(pack), title: pack.title, sourceType: 'groove',
    bpm: getGrooveBackingTiming(pack).bpm, builtin: Boolean(pack.builtin), category: pack.category || '',
    durationMs: getGrooveBackingTiming(pack).durationSeconds * 1000,
    updatedAt: Number(pack.createdAt) || 0, grooveRevision: JSON.stringify(pack),
  }));
}

let playbackCache;
export async function loadGrooveBackingSource(id) {
  const pack = [...readPacks(), ...defaults].find(pack => grooveBackingId(pack) === id);
  if (!pack) return null;
  const revision = JSON.stringify(pack);
  if (playbackCache?.id === id && playbackCache.grooveRevision === revision) return playbackCache;
  // The existing backing transport consumes audio buffers. Render only on play,
  // keep one temporary source in memory, and invalidate it when its pack changes.
  const source = await renderGrooveBacking(pack, pack.bpm);
  playbackCache = {...source, id, title: pack.title, sourceType: 'groove', grooveRevision: revision};
  return playbackCache;
}

export function getGrooveBackingTiming(pack, bpm) {
  const tempo = Math.max(20, Math.min(300, Number(bpm) || Number(pack.bpm) || 80));
  const beats = TIME_SIGNATURE_OPTIONS.find(option => option.id === pack.timeSignature)?.beats ?? 4;
  const divisions = getMetronomeSubdivisionOption(pack.subdivision).clicksPerBeat;
  return {bpm: tempo, steps: beats * divisions, stepSeconds: 60 / tempo / divisions, durationSeconds: beats * 60 / tempo * 8};
}

export async function renderGrooveBacking(pack, bpm) {
  const timing = getGrooveBackingTiming(pack, bpm);
  const sampleRate = 44100;
  const frames = Math.round(timing.durationSeconds * sampleRate);
  // Render a preceding cycle too, preserving cymbal tails across the loop seam.
  const audio = new OfflineAudioContext(2, frames * 2, sampleRate);
  const pattern = normalizeGroovePattern(pack.pattern);
  const buffers = {};
  const tones = [...new Set(pattern.rows.filter(row => !row.muted && row.volume > 0 && row.steps.some(Boolean)).map(row => row.tone))];
  await Promise.all(tones.filter(tone => tone !== 'tick').map(async tone => {
    const option = METRONOME_TONE_OPTIONS.find(item => item.id === tone);
    if (!option?.src) throw new Error('Unknown groove tone');
    const response = await fetch(option.src);
    if (!response.ok) throw new Error('Groove sample unavailable');
    buffers[tone] = await audio.decodeAudioData(await response.arrayBuffer());
  }));
  const voiceState = createGrooveVoiceState();
  for (let step = 0; step < timing.steps * 16; step++) {
    scheduleGrooveStep({audio, output: audio.destination, buffers, pattern,
      index: step % timing.steps, time: step * timing.stepSeconds, volume: 1,
      voiceState, track: () => {}});
  }
  const rendered = await audio.startRendering();
  const channels = [rendered.getChannelData(0).slice(frames), rendered.getChannelData(1).slice(frames)];
  limitGrooveRenderPeaks(channels);
  const blob = encodePcmWav(channels, sampleRate);
  const title = `${pack.title} · ${timing.bpm} BPM`;
  return {blob, durationMs: frames / sampleRate * 1000, title, fileName: `${title}.wav`, mimeType: 'audio/wav', sourceType: 'import', createdAt: Date.now()};
}
