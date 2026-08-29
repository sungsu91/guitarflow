import {
  getGuitarMidiAtPosition,
  getGuitarPitchAtPosition,
} from "../audio/fretboardPreviewEngine.js";

export const CHORD_FRETBOARD_SNAPSHOT_VERSION = 1;

const GUITAR_STRING_NUMBERS = Object.freeze([1, 2, 3, 4, 5, 6]);
const GUITAR_STRING_NUMBER_SET = new Set(GUITAR_STRING_NUMBERS);
const MAX_EDITABLE_FRET = 24;
const MAX_SNAPSHOT_NOTES = GUITAR_STRING_NUMBERS.length * (MAX_EDITABLE_FRET + 1);

function clampFret(value) {
  const fretNumber = Math.round(Number(value));
  if (!Number.isFinite(fretNumber)) return null;
  return Math.max(0, Math.min(MAX_EDITABLE_FRET, fretNumber));
}

function getPositionKey(stringNumber, fretNumber) {
  return `${Number(stringNumber)}-${Number(fretNumber)}`;
}

function normalizeVisibleFrets(value, notes = [], barres = []) {
  const sourceFrets = Array.isArray(value)
    ? value.map(Number).filter(Number.isFinite)
    : [];
  if (sourceFrets.length) {
    const sourceStart = Math.max(0, Math.min(MAX_EDITABLE_FRET, Math.round(Math.min(...sourceFrets))));
    const sourceEnd = Math.max(0, Math.min(MAX_EDITABLE_FRET, Math.round(Math.max(...sourceFrets))));
    if (sourceEnd > sourceStart) return [sourceStart, sourceEnd];
    if (sourceStart === 0) return [0, 3];
    return [Math.max(0, sourceStart - 1), Math.min(MAX_EDITABLE_FRET, sourceStart + 3)];
  }
  const occupiedFrets = [
    ...notes.map((note) => Number(note.fretNumber)),
    ...barres.map((barre) => Number(barre.fret)),
  ].filter((fret) => Number.isFinite(fret) && fret > 0);
  if (!occupiedFrets.length) return [0, 3];
  const minFret = Math.max(1, Math.min(...occupiedFrets));
  const maxFret = Math.min(MAX_EDITABLE_FRET, Math.max(...occupiedFrets));
  if (minFret <= 3) return [0, Math.max(3, maxFret)];
  return [Math.max(0, minFret - 1), Math.min(MAX_EDITABLE_FRET, Math.max(maxFret, minFret + 3))];
}

function normalizeBarres(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((barre) => {
    const fret = clampFret(barre?.fret);
    const fromString = Number(barre?.fromString);
    const toString = Number(barre?.toString);
    if (
      fret == null
      || fret === 0
      || !GUITAR_STRING_NUMBER_SET.has(fromString)
      || !GUITAR_STRING_NUMBER_SET.has(toString)
    ) return null;
    return {
      fret,
      fromString,
      toString,
      label: String(barre?.label ?? ""),
    };
  }).filter(Boolean);
}

function normalizeNote(value, rootNote = "") {
  const stringNumber = Number(value?.stringNumber ?? value?.string);
  const fretNumber = clampFret(value?.fretNumber ?? value?.fret);
  if (!GUITAR_STRING_NUMBER_SET.has(stringNumber) || fretNumber == null) return null;
  const position = getGuitarPitchAtPosition(stringNumber, fretNumber);
  if (!position) return null;
  return {
    id: `saved-fretboard-s${stringNumber}-f${fretNumber}`,
    stringNumber,
    fretNumber,
    pitch: position.pitch,
    octaveNote: position.pitch,
    noteName: position.noteName,
    label: position.noteName,
    finger: fretNumber > 0 && value?.finger != null ? String(value.finger) : null,
    isRoot: position.noteName === rootNote,
  };
}

