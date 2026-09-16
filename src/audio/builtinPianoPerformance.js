import { getChordToneDescriptors } from "../chords/chordTheory.js";
import { getMiniChordBackingRootPitch } from "../mini-chord/capo.js";

// gpg4.wav is G4 (MIDI 67). These are sounding MIDI notes, not sample names.
export const BUILTIN_PIANO_SAMPLE_MIDI = 67;
const pc = (midi) => ((midi % 12) + 12) % 12;
const label = (value) => String(value ?? "").replace(/\s+/g, "");

// Provenance is transient playback data; never persist it into a user's copy.
export function markBuiltinPianoProgression(progression, preset, mode) {
  const expected = preset?.progression ?? preset?.slots;
  if (!expected || expected.length !== progression.length) return progression;
  if (!progression.every((chord, index) => {
    const entry = expected[index];
    return label(chord.displayName) === label(entry.chord)
      && Number(chord.beatLength ?? 4) === Number(entry.beats ?? 4);
  })) return progression;
  return progression.map((chord) => ({ ...chord, builtinPianoPerformance: mode }));
}

export function matchesBuiltinMiniSlots(preset, slots, barCount) {
  return Boolean(preset?.builtIn && preset.barCount === barCount
    && preset.slots.length === slots.length
    && slots.every((value, index) => label(value) === label(preset.slots[index])));
}

export function getBuiltinChordPitchClasses(chord) {
  if (!chord || chord.isRest) return [];
  const root = getMiniChordBackingRootPitch(chord.root || chord.displayName);
  return [...new Set(getChordToneDescriptors(root.pitchClass, chord.quality, chord.extension)
    .map(({ interval }) => pc(root.pitchIndex + interval)))];
}

// Enumerate inversions with one of each stored chord tone. The low register is
// open, voices are ordered, and extensions are retained rather than invented.
export function chooseBuiltinPianoVoicing(chord, previous = []) {
  const tones = getBuiltinChordPitchClasses(chord);
  if (!tones.length) return [];
  const lowestBass = 36 + getMiniChordBackingRootPitch(chord.bassRoot || chord.root || chord.displayName).pitchIndex;
  const candidates = [];
  const visit = (notes, remaining) => {
    if (!remaining.length) { candidates.push(notes); return; }
    for (const tone of remaining) {
      for (let midi = 48 + pc(tone - 48); midi <= 76; midi += 12) {
        if (notes.length && midi - notes.at(-1) < (midi < 60 ? 3 : 2)) continue;
        if (notes.length === 0 && midi > 59) continue;
        if (notes.length === 0 && midi < lowestBass + 5) continue;
        if (notes.length >= 2 && midi < 60) continue;
        visit([...notes, midi], remaining.filter((value) => value !== tone));
      }
    }
  };
  visit([], tones);
  const score = (notes) => notes.reduce((total, midi, index) => {
    const target = previous[index] ?? (53 + index * 5);
    return total + Math.abs(midi - target) + Math.max(0, midi - 72) * 1.5
      - (previous.includes(midi) ? 2 : 0);
  }, 0);
  candidates.sort((a, b) => score(a) - score(b) || a.join().localeCompare(b.join()));
  return candidates[0] ?? tones.map((tone, index) => 48 + tone + (index > 1 ? 12 : 0)).sort((a, b) => a - b);
}

