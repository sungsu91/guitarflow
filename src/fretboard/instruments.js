import { CHROMATIC_NOTES, NOTE_INDEX } from '../music/noteNotation.js';

// String order is physical (1 first), not pitch order: High G is re-entrant.
const profile = (id, instrument, pitches) => Object.freeze({
  id, instrument, stringCount: pitches.length,
  tuning: Object.freeze(pitches.map((midi, index) => Object.freeze({
    stringNumber: index + 1, midi,
    pitch: `${CHROMATIC_NOTES[midi % 12]}${Math.floor(midi / 12) - 1}`,
  }))),
});

export const VIEWER_INSTRUMENTS = Object.freeze({
  guitar: Object.freeze(['guitar-6', 'guitar-7']),
  bass: Object.freeze(['bass-4', 'bass-5', 'bass-6']),
  ukulele: Object.freeze(['ukulele-high-g', 'ukulele-low-g']),
});
export const VIEWER_PROFILES = Object.freeze({
  'guitar-6': profile('guitar-6', 'guitar', [64, 59, 55, 50, 45, 40]),
  'guitar-7': profile('guitar-7', 'guitar', [64, 59, 55, 50, 45, 40, 35]),
  'bass-4': profile('bass-4', 'bass', [43, 38, 33, 28]),
  'bass-5': profile('bass-5', 'bass', [43, 38, 33, 28, 23]),
  'bass-6': profile('bass-6', 'bass', [48, 43, 38, 33, 28, 23]),
  'ukulele-high-g': profile('ukulele-high-g', 'ukulele', [69, 64, 60, 67]),
  'ukulele-low-g': profile('ukulele-low-g', 'ukulele', [69, 64, 60, 55]),
});

export const getViewerProfile = id => VIEWER_PROFILES[id] ?? VIEWER_PROFILES['guitar-6'];

export function getInstrumentPosition(tuning, stringNumber, fretNumber) {
  if (!Number.isInteger(stringNumber) || !Number.isInteger(fretNumber) || fretNumber < 0) return null;
  const string = tuning.find(item => item.stringNumber === stringNumber);
  if (!string) return null;
  const midi = string.midi + fretNumber;
  const noteName = CHROMATIC_NOTES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { id: `s${stringNumber}-f${fretNumber}`, stringNumber, fretNumber, midi,
    pitch: `${noteName}${octave}`, noteName, octave, label: noteName, frequency: 440 * 2 ** ((midi - 69) / 12) };
}

export function buildInstrumentNotes(tuning, start = 0, end = 15, pitchClasses = CHROMATIC_NOTES) {
  const allowed = new Set(pitchClasses.map(note => NOTE_INDEX[note]));
  return tuning.flatMap(({ stringNumber }) => Array.from({ length: end - start + 1 }, (_, i) =>
    getInstrumentPosition(tuning, stringNumber, start + i))).filter(note => allowed.has(note.midi % 12));
}

export const DEFAULT_VIEWER_SELECTION = Object.freeze({
  instrument: 'guitar', guitar: 'guitar-6', bass: 'bass-4', ukulele: 'ukulele-high-g',
});

export function normalizeViewerSelection(value) {
  const selection = { ...DEFAULT_VIEWER_SELECTION };
  for (const [instrument, ids] of Object.entries(VIEWER_INSTRUMENTS)) {
    if (ids.includes(value?.[instrument])) selection[instrument] = value[instrument];
  }
  if (Object.hasOwn(VIEWER_INSTRUMENTS, value?.instrument)) selection.instrument = value.instrument;
  return selection;
}

export function selectViewerInstrument(selection, instrument) {
  return normalizeViewerSelection({ ...selection, instrument });
}

export function selectViewerProfile(selection, id) {
  if (!Object.hasOwn(VIEWER_PROFILES, id)) return normalizeViewerSelection(selection);
  const { instrument } = VIEWER_PROFILES[id];
  return normalizeViewerSelection({ ...selection, instrument, [instrument]: id });
}