function createOpenNotesFromStringStates(stringStates, notes, rootNote) {
  const occupiedPositions = new Set(notes.map((note) => getPositionKey(note.stringNumber, note.fretNumber)));
  return Object.entries(stringStates ?? {}).map(([stringNumberValue, state]) => {
    if (String(state).toLowerCase() !== "o") return null;
    const stringNumber = Number(stringNumberValue);
    if (occupiedPositions.has(getPositionKey(stringNumber, 0))) return null;
    return normalizeNote({ stringNumber, fretNumber: 0 }, rootNote);
  }).filter(Boolean);
}

function buildStringStates(sourceStates, notes) {
  const stringsWithNotes = new Set(notes.map((note) => note.stringNumber));
  return Object.fromEntries(
    GUITAR_STRING_NUMBERS
      .filter((stringNumber) => {
        if (stringsWithNotes.has(stringNumber)) return false;
        return String(sourceStates?.[stringNumber] ?? "x").toLowerCase() === "x";
      })
      .map((stringNumber) => [stringNumber, "x"]),
  );
}

export function createChordFretboardSnapshot(source = {}, rootNote = "") {
  const sourceNotes = Array.isArray(source?.notes) ? source.notes : [];
  const normalizedNotes = sourceNotes
    .slice(0, MAX_SNAPSHOT_NOTES)
    .map((note) => normalizeNote(note, rootNote))
    .filter(Boolean);
  normalizedNotes.push(...createOpenNotesFromStringStates(source?.stringStates, normalizedNotes, rootNote));

  const uniqueNotes = [...new Map(
    normalizedNotes.map((note) => [getPositionKey(note.stringNumber, note.fretNumber), note]),
  ).values()].sort((a, b) => b.stringNumber - a.stringNumber || a.fretNumber - b.fretNumber);
  const barres = normalizeBarres(source?.barres);
  return {
    version: CHORD_FRETBOARD_SNAPSHOT_VERSION,
    notes: uniqueNotes,
    barres,
    stringStates: buildStringStates(source?.stringStates, uniqueNotes),
    visibleFrets: normalizeVisibleFrets(source?.visibleFrets ?? source?.fretRange, uniqueNotes, barres),
  };
}

export function cloneChordFretboardSnapshot(source = {}, rootNote = "") {
  return createChordFretboardSnapshot(source, rootNote);
}

export function addChordFretboardNote(source, stringNumber, fretNumber, rootNote = "") {
  const snapshot = createChordFretboardSnapshot(source, rootNote);
  const nextNote = normalizeNote({ stringNumber, fretNumber }, rootNote);
  if (!nextNote) return snapshot;
  if (snapshot.notes.some((note) => getPositionKey(note.stringNumber, note.fretNumber) === getPositionKey(stringNumber, fretNumber))) {
    return snapshot;
  }
  return createChordFretboardSnapshot({
    ...snapshot,
    notes: [...snapshot.notes, nextNote],
  }, rootNote);
}

export function removeChordFretboardNote(source, stringNumber, fretNumber, rootNote = "") {
  const snapshot = createChordFretboardSnapshot(source, rootNote);
  const targetKey = getPositionKey(stringNumber, fretNumber);
  return createChordFretboardSnapshot({
    ...snapshot,
    notes: snapshot.notes.filter((note) => getPositionKey(note.stringNumber, note.fretNumber) !== targetKey),
    stringStates: {
      ...snapshot.stringStates,
      [Number(stringNumber)]: "x",
    },
  }, rootNote);
}

export function getChordFretboardSignature(source = {}) {
  const snapshot = createChordFretboardSnapshot(source);
  const notes = snapshot.notes
    .map((note) => `${note.stringNumber}:${note.fretNumber}`)
    .join(",");
  const barres = snapshot.barres
    .map((barre) => `${barre.fret}:${barre.fromString}:${barre.toString}`)
    .join(",");
  return `${notes}|${barres}`;
}

export function getChordFretboardMidiVoicing(source = {}) {
  const snapshot = createChordFretboardSnapshot(source);
  return [...new Set(
    snapshot.notes
      .map((note) => getGuitarMidiAtPosition(note.stringNumber, note.fretNumber))
      .filter(Number.isFinite),
  )].sort((a, b) => a - b);
}
