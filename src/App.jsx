import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Gamepad2,
  Grid3X3,
  Guitar,
  Mic,
  Music2,
  Pause,
  Play,
  Radio,
  Settings,
  Square,
  Sparkles,
  Timer,
  Volume2,
} from "lucide-react";
import BrandHeader from "./components/BrandHeader";
import Fretboard from "./components/Fretboard";

const CHROMATIC_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_INDEX = Object.fromEntries(CHROMATIC_NOTES.map((note, index) => [note, index]));

const SOLFEGE = {
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
};

const NOTE_COLORS = {
  C: { fill: "#38bdf8", text: "#03131f", glow: "rgba(56, 189, 248, 0.48)" },
  D: { fill: "#a78bfa", text: "#130b2e", glow: "rgba(167, 139, 250, 0.5)" },
  E: { fill: "#22d3ee", text: "#042026", glow: "rgba(34, 211, 238, 0.5)" },
  F: { fill: "#fb7185", text: "#310711", glow: "rgba(251, 113, 133, 0.46)" },
  G: { fill: "#4ade80", text: "#06210f", glow: "rgba(74, 222, 128, 0.48)" },
  A: { fill: "#facc15", text: "#241a02", glow: "rgba(250, 204, 21, 0.56)" },
  B: { fill: "#f472b6", text: "#2b0719", glow: "rgba(244, 114, 182, 0.48)" },
};

function pitchToMidi(pitch) {
  const match = /^([A-G]#?)(\d)$/.exec(pitch ?? "");
  if (!match) return null;
  return (Number(match[2]) + 1) * 12 + NOTE_INDEX[match[1]];
}

function midiToPitch(midi) {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${CHROMATIC_NOTES[noteIndex]}${octave}`;
}

function getPitchClass(pitch) {
  return pitch?.replace(/\d+/g, "") ?? "";
}

function getChordDisplayNoteName(noteName) {
  return {
    "A#": "Bb",
    "D#": "Eb",
    "G#": "Ab",
  }[noteName] ?? noteName;
}

function getFrequencyFromMidi(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

const NOTE_FREQUENCIES = Object.fromEntries(
  Array.from({ length: 5 }, (_, octaveOffset) => octaveOffset + 2).flatMap((octave) =>
    CHROMATIC_NOTES.map((note) => {
      const pitch = `${note}${octave}`;
      return [pitch, Number(getFrequencyFromMidi(pitchToMidi(pitch)).toFixed(2))];
    }),
  ),
);

const SCALE_ROOT_OPTIONS = CHROMATIC_NOTES.map((note) => ({
  id: note,
  label: note,
  solfege: SOLFEGE[note],
})).filter((note) => !note.id.includes("#"));

const SCALE_FAMILIES = {
  pentatonic: { id: "pentatonic", label: "펜타토닉" },
  scale: { id: "scale", label: "스케일" },
};

const PENTATONIC_TYPES = {
  minor: { id: "minor", label: "마이너", intervals: [0, 3, 5, 7, 10], windowOffset: 0 },
  major: { id: "major", label: "메이저", intervals: [0, 2, 4, 7, 9], windowOffset: -3 },
};

const DIATONIC_SCALE_TYPES = {
  major: { id: "major", label: "메이저", intervals: [0, 2, 4, 5, 7, 9, 11], windowOffset: 0 },
  minor: { id: "minor", label: "마이너", intervals: [0, 2, 3, 5, 7, 8, 10], windowOffset: 0 },
};

const SCALE_BOX_OPTIONS = [1, 2, 3, 4, 5];

const PENTATONIC_BOX_PATTERNS = {
  minor: [
    {
      box: 1,
      startOffset: 0,
      stringOffsets: { 6: [0, 3], 5: [0, 2], 4: [0, 2], 3: [0, 2], 2: [0, 3], 1: [0, 3] },
    },
    {
      box: 2,
      startOffset: 3,
      stringOffsets: { 6: [0, 2], 5: [-1, 2], 4: [-1, 2], 3: [-1, 1], 2: [0, 2], 1: [0, 2] },
    },
    {
      box: 3,
      startOffset: 5,
      stringOffsets: { 6: [0, 2], 5: [0, 2], 4: [0, 2], 3: [-1, 2], 2: [0, 3], 1: [0, 2] },
    },
    {
      box: 4,
      startOffset: 7,
      stringOffsets: { 6: [0, 3], 5: [0, 3], 4: [0, 2], 3: [0, 2], 2: [1, 3], 1: [0, 3] },
    },
    {
      box: 5,
      startOffset: 10,
      stringOffsets: { 6: [0, 2], 5: [0, 2], 4: [-1, 2], 3: [-1, 2], 2: [0, 2], 1: [0, 2] },
    },
  ],
  major: [
    {
      box: 1,
      startOffset: 0,
      stringOffsets: { 6: [0, 2], 5: [-1, 2], 4: [-1, 2], 3: [-1, 1], 2: [0, 2], 1: [0, 2] },
    },
    {
      box: 2,
      startOffset: 2,
      stringOffsets: { 6: [0, 2], 5: [0, 2], 4: [0, 2], 3: [-1, 2], 2: [0, 3], 1: [0, 2] },
    },
    {
      box: 3,
      startOffset: 4,
      stringOffsets: { 6: [0, 3], 5: [0, 3], 4: [0, 2], 3: [0, 2], 2: [1, 3], 1: [0, 3] },
    },
    {
      box: 4,
      startOffset: 7,
      stringOffsets: { 6: [0, 2], 5: [0, 2], 4: [-1, 2], 3: [-1, 2], 2: [0, 2], 1: [0, 2] },
    },
    {
      box: 5,
      startOffset: 9,
      stringOffsets: { 6: [0, 3], 5: [0, 2], 4: [0, 2], 3: [0, 2], 2: [0, 3], 1: [0, 3] },
    },
  ],
};

const DIATONIC_BOX_PATTERNS = {
  major: [
    {
      box: 1,
      startOffset: 0,
      stringOffsets: { 6: [0, 2, 4], 5: [0, 2, 4], 4: [1, 2, 4], 3: [1, 2, 4], 2: [2, 4, 5], 1: [2, 4, 5] },
    },
    {
      box: 2,
      startOffset: 2,
      stringOffsets: { 6: [0, 2, 3], 5: [0, 2, 4], 4: [0, 2, 4], 3: [0, 2, 4], 2: [2, 3, 5], 1: [2, 3, 5] },
    },
    {
      box: 3,
      startOffset: 4,
      stringOffsets: { 6: [0, 1, 3], 5: [0, 2, 3], 4: [0, 2, 3], 3: [0, 2, 4], 2: [1, 3, 5], 1: [1, 3, 5] },
    },
    {
      box: 4,
      startOffset: 7,
      stringOffsets: { 6: [0, 2, 4], 5: [0, 2, 4], 4: [0, 2, 4], 3: [1, 2, 4], 2: [2, 3, 5], 1: [2, 4, 5] },
    },
    {
      box: 5,
      startOffset: 9,
      stringOffsets: { 6: [0, 2, 3], 5: [0, 2, 3], 4: [0, 2, 4], 3: [0, 2, 4], 2: [1, 3, 5], 1: [2, 3, 5] },
    },
  ],
  minor: [
    {
      box: 1,
      startOffset: 0,
      stringOffsets: { 6: [0, 2, 3], 5: [0, 2, 3], 4: [0, 2, 4], 3: [0, 2, 4], 2: [1, 3, 5], 1: [2, 3, 5] },
    },
    {
      box: 2,
      startOffset: 2,
      stringOffsets: { 6: [0, 1, 3], 5: [0, 1, 3], 4: [0, 2, 3], 3: [0, 2, 3], 2: [1, 3, 5], 1: [1, 3, 5] },
    },
    {
      box: 3,
      startOffset: 3,
      stringOffsets: { 6: [0, 2, 4], 5: [0, 2, 4], 4: [1, 2, 4], 3: [1, 2, 4], 2: [2, 4, 5], 1: [2, 4, 5] },
    },
    {
      box: 4,
      startOffset: 5,
      stringOffsets: { 6: [0, 2, 3], 5: [0, 2, 4], 4: [0, 2, 4], 3: [0, 2, 4], 2: [2, 3, 5], 1: [2, 3, 5] },
    },
    {
      box: 5,
      startOffset: 7,
      stringOffsets: { 6: [0, 1, 3], 5: [0, 2, 3], 4: [0, 2, 3], 3: [0, 2, 4], 2: [1, 3, 5], 1: [1, 3, 5] },
    },
  ],
};

const STANDARD_TUNING = [
  { stringNumber: 6, pitch: "E2" },
  { stringNumber: 5, pitch: "A2" },
  { stringNumber: 4, pitch: "D3" },
  { stringNumber: 3, pitch: "G3" },
  { stringNumber: 2, pitch: "B3" },
  { stringNumber: 1, pitch: "E4" },
];
const MAX_FRETBOARD_GUIDE_FRET = 24;

function makeGuitarNote({ pitch, stringNumber, fretNumber, lane, hint, group }) {
  const noteName = getPitchClass(pitch);
  const octave = Number(pitch.replace(/\D+/g, ""));
  const normalizedLane = lane ?? 6 - stringNumber;
  return {
    id: `${pitch}-s${stringNumber}-f${fretNumber}`,
    name: pitch,
    pitch,
    octaveNote: pitch,
    noteName,
    octave,
    solfege: SOLFEGE[noteName] ?? "",
    string: `${stringNumber}th string`,
    stringNumber,
    fret: fretNumber,
    fretNumber,
    lane: normalizedLane,
    frequency: NOTE_FREQUENCIES[pitch],
    hint: hint ?? `${SOLFEGE[noteName] ?? noteName}(${pitch}) = ${stringNumber}번줄 ${fretNumber === 0 ? "개방현" : `${fretNumber}프렛`}`,
    group,
  };
}

function getSixthStringRootFret(root) {
  return (NOTE_INDEX[root] - NOTE_INDEX.E + 12) % 12;
}

function normalizeBoxStartFret(fret) {
  return fret <= 0 ? fret + 12 : fret;
}

function getPatternOffsets(pattern) {
  return Object.values(pattern.stringOffsets).flat();
}

function getPatternStartFret(root, pattern) {
  return normalizeBoxStartFret(getSixthStringRootFret(root) + (pattern.startOffset ?? 0));
}

function getPatternVisibleFrets(root, pattern) {
  const start = getPatternStartFret(root, pattern);
  const offsets = getPatternOffsets(pattern);
  const minFret = start + Math.min(...offsets);
  const maxFret = start + Math.max(...offsets);
  return Array.from({ length: maxFret - minFret + 1 }, (_, index) => minFret + index);
}

function getScaleBlockPattern(familyId, typeId, boxNumber = 1) {
  const patterns =
    familyId === SCALE_FAMILIES.scale.id
      ? DIATONIC_BOX_PATTERNS[typeId] ?? DIATONIC_BOX_PATTERNS.minor
      : PENTATONIC_BOX_PATTERNS[typeId] ?? PENTATONIC_BOX_PATTERNS.minor;
  return patterns.find((pattern) => pattern.box === Number(boxNumber)) ?? patterns[0];
}

function buildScaleBlockPractice(root = "A", typeId = "minor", familyId = SCALE_FAMILIES.pentatonic.id, boxNumber = 1) {
  const family = SCALE_FAMILIES[familyId] ?? SCALE_FAMILIES.pentatonic;
  const typeSource = family.id === SCALE_FAMILIES.scale.id ? DIATONIC_SCALE_TYPES : PENTATONIC_TYPES;
  const type = typeSource[typeId] ?? typeSource.minor;
  const pattern = getScaleBlockPattern(family.id, type.id, boxNumber);
  const startFret = getPatternStartFret(root, pattern);
  const visibleFrets = getPatternVisibleFrets(root, pattern);
  const notes = STANDARD_TUNING.flatMap((stringInfo) => {
    const openMidi = pitchToMidi(stringInfo.pitch);
    return (pattern.stringOffsets[stringInfo.stringNumber] ?? []).map((offset) => {
      const fretNumber = startFret + offset;
      const pitch = midiToPitch(openMidi + fretNumber);
      return makeGuitarNote({
        pitch,
        stringNumber: stringInfo.stringNumber,
        fretNumber,
        group: family.id,
      });
    });
  }).sort((a, b) => a.frequency - b.frequency || b.stringNumber - a.stringNumber || a.fretNumber - b.fretNumber);
  const sequence = [...new Map(notes.map((note) => [note.pitch, note])).values()].map((note) => note.pitch);
  const label = `${root} ${type.label} ${family.label} Box ${pattern.box}`;
  return { label, notes, sequence, visibleFrets, root, type, family, pattern };
}

function buildPentatonicPractice(root = "A", typeId = "minor") {
  return buildScaleBlockPractice(root, typeId, SCALE_FAMILIES.pentatonic.id, 1);
}

const GUITAR_NOTES = [
  makeGuitarNote({ pitch: "E2", stringNumber: 6, fretNumber: 0, group: "open", hint: "6번줄 개방현을 연주하세요" }),
  makeGuitarNote({ pitch: "A2", stringNumber: 5, fretNumber: 0, group: "open", hint: "5번줄 개방현을 연주하세요" }),
  makeGuitarNote({ pitch: "D3", stringNumber: 4, fretNumber: 0, group: "open", hint: "4번줄 개방현을 연주하세요" }),
  makeGuitarNote({ pitch: "G3", stringNumber: 3, fretNumber: 0, group: "open", hint: "3번줄 개방현을 연주하세요" }),
  makeGuitarNote({ pitch: "B3", stringNumber: 2, fretNumber: 0, group: "open", hint: "2번줄 개방현을 연주하세요" }),
  makeGuitarNote({ pitch: "E4", stringNumber: 1, fretNumber: 0, group: "open", hint: "1번줄 개방현을 연주하세요" }),
  makeGuitarNote({ pitch: "F2", stringNumber: 6, fretNumber: 1, group: "first-position" }),
  makeGuitarNote({ pitch: "G2", stringNumber: 6, fretNumber: 3, group: "first-position" }),
  makeGuitarNote({ pitch: "B2", stringNumber: 5, fretNumber: 2, group: "first-position" }),
  makeGuitarNote({ pitch: "C3", stringNumber: 5, fretNumber: 3, group: "first-position" }),
  makeGuitarNote({ pitch: "E3", stringNumber: 4, fretNumber: 2, group: "first-position" }),
  makeGuitarNote({ pitch: "F3", stringNumber: 4, fretNumber: 3, group: "first-position" }),
  makeGuitarNote({ pitch: "A3", stringNumber: 3, fretNumber: 2, group: "first-position" }),
  makeGuitarNote({ pitch: "C4", stringNumber: 2, fretNumber: 1, group: "first-position" }),
  makeGuitarNote({ pitch: "D4", stringNumber: 2, fretNumber: 3, group: "first-position" }),
  makeGuitarNote({ pitch: "F4", stringNumber: 1, fretNumber: 1, group: "first-position" }),
  makeGuitarNote({ pitch: "G4", stringNumber: 1, fretNumber: 3, group: "first-position" }),
  makeGuitarNote({ pitch: "A2", stringNumber: 6, fretNumber: 5, group: "pentatonic" }),
  makeGuitarNote({ pitch: "C3", stringNumber: 6, fretNumber: 8, group: "pentatonic" }),
  makeGuitarNote({ pitch: "D3", stringNumber: 5, fretNumber: 5, group: "pentatonic" }),
  makeGuitarNote({ pitch: "E3", stringNumber: 5, fretNumber: 7, group: "pentatonic" }),
  makeGuitarNote({ pitch: "G3", stringNumber: 4, fretNumber: 5, group: "pentatonic" }),
  makeGuitarNote({ pitch: "A3", stringNumber: 4, fretNumber: 7, group: "pentatonic" }),
  makeGuitarNote({ pitch: "C4", stringNumber: 3, fretNumber: 5, group: "pentatonic" }),
  makeGuitarNote({ pitch: "D4", stringNumber: 3, fretNumber: 7, group: "pentatonic" }),
  makeGuitarNote({ pitch: "E4", stringNumber: 2, fretNumber: 5, group: "pentatonic" }),
  makeGuitarNote({ pitch: "G4", stringNumber: 2, fretNumber: 8, group: "pentatonic" }),
  makeGuitarNote({ pitch: "A4", stringNumber: 1, fretNumber: 5, group: "pentatonic" }),
  makeGuitarNote({ pitch: "C5", stringNumber: 1, fretNumber: 8, group: "pentatonic" }),
];

const NOTE_LIBRARY = GUITAR_NOTES;
const OPEN_STRING_NOTES = GUITAR_NOTES.filter((note) => note.group === "open");
const FIRST_POSITION_NOTES = [
  ...OPEN_STRING_NOTES,
  ...GUITAR_NOTES.filter((note) => note.group === "first-position"),
].sort((a, b) => b.stringNumber - a.stringNumber || a.fretNumber - b.fretNumber);
const NOTES = GUITAR_NOTES.filter((note) => note.group === "pentatonic");

const ALL_PRACTICE_NOTES = [...OPEN_STRING_NOTES, ...FIRST_POSITION_NOTES, ...NOTES];

function getChordMetaFromLabel(label) {
  const cleanLabel = label.replace(/\(.*?\)/g, "");
  const root = cleanLabel[1] === "#" ? cleanLabel.slice(0, 2) : cleanLabel[0] ?? "C";
  const suffix = cleanLabel.slice(root.length);
  if (suffix === "m7") return { root, quality: "minor", extension: "m7", displayName: `${root}m7` };
  if (suffix === "m") return { root, quality: "minor", extension: "none", displayName: `${root}m` };
  if (suffix === "7") return { root, quality: "major", extension: "7", displayName: `${root}7` };
  if (suffix === "M7") return { root, quality: "major", extension: "maj7", displayName: `${root}maj7` };
  if (suffix === "sus4") return { root, quality: "major", extension: "sus4", displayName: `${root}sus4` };
  if (suffix === "add9") return { root, quality: "major", extension: "add9", displayName: `${root}add9` };
  return { root, quality: "major", extension: "none", displayName: root };
}

function makeChordViewOption(id, label, hint, positions, barres = [], meta = {}) {
  const fretted = positions.map((position) => position.fret).filter((fret) => fret > 0);
  const lowestFret = Math.min(...fretted);
  const highestFret = Math.max(...fretted);
  const isOpenPosition = positions.some((position) => position.fret === 0) || highestFret <= 3;
  const minFret = isOpenPosition ? 1 : Math.max(1, lowestFret);
  const maxFret = isOpenPosition ? Math.max(3, highestFret) : Math.max(minFret + 2, highestFret);
  const labelMeta = getChordMetaFromLabel(label);
  return {
    id,
    label,
    root: meta.root ?? labelMeta.root,
    quality: meta.quality ?? labelMeta.quality,
    extension: meta.extension ?? labelMeta.extension,
    displayName: meta.displayName ?? labelMeta.displayName,
    hint,
    visibleFrets: Array.from({ length: maxFret - minFret + 1 }, (_, index) => minFret + index),
    notes: positions.map((position) =>
      ({
        ...makeGuitarNote({
          pitch: position.pitch,
          stringNumber: position.stringNumber,
          fretNumber: position.fret,
          group: "viewer-chord",
        }),
        finger: position.finger ?? null,
      }),
    ),
    barres,
  };
}

const CHORD_FINGER_OVERRIDES = {
  CM: { "5-3": "3", "4-2": "2", "2-1": "1" },
  "Cm-barre": { "5-3": "1", "4-5": "3", "3-5": "4", "2-4": "2", "1-3": "1" },
  C7: { "5-3": "3", "4-2": "2", "3-3": "4", "2-1": "1" },
  "Cm7-barre": { "5-3": "1", "4-5": "3", "3-3": "1", "2-4": "2", "1-3": "1" },
  CM7: { "5-3": "3", "4-2": "2" },
  "C#m-barre": { "5-4": "1", "4-6": "3", "3-6": "4", "2-5": "2", "1-4": "1" },
  "C#m7-barre": { "5-4": "1", "4-6": "3", "3-4": "1", "2-5": "2", "1-4": "1" },
  DM: { "3-2": "1", "2-3": "3", "1-2": "2" },
  Dm: { "3-2": "2", "2-3": "3", "1-1": "1" },
  D7: { "3-2": "2", "2-1": "1", "1-2": "3" },
  Dm7: { "3-2": "2", "2-1": "1", "1-1": "1" },
  DM7: { "3-2": "1", "2-2": "2", "1-2": "3" },
  EM: { "5-2": "2", "4-2": "3", "3-1": "1" },
  Em: { "5-2": "2", "4-2": "3" },
  E7: { "5-2": "2", "3-1": "1" },
  Em7: { "5-2": "2" },
  EM7: { "5-2": "2", "4-1": "1", "3-1": "1" },
  "FM-barre": { "6-1": "1", "5-3": "3", "4-3": "4", "3-2": "2", "2-1": "1", "1-1": "1" },
  "Fm-barre": { "6-1": "1", "5-3": "3", "4-3": "4", "3-1": "1", "2-1": "1", "1-1": "1" },
  "F7-barre": { "6-1": "1", "5-3": "3", "4-1": "1", "3-2": "2", "2-1": "1", "1-1": "1" },
  "Fm7-barre": { "6-1": "1", "5-3": "3", "4-1": "1", "3-1": "1", "2-1": "1", "1-1": "1" },
  FM7: { "4-3": "3", "3-2": "2", "2-1": "1" },
  "F#m-barre": { "6-2": "1", "5-4": "3", "4-4": "4", "3-2": "1", "2-2": "1", "1-2": "1" },
  "F#m7-barre": { "6-2": "1", "5-4": "3", "4-2": "1", "3-2": "1", "2-2": "1", "1-2": "1" },
  GM: { "6-3": "3", "5-2": "2", "1-3": "4" },
  "Gm-barre": { "6-3": "1", "5-5": "3", "4-5": "4", "3-3": "1", "2-3": "1", "1-3": "1" },
  "G#m-barre": { "6-4": "1", "5-6": "3", "4-6": "4", "3-4": "1", "2-4": "1", "1-4": "1" },
  "G#m7-barre": { "6-4": "1", "5-6": "3", "4-4": "1", "3-4": "1", "2-4": "1", "1-4": "1" },
  G7: { "6-3": "3", "5-2": "2", "1-1": "1" },
  "Gm7-barre": { "6-3": "1", "5-5": "3", "4-3": "1", "3-3": "1", "2-3": "1", "1-3": "1" },
  GM7: { "6-3": "3", "5-2": "2", "1-2": "1" },
  AM: { "4-2": "1", "3-2": "2", "2-2": "3" },
  Am: { "4-2": "2", "3-2": "3", "2-1": "1" },
  A7: { "4-2": "2", "2-2": "3" },
  Am7: { "4-2": "2", "2-1": "1" },
  AM7: { "4-2": "2", "3-1": "1", "2-2": "3" },
  "BM-barre": { "5-2": "1", "4-4": "3", "3-4": "3", "2-4": "3", "1-2": "1" },
  Bm: { "5-2": "1", "4-4": "3", "3-4": "4", "2-3": "2", "1-2": "1" },
  B7: { "5-2": "2", "4-1": "1", "3-2": "3", "1-2": "4" },
  Bm7: { "5-2": "1", "4-4": "3", "3-2": "1", "2-3": "2", "1-2": "1" },
  BM7: { "5-2": "1", "4-4": "3", "3-3": "2", "2-4": "4", "1-2": "1" },
  Csus4: { "5-3": "3", "4-3": "4", "2-1": "1", "1-1": "1" },
  Cadd9: { "5-3": "3", "4-2": "2", "2-3": "4" },
  Dsus4: { "3-2": "1", "2-3": "3", "1-3": "4" },
  Dadd9: { "3-2": "1", "2-3": "3" },
  Esus4: { "5-2": "2", "4-2": "3", "3-2": "4" },
  Eadd9: { "5-2": "2", "4-4": "4", "3-1": "1" },
  "Fsus4-barre": { "6-1": "1", "5-3": "3", "4-3": "4", "3-3": "4", "2-1": "1", "1-1": "1" },
  Gsus4: { "6-3": "3", "5-3": "2", "2-1": "1", "1-3": "4" },
  Gadd9: { "6-3": "3", "5-2": "2", "3-2": "1", "2-3": "4", "1-3": "3" },
  Asus4: { "4-2": "1", "3-2": "2", "2-3": "4" },
  Aadd9: { "4-2": "1", "3-4": "4", "2-2": "2" },
  "Bsus4-barre": { "5-2": "1", "4-4": "3", "3-4": "4", "2-5": "4", "1-2": "1" },
  "Badd9-barre": { "5-2": "1", "4-4": "3", "3-6": "4", "2-4": "3", "1-2": "1" },
};

function applyStandardChordFingering(chord) {
  const overrides = CHORD_FINGER_OVERRIDES[chord.id] ?? {};
  const frettedNotes = chord.notes.filter((note) => Number(note.fretNumber) > 0);
  const fallbackFingers = new Map(
    [...new Set(frettedNotes.map((note) => Number(note.fretNumber)).sort((a, b) => a - b))]
      .map((fret, index) => [fret, String(Math.min(index + 1, 4))]),
  );
  return {
    ...chord,
    notes: chord.notes.map((note) => {
      const key = `${note.stringNumber}-${note.fretNumber}`;
      const barreFinger = chord.barres?.find(
        (barre) =>
          Number(barre.fret) === Number(note.fretNumber) &&
          note.stringNumber <= barre.fromString &&
          note.stringNumber >= barre.toString,
      )?.label;
      return {
        ...note,
        finger: note.fretNumber === 0 ? null : overrides[key] ?? note.finger ?? barreFinger ?? fallbackFingers.get(Number(note.fretNumber)) ?? "1",
      };
    }),
  };
}

const CHORD_VIEW_OPTIONS = [
  makeChordViewOption("CM", "CM", "CM chord", [
    { pitch: "C3", stringNumber: 5, fret: 3 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "G3", stringNumber: 3, fret: 0 },
    { pitch: "C4", stringNumber: 2, fret: 1 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("Cm-barre", "Cm(바레)", "Cm(바레) chord", [
    { pitch: "C3", stringNumber: 5, fret: 3 },
    { pitch: "G3", stringNumber: 4, fret: 5 },
    { pitch: "C4", stringNumber: 3, fret: 5 },
    { pitch: "D#4", stringNumber: 2, fret: 4 },
    { pitch: "G4", stringNumber: 1, fret: 3 },
  ], [{ fret: 3, fromString: 5, toString: 1, label: "1" }]),
  makeChordViewOption("C7", "C7", "C7 chord", [
    { pitch: "C3", stringNumber: 5, fret: 3 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "A#3", stringNumber: 3, fret: 3 },
    { pitch: "C4", stringNumber: 2, fret: 1 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("Cm7-barre", "Cm7(바레)", "Cm7(바레) chord", [
    { pitch: "C3", stringNumber: 5, fret: 3 },
    { pitch: "G3", stringNumber: 4, fret: 5 },
    { pitch: "A#3", stringNumber: 3, fret: 3 },
    { pitch: "D#4", stringNumber: 2, fret: 4 },
    { pitch: "G4", stringNumber: 1, fret: 3 },
  ], [{ fret: 3, fromString: 5, toString: 1, label: "1" }]),
  makeChordViewOption("CM7", "CM7", "CM7 chord", [
    { pitch: "C3", stringNumber: 5, fret: 3 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "G3", stringNumber: 3, fret: 0 },
    { pitch: "B3", stringNumber: 2, fret: 0 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("C#m-barre", "C#m(바레)", "C#m(바레) chord", [
    { pitch: "C#3", stringNumber: 5, fret: 4 },
    { pitch: "G#3", stringNumber: 4, fret: 6 },
    { pitch: "C#4", stringNumber: 3, fret: 6 },
    { pitch: "E4", stringNumber: 2, fret: 5 },
    { pitch: "G#4", stringNumber: 1, fret: 4 },
  ], [{ fret: 4, fromString: 5, toString: 1, label: "1" }]),
  makeChordViewOption("C#m7-barre", "C#m7(바레)", "C#m7(바레) chord", [
    { pitch: "C#3", stringNumber: 5, fret: 4 },
    { pitch: "G#3", stringNumber: 4, fret: 6 },
    { pitch: "B3", stringNumber: 3, fret: 4 },
    { pitch: "E4", stringNumber: 2, fret: 5 },
    { pitch: "G#4", stringNumber: 1, fret: 4 },
  ], [{ fret: 4, fromString: 5, toString: 1, label: "1" }]),
  makeChordViewOption("DM", "DM", "DM chord", [
    { pitch: "D3", stringNumber: 4, fret: 0 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "D4", stringNumber: 2, fret: 3 },
    { pitch: "F#4", stringNumber: 1, fret: 2 },
  ]),
  makeChordViewOption("Dm", "Dm", "Dm chord", [
    { pitch: "D3", stringNumber: 4, fret: 0 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "D4", stringNumber: 2, fret: 3 },
    { pitch: "F4", stringNumber: 1, fret: 1 },
  ]),
  makeChordViewOption("D7", "D7", "D7 chord", [
    { pitch: "D3", stringNumber: 4, fret: 0 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "C4", stringNumber: 2, fret: 1 },
    { pitch: "F#4", stringNumber: 1, fret: 2 },
  ]),
  makeChordViewOption("Dm7", "Dm7", "Dm7 chord", [
    { pitch: "D3", stringNumber: 4, fret: 0 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "C4", stringNumber: 2, fret: 1 },
    { pitch: "F4", stringNumber: 1, fret: 1 },
  ]),
  makeChordViewOption("DM7", "DM7", "DM7 chord", [
    { pitch: "D3", stringNumber: 4, fret: 0 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "C#4", stringNumber: 2, fret: 2 },
    { pitch: "F#4", stringNumber: 1, fret: 2 },
  ]),
  makeChordViewOption("EM", "EM", "EM chord", [
    { pitch: "E2", stringNumber: 6, fret: 0 },
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "G#3", stringNumber: 3, fret: 1 },
    { pitch: "B3", stringNumber: 2, fret: 0 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("Em", "Em", "Em chord", [
    { pitch: "E2", stringNumber: 6, fret: 0 },
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "G3", stringNumber: 3, fret: 0 },
    { pitch: "B3", stringNumber: 2, fret: 0 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("E7", "E7", "E7 chord", [
    { pitch: "E2", stringNumber: 6, fret: 0 },
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "D3", stringNumber: 4, fret: 0 },
    { pitch: "G#3", stringNumber: 3, fret: 1 },
    { pitch: "B3", stringNumber: 2, fret: 0 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("Em7", "Em7", "Em7 chord", [
    { pitch: "E2", stringNumber: 6, fret: 0 },
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "D3", stringNumber: 4, fret: 0 },
    { pitch: "G3", stringNumber: 3, fret: 0 },
    { pitch: "B3", stringNumber: 2, fret: 0 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("EM7", "EM7", "EM7 chord", [
    { pitch: "E2", stringNumber: 6, fret: 0 },
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "D#3", stringNumber: 4, fret: 1 },
    { pitch: "G#3", stringNumber: 3, fret: 1 },
    { pitch: "B3", stringNumber: 2, fret: 0 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("FM-barre", "FM(바레)", "FM(바레) chord", [
    { pitch: "F2", stringNumber: 6, fret: 1 },
    { pitch: "C3", stringNumber: 5, fret: 3 },
    { pitch: "F3", stringNumber: 4, fret: 3 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "C4", stringNumber: 2, fret: 1 },
    { pitch: "F4", stringNumber: 1, fret: 1 },
  ], [{ fret: 1, fromString: 6, toString: 1, label: "1" }]),
  makeChordViewOption("Fm-barre", "Fm(바레)", "Fm(바레) chord", [
    { pitch: "F2", stringNumber: 6, fret: 1 },
    { pitch: "C3", stringNumber: 5, fret: 3 },
    { pitch: "F3", stringNumber: 4, fret: 3 },
    { pitch: "G#3", stringNumber: 3, fret: 1 },
    { pitch: "C4", stringNumber: 2, fret: 1 },
    { pitch: "F4", stringNumber: 1, fret: 1 },
  ], [{ fret: 1, fromString: 6, toString: 1, label: "1" }]),
  makeChordViewOption("F7-barre", "F7(바레)", "F7(바레) chord", [
    { pitch: "F2", stringNumber: 6, fret: 1 },
    { pitch: "C3", stringNumber: 5, fret: 3 },
    { pitch: "D#3", stringNumber: 4, fret: 1 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "C4", stringNumber: 2, fret: 1 },
    { pitch: "F4", stringNumber: 1, fret: 1 },
  ], [{ fret: 1, fromString: 6, toString: 1, label: "1" }]),
  makeChordViewOption("Fm7-barre", "Fm7(바레)", "Fm7(바레) chord", [
    { pitch: "F2", stringNumber: 6, fret: 1 },
    { pitch: "C3", stringNumber: 5, fret: 3 },
    { pitch: "D#3", stringNumber: 4, fret: 1 },
    { pitch: "G#3", stringNumber: 3, fret: 1 },
    { pitch: "C4", stringNumber: 2, fret: 1 },
    { pitch: "F4", stringNumber: 1, fret: 1 },
  ], [{ fret: 1, fromString: 6, toString: 1, label: "1" }]),
  makeChordViewOption("FM7", "FM7", "FM7 chord", [
    { pitch: "F3", stringNumber: 4, fret: 3 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "C4", stringNumber: 2, fret: 1 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("F#m-barre", "F#m(바레)", "F#m(바레) chord", [
    { pitch: "F#2", stringNumber: 6, fret: 2 },
    { pitch: "C#3", stringNumber: 5, fret: 4 },
    { pitch: "F#3", stringNumber: 4, fret: 4 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "C#4", stringNumber: 2, fret: 2 },
    { pitch: "F#4", stringNumber: 1, fret: 2 },
  ], [{ fret: 2, fromString: 6, toString: 1, label: "1" }]),
  makeChordViewOption("F#m7-barre", "F#m7(바레)", "F#m7(바레) chord", [
    { pitch: "F#2", stringNumber: 6, fret: 2 },
    { pitch: "C#3", stringNumber: 5, fret: 4 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "C#4", stringNumber: 2, fret: 2 },
    { pitch: "F#4", stringNumber: 1, fret: 2 },
  ], [{ fret: 2, fromString: 6, toString: 1, label: "1" }]),
  makeChordViewOption("GM", "GM", "GM chord", [
    { pitch: "G2", stringNumber: 6, fret: 3 },
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "D3", stringNumber: 4, fret: 0 },
    { pitch: "G3", stringNumber: 3, fret: 0 },
    { pitch: "B3", stringNumber: 2, fret: 0 },
    { pitch: "G4", stringNumber: 1, fret: 3 },
  ]),
  makeChordViewOption("Gm-barre", "Gm(바레)", "Gm(바레) chord", [
    { pitch: "G2", stringNumber: 6, fret: 3 },
    { pitch: "D3", stringNumber: 5, fret: 5 },
    { pitch: "G3", stringNumber: 4, fret: 5 },
    { pitch: "A#3", stringNumber: 3, fret: 3 },
    { pitch: "D4", stringNumber: 2, fret: 3 },
    { pitch: "G4", stringNumber: 1, fret: 3 },
  ], [{ fret: 3, fromString: 6, toString: 1, label: "1" }]),
  makeChordViewOption("G#m-barre", "G#m(바레)", "G#m(바레) chord", [
    { pitch: "G#2", stringNumber: 6, fret: 4 },
    { pitch: "D#3", stringNumber: 5, fret: 6 },
    { pitch: "G#3", stringNumber: 4, fret: 6 },
    { pitch: "B3", stringNumber: 3, fret: 4 },
    { pitch: "D#4", stringNumber: 2, fret: 4 },
    { pitch: "G#4", stringNumber: 1, fret: 4 },
  ], [{ fret: 4, fromString: 6, toString: 1, label: "1" }]),
  makeChordViewOption("G#m7-barre", "G#m7(바레)", "G#m7(바레) chord", [
    { pitch: "G#2", stringNumber: 6, fret: 4 },
    { pitch: "D#3", stringNumber: 5, fret: 6 },
    { pitch: "F#3", stringNumber: 4, fret: 4 },
    { pitch: "B3", stringNumber: 3, fret: 4 },
    { pitch: "D#4", stringNumber: 2, fret: 4 },
    { pitch: "G#4", stringNumber: 1, fret: 4 },
  ], [{ fret: 4, fromString: 6, toString: 1, label: "1" }]),
  makeChordViewOption("G7", "G7", "G7 chord", [
    { pitch: "G2", stringNumber: 6, fret: 3 },
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "D3", stringNumber: 4, fret: 0 },
    { pitch: "G3", stringNumber: 3, fret: 0 },
    { pitch: "B3", stringNumber: 2, fret: 0 },
    { pitch: "F4", stringNumber: 1, fret: 1 },
  ]),
  makeChordViewOption("Gm7-barre", "Gm7(바레)", "Gm7(바레) chord", [
    { pitch: "G2", stringNumber: 6, fret: 3 },
    { pitch: "D3", stringNumber: 5, fret: 5 },
    { pitch: "F3", stringNumber: 4, fret: 3 },
    { pitch: "A#3", stringNumber: 3, fret: 3 },
    { pitch: "D4", stringNumber: 2, fret: 3 },
    { pitch: "G4", stringNumber: 1, fret: 3 },
  ], [{ fret: 3, fromString: 6, toString: 1, label: "1" }]),
  makeChordViewOption("GM7", "GM7", "GM7 chord", [
    { pitch: "G2", stringNumber: 6, fret: 3 },
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "D3", stringNumber: 4, fret: 0 },
    { pitch: "G3", stringNumber: 3, fret: 0 },
    { pitch: "B3", stringNumber: 2, fret: 0 },
    { pitch: "F#4", stringNumber: 1, fret: 2 },
  ]),
  makeChordViewOption("AM", "AM", "AM chord", [
    { pitch: "A2", stringNumber: 5, fret: 0 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "C#4", stringNumber: 2, fret: 2 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("Am", "Am", "Am chord", [
    { pitch: "A2", stringNumber: 5, fret: 0 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "C4", stringNumber: 2, fret: 1 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("A7", "A7", "A7 chord", [
    { pitch: "A2", stringNumber: 5, fret: 0 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "G3", stringNumber: 3, fret: 0 },
    { pitch: "C#4", stringNumber: 2, fret: 2 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("Am7", "Am7", "Am7 chord", [
    { pitch: "A2", stringNumber: 5, fret: 0 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "G3", stringNumber: 3, fret: 0 },
    { pitch: "C4", stringNumber: 2, fret: 1 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("AM7", "AM7", "AM7 chord", [
    { pitch: "A2", stringNumber: 5, fret: 0 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "G#3", stringNumber: 3, fret: 1 },
    { pitch: "C#4", stringNumber: 2, fret: 2 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("BM-barre", "BM(바레)", "BM(바레) chord", [
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "F#3", stringNumber: 4, fret: 4 },
    { pitch: "B3", stringNumber: 3, fret: 4 },
    { pitch: "D#4", stringNumber: 2, fret: 4 },
    { pitch: "F#4", stringNumber: 1, fret: 2 },
  ], [{ fret: 2, fromString: 5, toString: 1, label: "1" }]),
  makeChordViewOption("Bm", "Bm(바레)", "Bm(바레) chord", [
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "F#3", stringNumber: 4, fret: 4 },
    { pitch: "B3", stringNumber: 3, fret: 4 },
    { pitch: "D4", stringNumber: 2, fret: 3 },
    { pitch: "F#4", stringNumber: 1, fret: 2 },
  ], [{ fret: 2, fromString: 5, toString: 1, label: "1" }]),
  makeChordViewOption("B7", "B7", "B7 chord", [
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "D#3", stringNumber: 4, fret: 1 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "B3", stringNumber: 2, fret: 0 },
    { pitch: "F#4", stringNumber: 1, fret: 2 },
  ]),
  makeChordViewOption("Bm7", "Bm7(바레)", "Bm7(바레) chord", [
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "F#3", stringNumber: 4, fret: 4 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "D4", stringNumber: 2, fret: 3 },
    { pitch: "F#4", stringNumber: 1, fret: 2 },
  ], [{ fret: 2, fromString: 5, toString: 1, label: "1" }]),
  makeChordViewOption("BM7", "BM7(바레)", "BM7(바레) chord", [
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "F#3", stringNumber: 4, fret: 4 },
    { pitch: "A#3", stringNumber: 3, fret: 3 },
    { pitch: "D#4", stringNumber: 2, fret: 4 },
    { pitch: "F#4", stringNumber: 1, fret: 2 },
  ], [{ fret: 2, fromString: 5, toString: 1, label: "1" }]),
  makeChordViewOption("Csus4", "Csus4", "Csus4 chord", [
    { pitch: "C3", stringNumber: 5, fret: 3 },
    { pitch: "F3", stringNumber: 4, fret: 3 },
    { pitch: "G3", stringNumber: 3, fret: 0 },
    { pitch: "C4", stringNumber: 2, fret: 1 },
    { pitch: "F4", stringNumber: 1, fret: 1 },
  ]),
  makeChordViewOption("Cadd9", "Cadd9", "Cadd9 chord", [
    { pitch: "C3", stringNumber: 5, fret: 3 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "G3", stringNumber: 3, fret: 0 },
    { pitch: "D4", stringNumber: 2, fret: 3 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("Dsus4", "Dsus4", "Dsus4 chord", [
    { pitch: "D3", stringNumber: 4, fret: 0 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "D4", stringNumber: 2, fret: 3 },
    { pitch: "G4", stringNumber: 1, fret: 3 },
  ]),
  makeChordViewOption("Dadd9", "Dadd9", "Dadd9 chord", [
    { pitch: "D3", stringNumber: 4, fret: 0 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "D4", stringNumber: 2, fret: 3 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("Esus4", "Esus4", "Esus4 chord", [
    { pitch: "E2", stringNumber: 6, fret: 0 },
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "B3", stringNumber: 2, fret: 0 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("Eadd9", "Eadd9", "Eadd9 chord", [
    { pitch: "E2", stringNumber: 6, fret: 0 },
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "F#3", stringNumber: 4, fret: 4 },
    { pitch: "G#3", stringNumber: 3, fret: 1 },
    { pitch: "B3", stringNumber: 2, fret: 0 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("Fsus4-barre", "Fsus4(바레)", "Fsus4(바레) chord", [
    { pitch: "F2", stringNumber: 6, fret: 1 },
    { pitch: "C3", stringNumber: 5, fret: 3 },
    { pitch: "F3", stringNumber: 4, fret: 3 },
    { pitch: "A#3", stringNumber: 3, fret: 3 },
    { pitch: "C4", stringNumber: 2, fret: 1 },
    { pitch: "F4", stringNumber: 1, fret: 1 },
  ], [{ fret: 1, fromString: 6, toString: 1, label: "1" }]),
  makeChordViewOption("Gsus4", "Gsus4", "Gsus4 chord", [
    { pitch: "G2", stringNumber: 6, fret: 3 },
    { pitch: "C3", stringNumber: 5, fret: 3 },
    { pitch: "D3", stringNumber: 4, fret: 0 },
    { pitch: "G3", stringNumber: 3, fret: 0 },
    { pitch: "C4", stringNumber: 2, fret: 1 },
    { pitch: "G4", stringNumber: 1, fret: 3 },
  ]),
  makeChordViewOption("Gadd9", "Gadd9", "Gadd9 chord", [
    { pitch: "G2", stringNumber: 6, fret: 3 },
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "D3", stringNumber: 4, fret: 0 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "D4", stringNumber: 2, fret: 3 },
    { pitch: "G4", stringNumber: 1, fret: 3 },
  ]),
  makeChordViewOption("Asus4", "Asus4", "Asus4 chord", [
    { pitch: "A2", stringNumber: 5, fret: 0 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "A3", stringNumber: 3, fret: 2 },
    { pitch: "D4", stringNumber: 2, fret: 3 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("Aadd9", "Aadd9", "Aadd9 chord", [
    { pitch: "A2", stringNumber: 5, fret: 0 },
    { pitch: "E3", stringNumber: 4, fret: 2 },
    { pitch: "B3", stringNumber: 3, fret: 4 },
    { pitch: "C#4", stringNumber: 2, fret: 2 },
    { pitch: "E4", stringNumber: 1, fret: 0 },
  ]),
  makeChordViewOption("Bsus4-barre", "Bsus4(바레)", "Bsus4(바레) chord", [
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "F#3", stringNumber: 4, fret: 4 },
    { pitch: "B3", stringNumber: 3, fret: 4 },
    { pitch: "E4", stringNumber: 2, fret: 5 },
    { pitch: "F#4", stringNumber: 1, fret: 2 },
  ], [{ fret: 2, fromString: 5, toString: 1, label: "1" }]),
  makeChordViewOption("Badd9-barre", "Badd9(바레)", "Badd9(바레) chord", [
    { pitch: "B2", stringNumber: 5, fret: 2 },
    { pitch: "F#3", stringNumber: 4, fret: 4 },
    { pitch: "C#4", stringNumber: 3, fret: 6 },
    { pitch: "D#4", stringNumber: 2, fret: 4 },
    { pitch: "F#4", stringNumber: 1, fret: 2 },
  ], [{ fret: 2, fromString: 5, toString: 1, label: "1" }]),
].map(applyStandardChordFingering);

const CHORD_NATURAL_ROOTS = ["C", "D", "E", "F", "G", "A", "B"];
const CHORD_SHARP_ROOTS = {
  C: "C#",
  D: "D#",
  F: "F#",
  G: "G#",
  A: "A#",
};
const CHORD_FLAT_ROOTS = {
  C: "B",
  D: "C#",
  E: "D#",
  F: "E",
  G: "F#",
  A: "G#",
  B: "A#",
};
const CHORD_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const CHORD_ACCIDENTAL_OPTIONS = [
  { id: "natural", label: "기본", suffix: "" },
  { id: "sharp", label: "샵(#)", suffix: "#" },
  { id: "flat", label: "플랫(b)", suffix: "b" },
];

const CHORD_QUALITY_OPTIONS = [
  { id: "major", label: "Major", shortLabel: "메이저" },
  { id: "minor", label: "Minor", shortLabel: "마이너" },
];

const CHORD_EXTENSION_OPTIONS = [
  { id: "none", label: "기본", quality: "any" },
  { id: "7", label: "7", quality: "major" },
  { id: "maj7", label: "maj7", quality: "major" },
  { id: "m7", label: "7", quality: "minor" },
  { id: "sus4", label: "sus4", quality: "major" },
];

const CHORD_TRANSITION_PRESETS = [
  { id: "turnaround-c", title: "1625 기본", label: "C - Am - Dm - G", chords: ["C", "Am", "Dm", "G"], memo: "기본 1625 진행" },
  { id: "six-four-one-five", title: "6415 진행", label: "Am - F - C - G", chords: ["Am", "F", "C", "G"], memo: "훈련용 6415 진행" },
  { id: "k-ballad-basic", title: "K-Ballad 기본", label: "G - D - Em - C", chords: ["G", "D", "Em", "C"], memo: "발라드 스타일 훈련 진행" },
  { id: "two-chord-switch", title: "2코드 전환", label: "C - F", chords: ["C", "F"], memo: "두 코드 전환 집중 훈련" },
];

function normalizeChordToken(value = "") {
  return value.trim().replace(/maj7/i, "maj7").replace(/M7$/, "maj7");
}

function getChordByDisplayName(name) {
  const normalized = normalizeChordToken(name);
  return CHORD_VIEW_OPTIONS.find((chord) => chord.displayName === normalized) ?? null;
}

const CAGED_MAJOR_FORMS_FROM_C = {
  position2: {
    frets: [
      { stringNumber: 5, fret: 3 },
      { stringNumber: 4, fret: 5 },
      { stringNumber: 3, fret: 5 },
      { stringNumber: 2, fret: 5 },
      { stringNumber: 1, fret: 3 },
    ],
    barres: [{ fret: 3, fromString: 5, toString: 1, label: "1" }],
  },
  position3: {
    frets: [
      { stringNumber: 6, fret: 8 },
      { stringNumber: 5, fret: 7 },
      { stringNumber: 4, fret: 5 },
      { stringNumber: 3, fret: 5 },
      { stringNumber: 2, fret: 5 },
      { stringNumber: 1, fret: 8 },
    ],
    barres: [{ fret: 5, fromString: 4, toString: 2, label: "1" }],
  },
  position4: {
    frets: [
      { stringNumber: 6, fret: 8 },
      { stringNumber: 5, fret: 10 },
      { stringNumber: 4, fret: 10 },
      { stringNumber: 3, fret: 9 },
      { stringNumber: 2, fret: 8 },
      { stringNumber: 1, fret: 8 },
    ],
    barres: [{ fret: 8, fromString: 6, toString: 1, label: "1" }],
  },
  position5: {
    frets: [
      { stringNumber: 4, fret: 10 },
      { stringNumber: 3, fret: 12 },
      { stringNumber: 2, fret: 13 },
      { stringNumber: 1, fret: 12 },
    ],
    barres: [],
  },
};

function buildCagedMajorChordPosition(root, positionId) {
  const form = CAGED_MAJOR_FORMS_FROM_C[positionId];
  const rootOffset = NOTE_INDEX[root] - NOTE_INDEX.C;
  if (!form || !Number.isFinite(rootOffset)) return null;
  const notes = form.frets.map((item, index) => {
    const stringInfo = STANDARD_TUNING.find((string) => string.stringNumber === item.stringNumber);
    const fretNumber = item.fret + rootOffset;
    if (!stringInfo || fretNumber < 0) return null;
    const pitch = midiToPitch(pitchToMidi(stringInfo.pitch) + fretNumber);
    const noteName = getPitchClass(pitch);
    return {
      id: `caged-${root}-${positionId}-${item.stringNumber}-${fretNumber}-${index}`,
      stringNumber: item.stringNumber,
      fretNumber,
      pitch,
      noteName,
      label: getChordDisplayNoteName(noteName),
      finger: item.finger ?? null,
      isRoot: noteName === root,
    };
  }).filter(Boolean);
  if (!notes.length) return null;
  const playedStrings = new Set(notes.map((note) => note.stringNumber));
  const stringStates = Object.fromEntries(
    [1, 2, 3, 4, 5, 6]
      .filter((stringNumber) => !playedStrings.has(stringNumber))
      .map((stringNumber) => [stringNumber, "x"]),
  );
  return {
    id: `${root}-${positionId}`,
    notes,
    barres: form.barres.map((barre) => ({ ...barre, fret: barre.fret + rootOffset })),
    stringStates,
  };
}

function getChordLookupRoot(baseRoot, accidental = "natural") {
  if (accidental === "sharp") return CHORD_SHARP_ROOTS[baseRoot] ?? `${baseRoot}#`;
  if (accidental === "flat") return CHORD_FLAT_ROOTS[baseRoot] ?? `${baseRoot}b`;
  return baseRoot;
}

function getChordDisplayRoot(baseRoot, accidental = "natural") {
  const suffix = CHORD_ACCIDENTAL_OPTIONS.find((option) => option.id === accidental)?.suffix ?? "";
  return `${baseRoot}${suffix}`;
}

function getChordNameFromParts(baseRoot, accidental, quality, extension) {
  const root = getChordDisplayRoot(baseRoot, accidental);
  if (quality === "minor") return extension === "m7" ? `${root}m7` : `${root}m`;
  if (extension === "7") return `${root}7`;
  if (extension === "maj7") return `${root}maj7`;
  if (extension === "sus4") return `${root}sus4`;
  return root;
}

function splitChordRootForSelector(root = "C") {
  if (root.includes("#")) {
    const baseRoot = root[0];
    return { baseRoot, accidental: CHORD_SHARP_ROOTS[baseRoot] === root ? "sharp" : "natural" };
  }
  return { baseRoot: root[0] ?? "C", accidental: "natural" };
}

function getChordDebugInfo({ baseRoot, accidental, quality, extension, chord }) {
  const generatedChordName = getChordNameFromParts(baseRoot, accidental, quality, extension);
  const fretboardChordName = chord?.displayName ?? "운지 준비중";
  const normalizedChordName = chord?.displayName ?? generatedChordName;
  return {
    selectedRoot: baseRoot,
    selectedAccidental: CHORD_ACCIDENTAL_OPTIONS.find((option) => option.id === accidental)?.label ?? accidental,
    selectedQuality: quality,
    selectedOption: extension === "m7" && quality === "minor" ? "7" : extension,
    generatedChordName,
    normalizedChordName,
    fretboardChordName,
    chordDataLookupKey: chord?.id ?? null,
    isEnharmonic: Boolean(chord && generatedChordName !== chord.displayName),
  };
}

function getChordEntryId(entry) {
  return typeof entry === "string" ? entry : entry?.id;
}

function getChordEntryLabel(entry, chord) {
  if (typeof entry === "string") return chord?.displayName ?? entry;
  return entry?.label ?? chord?.displayName ?? entry?.id ?? "";
}

function getChordIdsFromNames(names = []) {
  return names.map((name) => getChordByDisplayName(name)?.id).filter(Boolean);
}

function getChordProgressionText(chordIds = []) {
  return chordIds
    .map((entry) => {
      const id = getChordEntryId(entry);
      return CHORD_VIEW_OPTIONS.find((chord) => chord.id === id)?.displayName ?? getChordEntryLabel(entry, null);
    })
    .filter(Boolean)
    .join(" - ");
}

function makeStage3LibraryItem({
  id,
  title,
  chordIds,
  bpm = DEFAULT_BPM,
  timeSignature = "4/4",
  subdivision = "quarter",
  sound = "tick",
  capo = 0,
  strum_pattern,
  memo = "",
}) {
  const safeChordIds = Array.isArray(chordIds)
    ? chordIds.filter((entry) => CHORD_VIEW_OPTIONS.some((chord) => chord.id === getChordEntryId(entry)))
    : [];
  const progression = getChordProgressionText(safeChordIds);
  const safeTitle = String(title || "").trim() || progression || "내 진행";
  const isPreset = String(id || "").startsWith("preset-");
  return {
    id: String(id || `slot-${Date.now()}`),
    title: safeTitle,
    label: `${safeTitle} — ${progression}`,
    chord_progression: progression,
    chordIds: safeChordIds,
    capo: Number.isFinite(Number(capo)) ? Math.max(0, Math.min(12, Number(capo))) : 0,
    bpm: clampBpm(bpm),
    time_signature: timeSignature,
    subdivision,
    sound,
    strum_pattern: isPreset ? [] : normalizeStrumPatternGroups(strum_pattern),
    memo: String(memo || ""),
  };
}

function getCompactFretRange(notes = [], barres = [], fallback = [0, 3]) {
  const frets = [
    ...notes.map((note) => Number(note.fretNumber ?? note.fret)),
    ...barres.map((barre) => Number(barre.fret)),
  ].filter((fret) => Number.isFinite(fret) && fret > 0);
  if (!frets.length) return fallback;
  const min = Math.min(...frets);
  const max = Math.max(...frets);
  if (min <= 3) return [0, Math.max(3, max)];
  return [Math.max(0, min - 1), Math.max(max, min + 3)];
}

const TIME_SIGNATURE_OPTIONS = [
  { id: "2/4", label: "2/4", beats: 2 },
  { id: "3/4", label: "3/4", beats: 3 },
  { id: "4/4", label: "4/4", beats: 4 },
  { id: "6/8", label: "6/8", beats: 6 },
];

const SUBDIVISION_OPTIONS = [
  { id: "quarter", label: "1박 1클릭", clicksPerBeat: 1 },
  { id: "eighth", label: "1박 2클릭", clicksPerBeat: 2 },
  { id: "sixteenth", label: "1박 4클릭", clicksPerBeat: 4 },
];

const METRONOME_TONE_OPTIONS = [
  { id: "tick", label: "Tick" },
  { id: "stick", label: "Stick", src: "/sounds/stick.wav" },
  { id: "snare", label: "Snare", src: "/sounds/snare.wav" },
  { id: "kick", label: "Kick", src: "/sounds/kick.wav" },
  { id: "hihat", label: "Hi-Hat", src: "/sounds/hihat.wav" },
  { id: "cowbell", label: "Cowbell", src: "/sounds/cowbell.wav" },
  { id: "clap", label: "Clap", src: "/sounds/clap.wav" },
];
const FEEL_RECORDER_STORAGE_KEY = "rifflab-feel-recorder-patterns";
const FEEL_RECORDER_LONG_PRESS_MS = 420;
const FEEL_RECORDER_MAX_EVENTS = 24;
const FEEL_RECORDER_DEFAULT_NAME = "My Feel";
const FEEL_RECORDER_MIN_TAP_MS = 60;

function normalizeFeelRecorderEvents(events) {
  if (!Array.isArray(events)) return [];

  let cursorMs = 0;
  return events.slice(0, FEEL_RECORDER_MAX_EVENTS).map((event) => {
    const durationMs = Math.max(FEEL_RECORDER_MIN_TAP_MS, Math.min(3200, Number(event?.durationMs) || 120));
    const hasTimeline = Number.isFinite(Number(event?.startMs)) && Number.isFinite(Number(event?.endMs));
    const startMs = hasTimeline
      ? Math.max(0, Math.min(60000, Number(event.startMs)))
      : cursorMs + Math.max(0, Math.min(2400, Number(event?.gapMs) || 0));
    const endMs = hasTimeline
      ? Math.max(startMs + FEEL_RECORDER_MIN_TAP_MS, Math.min(62000, Number(event.endMs)))
      : startMs + durationMs;
    cursorMs = endMs;

    return {
      type: endMs - startMs >= FEEL_RECORDER_LONG_PRESS_MS ? "hold" : "tick",
      startMs,
      endMs,
      durationMs: endMs - startMs,
      gapMs: Math.max(0, Math.min(2400, Number(event?.gapMs) || 0)),
    };
  });
}

function getFeelRecorderBlockLabel(event) {
  if (!event || event.type !== "hold") return "|";
  const length = Math.max(2, Math.min(12, Math.round((Number(event.durationMs) || 420) / 120)));
  return `|${"━".repeat(length)}|`;
}

function getFeelRecorderPatternLine(events) {
  const normalized = normalizeFeelRecorderEvents(events);
  return normalized.map((event) => getFeelRecorderBlockLabel(event)).join("");
}

function getFeelRecorderStrokeLine(events) {
  const normalized = normalizeFeelRecorderEvents(events);
  return normalized.map((event) => getFeelRecorderBlockLabel(event)).join("");
}

function getFeelRecorderEventUnits(event) {
  return Math.max(FEEL_RECORDER_MIN_TAP_MS, Number(event?.durationMs) || FEEL_RECORDER_MIN_TAP_MS);
}

function getFeelRecorderTotalUnits(events) {
  const normalized = normalizeFeelRecorderEvents(events);
  return Math.max(240, normalized.reduce((max, event) => Math.max(max, event.endMs), 0));
}

function getStoredFeelRecorderPatterns() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(FEEL_RECORDER_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => ({
        id: String(item?.id || `feel-${index}`),
        name: String(item?.name || `${FEEL_RECORDER_DEFAULT_NAME} ${index + 1}`).slice(0, 28),
        events: normalizeFeelRecorderEvents(item?.events),
        createdAt: Number(item?.createdAt) || Date.now(),
      }))
      .filter((item) => item.events.length > 0)
      .slice(0, 20);
  } catch {
    return [];
  }
}

function getTimeSignatureOption(id) {
  return TIME_SIGNATURE_OPTIONS.find((option) => option.id === id) ?? TIME_SIGNATURE_OPTIONS[2];
}

function getSubdivisionOption(id) {
  return SUBDIVISION_OPTIONS.find((option) => option.id === id) ?? SUBDIVISION_OPTIONS[0];
}

function getMetronomeToneOption(id) {
  return METRONOME_TONE_OPTIONS.find((option) => option.id === id) ?? METRONOME_TONE_OPTIONS[0];
}

function MetronomeSelectControl({ label, options, value, onChange }) {
  return (
    <label className="metronomeSelectControl">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetronomeControl({
  accentEnabled = true,
  bpm,
  className = "",
  countInEnabled = false,
  inputId = "metronome-bpm-presets",
  onAccentChange = () => {},
  onBpmChange,
  onCountInChange = () => {},
  onRepeatChange = () => {},
  onSubdivisionChange = () => {},
  onTimeSignatureChange = () => {},
  onToneChange = () => {},
  repeatEnabled = false,
  showCountIn = true,
  showRepeat = true,
  subdivision = "quarter",
  timeSignature = "4/4",
  tone = "tick",
}) {
  const [draftBpm, setDraftBpm] = useState(String(bpm));

  useEffect(() => {
    setDraftBpm(String(bpm));
  }, [bpm]);

  const applyBpmValue = useCallback((value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || value === "") {
      setDraftBpm(String(bpm || DEFAULT_BPM));
      return bpm || DEFAULT_BPM;
    }
    const next = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(parsed)));
    setDraftBpm(String(next));
    onBpmChange(next);
    return next;
  }, [bpm, onBpmChange]);

  const commitBpm = useCallback((value) => {
    applyBpmValue(value);
  }, [applyBpmValue]);

  const applyBpmPreset = useCallback((value) => {
    applyBpmValue(value);
  }, [applyBpmValue]);

  const handleBpmKeyDown = useCallback((event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitBpm(draftBpm);
    event.currentTarget.blur();
  }, [commitBpm, draftBpm]);

  const stepBpm = useCallback((amount) => {
    const parsed = Number(draftBpm);
    const base = Number.isFinite(parsed) && draftBpm !== "" ? parsed : bpm || DEFAULT_BPM;
    applyBpmValue(base + amount);
  }, [applyBpmValue, bpm, draftBpm]);

  const applyNextBpmPreset = useCallback(() => {
    const current = Number(bpm) || DEFAULT_BPM;
    const nextPreset = BPM_PRESETS.find((preset) => preset > current) ?? BPM_PRESETS[0];
    applyBpmPreset(nextPreset);
  }, [applyBpmPreset, bpm]);

  return (
    <div className={`metronomeControl ${className}`}>
      <div className="metronomeTopLine">
        <label className="metronomeBpmLabel" htmlFor={`${inputId}-input`}>BPM</label>
        <div className="metronomeBpmCombo">
          <div className="metronomeBpmInputShell">
            <input
              aria-label="BPM"
              id={`${inputId}-input`}
              inputMode="numeric"
              max={MAX_BPM}
              min={MIN_BPM}
              onBlur={() => commitBpm(draftBpm)}
              onFocus={(event) => event.target.select()}
              onChange={(event) => {
                const nextValue = event.target.value.replace(/[^\d]/g, "");
                setDraftBpm(nextValue);
              }}
              onKeyDown={handleBpmKeyDown}
              pattern="[0-9]*"
              step="1"
              type="number"
              value={draftBpm}
            />
            <div className="metronomeBpmSpinner" aria-label="BPM 미세 조절">
              <button aria-label="BPM 1 올리기" className="metronomeBpmStep" onClick={() => stepBpm(1)} type="button">
                +
              </button>
              <button aria-label="BPM 1 낮추기" className="metronomeBpmStep" onClick={() => stepBpm(-1)} type="button">
                -
              </button>
            </div>
          </div>
          <button
            aria-label="BPM 빠른 선택"
            className="metronomeBpmPresetSelect"
            onClick={applyNextBpmPreset}
            type="button"
          >
            빠른
          </button>
        </div>
        <div className="metronomeToggleRow">
          <button
            aria-pressed={accentEnabled}
            className={accentEnabled ? "selected" : ""}
            onClick={() => onAccentChange(!accentEnabled)}
            type="button"
          >
            강박 {accentEnabled ? "ON" : "OFF"}
          </button>
          {showCountIn ? (
            <button
              aria-pressed={countInEnabled}
              className={countInEnabled ? "selected" : ""}
              onClick={() => onCountInChange(!countInEnabled)}
              type="button"
            >
              카운트인 {countInEnabled ? "ON" : "OFF"}
            </button>
          ) : null}
          {showRepeat ? (
            <button
              aria-pressed={repeatEnabled}
              className={repeatEnabled ? "selected" : ""}
              onClick={() => onRepeatChange(!repeatEnabled)}
              type="button"
            >
              반복 {repeatEnabled ? "ON" : "OFF"}
            </button>
          ) : null}
        </div>
      </div>
      <div className="metronomeOptions">
        <MetronomeSelectControl
          label="박자"
          onChange={onTimeSignatureChange}
          options={TIME_SIGNATURE_OPTIONS}
          value={timeSignature}
        />
        <MetronomeSelectControl
          label="세분"
          onChange={onSubdivisionChange}
          options={SUBDIVISION_OPTIONS}
          value={subdivision}
        />
        <MetronomeSelectControl
          label="음색"
          onChange={onToneChange}
          options={METRONOME_TONE_OPTIONS}
          value={tone}
        />
      </div>
    </div>
  );
}

function MetronomeTimeline({ beat, beatsPerMeasure = 4, currentLabel, isPlaying, progress, runnerLabel, timeSignature = "4/4" }) {
  const markers = Array.from({ length: Math.max(0, beatsPerMeasure - 1) }, (_, index) => index + 1);
  const dots = Array.from({ length: beatsPerMeasure }, (_, index) => index);

  return (
    <div className="chordTimeline metronomeTimeline" aria-label={`${timeSignature} 메트로놈 진행`}>
      <div className="chordTimelineLabels">
        <strong>{currentLabel}</strong>
        <span>{timeSignature} 진행</span>
      </div>
      <div className="chordTimelineTrack">
        <span
          className="chordTimelineFill"
          style={{ transform: `scaleX(${progress})` }}
        />
        <i
          className="chordTimelineRunner"
          style={{ left: `${progress * 100}%` }}
        >
          {runnerLabel ?? currentLabel}
        </i>
        {markers.map((beatNumber) => (
          <b
            className={beat === beatNumber && isPlaying ? "active" : ""}
            key={beatNumber}
            style={{ left: `${(beatNumber / beatsPerMeasure) * 100}%` }}
          />
        ))}
      </div>
      <div className="mobileBeatDots" aria-hidden="true">
        {dots.map((beatNumber) => (
          <span
            className={beat === beatNumber && isPlaying ? "active" : ""}
            key={beatNumber}
          />
        ))}
      </div>
    </div>
  );
}

const DEFAULT_STRUM_PATTERN = [];

function normalizeStrumPattern(pattern) {
  if (Array.isArray(pattern) && pattern.length > 0) {
    return pattern
      .flatMap((step) => (Array.isArray(step) ? step : [step]))
      .map((step) => ({
        direction: step?.direction === "up" || step?.dir === "up" ? "up" : "down",
        hit: typeof step?.hit === "boolean" ? step.hit : step?.accent === "strong",
      }))
      .slice(0, 24);
  }
  return [];
}

function normalizeStrumPatternGroups(pattern) {
  if (!Array.isArray(pattern) || !pattern.length) return [];
  if (Array.isArray(pattern[0])) {
    return [0, 1].map((index) => normalizeStrumPattern(pattern[index] ?? []));
  }
  const normalized = normalizeStrumPattern(pattern);
  return normalized.length ? [normalized, []] : [];
}

function StrumPattern({ onStepClick, pattern = DEFAULT_STRUM_PATTERN }) {
  const steps = normalizeStrumPattern(pattern);
  if (!steps.length) return null;
  const compactStepSize = Math.max(9, Math.min(16, Math.floor(132 / Math.max(steps.length, 1))));
  const compactFontSize = Math.max(12, Math.min(17, compactStepSize + 2));
  const compactHitFontSize = Math.max(13, Math.min(20, compactStepSize + 4));
  return (
    <div
      className="strumPattern"
      aria-label="주법 패턴"
      style={{
        "--strum-count": steps.length,
        "--strum-font-size": `${compactFontSize}px`,
        "--strum-hit-font-size": `${compactHitFontSize}px`,
        "--strum-step-size": `${compactStepSize}px`,
      }}
    >
      {steps.map((step, index) => (
        onStepClick ? (
          <button
            aria-label={`${index + 1}번째 주법 ${step.hit ? "헛스트럼으로 변경" : "실제 스트럼으로 변경"}`}
            className={`strumPatternStep ${step.hit ? "hit" : "ghost"} editable`}
            key={`${step.direction}-${step.hit ? "hit" : "ghost"}-${index}`}
            onClick={() => onStepClick(index)}
            type="button"
          >
            {step.direction === "up" ? "↑" : "↓"}
          </button>
        ) : (
          <span className={`strumPatternStep ${step.hit ? "hit" : "ghost"}`} key={`${step.direction}-${step.hit ? "hit" : "ghost"}-${index}`}>
            {step.direction === "up" ? "↑" : "↓"}
          </span>
        )
      ))}
    </div>
  );
}

function ContentTitle({ subtitle, title }) {
  return (
    <div className="contentTitle">
      <strong>{title}</strong>
      {subtitle ? <small>{subtitle}</small> : null}
    </div>
  );
}

function TrainingCard({ category, index, isSelected, onClick }) {
  const stageNumber = String(category.stageLabel?.replace(/\D/g, "") || index + 1).padStart(2, "0");

  return (
    <button
      aria-label={`${category.title} 연습 시작`}
      className={`trainingCard stageMenuCard ${isSelected ? "selected" : ""}`}
      disabled={category.unavailable}
      onClick={onClick}
      type="button"
    >
      <span className="stageMenuCard__step">{stageNumber}</span>
      <span className="stageMenuCard__content">
        <strong className="stageMenuCard__title">{category.title}</strong>
        <small className="stageMenuCard__desc">{category.subtitle}</small>
        <em className="stageMenuCard__tag">{category.modeLabel}</em>
      </span>
      <span className="stageMenuCard__arrow" aria-hidden="true">❯</span>
    </button>
  );
}

const ARCHIVED_HEADER_VARIANTS = [
  { id: "v1", title: "Logo V1", description: "골드 R 포인트 워드마크" },
  { id: "v2", title: "Logo V2", description: "FF 골드 포인트 워드마크" },
  { id: "v3", title: "Logo V3", description: "이탤릭 스피드 워드마크" },
  { id: "v4", title: "Logo V4", description: "라인 아웃라인 워드마크" },
  { id: "v5", title: "Logo V5", description: "웨이브 + RIFFLAB" },
  { id: "v6", title: "Logo V6", description: "R 박스 심볼 + 워드마크" },
  { id: "v7", title: "Logo V7", description: "브러시 R 워드마크" },
  { id: "v8", title: "Logo V8", description: "넓은 자간 미니멀 워드마크" },
  { id: "v9", title: "Logo V9", description: "스우시 R 이탤릭 워드마크" },
  { id: "v10", title: "Logo V10", description: "디스트레스 워드마크" },
  { id: "v12", title: "Logo V12", description: "Vintage Amp Plate" },
  { id: "v13", title: "Logo V13", description: "Military Stencil" },
  { id: "v14", title: "Logo V14", description: "Luxury Watch Style" },
  { id: "v15", title: "Logo V15", description: "Data Center Industrial" },
  { id: "v16", title: "Logo V16", description: "Laser Engraving" },
  { id: "v17", title: "Logo V17", description: "Minimal Single Line" },
  { id: "v18", title: "Logo V18", description: "Chrome Metal" },
  { id: "v19", title: "Logo V19", description: "Riff Wave Hybrid" },
  { id: "v20", title: "Logo V20", description: "Premium Signature" },
  { id: "v21", title: "Logo V21", description: "Art Deco Stage Spotlight" },
  { id: "v22", title: "Logo V22", description: "Stencil Stage Spotlight" },
  { id: "v23", title: "Logo V23", description: "Laser Stage Spotlight" },
  { id: "v24", title: "Logo V24", description: "Concert Spotlight" },
  { id: "v25", title: "Logo V25", description: "Theater Stage" },
  { id: "v26", title: "Logo V26", description: "Luxury Watch Brand" },
  { id: "v27", title: "Logo V27", description: "Premium Guitar Brand" },
  { id: "v28", title: "Logo V28", description: "Vintage Amp Plate II" },
  { id: "v29", title: "Logo V29", description: "Recording Studio" },
  { id: "v30", title: "Logo V30", description: "Data Center Industrial II" },
  { id: "v31", title: "Logo V31", description: "Aerospace Industrial" },
  { id: "v32", title: "Logo V32", description: "Art Deco Premium II" },
  { id: "v33", title: "Logo V33", description: "Military Stencil Premium II" },
  { id: "v34", title: "Logo V34", description: "Laser Engraving Premium II" },
  { id: "v35", title: "Logo V35", description: "Minimal Luxury" },
  { id: "v36", title: "Logo V36", description: "Museum Signature" },
  { id: "v37", title: "Logo V37", description: "Retro Music Hardware" },
  { id: "v38", title: "Logo V38", description: "Analog Equipment" },
  { id: "v39", title: "Logo V39", description: "Modern Tech Brand" },
  { id: "v40", title: "Logo V40", description: "Boutique Guitar Shop" },
  { id: "v41", title: "Logo V41", description: "Heritage Instrument" },
  { id: "v42", title: "Logo V42", description: "Gold Foil Embossing" },
  { id: "v43", title: "Logo V43", description: "Black Metal Plate" },
  { id: "v44", title: "Logo V44", description: "Carbon Fiber Luxury" },
  { id: "v45", title: "Logo V45", description: "Sound Wave Identity" },
  { id: "v46", title: "Logo V46", description: "FF Identity Focus" },
  { id: "v47", title: "Logo V47", description: "RIFF Identity Focus" },
  { id: "v48", title: "Logo V48", description: "LAB Identity Focus" },
  { id: "v49", title: "Logo V49", description: "Stage Performer Theme" },
  { id: "v50", title: "Logo V50", description: "Mastery Theme" },
  ...["11", "13", "16", "21"].flatMap((parent) =>
    Array.from({ length: 20 }, (_, index) => {
      const number = String(index + 1).padStart(2, "0");
      return {
        id: `v${parent}-${number}`,
        title: `Logo V${parent}-${number}`,
        description: `Legacy V${parent} derivative ${number}`,
      };
    }),
  ),
];
const V11_REFINED_VARIANTS = Array.from({ length: 100 }, (_, index) => {
  const number = String(index + 1).padStart(3, "0");
  const directions = [
    "Proportion Study",
    "Whitespace Study",
    "Type Density",
    "Luxury Plate",
    "Black Metal",
    "Gold Foil",
    "Laser Touch",
    "Premium Hardware",
    "Heritage Instrument",
    "Concert Plate",
  ];

  return {
    id: `v11-${number}`,
    title: `Logo V11-${number}`,
    description: directions[index % directions.length],
  };
});
const HEADER_VARIANTS = [
  { id: "v11", title: "Logo V11", description: "Art Deco Logo Parent" },
  ...V11_REFINED_VARIANTS,
];
const HEADER_RESTORE_VARIANT = { id: "v11", title: "Logo V11", description: "Art Deco Logo Parent" };
const DESIGN_LAB_HEADER_STORAGE_KEY = "rifflab-design-lab-header";
const HEADER_VARIANT_IDS = new Set([HEADER_RESTORE_VARIANT.id, ...HEADER_VARIANTS.map((variant) => variant.id)]);
const LEGACY_HEADER_VARIANT_MAP = {
  "plate-v1": "v4",
  "plate-v2": "v7",
  "plate-v3": "v8",
  "plate-v4": "v10",
};
const APP_ICON_BRAND_SYMBOL_VARIANTS = Array.from({ length: 40 }, (_, index) => {
  const version = index + 61;
  const directions = [
    "R Core Symbol",
    "RIFF Abstract",
    "Repeat Loop",
    "Riff Pattern",
    "Pick Abstract",
    "Muscle Memory",
    "Mastery Mark",
    "Repeat Refine Master",
    "FF Pattern",
    "String Symbol",
  ];

  return {
    id: `icon-v${version}`,
    title: `App Icon V${version}`,
    description: directions[index % directions.length],
  };
});
const APP_ICON_PREMIUM_SYMBOL_VARIANTS = Array.from({ length: 40 }, (_, index) => {
  const version = index + 101;
  const directions = [
    "Premium Black",
    "Premium White",
    "Black & Gold",
    "White & Navy",
    "Monochrome Luxury",
    "High Contrast",
    "Gold Material Study",
    "Deep Light Study",
    "Luxury Ratio",
    "Brand Value Study",
  ];

  return {
    id: `icon-v${version}`,
    title: `App Icon V${version}`,
    description: directions[index % directions.length],
  };
});

const APP_ICON_VARIANTS = [
  { id: "icon-v1", title: "App Icon V1", description: "RIFFLAB 전체 워드마크" },
  { id: "icon-v2", title: "App Icon V2", description: "RIFF 반복 포인트" },
  ...APP_ICON_BRAND_SYMBOL_VARIANTS,
  ...APP_ICON_PREMIUM_SYMBOL_VARIANTS,
];
const ARCHIVED_APP_ICON_VARIANTS = [
  { id: "icon-v3", title: "App Icon V3", description: "R + RIFFLAB 서명" },
  { id: "icon-v4", title: "App Icon V4", description: "줄무늬 R 시각화" },
  { id: "icon-v5", title: "App Icon V5", description: "프레임 R 집중형" },
  { id: "icon-v6", title: "App Icon V6", description: "원형 R 배지" },
  { id: "icon-v7", title: "App Icon V7", description: "큰 R + 링" },
  { id: "icon-v8", title: "App Icon V8", description: "기울어진 R 심볼" },
  { id: "icon-v9", title: "App Icon V9", description: "R 조각 심볼" },
  { id: "icon-v10", title: "App Icon V10", description: "R + RIFFLAB 하단" },
  { id: "icon-v11", title: "App Icon V11", description: "Hexagon R" },
  { id: "icon-v12", title: "App Icon V12", description: "Pick Shape R" },
  { id: "icon-v13", title: "App Icon V13", description: "Minimal R" },
  { id: "icon-v14", title: "App Icon V14", description: "Monogram R" },
  { id: "icon-v15", title: "App Icon V15", description: "Dual String R" },
  { id: "icon-v16", title: "App Icon V16", description: "R + Soundwave" },
  { id: "icon-v17", title: "App Icon V17", description: "R + Fret Marker" },
  { id: "icon-v18", title: "App Icon V18", description: "R Shield" },
  { id: "icon-v19", title: "App Icon V19", description: "Premium Gold R" },
  { id: "icon-v20", title: "App Icon V20", description: "Riff Symbol Ultimate" },
  { id: "icon-v21", title: "App Icon V21", description: "Premium RIFFLAB Wordmark" },
  { id: "icon-v22", title: "App Icon V22", description: "Editorial RIFF Monogram" },
  { id: "icon-v23", title: "App Icon V23", description: "Golden RIFF Frequency" },
  { id: "icon-v24", title: "App Icon V24", description: "Minimal FF String Mark" },
  { id: "icon-v25", title: "App Icon V25", description: "RIFF Block Identity" },
  { id: "icon-v26", title: "App Icon V26", description: "Abstract Pick Laboratory" },
  { id: "icon-v27", title: "App Icon V27", description: "Stage Plate Wordmark" },
  { id: "icon-v28", title: "App Icon V28", description: "Fret Grid Signature" },
  { id: "icon-v29", title: "App Icon V29", description: "Riff Pulse Symbol" },
  { id: "icon-v30", title: "App Icon V30", description: "LAB Seal Minimal" },
  { id: "icon-v31", title: "App Icon V31", description: "Split RIFF / LAB" },
  { id: "icon-v32", title: "App Icon V32", description: "Modern Pick Cutout" },
  { id: "icon-v33", title: "App Icon V33", description: "FF Stage Pillar" },
  { id: "icon-v34", title: "App Icon V34", description: "Rifflab Crest Abstract" },
  { id: "icon-v35", title: "App Icon V35", description: "One Stroke Riff Mark" },
  { id: "icon-v36", title: "App Icon V36", description: "Sound Lab Dot Matrix" },
  { id: "icon-v37", title: "App Icon V37", description: "Luxury Initial Plate" },
  { id: "icon-v38", title: "App Icon V38", description: "RIFF Minimal Stack" },
  { id: "icon-v39", title: "App Icon V39", description: "Concert Spotlight Mark" },
  { id: "icon-v40", title: "App Icon V40", description: "RIFFLAB Identity Finalist" },
  { id: "icon-v41", title: "App Icon V41", description: "Ultra Simple R Cut" },
  { id: "icon-v42", title: "App Icon V42", description: "Repetition Loop Mark" },
  { id: "icon-v43", title: "App Icon V43", description: "FF Twin Stroke" },
  { id: "icon-v44", title: "App Icon V44", description: "Pick Negative Space" },
  { id: "icon-v45", title: "App Icon V45", description: "Riff String Bend" },
  { id: "icon-v46", title: "App Icon V46", description: "Black White RIFF" },
  { id: "icon-v47", title: "App Icon V47", description: "Blue Pulse Symbol" },
  { id: "icon-v48", title: "App Icon V48", description: "Monoline Riff Loop" },
  { id: "icon-v49", title: "App Icon V49", description: "Four String Identity" },
  { id: "icon-v50", title: "App Icon V50", description: "Minimal Lab Spark" },
  { id: "icon-v51", title: "App Icon V51", description: "R Slash Symbol" },
  { id: "icon-v52", title: "App Icon V52", description: "FF Repeat Tiles" },
  { id: "icon-v53", title: "App Icon V53", description: "Pick Loop Glyph" },
  { id: "icon-v54", title: "App Icon V54", description: "Riff Wave Dot" },
  { id: "icon-v55", title: "App Icon V55", description: "Notion Style R Block" },
  { id: "icon-v56", title: "App Icon V56", description: "Netflix Style R Bar" },
  { id: "icon-v57", title: "App Icon V57", description: "Chat Symbol Riff Knot" },
  { id: "icon-v58", title: "App Icon V58", description: "Gemini Style Riff Star" },
  { id: "icon-v59", title: "App Icon V59", description: "Instagram Ring Pick" },
  { id: "icon-v60", title: "App Icon V60", description: "RIFFLAB Core Symbol" },
];
const DESIGN_LAB_APP_ICON_STORAGE_KEY = "rifflab-design-lab-app-icon";
const APP_ICON_VARIANT_IDS = new Set(APP_ICON_VARIANTS.map((variant) => variant.id));
const DESIGN_LAB_SECTIONS = [
  { id: "logo", label: "로고" },
  { id: "app-icon", label: "앱아이콘" },
  { id: "character", label: "캐릭터" },
  { id: "component", label: "컴포넌트" },
  { id: "archive", label: "Archive" },
];
const CHARACTER_LAB_VARIANTS = [
  { id: "character-1", title: "캐릭터 V1", description: "기타 헤드 발사체" },
  { id: "character-2", title: "캐릭터 V2", description: "로켓 픽 사수" },
  { id: "character-3", title: "캐릭터 V3", description: "앰프 드론 타겟팅" },
  { id: "character-4", title: "캐릭터 V4", description: "스피드 스트라이커" },
  { id: "character-5", title: "캐릭터 V5", description: "기타 실드 캐논" },
  { id: "character-6", title: "캐릭터 V6", description: "넥 미사일 러너" },
  { id: "character-7", title: "캐릭터 V7", description: "Bear Guitar Cadet" },
  { id: "character-8", title: "캐릭터 V8", description: "Guitar Jet Player" },
  { id: "character-9", title: "캐릭터 V9", description: "Riff Kid Shooter" },
  { id: "character-10", title: "캐릭터 V10", description: "Amp Rider" },
  { id: "character-11", title: "캐릭터 V11", description: "Cowboy Guitar Hunter" },
  { id: "character-12", title: "캐릭터 V12", description: "Cyber Guitar Soldier" },
  { id: "character-13", title: "캐릭터 V13", description: "Rock Panda Shooter" },
  { id: "character-14", title: "캐릭터 V14", description: "Wolf Guitar Ranger" },
  { id: "character-15", title: "캐릭터 V15", description: "Cat Guitar Assassin" },
  { id: "character-16", title: "캐릭터 V16", description: "Fox Guitar Gunslinger" },
  { id: "character-17", title: "캐릭터 V17", description: "Robot Guitar Pilot" },
  { id: "character-18", title: "캐릭터 V18", description: "Dragon Guitar Rider" },
  { id: "character-19", title: "캐릭터 V19", description: "Living Guitar Weapon" },
  { id: "character-20", title: "캐릭터 V20", description: "RIFFLAB Hero Character" },
];
const CARD_LAB_VARIANTS = [
  { id: "card-1", title: "Legacy Card V1", description: "과거 훈련장 카드 시안" },
  { id: "card-2", title: "Legacy Card V2", description: "번호 배지 강조형" },
  { id: "card-3", title: "Legacy Card V3", description: "라인형 미니멀" },
];
const COMPONENT_LAB_DROPDOWN_OPTIONS = [
  { id: "4/4", label: "4/4" },
  { id: "3/4", label: "3/4" },
  { id: "6/8", label: "6/8" },
  { id: "12/8", label: "12/8" },
  { id: "5/4", label: "5/4" },
  { id: "7/4", label: "7/4" },
  { id: "9/8", label: "9/8" },
  { id: "13/8", label: "13/8" },
];
const COMPONENT_LAB_SUBDIVISION_OPTIONS = [
  { id: "quarter", label: "4분" },
  { id: "eighth", label: "8분" },
  { id: "sixteenth", label: "16분" },
  { id: "thirty-second", label: "32분" },
  { id: "eighth-triplet", label: "8분 셋잇단" },
  { id: "sixteenth-triplet", label: "16분 셋잇단" },
  { id: "dotted-eighth", label: "점8분" },
  { id: "shuffle", label: "셔플" },
];

function ComponentLabDropdownPreview({ description, flow, items, title }) {
  const rowCount = Math.ceil(items.length / 2);

  return (
    <div className={`componentLabDropdownPreview componentLabDropdownPreview--${flow}`}>
      <div className="componentLabDropdownTrigger">
        <span>{title}</span>
        <strong>{items[0]?.label}</strong>
        <em aria-hidden="true">⌄</em>
      </div>
      <div
        className="componentLabDropdownMenu"
        style={flow === "vertical" ? { gridTemplateRows: `repeat(${rowCount}, minmax(30px, auto))` } : undefined}
      >
        {items.map((item, index) => (
          <button className={index === 0 ? "selected" : ""} key={item.id} type="button">
            {item.label}
          </button>
        ))}
      </div>
      <small>{description}</small>
    </div>
  );
}

function normalizeDesignLabHeaderState(value = {}) {
  const storedActiveHeader = LEGACY_HEADER_VARIANT_MAP[value.activeHeader] ?? value.activeHeader;
  const activeHeader = HEADER_VARIANT_IDS.has(storedActiveHeader) ? storedActiveHeader : HEADER_RESTORE_VARIANT.id;
  const heldHeaders = Array.isArray(value.heldHeaders)
    ? value.heldHeaders
      .map((id) => LEGACY_HEADER_VARIANT_MAP[id] ?? id)
      .filter((id, index, list) => HEADER_VARIANT_IDS.has(id) && id !== activeHeader && list.indexOf(id) === index)
    : [];
  const deletedHeaders = Array.isArray(value.deletedHeaders)
    ? value.deletedHeaders
      .map((id) => LEGACY_HEADER_VARIANT_MAP[id] ?? id)
      .filter((id, index, list) => HEADER_VARIANT_IDS.has(id) && id !== activeHeader && list.indexOf(id) === index)
    : [];

  return {
    activeHeader,
    heldHeaders,
    deletedHeaders,
  };
}

function getStoredDesignLabHeaderState() {
  if (typeof window === "undefined") return normalizeDesignLabHeaderState();

  try {
    return normalizeDesignLabHeaderState(JSON.parse(window.localStorage.getItem(DESIGN_LAB_HEADER_STORAGE_KEY) ?? "{}"));
  } catch {
    return normalizeDesignLabHeaderState();
  }
}

function normalizeDesignLabAppIconState(value = {}) {
  const activeIcon = APP_ICON_VARIANT_IDS.has(value.activeIcon) ? value.activeIcon : APP_ICON_VARIANTS[0].id;
  const heldIcons = Array.isArray(value.heldIcons)
    ? value.heldIcons.filter((id, index, list) => APP_ICON_VARIANT_IDS.has(id) && id !== activeIcon && list.indexOf(id) === index)
    : [];
  const deletedIcons = Array.isArray(value.deletedIcons)
    ? value.deletedIcons.filter((id, index, list) => APP_ICON_VARIANT_IDS.has(id) && id !== activeIcon && list.indexOf(id) === index)
    : [];

  return {
    activeIcon,
    heldIcons,
    deletedIcons,
  };
}

function getStoredDesignLabAppIconState() {
  if (typeof window === "undefined") return normalizeDesignLabAppIconState();

  try {
    return normalizeDesignLabAppIconState(JSON.parse(window.localStorage.getItem(DESIGN_LAB_APP_ICON_STORAGE_KEY) ?? "{}"));
  } catch {
    return normalizeDesignLabAppIconState();
  }
}

function getHeaderVariantLabel(variantId) {
  return [HEADER_RESTORE_VARIANT, ...HEADER_VARIANTS].find((variant) => variant.id === variantId)?.title ?? HEADER_RESTORE_VARIANT.title;
}

function getAppIconVariantLabel(variantId) {
  return [...APP_ICON_VARIANTS, ...ARCHIVED_APP_ICON_VARIANTS].find((variant) => variant.id === variantId)?.title ?? APP_ICON_VARIANTS[0].title;
}

function getHeaderLabStatus(variantId, state) {
  if (variantId === state.activeHeader) return "운영중";
  if (state.heldHeaders.includes(variantId)) return "잠금";
  return "실험중";
}

function getAppIconLabStatus(variantId, state) {
  if (variantId === state.activeIcon) return "운영중";
  if (state.heldIcons.includes(variantId)) return "잠금";
  return "실험중";
}

function getHeaderLabStatusClass(status) {
  if (status === "운영중") return "active";
  if (status === "잠금") return "held";
  return "draft";
}

function AppIconSvgPreview({ variantId }) {
  const uniqueId = variantId.replace(/[^a-z0-9-]/gi, "");
  const variantNumber = Number(variantId.replace("icon-v", ""));
  const isHex = variantId === "icon-v11";
  const isPick = variantId === "icon-v12";
  const isMinimal = variantId === "icon-v13";
  const isMono = variantId === "icon-v14";
  const isDualString = variantId === "icon-v15";
  const isWave = variantId === "icon-v16";
  const isFret = variantId === "icon-v17";
  const isShield = variantId === "icon-v18";
  const isPremium = variantId === "icon-v19";
  const isUltimate = variantId === "icon-v20";

  if (variantNumber >= 101) {
    const family = variantNumber - 101;
    const mode = family % 10;
    const palette = Math.floor(family / 10);
    const palettes = [
      { bg0: "#010203", bg1: "#131517", fg0: "#ffffff", fg1: "#bfc5c8", accent0: "#d8a64e", accent1: "#fff0b8" },
      { bg0: "#f9f6ef", bg1: "#d8d2c7", fg0: "#08090a", fg1: "#30343a", accent0: "#0c1f3b", accent1: "#6d7f95" },
      { bg0: "#030303", bg1: "#15110a", fg0: "#f9e6b0", fg1: "#b78334", accent0: "#ffffff", accent1: "#6c4a1f" },
      { bg0: "#071326", bg1: "#f8f4ea", fg0: "#ffffff", fg1: "#0b1830", accent0: "#83b8ff", accent1: "#d6a64d" },
    ];
    const p = palettes[palette] ?? palettes[0];
    const symbolId = `${uniqueId}-symbol`;
    const bgId = `${uniqueId}-premium-bg`;
    const glowId = `${uniqueId}-premium-glow`;

    const Symbol = () => {
      if (mode === 0) {
        return (
          <g>
            <path d="M37 93 V24 H67 C84 24 94 34 94 49 C94 61 86 69 75 72 L96 93 H72 L55 75 H54 V93 Z M54 56 H66 C73 56 77 52 77 47 C77 42 73 39 66 39 H54 Z" fill={`url(#${symbolId})`} />
            <path d="M34 93 L86 24" stroke={p.accent0} strokeWidth="7" strokeLinecap="round" opacity="0.92" />
          </g>
        );
      }
      if (mode === 1) {
        return (
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M35 39 C45 24 71 25 82 40 C94 57 82 82 60 84 C46 85 36 78 31 68" stroke={`url(#${symbolId})`} strokeWidth="11" />
            <path d="M79 73 L82 92 L65 84" stroke={p.accent0} strokeWidth="9" />
          </g>
        );
      }
      if (mode === 2) {
        return (
          <g>
            <rect x="24" y="25" width="24" height="70" rx="8" fill={`url(#${symbolId})`} />
            <rect x="54" y="25" width="24" height="70" rx="8" fill={p.accent0} />
            <rect x="84" y="25" width="12" height="70" rx="6" fill={`url(#${symbolId})`} opacity="0.82" />
          </g>
        );
      }
      if (mode === 3) return <path d="M20 64 C31 31 43 91 55 58 C67 25 81 89 100 41" fill="none" stroke={`url(#${symbolId})`} strokeWidth="12" strokeLinecap="round" />;
      if (mode === 4) return <path d="M60 17 C88 20 101 41 94 66 C88 88 72 104 60 109 C48 104 32 88 26 66 C19 41 32 20 60 17 Z M45 75 L80 34 H63 L36 75 Z" fill={`url(#${symbolId})`} fillRule="evenodd" />;
      if (mode === 5) {
        return (
          <g>
            <circle cx="60" cy="60" r="38" fill="none" stroke={`url(#${symbolId})`} strokeWidth="10" />
            <path d="M44 66 C50 48 70 48 76 66" fill="none" stroke={p.accent0} strokeWidth="9" strokeLinecap="round" />
            <circle cx="60" cy="60" r="6" fill={`url(#${symbolId})`} />
          </g>
        );
      }
      if (mode === 6) {
        return (
          <>
            <path d="M60 17 L72 49 L105 60 L72 71 L60 103 L48 71 L15 60 L48 49 Z" fill={`url(#${symbolId})`} />
            <path d="M60 41 L66 56 L82 60 L66 66 L60 81 L54 66 L38 60 L54 56 Z" fill={p.accent0} opacity="0.92" />
          </>
        );
      }
      if (mode === 7) {
        return (
          <g fill="none" strokeLinecap="round">
            <path d="M27 78 C38 36 72 25 90 47" stroke={`url(#${symbolId})`} strokeWidth="10" />
            <path d="M31 94 C43 52 77 41 98 62" stroke={p.accent0} strokeWidth="9" />
            <path d="M32 55 H91" stroke={`url(#${symbolId})`} strokeWidth="7" opacity="0.58" />
          </g>
        );
      }
      if (mode === 8) {
        return (
          <g>
            <rect x="23" y="24" width="30" height="30" rx="9" fill={`url(#${symbolId})`} />
            <rect x="67" y="24" width="30" height="30" rx="9" fill={p.accent0} />
            <rect x="23" y="68" width="30" height="30" rx="9" fill={p.accent0} />
            <rect x="67" y="68" width="30" height="30" rx="9" fill={`url(#${symbolId})`} />
          </g>
        );
      }
      return (
        <g>
          <path d="M29 72 C40 28 75 24 91 43 C106 62 82 78 58 64 L83 96 H64 L44 75 C37 83 31 82 29 72 Z" fill={`url(#${symbolId})`} />
          <circle cx="85" cy="35" r="7" fill={p.accent0} />
        </g>
      );
    };

    return (
      <svg className="appIconSvgPreview appIconSvgPreview--premiumSymbol" viewBox="0 0 120 120" role="img" aria-label={`${getAppIconVariantLabel(variantId)} SVG`}>
        <defs>
          <linearGradient id={bgId} x1="14" x2="106" y1="9" y2="112" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={p.bg1} />
            <stop offset="0.48" stopColor={p.bg0} />
            <stop offset="1" stopColor={p.bg1} />
          </linearGradient>
          <linearGradient id={symbolId} x1="29" x2="92" y1="20" y2="98" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={p.fg0} />
            <stop offset="0.5" stopColor={p.fg1} />
            <stop offset="1" stopColor={p.fg0} />
          </linearGradient>
          <radialGradient id={glowId} cx="42%" cy="22%" r="72%">
            <stop offset="0" stopColor={p.accent1} stopOpacity="0.42" />
            <stop offset="0.42" stopColor={p.accent0} stopOpacity="0.08" />
            <stop offset="1" stopColor={p.bg0} stopOpacity="0" />
          </radialGradient>
          <filter id={`${uniqueId}-premium-shadow`}>
            <feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#000000" floodOpacity="0.38" />
          </filter>
        </defs>
        <rect width="120" height="120" rx="26" fill={`url(#${bgId})`} />
        <rect x="1" y="1" width="118" height="118" rx="25" fill={`url(#${glowId})`} />
        <rect x="8" y="8" width="104" height="104" rx="22" fill="none" stroke={p.fg0} strokeOpacity="0.07" />
        <g filter={`url(#${uniqueId}-premium-shadow)`}>
          <Symbol />
        </g>
      </svg>
    );
  }

  if (variantNumber >= 61) {
    const family = variantNumber - 61;
    const mode = family % 10;
    const palette = Math.floor(family / 10);
    const palettes = [
      { bg: "#050607", fg: "#ffffff", accent: "#d8a64e" },
      { bg: "#ffffff", fg: "#050607", accent: "#050607" },
      { bg: "#07172d", fg: "#ffffff", accent: "#7db7ff" },
      { bg: "#050607", fg: "#f2c66d", accent: "#ffffff" },
    ];
    const { bg, fg, accent } = palettes[palette] ?? palettes[0];
    const rotate = [-10, 0, 9, -5][palette] ?? 0;

    return (
      <svg className="appIconSvgPreview appIconSvgPreview--brandSymbol" viewBox="0 0 120 120" role="img" aria-label={`${getAppIconVariantLabel(variantId)} SVG`}>
        <rect width="120" height="120" rx={palette === 1 ? 18 : 26} fill={bg} />
        {mode === 0 ? (
          <g transform={`rotate(${rotate} 60 60)`}>
            <path d="M37 93 V24 H67 C84 24 94 34 94 49 C94 61 86 69 75 72 L96 93 H72 L55 75 H54 V93 Z M54 56 H66 C73 56 77 52 77 47 C77 42 73 39 66 39 H54 Z" fill={fg} />
            <path d="M33 93 L87 24" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          </g>
        ) : null}
        {mode === 1 ? (
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M35 39 C45 24 71 25 82 40 C94 57 82 82 60 84 C46 85 36 78 31 68" stroke={fg} strokeWidth="11" />
            <path d="M79 73 L82 92 L65 84" stroke={accent} strokeWidth="10" />
          </g>
        ) : null}
        {mode === 2 ? (
          <g transform={`rotate(${rotate} 60 60)`}>
            <rect x="24" y="25" width="24" height="70" rx="8" fill={fg} />
            <rect x="54" y="25" width="24" height="70" rx="8" fill={accent} />
            <rect x="84" y="25" width="12" height="70" rx="6" fill={fg} opacity="0.84" />
          </g>
        ) : null}
        {mode === 3 ? (
          <path d="M20 64 C31 31 43 91 55 58 C67 25 81 89 100 41" fill="none" stroke={fg} strokeWidth="12" strokeLinecap="round" />
        ) : null}
        {mode === 4 ? (
          <path d="M60 17 C88 20 101 41 94 66 C88 88 72 104 60 109 C48 104 32 88 26 66 C19 41 32 20 60 17 Z M45 75 L80 34 H63 L36 75 Z" fill={fg} fillRule="evenodd" />
        ) : null}
        {mode === 5 ? (
          <g transform={`rotate(${rotate} 60 60)`}>
            <circle cx="60" cy="60" r="38" fill="none" stroke={fg} strokeWidth="10" />
            <path d="M44 66 C50 48 70 48 76 66" fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round" />
            <circle cx="60" cy="60" r="7" fill={fg} />
          </g>
        ) : null}
        {mode === 6 ? (
          <>
            <path d="M60 17 L72 49 L105 60 L72 71 L60 103 L48 71 L15 60 L48 49 Z" fill={fg} />
            <path d="M60 40 L66 56 L82 60 L66 66 L60 82 L54 66 L38 60 L54 56 Z" fill={accent} />
          </>
        ) : null}
        {mode === 7 ? (
          <g fill="none" strokeLinecap="round">
            <path d="M27 78 C38 36 72 25 90 47" stroke={fg} strokeWidth="10" />
            <path d="M31 94 C43 52 77 41 98 62" stroke={accent} strokeWidth="10" />
            <path d="M32 55 H91" stroke={fg} strokeWidth="8" opacity="0.72" />
          </g>
        ) : null}
        {mode === 8 ? (
          <g transform={`rotate(${rotate} 60 60)`}>
            <rect x="23" y="24" width="30" height="30" rx="9" fill={fg} />
            <rect x="67" y="24" width="30" height="30" rx="9" fill={accent} />
            <rect x="23" y="68" width="30" height="30" rx="9" fill={accent} />
            <rect x="67" y="68" width="30" height="30" rx="9" fill={fg} />
          </g>
        ) : null}
        {mode === 9 ? (
          <g transform={`rotate(${rotate} 60 60)`}>
            <path d="M29 72 C40 28 75 24 91 43 C106 62 82 78 58 64 L83 96 H64 L44 75 C37 83 31 82 29 72 Z" fill={fg} />
            <circle cx="85" cy="35" r="7" fill={accent} />
          </g>
        ) : null}
      </svg>
    );
  }

  if (variantNumber >= 41) {
    const light = [44, 46, 55, 59].includes(variantNumber);
    const blue = [47, 57, 58].includes(variantNumber);
    const bg = light ? "#f7f3ea" : blue ? "#0b1224" : "#050607";
    const fg = light ? "#050607" : "#ffffff";
    const accent = blue ? "#7bb7ff" : light ? "#050607" : "#d9a94f";

    return (
      <svg className="appIconSvgPreview appIconSvgPreview--symbol" viewBox="0 0 120 120" role="img" aria-label={`${getAppIconVariantLabel(variantId)} SVG`}>
        <rect width="120" height="120" rx="26" fill={bg} />
        {variantNumber === 41 ? (
          <path d="M38 91 V25 H67 C84 25 94 35 94 50 C94 62 87 70 76 73 L95 91 H73 L55 74 H54 V91 Z M54 56 H66 C73 56 77 52 77 47 C77 42 73 39 66 39 H54 Z" fill={fg} />
        ) : null}
        {variantNumber === 42 ? (
          <>
            <path d="M34 40 C43 25 68 23 82 37 C95 50 93 73 76 85" fill="none" stroke={fg} strokeWidth="11" strokeLinecap="round" />
            <path d="M86 74 L78 91 L67 75 Z" fill={fg} />
            <path d="M86 60 C77 75 52 77 38 63 C25 50 27 27 44 15" fill="none" stroke={accent} strokeWidth="11" strokeLinecap="round" opacity="0.92" />
          </>
        ) : null}
        {variantNumber === 43 ? (
          <>
            <path d="M33 26 H74 V43 H53 V55 H71 V72 H53 V94 H33 Z" fill={fg} />
            <path d="M63 26 H101 V43 H83 V57 H97 V74 H83 V94 H63 Z" fill={accent} />
          </>
        ) : null}
        {variantNumber === 44 ? (
          <path d="M60 18 C87 20 101 40 94 66 C88 88 72 104 60 109 C48 104 32 88 26 66 C19 40 33 20 60 18 Z M47 75 L78 37 H64 L38 75 Z" fill={fg} fillRule="evenodd" />
        ) : null}
        {variantNumber === 45 ? (
          <path d="M21 74 C32 31 56 28 65 49 C72 66 54 76 44 61 L79 31 H98 L58 70 L92 95 H70 L49 78 C36 90 25 86 21 74 Z" fill={fg} />
        ) : null}
        {variantNumber === 46 ? (
          <>
            <rect x="17" y="26" width="86" height="62" rx="18" fill={fg} />
            <text x="60" y="68" textAnchor="middle" fill={bg} fontFamily="Arial Black, Arial, sans-serif" fontSize="23" fontWeight="900" letterSpacing="3">RIFF</text>
          </>
        ) : null}
        {variantNumber === 47 ? (
          <>
            <circle cx="60" cy="60" r="38" fill="none" stroke={fg} strokeWidth="10" />
            <path d="M38 70 C51 37 71 37 84 70" fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round" />
          </>
        ) : null}
        {variantNumber === 48 ? (
          <path d="M31 76 C42 32 76 24 90 43 C103 61 80 76 57 64 L82 91 H62 L43 71 H42 V91 H31 Z" fill="none" stroke={fg} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {variantNumber === 49 ? (
          <>
            {[35, 48, 61, 74].map((x, index) => <line key={x} x1={x} x2={x} y1="20" y2="100" stroke={index === 1 || index === 2 ? accent : fg} strokeWidth="7" strokeLinecap="round" />)}
            <circle cx="86" cy="60" r="11" fill={fg} />
          </>
        ) : null}
        {variantNumber === 50 ? (
          <>
            <path d="M36 84 L60 22 L84 84 Z" fill="none" stroke={fg} strokeWidth="9" strokeLinejoin="round" />
            <circle cx="60" cy="64" r="9" fill={accent} />
          </>
        ) : null}
        {variantNumber === 51 ? (
          <>
            <path d="M38 91 V25 H68 C84 25 94 35 94 50 C94 62 86 70 75 73 L94 91 H72 L55 74 H54 V91 Z" fill={fg} />
            <path d="M29 93 L90 20" stroke={accent} strokeWidth="9" strokeLinecap="round" />
          </>
        ) : null}
        {variantNumber === 52 ? (
          <>
            <rect x="23" y="24" width="30" height="30" rx="8" fill={fg} />
            <rect x="67" y="24" width="30" height="30" rx="8" fill={accent} />
            <rect x="23" y="68" width="30" height="30" rx="8" fill={accent} />
            <rect x="67" y="68" width="30" height="30" rx="8" fill={fg} />
          </>
        ) : null}
        {variantNumber === 53 ? (
          <>
            <path d="M60 17 C88 20 101 41 94 66 C88 88 72 104 60 109 C48 104 32 88 26 66 C19 41 32 20 60 17 Z" fill="none" stroke={fg} strokeWidth="10" />
            <path d="M43 69 C51 50 65 45 80 52" fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round" />
          </>
        ) : null}
        {variantNumber === 54 ? (
          <>
            <path d="M22 64 C33 34 46 89 58 59 C70 29 83 85 98 42" fill="none" stroke={fg} strokeWidth="10" strokeLinecap="round" />
            <circle cx="60" cy="60" r="8" fill={accent} />
          </>
        ) : null}
        {variantNumber === 55 ? (
          <>
            <rect x="25" y="22" width="70" height="76" rx="8" fill="none" stroke={fg} strokeWidth="7" />
            <path d="M44 84 V36 H62 C76 36 84 44 84 55 C84 64 78 70 69 72 L84 84 H68 L55 73 H54 V84 Z" fill={fg} />
          </>
        ) : null}
        {variantNumber === 56 ? (
          <>
            <path d="M36 92 V24 H53 L84 92 H67 L53 59 V92 Z" fill={fg} />
            <path d="M67 24 H84 V92 H67 Z" fill={accent} />
          </>
        ) : null}
        {variantNumber === 57 ? (
          <>
            <path d="M60 21 L91 39 V76 L60 94 L29 76 V39 Z" fill="none" stroke={fg} strokeWidth="8" />
            <path d="M39 62 C50 43 70 43 81 62 C70 81 50 81 39 62 Z" fill="none" stroke={accent} strokeWidth="8" />
          </>
        ) : null}
        {variantNumber === 58 ? (
          <>
            <path d="M60 18 L70 49 L102 60 L70 71 L60 102 L50 71 L18 60 L50 49 Z" fill={fg} />
            <circle cx="60" cy="60" r="13" fill={accent} />
          </>
        ) : null}
        {variantNumber === 59 ? (
          <>
            <circle cx="60" cy="60" r="39" fill="none" stroke={fg} strokeWidth="9" />
            <path d="M60 23 C84 27 98 44 96 66" fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round" />
            <path d="M50 76 L78 42 H65 L43 76 Z" fill={fg} />
          </>
        ) : null}
        {variantNumber === 60 ? (
          <>
            <path d="M28 72 C40 28 75 24 91 43 C106 62 82 78 57 64 L82 96 H64 L43 75 C36 83 30 82 28 72 Z" fill={fg} />
            <path d="M38 37 L86 91" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          </>
        ) : null}
      </svg>
    );
  }

  if (variantNumber >= 21) {
    const darkBg = variantNumber === 22 || variantNumber === 24 || variantNumber === 28 || variantNumber === 33 || variantNumber === 35 || variantNumber === 39;
    const warmBg = variantNumber === 26 || variantNumber === 32 || variantNumber === 38;
    const bg = warmBg ? "#f4ead8" : darkBg ? "#030607" : "#070b0d";
    const ink = warmBg ? "#080907" : "#fff3d6";
    const gold = warmBg ? "#9b6b2f" : "#e6b96b";
    const muted = warmBg ? "#2b2418" : "rgba(255, 238, 202, 0.78)";
    const showWord = [21, 23, 25, 27, 31, 38, 40].includes(variantNumber);
    const showRiff = [22, 24, 29, 33, 35, 36, 39].includes(variantNumber);

    return (
      <svg className="appIconSvgPreview appIconSvgPreview--nextGen" viewBox="0 0 120 120" role="img" aria-label={`${getAppIconVariantLabel(variantId)} SVG`}>
        <defs>
          <linearGradient id={`${uniqueId}-gold`} x1="20" x2="100" y1="14" y2="108" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={warmBg ? "#5a3b17" : "#fff0bd"} />
            <stop offset="0.52" stopColor={gold} />
            <stop offset="1" stopColor={warmBg ? "#1a1209" : "#8d5f2c"} />
          </linearGradient>
          <radialGradient id={`${uniqueId}-spot`} cx="50%" cy="28%" r="62%">
            <stop offset="0" stopColor={warmBg ? "#ffffff" : "#f1ca7a"} stopOpacity={warmBg ? "0.46" : "0.22"} />
            <stop offset="1" stopColor={bg} stopOpacity="0" />
          </radialGradient>
          <filter id={`${uniqueId}-soft`}>
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000000" floodOpacity="0.34" />
          </filter>
        </defs>
        <rect width="120" height="120" rx={variantNumber === 30 ? 18 : 25} fill={bg} />
        <rect width="120" height="120" rx={variantNumber === 30 ? 18 : 25} fill={`url(#${uniqueId}-spot)`} />
        {variantNumber === 21 ? (
          <>
            <text x="60" y="52" textAnchor="middle" fill={`url(#${uniqueId}-gold)`} fontFamily="Georgia, Times New Roman, serif" fontSize="20" fontWeight="900" letterSpacing="6">RIFF</text>
            <text x="60" y="74" textAnchor="middle" fill={ink} fontFamily="Arial Black, Arial, sans-serif" fontSize="14" fontWeight="900" letterSpacing="5">LAB</text>
          </>
        ) : null}
        {variantNumber === 22 ? (
          <>
            <path d="M31 73 C42 40 62 33 88 39" fill="none" stroke={`url(#${uniqueId}-gold)`} strokeWidth="9" strokeLinecap="round" />
            <text x="60" y="75" textAnchor="middle" fill={ink} fontFamily="Arial Black, Arial, sans-serif" fontSize="22" fontWeight="900" letterSpacing="3">RIFF</text>
          </>
        ) : null}
        {variantNumber === 23 ? (
          <>
            {[28, 38, 48, 58, 68, 78, 88].map((x, index) => (
              <rect key={x} x={x} y={58 - [8, 18, 28, 36, 28, 18, 8][index] / 2} width="5" height={[8, 18, 28, 36, 28, 18, 8][index]} rx="3" fill={gold} />
            ))}
            <text x="60" y="91" textAnchor="middle" fill={ink} fontFamily="Georgia, Times New Roman, serif" fontSize="13" fontWeight="900" letterSpacing="4">RIFFLAB</text>
          </>
        ) : null}
        {variantNumber === 24 ? (
          <>
            <line x1="22" x2="98" y1="43" y2="43" stroke={gold} strokeWidth="3" strokeLinecap="round" />
            <line x1="22" x2="98" y1="63" y2="63" stroke={gold} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
            <text x="60" y="72" textAnchor="middle" fill={ink} fontFamily="Arial Black, Arial, sans-serif" fontSize="38" fontWeight="900" letterSpacing="2">FF</text>
          </>
        ) : null}
        {variantNumber === 25 ? (
          <>
            <rect x="21" y="28" width="78" height="58" rx="14" fill="none" stroke={`url(#${uniqueId}-gold)`} strokeWidth="3" />
            <text x="60" y="58" textAnchor="middle" fill={ink} fontFamily="Arial Black, Arial, sans-serif" fontSize="17" fontWeight="900" letterSpacing="4">RIFF</text>
            <text x="60" y="78" textAnchor="middle" fill={gold} fontFamily="Arial Black, Arial, sans-serif" fontSize="12" fontWeight="900" letterSpacing="3">LAB</text>
          </>
        ) : null}
        {variantNumber === 26 ? (
          <>
            <path d="M60 16 C86 20 101 41 94 66 C88 88 72 103 60 108 C48 103 32 88 26 66 C19 41 34 20 60 16 Z" fill={`url(#${uniqueId}-gold)`} opacity="0.96" filter={`url(#${uniqueId}-soft)`} />
            <text x="60" y="67" textAnchor="middle" fill="#080907" fontFamily="Georgia, Times New Roman, serif" fontSize="28" fontWeight="900">R</text>
            <line x1="47" x2="73" y1="75" y2="75" stroke="#080907" strokeWidth="2" opacity="0.5" />
          </>
        ) : null}
        {variantNumber === 27 ? (
          <>
            <rect x="17" y="28" width="86" height="58" rx="10" fill="rgba(255,244,210,0.04)" stroke={gold} strokeWidth="2" />
            <text x="60" y="58" textAnchor="middle" fill={`url(#${uniqueId}-gold)`} fontFamily="Georgia, Times New Roman, serif" fontSize="21" fontWeight="900" letterSpacing="6">RIFF</text>
            <text x="60" y="75" textAnchor="middle" fill={muted} fontFamily="Arial Black, Arial, sans-serif" fontSize="8" fontWeight="900" letterSpacing="3">REPEAT</text>
          </>
        ) : null}
        {variantNumber === 28 ? (
          <>
            {[30, 44, 58, 72, 86].map((x) => <line key={x} x1={x} x2={x} y1="22" y2="98" stroke={gold} strokeWidth="1.8" opacity="0.55" />)}
            {[39, 60, 81].map((y) => <line key={y} x1="23" x2="97" y1={y} y2={y} stroke={gold} strokeWidth="1.4" opacity="0.35" />)}
            <circle cx="72" cy="60" r="7" fill={gold} />
            <text x="60" y="33" textAnchor="middle" fill={ink} fontFamily="Arial Black, Arial, sans-serif" fontSize="13" fontWeight="900" letterSpacing="3">RIFF</text>
          </>
        ) : null}
        {variantNumber === 29 ? (
          <>
            <path d="M22 64 C34 30 48 94 60 58 C72 22 86 94 98 46" fill="none" stroke={`url(#${uniqueId}-gold)`} strokeWidth="8" strokeLinecap="round" />
            <circle cx="60" cy="60" r="7" fill={ink} />
          </>
        ) : null}
        {variantNumber === 30 ? (
          <>
            <path d="M60 21 L88 37 L88 73 L60 91 L32 73 L32 37 Z" fill="none" stroke={gold} strokeWidth="3" />
            <text x="60" y="62" textAnchor="middle" fill={ink} fontFamily="Georgia, Times New Roman, serif" fontSize="24" fontWeight="900">LAB</text>
            <text x="60" y="77" textAnchor="middle" fill={gold} fontFamily="Arial Black, Arial, sans-serif" fontSize="8" fontWeight="900" letterSpacing="2">RIFF</text>
          </>
        ) : null}
        {variantNumber === 31 ? (
          <>
            <rect x="20" y="24" width="80" height="38" rx="13" fill={gold} />
            <rect x="20" y="62" width="80" height="30" rx="12" fill="rgba(255,244,210,0.08)" stroke={gold} strokeWidth="1.5" />
            <text x="60" y="50" textAnchor="middle" fill="#080907" fontFamily="Arial Black, Arial, sans-serif" fontSize="20" fontWeight="900" letterSpacing="4">RIFF</text>
            <text x="60" y="82" textAnchor="middle" fill={ink} fontFamily="Georgia, Times New Roman, serif" fontSize="16" fontWeight="900" letterSpacing="4">LAB</text>
          </>
        ) : null}
        {variantNumber === 32 ? (
          <>
            <path d="M60 17 C87 19 101 40 94 65 C88 88 72 103 60 108 C48 103 32 88 26 65 C19 40 33 19 60 17 Z" fill="#080907" />
            <path d="M42 71 L74 35 L86 35 L54 78 Z" fill={`url(#${uniqueId}-gold)`} />
          </>
        ) : null}
        {variantNumber === 33 ? (
          <>
            <text x="43" y="75" textAnchor="middle" fill={gold} fontFamily="Arial Black, Arial, sans-serif" fontSize="50" fontWeight="900">F</text>
            <text x="67" y="75" textAnchor="middle" fill={ink} fontFamily="Arial Black, Arial, sans-serif" fontSize="50" fontWeight="900">F</text>
            <line x1="20" x2="100" y1="88" y2="88" stroke={gold} strokeWidth="2" />
          </>
        ) : null}
        {variantNumber === 34 ? (
          <>
            <path d="M60 17 L96 36 L89 82 L60 101 L31 82 L24 36 Z" fill="rgba(255,244,210,0.035)" stroke={gold} strokeWidth="3" />
            <path d="M43 72 C48 47 61 34 82 37" fill="none" stroke={gold} strokeWidth="8" strokeLinecap="round" />
            <text x="60" y="88" textAnchor="middle" fill={ink} fontFamily="Arial Black, Arial, sans-serif" fontSize="9" fontWeight="900" letterSpacing="2">RIFF</text>
          </>
        ) : null}
        {variantNumber === 35 ? (
          <>
            <path d="M26 72 C45 21 83 29 91 47 C98 63 73 66 54 63 L81 91" fill="none" stroke={`url(#${uniqueId}-gold)`} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : null}
        {variantNumber === 36 ? (
          <>
            {[24, 36, 48, 60, 72, 84, 96].map((x, index) => <circle key={x} cx={x} cy={60 + (index % 2 ? -11 : 9)} r={index === 3 ? 8 : 5} fill={index === 3 ? gold : ink} opacity={index === 3 ? 1 : 0.85} />)}
            <text x="60" y="92" textAnchor="middle" fill={muted} fontFamily="Arial Black, Arial, sans-serif" fontSize="8" fontWeight="900" letterSpacing="2">LAB</text>
          </>
        ) : null}
        {variantNumber === 37 ? (
          <>
            <rect x="28" y="24" width="64" height="68" rx="18" fill="rgba(255,244,210,0.045)" stroke={gold} strokeWidth="2" />
            <text x="60" y="72" textAnchor="middle" fill={`url(#${uniqueId}-gold)`} fontFamily="Georgia, Times New Roman, serif" fontSize="50" fontWeight="900">R</text>
            <circle cx="86" cy="30" r="4" fill={gold} />
          </>
        ) : null}
        {variantNumber === 38 ? (
          <>
            <text x="60" y="47" textAnchor="middle" fill="#080907" fontFamily="Arial Black, Arial, sans-serif" fontSize="20" fontWeight="900" letterSpacing="5">RIFF</text>
            <line x1="34" x2="86" y1="60" y2="60" stroke={gold} strokeWidth="2" />
            <text x="60" y="82" textAnchor="middle" fill={gold} fontFamily="Georgia, Times New Roman, serif" fontSize="17" fontWeight="900" letterSpacing="4">LAB</text>
          </>
        ) : null}
        {variantNumber === 39 ? (
          <>
            <path d="M22 22 L50 57" stroke={gold} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
            <path d="M98 22 L70 57" stroke={gold} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
            <ellipse cx="60" cy="62" rx="30" ry="21" fill="rgba(241,202,122,0.11)" />
            <text x="60" y="68" textAnchor="middle" fill={ink} fontFamily="Arial Black, Arial, sans-serif" fontSize="22" fontWeight="900" letterSpacing="3">RIFF</text>
          </>
        ) : null}
        {variantNumber === 40 ? (
          <>
            <path d="M25 60 C35 34 48 28 60 42 C72 28 86 34 95 60 C86 86 72 92 60 78 C48 92 35 86 25 60 Z" fill={`url(#${uniqueId}-gold)`} opacity="0.94" />
            <text x="60" y="66" textAnchor="middle" fill="#080907" fontFamily="Arial Black, Arial, sans-serif" fontSize="16" fontWeight="900" letterSpacing="3">RIFF</text>
          </>
        ) : null}
        {showWord ? <text x="60" y="103" textAnchor="middle" fill={muted} fontFamily="Arial Black, Arial, sans-serif" fontSize="7" fontWeight="900" letterSpacing="2.5">RIFFLAB</text> : null}
        {showRiff ? <text x="60" y="103" textAnchor="middle" fill={muted} fontFamily="Arial Black, Arial, sans-serif" fontSize="7" fontWeight="900" letterSpacing="2.5">RIFFLAB</text> : null}
      </svg>
    );
  }

  return (
    <svg className="appIconSvgPreview" viewBox="0 0 120 120" role="img" aria-label={`${getAppIconVariantLabel(variantId)} SVG`}>
      <defs>
        <linearGradient id={`${uniqueId}-gold`} x1="22" x2="98" y1="14" y2="106" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff1bd" />
          <stop offset="0.48" stopColor="#d59a45" />
          <stop offset="1" stopColor="#7d5528" />
        </linearGradient>
        <radialGradient id={`${uniqueId}-glow`} cx="50%" cy="35%" r="65%">
          <stop offset="0" stopColor="#f1ca7a" stopOpacity="0.36" />
          <stop offset="1" stopColor="#05090b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx={isMinimal ? 22 : 28} fill="#05090b" />
      <rect width="120" height="120" rx={isMinimal ? 22 : 28} fill={`url(#${uniqueId}-glow)`} />
      {isHex ? <polygon points="60 12 98 34 98 78 60 102 22 78 22 34" fill="none" stroke={`url(#${uniqueId}-gold)`} strokeWidth="5" /> : null}
      {isPick ? <path d="M60 13 C88 17 103 39 96 65 C90 87 72 104 60 109 C48 104 30 87 24 65 C17 39 32 17 60 13 Z" fill="none" stroke={`url(#${uniqueId}-gold)`} strokeWidth="5" /> : null}
      {isMono ? <circle cx="60" cy="60" r="43" fill="none" stroke={`url(#${uniqueId}-gold)`} strokeWidth="3" opacity="0.72" /> : null}
      {isDualString ? (
        <>
          <line x1="16" x2="104" y1="44" y2="44" stroke="#f1ca7a" strokeWidth="3" strokeLinecap="round" opacity="0.84" />
          <line x1="16" x2="104" y1="56" y2="56" stroke="#f1ca7a" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        </>
      ) : null}
      {isWave ? (
        <path d="M14 72 C24 46 34 92 44 60 C54 28 64 94 74 54 C84 20 96 72 106 44" fill="none" stroke="#f1ca7a" strokeWidth="4" strokeLinecap="round" opacity="0.72" />
      ) : null}
      {isFret ? (
        <>
          {[28, 44, 60, 76, 92].map((x) => <line key={x} x1={x} x2={x} y1="22" y2="98" stroke="#f1ca7a" strokeWidth="1.5" opacity="0.24" />)}
          <circle cx="92" cy="60" r="7" fill="#f1ca7a" opacity="0.8" />
        </>
      ) : null}
      {isShield ? <path d="M60 12 L98 28 L90 78 C83 96 70 106 60 111 C50 106 37 96 30 78 L22 28 Z" fill="none" stroke={`url(#${uniqueId}-gold)`} strokeWidth="5" /> : null}
      {isPremium ? <circle cx="60" cy="60" r="48" fill="none" stroke={`url(#${uniqueId}-gold)`} strokeWidth="5" /> : null}
      {isUltimate ? (
        <>
          <path d="M23 76 C38 54 53 92 68 54 C79 28 94 42 104 25" fill="none" stroke="#f1ca7a" strokeWidth="4" strokeLinecap="round" opacity="0.76" />
          <polygon points="60 14 94 34 94 78 60 100 26 78 26 34" fill="none" stroke={`url(#${uniqueId}-gold)`} strokeWidth="3" opacity="0.8" />
        </>
      ) : null}
      <text
        x="60"
        y={isMinimal ? "76" : "78"}
        textAnchor="middle"
        fill={`url(#${uniqueId}-gold)`}
        fontFamily="Arial Black, Arial, sans-serif"
        fontSize={isMinimal ? 76 : 70}
        fontWeight="900"
        letterSpacing="-3"
      >
        R
      </text>
      {isMono ? <text x="60" y="91" textAnchor="middle" fill="#fff0bd" fontSize="10" fontWeight="900" letterSpacing="3">RIFF</text> : null}
      {isPremium || isUltimate ? <circle cx="60" cy="60" r="54" fill="none" stroke="#fff0bd" strokeWidth="1" opacity="0.2" /> : null}
    </svg>
  );
}

function AppIconPreview({ variantId, size = "large" }) {
  const variantNumber = Number(variantId.replace("icon-v", ""));
  const isWordmark = variantId === "icon-v1" || variantId === "icon-v2";
  const isSignature = variantId === "icon-v3" || variantId === "icon-v10";
  const isSvg = variantNumber >= 11;
  const isR = ["icon-v4", "icon-v5", "icon-v6", "icon-v7", "icon-v8", "icon-v9"].includes(variantId);
  const isSymbol = variantNumber >= 41;

  return (
    <div className={`appIconPreview appIconPreview--${variantId} appIconPreview--${size} ${isSymbol ? "appIconPreview--symbolic" : ""}`} aria-label={`${getAppIconVariantLabel(variantId)} preview`} role="img">
      {isSvg ? <AppIconSvgPreview variantId={variantId} /> : null}
      {isWordmark ? (
        <span className="appIconPreview__wordmark">
          <b>RIFFLAB</b>
          {variantId === "icon-v2" ? <i>RIFF</i> : null}
        </span>
      ) : null}
      {isSignature ? (
        <span className="appIconPreview__signature">
          <b>R</b>
          <small>RIFFLAB</small>
        </span>
      ) : null}
      {isR ? <span className="appIconPreview__visualR">R</span> : null}
    </div>
  );
}

function CharacterLabPreview({ variantId }) {
  return (
    <div className={`characterPreviewStage characterPreviewStage--${variantId}`}>
      <div className="characterPreviewPlayer" aria-hidden="true">
        <span className="characterPreviewShadow" />
        <span className="characterPreviewEar characterPreviewEar--left" />
        <span className="characterPreviewEar characterPreviewEar--right" />
        <span className="characterPreviewHat" />
        <span className="characterPreviewHead">
          <i />
          <b />
        </span>
        <span className="characterPreviewBody" />
        <span className="characterPreviewArm" />
        <span className="characterPreviewLeg characterPreviewLeg--left" />
        <span className="characterPreviewLeg characterPreviewLeg--right" />
        <span className="characterPreviewGuitarBody" />
        <span className="characterPreviewNeck">
          <i />
          <i />
          <i />
        </span>
        <span className="characterPreviewFlame" />
      </div>
      <span className="characterPreviewShot" aria-hidden="true" />
      <div className="characterPreviewTarget" aria-hidden="true">
        <i />
        <b />
      </div>
    </div>
  );
}

function getTrainingDetailTitle(category) {
  const fallbackOrder = {
    "first-position": 1,
    "scale-block": 2,
    rhythm: 3,
  };
  const stageNumber = String(category?.stageLabel?.replace(/\D/g, "") || fallbackOrder[category?.id] || 1).padStart(2, "0");
  return `${stageNumber} ${category?.title ?? ""}`.trim();
}

function BeatIndicator({ beat, beatsPerMeasure = 4, isPlaying, label = "현재 박자", timeSignature = "4/4" }) {
  const dots = Array.from({ length: beatsPerMeasure }, (_, index) => index);

  return (
    <div className="beatIndicator" aria-label={`${timeSignature} ${label}`}>
      {dots.map((beatNumber) => (
        <span
          className={beat === beatNumber && isPlaying ? "active" : ""}
          key={beatNumber}
        />
      ))}
    </div>
  );
}

function ChordProgressionSequence({ chords, currentIndex }) {
  return (
    <div className="trainingSequenceTimeline" aria-label="코드 진행 시퀀스">
      {chords.length > 0 ? chords.map((chord, index) => (
        <span className={index === currentIndex ? "active" : ""} key={`sequence-${chord.id}-${index}`}>
          {chord.displayName}
          {index < chords.length - 1 ? <i aria-hidden="true">›</i> : null}
        </span>
      )) : (
        <small>진행순서를 추가하세요</small>
      )}
    </div>
  );
}

function TrainingProgressIndicator({ beat = 0, beatsPerMeasure = 4, progress = 0, timeSignature = "4/4" }) {
  const walls = Array.from({ length: beatsPerMeasure }, (_, index) => index);
  const clampedProgress = Math.min(1, Math.max(0, Number(progress) || 0));

  return (
    <div className="trainingProgressIndicator" aria-label={`${timeSignature} 마디 진행`}>
      <i
        className="trainingProgressRunner"
        style={{ left: `${clampedProgress * 100}%` }}
      >
        {beat + 1}
      </i>
      {walls.map((index) => (
        <span key={index} style={{ left: `${(index / beatsPerMeasure) * 100}%` }} />
      ))}
    </div>
  );
}

const DISPLAY_NOTES = [
  ...Object.entries(NOTE_FREQUENCIES).map(([pitch, frequency]) =>
    makeGuitarNote({ pitch, frequency, stringNumber: 0, fretNumber: 0, lane: 0, group: "display" }),
  ),
];

const DEFAULT_BPM = 80;
const MIN_BPM = 30;
const MAX_BPM = 240;
const MIN_REPEAT_COUNT = 1;
const MAX_REPEAT_COUNT = 12;
const HIT_WINDOW_MS = 150;
const PERFECT_WINDOW_MS = 55;
const HIT_LINE_PERCENT = 88;
const NOTE_SIZE = 36;
const HIT_ZONE_SIZE = NOTE_SIZE;
const MIN_FREQ = 75;
const MAX_FREQ = 900;
const LOW_SIGNAL_LEVEL = 0.012;
const ACTIVE_SIGNAL_LEVEL = 0.018;
const RHYTHM_SUBDIVISIONS = {
  One: { label: "1/4", hint: "한 박에 한 음", beats: 6, notesPerBeat: 1 },
  Two: { label: "1/8", hint: "1 & 2 & 연속", beats: 6, notesPerBeat: 2 },
  Four: { label: "1/16", hint: "촘촘한 연속 피킹", beats: 6, notesPerBeat: 4 },
  Pair: { label: "2음/박", hint: "한 박에 두 음", beats: 6, notesPerBeat: 2, advanceEverySubdivision: true },
  Bounce: {
    label: "Bounce",
    hint: "퐁당 리듬",
    beats: 6,
    notesPerBeat: 2,
    advanceEverySubdivision: true,
    stepPattern: [{ play: true }, { play: false, ghost: true }],
  },
};
const JUDGMENT_MODES = {
  PITCH: {
    id: "pitch",
    label: "피치 매치 모드",
    shortLabel: "피치 매치",
    description: "같은 높이의 음이면 맞아요.",
  },
  POSITION: {
    id: "position",
    label: "포지션 연습 모드",
    shortLabel: "포지션 연습",
    description: "표시된 줄과 프렛 위치로 연습하는 모드예요.",
  },
};
const POSITION_MODE_WARNING =
  "같은 음은 다른 위치에도 있을 수 있어요. 이 모드는 표시된 위치로 연습하는 것을 권장합니다.";
const BPM_PRESETS = [40, 60, 80, 100, 120, 140, 160, 180];
const PENTATONIC_FRETS = [5, 6, 7, 8, 9, 10, 11, 12];
const SCALE_ASCENDING = ["A2", "C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4", "G4", "A4", "C5"];
const FIRST_POSITION_ASCENDING_SEQUENCE = [
  "E2", "F2", "G2",
  "A2", "B2", "C3",
  "D3", "E3", "F3",
  "G3", "A3",
  "B3", "C4", "D4",
  "E4", "F4", "G4",
];
const FIRST_POSITION_RETURN_SEQUENCE = [
  "F4", "E4",
  "D4", "C4", "B3",
  "A3", "G3",
  "F3", "E3", "D3",
  "C3", "B2", "A2",
  "G2", "F2", "E2",
];
const FIRST_POSITION_SEQUENCE = [
  ...FIRST_POSITION_ASCENDING_SEQUENCE,
  ...FIRST_POSITION_RETURN_SEQUENCE,
];
const FIRST_POSITION_SEQUENCE_GROUPS = [
  { phase: "정방", ko: "미파솔", en: "EFG" },
  { phase: "정방", ko: "라시도", en: "ABC" },
  { phase: "정방", ko: "레미파", en: "DEF" },
  { phase: "정방", ko: "솔라", en: "GA" },
  { phase: "정방", ko: "시도레", en: "BCD" },
  { phase: "정방", ko: "미파솔", en: "EFG" },
  { phase: "역방", ko: "파미", en: "FE" },
  { phase: "역방", ko: "레도시", en: "DCB" },
  { phase: "역방", ko: "라솔", en: "AG" },
  { phase: "역방", ko: "파미레", en: "FED" },
  { phase: "역방", ko: "도시라", en: "CBA" },
  { phase: "역방", ko: "솔파미", en: "GFE" },
];

const LEGACY_PRACTICE_CATEGORIES = [
  {
    id: "open",
    title: "사용법 익히기",
    subtitle: "개방현과 지판 표시를 확인해요",
    notes: OPEN_STRING_NOTES,
    sequence: ["E2", "A2", "D3", "G3", "B3", "E4"],
    modeLabel: "개방현",
    judgmentMode: JUDGMENT_MODES.PITCH.id,
    loop: true,
    tutorial: true,
  },
  {
    id: "first-position",
    title: "제로포지션 기본",
    subtitle: "개방현과 저포지션 음 위치를 익히는 기본 훈련",
    notes: FIRST_POSITION_NOTES,
    sequence: FIRST_POSITION_SEQUENCE,
    modeLabel: "Low Position",
    judgmentMode: JUDGMENT_MODES.PITCH.id,
    loop: false,
  },
  {
    id: "scale-block",
    title: "스케일 · 펜타토닉",
    subtitle: "박스 패턴으로 스케일과 펜타토닉 위치를 반복 학습",
    notes: NOTES,
    sequence: SCALE_ASCENDING,
    modeLabel: "Box Pattern",
    judgmentMode: JUDGMENT_MODES.POSITION.id,
    loop: true,
    featured: true,
  },
  {
    id: "rhythm",
    title: "리듬 · 코드 전환",
    subtitle: "메트로놈에 맞춰 코드 전환 타이밍을 훈련",
    notes: OPEN_STRING_NOTES,
    sequence: ["E2", "E2", "A2", "A2", "D3", "D3", "G3", "B3", "E4"],
    modeLabel: "핵심 리듬",
    judgmentMode: JUDGMENT_MODES.PITCH.id,
    loop: true,
    stageLabel: "3단계",
  },
  {
    id: "melody",
    title: "준비 중",
    subtitle: "다음 훈련 모드 준비 중",
    notes: FIRST_POSITION_NOTES,
    sequence: ["E2", "G2", "A2", "B2", "C3", "B2", "A2", "G2", "E2"],
    modeLabel: "미구현",
    judgmentMode: JUDGMENT_MODES.PITCH.id,
    loop: true,
    unavailable: true,
  },
];
// Legacy backup:
// The old falling-note / hitbox rhythm game renderer is preserved behind
// LEGACY_PRACTICE_RENDERING_ENABLED. Active stages now use reference-fretboard
// training, except Stage3 which keeps the chord transition practice.
const ACTIVE_PRACTICE_CATEGORY_IDS = new Set(["open", "first-position", "scale-block", "rhythm", "melody"]);
const LEGACY_PRACTICE_RENDERING_ENABLED = false;
const PRACTICE_CATEGORIES = LEGACY_PRACTICE_CATEGORIES.filter((category) =>
  ACTIVE_PRACTICE_CATEGORY_IDS.has(category.id),
);
const DEFAULT_CATEGORY = PRACTICE_CATEGORIES[0];
const MAIN_DEFAULT_CATEGORY =
  PRACTICE_CATEGORIES.find((category) => category.id === "rhythm") ??
  PRACTICE_CATEGORIES.find((category) => category.featured) ??
  PRACTICE_CATEGORIES.find((category) => !category.tutorial && !category.unavailable) ??
  DEFAULT_CATEGORY;
const SHOOTER_DEFAULT_CATEGORY =
  LEGACY_PRACTICE_CATEGORIES.find((category) => category.id === "scale-block") ??
  MAIN_DEFAULT_CATEGORY;

const GAME_STATES = {
  IDLE: "idle",
  LISTENING: "listening",
  PLAYING: "playing",
  PAUSED: "paused",
  GAMEOVER: "gameover",
};

const APP_MODES = {
  MENU: "menu",
  CURRICULUM: "curriculum",
  PRACTICE: "practice",
  METRONOME: "metronome",
  SHOOTER: "shooter",
  FRETBOARD_VIEWER: "fretboard-viewer",
  DESIGN_LAB: "design-lab",
};

const APP_ROUTES = {
  MAIN: "#main",
  FRETBOARD_VIEWER: "#fretboard",
  CURRICULUM: "#rhythm-training",
  TUTORIAL: "#tutorial",
  STAGE1: "#stage1",
  STAGE2: "#stage2",
  STAGE3: "#stage3",
  STAGE4: "#stage4",
  METRONOME: "#metronome",
  SHOOTER: "#shooter",
  DESIGN_LAB: "#design-lab",
};

function isDesignLabEnabled() {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("lab") === "1" || window.localStorage?.getItem("rifflab-design-lab") === "1";
}

function getRouteFromHash(hash) {
  const normalizedHash = hash || APP_ROUTES.MAIN;
  switch (normalizedHash) {
    case APP_ROUTES.FRETBOARD_VIEWER:
      return { appMode: APP_MODES.FRETBOARD_VIEWER, categoryId: MAIN_DEFAULT_CATEGORY.id };
    case APP_ROUTES.CURRICULUM:
      return { appMode: APP_MODES.CURRICULUM, categoryId: MAIN_DEFAULT_CATEGORY.id };
    case APP_ROUTES.TUTORIAL:
      return { appMode: APP_MODES.CURRICULUM, categoryId: MAIN_DEFAULT_CATEGORY.id };
    case APP_ROUTES.STAGE1:
      return { appMode: APP_MODES.PRACTICE, categoryId: "first-position" };
    case APP_ROUTES.STAGE2:
      return { appMode: APP_MODES.PRACTICE, categoryId: "scale-block" };
    case APP_ROUTES.STAGE3:
      return { appMode: APP_MODES.PRACTICE, categoryId: "rhythm" };
    case APP_ROUTES.STAGE4:
      return { appMode: APP_MODES.PRACTICE, categoryId: "melody" };
    case APP_ROUTES.METRONOME:
      return { appMode: APP_MODES.METRONOME, categoryId: MAIN_DEFAULT_CATEGORY.id };
    case APP_ROUTES.SHOOTER:
      return { appMode: APP_MODES.SHOOTER, categoryId: MAIN_DEFAULT_CATEGORY.id };
    case APP_ROUTES.DESIGN_LAB:
      return isDesignLabEnabled()
        ? { appMode: APP_MODES.DESIGN_LAB, categoryId: MAIN_DEFAULT_CATEGORY.id }
        : { appMode: APP_MODES.CURRICULUM, categoryId: MAIN_DEFAULT_CATEGORY.id };
    case APP_ROUTES.MAIN:
    default:
      return { appMode: APP_MODES.CURRICULUM, categoryId: MAIN_DEFAULT_CATEGORY.id };
  }
}

function getHashFromRoute(appMode, categoryId = MAIN_DEFAULT_CATEGORY.id) {
  if (appMode === APP_MODES.FRETBOARD_VIEWER) return APP_ROUTES.FRETBOARD_VIEWER;
  if (appMode === APP_MODES.CURRICULUM) return APP_ROUTES.CURRICULUM;
  if (appMode === APP_MODES.METRONOME) return APP_ROUTES.METRONOME;
  if (appMode === APP_MODES.SHOOTER) return APP_ROUTES.SHOOTER;
  if (appMode === APP_MODES.DESIGN_LAB) return APP_ROUTES.DESIGN_LAB;
  if (appMode === APP_MODES.PRACTICE && categoryId === "open") return APP_ROUTES.MAIN;
  if (appMode === APP_MODES.PRACTICE && categoryId === "first-position") return APP_ROUTES.STAGE1;
  if (appMode === APP_MODES.PRACTICE && categoryId === "scale-block") return APP_ROUTES.STAGE2;
  if (appMode === APP_MODES.PRACTICE && categoryId === "rhythm") return APP_ROUTES.STAGE3;
  if (appMode === APP_MODES.PRACTICE && categoryId === "melody") return APP_ROUTES.STAGE4;
  return APP_ROUTES.MAIN;
}

function getInitialAppRoute() {
  if (typeof window === "undefined") return getRouteFromHash(APP_ROUTES.MAIN);
  return getRouteFromHash(window.location.hash);
}

function getDeviceSnapshot() {
  if (typeof window === "undefined") {
    return {
      browser: "Unknown",
      height: 0,
      os: "Unknown",
      width: 0,
    };
  }

  const userAgent = window.navigator.userAgent || "";
  const browser =
    /Edg\//.test(userAgent) ? "Edge" :
    /SamsungBrowser\//.test(userAgent) ? "Samsung Internet" :
    /CriOS|Chrome\//.test(userAgent) ? "Chrome" :
    /FxiOS|Firefox\//.test(userAgent) ? "Firefox" :
    /Safari\//.test(userAgent) ? "Safari" :
    "Unknown";
  const os =
    /Android/i.test(userAgent) ? "Android" :
    /iPhone|iPad|iPod/i.test(userAgent) ? "iOS" :
    /Windows/i.test(userAgent) ? "Windows" :
    /Mac OS X/i.test(userAgent) ? "macOS" :
    "Unknown";

  return {
    browser,
    height: Math.round(window.innerHeight || 0),
    os,
    width: Math.round(window.innerWidth || 0),
  };
}

const FRETBOARD_VIEWER_MODES = {
  NOTE: "note",
  SCALE: "scale",
  CHORD: "chord",
  INFO: "info",
};

const CHORD_VIEWER_POSITIONS = [
  { id: "position1", label: "1구간" },
  { id: "position2", label: "2구간" },
  { id: "position3", label: "3구간" },
  { id: "position4", label: "4구간" },
  { id: "position5", label: "5구간" },
];
const NOTE_VIEWER_POSITIONS = [
  { id: "position1", label: "1구간", range: [0, 3] },
  { id: "position2", label: "2구간", range: [4, 6] },
  { id: "position3", label: "3구간", range: [7, 9] },
  { id: "position4", label: "4구간", range: [10, 12] },
  { id: "position5", label: "5구간", range: [13, 15] },
  { id: "all", label: "전체", range: [0, 15] },
];
const CHORD_CATALOG_ALL = "all";
const STAGE3_STORAGE_KEY = "guitarTrainer.stage3Settings.v1";
const STAGE3_QUICK_SLOTS_KEY = "guitarTrainer.stage3QuickSlots.v1";

function getDefaultStage3ChordIds() {
  return CHORD_TRANSITION_PRESETS[0].chords.map((name) => getChordByDisplayName(name)?.id).filter(Boolean);
}

function getDefaultStage3QuickSlots() {
  return CHORD_TRANSITION_PRESETS.map((preset) => makeStage3LibraryItem({
    id: `preset-${preset.id}`,
    title: preset.title,
    chordIds: getChordIdsFromNames(preset.chords),
    memo: preset.memo,
  })).filter((slot) => slot.chordIds.length > 0);
}

function getStoredStage3Settings() {
  const fallback = {
    bpm: DEFAULT_BPM,
    chordProgressionId: `slot:preset-${CHORD_TRANSITION_PRESETS[0].id}`,
    chordIds: getDefaultStage3ChordIds(),
    showChordFingeringGuide: false,
    chordBaseRoot: "G",
    chordAccidental: "natural",
    chordRoot: "G",
    chordQuality: "major",
    chordExtension: "none",
  };
  if (typeof window === "undefined") return fallback;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STAGE3_STORAGE_KEY) ?? "{}");
    const chordIds = Array.isArray(parsed.chordIds)
      ? parsed.chordIds.filter((entry) => CHORD_VIEW_OPTIONS.some((chord) => chord.id === getChordEntryId(entry)))
      : fallback.chordIds;
    const parsedProgressionId = String(parsed.chordProgressionId ?? "");
    const validProgressionId =
      parsedProgressionId === "custom" || parsedProgressionId.startsWith("slot:")
        ? parsedProgressionId
        : CHORD_TRANSITION_PRESETS.some((preset) => preset.id === parsedProgressionId)
          ? `slot:preset-${parsedProgressionId}`
          : fallback.chordProgressionId;
    const validRoot = CHORD_ROOTS.includes(parsed.chordRoot) ? parsed.chordRoot : fallback.chordRoot;
    const fallbackRootParts = splitChordRootForSelector(validRoot);
    const validBaseRoot = CHORD_NATURAL_ROOTS.includes(parsed.chordBaseRoot)
      ? parsed.chordBaseRoot
      : fallbackRootParts.baseRoot;
    const validAccidental = CHORD_ACCIDENTAL_OPTIONS.some((option) => option.id === parsed.chordAccidental)
      ? parsed.chordAccidental
      : fallbackRootParts.accidental;
    const validQuality = CHORD_QUALITY_OPTIONS.some((quality) => quality.id === parsed.chordQuality)
      ? parsed.chordQuality
      : fallback.chordQuality;
    const validExtension = CHORD_EXTENSION_OPTIONS.some((extension) => extension.id === parsed.chordExtension)
      ? parsed.chordExtension
      : fallback.chordExtension;
    const hasSelectedChord = CHORD_VIEW_OPTIONS.some(
      (chord) =>
        chord.root === validRoot &&
        chord.quality === validQuality &&
        chord.extension === validExtension,
    );

    return {
      bpm: clampBpm(parsed.bpm ?? fallback.bpm),
      chordProgressionId: validProgressionId,
      chordIds,
      showChordFingeringGuide: Boolean(parsed.showChordFingeringGuide),
      chordBaseRoot: validBaseRoot,
      chordAccidental: validAccidental,
      chordRoot: validRoot,
      chordQuality: validQuality,
      chordExtension: hasSelectedChord ? validExtension : fallback.chordExtension,
    };
  } catch {
    return fallback;
  }
}

function getStoredStage3QuickSlots() {
  if (typeof window === "undefined") return getDefaultStage3QuickSlots();
  try {
    const stored = window.localStorage.getItem(STAGE3_QUICK_SLOTS_KEY);
    if (stored === null) return getDefaultStage3QuickSlots();
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return getDefaultStage3QuickSlots();
    const migrated = parsed
      .map((slot, index) => makeStage3LibraryItem({
        id: slot?.id ?? `slot-${Date.now()}-${index}`,
        title: slot?.title ?? slot?.name ?? (slot?.label?.includes("—") ? slot.label.split("—")[0].trim() : `내 진행 ${index + 1}`),
        chordIds: Array.isArray(slot?.chordIds) ? slot.chordIds : [],
        capo: slot?.capo,
        bpm: slot?.bpm,
        timeSignature: slot?.time_signature ?? slot?.timeSignature,
        subdivision: slot?.subdivision,
        sound: slot?.sound ?? slot?.tone,
        strum_pattern: slot?.strum_pattern,
        memo: slot?.memo ?? (typeof slot?.strum_pattern === "string" ? slot.strum_pattern : ""),
      }))
      .filter((slot) => slot.id && slot.title && slot.chordIds.length > 0);
    return migrated.length ? migrated.slice(0, 24) : getDefaultStage3QuickSlots();
  } catch {
    return getDefaultStage3QuickSlots();
  }
}

const SCALE_DIRECTIONS = {
  ASC: "ascending",
  DESC: "descending",
  LOOP: "loop",
};

const SCALE_DIRECTION_OPTIONS = [
  { id: SCALE_DIRECTIONS.ASC, label: "상행", hint: "낮은 음부터 위로" },
  { id: SCALE_DIRECTIONS.LOOP, label: "왕복", hint: "상행 후 되돌아오기" },
  { id: SCALE_DIRECTIONS.DESC, label: "하행", hint: "높은 음부터 아래로" },
];

const SHOOTER_LEVELS = [
  { name: "레벨 1", unlockAt: 0, poolRatio: 0.34, durationBeats: 24, spawnGapBeats: 5.2, randomness: 0.28, jumpBias: 0.12 },
  { name: "레벨 2", unlockAt: 8, poolRatio: 0.55, durationBeats: 22, spawnGapBeats: 4.35, randomness: 0.48, jumpBias: 0.28 },
  { name: "레벨 3", unlockAt: 20, poolRatio: 0.78, durationBeats: 20, spawnGapBeats: 3.55, randomness: 0.66, jumpBias: 0.48 },
  { name: "레벨 4", unlockAt: 38, poolRatio: 1, durationBeats: 18, spawnGapBeats: 2.85, randomness: 0.82, jumpBias: 0.66 },
  { name: "레벨 5", unlockAt: 62, poolRatio: 1, durationBeats: 16, spawnGapBeats: 2.25, randomness: 0.94, jumpBias: 0.82 },
];
const SHOOTER_MAX_LIVES = 3;

function classNameFromLabel(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const UI_LABELS = {
  Perfect: "완벽",
  Good: "좋음",
  Miss: "실패",
  Ready: "준비",
  "Listen and play": "듣고 연주하세요",
  "Shoot the notes": "목표 음을 연주하세요",
  "Start Shooter": "슈팅게임 시작",
  "Game Over": "게임 오버",
  Success: "성공!",
  Paused: "일시정지",
  Play: "연주",
  "Restart Practice": "연습 다시 시작",
  Complete: "완료",
  "Mic Stopped": "마이크 꺼짐",
  "Choose a practice card": "연습 카드를 선택하세요",
  "Permission Denied": "마이크 권한 거부",
  "Mic Connected": "마이크 연결됨",
  "Listening...": "감지 중",
  "No Signal": "신호 없음",
  curriculum: "연습 목차",
  practice: "훈련장 트레이너",
  shooter: "슈팅게임",
  "fretboard-viewer": "지판 보기",
  idle: "대기",
  listening: "감지 중",
  playing: "연습 중",
  paused: "일시정지",
  gameover: "종료",
};

function t(label) {
  return UI_LABELS[label] ?? label;
}

function getFretLabel(note) {
  if (!note) return "";
  const fretNumber = Number(note.fretNumber ?? note.fret ?? 0);
  return fretNumber === 0 ? "개방현" : `${fretNumber}프렛`;
}

function getPitch(note) {
  return note?.pitch ?? note?.octaveNote ?? note?.name ?? "";
}

function getStringFretLabel(note) {
  if (!note) return "";
  return `${note.stringNumber}번줄 ${getFretLabel(note)}`;
}

function getFretboardPositionsForPitch(pitch, maxFret = MAX_FRETBOARD_GUIDE_FRET) {
  const targetMidi = pitchToMidi(pitch);
  if (targetMidi == null) return [];

  return STANDARD_TUNING.flatMap((stringInfo) => {
    const openMidi = pitchToMidi(stringInfo.pitch);
    const fretNumber = targetMidi - openMidi;
    if (openMidi == null || fretNumber < 0 || fretNumber > maxFret) return [];

    return makeGuitarNote({
      pitch,
      stringNumber: stringInfo.stringNumber,
      fretNumber,
      group: "fret-guide",
    });
  }).sort((a, b) => a.fretNumber - b.fretNumber || b.stringNumber - a.stringNumber);
}

function getNoteDisplay(noteName) {
  const solfege = getSolfege(noteName);
  return solfege ? `${solfege}(${noteName?.[0]})` : noteName;
}

function getNoteColorStyle(noteName) {
  const color = NOTE_COLORS[noteName?.[0]] ?? NOTE_COLORS.C;
  return {
    "--note-fill": color.fill,
    "--note-text": color.text,
    "--note-glow": color.glow,
  };
}

function getPlayPrompt(note) {
  if (!note) return "";
  return `${note.solfege ?? getSolfege(getPitch(note))}(${getPitch(note)}) 음을 연주하세요`;
}

function getShooterLevel(hitCount) {
  return [...SHOOTER_LEVELS].reverse().find((level) => hitCount >= level.unlockAt) ?? SHOOTER_LEVELS[0];
}

function getShooterQueue(hitCount, startIndex, size = 5) {
  const level = getShooterLevel(hitCount);
  const fallbackNotes = FIRST_POSITION_NOTES;
  const poolSize = Math.max(3, Math.ceil(fallbackNotes.length * level.poolRatio));
  const pool = fallbackNotes.slice(0, poolSize);
  return Array.from({ length: size }, (_, index) => pool[(startIndex + index) % pool.length]);
}

function getShooterNoteDetail(noteName) {
  return (
    ALL_PRACTICE_NOTES.find((note) => note.pitch === noteName) ??
    DISPLAY_NOTES.find((note) => note.pitch === noteName) ??
    DEFAULT_CATEGORY.notes[0]
  );
}

function getShooterTrainingNotes(category, selectedBlock) {
  if (category?.id === "scale-block" && selectedBlock?.notes?.length) return selectedBlock.notes;
  if (category?.notes?.length) return category.notes;
  return FIRST_POSITION_NOTES;
}

function getShooterPool(notes, level) {
  const sortedNotes = [...notes]
    .filter((note, index, list) => note?.pitch && list.findIndex((item) => item.pitch === note.pitch) === index)
    .sort((a, b) => a.frequency - b.frequency || b.stringNumber - a.stringNumber || a.fretNumber - b.fretNumber);
  const poolSize = Math.max(3, Math.min(sortedNotes.length, Math.ceil(sortedNotes.length * level.poolRatio)));
  return sortedNotes.slice(0, poolSize);
}

function getShooterMovementScore(note, previousNote) {
  if (!note || !previousNote) return 0;
  const fretDistance = Math.abs((note.fretNumber ?? 0) - (previousNote.fretNumber ?? 0));
  const stringDistance = Math.abs((note.stringNumber ?? 0) - (previousNote.stringNumber ?? 0));
  return fretDistance * 1.1 + stringDistance * 1.7;
}

function pickShooterNote(pool, previousNote, level) {
  if (!pool.length) return DEFAULT_CATEGORY.notes[0];
  const candidates = pool.filter((note) => note.pitch !== previousNote?.pitch);
  const usablePool = candidates.length ? candidates : pool;
  const weightedPool = usablePool.map((note, index) => {
    const movementScore = getShooterMovementScore(note, previousNote);
    const easyWeight = Math.max(0.25, usablePool.length - index);
    const jumpWeight = 1 + movementScore * level.jumpBias;
    const randomWeight = 0.5 + level.randomness;
    return {
      note,
      weight: easyWeight * (1 - level.randomness) + jumpWeight * randomWeight,
    };
  });
  const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const item of weightedPool) {
    cursor -= item.weight;
    if (cursor <= 0) return item.note;
  }
  return weightedPool[weightedPool.length - 1].note;
}

function getShooterSpawnX(previousX = 50) {
  const side = Math.random() < 0.5 ? "left" : "right";
  const [min, max] = side === "left" ? [14, 42] : [58, 86];
  let nextX = min + Math.random() * (max - min);
  if (Math.abs(nextX - previousX) < 14) nextX = side === "left" ? Math.max(12, nextX - 16) : Math.min(88, nextX + 16);
  return Math.round(nextX);
}

function getSequenceStepNoteName(step) {
  return typeof step === "string" ? step : step?.noteName;
}

function expandSequenceForSubdivision(sequence, subdivision) {
  const repeatCount = Math.max(1, Math.round(subdivision?.notesPerBeat ?? 1));
  const stepPattern =
    subdivision?.stepPattern ??
    Array.from({ length: repeatCount }, () => ({ play: true, ghost: false }));
  return Array.from({ length: sequence.length * repeatCount }, (_, index) => {
    const patternStep = stepPattern[index % stepPattern.length] ?? { play: true, ghost: false };
    const sequenceIndex = subdivision?.advanceEverySubdivision
      ? index % sequence.length
      : Math.floor(index / repeatCount) % sequence.length;
    return {
      noteName: sequence[sequenceIndex],
      ghost: Boolean(patternStep.ghost || patternStep.play === false),
    };
  });
}

function getBeatMs(bpm) {
  return 60000 / bpm;
}

function clampBpm(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(parsed)));
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSolfege(noteName) {
  return SOLFEGE[getPitchClass(noteName)] ?? SOLFEGE[noteName?.[0]] ?? "";
}

function normalizePracticeCategory(category) {
  if (!category || !Array.isArray(category.notes) || category.notes.length === 0) {
    return DEFAULT_CATEGORY;
  }

  if (!Array.isArray(category.sequence) || category.sequence.length === 0) {
    return { ...category, sequence: category.notes.map((note) => note.pitch) };
  }

  return category;
}

function shouldLoopPractice(category, repeatPractice) {
  return Boolean(repeatPractice);
}

function repeatSequence(sequence, count) {
  return Array.from({ length: count }, () => sequence).flat();
}

function getJudgmentMode(modeId) {
  return Object.values(JUDGMENT_MODES).find((mode) => mode.id === modeId) ?? JUDGMENT_MODES.PITCH;
}

function getRms(buffer) {
  let total = 0;
  for (let i = 0; i < buffer.length; i += 1) total += buffer[i] * buffer[i];
  return Math.sqrt(total / buffer.length);
}

function centsBetween(frequency, targetFrequency) {
  return 1200 * Math.log2(frequency / targetFrequency);
}

function frequencyToNearest(frequency, noteList, maxCents = Infinity) {
  if (!frequency) return null;

  let closest = noteList[0];
  let closestCents = Infinity;
  let signedCents = 0;

  for (const note of noteList) {
    const cents = centsBetween(frequency, note.frequency);
    if (Math.abs(cents) < closestCents) {
      closest = note;
      closestCents = Math.abs(cents);
      signedCents = cents;
    }
  }

  return closestCents <= maxCents
    ? { ...closest, cents: Math.round(signedCents), detectedFrequency: frequency }
    : null;
}

function frequencyToGameNote(frequency) {
  return frequencyToNearest(frequency, ALL_PRACTICE_NOTES, 45);
}

function detectPitchYin(buffer, sampleRate, minFrequency = MIN_FREQ, maxFrequency = MAX_FREQ, threshold = 0.12) {
  const minTau = Math.floor(sampleRate / maxFrequency);
  const maxTau = Math.floor(sampleRate / minFrequency);
  const yin = new Float32Array(maxTau + 1);
  let runningSum = 0;

  for (let tau = 1; tau <= maxTau; tau += 1) {
    let sum = 0;
    for (let i = 0; i < maxTau; i += 1) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }

    runningSum += sum;
    yin[tau] = runningSum === 0 ? 1 : (sum * tau) / runningSum;
  }

  let tauEstimate = -1;
  for (let tau = minTau; tau <= maxTau; tau += 1) {
    if (yin[tau] < threshold) {
      while (tau + 1 <= maxTau && yin[tau + 1] < yin[tau]) tau += 1;
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) return null;

  const betterTau = parabolicInterpolation(yin, tauEstimate);
  const frequency = sampleRate / betterTau;
  return Number.isFinite(frequency) ? frequency : null;
}

function detectPitchAutocorrelation(
  buffer,
  sampleRate,
  minFrequency = MIN_FREQ,
  maxFrequency = MAX_FREQ,
  minCorrelation = 0.006,
) {
  const minLag = Math.floor(sampleRate / maxFrequency);
  const maxLag = Math.floor(sampleRate / minFrequency);
  let bestLag = -1;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    for (let i = 0; i < buffer.length - lag; i += 1) {
      correlation += buffer[i] * buffer[i + lag];
    }

    correlation /= buffer.length - lag;
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  if (bestLag < 0 || bestCorrelation < minCorrelation) return null;
  return sampleRate / bestLag;
}

function parabolicInterpolation(values, index) {
  const left = values[index - 1] ?? values[index];
  const center = values[index];
  const right = values[index + 1] ?? values[index];
  const divisor = left - 2 * center + right;

  if (divisor === 0) return index;
  return index + (left - right) / (2 * divisor);
}

function App() {
  const initialRouteRef = useRef(getInitialAppRoute());
  const initialStage3SettingsRef = useRef(getStoredStage3Settings());
  const initialStage3QuickSlotsRef = useRef(getStoredStage3QuickSlots());
  const [appMode, setAppMode] = useState(initialRouteRef.current.appMode);
  const [utilityMenuOpen, setUtilityMenuOpen] = useState(false);
  const designLabEnabled = isDesignLabEnabled();
  const [designLabHeaderState, setDesignLabHeaderState] = useState(getStoredDesignLabHeaderState);
  const [designLabAppIconState, setDesignLabAppIconState] = useState(getStoredDesignLabAppIconState);
  const [designLabSection, setDesignLabSection] = useState("logo");
  const [logoPreviewScale, setLogoPreviewScale] = useState(100);
  const [selectedHeaderCandidateId, setSelectedHeaderCandidateId] = useState(getStoredDesignLabHeaderState().activeHeader);
  const [selectedAppIconCandidateId, setSelectedAppIconCandidateId] = useState(getStoredDesignLabAppIconState().activeIcon);
  const [deviceInfo, setDeviceInfo] = useState(getDeviceSnapshot);
  const [gameState, setGameState] = useState(GAME_STATES.IDLE);
  const [micStatus, setMicStatus] = useState("No Signal");
  const [detected, setDetected] = useState(null);
  const [detectedPitch, setDetectedPitch] = useState(null);
  const [signalLevel, setSignalLevel] = useState(0);
  const [enemies, setEnemies] = useState([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [missedNoteCounts, setMissedNoteCounts] = useState({});
  const [feedback, setFeedback] = useState("Ready");
  const [laneFeedback, setLaneFeedback] = useState([]);
  const [beat, setBeat] = useState(0);
  const [stage3MeasureProgress, setStage3MeasureProgress] = useState(0);
  const [stageFlash, setStageFlash] = useState("");
  const [referenceStepTick, setReferenceStepTick] = useState(0);
  const [noteSpeed, setNoteSpeed] = useState(RHYTHM_SUBDIVISIONS.One);
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialRouteRef.current.categoryId);
  const [pendingStageCardId, setPendingStageCardId] = useState(null);
  const [scaleDirection, setScaleDirection] = useState(SCALE_DIRECTIONS.LOOP);
  const [selectedScaleRoot, setSelectedScaleRoot] = useState("A");
  const [selectedScaleFamily, setSelectedScaleFamily] = useState(SCALE_FAMILIES.pentatonic.id);
  const [selectedScaleType, setSelectedScaleType] = useState(PENTATONIC_TYPES.minor.id);
  const [selectedScaleBox, setSelectedScaleBox] = useState(1);
  const [viewerMode, setViewerMode] = useState(FRETBOARD_VIEWER_MODES.NOTE);
  const [viewerNoteFilter, setViewerNoteFilter] = useState("ALL");
  const [viewerOctaveRange] = useState("all");
  const [viewerScaleRoot, setViewerScaleRoot] = useState("A");
  const [viewerScaleFamily, setViewerScaleFamily] = useState(SCALE_FAMILIES.pentatonic.id);
  const [viewerScaleType, setViewerScaleType] = useState(PENTATONIC_TYPES.minor.id);
  const [viewerScaleBox, setViewerScaleBox] = useState(1);
  const [viewerChordBaseRoot, setViewerChordBaseRoot] = useState("C");
  const [viewerChordAccidental, setViewerChordAccidental] = useState("natural");
  const [viewerChordRoot, setViewerChordRoot] = useState("C");
  const [viewerChordQuality, setViewerChordQuality] = useState("major");
  const [viewerChordExtension, setViewerChordExtension] = useState("none");
  const [viewerChordId, setViewerChordId] = useState(CHORD_CATALOG_ALL);
  const [viewerChordPosition, setViewerChordPosition] = useState("position1");
  const [showChordFingeringGuide, setShowChordFingeringGuide] = useState(
    initialStage3SettingsRef.current.showChordFingeringGuide,
  );
  const [chordProgressionId, setChordProgressionId] = useState(initialStage3SettingsRef.current.chordProgressionId);
  const initialStage3RootParts = splitChordRootForSelector(initialStage3SettingsRef.current.chordRoot);
  const [stage3ChordBaseRoot, setStage3ChordBaseRoot] = useState(
    initialStage3SettingsRef.current.chordBaseRoot ?? initialStage3RootParts.baseRoot,
  );
  const [stage3ChordAccidental, setStage3ChordAccidental] = useState(
    initialStage3SettingsRef.current.chordAccidental ?? initialStage3RootParts.accidental,
  );
  const [stage3ChordRoot, setStage3ChordRoot] = useState(initialStage3SettingsRef.current.chordRoot);
  const [stage3ChordQuality, setStage3ChordQuality] = useState(initialStage3SettingsRef.current.chordQuality);
  const [stage3ChordExtension, setStage3ChordExtension] = useState(initialStage3SettingsRef.current.chordExtension);
  const [stage3ChordIds, setStage3ChordIds] = useState(initialStage3SettingsRef.current.chordIds);
  const [stage3QuickSlots, setStage3QuickSlots] = useState(initialStage3QuickSlotsRef.current);
  const [loadedStage3LibraryItem, setLoadedStage3LibraryItem] = useState(
    initialStage3QuickSlotsRef.current.find((slot) => `slot:${slot.id}` === initialStage3SettingsRef.current.chordProgressionId) ?? null,
  );
  const [stage3StorageOpen, setStage3StorageOpen] = useState(false);
  const [stage3StorageSelectedId, setStage3StorageSelectedId] = useState(initialStage3QuickSlotsRef.current[0]?.id ?? "");
  const [stage3StorageTitle, setStage3StorageTitle] = useState("내 진행");
  const [stage3StorageMemo, setStage3StorageMemo] = useState("");
  const [stage3StorageEditingId, setStage3StorageEditingId] = useState("");
  const [stage3StorageChordIds, setStage3StorageChordIds] = useState(initialStage3SettingsRef.current.chordIds);
  const [stage3StorageBpm, setStage3StorageBpm] = useState(initialStage3SettingsRef.current.bpm);
  const [stage3StorageTimeSignature, setStage3StorageTimeSignature] = useState("4/4");
  const [stage3StorageCapo, setStage3StorageCapo] = useState(0);
  const [stage3StorageStrumPattern, setStage3StorageStrumPattern] = useState([]);
  const [stage3StorageStrumDraftPattern, setStage3StorageStrumDraftPattern] = useState([]);
  const [chordPracticeIndex, setChordPracticeIndex] = useState(0);
  const [repeatPractice, setRepeatPractice] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [bpm, setBpm] = useState(initialStage3SettingsRef.current.bpm);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [metronomeTimeSignature, setMetronomeTimeSignature] = useState("4/4");
  const [metronomeAccent, setMetronomeAccent] = useState(true);
  const [metronomeSubdivision, setMetronomeSubdivision] = useState("quarter");
  const [metronomeTone, setMetronomeTone] = useState("tick");
  const [metronomeCountIn, setMetronomeCountIn] = useState(false);
  const [metronomeRepeat, setMetronomeRepeat] = useState(false);
  const [autoBpmEnabled, setAutoBpmEnabled] = useState(false);
  const [autoBpmStep, setAutoBpmStep] = useState(2);
  const [autoBpmBars, setAutoBpmBars] = useState(10);
  const [autoBpmIncrements, setAutoBpmIncrements] = useState(0);
  const [coachModeEnabled, setCoachModeEnabled] = useState(false);
  const [coachPlayBars, setCoachPlayBars] = useState(4);
  const [coachMuteBars, setCoachMuteBars] = useState(4);
  const [metronomeMeasureCount, setMetronomeMeasureCount] = useState(0);
  const [metronomeIsMutedCycle, setMetronomeIsMutedCycle] = useState(false);
  const [feelRecorderActive, setFeelRecorderActive] = useState(false);
  const [feelRecorderEvents, setFeelRecorderEvents] = useState([]);
  const [feelPatternName, setFeelPatternName] = useState(FEEL_RECORDER_DEFAULT_NAME);
  const [savedFeelPatterns, setSavedFeelPatterns] = useState(getStoredFeelRecorderPatterns);
  const [feelPlaybackActive, setFeelPlaybackActive] = useState(false);
  const [feelPlaybackLoop, setFeelPlaybackLoop] = useState(true);
  const [feelPlaybackIndex, setFeelPlaybackIndex] = useState(-1);
  const [feelPlaybackProgress, setFeelPlaybackProgress] = useState(0);
  const [stage3SetupCollapsed, setStage3SetupCollapsed] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [hitZoneNote, setHitZoneNote] = useState(null);
  const [isHitWindowActive, setIsHitWindowActive] = useState(false);
  const [shooterTargets, setShooterTargets] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [particles, setParticles] = useState([]);
  const [shooterAim, setShooterAim] = useState(undefined);
  const [showShooterFretGuide, setShowShooterFretGuide] = useState(true);
  const [shooterSoundOn, setShooterSoundOn] = useState(true);
  const [shooterLives, setShooterLives] = useState(SHOOTER_MAX_LIVES);
  const headerVariant = designLabHeaderState.activeHeader;
  const visibleHeaderVariants = useMemo(
    () => HEADER_VARIANTS.filter((variant) => !designLabHeaderState.deletedHeaders.includes(variant.id)),
    [designLabHeaderState.deletedHeaders],
  );
  const visibleAppIconVariants = useMemo(
    () => APP_ICON_VARIANTS.filter((variant) => !designLabAppIconState.deletedIcons.includes(variant.id)),
    [designLabAppIconState.deletedIcons],
  );
  const logoPreviewStyle = useMemo(
    () => ({ "--logo-preview-scale": logoPreviewScale / 100 }),
    [logoPreviewScale],
  );

  const updateDesignLabHeaderState = useCallback((updater) => {
    setDesignLabHeaderState((current) => {
      const next = normalizeDesignLabHeaderState(typeof updater === "function" ? updater(current) : updater);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(DESIGN_LAB_HEADER_STORAGE_KEY, JSON.stringify(next));
      }

      return next;
    });
  }, []);

  const applyHeaderVariant = useCallback((variantId) => {
    updateDesignLabHeaderState((current) => ({
      ...current,
      activeHeader: variantId,
      heldHeaders: current.heldHeaders.filter((id) => id !== variantId),
      deletedHeaders: current.deletedHeaders.filter((id) => id !== variantId),
    }));
  }, [updateDesignLabHeaderState]);

  const holdHeaderVariant = useCallback((variantId) => {
    updateDesignLabHeaderState((current) => {
      if (variantId === current.activeHeader) return current;
      if (current.heldHeaders.includes(variantId)) {
        return {
          ...current,
          heldHeaders: current.heldHeaders.filter((id) => id !== variantId),
        };
      }
      return {
        ...current,
        heldHeaders: [...current.heldHeaders, variantId],
        deletedHeaders: current.deletedHeaders.filter((id) => id !== variantId),
      };
    });
  }, [updateDesignLabHeaderState]);

  const deleteHeaderVariant = useCallback((variantId) => {
    if (variantId === designLabHeaderState.activeHeader) {
      window.alert?.("현재 운영중인 시안은 삭제할 수 없습니다.");
      return;
    }
    if (designLabHeaderState.heldHeaders.includes(variantId)) {
      window.alert?.("잠금된 시안은 삭제할 수 없습니다. 잠금 해제 후 삭제하세요.");
      return;
    }

    const label = getHeaderVariantLabel(variantId);
    if (!window.confirm?.(`${label} 시안을 Design Lab 목록에서 삭제할까요?`)) return;

    updateDesignLabHeaderState({
      ...designLabHeaderState,
      heldHeaders: designLabHeaderState.heldHeaders.filter((id) => id !== variantId),
      deletedHeaders: designLabHeaderState.deletedHeaders.includes(variantId)
        ? designLabHeaderState.deletedHeaders
        : [...designLabHeaderState.deletedHeaders, variantId],
    });
  }, [designLabHeaderState, updateDesignLabHeaderState]);

  const updateDesignLabAppIconState = useCallback((updater) => {
    setDesignLabAppIconState((current) => {
      const next = normalizeDesignLabAppIconState(typeof updater === "function" ? updater(current) : updater);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(DESIGN_LAB_APP_ICON_STORAGE_KEY, JSON.stringify(next));
      }

      return next;
    });
  }, []);

  const applyAppIconVariant = useCallback((variantId) => {
    updateDesignLabAppIconState((current) => ({
      ...current,
      activeIcon: variantId,
      heldIcons: current.heldIcons.filter((id) => id !== variantId),
      deletedIcons: current.deletedIcons.filter((id) => id !== variantId),
    }));
  }, [updateDesignLabAppIconState]);

  const holdAppIconVariant = useCallback((variantId) => {
    updateDesignLabAppIconState((current) => {
      if (variantId === current.activeIcon) return current;
      if (current.heldIcons.includes(variantId)) {
        return {
          ...current,
          heldIcons: current.heldIcons.filter((id) => id !== variantId),
        };
      }
      return {
        ...current,
        heldIcons: [...current.heldIcons, variantId],
        deletedIcons: current.deletedIcons.filter((id) => id !== variantId),
      };
    });
  }, [updateDesignLabAppIconState]);

  const deleteAppIconVariant = useCallback((variantId) => {
    if (variantId === designLabAppIconState.activeIcon) {
      window.alert?.("현재 운영중인 앱 아이콘은 삭제할 수 없습니다.");
      return;
    }
    if (designLabAppIconState.heldIcons.includes(variantId)) {
      window.alert?.("잠금된 앱 아이콘은 삭제할 수 없습니다. 잠금 해제 후 삭제하세요.");
      return;
    }

    const label = getAppIconVariantLabel(variantId);
    if (!window.confirm?.(`${label} 시안을 App Icon Lab 목록에서 삭제할까요?`)) return;

    updateDesignLabAppIconState({
      ...designLabAppIconState,
      heldIcons: designLabAppIconState.heldIcons.filter((id) => id !== variantId),
      deletedIcons: designLabAppIconState.deletedIcons.includes(variantId)
        ? designLabAppIconState.deletedIcons
        : [...designLabAppIconState.deletedIcons, variantId],
    });
  }, [designLabAppIconState, updateDesignLabAppIconState]);

  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const bufferRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const flashTimerRef = useRef(null);
  const appModeRef = useRef(initialRouteRef.current.appMode);
  const selectedCategoryIdRef = useRef(initialRouteRef.current.categoryId);
  const routeSyncRef = useRef(false);
  const chordChartRef = useRef(null);
  const chordViewerRef = useRef(null);
  const gameStateRef = useRef(GAME_STATES.IDLE);
  const isMobileLayoutRef = useRef(false);
  const speedRef = useRef(RHYTHM_SUBDIVISIONS.One);
  const bpmRef = useRef(initialStage3SettingsRef.current.bpm);
  const metronomeOnRef = useRef(true);
  const metronomeTimeSignatureRef = useRef("4/4");
  const metronomeAccentRef = useRef(true);
  const metronomeSubdivisionRef = useRef("quarter");
  const metronomeToneRef = useRef("tick");
  const metronomeCountInRef = useRef(false);
  const metronomeVolumeRef = useRef(0.72);
  const autoBpmEnabledRef = useRef(false);
  const autoBpmStepRef = useRef(2);
  const autoBpmBarsRef = useRef(10);
  const coachModeEnabledRef = useRef(false);
  const coachPlayBarsRef = useRef(4);
  const coachMuteBarsRef = useRef(4);
  const lastAutoBpmMeasureRef = useRef(0);
  const tapTempoTimesRef = useRef([]);
  const feelRecordingStartRef = useRef(0);
  const feelPressStartRef = useRef(0);
  const feelLastReleaseRef = useRef(0);
  const feelPlaybackTimersRef = useRef([]);
  const feelPlaybackLoopRef = useRef(true);
  const metronomeSampleBuffersRef = useRef({});
  const metronomeSampleLoadPromiseRef = useRef(null);
  const countInActiveRef = useRef(false);
  const countInTimeRef = useRef(0);
  const activeNotesRef = useRef(MAIN_DEFAULT_CATEGORY.notes);
  const sequenceRef = useRef(MAIN_DEFAULT_CATEGORY.sequence);
  const enemiesRef = useRef([]);
  const practiceLoopRef = useRef(MAIN_DEFAULT_CATEGORY.loop !== false);
  const practiceCompletedRef = useRef(false);
  const comboRef = useRef(0);
  const enemyIdRef = useRef(1);
  const patternRef = useRef(0);
  const lastFrameRef = useRef(performance.now());
  const gameTimeRef = useRef(0);
  const chordPracticeIndexRef = useRef(0);
  const nextSpawnAtRef = useRef(0);
  const lastBeatRef = useRef(-1);
  const lastHitRef = useRef({ note: null, time: 0 });
  const lastMissRef = useRef({ note: null, time: 0 });
  const stableGameNoteRef = useRef({ note: null, count: 0 });
  const hitsRef = useRef(0);
  const lastDebugUpdateRef = useRef(0);
  const lastDetectedDisplayUpdateRef = useRef(0);
  const shooterTargetsRef = useRef([]);
  const projectilesRef = useRef([]);
  const particlesRef = useRef([]);
  const shooterTargetIdRef = useRef(1);
  const projectileIdRef = useRef(1);
  const particleIdRef = useRef(1);
  const shooterNextSpawnAtRef = useRef(0);
  const lastShooterNoteRef = useRef(null);
  const lastShooterXRef = useRef(50);
  const shooterReleaseLockRef = useRef(null);
  const shooterLivesRef = useRef(SHOOTER_MAX_LIVES);
  const shooterSoundOnRef = useRef(true);
  const lastShotRef = useRef({ note: null, time: 0 });
  const laneFeedbackIdRef = useRef(1);

  const accuracy = attempts === 0 ? 100 : Math.round((hits / attempts) * 100);
  const beatAccuracy = hits === 0 ? 100 : Math.round((perfectCount / hits) * 100);
  const noteAccuracy = accuracy;
  const mostMissedNote = Object.entries(missedNoteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
  const hasMic = Boolean(streamRef.current);
  const isSignalActive = hasMic && signalLevel >= ACTIVE_SIGNAL_LEVEL;
  const showLowSignalWarning =
    hasMic && gameState !== GAME_STATES.IDLE && signalLevel > 0 && signalLevel < LOW_SIGNAL_LEVEL;

  const micLabel = useMemo(() => {
    if (micStatus === "Permission Denied") return "Permission Denied";
    if (!hasMic) return "No Signal";
    if (gameState === GAME_STATES.PLAYING) {
      return isSignalActive ? "Listening..." : "No Signal";
    }
    return "Mic Connected";
  }, [appMode, gameState, hasMic, isSignalActive, micStatus]);

  const selectedCategory =
    PRACTICE_CATEGORIES.find((category) => category.id === selectedCategoryId) ??
    DEFAULT_CATEGORY;
  const selectedScaleTypeOptions =
    selectedScaleFamily === SCALE_FAMILIES.scale.id ? DIATONIC_SCALE_TYPES : PENTATONIC_TYPES;
  const selectedPentatonic = useMemo(
    () => buildScaleBlockPractice(selectedScaleRoot, selectedScaleType, selectedScaleFamily, selectedScaleBox),
    [selectedScaleBox, selectedScaleFamily, selectedScaleRoot, selectedScaleType],
  );
  const viewerScaleTypeOptions =
    viewerScaleFamily === SCALE_FAMILIES.scale.id ? DIATONIC_SCALE_TYPES : PENTATONIC_TYPES;
  const viewerScaleBlock = useMemo(
    () => buildScaleBlockPractice(viewerScaleRoot, viewerScaleType, viewerScaleFamily, viewerScaleBox),
    [viewerScaleBox, viewerScaleFamily, viewerScaleRoot, viewerScaleType],
  );
  const selectedBuiltChord = useMemo(
    () =>
      CHORD_VIEW_OPTIONS.find(
        (chord) =>
          chord.root === viewerChordRoot &&
          chord.quality === viewerChordQuality &&
          chord.extension === viewerChordExtension,
      ) ?? null,
    [viewerChordExtension, viewerChordQuality, viewerChordRoot],
  );
  const viewerChord = useMemo(
    () =>
      viewerChordId === CHORD_CATALOG_ALL
        ? selectedBuiltChord ?? CHORD_VIEW_OPTIONS[0]
        : CHORD_VIEW_OPTIONS.find((chord) => chord.id === viewerChordId) ?? selectedBuiltChord ?? CHORD_VIEW_OPTIONS[0],
    [selectedBuiltChord, viewerChordId],
  );
  const isChordCatalogView = viewerMode === FRETBOARD_VIEWER_MODES.CHORD && viewerChordId === CHORD_CATALOG_ALL;
  const chordCatalogGroups = useMemo(() => {
    return CHORD_NATURAL_ROOTS
      .map((root) => {
        const rootSet = new Set([root, CHORD_SHARP_ROOTS[root]].filter(Boolean));
        return {
          root,
          sharpRoot: CHORD_SHARP_ROOTS[root] ?? null,
          chords: CHORD_VIEW_OPTIONS.filter((chord) => rootSet.has(chord.root)),
        };
      })
      .filter((group) => group.chords.length > 0);
  }, []);
  const chordRootOptions = CHORD_NATURAL_ROOTS;
  const chordRootHasDiagram = useCallback(
    (root) => CHORD_VIEW_OPTIONS.some((chord) => chord.root === root),
    [],
  );
  const getChordFromSelector = useCallback((baseRoot, accidental, quality, extension) => {
    const lookupRoot = getChordLookupRoot(baseRoot, accidental);
    return CHORD_VIEW_OPTIONS.find(
      (chord) =>
        chord.root === lookupRoot &&
        chord.quality === quality &&
        chord.extension === extension,
    ) ?? null;
  }, []);
  const getFallbackChordFromSelector = useCallback((baseRoot, accidental, quality, extension) => {
    const lookupRoot = getChordLookupRoot(baseRoot, accidental);
    return (
      getChordFromSelector(baseRoot, accidental, quality, extension) ??
      getChordFromSelector(baseRoot, accidental, quality, "none") ??
      CHORD_VIEW_OPTIONS.find((chord) => chord.root === lookupRoot && chord.extension === "none") ??
      CHORD_VIEW_OPTIONS.find((chord) => chord.root === lookupRoot) ??
      null
    );
  }, [getChordFromSelector]);
  const viewerSelectedChordName = getChordNameFromParts(
    viewerChordBaseRoot,
    viewerChordAccidental,
    viewerChordQuality,
    viewerChordExtension,
  );
  const stage3SelectedChordName = getChordNameFromParts(
    stage3ChordBaseRoot,
    stage3ChordAccidental,
    stage3ChordQuality,
    stage3ChordExtension,
  );
  const availableChordExtensionOptions = CHORD_EXTENSION_OPTIONS
    .filter((extension) => extension.quality === "any" || extension.quality === viewerChordQuality)
    .map((extension) => ({
      ...extension,
      disabled: !getChordFromSelector(viewerChordBaseRoot, viewerChordAccidental, viewerChordQuality, extension.id),
      hasDiagram: Boolean(getChordFromSelector(viewerChordBaseRoot, viewerChordAccidental, viewerChordQuality, extension.id)),
    }));
  const getChordStringState = useCallback((chord, stringNumber) => {
    const note = chord?.notes?.find((item) => item.stringNumber === stringNumber);
    if (!note) return "x";
    return Number(note.fretNumber ?? note.fret ?? 0) === 0 ? "o" : "";
  }, []);
  const viewerVisibleFrets = viewerMode === FRETBOARD_VIEWER_MODES.CHORD
    ? viewerChord.visibleFrets
    : viewerScaleBlock.visibleFrets;
  const viewerNotes = viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? viewerChord.notes : viewerScaleBlock.notes;
  const viewerChordDebugInfo = getChordDebugInfo({
    baseRoot: viewerChordBaseRoot,
    accidental: viewerChordAccidental,
    quality: viewerChordQuality,
    extension: viewerChordExtension,
    chord: selectedBuiltChord,
  });
  const viewerTitle = viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? viewerChordDebugInfo.generatedChordName : viewerScaleBlock.label;
  const viewerHint = viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? viewerChord.hint : "선택한 위치만 참고합니다";
  const viewerMapFrets = useMemo(() => Array.from({ length: 16 }, (_, index) => index), []);
  const viewerNotePositionRange = NOTE_VIEWER_POSITIONS.at(-1).range;
  const viewerMapStrings = useMemo(() => [...STANDARD_TUNING].sort((a, b) => a.stringNumber - b.stringNumber), []);
  const viewerMapPitchClasses = useMemo(() => {
    if (viewerMode === FRETBOARD_VIEWER_MODES.NOTE) {
      return viewerNoteFilter === "ALL" ? new Set(CHROMATIC_NOTES) : new Set([viewerNoteFilter]);
    }
    if (viewerMode === FRETBOARD_VIEWER_MODES.SCALE) {
      return new Set(viewerScaleBlock.notes.map((note) => note.noteName));
    }
    if (viewerMode === FRETBOARD_VIEWER_MODES.CHORD) {
      return new Set(viewerChord.notes.map((note) => note.noteName));
    }
    return new Set(CHROMATIC_NOTES);
  }, [viewerChord.notes, viewerMode, viewerNoteFilter, viewerScaleBlock.notes]);
  const viewerMapNotes = useMemo(() => {
    return viewerMapStrings.flatMap((stringInfo) => {
      const openMidi = pitchToMidi(stringInfo.pitch);
      return viewerMapFrets.map((fretNumber) => {
        const pitch = midiToPitch(openMidi + fretNumber);
        const noteName = getPitchClass(pitch);
        const octave = Number(pitch.replace(/\D+/g, ""));
        return {
          id: `viewer-map-s${stringInfo.stringNumber}-f${fretNumber}`,
          stringNumber: stringInfo.stringNumber,
          fretNumber,
          pitch,
          noteName,
          octave,
          solfege: SOLFEGE[noteName] ?? "",
        };
      });
    }).filter((note) => {
      if (!viewerMapPitchClasses.has(note.noteName)) return false;
      if (viewerMode !== FRETBOARD_VIEWER_MODES.NOTE) return note.fretNumber > 0;
      return true;
    });
  }, [viewerMapFrets, viewerMapPitchClasses, viewerMapStrings, viewerMode, viewerNotePositionRange]);
  const viewerMapTitle =
    viewerMode === FRETBOARD_VIEWER_MODES.NOTE
      ? viewerNoteFilter === "ALL" ? "전체 음표" : `${viewerNoteFilter} / ${SOLFEGE[viewerNoteFilter] ?? ""}`
      : viewerMode === FRETBOARD_VIEWER_MODES.SCALE
        ? viewerScaleBlock.label
        : viewerMode === FRETBOARD_VIEWER_MODES.CHORD
          ? viewerChordDebugInfo.generatedChordName
          : "기타 지판 정보";
  const viewerChordPositionData = useMemo(() => {
    if (viewerMode !== FRETBOARD_VIEWER_MODES.CHORD) return {};
    const root = viewerChord.root;
    const position1 = {
      id: `${viewerChord.id}-position1`,
      notes: viewerChord.notes
        .map((note, index) => ({
          id: `viewer-chord-shape-${viewerChord.id}-${note.stringNumber}-${note.fretNumber}-${index}`,
          stringNumber: note.stringNumber,
          fretNumber: Number(note.fretNumber),
          pitch: note.octaveNote,
          noteName: note.noteName,
          label: getChordDisplayNoteName(note.noteName),
          finger: note.finger ?? null,
          isRoot: false,
        }))
        .filter((note) => Number.isFinite(note.fretNumber) && note.fretNumber > 0),
      barres: viewerChord.barres ?? [],
      stringStates: Object.fromEntries(
        [1, 2, 3, 4, 5, 6]
          .map((stringNumber) => [stringNumber, getChordStringState(viewerChord, stringNumber)])
          .filter(([, state]) => state === "x" || state === "o"),
      ),
    };
    const canBuildMajorCaged = viewerChordQuality === "major" && viewerChordExtension === "none" && NOTE_INDEX[root] != null;
    return {
      position1,
      position2: canBuildMajorCaged ? buildCagedMajorChordPosition(root, "position2") : null,
      position3: canBuildMajorCaged ? buildCagedMajorChordPosition(root, "position3") : null,
      position4: canBuildMajorCaged ? buildCagedMajorChordPosition(root, "position4") : null,
      position5: canBuildMajorCaged ? buildCagedMajorChordPosition(root, "position5") : null,
    };
  }, [getChordStringState, viewerChord, viewerChordExtension, viewerChordQuality, viewerMode]);
  const viewerCurrentChordPosition = viewerChordPositionData[viewerChordPosition] ?? viewerChordPositionData.position1;
  const viewerFretboardNotes = useMemo(() => {
    if (viewerMode === FRETBOARD_VIEWER_MODES.SCALE) return viewerScaleBlock.notes;
    if (viewerMode !== FRETBOARD_VIEWER_MODES.CHORD) return viewerMapNotes;
    return viewerCurrentChordPosition?.notes ?? [];
  }, [viewerCurrentChordPosition, viewerMapNotes, viewerMode, viewerScaleBlock.notes]);
  const viewerChordBarres = viewerMode === FRETBOARD_VIEWER_MODES.CHORD
    ? viewerCurrentChordPosition?.barres ?? []
    : [];
  const viewerChordStringStates = viewerMode === FRETBOARD_VIEWER_MODES.CHORD
    ? viewerCurrentChordPosition?.stringStates ?? {}
    : {};
  const viewerFretboardRange = useMemo(() => {
    if (viewerMode === FRETBOARD_VIEWER_MODES.NOTE) return viewerNotePositionRange;
    if (viewerMode === FRETBOARD_VIEWER_MODES.SCALE) {
      const visibleFrets = viewerScaleBlock.visibleFrets ?? [];
      const minFret = Math.min(...visibleFrets);
      const maxFret = Math.max(...visibleFrets);
      if (!Number.isFinite(minFret) || !Number.isFinite(maxFret)) return [0, 12];
      return [minFret, Math.max(maxFret, minFret + 3)];
    }
    if (viewerMode !== FRETBOARD_VIEWER_MODES.CHORD) return [0, 12];
    const frets = [
      ...viewerFretboardNotes.map((note) => Number(note.fretNumber)),
      ...viewerChordBarres.map((barre) => Number(barre.fret)),
    ].filter((fret) => Number.isFinite(fret) && fret > 0);
    if (!frets.length) return [1, 3];
    const minFret = Math.min(...frets);
    const maxFret = Math.max(...frets);
    if (minFret <= 3) return [1, Math.max(3, maxFret)];
    return [minFret, Math.max(maxFret, minFret + 3)];
  }, [viewerChordBarres, viewerFretboardNotes, viewerMode, viewerNotePositionRange, viewerScaleBlock.visibleFrets]);
  const viewerShouldFitFretboard =
    viewerMode === FRETBOARD_VIEWER_MODES.SCALE ||
    viewerMode === FRETBOARD_VIEWER_MODES.CHORD ||
    (viewerMode === FRETBOARD_VIEWER_MODES.NOTE && viewerOctaveRange !== "all");
  useEffect(() => {
    if (viewerMode !== FRETBOARD_VIEWER_MODES.CHORD) return;
    if (viewerChordPositionData[viewerChordPosition]) return;
    setViewerChordPosition("position1");
  }, [viewerChordPosition, viewerChordPositionData, viewerMode]);
  const stage3SelectedChord = CHORD_VIEW_OPTIONS.find(
    (chord) =>
      chord.root === stage3ChordRoot &&
      chord.quality === stage3ChordQuality &&
      chord.extension === stage3ChordExtension,
  ) ?? null;
  const stage3AvailableExtensionOptions = CHORD_EXTENSION_OPTIONS
    .filter((extension) => extension.quality === "any" || extension.quality === stage3ChordQuality)
    .map((extension) => ({
      ...extension,
      disabled: !getChordFromSelector(stage3ChordBaseRoot, stage3ChordAccidental, stage3ChordQuality, extension.id),
      hasDiagram: Boolean(getChordFromSelector(stage3ChordBaseRoot, stage3ChordAccidental, stage3ChordQuality, extension.id)),
    }));
  const stage3ChordDebugInfo = getChordDebugInfo({
    baseRoot: stage3ChordBaseRoot,
    accidental: stage3ChordAccidental,
    quality: stage3ChordQuality,
    extension: stage3ChordExtension,
    chord: stage3SelectedChord,
  });
  const applyViewerChordSelection = useCallback((baseRoot, accidental, quality, extension) => {
    const exactChord = getChordFromSelector(baseRoot, accidental, quality, extension);
    const nextChord = exactChord ?? getFallbackChordFromSelector(baseRoot, accidental, quality, extension);
    const nextQuality = exactChord ? quality : nextChord?.quality ?? quality;
    const nextExtension = exactChord ? extension : nextChord?.extension ?? "none";
    setViewerChordBaseRoot(baseRoot);
    setViewerChordAccidental(accidental);
    setViewerChordRoot(getChordLookupRoot(baseRoot, accidental));
    setViewerChordQuality(nextQuality);
    setViewerChordExtension(nextExtension);
    if (nextChord) setViewerChordId(nextChord.id);
  }, [getChordFromSelector, getFallbackChordFromSelector]);
  const scrollToChordChart = useCallback(() => {
    setViewerChordId(CHORD_CATALOG_ALL);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        chordChartRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }, []);
  const scrollToChordViewer = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        chordViewerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }, []);
  const applyStage3ChordSelection = useCallback((baseRoot, accidental, quality, extension) => {
    const exactChord = getChordFromSelector(baseRoot, accidental, quality, extension);
    const nextChord = exactChord ?? getFallbackChordFromSelector(baseRoot, accidental, quality, extension);
    const nextQuality = exactChord ? quality : nextChord?.quality ?? quality;
    const nextExtension = exactChord ? extension : nextChord?.extension ?? "none";
    setStage3ChordBaseRoot(baseRoot);
    setStage3ChordAccidental(accidental);
    setStage3ChordRoot(getChordLookupRoot(baseRoot, accidental));
    setStage3ChordQuality(nextQuality);
    setStage3ChordExtension(nextExtension);
  }, [getChordFromSelector, getFallbackChordFromSelector]);
  const buildStage3Progression = useCallback((entries = []) => entries
    .map((entry) => {
      const chord = CHORD_VIEW_OPTIONS.find((item) => item.id === getChordEntryId(entry));
      if (!chord) return null;
      const displayName = getChordEntryLabel(entry, chord);
      return {
        ...chord,
        fretboardDisplayName: chord.displayName,
        displayName,
        isEnharmonic: displayName !== chord.displayName,
      };
    })
    .filter(Boolean), []);
  const chordTransitionProgression = buildStage3Progression(stage3ChordIds);
  const hasChordTransitionProgression = chordTransitionProgression.length > 0;
  const stage3StorageProgression = buildStage3Progression(stage3StorageChordIds);
  const hasStage3StorageProgression = stage3StorageProgression.length > 0;
  const stage3ProgressionLabel = hasChordTransitionProgression
    ? chordTransitionProgression.map((chord) => chord.displayName).join(" - ")
    : "진행 없음";
  const stage3StorageProgressionLabel = hasStage3StorageProgression
    ? stage3StorageProgression.map((chord) => chord.displayName).join(" - ")
    : "진행 없음";
  const selectedStage3LibraryItem = chordProgressionId.startsWith("slot:")
    ? stage3QuickSlots.find((slot) => slot.id === chordProgressionId.slice(5)) ?? null
    : null;
  const selectedStage3StorageItem = stage3QuickSlots.find((slot) => slot.id === stage3StorageSelectedId) ?? null;
  const applyStage3LibraryItem = useCallback((item) => {
    if (!item?.chordIds?.length) return;
    setChordProgressionId(`slot:${item.id}`);
    setStage3ChordIds(item.chordIds);
    setLoadedStage3LibraryItem(item);
    setBpm(clampBpm(item.bpm ?? bpm));
    setMetronomeTimeSignature(item.time_signature ?? "4/4");
    setMetronomeSubdivision(item.subdivision ?? "quarter");
    setMetronomeTone(item.sound ?? "tick");
    setChordPracticeIndex(0);
    gameTimeRef.current = 0;
    lastBeatRef.current = -1;
    setBeat(0);
    setStage3MeasureProgress(0);
  }, [bpm]);
  const updateLoadedStage3Memo = useCallback((memo) => {
    const loadedId = loadedStage3LibraryItem?.id;
    if (!loadedId) return;
    setLoadedStage3LibraryItem((item) => (item?.id === loadedId ? { ...item, memo } : item));
    setStage3QuickSlots((slots) => slots.map((slot) => (slot.id === loadedId ? { ...slot, memo } : slot)));
    if (stage3StorageEditingId === loadedId) {
      setStage3StorageMemo(memo);
    }
  }, [loadedStage3LibraryItem?.id, stage3StorageEditingId]);
  const setStage3ProgressIndex = useCallback((index) => {
    const progressionLength = Math.max(1, chordTransitionProgression.length);
    const safeIndex = ((Number(index) || 0) % progressionLength + progressionLength) % progressionLength;
    const signature = getTimeSignatureOption(metronomeTimeSignatureRef.current);
    const currentMeasureMs = getBeatMs(bpmRef.current) * signature.beats;
    chordPracticeIndexRef.current = safeIndex;
    gameTimeRef.current = safeIndex * currentMeasureMs;
    lastBeatRef.current = -1;
    setChordPracticeIndex(safeIndex);
    setBeat(0);
    setStage3MeasureProgress(0);
  }, [chordTransitionProgression.length]);
  const openStage3Storage = useCallback(() => {
    const item = selectedStage3LibraryItem ?? stage3QuickSlots[0] ?? null;
    if (item) setStage3StorageSelectedId(item.id);
    setStage3StorageTitle(item?.title ?? (hasChordTransitionProgression ? `내 진행 ${stage3QuickSlots.length + 1}` : "내 진행"));
    setStage3StorageMemo(item?.memo ?? "");
    setStage3StorageEditingId(item?.id ?? "");
    setStage3StorageChordIds(item?.chordIds ?? stage3ChordIds);
    setStage3StorageBpm(clampBpm(item?.bpm ?? bpm));
    setStage3StorageTimeSignature(item?.time_signature ?? metronomeTimeSignature);
    setStage3StorageCapo(Number.isFinite(Number(item?.capo)) ? Number(item.capo) : 0);
    {
      const strumPattern = normalizeStrumPattern(item?.strum_pattern);
      setStage3StorageStrumPattern(strumPattern);
      setStage3StorageStrumDraftPattern(strumPattern);
    }
    setStage3StorageOpen(true);
  }, [bpm, hasChordTransitionProgression, metronomeTimeSignature, selectedStage3LibraryItem, stage3ChordIds, stage3QuickSlots]);
  const saveStage3StorageItem = useCallback((mode = "update") => {
    if (!hasStage3StorageProgression) return;
    const id = stage3StorageEditingId && !stage3StorageEditingId.startsWith("preset-")
      ? stage3StorageEditingId
      : `slot-${Date.now()}`;
    const item = makeStage3LibraryItem({
      id,
      title: stage3StorageTitle,
      chordIds: stage3StorageChordIds,
      bpm: stage3StorageBpm,
      timeSignature: stage3StorageTimeSignature,
      subdivision: metronomeSubdivision,
      sound: metronomeTone,
      capo: stage3StorageCapo,
      strum_pattern: stage3StorageStrumPattern,
      memo: stage3StorageMemo,
    });
    setStage3QuickSlots((slots) => [item, ...slots.filter((slot) => slot.id !== id)].slice(0, 24));
    if (loadedStage3LibraryItem?.id === id) {
      setChordProgressionId("custom");
    }
    setStage3StorageEditingId(id);
    setStage3StorageSelectedId(id);
  }, [hasStage3StorageProgression, loadedStage3LibraryItem?.id, metronomeSubdivision, metronomeTone, stage3StorageBpm, stage3StorageCapo, stage3StorageChordIds, stage3StorageEditingId, stage3StorageMemo, stage3StorageStrumPattern, stage3StorageTimeSignature, stage3StorageTitle]);
  const addStage3StrumPatternDraft = useCallback((slotIndex = 0) => {
    const normalizedPattern = normalizeStrumPattern(stage3StorageStrumDraftPattern);
    if (!normalizedPattern.length) return;
    setStage3StorageStrumPattern((pattern) => {
      const groups = normalizeStrumPatternGroups(pattern);
      const nextGroups = [groups[0] ?? [], groups[1] ?? []];
      nextGroups[slotIndex] = normalizedPattern;
      return nextGroups;
    });
  }, [stage3StorageStrumDraftPattern]);
  const editStage3StorageItem = useCallback((item) => {
    if (!item) return;
    setStage3StorageSelectedId(item.id);
    setStage3StorageTitle(item.title);
    setStage3StorageMemo(item.memo ?? "");
    setStage3StorageEditingId(item.id);
    setStage3StorageChordIds(item.chordIds ?? []);
    setStage3StorageBpm(clampBpm(item.bpm ?? bpm));
    setStage3StorageTimeSignature(item.time_signature ?? "4/4");
    setStage3StorageCapo(Number.isFinite(Number(item.capo)) ? Number(item.capo) : 0);
    {
      const strumPatternGroups = normalizeStrumPatternGroups(item.strum_pattern);
      const firstPattern = strumPatternGroups.find((row) => row.length) ?? [];
      setStage3StorageStrumPattern(strumPatternGroups);
      setStage3StorageStrumDraftPattern(firstPattern);
    }
  }, [bpm]);
  const copyStage3StorageItem = useCallback((item) => {
    if (!item) return;
    const copied = makeStage3LibraryItem({
      ...item,
      id: `slot-${Date.now()}`,
      title: `${item.title} 복사`,
      chordIds: item.chordIds,
    });
    setStage3QuickSlots((slots) => [copied, ...slots].slice(0, 24));
    setStage3StorageSelectedId(copied.id);
    setStage3StorageTitle(copied.title);
    setStage3StorageMemo(copied.memo ?? "");
    setStage3StorageEditingId(copied.id);
    setStage3StorageChordIds(copied.chordIds ?? []);
    setStage3StorageBpm(clampBpm(copied.bpm));
    setStage3StorageTimeSignature(copied.time_signature ?? "4/4");
    setStage3StorageCapo(copied.capo ?? 0);
    {
      const strumPatternGroups = normalizeStrumPatternGroups(copied.strum_pattern);
      const firstPattern = strumPatternGroups.find((row) => row.length) ?? [];
      setStage3StorageStrumPattern(strumPatternGroups);
      setStage3StorageStrumDraftPattern(firstPattern);
    }
  }, []);
  const deleteStage3StorageItem = useCallback((id) => {
    const next = stage3QuickSlots.filter((slot) => slot.id !== id);
    setStage3QuickSlots(next);
    const fallback = next[0] ?? null;
    if (chordProgressionId === `slot:${id}`) {
      setChordProgressionId("custom");
      setStage3ChordIds(getDefaultStage3ChordIds());
      setLoadedStage3LibraryItem(null);
    }
    if (stage3StorageSelectedId === id) {
      setStage3StorageSelectedId(fallback?.id ?? "");
    }
    if (stage3StorageEditingId === id) {
      setStage3StorageEditingId("");
      setStage3StorageTitle("내 진행");
      setStage3StorageMemo("");
      setStage3StorageChordIds([]);
      setStage3StorageStrumPattern([]);
      setStage3StorageStrumDraftPattern([]);
    }
  }, [chordProgressionId, stage3QuickSlots, stage3StorageEditingId, stage3StorageSelectedId]);
  const addStage3StrumStep = useCallback((direction, hit) => {
    setStage3StorageStrumDraftPattern((pattern) => [
      ...normalizeStrumPattern(pattern),
      { direction, hit },
    ].slice(0, 12));
  }, []);
  const addStage3StrumPair = useCallback(() => {
    setStage3StorageStrumDraftPattern((pattern) => [
      ...normalizeStrumPattern(pattern),
      { direction: "down", hit: false },
      { direction: "up", hit: false },
    ].slice(0, 12));
  }, []);
  const toggleStage3StrumHit = useCallback((index) => {
    setStage3StorageStrumDraftPattern((pattern) =>
      normalizeStrumPattern(pattern).map((step, stepIndex) =>
        stepIndex === index ? { ...step, hit: !step.hit } : step,
      ),
    );
  }, []);
  const chordPracticeCurrent =
    hasChordTransitionProgression
      ? chordTransitionProgression[chordPracticeIndex % chordTransitionProgression.length]
      : stage3SelectedChord ?? CHORD_VIEW_OPTIONS[0];
  const chordPracticeNext =
    hasChordTransitionProgression
      ? chordTransitionProgression[(chordPracticeIndex + 1) % chordTransitionProgression.length]
      : chordPracticeCurrent;
  const chordPracticeUpcoming =
    hasChordTransitionProgression
      ? chordTransitionProgression[(chordPracticeIndex + 2) % chordTransitionProgression.length]
      : chordPracticeNext;
  const getPlayableCategory = useCallback((category = selectedCategory) => {
    const safeCategory = normalizePracticeCategory(category);
    if (safeCategory.id !== "scale-block") return safeCategory;
    return {
      ...safeCategory,
      title: "포지션 기반 지판 훈련",
      subtitle: "선택한 블록을 연습해요",
      modeLabel: selectedPentatonic.label,
      notes: selectedPentatonic.notes,
      sequence: selectedPentatonic.sequence,
    };
  }, [selectedCategory, selectedPentatonic]);
  const currentJudgmentMode = getJudgmentMode(
    appMode === APP_MODES.SHOOTER ? JUDGMENT_MODES.PITCH.id : selectedCategory.judgmentMode,
  );
  const isPositionPracticeMode = currentJudgmentMode.id === JUDGMENT_MODES.POSITION.id;
  const beatMs = getBeatMs(bpm);
  const metronomeBeatsPerMeasure = getTimeSignatureOption(metronomeTimeSignature).beats;
  const resetScore = useCallback(() => {
    enemiesRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    comboRef.current = 0;
    enemyIdRef.current = 1;
    patternRef.current = 0;
    practiceCompletedRef.current = false;
    gameTimeRef.current = 0;
    nextSpawnAtRef.current = 0;
    lastBeatRef.current = -1;
    lastHitRef.current = { note: null, time: 0 };
    setEnemies([]);
    setProjectiles([]);
    setParticles([]);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHits(0);
    setAttempts(0);
    setPerfectCount(0);
    setMissCount(0);
    setMissedNoteCounts({});
    hitsRef.current = 0;
    setBeat(0);
    setStage3MeasureProgress(0);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setLaneFeedback([]);
    setStageFlash("");
    setReferenceStepTick((value) => value + 1);
    shooterTargetsRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    shooterNextSpawnAtRef.current = 0;
    lastShooterNoteRef.current = null;
    lastShooterXRef.current = 50;
    shooterReleaseLockRef.current = null;
    shooterLivesRef.current = SHOOTER_MAX_LIVES;
    lastShotRef.current = { note: null, time: 0 };
    setShooterTargets([]);
    setProjectiles([]);
    setParticles([]);
    setShooterAim(undefined);
    setShooterLives(SHOOTER_MAX_LIVES);
    setFeedback("Ready");
  }, []);

  const getPracticeSequence = useCallback((category = selectedCategory, direction = scaleDirection) => {
    const safeCategory = normalizePracticeCategory(category);
    const base = safeCategory.sequence;
    let sequence = base;
    if (safeCategory.id === "first-position") {
      if (direction === SCALE_DIRECTIONS.ASC) sequence = FIRST_POSITION_ASCENDING_SEQUENCE;
      else if (direction === SCALE_DIRECTIONS.DESC) sequence = [...FIRST_POSITION_ASCENDING_SEQUENCE].reverse();
      else sequence = FIRST_POSITION_SEQUENCE;
    } else if (safeCategory.id === "scale-block") {
      if (direction === SCALE_DIRECTIONS.DESC) sequence = [...base].reverse();
      else if (direction === SCALE_DIRECTIONS.LOOP) sequence = [...base, ...base.slice(0, -1).reverse()];
    }
    if ((safeCategory.id === "first-position" || safeCategory.id === "scale-block") && repeatPractice) {
      sequence = repeatSequence(sequence, repeatCount);
    }
    return expandSequenceForSubdivision(sequence, speedRef.current);
  }, [repeatCount, repeatPractice, scaleDirection, selectedCategory]);

  const setState = useCallback((nextState) => {
    gameStateRef.current = nextState;
    setGameState(nextState);
  }, []);

  const flashStage = useCallback((type) => {
    if (isMobileLayoutRef.current && appModeRef.current === APP_MODES.PRACTICE && type === "miss") {
      return;
    }
    window.clearTimeout(flashTimerRef.current);
    setStageFlash(type);
    flashTimerRef.current = window.setTimeout(() => setStageFlash(""), 150);
  }, []);

  const showLaneFeedback = useCallback((note, label) => {
    if (!note?.stringNumber) return;
    const id = laneFeedbackIdRef.current++;
    setLaneFeedback((items) => [
      ...items.slice(-5),
      { id, label, stringNumber: note.stringNumber, shortLabel: label === "Miss" ? "MISS" : "HIT" },
    ]);
    window.setTimeout(() => {
      setLaneFeedback((items) => items.filter((item) => item.id !== id));
    }, 850);
  }, []);

  const loadMetronomeSamples = useCallback(async (audio) => {
    if (!audio) return false;
    const sampleToneOptions = METRONOME_TONE_OPTIONS.filter((toneOption) => toneOption.src);
    const loadedIds = Object.keys(metronomeSampleBuffersRef.current);
    if (loadedIds.length === sampleToneOptions.length) return true;
    if (metronomeSampleLoadPromiseRef.current) {
      await metronomeSampleLoadPromiseRef.current;
      return Object.keys(metronomeSampleBuffersRef.current).length > 0;
    }

    metronomeSampleLoadPromiseRef.current = Promise.all(
      sampleToneOptions.map(async (toneOption) => {
        if (metronomeSampleBuffersRef.current[toneOption.id]) return;
        const response = await fetch(toneOption.src);
        if (!response.ok) throw new Error(`Failed to load metronome sample: ${toneOption.src}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audio.decodeAudioData(arrayBuffer);
        metronomeSampleBuffersRef.current[toneOption.id] = audioBuffer;
      }),
    ).finally(() => {
      metronomeSampleLoadPromiseRef.current = null;
    });

    await metronomeSampleLoadPromiseRef.current;
    return true;
  }, []);

  const ensureAudioReady = useCallback(async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audio = audioRef.current;
    if (!audio || audio.state === "closed") {
      audio = AudioContext ? new AudioContext() : null;
      if (audio) console.log("[metronome] audio context created");
    }
    if (!audio) return false;
    audioRef.current = audio;
    if (audio.state === "suspended") {
      await audio.resume();
      console.log("[metronome] audio context resumed");
    }
    return audio.state === "running";
  }, []);

  const playTick = useCallback((accent = false, subdivisionIndex = 0) => {
    const audio = audioRef.current;
    if (!audio || gameStateRef.current !== GAME_STATES.PLAYING || !metronomeOnRef.current) return;
    if (audio.state === "suspended") {
      audio.resume()
        .then(() => {
          if (gameStateRef.current === GAME_STATES.PLAYING && metronomeOnRef.current) playTick(accent, subdivisionIndex);
        })
        .catch(() => {});
      return;
    }

    const now = audio.currentTime;
    const selectedTone = getMetronomeToneOption(metronomeToneRef.current);
    const accentOn = metronomeAccentRef.current;
    const masterLevel = Math.max(0, Math.min(1, metronomeVolumeRef.current ?? 0.72));
    const tickLevel = (accentOn ? (accent ? 1 : 0.5) : 0.82) * masterLevel;

    if (selectedTone.id === "tick") {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(accentOn ? (accent ? 1840 : 920) : 1180, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(tickLevel * 0.4, now + (accentOn && accent ? 0.003 : 0.008));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (accentOn && accent ? 0.07 : 0.05));
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.07);
      console.log("[metronome] tick played");
      return;
    }

    const buffer = metronomeSampleBuffersRef.current[selectedTone.id];
    if (!buffer) return;

    const source = audio.createBufferSource();
    const gain = audio.createGain();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(accentOn ? (accent ? 1.08 : 0.96) : 1, now);
    gain.gain.setValueAtTime(tickLevel, now);
    source.connect(gain);
    gain.connect(audio.destination);
    source.start(now);
    console.log("[metronome] tick played");
  }, []);

  const playFeelRecorderPulse = useCallback(async (type = "tick") => {
    const ready = await ensureAudioReady();
    const audio = audioRef.current;
    if (!ready || !audio) return;

    const now = audio.currentTime;
    const hold = type === "hold";
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = hold ? "triangle" : "square";
    oscillator.frequency.setValueAtTime(hold ? 520 : 960, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime((hold ? 0.34 : 0.22) * metronomeVolumeRef.current, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (hold ? 0.34 : 0.085));
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + (hold ? 0.38 : 0.1));
  }, [ensureAudioReady]);

  const playShooterSound = useCallback((type = "hit") => {
    const audio = audioRef.current;
    if (!audio || appModeRef.current !== APP_MODES.SHOOTER || !shooterSoundOnRef.current) return;
    if (audio.state === "suspended") {
      audio.resume().catch(() => {});
    }

    const now = audio.currentTime;
    const master = audio.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    master.connect(audio.destination);

    const playTone = ({ wave = "sine", from = 440, to = from, start = 0, length = 0.2, level = 0.45 }) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const filter = audio.createBiquadFilter();
      const begin = now + start;
      const end = begin + length;
      oscillator.type = wave;
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1800, begin);
      filter.frequency.exponentialRampToValueAtTime(760, end);
      oscillator.frequency.setValueAtTime(from, begin);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), end);
      gain.gain.setValueAtTime(0.0001, begin);
      gain.gain.exponentialRampToValueAtTime(level, begin + 0.026);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      oscillator.start(begin);
      oscillator.stop(end + 0.02);
    };

    if (type === "spawn") {
      master.gain.exponentialRampToValueAtTime(0.13, now + 0.012);
      playTone({ wave: "triangle", from: 620, to: 920, length: 0.11, level: 0.42 });
      playTone({ wave: "sine", from: 1240, to: 980, start: 0.035, length: 0.08, level: 0.18 });
      return;
    }

    if (type === "miss") {
      master.gain.exponentialRampToValueAtTime(0.1, now + 0.018);
      playTone({ wave: "triangle", from: 220, to: 110, length: 0.26, level: 0.34 });
      playTone({ wave: "sine", from: 165, to: 82, start: 0.08, length: 0.22, level: 0.2 });
      return;
    }

    if (type === "gameover") {
      master.gain.exponentialRampToValueAtTime(0.12, now + 0.018);
      playTone({ wave: "sine", from: 330, to: 220, length: 0.24, level: 0.38 });
      playTone({ wave: "sine", from: 247, to: 123, start: 0.14, length: 0.3, level: 0.3 });
      return;
    }

    master.gain.exponentialRampToValueAtTime(0.2, now + 0.012);
    playTone({ wave: "triangle", from: 330, to: 660, length: 0.12, level: 0.52 });
    playTone({ wave: "sine", from: 990, to: 1320, start: 0.045, length: 0.1, level: 0.28 });
  }, []);

  const createTargetPosition = useCallback((index) => {
    const positions = [
      { x: 18, y: 28 },
      { x: 50, y: 20 },
      { x: 82, y: 30 },
      { x: 30, y: 52 },
      { x: 70, y: 54 },
    ];
    return positions[index % positions.length];
  }, []);

  const spawnEnemy = useCallback((scheduledSpawnAt = gameTimeRef.current) => {
    const sequence = Array.isArray(sequenceRef.current) && sequenceRef.current.length > 0
      ? sequenceRef.current
      : DEFAULT_CATEGORY.sequence;
    const noteList =
      Array.isArray(activeNotesRef.current) && activeNotesRef.current.length > 0
        ? activeNotesRef.current
        : DEFAULT_CATEGORY.notes;
    if (!practiceLoopRef.current && patternRef.current >= sequence.length) {
      practiceCompletedRef.current = true;
      return false;
    }

    const sequenceIndex = practiceLoopRef.current
      ? patternRef.current % sequence.length
      : patternRef.current;
    const sequenceStep = sequence[sequenceIndex];
    const noteName = getSequenceStepNoteName(sequenceStep);
    const isGhost = Boolean(sequenceStep?.ghost);
    patternRef.current += 1;
    const detail = noteList.find((note) => note.pitch === noteName) ?? DEFAULT_CATEGORY.notes[0];
    const fallDuration = getBeatMs(bpmRef.current) * speedRef.current.beats;

    enemiesRef.current = [
      ...enemiesRef.current,
      {
        id: enemyIdRef.current++,
        note: detail.pitch,
        detail,
        ghost: isGhost,
        spawnAt: scheduledSpawnAt,
        hitAt: scheduledSpawnAt + fallDuration,
      },
    ];
    return true;
  }, []);

  const spawnShooterTarget = useCallback(() => {
    if (gameStateRef.current === GAME_STATES.GAMEOVER) return false;
    const level = getShooterLevel(hitsRef.current);
    const pool = getShooterPool(activeNotesRef.current, level);
    const detail = pickShooterNote(pool, lastShooterNoteRef.current, level);
    const nextX = getShooterSpawnX(lastShooterXRef.current);
    lastShooterNoteRef.current = detail;
    lastShooterXRef.current = nextX;
    patternRef.current += 1;
    shooterTargetsRef.current = [
      ...shooterTargetsRef.current,
      {
        id: shooterTargetIdRef.current++,
        note: detail.pitch,
        detail,
        x: nextX,
        y: 8,
        bornAt: gameTimeRef.current,
        duration: getBeatMs(bpmRef.current) * level.durationBeats,
        level: level.name,
      },
    ];
    shooterNextSpawnAtRef.current =
      gameTimeRef.current + getBeatMs(bpmRef.current) * level.spawnGapBeats * (0.72 + Math.random() * 0.56);
    setShooterTargets([...shooterTargetsRef.current]);
    playShooterSound("spawn");
    return true;
  }, [playShooterSound]);

  const judgeReferenceNote = useCallback(
    (detectedPitchName) => {
      const now = performance.now();
      if (selectedCategory.id === "rhythm") return;
      if (lastHitRef.current.note === detectedPitchName && now - lastHitRef.current.time < 260) return;

      const sequence = Array.isArray(sequenceRef.current) && sequenceRef.current.length > 0
        ? sequenceRef.current
        : selectedCategory.sequence;
      const noteList =
        Array.isArray(activeNotesRef.current) && activeNotesRef.current.length > 0
          ? activeNotesRef.current
          : selectedCategory.notes;
      if (!sequence?.length || !noteList?.length) return;
      if (!practiceLoopRef.current && patternRef.current >= sequence.length) {
        setFeedback("Complete");
        setState(GAME_STATES.IDLE);
        return;
      }

      const sequenceIndex = practiceLoopRef.current
        ? patternRef.current % sequence.length
        : patternRef.current;
      const sequenceStep = sequence[sequenceIndex];
      const targetPitch = getSequenceStepNoteName(sequenceStep);
      const target = noteList.find((note) => note.pitch === targetPitch || note.octaveNote === targetPitch);
      if (!target || target.pitch !== detectedPitchName) return;

      lastHitRef.current = { note: detectedPitchName, time: now };
      setFeedback("Hit");
      setScore((value) => value + 50);
      setCombo((value) => {
        const next = value + 1;
        comboRef.current = next;
        setMaxCombo((current) => Math.max(current, next));
        return next;
      });
      setHits((value) => {
        const next = value + 1;
        hitsRef.current = next;
        return next;
      });
      setAttempts((value) => value + 1);
      flashStage("hit");
    },
    [flashStage, selectedCategory, setState],
  );

  const judgeNote = useCallback(
    (detectedPitchName) => {
      const now = gameTimeRef.current;
      if (lastHitRef.current.note === detectedPitchName && now - lastHitRef.current.time < 240) {
        return;
      }

      const target = enemiesRef.current
        .filter((enemy) => !enemy.ghost && (enemy.note === detectedPitchName || enemy.detail?.pitch === detectedPitchName))
        .map((enemy) => ({ ...enemy, distance: Math.abs(enemy.hitAt - now) }))
        .filter((enemy) => enemy.distance <= HIT_WINDOW_MS)
        .sort((a, b) => a.distance - b.distance)[0];

      if (!target) return;

      const perfect = target.distance <= PERFECT_WINDOW_MS;
      lastHitRef.current = { note: detectedPitchName, time: now };
      enemiesRef.current = enemiesRef.current.filter((enemy) => enemy.id !== target.id);
      setFeedback("Hit");
      showLaneFeedback(target.detail, "Hit");
      if (perfect) setPerfectCount((value) => value + 1);
      setScore((value) => value + (perfect ? 100 : 60));
      setCombo((value) => {
        const next = value + 1;
        comboRef.current = next;
        setMaxCombo((current) => Math.max(current, next));
        return next;
      });
      setHits((value) => {
        const next = value + 1;
        hitsRef.current = next;
        return next;
      });
      setAttempts((value) => value + 1);
      flashStage("hit");
    },
    [flashStage, showLaneFeedback],
  );

  const fireProjectile = useCallback((target, noteName) => {
    const aimShift = clampValue((target.x - 58) * 0.34, -18, 18);
    const muzzleX = clampValue(52 + aimShift * 0.09, 49, 55);
    const muzzleY = 84;
    const nextAim = {
      "--aim-shift": `${aimShift}px`,
      "--aim-tilt": `${clampValue((target.x - 58) * 0.1, -6, 6)}deg`,
      "--guitar-aim": `${clampValue((target.x - 50) * 0.18 - (82 - target.y) * 0.04, -14, 12)}deg`,
      "--arm-aim": `${clampValue((target.x - 50) * 0.22 - (82 - target.y) * 0.05, -18, 16)}deg`,
    };
    setShooterAim(nextAim);

    projectilesRef.current = [
      ...projectilesRef.current,
      {
        id: projectileIdRef.current++,
        note: noteName,
        startX: muzzleX,
        startY: muzzleY,
        endX: target.x,
        endY: target.y,
        bornAt: gameTimeRef.current,
        duration: 180,
      },
    ];

    particlesRef.current = [
      ...particlesRef.current,
      ...Array.from({ length: 8 }, (_, index) => ({
        id: particleIdRef.current++,
        x: target.x,
        y: target.y,
        angle: (index / 8) * Math.PI * 2,
        bornAt: gameTimeRef.current,
      })),
    ];
  }, []);

  const judgeShooterNote = useCallback(
    (detectedPitchName) => {
      const now = gameTimeRef.current;
      if (shooterReleaseLockRef.current === detectedPitchName) return;
      if (lastShotRef.current.note === detectedPitchName && now - lastShotRef.current.time < 220) return;

      const orderedTargets = shooterTargetsRef.current
        .map((target, index) => ({ target, index }))
        .sort((a, b) => b.target.y - a.target.y || a.target.bornAt - b.target.bornAt);
      const frontTarget = orderedTargets[0] ?? null;
      const target = frontTarget?.target ?? null;
      const targetIndex = frontTarget?.index ?? -1;
      const matchesFrontTarget = target?.note === detectedPitchName;
      lastShotRef.current = { note: detectedPitchName, time: now };
      shooterReleaseLockRef.current = detectedPitchName;

      if (!target || !matchesFrontTarget) {
        setFeedback("Miss");
        comboRef.current = 0;
        setCombo(0);
        flashStage("miss");
        playShooterSound("miss");
        return;
      }

      shooterTargetsRef.current = shooterTargetsRef.current.filter((_, index) => index !== targetIndex);
      setShooterTargets([...shooterTargetsRef.current]);
      fireProjectile(target, detectedPitchName);
      playShooterSound("hit");
      setFeedback("Success");
      setScore((value) => value + 100);
      setCombo((value) => {
        const next = value + 1;
        comboRef.current = next;
        setMaxCombo((current) => Math.max(current, next));
        return next;
      });
      setHits((value) => {
        const next = value + 1;
        hitsRef.current = next;
        return next;
      });
      setAttempts((value) => value + 1);
      flashStage("hit");
      window.setTimeout(() => {
        if (appModeRef.current === APP_MODES.SHOOTER && gameStateRef.current === GAME_STATES.PLAYING) {
          spawnShooterTarget();
        }
      }, 70);
    },
    [fireProjectile, flashStage, playShooterSound, spawnShooterTarget],
  );

  const readMicrophone = useCallback(
    (now) => {
      const analyser = analyserRef.current;
      const buffer = bufferRef.current;
      const audio = audioRef.current;
      if (!analyser || !buffer || !audio) return;

      analyser.getFloatTimeDomainData(buffer);
      const rms = getRms(buffer);
      const inputGain = isMobileLayoutRef.current ? 22 : 12;
      const normalizedLevel = Math.min(1, rms * inputGain);

      if (now - lastDebugUpdateRef.current > 45) {
        setSignalLevel(normalizedLevel);
        lastDebugUpdateRef.current = now;
      }

      const lowSignalThreshold = isMobileLayoutRef.current ? LOW_SIGNAL_LEVEL * 0.42 : LOW_SIGNAL_LEVEL;
      const gameNoteTolerance = isMobileLayoutRef.current ? 68 : 45;

      if (rms < lowSignalThreshold) {
        shooterReleaseLockRef.current = null;
        stableGameNoteRef.current = { note: null, count: 0 };
        if (now - lastDetectedDisplayUpdateRef.current > 70) {
          lastDetectedDisplayUpdateRef.current = now;
          setDetected(null);
          setDetectedPitch(null);
        }
        return;
      }

      const maxDetectFrequency = MAX_FREQ;
      const yinPitch = detectPitchYin(
        buffer,
        audio.sampleRate,
        MIN_FREQ,
        maxDetectFrequency,
        0.12,
      );
      const pitch =
        yinPitch ??
        detectPitchAutocorrelation(
          buffer,
          audio.sampleRate,
          MIN_FREQ,
          maxDetectFrequency,
          0.006,
        );
      const displayNote = frequencyToNearest(pitch, DISPLAY_NOTES, 80);
      const activeNotes =
        Array.isArray(activeNotesRef.current) && activeNotesRef.current.length > 0
          ? activeNotesRef.current
          : DEFAULT_CATEGORY.notes;
      const gameNote = frequencyToNearest(pitch, activeNotes, gameNoteTolerance);
      if (gameNote) {
        stableGameNoteRef.current =
          stableGameNoteRef.current.note === gameNote.pitch
            ? { note: gameNote.pitch, count: stableGameNoteRef.current.count + 1 }
            : { note: gameNote.pitch, count: 1 };
      } else {
        stableGameNoteRef.current = { note: null, count: 0 };
      }
      if (now - lastDetectedDisplayUpdateRef.current > 50) {
        lastDetectedDisplayUpdateRef.current = now;
        setDetected(displayNote);
        setDetectedPitch(
          pitch
            ? {
                frequency: pitch,
                note: displayNote?.pitch ?? "--",
              }
            : null,
        );
      }

      if (
        appModeRef.current === APP_MODES.SHOOTER &&
        gameStateRef.current === GAME_STATES.PLAYING &&
        gameNote &&
        stableGameNoteRef.current.count >= (isMobileLayoutRef.current ? 1 : 2)
      ) {
        judgeShooterNote(gameNote.pitch);
      }
    },
    [judgeShooterNote],
  );

  const runGameFrame = useCallback(
    (deltaMs) => {
      gameTimeRef.current += deltaMs;
      const currentBeatMs = getBeatMs(bpmRef.current);
      const noteIntervalMs = currentBeatMs / speedRef.current.notesPerBeat;

      while (gameTimeRef.current >= nextSpawnAtRef.current) {
        const scheduledSpawnAt = nextSpawnAtRef.current;
        const spawned = spawnEnemy(scheduledSpawnAt);
        nextSpawnAtRef.current += noteIntervalMs;
        if (!spawned) {
          nextSpawnAtRef.current = Number.POSITIVE_INFINITY;
          break;
        }
      }

      const currentBeat = Math.floor(gameTimeRef.current / currentBeatMs);
      if (currentBeat !== lastBeatRef.current) {
        lastBeatRef.current = currentBeat;
        const beatInBar = currentBeat % 4;
        setBeat(beatInBar);
        playTick(beatInBar === 0);
      }

      const expired = enemiesRef.current.filter(
        (enemy) => gameTimeRef.current - enemy.hitAt > HIT_WINDOW_MS,
      );
      const missed = expired.filter((enemy) => !enemy.ghost);

      if (missed.length > 0) {
        missed.forEach((enemy) => showLaneFeedback(enemy.detail, "Miss"));
        setMissCount((value) => value + missed.length);
        setMissedNoteCounts((counts) => {
          const nextCounts = { ...counts };
          missed.forEach((enemy) => {
            const noteName = enemy.note ?? enemy.detail?.name ?? "-";
            nextCounts[noteName] = (nextCounts[noteName] ?? 0) + 1;
          });
          return nextCounts;
        });
        comboRef.current = 0;
        setCombo(0);
        setAttempts((value) => value + missed.length);
        setFeedback("Miss");
        flashStage("miss");
      }

      if (expired.length > 0) {
        enemiesRef.current = enemiesRef.current.filter(
          (enemy) => gameTimeRef.current - enemy.hitAt <= HIT_WINDOW_MS,
        );
      }

      if (enemiesRef.current.length === 0) {
        setHitZoneNote(null);
        setIsHitWindowActive(false);
      }

      const closestInWindow = enemiesRef.current
        .filter((enemy) => !enemy.ghost)
        .map((enemy) => ({ ...enemy, distance: Math.abs(enemy.hitAt - gameTimeRef.current) }))
        .filter((enemy) => enemy.distance <= HIT_WINDOW_MS)
        .sort((a, b) => a.distance - b.distance)[0];

      const upcoming =
        closestInWindow ??
        [...enemiesRef.current]
          .filter((enemy) => !enemy.ghost)
          .filter((enemy) => enemy.hitAt >= gameTimeRef.current - HIT_WINDOW_MS)
          .sort((a, b) => a.hitAt - b.hitAt)[0];

      setHitZoneNote(upcoming?.detail ?? null);
      setIsHitWindowActive(Boolean(closestInWindow));
      setEnemies([...enemiesRef.current]);

      if (practiceCompletedRef.current && enemiesRef.current.length === 0) {
        setFeedback("Complete");
        setState(GAME_STATES.IDLE);
      }
    },
    [flashStage, playTick, setState, showLaneFeedback, spawnEnemy],
  );

  const runReferenceTrainingFrame = useCallback(
    (deltaMs) => {
      const signature = getTimeSignatureOption(metronomeTimeSignatureRef.current);
      const subdivision = getSubdivisionOption(metronomeSubdivisionRef.current);
      const beatsPerMeasure = signature.beats;
      const clicksPerBeat = subdivision.clicksPerBeat;
      const currentBeatMs = getBeatMs(bpmRef.current);
      const currentTickMs = currentBeatMs / clicksPerBeat;
      const currentMeasureMs = currentBeatMs * beatsPerMeasure;

      if (countInActiveRef.current) {
        countInTimeRef.current += deltaMs;
        setStage3MeasureProgress(Math.min(1, countInTimeRef.current / currentMeasureMs));
        if (countInTimeRef.current >= currentMeasureMs) {
          countInActiveRef.current = false;
          countInTimeRef.current = 0;
          gameTimeRef.current = chordPracticeIndexRef.current * currentMeasureMs;
          lastBeatRef.current = -1;
          setBeat(0);
          setStage3MeasureProgress(0);
          setFeedback("Play");
          return;
        }
        const countInTick = Math.floor(countInTimeRef.current / currentBeatMs);
        if (countInTick !== lastBeatRef.current) {
          lastBeatRef.current = countInTick;
          const countInBeat = countInTick % beatsPerMeasure;
          setBeat(countInBeat);
          playTick(metronomeAccentRef.current && countInBeat === 0, 0);
        }
        return;
      }

      gameTimeRef.current += deltaMs;
      setStage3MeasureProgress((gameTimeRef.current % currentMeasureMs) / currentMeasureMs);
      const currentTick = Math.floor(gameTimeRef.current / currentTickMs);
      if (currentTick === lastBeatRef.current) return;

      lastBeatRef.current = currentTick;
      const currentBeat = Math.floor(currentTick / clicksPerBeat);
      const beatInBar = currentBeat % beatsPerMeasure;
      const subdivisionIndex = currentTick % clicksPerBeat;
      const isFirstBeat = currentBeat === 0;
      setBeat(beatInBar);
      playTick(metronomeAccentRef.current && beatInBar === 0 && subdivisionIndex === 0, subdivisionIndex);

      if (subdivisionIndex !== 0) return;

      const sequence = Array.isArray(sequenceRef.current) && sequenceRef.current.length > 0
        ? sequenceRef.current
        : selectedCategory.sequence;
      if (!sequence?.length || isFirstBeat) return;

      if (!practiceLoopRef.current && patternRef.current >= sequence.length - 1) {
        practiceCompletedRef.current = true;
        setFeedback("Complete");
        setState(GAME_STATES.IDLE);
        return;
      }

      patternRef.current = practiceLoopRef.current
        ? (patternRef.current + 1) % sequence.length
        : Math.min(patternRef.current + 1, sequence.length - 1);
      setReferenceStepTick((value) => value + 1);
      setFeedback("다음 음");
    },
    [playTick, selectedCategory.sequence, setState],
  );

  const runShooterFrame = useCallback(
    (deltaMs) => {
      gameTimeRef.current += deltaMs;
      const currentBeatMs = getBeatMs(bpmRef.current);

      const level = getShooterLevel(hitsRef.current);
      if (shooterTargetsRef.current.length === 0 || gameTimeRef.current >= shooterNextSpawnAtRef.current) {
        spawnShooterTarget();
      }

      const currentBeat = Math.floor(gameTimeRef.current / currentBeatMs);
      if (currentBeat !== lastBeatRef.current) {
        lastBeatRef.current = currentBeat;
        const beatInBar = currentBeat % 4;
        setBeat(beatInBar);
      }

      shooterTargetsRef.current = shooterTargetsRef.current.map((target) => {
        const progress = Math.min(1, (gameTimeRef.current - target.bornAt) / target.duration);
        return { ...target, y: 8 + progress * 80 };
      });

      const expiredTargets = shooterTargetsRef.current.filter(
        (target) => gameTimeRef.current - target.bornAt >= target.duration,
      );
      if (expiredTargets.length > 0) {
        const expiredIds = new Set(expiredTargets.map((target) => target.id));
        shooterTargetsRef.current = shooterTargetsRef.current.filter((target) => !expiredIds.has(target.id));
        comboRef.current = 0;
        setCombo(0);
        setAttempts((value) => value + expiredTargets.length);
        setMissCount((value) => value + expiredTargets.length);
        const nextLives = Math.max(0, shooterLivesRef.current - expiredTargets.length);
        shooterLivesRef.current = nextLives;
        setShooterLives(nextLives);
        setFeedback(nextLives <= 0 ? "Game Over" : "Miss");
        flashStage("miss");
        playShooterSound(nextLives <= 0 ? "gameover" : "miss");
        if (nextLives <= 0) {
          shooterTargetsRef.current = [];
          setState(GAME_STATES.GAMEOVER);
        }
      }

      projectilesRef.current = projectilesRef.current.filter(
        (projectile) => gameTimeRef.current - projectile.bornAt <= projectile.duration,
      );
      particlesRef.current = particlesRef.current.filter(
        (particle) => gameTimeRef.current - particle.bornAt <= 520,
      );

      setShooterTargets([...shooterTargetsRef.current]);
      setProjectiles([...projectilesRef.current]);
      setParticles([...particlesRef.current]);
    },
    [flashStage, playShooterSound, setState, spawnShooterTarget],
  );

  const runChordTransitionFrame = useCallback(
    (deltaMs) => {
      const signature = getTimeSignatureOption(metronomeTimeSignatureRef.current);
      const subdivision = getSubdivisionOption(metronomeSubdivisionRef.current);
      const beatsPerMeasure = signature.beats;
      const clicksPerBeat = subdivision.clicksPerBeat;
      const currentBeatMs = getBeatMs(bpmRef.current);
      const currentTickMs = currentBeatMs / clicksPerBeat;
      const currentMeasureMs = currentBeatMs * beatsPerMeasure;

      if (countInActiveRef.current) {
        countInTimeRef.current += deltaMs;
        setStage3MeasureProgress(Math.min(1, countInTimeRef.current / currentMeasureMs));
        const countInTick = Math.floor(countInTimeRef.current / currentBeatMs);
        if (countInTick !== lastBeatRef.current) {
          lastBeatRef.current = countInTick;
          const countInBeat = countInTick % beatsPerMeasure;
          setBeat(countInBeat);
          playTick(metronomeAccentRef.current && countInBeat === 0, 0);
        }
        if (countInTimeRef.current >= currentMeasureMs) {
          countInActiveRef.current = false;
          countInTimeRef.current = 0;
          gameTimeRef.current = chordPracticeIndexRef.current * currentMeasureMs;
          lastBeatRef.current = -1;
          setBeat(0);
          setStage3MeasureProgress(0);
          setFeedback("Play");
        }
        return;
      }

      gameTimeRef.current += deltaMs;
      setStage3MeasureProgress((gameTimeRef.current % currentMeasureMs) / currentMeasureMs);
      const currentTick = Math.floor(gameTimeRef.current / currentTickMs);
      if (currentTick !== lastBeatRef.current) {
        lastBeatRef.current = currentTick;
        const currentBeat = Math.floor(currentTick / clicksPerBeat);
        const beatInBar = currentBeat % beatsPerMeasure;
        const subdivisionIndex = currentTick % clicksPerBeat;
        const rawMeasureIndex = chordTransitionProgression.length > 0
          ? Math.floor(currentBeat / beatsPerMeasure)
          : 0;
        if (!practiceLoopRef.current && chordTransitionProgression.length > 0 && rawMeasureIndex >= chordTransitionProgression.length) {
          practiceCompletedRef.current = true;
          setFeedback("Complete");
          setState(GAME_STATES.IDLE);
          return;
        }
        const measureIndex = chordTransitionProgression.length > 0
          ? rawMeasureIndex % chordTransitionProgression.length
          : 0;
        setBeat(beatInBar);
        chordPracticeIndexRef.current = measureIndex;
        setChordPracticeIndex(measureIndex);
        playTick(metronomeAccentRef.current && beatInBar === 0 && subdivisionIndex === 0, subdivisionIndex);
      }
    },
    [chordTransitionProgression.length, playTick],
  );

  const runMetronomeFrame = useCallback(
    (deltaMs) => {
      const signature = getTimeSignatureOption(metronomeTimeSignatureRef.current);
      const subdivision = getSubdivisionOption(metronomeSubdivisionRef.current);
      const beatsPerMeasure = signature.beats;
      const clicksPerBeat = subdivision.clicksPerBeat;
      const currentBeatMs = getBeatMs(bpmRef.current);
      const currentTickMs = currentBeatMs / clicksPerBeat;
      const currentMeasureMs = currentBeatMs * beatsPerMeasure;

      if (countInActiveRef.current) {
        countInTimeRef.current += deltaMs;
        setStage3MeasureProgress(Math.min(1, countInTimeRef.current / currentMeasureMs));
        const countInTick = Math.floor(countInTimeRef.current / currentBeatMs);
        if (countInTick !== lastBeatRef.current) {
          lastBeatRef.current = countInTick;
          const countInBeat = countInTick % beatsPerMeasure;
          setBeat(countInBeat);
          playTick(metronomeAccentRef.current && countInBeat === 0, 0);
        }
        if (countInTimeRef.current >= currentMeasureMs) {
          countInActiveRef.current = false;
          countInTimeRef.current = 0;
          gameTimeRef.current = 0;
          lastBeatRef.current = -1;
          setBeat(0);
          setStage3MeasureProgress(0);
          setFeedback("Play");
        }
        return;
      }

      gameTimeRef.current += deltaMs;
      setStage3MeasureProgress((gameTimeRef.current % currentMeasureMs) / currentMeasureMs);
      const currentTick = Math.floor(gameTimeRef.current / currentTickMs);
      if (currentTick === lastBeatRef.current) return;

      lastBeatRef.current = currentTick;
      const currentBeat = Math.floor(currentTick / clicksPerBeat);
      const beatInBar = currentBeat % beatsPerMeasure;
      const subdivisionIndex = currentTick % clicksPerBeat;
      const measureIndex = Math.floor(currentBeat / beatsPerMeasure);
      const measureNumber = measureIndex + 1;
      const coachCycleBars = Math.max(1, coachPlayBarsRef.current + coachMuteBarsRef.current);
      const coachCycleIndex = measureIndex % coachCycleBars;
      const isCoachMuted =
        coachModeEnabledRef.current &&
        coachMuteBarsRef.current > 0 &&
        coachCycleIndex >= coachPlayBarsRef.current;

      setBeat(beatInBar);
      setMetronomeMeasureCount(measureNumber);
      setMetronomeIsMutedCycle(isCoachMuted);

      if (!isCoachMuted) {
        playTick(metronomeAccentRef.current && beatInBar === 0 && subdivisionIndex === 0, subdivisionIndex);
      }

      if (
        autoBpmEnabledRef.current &&
        subdivisionIndex === 0 &&
        beatInBar === 0 &&
        measureNumber > 1 &&
        measureNumber % Math.max(1, autoBpmBarsRef.current) === 0 &&
        lastAutoBpmMeasureRef.current !== measureNumber
      ) {
        lastAutoBpmMeasureRef.current = measureNumber;
        const nextBpm = clampBpm(bpmRef.current + autoBpmStepRef.current);
        bpmRef.current = nextBpm;
        setBpm(nextBpm);
        setAutoBpmIncrements((value) => value + 1);
      }
    },
    [playTick],
  );

  const animationLoop = useCallback(
    (now) => {
      const deltaMs = Math.min(50, now - lastFrameRef.current);
      lastFrameRef.current = now;

      if (streamRef.current) readMicrophone(now);
      if (
        appModeRef.current === APP_MODES.METRONOME &&
        gameStateRef.current === GAME_STATES.PLAYING
      ) {
        runMetronomeFrame(deltaMs);
      } else if (
        appModeRef.current === APP_MODES.PRACTICE &&
        gameStateRef.current === GAME_STATES.PLAYING &&
        selectedCategory.id === "rhythm"
      ) {
        runChordTransitionFrame(deltaMs);
      } else if (
        !LEGACY_PRACTICE_RENDERING_ENABLED &&
        appModeRef.current === APP_MODES.PRACTICE &&
        gameStateRef.current === GAME_STATES.PLAYING
      ) {
        runReferenceTrainingFrame(deltaMs);
      } else if (
        LEGACY_PRACTICE_RENDERING_ENABLED &&
        appModeRef.current === APP_MODES.PRACTICE &&
        gameStateRef.current === GAME_STATES.PLAYING
      ) {
        runGameFrame(deltaMs);
      }
      if (appModeRef.current === APP_MODES.SHOOTER && gameStateRef.current === GAME_STATES.PLAYING) {
        runShooterFrame(deltaMs);
      }

      rafRef.current = requestAnimationFrame(animationLoop);
    },
    [readMicrophone, runChordTransitionFrame, runGameFrame, runMetronomeFrame, runReferenceTrainingFrame, runShooterFrame, selectedCategory.id],
  );

  const stopMic = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        // The source may already be disconnected by the browser.
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      console.log("[mic] stream stopped");
    }
    sourceRef.current = null;
    analyserRef.current = null;
    bufferRef.current = null;
    streamRef.current = null;
    setSignalLevel(0);
    setDetected(null);
    setDetectedPitch(null);
    setMicStatus("No Signal");
  }, []);

  const startMic = useCallback(async () => {
    if (appModeRef.current !== APP_MODES.SHOOTER) return false;
    try {
      console.log("[mic] permission requested");
      setMicStatus("Mic Connected");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error("Web Audio API is not supported.");
      let audio = audioRef.current;
      if (!audio || audio.state === "closed") audio = new AudioContext();
      if (audio.state === "suspended") await audio.resume();

      const analyser = audio.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;

      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch {
          // The source may already be disconnected by the browser.
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const source = audio.createMediaStreamSource(stream);
      source.connect(analyser);

      streamRef.current = stream;
      sourceRef.current = source;
      audioRef.current = audio;
      analyserRef.current = analyser;
      bufferRef.current = new Float32Array(analyser.fftSize);
      setMicStatus("Mic Connected");
      console.log("[mic] stream active");
      if (gameStateRef.current === GAME_STATES.IDLE) setState(GAME_STATES.LISTENING);
      return true;
    } catch (error) {
      setMicStatus("Permission Denied");
      setFeedback("Permission Denied");
      console.error(error);
      return false;
    }
  }, [setState]);

  const startPractice = useCallback(async (category = selectedCategory) => {
    console.log("[metronome] start clicked");
    const safeCategory = getPlayableCategory(category);
    if (!ACTIVE_PRACTICE_CATEGORY_IDS.has(safeCategory.id)) {
      setSelectedCategoryId(DEFAULT_CATEGORY.id);
      setFeedback("Choose a practice card");
      return;
    }
    if (safeCategory.unavailable) {
      setSelectedCategoryId(safeCategory.id);
      setFeedback("Choose a practice card");
      return;
    }
    if (safeCategory.id === "rhythm") {
      await ensureAudioReady();
      await loadMetronomeSamples(audioRef.current);
      metronomeOnRef.current = true;
      setMetronomeOn(true);
      setStage3StorageOpen(false);
      appModeRef.current = APP_MODES.PRACTICE;
      setAppMode(APP_MODES.PRACTICE);
      setSelectedCategoryId(safeCategory.id);
      resetScore();
      {
        const signature = getTimeSignatureOption(metronomeTimeSignatureRef.current);
        const currentMeasureMs = getBeatMs(bpmRef.current) * signature.beats;
        const startIndex = hasChordTransitionProgression
          ? chordPracticeIndexRef.current % chordTransitionProgression.length
          : 0;
        chordPracticeIndexRef.current = startIndex;
        gameTimeRef.current = startIndex * currentMeasureMs;
        setChordPracticeIndex(startIndex);
      }
      lastBeatRef.current = -1;
      countInActiveRef.current = metronomeCountInRef.current;
      countInTimeRef.current = 0;
      setBeat(0);
      setStage3MeasureProgress(0);
      setFeedback(metronomeCountInRef.current ? "Count In" : "Chord transition");
      setState(GAME_STATES.PLAYING);
      lastFrameRef.current = performance.now();
      return;
    }
    await ensureAudioReady();
    await loadMetronomeSamples(audioRef.current);

    const sequence = getPracticeSequence(safeCategory);
    activeNotesRef.current = safeCategory.notes;
    sequenceRef.current = sequence;
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.PRACTICE;
    setAppMode(APP_MODES.PRACTICE);
    setSelectedCategoryId(safeCategory.id);
    resetScore();
    gameTimeRef.current = 0;
    lastBeatRef.current = -1;
    countInActiveRef.current = metronomeCountInRef.current;
    countInTimeRef.current = 0;
    patternRef.current = 0;
    practiceCompletedRef.current = false;
    setBeat(0);
    setStage3MeasureProgress(0);
    practiceLoopRef.current = shouldLoopPractice(safeCategory, repeatPractice);
    setFeedback(metronomeCountInRef.current ? "Count In" : "Listen and play");
    setState(GAME_STATES.PLAYING);
    lastFrameRef.current = performance.now();
  }, [chordTransitionProgression.length, ensureAudioReady, getPlayableCategory, getPracticeSequence, hasChordTransitionProgression, loadMetronomeSamples, repeatPractice, resetScore, selectedCategory, setState]);

  const enterPracticePreview = useCallback((category = selectedCategory) => {
    const safeCategory = getPlayableCategory(category);
    if (!ACTIVE_PRACTICE_CATEGORY_IDS.has(safeCategory.id)) {
      setSelectedCategoryId(DEFAULT_CATEGORY.id);
      setFeedback("Choose a practice card");
      return;
    }
    if (safeCategory.unavailable) {
      setSelectedCategoryId(safeCategory.id);
      setFeedback("Choose a practice card");
      return;
    }
    const sequence = getPracticeSequence(safeCategory);
    activeNotesRef.current = safeCategory.notes;
    sequenceRef.current = sequence;
    practiceLoopRef.current = shouldLoopPractice(safeCategory, repeatPractice);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.PRACTICE;
    setAppMode(APP_MODES.PRACTICE);
    setSelectedCategoryId(safeCategory.id);
    resetScore();
    setEnemies([]);
    enemiesRef.current = [];
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setLaneFeedback([]);
    setBeat(0);
    countInActiveRef.current = false;
    countInTimeRef.current = 0;
    if (safeCategory.id === "rhythm") setChordPracticeIndex(0);
    setFeedback("Ready");
    setState(GAME_STATES.IDLE);
    lastFrameRef.current = performance.now();
  }, [getPlayableCategory, getPracticeSequence, repeatPractice, resetScore, selectedCategory, setState]);

  const startShooter = useCallback(async (category = SHOOTER_DEFAULT_CATEGORY) => {
    console.log("[metronome] start clicked");
    const safeCategory = normalizePracticeCategory(category);
    await ensureAudioReady();

    activeNotesRef.current = getShooterTrainingNotes(safeCategory, selectedPentatonic);
    sequenceRef.current = getPracticeSequence(safeCategory);
    practiceLoopRef.current = true;
    appModeRef.current = APP_MODES.SHOOTER;
    setAppMode(APP_MODES.SHOOTER);
    setSelectedCategoryId(MAIN_DEFAULT_CATEGORY.id);
    resetScore();
    shooterNextSpawnAtRef.current = 0;
    lastShooterNoteRef.current = null;
    lastShooterXRef.current = 50;
    shooterReleaseLockRef.current = null;
    shooterLivesRef.current = SHOOTER_MAX_LIVES;
    setShooterLives(SHOOTER_MAX_LIVES);
    setShooterAim(undefined);
    spawnShooterTarget();
    setFeedback("Start Shooter");
    setState(GAME_STATES.PLAYING);
    lastFrameRef.current = performance.now();
  }, [ensureAudioReady, getPracticeSequence, resetScore, selectedPentatonic, setState, spawnShooterTarget]);

  const startShooterMic = useCallback(async () => {
    appModeRef.current = APP_MODES.SHOOTER;
    setAppMode(APP_MODES.SHOOTER);
    await startMic();
  }, [startMic]);

  const startMetronomePractice = useCallback(async () => {
    console.log("[metronome] start clicked");
    await ensureAudioReady();
    await loadMetronomeSamples(audioRef.current);
    stopMic();
    appModeRef.current = APP_MODES.METRONOME;
    setAppMode(APP_MODES.METRONOME);
    gameTimeRef.current = 0;
    lastBeatRef.current = -1;
    countInActiveRef.current = metronomeCountInRef.current;
    countInTimeRef.current = 0;
    lastAutoBpmMeasureRef.current = 0;
    setBeat(0);
    setMetronomeMeasureCount(0);
    setAutoBpmIncrements(0);
    setMetronomeIsMutedCycle(false);
    setStage3MeasureProgress(0);
    setFeedback(metronomeCountInRef.current ? "Count In" : "Play");
    setState(GAME_STATES.PLAYING);
    lastFrameRef.current = performance.now();
  }, [ensureAudioReady, loadMetronomeSamples, setState, stopMic]);

  const resetMetronomePractice = useCallback(() => {
    if (appModeRef.current !== APP_MODES.METRONOME) return;
    gameTimeRef.current = 0;
    lastBeatRef.current = -1;
    countInActiveRef.current = false;
    countInTimeRef.current = 0;
    lastAutoBpmMeasureRef.current = 0;
    setBeat(0);
    setMetronomeMeasureCount(0);
    setAutoBpmIncrements(0);
    setMetronomeIsMutedCycle(false);
    setStage3MeasureProgress(0);
    setFeedback("Ready");
    setState(GAME_STATES.IDLE);
  }, [setState]);

  const pauseGame = useCallback(() => {
    if (gameStateRef.current !== GAME_STATES.PLAYING) return;
    setState(GAME_STATES.PAUSED);
    setFeedback("Paused");
  }, [setState]);

  const resumeGame = useCallback(async () => {
    if (gameStateRef.current !== GAME_STATES.PAUSED) return;
    console.log("[metronome] start clicked");
    await ensureAudioReady();
    if (appModeRef.current === APP_MODES.PRACTICE || appModeRef.current === APP_MODES.METRONOME) {
      await loadMetronomeSamples(audioRef.current);
    }
    lastFrameRef.current = performance.now();
    setState(GAME_STATES.PLAYING);
    setFeedback("Play");
  }, [ensureAudioReady, loadMetronomeSamples, setState]);

  const restartGame = useCallback(async () => {
    console.log("[metronome] start clicked");
    await ensureAudioReady();
    const safeCategory = getPlayableCategory(selectedCategory);
    const sequence = getPracticeSequence(safeCategory);
    const modeToRestart = appModeRef.current === APP_MODES.SHOOTER ? APP_MODES.SHOOTER : APP_MODES.PRACTICE;
    if (modeToRestart === APP_MODES.PRACTICE) await loadMetronomeSamples(audioRef.current);
    activeNotesRef.current =
      modeToRestart === APP_MODES.SHOOTER
        ? getShooterTrainingNotes(safeCategory, selectedPentatonic)
        : safeCategory.notes;
    sequenceRef.current = sequence;
    practiceLoopRef.current = modeToRestart === APP_MODES.SHOOTER ? true : shouldLoopPractice(safeCategory, repeatPractice);
    appModeRef.current = modeToRestart;
    setAppMode(modeToRestart);
    setSelectedCategoryId(safeCategory.id);
    resetScore();
    shooterNextSpawnAtRef.current = 0;
    lastShooterNoteRef.current = null;
    lastShooterXRef.current = 50;
    shooterReleaseLockRef.current = null;
    shooterLivesRef.current = SHOOTER_MAX_LIVES;
    setShooterLives(SHOOTER_MAX_LIVES);
    if (modeToRestart === APP_MODES.SHOOTER) setShooterAim(undefined);
    if (modeToRestart === APP_MODES.SHOOTER) spawnShooterTarget();
    setFeedback(modeToRestart === APP_MODES.SHOOTER ? "Shoot the notes" : "Restart Practice");
    setState(GAME_STATES.PLAYING);
    lastFrameRef.current = performance.now();
  }, [ensureAudioReady, getPlayableCategory, getPracticeSequence, loadMetronomeSamples, repeatPractice, resetScore, selectedCategory, selectedPentatonic, setState, spawnShooterTarget]);

  const changeNoteSpeed = useCallback((speed) => {
    if (speed.disabled) return;
    speedRef.current = speed;
    setNoteSpeed(speed);
    const safeCategory = getPlayableCategory(selectedCategory);
    sequenceRef.current = getPracticeSequence(safeCategory);
    patternRef.current = 0;
    practiceCompletedRef.current = false;
    gameTimeRef.current = 0;
    nextSpawnAtRef.current = 0;
    lastBeatRef.current = -1;
    enemiesRef.current = [];
    setEnemies([]);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setLaneFeedback([]);
  }, [getPlayableCategory, getPracticeSequence, selectedCategory]);

  const changeBpm = useCallback((value) => {
    const nextBpm = clampBpm(value);
    bpmRef.current = nextBpm;
    setBpm(nextBpm);
    patternRef.current = 0;
    practiceCompletedRef.current = false;
    gameTimeRef.current = 0;
    nextSpawnAtRef.current = 0;
    lastBeatRef.current = -1;
    enemiesRef.current = [];
    setEnemies([]);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setLaneFeedback([]);
  }, []);

  const handleTapTempo = useCallback(() => {
    const now = performance.now();
    const nextTimes = [...tapTempoTimesRef.current.filter((time) => now - time < 2200), now].slice(-6);
    tapTempoTimesRef.current = nextTimes;
    if (nextTimes.length < 2) return;

    const intervals = nextTimes.slice(1).map((time, index) => time - nextTimes[index]);
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    if (!Number.isFinite(averageInterval) || averageInterval <= 0) return;

    changeBpm(Math.round(60000 / averageInterval));
  }, [changeBpm]);

  const stopFeelPlayback = useCallback(() => {
    feelPlaybackTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    feelPlaybackTimersRef.current = [];
    setFeelPlaybackActive(false);
    setFeelPlaybackIndex(-1);
    setFeelPlaybackProgress(0);
  }, []);

  const playFeelPattern = useCallback((events, loop = feelPlaybackLoopRef.current) => {
    const pattern = normalizeFeelRecorderEvents(events);
    if (!pattern.length) return;

    stopFeelPlayback();
    setFeelPlaybackActive(true);
    setFeelPlaybackIndex(0);
    setFeelPlaybackProgress(0);

    const schedule = () => {
      const totalMs = getFeelRecorderTotalUnits(pattern);
      const startedAt = performance.now();

      pattern.forEach((event, index) => {
        const timerId = window.setTimeout(() => {
          setFeelPlaybackIndex(index);
          playFeelRecorderPulse(event.type);
        }, Math.max(0, event.startMs));
        feelPlaybackTimersRef.current.push(timerId);
      });

      const progressTimerId = window.setInterval(() => {
        const playbackElapsed = performance.now() - startedAt;
        setFeelPlaybackProgress(Math.min(1, playbackElapsed / totalMs));
        const activeIndex = pattern.findIndex((event) => playbackElapsed >= event.startMs && playbackElapsed <= event.endMs);
        setFeelPlaybackIndex(activeIndex);
      }, 32);
      feelPlaybackTimersRef.current.push(progressTimerId);

      const endTimerId = window.setTimeout(() => {
        window.clearInterval(progressTimerId);
        setFeelPlaybackProgress(1);
        setFeelPlaybackIndex(-1);
        if (feelPlaybackLoopRef.current && loop) {
          const loopTimerId = window.setTimeout(() => {
            feelPlaybackTimersRef.current = [];
            setFeelPlaybackProgress(0);
            schedule();
          }, Math.max(80, getBeatMs(bpmRef.current) * 0.25));
          feelPlaybackTimersRef.current.push(loopTimerId);
          return;
        }

        setFeelPlaybackActive(false);
        feelPlaybackTimersRef.current = [];
      }, Math.max(120, totalMs));
      feelPlaybackTimersRef.current.push(endTimerId);

    };

    schedule();
  }, [playFeelRecorderPulse, stopFeelPlayback]);

  const toggleFeelRecorder = useCallback(() => {
    stopFeelPlayback();
    setFeelRecorderActive((active) => {
      const nextActive = !active;
      if (nextActive) {
        feelRecordingStartRef.current = performance.now();
        feelPressStartRef.current = 0;
        feelLastReleaseRef.current = 0;
        setFeelRecorderEvents([]);
      }
      return nextActive;
    });
  }, [stopFeelPlayback]);

  const handleFeelPressStart = useCallback(() => {
    if (!feelRecorderActive) return;
    if (!feelRecordingStartRef.current) feelRecordingStartRef.current = performance.now();
    feelPressStartRef.current = performance.now();
  }, [feelRecorderActive]);

  const handleFeelPressEnd = useCallback(() => {
    if (!feelRecorderActive || !feelPressStartRef.current) return;
    const now = performance.now();
    const durationMs = now - feelPressStartRef.current;
    const gapMs = feelLastReleaseRef.current ? feelPressStartRef.current - feelLastReleaseRef.current : 0;
    const startMs = Math.max(0, feelPressStartRef.current - feelRecordingStartRef.current);
    const endMs = Math.max(startMs + FEEL_RECORDER_MIN_TAP_MS, now - feelRecordingStartRef.current);
    const nextEvent = {
      type: durationMs >= FEEL_RECORDER_LONG_PRESS_MS ? "hold" : "tick",
      durationMs,
      startMs,
      endMs,
      gapMs,
    };
    feelPressStartRef.current = 0;
    feelLastReleaseRef.current = now;
    setFeelRecorderEvents((events) => normalizeFeelRecorderEvents([...events, nextEvent]));
    playFeelRecorderPulse(nextEvent.type);
  }, [feelRecorderActive, playFeelRecorderPulse]);

  const clearFeelRecorder = useCallback(() => {
    stopFeelPlayback();
    setFeelRecorderActive(false);
    setFeelRecorderEvents([]);
    feelRecordingStartRef.current = 0;
    feelPressStartRef.current = 0;
    feelLastReleaseRef.current = 0;
  }, [stopFeelPlayback]);

  const saveFeelPattern = useCallback(() => {
    const events = normalizeFeelRecorderEvents(feelRecorderEvents);
    if (!events.length) return;
    const nextPattern = {
      id: `feel-${Date.now()}`,
      name: (feelPatternName.trim() || FEEL_RECORDER_DEFAULT_NAME).slice(0, 28),
      events,
      createdAt: Date.now(),
    };
    setSavedFeelPatterns((patterns) => [nextPattern, ...patterns].slice(0, 20));
    setFeelPatternName(FEEL_RECORDER_DEFAULT_NAME);
  }, [feelPatternName, feelRecorderEvents]);

  const deleteFeelPattern = useCallback((patternId) => {
    setSavedFeelPatterns((patterns) => patterns.filter((pattern) => pattern.id !== patternId));
  }, []);


  const changeScaleDirection = useCallback((direction) => {
    setScaleDirection(direction);
    const safeCategory = getPlayableCategory(selectedCategory);
    sequenceRef.current = getPracticeSequence(safeCategory, direction);
    practiceLoopRef.current = shouldLoopPractice(safeCategory, repeatPractice);
    patternRef.current = 0;
    practiceCompletedRef.current = false;
    gameTimeRef.current = 0;
    nextSpawnAtRef.current = 0;
    lastBeatRef.current = -1;
    enemiesRef.current = [];
    setEnemies([]);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setLaneFeedback([]);
    setFeedback("Ready");
  }, [getPlayableCategory, getPracticeSequence, repeatPractice, selectedCategory]);

  const resetScalePracticePreview = useCallback((root, typeId, familyId = selectedScaleFamily, boxNumber = selectedScaleBox) => {
    const nextPentatonic = buildScaleBlockPractice(root, typeId, familyId, boxNumber);
    const safeCategory = {
      ...normalizePracticeCategory(selectedCategory),
      notes: nextPentatonic.notes,
      sequence: nextPentatonic.sequence,
      modeLabel: nextPentatonic.label,
    };
    activeNotesRef.current = safeCategory.notes;
    sequenceRef.current = getPracticeSequence(safeCategory, scaleDirection);
    practiceLoopRef.current = shouldLoopPractice(safeCategory, repeatPractice);
    patternRef.current = 0;
    practiceCompletedRef.current = false;
    gameTimeRef.current = 0;
    nextSpawnAtRef.current = 0;
    lastBeatRef.current = -1;
    enemiesRef.current = [];
    setEnemies([]);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setLaneFeedback([]);
    setFeedback("Ready");
  }, [getPracticeSequence, repeatPractice, scaleDirection, selectedCategory, selectedScaleBox, selectedScaleFamily]);

  const changeScaleRoot = useCallback((root) => {
    setSelectedScaleRoot(root);
    resetScalePracticePreview(root, selectedScaleType, selectedScaleFamily, selectedScaleBox);
  }, [resetScalePracticePreview, selectedScaleBox, selectedScaleFamily, selectedScaleType]);

  const changeScaleFamily = useCallback((familyId) => {
    const nextFamily = SCALE_FAMILIES[familyId] ? familyId : SCALE_FAMILIES.pentatonic.id;
    const nextTypeOptions = nextFamily === SCALE_FAMILIES.scale.id ? DIATONIC_SCALE_TYPES : PENTATONIC_TYPES;
    const nextType = nextTypeOptions[selectedScaleType] ? selectedScaleType : nextTypeOptions.minor.id;
    setSelectedScaleFamily(nextFamily);
    setSelectedScaleType(nextType);
    resetScalePracticePreview(selectedScaleRoot, nextType, nextFamily, selectedScaleBox);
  }, [resetScalePracticePreview, selectedScaleBox, selectedScaleRoot, selectedScaleType]);

  const changeScaleType = useCallback((typeId) => {
    setSelectedScaleType(typeId);
    resetScalePracticePreview(selectedScaleRoot, typeId, selectedScaleFamily, selectedScaleBox);
  }, [resetScalePracticePreview, selectedScaleBox, selectedScaleFamily, selectedScaleRoot]);

  const changeScaleBox = useCallback((boxNumber) => {
    const nextBox = Math.max(1, Math.min(5, Number(boxNumber) || 1));
    setSelectedScaleBox(nextBox);
    resetScalePracticePreview(selectedScaleRoot, selectedScaleType, selectedScaleFamily, nextBox);
  }, [resetScalePracticePreview, selectedScaleFamily, selectedScaleRoot, selectedScaleType]);

  const toggleRepeatPractice = useCallback((event) => {
    const nextRepeat = event.target.checked;
    setRepeatPractice(nextRepeat);
    const safeCategory = getPlayableCategory(selectedCategory);
    practiceLoopRef.current = shouldLoopPractice(safeCategory, nextRepeat);
  }, [getPlayableCategory, selectedCategory]);

  const changeRepeatCount = useCallback((value) => {
    const nextCount = Math.max(MIN_REPEAT_COUNT, Math.min(MAX_REPEAT_COUNT, Number(value) || MIN_REPEAT_COUNT));
    setRepeatCount(nextCount);
    if (isMobileLayout) setRepeatPractice(nextCount > 1);
    const safeCategory = getPlayableCategory(selectedCategory);
    sequenceRef.current = getPracticeSequence(safeCategory);
    patternRef.current = 0;
    practiceCompletedRef.current = false;
    gameTimeRef.current = 0;
    nextSpawnAtRef.current = 0;
    lastBeatRef.current = -1;
    enemiesRef.current = [];
    setEnemies([]);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setLaneFeedback([]);
    setFeedback("Ready");
  }, [getPlayableCategory, getPracticeSequence, isMobileLayout, selectedCategory]);

  const stopPracticeSession = useCallback(() => {
    enemiesRef.current = [];
    shooterTargetsRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    shooterNextSpawnAtRef.current = 0;
    lastShooterNoteRef.current = null;
    lastShooterXRef.current = 50;
    shooterReleaseLockRef.current = null;
    shooterLivesRef.current = SHOOTER_MAX_LIVES;
    setEnemies([]);
    setShooterTargets([]);
    setProjectiles([]);
    setParticles([]);
    setShooterAim(undefined);
    setShooterLives(SHOOTER_MAX_LIVES);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setChordPracticeIndex(0);
    gameTimeRef.current = 0;
    nextSpawnAtRef.current = 0;
    lastBeatRef.current = -1;
    patternRef.current = 0;
    practiceCompletedRef.current = false;
    countInActiveRef.current = false;
    countInTimeRef.current = 0;
    setBeat(0);
    setStage3MeasureProgress(0);
    setFeedback("Ready");
    setState(GAME_STATES.IDLE);
  }, [setState]);

  const showMainMenu = useCallback(() => {
    stopMic();
    setUtilityMenuOpen(false);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.CURRICULUM;
    setAppMode(APP_MODES.CURRICULUM);
    setSelectedCategoryId(MAIN_DEFAULT_CATEGORY.id);
    setPendingStageCardId(null);
    enemiesRef.current = [];
    shooterTargetsRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    setEnemies([]);
    setShooterTargets([]);
    setProjectiles([]);
    setParticles([]);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setBeat(0);
    setFeedback("Choose a practice card");
    setState(GAME_STATES.IDLE);
  }, [setState, stopMic]);

  const showCurriculum = useCallback(() => {
    stopMic();
    setUtilityMenuOpen(false);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.CURRICULUM;
    setAppMode(APP_MODES.CURRICULUM);
    setSelectedCategoryId(MAIN_DEFAULT_CATEGORY.id);
    setPendingStageCardId(null);
    enemiesRef.current = [];
    setEnemies([]);
    setBeat(0);
    setFeedback("Choose a practice card");
    setState(GAME_STATES.IDLE);
  }, [setState, stopMic]);

  const showStage3StorageRoom = useCallback(() => {
    stopMic();
    setUtilityMenuOpen(false);
    appModeRef.current = APP_MODES.PRACTICE;
    setAppMode(APP_MODES.PRACTICE);
    setSelectedCategoryId("rhythm");
    setPendingStageCardId(null);
    setStage3StorageOpen(true);
    enemiesRef.current = [];
    setEnemies([]);
    setBeat(0);
    setFeedback("Ready");
    setState(GAME_STATES.IDLE);
  }, [setState, stopMic]);

  const showShooterMode = useCallback(() => {
    setUtilityMenuOpen(false);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.SHOOTER;
    setAppMode(APP_MODES.SHOOTER);
    enemiesRef.current = [];
    shooterTargetsRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    shooterNextSpawnAtRef.current = 0;
    lastShooterNoteRef.current = null;
    lastShooterXRef.current = 50;
    shooterReleaseLockRef.current = null;
    shooterLivesRef.current = SHOOTER_MAX_LIVES;
    setEnemies([]);
    setShooterTargets([]);
    setProjectiles([]);
    setParticles([]);
    setShooterAim(undefined);
    setShooterLives(SHOOTER_MAX_LIVES);
    setBeat(0);
    setFeedback("Start Shooter");
    setState(streamRef.current ? GAME_STATES.LISTENING : GAME_STATES.IDLE);
  }, [setState]);

  const showMetronomeMode = useCallback(() => {
    stopMic();
    setUtilityMenuOpen(false);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.METRONOME;
    setAppMode(APP_MODES.METRONOME);
    enemiesRef.current = [];
    shooterTargetsRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    setEnemies([]);
    setShooterTargets([]);
    setProjectiles([]);
    setParticles([]);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    gameTimeRef.current = 0;
    lastBeatRef.current = -1;
    countInActiveRef.current = false;
    countInTimeRef.current = 0;
    setBeat(0);
    setStage3MeasureProgress(0);
    setFeedback("Ready");
    setState(GAME_STATES.IDLE);
  }, [setState, stopMic]);

  const showFretboardViewer = useCallback(() => {
    stopMic();
    setUtilityMenuOpen(false);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.FRETBOARD_VIEWER;
    setAppMode(APP_MODES.FRETBOARD_VIEWER);
    enemiesRef.current = [];
    shooterTargetsRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    setEnemies([]);
    setShooterTargets([]);
    setProjectiles([]);
    setParticles([]);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setBeat(0);
    setFeedback("Ready");
    setState(GAME_STATES.IDLE);
  }, [setState, stopMic]);

  const showDesignLab = useCallback(() => {
    if (!designLabEnabled) return;
    stopMic();
    setUtilityMenuOpen(false);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.DESIGN_LAB;
    setAppMode(APP_MODES.DESIGN_LAB);
    enemiesRef.current = [];
    shooterTargetsRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    setEnemies([]);
    setShooterTargets([]);
    setProjectiles([]);
    setParticles([]);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setBeat(0);
    setFeedback("Design Lab");
    setState(GAME_STATES.IDLE);
  }, [designLabEnabled, setState, stopMic]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    appModeRef.current = appMode;
  }, [appMode]);

  useEffect(() => {
    if (!HEADER_VARIANT_IDS.has(selectedHeaderCandidateId)) setSelectedHeaderCandidateId(headerVariant);
  }, [headerVariant, selectedHeaderCandidateId]);

  useEffect(() => {
    if (!APP_ICON_VARIANT_IDS.has(selectedAppIconCandidateId)) setSelectedAppIconCandidateId(designLabAppIconState.activeIcon);
  }, [designLabAppIconState.activeIcon, selectedAppIconCandidateId]);

  useEffect(() => {
    selectedCategoryIdRef.current = selectedCategoryId;
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!utilityMenuOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setUtilityMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [utilityMenuOpen]);

  useEffect(() => {
    chordPracticeIndexRef.current = chordPracticeIndex;
  }, [chordPracticeIndex]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!window.location.hash) {
      window.history.replaceState(
        { appRoute: APP_ROUTES.CURRICULUM },
        "",
        `${window.location.pathname}${window.location.search}${APP_ROUTES.CURRICULUM}`,
      );
    }

    const applyHashRoute = () => {
      const route = getRouteFromHash(window.location.hash);
      if (route.appMode !== APP_MODES.SHOOTER) stopMic();
      const routeChanged =
        route.appMode !== appModeRef.current ||
        route.categoryId !== selectedCategoryIdRef.current;
      routeSyncRef.current = routeChanged;
      appModeRef.current = route.appMode;
      selectedCategoryIdRef.current = route.categoryId;
      setAppMode(route.appMode);
      setSelectedCategoryId(route.categoryId);
      setEnemies([]);
      enemiesRef.current = [];
      setShooterTargets([]);
      shooterTargetsRef.current = [];
      setProjectiles([]);
      projectilesRef.current = [];
      setParticles([]);
      particlesRef.current = [];
      setHitZoneNote(null);
      setIsHitWindowActive(false);
      setBeat(0);
      setUtilityMenuOpen(false);
      setState(route.appMode === APP_MODES.SHOOTER && streamRef.current ? GAME_STATES.LISTENING : GAME_STATES.IDLE);
    };

    window.addEventListener("hashchange", applyHashRoute);
    return () => window.removeEventListener("hashchange", applyHashRoute);
  }, [setState, stopMic]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextHash = getHashFromRoute(appMode, selectedCategoryId);
    if (routeSyncRef.current) {
      routeSyncRef.current = false;
      return;
    }
    if (window.location.hash === nextHash) return;
    window.history.pushState(
      { appRoute: nextHash },
      "",
      `${window.location.pathname}${window.location.search}${nextHash}`,
    );
  }, [appMode, selectedCategoryId]);

  useEffect(() => {
    speedRef.current = noteSpeed;
    if (appModeRef.current !== APP_MODES.SHOOTER) {
      const safeCategory = getPlayableCategory(selectedCategory);
      sequenceRef.current = getPracticeSequence(safeCategory);
    }
  }, [getPlayableCategory, getPracticeSequence, noteSpeed, selectedCategory]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    metronomeTimeSignatureRef.current = metronomeTimeSignature;
  }, [metronomeTimeSignature]);

  useEffect(() => {
    metronomeAccentRef.current = metronomeAccent;
  }, [metronomeAccent]);

  useEffect(() => {
    metronomeSubdivisionRef.current = metronomeSubdivision;
  }, [metronomeSubdivision]);

  useEffect(() => {
    metronomeToneRef.current = metronomeTone;
  }, [metronomeTone]);

  useEffect(() => {
    metronomeCountInRef.current = metronomeCountIn;
  }, [metronomeCountIn]);

  useEffect(() => {
    autoBpmEnabledRef.current = autoBpmEnabled;
  }, [autoBpmEnabled]);

  useEffect(() => {
    autoBpmStepRef.current = autoBpmStep;
  }, [autoBpmStep]);

  useEffect(() => {
    autoBpmBarsRef.current = autoBpmBars;
  }, [autoBpmBars]);

  useEffect(() => {
    coachModeEnabledRef.current = coachModeEnabled;
  }, [coachModeEnabled]);

  useEffect(() => {
    coachPlayBarsRef.current = coachPlayBars;
  }, [coachPlayBars]);

  useEffect(() => {
    coachMuteBarsRef.current = coachMuteBars;
  }, [coachMuteBars]);

  useEffect(() => {
    feelPlaybackLoopRef.current = feelPlaybackLoop;
  }, [feelPlaybackLoop]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FEEL_RECORDER_STORAGE_KEY, JSON.stringify(savedFeelPatterns));
  }, [savedFeelPatterns]);

  useEffect(() => () => {
    feelPlaybackTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    feelPlaybackTimersRef.current = [];
  }, []);

  useEffect(() => {
    if (viewerMode !== FRETBOARD_VIEWER_MODES.CHORD) return;
    console.log("[Chord Debug][Viewer]", viewerChordDebugInfo);
  }, [viewerChordDebugInfo, viewerMode]);

  useEffect(() => {
    if (selectedCategory.id !== "rhythm") return;
    console.log("[Chord Debug][Stage3]", stage3ChordDebugInfo);
  }, [selectedCategory.id, stage3ChordDebugInfo]);

  useEffect(() => {
    metronomeOnRef.current = metronomeOn;
  }, [metronomeOn]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STAGE3_STORAGE_KEY,
        JSON.stringify({
          chordIds: stage3ChordIds,
          bpm,
          chordProgressionId,
          showChordFingeringGuide,
          chordBaseRoot: stage3ChordBaseRoot,
          chordAccidental: stage3ChordAccidental,
          chordRoot: stage3ChordRoot,
          chordQuality: stage3ChordQuality,
          chordExtension: stage3ChordExtension,
        }),
      );
    } catch {
      // Ignore storage failures so practice remains usable in private/restricted browsers.
    }
  }, [
    bpm,
    chordProgressionId,
    showChordFingeringGuide,
    stage3ChordAccidental,
    stage3ChordBaseRoot,
    stage3ChordExtension,
    stage3ChordIds,
    stage3ChordQuality,
    stage3ChordRoot,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STAGE3_QUICK_SLOTS_KEY, JSON.stringify(stage3QuickSlots));
    } catch {
      // Quick slots are a convenience feature; the trainer still works without storage.
    }
  }, [stage3QuickSlots]);

  useEffect(() => {
    shooterSoundOnRef.current = shooterSoundOn;
  }, [shooterSoundOn]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 680px)");
    const updateMobileLayout = () => {
      isMobileLayoutRef.current = mediaQuery.matches;
      setIsMobileLayout(mediaQuery.matches);
      setDeviceInfo(getDeviceSnapshot());
    };
    updateMobileLayout();
    window.addEventListener("resize", updateMobileLayout);
    mediaQuery.addEventListener?.("change", updateMobileLayout);
    return () => {
      window.removeEventListener("resize", updateMobileLayout);
      mediaQuery.removeEventListener?.("change", updateMobileLayout);
    };
  }, []);

  useEffect(() => {
    const safeCategory = getPlayableCategory(selectedCategory);
    practiceLoopRef.current = shouldLoopPractice(safeCategory, repeatPractice);
  }, [getPlayableCategory, repeatPractice, selectedCategory]);

  useEffect(() => {
    if (appModeRef.current === APP_MODES.SHOOTER) return;
    const safeCategory = getPlayableCategory(selectedCategory);
    activeNotesRef.current = safeCategory.notes;
    sequenceRef.current = getPracticeSequence(safeCategory);
  }, [getPlayableCategory, getPracticeSequence, selectedCategory, scaleDirection]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animationLoop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(flashTimerRef.current);
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch {
          // The source may already be disconnected by the browser.
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        console.log("[mic] stream stopped");
      }
      sourceRef.current = null;
      analyserRef.current = null;
      bufferRef.current = null;
      streamRef.current = null;
    };
  }, [animationLoop]);

  const visibleFrets = useMemo(
    () => (selectedCategory.id === "scale-block" ? selectedPentatonic.visibleFrets : [1, 2, 3]),
    [selectedCategory.id, selectedPentatonic.visibleFrets],
  );
  const laneStrings = useMemo(() => [1, 2, 3, 4, 5, 6], []);
  const referenceStrings = useMemo(() => [1, 2, 3, 4, 5, 6], []);
  const getReferenceFretLeft = useCallback((note) => {
    const fret = Number(note?.fretNumber ?? note?.fret ?? 0);
    if (fret === 0) return isMobileLayout ? "18px" : "30px";
    const exactIndex = visibleFrets.indexOf(fret);
    const fretIndex = exactIndex >= 0
      ? exactIndex
      : visibleFrets
          .map((visibleFret, index) => ({ index, distance: Math.abs(visibleFret - fret) }))
          .sort((a, b) => a.distance - b.distance)[0]?.index ?? 0;
    const ratio = ((fretIndex + 0.5) / visibleFrets.length).toFixed(4);
    return `calc(42px + (100% - 52px) * ${ratio})`;
  }, [isMobileLayout, visibleFrets]);
  const getViewerFretLeftFromFrets = useCallback((note, frets) => {
    const fret = Number(note?.fretNumber ?? note?.fret ?? 0);
    if (fret === 0) return "30px";
    const exactIndex = frets.indexOf(fret);
    const fretIndex = exactIndex >= 0
      ? exactIndex
      : frets
          .map((visibleFret, index) => ({ index, distance: Math.abs(visibleFret - fret) }))
          .sort((a, b) => a.distance - b.distance)[0]?.index ?? 0;
    const ratio = ((fretIndex + 0.5) / frets.length).toFixed(4);
    return `calc(42px + (100% - 52px) * ${ratio})`;
  }, []);
  const getViewerFretLeft = useCallback(
    (note) => getViewerFretLeftFromFrets(note, viewerVisibleFrets),
    [getViewerFretLeftFromFrets, viewerVisibleFrets],
  );
  const getReferenceStringTop = useCallback((noteOrStringNumber) => {
    const stringNumber = typeof noteOrStringNumber === "number"
      ? noteOrStringNumber
      : noteOrStringNumber?.stringNumber;
    const rowIndex = Math.max(0, referenceStrings.indexOf(stringNumber));
    return 18 + rowIndex * 13;
  }, [referenceStrings]);
  const getLaneLeft = useCallback((noteOrStringNumber) => {
    const stringNumber = typeof noteOrStringNumber === "number"
      ? noteOrStringNumber
      : noteOrStringNumber?.stringNumber;
    const laneIndex = Math.max(0, laneStrings.indexOf(stringNumber));
    return `${(laneIndex + 0.5) * (100 / laneStrings.length)}%`;
  }, [laneStrings]);

  const nextNotes = useMemo(() => {
    const fallbackSequence =
      selectedCategory.id === "scale-block"
        ? selectedPentatonic.sequence
        : selectedCategory.sequence ?? DEFAULT_CATEGORY.sequence;
    const fallbackNotes =
      selectedCategory.id === "scale-block"
        ? selectedPentatonic.notes
        : selectedCategory.notes ?? DEFAULT_CATEGORY.notes;
    const shouldUseLiveRefs = appMode === APP_MODES.PRACTICE && gameState !== GAME_STATES.IDLE;
    const sequence = shouldUseLiveRefs && Array.isArray(sequenceRef.current) && sequenceRef.current.length > 0
      ? sequenceRef.current
      : fallbackSequence;
    const noteList =
      shouldUseLiveRefs && Array.isArray(activeNotesRef.current) && activeNotesRef.current.length > 0
        ? activeNotesRef.current
        : fallbackNotes;
    return Array.from({ length: 5 }, (_, index) => {
      const startIndex = patternRef.current % sequence.length;
      const sequenceStep = sequence[(startIndex + index) % sequence.length];
      const noteName = getSequenceStepNoteName(sequenceStep);
      const note = noteList.find((item) => item.pitch === noteName) ?? DEFAULT_CATEGORY.notes[0];
      return { ...note, ghost: Boolean(sequenceStep?.ghost) };
    });
  }, [appMode, enemies, gameState, referenceStepTick, scaleDirection, selectedCategory.id, selectedCategory.notes, selectedCategory.sequence, selectedPentatonic.notes, selectedPentatonic.sequence]);
  const currentPrompt = enemies.find((enemy) => !enemy.ghost)?.detail ?? nextNotes.find((note) => !note.ghost) ?? nextNotes[0];
  const detectedScaleNote = useMemo(() => {
    if (
      selectedCategory.id !== "scale-block" ||
      appMode !== APP_MODES.PRACTICE ||
      gameState === GAME_STATES.PLAYING ||
      !detected?.name
    ) {
      return null;
    }
    return selectedPentatonic.notes.find((note) => note.pitch === detected.pitch) ?? null;
  }, [appMode, detected, gameState, selectedCategory.id, selectedPentatonic.notes]);
  const referencePrompt = detectedScaleNote ?? currentPrompt;
  const referenceDisplayPrompt = referencePrompt;
  const referenceNextPrompt =
    nextNotes.find(
      (note) =>
        !note.ghost &&
        (
          note.pitch !== currentPrompt?.pitch ||
          note.stringNumber !== currentPrompt?.stringNumber ||
          note.fretNumber !== currentPrompt?.fretNumber
        ),
    ) ??
    nextNotes.find((note) => !note.ghost) ??
    nextNotes[0] ??
    null;
  const referenceBoardNotes = useMemo(() => {
    const sourceNotes = selectedCategory.id === "scale-block" ? selectedPentatonic.notes : selectedCategory.notes;
    return sourceNotes.map((note) => {
      const isActive =
        referenceDisplayPrompt?.pitch === note.pitch &&
        referenceDisplayPrompt?.stringNumber === note.stringNumber &&
        referenceDisplayPrompt?.fretNumber === note.fretNumber;
      return {
        ...note,
        label: note.octaveNote ?? note.pitch,
        isActive,
        isRoot: false,
      };
    });
  }, [referenceDisplayPrompt, selectedCategory.id, selectedCategory.notes, selectedPentatonic.notes, selectedScaleRoot]);
  const referenceBoardRange = useMemo(() => {
    if (selectedCategory.id === "scale-block") {
      return [
        Math.max(0, Math.min(...selectedPentatonic.visibleFrets) - 1),
        Math.max(...selectedPentatonic.visibleFrets),
      ];
    }
    return [0, 3];
  }, [selectedCategory.id, selectedPentatonic.visibleFrets]);
  const getReferenceStageValue = useCallback((note) => {
    if (!note) return "준비";
    return note.noteName ?? getPitchClass(note.pitch) ?? note.pitch;
  }, []);
  const scaleReferenceTitle = useMemo(() => {
    const root = SCALE_ROOT_OPTIONS.find((option) => option.id === selectedScaleRoot);
    const type = selectedScaleTypeOptions[selectedScaleType] ?? selectedScaleTypeOptions.minor;
    const family = SCALE_FAMILIES[selectedScaleFamily] ?? SCALE_FAMILIES.pentatonic;
    const rootLabel = `${root?.label ?? selectedScaleRoot}/${root?.solfege ?? SOLFEGE[selectedScaleRoot] ?? ""}`;
    return `${rootLabel} ${type.label} ${family.label} BOX${selectedScaleBox}`;
  }, [selectedScaleBox, selectedScaleFamily, selectedScaleRoot, selectedScaleType, selectedScaleTypeOptions]);
  const referenceCurrentLabel = selectedCategory.tutorial
    ? "현재 연습"
    : selectedCategory.id === "scale-block"
      ? "현재 음"
      : "현재 음표";
  const referenceNextLabel = selectedCategory.tutorial
    ? "다음 연습"
    : selectedCategory.id === "scale-block"
      ? "다음 음"
      : "다음 음표";
  const detectedReferenceScaleNote = detectedScaleNote;
  const debugTargetNote =
    appMode === APP_MODES.SHOOTER
      ? shooterTargets[0]?.detail ?? null
      : appMode === APP_MODES.PRACTICE
        ? currentPrompt ?? null
        : null;
  const shooterTarget =
    [...shooterTargets].sort((a, b) => b.y - a.y || a.bornAt - b.bornAt)[0] ?? null;
  const shooterTargetDetail = shooterTarget?.detail ?? (shooterTarget ? getShooterNoteDetail(shooterTarget.note) : null);
  const shooterGuidePitch = shooterTargetDetail?.octaveNote ?? shooterTargetDetail?.pitch;
  const shooterGuidePositions = shooterGuidePitch ? getFretboardPositionsForPitch(shooterGuidePitch) : [];
  const shooterLevel = getShooterLevel(hits);
  const shooterPreview = getShooterQueue(hits, shooterTarget ? Math.max(0, patternRef.current - 1) : patternRef.current, 5);
  const shooterMotion = shooterTarget
    ? {
        "--aim-shift": `${clampValue((shooterTarget.x - 50) * 0.42, -22, 22)}px`,
        "--aim-tilt": `${clampValue((shooterTarget.x - 50) * 0.09, -6, 6)}deg`,
        "--guitar-aim": `${clampValue((shooterTarget.x - 50) * 0.2 - (82 - shooterTarget.y) * 0.05, -18, 14)}deg`,
        "--arm-aim": `${clampValue((shooterTarget.x - 50) * 0.22 - (82 - shooterTarget.y) * 0.05, -20, 18)}deg`,
      }
    : shooterAim;
  const hasDirectionPractice = selectedCategory.id === "scale-block" || selectedCategory.id === "first-position";
  const directionGuideSequence =
    selectedCategory.id === "first-position" ? FIRST_POSITION_ASCENDING_SEQUENCE : selectedPentatonic.sequence;
  const scaleStartPitch = directionGuideSequence[0] ?? selectedScaleRoot;
  const scaleEndPitch = directionGuideSequence[directionGuideSequence.length - 1] ?? selectedScaleRoot;
  const contentHeader = appMode === APP_MODES.FRETBOARD_VIEWER
      ? { title: "지판보기", subtitle: "음표와 코드 위치를 빠르게 확인" }
    : appMode === APP_MODES.METRONOME
      ? { title: "메트로놈", subtitle: "템포와 박자를 빠르게 맞추는 독립 리듬 기준" }
    : appMode === APP_MODES.SHOOTER
      ? { title: "슈팅게임", subtitle: "리듬 반응을 게임처럼 반복 훈련" }
    : stage3StorageOpen
      ? { title: "", subtitle: "" }
    : selectedCategory.id === "rhythm" && appMode === APP_MODES.PRACTICE
      ? { title: "리듬 · 코드 전환", subtitle: "메트로놈 기반 코드 전환 훈련" }
    : selectedCategory.id === "scale-block" && appMode === APP_MODES.PRACTICE
      ? { title: "스케일 · 펜타토닉", subtitle: "박스 패턴으로 위치를 반복 학습" }
    : selectedCategory.id === "first-position" && appMode === APP_MODES.PRACTICE
      ? { title: "제로포지션 기본", subtitle: "개방현과 저포지션 음 위치 훈련" }
    : { title: "훈련장", subtitle: "메트로놈 기반 기타 리듬 트레이닝" };

  return (
    <main
      className={`app notranslate ${appMode === APP_MODES.MENU ? "menuApp" : ""} ${isSignalActive ? "signalGlow" : ""}`}
      translate="no"
    >
      {utilityMenuOpen ? (
        <div className="utilityMenuLayer" role="presentation">
          <button
            aria-label="부가 메뉴 닫기"
            className="utilityMenuDim"
            onClick={() => setUtilityMenuOpen(false)}
            type="button"
          />
          <aside
            aria-label="부가 기능 메뉴"
            className="utilityMenuPanel"
            id="utility-menu-panel"
          >
            <div className="utilityMenuHeader">
              <div>
                <span>Control Center</span>
                <strong>부가 기능</strong>
              </div>
              <button
                aria-label="메뉴 닫기"
                onClick={() => setUtilityMenuOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <nav className="utilityMenuList" aria-label="부가 기능 목록">
              <button className="utilityMenuItem utilityMenuItemPrimary" onClick={showStage3StorageRoom} type="button">
                <span className="utilityMenuIcon" aria-hidden="true">▦</span>
                <div className="utilityMenuText">
                  <strong>저장실</strong>
                  <small>코드 진행 및 주법 관리</small>
                </div>
                <span className="utilityMenuChevron" aria-hidden="true">›</span>
              </button>
              <button className="utilityMenuItem utilityMenuItemSecondary" type="button">
                <span className="utilityMenuIcon" aria-hidden="true">⌁</span>
                <div className="utilityMenuText">
                  <strong>연습기록</strong>
                  <small>최근 연습 내역 확인</small>
                </div>
                <span className="utilityMenuChevron" aria-hidden="true">›</span>
              </button>
              <button className="utilityMenuItem utilityMenuItemSecondary" type="button">
                <span className="utilityMenuIcon" aria-hidden="true">♪</span>
                <div className="utilityMenuText">
                  <strong>사운드설정</strong>
                  <small>메트로놈 및 효과음 설정</small>
                </div>
                <span className="utilityMenuChevron" aria-hidden="true">›</span>
              </button>
              <button className="utilityMenuItem utilityMenuItemSecondary" type="button">
                <span className="utilityMenuIcon" aria-hidden="true">⚙</span>
                <div className="utilityMenuText">
                  <strong>환경설정</strong>
                  <small>화면 및 연습 환경 조정</small>
                </div>
                <span className="utilityMenuChevron" aria-hidden="true">›</span>
              </button>
              {designLabEnabled ? (
                <button className="utilityMenuItem utilityMenuItemSecondary" onClick={showDesignLab} type="button">
                  <span className="utilityMenuIcon" aria-hidden="true">R</span>
                  <div className="utilityMenuText">
                    <strong>UI 실험실</strong>
                    <small>헤더 시안 비교 및 적용</small>
                  </div>
                  <span className="utilityMenuChevron" aria-hidden="true">›</span>
                </button>
              ) : null}
              <a
                className="utilityMenuItem utilityMenuItemSecondary utilityMenuItemExternal"
                href="https://www.instagram.com/sungsu91_/"
                rel="noreferrer"
                target="_blank"
              >
                <span className="utilityMenuIcon" aria-hidden="true">@</span>
                <div className="utilityMenuText">
                  <strong>문의하기</strong>
                  <small>@sungsu91_</small>
                </div>
                <span className="utilityMenuChevron" aria-hidden="true">↗</span>
              </a>
              <div className="utilityVersionInfo utilityInfoCard utilityInfoCardTertiary">
                <strong>버전정보</strong>
                <small>Fretboard Training v0.1</small>
              </div>
              <div className="utilityDeviceInfo utilityInfoCard utilityInfoCardTertiary" aria-label="기기 정보">
                <strong>기기 정보</strong>
                <dl>
                  <div>
                    <dt>현재 화면 폭</dt>
                    <dd>{deviceInfo.width}px</dd>
                  </div>
                  <div>
                    <dt>화면 크기</dt>
                    <dd>{deviceInfo.width}×{deviceInfo.height}</dd>
                  </div>
                  <div>
                    <dt>OS</dt>
                    <dd>{deviceInfo.os}</dd>
                  </div>
                  <div>
                    <dt>브라우저</dt>
                    <dd>{deviceInfo.browser}</dd>
                  </div>
                </dl>
                <p>
                  <b>반응형 지원 범위</b>
                  Fold 344px · Galaxy S 360px · Galaxy S Ultra 412px · iPhone 390px · Pro Max 430px
                </p>
                <small>
                  현재 버전은 테스트 버전입니다. 일부 기기에서는 UI가 다르게 표시될 수 있습니다. 문제가 발생하면 기기 정보와 함께 제보 부탁드립니다.
                </small>
              </div>
            </nav>
          </aside>
        </div>
      ) : null}

      {appMode !== APP_MODES.MENU && <section className="hud">
        <BrandHeader variant={headerVariant} />
        <div className="modeSwitch">
          <button
            className={appMode === APP_MODES.CURRICULUM || appMode === APP_MODES.PRACTICE ? "selected" : ""}
            onClick={showCurriculum}
            type="button"
          >
            <Guitar size={17} aria-hidden="true" />
            훈련장
          </button>
          <button
            className={appMode === APP_MODES.FRETBOARD_VIEWER ? "selected" : ""}
            onClick={showFretboardViewer}
            type="button"
          >
            <Grid3X3 size={17} aria-hidden="true" />
            지판 보기
          </button>
          <button
            className={appMode === APP_MODES.METRONOME ? "selected" : ""}
            onClick={showMetronomeMode}
            type="button"
          >
            <Timer size={17} aria-hidden="true" />
            메트로놈
          </button>
          <button
            className={appMode === APP_MODES.SHOOTER ? "selected" : ""}
            onClick={showShooterMode}
            translate="no"
            type="button"
          >
            <Gamepad2 size={17} aria-hidden="true" />
            슈팅게임
          </button>
          <button
            aria-controls="utility-menu-panel"
            aria-expanded={utilityMenuOpen}
            aria-label={utilityMenuOpen ? "옵션 닫기" : "옵션 열기"}
            className={utilityMenuOpen ? "selected" : ""}
            onClick={() => setUtilityMenuOpen((open) => !open)}
            type="button"
          >
            <Settings size={17} aria-hidden="true" />
            옵션
          </button>
        </div>
      </section>}

      {appMode === APP_MODES.MENU ? (
        <section className="mainHub notranslate" aria-label="Main menu" translate="no">
          <div className="hubAtmosphere" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="hubBrand">
            <img className="appMascotLogo" src="/images/capybara-logo.svg" alt="Fretboard Training" />
          </div>

          <div className="hubGuitarHead homeHeadstockImage" aria-hidden="true">
            <img className="headstockArtwork" src="/home-headstock.svg" alt="" />
            <span className="guitar-head-logo">
              <img src="/images/capybara-logo.svg" alt="" />
            </span>
          </div>

          <div className="hubMenuPanel">
            <button className="hubMenuButton viewer" onClick={showFretboardViewer} type="button">
              <span className="hubMenuBadge">01</span>
              <strong>지판보기</strong>
              <i className="hubMenuArrow" aria-hidden="true">›</i>
            </button>
            <button className="hubMenuButton rhythm" onClick={showCurriculum} type="button">
              <span className="hubMenuBadge">02</span>
              <strong>훈련장</strong>
              <i className="hubMenuArrow" aria-hidden="true">›</i>
            </button>
            <button
              aria-label="슈팅게임"
              className="hubMenuButton shooter notranslate"
              onClick={showShooterMode}
              title="슈팅게임"
              translate="no"
              type="button"
            >
              <span className="hubMenuBadge">03</span>
              <strong>슈팅게임</strong>
              <i className="hubMenuArrow" aria-hidden="true">›</i>
            </button>
            <button className="hubMenuButton metronome" onClick={showMetronomeMode} type="button">
              <span className="hubMenuBadge">04</span>
              <strong>메트로놈</strong>
              <i className="hubMenuArrow" aria-hidden="true">›</i>
            </button>
          </div>

          <div className="modeSwitch mainBottomNav" aria-label="앱 하단 네비게이션">
            <button className="selected" onClick={showMainMenu} type="button">
              홈
            </button>
            <button onClick={showFretboardViewer} type="button">
              지판보기
            </button>
            <button onClick={showCurriculum} type="button">
              훈련장
            </button>
            <button onClick={showMetronomeMode} type="button">
              메트로놈
            </button>
            <button onClick={showShooterMode} translate="no" type="button">
              슈팅게임
            </button>
          </div>
        </section>
      ) : appMode === APP_MODES.CURRICULUM ? (
        <section className="curriculum" aria-label="Beginner curriculum">
          <div className="trainingGrid stageMenu">
            {PRACTICE_CATEGORIES.filter((category) => !category.tutorial && !category.unavailable).map((category, index) => (
              <TrainingCard
                category={category}
                index={index}
                isSelected={pendingStageCardId === category.id}
                key={category.id}
                onClick={(event) => {
                  if (category.unavailable) return;
                  if (pendingStageCardId === category.id) {
                    event.currentTarget.blur();
                    enterPracticePreview(category);
                    return;
                  }
                  setPendingStageCardId(category.id);
                  setSelectedCategoryId(category.id);
                  setFeedback("Choose a practice card");
                  event.currentTarget.blur();
                }}
              />
            ))}
          </div>

        </section>
      ) : appMode === APP_MODES.DESIGN_LAB ? (
        <section className="designLabPanel" aria-label="RIFFLAB UI 실험실" style={logoPreviewStyle}>
          <ContentTitle title="Design Lab" subtitle="제작, 등록, 비교, 채택을 위한 RIFFLAB 전용 테스트 공간" />
          <div className="designLabStickyPreview" aria-label="현재 적용 헤더 미리보기">
            <div>
              <span>Live Header</span>
              <strong>{getHeaderVariantLabel(headerVariant)}</strong>
            </div>
            <BrandHeader variant={headerVariant} />
          </div>
          <nav className="designLabTabs" aria-label="Design Lab categories">
            {DESIGN_LAB_SECTIONS.map((section) => (
              <button
                className={designLabSection === section.id ? "selected" : ""}
                key={section.id}
                onClick={() => setDesignLabSection(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </nav>
          <section className="headerPreviewSection" aria-label="Header Preview">
            <div className="headerPreviewSectionTitle">
              <span>{DESIGN_LAB_SECTIONS.find((section) => section.id === designLabSection)?.label} Lab</span>
              <strong>
                {designLabSection === "logo"
                  ? `운영 Header: ${getHeaderVariantLabel(headerVariant)}`
                  : designLabSection === "app-icon"
                    ? `운영 App Icon: ${getAppIconVariantLabel(designLabAppIconState.activeIcon)}`
                    : "운영 화면에 적용하지 않는 시안 보관 영역"}
              </strong>
            </div>
            {designLabSection === "logo" ? (
              <>
                <div className="designLabLogoSizeControl" aria-label="Logo Size">
                  <span>Logo Size</span>
                  <button
                    disabled={logoPreviewScale <= 90}
                    onClick={() => setLogoPreviewScale((current) => Math.max(90, current - 10))}
                    type="button"
                  >
                    -
                  </button>
                  <strong>{logoPreviewScale}%</strong>
                  <button
                    disabled={logoPreviewScale >= 140}
                    onClick={() => setLogoPreviewScale((current) => Math.min(140, current + 10))}
                    type="button"
                  >
                    +
                  </button>
                </div>
                <div className="headerPreviewGrid">
                  {visibleHeaderVariants.map((variant) => {
                    const status = getHeaderLabStatus(variant.id, designLabHeaderState);
                    const isSelectedCandidate = selectedHeaderCandidateId === variant.id;
                    return (
                      <article
                        className={`headerPreviewCard ${headerVariant === variant.id ? "selected" : ""} ${isSelectedCandidate ? "candidateSelected" : ""}`}
                        key={variant.id}
                        onClick={() => setSelectedHeaderCandidateId(variant.id)}
                      >
                        <div className="headerPreviewMeta">
                          <span>{variant.title}</span>
                          <small>{variant.description}</small>
                          <em className={`designLabStatus designLabStatus--${getHeaderLabStatusClass(status)}`}>{status}</em>
                        </div>
                        <div className="headerPreviewDevice">
                          <BrandHeader variant={variant.id} />
                        </div>
                        <div className="designLabItemActions">
                          <button
                            className={isSelectedCandidate ? "selected" : ""}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedHeaderCandidateId(variant.id);
                            }}
                            type="button"
                          >
                            {isSelectedCandidate ? "선택됨" : "선택"}
                          </button>
                          <button
                            className={headerVariant === variant.id ? "selected" : ""}
                            onClick={(event) => {
                              event.stopPropagation();
                              applyHeaderVariant(variant.id);
                              setSelectedHeaderCandidateId(variant.id);
                            }}
                            type="button"
                          >
                            {headerVariant === variant.id ? "운영중" : "적용"}
                          </button>
                          <button
                            className={status === "잠금" ? "selected" : ""}
                            disabled={headerVariant === variant.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              holdHeaderVariant(variant.id);
                            }}
                            type="button"
                          >
                            {status === "잠금" ? "잠금 해제" : "잠금"}
                          </button>
                          <button
                            disabled={headerVariant === variant.id || status === "잠금"}
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteHeaderVariant(variant.id);
                            }}
                            type="button"
                          >
                            삭제
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : null}
            {designLabSection === "app-icon" ? (
              <div className="headerPreviewGrid designLabAppIconGrid">
                {visibleAppIconVariants.map((variant) => {
                  const status = getAppIconLabStatus(variant.id, designLabAppIconState);
                  const isActiveIcon = designLabAppIconState.activeIcon === variant.id;
                  const isSelectedCandidate = selectedAppIconCandidateId === variant.id;

                  return (
                    <article
                      className={`headerPreviewCard designLabAppIconCard ${isActiveIcon ? "selected" : ""} ${isSelectedCandidate ? "candidateSelected" : ""}`}
                      key={variant.id}
                      onClick={() => setSelectedAppIconCandidateId(variant.id)}
                    >
                      <div className="headerPreviewMeta">
                        <span>{variant.title}</span>
                        <small>{variant.description}</small>
                        <em className={`designLabStatus designLabStatus--${getHeaderLabStatusClass(status)}`}>{status}</em>
                      </div>
                      <div className="designLabAppIconPreviewSet" aria-label={`${variant.title} 크기별 미리보기`}>
                        <AppIconPreview variantId={variant.id} size="large" />
                        <div className="designLabAppIconSizes">
                          <AppIconPreview variantId={variant.id} size="medium" />
                          <AppIconPreview variantId={variant.id} size="small" />
                        </div>
                      </div>
                      <div className="designLabItemActions">
                        <button
                          className={isSelectedCandidate ? "selected" : ""}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedAppIconCandidateId(variant.id);
                          }}
                          type="button"
                        >
                          {isSelectedCandidate ? "선택됨" : "선택"}
                        </button>
                        <button
                          className={isActiveIcon ? "selected" : ""}
                          onClick={(event) => {
                            event.stopPropagation();
                            applyAppIconVariant(variant.id);
                            setSelectedAppIconCandidateId(variant.id);
                          }}
                          type="button"
                        >
                          {isActiveIcon ? "운영중" : "적용"}
                        </button>
                        <button
                          className={status === "잠금" ? "selected" : ""}
                          disabled={isActiveIcon}
                          onClick={(event) => {
                            event.stopPropagation();
                            holdAppIconVariant(variant.id);
                          }}
                          type="button"
                        >
                          {status === "잠금" ? "잠금 해제" : "잠금"}
                        </button>
                        <button
                          disabled={isActiveIcon || status === "잠금"}
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteAppIconVariant(variant.id);
                          }}
                          type="button"
                        >
                          삭제
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
            {designLabSection === "character" ? (
              <div className="headerPreviewGrid designLabCharacterGrid">
                {CHARACTER_LAB_VARIANTS.map((variant, index) => (
                  <article className="headerPreviewCard designLabCharacterCard" key={variant.id}>
                    <div className="headerPreviewMeta">
                      <span>{variant.title}</span>
                      <small>{variant.description}</small>
                    </div>
                    <CharacterLabPreview variantId={variant.id} />
                    <div className="designLabItemActions">
                      <button type="button">적용</button>
                      <button type="button">잠금</button>
                      <button disabled type="button">삭제</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {designLabSection === "component" ? (
              <div className="componentLabGrid">
                <article className="headerPreviewCard componentLabCard">
                  <div className="headerPreviewMeta">
                    <span>Training Card</span>
                    <small>훈련장 공용 카드 구조</small>
                  </div>
                  <button className="trainingCard stageMenuCard designLabTrainingCardPreview" type="button">
                    <span className="stageMenuCard__step">02</span>
                    <span className="stageMenuCard__content">
                      <strong className="stageMenuCard__title">스케일 · 펜타토닉</strong>
                      <small className="stageMenuCard__desc">박스 패턴으로 위치를 반복 학습</small>
                      <em className="stageMenuCard__tag">COMMON CARD</em>
                    </span>
                    <span className="stageMenuCard__arrow" aria-hidden="true">❯</span>
                  </button>
                  <div className="designLabComponentNote">현재 훈련장 카드의 공용 기준입니다.</div>
                </article>

                <article className="headerPreviewCard componentLabCard">
                  <div className="headerPreviewMeta">
                    <span>Button</span>
                    <small>START / 설정 / 메트로놈 버튼</small>
                  </div>
                  <div className="designLabButtonShelf">
                    <button className="trainingHudStartButton primary" type="button"><Play size={16} /> START</button>
                    <button className="trainingSettingsToggle" type="button">설정 접기</button>
                    <button className="selected" type="button">강박 ON</button>
                  </div>
                  <div className="designLabComponentNote">공용 버튼 크기와 텍스트 정렬 확인용입니다.</div>
                </article>

                <article className="headerPreviewCard componentLabCard">
                  <div className="headerPreviewMeta">
                    <span>Tab</span>
                    <small>화면/모드 전환 탭</small>
                  </div>
                  <div className="componentLabTabPreview">
                    <button className="selected" type="button">로고</button>
                    <button type="button">앱아이콘</button>
                    <button type="button">컴포넌트</button>
                  </div>
                  <div className="designLabComponentNote">Design Lab과 뷰어 탭의 공용 감각을 관리합니다.</div>
                </article>

                <article className="headerPreviewCard componentLabCard">
                  <div className="headerPreviewMeta">
                    <span>Badge</span>
                    <small>상태 / 버전 / 모드 표시</small>
                  </div>
                  <div className="componentLabBadgePreview">
                    <span className="designLabStatus designLabStatus--active">운영중</span>
                    <span className="designLabStatus designLabStatus--held">잠금</span>
                    <span className="designLabStatus designLabStatus--draft">실험중</span>
                  </div>
                  <div className="designLabComponentNote">상태 배지는 채택 흐름의 기준 요소입니다.</div>
                </article>

                <article className="headerPreviewCard componentLabCard componentLabCard--wide">
                  <div className="headerPreviewMeta">
                    <span>Dropdown</span>
                    <small>박자 / 세분 긴 목록 배치 비교</small>
                  </div>
                  <div className="componentLabDropdownComparison">
                    <ComponentLabDropdownPreview
                      description="1열 리스트: 익숙하지만 항목이 늘면 스크롤이 길어집니다."
                      flow="single"
                      items={COMPONENT_LAB_DROPDOWN_OPTIONS}
                      title="1열 리스트"
                    />
                    <ComponentLabDropdownPreview
                      description="2열 좌우 순서: 한 화면 정보량은 늘고, 좌우로 빠르게 비교됩니다."
                      flow="row"
                      items={COMPONENT_LAB_SUBDIVISION_OPTIONS}
                      title="2열 좌우"
                    />
                    <ComponentLabDropdownPreview
                      description="2열 세로 흐름: 왼쪽 열을 위아래로 훑은 뒤 오른쪽으로 넘어갑니다."
                      flow="vertical"
                      items={COMPONENT_LAB_DROPDOWN_OPTIONS}
                      title="2열 세로"
                    />
                  </div>
                  <div className="designLabComponentNote">최종 적용 전, 박자와 세분 항목이 늘어나는 상황을 가정한 드롭다운 후보입니다.</div>
                </article>

                <article className="headerPreviewCard componentLabCard">
                  <div className="headerPreviewMeta">
                    <span>Modal</span>
                    <small>부가기능 / 컨트롤 센터 패널</small>
                  </div>
                  <div className="componentLabModalPreview">
                    <div className="componentLabModalBar">
                      <span>MENU</span>
                      <button type="button">×</button>
                    </div>
                    <button className="utilityMenuItem utilityMenuItemPrimary" type="button">
                      <span className="utilityMenuIcon" aria-hidden="true">▦</span>
                      <div className="utilityMenuText">
                        <strong>저장실</strong>
                        <small>코드 진행 및 주법 관리</small>
                      </div>
                      <span className="utilityMenuChevron" aria-hidden="true">›</span>
                    </button>
                  </div>
                  <div className="designLabComponentNote">공용 모달/메뉴 패널의 밀도와 계층 확인용입니다.</div>
                </article>
              </div>
            ) : null}
            {designLabSection === "archive" ? (
              <div className="headerPreviewGrid">
                {ARCHIVED_HEADER_VARIANTS.map((variant) => (
                  <article className="headerPreviewCard designLabArchiveCard" key={variant.id}>
                    <div className="headerPreviewMeta">
                      <span>{variant.title}</span>
                      <small>{variant.description}</small>
                      <em className="designLabStatus designLabStatus--legacy">Archive</em>
                    </div>
                    <div className="headerPreviewDevice">
                      <BrandHeader variant={variant.id} />
                    </div>
                    <div className="designLabItemActions">
                      <button disabled type="button">보관됨</button>
                      <button disabled type="button">잠금</button>
                      <button disabled type="button">삭제</button>
                    </div>
                  </article>
                ))}
                {ARCHIVED_APP_ICON_VARIANTS.map((variant) => (
                  <article className="headerPreviewCard designLabArchiveCard designLabArchivedAppIconCard" key={variant.id}>
                    <div className="headerPreviewMeta">
                      <span>{variant.title}</span>
                      <small>{variant.description}</small>
                      <em className="designLabStatus designLabStatus--legacy">Archive</em>
                    </div>
                    <div className="designLabAppIconPreviewSet" aria-label={`${variant.title} 보관 미리보기`}>
                      <AppIconPreview variantId={variant.id} size="large" />
                      <div className="designLabAppIconSizes">
                        <AppIconPreview variantId={variant.id} size="medium" />
                        <AppIconPreview variantId={variant.id} size="small" />
                      </div>
                    </div>
                    <div className="designLabItemActions">
                      <button disabled type="button">보관됨</button>
                      <button disabled type="button">잠금</button>
                      <button disabled type="button">삭제</button>
                    </div>
                  </article>
                ))}
                {CARD_LAB_VARIANTS.map((variant, index) => (
                  <article className="headerPreviewCard designLabArchiveCard" key={variant.id}>
                    <div className="headerPreviewMeta">
                      <span>{variant.title}</span>
                      <small>{variant.description}</small>
                      <em className="designLabStatus designLabStatus--legacy">Legacy</em>
                    </div>
                    <button className={`trainingCard stageMenuCard designLabTrainingCardPreview designLabTrainingCardPreview--${index + 1}`} type="button">
                      <span className="stageMenuCard__step">{String(index + 1).padStart(2, "0")}</span>
                      <span className="stageMenuCard__content">
                        <strong className="stageMenuCard__title">스케일 · 펜타토닉</strong>
                        <small className="stageMenuCard__desc">박스 패턴으로 위치를 반복 학습</small>
                        <em className="stageMenuCard__tag">BOX PATTERN</em>
                      </span>
                      <span className="stageMenuCard__arrow" aria-hidden="true">❯</span>
                    </button>
                    <div className="designLabItemActions">
                      <button disabled type="button">보관됨</button>
                      <button type="button">잠금</button>
                      <button disabled type="button">삭제</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </section>
      ) : appMode === APP_MODES.FRETBOARD_VIEWER ? (
        <section className="fretboardViewerPanel" aria-label="지판 보기">
          <div className="viewerControlPanel compactControls">
            <div className="viewerModeTabs" aria-label="지판 보기 종류">
              <button
                className={viewerMode === FRETBOARD_VIEWER_MODES.NOTE ? "selected" : ""}
                onClick={() => setViewerMode(FRETBOARD_VIEWER_MODES.NOTE)}
                type="button"
              >
                음표
              </button>
              <button
                className={viewerMode === FRETBOARD_VIEWER_MODES.SCALE ? "selected" : ""}
                onClick={() => setViewerMode(FRETBOARD_VIEWER_MODES.SCALE)}
                type="button"
              >
                스케일
              </button>
              <button
                className={viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? "selected" : ""}
                onClick={() => setViewerMode(FRETBOARD_VIEWER_MODES.CHORD)}
                type="button"
              >
                코드
              </button>
            </div>

            <section className="viewerMapCard" aria-label="전체 지판 음표" ref={viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? chordViewerRef : null}>
              <div className="viewerMapHeader">
                <div className="viewerMapHeaderTop">
                  <span>{viewerMode === FRETBOARD_VIEWER_MODES.NOTE ? "음표 위치" : viewerMode === FRETBOARD_VIEWER_MODES.SCALE ? "스케일 위치" : viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? "참고지판" : "기준 지판"}</span>
                  {viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? (
                    <button
                      className={`viewerAllButton ${isChordCatalogView ? "selected" : ""}`}
                      onClick={scrollToChordChart}
                      type="button"
                    >
                      전체보기
                    </button>
                  ) : null}
                </div>
                <strong>{viewerMapTitle}</strong>
              </div>
              <Fretboard
                className={`viewerSharedFretboard ${viewerMode === FRETBOARD_VIEWER_MODES.NOTE && viewerNoteFilter === "ALL" ? "allNotes" : ""} ${viewerShouldFitFretboard ? "fitRange" : ""}`}
                barres={viewerChordBarres}
                fretRange={viewerFretboardRange}
                mode={viewerMode}
                notes={viewerFretboardNotes.map((note) => ({
                  ...note,
                  label: viewerMode === FRETBOARD_VIEWER_MODES.CHORD && showChordFingeringGuide && note.finger
                    ? note.finger
                    : note.label,
                  isRoot:
                    viewerMode === FRETBOARD_VIEWER_MODES.CHORD
                      ? false
                      : viewerMode === FRETBOARD_VIEWER_MODES.SCALE
                        ? false
                        : viewerNoteFilter !== "ALL" && note.noteName === viewerNoteFilter,
                }))}
                rootNote={viewerMode === FRETBOARD_VIEWER_MODES.CHORD || viewerMode === FRETBOARD_VIEWER_MODES.SCALE ? "" : viewerNoteFilter === "ALL" ? "" : viewerNoteFilter}
                selectedNotes={viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? ["__chord-shape-only__"] : [...viewerMapPitchClasses]}
                showFretNumbers
                showFingering={viewerMode === FRETBOARD_VIEWER_MODES.CHORD && showChordFingeringGuide}
                showOnlySelected
                showStringNames
                stringStates={viewerChordStringStates}
              />
            </section>

            {viewerMode === FRETBOARD_VIEWER_MODES.NOTE ? (
              <div className="viewerNotePanel" aria-label="음표 선택">
                <span>음표 선택</span>
                <div>
                  <button className={viewerNoteFilter === "ALL" ? "selected" : ""} onClick={() => setViewerNoteFilter("ALL")} type="button">전체</button>
                  {CHROMATIC_NOTES.map((note) => (
                    <button className={viewerNoteFilter === note ? "selected" : ""} key={note} onClick={() => setViewerNoteFilter(note)} type="button">
                      {note}
                    </button>
                  ))}
                </div>
              </div>
            ) : viewerMode === FRETBOARD_VIEWER_MODES.SCALE ? (
              <div className="viewerSelectGrid">
                <label>
                  <span>키</span>
                  <select
                    aria-label="지판 보기 키 선택"
                    onChange={(event) => setViewerScaleRoot(event.target.value)}
                    value={viewerScaleRoot}
                  >
                    {SCALE_ROOT_OPTIONS.map((root) => (
                      <option key={root.id} value={root.id}>
                        {root.label} / {root.solfege}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>종류</span>
                  <select
                    aria-label="지판 보기 종류"
                    onChange={(event) => setViewerScaleFamily(event.target.value)}
                    value={viewerScaleFamily}
                  >
                    {Object.values(SCALE_FAMILIES).map((family) => (
                      <option key={family.id} value={family.id}>
                        {family.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span></span>
                  <select
                    aria-label="지판 보기 타입 선택"
                    onChange={(event) => setViewerScaleType(event.target.value)}
                    value={viewerScaleType}
                  >
                    {Object.values(viewerScaleTypeOptions).map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Box</span>
                  <select
                    aria-label="지판 보기 박스"
                    onChange={(event) => setViewerScaleBox(Number(event.target.value))}
                    value={viewerScaleBox}
                  >
                    {SCALE_BOX_OPTIONS.map((boxNumber) => (
                      <option key={boxNumber} value={boxNumber}>
                        Box {boxNumber}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? (
              <div className="chordBuilderPanel" aria-label="코드 운지 조합 선택">
                <div className="viewerChordSummaryRow">
                  <div className="chordBuilderSelected viewerChordPicked">
                    <span>선택 코드</span>
                    <strong>{selectedBuiltChord ? viewerSelectedChordName : "준비중"}</strong>
                  </div>
                  <button
                    className={`chordGuideToggle ${showChordFingeringGuide ? "selected" : ""}`}
                    onClick={() => setShowChordFingeringGuide((current) => !current)}
                    type="button"
                  >
                    운지
                    <b>{showChordFingeringGuide ? "ON" : "OFF"}</b>
                  </button>
                </div>
                <div className="viewerChordPositionGroup" aria-label="코드 표시 구간">
                  <span>표시 구간</span>
                  <div>
                    {CHORD_VIEWER_POSITIONS.map((position) => (
                      <button
                        className={viewerChordPosition === position.id ? "selected" : ""}
                        disabled={!viewerChordPositionData[position.id]}
                        key={position.id}
                        onClick={() => setViewerChordPosition(position.id)}
                        type="button"
                      >
                        {position.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="chordChipGroup">
                  <span>루트</span>
                  <div>
                    {chordRootOptions.map((root) => (
                      <button
                        className={viewerChordBaseRoot === root ? "selected" : ""}
                        key={root}
                        onClick={() => applyViewerChordSelection(root, "natural", "major", "none")}
                        type="button"
                      >
                        {root}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="chordChipGroup">
                  <span>변화표</span>
                  <div>
                    {CHORD_ACCIDENTAL_OPTIONS.map((accidental) => {
                      const hasDiagram = Boolean(
                        getChordFromSelector(viewerChordBaseRoot, accidental.id, viewerChordQuality, viewerChordExtension),
                      );
                      return (
                        <button
                          className={viewerChordAccidental === accidental.id ? "selected" : ""}
                          disabled={!hasDiagram}
                          key={accidental.id}
                          onClick={() => applyViewerChordSelection(viewerChordBaseRoot, accidental.id, viewerChordQuality, viewerChordExtension)}
                          type="button"
                        >
                          {accidental.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="chordChipGroup">
                  <span>성격</span>
                  <div>
                    {CHORD_QUALITY_OPTIONS.map((quality) => (
                      <button
                        className={viewerChordQuality === quality.id ? "selected" : ""}
                        key={quality.id}
                        onClick={() => {
                          applyViewerChordSelection(viewerChordBaseRoot, viewerChordAccidental, quality.id, viewerChordExtension);
                        }}
                        type="button"
                      >
                        {quality.label}
                        <small>{quality.shortLabel}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="chordChipGroup">
                  <span>옵션</span>
                  <div>
                    {availableChordExtensionOptions.map((extension) => {
                      const isDisabled = extension.disabled || !extension.hasDiagram;
                      return (
                        <button
                          className={viewerChordExtension === extension.id ? "selected" : ""}
                          disabled={isDisabled}
                          key={extension.id}
                          onClick={() => {
                            applyViewerChordSelection(viewerChordBaseRoot, viewerChordAccidental, viewerChordQuality, extension.id);
                          }}
                          type="button"
                        >
                          {extension.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

          </div>

          {viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? (
            <section className="chordCatalogPanel" aria-label="전체 코드표" ref={chordChartRef}>
              <div className="referenceHeader">
                <span>기타 코드표</span>
                <strong>전체 코드 운지</strong>
              </div>
              <div className="chordCatalogScroll">
                {chordCatalogGroups.map((group) => (
                  <div className="chordCatalogRow" key={group.root}>
                    <strong className="chordRootLabel">
                      {group.root}
                    </strong>
                    <div className="chordMiniGrid">
                      {group.chords.map((chord) => (
                        <button
                          className="chordMiniCard"
                          key={chord.id}
                          onClick={() => {
                            const rootParts = splitChordRootForSelector(chord.root);
                            setViewerChordBaseRoot(rootParts.baseRoot);
                            setViewerChordAccidental(rootParts.accidental);
                            setViewerChordRoot(chord.root);
                            setViewerChordQuality(chord.quality);
                            setViewerChordExtension(chord.extension);
                            setViewerChordId(chord.id);
                            setViewerChordPosition("position1");
                            scrollToChordViewer();
                          }}
                          type="button"
                        >
                          <span>{chord.displayName}</span>
                          <Fretboard
                            barres={chord.barres ?? []}
                            className="chordMiniSharedFretboard"
                            fretRange={getCompactFretRange(chord.notes, chord.barres)}
                            mode="chord"
                            notes={chord.notes
                              .filter((note) => Number(note.fretNumber) > 0)
                              .map((note, index) => ({
                                ...note,
                                id: `${chord.id}-mini-${note.stringNumber}-${note.fretNumber}-${index}`,
                                label: getChordDisplayNoteName(note.noteName),
                                isRoot: false,
                              }))}
                            rootNote=""
                            selectedNotes={["__chord-shape-only__"]}
                            showFingering={showChordFingeringGuide}
                            showFretNumbers
                            showStringNames={false}
                            stringStates={Object.fromEntries(
                              [1, 2, 3, 4, 5, 6]
                                .map((stringNumber) => [stringNumber, getChordStringState(chord, stringNumber)])
                                .filter(([, state]) => state === "x" || state === "o"),
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p>코드를 누르면 해당 운지를 크게 볼 수 있어요.</p>
            </section>
          ) : null}
        </section>
      ) : appMode === APP_MODES.METRONOME ? (
        <section className="standaloneMetronomePanel" aria-label="독립 메트로놈">
          <div className="metronomeHeroCard">
            <div>
              <span>BPM</span>
              <strong>{bpm}</strong>
              <small>{gameState === GAME_STATES.PLAYING ? (metronomeIsMutedCycle ? "COACH MUTE" : "PLAY") : "READY"}</small>
            </div>
          </div>

          <div className="metronomeTrainingHud" aria-label="매트로놈 훈련 상태">
            <div>
              <span>마디</span>
              <strong>{metronomeMeasureCount}</strong>
            </div>
            <div>
              <span>Auto BPM</span>
              <strong>{autoBpmEnabled ? `+${autoBpmStep}/${autoBpmBars}` : "OFF"}</strong>
            </div>
            <div>
              <span>Coach</span>
              <strong>{coachModeEnabled ? `${coachPlayBars}/${coachMuteBars}` : "OFF"}</strong>
            </div>
            <div>
              <span>상승</span>
              <strong>{autoBpmIncrements}</strong>
            </div>
          </div>

          <div className={`metronomeBeatMatrix ${metronomeIsMutedCycle ? "muted" : ""}`} aria-label="현재 박자 시각화">
            {Array.from({ length: metronomeBeatsPerMeasure }, (_, index) => (
              <span
                className={`${index === 0 ? "accent" : ""} ${beat === index && gameState === GAME_STATES.PLAYING ? "active" : ""}`}
                key={`beat-dot-${index}`}
              >
                {index + 1}
              </span>
            ))}
          </div>

          <div className="metronomeFocusPanel" aria-label="현재 메트로놈 상태">
            <div>
              <span>현재 BPM</span>
              <strong>{bpm}</strong>
            </div>
            <div>
              <span>현재 박</span>
              <strong>{gameState === GAME_STATES.PLAYING ? `${beat + 1}/${metronomeBeatsPerMeasure}` : `1/${metronomeBeatsPerMeasure}`}</strong>
            </div>
            <div>
              <span>소리 상태</span>
              <strong>{metronomeIsMutedCycle ? "MUTE" : "CLICK"}</strong>
            </div>
          </div>

          <MetronomeControl
            accentEnabled={metronomeAccent}
            bpm={bpm}
            className="standaloneMetronomeControl"
            countInEnabled={metronomeCountIn}
            inputId="standalone-bpm"
            onAccentChange={setMetronomeAccent}
            onBpmChange={changeBpm}
            onCountInChange={setMetronomeCountIn}
            onSubdivisionChange={setMetronomeSubdivision}
            onTimeSignatureChange={setMetronomeTimeSignature}
            onToneChange={setMetronomeTone}
            onRepeatChange={setMetronomeRepeat}
            repeatEnabled={metronomeRepeat}
            showCountIn
            showRepeat
            subdivision={metronomeSubdivision}
            timeSignature={metronomeTimeSignature}
            tone={metronomeTone}
          />

          <div className="metronomeTransport">
            <button
              aria-label={gameState === GAME_STATES.PLAYING ? "메트로놈 리셋" : "메트로놈 시작"}
              className={`metronomeTransportButton ${gameState === GAME_STATES.PLAYING ? "reset" : "primary"}`}
              onClick={gameState === GAME_STATES.PLAYING ? resetMetronomePractice : startMetronomePractice}
              type="button"
            >
              {gameState === GAME_STATES.PLAYING ? (
                <Square size={15} aria-hidden="true" />
              ) : (
                <Play size={17} aria-hidden="true" />
              )}
              {gameState === GAME_STATES.PLAYING ? "리셋" : "시작"}
            </button>
            <button
              aria-label="Tap Tempo"
              className="metronomeTapButton"
              onClick={handleTapTempo}
              type="button"
            >
              TAP
            </button>
          </div>

          <section className="feelRecorderPanel" aria-label="Feel Recorder">
              <div className="feelRecorderBody">
                <div className="feelRecorderHeader">
                  <div>
                    <span>Feel Recorder</span>
                    <strong>{feelRecorderActive ? "기록 중" : feelPlaybackActive ? "재생 중" : "대기"}</strong>
                  </div>
                  <button
                    className={feelRecorderActive ? "selected" : ""}
                    onClick={toggleFeelRecorder}
                    type="button"
                  >
                    {feelRecorderActive ? "기록 종료" : "기록 시작"}
                  </button>
                </div>

                <button
                  aria-label="리듬 입력 패드"
                  className={`feelRecorderPad ${feelRecorderActive ? "active" : ""}`}
                  disabled={!feelRecorderActive}
                  onPointerCancel={handleFeelPressEnd}
                  onPointerDown={handleFeelPressStart}
                  onPointerUp={handleFeelPressEnd}
                  type="button"
                >
                  <span>{feelRecorderActive ? "짧게 틱 · 길게 꾹" : "기록 시작 후 입력"}</span>
                  <strong>{feelRecorderEvents.length ? getFeelRecorderStrokeLine(feelRecorderEvents) : "—"}</strong>
                </button>

                <div className="feelRecorderOutput" aria-label="생성된 패턴">
                  <span>기록된 길이</span>
                  <strong>{feelRecorderEvents.length ? getFeelRecorderPatternLine(feelRecorderEvents) : "아직 기록 없음"}</strong>
                </div>

                <div
                  className={`feelPlayheadTrack ${feelRecorderEvents.length ? "" : "empty"}`}
                  aria-label="Feel Recorder 재생 위치"
                >
                  <div className="feelPlayheadPattern">
                    {feelRecorderEvents.length ? normalizeFeelRecorderEvents(feelRecorderEvents).map((event, index) => {
                      const totalMs = getFeelRecorderTotalUnits(feelRecorderEvents);
                      const left = (event.startMs / totalMs) * 100;
                      const width = Math.max(event.type === "hold" ? 4 : 1.2, ((event.endMs - event.startMs) / totalMs) * 100);
                      return (
                        <span
                          className={`${event.type === "hold" ? "hold" : "tick"} ${feelPlaybackIndex === index ? "active" : ""}`}
                          key={`feel-track-${index}-${event.type}-${Math.round(event.startMs)}`}
                          style={{ left: `${Math.min(99, left)}%`, width: `${Math.min(100 - left, width)}%` }}
                        />
                      );
                    }) : <span className="placeholder">패턴을 기록하면 재생선이 표시됩니다.</span>}
                  </div>
                  <i
                    className="feelPlayhead"
                    style={{ left: `${Math.min(100, Math.max(0, feelPlaybackProgress * 100))}%` }}
                    aria-hidden="true"
                  />
                </div>

                <div className="feelRecorderSaveRow">
                  <input
                    aria-label="Feel pattern name"
                    onChange={(event) => setFeelPatternName(event.target.value)}
                    placeholder="Blues Feel"
                    type="text"
                    value={feelPatternName}
                  />
                  <button disabled={!feelRecorderEvents.length} onClick={saveFeelPattern} type="button">
                    저장
                  </button>
                </div>

                <div className="feelRecorderActions">
                  <button
                    disabled={!feelRecorderEvents.length}
                    onClick={() => (feelPlaybackActive ? stopFeelPlayback() : playFeelPattern(feelRecorderEvents, feelPlaybackLoop))}
                    type="button"
                  >
                    {feelPlaybackActive ? "정지" : "재생"}
                  </button>
                  <button
                    className={feelPlaybackLoop ? "selected" : ""}
                    onClick={() => setFeelPlaybackLoop((value) => !value)}
                    type="button"
                  >
                    루프 {feelPlaybackLoop ? "ON" : "OFF"}
                  </button>
                  <button disabled={!feelRecorderEvents.length && !feelRecorderActive} onClick={clearFeelRecorder} type="button">
                    삭제
                  </button>
                </div>

                {savedFeelPatterns.length ? (
                  <div className="feelPatternList" aria-label="저장된 Feel 패턴">
                    {savedFeelPatterns.map((pattern) => (
                      <div className="feelPatternItem" key={pattern.id}>
                        <button onClick={() => setFeelRecorderEvents(pattern.events)} type="button">
                          <span>{pattern.name}</span>
                          <strong>{getFeelRecorderPatternLine(pattern.events)}</strong>
                        </button>
                        <button
                          onClick={() => {
                            setFeelRecorderEvents(pattern.events);
                            playFeelPattern(pattern.events, feelPlaybackLoop);
                          }}
                          type="button"
                        >
                          재생
                        </button>
                        <button onClick={() => deleteFeelPattern(pattern.id)} type="button">삭제</button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
          </section>

          <div className="standaloneMetronomeTimeline">
            <MetronomeTimeline
              beat={beat}
              beatsPerMeasure={metronomeBeatsPerMeasure}
              currentLabel={`${bpm}`}
              isPlaying={gameState === GAME_STATES.PLAYING}
              progress={stage3MeasureProgress}
              runnerLabel={`${beat + 1}`}
              timeSignature={metronomeTimeSignature}
            />
          </div>

          <div className="metronomeTrainingGrid" aria-label="기타 리듬 훈련 설정">
            <section className="metronomeTrainingCard">
              <div className="metronomeTrainingCardHeader">
                <span>Auto BPM</span>
                <button
                  className={autoBpmEnabled ? "selected" : ""}
                  onClick={() => setAutoBpmEnabled((value) => !value)}
                  type="button"
                >
                  {autoBpmEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <div className="metronomeSegmented">
                {[1, 2, 5].map((step) => (
                  <button className={autoBpmStep === step ? "selected" : ""} key={step} onClick={() => setAutoBpmStep(step)} type="button">
                    +{step}
                  </button>
                ))}
              </div>
              <div className="metronomeSegmented">
                {[5, 10, 20].map((bars) => (
                  <button className={autoBpmBars === bars ? "selected" : ""} key={bars} onClick={() => setAutoBpmBars(bars)} type="button">
                    {bars}마디
                  </button>
                ))}
              </div>
            </section>

            <section className="metronomeTrainingCard">
              <div className="metronomeTrainingCardHeader">
                <span>Coach Mode</span>
                <button
                  className={coachModeEnabled ? "selected" : ""}
                  onClick={() => setCoachModeEnabled((value) => !value)}
                  type="button"
                >
                  {coachModeEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <div className="metronomeCoachInputs">
                <label>
                  <span>재생</span>
                  <select value={coachPlayBars} onChange={(event) => setCoachPlayBars(Number(event.target.value))}>
                    {[1, 2, 4, 8].map((bars) => <option key={bars} value={bars}>{bars}마디</option>)}
                  </select>
                </label>
                <label>
                  <span>무음</span>
                  <select value={coachMuteBars} onChange={(event) => setCoachMuteBars(Number(event.target.value))}>
                    {[1, 2, 4, 8].map((bars) => <option key={bars} value={bars}>{bars}마디</option>)}
                  </select>
                </label>
              </div>
            </section>
          </div>
        </section>
      ) : appMode === APP_MODES.SHOOTER ? (
        <section className="shooterPanel" aria-label="슈팅게임">
          <div className="shooterGameHud">
            <div>
              <span>콤보</span>
              <strong>{hits}</strong>
            </div>
            <div>
              <span>점수</span>
              <strong>{score}</strong>
            </div>
            <div>
              <span>목표음</span>
              <strong>{shooterTarget ? `${getSolfege(shooterTarget.note)} / ${shooterTarget.note}` : "준비"}</strong>
            </div>
            <div>
              <span>레벨</span>
              <strong>{shooterLevel.name}</strong>
            </div>
            <div className="shooterLivesHud">
              <span>생명</span>
              <strong className="lifeHearts" aria-label={`남은 목숨 ${shooterLives}`}>
                {Array.from({ length: SHOOTER_MAX_LIVES }, (_, index) => (
                  <i className={index < shooterLives ? "active" : ""} key={index}>♥</i>
                ))}
              </strong>
            </div>
          </div>

          <div className="modeHelper shooterHelper">
            반복 연습으로 지판 인식과 피킹 정확도를 키워보세요.
          </div>

          <div className={`shooterFretGuide ${showShooterFretGuide ? "" : "collapsed"}`}>
            <div>
              <span>목표</span>
              <strong className="guidePitch">
                {showShooterFretGuide && shooterGuidePitch
                  ? `${shooterGuidePitch} · ${getSolfege(shooterGuidePitch) || getPitchClass(shooterGuidePitch)}`
                  : "대기"}
              </strong>
              {showShooterFretGuide && shooterGuidePitch && (
                <div className="fretGuideChips" aria-label={`${shooterGuidePitch} 지판 위치`}>
                  {shooterGuidePositions.length ? (
                    shooterGuidePositions.map((position) => (
                      <b key={`${position.stringNumber}-${position.fretNumber}`}>
                        <span>{position.stringNumber}번줄</span>
                        <strong>{getFretLabel(position)}</strong>
                      </b>
                    ))
                  ) : (
                    <em>지판 위치 없음</em>
                  )}
                </div>
              )}
            </div>
            {!isMobileLayout && <div className={`detector mobileShooterDetector ${isSignalActive ? "active" : ""}`}>
              <Radio size={15} />
              <div>
                <span>감지음</span>
                <strong>{detected ? detected.pitch : "--"}</strong>
              </div>
            </div>}
            <button
              aria-pressed={showShooterFretGuide}
              onClick={() => setShowShooterFretGuide((value) => !value)}
              type="button"
            >
              {showShooterFretGuide ? "숨기기" : "보이기"}
            </button>
            <button
              className={`shooterMicButton ${streamRef.current ? "selected" : ""}`}
              onClick={startShooterMic}
              type="button"
            >
              <Mic size={15} />
              {streamRef.current ? "마이크 연결" : "마이크 시작"}
            </button>
          </div>

          <div className={`shooterArena ${stageFlash}`}>
            {shooterTargets.map((target) => {
              const targetDetail = target.detail ?? getShooterNoteDetail(target.note);
              return (
              <div
                className="enemy shooterEnemy fallingTarget"
                key={target.id}
                style={{
                  left: `${target.x}%`,
                  top: `${target.y}%`,
                  "--hit-note-size": `${NOTE_SIZE}px`,
                  ...getNoteColorStyle(target.note),
                }}
              >
                <em>{targetDetail?.solfege ?? getSolfege(target.note)}</em>
                <span>{targetDetail?.octaveNote ?? target.note}</span>
                <small>{getFretLabel(targetDetail)}</small>
              </div>
              );
            })}

            {projectiles.map((projectile) => {
              const progress = Math.min(1, (gameTimeRef.current - projectile.bornAt) / projectile.duration);
              const dx = projectile.endX - projectile.startX;
              const dy = projectile.endY - projectile.startY;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <div
                  className="laserBeam"
                  key={projectile.id}
                  style={{
                    left: `${projectile.startX}%`,
                    top: `${projectile.startY}%`,
                    width: `${length * progress}%`,
                    transform: `translateY(-50%) rotate(${angle}deg)`,
                  }}
                />
              );
            })}

            {particles.map((particle) => {
              const age = gameTimeRef.current - particle.bornAt;
              const distance = age / 34;
              const x = particle.x + Math.cos(particle.angle) * distance;
              const y = particle.y + Math.sin(particle.angle) * distance;
              return <span className="musicParticle" key={particle.id} style={{ left: `${x}%`, top: `${y}%` }}></span>;
            })}

            <div className={`guitarPlayer ${projectiles.length > 0 ? "shooting" : ""}`} style={shooterMotion}>
              <div className="riderAura" />
              <div className="riderHelmet">
                <span />
              </div>
              <div className="riderBody">
                <i className="riderArm" />
                <i className="riderJacket" />
              </div>
              <div className="neonGuitar" aria-hidden="true">
                <i className="guitarBody" />
                <i className="strumHand" />
                <i className="guitarNeck" />
                <i className="guitarHead">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </i>
                <i className="guitarMuzzle" />
              </div>
            </div>
            <div className="mobileShooterLives" aria-label={`남은 목숨 ${shooterLives}`}>
              {Array.from({ length: SHOOTER_MAX_LIVES }, (_, index) => (
                <i className={index < shooterLives ? "active" : ""} key={index}>♥</i>
              ))}
            </div>
            {gameState !== GAME_STATES.PLAYING && (
              <div className={`shooterCenterStatus ${classNameFromLabel(feedback)} ${gameState === GAME_STATES.GAMEOVER ? "gameOver" : ""}`}>
                <strong>{gameState === GAME_STATES.GAMEOVER ? "게임 오버" : t(feedback)}</strong>
                {gameState === GAME_STATES.GAMEOVER && <span></span>}
                <button className="mobileShooterStartButton primary" onClick={() => startShooter()} type="button">
                  <Play size={18} />
                  시작
                </button>
              </div>
            )}
          </div>

        </section>
      ) : selectedCategory.id === "rhythm" && stage3StorageOpen ? (
        <section className="stage3StorageRoom chordTransitionPanel" aria-label="코드 진행 저장실">
          <div className="stage3StorageHeader">
            <div>
              <span>저장실</span>
            </div>
            <button onClick={() => {
              setStage3StorageOpen(false);
              setAppMode(APP_MODES.PRACTICE);
              setSelectedCategoryId("rhythm");
            }} type="button">
              뒤로가기
            </button>
          </div>

          <div className="stage3StorageSelectPanel">
            <label>
              <span>저장된 진행 선택</span>
              <select
                aria-label="저장된 코드 진행 선택"
                onChange={(event) => setStage3StorageSelectedId(event.target.value)}
                value={stage3StorageSelectedId}
              >
                <option value="">저장된 진행 선택</option>
                {stage3QuickSlots.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="stage3StorageSelectActions">
              <button disabled={!selectedStage3StorageItem} onClick={() => editStage3StorageItem(selectedStage3StorageItem)} type="button">
                불러오기
              </button>
              <button
                disabled={!selectedStage3StorageItem}
                onClick={() => {
                  if (!selectedStage3StorageItem) return;
                  const ok = window.confirm(`${selectedStage3StorageItem.title} 진행을 삭제하시겠습니까?`);
                  if (ok) deleteStage3StorageItem(selectedStage3StorageItem.id);
                }}
                type="button"
              >
                삭제
              </button>
            </div>
          </div>

          <div className="stage3StorageEditor">
            <label>
              <span>제목</span>
              <input
                onChange={(event) => setStage3StorageTitle(event.target.value)}
                placeholder="예: 1625 기본"
                type="text"
                value={stage3StorageTitle}
              />
            </label>
            <label>
              <span>코드 진행</span>
              <input readOnly type="text" value={stage3StorageProgressionLabel} />
            </label>
            <label>
              <span>BPM</span>
              <input
                inputMode="numeric"
                max="180"
                min="40"
                onChange={(event) => setStage3StorageBpm(clampBpm(event.target.value))}
                type="number"
                value={stage3StorageBpm}
              />
            </label>
            <label>
              <span>박자</span>
              <select
                onChange={(event) => setStage3StorageTimeSignature(event.target.value)}
                value={stage3StorageTimeSignature}
              >
                {TIME_SIGNATURE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>카포</span>
              <input
                inputMode="numeric"
                max="12"
                min="0"
                onChange={(event) => setStage3StorageCapo(Math.max(0, Math.min(12, Number(event.target.value) || 0)))}
                type="number"
                value={stage3StorageCapo}
              />
            </label>
            <label>
              <span>메모</span>
              <input
                onChange={(event) => setStage3StorageMemo(event.target.value)}
                placeholder="예: 기본 1625 진행"
                type="text"
                value={stage3StorageMemo}
              />
            </label>
            <div className="stage3StorageActions">
              <button disabled={!hasStage3StorageProgression} onClick={() => saveStage3StorageItem("update")} type="button">
                수정 저장
              </button>
            </div>
          </div>

          <div className="stage3ChordBuilder" aria-label="저장실 코드 선택">
            <div className="chordChipGroup">
              <span>루트</span>
              <div>
                {chordRootOptions.map((root) => (
                  <button
                    className={stage3ChordBaseRoot === root ? "selected" : ""}
                    key={root}
                    onClick={() => applyStage3ChordSelection(root, "natural", "major", "none")}
                    type="button"
                  >
                    {root}
                  </button>
                ))}
              </div>
            </div>
            <div className="chordChipGroup">
              <span>변화표</span>
              <div>
                {CHORD_ACCIDENTAL_OPTIONS.map((accidental) => {
                  const hasDiagram = Boolean(
                    getChordFromSelector(stage3ChordBaseRoot, accidental.id, stage3ChordQuality, stage3ChordExtension),
                  );
                  return (
                    <button
                      className={stage3ChordAccidental === accidental.id ? "selected" : ""}
                      disabled={!hasDiagram}
                      key={accidental.id}
                      onClick={() => applyStage3ChordSelection(stage3ChordBaseRoot, accidental.id, stage3ChordQuality, stage3ChordExtension)}
                      type="button"
                    >
                      {accidental.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="chordChipGroup">
              <span>성격</span>
              <div>
                {CHORD_QUALITY_OPTIONS.map((quality) => (
                  <button
                    className={stage3ChordQuality === quality.id ? "selected" : ""}
                    key={quality.id}
                    onClick={() => applyStage3ChordSelection(stage3ChordBaseRoot, stage3ChordAccidental, quality.id, stage3ChordExtension)}
                    type="button"
                  >
                    {quality.label}
                    <small>{quality.shortLabel}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="chordChipGroup">
              <span>옵션</span>
              <div>
                {stage3AvailableExtensionOptions.map((extension) => {
                  const isDisabled = extension.disabled || !extension.hasDiagram;
                  return (
                    <button
                      className={stage3ChordExtension === extension.id ? "selected" : ""}
                      disabled={isDisabled}
                      key={extension.id}
                      onClick={() => applyStage3ChordSelection(stage3ChordBaseRoot, stage3ChordAccidental, stage3ChordQuality, extension.id)}
                      type="button"
                    >
                      {extension.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="chordChipGroup stage3StrumPickRow">
              <span>주법</span>
              <div className="stage3StrumChoiceButtons">
                <button aria-label="다운 업 주법 추가" onClick={addStage3StrumPair} type="button">↓↑</button>
                <button aria-label="다운 주법 추가" onClick={() => addStage3StrumStep("down", false)} type="button">↓</button>
                <button aria-label="업 주법 추가" onClick={() => addStage3StrumStep("up", false)} type="button">↑</button>
              </div>
            </div>
            <div className="stage3AddRow">
              <strong>
                <span>선택코드</span>
                {stage3SelectedChord ? stage3SelectedChordName : "준비중"}
              </strong>
              <button
                className="primary"
                disabled={!stage3SelectedChord}
                onClick={() => {
                  if (!stage3SelectedChord) return;
                  setStage3StorageChordIds((ids) => [
                    ...ids,
                    { id: stage3SelectedChord.id, label: stage3SelectedChordName },
                  ]);
                }}
                type="button"
              >
                추가
              </button>
              <button
                onClick={() => {
                  setStage3StorageChordIds([]);
                }}
                type="button"
              >
                초기화
              </button>
            </div>
            <div className="stage3AddRow stage3StrumAddRow">
              <strong>
                <span>선택주법</span>
                {stage3StorageStrumDraftPattern.length ? (
                  <StrumPattern onStepClick={toggleStage3StrumHit} pattern={stage3StorageStrumDraftPattern} />
                ) : (
                  <small>주법을 선택하세요</small>
                )}
              </strong>
              <button
                className="primary"
                disabled={!stage3StorageStrumDraftPattern.length}
                onClick={() => addStage3StrumPatternDraft(0)}
                type="button"
              >
                추가1
              </button>
              <button
                className="primary"
                disabled={!stage3StorageStrumDraftPattern.length}
                onClick={() => addStage3StrumPatternDraft(1)}
                type="button"
              >
                추가2
              </button>
              <button
                disabled={!stage3StorageStrumDraftPattern.length && !stage3StorageStrumPattern.length}
                onClick={() => {
                  setStage3StorageStrumDraftPattern([]);
                  setStage3StorageStrumPattern([]);
                }}
                type="button"
              >
                초기화
              </button>
            </div>
          </div>

          <div className="chordProgressionOrderPanel">
            <div className="chordPreviewStack">
              <span>진행순서</span>
              <div className="progressionChipList">
                {hasStage3StorageProgression ? stage3StorageProgression.map((chord, index) => (
                  <strong className={index === chordPracticeIndex ? "active" : ""} key={`${chord.id}-${index}`}>
                    {chord.displayName}
                    <button
                      aria-label={`${chord.displayName} 제거`}
                      onClick={() => {
                        setStage3StorageChordIds((ids) => ids.filter((_, chordIndex) => chordIndex !== index));
                      }}
                      type="button"
                    >
                      ×
                    </button>
                  </strong>
                )) : (
                  <small className="chordProgressionEmpty">코드를 선택해서 추가하세요</small>
                )}
              </div>
            </div>
          </div>

          <div className="stage3OrderStrum" aria-label="추가된 주법">
              <span>추가된 주법</span>
              <div className="strumPreviewList">
                {stage3StorageStrumPattern.length ? (
                  normalizeStrumPatternGroups(stage3StorageStrumPattern).filter((row) => row.length).map((row, index) => (
                    <StrumPattern key={`storage-strum-row-${index}`} pattern={row} />
                  ))
                ) : (
                  <small className="chordProgressionEmpty">주법을 선택해서 추가하세요</small>
                )}
              </div>
            </div>
        </section>
      ) : selectedCategory.id === "rhythm" ? (
        <section className="chordTransitionPanel" aria-label="Chord transition practice">
          <div className={`chordTransitionControls ${stage3SetupCollapsed ? "collapsed" : ""}`}>
            <div>
              <div className="trainingDetailHeaderRow">
                <strong className="trainingDetailTitle">{getTrainingDetailTitle(selectedCategory)}</strong>
                <button
                  className="trainingSettingsToggle"
                  onClick={() => setStage3SetupCollapsed((value) => !value)}
                  type="button"
                >
                  설정 {stage3SetupCollapsed ? "펼치기" : "접기"}
                </button>
              </div>
            </div>
            {stage3SetupCollapsed ? (
              <div className="stage3CollapsedMemo">
                <label>
                  <span>메모</span>
                  <textarea
                    aria-label="현재 진행 메모"
                    disabled={!loadedStage3LibraryItem}
                    onChange={(event) => updateLoadedStage3Memo(event.target.value)}
                    placeholder={loadedStage3LibraryItem ? "메모를 입력하세요..." : "저장된 진행을 선택하면 메모가 표시됩니다."}
                    rows={3}
                    value={loadedStage3LibraryItem?.memo ?? ""}
                  />
                </label>
              </div>
            ) : null}
            <div className="chordProgressionPicker">
              <label>
                <span>저장된 진행</span>
                <select
                  aria-label="저장된 코드 진행 선택"
                  onChange={(event) => {
                    const selected = stage3QuickSlots.find((slot) => slot.id === event.target.value);
                    if (selected) applyStage3LibraryItem(selected);
                  }}
                  value={selectedStage3LibraryItem?.id ?? ""}
                >
                  <option value="">저장된 진행 선택</option>
                  {stage3QuickSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="stage3StorageOpenButton"
                onClick={openStage3Storage}
                type="button"
              >
                저장실
              </button>
            </div>
            <div className="trainingMetronomeShell stage3PlaybackControls">
              <MetronomeControl
                accentEnabled={metronomeAccent}
                bpm={bpm}
                className="trainingMetronomePanel chordTransitionTempo"
                countInEnabled={metronomeCountIn}
                inputId="stage3-bpm-presets"
                onAccentChange={setMetronomeAccent}
                onBpmChange={changeBpm}
                onCountInChange={setMetronomeCountIn}
                onRepeatChange={setRepeatPractice}
                onSubdivisionChange={setMetronomeSubdivision}
                onTimeSignatureChange={setMetronomeTimeSignature}
                onToneChange={setMetronomeTone}
                repeatEnabled={repeatPractice}
                subdivision={metronomeSubdivision}
                timeSignature={metronomeTimeSignature}
                tone={metronomeTone}
              />
            </div>
          </div>

          <div className="chordTransitionHud stage3ProgressHud">
            <MetronomeTimeline
              beat={beat}
              beatsPerMeasure={metronomeBeatsPerMeasure}
              currentLabel={`${bpm}`}
              isPlaying={gameState === GAME_STATES.PLAYING}
              progress={stage3MeasureProgress}
              runnerLabel={`${beat + 1}`}
              timeSignature={metronomeTimeSignature}
            />
            <button
              className={`trainingHudStartButton ${gameState === GAME_STATES.PLAYING ? "" : "primary"}`}
              disabled={gameState !== GAME_STATES.PLAYING && !hasChordTransitionProgression}
              onClick={gameState === GAME_STATES.PLAYING ? stopPracticeSession : () => startPractice(selectedCategory)}
              type="button"
            >
              {gameState === GAME_STATES.PLAYING ? <Square size={16} /> : <Play size={16} />}
              {gameState === GAME_STATES.PLAYING ? "STOP" : "START"}
            </button>
          </div>

          <div className="chordTransitionBody">
            <aside className="referenceFretboard chordTransitionChart" aria-label="Current chord fingering">
              <div className="referenceHeader">
                <div>
                  <div className="stage3ChartTitleRow">
                    <span className="stage3ChartTitleText">
                      현재 진행중 지판
                      {loadedStage3LibraryItem?.title ? ` - ${loadedStage3LibraryItem.title}` : ""}
                    </span>
                    <span className="stage3ChartStrumPreview">
                      <StrumPattern pattern={loadedStage3LibraryItem?.strum_pattern} />
                    </span>
                  </div>
                  <div className="currentProgressionReadout" aria-label="현재 진행중 코드 진행">
                    {hasChordTransitionProgression ? chordTransitionProgression.map((chord, index) => (
                      <button
                        className={index === chordPracticeIndex ? "active" : ""}
                        key={`readonly-${chord.id}-${index}`}
                        onClick={() => setStage3ProgressIndex(index)}
                        type="button"
                      >
                        {chord.displayName}
                      </button>
                    )) : (
                      <small>진행순서를 추가하세요</small>
                    )}
                  </div>
                  {chordPracticeCurrent.isEnharmonic && (
                    <small className="enharmonicNotice">
                      참고 운지: {chordPracticeCurrent.fretboardDisplayName} · {chordPracticeCurrent.displayName} = {chordPracticeCurrent.fretboardDisplayName} 동명음
                    </small>
                  )}
                </div>
              </div>
              {Number(loadedStage3LibraryItem?.capo) > 0 ? (
                <span className="stage3CapoBadge">{Number(loadedStage3LibraryItem.capo)}Capo</span>
              ) : null}
              <Fretboard
                barres={chordPracticeCurrent.barres ?? []}
                className="stageChordSharedFretboard fitRange"
                fretRange={getCompactFretRange(chordPracticeCurrent.notes, chordPracticeCurrent.barres)}
                mode="chord"
                notes={chordPracticeCurrent.notes
                  .filter((note) => Number(note.fretNumber) > 0)
                  .map((note, index) => ({
                    ...note,
                    id: `transition-${note.octaveNote}-${note.stringNumber}-${note.fretNumber}-${index}`,
                    label: showChordFingeringGuide ? note.finger : getChordDisplayNoteName(note.noteName),
                    isActive: false,
                    isRoot: false,
                  }))}
                rootNote=""
                selectedNotes={["__active-note-only__"]}
                showFretNumbers
                showStringNames
                stringStates={Object.fromEntries(
                  [1, 2, 3, 4, 5, 6]
                    .map((stringNumber) => [stringNumber, getChordStringState(chordPracticeCurrent, stringNumber)])
                    .filter(([, state]) => state === "x" || state === "o"),
                )}
              />
            </aside>

          </div>
        </section>
      ) : !LEGACY_PRACTICE_RENDERING_ENABLED ? (
        <section
          className={`referenceTrainingPanel ${selectedCategory.id === "scale-block" ? "scaleBlockTrainingPanel" : ""}`}
          aria-label="Reference fretboard training"
        >
          {selectedCategory.id !== "first-position" && selectedCategory.id !== "scale-block" ? (
            <ContentTitle {...contentHeader} />
          ) : null}
          <div className={`referenceTrainingToolbar ${stage3SetupCollapsed ? "collapsed" : ""}`}>
            <div>
              <div className="trainingDetailHeaderRow">
                <span className="trainingDetailTitle">{getTrainingDetailTitle(selectedCategory)}</span>
                <button
                  className="trainingSettingsToggle"
                  onClick={() => setStage3SetupCollapsed((value) => !value)}
                  type="button"
                >
                  설정 {stage3SetupCollapsed ? "펼치기" : "접기"}
                </button>
              </div>
            </div>
            {selectedCategory.id === "scale-block" && (
              <div className="scalePickerPanel referenceScalePicker">
                <label className="scaleKeySelect">
                  <span>키</span>
                  <select
                    aria-label="Scale root"
                    onChange={(event) => changeScaleRoot(event.target.value)}
                    value={selectedScaleRoot}
                  >
                    {SCALE_ROOT_OPTIONS.map((root) => (
                      <option key={root.id} value={root.id}>
                        {root.label} / {root.solfege}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="scaleTypeGroup">
                  <label>
                    <span>종류</span>
                    <select
                      aria-label="Scale family"
                      onChange={(event) => changeScaleFamily(event.target.value)}
                      value={selectedScaleFamily}
                    >
                      {Object.values(SCALE_FAMILIES).map((family) => (
                        <option key={family.id} value={family.id}>
                          {family.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>타입</span>
                    <select
                      aria-label="Scale type"
                      onChange={(event) => changeScaleType(event.target.value)}
                      value={selectedScaleType}
                    >
                      {Object.values(selectedScaleTypeOptions).map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="scaleBoxSelect">
                  <span>BOX</span>
                  <select
                    aria-label="Scale box"
                    onChange={(event) => changeScaleBox(event.target.value)}
                    value={selectedScaleBox}
                  >
                    {[1, 2, 3, 4, 5].map((box) => (
                      <option key={box} value={box}>
                        BOX{box}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <div className="trainingMetronomeShell referenceTrainingActions buttons playbackButtons">
              <MetronomeControl
                accentEnabled={metronomeAccent}
                bpm={bpm}
                className="trainingMetronomePanel referenceBpmControl"
                countInEnabled={metronomeCountIn}
                inputId="reference-bpm-presets"
                onAccentChange={setMetronomeAccent}
                onBpmChange={changeBpm}
                onCountInChange={setMetronomeCountIn}
                onRepeatChange={setRepeatPractice}
                onSubdivisionChange={setMetronomeSubdivision}
                onTimeSignatureChange={setMetronomeTimeSignature}
                onToneChange={setMetronomeTone}
                repeatEnabled={repeatPractice}
                subdivision={metronomeSubdivision}
                timeSignature={metronomeTimeSignature}
                tone={metronomeTone}
              />
            </div>
          </div>

          <div
            className={`chordTransitionHud referenceTransitionHud ${selectedCategory.id === "scale-block" || selectedCategory.id === "first-position" ? "scaleReferenceTimelineOnly" : ""}`}
            style={selectedCategory.id === "scale-block" || selectedCategory.id === "first-position" ? { gridTemplateColumns: "minmax(0, 1fr) auto" } : undefined}
          >
            {selectedCategory.id === "scale-block" || selectedCategory.id === "first-position" ? (
              <BeatIndicator
                beat={beat}
                beatsPerMeasure={metronomeBeatsPerMeasure}
                isPlaying={gameState === GAME_STATES.PLAYING}
                timeSignature={metronomeTimeSignature}
              />
            ) : (
              <MetronomeTimeline
                beat={beat}
                beatsPerMeasure={metronomeBeatsPerMeasure}
                currentLabel={getReferenceStageValue(referenceDisplayPrompt)}
                isPlaying={gameState === GAME_STATES.PLAYING}
                progress={stage3MeasureProgress}
                timeSignature={metronomeTimeSignature}
              />
            )}
            <button
              className={`trainingHudStartButton ${gameState === GAME_STATES.PLAYING ? "" : "primary"}`}
              onClick={gameState === GAME_STATES.PLAYING ? stopPracticeSession : () => startPractice(selectedCategory)}
              type="button"
            >
              {gameState === GAME_STATES.PLAYING ? <Square size={16} /> : <Play size={16} />}
              {gameState === GAME_STATES.PLAYING ? "STOP" : "START"}
            </button>
            {selectedCategory.id !== "scale-block" && selectedCategory.id !== "first-position" ? (
              <>
                <div className="chordNextCard">
                  <span>{referenceNextLabel}</span>
                  <strong>{getReferenceStageValue(referenceNextPrompt)}</strong>
                </div>
                <div className="chordNowCard">
                  <span>{referenceCurrentLabel}</span>
                  <strong>{getReferenceStageValue(referenceDisplayPrompt)}</strong>
                </div>
              </>
            ) : null}
          </div>

          <aside className="referenceFretboard referenceTrainingBoard" aria-label="Reference fretboard">
            <div className="referenceHeader">
              <span>참고 지판</span>
              <strong>
                {selectedCategory.id === "scale-block"
                  ? scaleReferenceTitle
                  : referenceDisplayPrompt
                    ? `${referenceDisplayPrompt.solfege ?? getSolfege(referenceDisplayPrompt.pitch)} / ${referenceDisplayPrompt.pitch}`
                    : "준비"}
              </strong>
            </div>
            <Fretboard
              className="trainingSharedFretboard fitRange"
              fretRange={referenceBoardRange}
              mode="training"
              notes={referenceBoardNotes}
              rootNote={selectedCategory.id === "scale-block" || selectedCategory.id === "first-position" ? "" : referenceDisplayPrompt?.noteName}
              selectedNotes={selectedCategory.id === "scale-block" || selectedCategory.id === "first-position" ? ["__active-note-only__"] : []}
              showFretNumbers
              showStringNames
              showOnlySelected={false}
            />
            <p>
              {gameState === GAME_STATES.PLAYING
                ? "하이라이트된 음을 지판에서 찾아 연주하세요."
                : "시작을 누르면 참고지판 중심으로 위치 찾기 연습을 진행합니다."}
            </p>
          </aside>
        </section>
      ) : LEGACY_PRACTICE_RENDERING_ENABLED ? (
        <section className="gamePanel" aria-label="Beginner scale block practice">
          <div className="gameToolbar">
            <div className="rhythmSubdivisionHeader">
              <span>리듬 분할</span>
              <strong>{noteSpeed.label}</strong>
            </div>
            <div className="judgmentModeBadge">
              <span>판정 모드</span>
              <strong>{currentJudgmentMode.shortLabel}</strong>
            </div>
            <div className="subdivisionButtons" aria-label="Rhythm subdivision">
              {Object.values(RHYTHM_SUBDIVISIONS).map((speed) => (
                <button
                  className={noteSpeed.label === speed.label ? "selected" : ""}
                  disabled={speed.disabled}
                  key={speed.label}
                  onClick={() => changeNoteSpeed(speed)}
                  type="button"
                >
                  <strong>{speed.label}</strong>
                  <span>{speed.hint}</span>
                </button>
              ))}
            </div>
            {!hasDirectionPractice && (
            <label className="mobileSelectControl mobileSubdivisionSelect">
              <span>리듬 분할</span>
              <select
                aria-label="리듬 분할 선택"
                onChange={(event) => {
                  const nextSpeed = Object.values(RHYTHM_SUBDIVISIONS).find((speed) => speed.label === event.target.value);
                  if (nextSpeed) changeNoteSpeed(nextSpeed);
                }}
                value={noteSpeed.label}
              >
                {Object.values(RHYTHM_SUBDIVISIONS).map((speed) => (
                  <option disabled={speed.disabled} key={speed.label} value={speed.label}>
                    {speed.label} / {speed.hint}
                  </option>
                ))}
              </select>
            </label>
            )}
            {hasDirectionPractice && (
              <div className="scaleDirectionPanel" aria-label="Scale direction">
                {selectedCategory.id === "scale-block" && (
                  <div className="scalePickerPanel">
                    <label className="scaleKeySelect">
                      <span></span>
                      <select
                        aria-label="Pentatonic root"
                        onChange={(event) => changeScaleRoot(event.target.value)}
                        value={selectedScaleRoot}
                      >
                        {SCALE_ROOT_OPTIONS.map((root) => (
                          <option key={root.id} value={root.id}>
                            {root.label} / {root.solfege}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="scaleTypeGroup">
                      <label>
                        <span>종류</span>
                        <select
                          aria-label="Scale family"
                          onChange={(event) => changeScaleFamily(event.target.value)}
                          value={selectedScaleFamily}
                        >
                          {Object.values(SCALE_FAMILIES).map((family) => (
                            <option key={family.id} value={family.id}>
                              {family.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span></span>
                        <select
                          aria-label="Scale type"
                          onChange={(event) => changeScaleType(event.target.value)}
                          value={selectedScaleType}
                        >
                          {Object.values(selectedScaleTypeOptions).map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="scaleBoxSelect">
                      <span>Box</span>
                      <select
                        aria-label="Scale box"
                        onChange={(event) => changeScaleBox(event.target.value)}
                        value={selectedScaleBox}
                      >
                        {SCALE_BOX_OPTIONS.map((boxNumber) => (
                          <option key={boxNumber} value={boxNumber}>
                            Box {boxNumber}
                          </option>
                        ))}
                      </select>
                    </label>
                    <strong>{selectedPentatonic.label}</strong>
                  </div>
                )}
                <label className="mobileSelectControl mobileDirectionSelect">
                  <span>진행 방향</span>
                  <select
                    aria-label="진행 방향 선택"
                    onChange={(event) => changeScaleDirection(event.target.value)}
                    value={scaleDirection}
                  >
                    {SCALE_DIRECTION_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mobileSelectControl mobileSubdivisionSelect">
                  <span>리듬 분할</span>
                  <select
                    aria-label="리듬 분할 선택"
                    onChange={(event) => {
                      const nextSpeed = Object.values(RHYTHM_SUBDIVISIONS).find((speed) => speed.label === event.target.value);
                      if (nextSpeed) changeNoteSpeed(nextSpeed);
                    }}
                    value={noteSpeed.label}
                  >
                    {Object.values(RHYTHM_SUBDIVISIONS).map((speed) => (
                      <option disabled={speed.disabled} key={speed.label} value={speed.label}>
                        {speed.label} / {speed.hint}
                      </option>
                    ))}
                  </select>
                </label>
                {SCALE_DIRECTION_OPTIONS.map((option) => (
                  <button
                    className={scaleDirection === option.id ? "selected" : ""}
                    key={option.id}
                    onClick={() => changeScaleDirection(option.id)}
                    type="button"
                  >
                    <strong>{option.label}</strong>
                    <span>
                      {option.id === SCALE_DIRECTIONS.ASC
                        ? `${scaleStartPitch}부터 위로`
                        : option.id === SCALE_DIRECTIONS.DESC
                          ? `${scaleEndPitch}부터 아래로`
                          : option.hint}
                    </span>
                  </button>
                ))}
                <label className="repeatToggle">
                  <input
                    checked={repeatPractice}
                    onChange={toggleRepeatPractice}
                    type="checkbox"
                  />
                  <span>반복 연습</span>
                  <small>{repeatPractice ? `${repeatCount}회 반복 후 멈춤` : "1회 후 멈춤"}</small>
                </label>
                <div className="repeatCountControl">
                  <span>반복</span>
                  <input
                    aria-label="Repeat count"
                    disabled={!repeatPractice && !isMobileLayout}
                    max={MAX_REPEAT_COUNT}
                    min={MIN_REPEAT_COUNT}
                    onChange={(event) => changeRepeatCount(event.target.value)}
                    type="number"
                    value={repeatCount}
                  />
                  <div className="repeatStepper" aria-label="반복 횟수 조절">
                    <button
                      aria-label="반복 횟수 올리기"
                      disabled={repeatCount >= MAX_REPEAT_COUNT}
                      onClick={() => changeRepeatCount(repeatCount + 1)}
                      type="button"
                    >
                      +
                    </button>
                    <button
                      aria-label="반복 횟수 줄이기"
                      disabled={repeatCount <= MIN_REPEAT_COUNT}
                      onClick={() => changeRepeatCount(repeatCount - 1)}
                      type="button"
                    >
                      -
                    </button>
                  </div>
                  <small></small>
                </div>
              </div>
            )}
          </div>

          <div className="compactControlRow">
          <div className="metronomePanel">
            <div>
              <span>메트로놈</span>
              <strong>{bpm} BPM</strong>
            </div>
            <button onClick={() => changeBpm(bpm - 1)} type="button">-</button>
            <input
              aria-label="BPM"
              max={MAX_BPM}
              min={MIN_BPM}
              onChange={(event) => changeBpm(event.target.value)}
              type="number"
              value={bpm}
            />
            <label className="mobileBpmPresetSelect">
              <span>빠른 BPM</span>
              <select
                aria-label="빠른 BPM 선택"
                onChange={(event) => changeBpm(event.target.value)}
                value={BPM_PRESETS.includes(bpm) ? bpm : ""}
              >
                <option value="">선택</option>
                {BPM_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => changeBpm(bpm + 1)} type="button">+</button>
            <div className="bpmPresets">
              {BPM_PRESETS.map((preset) => (
                <button
                  className={bpm === preset ? "selected" : ""}
                  key={preset}
                  onClick={() => changeBpm(preset)}
                  type="button"
                >
                  {preset}
                </button>
              ))}
            </div>
            <button
              className={metronomeOn ? "selected" : ""}
              onClick={() => setMetronomeOn((value) => !value)}
              type="button"
            >
              {metronomeOn ? "메트로놈 켜짐" : "메트로놈 꺼짐"}
            </button>
          </div>

          <div className="inlinePlaybackControls compactControls">
            <div className="buttons playbackButtons">
              <button className="primary" onClick={() => startPractice(selectedCategory)} type="button">
                <Play size={18} />
                시작
              </button>
              <button
                onClick={gameState === GAME_STATES.PAUSED ? resumeGame : pauseGame}
                type="button"
                disabled={gameState !== GAME_STATES.PLAYING && gameState !== GAME_STATES.PAUSED}
              >
                <Pause size={18} />
                {gameState === GAME_STATES.PAUSED ? "계속" : "일시정지"}
              </button>
              <button onClick={stopPracticeSession} type="button">
                <Square size={18} />
                정지
              </button>
            </div>
          </div>
          </div>

            <div className="practiceQueueRow">
              <div className="rhythmHelperStack">
                <p className="modeHelper stage2HelperText">
                  같은 음은 여러 위치에 있을 수 있어요. 참고 지판을 보면서 따라가세요.
                </p>
                {selectedCategory.id === "scale-block" && (
                  <p className="modeHelper stage2HelperText">
                    이론 암기보다 리듬과 손가락 컨트롤에 집중하세요.
                  </p>
                )}
              </div>
              {currentPrompt && (
                <div className="practiceHint">
              <span></span>
              <strong>{currentPrompt.solfege ?? getSolfege(currentPrompt.pitch)}</strong>
              <p>
                {currentPrompt.pitch} / {currentPrompt.hint ?? getStringFretLabel(currentPrompt)}
              </p>
            </div>
          )}

          {isPositionPracticeMode && selectedCategory.id !== "scale-block" && (
            <div className="positionWarning" role="note">
              {POSITION_MODE_WARNING}
            </div>
          )}

          <div className="nextNotes" aria-label="Next notes">
            <span>다음 음 순서</span>
            <div>
              {nextNotes.map((note, index) => (
                <strong
                  className={`${index === 0 ? "current" : ""} ${note.ghost ? "ghost" : ""}`}
                  key={`${note.pitch}-${note.stringNumber}-${note.fretNumber}-${index}`}
                  style={getNoteColorStyle(note.pitch)}
                >
                  <em>{note.solfege ?? getSolfege(note.pitch)}</em>
                  <small>{note.pitch}</small>
                </strong>
              ))}
            </div>
          </div>
          </div>

          <div className="rhythmWorkbench">
            <aside className="referenceFretboard" aria-label="Reference fretboard">
              <div className="referenceHeader">
                <span>참고 지판</span>
                <strong>
                  {selectedCategory.id === "scale-block"
                    ? detectedReferenceScaleNote
                      ? `${detectedReferenceScaleNote.solfege} / ${detectedReferenceScaleNote.pitch}`
                      : selectedPentatonic.label
                   : referenceDisplayPrompt ? `${referenceDisplayPrompt.solfege ?? getSolfege(referenceDisplayPrompt.pitch)} / ${referenceDisplayPrompt.pitch}` : "준비"}
                </strong>
              </div>
              {selectedCategory.id === "scale-block" ? (
                <div className="pentatonicFretboard">
                  <div
                    className="miniFretNumbers"
                    style={{ gridTemplateColumns: `repeat(${visibleFrets.length}, 1fr)` }}
                  >
                    {visibleFrets.map((fret) => (
                      <span key={fret}>{fret}</span>
                    ))}
                  </div>
                  <div
                    className="miniFretNumbers bottom"
                    style={{ gridTemplateColumns: `repeat(${visibleFrets.length}, 1fr)` }}
                  >
                    {visibleFrets.map((fret) => (
                      <span key={fret}>{fret}</span>
                    ))}
                  </div>
                  <div
                    className="miniFretColumns"
                    style={{ gridTemplateColumns: `repeat(${visibleFrets.length}, 1fr)` }}
                  >
                    {visibleFrets.map((fret) => (
                      <span key={fret} />
                    ))}
                  </div>
                  {referenceStrings.map((stringNumber) => (
                    <span
                      className={`miniString ${referenceDisplayPrompt?.stringNumber === stringNumber && !isMobileLayout ? "active" : ""}`}
                      key={stringNumber}
                      style={{ top: `${getReferenceStringTop(stringNumber)}%` }}
                    >
                      <b>{stringNumber}번줄</b>
                    </span>
                  ))}
                  {selectedPentatonic.notes.map((note) => {
                    const isActive =
                      referenceDisplayPrompt?.pitch === note.pitch &&
                      referenceDisplayPrompt?.stringNumber === note.stringNumber &&
                      referenceDisplayPrompt?.fretNumber === note.fretNumber;
                    return (
                      <span
                      className={`scaleNote ${isActive ? "active" : ""} ${detectedReferenceScaleNote && isActive ? "detectedActive" : ""}`}
                      key={`${note.octaveNote}-${note.stringNumber}-${note.fretNumber}`}
                      style={{
                        left: getReferenceFretLeft(note),
                        top: `${getReferenceStringTop(note)}%`,
                        ...getNoteColorStyle(note.octaveNote),
                      }}
                      >
                        <b>{note.octaveNote}</b>
                        <small>{note.solfege}</small>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="miniFretboard">
                  <div
                    className="miniFretNumbers"
                    style={{ gridTemplateColumns: `repeat(${visibleFrets.length}, 1fr)` }}
                  >
                    {visibleFrets.map((fret) => (
                      <span key={fret}>{fret}프렛</span>
                    ))}
                  </div>
                  <div
                    className="miniFretNumbers bottom"
                    style={{ gridTemplateColumns: `repeat(${visibleFrets.length}, 1fr)` }}
                  >
                    {visibleFrets.map((fret) => (
                      <span key={fret}>{fret}프렛</span>
                    ))}
                  </div>
                  <div
                    className="miniFretColumns"
                    style={{ gridTemplateColumns: `repeat(${visibleFrets.length}, 1fr)` }}
                  >
                    {visibleFrets.map((fret) => (
                      <span key={fret} />
                    ))}
                  </div>
                  {referenceStrings.map((stringNumber) => (
                    <span
                      className={`miniString ${referenceDisplayPrompt?.stringNumber === stringNumber && !isMobileLayout ? "active" : ""}`}
                      key={stringNumber}
                      style={{ top: `${getReferenceStringTop(stringNumber)}%` }}
                    >
                      <b>{stringNumber}번줄</b>
                    </span>
                  ))}
                  {isMobileLayout && selectedCategory.id === "first-position" && FIRST_POSITION_NOTES.map((note) => (
                    <span
                      className="miniStaticNote"
                      key={`fixed-${note.octaveNote}-${note.stringNumber}-${note.fretNumber}`}
                      style={{
                        left: getReferenceFretLeft(note),
                        top: `${getReferenceStringTop(note)}%`,
                        ...getNoteColorStyle(note.octaveNote),
                      }}
                    >
                      <b>{note.solfege ?? getSolfege(note.pitch)}</b>
                      <small>{note.octaveNote ?? note.pitch}</small>
                    </span>
                  ))}
                  {referenceDisplayPrompt && (
                    <span
                      className="miniNote"
                      style={{
                        left: getReferenceFretLeft(referenceDisplayPrompt),
                        top: `${getReferenceStringTop(referenceDisplayPrompt)}%`,
                        ...getNoteColorStyle(referenceDisplayPrompt.pitch),
                      }}
                    >
                      <b>{referenceDisplayPrompt.octaveNote ?? referenceDisplayPrompt.pitch}</b>
                      <small>{referenceDisplayPrompt.solfege ?? getSolfege(referenceDisplayPrompt.pitch)}</small>
                    </span>
                  )}
                </div>
              )}
              <p>
                {selectedCategory.id === "scale-block"
                  ? detectedReferenceScaleNote
                    ? "지금 친 음이 선택한 박스에서 빛나고 있어요"
                    : `${selectedPentatonic.label} 안에서 연주할 줄과 프렛을 확인하세요`
                  : referenceDisplayPrompt?.hint ?? "다음 음의 줄과 프렛을 확인하세요"}
              </p>
            </aside>

            <div className="mobileRhythmControls compactControls">
              <div className={`detector mobileDetector ${isSignalActive ? "active" : ""}`}>
                <Radio size={16} />
                <div>
                  <span>감지음</span>
                  <strong>{detected ? detected.pitch : "--"}</strong>
                </div>
              </div>
              <div className="buttons playbackButtons">
                <button className="primary" onClick={() => startPractice(selectedCategory)} type="button">
                  <Play size={17} />
                  시작
                </button>
                <button
                  disabled={gameState !== GAME_STATES.PLAYING && gameState !== GAME_STATES.PAUSED}
                  onClick={gameState === GAME_STATES.PAUSED ? resumeGame : pauseGame}
                  type="button"
                >
                  <Pause size={17} />
                  {gameState === GAME_STATES.PAUSED ? "계속" : "일시정지"}
                </button>
              </div>
            </div>

            <div
              className={`stage ${stageFlash}`}
              aria-label="Rhythm lanes"
              style={{
                "--hit-line-y": `${HIT_LINE_PERCENT}%`,
                "--hit-note-size": `${HIT_ZONE_SIZE}px`,
                "--hit-note-radius": `${HIT_ZONE_SIZE / 2}px`,
              }}
            >
              <div className="laneGrid">
                {laneStrings.map((stringNumber) => (
                  <div className="laneLabel" key={stringNumber}>
                    {stringNumber}번줄
                  </div>
                ))}
              </div>
              <div className="laneDividers">
                {laneStrings.map((stringNumber) => (
                  <span key={stringNumber} />
                ))}
              </div>
              <div className="statePill">{t(gameState)}</div>
              <div className="beatRail">
                {[0, 1, 2, 3].map((item) => (
                  <span className={beat === item && gameState === GAME_STATES.PLAYING ? "active" : ""} key={item} />
                ))}
              </div>

              {enemies.map((enemy) => {
                const fallDuration = enemy.hitAt - enemy.spawnAt;
                const progress = Math.min(
                  1.08,
                  Math.max(0, (gameTimeRef.current - enemy.spawnAt) / fallDuration),
                );
                const note =
                  enemy.detail ??
                  activeNotesRef.current.find((item) => item.pitch === enemy.note) ??
                  DEFAULT_CATEGORY.notes[0];
                return (
                  <div
                    className={`enemy ${enemy.ghost ? "ghost" : ""} ${!enemy.ghost && Math.abs(enemy.hitAt - gameTimeRef.current) <= HIT_WINDOW_MS ? "hit-ready" : ""}`}
                    key={enemy.id}
                    style={{
                      left: getLaneLeft(note),
                      top: `calc(${progress * HIT_LINE_PERCENT}% - ${NOTE_SIZE / 2}px)`,
                      ...getNoteColorStyle(enemy.note),
                    }}
                >
                  {(note.solfege ?? getSolfege(enemy.note)) && <em>{note.solfege ?? getSolfege(enemy.note)}</em>}
                  <span>{note.octaveNote ?? enemy.note}</span>
                  <small>{getFretLabel(note)}</small>
                  </div>
                );
              })}

              <div className="laneHitZones">
                {laneStrings.map((stringNumber) => {
                  const isActiveLane = hitZoneNote?.stringNumber === stringNumber;
                  return (
                    <div
                      className={`laneHitBox ${gameState === GAME_STATES.PLAYING ? `metronomePulse beat-${beat}` : ""} ${isActiveLane && isHitWindowActive ? "active" : ""}`}
                      key={stringNumber}
                      style={isActiveLane && hitZoneNote ? getNoteColorStyle(hitZoneNote.pitch) : undefined}
                    >
                      <span>{isActiveLane && isHitWindowActive ? "HIT" : ""}</span>
                    </div>
                  );
                })}
              </div>
              <div className="laneFeedbackLayer">
                {laneFeedback.map((item) => (
                  <span
                    className={`laneFeedback ${classNameFromLabel(item.label)}`}
                    key={item.id}
                    style={{ left: getLaneLeft(item.stringNumber) }}
                >
                  {item.shortLabel}
                </span>
                ))}
              </div>
            </div>
            {isMobileLayout && (
              <div className="mobilePracticeMiniStats" aria-label="Mobile practice stats">
                <span>
                  <em>Hit</em>
                  <strong>{hits}</strong>
                </span>
                <span>
                  <em>Miss</em>
                  <strong>{missCount}</strong>
                </span>
                <span>
                  <em>정확도</em>
                  <strong>{accuracy}%</strong>
                </span>
              </div>
            )}
            {!isMobileLayout && (
            <aside className="practiceStatsPanel" aria-label="Practice statistics">
              <div className="statsPanelHeader">
                <span>연습 현황</span>
                <strong>{selectedCategory.title}</strong>
              </div>
              <div className="statCard">
                <span>현재 BPM</span>
                <strong>{bpm}</strong>
              </div>
              <div className="statCard">
                <span>현재 콤보</span>
                <strong>{combo}</strong>
              </div>
              <div className="statCard">
                <span>최대 콤보</span>
                <strong>{maxCombo}</strong>
              </div>
              <div className="statCard">
                <span>정확도</span>
                <strong>{accuracy}%</strong>
              </div>
              <div className="statCard">
                <span>박자 정확도</span>
                <strong>{beatAccuracy}%</strong>
              </div>
              <div className="statCard">
                <span>음정 정확도</span>
                <strong>{noteAccuracy}%</strong>
              </div>
              <div className="summaryCards">
                <div>
                  <span>총 시도</span>
                  <strong>{attempts}</strong>
                </div>
                <div>
                  <span>완벽 판정</span>
                  <strong>{perfectCount}</strong>
                </div>
                <div>
                  <span>실패</span>
                  <strong>{missCount}</strong>
                </div>
                <div>
                  <span>가장 놓친 음</span>
                  <strong>{mostMissedNote}</strong>
                </div>
              </div>
            </aside>
            )}
          </div>
        </section>
      ) : null}

      {appMode === APP_MODES.SHOOTER && <section className="controlBar compactControls shooterControlBar">
        <div className={`detector ${isSignalActive ? "active" : ""}`}>
          <Radio size={20} />
          <div>
            <span>감지음</span>
            <strong>{detected ? detected.pitch : "--"}</strong>
          </div>
          <small>
            {detectedPitch
              ? `${detectedPitch.frequency.toFixed(1)} Hz / ${detected?.cents ?? 0} cents`
              : "신호를 기다리는 중"}
          </small>
        </div>

        <div className="buttons playbackButtons">
          {(appMode === APP_MODES.CURRICULUM || appMode === APP_MODES.PRACTICE) && (
            <>
              <button className="primary" onClick={() => startPractice(selectedCategory)} type="button">
                <Play size={18} />
                시작
              </button>
              <button
                onClick={gameState === GAME_STATES.PAUSED ? resumeGame : pauseGame}
                type="button"
                disabled={gameState !== GAME_STATES.PLAYING && gameState !== GAME_STATES.PAUSED}
              >
                <Pause size={18} />
                {gameState === GAME_STATES.PAUSED ? "계속" : "일시정지"}
              </button>
              <button onClick={stopPracticeSession} type="button">
                <Square size={18} />
                정지
              </button>
            </>
          )}

          {appMode === APP_MODES.SHOOTER && (
            <>
              <button className="primary" onClick={() => startShooter()} type="button">
                <Play size={18} />
                시작
              </button>
              <button
                className={streamRef.current ? "selected" : ""}
                onClick={startShooterMic}
                type="button"
              >
                <Mic size={18} />
                {streamRef.current ? "마이크 연결" : "마이크 시작"}
              </button>
              <button
                onClick={gameState === GAME_STATES.PAUSED ? resumeGame : pauseGame}
                type="button"
                disabled={gameState !== GAME_STATES.PLAYING && gameState !== GAME_STATES.PAUSED}
              >
                <Pause size={18} />
                {gameState === GAME_STATES.PAUSED ? "계속" : "일시정지"}
              </button>
              <button onClick={stopPracticeSession} type="button">
                <Square size={18} />
                정지
              </button>
              <button
                aria-label={shooterSoundOn ? "효과음 끄기" : "효과음 켜기"}
                aria-pressed={shooterSoundOn}
                className={`iconOnlyButton soundToggle ${shooterSoundOn ? "selected" : "muted"}`}
                onClick={() => setShooterSoundOn((value) => !value)}
                title={shooterSoundOn ? "효과음 끄기" : "효과음 켜기"}
                type="button"
              >
                <Music2 size={18} />
              </button>
            </>
          )}
        </div>
      </section>}

      {false && <section className="debugPanel">
        <div className={`micState ${classNameFromLabel(micLabel)}`}>
          {hasMic ? <Mic size={18} /> : <Volume2 size={18} />}
          <span>{t(micLabel)}</span>
        </div>
        <div className="meterBlock">
          <div className="meterHeader">
            <span>?낅젰 ?덈꺼</span>
            <strong>{Math.round(signalLevel * 100)}%</strong>
          </div>
          <div className="meter">
            <span style={{ width: `${Math.round(signalLevel * 100)}%` }} />
          </div>
          {showLowSignalWarning && <p>마이크 입력이 낮아요. 기타를 조금 더 가까이 두거나 입력 볼륨을 올려보세요.</p>}
        </div>
        <div className="debugGrid">
          <div>
            <span>二쇳뙆</span>
            <strong>{detectedPitch ? `${detectedPitch.frequency.toFixed(1)} Hz` : "--"}</strong>
          </div>
          <div>
            <span></span>
            <strong>{detectedPitch ? detectedPitch.note : "--"}</strong>
          </div>
          <div>
            <span>紐⑺몴 </span>
            <strong>{debugTargetNote?.octaveNote ?? debugTargetNote?.name ?? "--"}</strong>
          </div>
          <div>
            <span>감지음</span>
            <strong>{detected?.octaveNote ?? detected?.name ?? "--"}</strong>
          </div>
          <div>
            <span>紐⑺몴 二쇳뙆</span>
            <strong>{debugTargetNote?.frequency ? `${debugTargetNote.frequency.toFixed(2)} Hz` : "--"}</strong>
          </div>
          <div>
            <span>감지음</span>
            <strong>{detectedPitch ? `${detectedPitch.frequency.toFixed(2)} Hz` : "--"}</strong>
          </div>
          <div>
            <span>以??꾨젢</span>
            <strong>{debugTargetNote ? `${debugTargetNote.stringNumber}번줄 ${getFretLabel(debugTargetNote)}` : "--"}</strong>
          </div>
          <div>
            <span>?먯젙 紐⑤뱶</span>
            <strong>{currentJudgmentMode.shortLabel}</strong>
          </div>
          <div>
            <span>?좏샇</span>
            <strong>{signalLevel.toFixed(3)}</strong>
          </div>
          <div>
            <span>?꾩옱 BPM</span>
            <strong>{bpm}</strong>
          </div>
          <div>
            <span>?곗뒿 ?④퀎</span>
            <strong>{appMode === APP_MODES.PRACTICE || appMode === APP_MODES.SHOOTER ? selectedCategory.title : t(appMode)}</strong>
          </div>
        </div>
      </section>}
    </main>
  );
}

export default App;


