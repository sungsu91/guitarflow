import { PENTATONIC_BOX_PATTERNS, DIATONIC_BOX_PATTERNS } from './scaleBoxPatterns.js';

// Semitones above the selected tonic. Minor = natural minor / Aeolian;
// melodic minor = jazz minor (the same pitches ascending and descending).
// One catalog drives training, fretboard viewing, and every device layout.
// Theory references: https://pulse.berklee.edu/scales/index.html
// https://online.berklee.edu/takenote/jazz-improvisation-10-scales/
export const SCALE_DEFINITIONS = [
  { id: 'major-scale', label: 'Major Scale', familyId: 'scale', typeId: 'major', intervals: [0, 2, 4, 5, 7, 9, 11], aliases: ['Ionian'] },
  { id: 'minor-scale', label: 'Minor Scale', familyId: 'scale', typeId: 'minor', intervals: [0, 2, 3, 5, 7, 8, 10], aliases: ['Natural Minor', 'Aeolian'] },
  { id: 'major-pentatonic', label: 'Major Pentatonic', familyId: 'pentatonic', typeId: 'major', intervals: [0, 2, 4, 7, 9] },
  { id: 'minor-pentatonic', label: 'Minor Pentatonic', familyId: 'pentatonic', typeId: 'minor', intervals: [0, 3, 5, 7, 10] },
  { id: 'major-blues', label: 'Major Blues', familyId: 'blues', typeId: 'major', intervals: [0, 2, 3, 4, 7, 9], pentatonic: 'major', blueNote: 3 },
  { id: 'minor-blues', label: 'Minor Blues', familyId: 'blues', typeId: 'minor', intervals: [0, 3, 5, 6, 7, 10], pentatonic: 'minor', blueNote: 6 },
  { id: 'dorian', label: 'Dorian', familyId: 'scale', typeId: 'dorian', intervals: [0, 2, 3, 5, 7, 9, 10], parent: 'major-scale', parentTonicOffset: 2 },
  { id: 'phrygian', label: 'Phrygian', familyId: 'scale', typeId: 'phrygian', intervals: [0, 1, 3, 5, 7, 8, 10], parent: 'major-scale', parentTonicOffset: 4 },
  { id: 'lydian', label: 'Lydian', familyId: 'scale', typeId: 'lydian', intervals: [0, 2, 4, 6, 7, 9, 11], parent: 'major-scale', parentTonicOffset: 5 },
  { id: 'mixolydian', label: 'Mixolydian', familyId: 'scale', typeId: 'mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], parent: 'major-scale', parentTonicOffset: 7 },
  { id: 'locrian', label: 'Locrian', familyId: 'scale', typeId: 'locrian', intervals: [0, 1, 3, 5, 6, 8, 10], parent: 'major-scale', parentTonicOffset: 11 },
  { id: 'harmonic-minor', label: 'Harmonic Minor', familyId: 'scale', typeId: 'harmonic-minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'melodic-minor', label: 'Melodic Minor', familyId: 'scale', typeId: 'melodic-minor', intervals: [0, 2, 3, 5, 7, 9, 11], aliases: ['Jazz Minor'], direction: 'same-both-directions' },
  { id: 'phrygian-dominant', label: 'Phrygian Dominant', familyId: 'scale', typeId: 'phrygian-dominant', intervals: [0, 1, 4, 5, 7, 8, 10], parent: 'harmonic-minor', parentTonicOffset: 7 },
  { id: 'lydian-dominant', label: 'Lydian Dominant', familyId: 'scale', typeId: 'lydian-dominant', intervals: [0, 2, 4, 6, 7, 9, 10], parent: 'melodic-minor', parentTonicOffset: 5 },
  { id: 'altered', label: 'Altered', familyId: 'scale', typeId: 'altered', intervals: [0, 1, 3, 4, 6, 8, 10], parent: 'melodic-minor', parentTonicOffset: 11, aliases: ['Super Locrian'] },
];

export const SCALE_OPTIONS = SCALE_DEFINITIONS.map(({ id, label }) => ({ id, label }));
const BY_ID = Object.fromEntries(SCALE_DEFINITIONS.map(scale => [scale.id, scale]));
const mod12 = value => ((value % 12) + 12) % 12;
const OPEN_RELATIVE_TO_LOW_E = { 6: 0, 5: 5, 4: 10, 3: 15, 2: 19, 1: 24 };

export function getScaleDefinition(id) {
  return BY_ID[id] ?? BY_ID['major-pentatonic'];
}

// Compatibility for the existing box-set and exported practice builders.
export function getLegacyScaleDefinition(familyId, typeId) {
  return SCALE_DEFINITIONS.find(scale => scale.familyId === familyId && scale.typeId === typeId)
    ?? SCALE_DEFINITIONS.find(scale => scale.familyId === familyId && scale.typeId === 'minor')
    ?? BY_ID['minor-pentatonic'];
}

const patternCache = new Map();
export function getScalePatterns(id) {
  if (patternCache.has(id)) return patternCache.get(id);
  const scale = getScaleDefinition(id);
  let patterns;
  if (scale.familyId === 'pentatonic') patterns = PENTATONIC_BOX_PATTERNS[scale.typeId];
  else if (id === 'major-scale' || id === 'minor-scale') patterns = DIATONIC_BOX_PATTERNS[scale.typeId];
  else if (scale.parent) {
    // Modes retain the parent fingerings, transposed to the requested tonic.
    patterns = getScalePatterns(scale.parent).map(pattern => ({
      ...pattern, startOffset: pattern.startOffset - scale.parentTonicOffset,
    }));
  } else if (scale.pentatonic) {
    // Keep the original pentatonic positions and box range. Include every
    // blue-note position inside that range, even outside a string's two
    // pentatonic endpoints (e.g. A minor blues: string 3, fret 8).
    patterns = PENTATONIC_BOX_PATTERNS[scale.pentatonic].map(pattern => {
      const boxOffsets = Object.values(pattern.stringOffsets).flat();
      const minOffset = Math.min(...boxOffsets);
      const maxOffset = Math.max(...boxOffsets);
      return {
        ...pattern,
        stringOffsets: Object.fromEntries(Object.entries(pattern.stringOffsets).map(([string, offsets]) => {
          const additions = [];
          for (let offset = minOffset; offset <= maxOffset; offset += 1) {
            if (mod12(OPEN_RELATIVE_TO_LOW_E[string] + pattern.startOffset + offset) === scale.blueNote) additions.push(offset);
          }
          return [string, [...new Set([...offsets, ...additions])].sort((a, b) => a - b)];
        })),
      };
    });
  } else {
    // Harmonic/melodic minor alter the corresponding natural-minor degrees.
    // Calculate by actual string tuning, including the G-to-B major third.
    const natural = BY_ID['minor-scale'].intervals;
    patterns = DIATONIC_BOX_PATTERNS.minor.map(pattern => ({
      ...pattern,
      stringOffsets: Object.fromEntries(Object.entries(pattern.stringOffsets).map(([string, offsets]) => [string,
        offsets.map(offset => {
          const interval = mod12(OPEN_RELATIVE_TO_LOW_E[string] + pattern.startOffset + offset);
          return offset + scale.intervals[natural.indexOf(interval)] - interval;
        }),
      ])),
    }));
  }
  patternCache.set(id, patterns);
  return patterns;
}
