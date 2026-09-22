import {scheduleScoreExpressions,maximumBend} from './scoreExpressions.js';
import {getStringBuffer,PLUCK_VARIANTS} from "./pluckedString.js";
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
const voiceSequences=new WeakMap();
const activeVoices=new WeakMap();
export const guitarVoiceStats=audio=>({active:activeVoices.get(audio)?.size??0});
function nextVariant(audio){const n=voiceSequences.get(audio)??0;voiceSequences.set(audio,n+1);return n%PLUCK_VARIANTS;}
function trackVoice(audio,source){let voices=activeVoices.get(audio);if(!voices){voices=new Set();activeVoices.set(audio,voices);}voices.add(source);source.addEventListener("ended",()=>voices.delete(source),{once:true});}
function reinforcedSustain(phrase){return Boolean(phrase?.segments?.some(s=>['H','P','bend'].includes(s.connection)||(s.expressions??[]).some(e=>e.bendEffect)));}
function techniqueSustain(phrase){return Boolean(phrase?.segments?.some(s=>['H','P','S','bend'].includes(s.connection)||(s.expressions??[]).some(e=>e.bendEffect||e.slideIn||e.slideOut)) );}
function attachRelease(audio,source,output,when){let releaseAt=Infinity;source.release=(at=audio.currentTime)=>{const start=Math.max(at,audio.currentTime);if(start>=releaseAt)return;releaseAt=start;output.gain.cancelScheduledValues(start);output.gain.setValueAtTime(1,start);output.gain.linearRampToValueAtTime(0,start+.012);source.stop(start+.014);};trackVoice(audio,source);}
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
  phrase = null,
) {
  const source = audio.createBufferSource();
  const lowCut = audio.createBiquadFilter();
  const tone = audio.createBiquadFilter();
  const bodyLow = audio.createBiquadFilter();
  const bodyHigh = audio.createBiquadFilter();
  const gain = audio.createGain();
  const articulation = audio.createGain();articulation.gain.setValueAtTime(1,when);
  const panner = typeof audio.createStereoPanner === "function" ? audio.createStereoPanner() : null;
  const profile = getCleanGuitarVoiceProfile(position);
  const maxRate = phrase ? Math.max(1, ...phrase.segments.map(s=>2 ** ((s.midi-position.midi+maximumBend(phrase))/12))) : 1;
  const bufferDuration = phrase ? Math.min(8, duration * maxRate + 0.3) : duration;
  const sustain=techniqueSustain(phrase);
  const variant=nextVariant(audio);
  source.buffer = getStringBuffer(audio, position, bufferDuration,{variant,sustain:reinforcedSustain(phrase)});
  const releaseGain=audio.createGain();releaseGain.gain.value=1;
  level*=1+(variant-1.5)*.018+getHumanizedUnit(voiceSequences.get(audio),position.stringNumber,1)*.012;
  brightnessScale*=1+(variant-1.5)*.025+getHumanizedUnit(voiceSequences.get(audio),position.stringNumber,2)*.015;
  if (phrase) {
    // Even a long tie decays like a real string. Do not loop a PCM seam or
    // allocate buffers for the full score duration; cached tails end at zero.
    source.playbackRate.setValueAtTime(1, when);
    let previous = phrase.segments[0];
    for (const segment of phrase.segments.slice(1)) {
      const arrival = when + segment.start - phrase.start;
      const rate = 2 ** ((segment.midi-position.midi)/12);
      const oldRate = 2 ** ((previous.midi-position.midi)/12);
      if (segment.connection === 'S') {
        const glide = Math.min(0.085, 0.025 + Math.abs(segment.midi-previous.midi)*0.009, previous.duration * 0.3);
        source.playbackRate.setValueAtTime(oldRate, arrival - glide);
        source.playbackRate.exponentialRampToValueAtTime(rate, arrival);
      } else {
        // H/P change the vibrating string's pitch, without creating a source
        // or re-running the pick envelope at the destination.
        source.playbackRate.setValueAtTime(oldRate, arrival);
        source.playbackRate.exponentialRampToValueAtTime(rate, arrival + Math.min(0.008, segment.duration * 0.1));
      }
      if(segment.connection==='H'||segment.connection==='P'){
        const target=1,settle=Math.min(.035,segment.duration*.2);
        articulation.gain.setValueAtTime(1,arrival);
        articulation.gain.linearRampToValueAtTime(segment.connection==='H'?1.12:1.18,arrival+.004);
        articulation.gain.linearRampToValueAtTime(target,arrival+settle);
      }
      previous = segment;
    }
  }
  for(const segment of phrase?.segments??[])for(const expression of segment.expressions??[]){
    if(expression.slideOut){const end=when+expression.start-phrase.start+expression.duration;articulation.gain.setValueAtTime(.8,end-Math.min(.06,expression.duration*.2));articulation.gain.linearRampToValueAtTime(.0001,end);}
  }
  lowCut.type = "highpass";
  if(phrase)scheduleScoreExpressions(source,phrase,when);
  lowCut.frequency.setValueAtTime(48, when);
  lowCut.Q.setValueAtTime(0.58, when);
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(
    phrase?.harmonic?position.frequency*1.8:clamp(profile.toneCutoff * (Number(brightnessScale) || 1), 2350, 5400),
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
  const sustainUntil = phrase ? duration - Math.min(0.08, duration * 0.2) : duration * 0.74;
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level * (sustain ? 0.8 : 0.32)), when + sustainUntil);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  source.connect(lowCut);
  lowCut.connect(tone);
  tone.connect(bodyLow);
  bodyLow.connect(bodyHigh);
  bodyHigh.connect(articulation);articulation.connect(gain);
  if (panner) {
    gain.connect(releaseGain);
    releaseGain.connect(panner);
    panner.connect(output);
    if (bodyInput) panner.connect(bodyInput);
  } else {
    gain.connect(releaseGain);
    releaseGain.connect(output);
    if (bodyInput) releaseGain.connect(bodyInput);
  }
  attachRelease(audio,source,releaseGain,when);
  source.start(when);
  source.stop(when + duration + 0.02);
  source.onended = () => {
    source.disconnect();
    lowCut.disconnect();
    tone.disconnect();
    bodyLow.disconnect();
    bodyHigh.disconnect();articulation.disconnect();
    gain.disconnect();
    releaseGain.disconnect();
    panner?.disconnect();
  };
  return source;
}

