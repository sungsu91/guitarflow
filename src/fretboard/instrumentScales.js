import { CHROMATIC_NOTES, NOTE_INDEX } from '../music/noteNotation.js';
import { getScaleDefinition } from './scaleCatalog.js';
import { buildInstrumentNotes } from './instruments.js';
import { SCALE_ALL_POSITIONS, SCALE_OVERVIEW_MAX_FRET } from './scaleOverview.js';
import { rootScaleOctaves } from './rootScale.js';
import { t } from '../i18n/core.js';

export function supportsInstrumentScalePosition(profile, root, position) {
  const octaves = rootScaleOctaves(position);
  if (!octaves) return true;
  const low = Math.min(...profile.tuning.map(string => string.midi));
  const firstRoot = low + (NOTE_INDEX[root] - low % 12 + 12) % 12;
  return firstRoot + octaves * 12 <= Math.max(...profile.tuning.map(string => string.midi)) + SCALE_OVERVIEW_MAX_FRET;
}

// Shared scale degrees; positions are calculated from the selected tuning.
export function buildInstrumentScale(profile, root, scaleId, position, rootStartMidi = null) {
  if (!supportsInstrumentScalePosition(profile, root, position)) position = 'root-1';
  const scale = getScaleDefinition(scaleId);
  const tonic = NOTE_INDEX[root];
  const names = scale.intervals.map(interval => CHROMATIC_NOTES[(tonic + interval) % 12]);
  const all = buildInstrumentNotes(profile.tuning, 0, SCALE_OVERVIEW_MAX_FRET, names);
  let notes, start = 0, end = SCALE_OVERVIEW_MAX_FRET;
  let suffix = t('app.all');
  const octaves = rootScaleOctaves(position);
  if (octaves) {
    // Choose the least-travel route by sounding pitch, including High G.
    const rootMidi = rootStartMidi ?? Math.min(...all.filter(note => note.noteName === root).map(note => note.midi));
    const pitches = Array.from({ length: octaves }, (_, octave) => scale.intervals.map(interval => rootMidi + octave * 12 + interval)).flat();
    pitches.push(rootMidi + octaves * 12);
    let paths = [{ cost: 0, notes: [] }];
    for (const midi of pitches) {
      paths = all.filter(note => note.midi === midi).map(note => {
        const candidates = paths.map(path => {
          const previous = path.notes.at(-1);
          const travel = previous ? Math.abs(note.fretNumber - previous.fretNumber) * 2 + Math.abs(note.stringNumber - previous.stringNumber) : note.fretNumber;
          return { cost: path.cost + travel + note.fretNumber * 0.1, notes: [...path.notes, note] };
        });
        return candidates.sort((a, b) => a.cost - b.cost)[0];
      }).filter(Boolean);
    }
    notes = paths.sort((a, b) => a.cost - b.cost)[0]?.notes ?? [];
    start = Math.min(...notes.map(note => note.fretNumber));
    end = Math.max(...notes.map(note => note.fretNumber));
    suffix = t(octaves === 1 ? 'app.rootScaleOneOctave' : 'app.rootScaleTwoOctaves');
  } else if (position !== SCALE_ALL_POSITIONS) {
    // Five overlapping hand positions, anchored to the lowest open string.
    const lowMidi = Math.min(...profile.tuning.map(string => string.midi));
    const rootFret = (tonic - lowMidi % 12 + 12) % 12;
    const anchor = [0, 2, 4, 7, 9][Math.max(0, Math.min(4, Number(position) - 1))];
    start = (rootFret + anchor) % 12;
    end = start + 4;
    suffix = `BOX${position}`;
    notes = all.filter(note => note.fretNumber >= start && note.fretNumber <= end);
  } else notes = all;
  return { root, scale, notes, position, label: `${root} ${scale.label} · ${suffix}`,
    allPositions: position === SCALE_ALL_POSITIONS,
    visibleFrets: Array.from({ length: Math.max(4, end - start + 1) }, (_, i) => start + i) };
}
