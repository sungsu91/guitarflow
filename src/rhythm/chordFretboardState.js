import { getInstrumentPosition, getViewerProfile } from '../fretboard/instruments.js';

export const CHORD_FRETBOARD_SNAPSHOT_VERSION = 1;

const MAX_EDITABLE_FRET = 24;
const stringNumbers = profile => profile.tuning.map(string => string.stringNumber);
const hasString = (profile,number) => profile.tuning.some(string => string.stringNumber === number);

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

function normalizeBarres(value, profile) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((barre) => {
    const fret = clampFret(barre?.fret);
    const fromString = Number(barre?.fromString);
    const toString = Number(barre?.toString);
    if (
      fret == null
      || fret === 0
      || !hasString(profile,fromString)
      || !hasString(profile,toString)
    ) return null;
    return {
      fret,
      fromString,
      toString,
      label: String(barre?.label ?? ""),
    };
  }).filter(Boolean);
}

function normalizeNote(value, rootNote = "", profile = getViewerProfile()) {
  const stringNumber = Number(value?.stringNumber ?? value?.string);
  const fretNumber = clampFret(value?.fretNumber ?? value?.fret);
  if (!hasString(profile,stringNumber) || fretNumber == null) return null;
  const position = getInstrumentPosition(profile.tuning,stringNumber,fretNumber);
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

function createOpenNotesFromStringStates(stringStates, notes, rootNote, profile) {
  const occupiedPositions = new Set(notes.map((note) => getPositionKey(note.stringNumber, note.fretNumber)));
  return Object.entries(stringStates ?? {}).map(([stringNumberValue, state]) => {
    if (String(state).toLowerCase() !== "o") return null;
    const stringNumber = Number(stringNumberValue);
    if (occupiedPositions.has(getPositionKey(stringNumber, 0))) return null;
    return normalizeNote({ stringNumber, fretNumber: 0 }, rootNote, profile);
  }).filter(Boolean);
}

function buildStringStates(sourceStates, notes, profile) {
  const stringsWithNotes = new Set(notes.map((note) => note.stringNumber));
  return Object.fromEntries(
    stringNumbers(profile)
      .filter((stringNumber) => {
        if (stringsWithNotes.has(stringNumber)) return false;
        return String(sourceStates?.[stringNumber] ?? "x").toLowerCase() === "x";
      })
      .map((stringNumber) => [stringNumber, "x"]),
  );
}

export function createChordFretboardSnapshot(source = {}, rootNote = "", instrumentProfile = null) {
  const profile = instrumentProfile ?? getViewerProfile(source?.instrumentProfileId);
  const sourceNotes = Array.isArray(source?.notes) ? source.notes : [];
  const normalizedNotes = sourceNotes
    .slice(0, profile.stringCount * (MAX_EDITABLE_FRET + 1))
    .map((note) => normalizeNote(note, rootNote, profile))
    .filter(Boolean);
  normalizedNotes.push(...createOpenNotesFromStringStates(source?.stringStates, normalizedNotes, rootNote, profile));

  const uniqueNotes = [...new Map(
    normalizedNotes.map((note) => [getPositionKey(note.stringNumber, note.fretNumber), note]),
  ).values()].sort((a, b) => b.stringNumber - a.stringNumber || a.fretNumber - b.fretNumber);
  const barres = normalizeBarres(source?.barres, profile);
  return {
    version: CHORD_FRETBOARD_SNAPSHOT_VERSION,
    ...(profile.id === 'guitar-6' ? {} : { instrumentProfileId: profile.id }),
    notes: uniqueNotes,
    barres,
    stringStates: buildStringStates(source?.stringStates, uniqueNotes, profile),
    visibleFrets: normalizeVisibleFrets(source?.visibleFrets ?? source?.fretRange, uniqueNotes, barres),
  };
}

export function cloneChordFretboardSnapshot(source = {}, rootNote = "") {
  return createChordFretboardSnapshot(source, rootNote);
}

// A saved shape belongs to one tuning. Switching instruments uses the generated
// shape without rewriting the saved original, so switching back restores edits.
export function resolveChordFretboardSnapshot(saved, fallback, rootNote, profile) {
  const sameInstrument = saved && (saved.instrumentProfileId ?? 'guitar-6') === profile.id;
  return createChordFretboardSnapshot(sameInstrument ? saved : (fallback ?? {}), rootNote, profile);
}

export function addChordFretboardNote(source, stringNumber, fretNumber, rootNote = "") {
  const snapshot = createChordFretboardSnapshot(source, rootNote);
  const nextNote = normalizeNote({ stringNumber, fretNumber }, rootNote, getViewerProfile(snapshot.instrumentProfileId));
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

export function addChordFretboardBarre(
  source,
  fretNumber,
  fromStringNumber,
  toStringNumber,
  rootNote = "",
) {
  const snapshot = createChordFretboardSnapshot(source, rootNote);
  const fret = clampFret(fretNumber);
  const profile = getViewerProfile(snapshot.instrumentProfileId);
  const fromString = Number(fromStringNumber);
  const toString = Number(toStringNumber);
  if (
    fret == null
    || fret === 0
    || !hasString(profile,fromString)
    || !hasString(profile,toString)
    || fromString === toString
  ) return snapshot;

  const topString = Math.min(fromString, toString);
  const bottomString = Math.max(fromString, toString);
  const alreadyExists = snapshot.barres.some((barre) => (
    Number(barre.fret) === fret
    && Math.min(Number(barre.fromString), Number(barre.toString)) === topString
    && Math.max(Number(barre.fromString), Number(barre.toString)) === bottomString
  ));
  if (alreadyExists) return snapshot;

  return createChordFretboardSnapshot({
    ...snapshot,
    barres: [
      ...snapshot.barres,
      {
        fret,
        fromString: topString,
        toString: bottomString,
        label: "1",
      },
    ],
  }, rootNote);
}

export function removeChordFretboardBarre(
  source,
  fretNumber,
  fromStringNumber,
  toStringNumber,
  rootNote = "",
) {
  const snapshot = createChordFretboardSnapshot(source, rootNote);
  const fret = clampFret(fretNumber);
  const topString = Math.min(Number(fromStringNumber), Number(toStringNumber));
  const bottomString = Math.max(Number(fromStringNumber), Number(toStringNumber));
  return createChordFretboardSnapshot({
    ...snapshot,
    barres: snapshot.barres.filter((barre) => !(
      Number(barre.fret) === fret
      && Math.min(Number(barre.fromString), Number(barre.toString)) === topString
      && Math.max(Number(barre.fromString), Number(barre.toString)) === bottomString
    )),
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
  return `${snapshot.instrumentProfileId ? `${snapshot.instrumentProfileId}|` : ''}${notes}|${barres}`;
}

export function getChordFretboardMidiVoicing(source = {}) {
  const snapshot = createChordFretboardSnapshot(source);
  const profile = getViewerProfile(snapshot.instrumentProfileId);
  return [...new Set(
    snapshot.notes
      .map((note) => getInstrumentPosition(profile.tuning,note.stringNumber,note.fretNumber)?.midi)
      .filter(Number.isFinite),
  )].sort((a, b) => a - b);
}
