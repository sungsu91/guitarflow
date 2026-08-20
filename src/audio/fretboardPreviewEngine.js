import { AUDIO_BUS_IDS, getAudioBusInput } from "./audioBus.js";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Standard tuning, numbered from the thinnest string (1) to the thickest (6).
export const GUITAR_OPEN_STRING_MIDI = Object.freeze({
  1: 64, // E4
  2: 59, // B3
  3: 55, // G3
  4: 50, // D3
  5: 45, // A2
  6: 40, // E2
});

const outputGraphs = new WeakMap();
const pluckBufferCaches = new WeakMap();
const STRUM_VELOCITY_ATTENUATION = [0, 0.55, 0.2, 0.85, 0.4, 1];
const STRUM_INTERVAL_SHAPE = [1.02, 1.1, 0.97, 0.9, 0.84];
const STRUM_ATTACK_SHAPE = [0.93, 1.08, 0.98, 1.12, 0.95, 1.04];
const CLEAN_GUITAR_STRING_PROFILES = Object.freeze({
  1: Object.freeze({ brightness: 1.08, body: 0.68, pickPosition: 0.76, sustain: 0.76 }),
  2: Object.freeze({ brightness: 1.03, body: 0.72, pickPosition: 0.73, sustain: 0.8 }),
  3: Object.freeze({ brightness: 0.98, body: 0.78, pickPosition: 0.7, sustain: 0.86 }),
  4: Object.freeze({ brightness: 0.91, body: 0.86, pickPosition: 0.67, sustain: 0.94 }),
  5: Object.freeze({ brightness: 0.84, body: 0.94, pickPosition: 0.64, sustain: 1.02 }),
  6: Object.freeze({ brightness: 0.78, body: 1, pickPosition: 0.61, sustain: 1.08 }),
});

export const FRETBOARD_PREVIEW_INSTRUMENT = "clean-guitar";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getGuitarMidiAtPosition(stringNumberValue, fretNumberValue) {
  const stringNumber = Number(stringNumberValue);
  const fretNumber = Number(fretNumberValue);
  const openMidi = GUITAR_OPEN_STRING_MIDI[stringNumber];
  if (!Number.isInteger(stringNumber) || openMidi == null) return null;
  if (!Number.isInteger(fretNumber) || fretNumber < 0) return null;
  return openMidi + fretNumber;
}