// Reuse the fretboard's plucked-string PCM, filtering and attack envelope.
// MIDI comes from the compiled score, so alternate tuning is preserved.
export function scheduleGuitarPhrase(audio, phrase, when, output, level = 0.4) {
  const position={stringNumber:phrase.string,fretNumber:phrase.fret??0,midi:phrase.midi,frequency:440*2**((phrase.midi-69)/12)};
  if(phrase.dead){
    const source=audio.createBufferSource(),gain=audio.createGain(),tone=audio.createBiquadFilter(),release=audio.createGain();
    source.buffer=getStringBuffer(audio,position,.075,{variant:nextVariant(audio),muted:true});
    tone.type='lowpass';tone.frequency.value=1600+(6-phrase.string)*240;
    gain.gain.value=level*.8;release.gain.value=1;source.connect(tone);tone.connect(gain);gain.connect(release);release.connect(output);
    attachRelease(audio,source,release,when);source.start(when);source.stop(when+.075);
    source.onended=()=>{source.disconnect();tone.disconnect();gain.disconnect();release.disconnect();};return source;
  }
  const down=phrase.pickStroke==='down',up=phrase.pickStroke==='up';
  const natural=1.5+phrase.string*.18;
  return schedulePluck(audio,position,when,level*(down?1.07:up?.93:1),Math.max(natural,phrase.duration),output,null,down?.004:up?.006:.005,down?.87:up?1.13:1,phrase);
}
export function warmGuitarPhrase(audio,phrase,offset=0){
 const position={stringNumber:phrase.string,fretNumber:phrase.fret??0,midi:phrase.midi,frequency:440*2**((phrase.midi-69)/12)};
 const duration=Math.max(1.5+phrase.string*.18,phrase.duration),rate=Math.max(1,...(phrase.segments??[]).map(s=>2**((s.midi-phrase.midi+maximumBend(phrase))/12)));
 // One upcoming attack only; variants fill the bounded cache as they are used.
 return getStringBuffer(audio,position,Math.min(8,duration*rate+.3),{variant:((voiceSequences.get(audio)??0)+offset)%PLUCK_VARIANTS,muted:phrase.dead,sustain:reinforcedSustain(phrase)});
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
    ? nextStrumHumanizeSeed()
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
  voices.forEach((voice,index)=>getStringBuffer(audio,voice,safeDuration*voice.durationScale,{variant:((voiceSequences.get(audio)??0)+index)%PLUCK_VARIANTS}));
  const startTime = audio.currentTime + 0.016;

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
