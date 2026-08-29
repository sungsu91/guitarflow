import { CHROMATIC_NOTES, NOTE_INDEX } from "../music/noteNotation.js";

export const CHORD_TONE_INTERVALS = Object.freeze({
  major: Object.freeze({
    none: Object.freeze([0, 4, 7]),
    "7": Object.freeze([0, 4, 7, 10]),
    "9": Object.freeze([0, 4, 7, 10, 14]),
    maj7: Object.freeze([0, 4, 7, 11]),
    maj9: Object.freeze([0, 4, 7, 11, 14]),
    sus2: Object.freeze([0, 2, 7]),
    sus4: Object.freeze([0, 5, 7]),
    "7sus4": Object.freeze([0, 5, 7, 10]),
    "6": Object.freeze([0, 4, 7, 9]),
    add9: Object.freeze([0, 4, 7, 14]),
  }),
  minor: Object.freeze({
    none: Object.freeze([0, 3, 7]),
    m7: Object.freeze([0, 3, 7, 10]),
    m6: Object.freeze([0, 3, 7, 9]),
    m9: Object.freeze([0, 3, 7, 10, 14]),
    add9: Object.freeze([0, 3, 7, 14]),
  }),
  dim: Object.freeze({
    none: Object.freeze([0, 3, 6]),
  }),
  aug: Object.freeze({
    none: Object.freeze([0, 4, 8]),
  }),
});

export const CHORD_TONE_DEGREE_OFFSETS = Object.freeze({
  major: Object.freeze({
    none: Object.freeze([0, 2, 4]),
    "7": Object.freeze([0, 2, 4, 6]),
    "9": Object.freeze([0, 2, 4, 6, 1]),
    maj7: Object.freeze([0, 2, 4, 6]),
    maj9: Object.freeze([0, 2, 4, 6, 1]),
    sus2: Object.freeze([0, 1, 4]),
    sus4: Object.freeze([0, 3, 4]),
    "7sus4": Object.freeze([0, 3, 4, 6]),
    "6": Object.freeze([0, 2, 4, 5]),
    add9: Object.freeze([0, 2, 4, 1]),
  }),
  minor: Object.freeze({
    none: Object.freeze([0, 2, 4]),
    m7: Object.freeze([0, 2, 4, 6]),
    m6: Object.freeze([0, 2, 4, 5]),
    m9: Object.freeze([0, 2, 4, 6, 1]),
    add9: Object.freeze([0, 2, 4, 1]),
  }),
  dim: Object.freeze({
    none: Object.freeze([0, 2, 4]),
  }),
  aug: Object.freeze({
    none: Object.freeze([0, 2, 4]),
  }),
});

export function getChordToneDescriptors(root, quality = "major", extension = "none") {
  const rootIndex = NOTE_INDEX[root] ?? NOTE_INDEX.C;
  const qualityIntervals = CHORD_TONE_INTERVALS[quality] ?? CHORD_TONE_INTERVALS.major;
  const qualityDegreeOffsets = CHORD_TONE_DEGREE_OFFSETS[quality] ?? CHORD_TONE_DEGREE_OFFSETS.major;
  const intervals = qualityIntervals[extension] ?? qualityIntervals.none;
  const degreeOffsets = qualityDegreeOffsets[extension] ?? qualityDegreeOffsets.none;
  return intervals.map((interval, index) => ({
    degreeOffset: degreeOffsets[index] ?? index,
    interval,
    noteName: CHROMATIC_NOTES[(rootIndex + interval) % CHROMATIC_NOTES.length],
  }));
}

export function getChordToneNames(root, quality = "major", extension = "none") {
  return [...new Set(getChordToneDescriptors(root, quality, extension).map((descriptor) => descriptor.noteName))];
}
