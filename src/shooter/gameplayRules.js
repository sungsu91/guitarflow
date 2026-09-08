export const SHOOTER_COUNT_IN_MS = 3_000;
export const SHOOTER_MIN_TEMPO_TARGETS = 8;
export const SHOOTER_TEMPO_ACCURACY_PERCENT = 85;

export const SHOOTER_RUNTIME_DIFFICULTY = Object.freeze({
  easy: Object.freeze({
    bpms: Object.freeze([42, 44, 46, 48, 50]),
    maxTargets: 2,
    travelMs: 5_800,
    fretRange: Object.freeze([0, 3]),
  }),
  normal: Object.freeze({
    bpms: Object.freeze([48, 50, 52, 54, 56]),
    maxTargets: 3,
    travelMs: 5_300,
    fretRange: Object.freeze([5, 10]),
  }),
  difficult: Object.freeze({
    bpms: Object.freeze([54, 56, 58, 60, 62]),
    maxTargets: 3,
    travelMs: 4_800,
    fretRange: Object.freeze([0, 12]),
  }),
});

export const STANDARD_GUITAR_OPEN_MIDI = Object.freeze({
  6: 40,
  5: 45,
  4: 50,
  3: 55,
  2: 59,
  1: 64,
});

const SHARP_NAMES = Object.freeze(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]);
const FLAT_NAMES = Object.freeze(["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]);
const PITCH_CLASS_MIDI = Object.freeze({ C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 });

export function pitchLabelToMidi(label) {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(String(label ?? "").trim());
  if (!match) return null;
  const pitchClass = `${match[1]}${match[2]}`;
  const offset = PITCH_CLASS_MIDI[pitchClass];
  return Number.isFinite(offset) ? (Number(match[3]) + 1) * 12 + offset : null;
}

export function midiToShooterLabel(midi, accidental = "sharp") {
  const value = Math.round(Number(midi));
  if (!Number.isFinite(value)) return "";
  const names = accidental === "flat" ? FLAT_NAMES : SHARP_NAMES;
  const pitchClass = ((value % 12) + 12) % 12;
  return `${names[pitchClass]}${Math.floor(value / 12) - 1}`;
}

export function createShooterTargetNote({
  label,
  stringNumber,
  fretNumber,
  accidentalPreference = "sharp",
} = {}) {
  const safeString = Math.max(1, Math.min(6, Math.round(Number(stringNumber) || 6)));
  const safeFret = Math.max(0, Math.round(Number(fretNumber) || 0));
  const midi = STANDARD_GUITAR_OPEN_MIDI[safeString] + safeFret;
  const canonicalLabel = midiToShooterLabel(midi, accidentalPreference);
  const requestedMidi = pitchLabelToMidi(label);
  if (requestedMidi != null && requestedMidi !== midi) {
    throw new Error(`Invalid shooter target ${label}: string ${safeString}, fret ${safeFret} is ${canonicalLabel}`);
  }
  const resolvedLabel = String(label || canonicalLabel).replaceAll("♯", "#").replaceAll("♭", "b");
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(resolvedLabel);
  return Object.freeze({
    midi,
    noteName: `${match?.[1] ?? canonicalLabel[0]}${match?.[2] ?? ""}`,
    accidental: match?.[2] ?? "",
    octave: Number(match?.[3] ?? Math.floor(midi / 12) - 1),
    label: resolvedLabel,
    string: safeString,
    fret: safeFret,
  });
}

export function getShooterCountInLabel(elapsedMs = 0) {
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  if (elapsed >= SHOOTER_COUNT_IN_MS) return null;
  if (elapsed < 1_000) return "3";
  if (elapsed < 2_000) return "2";
  if (elapsed < 2_850) return "1";
  return "START";
}

export function getShooterTempoProgress({
  bpms,
  bpm,
  hits = 0,
  misses = 0,
  lives = 3,
} = {}) {
  const stages = Array.isArray(bpms) && bpms.length ? bpms : [60];
  const safeHits = Math.max(0, Number(hits) || 0);
  const safeMisses = Math.max(0, Number(misses) || 0);
  const processed = safeHits + safeMisses;
  const accuracy = processed > 0 ? Math.round((safeHits / processed) * 100) : 0;
  const currentIndex = Math.max(0, stages.indexOf(Number(bpm)));
  const eligible = processed >= SHOOTER_MIN_TEMPO_TARGETS
    && accuracy >= SHOOTER_TEMPO_ACCURACY_PERCENT
    && Number(lives) >= 2
    && currentIndex < stages.length - 1;
  return {
    accuracy,
    bpm: eligible ? stages[currentIndex + 1] : stages[currentIndex],
    bpmRaised: eligible,
    eligible,
    processed,
  };
}

export function getShooterFrameElapsedMs(now, previousNow) {
  const current = Number(now);
  const previous = Number(previousNow);
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  return Math.max(0, current - previous);
}
