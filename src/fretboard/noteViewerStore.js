import {
  CHROMATIC_NOTES,
  NOTE_ACCIDENTAL_PREFERENCES,
  normalizeNoteAccidentalPreference,
} from "../music/noteNotation.js";

export const ALL_FRETBOARD_NOTES = "ALL";

export function createFretboardNoteViewerStore(initialSnapshot = {}) {
  let snapshot = Object.freeze({
    accidentalPreference: normalizeNoteAccidentalPreference(initialSnapshot.accidentalPreference),
    noteFilter: CHROMATIC_NOTES.includes(initialSnapshot.noteFilter)
      ? initialSnapshot.noteFilter
      : ALL_FRETBOARD_NOTES,
  });
  const listeners = new Set();

  const publish = (nextSnapshot) => {
    if (
      nextSnapshot.accidentalPreference === snapshot.accidentalPreference
      && nextSnapshot.noteFilter === snapshot.noteFilter
    ) return;
    snapshot = Object.freeze(nextSnapshot);
    listeners.forEach((listener) => listener());
  };

  return Object.freeze({
    getSnapshot: () => snapshot,
    selectAccidental: (accidentalPreference) => {
      publish({
        ...snapshot,
        accidentalPreference: normalizeNoteAccidentalPreference(accidentalPreference),
      });
    },
    selectNote: (noteFilter) => {
      const normalizedFilter = noteFilter === ALL_FRETBOARD_NOTES || CHROMATIC_NOTES.includes(noteFilter)
        ? noteFilter
        : ALL_FRETBOARD_NOTES;
      publish({ ...snapshot, noteFilter: normalizedFilter });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}

export { NOTE_ACCIDENTAL_PREFERENCES };
