const MINI_CHORD_SHARP_ROOT_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MINI_CHORD_FLAT_ROOT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const MINI_CHORD_NATURAL_ROOT_INDEX = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export const MINI_CHORD_ACCIDENTAL_PREFERENCES = {
  SHARP: "sharp",
  FLAT: "flat",
};

export function clampMiniChordCapo(value = 0) {
  return Math.max(0, Math.min(12, Math.round(Number(value) || 0)));
}

export function normalizeMiniChordAccidentalPreference(value = MINI_CHORD_ACCIDENTAL_PREFERENCES.SHARP) {
  return value === MINI_CHORD_ACCIDENTAL_PREFERENCES.FLAT
    ? MINI_CHORD_ACCIDENTAL_PREFERENCES.FLAT
    : MINI_CHORD_ACCIDENTAL_PREFERENCES.SHARP;
}

function isMiniChordRestToken(value = "") {
  const token = String(value ?? "").trim();
  return !token || token === "휴지" || token === "-" || /^rest$/i.test(token) || /^n\.?c\.?$/i.test(token);
}

export function getMiniChordBackingRootPitch(root = "C") {
  const token = String(root ?? "").trim();
  const rootMatch = /^([A-G])([#b]?)/.exec(token);
  const naturalRoot = rootMatch?.[1] ?? "C";
  const accidental = rootMatch?.[2] ?? "";
  const naturalIndex = MINI_CHORD_NATURAL_ROOT_INDEX[naturalRoot] ?? 0;
  const sourceIndex = naturalIndex + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0);
  const pitchIndex = ((sourceIndex % 12) + 12) % 12;
  const pitchClass = MINI_CHORD_SHARP_ROOT_NAMES[pitchIndex];
  const rootLetter = pitchClass[0];
  const semitoneOffset = pitchClass.endsWith("#") ? 1 : 0;
  return {
    pitchClass,
    pitchIndex,
    playbackRate: 2 ** (semitoneOffset / 12),
    rootLetter,
    sampleRoot: rootLetter.toLowerCase(),
    semitoneOffset,
  };
}

export function transposeMiniChordLabel(
  label = "",
  semitones = 0,
  accidentalPreference = MINI_CHORD_ACCIDENTAL_PREFERENCES.SHARP,
) {
  const token = String(label ?? "").trim();
  if (isMiniChordRestToken(token)) return token;

  const rootMatch = /^([A-G])([#b]?)(.*)$/.exec(token);
  if (!rootMatch) return token;

  const [, naturalRoot, accidental, suffix] = rootMatch;
  const naturalIndex = MINI_CHORD_NATURAL_ROOT_INDEX[naturalRoot];
  if (!Number.isInteger(naturalIndex)) return token;

  const sourceIndex = naturalIndex + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0);
  const safeShift = Math.trunc(Number(semitones) || 0);
  const pitchIndex = ((sourceIndex + safeShift) % 12 + 12) % 12;
  const rootNames = normalizeMiniChordAccidentalPreference(accidentalPreference) === MINI_CHORD_ACCIDENTAL_PREFERENCES.FLAT
    ? MINI_CHORD_FLAT_ROOT_NAMES
    : MINI_CHORD_SHARP_ROOT_NAMES;
  return `${rootNames[pitchIndex]}${suffix}`;
}