export function arrangeBuiltinPianoEvents(events, progression, slotSeconds, beatSeconds, cycleSeconds) {
  if (!progression.some((chord) => chord.builtinPianoPerformance)) return events;
  let previous = [];
  const voicingCache = new Map();
  const voicings = progression.map((chord) => {
    const key = `${getBuiltinChordPitchClasses(chord).join()}:${chord.bassRoot || chord.root}:${previous.join()}`;
    if (!voicingCache.has(key)) voicingCache.set(key, chooseBuiltinPianoVoicing(chord, previous));
    previous = voicingCache.get(key);
    return previous;
  });
  let previousBass = 43;
  const bassVoicings = progression.map((chord, index) => {
    if (chord.isRest) return null;
    const root = getMiniChordBackingRootPitch(chord.bassRoot || chord.root || chord.displayName).pitchIndex;
    const candidates = Array.from({ length: 20 }, (_, i) => 36 + i)
      .filter((midi) => pc(midi) === root && midi <= voicings[index][0] - 5);
    candidates.sort((a, b) => Math.abs(a - previousBass) - Math.abs(b - previousBass) || a - b);
    previousBass = candidates[0] ?? 36 + root;
    return previousBass;
  });
  const output = [];
  const groups = new Map();
  for (const event of events) {
    const chord = progression[event.chordIndex];
    if (!chord?.builtinPianoPerformance || event.instrument !== "piano") {
      output.push(chord?.builtinPianoPerformance && event.instrument === "bass"
        ? { ...event, performanceRole: ["approach", "nextRoot"].includes(event.bassMotionMode) ? "transition" : "bass" } : event);
      continue;
    }
    const key = event.pianoAttackId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  for (const group of groups.values()) {
    const first = group[0];
    const chord = progression[first.chordIndex];
    const mini = chord.builtinPianoPerformance === "mini";
    const start = Math.min(...group.map((event) => event.offsetSeconds));
    const style = first.pianoArticulation;
    const arp = style === "arpUp" || style === "arpDown";
    const strong = Math.abs(start / beatSeconds - Math.round(start / beatSeconds)) < 0.001;
    const notes = voicings[first.chordIndex];
    const ordered = style === "arpDown" ? [...notes].reverse() : notes;
    const baseVolume = group.reduce((sum, event) => sum + event.volume, 0) / group.length;
    let boundaryIndex = first.chordIndex + 1;
    // Existing expanded repeat order is authoritative, including rests and jumps.
    while (boundaryIndex < progression.length
      && !progression[boundaryIndex].isRest
      && label(progression[boundaryIndex].displayName) === label(chord.displayName)
      && progression[boundaryIndex].backingArrangement?.overrideId === chord.backingArrangement?.overrideId) boundaryIndex++;
    const boundary = Math.min(cycleSeconds, boundaryIndex * slotSeconds);
    ordered.forEach((midi, index) => {
      const role = midi < 60 ? "middle" : "upper";
      const upperDelay = mini && role === "upper"
        ? Math.min(beatSeconds / 4, first.duration / 4, (boundary - start) / 4) : 0;
      const offsetSeconds = start + (arp ? index * Math.min(0.045, beatSeconds / 12) : upperDelay + index * 0.006);
      const remaining = boundary - offsetSeconds;
      if (remaining < 0.012) return;
      const releaseSeconds = Math.min(role === "upper" && mini ? 0.28 : 0.14, remaining * 0.25);
      const duration = Math.min(first.duration * (role === "middle" ? 0.8 : 1), remaining - releaseSeconds);
      const commonTone = first.chordIndex > 0 && voicings[first.chordIndex - 1].includes(midi);
      output.push({ ...first, midi, offsetSeconds, duration, releaseSeconds,
        playbackRate: 2 ** ((midi - BUILTIN_PIANO_SAMPLE_MIDI) / 12),
        volume: baseVolume * (role === "upper" ? (mini ? 0.78 : 0.56) : 0.94)
          * (strong ? 1 : 0.88) * (commonTone ? 0.88 : 1),
        commonTone, performanceRole: role, builtinPianoPerformance: true,
        // Keep all original attacks; only HOLD upper voices may actually tie.
        allowCommonToneTie: mini && role === "upper" && style === "hold",
        attackStartSeconds: start,
        harmonicEndSeconds: boundary,
      });
    });
    // A single soft piano bass supports the existing bass instrument, without
    // putting a close-position triad in its register or adding rhythm attacks.
    if (strong && Math.abs(start / (beatSeconds * 2) - Math.round(start / (beatSeconds * 2))) < 0.001) {
      const midi = bassVoicings[first.chordIndex];
      const remaining = boundary - start;
      if (remaining > 0.025) output.push({ ...first, midi, offsetSeconds: start,
        playbackRate: 2 ** ((midi - BUILTIN_PIANO_SAMPLE_MIDI) / 12),
        volume: baseVolume * (mini ? 0.62 : 0.5),
        duration: Math.min(beatSeconds * 0.65, remaining * 0.75),
        releaseSeconds: Math.min(0.09, remaining * 0.2),
        performanceRole: "bass", builtinPianoPerformance: true, commonTone: false,
      });
    }
  }
  output.sort((a, b) => a.offsetSeconds - b.offsetSeconds);
  const held = new Map();
  return output.filter((event) => {
    if (!event.allowCommonToneTie) return true;
    const prior = held.get(event.midi);
    held.set(event.midi, event);
    if (!prior || prior.offsetSeconds + prior.duration + prior.releaseSeconds + 1e-9 < event.attackStartSeconds
      || prior.harmonicEndSeconds + 1e-9 < event.attackStartSeconds
      // The source is a finite ~2.124 s sample, not a looped piano sustain.
      || event.offsetSeconds + event.duration + event.releaseSeconds - prior.offsetSeconds > 2.1 / prior.playbackRate) return true;
    prior.duration = event.offsetSeconds + event.duration - prior.offsetSeconds;
    prior.releaseSeconds = event.releaseSeconds;
    prior.harmonicEndSeconds = event.harmonicEndSeconds;
    held.set(event.midi, prior);
    return false;
  });
}
