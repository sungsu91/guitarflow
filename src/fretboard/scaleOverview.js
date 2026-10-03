import { CHROMATIC_NOTES, NOTE_INDEX } from '../music/noteNotation.js';

export const SCALE_ALL_POSITIONS = 'all';
export const SCALE_OVERVIEW_MAX_FRET = 24;
const OPEN_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };

// Enumerate the instrument, rather than joining BOXes: all octaves and all
// alternate string positions must be present, including open strings.
export function buildScaleOverviewPositions(root, intervals) {
  const tonic = NOTE_INDEX[root];
  const allowed = new Set(intervals);
  const positions = [];
  for (const [string, openMidi] of Object.entries(OPEN_MIDI)) {
    for (let fretNumber = 0; fretNumber <= SCALE_OVERVIEW_MAX_FRET; fretNumber += 1) {
      const midi = openMidi + fretNumber;
      if (!allowed.has((midi - tonic + 120) % 12)) continue;
      positions.push({
        pitch: `${CHROMATIC_NOTES[midi % 12]}${Math.floor(midi / 12) - 1}`,
        stringNumber: Number(string),
        fretNumber,
      });
    }
  }
  return positions;
}
