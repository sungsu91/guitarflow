const MINI_CHORD_SHARP_ROOT_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MINI_CHORD_FLAT_ROOT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const MINI_CHORD_FRIENDLY_KEY_ROOT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
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

export const MINI_CHORD_TRANSPOSE_MIN = -12;
export const MINI_CHORD_TRANSPOSE_MAX = 12;

export function clampMiniChordTranspose(value = 0) {
  return Math.max(
    MINI_CHORD_TRANSPOSE_MIN,
    Math.min(MINI_CHORD_TRANSPOSE_MAX, Math.round(Number(value) || 0)),
  );
}

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

function getMiniChordPitchIndex(root = "C") {
  const rootMatch = /^([A-G])([#b]?)/.exec(String(root ?? "").trim());
  if (!rootMatch) return null;
  const naturalIndex = MINI_CHORD_NATURAL_ROOT_INDEX[rootMatch[1]];
  if (!Number.isInteger(naturalIndex)) return null;
  const accidentalOffset = rootMatch[2] === "#" ? 1 : rootMatch[2] === "b" ? -1 : 0;
  return ((naturalIndex + accidentalOffset) % 12 + 12) % 12;
}

function getMiniChordRootName(pitchIndex, accidentalPreference) {
  const safePitchIndex = ((Number(pitchIndex) % 12) + 12) % 12;
  return normalizeMiniChordAccidentalPreference(accidentalPreference) === MINI_CHORD_ACCIDENTAL_PREFERENCES.FLAT
    ? MINI_CHORD_FLAT_ROOT_NAMES[safePitchIndex]
    : MINI_CHORD_SHARP_ROOT_NAMES[safePitchIndex];
}

export function getMiniChordKeyInfo(key = "", fallbackRoot = "C") {
  const token = String(key ?? "").trim();
  const rootMatch = /^([A-G])([#b]?)/.exec(token);
  const fallbackMatch = /^([A-G])([#b]?)/.exec(String(fallbackRoot ?? "C").trim());
  const root = rootMatch ? `${rootMatch[1]}${rootMatch[2] ?? ""}` : `${fallbackMatch?.[1] ?? "C"}${fallbackMatch?.[2] ?? ""}`;
  const modeMatch = /\b(minor|major)\b/i.exec(token);
  const mode = modeMatch?.[1]?.toLowerCase() === "minor" ? "minor" : "Major";
  return {
    label: `${root} ${mode}`,
    mode,
    pitchIndex: getMiniChordPitchIndex(root) ?? 0,
    root,
  };
}

export function getMiniChordTransposedKey(key = "", semitones = 0, fallbackRoot = "C") {
  const source = getMiniChordKeyInfo(key, fallbackRoot);
  const safeSemitones = clampMiniChordTranspose(semitones);
  const pitchIndex = ((source.pitchIndex + safeSemitones) % 12 + 12) % 12;
  const root = safeSemitones % 12 === 0
    ? source.root
    : MINI_CHORD_FRIENDLY_KEY_ROOT_NAMES[pitchIndex];
  const mode = source.mode;
  return {
    accidentalPreference: root.includes("b")
      ? MINI_CHORD_ACCIDENTAL_PREFERENCES.FLAT
      : MINI_CHORD_ACCIDENTAL_PREFERENCES.SHARP,
    label: `${root} ${mode}`,
    mode,
    pitchIndex,
    root,
  };
}

export function getMiniChordSourceKey(slots = [], key = "") {
  const explicitKey = String(key ?? "").trim();
  if (/^[A-G](?:#|b)?(?:\s|$)/.test(explicitKey)) return getMiniChordKeyInfo(explicitKey);
  const sourceChord = (Array.isArray(slots) ? slots : [])
    .map((value) => String(value ?? "").trim())
    .find((value) => !isMiniChordRestToken(value) && /^[A-G][#b]?/.test(value));
  const rootMatch = /^([A-G])([#b]?)/.exec(sourceChord ?? "");
  const root = rootMatch ? `${rootMatch[1]}${rootMatch[2] ?? ""}` : "C";
  const isMinor = /^([A-G])([#b]?)m(?!aj)/.test(sourceChord ?? "");
  return getMiniChordKeyInfo(`${root} ${isMinor ? "minor" : "Major"}`);
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

  const [, naturalRoot, accidental, rawSuffix] = rootMatch;
  const naturalIndex = MINI_CHORD_NATURAL_ROOT_INDEX[naturalRoot];
  if (!Number.isInteger(naturalIndex)) return token;

  const sourceIndex = naturalIndex + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0);
  const safeShift = Math.trunc(Number(semitones) || 0);
  const pitchIndex = ((sourceIndex + safeShift) % 12 + 12) % 12;
  const slashMatch = /\/([A-G])([#b]?)$/.exec(rawSuffix);
  const suffix = slashMatch ? rawSuffix.slice(0, slashMatch.index) : rawSuffix;
  const transposedRoot = getMiniChordRootName(pitchIndex, accidentalPreference);
  if (!slashMatch) return `${transposedRoot}${suffix}`;

  const slashPitchIndex = getMiniChordPitchIndex(`${slashMatch[1]}${slashMatch[2] ?? ""}`);
  if (!Number.isInteger(slashPitchIndex)) return `${transposedRoot}${rawSuffix}`;
  const transposedSlashRoot = getMiniChordRootName(slashPitchIndex + safeShift, accidentalPreference);
  return `${transposedRoot}${suffix}/${transposedSlashRoot}`;
}