export function getPitchFromMidi(midiValue) {
  const midi = Number(midiValue);
  if (!Number.isFinite(midi)) return null;
  const noteIndex = ((Math.round(midi) % 12) + 12) % 12;
  const octave = Math.floor(Math.round(midi) / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export function getGuitarPitchAtPosition(stringNumberValue, fretNumberValue) {
  const stringNumber = Number(stringNumberValue);
  const fretNumber = Number(fretNumberValue);
  const midi = getGuitarMidiAtPosition(stringNumber, fretNumber);
  if (midi == null) return null;
  const noteName = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return {
    frequency: 440 * 2 ** ((midi - 69) / 12),
    fretNumber,
    midi,
    noteName,
    octave,
    pitch: `${noteName}${octave}`,
    stringNumber,
  };
}

/**
 * Keep the fretboard preview in a clean-guitar timbre family. The physical
 * string and fret affect brightness, body resonance and sustain even when two
 * positions resolve to the same MIDI pitch.
 */
export function getCleanGuitarVoiceProfile(position = {}) {
  const stringNumber = clamp(Math.round(Number(position.stringNumber) || 1), 1, 6);
  const fretNumber = Math.max(0, Math.round(Number(position.fretNumber) || 0));
  const frequency = Math.max(40, Number(position.frequency) || 110);
  const stringProfile = CLEAN_GUITAR_STRING_PROFILES[stringNumber];
  const frettedDamping = Math.min(0.18, fretNumber * 0.0065);
  const openStringRing = fretNumber === 0 ? 0.11 : 0;
  return {
    bodyGainDb: 1.2 + stringProfile.body * 2.2 + (fretNumber === 0 ? 0.22 : 0),
    bodyHighFrequency: 410 + (6 - stringNumber) * 16,
    bodyLowFrequency: 102 + (6 - stringNumber) * 7,
    dampingSeconds: clamp(stringProfile.sustain - frettedDamping + openStringRing, 0.62, 1.19),
    pickPosition: clamp(stringProfile.pickPosition - fretNumber * 0.0025, 0.52, 0.78),
    stereoPan: ((3.5 - stringNumber) / 2.5) * 0.075,
    toneCutoff: clamp(3050 * stringProfile.brightness + frequency * 2.25 - fretNumber * 18, 2450, 5200),
    transientLevel: 0.12 + stringProfile.brightness * 0.055,
  };
}

/**
 * Resolve sound from physical guitar positions. A stale pitch/name stored on a
 * note can never change the result: string + fret are the source of truth.
 */
export function getPlayableGuitarPositions(notes = [], stringStates = {}) {
  const positionsByString = new Map();
  (Array.isArray(notes) ? notes : []).forEach((note) => {
    const stringNumber = Number(note?.stringNumber ?? note?.string);
    const fretNumber = Number(note?.fretNumber ?? note?.fret);
    if (String(stringStates?.[stringNumber] ?? "").toLowerCase() === "x") return;
    if (positionsByString.has(stringNumber)) return;
    const position = getGuitarPitchAtPosition(stringNumber, fretNumber);
    if (position) positionsByString.set(stringNumber, position);
  });
  Object.entries(stringStates ?? {}).forEach(([stringNumberValue, state]) => {
    if (String(state).toLowerCase() !== "o") return;
    const stringNumber = Number(stringNumberValue);
    if (positionsByString.has(stringNumber)) return;
    const openPosition = getGuitarPitchAtPosition(stringNumber, 0);
    if (openPosition) positionsByString.set(stringNumber, openPosition);
  });
  return [...positionsByString.values()].sort((a, b) => b.stringNumber - a.stringNumber);
}

export function getGuitarStrumVoices(notes = [], {
  humanizeSeed = 0,
  stringStates = {},
  strumSeconds = 0,
  velocityVariation = 0,
} = {}) {
  const positions = getPlayableGuitarPositions(notes, stringStates);
  const delay = clamp(Number(strumSeconds) || 0, 0, 0.08);
  const variation = clamp(Number(velocityVariation) || 0, 0, 0.2);
  const seed = Math.round(Number(humanizeSeed) || 0);
  let elapsed = 0;

  return positions.map((position, index) => {
    if (index > 0 && delay > 0) {
      const timingHumanize = 1 + getHumanizedUnit(seed, index, 1) * 0.055;
      const intervalShape = STRUM_INTERVAL_SHAPE[(index - 1) % STRUM_INTERVAL_SHAPE.length];
      elapsed += delay * clamp(intervalShape * timingHumanize, 0.78, 1.18);
    }
    const velocityBase = 1
      - variation * STRUM_VELOCITY_ATTENUATION[index % STRUM_VELOCITY_ATTENUATION.length]
      - index * 0.007;
    const velocityHumanize = getHumanizedUnit(seed, index, 2) * variation * 0.14;
    const openStringSustain = position.fretNumber === 0 ? 1.1 : 1;

    return {
      ...position,
      attackScale: STRUM_ATTACK_SHAPE[index % STRUM_ATTACK_SHAPE.length]
        * (1 + getHumanizedUnit(seed, index, 3) * 0.035),
      brightnessScale: 1 + getHumanizedUnit(seed, index, 4) * 0.035,
      delaySeconds: elapsed,
      durationScale: openStringSustain * (1 + getHumanizedUnit(seed, index, 5) * 0.025),
      velocity: clamp(velocityBase + velocityHumanize, 0.78, 1.05),
    };
  });
}

function getHumanizedUnit(seed, index, salt) {
  const raw = Math.sin((seed + 1) * 12.9898 + (index + 1) * 78.233 + salt * 37.719) * 43758.5453;
  return (raw - Math.floor(raw)) * 2 - 1;
}

function getOutputGraph(audio) {
  const cached = outputGraphs.get(audio);
  if (cached) return cached;

  const master = audio.createGain();
  const compressor = audio.createDynamicsCompressor();
  const bodyInput = audio.createGain();
  const bodyLow = audio.createBiquadFilter();
  const bodyMid = audio.createBiquadFilter();
  const bodyOutput = audio.createGain();
  master.gain.setValueAtTime(0.6, audio.currentTime);
  compressor.threshold.setValueAtTime(-6, audio.currentTime);
  compressor.knee.setValueAtTime(3, audio.currentTime);
  compressor.ratio.setValueAtTime(3, audio.currentTime);
  compressor.attack.setValueAtTime(0.004, audio.currentTime);
  compressor.release.setValueAtTime(0.12, audio.currentTime);
  bodyInput.gain.setValueAtTime(1, audio.currentTime);
  bodyLow.type = "peaking";
  bodyLow.frequency.setValueAtTime(108, audio.currentTime);
  bodyLow.Q.setValueAtTime(1.05, audio.currentTime);
  bodyLow.gain.setValueAtTime(4.1, audio.currentTime);
  bodyMid.type = "peaking";
  bodyMid.frequency.setValueAtTime(218, audio.currentTime);
  bodyMid.Q.setValueAtTime(0.82, audio.currentTime);
  bodyMid.gain.setValueAtTime(2.3, audio.currentTime);
  bodyOutput.gain.setValueAtTime(0.15, audio.currentTime);
  bodyInput.connect(bodyLow);
  bodyLow.connect(bodyMid);
  bodyMid.connect(bodyOutput);
  bodyOutput.connect(master);
  master.connect(compressor);
  compressor.connect(getAudioBusInput(AUDIO_BUS_IDS.INSTRUMENT, audio) || audio.destination);

  const graph = { bodyInput, bodyLow, bodyMid, bodyOutput, compressor, master };
  outputGraphs.set(audio, graph);
  return graph;
}

function createSeededNoise(seedValue) {
  let seed = seedValue >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
}

function getPluckBuffer(audio, position, duration) {
  let cache = pluckBufferCaches.get(audio);
  if (!cache) {
    cache = new Map();
    pluckBufferCaches.set(audio, cache);
  }
  const cacheKey = `${position.stringNumber}:${position.fretNumber}:${position.midi}:${duration.toFixed(2)}:${audio.sampleRate}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const sampleRate = audio.sampleRate;
  const frameCount = Math.max(1, Math.ceil(sampleRate * duration));
  const period = Math.max(2, Math.round(sampleRate / position.frequency));
  const profile = getCleanGuitarVoiceProfile(position);
  const buffer = audio.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);
  const random = createSeededNoise(
    position.midi * 2654435761
      + position.stringNumber * 2246822519
      + position.fretNumber * 3266489917
      + period,
  );
  let previousNoise = 0;

  for (let index = 0; index < Math.min(period, frameCount); index += 1) {
    const noise = random();
    const pickPositionNotch = Math.sin(Math.PI * (index / period) * profile.pickPosition);
    data[index] = (noise * 0.68 + previousNoise * 0.32) * (0.6 + pickPositionNotch * 0.4);
    previousNoise = noise;
  }

  const transientFrames = Math.min(frameCount, Math.max(1, Math.round(sampleRate * 0.009)));
  for (let index = 0; index < transientFrames; index += 1) {
    const transientEnvelope = Math.exp(-index / Math.max(1, sampleRate * 0.0022));
    data[index] += random() * transientEnvelope * profile.transientLevel;
  }

  const damping = Math.exp(-1 / (position.frequency * profile.dampingSeconds));
  const adjacentMix = 0.46 + position.stringNumber * 0.012;
  for (let index = period; index < frameCount; index += 1) {
    const delayed = data[index - period];
    const adjacent = data[index - period + 1] ?? delayed;
    data[index] = (delayed * (1 - adjacentMix) + adjacent * adjacentMix) * damping;
  }

  const attackFrames = Math.max(1, Math.round(sampleRate * 0.0018));
  const releaseFrames = Math.max(1, Math.round(sampleRate * Math.min(0.24, duration * 0.22)));
  for (let index = 0; index < frameCount; index += 1) {
    const attack = Math.min(1, index / attackFrames);
    const release = Math.min(1, (frameCount - index) / releaseFrames);
    data[index] *= attack * release * 0.88;
  }

  cache.set(cacheKey, buffer);
  return buffer;
}

function schedulePluck(
  audio,
  position,
  when,
  level,
  duration,
  output,
  bodyInput,
  attackSeconds,
  brightnessScale,
) {
  const source = audio.createBufferSource();
  const lowCut = audio.createBiquadFilter();
  const tone = audio.createBiquadFilter();
  const bodyLow = audio.createBiquadFilter();
  const bodyHigh = audio.createBiquadFilter();
  const gain = audio.createGain();
  const panner = typeof audio.createStereoPanner === "function" ? audio.createStereoPanner() : null;
  const profile = getCleanGuitarVoiceProfile(position);
  source.buffer = getPluckBuffer(audio, position, duration);
  lowCut.type = "highpass";
  lowCut.frequency.setValueAtTime(48, when);
  lowCut.Q.setValueAtTime(0.58, when);
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(
    clamp(profile.toneCutoff * (Number(brightnessScale) || 1), 2350, 5400),
    when,
  );
  tone.Q.setValueAtTime(0.52, when);
  bodyLow.type = "peaking";
  bodyLow.frequency.setValueAtTime(profile.bodyLowFrequency, when);
  bodyLow.Q.setValueAtTime(0.84, when);
  bodyLow.gain.setValueAtTime(profile.bodyGainDb, when);
  bodyHigh.type = "peaking";
  bodyHigh.frequency.setValueAtTime(profile.bodyHighFrequency, when);
  bodyHigh.Q.setValueAtTime(0.68, when);
  bodyHigh.gain.setValueAtTime(profile.bodyGainDb * 0.48, when);
  if (panner) panner.pan.setValueAtTime(profile.stereoPan, when);
  const safeAttack = clamp(Number(attackSeconds) || 0.008, 0.004, 0.035);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(level, when + safeAttack);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level * 0.32), when + duration * 0.74);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  source.connect(lowCut);
  lowCut.connect(tone);
  tone.connect(bodyLow);
  bodyLow.connect(bodyHigh);
  bodyHigh.connect(gain);
  if (panner) {
    gain.connect(panner);
    panner.connect(output);
    panner.connect(bodyInput);
  } else {
    gain.connect(output);
    gain.connect(bodyInput);
  }
  source.start(when);
  source.stop(when + duration + 0.02);
  source.onended = () => {
    source.disconnect();
    lowCut.disconnect();
    tone.disconnect();
    bodyLow.disconnect();
    bodyHigh.disconnect();
    gain.disconnect();
    panner?.disconnect();
  };
  return source;
}

/**
 * Play one physical position or a complete chord shape with a lightweight
 * Karplus-Strong plucked-string voice.
 */
export function playGuitarPositions(audio, notes, {
  attackSeconds = 0.007,
  duration = 1.7,
  humanizeSeed = null,
  stringStates = {},
  strumSeconds = 0,
  velocityVariation = 0,
  volume = 0.52,
} = {}) {
  if (!audio || audio.state !== "running") return [];
  const resolvedHumanizeSeed = humanizeSeed == null
    ? (strumSeconds > 0 ? nextStrumHumanizeSeed() : 0)
    : humanizeSeed;
  const voices = getGuitarStrumVoices(notes, {
    humanizeSeed: resolvedHumanizeSeed,
    stringStates,
    strumSeconds,
    velocityVariation,
  });
  if (!voices.length) return [];
  const { bodyInput, master } = getOutputGraph(audio);
  const safeDuration = clamp(Number(duration) || 1.7, 0.35, 3.2);
  const perStringLevel = clamp((Number(volume) || 0.52) / Math.sqrt(voices.length), 0.07, 0.5);
  const startTime = audio.currentTime + 0.008;

  return voices.map((voice) => ({
    ...voice,
    source: schedulePluck(
      audio,
      voice,
      startTime + voice.delaySeconds,
      perStringLevel * voice.velocity,
      safeDuration * voice.durationScale,
      master,
      bodyInput,
      Number(attackSeconds) * voice.attackScale,
      voice.brightnessScale,
    ),
  }));
}

let strumHumanizeSequence = 0;

function nextStrumHumanizeSeed() {
  strumHumanizeSequence = (strumHumanizeSequence + 1) % 9;
  return strumHumanizeSequence;
}
