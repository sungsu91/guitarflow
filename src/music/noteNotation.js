export const CHROMATIC_NOTES = Object.freeze([
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
]);

export const NOTE_INDEX = Object.freeze(
  Object.fromEntries(CHROMATIC_NOTES.map((note, index) => [note, index])),
);

export const SOLFEGE = Object.freeze({
  C: "도",
  "C#": "도#",
  D: "레",
  "D#": "레#",
  E: "미",
  F: "파",
  "F#": "파#",
  G: "솔",
  "G#": "솔#",
  A: "라",
  "A#": "라#",
  B: "시",
});

export const NOTE_ACCIDENTAL_PREFERENCES = Object.freeze({
  SHARP: "sharp",
  FLAT: "flat",
});

const FLAT_CHROMATIC_NOTES = Object.freeze([
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
]);

const FLAT_SOLFEGE = Object.freeze([
  "도",
  "레b",
  "레",
  "미b",
  "미",
  "파",
  "솔b",
  "솔",
  "라b",
  "라",
  "시b",
  "시",
]);

const PITCH_CLASS_INDEX = Object.freeze({
  ...NOTE_INDEX,
  Db: 1,
  Eb: 3,
  Gb: 6,
  Ab: 8,
  Bb: 10,
});

export function normalizeNoteAccidentalPreference(value) {
  return value === NOTE_ACCIDENTAL_PREFERENCES.FLAT
    ? NOTE_ACCIDENTAL_PREFERENCES.FLAT
    : NOTE_ACCIDENTAL_PREFERENCES.SHARP;
}

function splitNoteName(noteName) {
  const match = /^([A-G](?:#|b)?)(-?\d+)?$/.exec(String(noteName ?? ""));
  if (!match) return null;
  return {
    octave: match[2] ?? "",
    pitchClass: match[1],
  };
}

export function getNoteDisplayName(noteName, accidentalPreference = NOTE_ACCIDENTAL_PREFERENCES.SHARP) {
  const noteParts = splitNoteName(noteName);
  if (!noteParts) return String(noteName ?? "");
  const noteIndex = PITCH_CLASS_INDEX[noteParts.pitchClass];
  if (!Number.isInteger(noteIndex)) return String(noteName ?? "");
  const pitchClasses = normalizeNoteAccidentalPreference(accidentalPreference) === NOTE_ACCIDENTAL_PREFERENCES.FLAT
    ? FLAT_CHROMATIC_NOTES
    : CHROMATIC_NOTES;
  return `${pitchClasses[noteIndex]}${noteParts.octave}`;
}

export function getNoteSolfegeDisplayName(noteName, accidentalPreference = NOTE_ACCIDENTAL_PREFERENCES.SHARP) {
  const noteParts = splitNoteName(noteName);
  if (!noteParts) return "";
  const noteIndex = PITCH_CLASS_INDEX[noteParts.pitchClass];
  if (!Number.isInteger(noteIndex)) return "";
  return normalizeNoteAccidentalPreference(accidentalPreference) === NOTE_ACCIDENTAL_PREFERENCES.FLAT
    ? FLAT_SOLFEGE[noteIndex]
    : SOLFEGE[CHROMATIC_NOTES[noteIndex]];
}
