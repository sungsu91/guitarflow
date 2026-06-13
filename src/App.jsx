import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FolderOpen,
  Gamepad2,
  Grid3X3,
  Guitar,
  LoaderCircle,
  Mic,
  Music2,
  Pause,
  Play,
  Radio,
  Settings,
  Square,
  Timer,
  Volume2,
} from "lucide-react";
import { flushSync } from "react-dom";
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

function getPitchOctave(pitch) {
  const match = /\d+/.exec(pitch ?? "");
  return match ? Number(match[0]) : null;
}

function ChordBuilderOptionSection({ children, layout = "wrap", title }) {
  return (
    <section className={`chordBuilderOptionSection chordBuilderOptionSection--${layout}`}>
      <div className="chordBuilderChipGrid">{children}</div>
    </section>
  );
}

function ChordBuilderChip({
  children,
  className = "",
  disabled = false,
  onClick,
  selected = false,
}) {
  const chipClassName = [
    "chordBuilderChip",
    selected ? "selected" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      aria-pressed={selected}
      className={chipClassName}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
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
  if (suffix === "dim") return { root, quality: "dim", extension: "none", displayName: `${root}dim` };
  if (suffix === "aug") return { root, quality: "aug", extension: "none", displayName: `${root}aug` };
  if (suffix === "madd9") return { root, quality: "minor", extension: "add9", displayName: `${root}madd9` };
  if (suffix === "m9") return { root, quality: "minor", extension: "m9", displayName: `${root}m9` };
  if (suffix === "m6") return { root, quality: "minor", extension: "m6", displayName: `${root}m6` };
  if (suffix === "m7") return { root, quality: "minor", extension: "m7", displayName: `${root}m7` };
  if (suffix === "m") return { root, quality: "minor", extension: "none", displayName: `${root}m` };
  if (suffix === "7sus4") return { root, quality: "major", extension: "7sus4", displayName: `${root}7sus4` };
  if (suffix === "7") return { root, quality: "major", extension: "7", displayName: `${root}7` };
  if (suffix === "maj7") return { root, quality: "major", extension: "maj7", displayName: `${root}maj7` };
  if (suffix === "maj9") return { root, quality: "major", extension: "maj9", displayName: `${root}maj9` };
  if (suffix === "M7") return { root, quality: "major", extension: "maj7", displayName: `${root}maj7` };
  if (suffix === "sus2") return { root, quality: "major", extension: "sus2", displayName: `${root}sus2` };
  if (suffix === "sus4") return { root, quality: "major", extension: "sus4", displayName: `${root}sus4` };
  if (suffix === "6") return { root, quality: "major", extension: "6", displayName: `${root}6` };
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
const CHORD_VIEW_OPTION_BY_ID = new Map(CHORD_VIEW_OPTIONS.map((chord) => [chord.id, chord]));
const CHORD_VIEW_OPTION_BY_DISPLAY_NAME = new Map(CHORD_VIEW_OPTIONS.map((chord) => [chord.displayName, chord]));

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
  { id: "sharp", label: "#", suffix: "#" },
  { id: "flat", label: "b", suffix: "b" },
];

const CHORD_QUALITY_OPTIONS = [
  { id: "major", label: "Major", shortLabel: "" },
  { id: "minor", label: "Minor", shortLabel: "" },
  { id: "dim", label: "Dim", shortLabel: "" },
  { id: "aug", label: "Aug", shortLabel: "" },
];
const STAGE3_STORAGE_CHORD_QUALITY_OPTIONS = CHORD_QUALITY_OPTIONS.filter((quality) => (
  quality.id === "major" || quality.id === "minor"
));

const CHORD_EXTENSION_OPTIONS = [
  { id: "none", label: "기본", quality: "any" },
  { id: "7", label: "7", quality: "major" },
  { id: "maj7", label: "maj7", quality: "major" },
  { id: "m7", label: "7", quality: "minor" },
  { id: "sus2", label: "sus2", quality: "major" },
  { id: "sus4", label: "sus4", quality: "major" },
  { id: "7sus4", label: "7sus4", quality: "major" },
  { id: "6", label: "6", quality: "major" },
  { id: "m6", label: "6", quality: "minor" },
  { id: "add9", label: "add9", quality: ["major", "minor"] },
  { id: "m9", label: "9", quality: "minor" },
  { id: "maj9", label: "maj9", quality: "major" },
];

function isChordExtensionAvailableForQuality(option, quality) {
  if (!option) return false;
  if (option.quality === "any") return true;
  if (Array.isArray(option.quality)) return option.quality.includes(quality);
  return option.quality === quality;
}

function normalizeChordExtensionForQuality(quality, extension) {
  const option = CHORD_EXTENSION_OPTIONS.find((item) => item.id === extension);
  if (isChordExtensionAvailableForQuality(option, quality)) return extension;
  return "none";
}

function normalizeChordToken(value = "") {
  return value.trim().replace(/maj7/i, "maj7").replace(/M7$/, "maj7");
}

function getChordByDisplayName(name) {
  const normalized = normalizeChordToken(name);
  return CHORD_VIEW_OPTION_BY_DISPLAY_NAME.get(normalized) ?? null;
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
  if (quality === "dim") return `${root}dim`;
  if (quality === "aug") return `${root}aug`;
  if (quality === "minor") {
    if (extension === "m7") return `${root}m7`;
    if (extension === "m6") return `${root}m6`;
    if (extension === "m9") return `${root}m9`;
    if (extension === "add9") return `${root}madd9`;
    return `${root}m`;
  }
  if (extension === "7") return `${root}7`;
  if (extension === "maj7") return `${root}maj7`;
  if (extension === "maj9") return `${root}maj9`;
  if (extension === "sus2") return `${root}sus2`;
  if (extension === "sus4") return `${root}sus4`;
  if (extension === "7sus4") return `${root}7sus4`;
  if (extension === "6") return `${root}6`;
  if (extension === "add9") return `${root}add9`;
  return root;
}

const CHORD_TONE_INTERVALS = {
  major: {
    none: [0, 4, 7],
    "7": [0, 4, 7, 10],
    maj7: [0, 4, 7, 11],
    maj9: [0, 4, 7, 11, 14],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    "7sus4": [0, 5, 7, 10],
    "6": [0, 4, 7, 9],
    add9: [0, 4, 7, 14],
  },
  minor: {
    none: [0, 3, 7],
    m7: [0, 3, 7, 10],
    m6: [0, 3, 7, 9],
    m9: [0, 3, 7, 10, 14],
    add9: [0, 3, 7, 14],
  },
  dim: {
    none: [0, 3, 6],
  },
  aug: {
    none: [0, 4, 8],
  },
};
const CHORD_TONE_DEGREE_OFFSETS = {
  major: {
    none: [0, 2, 4],
    "7": [0, 2, 4, 6],
    maj7: [0, 2, 4, 6],
    maj9: [0, 2, 4, 6, 1],
    sus2: [0, 1, 4],
    sus4: [0, 3, 4],
    "7sus4": [0, 3, 4, 6],
    "6": [0, 2, 4, 5],
    add9: [0, 2, 4, 1],
  },
  minor: {
    none: [0, 2, 4],
    m7: [0, 2, 4, 6],
    m6: [0, 2, 4, 5],
    m9: [0, 2, 4, 6, 1],
    add9: [0, 2, 4, 1],
  },
  dim: {
    none: [0, 2, 4],
  },
  aug: {
    none: [0, 2, 4],
  },
};
const NOTE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_NOTE_INDEX = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function getChordToneDescriptors(root, quality = "major", extension = "none") {
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

function getChordToneNames(root, quality = "major", extension = "none") {
  return [...new Set(getChordToneDescriptors(root, quality, extension).map((descriptor) => descriptor.noteName))];
}

function getAccidentalLabel(offset) {
  if (offset === -2) return "bb";
  if (offset === -1) return "b";
  if (offset === 1) return "#";
  if (offset === 2) return "##";
  return "";
}

function formatChordToneLabel(noteName, displayRoot, descriptor) {
  const rootMatch = /^([A-G])([#b]?)/.exec(displayRoot ?? "");
  const rootLetter = rootMatch?.[1];
  const rootLetterIndex = NOTE_LETTERS.indexOf(rootLetter);
  const targetPitchIndex = NOTE_INDEX[noteName];
  if (rootLetterIndex < 0 || targetPitchIndex == null || !descriptor) return noteName;
  const targetLetter = NOTE_LETTERS[(rootLetterIndex + descriptor.degreeOffset) % NOTE_LETTERS.length];
  const naturalIndex = NATURAL_NOTE_INDEX[targetLetter];
  let accidentalOffset = targetPitchIndex - naturalIndex;
  if (accidentalOffset > 6) accidentalOffset -= 12;
  if (accidentalOffset < -6) accidentalOffset += 12;
  if (Math.abs(accidentalOffset) > 2) return noteName;
  return `${targetLetter}${getAccidentalLabel(accidentalOffset)}`;
}

function getChordViewerPositionRange(positionId) {
  const fallbackRange = [0, 15];
  if (positionId === CHORD_VIEWER_POSITION_ALL) return fallbackRange;
  return NOTE_VIEWER_POSITIONS.find((position) => position.id === positionId)?.range ?? fallbackRange;
}

function buildChordToneNotes({ root, displayRoot = root, quality, extension, positionId = "position1", idPrefix = "viewer-chord-tone" }) {
  const [startFret, endFret] = getChordViewerPositionRange(positionId);
  const toneDescriptors = getChordToneDescriptors(root, quality, extension);
  const toneByName = new Map(toneDescriptors.map((descriptor) => [descriptor.noteName, descriptor]));
  return STANDARD_TUNING.flatMap((stringInfo) => {
    const openMidi = pitchToMidi(stringInfo.pitch);
    return Array.from({ length: endFret - startFret + 1 }, (_, index) => startFret + index)
      .map((fretNumber) => {
        const pitch = midiToPitch(openMidi + fretNumber);
        const noteName = getPitchClass(pitch);
        const descriptor = toneByName.get(noteName);
        if (!descriptor) return null;
        return {
          id: `${idPrefix}-${root}-${quality}-${extension}-${positionId}-s${stringInfo.stringNumber}-f${fretNumber}`,
          stringNumber: stringInfo.stringNumber,
          fretNumber,
          pitch,
          octaveNote: pitch,
          noteName,
          label: formatChordToneLabel(noteName, displayRoot, descriptor),
          finger: null,
          isRoot: noteName === root,
        };
      })
      .filter(Boolean);
  });
}

function getChordShapeStringState(chord, stringNumber) {
  const note = chord?.notes?.find((item) => item.stringNumber === stringNumber);
  if (!note) return "x";
  return Number(note.fretNumber ?? note.fret ?? 0) === 0 ? "o" : "";
}

function buildStoredChordReferencePosition(chord) {
  if (!chord) return null;
  const frettedNotes = chord.notes
    .filter((note) => Number(note.fretNumber ?? note.fret ?? 0) > 0)
    .map((note, index) => ({
      ...note,
      id: `${chord.id}-position1-${note.stringNumber}-${note.fretNumber}-${index}`,
      label: getChordDisplayNoteName(note.noteName),
      isRoot: note.noteName === chord.root,
    }));
  const visibleFrets = chord.visibleFrets?.length
    ? chord.visibleFrets
    : getCompactFretRange(frettedNotes, chord.barres);
  return {
    id: `${chord.id}-position1`,
    notes: frettedNotes,
    barres: chord.barres ?? [],
    stringStates: Object.fromEntries(
      [1, 2, 3, 4, 5, 6]
        .map((stringNumber) => [stringNumber, getChordShapeStringState(chord, stringNumber)])
        .filter(([, state]) => state === "x" || state === "o"),
    ),
    visibleFrets,
  };
}

function buildCompactChordToneNotes({ root, displayRoot = root, quality, extension, positionId }) {
  const [startFret, endFret] = getChordViewerPositionRange(positionId);
  const centerFret = (startFret + endFret) / 2;
  const allToneNotes = buildChordToneNotes({
    root,
    displayRoot,
    quality,
    extension,
    positionId,
    idPrefix: "viewer-chord-compact",
  });
  const usedStrings = new Set();
  return getChordToneDescriptors(root, quality, extension)
    .map((descriptor, descriptorIndex) => {
      const candidates = allToneNotes
        .filter((note) => note.noteName === descriptor.noteName)
        .sort((a, b) => {
          const aFret = Number(a.fretNumber) || 0;
          const bFret = Number(b.fretNumber) || 0;
          const aScore =
            Math.abs(aFret - centerFret) * 3 +
            (usedStrings.has(a.stringNumber) ? 18 : 0) +
            (aFret === 0 ? 2 : 0) +
            Math.abs(Number(a.stringNumber) - 3.5) * 0.35;
          const bScore =
            Math.abs(bFret - centerFret) * 3 +
            (usedStrings.has(b.stringNumber) ? 18 : 0) +
            (bFret === 0 ? 2 : 0) +
            Math.abs(Number(b.stringNumber) - 3.5) * 0.35;
          return aScore - bScore;
        });
      const chosen = candidates[0];
      if (!chosen) return null;
      usedStrings.add(chosen.stringNumber);
      return {
        ...chosen,
        id: `${chosen.id}-tone${descriptorIndex}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.stringNumber - a.stringNumber || a.fretNumber - b.fretNumber);
}

function buildChordToneReferencePosition({ root, displayRoot = root, quality, extension, positionId, storedChord = null }) {
  if (positionId === "position1" && storedChord) {
    return buildStoredChordReferencePosition(storedChord);
  }
  const [startFret, endFret] = getChordViewerPositionRange(positionId);
  const isFullView = positionId === CHORD_VIEWER_POSITION_ALL;
  return {
    id: `${root}-${quality}-${extension}-${positionId}`,
    notes: isFullView
      ? buildChordToneNotes({ root, displayRoot, quality, extension, positionId })
      : buildCompactChordToneNotes({ root, displayRoot, quality, extension, positionId }),
    barres: [],
    stringStates: {},
    visibleFrets: Array.from({ length: endFret - Math.max(1, startFret) + 1 }, (_, index) => Math.max(1, startFret) + index),
  };
}

function buildChordToneReferenceOption({ root, displayRoot = root, quality, extension, displayName, hint = "선택 코드 구성음을 구간별로 표시합니다", storedChord = null }) {
  const position1 = buildChordToneReferencePosition({ root, displayRoot, quality, extension, positionId: "position1", storedChord });
  return {
    id: `generated-${root}-${quality}-${extension}`,
    root,
    displayRoot,
    quality,
    extension,
    displayName,
    hint,
    visibleFrets: position1.visibleFrets,
    notes: position1.notes,
    barres: [],
  };
}

function getChordCatalogOptionKey(chord) {
  return `${chord.displayName}-${chord.quality}-${chord.extension}`;
}

function buildSelectableChordCatalogOptions(baseRoot, accidental = "natural") {
  const lookupRoot = getChordLookupRoot(baseRoot, accidental);
  const displayRoot = getChordDisplayRoot(baseRoot, accidental);
  return CHORD_QUALITY_OPTIONS.flatMap((qualityOption) => {
    const quality = qualityOption.id;
    return CHORD_EXTENSION_OPTIONS
      .filter((extensionOption) => isChordExtensionAvailableForQuality(extensionOption, quality))
      .map((extensionOption) => {
        const extension = normalizeChordExtensionForQuality(quality, extensionOption.id);
        const storedChord = CHORD_VIEW_OPTIONS.find(
          (chord) =>
            chord.root === lookupRoot &&
            chord.quality === quality &&
            chord.extension === extension,
        ) ?? null;
        const displayName = getChordNameFromParts(baseRoot, accidental, quality, extension);
if (
  storedChord?.displayName === displayName &&
  storedChord.root === baseRoot
) {
          return storedChord;
        }
        return buildChordToneReferenceOption({
          root: baseRoot,
          displayRoot,
          quality,
          extension,
          displayName,
          hint: storedChord?.hint,
          storedChord,
        });
      });
  });
}

function mergeChordCatalogOptions(storedChords, generatedChords) {
  const storedByKey = new Map(storedChords.map((chord) => [getChordCatalogOptionKey(chord), chord]));
  const usedKeys = new Set();
  const orderedChords = generatedChords.map((chord) => {
    const key = getChordCatalogOptionKey(chord);
    usedKeys.add(key);
    return storedByKey.get(key) ?? chord;
  });
  storedChords.forEach((chord) => {
    const key = getChordCatalogOptionKey(chord);
    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      orderedChords.push(chord);
    }
  });
  return orderedChords;
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
      return CHORD_VIEW_OPTION_BY_ID.get(id)?.displayName ?? getChordEntryLabel(entry, null);
    })
    .filter(Boolean)
    .join(" - ");
}

const STAGE3_DEFAULT_BACKING_SETTINGS = {
  rhythmPattern: "4beat",
  bassBeat: "basic",
  pianoBeat: "2beat",
};

function makeStage3LibraryItem({
  id,
  title,
  chordIds,
  bpm = DEFAULT_BPM,
  timeSignature = "4/4",
  subdivision = "quarter",
  sound = "tick",
  capo = 0,
  backingRhythmPattern = STAGE3_DEFAULT_BACKING_SETTINGS.rhythmPattern,
  backingBassBeat = STAGE3_DEFAULT_BACKING_SETTINGS.bassBeat,
  backingPianoBeat = STAGE3_DEFAULT_BACKING_SETTINGS.pianoBeat,
  strum_pattern,
  strumPattern,
  strumSlots,
  selectedStrumSlot = 0,
  memo = "",
}) {
  const safeChordIds = Array.isArray(chordIds)
    ? chordIds.filter((entry) => CHORD_VIEW_OPTION_BY_ID.has(getChordEntryId(entry)))
    : [];
  const progression = getChordProgressionText(safeChordIds);
  const safeTitle = String(title || "").trim() || progression || "내 진행";
  const isPreset = String(id || "").startsWith("preset-");
  const normalizedStrumSlots = isPreset
    ? []
    : normalizeStrumPatternGroups(strum_pattern ?? strumPattern ?? strumSlots);
  const safeSelectedStrumSlot = Math.max(0, Math.min(1, Number(selectedStrumSlot) || 0));
  return {
    id: String(id || `slot-${Date.now()}`),
    title: safeTitle,
    label: `${safeTitle} — ${progression}`,
    chord_progression: progression,
    chordIds: safeChordIds,
    chords: safeChordIds,
    capo: Number.isFinite(Number(capo)) ? Math.max(0, Math.min(12, Number(capo))) : 0,
    bpm: clampBpm(bpm),
    time_signature: timeSignature,
    subdivision,
    sound,
    backingRhythmPattern,
    backingBassBeat,
    backingPianoBeat,
    strum_pattern: normalizedStrumSlots,
    strumPattern: normalizedStrumSlots,
    strumSlots: normalizedStrumSlots,
    selectedStrumSlot: safeSelectedStrumSlot,
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

const ChordMiniCard = memo(function ChordMiniCard({
  chord,
  getChordStringState,
  onSelect,
  showChordFingeringGuide,
}) {
  const miniNotes = useMemo(
    () => chord.notes
      .filter((note) => Number(note.fretNumber) > 0)
      .map((note, index) => ({
        ...note,
        id: `${chord.id}-mini-${note.stringNumber}-${note.fretNumber}-${index}`,
        label: getChordDisplayNoteName(note.noteName),
        isRoot: false,
      })),
    [chord],
  );
  const miniFretRange = useMemo(
    () => getCompactFretRange(chord.notes, chord.barres),
    [chord],
  );
  const stringStates = useMemo(
    () => Object.fromEntries(
      [1, 2, 3, 4, 5, 6]
        .map((stringNumber) => [stringNumber, getChordStringState(chord, stringNumber)])
        .filter(([, state]) => state === "x" || state === "o"),
    ),
    [chord, getChordStringState],
  );
  const handleClick = useCallback(() => {
    onSelect(chord);
  }, [chord, onSelect]);

  return (
    <button
      className="chordMiniCard"
      onClick={handleClick}
      type="button"
    >
      <span>{chord.displayName}</span>
      <Fretboard
        barres={chord.barres ?? []}
        className="chordMiniSharedFretboard"
        fretRange={miniFretRange}
        mode="chord"
        notes={miniNotes}
        rootNote=""
        selectedNotes={["__chord-shape-only__"]}
        showFingering={showChordFingeringGuide}
        showFretNumbers
        showStringNames={false}
        stringStates={stringStates}
      />
    </button>
  );
});

const ChordCatalogRow = memo(function ChordCatalogRow({
  getChordStringState,
  group,
  onSelectChord,
  showChordFingeringGuide,
}) {
  return (
    <div className="chordCatalogRow">
      <strong className="chordRootLabel">
        {group.root}
      </strong>
      <div className="chordMiniGrid">
        {group.chords.map((chord) => (
          <ChordMiniCard
            chord={chord}
            getChordStringState={getChordStringState}
            key={chord.id}
            onSelect={onSelectChord}
            showChordFingeringGuide={showChordFingeringGuide}
          />
        ))}
      </div>
    </div>
  );
});

const TIME_SIGNATURE_OPTIONS = [
  { id: "1/4", label: "1/4", beats: 1 },
  { id: "2/4", label: "2/4", beats: 2 },
  { id: "3/4", label: "3/4", beats: 3 },
  { id: "4/4", label: "4/4", beats: 4 },
  { id: "3/8", label: "3/8", beats: 3 },
  { id: "6/8", label: "6/8", beats: 6 },
  { id: "9/8", label: "9/8", beats: 9 },
  { id: "12/8", label: "12/8", beats: 12 },
];

const SUBDIVISION_OPTIONS = [
  { id: "quarter", label: "♪", longLabel: "1박 1클릭", clicksPerBeat: 1 },
  { id: "eighth", label: "♪♪", longLabel: "1박 2클릭", clicksPerBeat: 2 },
  { id: "sixteenth", label: "♬", longLabel: "1박 4클릭", clicksPerBeat: 4 },
];

const METRONOME_TONE_OPTIONS = [
  { id: "tick", label: "Tick" },
  { id: "agogo", label: "Agogo", src: "/sounds/agogobell.wav" },
  { id: "brushSnare", label: "Brush Snare", src: "/sounds/brushsnare.wav" },
  { id: "cabasa", label: "Cabasa", src: "/sounds/cabasa.wav" },
  { id: "clap", label: "Clap", src: "/sounds/clap.wav" },
  { id: "clave", label: "Clave", src: "/sounds/clave.wav" },
  { id: "hihat", label: "Closed Hat", src: "/sounds/closed hihat.wav" },
  { id: "congaSlap", label: "Conga Slap", src: "/sounds/congaslap.wav" },
  { id: "cowbell", label: "Cowbell", src: "/sounds/cowbell.wav" },
  { id: "fingerTap", label: "Finger Tap", src: "/sounds/fingertap.wav" },
  { id: "kick", label: "Kick", src: "/sounds/kick.wav" },
  { id: "openHihat", label: "Open Hat", src: "/sounds/openhihat.wav" },
  { id: "ride", label: "Ride", src: "/sounds/ride.wav" },
  { id: "rim", label: "Rim", src: "/sounds/rim.wav" },
  { id: "shaker", label: "Shaker", src: "/sounds/shaker.wav" },
  { id: "snap", label: "Snap", src: "/sounds/snap.wav" },
  { id: "snare", label: "Snare", src: "/sounds/snare.wav" },
  { id: "stick", label: "Stick", src: "/sounds/stick.wav" },
  { id: "tambourine", label: "Tambourine", src: "/sounds/tambourine.wav" },
  { id: "triangle", label: "Triangle", src: "/sounds/trangle.wav" },
  { id: "woodblock", label: "Woodblock", src: "/sounds/woodblock.wav" },
];
const STAGE3_FIXED_METRONOME_TONE_ID = "tick";

const BACKING_SAMPLE_SOURCES = {
  piano: "/sounds/gpg4.wav",
  kick: "/sounds/kick.wav",
  snare: "/sounds/snare.wav",
  hihat: "/sounds/closed hihat.wav",
  shaker: "/sounds/shaker.wav",
  bass_a: "/sounds/bass_a.wav",
  bass_b: "/sounds/bass_b.wav",
  bass_c: "/sounds/bass_c.wav",
  bass_d: "/sounds/bass_d.wav",
  bass_e: "/sounds/bass_e.wav",
  bass_f: "/sounds/bass_f.wav",
  bass_g: "/sounds/bass_g.wav",
};
const CORE_AUDIO_SAMPLE_SOURCES = Array.from(new Set([
  ...METRONOME_TONE_OPTIONS.map((toneOption) => toneOption.src).filter(Boolean),
  ...Object.values(BACKING_SAMPLE_SOURCES),
]));
const audioSampleArrayBufferCache = new Map();
const audioSampleFetchPromiseCache = new Map();

function fetchCachedAudioArrayBuffer(src) {
  if (!src || typeof fetch !== "function") return Promise.resolve(null);
  const cachedBuffer = audioSampleArrayBufferCache.get(src);
  if (cachedBuffer) return Promise.resolve(cachedBuffer.slice(0));

  let fetchPromise = audioSampleFetchPromiseCache.get(src);
  if (!fetchPromise) {
    fetchPromise = fetch(src)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load audio sample: ${src}`);
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        audioSampleArrayBufferCache.set(src, arrayBuffer);
        return arrayBuffer;
      })
      .finally(() => {
        audioSampleFetchPromiseCache.delete(src);
      });
    audioSampleFetchPromiseCache.set(src, fetchPromise);
  }

  return fetchPromise.then((arrayBuffer) => arrayBuffer.slice(0));
}

function warmCoreAudioSampleFiles() {
  if (typeof window === "undefined") return;
  CORE_AUDIO_SAMPLE_SOURCES.forEach((src) => {
    fetchCachedAudioArrayBuffer(src).catch((error) => {
      console.warn("Audio sample warmup skipped.", error);
    });
  });
}

const BACKING_FIXED_PART_GAINS = {
  drum: 0.58,
  bass: 0.55,
  piano: 0.36,
};
const BACKING_DEFAULT_PART_VOLUMES = {
  drum: 70,
  bass: 55,
  piano: 60,
};
const BACKING_PART_VOLUME_CONTROLS = [
  { id: "drum", label: "드럼" },
  { id: "bass", label: "베이스" },
  { id: "piano", label: "피아노" },
];
const BACKING_PART_TIMING_COMPENSATION_SECONDS = {
  bass: 0.006,
  piano: 0.016,
};

function clampBackingPartVolume(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function getBackingPartOutputGain(part, volume) {
  const safeVolume = clampBackingPartVolume(volume);
  const baseGain = BACKING_FIXED_PART_GAINS[part] ?? 0.5;
  const defaultVolume = BACKING_DEFAULT_PART_VOLUMES[part] || 70;
  return Math.max(0, Math.min(1.05, baseGain * (safeVolume / defaultVolume)));
}

function getBackingEventTimingCompensation(event) {
  if (!event) return 0;
  if (event.instrument === "drum") {
    if (event.sample === "kick") return event.shape === "round-kick" ? 0.006 : 0.004;
    if (event.sample === "hihat") return 0.002;
    return 0;
  }
  return BACKING_PART_TIMING_COMPENSATION_SECONDS[event.instrument] ?? 0;
}

const BACKING_NOTE_MIDI = {
  B3: 59,
  C4: 60,
  D4: 62,
  E4: 64,
  F4: 65,
  G4: 67,
  A4: 69,
};

const BACKING_ROOT_MIDI = {
  C: 60,
  D: 62,
  E: 64,
  F: 65,
  G: 67,
  A: 69,
  B: 59,
};

const BACKING_PIANO_VOICINGS = {
  C: ["C4", "E4", "G4"],
  Am: ["C4", "E4", "A4"],
  Dm: ["D4", "F4", "A4"],
  G7: ["B3", "D4", "F4", "G4"],
  F: ["C4", "F4", "A4"],
  G: ["B3", "D4", "G4"],
};

const getBackingRootLetter = (chord) => String(chord?.root || chord?.displayName || "C").match(/[A-G]/)?.[0] ?? "C";

const getBackingPianoVoicing = (chord) => {
  const chordName = String(chord?.displayName || "").replace(/\s+/g, "");
  if (BACKING_PIANO_VOICINGS[chordName]) return BACKING_PIANO_VOICINGS[chordName].map((note) => BACKING_NOTE_MIDI[note]);
  const rootLetter = getBackingRootLetter(chord);
  const rootMidi = BACKING_ROOT_MIDI[rootLetter] ?? 60;
  const isMinor = chord?.quality === "minor" || /m(?!aj)/.test(chordName);
  const isSeventh = chord?.extension === "7" || /7/.test(chordName);
  return [
    rootMidi,
    rootMidi + (isMinor ? 3 : 4),
    rootMidi + 7,
    ...(isSeventh ? [rootMidi + 10] : []),
  ];
};

const getBackingSessionKey = ({
  progression = [],
  bpmValue = DEFAULT_BPM,
  timeSignatureValue = "4/4",
  rhythmPattern = STAGE3_DEFAULT_BACKING_SETTINGS.rhythmPattern,
  bassBeat = STAGE3_DEFAULT_BACKING_SETTINGS.bassBeat,
  pianoBeat = STAGE3_DEFAULT_BACKING_SETTINGS.pianoBeat,
} = {}) => [
  clampBpm(bpmValue),
  timeSignatureValue,
  rhythmPattern,
  bassBeat,
  pianoBeat,
  progression.map((chord) => `${chord?.id ?? ""}:${chord?.displayName ?? chord?.fretboardDisplayName ?? ""}`).join("|"),
].join("::");

const createBackingTimelineEvents = ({
  progression = [],
  bpm = DEFAULT_BPM,
  timeSignature = "4/4",
  rhythmPattern = STAGE3_DEFAULT_BACKING_SETTINGS.rhythmPattern,
  bassBeat = STAGE3_DEFAULT_BACKING_SETTINGS.bassBeat,
  pianoBeat = STAGE3_DEFAULT_BACKING_SETTINGS.pianoBeat,
}) => {
  const signature = getTimeSignatureOption(timeSignature);
  const beatsPerMeasure = signature.beats;
  const safeBpm = clampBpm(bpm);
  const beatSeconds = getBeatMs(safeBpm) / 1000;
  const eighthOffset = beatSeconds / 2;
  const shuffleOffset = beatSeconds * 2 / 3;
  const sixteenthOffset = beatSeconds / 4;
  const cycleMeasures = Math.max(1, progression.length);
  const cycleSeconds = cycleMeasures * beatsPerMeasure * beatSeconds;
  const events = [];
  const addEvent = (offsetSeconds, instrument, sample, volume, playbackRate = 1, duration = null, stepIndex = 0, chordIndex = 0, shape = "") => {
    events.push({ offsetSeconds, instrument, sample, volume, playbackRate, duration, stepIndex, chordIndex, shape });
  };
  const addDrumEvent = (beatOffset, sample, offset = 0, volume = 0.5, beatInBar = 0, chordIndex = 0) => {
    const isKick = sample === "kick";
    const isDownbeatKick = isKick && beatInBar === 0;
    const drumDuration = isKick ? 0.18 : null;
    const drumShape = isDownbeatKick ? "round-kick" : isKick ? "kick" : "";
    addEvent(beatOffset + offset, "drum", sample, volume, 1, drumDuration, beatInBar, chordIndex, drumShape);
  };

  progression.forEach((chord, chordIndex) => {
    const measureOffset = chordIndex * beatsPerMeasure * beatSeconds;
    for (let beatInBar = 0; beatInBar < beatsPerMeasure; beatInBar += 1) {
      const beatOffset = measureOffset + beatInBar * beatSeconds;
      const addDrum = (sample, offset = 0, volume = 0.5) => addDrumEvent(beatOffset, sample, offset, volume, beatInBar, chordIndex);
      if (rhythmPattern === "4beat") {
        if (beatInBar === 0) addDrum("kick", 0, 1);
        if (beatInBar === 1) addDrum("snare", 0, 0.9);
        if (beatInBar === 2) addDrum("kick", 0, 0.76);
        if (beatInBar === 3) addDrum("snare", 0, 0.84);
      } else if (rhythmPattern === "shuffle") {
        addDrum("hihat", 0, beatInBar === 0 || beatInBar === 2 ? 0.26 : 0.21);
        addDrum("hihat", shuffleOffset, 0.16);
        if (beatInBar === 0) addDrum("kick", 0, 1);
        if (beatInBar === 1) addDrum("snare", 0, 0.88);
        if (beatInBar === 2) addDrum("kick", 0, 0.8);
        if (beatInBar === 3) addDrum("snare", 0, 0.82);
      } else if (rhythmPattern === "16beat") {
        addDrum("shaker", sixteenthOffset, beatInBar === 0 || beatInBar === 2 ? 0.08 : 0.07);
        addDrum("shaker", eighthOffset, beatInBar === 0 || beatInBar === 2 ? 0.14 : 0.12);
        addDrum("shaker", sixteenthOffset * 3, beatInBar === 1 || beatInBar === 3 ? 0.09 : 0.07);
        if (beatInBar === 0) {
          addDrum("kick", 0, 1);
          addDrum("kick", sixteenthOffset * 3, 0.22);
        }
        if (beatInBar === 1) {
          addDrum("snare", 0, 0.88);
        }
        if (beatInBar === 2) {
          addDrum("kick", 0, 0.78);
          addDrum("kick", eighthOffset, 0.24);
        }
        if (beatInBar === 3) {
          addDrum("snare", 0, 0.86);
          addDrum("kick", sixteenthOffset * 3, 0.2);
        }
      } else {
        addDrum("shaker", eighthOffset, beatInBar === 0 || beatInBar === 2 ? 0.15 : 0.13);
        if (beatInBar === 0) addDrum("kick", 0, 1);
        if (beatInBar === 1) addDrum("snare", 0, 0.88);
        if (beatInBar === 2) {
          addDrum("kick", 0, 0.76);
          addDrum("kick", eighthOffset, 0.22);
        }
        if (beatInBar === 3) {
          addDrum("snare", 0, 0.84);
        }
      }

      const rootLetter = getBackingRootLetter(chord).toLowerCase();
      const bassDuration = bassBeat === "16beat"
        ? Math.min(0.11, sixteenthOffset * 0.88)
        : bassBeat === "8beat"
          ? Math.min(0.18, eighthOffset * 0.9)
          : Math.min(0.28, beatSeconds * 0.75);
      const bassOffsets = bassBeat === "16beat"
        ? [0, sixteenthOffset, eighthOffset, sixteenthOffset * 3]
        : bassBeat === "8beat"
          ? [0, eighthOffset]
          : bassBeat === "4beat"
            ? [0]
            : (beatInBar === 0 || beatInBar === 2 ? [0] : []);
      bassOffsets.forEach((offset, index) => {
        addEvent(beatOffset + offset, "bass", `bass_${rootLetter}`, index === 0 ? 0.82 : 0.64, 1, bassDuration, beatInBar, chordIndex);
      });

      const shouldPlayPiano =
        (pianoBeat === "2beat" && (beatInBar === 0 || beatInBar === 2)) ||
        pianoBeat === "4beat" ||
        pianoBeat === "8beat";
      if (shouldPlayPiano) {
        const pianoDuration = pianoBeat === "8beat" ? Math.min(0.28, eighthOffset * 0.92) : Math.min(0.52, beatSeconds * 0.9);
        const addPianoVoicing = (offset = 0, level = 0.38) => getBackingPianoVoicing(chord).forEach((midi, index) => {
          addEvent(beatOffset + offset + index * 0.004, "piano", "piano", level, 2 ** ((midi - 67) / 12), pianoDuration, beatInBar, chordIndex);
        });
        addPianoVoicing(0, 0.32);
        if (pianoBeat === "8beat") addPianoVoicing(eighthOffset, 0.22);
      }
    }
  });

  return {
    bpm: safeBpm,
    beatSeconds,
    beatsPerMeasure,
    cycleMeasures,
    cycleSeconds,
    events: events.sort((left, right) => left.offsetSeconds - right.offsetSeconds),
  };
};
const COUNT_IN_VOICE_WORDS = [
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

const COUNT_IN_VOICE_MODES = [
  { id: "female", label: "여성" },
  { id: "male", label: "남성" },
  { id: "off", label: "음성 OFF" },
];

const TRACKER_COUNT_IN_OPTIONS = [
  { id: "0", label: "OFF", bars: 0 },
  { id: "1", label: "1 Bar", bars: 1 },
  { id: "2", label: "2 Bar", bars: 2 },
];

const TRACKER_MODE_OPTIONS = [
  { id: "off", label: "OFF" },
  { id: "bars", label: "Bar Counter" },
  { id: "timer", label: "Timer" },
];

const createWheelNumberOptions = (start, end) => (
  Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => {
    const value = start + index;
    return { id: String(value), label: String(value), value };
  })
);

const AUTOMATOR_TIME_MINUTE_MIN = 1;
const AUTOMATOR_TIME_MINUTE_MAX = 30;
const AUTOMATOR_TIME_SECOND_MIN = 1;
const AUTOMATOR_TIME_SECOND_MAX = 59;
const TRACKER_TIMER_MINUTE_MIN = 1;
const TRACKER_TIMER_MINUTE_MAX = 30;

const TRACKER_TIMER_MINUTE_OPTIONS = createWheelNumberOptions(TRACKER_TIMER_MINUTE_MIN, TRACKER_TIMER_MINUTE_MAX);
const TRACKER_TIMER_SECOND_OPTIONS = createWheelNumberOptions(0, 59);

const AUTOMATOR_MODE_OPTIONS = [
  { id: "off", label: "OFF" },
  { id: "bars", label: "By Bars" },
  { id: "time", label: "By Time" },
];

const AUTOMATOR_TIME_MINUTE_OPTIONS = createWheelNumberOptions(AUTOMATOR_TIME_MINUTE_MIN, AUTOMATOR_TIME_MINUTE_MAX);
const AUTOMATOR_TIME_SECOND_OPTIONS = createWheelNumberOptions(AUTOMATOR_TIME_SECOND_MIN, AUTOMATOR_TIME_SECOND_MAX);
const METRONOME_BEAT_STATES = {
  ACCENT: "accent",
  NORMAL: "normal",
  MUTE: "mute",
};
const METRONOME_BEAT_STATE_ORDER = [
  METRONOME_BEAT_STATES.ACCENT,
  METRONOME_BEAT_STATES.NORMAL,
  METRONOME_BEAT_STATES.MUTE,
];
const METRONOME_BEAT_STATE_LABELS = {
  [METRONOME_BEAT_STATES.ACCENT]: "1박",
  [METRONOME_BEAT_STATES.NORMAL]: "나머지 박",
  [METRONOME_BEAT_STATES.MUTE]: "무음",
};
const METRONOME_VISUAL_LAB_MODES = [
  { id: "dot", label: "Dot", title: "Dot Mode", description: "현재 점자 방식. 점자 자체의 glow만 비교합니다." },
  { id: "line", label: "Line", title: "Rhythm Line Mode", description: "좌에서 우로 흐르는 박자 위치를 비교합니다." },
  { id: "circle", label: "Circle", title: "Circle Mode", description: "RIFFLAB 정식 후보로 승격한 원형 박자 훈련 시각화입니다." },
  { id: "pick", label: "Pick Swing", title: "Pick Swing Mode", description: "기타 피크 스윙으로 스트로크 감각을 비교합니다." },
];
const METRONOME_DISPLAY_MODES = [
  { id: "dot", label: "Dot Mode" },
  { id: "circle", label: "Circle Mode" },
];
const METRONOME_MODE_SWIPE_STEP_THRESHOLD = 40;
const METRONOME_MODE_SWIPE_COMMIT_RATIO = 0.5;
const METRONOME_VISUAL_LAB_TIME_SIGNATURE_OPTIONS = [
  { id: "2/4", label: "2/4", beats: 2 },
  { id: "3/4", label: "3/4", beats: 3 },
  { id: "4/4", label: "4/4", beats: 4 },
  { id: "5/4", label: "5/4", beats: 5 },
  { id: "6/8", label: "6/8", beats: 6 },
  { id: "7/8", label: "7/8", beats: 7 },
];
const SVG_LOGO_LAB_STORAGE_KEY = "rifflab-svg-logo-lab-v1";
const SVG_LOGO_LAB_CANDIDATES = [
  ["svg-logo-09-a", "Logo 09-A", "String Priority R", "6현의 존재감을 가장 먼저 읽히게 한 Logo 09 기본 발전형."],
  ["svg-logo-09-b", "Logo 09-B", "R Priority R", "멀리서 R 실루엣이 더 선명하게 보이도록 Bowl과 다리를 정리한 안."],
  ["svg-logo-09-c", "Logo 09-C", "Quiet Wave R", "사운드웨이브를 더 절제해 R과 기타현만 남긴 미니멀 안."],
  ["svg-logo-09-d", "Logo 09-D", "Headstock Engrave R", "헤드스톡 각인에 어울리도록 상단 현과 핀 정렬을 강조한 안."],
  ["svg-logo-09-e", "Logo 09-E", "Hidden Fret R", "프렛보드 비율선을 은은하게 숨겨 악기 구조를 담은 안."],
  ["svg-logo-09-f", "Logo 09-F", "App Icon R", "작은 앱 아이콘에서도 버티도록 굵기와 여백을 압축한 안."],
  ["svg-logo-09-g", "Logo 09-G", "Pick Print R", "피크 인쇄에 맞춰 하단 마감과 실루엣을 단단하게 만든 안."],
  ["svg-logo-09-h", "Logo 09-H", "Minimal Line R", "최소선으로 R, 6현, 리듬만 남긴 경량 심볼 안."],
  ["svg-logo-09-i", "Logo 09-I", "Premium Studio R", "블랙 스튜디오 조명과 금속감을 가장 균형 있게 둔 프리미엄 안."],
  ["svg-logo-09-j", "Logo 09-J", "Lower Grid R", "하단 끝점과 기준선을 가장 엄격하게 맞춘 정렬 중심 안."],
  ["svg-logo-09-k", "Logo 09-K", "Tall String R", "상하 비례를 길게 잡아 현이 R로 변하는 과정을 강조한 안."],
  ["svg-logo-09-l", "Logo 09-L", "Compact Badge R", "스티커와 배지 적용을 고려해 전체 폭을 압축한 안."],
  ["svg-logo-09-m", "Logo 09-M", "Balanced Riff R", "좌우 사운드웨이브와 R 구조의 균형을 맞춘 대표 후보 안."],
  ["svg-logo-09-n", "Logo 09-N", "Gold Inlay R", "고급 기타 인레이처럼 선 끝과 접합부를 정제한 안."],
  ["svg-logo-09-o", "Logo 09-O", "Sharp Leg R", "R의 대각 다리를 선명하게 만들어 1차 시선에서 R을 강화한 안."],
  ["svg-logo-09-p", "Logo 09-P", "Soft Bowl R", "R의 곡선부를 부드럽게 다듬어 현의 자연스러운 휨을 강조한 안."],
  ["svg-logo-09-q", "Logo 09-Q", "Hardware Plate R", "앰프 명판과 장비 플레이트에 어울리는 수평 기준선 중심 안."],
  ["svg-logo-09-r", "Logo 09-R", "Monochrome Ready R", "색을 제거해도 R 실루엣이 남도록 대비와 구조를 정리한 안."],
  ["svg-logo-09-s", "Logo 09-S", "Master Symbol R", "RIFFLAB 공식 심볼 후보로 현, R, 웨이브를 가장 균형 있게 통합한 안."],
  ["svg-logo-09-t", "Logo 09-T", "Signature String R", "향후 헤더, 피크, 티셔츠까지 확장 가능한 최종 후보형 안."],
].map(([id, label, title, description], index) => ({ id, label, title, description, index: index + 1 }));
const FEEL_RECORDER_STORAGE_KEY = "rifflab-feel-recorder-patterns";
const METRONOME_PRESET_STORAGE_KEY = "rifflab-metronome-presets-v1";
const METRONOME_TRACKER_PROGRESS_STORAGE_KEY = "rifflab-metronome-tracker-progress-v1";
const METRONOME_TRACKER_STORAGE_DEBOUNCE_MS = 360;
const METRONOME_DISPLAY_MODE_STORAGE_KEY = "rifflabMetronomeMode";
const APP_THEME_STORAGE_KEY = "rifflabThemeMode";
const APP_THEMES = {
  BRAND: "brand",
  LIGHT: "light",
};
const APP_DEFAULT_THEME = APP_THEMES.LIGHT;
const APP_THEME_OPTIONS = [
  {
    id: APP_THEMES.LIGHT,
    label: "화이트",
    description: "RIFFLAB 기본 테마 · 흰색 배경 · 검정 텍스트 · 가독성 중심",
  },
  {
    id: APP_THEMES.BRAND,
    label: "골드다크",
    description: "골드/브론즈 기반 · 브랜드 감성과 몰입감 중심",
  },
];
function getSelectableAppThemeOptions() {
  return APP_THEME_OPTIONS;
}
const FEEL_RECORDER_LONG_PRESS_MS = 420;
const FEEL_RECORDER_MAX_EVENTS = 24;
const FEEL_RECORDER_DEFAULT_NAME = "My Feel";
const FEEL_RECORDER_MIN_TAP_MS = 60;
const METRONOME_PRESET_DEFAULT_NAME = "워밍업";

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
  return TIME_SIGNATURE_OPTIONS.find((option) => option.id === id) ?? TIME_SIGNATURE_OPTIONS.find((option) => option.id === "4/4") ?? TIME_SIGNATURE_OPTIONS[0];
}

function getSubdivisionOption(id) {
  return SUBDIVISION_OPTIONS.find((option) => option.id === id) ?? SUBDIVISION_OPTIONS[0];
}

function getMetronomeToneOption(id) {
  return METRONOME_TONE_OPTIONS.find((option) => option.id === id) ?? METRONOME_TONE_OPTIONS[0];
}

function getDefaultBeatState(index) {
  return index === 0 ? METRONOME_BEAT_STATES.ACCENT : METRONOME_BEAT_STATES.NORMAL;
}

function normalizeMetronomeBeatPattern(pattern, beatsPerMeasure = 4) {
  const count = Math.max(1, Math.min(16, Number(beatsPerMeasure) || 4));
  return Array.from({ length: count }, (_, index) => {
    const state = Array.isArray(pattern) ? pattern[index] : undefined;
    return METRONOME_BEAT_STATE_ORDER.includes(state) ? state : getDefaultBeatState(index);
  });
}

function createLocalId(prefix) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeNumberRange(value, min, max, fallback = min) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numericValue)));
}

function normalizeAutoBpmTimeMinutes(value) {
  return normalizeNumberRange(value, AUTOMATOR_TIME_MINUTE_MIN, AUTOMATOR_TIME_MINUTE_MAX, AUTOMATOR_TIME_MINUTE_MIN);
}

function normalizeAutoBpmTimeSeconds(value) {
  return normalizeNumberRange(value, AUTOMATOR_TIME_SECOND_MIN, AUTOMATOR_TIME_SECOND_MAX, 30);
}

function normalizeTrackerTimerMinutes(value) {
  return normalizeNumberRange(value, TRACKER_TIMER_MINUTE_MIN, TRACKER_TIMER_MINUTE_MAX, TRACKER_TIMER_MINUTE_MIN);
}

function normalizeTrackerTimerSeconds(value) {
  return Math.max(0, Math.min(59, Math.round(Number(value) || 0)));
}

function normalizeTrackerBarLimit(value, fallback = 1) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(1, Math.min(9999, Math.trunc(numericValue)));
}

function normalizeMetronomeDisplayMode(mode) {
  return METRONOME_DISPLAY_MODES.some((option) => option.id === mode) ? mode : "dot";
}

function getTwoColumnVerticalFlowOptions(options) {
  if (!Array.isArray(options) || options.length < 3) return options;

  const midpoint = Math.ceil(options.length / 2);
  const leftColumn = options.slice(0, midpoint);
  const rightColumn = options.slice(midpoint);

  return leftColumn.flatMap((option, index) => (
    rightColumn[index] ? [option, rightColumn[index]] : [option]
  ));
}

function getStoredMetronomeDisplayMode() {
  if (typeof window === "undefined") return "dot";
  return normalizeMetronomeDisplayMode(window.localStorage.getItem(METRONOME_DISPLAY_MODE_STORAGE_KEY));
}

function normalizeAppTheme(value) {
  return getSelectableAppThemeOptions().some((option) => option.id === value) ? value : APP_DEFAULT_THEME;
}

function getStoredAppTheme() {
  if (typeof window === "undefined") return APP_DEFAULT_THEME;
  return normalizeAppTheme(window.localStorage.getItem(APP_THEME_STORAGE_KEY));
}

function normalizeMetronomePreset(preset, index = 0) {
  const timeSignature = getTimeSignatureOption(preset?.timeSignature)?.id || "4/4";
  const beatsPerMeasure = getTimeSignatureOption(timeSignature).beats;
  const autoBpmMode = AUTOMATOR_MODE_OPTIONS.some((option) => option.id === preset?.autoBpmMode) ? preset.autoBpmMode : "off";
  const autoBpmDirection = preset?.autoBpmDirection === "decrease" ? "decrease" : "increase";
  const trackerMode = TRACKER_MODE_OPTIONS.some((option) => option.id === preset?.trackerMode) ? preset.trackerMode : "off";
  const name = String(preset?.name || `${METRONOME_PRESET_DEFAULT_NAME} ${index + 1}`).trim().slice(0, 24) || METRONOME_PRESET_DEFAULT_NAME;
  const tone = getMetronomeToneOption(preset?.tone)?.id || "tick";
  const accentTone = getMetronomeToneOption(preset?.accentTone ?? preset?.tone ?? "kick")?.id || "kick";
  const weakTone = getMetronomeToneOption(preset?.weakTone ?? preset?.tone ?? "rim")?.id || "rim";

  return {
    id: String(preset?.id || createLocalId("metro-preset")),
    name,
    createdAt: Number(preset?.createdAt) || Date.now(),
    updatedAt: Number(preset?.updatedAt) || Number(preset?.createdAt) || Date.now(),
    bpm: clampBpm(preset?.bpm),
    timeSignature,
    subdivision: getSubdivisionOption(preset?.subdivision)?.id || "quarter",
    tone,
    accentTone,
    weakTone,
    accent: preset?.accent !== false,
    repeat: Boolean(preset?.repeat),
    displayMode: normalizeMetronomeDisplayMode(preset?.displayMode),
    countInBars: Math.max(0, Math.min(2, Number(preset?.countInBars) || 0)),
    countInVoiceMode: COUNT_IN_VOICE_MODES.some((option) => option.id === preset?.countInVoiceMode) ? preset.countInVoiceMode : "female",
    autoBpmMode,
    autoBpmDirection,
    autoBpmStep: Math.max(1, Math.min(5, Number(preset?.autoBpmStep) || 1)),
    autoBpmBars: Math.max(5, Math.min(200, Number(preset?.autoBpmBars) || 50)),
    autoBpmTimeMinutes: normalizeAutoBpmTimeMinutes(preset?.autoBpmTimeMinutes),
    autoBpmTimeSeconds: normalizeAutoBpmTimeSeconds(preset?.autoBpmTimeSeconds),
    coachModeEnabled: Boolean(preset?.coachModeEnabled),
    coachPlayBars: Math.max(1, Math.min(8, Number(preset?.coachPlayBars) || 4)),
    coachMuteBars: Math.max(1, Math.min(8, Number(preset?.coachMuteBars) || 4)),
    trackerMode,
    barLimitEnabled: Boolean(preset?.barLimitEnabled),
    barLimit: normalizeTrackerBarLimit(preset?.barLimit, 100),
    barStopWhenReached: Boolean(preset?.barStopWhenReached),
    barResetWhenReached: Boolean(preset?.barResetWhenReached),
    barStartFromOne: preset?.barStartFromOne !== false,
    timerCountdown: Boolean(preset?.timerCountdown),
    timerStopWhenReached: Boolean(preset?.timerStopWhenReached),
    timerResetWhenReached: Boolean(preset?.timerResetWhenReached),
    trackerTimerMinutes: normalizeTrackerTimerMinutes(preset?.trackerTimerMinutes),
    trackerTimerSeconds: normalizeTrackerTimerSeconds(preset?.trackerTimerSeconds),
    beatPattern: normalizeMetronomeBeatPattern(preset?.beatPattern, beatsPerMeasure),
  };
}

function getStoredMetronomePresets() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(METRONOME_PRESET_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, index) => normalizeMetronomePreset(item, index)).slice(0, 24);
  } catch {
    return [];
  }
}

function getStoredMetronomeTrackerProgress() {
  const fallback = {
    trackerMode: "off",
    barLimitEnabled: false,
    barLimit: 100,
    measureCount: 0,
    trackerTimerMinutes: TRACKER_TIMER_MINUTE_MIN,
    trackerTimerSeconds: 0,
    trackerElapsedMs: 0,
  };
  if (typeof window === "undefined") return fallback;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(METRONOME_TRACKER_PROGRESS_STORAGE_KEY) ?? "{}");
    const trackerMode = TRACKER_MODE_OPTIONS.some((option) => option.id === parsed?.trackerMode)
      ? parsed.trackerMode
      : fallback.trackerMode;
    return {
      trackerMode,
      barLimitEnabled: Boolean(parsed?.barLimitEnabled),
      barLimit: normalizeTrackerBarLimit(parsed?.barLimit, fallback.barLimit),
      measureCount: Math.max(0, Math.min(9999, Number(parsed?.measureCount ?? parsed?.trackerCurrent) || 0)),
      trackerTimerMinutes: normalizeTrackerTimerMinutes(parsed?.trackerTimerMinutes),
      trackerTimerSeconds: normalizeTrackerTimerSeconds(parsed?.trackerTimerSeconds),
      trackerElapsedMs: Math.max(0, Number(parsed?.trackerElapsedMs ?? parsed?.trackerTime) || 0),
    };
  } catch {
    return fallback;
  }
}

function MetronomeSelectControl({ ariaLabel = "", className = "", dropdownDirection = null, label, labelDot = "", options, value, onChange, layout = "native" }) {
  const [open, setOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState("up");
  const [menuStyle, setMenuStyle] = useState({});
  const controlRef = useRef(null);
  const dropdownIdRef = useRef(createLocalId("riff-dropdown"));
  const selectedOption = options.find((option) => String(option.id) === String(value));
  const gridOptions = layout === "grid" ? getTwoColumnVerticalFlowOptions(options) : options;
  const getOptionTextUnits = (option) => {
    const text = String(option?.label || option?.id || "");
    return Array.from(text).reduce((total, char) => {
      if (/\s/.test(char)) return total + 0.45;
      return total + (char.charCodeAt(0) > 127 ? 1.35 : 1);
    }, 0);
  };

  const updateOpenDirection = () => {
    if (typeof window === "undefined" || !controlRef.current) return;
    const rect = controlRef.current.getBoundingClientRect();
    const rows = layout === "grid" ? Math.ceil(gridOptions.length / 2) : gridOptions.length;
    const estimatedMenuHeight = Math.min(244, 14 + rows * 36);
    const topSpace = rect.top;
    const bottomSpace = window.innerHeight - rect.bottom - 92;
    const nextDirection = dropdownDirection || (topSpace >= estimatedMenuHeight + 10 || topSpace >= bottomSpace ? "up" : "down");
    const viewportPadding = 12;
    const viewportWidth = window.innerWidth || 390;
    const maxOptionUnits = Math.max(1, ...gridOptions.map(getOptionTextUnits));
    const visibleOptionCount = layout === "grid" ? 2 : 1;
    const basePadding = layout === "grid" ? 28 : 34;
    const minContentWidth = layout === "grid" ? 66 : 60;
    const contentWidth = layout === "grid"
      ? Math.ceil(maxOptionUnits * 8.5) * visibleOptionCount + basePadding
      : Math.ceil(maxOptionUnits * 8.8) + basePadding;
    const desiredWidth = Math.min(Math.max(minContentWidth, contentWidth), viewportWidth - viewportPadding * 2);
    const left = Math.max(viewportPadding, Math.min(rect.left, viewportWidth - desiredWidth - viewportPadding));
    const maxHeight = nextDirection === "up"
      ? Math.max(108, Math.min(244, rect.top - viewportPadding - 6))
      : Math.max(108, Math.min(244, window.innerHeight - rect.bottom - 104));
    setOpenDirection(nextDirection);
    setMenuStyle({
      "--riff-dropdown-left": `${left}px`,
      "--riff-dropdown-width": `${desiredWidth}px`,
      "--riff-dropdown-trigger-width": `${rect.width}px`,
      "--riff-dropdown-max-height": `${maxHeight}px`,
      ...(nextDirection === "up"
        ? { "--riff-dropdown-bottom": `${window.innerHeight - rect.top + 6}px`, "--riff-dropdown-top": "auto" }
        : { "--riff-dropdown-top": `${rect.bottom + 6}px`, "--riff-dropdown-bottom": "auto" }),
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    updateOpenDirection();

    const handlePointerDown = (event) => {
      if (controlRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handleDropdownOpen = (event) => {
      if (event.detail !== dropdownIdRef.current) setOpen(false);
    };
    const handleViewportChange = () => updateOpenDirection();

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("riffDropdownOpen", handleDropdownOpen);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("riffDropdownOpen", handleDropdownOpen);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, dropdownDirection]);

  return (
    <div
      className={`metronomeSelectControl ${className} ${layout === "grid" ? "metronomeSelectControl--grid" : "metronomeSelectControl--list"} metronomeSelectControl--${openDirection} ${open ? "open" : ""}`}
      ref={controlRef}
    >
      <span className="metronomeSelectLabel">
        {labelDot ? <i className={`metronomeSelectLabelDot metronomeSelectLabelDot--${labelDot}`} aria-hidden="true" /> : null}
        {label}
      </span>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={selectedOption?.longLabel ? `${ariaLabel || label}: ${selectedOption.longLabel}` : (ariaLabel || label)}
        className="metronomeSelectButton"
        onClick={(event) => {
          event.stopPropagation();
          updateOpenDirection();
          setOpen((current) => {
            if (!current && typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("riffDropdownOpen", { detail: dropdownIdRef.current }));
            }
            return !current;
          });
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        title={selectedOption?.longLabel || selectedOption?.label || label}
        type="button"
      >
        <b>{selectedOption?.label || value || label}</b>
        <i aria-hidden="true">⌄</i>
      </button>
      {open ? (
        <div
          className={`metronomeSelectMenu ${layout === "grid" ? "metronomeSelectMenu--twoColumn" : ""}`}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          role="listbox"
          style={menuStyle}
        >
          {gridOptions.map((option) => (
            <button
              aria-selected={String(option.id) === String(value)}
              className={`metronomeSelectOption ${String(option.id) === String(value) ? "selected" : ""}`}
              disabled={option.disabled}
              key={option.id}
              onClick={(event) => {
                event.stopPropagation();
                if (option.disabled) return;
                onChange(option.id);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MetronomeControl({
  accentEnabled = true,
  accentTone = "tick",
  bpm,
  className = "",
  compactToggleLabels = false,
  countInEnabled = false,
  inputId = "metronome-bpm-presets",
  onAccentChange = () => {},
  onAccentToneChange = () => {},
  onBpmChange,
  onCountInChange = () => {},
  onRepeatChange = () => {},
  onSubdivisionChange = () => {},
  onTimeSignatureChange = () => {},
  onToneChange = () => {},
  onWeakToneChange = () => {},
  repeatEnabled = false,
  showCountIn = true,
  showAccent = true,
  showBpmControls = true,
  showRepeat = true,
  splitToneControls = false,
  subdivision = "quarter",
  timeSignature = "4/4",
  tone = "tick",
  weakTone = "tick",
}) {
  const [draftBpm, setDraftBpm] = useState(String(bpm));
  const [swipePreviewBpm, setSwipePreviewBpm] = useState(null);
  const bpmSwipeStartRef = useRef(null);
  const bpmSwipeFrameRef = useRef(null);
  const bpmSwipePreviewValueRef = useRef(bpm);
  const bpmInputRef = useRef(null);
  const bpmPreviewDisplayRef = useRef(null);
  const enableBpmSwipePreview = compactToggleLabels || className.includes("standaloneMetronomeControl");
  const hasToggleControls = showAccent || showCountIn || showRepeat;

  const syncBpmVisualValue = useCallback((value) => {
    const text = String(value ?? "");
    if (bpmInputRef.current) bpmInputRef.current.value = text;
    if (bpmPreviewDisplayRef.current) bpmPreviewDisplayRef.current.textContent = text;
  }, []);

  useEffect(() => {
    setDraftBpm(String(bpm));
    if (!bpmSwipeStartRef.current) {
      setSwipePreviewBpm(null);
      syncBpmVisualValue(bpm);
    }
  }, [bpm, syncBpmVisualValue]);

  useEffect(() => () => {
    if (bpmSwipeFrameRef.current != null) window.cancelAnimationFrame(bpmSwipeFrameRef.current);
  }, []);

  const renderBpmSwipePreview = useCallback((nextBpm) => {
    const safeBpm = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(nextBpm)));
    bpmSwipePreviewValueRef.current = safeBpm;
    syncBpmVisualValue(safeBpm);
    if (bpmSwipeFrameRef.current != null) return;
    bpmSwipeFrameRef.current = window.requestAnimationFrame(() => {
      bpmSwipeFrameRef.current = null;
      setSwipePreviewBpm(bpmSwipePreviewValueRef.current);
    });
  }, [syncBpmVisualValue]);

  const applyBpmValue = useCallback((value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || value === "") {
      const fallback = bpm || DEFAULT_BPM;
      setSwipePreviewBpm(null);
      setDraftBpm(String(fallback));
      syncBpmVisualValue(fallback);
      return fallback;
    }
    const next = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(parsed)));
    setSwipePreviewBpm(null);
    setDraftBpm(String(next));
    syncBpmVisualValue(next);
    onBpmChange(next);
    return next;
  }, [bpm, onBpmChange, syncBpmVisualValue]);

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

  const handleBpmPointerDown = useCallback((event) => {
    if (!enableBpmSwipePreview) return;
    if (event.target?.closest?.("button")) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    const now = performance.now();
    const startBpm = Number(bpm) || DEFAULT_BPM;
    bpmSwipePreviewValueRef.current = startBpm;
    syncBpmVisualValue(startBpm);
    setSwipePreviewBpm(startBpm);
    bpmSwipeStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastTime: now,
      startBpm,
      lastAppliedBpm: startBpm,
      previewBpm: startBpm,
      locked: false,
      canceled: false,
    };
  }, [bpm, enableBpmSwipePreview, syncBpmVisualValue]);

  const handleBpmPointerMove = useCallback((event) => {
    const swipe = bpmSwipeStartRef.current;
    if (!enableBpmSwipePreview || !swipe || swipe.canceled || swipe.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - swipe.x;
    const deltaY = event.clientY - swipe.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (!swipe.locked) {
      if (absX < 1 && absY < 1) return;
      if (absY > 12 && absY > absX * 1.25) {
        swipe.canceled = true;
        setSwipePreviewBpm(null);
        syncBpmVisualValue(draftBpm);
        event.currentTarget.releasePointerCapture?.(swipe.pointerId);
        return;
      }
      swipe.locked = true;
    }

    event.preventDefault();

    const distanceBpm = deltaX;
    const nextBpm = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(swipe.startBpm + distanceBpm)));

    if (nextBpm !== swipe.lastAppliedBpm) {
      swipe.previewBpm = nextBpm;
      renderBpmSwipePreview(nextBpm);
      swipe.lastAppliedBpm = nextBpm;
    }

    swipe.lastX = event.clientX;
    swipe.lastTime = performance.now();
  }, [enableBpmSwipePreview, draftBpm, renderBpmSwipePreview, syncBpmVisualValue]);

  const handleBpmPointerEnd = useCallback((event) => {
    const swipe = bpmSwipeStartRef.current;
    bpmSwipeStartRef.current = null;
    if (!swipe) return;
    event.currentTarget.releasePointerCapture?.(swipe.pointerId);
    if (!swipe.canceled && swipe.previewBpm !== undefined) {
      applyBpmValue(swipe.previewBpm);
    }
  }, [applyBpmValue]);

  const handleBpmPointerCancel = useCallback((event) => {
    const swipe = bpmSwipeStartRef.current;
    bpmSwipeStartRef.current = null;
    if (!swipe) return;
    event.currentTarget.releasePointerCapture?.(swipe.pointerId);
    setSwipePreviewBpm(null);
    syncBpmVisualValue(draftBpm);
  }, [draftBpm, syncBpmVisualValue]);

  const applyNextBpmPreset = useCallback(() => {
    const current = Number(bpm) || DEFAULT_BPM;
    const nextPreset = BPM_PRESETS.find((preset) => preset > current) ?? BPM_PRESETS[0];
    applyBpmPreset(nextPreset);
  }, [applyBpmPreset, bpm]);

  const visibleBpmValue = swipePreviewBpm ?? draftBpm;

  return (
    <div className={`metronomeControl ${className}`}>
      {showBpmControls || hasToggleControls ? (
      <div className={`metronomeTopLine ${showBpmControls ? "" : "metronomeTopLine--togglesOnly"}`}>
        {showBpmControls ? (
          <>
            <label className="metronomeBpmLabel" htmlFor={`${inputId}-input`}>BPM</label>
            <div className="metronomeBpmCombo">
      <div
        className={`metronomeBpmInputShell ${enableBpmSwipePreview ? "metronomeBpmInputShell--liveSwipe" : ""}`}
                onPointerCancel={handleBpmPointerCancel}
                onPointerDown={handleBpmPointerDown}
                onPointerMove={handleBpmPointerMove}
                onPointerUp={handleBpmPointerEnd}
              >
                <input
                  aria-label="BPM"
                  id={`${inputId}-input`}
                  inputMode="numeric"
                  max={MAX_BPM}
                  min={MIN_BPM}
                  onBlur={() => commitBpm(bpmInputRef.current?.value ?? draftBpm)}
                  onFocus={(event) => event.target.select()}
                  onChange={(event) => {
                    const nextValue = event.target.value.replace(/[^\d]/g, "");
                    setSwipePreviewBpm(null);
                    setDraftBpm(nextValue);
                    syncBpmVisualValue(nextValue);
                  }}
                  onKeyDown={handleBpmKeyDown}
                  pattern="[0-9]*"
                  ref={bpmInputRef}
                  step="1"
                  type="number"
                  value={visibleBpmValue}
                />
                <span aria-hidden="true" className="metronomeBpmLiveValue" ref={bpmPreviewDisplayRef}>
                  {visibleBpmValue}
                </span>
                <div className="metronomeBpmSpinner" aria-label="BPM 미세 조절">
                  <button aria-label="BPM 1 올리기" className="metronomeBpmStep metronomeBpmStep--up" onClick={() => stepBpm(1)} type="button">
                    +
                  </button>
                  {compactToggleLabels ? (
                    <button aria-label="BPM 10 올리기" className="metronomeBpmStep metronomeBpmStep--upTen" onClick={() => stepBpm(10)} type="button">
                      10+
                    </button>
                  ) : null}
                  {compactToggleLabels ? (
                    <button aria-label="BPM 10 낮추기" className="metronomeBpmStep metronomeBpmStep--downTen" onClick={() => stepBpm(-10)} type="button">
                      10-
                    </button>
                  ) : null}
                  <button aria-label="BPM 1 낮추기" className="metronomeBpmStep metronomeBpmStep--down" onClick={() => stepBpm(-1)} type="button">
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
          </>
        ) : null}
        <div className="metronomeToggleRow">
          {showAccent ? (
            <button
              aria-pressed={accentEnabled}
              className={accentEnabled ? "selected" : ""}
              onClick={() => onAccentChange(!accentEnabled)}
              type="button"
            >
              {compactToggleLabels ? "강박" : `강박 ${accentEnabled ? "ON" : "OFF"}`}
            </button>
          ) : null}
          {showCountIn ? (
            <button
              aria-pressed={countInEnabled}
              className={countInEnabled ? "selected" : ""}
              onClick={() => onCountInChange(!countInEnabled)}
              type="button"
            >
              {compactToggleLabels ? "Count" : `카운트인 ${countInEnabled ? "ON" : "OFF"}`}
            </button>
          ) : null}
          {showRepeat ? (
            <button
              aria-pressed={repeatEnabled}
              className={repeatEnabled ? "selected" : ""}
              onClick={() => onRepeatChange(!repeatEnabled)}
              type="button"
            >
              {compactToggleLabels ? "반복" : `반복 ${repeatEnabled ? "ON" : "OFF"}`}
            </button>
          ) : null}
        </div>
      </div>
      ) : null}
      <div className={`metronomeOptions ${splitToneControls ? "metronomeOptions--splitTone" : ""}`}>
        <MetronomeSelectControl
          className="metronomeSelectControl--wallPicker"
          label="박자"
          layout="grid"
          onChange={onTimeSignatureChange}
          options={TIME_SIGNATURE_OPTIONS}
          value={timeSignature}
        />
        {splitToneControls ? (
          <MetronomeSelectControl
            ariaLabel="1박 음색"
            className="metronomeSelectControl--tonePicker metronomeSelectControl--toneSlot metronomeSelectControl--accentTone"
            label="음색 1박"
            labelDot="strong"
            layout="grid"
            onChange={onAccentToneChange}
            options={METRONOME_TONE_OPTIONS}
            value={accentTone}
          />
        ) : null}
        <MetronomeSelectControl
          className="metronomeSelectControl--wallPicker"
          label="세분"
          layout="grid"
          onChange={onSubdivisionChange}
          options={SUBDIVISION_OPTIONS}
          value={subdivision}
        />
        {splitToneControls ? (
          <MetronomeSelectControl
            ariaLabel="나머지 박 음색"
            className="metronomeSelectControl--tonePicker metronomeSelectControl--toneSlot metronomeSelectControl--weakTone"
            label="음색 2박"
            labelDot="weak"
            layout="grid"
            onChange={onWeakToneChange}
            options={METRONOME_TONE_OPTIONS}
            value={weakTone}
          />
        ) : (
          <MetronomeSelectControl
            className="metronomeSelectControl--tonePicker"
            label="음색"
            layout="grid"
            onChange={onToneChange}
            options={METRONOME_TONE_OPTIONS}
            value={tone}
          />
        )}
      </div>
    </div>
  );
}

function MetronomeTimeline({
  beat,
  beatPattern,
  beatsPerMeasure = 4,
  compact = false,
  currentLabel,
  isPlaying,
  onBeatClick,
  progress,
  runnerLabel,
  timeSignature = "4/4",
}) {
  const markers = Array.from({ length: beatsPerMeasure }, (_, index) => index);
  const dots = Array.from({ length: beatsPerMeasure }, (_, index) => index);
  const normalizedBeatPattern = normalizeMetronomeBeatPattern(beatPattern, beatsPerMeasure);
  const isCompoundTimeline = beatsPerMeasure >= 6 && beatsPerMeasure % 3 === 0;
  const groupGapUnits = isCompoundTimeline ? 0.55 : 0;
  const groupSize = isCompoundTimeline ? 3 : 1;
  const groupCount = isCompoundTimeline ? Math.ceil(beatsPerMeasure / groupSize) : 1;
  const timelineUnits = beatsPerMeasure + Math.max(0, groupCount - 1) * groupGapUnits;
  const getBeatTimelineLeft = (beatNumber) => {
    const gapBefore = isCompoundTimeline ? Math.floor(beatNumber / groupSize) * groupGapUnits : 0;
    return ((beatNumber + gapBefore + 0.5) / timelineUnits) * 100;
  };

  return (
    <div
      className={`chordTimeline metronomeTimeline metronomeTimeline--beats-${beatsPerMeasure} ${isCompoundTimeline ? "metronomeTimeline--compound" : ""}`}
      aria-label={`${timeSignature} 메트로놈 진행`}
      style={{ "--beat-count": beatsPerMeasure }}
    >
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
            style={{ left: `${getBeatTimelineLeft(beatNumber)}%` }}
          />
        ))}
      </div>
      <div className={`mobileBeatDots mobileBeatDots--beats-${beatsPerMeasure} ${compact ? "mobileBeatDots--compact" : ""}`} aria-label={`${timeSignature} 박자 점자`}>
        {dots.map((beatNumber) => (
      <BeatDot
        active={beat === beatNumber && isPlaying}
        className={dotClassName}
        key={beatNumber}
        label={`${beatNumber + 1}박 ${METRONOME_BEAT_STATE_LABELS[normalizedBeatPattern[beatNumber]]}`}
            onClick={onBeatClick ? (event) => {
              event.stopPropagation();
              onBeatClick(beatNumber);
            } : undefined}
            state={normalizedBeatPattern[beatNumber]}
            title={`${beatNumber + 1}박: ${METRONOME_BEAT_STATE_LABELS[normalizedBeatPattern[beatNumber]]}`}
          />
        ))}
      </div>
    </div>
  );
}

const WHEEL_PICKER_ITEM_HEIGHT = 34;
const WHEEL_PICKER_MOMENTUM_DISTANCE_MS = 680;
const WHEEL_PICKER_MAX_MOMENTUM_ITEMS = 18;
const WHEEL_PICKER_MIN_ANIMATION_MS = 260;
const WHEEL_PICKER_MAX_ANIMATION_MS = 980;
const WHEEL_PICKER_DRAG_CLICK_CANCEL_PX = 5;

function easeOutPickerWheel(progress) {
  return 1 - Math.pow(1 - progress, 4);
}

function WheelPickerColumn({ label, options, value, onChange }) {
  const selectedIndex = Math.max(0, options.findIndex((option) => Number(option.value) === Number(value)));
  const frameRef = useRef(null);
  const dragFrameRef = useRef(null);
  const optionRefs = useRef([]);
  const trackRef = useRef(null);
  const committedIndexRef = useRef(selectedIndex);
  const previewIndexRef = useRef(selectedIndex);
  const scrollPositionRef = useRef(selectedIndex);
  const pendingScrollPositionRef = useRef(selectedIndex);
  const dragRef = useRef(null);
  const interactingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => () => {
    if (frameRef.current != null) window.cancelAnimationFrame(frameRef.current);
    if (dragFrameRef.current != null) window.cancelAnimationFrame(dragFrameRef.current);
  }, []);

  const clampIndex = useCallback((index) => Math.max(0, Math.min(options.length - 1, index)), [options.length]);
  const clampPosition = useCallback((position) => Math.max(0, Math.min(options.length - 1, position)), [options.length]);

  const updatePreviewIndex = useCallback((nextIndex, force = false) => {
    const safeIndex = clampIndex(nextIndex);
    if (!force && previewIndexRef.current === safeIndex) return;

    if (force) {
      optionRefs.current.forEach((node, optionIndex) => {
        if (!node) return;
        const selected = optionIndex === safeIndex;
        node.classList.toggle("selected", selected);
        node.setAttribute("aria-selected", selected ? "true" : "false");
      });
    } else {
      const previousNode = optionRefs.current[previewIndexRef.current];
      if (previousNode) {
        previousNode.classList.remove("selected");
        previousNode.setAttribute("aria-selected", "false");
      }
      const nextNode = optionRefs.current[safeIndex];
      if (nextNode) {
        nextNode.classList.add("selected");
        nextNode.setAttribute("aria-selected", "true");
      }
    }

    previewIndexRef.current = safeIndex;
  }, [clampIndex]);

  const renderWheelPosition = useCallback((nextPosition, syncSelection = false) => {
    const safePosition = clampPosition(nextPosition);
    scrollPositionRef.current = safePosition;
    pendingScrollPositionRef.current = safePosition;

    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(0, ${-safePosition * WHEEL_PICKER_ITEM_HEIGHT}px, 0)`;
    }

    if (syncSelection) {
      updatePreviewIndex(Math.round(safePosition), true);
    }
  }, [clampPosition, updatePreviewIndex]);

  const scheduleWheelPosition = useCallback((nextPosition) => {
    pendingScrollPositionRef.current = clampPosition(nextPosition);
    if (dragFrameRef.current != null) return;
    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      renderWheelPosition(pendingScrollPositionRef.current);
    });
  }, [clampPosition, renderWheelPosition]);

  const syncWheelToIndex = useCallback((nextIndex) => {
    const safeIndex = clampIndex(nextIndex);
    committedIndexRef.current = safeIndex;
    previewIndexRef.current = safeIndex;
    renderWheelPosition(safeIndex, true);
  }, [clampIndex, renderWheelPosition]);

  useEffect(() => {
    if (interactingRef.current) return;
    syncWheelToIndex(selectedIndex);
  }, [selectedIndex, syncWheelToIndex]);

  const commitIndex = useCallback((nextIndex) => {
    const safeIndex = clampIndex(nextIndex);
    const nextValue = options[safeIndex]?.value;
    const previousValue = options[committedIndexRef.current]?.value;
    syncWheelToIndex(safeIndex);

    if (nextValue != null && Number(nextValue) !== Number(previousValue)) {
      onChange(Number(nextValue));
    }
  }, [clampIndex, onChange, options, syncWheelToIndex]);

  const finishInteraction = useCallback(() => {
    interactingRef.current = false;
    setIsInteracting(false);
  }, []);

  const animateToIndex = useCallback((fromPosition, targetIndex, releaseVelocity = 0) => {
    if (dragFrameRef.current != null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    if (frameRef.current != null) window.cancelAnimationFrame(frameRef.current);
    const safeFromPosition = clampPosition(fromPosition);
    const safeTargetIndex = clampIndex(targetIndex);
    const distance = safeTargetIndex - safeFromPosition;

    if (Math.abs(distance) < 0.001) {
      renderWheelPosition(safeTargetIndex, true);
      commitIndex(safeTargetIndex);
      finishInteraction();
      return;
    }

    const startedAt = performance.now();
    const duration = Math.min(
      WHEEL_PICKER_MAX_ANIMATION_MS,
      Math.max(
        WHEEL_PICKER_MIN_ANIMATION_MS,
        220 + (Math.abs(distance) * 46) + Math.min(240, Math.abs(releaseVelocity) * 120),
      ),
    );

    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = easeOutPickerWheel(progress);
      const nextPosition = safeFromPosition + distance * eased;
      renderWheelPosition(nextPosition);

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(animate);
        return;
      }

      frameRef.current = null;
      renderWheelPosition(safeTargetIndex, true);
      commitIndex(safeTargetIndex);
      finishInteraction();
    };

    frameRef.current = window.requestAnimationFrame(animate);
  }, [clampIndex, clampPosition, commitIndex, finishInteraction, renderWheelPosition]);

  const handleOptionClick = useCallback((nextValue, event) => {
    if (suppressClickRef.current) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      suppressClickRef.current = false;
      return;
    }

    const nextIndex = options.findIndex((option) => Number(option.value) === Number(nextValue));
    if (nextIndex < 0) return;
    if (frameRef.current != null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    interactingRef.current = false;
    commitIndex(nextIndex);
    setIsInteracting(false);
  }, [commitIndex, options]);

  const handlePointerDown = useCallback((event) => {
    if (frameRef.current != null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (dragFrameRef.current != null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }

    const now = performance.now();
    const startPosition = scrollPositionRef.current;
    interactingRef.current = true;
    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: now,
      startPosition,
      velocity: 0,
      moved: false,
      samples: [{ y: event.clientY, time: now }],
    };
    setIsInteracting(true);
    renderWheelPosition(startPosition);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [renderWheelPosition]);

  const handlePointerMove = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const now = performance.now();
    const deltaY = event.clientY - drag.startY;
    const elapsed = Math.max(1, now - drag.lastTime);
    drag.velocity = (event.clientY - drag.lastY) / elapsed;
    drag.lastY = event.clientY;
    drag.lastTime = now;
    drag.samples ??= [];
    drag.samples.push({ y: event.clientY, time: now });
    while (drag.samples.length > 1 && now - drag.samples[0].time > 120) drag.samples.shift();

    if (Math.abs(deltaY) > WHEEL_PICKER_DRAG_CLICK_CANCEL_PX) {
      drag.moved = true;
      suppressClickRef.current = true;
    }

    const nextPosition = clampPosition(drag.startPosition - (deltaY / WHEEL_PICKER_ITEM_HEIGHT));
    scheduleWheelPosition(nextPosition);
    if (event.cancelable) event.preventDefault();
  }, [clampPosition, scheduleWheelPosition]);

  const handlePointerUp = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaY = event.clientY - drag.startY;
    const samples = drag.samples ?? [];
    const firstSample = samples[0];
    const lastSample = samples[samples.length - 1];
    const sampleVelocity = firstSample && lastSample && lastSample.time > firstSample.time
      ? (lastSample.y - firstSample.y) / (lastSample.time - firstSample.time)
      : drag.velocity;
    const velocity = Number.isFinite(sampleVelocity) ? sampleVelocity : drag.velocity;
    const currentPosition = clampPosition(drag.startPosition - (deltaY / WHEEL_PICKER_ITEM_HEIGHT));
    const rawMomentumItems = (velocity * WHEEL_PICKER_MOMENTUM_DISTANCE_MS) / WHEEL_PICKER_ITEM_HEIGHT;
    const momentumItems = Math.sign(rawMomentumItems) * Math.min(WHEEL_PICKER_MAX_MOMENTUM_ITEMS, Math.abs(rawMomentumItems));
    const projectedPosition = clampPosition(currentPosition - momentumItems);
    const targetIndex = clampIndex(Math.round(projectedPosition));

    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (drag.moved) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 180);
    }
    animateToIndex(currentPosition, targetIndex, velocity);
  }, [animateToIndex, clampIndex, clampPosition]);

  const handlePointerCancel = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    suppressClickRef.current = false;
    animateToIndex(scrollPositionRef.current, Math.round(scrollPositionRef.current));
  }, [animateToIndex]);

  return (
    <label className="metronomeWheelColumn">
      <span>{label}</span>
      <div
        className={`metronomeWheelColumnViewport ${isInteracting ? "dragging" : ""}`}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="listbox"
        tabIndex={0}
      >
        <i aria-hidden="true" />
        <div
          className="metronomeWheelOptionTrack"
          ref={trackRef}
          style={{ transform: `translate3d(0, ${-selectedIndex * WHEEL_PICKER_ITEM_HEIGHT}px, 0)` }}
        >
          {options.map((option, optionIndex) => (
            <button
              aria-selected={optionIndex === selectedIndex}
              className={optionIndex === selectedIndex ? "selected" : ""}
              key={option.id}
              onClick={(event) => handleOptionClick(Number(option.value), event)}
              ref={(node) => {
                optionRefs.current[optionIndex] = node;
              }}
              role="option"
              style={{ transform: `translate3d(0, ${optionIndex * WHEEL_PICKER_ITEM_HEIGHT}px, 0)` }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </label>
  );
}

function MetronomeWheelPicker({ ariaLabel, minuteOptions, minutes, onMinutesChange, onSecondsChange, secondOptions, seconds }) {
  const handleMinutesPreviewChange = useCallback((nextMinutes) => {
    onMinutesChange(nextMinutes);
  }, [onMinutesChange]);

  const handleSecondsPreviewChange = useCallback((nextSeconds) => {
    onSecondsChange(nextSeconds);
  }, [onSecondsChange]);

  return (
    <div className="metronomeTimerWheelPicker" aria-label={ariaLabel}>
      <WheelPickerColumn label="Minutes" options={minuteOptions} value={minutes} onChange={handleMinutesPreviewChange} />
      <WheelPickerColumn label="Seconds" options={secondOptions} value={seconds} onChange={handleSecondsPreviewChange} />
    </div>
  );
}

function TrainingPanelHeader({ collapsed, content = null, onToggle, title }) {
  return (
    <div className="trainingDetailHeaderRow trainingPanelHeader">
      {content ?? <span className="trainingDetailTitle">{title}</span>}
      {onToggle ? (
        <button
          className="trainingSettingsToggle"
          onClick={onToggle}
          type="button"
        >
          <span>설정 {collapsed ? "펼치기" : "접기"}</span>
          <b aria-hidden="true">{collapsed ? "⌄" : "⌃"}</b>
        </button>
      ) : null}
    </div>
  );
}

const DEFAULT_STRUM_PATTERN = [];

function normalizeStrumPattern(pattern) {
  if (Array.isArray(pattern) && pattern.length > 0) {
    return pattern
      .flatMap((step) => (Array.isArray(step) ? step : [step]))
      .map((step) => {
        if (step?.type === "repeat" || step?.label === "X2") {
          return { type: "repeat", label: "X2" };
        }
        return {
          direction: step?.direction === "up" || step?.dir === "up" ? "up" : "down",
          hit: typeof step?.hit === "boolean" ? step.hit : step?.accent === "strong",
        };
      })
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
        step.type === "repeat" ? (
          <span
            aria-label={`${index + 1}번째 주법 X2`}
            className="strumPatternStep repeat"
            key={`repeat-${index}`}
          >
            X2
          </span>
        ) : onStepClick ? (
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

function StrumPatternRows({ pattern = DEFAULT_STRUM_PATTERN }) {
  const rows = normalizeStrumPatternGroups(pattern).filter((row) => row.length);
  if (!rows.length) return null;
  return (
    <div className="strumPatternRows">
      {rows.map((row, index) => (
        <StrumPattern key={`strum-pattern-row-${index}`} pattern={row} />
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
      <span className="stageMenuCard__step"><b>{stageNumber}</b></span>
      <span className="stageMenuCard__content">
        <strong className="stageMenuCard__title">{category.title}</strong>
        <small className="stageMenuCard__desc">{category.subtitle}</small>
        <em className="stageMenuCard__tag">{category.modeLabel}</em>
      </span>
      <span className="stageMenuCard__arrow" aria-hidden="true">❯</span>
    </button>
  );
}

const LOGO_V11_VARIANT_DEFINITIONS = [
  ["001", "R Anchor Plate", "첫 R을 명판의 시작 앵커처럼 디자인한 시안"],
  ["002", "RI Lockup Plate", "RI를 작은 브랜드 심볼처럼 묶은 구조"],
  ["003", "RIFF Focus Plate", "RIFF 단어를 훈련 핵심 키워드로 강조"],
  ["004", "FF String Signature", "FF를 기타 줄 연결부처럼 처리한 시그니처"],
  ["005", "Opening R Cut", "첫 R의 다리를 절단면처럼 다듬은 고급 명판"],
  ["006", "Final B Seal", "끝 B를 완성 도장처럼 살린 마스터리 컨셉"],
  ["007", "Mini R Badge", "좌측 [R] 보조 심볼과 풀네임을 결합"],
  ["008", "Slogan Rail", "슬로건을 레일처럼 분리해 철학을 강조"],
  ["009", "Double Frame Plate", "이중 프레임으로 장비 명판감을 강화"],
  ["010", "Laser Engraved", "레이저 각인처럼 얇고 정밀한 워드마크"],
  ["011", "Black Metal Plate", "블랙 메탈 플레이트 위 금박 로고"],
  ["012", "Studio Console", "레코딩 콘솔 라벨과 계측 장비 분위기"],
  ["013", "Vintage Amp Badge", "빈티지 기타 앰프 명판 방향"],
  ["014", "Stage Gear Plate", "공연 장비에 붙은 브랜드 플레이트"],
  ["015", "Boutique Guitar Brand", "프리미엄 악기 브랜드 로고 감각"],
  ["016", "Headstock Plate", "기타 헤드스톡 비율을 프레임에 반영"],
  ["017", "Pick Shield Plate", "피크 실루엣을 명판 중심 구조로 활용"],
  ["018", "Riff Pattern Rail", "리프 반복 패턴을 라인 구조로 표현"],
  ["019", "Repeat Meter", "반복 훈련을 계기판 눈금처럼 시각화"],
  ["020", "Mastery Seal", "숙련 인증 마크처럼 완성감 있는 구조"],
  ["021", "Audio Hardware", "하이엔드 오디오 장비 전면 패널 컨셉"],
  ["022", "Analog Meter Plate", "아날로그 미터와 정밀 계측 느낌"],
  ["023", "Instrument Serial", "악기 시리얼 플레이트 같은 정보 구조"],
  ["024", "Art Deco Corner", "아르데코 코너 구조가 눈에 띄는 시안"],
  ["025", "Foil Stamp", "고급 인쇄물의 금박 압인 느낌"],
  ["026", "Engraved Outline", "외곽선 문자와 각인 프레임 중심"],
  ["027", "Riffline Wordmark", "워드마크를 관통하는 리프 라인"],
  ["028", "Training Mark", "훈련 체크포인트를 명판 구조에 결합"],
  ["029", "Focus Aperture", "중앙 집중을 조리개형 프레임으로 표현"],
  ["030", "Heritage Instrument", "오래 쓰는 악기 브랜드의 헤리티지 감각"],
  ["031", "Lab Plate", "연구실 라벨과 음악 장비의 결합"],
  ["032", "String Divider", "글자 사이를 기타 줄 분할선으로 정리"],
  ["033", "Precision Stamp", "정밀 측정 장비의 스탬프형 로고"],
  ["034", "Rivet Plate", "리벳 구조가 명확한 하드웨어 명판"],
  ["035", "Minimal Luxury", "덜어낸 고급 명판과 넓은 여백"],
  ["036", "Concert Nameplate", "무대 중앙 이름표 같은 구조"],
  ["037", "Amp Control Label", "앰프 컨트롤 패널 라벨 컨셉"],
  ["038", "Guitar Shop Sign", "부티크 기타샵 간판 같은 워드마크"],
  ["039", "Master Line", "숙련을 한 줄의 골드 라인으로 표현"],
  ["040", "RIFFLAB Seal", "최종 브랜드 도장 후보처럼 구성"],
];
const createLogoV11Variants = () =>
  LOGO_V11_VARIANT_DEFINITIONS.map(([serial, name, description]) => ({
    id: `v11-${serial}`,
    title: `V11-${serial} ${name}`,
    description,
  }));

const ARCHIVED_HEADER_VARIANTS = [];
const HEADER_VARIANTS = [
  { id: "v11", title: "Logo V11", description: "Art Deco Logo Parent" },
  ...createLogoV11Variants(),
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
const APP_ICON_VARIANTS = [
  { id: "icon-v1", title: "App Icon V1", description: "RIFFLAB 전체 워드마크" },
  { id: "icon-v2", title: "App Icon V2", description: "RIFF 반복 포인트" },
];
const ARCHIVED_APP_ICON_VARIANTS = [];
const DESIGN_LAB_APP_ICON_STORAGE_KEY = "rifflab-design-lab-app-icon";
const APP_ICON_VARIANT_IDS = new Set(APP_ICON_VARIANTS.map((variant) => variant.id));
const DESIGN_LAB_SECTIONS = [
  { id: "logo", label: "로고" },
  { id: "app-icon", label: "앱아이콘" },
  { id: "character", label: "Guitar" },
  { id: "test", label: "TEST" },
  { id: "archive", label: "아카이브" },
];
const SHOOTER_HIT_SOUND_CANDIDATES = [
  {
    id: "chime-crash-clean",
    label: "챙 A",
    title: "챙-팍",
    description: "밝은 금속성 + 짧은 클랩 조합",
    chime: [2850, 4150, 6120],
    clap: 3300,
    hat: 8400,
    sparkle: 10400,
    tail: 0.055,
    chimeLevel: 0.22,
    clapLevel: 0.34,
    hatLevel: 0.18,
    sparkleLevel: 0.08,
  },
  {
    id: "chime-crash-bright",
    label: "챙 B",
    title: "쨍그랑",
    description: "하이햇과 스파클이 더 화려한 후보",
    chime: [3200, 5200, 7600],
    clap: 3800,
    hat: 9600,
    sparkle: 11800,
    tail: 0.065,
    chimeLevel: 0.24,
    clapLevel: 0.28,
    hatLevel: 0.24,
    sparkleLevel: 0.12,
  },
  {
    id: "chime-crash-clap",
    label: "챙 C",
    title: "클랩 챙",
    description: "클랩을 중심으로 금속음을 얹은 후보",
    chime: [2450, 3900, 6900],
    clap: 3000,
    hat: 7200,
    sparkle: 9800,
    tail: 0.052,
    chimeLevel: 0.18,
    clapLevel: 0.46,
    hatLevel: 0.14,
    sparkleLevel: 0.07,
  },
  {
    id: "chime-crash-combo",
    label: "챙 D",
    title: "콤보 챙그랑",
    description: "콤보용으로 더 넓고 화려한 후보",
    chime: [2800, 4700, 8100, 12400],
    clap: 3600,
    hat: 10200,
    sparkle: 13200,
    tail: 0.07,
    chimeLevel: 0.26,
    clapLevel: 0.34,
    hatLevel: 0.24,
    sparkleLevel: 0.14,
    accent: true,
  },
];
const SHOOTER_PLAYER_STORAGE_KEY = "rifflabSelectedPlayer";
const SHOOTER_GUITAR_STORAGE_KEY = "rifflabSelectedGuitar";
const GUITAR_LAB_STORAGE_KEY = "rifflab-shooter-guitar-v1";
const GUITAR_LAB_AVAILABILITY_STORAGE_KEY = "rifflabGuitarLabAvailability";
const GUITAR_LAB_DELETED_STORAGE_KEY = "rifflabGuitarLabDeletedIds";
const GUITAR_LAB_PURGED_STORAGE_KEY = "rifflabGuitarLabPurgedIds";
const SHOOTER_PLAYER_SLOTS_STORAGE_KEY = "shooterPlayerSlots";
const RIFFLAB_GUITAR_DESIGN_RULES = [
  "헤드는 전체 길이의 약 16~20% 안에서 위를 향하고, 튜닝 포스트 6개는 헤드 중앙축을 기준으로 정렬한다.",
  "튜닝 버튼은 헤드 양측에 두되, 줄의 시작점처럼 보이지 않게 포스트와 짧은 암으로 연결한다.",
  "줄 경로는 튜닝 포스트 -> 너트 -> 지판 -> 새들 -> 브릿지핀 순서로 연결한다.",
  "너트는 헤드와 지판의 경계이며, 모든 줄은 너트를 통과한 뒤 지판 위를 지나간다.",
  "지판은 헤드에서 바디까지 정돈된 11자 형태를 유지하고, 프렛은 지판 내부에만 수평으로 배치한다.",
  "사운드홀은 바디 상단 중앙, 브릿지는 사운드홀 아래, 새들은 브릿지 내부 상단, 브릿지핀 6개는 새들 아래에 둔다.",
  "픽가드는 사운드홀 우측에 두고, 뾰족한 끝은 사운드홀 외곽을 향해 자연스럽게 붙인다.",
  "바디는 어깨 -> 허리 -> 하부 바디가 끊기지 않는 연속 곡선이며, 컷어웨이는 우측 어깨에만 부드럽게 적용한다.",
  "하부 바디는 Martin/Gibson 계열처럼 넓되 과하게 부풀리지 않고, 최하단은 평평함이나 각 없이 하나의 연속 곡률로 닫는다.",
];
const GUITAR_LAB_VARIANTS = [
  ["acoustic-dreadnought", "Acoustic", "Dreadnought", "큰 바디와 강한 존재감의 기본 어쿠스틱 플레이어", "#b87936", "#2f1a0b", "round"],
  ["acoustic-om", "Acoustic", "OM", "균형 잡힌 허리선과 민첩한 이동감을 가진 어쿠스틱", "#c98b43", "#332012", "waist"],
  ["acoustic-000", "Acoustic", "000", "컴팩트한 바디와 선명한 실루엣의 빈티지 어쿠스틱", "#d49a52", "#3a2413", "compact"],
  ["acoustic-jumbo", "Acoustic", "Jumbo", "넓은 하단 바디로 탄환 발사감이 강한 점보", "#b66d2b", "#25150b", "jumbo"],
  ["acoustic-mini", "Acoustic", "Mini", "작은 모바일 화면에서 빠르게 읽히는 미니 기타", "#d9aa55", "#2a1b0d", "mini"],
  ["classical-natural", "Classical", "Natural", "부드러운 나일론 감성의 내추럴 클래식", "#d9a65c", "#3b2512", "classical"],
  ["classical-cedar", "Classical", "Cedar", "따뜻한 시더 상판과 진한 중앙 사운드홀", "#a86434", "#2a160d", "classical"],
  ["classical-rosewood", "Classical", "Rosewood", "로즈우드 톤의 깊은 브라운 클래식", "#7a3f2a", "#1c0f0a", "classical"],
  ["classical-black", "Classical", "Black", "블랙 바디와 골드 구조선의 프리미엄 클래식", "#121212", "#d9aa55", "classical"],
  ["classical-vintage", "Classical", "Vintage", "오래된 악기점 느낌의 빈티지 클래식", "#c38b45", "#2e1b0d", "classical"],
  ["electric-strat", "Electric", "Strat", "픽가드와 3픽업 구조가 보이는 스트랫형", "#d8d2bd", "#151515", "strat"],
  ["electric-tele", "Electric", "Tele", "각진 싱글컷 바디와 브릿지 플레이트가 강한 텔레형", "#d49a37", "#17110a", "tele"],
  ["electric-lp", "Electric", "LP Style", "두꺼운 싱글컷 바디와 험버커 코어의 LP 스타일", "#8d251d", "#1a0907", "lp"],
  ["electric-super-strat", "Electric", "Super Strat", "날카로운 컷어웨이와 빠른 슈터 실루엣", "#1c2f48", "#d9aa55", "super"],
  ["electric-metal", "Electric", "Metal Style", "메탈 리프용 날카로운 바디와 공격형 헤드", "#0c0c0e", "#c7c9d1", "metal"],
  ["acoustic-riff-scout", "Acoustic", "Riff Scout", "둥근 헤드와 작은 바디 포인트가 귀여운 정찰형 기타 플레이어", "#c77f34", "#f1ca7a", "cute-dread"],
  ["acoustic-gold-pilot", "Acoustic", "Gold Pilot", "골드 상판과 또렷한 중앙축을 가진 기본 주력 후보", "#d9aa55", "#4a2b12", "stage-dread"],
  ["acoustic-stage-buddy", "Acoustic", "Stage Buddy", "작은 무대 조명감과 부드러운 어깨선을 가진 버디형", "#b96f2c", "#e6b86a", "buddy-dread"],
  ["acoustic-pick-guard", "Acoustic", "Pick Guard", "픽가드 실루엣이 캐릭터 표정처럼 읽히는 플레이어 후보", "#a86434", "#f1ca7a", "guard-dread"],
  ["acoustic-mini-ace", "Acoustic", "Mini Ace", "작지만 헤드와 줄 구조가 선명한 빠른 기동형 후보", "#d39b4d", "#2a1b0d", "ace-mini"],
  ["acoustic-auditorium", "Acoustic", "Auditorium", "허리선이 정돈된 균형형 오디토리엄 후보", "#c9873e", "#2b190c", "auditorium"],
  ["acoustic-grand-auditorium", "Acoustic", "Grand Auditorium", "넓은 하단과 얇은 허리선의 그랜드 오디토리엄", "#d39a4b", "#321d0d", "grand-auditorium"],
  ["acoustic-soft-cutaway", "Acoustic", "Soft Cutaway", "부드러운 상단 컷어웨이가 있는 모던 어쿠스틱", "#be7a34", "#f1ca7a", "soft-cutaway"],
  ["acoustic-modern-cutaway", "Acoustic", "Modern Cutaway", "날렵한 싱글 컷어웨이와 무대형 실루엣", "#d09a55", "#2a1608", "modern-cutaway"],
  ["acoustic-slope-shoulder", "Acoustic", "Slope Shoulder", "빈티지 슬로프 숄더 감성의 둥근 어깨형", "#b87533", "#3a2110", "slope-shoulder"],
  ["acoustic-parlor", "Acoustic", "Parlor", "작고 선명한 실루엣의 팔러 기타 후보", "#d4a15c", "#28170c", "parlor"],
  ["acoustic-premium-dread", "Acoustic", "Premium Dread", "정통 드레드넛 비율에 골드 엣지를 더한 프리미엄형", "#a85f2b", "#f1ca7a", "premium-dread"],
  ["acoustic-vintage-amber", "Acoustic", "Vintage Amber", "오래된 앰버 톤과 클래식 픽가드의 빈티지 후보", "#c27a2f", "#2d190b", "vintage-amber"],
  ["acoustic-black-cutaway", "Acoustic", "Black Cutaway", "블랙 상판과 정교한 컷어웨이를 가진 고급형", "#11100d", "#d9aa55", "soft-cutaway"],
  ["acoustic-maple-jumbo", "Acoustic", "Maple Jumbo", "밝은 메이플 톤의 넓은 점보 바디", "#e2b76c", "#42240e", "jumbo"],
  ["classical-premium-black", "Classical", "Premium Black", "블랙 나일론 바디와 정돈된 클래식 헤드", "#0d0d0c", "#d9aa55", "classical-premium"],
  ["classical-flamenco", "Classical", "Flamenco", "얇고 밝은 바디의 플라멩코 스타일 후보", "#e0b46c", "#2f1b0c", "flamenco"],
  ["classical-concert", "Classical", "Concert", "콘서트 클래식 비율을 강조한 정갈한 후보", "#c98f4a", "#3b230e", "concert-classical"],
  ["classical-dark-rose", "Classical", "Dark Rose", "다크 로즈우드 톤의 고급 클래식 후보", "#5f2e24", "#d9aa55", "classical-premium"],
  ["electric-single-cut-gold", "Electric", "Single Cut Gold", "LP 계열을 더 단순화한 골드 싱글컷", "#c18a35", "#120a06", "lp"],
  ["electric-offset-blue", "Electric", "Offset Blue", "오프셋 바디와 블루 스테이지 톤의 일렉 후보", "#244c64", "#d9aa55", "offset"],
  ["electric-arcade-red", "Electric", "Arcade Red", "슈팅게임에서 읽히는 강한 레드 바디 후보", "#9a2c22", "#f1ca7a", "super"],
  ["electric-hollow-gold", "Electric", "Hollow Gold", "세미할로우 느낌을 줄인 골드 일렉 후보", "#b87936", "#17110a", "hollow"],
  ["electric-shadow-metal", "Electric", "Shadow Metal", "날렵한 메탈 헤드와 블랙 바디의 공격형", "#101114", "#c7c9d1", "metal"],
  ["electric-tele-deluxe", "Electric", "Tele Deluxe", "각진 텔레 바디에 더 넓은 픽가드를 더한 후보", "#d0a05a", "#17110a", "tele-deluxe"],
  ["acoustic-dreadnought-refined", "Acoustic", "Dreadnought Refined", "정통 드레드넛 비율과 정렬된 헤드 구조를 강화한 후보", "#c9843d", "#2a1709", "dreadnought-refined"],
  ["acoustic-om-refined", "Acoustic", "OM Refined", "작은 허리선과 안정적인 지판 비율의 OM 개선형", "#d19a55", "#301c0d", "om-refined"],
  ["acoustic-grand-concert", "Acoustic", "Grand Concert", "바디가 작고 균형 잡힌 그랜드 콘서트형", "#d6a15a", "#2b190d", "grand-concert"],
  ["acoustic-jumbo-balanced", "Acoustic", "Jumbo Balanced", "넓은 하단 바디를 대칭적으로 정리한 점보형", "#b86f2e", "#f1ca7a", "jumbo-balanced"],
  ["acoustic-venetian-cutaway", "Acoustic", "Venetian Cutaway", "우측 어깨에 부드러운 베네시안 컷어웨이를 적용한 후보", "#c58235", "#f1ca7a", "venetian-cutaway"],
  ["acoustic-modern-venetian", "Acoustic", "Modern Venetian", "모던 컷어웨이를 과하지 않게 다듬은 무대형 후보", "#d0964f", "#2b1608", "modern-venetian"],
  ["acoustic-deep-waist", "Acoustic", "Deep Waist", "허리 라인이 선명하지만 전체 대칭이 유지되는 후보", "#b76d32", "#f1ca7a", "deep-waist"],
  ["acoustic-travel-plus", "Acoustic", "Travel Plus", "작은 바디와 선명한 헤드 디테일을 가진 트래블형", "#d8aa62", "#2a1a0d", "travel-plus"],
  ["acoustic-12fret-heritage", "Acoustic", "12-Fret Heritage", "빈티지 12프렛 감성의 짧은 넥 비율 후보", "#c28b46", "#2f1c0e", "twelve-fret"],
  ["acoustic-archtop-gold", "Acoustic", "Archtop Gold", "아치탑 실루엣을 어쿠스틱 플레이어로 재해석한 후보", "#c99448", "#1d1208", "archtop"],
  ["acoustic-all-solid", "Acoustic", "All Solid", "고급 원목 질감과 정돈된 브릿지 구조를 강조한 후보", "#bf7b35", "#f1ca7a", "all-solid"],
  ["acoustic-concert-cutaway", "Acoustic", "Concert Cutaway", "콘서트 바디에 작은 컷어웨이를 더한 후보", "#d6a260", "#28170c", "concert-cutaway"],
  ["acoustic-slope-modern", "Acoustic", "Slope Modern", "슬로프 숄더를 현대적으로 정리한 후보", "#b97939", "#2f1a0c", "slope-modern"],
  ["acoustic-thin-body", "Acoustic", "Thin Body", "얇은 바디 느낌과 모바일 식별성을 강화한 후보", "#a9672d", "#f1ca7a", "thin-body"],
  ["acoustic-baritone", "Acoustic", "Baritone", "긴 넥과 안정적인 하단 바디를 가진 바리톤 감성 후보", "#8f5228", "#d9aa55", "baritone"],
  ["acoustic-rosewood-grand", "Acoustic", "Rosewood Grand", "짙은 로즈우드 톤과 큰 바디의 프리미엄 후보", "#683322", "#d9aa55", "rosewood-grand"],
  ["acoustic-maple-stage", "Acoustic", "Maple Stage", "밝은 메이플 상판과 무대용 픽가드 배치를 가진 후보", "#e1b96d", "#37200e", "maple-stage"],
  ["acoustic-cedar-om", "Acoustic", "Cedar OM", "시더 톤 OM 바디와 부드러운 곡선의 후보", "#ad6534", "#f1ca7a", "cedar-om"],
  ["acoustic-black-bird", "Acoustic", "Black Bird", "블랙 상판 위 새 인레이가 또렷한 프리미엄 후보", "#11100d", "#d9aa55", "black-bird"],
  ["acoustic-sunburst-cutaway", "Acoustic", "Sunburst Cutaway", "선버스트 톤과 우측 컷어웨이를 결합한 후보", "#c06f24", "#1a0e06", "sunburst-cutaway"],
  ["acoustic-orchestra-luxe", "Acoustic", "Orchestra Luxe", "작은 허리와 정돈된 상하 비례를 가진 오케스트라형 신규 후보", "#cf9450", "#2b1709", "orchestra-luxe"],
  ["acoustic-heritage-dread", "Acoustic", "Heritage Dread", "정통 드레드넛을 더 각진 헤드와 안정적인 바디로 다듬은 신규 후보", "#b96f32", "#f1ca7a", "heritage-dread"],
  ["acoustic-studio-cut", "Acoustic", "Studio Cut", "스튜디오 세션용처럼 얇고 부드러운 우측 컷어웨이 신규 후보", "#d5a05c", "#251409", "studio-cut"],
  ["acoustic-boutique-cedar", "Acoustic", "Boutique Cedar", "부티크 악기점 감성의 시더 톤과 깊은 허리선을 가진 신규 후보", "#a95f35", "#f1ca7a", "boutique-cedar"],
  ["acoustic-wide-stage", "Acoustic", "Wide Stage", "무대 위 플레이어처럼 하단이 넓고 중심축이 또렷한 신규 후보", "#d9aa55", "#3b210e", "wide-stage"],
  ["acoustic-north-dread", "Acoustic", "North Dread", "넓은 어깨와 부드러운 허리 곡선을 정리한 정통 드레드넛 신규 후보", "#c47f37", "#f1ca7a", "north-dread"],
  ["acoustic-ember-om", "Acoustic", "Ember OM", "작은 허리와 자연스러운 상부 바디 비율의 OM 신규 후보", "#d09248", "#2a1709", "ember-om"],
  ["acoustic-royal-auditorium", "Acoustic", "Royal Auditorium", "오디토리엄 바디의 연속 곡선과 고급 골드 엣지를 강조한 후보", "#d7a55d", "#3a210f", "royal-auditorium"],
  ["acoustic-crescent-cutaway", "Acoustic", "Crescent Cutaway", "사운드홀을 향해 열리는 부드러운 우측 컷어웨이 신규 후보", "#b96d31", "#f1ca7a", "crescent-cutaway"],
  ["acoustic-rose-stage", "Acoustic", "Rose Stage", "로즈 브라운 톤과 실제 픽가드 방향을 강조한 스테이지형 신규 후보", "#7b3f29", "#d9aa55", "rose-stage"],
  ["real-martin-d28", "Acoustic", "Real D-28 Line", "Martin D-28 계열의 정통 드레드넛 비율을 단순화한 실제 구조 기반 라인", "#c7843c", "#f1ca7a", "real-d28"],
  ["real-martin-d18", "Acoustic", "Real D-18 Line", "D-18 계열의 단정한 어깨와 선명한 브릿지핀 구조를 반영한 후보", "#d59b4f", "#3a210f", "real-d18"],
  ["real-martin-hd28", "Acoustic", "Real HD-28 Line", "HD-28 스타일의 넓은 하부 바디와 프리미엄 엣지를 반영한 후보", "#b97834", "#f1ca7a", "real-hd28"],
  ["real-gibson-j45", "Acoustic", "Real J-45 Slope", "Gibson J-45 계열의 슬로프 숄더와 안정적인 허리선을 참고한 후보", "#9b5428", "#f1ca7a", "real-j45"],
  ["real-gibson-hummingbird", "Acoustic", "Real Hummingbird", "스퀘어 숄더와 큰 픽가드 영역을 단순화한 허밍버드 방향 후보", "#c66d25", "#2a1608", "real-hummingbird"],
  ["real-taylor-814ce", "Acoustic", "Real 814ce Cut", "Taylor 814ce 계열의 그랜드 오디토리엄 컷어웨이 비율을 반영한 후보", "#d6a66a", "#2b1709", "real-814ce"],
  ["real-taylor-314ce", "Acoustic", "Real 314ce Cut", "314ce 계열의 밝은 상판과 부드러운 Venetian 컷어웨이를 참고한 후보", "#d8ac66", "#30200e", "real-314ce"],
  ["real-taylor-214ce", "Acoustic", "Real 214ce Cut", "214ce 계열의 얇고 읽기 쉬운 컷어웨이 실루엣을 반영한 후보", "#d09a55", "#f1ca7a", "real-214ce"],
  ["real-yamaha-fg5", "Acoustic", "Real FG5 Dread", "Yamaha FG5 계열의 직관적인 드레드넛 바디와 브릿지 구조 후보", "#c98b43", "#2d190b", "real-fg5"],
  ["real-yamaha-ll16", "Acoustic", "Real LL16 Jumbo", "Yamaha LL16 계열의 넓은 하부와 긴 라인감을 단순화한 후보", "#d29a50", "#2a1709", "real-ll16"],
  ["real-vintage-dread", "Acoustic", "Real Vintage Dread", "빈티지 드레드넛의 둥근 어깨와 실제 핀 브릿지를 강조한 후보", "#b56a2d", "#f1ca7a", "real-vintage-dread"],
  ["real-modern-dread", "Acoustic", "Real Modern Dread", "현대 드레드넛의 정돈된 상하 비율과 직선적인 지판 구조 후보", "#d09a4f", "#2a1709", "real-modern-dread"],
  ["real-om-rosewood", "Acoustic", "Real OM Rosewood", "OM 계열의 작은 허리와 로즈우드 톤을 반영한 실제 비율 후보", "#70402b", "#d9aa55", "real-om-rosewood"],
  ["real-auditorium-cedar", "Acoustic", "Real Auditorium Cedar", "오디토리엄 바디와 시더 톤 상판을 참고한 균형형 후보", "#a96737", "#f1ca7a", "real-auditorium-cedar"],
  ["real-grand-auditorium", "Acoustic", "Real Grand Auditorium", "그랜드 오디토리엄의 하부 볼륨과 사운드홀 위치를 반영한 후보", "#d6a25b", "#30200e", "real-grand-auditorium"],
  ["real-single-cutaway", "Acoustic", "Real Single Cutaway", "우측 어깨 컷어웨이를 실제 연주기타 비율로 절제한 후보", "#c17a35", "#f1ca7a", "real-single-cutaway"],
  ["real-soft-cutaway", "Acoustic", "Real Soft Cutaway", "부드러운 컷어웨이와 어쿠스틱 바디 대칭감을 함께 유지한 후보", "#d2a05c", "#2a1709", "real-soft-cutaway"],
  ["real-modern-cutaway", "Acoustic", "Real Modern Cutaway", "모던 컷어웨이를 과장 없이 정리한 무대용 어쿠스틱 후보", "#b96f34", "#f1ca7a", "real-modern-cutaway"],
  ["real-jumbo-maple", "Acoustic", "Real Jumbo Maple", "점보 바디의 넓은 하부와 메이플 계열 밝은 상판 후보", "#e1b96d", "#3b210e", "real-jumbo-maple"],
  ["real-square-shoulder", "Acoustic", "Real Square Shoulder", "Gibson Hummingbird 계열의 스퀘어 숄더를 단순화한 후보", "#b86727", "#f1ca7a", "real-square-shoulder"],
  ["fresh-d28-bloom", "Acoustic", "D28 Bloom", "상부 어깨와 허리, 하부 바디가 한 흐름으로 이어지는 새 드레드넛 라인", "#c9823a", "#f1ca7a", "fresh-dread"],
  ["fresh-d18-honey", "Acoustic", "D18 Honey", "꿀빛 상판과 절제된 하단 곡률을 가진 정통 어쿠스틱 후보", "#d79b4d", "#3a210f", "fresh-d18"],
  ["fresh-fg5-root", "Acoustic", "FG5 Root", "Yamaha FG5 계열의 직관적인 어깨와 둥근 하부를 재해석한 후보", "#c88b43", "#2d190b", "fresh-fg5"],
  ["fresh-j45-slope", "Acoustic", "J45 Slope", "슬로프 숄더와 자연스러운 허리선을 가진 빈티지 후보", "#a75d2d", "#f1ca7a", "fresh-j45"],
  ["fresh-humming-gold", "Acoustic", "Humming Gold", "스퀘어 숄더 계열을 부드러운 하부 곡률로 정리한 후보", "#c66e28", "#2a1608", "fresh-humming"],
  ["fresh-om-clear", "Acoustic", "OM Clear", "작은 허리와 선명한 사운드홀 비율의 OM 후보", "#d39a55", "#2f1b0d", "fresh-om"],
  ["fresh-000-amber", "Acoustic", "000 Amber", "컴팩트한 바디에 하단 연속 곡선을 강조한 000 후보", "#d49b52", "#332012", "fresh-000"],
  ["fresh-auditorium-arc", "Acoustic", "Auditorium Arc", "오디토리엄 바디의 상하 균형과 유기적 하단 곡선을 다듬은 후보", "#d2a05b", "#30200e", "fresh-auditorium"],
  ["fresh-grand-stage", "Acoustic", "Grand Stage", "무대용 그랜드 오디토리엄 비율과 골드 로제트가 돋보이는 후보", "#d9aa55", "#3b210e", "fresh-grand"],
  ["fresh-soft-cut", "Acoustic", "Soft Cut", "우측 어깨 컷어웨이를 실제 기타처럼 부드럽게 제한한 후보", "#c37a36", "#f1ca7a", "fresh-soft-cut"],
  ["fresh-venetian", "Acoustic", "Venetian", "사운드홀과 픽가드 방향이 정돈된 베네시안 컷어웨이 후보", "#d29a4f", "#2a1709", "fresh-venetian"],
  ["fresh-cedar-room", "Acoustic", "Cedar Room", "시더 톤과 차분한 하단 볼륨을 가진 연습실형 후보", "#a96737", "#f1ca7a", "fresh-cedar"],
  ["fresh-rosewood-room", "Acoustic", "Rosewood Room", "짙은 로즈우드 톤과 자개 로제트를 강조한 고급 후보", "#70402b", "#d9aa55", "fresh-rosewood"],
  ["fresh-maple-luxe", "Acoustic", "Maple Luxe", "밝은 메이플 톤과 균형 잡힌 하부 바디를 가진 후보", "#e1b96d", "#3b210e", "fresh-maple"],
  ["fresh-black-pearl", "Acoustic", "Black Pearl", "블랙 바디와 자개 로제트 대비가 강한 프리미엄 후보", "#11100d", "#d9aa55", "fresh-black"],
  ["fresh-sunburst-dread", "Acoustic", "Sunburst Dread", "선버스트 톤과 실제 드레드넛 실루엣을 조합한 후보", "#c06f24", "#1a0e06", "fresh-sunburst"],
  ["fresh-boutique-om", "Acoustic", "Boutique OM", "부티크 기타샵 감성의 작고 정교한 OM 후보", "#c88443", "#f1ca7a", "fresh-boutique"],
  ["fresh-studio-dread", "Acoustic", "Studio Dread", "녹음실용처럼 차분한 바디와 얇은 골드 엣지를 가진 후보", "#b96f32", "#f1ca7a", "fresh-studio"],
  ["fresh-jumbo-tame", "Acoustic", "Jumbo Tame", "점보 느낌은 남기되 돼지배처럼 부풀지 않게 절제한 후보", "#d0a05c", "#28170c", "fresh-jumbo"],
  ["fresh-heritage-bird", "Acoustic", "Heritage Bird", "새 인레이와 자개 로제트를 고급스럽게 정리한 헤리티지 후보", "#b86727", "#f1ca7a", "fresh-heritage"],
  ["fresh-d15m-mahogany", "Acoustic", "D15M Mahogany", "Martin D-15M 참고 비율의 올마호가니 드레드넛 후보", "#8f4f2d", "#f1ca7a", "fresh-d15m-mahogany"],
  ["fresh-d15m-satin", "Acoustic", "D15M Satin", "새틴 마호가니 질감과 단정한 스퀘어 숄더 실루엣 후보", "#9a5a35", "#d9aa55", "fresh-d15m-satin"],
  ["fresh-d15m-studio", "Acoustic", "D15M Studio", "상부 어깨와 하부 곡률을 D 바디 기준으로 정리한 스튜디오 후보", "#7b452c", "#f1ca7a", "fresh-d15m-studio"],
  ["fresh-d15m-shadow", "Acoustic", "D15M Shadow", "어두운 마호가니 바디와 절제된 골드 엣지를 가진 D 바디 후보", "#5f3325", "#d9aa55", "fresh-d15m-shadow"],
  ["fresh-d15m-stage", "Acoustic", "D15M Stage", "무대용 플레이어로 읽히도록 D-15M 실루엣을 선명하게 다듬은 후보", "#a96537", "#f8e8b0", "fresh-d15m-stage"],
  ["fresh-cutaway-814ce", "Acoustic", "814ce Flow", "Taylor 814ce 계열의 우측 어깨 컷어웨이 흐름을 참고한 후보", "#d6a15c", "#2a1709", "fresh-cutaway-814ce"],
  ["fresh-cutaway-314ce", "Acoustic", "314ce Flow", "그랜드 오디토리엄 컷어웨이를 더 담백하게 단순화한 후보", "#c98b43", "#f1ca7a", "fresh-cutaway-314ce"],
  ["fresh-cutaway-214ce", "Acoustic", "214ce Flow", "부드러운 고음현 컷어웨이와 낮은 하단 곡률을 가진 후보", "#d09a4f", "#2d190b", "fresh-cutaway-214ce"],
  ["fresh-cutaway-grand", "Acoustic", "Grand Cutaway", "넓은 하부 바디와 유려한 베네시안 컷어웨이를 조합한 후보", "#d9aa55", "#3b210e", "fresh-cutaway-grand"],
  ["fresh-cutaway-auditorium", "Acoustic", "Auditorium Cut", "오디토리엄 비율에 자연스러운 우측 어깨 파임을 더한 후보", "#c58235", "#f1ca7a", "fresh-cutaway-auditorium"],
  ["fresh-cutaway-dread", "Acoustic", "Dread Cutaway", "드레드넛 바디를 유지하면서 컷어웨이를 과하지 않게 넣은 후보", "#b96f32", "#f1ca7a", "fresh-cutaway-dread"],
  ["fresh-cutaway-mahogany", "Acoustic", "Mahogany Cut", "마호가니 톤과 D 바디 컷어웨이를 결합한 후보", "#8f4f2d", "#d9aa55", "fresh-cutaway-mahogany"],
  ["fresh-cutaway-rosewood", "Acoustic", "Rosewood Cut", "짙은 로즈우드 톤과 자개 로제트가 어울리는 컷어웨이 후보", "#70402b", "#d9aa55", "fresh-cutaway-rosewood"],
  ["fresh-cutaway-maple", "Acoustic", "Maple Cut", "밝은 메이플 톤과 선명한 고음현 컷어웨이를 가진 후보", "#e1b96d", "#3b210e", "fresh-cutaway-maple"],
  ["fresh-cutaway-black", "Acoustic", "Black Cut", "블랙 바디에서 컷어웨이 실루엣이 또렷하게 읽히는 후보", "#11100d", "#d9aa55", "fresh-cutaway-black"],
  ["fresh-cutaway-sunburst", "Acoustic", "Sunburst Cut", "선버스트 바디와 부드러운 우측 어깨 라인의 후보", "#c06f24", "#1a0e06", "fresh-cutaway-sunburst"],
  ["fresh-cutaway-cedar", "Acoustic", "Cedar Cut", "시더 상판 느낌의 차분한 컷어웨이 후보", "#a96737", "#f1ca7a", "fresh-cutaway-cedar"],
  ["fresh-cutaway-stage", "Acoustic", "Stage Cut", "슈팅게임 플레이어로 읽히도록 컷어웨이 실루엣을 선명하게 만든 후보", "#c37a36", "#f8e8b0", "fresh-cutaway-stage"],
  ["fresh-cutaway-venetian", "Acoustic", "Venetian Flow", "급격한 각 없이 둥글게 파인 베네시안 컷어웨이 후보", "#d29a4f", "#2a1709", "fresh-cutaway-venetian"],
  ["fresh-cutaway-soft", "Acoustic", "Soft Flow", "상부 바디에서 허리까지 한 흐름으로 이어지는 소프트 컷어웨이 후보", "#d2a05b", "#30200e", "fresh-cutaway-soft"],
  ["fresh-cutaway-modern", "Acoustic", "Modern Flow", "모던한 컷어웨이를 직선 없이 유기적인 곡선으로 정리한 후보", "#b87533", "#f1ca7a", "fresh-cutaway-modern"],
  ["fresh-cutaway-boutique", "Acoustic", "Boutique Cut", "부티크 기타샵 감성의 얇은 허리와 컷어웨이 후보", "#c88443", "#f1ca7a", "fresh-cutaway-boutique"],
  ["fresh-cutaway-pearl", "Acoustic", "Pearl Cut", "자개 로제트와 고급 컷어웨이 실루엣을 강조한 후보", "#5f3325", "#f8e8b0", "fresh-cutaway-pearl"],
  ["fresh-cutaway-honey", "Acoustic", "Honey Cut", "꿀빛 상판과 자연스러운 하단 연속 곡률의 컷어웨이 후보", "#d79b4d", "#3a210f", "fresh-cutaway-honey"],
  ["fresh-cutaway-reference", "Acoustic", "Reference Cut", "첨부 레퍼런스 라인의 측면 흐름과 하단 곡률을 기준으로 만든 후보", "#c9823a", "#f1ca7a", "fresh-cutaway-reference"],
  ["acoustic-real-trace", "Acoustic", "Natural", "실제 통기타 누끼 라인을 기준으로 만든 기본 내추럴 정면 PNG 후보", "#d79b4d", "#3a210f", "image-real-trace", "/images/shooter-acoustic-real-trace.png"],
  ["acoustic-epic-trace", "Acoustic", "Sunburst", "같은 통기타 라인에 레드 선버스트 톤을 입힌 기본 PNG 후보", "#c74323", "#ff8a2a", "image-epic-trace", "/images/shooter-acoustic-epic-trace.png"],
  ["acoustic-legendary-core-trace", "Acoustic", "Pearl Clean", "기존 화이트 골드 펄 톤의 기본 PNG 후보", "#f4d58a", "#ffcf52", "image-legendary-core-trace", "/images/shooter-acoustic-legendary-trace.png"],
  ["rifflab-legendary-cutaway", "Acoustic", "Phoenix Harmony", "피닉스 금장 문양을 가진 컷어웨이 슈팅 기타 PNG", "#7c241b", "#d8a64a", "image-rifflab-legendary-cutaway", "/images/rifflab-legendary-cutaway-sprite-tight.png"],
  ["rifflab-epic-cutaway", "Acoustic", "Azure Bloom", "내추럴 우드와 블루 골드 장식을 가진 컷어웨이 슈팅 기타 PNG", "#d8aa66", "#2f63b8", "image-rifflab-epic-cutaway", "/images/rifflab-epic-cutaway-sprite-tight.png"],
  ["acoustic-core-dread-01", "Acoustic", "Core Dread 01", "진한 자개 로제트와 위로 정리된 브릿지 위치를 적용한 기본 드레드넛 후보", "#b97836", "#f1ca7a", "core-dread-01"],
  ["acoustic-core-dread-02", "Acoustic", "Core Dread 02", "마호가니 톤을 유지하면서 사운드홀과 브릿지 간격을 좁힌 후보", "#8f5230", "#f8e8b0", "core-dread-02"],
  ["acoustic-core-dread-03", "Acoustic", "Core Dread 03", "선버스트 깊이감과 진한 자개 사운드홀을 더한 스테이지용 후보", "#c06f24", "#1a0e06", "core-dread-03"],
].map(([id, pack, model, description, bodyColor, accentColor, shape, assetSrc, projectileAssetSrc], index) => ({
  id,
  pack,
  model,
  title: model,
  description,
  bodyColor,
  accentColor,
  shape,
  assetSrc,
  projectileAssetSrc,
  index: index + 1,
}));
const DEFAULT_GUITAR_LAB_VARIANT_ID = "acoustic-core-dread-01";
const GUITAR_LAB_VARIANT_IDS = new Set(GUITAR_LAB_VARIANTS.map((variant) => variant.id));
const SHOOTER_TRACE_GUITAR_VARIANT_ID = "acoustic-real-trace";
const SHOOTER_RARITY_GUITAR_VARIANT_IDS = [
  SHOOTER_TRACE_GUITAR_VARIANT_ID,
  "acoustic-epic-trace",
  "acoustic-legendary-core-trace",
  "rifflab-legendary-cutaway",
  "rifflab-epic-cutaway",
];
const SHOOTER_GUITAR_RARITIES = {
  NORMAL: "normal",
  RARE: "rare",
  EPIC: "epic",
  LEGENDARY: "legendary",
};
const SHOOTER_GUITAR_RARITY_OPTIONS = [
  { id: SHOOTER_GUITAR_RARITIES.NORMAL, label: "일반" },
  { id: SHOOTER_GUITAR_RARITIES.RARE, label: "레어" },
  { id: SHOOTER_GUITAR_RARITIES.EPIC, label: "에픽" },
  { id: SHOOTER_GUITAR_RARITIES.LEGENDARY, label: "레전더리" },
];
const SHOOTER_GUITAR_RARITY_BY_VARIANT_ID = {
  [SHOOTER_TRACE_GUITAR_VARIANT_ID]: SHOOTER_GUITAR_RARITIES.NORMAL,
  "acoustic-epic-trace": SHOOTER_GUITAR_RARITIES.NORMAL,
  "acoustic-legendary-core-trace": SHOOTER_GUITAR_RARITIES.NORMAL,
  "rifflab-legendary-cutaway": SHOOTER_GUITAR_RARITIES.LEGENDARY,
  "rifflab-epic-cutaway": SHOOTER_GUITAR_RARITIES.EPIC,
};
const FRESH_ACOUSTIC_GUITAR_IDS = new Set([
  ...SHOOTER_RARITY_GUITAR_VARIANT_IDS,
  "acoustic-core-dread-01",
  "acoustic-core-dread-02",
  "acoustic-core-dread-03",
]);

function getShooterGuitarRarityId(variantId) {
  return SHOOTER_GUITAR_RARITY_BY_VARIANT_ID[variantId] ?? SHOOTER_GUITAR_RARITIES.NORMAL;
}

const DEFAULT_SHOOTER_PLAYER_SLOTS = {
  slot1: "acoustic-core-dread-01",
  slot2: "acoustic-core-dread-02",
  slot3: "electric-lp",
};
const SHOOTER_PLAYER_SLOT_KEYS = ["slot1", "slot2", "slot3"];
function MetronomeVisualLabDot({ activeBeat, beatPattern, isPlaying }) {
  return (
    <div className="metronomeVisualLabDot" aria-label="Dot Mode visual preview">
      {beatPattern.map((beatState, index) => (
        <BeatDot
          active={isPlaying && activeBeat === index}
          className="metronomeVisualLabBeat"
          key={`visual-dot-${index}`}
          label={`Beat ${index + 1} ${METRONOME_BEAT_STATE_LABELS[beatState]}`}
          state={beatState}
        />
      ))}
    </div>
  );
}

function getBeatDotState(state) {
  if (state === "strong" || state === METRONOME_BEAT_STATES.ACCENT) return "strong";
  if (state === "mute" || state === METRONOME_BEAT_STATES.MUTE) return "mute";
  return "weak";
}

function BeatDot({ active = false, className = "", label, onClick, state = "weak", style, title }) {
  const dotState = getBeatDotState(state);
  const Component = onClick ? "button" : "span";
  const stateLabel = dotState === "strong" ? "1박" : dotState === "mute" ? "무음" : "나머지 박";
  const isTrainingDot = className.split(" ").includes("trainingBeatDot");

  if (isTrainingDot) {
    return (
      <Component
        aria-label={label ?? stateLabel}
        className={`trainingBeatDotPlain ${active ? "active" : ""} ${className}`}
        onClick={onClick}
        style={style}
        title={title ?? stateLabel}
        type={onClick ? "button" : undefined}
      >
        <span className="trainingBeatDotPlain__dot" aria-hidden="true" />
      </Component>
    );
  }

  return (
    <Component
      aria-label={label ?? stateLabel}
      className={`beatDot beatDot--${dotState} ${active ? "active" : ""} ${className}`}
      onClick={onClick}
      style={style}
      title={title ?? stateLabel}
      type={onClick ? "button" : undefined}
    >
      <span className="beatDot__glyph" aria-hidden="true">
        <i className="beatDot__innerMark" />
      </span>
    </Component>
  );
}

function MetronomeVisualLabLine({ activeBeat, beatPattern, isPlaying }) {
  const beatCount = Math.max(1, beatPattern.length);

  return (
    <div className="metronomeVisualLabLine" aria-label="Rhythm Line Mode visual preview">
      <div className="metronomeVisualLabLineTrack">
        {beatPattern.map((beatState, index) => (
          <BeatDot
            active={isPlaying && activeBeat === index}
            className="metronomeVisualLabLineTick"
            key={`visual-line-tick-${index}`}
            label={`Beat ${index + 1} ${METRONOME_BEAT_STATE_LABELS[beatState]}`}
            state={beatState}
            style={{ left: `${beatCount === 1 ? 50 : (index / (beatCount - 1)) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function MetronomeVisualLabCircle({ activeBeat, beatPattern, isPlaying }) {
  const beatCount = Math.max(1, beatPattern.length);
  const orbitRadius = beatCount >= 7 ? 83 : beatCount >= 5 ? 78 : 72;

  return (
    <div className="metronomeVisualLabCircle" aria-label="Circle Mode visual preview" style={{ "--circle-beat-count": beatCount }}>
      <div className="metronomeVisualLabCircleOrbit" style={{ "--circle-orbit-radius": `${orbitRadius}px` }}>
        <span className="metronomeVisualLabCircleCenter">
          <strong>{beatCount}</strong>
          <small>BEATS</small>
        </span>
        {beatPattern.map((beatState, index) => (
          <BeatDot
            active={isPlaying && activeBeat === index}
            className="metronomeVisualLabCircleBeat"
            key={`visual-circle-${index}`}
            label={`Beat ${index + 1} ${METRONOME_BEAT_STATE_LABELS[beatState]}`}
            state={beatState}
            style={{ "--beat-angle": `${(360 / beatCount) * index - 90}deg` }}
          />
        ))}
      </div>
      <p className="metronomeVisualLabCircleHint">Circle Mode · official candidate · editable beat states ready</p>
    </div>
  );
}

function StandaloneMetronomeVisual({
  activeBeat,
  beatPattern,
  isPlaying,
  mode,
  onBeatClick,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  swipeActive = false,
  swipeOffset = 0,
}) {
  const beatCount = Math.max(1, beatPattern.length);
  const selectedMode = normalizeMetronomeDisplayMode(mode);
  const renderBeat = (beatState, index, className = "", style = undefined) => (
    <BeatDot
      active={isPlaying && activeBeat === index}
      className={className}
      key={`standalone-${selectedMode}-${index}`}
      label={`${index + 1}박 ${METRONOME_BEAT_STATE_LABELS[beatState]}, 터치하면 다음 상태로 변경`}
      onClick={() => onBeatClick(index)}
      state={beatState}
      style={style}
      title={`${index + 1}박: ${METRONOME_BEAT_STATE_LABELS[beatState]}`}
    />
  );

  return (
    <div
      aria-label={`${METRONOME_DISPLAY_MODES.find((item) => item.id === selectedMode)?.label ?? "Metronome Mode"} 박자 표시 영역. 좌우 스와이프는 표시 모드만 전환합니다`}
      className={`metronomeBeatMatrix metronomeBeatMatrix--main metronomeBeatMatrix--${selectedMode} ${swipeActive ? "metronomeBeatMatrix--swiping" : ""}`}
      data-metronome-mode-swipe-zone="true"
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="group"
      style={{ "--metronome-mode-swipe-x": `${swipeOffset}px` }}
    >
      {selectedMode === "circle" ? (
        <div className="metronomeModeCircleOrbit" style={{ "--circle-beat-count": beatCount }}>
          <span className="metronomeModeCircleCore" aria-hidden="true" />
          {beatPattern.map((beatState, index) => renderBeat(
            beatState,
            index,
            "metronomeBeatButton metronomeModeCircleBeat",
            { "--beat-angle": `${(360 / beatCount) * index - 90}deg` },
          ))}
        </div>
      ) : (
        beatPattern.map((beatState, index) => renderBeat(beatState, index, "metronomeBeatButton"))
      )}
    </div>
  );
}

function MetronomeVisualLabPickSwing({ activeBeat, beatPattern, isPlaying }) {
  const beatState = beatPattern[activeBeat] ?? METRONOME_BEAT_STATES.ACCENT;
  const swingDirection = activeBeat % 2 === 0 ? -1 : 1;
  const swingSize = beatState === METRONOME_BEAT_STATES.ACCENT ? 28 : beatState === METRONOME_BEAT_STATES.MUTE ? 10 : 18;

  return (
    <div className="metronomeVisualLabPickSwing" aria-label="Pick Swing Mode visual preview">
      <div className="metronomeVisualLabStringSet" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div
        className={`metronomeVisualLabPick metronomeVisualLabPick--${beatState} ${isPlaying ? "active" : ""}`}
        style={{ "--pick-angle": `${swingDirection * swingSize}deg` }}
      >
        <span>R</span>
      </div>
      <div className="metronomeVisualLabPickCaption">
        {beatState === METRONOME_BEAT_STATES.ACCENT ? "Strong Swing" : beatState === METRONOME_BEAT_STATES.MUTE ? "Mute Pass" : "Weak Swing"}
      </div>
    </div>
  );
}

function MetronomeVisualLabPreview({ activeBeat, beatPattern, bpm, isPlaying, mode, timeSignature }) {
  const selectedMode = METRONOME_VISUAL_LAB_MODES.find((item) => item.id === mode) ?? METRONOME_VISUAL_LAB_MODES[0];

  return (
    <article className={`headerPreviewCard metronomeVisualLabPreview metronomeVisualLabPreview--${mode}`}>
      <div className="headerPreviewMeta">
        <span>{selectedMode.title}</span>
        <small>{selectedMode.description}</small>
        <em className="designLabStatus designLabStatus--draft">Experimental</em>
      </div>
      <div className="metronomeVisualLabStage">
        {mode === "line" ? (
          <MetronomeVisualLabLine activeBeat={activeBeat} beatPattern={beatPattern} isPlaying={isPlaying} />
        ) : mode === "circle" ? (
          <MetronomeVisualLabCircle activeBeat={activeBeat} beatPattern={beatPattern} isPlaying={isPlaying} />
        ) : mode === "pick" ? (
          <MetronomeVisualLabPickSwing activeBeat={activeBeat} beatPattern={beatPattern} isPlaying={isPlaying} />
        ) : (
          <MetronomeVisualLabDot activeBeat={activeBeat} beatPattern={beatPattern} isPlaying={isPlaying} />
        )}
      </div>
      <div className="metronomeVisualLabReadout">
        <span>{bpm} BPM</span>
        <span>{timeSignature}</span>
        <span>{isPlaying ? `Beat ${activeBeat + 1}` : "Ready"}</span>
      </div>
    </article>
  );
}

function RiffLoopLogoSvg({ candidate, compact = false }) {
  const index = candidate?.index ?? 1;
  const uid = `riffSymbol${index}`;
  const fretScale = [0, 5.6, 10.9, 16.0, 20.8, 25.4, 29.8];
  const stringXs = [34, 38, 42, 46, 50, 54];
  const configs = [
    { bowl: 0, leg: 0, stem: 0, wave: 0.2, frets: true },
    { bowl: 2, leg: -2, stem: -1, wave: 0.12, frets: false },
    { bowl: -1, leg: 1, stem: 1, wave: 0.08, cap: true },
    { bowl: 0, leg: 2, stem: 0, wave: 0.28, frets: false },
    { bowl: 1, leg: -1, stem: 0, wave: 0.1, pickCut: true },
    { bowl: -2, leg: 0, stem: 1, wave: 0.14, frets: true },
    { bowl: 3, leg: 5, stem: -1, wave: 0.12, longLeg: true },
    { bowl: -3, leg: -3, stem: 0, wave: 0.08, compact: true },
    { bowl: 1, leg: 1, stem: 0, wave: 0.18, studio: true },
    { bowl: 0, leg: 3, stem: 2, wave: 0.1, bridge: true },
    { bowl: -1, leg: 2, stem: -2, wave: 0.06, sparse: true },
    { bowl: 2, leg: -4, stem: 1, wave: 0.12, cut: true },
    { bowl: 0, leg: 0, stem: -1, wave: 0.22, heavyStem: true },
    { bowl: 2, leg: 2, stem: 0, wave: 0.1, markers: true },
    { bowl: -2, leg: 1, stem: 0, wave: 0.16, inlay: true },
    { bowl: 1, leg: -1, stem: 2, wave: 0.14, meter: true },
    { bowl: -1, leg: 0, stem: 0, wave: 0.06, stage: true },
    { bowl: 3, leg: 4, stem: 0, wave: 0.2, current: true },
    { bowl: -2, leg: -2, stem: -1, wave: 0.1, heritage: true },
    { bowl: 1, leg: 3, stem: 0, wave: 0.24, master: true },
  ];
  const config = configs[(index - 1) % configs.length];
  const StringBuiltR = ({ cfg = config }) => {
    const topY = cfg.compact ? 19 : 14;
    const lowerY = cfg.compact ? 75 : 82;
    const bowlRight = 72 + cfg.bowl;
    const bowlLow = 53 + cfg.stem;
    const legEndX = (cfg.longLeg ? 83 : 75) + cfg.leg;
    const legEndY = cfg.longLeg ? 87 : lowerY;
    const width = cfg.heavyStem ? 2.35 : cfg.sparse ? 1.35 : 1.9;

    return (
      <g className="stringBuiltR" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {stringXs.map((x, stringIndex) => {
          const tension = (stringIndex - 2.5) * 0.58;
          const d = [
            `M ${x} ${topY}`,
            `C ${x} ${topY + 8}, ${x + tension} 24, ${x + tension} 31`,
            `C ${x + 12 + cfg.bowl} 20, ${bowlRight} 22, ${bowlRight} ${37 + tension}`,
            `C ${bowlRight} ${49 + tension}, ${x + 19 + cfg.bowl} ${bowlLow}, ${x + 4} ${bowlLow}`,
            `C ${x + 11} ${58 + tension}, ${legEndX - 13} ${72 + tension}, ${legEndX} ${legEndY}`,
          ].join(" ");
          return (
            <path
              d={d}
              key={`string-r-${stringIndex}`}
              opacity={0.74 + stringIndex * 0.035}
              stroke={`url(#${uid}Gold)`}
              strokeWidth={width}
            />
          );
        })}
        {cfg.cut ? (
          <path d="M31 55 H55" stroke="#050607" strokeWidth="5.8" opacity="0.9" />
        ) : null}
        {cfg.pickCut ? (
          <path d="M59 30 C68 38 70 50 63 58 C58 64 48 64 43 58" stroke="#050607" strokeWidth="5" opacity="0.74" />
        ) : null}
        {cfg.cap ? (
          <path d="M31 15 H57" stroke={`url(#${uid}Edge)`} strokeWidth="2.2" opacity="0.65" />
        ) : null}
        {cfg.bridge ? (
          <path d="M26 77 H80" stroke={`url(#${uid}Edge)`} strokeWidth="1.6" opacity="0.5" />
        ) : null}
        {cfg.meter ? (
          <path d="M25 74 C36 66 58 65 75 72" stroke="#d9aa55" strokeWidth="0.9" opacity="0.38" />
        ) : null}
        {cfg.frets ? (
          <g stroke="#f8e8b0" strokeWidth="0.8" opacity="0.3">
            {fretScale.slice(1, 6).map((offset, fretIndex) => (
              <line key={`string-r-fret-${fretIndex}`} x1={32 + offset * 0.42} y1="21" x2={32 + offset * 0.32} y2="69" />
            ))}
          </g>
        ) : null}
        {cfg.markers ? (
          <g fill="#f8e8b0" opacity="0.55">
            <circle cx="42" cy="39" r="1.6" />
            <circle cx="54" cy="50" r="1.6" />
            <circle cx="61" cy="68" r="1.6" />
          </g>
        ) : null}
        <g className="stringBuiltR__wave" opacity={cfg.wave}>
          <path d="M16 53 H22 M25 46 V60 M29 40 V66 M74 53 H80 M70 47 V59 M66 43 V63" stroke="#d9aa55" strokeWidth="1.1" />
        </g>
        <g fill={`url(#${uid}Gold)`} opacity="0.88">
          {stringXs.map((x, stringIndex) => (
            <circle cx={x} cy={topY - 2} key={`string-r-pin-${stringIndex}`} r="1.15" />
          ))}
        </g>
      </g>
    );
  };
  const studio09Configs = [
    { spread: 1, topY: 13, bottomY: 88, bowl: 0, leg: 0, wave: 0.24, frets: 0.16, width: 1, rails: 0.48, pins: true },
    { spread: 1, topY: 13, bottomY: 88, bowl: 1.8, leg: 1.8, wave: 0.22, frets: 0.1, width: 1.12, rails: 0.5, pins: true },
    { spread: 1, topY: 13, bottomY: 88, bowl: -0.6, leg: -0.8, wave: 0.1, frets: 0.08, width: 0.98, rails: 0.44, pins: true },
    { spread: 1.08, topY: 11, bottomY: 89, bowl: 0.4, leg: 0.4, wave: 0.18, frets: 0.12, width: 1, rails: 0.54, pins: true, headPins: true },
    { spread: 1, topY: 13, bottomY: 88, bowl: 0.6, leg: 0.2, wave: 0.16, frets: 0.28, width: 1, rails: 0.48, markers: true },
    { spread: 0.86, topY: 16, bottomY: 84, bowl: -1.4, leg: -1.6, wave: 0.08, frets: 0.04, width: 1.18, rails: 0.38, pins: false },
    { spread: 0.94, topY: 14, bottomY: 87, bowl: 0.2, leg: 0.9, wave: 0.12, frets: 0.06, width: 1.08, rails: 0.62, pins: true },
    { spread: 0.92, topY: 15, bottomY: 86, bowl: -1.2, leg: -1, wave: 0.06, frets: 0, width: 0.82, rails: 0.28, pins: false },
    { spread: 1.02, topY: 13, bottomY: 88, bowl: 0.8, leg: 0.8, wave: 0.2, frets: 0.14, width: 1.06, rails: 0.5, pins: true, glow: true },
    { spread: 1, topY: 13, bottomY: 88, bowl: 0, leg: 0, wave: 0.16, frets: 0.12, width: 1, rails: 0.72, pins: true, strictGrid: true },
    { spread: 0.98, topY: 9, bottomY: 91, bowl: 0.6, leg: 0.9, wave: 0.18, frets: 0.12, width: 0.96, rails: 0.44, pins: true },
    { spread: 0.82, topY: 15, bottomY: 85, bowl: -1.8, leg: -1.2, wave: 0.1, frets: 0.08, width: 1.08, rails: 0.42, pins: true },
    { spread: 1, topY: 13, bottomY: 88, bowl: 0.6, leg: 0.6, wave: 0.28, frets: 0.1, width: 1, rails: 0.48, pins: true },
    { spread: 1.04, topY: 12, bottomY: 89, bowl: 0.2, leg: 0.2, wave: 0.12, frets: 0.16, width: 1.1, rails: 0.5, pins: true, inlay: true },
    { spread: 1, topY: 13, bottomY: 88, bowl: 0.3, leg: 4.4, wave: 0.16, frets: 0.1, width: 1.04, rails: 0.46, pins: true },
    { spread: 1.06, topY: 13, bottomY: 88, bowl: 3, leg: 0, wave: 0.14, frets: 0.08, width: 0.98, rails: 0.44, pins: true },
    { spread: 1, topY: 13, bottomY: 88, bowl: 0, leg: 0, wave: 0.14, frets: 0.12, width: 1, rails: 0.78, pins: true, hardware: true },
    { spread: 0.96, topY: 13, bottomY: 88, bowl: 0.8, leg: 1.2, wave: 0.08, frets: 0.04, width: 1.2, rails: 0.38, pins: false },
    { spread: 1.02, topY: 12, bottomY: 89, bowl: 1.2, leg: 1.2, wave: 0.2, frets: 0.14, width: 1.08, rails: 0.52, pins: true, glow: true },
    { spread: 1, topY: 12, bottomY: 88, bowl: 0.7, leg: 0.7, wave: 0.18, frets: 0.16, width: 1.06, rails: 0.55, pins: true, signature: true },
  ];
  const StudioStringR = ({ cfg = studio09Configs[(index - 1) % studio09Configs.length] }) => {
    const topY = cfg.topY;
    const bottomY = cfg.bottomY;
    const topPins = [33, 38, 43, 48, 53, 58].map((x) => 45.5 + (x - 45.5) * cfg.spread);
    const xAt = (x) => 45.5 + (x - 45.5) * cfg.spread;
    const bowl = cfg.bowl;
    const leg = cfg.leg;
    const strings = [
      `M${xAt(33)} ${topY} L${xAt(33)} ${bottomY}`,
      `M${xAt(38)} ${topY} L${xAt(38)} ${bottomY}`,
      `M${xAt(43)} ${topY} L${xAt(43)} 31 C${xAt(56)} 31 ${70 + bowl} 33 ${75 + bowl} 42 C${82 + bowl} 55 ${67 + bowl * 0.3} 64 ${xAt(45)} 61 L${xAt(45)} ${bottomY}`,
      `M${xAt(48)} ${topY} L${xAt(48)} 31 C${xAt(63)} 31 ${78 + bowl} 36 ${80 + bowl} 48 C${82 + bowl} 61 ${68 + bowl * 0.4} 70 ${xAt(50)} 67 L${xAt(50)} ${bottomY}`,
      `M${xAt(53)} ${topY} C${xAt(53)} 23 ${xAt(54)} 29 ${xAt(60)} 32 C${74 + bowl} 36 ${84 + bowl} 45 ${82 + bowl} 56 C${80 + bowl} 68 ${68 + bowl * 0.4} 75 ${xAt(56)} 72 C${63 + leg * 0.3} 78 ${72 + leg * 0.4} 84 ${80 + leg} ${bottomY}`,
      `M${xAt(58)} ${topY} C${xAt(58)} 24 ${xAt(61)} 30 ${xAt(67)} 34 C${80 + bowl} 42 ${87 + bowl} 53 ${82 + bowl} 64 C${78 + bowl * 0.4} 73 ${67 + bowl * 0.2} 78 ${xAt(58)} 76 C${64 + leg * 0.2} 81 ${72 + leg * 0.4} 85 ${80 + leg} ${bottomY}`,
    ];

    return (
      <g className="stringBuiltR stringBuiltR--studio09" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g opacity={cfg.frets} stroke="#d9aa55" strokeWidth="0.75">
          {fretScale.slice(1, 6).map((offset, fretIndex) => (
            <line key={`studio09-fret-${fretIndex}`} x1={30 + offset * 0.42} y1="20" x2={29 + offset * 0.34} y2={bottomY} />
          ))}
        </g>
        {strings.map((d, stringIndex) => (
          <path
            d={d}
            key={`studio09-string-${stringIndex}`}
            opacity={0.82 + stringIndex * 0.02}
            stroke={`url(#${uid}Gold)`}
            strokeWidth={(stringIndex > 3 ? 2.05 : 1.75) * cfg.width}
          />
        ))}
        <path
          d={`M${xAt(33)} 31 C${49 + bowl * 0.2} 31 ${69 + bowl} 31 ${77 + bowl} 42 C${86 + bowl} 54 ${76 + bowl * 0.4} 68 ${58 + bowl * 0.2} 70 C49 71 42 67 ${xAt(38)} 61`}
          stroke={`url(#${uid}Edge)`}
          strokeWidth={3.9 * cfg.width}
          opacity="0.74"
        />
        <path
          d={`M${xAt(43)} 62 C${55 + leg * 0.2} 70 ${67 + leg * 0.45} 80 ${80 + leg} ${bottomY}`}
          stroke={`url(#${uid}Edge)`}
          strokeWidth={3.8 * cfg.width}
          opacity="0.8"
        />
        <path
          d="M15 53 H21 M25 47 V59 M29 43 V63 M79 53 H85 M89 47 V59 M93 43 V63"
          stroke="#d9aa55"
          strokeWidth="1.05"
          opacity={cfg.wave}
        />
        <path
          d={`M30 31 H${cfg.strictGrid ? 62 : 61} M30 61 H${cfg.strictGrid ? 60 : 58} M28 ${bottomY} H${cfg.strictGrid ? 84 : 82 + leg}`}
          stroke={`url(#${uid}Gold)`}
          strokeWidth={cfg.hardware ? 1.65 : 1.25}
          opacity={cfg.rails}
        />
        {cfg.markers ? (
          <g fill="#f8e8b0" opacity="0.55">
            <circle cx={xAt(43)} cy="42" r="1.35" />
            <circle cx={xAt(48)} cy="54" r="1.35" />
            <circle cx={xAt(53)} cy="66" r="1.35" />
          </g>
        ) : null}
        {cfg.inlay ? <path d="M36 27 C48 23 69 24 78 38" stroke="#f8e8b0" strokeWidth="0.7" opacity="0.55" /> : null}
        {cfg.signature ? <path d="M35 93 C46 96 68 96 81 92" stroke="#d9aa55" strokeWidth="0.7" opacity="0.38" /> : null}
        {cfg.pins !== false ? (
          <g fill={`url(#${uid}Gold)`} opacity="0.9">
            {topPins.map((x) => (
              <circle cx={x} cy={topY - 2} key={`studio09-top-${x}`} r={cfg.headPins ? 1.45 : 1.25} />
            ))}
            {[xAt(33), xAt(38), xAt(45), xAt(50), xAt(58), 80 + leg].map((x, pointIndex) => (
              <circle cx={x} cy={bottomY + 2} key={`studio09-end-${pointIndex}`} r="1" opacity={pointIndex > 3 ? 0.68 : 0.76} />
            ))}
          </g>
        ) : null}
      </g>
    );
  };
  const renderSymbol = () => {
    return <StudioStringR />;
  };

  return (
    <svg
      className={`riffLoopLogoSvg ${compact ? "riffLoopLogoSvg--compact" : ""}`}
      role="img"
      aria-label={`${candidate?.label ?? "Logo"} ${candidate?.title ?? "R Brand Symbol"}`}
      viewBox="0 0 100 100"
    >
      <defs>
        <radialGradient id={`${uid}Plate`} cx="32%" cy="24%" r="82%">
          <stop offset="0" stopColor="#171817" />
          <stop offset="0.46" stopColor="#070808" />
          <stop offset="1" stopColor="#010203" />
        </radialGradient>
        <linearGradient id={`${uid}Gold`} x1="18" y1="22" x2="86" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5f3914" />
          <stop offset="0.16" stopColor="#c49242" />
          <stop offset="0.31" stopColor="#fff2c6" />
          <stop offset="0.43" stopColor="#d9aa55" />
          <stop offset="0.58" stopColor="#8a541f" />
          <stop offset="0.73" stopColor="#e7bf72" />
          <stop offset="1" stopColor="#6f4318" />
        </linearGradient>
        <linearGradient id={`${uid}Edge`} x1="20" y1="20" x2="82" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff4cc" />
          <stop offset="0.4" stopColor="#d2a14d" />
          <stop offset="1" stopColor="#3b210b" />
        </linearGradient>
        <pattern id={`${uid}BrushPattern`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="#ffffff" strokeWidth="0.32" opacity="0.08" />
          <line x1="3.5" y1="0" x2="3.5" y2="7" stroke="#d9aa55" strokeWidth="0.18" opacity="0.05" />
        </pattern>
        <filter id={`${uid}SoftShadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.1" floodColor="#000000" floodOpacity="0.72" />
          <feDropShadow dx="-1.1" dy="-1.4" stdDeviation="1.2" floodColor="#f3d18a" floodOpacity="0.22" />
          <feDropShadow dx="1.2" dy="1.2" stdDeviation="1.8" floodColor="#7a4d1f" floodOpacity="0.26" />
        </filter>
      </defs>
      <rect width="100" height="100" rx="19" fill={`url(#${uid}Plate)`} />
      <rect width="100" height="100" rx="19" fill={`url(#${uid}BrushPattern)`} opacity="0.44" />
      <g opacity={0.12} stroke="#ffffff" strokeWidth="0.32">
        {Array.from({ length: 14 }, (_, lineIndex) => (
          <line key={`brush-${lineIndex}`} x1={8 + lineIndex * 7} y1="0" x2={lineIndex * 7 - 8} y2="100" opacity="0.12" />
        ))}
      </g>
      <ellipse cx="34" cy="24" rx="42" ry="34" fill="#d9aa55" opacity="0.045" />
      <ellipse cx="76" cy="78" rx="44" ry="36" fill="#000000" opacity="0.42" />
      <g filter={`url(#${uid}SoftShadow)`}>{renderSymbol()}</g>
    </svg>
  );
}

function SvgLogoHeaderPreview({ candidate }) {
  return (
    <div className="svgLogoHeaderPlate" aria-label="V11 header plate SVG logo preview">
      <span className="svgLogoHeaderPlate__screw svgLogoHeaderPlate__screw--left" aria-hidden="true" />
      <span className="svgLogoHeaderPlate__screw svgLogoHeaderPlate__screw--right" aria-hidden="true" />
      <div className="svgLogoHeaderPlate__mark">
        <RiffLoopLogoSvg candidate={candidate} compact />
      </div>
      <div className="svgLogoHeaderPlate__word">
        <strong>RIFFLAB</strong>
        <span>Repeat. Refine. Master.</span>
      </div>
    </div>
  );
}

function normalizeSvgLogoLabState(value = {}) {
  const ids = new Set(SVG_LOGO_LAB_CANDIDATES.map((candidate) => candidate.id));
  const activeLogo = ids.has(value.activeLogo) ? value.activeLogo : SVG_LOGO_LAB_CANDIDATES[0].id;
  const deletedLogos = Array.isArray(value.deletedLogos)
    ? value.deletedLogos.filter((id, index, list) => ids.has(id) && id !== activeLogo && list.indexOf(id) === index)
    : [];
  return { activeLogo, deletedLogos };
}

function getStoredSvgLogoLabState() {
  if (typeof window === "undefined") return normalizeSvgLogoLabState();
  try {
    return normalizeSvgLogoLabState(JSON.parse(window.localStorage.getItem(SVG_LOGO_LAB_STORAGE_KEY) ?? "{}"));
  } catch {
    return normalizeSvgLogoLabState();
  }
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

function getStoredGuitarLabVariantId() {
  if (typeof window === "undefined") return DEFAULT_GUITAR_LAB_VARIANT_ID;
  const stored =
    window.localStorage.getItem(SHOOTER_GUITAR_STORAGE_KEY)
    || window.localStorage.getItem(SHOOTER_PLAYER_STORAGE_KEY)
    || window.localStorage.getItem(GUITAR_LAB_STORAGE_KEY);
  return GUITAR_LAB_VARIANT_IDS.has(stored) ? stored : DEFAULT_GUITAR_LAB_VARIANT_ID;
}

function normalizeShooterPlayerSlots(value = {}) {
  return SHOOTER_PLAYER_SLOT_KEYS.reduce((slots, key) => {
    const storedId = value?.[key];
    const fallbackId = DEFAULT_SHOOTER_PLAYER_SLOTS[key];
    slots[key] = GUITAR_LAB_VARIANT_IDS.has(storedId) ? storedId : fallbackId;
    return slots;
  }, {});
}

function getStoredShooterPlayerSlots() {
  if (typeof window === "undefined") return normalizeShooterPlayerSlots(DEFAULT_SHOOTER_PLAYER_SLOTS);

  try {
    const parsedSlots = JSON.parse(window.localStorage.getItem(SHOOTER_PLAYER_SLOTS_STORAGE_KEY) ?? "null");
    if (parsedSlots && typeof parsedSlots === "object" && !Array.isArray(parsedSlots)) {
      return normalizeShooterPlayerSlots(parsedSlots);
    }

    const legacyAvailability = JSON.parse(window.localStorage.getItem(GUITAR_LAB_AVAILABILITY_STORAGE_KEY) ?? "null");
    if (Array.isArray(legacyAvailability)) {
      const validIds = legacyAvailability.filter((id) => GUITAR_LAB_VARIANT_IDS.has(id));
      if (validIds.length > 0) {
        return normalizeShooterPlayerSlots({
          slot1: validIds[0],
          slot2: validIds[1],
          slot3: validIds[2],
        });
      }
    }

    return normalizeShooterPlayerSlots(DEFAULT_SHOOTER_PLAYER_SLOTS);
  } catch {
    return normalizeShooterPlayerSlots(DEFAULT_SHOOTER_PLAYER_SLOTS);
  }
}

function normalizeGuitarLabVariantIds(value = []) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => GUITAR_LAB_VARIANT_IDS.has(id)))];
}

function getStoredGuitarLabDeletedIds() {
  if (typeof window === "undefined") return [];

  try {
    return normalizeGuitarLabVariantIds(JSON.parse(window.localStorage.getItem(GUITAR_LAB_DELETED_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function getStoredGuitarLabPurgedIds() {
  if (typeof window === "undefined") return [];

  try {
    return normalizeGuitarLabVariantIds(JSON.parse(window.localStorage.getItem(GUITAR_LAB_PURGED_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
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

  if (variantNumber >= 3 && variantNumber <= 100) {
    const conceptIndex = variantNumber - 3;
    const mode = conceptIndex % 14;
    const paletteIndex = Math.floor(conceptIndex / 14) % 7;
    const palettes = [
      { bg: "#050607", fg: "#fff4d4", accent: "#d8a64e", sub: "#7a5124" },
      { bg: "#f7f1e6", fg: "#090807", accent: "#111827", sub: "#b8873d" },
      { bg: "#061329", fg: "#ffffff", accent: "#78aefb", sub: "#d6a64d" },
      { bg: "#080504", fg: "#f1ca7a", accent: "#ffffff", sub: "#8d5f2c" },
      { bg: "#0a0d0e", fg: "#f5efe3", accent: "#e55f5f", sub: "#d8a64e" },
      { bg: "#f9f8f4", fg: "#0b1117", accent: "#c18a35", sub: "#25324b" },
      { bg: "#030405", fg: "#ffffff", accent: "#f1ca7a", sub: "#6f7b86" },
    ];
    const p = palettes[paletteIndex] ?? palettes[0];
    const goldId = `${uniqueId}-philosophy-gold`;
    const glowId = `${uniqueId}-philosophy-glow`;

    return (
      <svg className="appIconSvgPreview appIconSvgPreview--philosophy" viewBox="0 0 120 120" role="img" aria-label={`${getAppIconVariantLabel(variantId)} SVG`}>
        <defs>
          <linearGradient id={goldId} x1="20" x2="100" y1="12" y2="108" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={p.fg} />
            <stop offset="0.52" stopColor={p.accent} />
            <stop offset="1" stopColor={p.sub} />
          </linearGradient>
          <radialGradient id={glowId} cx="48%" cy="28%" r="70%">
            <stop offset="0" stopColor={p.accent} stopOpacity="0.34" />
            <stop offset="1" stopColor={p.bg} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="120" height="120" rx={paletteIndex % 3 === 1 ? 19 : 27} fill={p.bg} />
        <rect width="120" height="120" rx={paletteIndex % 3 === 1 ? 19 : 27} fill={`url(#${glowId})`} />
        {mode === 0 ? (
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M35 40 C45 24 72 25 84 41 C96 58 84 83 61 84 C47 85 36 78 31 67" stroke={`url(#${goldId})`} strokeWidth="10" />
            <path d="M80 72 L84 92 L66 83" stroke={p.accent} strokeWidth="9" />
            <circle cx="60" cy="60" r="6" fill={p.fg} />
          </g>
        ) : null}
        {mode === 1 ? (
          <g>
            <path d="M24 78 H94" stroke={p.sub} strokeWidth="6" strokeLinecap="round" opacity="0.52" />
            {[34, 48, 62, 76].map((x, index) => <rect key={x} x={x} y={74 - index * 9} width="12" height={16 + index * 9} rx="5" fill={index === 3 ? p.accent : p.fg} opacity={index === 3 ? 1 : 0.82} />)}
            <path d="M84 31 L96 43 L84 55" fill="none" stroke={p.accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ) : null}
        {mode === 2 ? (
          <g>
            <circle cx="60" cy="60" r="36" fill="none" stroke={p.fg} strokeWidth="7" opacity="0.88" />
            <circle cx="60" cy="60" r="17" fill="none" stroke={p.accent} strokeWidth="6" />
            <circle cx="60" cy="60" r="5" fill={p.fg} />
            <path d="M60 17 V35 M60 85 V103 M17 60 H35 M85 60 H103" stroke={p.sub} strokeWidth="4" strokeLinecap="round" />
          </g>
        ) : null}
        {mode === 3 ? (
          <path d="M60 16 C88 20 102 41 95 66 C88 88 72 104 60 109 C48 104 32 88 25 66 C18 41 32 20 60 16 Z M43 72 L77 35 H63 L36 72 Z" fill={`url(#${goldId})`} fillRule="evenodd" />
        ) : null}
        {mode === 4 ? (
          <g fill="none" strokeLinecap="round">
            {[30, 45, 60, 75, 90].map((x) => <line key={x} x1={x} x2={x} y1="20" y2="100" stroke={p.sub} strokeWidth="3" opacity="0.58" />)}
            <path d="M30 82 C42 45 57 77 69 45 C80 18 91 58 96 34" stroke={`url(#${goldId})`} strokeWidth="8" />
            <circle cx="69" cy="45" r="8" fill={p.accent} />
          </g>
        ) : null}
        {mode === 5 ? (
          <g>
            {[26, 36, 48, 60, 72, 84, 94].map((x, index) => <rect key={x} x={x} y={58 - [8, 18, 30, 42, 30, 18, 8][index] / 2} width="6" height={[8, 18, 30, 42, 30, 18, 8][index]} rx="3" fill={index === 3 ? p.accent : p.fg} opacity={index === 3 ? 1 : 0.82} />)}
            <text x="60" y="96" textAnchor="middle" fill={p.fg} fontFamily="Arial Black, Arial, sans-serif" fontSize="8" fontWeight="900" letterSpacing="2">RIFF</text>
          </g>
        ) : null}
        {mode === 6 ? (
          <g fill="none" strokeLinecap="round">
            <path d="M30 33 H86" stroke={p.fg} strokeWidth="8" />
            <path d="M30 60 H76" stroke={p.accent} strokeWidth="8" />
            <path d="M30 87 H95" stroke={p.fg} strokeWidth="8" />
            <path d="M88 24 L100 33 L88 42 M78 51 L90 60 L78 69 M97 78 L109 87 L97 96" stroke={p.sub} strokeWidth="5" strokeLinejoin="round" />
          </g>
        ) : null}
        {mode === 7 ? (
          <g>
            <path d="M28 75 C40 31 76 26 91 45 C104 63 82 80 59 66 L82 94" fill="none" stroke={`url(#${goldId})`} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M42 91 H96" stroke={p.accent} strokeWidth="5" strokeLinecap="round" />
          </g>
        ) : null}
        {mode === 8 ? (
          <g>
            <path d="M27 73 L47 46 L62 62 L82 29 L98 73" fill="none" stroke={`url(#${goldId})`} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M25 88 H99" stroke={p.sub} strokeWidth="5" strokeLinecap="round" opacity="0.64" />
            <circle cx="82" cy="29" r="6" fill={p.accent} />
          </g>
        ) : null}
        {mode === 9 ? (
          <g>
            <path d="M31 42 C41 27 67 26 81 40 C95 54 91 79 73 88" fill="none" stroke={p.fg} strokeWidth="9" strokeLinecap="round" />
            <path d="M81 76 L75 94 L62 79" fill={p.accent} />
            <path d="M38 59 H83" stroke={p.sub} strokeWidth="5" strokeLinecap="round" opacity="0.68" />
          </g>
        ) : null}
        {mode === 10 ? (
          <g>
            <circle cx="60" cy="60" r="40" fill="none" stroke={p.sub} strokeWidth="4" opacity="0.7" />
            <circle cx="60" cy="60" r="25" fill="none" stroke={p.fg} strokeWidth="7" />
            <path d="M60 28 L69 52 L95 60 L69 68 L60 92 L51 68 L25 60 L51 52 Z" fill={p.accent} />
          </g>
        ) : null}
        {mode === 11 ? (
          <g>
            <path d="M38 88 V29 H74 C86 29 94 37 94 48 C94 59 86 66 73 66 H55 V88 Z" fill="none" stroke={`url(#${goldId})`} strokeWidth="9" strokeLinejoin="round" />
            <path d="M53 70 L83 94" stroke={p.accent} strokeWidth="7" strokeLinecap="round" />
          </g>
        ) : null}
        {mode === 12 ? (
          <g>
            {[34, 48, 62, 76, 90].map((x, index) => <circle key={x} cx={x} cy={index % 2 ? 48 : 72} r={index === 2 ? 10 : 7} fill={index === 2 ? p.accent : p.fg} />)}
            <path d="M34 72 L48 48 L62 72 L76 48 L90 72" fill="none" stroke={p.sub} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
          </g>
        ) : null}
        {mode === 13 ? (
          <g>
            <rect x="27" y="25" width="66" height="70" rx="18" fill="none" stroke={`url(#${goldId})`} strokeWidth="5" />
            <path d="M42 67 L55 80 L82 40" fill="none" stroke={p.accent} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="84" cy="29" r="5" fill={p.fg} />
          </g>
        ) : null}
      </svg>
    );
  }

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
  const isSignature = false;
  const isSvg = variantNumber >= 3;
  const isR = false;
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

function GuitarAssetSvg({ variant, className = "", compact = false }) {
  if (variant.assetSrc) {
    return (
      <img
        alt={`${variant.title} guitar asset`}
        className={`guitarAssetSvg guitarAssetImage guitarAssetImage--${variant.id} ${className}`}
        draggable="false"
        src={variant.assetSrc}
      />
    );
  }

  const isElectric = variant.pack === "Electric";
  const isClassical = variant.pack === "Classical";
  const uniqueId = `guitar-${variant.id}`;
  const soundHoleY = isClassical ? 160 : 158;
  const soundHoleRadius = isClassical ? 16 : 14;
  const fretboardTop = 62;
  const fretboardBottom = isElectric ? 166 : soundHoleY - soundHoleRadius + 2;
  const fretboardLeft = 62;
  const fretboardRight = 88;
  const fretboardWidth = fretboardRight - fretboardLeft;
  const saddleY = isElectric ? 206 : 196;
  const bridgeY = isElectric ? saddleY - 7 : saddleY - 4;
  const nutY = 58;
  const soundHole = isElectric ? null : (
    <g>
      <circle cx="75" cy={soundHoleY} r={soundHoleRadius + 3.2} fill="none" stroke="rgba(241,202,122,0.34)" strokeWidth="1.2" />
      <circle cx="75" cy={soundHoleY} r={soundHoleRadius + 5.35} fill="none" stroke="rgba(246, 231, 189, 0.5)" strokeWidth="1.05" strokeDasharray="1.15 1.65" />
      <circle cx="75" cy={soundHoleY} r={soundHoleRadius + 4.05} fill="none" stroke="rgba(255, 250, 222, 0.56)" strokeWidth="0.78" strokeDasharray="0.85 1.75" />
      <circle cx="75" cy={soundHoleY} r={soundHoleRadius} fill="#080807" stroke="#d9aa55" strokeWidth="3" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const pearlX = 75 + Math.cos(rad) * (soundHoleRadius + 4.72);
        const pearlY = soundHoleY + Math.sin(rad) * (soundHoleRadius + 4.72);
        return (
          <circle
            cx={pearlX}
            cy={pearlY}
            fill="#fff2c8"
            key={`pearl-${angle}`}
            opacity="0.78"
            r="0.92"
          />
        );
      })}
      <circle cx="75" cy={soundHoleY} r={soundHoleRadius - 4.5} fill="none" stroke="rgba(255,238,202,0.28)" strokeWidth="1" />
    </g>
  );
  const pickups = isElectric ? (
    <>
      <rect x="58" y="154" width="34" height="9" rx="2" fill="#ece3d0" stroke="#111" strokeWidth="1.5" />
      <rect x="58" y="173" width="34" height="9" rx="2" fill="#ece3d0" stroke="#111" strokeWidth="1.5" />
    </>
  ) : null;
  const hasAcousticPickguard = !isClassical && !isElectric;
  const pickguard = isElectric ? (
    <path d="M91 166 C103 174 104 191 94 202 C90 188 84 178 75 171 C82 171 87 169 91 166 Z" fill="#0b0b0b" opacity="0.9" />
  ) : hasAcousticPickguard ? (
    <path d="M86 161 C99 158 106 167 104 184 C97 177 90 171 79 166 C83 165 85 163 86 161 Z" fill="rgba(18, 13, 8, 0.62)" opacity="0.92" />
  ) : null;
  const birdInlay = !isElectric && !isClassical ? (
    <g className="guitarAssetBirdInlay" opacity="0.82">
      <path d="M82 201 C88 199 94 199 101 202" fill="none" stroke={variant.accentColor} strokeWidth="0.8" strokeLinecap="round" opacity="0.58" />
      {[86, 93, 100].map((birdX, index) => (
        <path
          d={`M ${birdX - 1.8} ${201 + index * 1.2} C ${birdX - 0.4} ${199 + index * 1.2}, ${birdX + 1.2} ${199.6 + index * 1.2}, ${birdX + 2.4} ${201 + index * 1.2} C ${birdX + 0.6} ${200.4 + index * 1.2}, ${birdX - 0.6} ${200.4 + index * 1.2}, ${birdX - 1.8} ${201 + index * 1.2} Z`}
          fill="#10100e"
          key={birdX}
          stroke={variant.accentColor}
          strokeWidth="0.55"
        />
      ))}
    </g>
  ) : null;
  const bodyPathMap = {
    round: "M40 154 C27 132 50 116 67 128 C70 130 72 131 75 131 C78 131 80 130 83 128 C100 116 123 132 110 154 C132 165 128 223 95 239 C84 245 66 245 55 239 C22 223 18 165 40 154 Z",
    waist: "M42 154 C30 134 51 119 68 130 C71 132 73 133 75 133 C77 133 79 132 82 130 C99 119 120 134 108 154 C127 165 123 219 94 235 C83 241 67 241 56 235 C27 219 23 165 42 154 Z",
    compact: "M49 158 C39 140 56 128 69 136 C72 138 73 139 75 139 C77 139 78 138 81 136 C94 128 111 140 101 158 C116 169 113 210 90 224 C82 229 68 229 60 224 C37 210 34 169 49 158 Z",
    jumbo: "M36 153 C22 126 49 110 67 126 C70 128 72 129 75 129 C78 129 80 128 83 126 C101 110 128 126 114 153 C141 164 137 229 96 244 C84 250 66 250 54 244 C13 229 9 164 36 153 Z",
    mini: "M52 160 C44 145 57 135 69 142 C72 144 73 145 75 145 C77 145 78 144 81 142 C93 135 106 145 98 160 C111 171 108 204 89 217 C81 222 69 222 61 217 C42 204 39 171 52 160 Z",
    classical: "M42 154 C29 133 51 118 68 130 C71 132 73 133 75 133 C77 133 79 132 82 130 C99 118 121 133 108 154 C129 165 125 219 94 235 C83 241 67 241 56 235 C25 219 21 165 42 154 Z",
    strat: "M44 158 C39 137 56 125 70 134 L58 119 C76 121 83 110 99 126 C94 140 107 146 119 153 C106 164 113 187 119 204 C99 206 94 225 76 231 C62 220 49 229 31 217 C43 199 37 177 44 158 Z",
    tele: "M45 151 C43 130 59 121 74 132 C87 122 109 132 111 151 L112 220 C91 233 59 233 38 220 Z",
    lp: "M42 153 C29 132 51 116 69 129 C83 115 108 130 108 153 C132 164 124 223 93 236 C82 243 68 243 57 236 C26 223 18 164 42 153 Z",
    super: "M42 158 C38 137 55 125 70 134 L58 117 C77 121 83 108 101 125 C94 142 108 146 122 153 C107 166 120 186 127 206 C102 204 96 225 77 231 C60 220 47 232 29 220 C43 199 35 176 42 158 Z",
    metal: "M38 151 L58 122 L72 139 L96 116 L93 147 L124 162 L98 178 L114 219 L78 204 L45 230 L54 190 L24 174 Z",
    "cute-dread": "M41 154 C29 133 50 118 68 129 C83 117 109 131 108 154 C130 164 126 218 94 235 C84 240 66 240 56 235 C24 218 20 164 41 154 Z",
    "stage-dread": "M39 153 C25 128 50 112 70 127 C85 112 115 128 111 156 C136 165 132 225 95 241 C84 246 66 246 55 241 C18 225 14 165 39 153 Z",
    "buddy-dread": "M43 154 C32 135 51 120 68 131 C82 121 106 133 106 154 C125 165 122 214 93 231 C83 237 67 237 57 231 C28 214 24 165 43 154 Z",
    "guard-dread": "M40 154 C27 131 50 115 69 128 C84 115 111 130 109 155 C134 164 128 222 94 238 C83 243 67 243 56 238 C22 222 16 164 40 154 Z",
    "ace-mini": "M50 159 C41 142 56 130 70 138 C83 130 100 142 100 160 C115 170 112 207 90 220 C82 225 68 225 60 220 C38 207 35 170 50 159 Z",
    auditorium: "M43 155 C31 134 52 118 70 130 C84 118 108 133 107 155 C126 165 121 218 92 232 C82 238 68 238 58 232 C29 218 24 165 43 155 Z",
    "grand-auditorium": "M39 154 C27 129 51 113 70 128 C86 113 116 130 111 157 C134 167 130 225 95 239 C84 245 66 245 55 239 C20 225 16 167 39 154 Z",
    "soft-cutaway": "M41 154 C29 131 51 116 69 128 C84 116 109 132 108 154 C128 162 126 219 93 236 C82 242 67 242 56 236 C23 219 18 164 41 154 M90 139 C100 140 106 146 108 154 C99 151 91 150 86 154 C83 149 84 143 90 139 Z",
    "modern-cutaway": "M40 153 C27 130 50 116 69 127 C83 115 111 129 109 154 C132 163 128 221 94 238 C83 244 67 244 56 238 C22 221 17 164 40 153 M88 135 C104 133 114 144 109 157 C99 151 88 151 82 159 C79 150 81 141 88 135 Z",
    "slope-shoulder": "M39 153 C32 135 54 119 70 128 C88 117 111 130 109 154 C130 165 127 220 95 236 C83 242 67 242 55 236 C23 220 18 165 39 153 Z",
    parlor: "M51 160 C42 143 57 130 70 139 C83 130 99 143 99 161 C112 171 110 207 90 220 C82 225 68 225 60 220 C40 207 38 171 51 160 Z",
    "premium-dread": "M39 153 C25 128 50 112 70 127 C86 112 116 129 111 156 C136 164 132 226 96 241 C84 247 66 247 54 241 C18 226 14 164 39 153 Z",
    "vintage-amber": "M42 154 C31 132 51 116 69 129 C84 116 110 131 108 154 C131 164 126 220 94 237 C83 243 67 243 56 237 C24 220 18 164 42 154 Z",
    "classical-premium": "M44 154 C31 133 52 117 69 130 C84 117 107 132 106 154 C127 164 123 218 93 233 C83 239 67 239 57 233 C27 218 22 164 44 154 Z",
    flamenco: "M45 155 C34 137 53 122 69 133 C83 122 105 135 105 155 C124 166 120 215 92 229 C82 235 68 235 58 229 C30 215 26 166 45 155 Z",
    "concert-classical": "M43 154 C30 132 52 116 70 129 C85 116 109 132 108 154 C130 164 125 220 94 235 C83 241 67 241 56 235 C25 220 20 164 43 154 Z",
    offset: "M43 158 C37 137 58 124 72 135 C89 122 113 135 111 157 C126 165 123 215 97 231 C84 238 68 234 58 226 C40 226 28 213 31 197 C43 185 35 173 43 158 Z",
    hollow: "M42 153 C29 132 51 116 69 129 C83 115 108 130 108 153 C132 164 124 223 93 236 C82 243 68 243 57 236 C26 223 18 164 42 153 Z",
    "tele-deluxe": "M44 151 C42 130 58 120 74 132 C88 122 111 132 112 152 L113 220 C91 235 58 235 37 220 L37 163 C39 158 41 154 44 151 Z",
    "dreadnought-refined": "M39 153 C25 128 50 112 68 127 C71 129 73 130 75 130 C77 130 79 129 82 127 C100 112 125 128 111 153 C135 164 132 226 96 241 C84 247 66 247 54 241 C18 226 15 164 39 153 Z",
    "om-refined": "M43 155 C32 136 52 121 68 132 C71 134 73 135 75 135 C77 135 79 134 82 132 C98 121 118 136 107 155 C126 166 121 217 93 232 C83 238 67 238 57 232 C29 217 24 166 43 155 Z",
    "grand-concert": "M46 156 C35 139 54 124 69 134 C72 136 73 137 75 137 C77 137 78 136 81 134 C96 124 115 139 104 156 C122 167 118 214 92 229 C82 235 68 235 58 229 C32 214 28 167 46 156 Z",
    "jumbo-balanced": "M35 153 C20 126 49 109 67 126 C70 128 72 129 75 129 C78 129 80 128 83 126 C101 109 130 126 115 153 C142 164 138 230 97 245 C84 251 66 251 53 245 C12 230 8 164 35 153 Z",
    "venetian-cutaway": "M40 154 C28 132 51 116 68 128 C71 130 73 131 75 131 C78 131 80 130 83 128 C96 119 115 127 111 145 C125 148 130 160 116 169 C129 187 122 224 95 238 C84 244 66 244 55 238 C22 224 18 165 40 154 Z",
    "modern-venetian": "M40 153 C27 130 50 116 68 127 C71 129 73 130 75 130 C78 130 80 129 83 127 C99 116 121 129 111 151 C127 151 133 163 117 174 C130 191 123 224 95 239 C84 245 66 245 55 239 C21 224 17 164 40 153 Z",
    "deep-waist": "M43 154 C29 131 52 116 68 130 C71 133 73 135 75 135 C77 135 79 133 82 130 C98 116 121 131 107 154 C130 165 124 220 94 237 C83 243 67 243 56 237 C26 220 20 165 43 154 Z",
    "travel-plus": "M51 159 C41 142 57 131 69 139 C72 141 73 142 75 142 C77 142 78 141 81 139 C93 131 109 142 99 159 C114 170 111 207 90 221 C82 226 68 226 60 221 C39 207 36 170 51 159 Z",
    "twelve-fret": "M42 151 C29 130 52 115 68 128 C71 130 73 131 75 131 C77 131 79 130 82 128 C98 115 121 130 108 151 C130 162 125 219 94 235 C83 241 67 241 56 235 C25 219 20 162 42 151 Z",
    archtop: "M39 154 C27 130 50 113 68 127 C71 129 73 130 75 130 C77 130 79 129 82 127 C100 113 123 130 111 154 C135 166 128 227 96 242 C84 248 66 248 54 242 C22 227 15 166 39 154 Z",
    "all-solid": "M40 154 C27 132 50 116 68 128 C71 130 73 131 75 131 C77 131 79 130 82 128 C100 116 123 132 110 154 C132 165 127 223 95 239 C84 245 66 245 55 239 C23 223 18 165 40 154 Z",
    "concert-cutaway": "M45 156 C34 138 54 124 69 134 C72 136 73 137 75 137 C77 137 78 136 81 134 C94 125 113 134 106 151 C119 153 124 163 111 171 C121 188 116 215 92 229 C82 235 68 235 58 229 C34 215 29 167 45 156 Z",
    "slope-modern": "M40 152 C31 136 54 120 69 128 C72 130 73 131 75 131 C77 131 78 130 81 128 C96 120 119 136 110 152 C131 165 127 221 96 237 C84 243 66 243 54 237 C23 221 19 165 40 152 Z",
    "thin-body": "M43 156 C31 135 52 120 68 131 C71 133 73 134 75 134 C77 134 79 133 82 131 C98 120 119 135 107 156 C128 167 123 216 93 231 C83 237 67 237 57 231 C27 216 22 167 43 156 Z",
    baritone: "M39 156 C27 132 50 116 68 129 C71 131 73 132 75 132 C77 132 79 131 82 129 C100 116 123 132 111 156 C133 168 128 224 95 240 C84 246 66 246 55 240 C22 224 17 168 39 156 Z",
    "rosewood-grand": "M37 153 C24 127 49 111 68 127 C71 129 73 130 75 130 C77 130 79 129 82 127 C101 111 126 127 113 153 C138 165 134 228 97 243 C84 249 66 249 53 243 C16 228 12 165 37 153 Z",
    "maple-stage": "M41 154 C28 132 51 116 68 128 C71 130 73 131 75 131 C77 131 79 130 82 128 C99 116 122 132 109 154 C131 165 127 222 95 238 C84 244 66 244 55 238 C23 222 19 165 41 154 Z",
    "cedar-om": "M43 155 C32 136 52 121 68 132 C71 134 73 135 75 135 C77 135 79 134 82 132 C98 121 118 136 107 155 C126 166 121 217 93 232 C83 238 67 238 57 232 C29 217 24 166 43 155 Z",
    "black-bird": "M40 154 C27 132 50 116 68 128 C71 130 73 131 75 131 C77 131 79 130 82 128 C100 116 123 132 110 154 C132 165 127 223 95 239 C84 245 66 245 55 239 C23 223 18 165 40 154 Z",
    "sunburst-cutaway": "M40 154 C28 132 51 116 68 128 C71 130 73 131 75 131 C78 131 80 130 83 128 C96 119 115 127 111 145 C125 148 130 160 116 169 C129 187 122 224 95 238 C84 244 66 244 55 238 C22 224 18 165 40 154 Z",
    "orchestra-luxe": "M45 155 C34 137 54 121 69 132 C72 134 73 135 75 135 C77 135 78 134 81 132 C96 121 116 137 105 155 C123 166 119 216 92 231 C82 237 68 237 58 231 C31 216 27 166 45 155 Z",
    "heritage-dread": "M38 153 C25 127 50 111 68 127 C71 129 73 130 75 130 C77 130 79 129 82 127 C100 111 125 127 112 153 C136 164 132 225 96 241 C84 247 66 247 54 241 C18 225 14 164 38 153 Z",
    "studio-cut": "M42 154 C30 133 52 118 69 129 C72 131 73 132 75 132 C78 132 80 131 83 129 C97 119 115 128 109 146 C122 149 127 160 114 168 C125 185 120 217 93 234 C83 240 67 240 57 234 C27 217 22 165 42 154 Z",
    "boutique-cedar": "M44 155 C31 132 53 116 68 131 C71 134 73 136 75 136 C77 136 79 134 82 131 C97 116 120 132 106 155 C130 166 124 221 94 238 C83 244 67 244 56 238 C26 221 20 166 44 155 Z",
    "wide-stage": "M37 153 C23 126 49 110 68 126 C71 128 73 129 75 129 C77 129 79 128 82 126 C101 110 127 126 113 153 C139 164 136 229 97 244 C84 250 66 250 53 244 C14 229 11 164 37 153 Z",
  };
  const makeAcousticBodyPath = ({
    upper = 31,
    waist = 44,
    lower = 60,
    top = 128,
    bottom = 239,
    cutaway = 0,
    slope = 0,
  } = {}) => {
    const centerX = 75;
    const leftUpperX = centerX - upper;
    const rightUpperX = centerX + upper;
    const leftWaistX = centerX - waist;
    const rightWaistX = centerX + waist;
    const lowerWidth = Math.min(lower, 58);
    const leftLowerX = centerX - lowerWidth;
    const rightLowerX = centerX + lowerWidth;
    const leftBottomX = centerX - Math.max(12, Math.min(18, lowerWidth * 0.29));
    const rightBottomX = centerX + Math.max(12, Math.min(18, lowerWidth * 0.29));
    const upperY = top + slope;
    const waistY = 154;
    const lowerY = 205;
    const bottomY = bottom;
    const bottomCenterY = bottomY + 8;

    if (cutaway > 0) {
      const shoulderX = Math.max(centerX + 20, rightUpperX - cutaway);
      const cutawayX = centerX + 31 + (cutaway * 0.25);
      return [
        `M ${leftWaistX} ${waistY}`,
        `C ${leftWaistX - 5} ${140 + slope}, ${leftUpperX + 4} ${top - 16 + slope}, ${centerX - 7} ${top - 2 + slope}`,
        `C ${centerX - 3} ${top + slope}, ${centerX + 3} ${top + slope}, ${centerX + 7} ${top - 2 + slope}`,
        `C ${shoulderX} ${top - 12 + slope}, ${rightUpperX + 5} ${top + 8 + slope}, ${cutawayX} ${top + 21 + slope}`,
        `C ${centerX + 31} ${top + 27 + slope}, ${centerX + 31} ${top + 42}, ${rightWaistX} ${waistY + 12}`,
        `C ${rightLowerX + 1} ${181}, ${rightLowerX - 3} ${211}, ${centerX + 33} ${bottomY - 2}`,
        `C ${centerX + 25} ${bottomY + 7}, ${centerX + 14} ${bottomCenterY}, ${centerX} ${bottomCenterY}`,
        `C ${centerX - 14} ${bottomCenterY}, ${centerX - 25} ${bottomY + 7}, ${centerX - 33} ${bottomY - 2}`,
        `C ${leftLowerX + 3} ${211}, ${leftLowerX - 1} ${181}, ${leftWaistX} ${waistY}`,
        "Z",
      ].join(" ");
    }

    return [
      `M ${leftWaistX} ${waistY}`,
      `C ${leftWaistX - 5} ${140 + slope}, ${leftUpperX + 3} ${top - 16 + slope}, ${centerX - 7} ${top - 2 + slope}`,
      `C ${centerX - 3} ${top + slope}, ${centerX + 3} ${top + slope}, ${centerX + 7} ${top - 2 + slope}`,
      `C ${rightUpperX - 3} ${top - 16 + slope}, ${rightWaistX + 5} ${140 + slope}, ${rightWaistX} ${waistY}`,
      `C ${rightLowerX + 1} ${181}, ${rightLowerX - 3} ${211}, ${centerX + 33} ${bottomY - 2}`,
      `C ${centerX + 25} ${bottomY + 7}, ${centerX + 14} ${bottomCenterY}, ${centerX} ${bottomCenterY}`,
      `C ${centerX - 14} ${bottomCenterY}, ${centerX - 25} ${bottomY + 7}, ${centerX - 33} ${bottomY - 2}`,
      `C ${leftLowerX + 3} ${211}, ${leftLowerX - 1} ${181}, ${leftWaistX} ${waistY}`,
      "Z",
    ].join(" ");
  };

  const acousticBodyProfiles = {
    round: { upper: 31, waist: 43, lower: 59, top: 128, bottom: 239 },
    waist: { upper: 30, waist: 41, lower: 54, top: 131, bottom: 235 },
    compact: { upper: 25, waist: 34, lower: 42, top: 138, bottom: 221 },
    jumbo: { upper: 36, waist: 49, lower: 66, top: 126, bottom: 244 },
    mini: { upper: 22, waist: 30, lower: 37, top: 145, bottom: 217 },
    "cute-dread": { upper: 29, waist: 41, lower: 55, top: 130, bottom: 235 },
    "stage-dread": { upper: 34, waist: 47, lower: 62, top: 127, bottom: 241 },
    "buddy-dread": { upper: 27, waist: 39, lower: 51, top: 132, bottom: 231 },
    "guard-dread": { upper: 33, waist: 45, lower: 59, top: 128, bottom: 238 },
    "ace-mini": { upper: 24, waist: 33, lower: 39, top: 139, bottom: 220 },
    auditorium: { upper: 29, waist: 42, lower: 53, top: 131, bottom: 232 },
    "grand-auditorium": { upper: 34, waist: 47, lower: 60, top: 128, bottom: 239 },
    "soft-cutaway": { upper: 31, waist: 43, lower: 58, top: 128, bottom: 236, cutaway: 12 },
    "modern-cutaway": { upper: 33, waist: 45, lower: 61, top: 127, bottom: 238, cutaway: 16 },
    "slope-shoulder": { upper: 34, waist: 44, lower: 59, top: 129, bottom: 236, slope: 2 },
    parlor: { upper: 22, waist: 31, lower: 37, top: 139, bottom: 220 },
    "premium-dread": { upper: 34, waist: 47, lower: 62, top: 127, bottom: 241 },
    "vintage-amber": { upper: 31, waist: 43, lower: 57, top: 129, bottom: 237 },
    "dreadnought-refined": { upper: 34, waist: 47, lower: 62, top: 127, bottom: 241 },
    "om-refined": { upper: 28, waist: 40, lower: 52, top: 132, bottom: 232 },
    "grand-concert": { upper: 26, waist: 37, lower: 47, top: 135, bottom: 229 },
    "jumbo-balanced": { upper: 37, waist: 50, lower: 67, top: 126, bottom: 245 },
    "venetian-cutaway": { upper: 31, waist: 43, lower: 58, top: 128, bottom: 238, cutaway: 14 },
    "modern-venetian": { upper: 33, waist: 45, lower: 60, top: 127, bottom: 239, cutaway: 16 },
    "deep-waist": { upper: 30, waist: 39, lower: 58, top: 130, bottom: 237 },
    "travel-plus": { upper: 23, waist: 32, lower: 39, top: 140, bottom: 221 },
    "twelve-fret": { upper: 31, waist: 43, lower: 57, top: 128, bottom: 235 },
    archtop: { upper: 34, waist: 46, lower: 61, top: 127, bottom: 242 },
    "all-solid": { upper: 32, waist: 44, lower: 59, top: 128, bottom: 239 },
    "concert-cutaway": { upper: 27, waist: 38, lower: 48, top: 134, bottom: 229, cutaway: 12 },
    "slope-modern": { upper: 35, waist: 44, lower: 60, top: 129, bottom: 237, slope: 3 },
    "thin-body": { upper: 29, waist: 41, lower: 55, top: 131, bottom: 231 },
    baritone: { upper: 32, waist: 45, lower: 60, top: 129, bottom: 240 },
    "rosewood-grand": { upper: 35, waist: 49, lower: 64, top: 127, bottom: 243 },
    "maple-stage": { upper: 31, waist: 44, lower: 58, top: 128, bottom: 238 },
    "cedar-om": { upper: 28, waist: 40, lower: 52, top: 132, bottom: 232 },
    "black-bird": { upper: 32, waist: 44, lower: 59, top: 128, bottom: 239 },
    "sunburst-cutaway": { upper: 31, waist: 43, lower: 58, top: 128, bottom: 238, cutaway: 14 },
    "orchestra-luxe": { upper: 27, waist: 38, lower: 50, top: 133, bottom: 231 },
    "heritage-dread": { upper: 34, waist: 47, lower: 62, top: 127, bottom: 241 },
    "studio-cut": { upper: 29, waist: 41, lower: 54, top: 130, bottom: 234, cutaway: 13 },
    "boutique-cedar": { upper: 29, waist: 39, lower: 57, top: 131, bottom: 238 },
    "wide-stage": { upper: 36, waist: 49, lower: 65, top: 126, bottom: 244 },
    "north-dread": { upper: 35, waist: 47, lower: 61, top: 126, bottom: 240 },
    "ember-om": { upper: 28, waist: 40, lower: 51, top: 132, bottom: 232 },
    "royal-auditorium": { upper: 31, waist: 43, lower: 56, top: 130, bottom: 236 },
    "crescent-cutaway": { upper: 30, waist: 42, lower: 56, top: 129, bottom: 236, cutaway: 15 },
    "rose-stage": { upper: 33, waist: 45, lower: 59, top: 128, bottom: 239 },
    "real-d28": { upper: 35, waist: 47, lower: 61, top: 126, bottom: 240 },
    "real-d18": { upper: 34, waist: 46, lower: 60, top: 127, bottom: 239 },
    "real-hd28": { upper: 36, waist: 48, lower: 62, top: 126, bottom: 241 },
    "real-j45": { upper: 32, waist: 45, lower: 60, top: 129, bottom: 239, slope: 4 },
    "real-hummingbird": { upper: 36, waist: 47, lower: 61, top: 126, bottom: 239 },
    "real-814ce": { upper: 32, waist: 43, lower: 57, top: 128, bottom: 237, cutaway: 15 },
    "real-314ce": { upper: 31, waist: 42, lower: 56, top: 129, bottom: 236, cutaway: 14 },
    "real-214ce": { upper: 31, waist: 42, lower: 55, top: 130, bottom: 235, cutaway: 13 },
    "real-fg5": { upper: 35, waist: 47, lower: 60, top: 127, bottom: 239 },
    "real-ll16": { upper: 37, waist: 49, lower: 64, top: 126, bottom: 243 },
    "real-vintage-dread": { upper: 34, waist: 46, lower: 60, top: 128, bottom: 239, slope: 1 },
    "real-modern-dread": { upper: 35, waist: 46, lower: 60, top: 126, bottom: 238 },
    "real-om-rosewood": { upper: 29, waist: 40, lower: 52, top: 132, bottom: 232 },
    "real-auditorium-cedar": { upper: 31, waist: 42, lower: 55, top: 130, bottom: 235 },
    "real-grand-auditorium": { upper: 33, waist: 44, lower: 58, top: 128, bottom: 238 },
    "real-single-cutaway": { upper: 32, waist: 43, lower: 57, top: 128, bottom: 237, cutaway: 15 },
    "real-soft-cutaway": { upper: 31, waist: 42, lower: 56, top: 129, bottom: 236, cutaway: 12 },
    "real-modern-cutaway": { upper: 33, waist: 44, lower: 58, top: 128, bottom: 238, cutaway: 17 },
    "real-jumbo-maple": { upper: 38, waist: 50, lower: 66, top: 126, bottom: 244 },
    "real-square-shoulder": { upper: 36, waist: 47, lower: 61, top: 126, bottom: 239 },
    "fresh-dread": { upper: 34, waist: 45, lower: 57, top: 126, bottom: 239 },
    "fresh-d18": { upper: 33, waist: 44, lower: 56, top: 127, bottom: 238 },
    "fresh-fg5": { upper: 34, waist: 45, lower: 56, top: 127, bottom: 238 },
    "fresh-j45": { upper: 32, waist: 44, lower: 56, top: 129, bottom: 238, slope: 4 },
    "fresh-humming": { upper: 36, waist: 46, lower: 57, top: 126, bottom: 238 },
    "fresh-om": { upper: 29, waist: 39, lower: 49, top: 132, bottom: 231 },
    "fresh-000": { upper: 27, waist: 37, lower: 46, top: 134, bottom: 228 },
    "fresh-auditorium": { upper: 31, waist: 41, lower: 53, top: 130, bottom: 234 },
    "fresh-grand": { upper: 33, waist: 43, lower: 56, top: 128, bottom: 237 },
    "fresh-soft-cut": { upper: 31, waist: 42, lower: 54, top: 129, bottom: 235, cutaway: 12 },
    "fresh-venetian": { upper: 32, waist: 42, lower: 55, top: 128, bottom: 236, cutaway: 14 },
    "fresh-cedar": { upper: 30, waist: 40, lower: 52, top: 131, bottom: 234 },
    "fresh-rosewood": { upper: 32, waist: 42, lower: 54, top: 129, bottom: 236 },
    "fresh-maple": { upper: 34, waist: 45, lower: 57, top: 127, bottom: 238 },
    "fresh-black": { upper: 32, waist: 42, lower: 54, top: 129, bottom: 236 },
    "fresh-sunburst": { upper: 34, waist: 45, lower: 57, top: 127, bottom: 238 },
    "fresh-boutique": { upper: 30, waist: 39, lower: 50, top: 131, bottom: 233 },
    "fresh-studio": { upper: 33, waist: 44, lower: 55, top: 127, bottom: 237 },
    "fresh-jumbo": { upper: 36, waist: 47, lower: 58, top: 126, bottom: 240 },
    "fresh-heritage": { upper: 35, waist: 45, lower: 56, top: 126, bottom: 238 },
    "fresh-d15m-mahogany": { upper: 35, waist: 45, lower: 56, top: 126, bottom: 238 },
    "fresh-d15m-satin": { upper: 34, waist: 44, lower: 55, top: 127, bottom: 237 },
    "fresh-d15m-studio": { upper: 35, waist: 46, lower: 57, top: 126, bottom: 239 },
    "fresh-d15m-shadow": { upper: 34, waist: 45, lower: 56, top: 127, bottom: 238 },
    "fresh-d15m-stage": { upper: 36, waist: 46, lower: 57, top: 126, bottom: 239 },
    "fresh-cutaway-814ce": { upper: 32, waist: 42, lower: 55, top: 128, bottom: 236, cutaway: 16 },
    "fresh-cutaway-314ce": { upper: 31, waist: 42, lower: 54, top: 129, bottom: 235, cutaway: 15 },
    "fresh-cutaway-214ce": { upper: 31, waist: 41, lower: 53, top: 130, bottom: 234, cutaway: 14 },
    "fresh-cutaway-grand": { upper: 34, waist: 44, lower: 57, top: 128, bottom: 238, cutaway: 16 },
    "fresh-cutaway-auditorium": { upper: 31, waist: 41, lower: 53, top: 130, bottom: 234, cutaway: 14 },
    "fresh-cutaway-dread": { upper: 35, waist: 46, lower: 58, top: 127, bottom: 239, cutaway: 13 },
    "fresh-cutaway-mahogany": { upper: 34, waist: 45, lower: 56, top: 127, bottom: 238, cutaway: 13 },
    "fresh-cutaway-rosewood": { upper: 32, waist: 42, lower: 55, top: 129, bottom: 236, cutaway: 15 },
    "fresh-cutaway-maple": { upper: 33, waist: 43, lower: 56, top: 128, bottom: 237, cutaway: 16 },
    "fresh-cutaway-black": { upper: 32, waist: 42, lower: 54, top: 129, bottom: 236, cutaway: 15 },
    "fresh-cutaway-sunburst": { upper: 34, waist: 45, lower: 57, top: 128, bottom: 238, cutaway: 14 },
    "fresh-cutaway-cedar": { upper: 30, waist: 40, lower: 52, top: 131, bottom: 234, cutaway: 13 },
    "fresh-cutaway-stage": { upper: 33, waist: 43, lower: 56, top: 128, bottom: 237, cutaway: 17 },
    "fresh-cutaway-venetian": { upper: 32, waist: 42, lower: 55, top: 128, bottom: 236, cutaway: 12 },
    "fresh-cutaway-soft": { upper: 31, waist: 41, lower: 54, top: 130, bottom: 235, cutaway: 11 },
    "fresh-cutaway-modern": { upper: 33, waist: 43, lower: 56, top: 128, bottom: 237, cutaway: 18 },
    "fresh-cutaway-boutique": { upper: 29, waist: 39, lower: 50, top: 132, bottom: 233, cutaway: 14 },
    "fresh-cutaway-pearl": { upper: 32, waist: 42, lower: 54, top: 129, bottom: 236, cutaway: 15 },
    "fresh-cutaway-honey": { upper: 33, waist: 44, lower: 56, top: 128, bottom: 237, cutaway: 13 },
    "fresh-cutaway-reference": { upper: 33, waist: 43, lower: 55, top: 128, bottom: 236, cutaway: 15 },
    "core-dread-01": { upper: 35, waist: 45, lower: 56, top: 126, bottom: 238 },
    "core-dread-02": { upper: 34, waist: 44, lower: 55, top: 127, bottom: 237, slope: 1 },
    "core-dread-03": { upper: 36, waist: 46, lower: 57, top: 126, bottom: 238 },
  };

  const acousticProfile = !isElectric && !isClassical ? acousticBodyProfiles[variant.shape] : null;
  const bodyPath = acousticProfile ? makeAcousticBodyPath(acousticProfile) : (bodyPathMap[variant.shape] || bodyPathMap.round);
  const headPath = variant.shape === "metal"
    ? "M60 16 L75 7 L91 16 L85 57 L65 57 Z"
    : variant.shape === "tele"
      ? "M62 17 L75 10 C88 11 93 19 89 31 C89 47 83 58 66 57 C62 45 60 29 62 17 Z"
      : isClassical
        ? "M61 17 L75 9 L89 17 L86 57 C79 60 70 60 64 57 Z"
        : "M62 17 L75 9 L88 17 L85 57 C78 60 69 60 63 57 Z";
  const stringXsAtSaddle = [59, 65.4, 71.8, 78.2, 84.6, 91];
  const stringXsAtNut = [65.4, 69.2, 73, 77, 80.8, 84.6];
  // Front view: fretboard strings run left-to-right as 6(E), 5(A), 4(D), 3(G), 2(B), 1(E).
  // Head posts keep the visible order left top-to-bottom D/A/E and right top-to-bottom G/B/E.
  const tunerPosts = [
    [67, 47],
    [67, 36],
    [67, 25],
    [83, 25],
    [83, 36],
    [83, 47],
  ];
  const tunerKnobs = [
    [55, 47],
    [55, 36],
    [55, 25],
    [95, 25],
    [95, 36],
    [95, 47],
  ];
  const fretYs = [72, 82.6, 92.4, 101.5, 110, 117.9, 125.2, 132, 138.3, 144.1, 149.6, 154.7].filter((fret) => fret < fretboardBottom - 2);

  return (
    <svg className={`guitarAssetSvg ${className}`} viewBox="0 0 150 260" role="img" aria-label={`${variant.title} vertical SVG guitar asset`}>
      <defs>
        <linearGradient id={`${uniqueId}-body`} x1="38" x2="104" y1="118" y2="238" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff1bd" stopOpacity="0.22" />
          <stop offset="0.42" stopColor={variant.bodyColor} />
          <stop offset="1" stopColor="#111" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${uniqueId}-neck`} x1="62" x2="88" y1="62" y2="166" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3a2412" />
          <stop offset="1" stopColor="#c9904a" />
        </linearGradient>
        <filter id={`${uniqueId}-shadow`}>
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>
      <ellipse cx="75" cy="239" rx="48" ry="9" fill="#000" opacity="0.28" />
      <g filter={`url(#${uniqueId}-shadow)`}>
        <path className="guitarAssetBody" d={bodyPath} fill={`url(#${uniqueId}-body)`} stroke={variant.accentColor} strokeWidth="3" />
        {soundHole}
        {pickups}
        {pickguard}
        <rect className="guitarAssetFretboard" x={fretboardLeft} y={fretboardTop} width={fretboardWidth} height={fretboardBottom - fretboardTop} rx="3.5" fill={`url(#${uniqueId}-neck)`} stroke="#100b06" strokeWidth="2" />
        {fretYs.map((fret) => (
          <line className="guitarAssetFret" x1={fretboardLeft + 1.4} x2={fretboardRight - 1.4} y1={fret} y2={fret} stroke="#f1ca7a" strokeWidth="1.05" opacity="0.68" key={fret} />
        ))}
        <path className="guitarAssetHead" d={headPath} fill={variant.bodyColor} stroke={variant.accentColor} strokeWidth="2.5" />
        <rect className="guitarAssetNut" x={fretboardLeft} y={nutY} width={fretboardWidth} height="5" rx="1.8" fill={`url(#${uniqueId}-neck)`} stroke="#100b06" strokeWidth="1.2" />
        {tunerPosts.map(([postX, postY], peg) => {
          const [knobX, knobY] = tunerKnobs[peg];
          return (
            <g key={peg}>
              <line className="guitarAssetTunerArm" x1={postX} x2={knobX} y1={postY} y2={knobY} stroke="#c99448" strokeWidth="1.25" opacity="0.86" />
              <circle className="guitarAssetPost" cx={postX} cy={postY} r="2.35" fill="#f6d38a" stroke="#120a04" strokeWidth="0.85" />
              <circle className="guitarAssetPostCore" cx={postX} cy={postY} r="0.9" fill="#4a2d10" opacity="0.68" />
              <circle className="guitarAssetPeg" cx={knobX} cy={knobY} r="3.2" fill="#f1ca7a" stroke="#120a04" strokeWidth="1" />
            </g>
          );
        })}
        <rect className="guitarAssetBridge" x={isElectric ? 51 : 50} y={bridgeY} width={isElectric ? 48 : 50} height={isElectric ? 17 : 18} rx="3" fill="#17100a" stroke="#d9aa55" strokeWidth="2" />
        <rect className="guitarAssetSaddle" x="56" y={saddleY} width="38" height="4" rx="1.5" fill="#f7e6bd" />
        {birdInlay}
        {stringXsAtSaddle.map((x, stringIndex) => (
          <circle cx={x} cy={saddleY + 9} r="2.1" fill="#f1ca7a" stroke="#100a05" strokeWidth="0.8" key={`pin-${stringIndex}`} />
        ))}
        {stringXsAtSaddle.map((x, stringIndex) => (
          <path
            className="guitarAssetString"
            d={`M ${tunerPosts[stringIndex][0]} ${tunerPosts[stringIndex][1]} L ${stringXsAtNut[stringIndex]} ${nutY + 2} L ${x} ${saddleY + 1} L ${x} ${saddleY + 9}`}
            fill="none"
            stroke="#fff2c8"
            strokeWidth={stringIndex < 2 ? "0.9" : "0.65"}
            opacity="0.76"
            key={stringIndex}
          />
        ))}
        {tunerPosts.map(([postX, postY], stringIndex) => (
          <path
            className="guitarAssetStringWrap"
            d={`M ${postX - 2.1} ${postY - 0.2} C ${postX - 0.7} ${postY - 2.1}, ${postX + 2.1} ${postY - 1.2}, ${postX + 1.8} ${postY + 0.6} C ${postX + 1.4} ${postY + 2.2}, ${postX - 1.5} ${postY + 1.8}, ${postX - 1.7} ${postY + 0.2}`}
            fill="none"
            key={`wrap-${stringIndex}`}
            opacity="0.5"
            stroke="#fff2c8"
            strokeLinecap="round"
            strokeWidth={stringIndex < 2 ? "0.75" : "0.55"}
          />
        ))}
        {!compact ? <text x="14" y="248" fill="rgba(255,238,202,0.52)" fontSize="8" fontWeight="900" letterSpacing="2">{variant.pack.toUpperCase()}</text> : null}
      </g>
    </svg>
  );
}

function GuitarLabPreview({ variant, active = false }) {
  const parts = ["헤드", "페그", "너트", "프렛보드", variant.pack === "Electric" ? "픽업" : "사운드홀", "브릿지", "새들", "줄", "바디"];

  return (
    <div className={`guitarLabPreview ${active ? "active" : ""}`}>
      <div className="guitarLabStage">
        <GuitarAssetSvg variant={variant} />
      </div>
      <div className="guitarLabParts" aria-label={`${variant.title} 구조`}>
        {parts.map((part) => <span key={part}>{part}</span>)}
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

function BeatIndicator({
  beat,
  beatPattern,
  beatsPerMeasure = 4,
  compact = false,
  dotClassName = "trainingBeatDot",
  isPlaying,
  label = "현재 박자",
  onBeatClick,
  timeSignature = "4/4",
}) {
  const dots = Array.from({ length: beatsPerMeasure }, (_, index) => index);
  const normalizedBeatPattern = normalizeMetronomeBeatPattern(beatPattern, beatsPerMeasure);
  const dotRows = beatsPerMeasure === 12
    ? [dots.slice(0, 6), dots.slice(6)]
    : beatsPerMeasure === 9
      ? [dots.slice(0, 5), dots.slice(5)]
      : [dots];
  const renderDot = (beatNumber) => (
    <BeatDot
      active={beat === beatNumber && isPlaying}
      className={dotClassName}
      key={beatNumber}
      label={`${beatNumber + 1}박 ${METRONOME_BEAT_STATE_LABELS[normalizedBeatPattern[beatNumber]]}`}
      onClick={onBeatClick ? (event) => {
        event.stopPropagation();
        onBeatClick(beatNumber);
      } : undefined}
      state={normalizedBeatPattern[beatNumber]}
      title={`${beatNumber + 1}박: ${METRONOME_BEAT_STATE_LABELS[normalizedBeatPattern[beatNumber]]}`}
    />
  );

  return (
    <div
      className={`beatIndicator beatIndicator--beats-${beatsPerMeasure} ${compact ? "beatIndicator--compact" : ""}`}
      aria-label={`${timeSignature} ${label}`}
      style={{ "--beat-count": beatsPerMeasure }}
    >
      {dotRows.map((row, rowIndex) => (
        <div className="beatIndicatorRow" key={`beat-row-${rowIndex}`}>
          {row.map(renderDot)}
        </div>
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
const METRONOME_SETTING_SCOPES = {
  STANDALONE: "standalone",
  STAGE1: "stage1",
  STAGE2: "stage2",
  STAGE3: "stage3",
};
const createDefaultMetronomeSettings = () => ({
  bpm: DEFAULT_BPM,
  timeSignature: "4/4",
  subdivision: "quarter",
  tone: "tick",
  accentTone: "kick",
  weakTone: "rim",
  accent: true,
  countIn: false,
  countInBars: 0,
  beatPattern: normalizeMetronomeBeatPattern([], 4),
});
const DEFAULT_ONLY_TRAINING_METRONOME_SCOPES = new Set([
  METRONOME_SETTING_SCOPES.STAGE1,
  METRONOME_SETTING_SCOPES.STAGE2,
]);
function keepOnlyTrainingMetronomeRuntimeSettings(scope, settings) {
  const normalized = settings ?? createDefaultMetronomeSettings();
  if (!DEFAULT_ONLY_TRAINING_METRONOME_SCOPES.has(scope)) return normalized;
  return {
    ...createDefaultMetronomeSettings(),
    bpm: clampBpm(normalized.bpm),
  };
}
const MIN_REPEAT_COUNT = 1;
const MAX_REPEAT_COUNT = 12;
const HIT_WINDOW_MS = 150;
const PERFECT_WINDOW_MS = 55;
const HIT_LINE_PERCENT = 88;
const SHOOTER_LIFE_LINE_PERCENT = 86;
const SHOOTER_TARGET_HIT_EFFECT_MS = 220;
const SHOOTER_TARGET_BREAK_EFFECT_MS = 450;
const SHOOTER_PROJECTILE_MS = 640;
const SHOOTER_PROJECTILE_IMPACT_RATIO = 1;
const SHOOTER_PROJECTILE_IMPACT_SYNC_MS = 0;
const SHOOTER_PROJECTILE_CONTACT_HOLD_MS = 58;
const SHOOTER_EMPTY_REFILL_MS = 420;
const SHOOTER_TARGET_HITBOX = { width: 10.6, height: 8.8 };
const SHOOTER_PROJECTILE_HITBOX = { width: 6.4, height: 7.2 };
const SHOOTER_TARGET_BREAK_PIECES = [
  { clip: "polygon(0 0, 47% 0, 42% 36%, 0 46%)", dx: "-12px", dy: "-10px", rotate: "-22deg", origin: "72% 68%" },
  { clip: "polygon(47% 0, 100% 0, 100% 38%, 58% 33%)", dx: "13px", dy: "-9px", rotate: "21deg", origin: "22% 72%" },
  { clip: "polygon(0 46%, 42% 36%, 49% 54%, 24% 100%, 0 100%)", dx: "-11px", dy: "7px", rotate: "16deg", origin: "72% 20%" },
  { clip: "polygon(42% 36%, 58% 33%, 67% 62%, 49% 54%)", dx: "0px", dy: "-3px", rotate: "-11deg", origin: "50% 50%" },
  { clip: "polygon(58% 33%, 100% 38%, 100% 100%, 75% 100%, 67% 62%)", dx: "12px", dy: "8px", rotate: "-18deg", origin: "28% 28%" },
  { clip: "polygon(24% 100%, 49% 54%, 67% 62%, 75% 100%)", dx: "1px", dy: "13px", rotate: "14deg", origin: "50% 18%" },
];
const MIC_READ_INTERVAL_MS = 33;
const MIC_ANALYSIS_INTERVAL_MS = 34;
const MIC_DISPLAY_UPDATE_MS = 100;
const MIC_LOW_SIGNAL_DISPLAY_UPDATE_MS = 120;
const MIC_FFT_SIZE_DESKTOP = 4096;
const MIC_FFT_SIZE_MOBILE = 2048;
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
    title: "단일 음 위치 익히기",
    subtitle: "0~3프렛 음 위치 훈련",
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
    title: "코드 전환 훈련",
    subtitle: "직접 설정한 코드 전환 훈련.",
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

const HELP_GUIDE_SECTIONS = [
  {
    id: "hello",
    title: "안녕하세요",
    content: (
      <>
        <p>RIFFLAB은 기타 지판, 스케일, 코드 전환, 리듬 감각을 한 화면 안에서 반복 연습할 수 있도록 만든 기타 훈련 앱입니다.</p>
        <p>리듬 & 코드에서는 코드 진행과 반주를 보며 연습하고, 지판 보기에서는 음·코드·스케일 위치를 확인할 수 있습니다.</p>
        <p>연습 중에는 메트로놈과 반주 기능을 함께 사용해 실제 연주에 가까운 감각으로 반복할 수 있습니다.</p>
      </>
    ),
  },
  {
    id: "stage1",
    title: "🎯 단일 음 위치 익히기",
    content: (
      <>
        <p>0~3프렛 기본 음 위치를 지판에서 빠르게 찾는 훈련입니다.</p>
        <p>화면에 표시되는 목표 음을 보고 같은 줄과 프렛 위치를 반복해서 익힙니다.</p>
        <strong>사용 방법</strong>
        <ul>
          <li>START를 누르면 훈련이 시작됩니다.</li>
          <li>지판 아래 점자 메트로놈을 보며 박자에 맞춰 음 위치를 확인합니다.</li>
          <li>박자, 세분, 1박 음색, 나머지 박 음색을 선택해 연습감을 맞춥니다.</li>
          <li>BPM의 - / + 버튼으로 속도를 조절합니다.</li>
        </ul>
      </>
    ),
  },
  {
    id: "stage2",
    title: "🎸 스케일 · 펜타토닉",
    content: (
      <>
        <p>메이저, 마이너, 펜타토닉 스케일을 Box 단위로 연습하는 훈련입니다.</p>
        <p>키, 스케일 종류, 타입, Box를 선택하면 해당 위치가 지판에 표시됩니다.</p>
        <strong>연습 포인트</strong>
        <ul>
          <li>Box별 음 위치를 반복해서 익힙니다.</li>
          <li>상행, 하행, 왕복 흐름으로 지판 이동 감각을 만듭니다.</li>
          <li>점자 메트로놈의 1박, 나머지 박, 무음 표시를 보며 박자에 맞춰 연습합니다.</li>
          <li>박자, 세분, 1박 음색, 나머지 박 음색을 바꿔 원하는 연습 흐름을 만들 수 있습니다.</li>
        </ul>
      </>
    ),
  },
  {
    id: "stage3",
    title: "🔥 리듬 · 코드전환",
    content: (
      <>
        <p>코드 진행을 보면서 코드 전환과 리듬을 함께 연습하는 화면입니다.</p>
        <p>상단의 추천 드롭다운에서는 앱에서 고정 제공하는 대표 진행을 바로 불러올 수 있습니다.</p>
        <p>사용자 드롭다운에서는 저장실에 저장한 내 코드 진행을 불러올 수 있습니다.</p>
        <strong>추천 진행</strong>
        <ul>
          <li>추천 진행을 선택하면 코드 진행, BPM, 드럼·베이스·피아노 비트가 자동 적용됩니다.</li>
          <li>적용 후에는 BPM과 반주 비트를 자유롭게 바꿀 수 있습니다.</li>
          <li>추천 진행은 운영자가 고정 제공하는 항목이라 저장실에서 삭제하거나 수정하지 않습니다.</li>
        </ul>
        <strong>저장실</strong>
        <ul>
          <li>저장실은 사용자가 만든 코드 진행과 주법을 저장하는 공간입니다.</li>
          <li>루트, 성격, 옵션을 선택해 코드를 추가하고 진행순서를 만듭니다.</li>
          <li>주법을 추가한 뒤 저장하면 사용자 드롭다운에서 불러올 수 있습니다.</li>
          <li>사용자 저장 진행만 수정하거나 삭제할 수 있습니다.</li>
        </ul>
        <strong>반주 설정</strong>
        <ul>
          <li>드럼 리듬은 4비트, 8비트, 16비트, Shuffle 중 선택할 수 있습니다.</li>
          <li>베이스와 피아노 비트를 따로 선택해 반주 느낌을 조절할 수 있습니다.</li>
        </ul>
      </>
    ),
  },
  {
    id: "fretboard",
    title: "🗺️ 지판보기",
    content: (
      <>
        <p>기타 지판을 자유롭게 확인하는 보기 모드입니다.</p>
        <strong>기능</strong>
        <ul>
          <li>단일음 위치 확인</li>
          <li>코드 운지 확인</li>
          <li>스케일과 펜타토닉 위치 확인</li>
          <li>개방현과 구간별 지판 확인</li>
        </ul>
        <p>훈련 전에 음이나 코드 위치를 확인하거나, 연습 중 헷갈리는 위치를 복습할 때 사용합니다.</p>
      </>
    ),
  },
  {
    id: "metronome",
    title: "⏱️ 메트로놈",
    content: (
      <>
        <p>단독 메트로놈으로 사용할 수 있는 모드입니다.</p>
        <strong>주요 기능</strong>
        <ul>
          <li>BPM, 박자, 세분 설정</li>
          <li>1박 음색과 나머지 박 음색을 각각 선택</li>
          <li>점자 표시에서 1박, 나머지 박, 무음 박을 직접 확인</li>
          <li>무음 박, Count In, 반복 연습 설정</li>
          <li>Timer와 Bar Counter 기반 연습</li>
          <li>좌우 스와이프로 표시 모드 전환</li>
        </ul>
        <p>기본 박자 연습, 속도 유지 연습, 특정 시간 또는 마디 수 반복 연습에 활용할 수 있습니다.</p>
      </>
    ),
  },
  {
    id: "shooter",
    title: "👾 슈팅게임",
    content: (
      <>
        <p>지판 음 위치를 게임처럼 반복하는 모드입니다.</p>
        <p>화면에 등장하는 목표 음을 보고 지판에서 해당 음을 찾아 반응합니다.</p>
        <p>기본 훈련보다 가볍게 즐기면서 음 위치 반응 속도를 높이고 싶을 때 사용합니다.</p>
      </>
    ),
  },
  {
    id: "feedback",
    title: "💬 피드백 보내기",
    content: (
      <>
        <p>사용 중 불편한 점, 오류, 추가되었으면 하는 기능이 있다면 알려주세요.</p>
        <p>훈련 흐름, 모바일 화면, 사운드, 저장실 기능에 대한 의견도 환영합니다.</p>
        <p>보내주신 피드백은 RIFFLAB을 더 사용하기 좋은 기타 훈련 앱으로 다듬는 데 활용됩니다.</p>
        <a className="helpInstagramLink" href="https://www.instagram.com/sungsu91_/" rel="noreferrer" target="_blank">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17" cy="7" r="1.2" />
          </svg>
          <span>@sungsu91_</span>
        </a>
      </>
    ),
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
  MINI_CHORD_MAKER: "mini-chord-maker",
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
  MINI_CHORD_MAKER: "#mini-chord",
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
      return { appMode: APP_MODES.PRACTICE, categoryId: "rhythm" };
    case APP_ROUTES.TUTORIAL:
      return { appMode: APP_MODES.PRACTICE, categoryId: "rhythm" };
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
    case APP_ROUTES.MINI_CHORD_MAKER:
      return import.meta.env.DEV
        ? { appMode: APP_MODES.MINI_CHORD_MAKER, categoryId: "rhythm" }
        : { appMode: APP_MODES.PRACTICE, categoryId: "rhythm" };
    case APP_ROUTES.DESIGN_LAB:
      return isDesignLabEnabled()
        ? { appMode: APP_MODES.DESIGN_LAB, categoryId: MAIN_DEFAULT_CATEGORY.id }
        : { appMode: APP_MODES.PRACTICE, categoryId: "rhythm" };
    case APP_ROUTES.MAIN:
    default:
      return { appMode: APP_MODES.PRACTICE, categoryId: "rhythm" };
  }
}

function getHashFromRoute(appMode, categoryId = MAIN_DEFAULT_CATEGORY.id) {
  if (appMode === APP_MODES.FRETBOARD_VIEWER) return APP_ROUTES.FRETBOARD_VIEWER;
  if (appMode === APP_MODES.CURRICULUM) return APP_ROUTES.CURRICULUM;
  if (appMode === APP_MODES.METRONOME) return APP_ROUTES.METRONOME;
  if (appMode === APP_MODES.SHOOTER) return APP_ROUTES.SHOOTER;
  if (appMode === APP_MODES.MINI_CHORD_MAKER) return import.meta.env.DEV ? APP_ROUTES.MINI_CHORD_MAKER : APP_ROUTES.STAGE3;
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

const FRETBOARD_VIEWER_MODE_ORDER = [
  FRETBOARD_VIEWER_MODES.CHORD,
  FRETBOARD_VIEWER_MODES.SCALE,
  FRETBOARD_VIEWER_MODES.NOTE,
];

const CHORD_VIEWER_POSITION_ALL = "all";
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
const STAGE3_RECOMMENDED_PROGRESSIONS = [
  {
    id: "recommended-1625-basic",
    title: "1625 기본",
    chords: ["C", "Am", "Dm", "G"],
    bpm: 80,
    backingRhythmPattern: "4beat",
    backingBassBeat: "4beat",
    backingPianoBeat: "4beat",
  },
  {
    id: "recommended-let-it-be",
    title: "Let It Be",
    chords: ["C", "G", "Am", "F"],
    bpm: 76,
    backingRhythmPattern: "8beat",
    backingBassBeat: "4beat",
    backingPianoBeat: "8beat",
  },
  {
    id: "recommended-canon",
    title: "Canon",
    chords: ["C", "G", "Am", "Em", "F", "C", "F", "G"],
    bpm: 72,
    backingRhythmPattern: "4beat",
    backingBassBeat: "4beat",
    backingPianoBeat: "8beat",
  },
  {
    id: "recommended-rock-basic",
    title: "Rock Basic",
    chords: ["G", "D", "Em", "C"],
    bpm: 95,
    backingRhythmPattern: "8beat",
    backingBassBeat: "8beat",
    backingPianoBeat: "4beat",
  },
  {
    id: "recommended-blues-shuffle",
    title: "Blues Shuffle",
    chords: ["C", "C", "C", "C", "F", "F", "C", "C", "G", "F", "C", "G"],
    bpm: 90,
    backingRhythmPattern: "shuffle",
    backingBassBeat: "4beat",
    backingPianoBeat: "4beat",
  },
  {
    id: "recommended-stand-by-me",
    title: "Stand By Me",
    chords: ["C", "Am", "F", "G"],
    bpm: 78,
    backingRhythmPattern: "8beat",
    backingBassBeat: "4beat",
    backingPianoBeat: "8beat",
  },
  {
    id: "recommended-no-woman-no-cry",
    title: "No Woman No Cry",
    chords: ["C", "G", "Am", "F"],
    bpm: 76,
    backingRhythmPattern: "4beat",
    backingBassBeat: "4beat",
    backingPianoBeat: "8beat",
  },
  {
    id: "recommended-zombie",
    title: "Zombie",
    chords: ["Em", "C", "G", "D"],
    bpm: 84,
    backingRhythmPattern: "8beat",
    backingBassBeat: "8beat",
    backingPianoBeat: "4beat",
  },
  {
    id: "recommended-hotel-california",
    title: "Hotel California",
    chords: ["Bm", "F#", "A", "E", "G", "D", "Em", "F#"],
    bpm: 75,
    backingRhythmPattern: "8beat",
    backingBassBeat: "4beat",
    backingPianoBeat: "8beat",
  },
];

function getStage3DropdownLabel(item) {
  const progression = getChordProgressionText(item?.chordIds ?? []);
  return `${item?.title ?? "진행"} - ${progression}`;
}

function getStage3RecommendedSlots() {
  return STAGE3_RECOMMENDED_PROGRESSIONS.map((preset) => makeStage3LibraryItem({
    id: preset.id,
    title: preset.title,
    chordIds: getChordIdsFromNames(preset.chords),
    bpm: preset.bpm,
    backingRhythmPattern: preset.backingRhythmPattern,
    backingBassBeat: preset.backingBassBeat,
    backingPianoBeat: preset.backingPianoBeat,
  })).filter((slot) => slot.chordIds.length > 0);
}

function normalizeStage3BackingSettings({
  rhythmPattern = STAGE3_DEFAULT_BACKING_SETTINGS.rhythmPattern,
  bassBeat = STAGE3_DEFAULT_BACKING_SETTINGS.bassBeat,
  pianoBeat = STAGE3_DEFAULT_BACKING_SETTINGS.pianoBeat,
} = {}) {
  const safeRhythmPattern = ["4beat", "8beat", "16beat", "shuffle"].includes(rhythmPattern) ? rhythmPattern : STAGE3_DEFAULT_BACKING_SETTINGS.rhythmPattern;
  let safeBassBeat = ["basic", "4beat", "8beat", "16beat"].includes(bassBeat) ? bassBeat : STAGE3_DEFAULT_BACKING_SETTINGS.bassBeat;
  let safePianoBeat = ["2beat", "4beat", "8beat"].includes(pianoBeat) ? pianoBeat : STAGE3_DEFAULT_BACKING_SETTINGS.pianoBeat;
  if (safeRhythmPattern === "4beat" && (safeBassBeat === "8beat" || safeBassBeat === "16beat")) safeBassBeat = "4beat";
  if (safeRhythmPattern === "8beat" && safeBassBeat === "16beat") safeBassBeat = "8beat";
  if (safeRhythmPattern === "4beat" && safePianoBeat === "8beat") safePianoBeat = "4beat";
  return {
    rhythmPattern: safeRhythmPattern,
    bassBeat: safeBassBeat,
    pianoBeat: safePianoBeat,
  };
}

function getDefaultStage3ChordIds() {
  return [];
}

function getDefaultStage3QuickSlots() {
  return [];
}

function getStoredStage3Settings() {
  const fallback = {
    bpm: DEFAULT_BPM,
    chordProgressionId: "custom",
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
    const chordIds = fallback.chordIds;
    const validProgressionId = fallback.chordProgressionId;
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
      .filter((slot) => !String(slot?.id ?? "").startsWith("preset-") && !String(slot?.id ?? "").startsWith("recommended-"))
      .map((slot, index) => makeStage3LibraryItem({
        id: slot?.id ?? `slot-${Date.now()}-${index}`,
        title: slot?.title ?? slot?.name ?? (slot?.label?.includes("—") ? slot.label.split("—")[0].trim() : `내 진행 ${index + 1}`),
        chordIds: Array.isArray(slot?.chordIds) ? slot.chordIds : Array.isArray(slot?.chords) ? slot.chords : [],
        capo: slot?.capo,
        bpm: slot?.bpm,
        timeSignature: slot?.time_signature ?? slot?.timeSignature,
        subdivision: slot?.subdivision,
        sound: slot?.sound ?? slot?.tone,
        backingRhythmPattern: slot?.backingRhythmPattern,
        backingBassBeat: slot?.backingBassBeat,
        backingPianoBeat: slot?.backingPianoBeat,
        strum_pattern: slot?.strum_pattern ?? slot?.strumPattern ?? slot?.strumSlots,
        selectedStrumSlot: slot?.selectedStrumSlot,
        memo: slot?.memo ?? (typeof slot?.strum_pattern === "string" ? slot.strum_pattern : ""),
      }))
      .filter((slot) => slot.id && slot.title && slot.chordIds.length > 0);
    return migrated.slice(0, 24);
  } catch {
    return getDefaultStage3QuickSlots();
  }
}

const MINI_CHORD_MAKER_STORAGE_KEY = "guitarTrainer.miniChordMaker.v1";
const MINI_CHORD_BAR_OPTIONS = [4, 8, 12, 16, 32];
const MINI_CHORD_MIN_BARS = 4;
const MINI_CHORD_MAX_BARS = 32;
const MINI_CHORD_SLOTS_PER_BAR = 2;
const MINI_CHORD_BARS_PER_PAGE = 4;
const MINI_CHORD_PICKER_SHARP_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MINI_CHORD_PICKER_FLAT_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

function getMiniChordPickerSuffix(quality, extension) {
  if (extension === "seven") return quality === "minor" ? "m7" : "7";
  if (extension === "minor7") return "m7";
  if (extension === "major7") return "M7";
  if (extension === "minor7Flat5") return "m7b5";
  if (extension === "dim7") return "dim7";
  if (extension === "aug") return "aug";
  return quality === "minor" ? "m" : "";
}

function getMiniChordPickerChord(root, quality, extension) {
  return `${root}${getMiniChordPickerSuffix(quality, extension)}`;
}

function normalizeMiniChordBarCount(value) {
  const numeric = Math.round(Number(value) || MINI_CHORD_MIN_BARS);
  return Math.max(MINI_CHORD_MIN_BARS, Math.min(MINI_CHORD_MAX_BARS, numeric));
}

function normalizeMiniChordSlots(slots = [], barCount = 4) {
  const totalSlots = normalizeMiniChordBarCount(barCount) * MINI_CHORD_SLOTS_PER_BAR;
  return Array.from({ length: totalSlots }, (_, index) => String(slots[index] ?? "").trim());
}

function normalizeMiniChordMarkers(markers = [], barCount = 4) {
  const safeBarCount = normalizeMiniChordBarCount(barCount);
  return [...new Set(
    (Array.isArray(markers) ? markers : [])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value < safeBarCount),
  )].sort((a, b) => a - b);
}

function normalizeMiniChordBarMarks(marks = {}, barCount = 4, fallbackRepeatStarts = [], fallbackRepeatEnds = []) {
  const safeBarCount = normalizeMiniChordBarCount(barCount);
  const next = {};

  normalizeMiniChordMarkers(fallbackRepeatStarts, safeBarCount).forEach((barIndex) => {
    next[barIndex] = { ...(next[barIndex] ?? {}), repeatStart: true };
  });
  normalizeMiniChordMarkers(fallbackRepeatEnds, safeBarCount).forEach((barIndex) => {
    next[barIndex] = { ...(next[barIndex] ?? {}), repeatEnd: true };
  });

  Object.entries(marks && typeof marks === "object" ? marks : {}).forEach(([key, value]) => {
    const barIndex = Number(key);
    if (!Number.isInteger(barIndex) || barIndex < 0 || barIndex >= safeBarCount || !value || typeof value !== "object") {
      return;
    }
    const normalized = {};
    if (value.repeatStart) normalized.repeatStart = true;
    if (value.repeatEnd) normalized.repeatEnd = true;
    if (Number.isInteger(Number(value.ending)) && Number(value.ending) >= 1 && Number(value.ending) <= 5) {
      normalized.ending = Number(value.ending);
    }
    if (Object.keys(normalized).length > 0) next[barIndex] = { ...(next[barIndex] ?? {}), ...normalized };
  });

  return next;
}

function getMiniChordMarkersFromBarMarks(marks = {}, markerKey, barCount = 4) {
  const safeBarCount = normalizeMiniChordBarCount(barCount);
  return Object.entries(marks && typeof marks === "object" ? marks : {})
    .map(([key, value]) => ({ barIndex: Number(key), value }))
    .filter(({ barIndex, value }) => (
      Number.isInteger(barIndex)
      && barIndex >= 0
      && barIndex < safeBarCount
      && Boolean(value?.[markerKey])
    ))
    .map(({ barIndex }) => barIndex)
    .sort((a, b) => a - b);
}

function createDefaultMiniChordArrangement() {
  return {
    id: "draft",
    title: "내 미니코드",
    barCount: 4,
    slots: normalizeMiniChordSlots(["C", "", "Am", "", "F", "", "G", ""], 4),
    repeatStarts: [],
    repeatEnds: [],
    barMarks: {},
    bpm: 80,
    capo: 0,
    loop: true,
  };
}

function normalizeMiniChordArrangement(value = {}) {
  const fallback = createDefaultMiniChordArrangement();
  const barCount = normalizeMiniChordBarCount(value.barCount ?? fallback.barCount);
  const barMarks = normalizeMiniChordBarMarks(value.barMarks, barCount, value.repeatStarts, value.repeatEnds);
  return {
    id: String(value.id || `mini-${Date.now()}`),
    title: String(value.title || fallback.title).slice(0, 40),
    barCount,
    slots: normalizeMiniChordSlots(value.slots, barCount),
    repeatStarts: getMiniChordMarkersFromBarMarks(barMarks, "repeatStart", barCount),
    repeatEnds: getMiniChordMarkersFromBarMarks(barMarks, "repeatEnd", barCount),
    barMarks,
    bpm: clampBpm(value.bpm ?? fallback.bpm),
    capo: Math.max(0, Math.min(12, Number(value.capo) || 0)),
    loop: value.loop == null ? fallback.loop : Boolean(value.loop),
  };
}

function getStoredMiniChordArrangements() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MINI_CHORD_MAKER_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeMiniChordArrangement).slice(0, 24);
  } catch {
    return [];
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
  { name: "레벨 1", unlockAt: 0, poolRatio: 0.34, randomness: 0.28, jumpBias: 0.12 },
  { name: "레벨 2", unlockAt: 8, poolRatio: 0.55, randomness: 0.48, jumpBias: 0.28 },
  { name: "레벨 3", unlockAt: 20, poolRatio: 0.78, randomness: 0.66, jumpBias: 0.48 },
  { name: "레벨 4", unlockAt: 38, poolRatio: 1, randomness: 0.82, jumpBias: 0.66 },
  { name: "레벨 5", unlockAt: 62, poolRatio: 1, randomness: 0.94, jumpBias: 0.82 },
];
const SHOOTER_MAX_LIVES = 3;
const SHOOTER_DIFFICULTIES = {
  EASY: "easy",
  NORMAL: "normal",
  DIFFICULT: "difficult",
};
const SHOOTER_DIFFICULTY_OPTIONS = [
  { id: SHOOTER_DIFFICULTIES.EASY, label: "쉬움", hint: "7.2초 낙하 · 1.8초 생성" },
  { id: SHOOTER_DIFFICULTIES.NORMAL, label: "보통", hint: "5.8초 낙하 · 1.4초 생성" },
  { id: SHOOTER_DIFFICULTIES.DIFFICULT, label: "어려움", hint: "4.8초 낙하 · 1.1초 생성" },
];
const SHOOTER_DIFFICULTY_PACING = {
  [SHOOTER_DIFFICULTIES.EASY]: { durationMs: 7200, spawnGapMinMs: 1800, spawnGapMaxMs: 1800, maxTargets: 3 },
  [SHOOTER_DIFFICULTIES.NORMAL]: { durationMs: 5760, spawnGapMinMs: 1400, spawnGapMaxMs: 1400, maxTargets: 4 },
  [SHOOTER_DIFFICULTIES.DIFFICULT]: { durationMs: 4752, spawnGapMinMs: 1100, spawnGapMaxMs: 1100, maxTargets: 4 },
};
const SHOOTER_EASY_PHASES = [
  { label: "1~3프렛", minMs: 0, minSpawn: 0, minFret: 1, maxFret: 3, poolRatioCap: 0.48, randomnessBonus: -0.14, jumpBiasBonus: -0.12 },
  { label: "1~5프렛", minMs: 0, minSpawn: 8, minFret: 1, maxFret: 5, poolRatioCap: 0.62, randomnessBonus: -0.08, jumpBiasBonus: -0.06 },
  { label: "1~7프렛", minMs: 45_000, minSpawn: 18, minFret: 1, maxFret: 7, poolRatioCap: 0.76, randomnessBonus: -0.03, jumpBiasBonus: -0.02 },
  { label: "1~9프렛", minMs: 90_000, minSpawn: 30, minFret: 1, maxFret: 9, poolRatioCap: 0.9, randomnessBonus: 0.02, jumpBiasBonus: 0.02 },
  { label: "1~11프렛", minMs: 150_000, minSpawn: 44, minFret: 1, maxFret: 11, poolRatioCap: 1, randomnessBonus: 0.08, jumpBiasBonus: 0.06 },
];
const SHOOTER_NORMAL_MAX_FRET = 11;
const SHOOTER_ENEMY_ASSETS = {
  [SHOOTER_DIFFICULTIES.EASY]: "/images/shooter-monster-easy.svg",
  [SHOOTER_DIFFICULTIES.NORMAL]: "/images/shooter-monster-normal.svg",
  [SHOOTER_DIFFICULTIES.DIFFICULT]: "/images/shooter-monster-hard.svg",
};
const SHOOTER_RECORDS_STORAGE_KEY = "rifflabShooterRecords";
const SHOOTER_GUITAR_PIVOT_PERCENT = { x: 50, y: 91.5 };
const SHOOTER_GUITAR_AIM_LIMIT_DEG = 34;
const SHOOTER_GUITAR_AIM_MIN_DELTA_DEG = 0.18;

function getDefaultShooterDifficultyRecord() {
  return {
    bestScore: 0,
    bestCombo: 0,
  };
}

function getDefaultShooterRecords() {
  return {
    version: 1,
    best: {
      score: 0,
      combo: 0,
      kills: 0,
      survivalMs: 0,
      accuracy: 0,
    },
    totals: {
      plays: 0,
      playTimeMs: 0,
      kills: 0,
      shots: 0,
      hits: 0,
    },
    difficulty: Object.fromEntries(
      SHOOTER_DIFFICULTY_OPTIONS.map((option) => [option.id, getDefaultShooterDifficultyRecord()]),
    ),
    recent: [],
  };
}

function normalizeShooterRecords(records) {
  const fallback = getDefaultShooterRecords();
  const safeRecords = records && typeof records === "object" ? records : fallback;
  return {
    version: 1,
    best: {
      score: Math.max(0, Number(safeRecords.best?.score) || 0),
      combo: Math.max(0, Number(safeRecords.best?.combo) || 0),
      kills: Math.max(0, Number(safeRecords.best?.kills) || 0),
      survivalMs: Math.max(0, Number(safeRecords.best?.survivalMs) || 0),
      accuracy: Math.max(0, Math.min(100, Number(safeRecords.best?.accuracy) || 0)),
    },
    totals: {
      plays: Math.max(0, Number(safeRecords.totals?.plays) || 0),
      playTimeMs: Math.max(0, Number(safeRecords.totals?.playTimeMs) || 0),
      kills: Math.max(0, Number(safeRecords.totals?.kills) || 0),
      shots: Math.max(0, Number(safeRecords.totals?.shots) || 0),
      hits: Math.max(0, Number(safeRecords.totals?.hits) || 0),
    },
    difficulty: Object.fromEntries(
      SHOOTER_DIFFICULTY_OPTIONS.map((option) => [
        option.id,
        {
          ...fallback.difficulty[option.id],
          ...(safeRecords.difficulty?.[option.id] ?? {}),
        },
      ]),
    ),
    recent: Array.isArray(safeRecords.recent) ? safeRecords.recent.slice(0, 10) : [],
  };
}

const RecordService = {
  getShooterRecords() {
    if (typeof window === "undefined") return getDefaultShooterRecords();
    try {
      return normalizeShooterRecords(JSON.parse(window.localStorage.getItem(SHOOTER_RECORDS_STORAGE_KEY) ?? "null"));
    } catch {
      return getDefaultShooterRecords();
    }
  },
  saveShooterRecords(records) {
    const normalized = normalizeShooterRecords(records);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SHOOTER_RECORDS_STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  },
  addShooterSession(records, session) {
    const current = normalizeShooterRecords(records);
    const accuracy = Math.max(0, Math.min(100, Number(session.accuracy) || 0));
    const difficulty = SHOOTER_DIFFICULTY_OPTIONS.some((option) => option.id === session.difficulty)
      ? session.difficulty
      : SHOOTER_DIFFICULTIES.EASY;
    const difficultyRecord = current.difficulty[difficulty] ?? getDefaultShooterDifficultyRecord();
    const next = {
      ...current,
      best: {
        score: Math.max(current.best.score, session.score),
        combo: Math.max(current.best.combo, session.maxCombo),
        kills: Math.max(current.best.kills, session.kills),
        survivalMs: Math.max(current.best.survivalMs, session.survivalMs),
        accuracy: Math.max(current.best.accuracy, accuracy),
      },
      totals: {
        plays: current.totals.plays + 1,
        playTimeMs: current.totals.playTimeMs + session.survivalMs,
        kills: current.totals.kills + session.kills,
        shots: current.totals.shots + session.shots,
        hits: current.totals.hits + session.hits,
      },
      difficulty: {
        ...current.difficulty,
        [difficulty]: {
          bestScore: Math.max(Number(difficultyRecord.bestScore) || 0, session.score),
          bestCombo: Math.max(Number(difficultyRecord.bestCombo) || 0, session.maxCombo),
        },
      },
      recent: [
        {
          id: `shooter-${Date.now()}`,
          playedAt: Date.now(),
          difficulty,
          score: session.score,
          maxCombo: session.maxCombo,
          kills: session.kills,
          shots: session.shots,
          hits: session.hits,
          accuracy,
          survivalMs: session.survivalMs,
        },
        ...current.recent,
      ].slice(0, 10),
    };
    return this.saveShooterRecords(next);
  },
};

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

function getNoteColorStyle(noteName) {
  const color = NOTE_COLORS[noteName?.[0]] ?? NOTE_COLORS.C;
  return {
    "--note-fill": color.fill,
    "--note-text": color.text,
    "--note-glow": color.glow,
  };
}

function getShooterLevel(hitCount) {
  return [...SHOOTER_LEVELS].reverse().find((level) => hitCount >= level.unlockAt) ?? SHOOTER_LEVELS[0];
}

function getShooterDifficultyPhase(difficulty, elapsedMs = 0, spawnedCount = 0) {
  if (difficulty !== SHOOTER_DIFFICULTIES.EASY) {
    return SHOOTER_EASY_PHASES[SHOOTER_EASY_PHASES.length - 1];
  }
  return (
    [...SHOOTER_EASY_PHASES]
      .reverse()
      .find((phase) => elapsedMs >= phase.minMs || spawnedCount >= (phase.minSpawn ?? Number.POSITIVE_INFINITY)) ??
    SHOOTER_EASY_PHASES[0]
  );
}

function getShooterDifficultyPacing(difficulty) {
  return SHOOTER_DIFFICULTY_PACING[difficulty] ?? SHOOTER_DIFFICULTY_PACING[SHOOTER_DIFFICULTIES.EASY];
}

function getShooterTargetDuration(difficulty) {
  const pacing = getShooterDifficultyPacing(difficulty);
  if (pacing.durationMsMin && pacing.durationMsMax) {
    return pacing.durationMsMin + Math.random() * (pacing.durationMsMax - pacing.durationMsMin);
  }
  return pacing.durationMs;
}

function getShooterSpawnGap(difficulty) {
  const pacing = getShooterDifficultyPacing(difficulty);
  return pacing.spawnGapMinMs + Math.random() * (pacing.spawnGapMaxMs - pacing.spawnGapMinMs);
}

function getShooterEnemyAssetSrc(difficulty) {
  return SHOOTER_ENEMY_ASSETS[difficulty] ?? SHOOTER_ENEMY_ASSETS[SHOOTER_DIFFICULTIES.EASY];
}

function getShooterEnemyDifficultyClass(difficulty) {
  if (difficulty === SHOOTER_DIFFICULTIES.DIFFICULT) return "shooterEnemy--difficult";
  if (difficulty === SHOOTER_DIFFICULTIES.NORMAL) return "shooterEnemy--normal";
  return "shooterEnemy--easy";
}

function getShooterTargetYAt(target, now = 0) {
  if (!target) return 8;
  if (target.defeated) return Number(target.y) || 8;
  const duration = Math.max(1, Number(target.duration) || 1);
  const progress = Math.max(0, Math.min(1, (now - (Number(target.bornAt) || 0)) / duration));
  return 8 + progress * 80;
}

function getShooterHitboxContact(target, startX, startY, targetY) {
  const targetHitbox = target?.hitbox ?? SHOOTER_TARGET_HITBOX;
  const combinedRadiusX = (Number(targetHitbox.width) + SHOOTER_PROJECTILE_HITBOX.width) / 2;
  const combinedRadiusY = (Number(targetHitbox.height) + SHOOTER_PROJECTILE_HITBOX.height) / 2;
  const dx = startX - target.x;
  const dy = startY - targetY;
  const centerDistance = Math.hypot(dx, dy) || 1;
  const ellipseDistance = Math.sqrt((dx / combinedRadiusX) ** 2 + (dy / combinedRadiusY) ** 2) || 1;
  const edgeScale = Math.min(1, 1 / ellipseDistance);
  const contactX = target.x + dx * edgeScale;
  const contactY = targetY + dy * edgeScale;
  return {
    x: contactX,
    y: contactY,
    durationRatio: Math.max(0.36, Math.min(1, Math.hypot(startX - contactX, startY - contactY) / centerDistance)),
  };
}

function getShooterEffectiveLevel(level, difficulty, elapsedMs = 0) {
  const phase = getShooterDifficultyPhase(difficulty, elapsedMs);
  const pacing = getShooterDifficultyPacing(difficulty);
  if (difficulty === SHOOTER_DIFFICULTIES.NORMAL) {
    return {
      ...level,
      phaseLabel: "전 음역",
      maxTargets: pacing.maxTargets,
      poolRatio: 1,
      randomness: clampValue(Math.max(level.randomness, 0.74), 0.12, 1),
      jumpBias: clampValue(Math.max(level.jumpBias, 0.46), 0.04, 1),
    };
  }
  if (difficulty === SHOOTER_DIFFICULTIES.DIFFICULT) {
    return {
      ...level,
      phaseLabel: "전 음역 + 샵",
      maxTargets: pacing.maxTargets,
      poolRatio: 1,
      randomness: clampValue(Math.max(level.randomness, 0.86), 0.12, 1),
      jumpBias: clampValue(Math.max(level.jumpBias, 0.62), 0.04, 1),
    };
  }
  return {
    ...level,
    phaseLabel: phase.label,
    maxTargets: pacing.maxTargets,
    poolRatio: Math.min(phase.poolRatioCap, level.poolRatio),
    randomness: clampValue(level.randomness + phase.randomnessBonus, 0.12, 1),
    jumpBias: clampValue(level.jumpBias + phase.jumpBiasBonus, 0.04, 1),
  };
}

function uniqNotesByPitch(notes) {
  return [...notes]
    .filter((note, index, list) => note?.pitch && list.findIndex((item) => item.pitch === note.pitch) === index)
    .sort((a, b) => a.frequency - b.frequency || b.stringNumber - a.stringNumber || a.fretNumber - b.fretNumber);
}

function getShooterFretboardRangeNotes({ includeSharps = false, maxFret = SHOOTER_NORMAL_MAX_FRET, minFret = 0 } = {}) {
  const safeMinFret = Math.max(0, Number(minFret) || 0);
  const safeMaxFret = Math.max(safeMinFret, Math.min(MAX_FRETBOARD_GUIDE_FRET, Number(maxFret) || SHOOTER_NORMAL_MAX_FRET));
  const rangeNotes = STANDARD_TUNING.flatMap((tuning) => {
    const openMidi = pitchToMidi(tuning.pitch);
    if (openMidi == null) return [];
    return Array.from({ length: safeMaxFret - safeMinFret + 1 }, (_, index) => {
      const fretNumber = safeMinFret + index;
      const pitch = midiToPitch(openMidi + fretNumber);
      return makeGuitarNote({
        pitch,
        stringNumber: tuning.stringNumber,
        fretNumber,
        group: "shooter-range",
      });
    });
  }).filter((note) => (
    note.frequency
    && note.frequency <= MAX_FREQ
    && (includeSharps || !getPitchClass(note.pitch)?.includes("#"))
  ));
  return uniqNotesByPitch(rangeNotes);
}

function getShooterFullRangeNotes(includeSharps = false, maxFret = MAX_FRETBOARD_GUIDE_FRET) {
  const fullRangeNotes = getShooterFretboardRangeNotes({ includeSharps, maxFret, minFret: 0 });
  return fullRangeNotes.length ? fullRangeNotes : FIRST_POSITION_NOTES;
}

function getShooterPrimaryAimTarget(targets) {
  return [...(targets ?? [])]
    .filter((target) => target && !target.defeated && target.impactAt == null)
    .sort((a, b) => (b.y ?? 0) - (a.y ?? 0))[0] ?? null;
}

function getShooterDifficultyNotes(notes, difficulty, elapsedMs = 0, selectedBlock = null, spawnedCount = 0) {
  const phase = getShooterDifficultyPhase(difficulty, elapsedMs, spawnedCount);
  if (difficulty === SHOOTER_DIFFICULTIES.EASY) {
    const easyNotes = getShooterFretboardRangeNotes({
      includeSharps: false,
      minFret: phase.minFret ?? 1,
      maxFret: phase.maxFret,
    });
    return easyNotes.length
      ? easyNotes
      : FIRST_POSITION_NOTES.filter((note) => Number(note.fretNumber ?? 0) > 0 && !getPitchClass(note.pitch)?.includes("#"));
  }
  if (difficulty === SHOOTER_DIFFICULTIES.NORMAL) {
    return getShooterFullRangeNotes(false, SHOOTER_NORMAL_MAX_FRET);
  }
  if (difficulty === SHOOTER_DIFFICULTIES.DIFFICULT) {
    return getShooterFullRangeNotes(true, MAX_FRETBOARD_GUIDE_FRET);
  }
  const baseNotes = uniqNotesByPitch(notes?.length ? notes : FIRST_POSITION_NOTES);
  const lowPositionNotes = uniqNotesByPitch([...OPEN_STRING_NOTES, ...FIRST_POSITION_NOTES, ...baseNotes]);
  const phaseNotes = lowPositionNotes.filter((note) => Number(note.fretNumber ?? 0) <= phase.maxFret);
  return phaseNotes.length ? phaseNotes : OPEN_STRING_NOTES;
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
    const samePitchClassPenalty = getPitchClass(note.pitch) === getPitchClass(previousNote?.pitch) ? 0.58 : 1;
    const noteOctave = note.octave ?? getPitchOctave(note.pitch);
    const previousOctave = previousNote?.octave ?? getPitchOctave(previousNote?.pitch);
    const sameOctavePenalty = noteOctave != null && noteOctave === previousOctave ? 0.78 : 1.12;
    return {
      note,
      weight: (easyWeight * (1 - level.randomness) + jumpWeight * randomWeight) * samePitchClassPenalty * sameOctavePenalty,
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
  if (category?.id === "first-position" || category?.id === "scale-block" || category?.id === "rhythm") {
    return true;
  }
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
  const [helpGuideOpen, setHelpGuideOpen] = useState(false);
  const [openHelpSectionId, setOpenHelpSectionId] = useState("");
  const [appTheme, setAppTheme] = useState(getStoredAppTheme);
  const designLabEnabled = isDesignLabEnabled();
  const themeOptions = useMemo(() => getSelectableAppThemeOptions(), [designLabEnabled]);
  const themeMenuVisible = true;
  const miniChordMenuVisible = import.meta.env.DEV === true;
  const [designLabHeaderState, setDesignLabHeaderState] = useState(getStoredDesignLabHeaderState);
  const [designLabAppIconState, setDesignLabAppIconState] = useState(getStoredDesignLabAppIconState);
  const [designLabSection, setDesignLabSection] = useState("logo");
  const [logoPreviewScale, setLogoPreviewScale] = useState(100);
  const [metronomeVisualLabMode, setMetronomeVisualLabMode] = useState("circle");
  const [metronomeDisplayMode, setMetronomeDisplayMode] = useState(getStoredMetronomeDisplayMode);
  const [metronomeModeSwipeOffset, setMetronomeModeSwipeOffset] = useState(0);
  const [metronomeModeSwipeActive, setMetronomeModeSwipeActive] = useState(false);
  const [metronomeVisualLabTimeSignature, setMetronomeVisualLabTimeSignature] = useState("4/4");
  const [metronomeVisualLabPlaying, setMetronomeVisualLabPlaying] = useState(false);
  const [metronomeVisualLabBeat, setMetronomeVisualLabBeat] = useState(0);
  const [svgLogoLabState, setSvgLogoLabState] = useState(getStoredSvgLogoLabState);
  const [svgLogoPreviewId, setSvgLogoPreviewId] = useState(() => getStoredSvgLogoLabState().activeLogo);
  const [selectedHeaderCandidateId, setSelectedHeaderCandidateId] = useState(getStoredDesignLabHeaderState().activeHeader);
  const [selectedAppIconCandidateId, setSelectedAppIconCandidateId] = useState(getStoredDesignLabAppIconState().activeIcon);
  const [selectedGuitarVariantId, setSelectedGuitarVariantId] = useState(getStoredGuitarLabVariantId);
  const [shooterPlayerSlots, setShooterPlayerSlots] = useState(getStoredShooterPlayerSlots);
  const [guitarLabDeletedIds, setGuitarLabDeletedIds] = useState(getStoredGuitarLabDeletedIds);
  const [guitarLabPurgedIds, setGuitarLabPurgedIds] = useState(getStoredGuitarLabPurgedIds);
  const [guitarLabSelectedDeleteIds, setGuitarLabSelectedDeleteIds] = useState([]);
  const [shooterGuitarPickerOpen, setShooterGuitarPickerOpen] = useState(false);
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
  const [viewerMode, setViewerMode] = useState(FRETBOARD_VIEWER_MODES.CHORD);
  const [viewerSwipeFeedback, setViewerSwipeFeedback] = useState("");
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
  const [stage3ChordIds, setStage3ChordIds] = useState(initialStage3SettingsRef.current.chordIds);
  const [stage3QuickSlots, setStage3QuickSlots] = useState(initialStage3QuickSlotsRef.current);
  const [loadedStage3LibraryItem, setLoadedStage3LibraryItem] = useState(
    [...getStage3RecommendedSlots(), ...initialStage3QuickSlotsRef.current]
      .find((slot) => `slot:${slot.id}` === initialStage3SettingsRef.current.chordProgressionId) ?? null,
  );
  const [stage3RecommendedSelectValue, setStage3RecommendedSelectValue] = useState("");
  const [stage3StorageOpen, setStage3StorageOpen] = useState(false);
  const [stage3StorageSwipeOffset, setStage3StorageSwipeOffset] = useState(0);
  const [stage3StorageSwipeActive, setStage3StorageSwipeActive] = useState(false);
  const [stage3StorageSelectedId, setStage3StorageSelectedId] = useState(initialStage3QuickSlotsRef.current[0]?.id ?? "");
  const [stage3StorageTitle, setStage3StorageTitle] = useState("내 진행");
  const [stage3StorageMemo, setStage3StorageMemo] = useState("");
  const [stage3StorageEditingId, setStage3StorageEditingId] = useState("");
  const [stage3StorageChordBaseRoot, setStage3StorageChordBaseRoot] = useState("C");
  const [stage3StorageChordAccidental, setStage3StorageChordAccidental] = useState("natural");
  const [stage3StorageChordRoot, setStage3StorageChordRoot] = useState("C");
  const [stage3StorageChordQuality, setStage3StorageChordQuality] = useState("major");
  const [stage3StorageChordExtension, setStage3StorageChordExtension] = useState("none");
  const [stage3StorageChordIds, setStage3StorageChordIds] = useState(initialStage3SettingsRef.current.chordIds);
  const [stage3StorageBpm, setStage3StorageBpm] = useState(initialStage3SettingsRef.current.bpm);
  const [stage3StorageTimeSignature, setStage3StorageTimeSignature] = useState("4/4");
  const [stage3StorageCapo, setStage3StorageCapo] = useState(0);
  const [stage3StorageStrumPattern, setStage3StorageStrumPattern] = useState([]);
  const [stage3StorageStrumDraftPattern, setStage3StorageStrumDraftPattern] = useState([]);
  const stage3StorageStrumPatternRef = useRef([]);
  const [stage3LiveStrumPattern, setStage3LiveStrumPattern] = useState([]);
  const [chordPracticeIndex, setChordPracticeIndex] = useState(0);
  const [repeatPractice, setRepeatPractice] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [bpm, setBpm] = useState(initialStage3SettingsRef.current.bpm);
  const [metronomeOn, setMetronomeOn] = useState(true);
  const [metronomeTimeSignature, setMetronomeTimeSignature] = useState("4/4");
  const [metronomeAccent, setMetronomeAccent] = useState(true);
  const [metronomeSubdivision, setMetronomeSubdivision] = useState("quarter");
  const [metronomeTone, setMetronomeTone] = useState("tick");
  const [metronomeAccentTone, setMetronomeAccentTone] = useState("kick");
  const [metronomeWeakTone, setMetronomeWeakTone] = useState("rim");
  const [metronomeCountIn, setMetronomeCountIn] = useState(false);
  const [metronomeCountInBars, setMetronomeCountInBars] = useState(0);
  const [metronomeCountInVoiceMode, setMetronomeCountInVoiceMode] = useState("female");
  const [backingDrumEnabled, setBackingDrumEnabled] = useState(true);
  const [backingBassEnabled, setBackingBassEnabled] = useState(true);
  const [backingPianoEnabled, setBackingPianoEnabled] = useState(true);
  const [backingDrumVolume, setBackingDrumVolume] = useState(BACKING_DEFAULT_PART_VOLUMES.drum);
  const [backingBassVolume, setBackingBassVolume] = useState(BACKING_DEFAULT_PART_VOLUMES.bass);
  const [backingPianoVolume, setBackingPianoVolume] = useState(BACKING_DEFAULT_PART_VOLUMES.piano);
  const [backingRhythmPattern, setBackingRhythmPattern] = useState(STAGE3_DEFAULT_BACKING_SETTINGS.rhythmPattern);
  const [backingBassBeat, setBackingBassBeat] = useState(STAGE3_DEFAULT_BACKING_SETTINGS.bassBeat);
  const [backingPianoBeat, setBackingPianoBeat] = useState(STAGE3_DEFAULT_BACKING_SETTINGS.pianoBeat);
  const [stage3BackingPrepareStatus, setStage3BackingPrepareStatus] = useState("idle");
  const initialMiniChordArrangementRef = useRef(createDefaultMiniChordArrangement());
  const [miniChordSavedItems, setMiniChordSavedItems] = useState(getStoredMiniChordArrangements);
  const [miniChordTitle, setMiniChordTitle] = useState(initialMiniChordArrangementRef.current.title);
  const [miniChordBarCount, setMiniChordBarCount] = useState(initialMiniChordArrangementRef.current.barCount);
  const [miniChordSlots, setMiniChordSlots] = useState(initialMiniChordArrangementRef.current.slots);
  const [miniChordRepeatStarts, setMiniChordRepeatStarts] = useState(initialMiniChordArrangementRef.current.repeatStarts);
  const [miniChordRepeatEnds, setMiniChordRepeatEnds] = useState(initialMiniChordArrangementRef.current.repeatEnds);
  const [miniChordBarMarks, setMiniChordBarMarks] = useState(initialMiniChordArrangementRef.current.barMarks);
  const [miniChordBpm, setMiniChordBpm] = useState(initialMiniChordArrangementRef.current.bpm);
  const [miniChordCapo, setMiniChordCapo] = useState(initialMiniChordArrangementRef.current.capo);
  const [miniChordLoop, setMiniChordLoop] = useState(initialMiniChordArrangementRef.current.loop);
  const [miniChordActiveSlot, setMiniChordActiveSlot] = useState(0);
  const [miniChordActiveBarIndex, setMiniChordActiveBarIndex] = useState(null);
  const [miniChordChordPickerSlot, setMiniChordChordPickerSlot] = useState(null);
  const [miniChordEndingPopoverPosition, setMiniChordEndingPopoverPosition] = useState(null);
  const [miniChordChordPickerPosition, setMiniChordChordPickerPosition] = useState(null);
  const [miniChordPickerAccidental, setMiniChordPickerAccidental] = useState("sharp");
  const [miniChordPickerQuality, setMiniChordPickerQuality] = useState("major");
  const [miniChordPickerExtension, setMiniChordPickerExtension] = useState("triad");
  const [miniChordPlayhead, setMiniChordPlayhead] = useState(null);
  const [miniChordIsPlaying, setMiniChordIsPlaying] = useState(false);
  const [miniChordPageIndex, setMiniChordPageIndex] = useState(0);
  const [metronomeRepeat, setMetronomeRepeat] = useState(false);
  const [autoBpmMode, setAutoBpmMode] = useState("off");
  const [autoBpmDirection, setAutoBpmDirection] = useState("increase");
  const [autoBpmEnabled, setAutoBpmEnabled] = useState(false);
  const [autoBpmStep, setAutoBpmStep] = useState(1);
  const [autoBpmBars, setAutoBpmBars] = useState(50);
  const [autoBpmTimeMinutes, setAutoBpmTimeMinutes] = useState(AUTOMATOR_TIME_MINUTE_MIN);
  const [autoBpmTimeSeconds, setAutoBpmTimeSeconds] = useState(30);
  const [autoBpmIncrements, setAutoBpmIncrements] = useState(0);
  const [coachModeEnabled, setCoachModeEnabled] = useState(false);
  const [coachPlayBars, setCoachPlayBars] = useState(4);
  const [coachMuteBars, setCoachMuteBars] = useState(4);
  const [metronomeAdvancedPanel, setMetronomeAdvancedPanel] = useState("");
  const initialMetronomeTrackerProgressRef = useRef(getStoredMetronomeTrackerProgress());
  const [metronomeTrackerMode, setMetronomeTrackerMode] = useState(initialMetronomeTrackerProgressRef.current.trackerMode);
  const [metronomeBarLimitEnabled, setMetronomeBarLimitEnabled] = useState(initialMetronomeTrackerProgressRef.current.barLimitEnabled);
  const [metronomeBarLimit, setMetronomeBarLimit] = useState(initialMetronomeTrackerProgressRef.current.barLimit);
  const [metronomeBarLimitDraft, setMetronomeBarLimitDraft] = useState(String(initialMetronomeTrackerProgressRef.current.barLimit));
  const [metronomeBarStopWhenReached, setMetronomeBarStopWhenReached] = useState(false);
  const [metronomeBarResetWhenReached, setMetronomeBarResetWhenReached] = useState(false);
  const [metronomeBarStartFromOne, setMetronomeBarStartFromOne] = useState(true);
  const [metronomeTimerCountdown, setMetronomeTimerCountdown] = useState(false);
  const [metronomeTimerStopWhenReached, setMetronomeTimerStopWhenReached] = useState(false);
  const [metronomeTimerResetWhenReached, setMetronomeTimerResetWhenReached] = useState(false);
  const [metronomeTrackerTimerMinutes, setMetronomeTrackerTimerMinutes] = useState(initialMetronomeTrackerProgressRef.current.trackerTimerMinutes);
  const [metronomeTrackerTimerSeconds, setMetronomeTrackerTimerSeconds] = useState(initialMetronomeTrackerProgressRef.current.trackerTimerSeconds);
  const autoBpmTimeDraftRef = useRef({ minutes: autoBpmTimeMinutes, seconds: autoBpmTimeSeconds });
  const metronomeTrackerTimerDraftRef = useRef({
    minutes: metronomeTrackerTimerMinutes,
    seconds: metronomeTrackerTimerSeconds,
  });
  const [metronomeMeasureCount, setMetronomeMeasureCount] = useState(initialMetronomeTrackerProgressRef.current.measureCount);
  const [metronomeTrackerElapsedMs, setMetronomeTrackerElapsedMs] = useState(initialMetronomeTrackerProgressRef.current.trackerElapsedMs);
  const [metronomeIsMutedCycle, setMetronomeIsMutedCycle] = useState(false);
  const [metronomeBeatPattern, setMetronomeBeatPattern] = useState(() => normalizeMetronomeBeatPattern([], 4));
  const [metronomePresetName, setMetronomePresetName] = useState(METRONOME_PRESET_DEFAULT_NAME);
  const [metronomePresetSelectedId, setMetronomePresetSelectedId] = useState("");
  const [metronomePresets, setMetronomePresets] = useState(getStoredMetronomePresets);
  const [feelRecorderActive, setFeelRecorderActive] = useState(false);
  const [feelRecorderEvents, setFeelRecorderEvents] = useState([]);
  const [feelPatternName, setFeelPatternName] = useState(FEEL_RECORDER_DEFAULT_NAME);
  const [savedFeelPatterns, setSavedFeelPatterns] = useState(getStoredFeelRecorderPatterns);
  const [feelPlaybackActive, setFeelPlaybackActive] = useState(false);
  const [feelPlaybackLoop, setFeelPlaybackLoop] = useState(true);
  const [feelPlaybackIndex, setFeelPlaybackIndex] = useState(-1);
  const [feelPlaybackProgress, setFeelPlaybackProgress] = useState(0);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [hitZoneNote, setHitZoneNote] = useState(null);
  const [isHitWindowActive, setIsHitWindowActive] = useState(false);
  const [shooterTargets, setShooterTargets] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [shooterBreakEffects, setShooterBreakEffects] = useState([]);
  const [shooterAim, setShooterAim] = useState(undefined);
  const [showShooterFretGuide, setShowShooterFretGuide] = useState(true);
  const [shooterSoundOn, setShooterSoundOn] = useState(true);
  const [shooterDifficulty, setShooterDifficulty] = useState(SHOOTER_DIFFICULTIES.EASY);
  const [shooterGuitarRarityFilter, setShooterGuitarRarityFilter] = useState(SHOOTER_GUITAR_RARITIES.NORMAL);
  const [shooterRecords, setShooterRecords] = useState(() => RecordService.getShooterRecords());
  const [showShooterRecords, setShowShooterRecords] = useState(false);
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
  const selectedGuitarVariant = useMemo(
    () =>
      GUITAR_LAB_VARIANTS.find((variant) => variant.id === selectedGuitarVariantId && !guitarLabPurgedIds.includes(variant.id))
      ?? GUITAR_LAB_VARIANTS.find((variant) => !guitarLabPurgedIds.includes(variant.id))
      ?? GUITAR_LAB_VARIANTS[0],
    [guitarLabPurgedIds, selectedGuitarVariantId],
  );
  const assignedGuitarVariantIds = useMemo(
    () => new Set(Object.values(shooterPlayerSlots).filter((variantId) => GUITAR_LAB_VARIANT_IDS.has(variantId))),
    [shooterPlayerSlots],
  );
  const visibleGuitarLabVariants = useMemo(
    () => {
      const protectedIds = new Set([...assignedGuitarVariantIds, selectedGuitarVariantId]);
      return GUITAR_LAB_VARIANTS.filter((variant) => {
        if (guitarLabDeletedIds.includes(variant.id) || guitarLabPurgedIds.includes(variant.id)) return false;
        if (protectedIds.has(variant.id)) return true;
        return variant.pack === "Electric" || FRESH_ACOUSTIC_GUITAR_IDS.has(variant.id);
      });
    },
    [assignedGuitarVariantIds, guitarLabDeletedIds, guitarLabPurgedIds, selectedGuitarVariantId],
  );
  const archivedGuitarLabVariants = useMemo(
    () => GUITAR_LAB_VARIANTS.filter((variant) => guitarLabDeletedIds.includes(variant.id) && !guitarLabPurgedIds.includes(variant.id)),
    [guitarLabDeletedIds, guitarLabPurgedIds],
  );
  const shooterPlayerOptions = useMemo(() => {
    const rarityCandidates = SHOOTER_RARITY_GUITAR_VARIANT_IDS.map((variantId) => {
      const variant = GUITAR_LAB_VARIANTS.find((item) => item.id === variantId);
      if (!variant || getShooterGuitarRarityId(variant.id) !== shooterGuitarRarityFilter) return null;
      return {
        slotKey: `rarity-candidate-${variant.id}`,
        variant,
      };
    }).filter(Boolean);
    return rarityCandidates;
  }, [shooterGuitarRarityFilter]);
  const visibleSvgLogoCandidates = useMemo(
    () => SVG_LOGO_LAB_CANDIDATES.filter((candidate) => !svgLogoLabState.deletedLogos.includes(candidate.id)),
    [svgLogoLabState.deletedLogos],
  );
  const svgLogoPreviewCandidate = useMemo(
    () =>
      SVG_LOGO_LAB_CANDIDATES.find((candidate) => candidate.id === svgLogoPreviewId)
      ?? SVG_LOGO_LAB_CANDIDATES.find((candidate) => candidate.id === svgLogoLabState.activeLogo)
      ?? SVG_LOGO_LAB_CANDIDATES[0],
    [svgLogoLabState.activeLogo, svgLogoPreviewId],
  );
  const logoPreviewStyle = useMemo(
    () => ({ "--logo-preview-scale": logoPreviewScale / 100 }),
    [logoPreviewScale],
  );

  const updateSvgLogoLabState = useCallback((updater) => {
    setSvgLogoLabState((current) => {
      const next = normalizeSvgLogoLabState(typeof updater === "function" ? updater(current) : updater);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SVG_LOGO_LAB_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const selectSvgLogoCandidate = useCallback((candidateId) => {
    updateSvgLogoLabState((current) => ({
      ...current,
      activeLogo: candidateId,
      deletedLogos: current.deletedLogos.filter((id) => id !== candidateId),
    }));
    setSvgLogoPreviewId(candidateId);
  }, [updateSvgLogoLabState]);

  const deleteSvgLogoCandidate = useCallback((candidateId) => {
    if (candidateId === svgLogoLabState.activeLogo) {
      window.alert?.("현재 선택된 SVG 로고는 삭제할 수 없습니다.");
      return;
    }
    updateSvgLogoLabState((current) => ({
      ...current,
      deletedLogos: current.deletedLogos.includes(candidateId)
        ? current.deletedLogos
        : [...current.deletedLogos, candidateId],
    }));
    if (svgLogoPreviewId === candidateId) {
      setSvgLogoPreviewId(svgLogoLabState.activeLogo);
    }
  }, [svgLogoLabState.activeLogo, svgLogoPreviewId, updateSvgLogoLabState]);

  const applyGuitarVariant = useCallback((variantId) => {
    if (!GUITAR_LAB_VARIANT_IDS.has(variantId)) return;
    if (guitarLabPurgedIds.includes(variantId)) return;
    setSelectedGuitarVariantId(variantId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SHOOTER_GUITAR_STORAGE_KEY, variantId);
      window.localStorage.setItem(SHOOTER_PLAYER_STORAGE_KEY, variantId);
      window.localStorage.setItem(GUITAR_LAB_STORAGE_KEY, variantId);
    }
  }, [guitarLabPurgedIds]);

  const persistGuitarLabDeletedIds = useCallback((nextIds) => {
    const normalized = normalizeGuitarLabVariantIds(nextIds).filter((id) => !guitarLabPurgedIds.includes(id));
    setGuitarLabDeletedIds(normalized);
    setGuitarLabSelectedDeleteIds((current) => current.filter((id) => !normalized.includes(id)));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GUITAR_LAB_DELETED_STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  }, [guitarLabPurgedIds]);

  const persistGuitarLabPurgedIds = useCallback((nextIds) => {
    const normalized = normalizeGuitarLabVariantIds(nextIds);
    setGuitarLabPurgedIds(normalized);
    setGuitarLabDeletedIds((current) => {
      const archived = current.filter((id) => !normalized.includes(id));
      if (typeof window !== "undefined") {
        window.localStorage.setItem(GUITAR_LAB_DELETED_STORAGE_KEY, JSON.stringify(archived));
      }
      return archived;
    });
    setGuitarLabSelectedDeleteIds((current) => current.filter((id) => !normalized.includes(id)));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GUITAR_LAB_PURGED_STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  }, []);

  useEffect(() => {
    const restoredIds = guitarLabPurgedIds.filter((id) => !SHOOTER_RARITY_GUITAR_VARIANT_IDS.includes(id));
    if (restoredIds.length === guitarLabPurgedIds.length) return;
    persistGuitarLabPurgedIds(restoredIds);
  }, [guitarLabPurgedIds, persistGuitarLabPurgedIds]);

  useEffect(() => {
    const protectedIds = new Set([...assignedGuitarVariantIds, selectedGuitarVariantId]);
    const obsoleteIds = GUITAR_LAB_VARIANTS
      .filter((variant) => {
        if (protectedIds.has(variant.id)) return false;
        if (variant.pack === "Electric") return false;
        if (FRESH_ACOUSTIC_GUITAR_IDS.has(variant.id)) return false;
        return true;
      })
      .map((variant) => variant.id);
    const nextPurgedIds = Array.from(new Set([...guitarLabPurgedIds, ...obsoleteIds]));
    if (nextPurgedIds.length === guitarLabPurgedIds.length) return;
    persistGuitarLabPurgedIds(nextPurgedIds);
  }, [assignedGuitarVariantIds, guitarLabPurgedIds, persistGuitarLabPurgedIds, selectedGuitarVariantId]);

  const deleteGuitarLabVariant = useCallback((variantId) => {
    if (!GUITAR_LAB_VARIANT_IDS.has(variantId)) return;
    if (assignedGuitarVariantIds.has(variantId) || selectedGuitarVariantId === variantId) {
      window.alert?.("현재 적용 중이거나 슈팅게임 슬롯에 저장된 기타는 삭제할 수 없습니다.");
      return;
    }
    if (!window.confirm?.("삭제하시겠습니까?\n삭제한 디자인은 아카이브(휴지통)로 이동합니다.")) return;
    persistGuitarLabDeletedIds([...guitarLabDeletedIds, variantId]);
  }, [assignedGuitarVariantIds, guitarLabDeletedIds, persistGuitarLabDeletedIds, selectedGuitarVariantId]);

  const toggleGuitarLabDeleteSelection = useCallback((variantId) => {
    if (!GUITAR_LAB_VARIANT_IDS.has(variantId)) return;
    if (assignedGuitarVariantIds.has(variantId) || selectedGuitarVariantId === variantId) return;
    setGuitarLabSelectedDeleteIds((current) => (
      current.includes(variantId)
        ? current.filter((id) => id !== variantId)
        : [...current, variantId]
    ));
  }, [assignedGuitarVariantIds, selectedGuitarVariantId]);

  const deleteSelectedGuitarLabVariants = useCallback(() => {
    const deletableIds = guitarLabSelectedDeleteIds.filter(
      (variantId) => !assignedGuitarVariantIds.has(variantId) && selectedGuitarVariantId !== variantId,
    );
    if (!deletableIds.length) return;
    if (!window.confirm?.("선택한 디자인을 삭제하시겠습니까?\n삭제한 디자인은 아카이브(휴지통)로 이동합니다.")) return;
    persistGuitarLabDeletedIds([...guitarLabDeletedIds, ...deletableIds]);
  }, [assignedGuitarVariantIds, guitarLabDeletedIds, guitarLabSelectedDeleteIds, persistGuitarLabDeletedIds, selectedGuitarVariantId]);

  const deleteAllGuitarLabVariants = useCallback(() => {
    const deletableIds = visibleGuitarLabVariants
      .map((variant) => variant.id)
      .filter((variantId) => !assignedGuitarVariantIds.has(variantId) && selectedGuitarVariantId !== variantId);
    if (!deletableIds.length) return;
    if (!window.confirm?.("전체 디자인을 삭제하시겠습니까?\n적용 중인 디자인과 슈팅게임 슬롯에 저장된 디자인은 유지됩니다.")) return;
    persistGuitarLabDeletedIds([...guitarLabDeletedIds, ...deletableIds]);
  }, [assignedGuitarVariantIds, guitarLabDeletedIds, persistGuitarLabDeletedIds, selectedGuitarVariantId, visibleGuitarLabVariants]);

  const restoreGuitarLabVariant = useCallback((variantId) => {
    if (!GUITAR_LAB_VARIANT_IDS.has(variantId)) return;
    persistGuitarLabDeletedIds(guitarLabDeletedIds.filter((id) => id !== variantId));
  }, [guitarLabDeletedIds, persistGuitarLabDeletedIds]);

  const permanentlyDeleteGuitarLabVariant = useCallback((variantId) => {
    if (!GUITAR_LAB_VARIANT_IDS.has(variantId)) return;
    if (!window.confirm?.("영구 삭제하시겠습니까?\n이 작업은 복원할 수 없습니다.")) return;
    persistGuitarLabPurgedIds([...guitarLabPurgedIds, variantId]);
  }, [guitarLabPurgedIds, persistGuitarLabPurgedIds]);

  const emptyGuitarLabArchive = useCallback(() => {
    const archiveIds = archivedGuitarLabVariants.map((variant) => variant.id);
    if (!archiveIds.length) return;
    if (!window.confirm?.("휴지통을 비우고 영구 삭제하시겠습니까?\n이 작업은 복원할 수 없습니다.")) return;
    persistGuitarLabPurgedIds([...guitarLabPurgedIds, ...archiveIds]);
  }, [archivedGuitarLabVariants, guitarLabPurgedIds, persistGuitarLabPurgedIds]);

  const openGuitarLabArchive = useCallback(() => {
    setDesignLabSection("archive");
  }, []);

  const showGuitarLabArchiveButton = useMemo(
    () => archivedGuitarLabVariants.length > 0,
    [archivedGuitarLabVariants.length],
  );

  const getDesignLabSectionLabel = useCallback((section) => (
    section.id === "archive" ? `아카이브 (${archivedGuitarLabVariants.length})` : section.label
  ), [archivedGuitarLabVariants.length]);

  const selectedDesignLabSectionLabel = useMemo(
    () => getDesignLabSectionLabel(DESIGN_LAB_SECTIONS.find((section) => section.id === designLabSection) ?? DESIGN_LAB_SECTIONS[0]),
    [designLabSection, getDesignLabSectionLabel],
  );

  useEffect(() => {
    if (DESIGN_LAB_SECTIONS.some((section) => section.id === designLabSection)) return;
    setDesignLabSection("logo");
  }, [designLabSection]);

  const saveGuitarToShooterSlot = useCallback((variantId, slotKey) => {
    if (!GUITAR_LAB_VARIANT_IDS.has(variantId) || !SHOOTER_PLAYER_SLOT_KEYS.includes(slotKey)) return;
    if (guitarLabPurgedIds.includes(variantId)) return;
    setShooterPlayerSlots((current) => {
      const next = { ...current, [slotKey]: variantId };
      const normalized = normalizeShooterPlayerSlots(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SHOOTER_PLAYER_SLOTS_STORAGE_KEY, JSON.stringify(normalized));
      }
      return normalized;
    });
  }, [guitarLabPurgedIds]);

  useEffect(() => {
    if (shooterPlayerOptions.some((option) => option.variant.id === selectedGuitarVariantId)) return;
    applyGuitarVariant(shooterPlayerOptions[0]?.variant.id ?? DEFAULT_GUITAR_LAB_VARIANT_ID);
  }, [applyGuitarVariant, shooterPlayerOptions, selectedGuitarVariantId]);

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
  const metronomeMasterGainRef = useRef(null);
  const metronomeAccentGainRef = useRef(null);
  const metronomeWeakGainRef = useRef(null);
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
  const metronomeAccentToneRef = useRef("kick");
  const metronomeWeakToneRef = useRef("rim");
  const metronomeCountInRef = useRef(false);
  const metronomeCountInBarsRef = useRef(0);
  const metronomeCountInVoiceModeRef = useRef("female");
  const metronomeVolumeRef = useRef(0.72);
  const metronomeBeatPatternRef = useRef(normalizeMetronomeBeatPattern([], 4));
  const activeMetronomeScopeRef = useRef(
    initialRouteRef.current.appMode === APP_MODES.METRONOME
      ? METRONOME_SETTING_SCOPES.STANDALONE
      : initialRouteRef.current.categoryId === "scale-block"
        ? METRONOME_SETTING_SCOPES.STAGE2
        : initialRouteRef.current.categoryId === "rhythm"
          ? METRONOME_SETTING_SCOPES.STAGE3
          : METRONOME_SETTING_SCOPES.STAGE1,
  );
  const scopedMetronomeSettingsRef = useRef({
    [METRONOME_SETTING_SCOPES.STANDALONE]: createDefaultMetronomeSettings(),
    [METRONOME_SETTING_SCOPES.STAGE1]: createDefaultMetronomeSettings(),
    [METRONOME_SETTING_SCOPES.STAGE2]: createDefaultMetronomeSettings(),
    [METRONOME_SETTING_SCOPES.STAGE3]: createDefaultMetronomeSettings(),
  });
  const metronomeVisualLabBeatRef = useRef(0);
  const metronomeVisualLabTimerRef = useRef(null);
  const autoBpmModeRef = useRef("off");
  const autoBpmDirectionRef = useRef("increase");
  const autoBpmEnabledRef = useRef(false);
  const autoBpmStepRef = useRef(1);
  const autoBpmBarsRef = useRef(50);
  const autoBpmTimeMsRef = useRef(30000);
  const coachModeEnabledRef = useRef(false);
  const coachPlayBarsRef = useRef(4);
  const coachMuteBarsRef = useRef(4);
  const metronomeTrackerModeRef = useRef(initialMetronomeTrackerProgressRef.current.trackerMode);
  const metronomeTrackerBaseBarsRef = useRef(initialMetronomeTrackerProgressRef.current.measureCount);
  const metronomeTrackerBaseElapsedMsRef = useRef(initialMetronomeTrackerProgressRef.current.trackerElapsedMs);
  const metronomeTrackerElapsedUpdateRef = useRef(0);
  const metronomeBarLimitEnabledRef = useRef(initialMetronomeTrackerProgressRef.current.barLimitEnabled);
  const backingSampleBuffersRef = useRef({});
  const backingSampleLoadPromiseRef = useRef(null);
  const backingMasterGainRef = useRef(null);
  const backingLimiterRef = useRef(null);
  const backingDrumGainRef = useRef(null);
  const backingBassGainRef = useRef(null);
  const backingPianoGainRef = useRef(null);
  const backingActiveSourcesRef = useRef(new Set());
  const backingSchedulerTimerRef = useRef(null);
  const backingSchedulerRunningRef = useRef(false);
  const backingNextBeatTimeRef = useRef(0);
  const backingNextBeatIndexRef = useRef(0);
  const backingPreparedSessionRef = useRef(null);
  const backingPreparedSessionKeyRef = useRef("");
  const backingPendingSessionRef = useRef(null);
  const backingPendingSessionKeyRef = useRef("");
  const backingNextEventIndexRef = useRef(0);
  const backingCycleStartTimeRef = useRef(0);
  const backingDisplayStartTimeRef = useRef(0);
  const backingPrepareTokenRef = useRef(0);
  const backingEngineReadyRef = useRef(false);
  const backingEngineLoadPromiseRef = useRef(null);
  const backingCompiledPatternCacheRef = useRef({});
  const coreAudioWarmReadyRef = useRef(false);
  const coreAudioWarmPromiseRef = useRef(null);
  const lastStage3ProgressUiAtRef = useRef(0);
  const miniChordPlayTimerRef = useRef(null);
  const backingDrumEnabledRef = useRef(true);
  const backingBassEnabledRef = useRef(true);
  const backingPianoEnabledRef = useRef(true);
  const backingDrumVolumeRef = useRef(BACKING_DEFAULT_PART_VOLUMES.drum);
  const backingBassVolumeRef = useRef(BACKING_DEFAULT_PART_VOLUMES.bass);
  const backingPianoVolumeRef = useRef(BACKING_DEFAULT_PART_VOLUMES.piano);
  const backingRhythmPatternRef = useRef(STAGE3_DEFAULT_BACKING_SETTINGS.rhythmPattern);
  const backingBassBeatRef = useRef(STAGE3_DEFAULT_BACKING_SETTINGS.bassBeat);
  const backingPianoBeatRef = useRef(STAGE3_DEFAULT_BACKING_SETTINGS.pianoBeat);
  const metronomeBarLimitRef = useRef(initialMetronomeTrackerProgressRef.current.barLimit);
  const metronomeBarStopWhenReachedRef = useRef(false);
  const metronomeBarResetWhenReachedRef = useRef(false);
  const metronomeTimerStopWhenReachedRef = useRef(false);
  const metronomeTimerResetWhenReachedRef = useRef(false);
  const metronomeTrackerTimerTotalMsRef = useRef(0);
  const metronomeTrackerStorageTimerRef = useRef(null);
  const lastAutoBpmMeasureRef = useRef(0);
  const lastAutoBpmTimeRef = useRef(0);
  const tapTempoTimesRef = useRef([]);
  const bpmSwipeStartRef = useRef(null);
  const bpmSwipeFrameRef = useRef(null);
  const bpmSwipePreviewValueRef = useRef(DEFAULT_BPM);
  const metronomeModeSwipeStartRef = useRef(null);
  const metronomeModeSwipeChangedAtRef = useRef(0);
  const fretboardSwipeStartRef = useRef(null);
  const fretboardSwipeFeedbackTimerRef = useRef(null);
  const stage3StorageSwipeStartRef = useRef(null);
  const stage3StorageOpenRef = useRef(false);
  const feelRecordingStartRef = useRef(0);
  const feelPressStartRef = useRef(0);
  const feelLastReleaseRef = useRef(0);
  const feelPlaybackTimersRef = useRef([]);
  const feelPlaybackLoopRef = useRef(true);
  const metronomeDialClickLastAtRef = useRef(0);
  const metronomeSampleBuffersRef = useRef({});
  const metronomeSampleFailedIdsRef = useRef(new Set());
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
  const shooterBreakEffectsRef = useRef([]);
  const shooterArenaRef = useRef(null);
  const shooterGuitarPlayerRef = useRef(null);
  const shooterTargetNodesRef = useRef(new Map());
  const projectileNodesRef = useRef(new Map());
  const shooterTargetIdRef = useRef(1);
  const projectileIdRef = useRef(1);
  const shooterBreakEffectIdRef = useRef(1);
  const shooterNextSpawnAtRef = useRef(0);
  const lastShooterNoteRef = useRef(null);
  const lastShooterXRef = useRef(50);
  const shooterReleaseLockRef = useRef(null);
  const shooterLivesRef = useRef(SHOOTER_MAX_LIVES);
  const shooterSoundOnRef = useRef(true);
  const shooterDifficultyRef = useRef(SHOOTER_DIFFICULTIES.EASY);
  const shooterSessionSavedRef = useRef(true);
  const shooterAimResetTimerRef = useRef(null);
  const lastShooterGuitarAimRef = useRef({ targetId: null, angle: null });
  const lastMicReadAtRef = useRef(0);
  const lastMicAnalysisAtRef = useRef(0);
  const scoreRef = useRef(0);
  const maxComboRef = useRef(0);
  const attemptsRef = useRef(0);
  const lastShotRef = useRef({ note: null, time: 0 });
  const laneFeedbackIdRef = useRef(1);
  shooterDifficultyRef.current = shooterDifficulty;
  scoreRef.current = score;
  attemptsRef.current = attempts;

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
  const selectedPentatonicRef = useRef(selectedPentatonic);
  selectedPentatonicRef.current = selectedPentatonic;
  const viewerScaleTypeOptions =
    viewerScaleFamily === SCALE_FAMILIES.scale.id ? DIATONIC_SCALE_TYPES : PENTATONIC_TYPES;
  const viewerScaleBlock = useMemo(
    () => buildScaleBlockPractice(viewerScaleRoot, viewerScaleType, viewerScaleFamily, viewerScaleBox),
    [viewerScaleBox, viewerScaleFamily, viewerScaleRoot, viewerScaleType],
  );
  const viewerSelectedChordName = getChordNameFromParts(
    viewerChordBaseRoot,
    viewerChordAccidental,
    viewerChordQuality,
    viewerChordExtension,
  );
  const selectedStoredChord = useMemo(
    () => CHORD_VIEW_OPTIONS.find(
      (chord) =>
        chord.root === viewerChordRoot &&
        chord.quality === viewerChordQuality &&
        chord.extension === viewerChordExtension,
    ) ?? null,
    [viewerChordExtension, viewerChordQuality, viewerChordRoot],
  );
  const selectedBuiltChord = useMemo(
    () => {
      return buildChordToneReferenceOption({
        root: viewerChordRoot,
        displayRoot: getChordDisplayRoot(viewerChordBaseRoot, viewerChordAccidental),
        quality: viewerChordQuality,
        extension: viewerChordExtension,
        displayName: viewerSelectedChordName,
        hint: selectedStoredChord?.hint,
        storedChord: selectedStoredChord,
      });
    },
    [selectedStoredChord, viewerChordAccidental, viewerChordBaseRoot, viewerChordExtension, viewerChordQuality, viewerChordRoot, viewerSelectedChordName],
  );
  const viewerChord = useMemo(
    () =>
      viewerChordId === CHORD_CATALOG_ALL
        ? selectedBuiltChord ?? CHORD_VIEW_OPTIONS[0]
        : CHORD_VIEW_OPTIONS.find((chord) => chord.id === viewerChordId) ?? selectedBuiltChord ?? CHORD_VIEW_OPTIONS[0],
    [selectedBuiltChord, viewerChordId],
  );
  const chordCatalogGroups = useMemo(() => {
    return CHORD_NATURAL_ROOTS
      .map((root) => {
        const storedChords = CHORD_VIEW_OPTIONS.filter((chord) => chord.root === root);
        const generatedChords = buildSelectableChordCatalogOptions(root, "natural");
        return {
          root,
          chords: mergeChordCatalogOptions(storedChords, generatedChords),
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
    const safeExtension = normalizeChordExtensionForQuality(quality, extension);
    const exactChord = CHORD_VIEW_OPTIONS.find(
      (chord) =>
        chord.root === lookupRoot &&
        chord.quality === quality &&
        chord.extension === safeExtension,
    );
    return buildChordToneReferenceOption({
      root: lookupRoot,
      displayRoot: getChordDisplayRoot(baseRoot, accidental),
      quality,
      extension: safeExtension,
      displayName: getChordNameFromParts(baseRoot, accidental, quality, safeExtension),
      hint: exactChord?.hint,
      storedChord: exactChord,
    });
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
  const getStoredChordFromSelector = useCallback((baseRoot, accidental, quality, extension) => {
    const lookupRoot = getChordLookupRoot(baseRoot, accidental);
    const safeExtension = normalizeChordExtensionForQuality(quality, extension);
    return CHORD_VIEW_OPTIONS.find(
      (chord) =>
        chord.root === lookupRoot &&
        chord.quality === quality &&
        chord.extension === safeExtension,
    ) ?? null;
  }, []);
  const getStoredFallbackChordFromSelector = useCallback((baseRoot, accidental, quality, extension) => {
    const lookupRoot = getChordLookupRoot(baseRoot, accidental);
    return (
      getStoredChordFromSelector(baseRoot, accidental, quality, extension) ??
      getStoredChordFromSelector(baseRoot, accidental, quality, "none") ??
      CHORD_VIEW_OPTIONS.find((chord) => chord.root === lookupRoot && chord.extension === "none") ??
      CHORD_VIEW_OPTIONS.find((chord) => chord.root === lookupRoot) ??
      null
    );
  }, [getStoredChordFromSelector]);
  const availableChordExtensionOptions = CHORD_EXTENSION_OPTIONS
    .filter((extension) => isChordExtensionAvailableForQuality(extension, viewerChordQuality))
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
  const viewerChordToneNames = useMemo(
    () => getChordToneNames(viewerChordRoot, viewerChordQuality, viewerChordExtension),
    [viewerChordExtension, viewerChordQuality, viewerChordRoot],
  );
  const viewerMapPitchClasses = useMemo(() => {
    if (viewerMode === FRETBOARD_VIEWER_MODES.NOTE) {
      return viewerNoteFilter === "ALL" ? new Set(CHROMATIC_NOTES) : new Set([viewerNoteFilter]);
    }
    if (viewerMode === FRETBOARD_VIEWER_MODES.SCALE) {
      return new Set(viewerScaleBlock.notes.map((note) => note.noteName));
    }
    if (viewerMode === FRETBOARD_VIEWER_MODES.CHORD) {
      return new Set(viewerChordToneNames);
    }
    return new Set(CHROMATIC_NOTES);
  }, [viewerChordToneNames, viewerMode, viewerNoteFilter, viewerScaleBlock.notes]);
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
      if (viewerMode === FRETBOARD_VIEWER_MODES.CHORD) {
        if (viewerChordPosition === CHORD_VIEWER_POSITION_ALL) return true;
        const [startFret, endFret] = getChordViewerPositionRange(viewerChordPosition);
        return note.fretNumber >= startFret && note.fretNumber <= endFret;
      }
      if (viewerMode !== FRETBOARD_VIEWER_MODES.NOTE) return note.fretNumber > 0;
      return true;
    });
  }, [viewerChordPosition, viewerMapFrets, viewerMapPitchClasses, viewerMapStrings, viewerMode, viewerNotePositionRange]);
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
    const positions = [
      ...CHORD_VIEWER_POSITIONS,
      { id: CHORD_VIEWER_POSITION_ALL, label: "전체" },
    ];
    return Object.fromEntries(
      positions.map((position) => [
        position.id,
        buildChordToneReferencePosition({
          root: viewerChordRoot,
          displayRoot: getChordDisplayRoot(viewerChordBaseRoot, viewerChordAccidental),
          quality: viewerChordQuality,
          extension: viewerChordExtension,
          positionId: position.id,
          storedChord: selectedStoredChord,
        }),
      ]),
    );
  }, [selectedStoredChord, viewerChordAccidental, viewerChordBaseRoot, viewerChordExtension, viewerChordQuality, viewerChordRoot, viewerMode]);
  const viewerCurrentChordPosition =
    viewerChordPosition === CHORD_VIEWER_POSITION_ALL
      ? viewerChordPositionData.position1
      : viewerChordPositionData[viewerChordPosition] ?? viewerChordPositionData.position1;
  const viewerVisibleFrets = viewerMode === FRETBOARD_VIEWER_MODES.CHORD
    ? viewerCurrentChordPosition?.visibleFrets ?? viewerChord.visibleFrets
    : viewerScaleBlock.visibleFrets;
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
    return getChordViewerPositionRange(viewerChordPosition);
  }, [viewerChordPosition, viewerMode, viewerNotePositionRange, viewerScaleBlock.visibleFrets]);
  const viewerShouldFitFretboard =
    viewerMode === FRETBOARD_VIEWER_MODES.SCALE ||
    viewerMode === FRETBOARD_VIEWER_MODES.CHORD ||
    (viewerMode === FRETBOARD_VIEWER_MODES.NOTE && viewerOctaveRange !== "all");
  useEffect(() => {
    if (viewerMode !== FRETBOARD_VIEWER_MODES.CHORD) return;
    if (viewerChordPositionData[viewerChordPosition]) return;
    setViewerChordPosition("position1");
  }, [viewerChordPosition, viewerChordPositionData, viewerMode]);
  const stage3StorageSelectedChord = useMemo(() => CHORD_VIEW_OPTIONS.find(
    (chord) =>
      chord.root === stage3StorageChordRoot &&
      chord.quality === stage3StorageChordQuality &&
      chord.extension === stage3StorageChordExtension,
  ) ?? null, [stage3StorageChordExtension, stage3StorageChordQuality, stage3StorageChordRoot]);
  const stage3StorageSelectedChordName = stage3StorageSelectedChord?.displayName ?? "준비중";
  const stage3StorageAvailableExtensionOptions = useMemo(() => CHORD_EXTENSION_OPTIONS
    .filter((extension) => isChordExtensionAvailableForQuality(extension, stage3StorageChordQuality))
    .map((extension) => {
      const lookupRoot = getChordLookupRoot(stage3StorageChordBaseRoot, stage3StorageChordAccidental);
      const hasDiagram = CHORD_VIEW_OPTIONS.some(
        (chord) =>
          chord.root === lookupRoot &&
          chord.quality === stage3StorageChordQuality &&
          chord.extension === extension.id,
      );
      return {
        ...extension,
        disabled: !hasDiagram,
        hasDiagram,
      };
    }), [stage3StorageChordAccidental, stage3StorageChordBaseRoot, stage3StorageChordQuality]);
  const getMetronomeScopeForCategory = useCallback((categoryId) => {
    if (categoryId === "scale-block") return METRONOME_SETTING_SCOPES.STAGE2;
    if (categoryId === "rhythm") return METRONOME_SETTING_SCOPES.STAGE3;
    return METRONOME_SETTING_SCOPES.STAGE1;
  }, []);
  const captureActiveMetronomeSettings = useCallback(() => ({
    bpm,
    timeSignature: metronomeTimeSignature,
    subdivision: metronomeSubdivision,
    tone: metronomeTone,
    accentTone: metronomeAccentTone,
    weakTone: metronomeWeakTone,
    accent: metronomeAccent,
    countIn: metronomeCountIn,
    countInBars: metronomeCountInBars,
    beatPattern: normalizeMetronomeBeatPattern(metronomeBeatPatternRef.current, getTimeSignatureOption(metronomeTimeSignature).beats),
  }), [bpm, metronomeAccent, metronomeAccentTone, metronomeCountIn, metronomeCountInBars, metronomeSubdivision, metronomeTimeSignature, metronomeTone, metronomeWeakTone]);
  const applyScopedMetronomeSettings = useCallback((settings) => {
    const normalized = settings ?? createDefaultMetronomeSettings();
    const timeSignature = getTimeSignatureOption(normalized.timeSignature).id;
    const beats = getTimeSignatureOption(timeSignature).beats;
    const nextBpm = clampBpm(normalized.bpm);
    const nextAccent = normalized.accent !== false;
    const nextTone = getMetronomeToneOption(normalized.tone ?? "tick").id;
    const nextAccentTone = getMetronomeToneOption(normalized.accentTone ?? normalized.tone ?? "kick").id;
    const nextWeakTone = getMetronomeToneOption(normalized.weakTone ?? normalized.tone ?? "rim").id;
    const nextPattern = nextAccent
      ? normalizeMetronomeBeatPattern(normalized.beatPattern, beats)
      : Array.from({ length: beats }, () => METRONOME_BEAT_STATES.NORMAL);

    bpmRef.current = nextBpm;
    metronomeTimeSignatureRef.current = timeSignature;
    metronomeAccentRef.current = nextAccent;
    metronomeSubdivisionRef.current = normalized.subdivision ?? "quarter";
    metronomeToneRef.current = nextTone;
    metronomeAccentToneRef.current = nextAccentTone;
    metronomeWeakToneRef.current = nextWeakTone;
    metronomeCountInRef.current = Boolean(normalized.countIn);
    metronomeCountInBarsRef.current = Number(normalized.countInBars) || 0;
    metronomeBeatPatternRef.current = nextPattern;

    setBpm(nextBpm);
    setMetronomeTimeSignature(timeSignature);
    setMetronomeAccent(nextAccent);
    setMetronomeSubdivision(normalized.subdivision ?? "quarter");
    setMetronomeTone(nextTone);
    setMetronomeAccentTone(nextAccentTone);
    setMetronomeWeakTone(nextWeakTone);
    setMetronomeCountIn(Boolean(normalized.countIn));
    setMetronomeCountInBars(Number(normalized.countInBars) || 0);
    setMetronomeBeatPattern(nextPattern);
    setBeat(0);
    setStage3MeasureProgress(0);
  }, []);
  const switchMetronomeScope = useCallback((nextScope, resetToDefault = false) => {
    const currentScope = activeMetronomeScopeRef.current;
    scopedMetronomeSettingsRef.current[currentScope] = keepOnlyTrainingMetronomeRuntimeSettings(
      currentScope,
      captureActiveMetronomeSettings(),
    );
    activeMetronomeScopeRef.current = nextScope;
    const rawNextSettings = resetToDefault
      ? createDefaultMetronomeSettings()
      : scopedMetronomeSettingsRef.current[nextScope] ?? createDefaultMetronomeSettings();
    const nextSettings = keepOnlyTrainingMetronomeRuntimeSettings(nextScope, rawNextSettings);
    scopedMetronomeSettingsRef.current[nextScope] = nextSettings;
    applyScopedMetronomeSettings(nextSettings);
  }, [applyScopedMetronomeSettings, captureActiveMetronomeSettings]);
  const applyViewerChordSelection = useCallback((baseRoot, accidental, quality, extension) => {
    const safeExtension = normalizeChordExtensionForQuality(quality, extension);
    const exactChord = getChordFromSelector(baseRoot, accidental, quality, safeExtension);
    const nextChord = exactChord ?? getFallbackChordFromSelector(baseRoot, accidental, quality, safeExtension);
    const nextQuality = exactChord ? quality : nextChord?.quality ?? quality;
    const nextExtension = exactChord ? safeExtension : nextChord?.extension ?? "none";
    setViewerChordBaseRoot(baseRoot);
    setViewerChordAccidental(accidental);
    setViewerChordRoot(getChordLookupRoot(baseRoot, accidental));
    setViewerChordQuality(nextQuality);
    setViewerChordExtension(nextExtension);
    setViewerChordPosition("position1");
    if (nextChord) setViewerChordId(nextChord.id);
  }, [getChordFromSelector, getFallbackChordFromSelector]);
  const scrollToChordChart = useCallback(() => {
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
  const handleChordCatalogSelect = useCallback((chord) => {
    const rootParts = splitChordRootForSelector(chord.root);
    setViewerChordBaseRoot(rootParts.baseRoot);
    setViewerChordAccidental(rootParts.accidental);
    setViewerChordRoot(chord.root);
    setViewerChordQuality(chord.quality);
    setViewerChordExtension(chord.extension);
    setViewerChordId(chord.id);
    setViewerChordPosition("position1");
    scrollToChordViewer();
  }, [scrollToChordViewer]);
  const applyStage3StorageChordSelection = useCallback((baseRoot, accidental, quality, extension) => {
    const safeQuality = STAGE3_STORAGE_CHORD_QUALITY_OPTIONS.some((option) => option.id === quality) ? quality : "major";
    const safeExtension = normalizeChordExtensionForQuality(safeQuality, extension);
    const exactChord = getStoredChordFromSelector(baseRoot, accidental, safeQuality, safeExtension);
    const nextChord = exactChord ?? getStoredFallbackChordFromSelector(baseRoot, accidental, safeQuality, safeExtension);
    const nextQuality = exactChord ? safeQuality : nextChord?.quality ?? safeQuality;
    const nextExtension = exactChord ? safeExtension : nextChord?.extension ?? "none";
    setStage3StorageChordBaseRoot(baseRoot);
    setStage3StorageChordAccidental(accidental);
    setStage3StorageChordRoot(getChordLookupRoot(baseRoot, accidental));
    setStage3StorageChordQuality(nextQuality);
    setStage3StorageChordExtension(nextExtension);
  }, [getStoredChordFromSelector, getStoredFallbackChordFromSelector]);
  const buildStage3Progression = useCallback((entries = []) => entries
    .map((entry) => {
      const chord = CHORD_VIEW_OPTION_BY_ID.get(getChordEntryId(entry));
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
  const chordTransitionProgression = useMemo(
    () => buildStage3Progression(stage3ChordIds),
    [buildStage3Progression, stage3ChordIds],
  );
  const hasChordTransitionProgression = chordTransitionProgression.length > 0;
  const stage3StorageProgression = useMemo(
    () => buildStage3Progression(stage3StorageChordIds),
    [buildStage3Progression, stage3StorageChordIds],
  );
  const hasStage3StorageProgression = stage3StorageProgression.length > 0;
  const stage3ProgressionLabel = useMemo(
    () => (hasChordTransitionProgression
      ? chordTransitionProgression.map((chord) => chord.displayName).join(" - ")
      : "진행 없음"),
    [chordTransitionProgression, hasChordTransitionProgression],
  );
  const stage3StorageProgressionLabel = useMemo(
    () => (hasStage3StorageProgression
      ? stage3StorageProgression.map((chord) => chord.displayName).join(" - ")
      : "진행 없음"),
    [hasStage3StorageProgression, stage3StorageProgression],
  );
  const stage3RecommendedSlots = useMemo(() => getStage3RecommendedSlots(), []);
  const stage3LibraryItems = useMemo(
    () => [...stage3RecommendedSlots, ...stage3QuickSlots],
    [stage3QuickSlots, stage3RecommendedSlots],
  );
  const selectedStage3LibraryItem = chordProgressionId.startsWith("slot:")
    ? stage3LibraryItems.find((slot) => slot.id === chordProgressionId.slice(5)) ?? null
    : null;
  const selectedStage3StorageItem = stage3QuickSlots.find((slot) => slot.id === stage3StorageSelectedId) ?? null;
  const stage3CurrentProgressionTitle = hasChordTransitionProgression
    ? loadedStage3LibraryItem?.title || selectedStage3LibraryItem?.title || "사용자 진행"
    : "진행을 선택해주세요";
  const isStage3RecommendedItem = useCallback((itemOrId) => {
    const id = typeof itemOrId === "string" ? itemOrId : itemOrId?.id;
    return stage3RecommendedSlots.some((item) => item.id === id);
  }, [stage3RecommendedSlots]);
  const applyStage3BackingSettings = useCallback((settings = {}) => {
    const next = normalizeStage3BackingSettings(settings);
    setBackingRhythmPattern(next.rhythmPattern);
    setBackingBassBeat(next.bassBeat);
    setBackingPianoBeat(next.pianoBeat);
    backingRhythmPatternRef.current = next.rhythmPattern;
    backingBassBeatRef.current = next.bassBeat;
    backingPianoBeatRef.current = next.pianoBeat;
    return next;
  }, []);
  const applyStage3LibraryItem = useCallback((item, options = {}) => {
    if (!item?.chordIds?.length) return;
    const backingSettings = options.useDefaultBacking
      ? STAGE3_DEFAULT_BACKING_SETTINGS
      : {
        rhythmPattern: item.backingRhythmPattern,
        bassBeat: item.backingBassBeat,
        pianoBeat: item.backingPianoBeat,
      };
    setChordProgressionId(`slot:${item.id}`);
    setStage3ChordIds(item.chordIds);
    setLoadedStage3LibraryItem(item);
    setBpm(clampBpm(item.bpm ?? bpm));
    setMetronomeTimeSignature(item.time_signature ?? "4/4");
    setMetronomeSubdivision(item.subdivision ?? "quarter");
    setMetronomeTone(item.sound ?? "tick");
    applyStage3BackingSettings(backingSettings);
    {
      const strumPatternGroups = normalizeStrumPatternGroups(item.strum_pattern ?? item.strumPattern ?? item.strumSlots);
      setStage3LiveStrumPattern(strumPatternGroups);
    }
    setChordPracticeIndex(0);
    gameTimeRef.current = 0;
    lastBeatRef.current = -1;
    setBeat(0);
    setStage3MeasureProgress(0);
  }, [applyStage3BackingSettings, bpm]);
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
    const item = selectedStage3LibraryItem ?? stage3RecommendedSlots[0] ?? stage3QuickSlots[0] ?? null;
    const isRecommended = isStage3RecommendedItem(item);
    if (item) setStage3StorageSelectedId(item.id);
    setStage3StorageTitle(item?.title ?? (hasChordTransitionProgression ? `내 진행 ${stage3QuickSlots.length + 1}` : "내 진행"));
    setStage3StorageMemo(item?.memo ?? "");
    setStage3StorageEditingId(isRecommended ? "" : item?.id ?? "");
    setStage3StorageChordIds(item?.chordIds ?? stage3ChordIds);
    setStage3StorageBpm(clampBpm(item?.bpm ?? bpm));
    setStage3StorageTimeSignature(item?.time_signature ?? metronomeTimeSignature);
    setStage3StorageCapo(Number.isFinite(Number(item?.capo)) ? Number(item.capo) : 0);
    {
      const strumPatternGroups = normalizeStrumPatternGroups(item?.strum_pattern ?? item?.strumPattern ?? item?.strumSlots);
      const firstPattern = strumPatternGroups.find((row) => row.length) ?? [];
      stage3StorageStrumPatternRef.current = strumPatternGroups;
      setStage3StorageStrumPattern(strumPatternGroups);
      setStage3StorageStrumDraftPattern(firstPattern);
    }
    setStage3StorageOpen(true);
    if (typeof window !== "undefined") {
      window.history.pushState(
        { appRoute: APP_ROUTES.STAGE3, stage3StorageOpen: true },
        "",
        `${window.location.pathname}${window.location.search}${APP_ROUTES.STAGE3}`,
      );
    }
  }, [bpm, hasChordTransitionProgression, isStage3RecommendedItem, metronomeTimeSignature, selectedStage3LibraryItem, stage3ChordIds, stage3QuickSlots, stage3RecommendedSlots]);
  const saveStage3StorageItem = useCallback((mode = "update") => {
    if (!hasStage3StorageProgression) return;
    const id = stage3StorageEditingId && !stage3StorageEditingId.startsWith("preset-")
      ? stage3StorageEditingId
      : `slot-${Date.now()}`;
    const currentStrumPattern = normalizeStrumPatternGroups(
      stage3StorageStrumPatternRef.current.length
        ? stage3StorageStrumPatternRef.current
        : stage3StorageStrumPattern,
    );
    const saveData = makeStage3LibraryItem({
      id,
      title: hasStage3StorageProgression ? stage3StorageProgressionLabel : "내 진행",
      chordIds: stage3StorageChordIds,
      bpm: stage3StorageBpm,
      timeSignature: stage3StorageTimeSignature,
      subdivision: metronomeSubdivision,
      sound: metronomeTone,
      backingRhythmPattern: STAGE3_DEFAULT_BACKING_SETTINGS.rhythmPattern,
      backingBassBeat: STAGE3_DEFAULT_BACKING_SETTINGS.bassBeat,
      backingPianoBeat: STAGE3_DEFAULT_BACKING_SETTINGS.pianoBeat,
      capo: stage3StorageCapo,
      strum_pattern: currentStrumPattern,
      strumPattern: currentStrumPattern,
      strumSlots: currentStrumPattern,
      selectedStrumSlot: currentStrumPattern[1]?.length ? 1 : 0,
      memo: "",
    });
    setStage3QuickSlots((slots) => {
      const nextSlots = [saveData, ...slots.filter((slot) => slot.id !== id)].slice(0, 24);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STAGE3_QUICK_SLOTS_KEY, JSON.stringify(nextSlots));
        } catch (error) {
          console.warn("SAVED STORAGE FAILED:", error);
        }
      }
      return nextSlots;
    });
    setStage3StorageEditingId(id);
    setStage3StorageSelectedId(id);
  }, [hasStage3StorageProgression, metronomeSubdivision, metronomeTone, stage3StorageBpm, stage3StorageCapo, stage3StorageChordIds, stage3StorageEditingId, stage3StorageProgressionLabel, stage3StorageStrumPattern, stage3StorageTimeSignature]);
  const addStage3StrumPatternDraft = useCallback((slotIndex = 0) => {
    const normalizedPattern = normalizeStrumPattern(stage3StorageStrumDraftPattern);
    if (!normalizedPattern.length) return;
    setStage3StorageStrumPattern((pattern) => {
      const groups = normalizeStrumPatternGroups(pattern);
      const nextGroups = [groups[0] ?? [], groups[1] ?? []];
      nextGroups[slotIndex] = normalizedPattern;
      stage3StorageStrumPatternRef.current = nextGroups;
      return nextGroups;
    });
  }, [stage3StorageStrumDraftPattern]);
  const editStage3StorageItem = useCallback((item) => {
    if (!item) return;
    const isRecommended = isStage3RecommendedItem(item);
    setStage3StorageSelectedId(item.id);
    setStage3StorageTitle(item.title);
    setStage3StorageMemo(item.memo ?? "");
    setStage3StorageEditingId(isRecommended ? "" : item.id);
    setStage3StorageChordIds(item.chordIds ?? []);
    setStage3StorageBpm(clampBpm(item.bpm ?? bpm));
    setStage3StorageTimeSignature(item.time_signature ?? "4/4");
    applyStage3BackingSettings(isRecommended
      ? {
        rhythmPattern: item.backingRhythmPattern,
        bassBeat: item.backingBassBeat,
        pianoBeat: item.backingPianoBeat,
      }
      : STAGE3_DEFAULT_BACKING_SETTINGS);
    setStage3StorageCapo(Number.isFinite(Number(item.capo)) ? Number(item.capo) : 0);
    {
      const strumPatternGroups = normalizeStrumPatternGroups(item.strum_pattern ?? item.strumPattern ?? item.strumSlots);
      const firstPattern = strumPatternGroups.find((row) => row.length) ?? [];
      stage3StorageStrumPatternRef.current = strumPatternGroups;
      setStage3StorageStrumPattern(strumPatternGroups);
      setStage3StorageStrumDraftPattern(firstPattern);
    }
  }, [applyStage3BackingSettings, bpm, isStage3RecommendedItem]);
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
      const strumPatternGroups = normalizeStrumPatternGroups(copied.strum_pattern ?? copied.strumPattern ?? copied.strumSlots);
      const firstPattern = strumPatternGroups.find((row) => row.length) ?? [];
      stage3StorageStrumPatternRef.current = strumPatternGroups;
      setStage3StorageStrumPattern(strumPatternGroups);
      setStage3StorageStrumDraftPattern(firstPattern);
    }
  }, []);
  const deleteStage3StorageItem = useCallback((id) => {
    if (isStage3RecommendedItem(id)) return;
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
      stage3StorageStrumPatternRef.current = [];
      setStage3StorageStrumPattern([]);
      setStage3StorageStrumDraftPattern([]);
    }
  }, [chordProgressionId, isStage3RecommendedItem, stage3QuickSlots, stage3StorageEditingId, stage3StorageSelectedId]);
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
  const addStage3StrumRepeat = useCallback(() => {
    setStage3StorageStrumDraftPattern((pattern) => [
      ...normalizeStrumPattern(pattern),
      { type: "repeat", label: "X2" },
    ].slice(0, 12));
  }, []);
  const toggleStage3StrumHit = useCallback((index) => {
    setStage3StorageStrumDraftPattern((pattern) =>
      normalizeStrumPattern(pattern).map((step, stepIndex) =>
        stepIndex === index && step.type !== "repeat" ? { ...step, hit: !step.hit } : step,
      ),
    );
  }, []);
  const chordPracticeCurrent =
    hasChordTransitionProgression
      ? chordTransitionProgression[chordPracticeIndex % chordTransitionProgression.length]
      : CHORD_VIEW_OPTIONS[0];
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
  const standaloneBeatPattern = normalizeMetronomeBeatPattern(metronomeBeatPattern, metronomeBeatsPerMeasure);
  const trainingBeatPattern = useMemo(() => normalizeMetronomeBeatPattern([], 4), []);
  const trainingBeatsPerMeasure = 4;
  const applyDefaultMetronomeBeatPattern = useCallback((timeSignature = metronomeTimeSignature) => {
    const beatsPerMeasure = getTimeSignatureOption(timeSignature).beats;
    const nextPattern = normalizeMetronomeBeatPattern([], beatsPerMeasure);
    metronomeBeatPatternRef.current = nextPattern;
    setMetronomeBeatPattern(nextPattern);
  }, [metronomeTimeSignature]);
  const applyWeakMetronomeBeatPattern = useCallback((timeSignature = metronomeTimeSignature) => {
    const beatsPerMeasure = getTimeSignatureOption(timeSignature).beats;
    const nextPattern = Array.from({ length: beatsPerMeasure }, () => METRONOME_BEAT_STATES.NORMAL);
    metronomeBeatPatternRef.current = nextPattern;
    setMetronomeBeatPattern(nextPattern);
  }, [metronomeTimeSignature]);
  const changeTrainingMetronomeTimeSignature = useCallback((nextTimeSignature) => {
    metronomeTimeSignatureRef.current = nextTimeSignature;
    setMetronomeTimeSignature(nextTimeSignature);
    if (metronomeAccentRef.current) {
      applyDefaultMetronomeBeatPattern(nextTimeSignature);
    } else {
      applyWeakMetronomeBeatPattern(nextTimeSignature);
    }
  }, [applyDefaultMetronomeBeatPattern, applyWeakMetronomeBeatPattern]);
  const changeTrainingMetronomeAccent = useCallback((nextAccentEnabled) => {
    metronomeAccentRef.current = nextAccentEnabled;
    setMetronomeAccent(nextAccentEnabled);
    if (nextAccentEnabled) {
      applyDefaultMetronomeBeatPattern(metronomeTimeSignatureRef.current);
    } else {
      applyWeakMetronomeBeatPattern(metronomeTimeSignatureRef.current);
    }
  }, [applyDefaultMetronomeBeatPattern, applyWeakMetronomeBeatPattern]);
  const metronomeVisualLabTimeSignatureOption =
    METRONOME_VISUAL_LAB_TIME_SIGNATURE_OPTIONS.find((option) => option.id === metronomeVisualLabTimeSignature)
    ?? METRONOME_VISUAL_LAB_TIME_SIGNATURE_OPTIONS[2];
  const metronomeVisualLabBeatsPerMeasure = metronomeVisualLabTimeSignatureOption.beats;
  const metronomeVisualLabBeatPattern = useMemo(
    () => normalizeMetronomeBeatPattern([], metronomeVisualLabBeatsPerMeasure),
    [metronomeVisualLabBeatsPerMeasure],
  );
  const trackerCountInLabel = TRACKER_COUNT_IN_OPTIONS.find((option) => option.bars === metronomeCountInBars)?.label ?? "OFF";
  const trackerTimerSecondsTotal = metronomeTrackerTimerMinutes * 60 + metronomeTrackerTimerSeconds;
  const trackerElapsedSeconds = Math.floor(metronomeTrackerElapsedMs / 1000);
  const trackerRemainingSeconds = Math.max(0, trackerTimerSecondsTotal - trackerElapsedSeconds);
  const formatTrackerTime = (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const restSeconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
  };
  const trackerTimerLabel = metronomeTimerCountdown && trackerTimerSecondsTotal ? formatTrackerTime(trackerRemainingSeconds) : "OFF";
  const trackerBarProgressLabel = metronomeBarLimitEnabled
    ? `${Math.min(metronomeMeasureCount, metronomeBarLimit)} | ${metronomeBarLimit}`
    : `${metronomeMeasureCount} Bars`;
  const trackerSummaryLabel = metronomeTrackerMode === "bars"
    ? trackerBarProgressLabel
    : metronomeTrackerMode === "timer" && metronomeTimerCountdown
      ? trackerTimerLabel
      : "OFF";
  const trackerDetailLabel = metronomeTrackerMode === "bars"
    ? (metronomeBarLimitEnabled ? "Bar Counter Progress" : "Bar Counter")
    : metronomeTrackerMode === "timer" && metronomeTimerCountdown
      ? (trackerTimerSecondsTotal ? `Timer · ${formatTrackerTime(trackerTimerSecondsTotal)}` : "Timer · 0 mins 0 secs")
      : metronomeTrackerMode === "timer"
        ? "Timer OFF"
      : `Count In ${trackerCountInLabel}`;
  const autoBpmSignedStep = autoBpmDirection === "decrease" ? -autoBpmStep : autoBpmStep;
  const autoBpmSign = autoBpmSignedStep > 0 ? "+" : "-";
  const autoBpmTimeSecondsTotal = autoBpmTimeMinutes * 60 + autoBpmTimeSeconds;
  const autoBpmIntervalLabel = autoBpmMode === "time"
    ? `Every ${autoBpmTimeSecondsTotal >= 60 ? `${autoBpmTimeMinutes}m ${autoBpmTimeSeconds}s` : `${Math.max(1, autoBpmTimeSecondsTotal)}s`}`
    : `Every ${autoBpmBars} Bars`;
  const automatorSummaryLabel = autoBpmMode !== "off"
    ? `${autoBpmSign}${Math.abs(autoBpmSignedStep)} BPM`
    : coachModeEnabled
      ? "Coach ON"
      : "OFF";
  const automatorDetailLabel = autoBpmMode !== "off"
    ? autoBpmIntervalLabel
    : coachModeEnabled
      ? `${coachPlayBars} / ${coachMuteBars}`
      : "Automator OFF";
  const resetScore = useCallback(() => {
    enemiesRef.current = [];
    projectilesRef.current = [];
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
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHits(0);
    setAttempts(0);
    setPerfectCount(0);
    setMissCount(0);
    setMissedNoteCounts({});
    hitsRef.current = 0;
    scoreRef.current = 0;
    maxComboRef.current = 0;
    attemptsRef.current = 0;
    setBeat(0);
    setStage3MeasureProgress(0);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setLaneFeedback([]);
    setStageFlash("");
    setReferenceStepTick((value) => value + 1);
    shooterTargetsRef.current = [];
    projectilesRef.current = [];
    shooterBreakEffectsRef.current = [];
    shooterTargetNodesRef.current.clear();
    projectileNodesRef.current.clear();
    shooterNextSpawnAtRef.current = 0;
    lastShooterNoteRef.current = null;
    lastShooterXRef.current = 50;
    shooterReleaseLockRef.current = null;
    shooterLivesRef.current = SHOOTER_MAX_LIVES;
    lastShotRef.current = { note: null, time: 0 };
    setShooterTargets([]);
    setProjectiles([]);
    setShooterBreakEffects([]);
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
    const pendingToneOptions = sampleToneOptions.filter((toneOption) => (
      !metronomeSampleBuffersRef.current[toneOption.id]
      && !metronomeSampleFailedIdsRef.current.has(toneOption.id)
    ));
    if (!pendingToneOptions.length) return true;
    if (metronomeSampleLoadPromiseRef.current) {
      await metronomeSampleLoadPromiseRef.current;
      return Object.keys(metronomeSampleBuffersRef.current).length > 0;
    }

    metronomeSampleLoadPromiseRef.current = Promise.all(
      pendingToneOptions.map(async (toneOption) => {
        if (metronomeSampleBuffersRef.current[toneOption.id]) return;
        try {
          const arrayBuffer = await fetchCachedAudioArrayBuffer(toneOption.src);
          if (!arrayBuffer) throw new Error(`Failed to load metronome sample: ${toneOption.src}`);
          const audioBuffer = await audio.decodeAudioData(arrayBuffer);
          metronomeSampleBuffersRef.current[toneOption.id] = audioBuffer;
        } catch (error) {
          metronomeSampleFailedIdsRef.current.add(toneOption.id);
          console.warn(`Metronome sample skipped: ${toneOption.label}`, error);
        }
      }),
    ).finally(() => {
      metronomeSampleLoadPromiseRef.current = null;
    });

    await metronomeSampleLoadPromiseRef.current;
    return true;
  }, []);

  const loadBackingBandSamples = useCallback(async (audio) => {
    if (!audio) return false;
    const sampleEntries = Object.entries(BACKING_SAMPLE_SOURCES);
    if (sampleEntries.every(([id]) => backingSampleBuffersRef.current[id])) return true;
    if (backingSampleLoadPromiseRef.current) {
      await backingSampleLoadPromiseRef.current;
      return Object.keys(backingSampleBuffersRef.current).length > 0;
    }

    backingSampleLoadPromiseRef.current = Promise.all(
      sampleEntries.map(async ([id, src]) => {
        if (backingSampleBuffersRef.current[id]) return;
        const arrayBuffer = await fetchCachedAudioArrayBuffer(src);
        if (!arrayBuffer) throw new Error(`Failed to load backing sample: ${src}`);
        const audioBuffer = await audio.decodeAudioData(arrayBuffer);
        backingSampleBuffersRef.current[id] = audioBuffer;
      }),
    ).finally(() => {
      backingSampleLoadPromiseRef.current = null;
    });

    await backingSampleLoadPromiseRef.current;
    return true;
  }, []);

  const ensureAudioContext = useCallback(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audio = audioRef.current;
    if (!audio || audio.state === "closed") {
      audio = AudioContext ? new AudioContext() : null;
    }
    if (!audio) return null;
    audioRef.current = audio;
    return audio;
  }, []);

  const ensureAudioReady = useCallback(async () => {
    const audio = ensureAudioContext();
    if (!audio) return false;
    if (audio.state === "suspended") {
      await audio.resume();
    }
    return audio.state === "running";
  }, [ensureAudioContext]);

  const ensureMetronomeOutput = useCallback((audio) => {
    if (!audio) return false;
    if (metronomeMasterGainRef.current && metronomeAccentGainRef.current && metronomeWeakGainRef.current) {
      return true;
    }
    const masterGain = audio.createGain();
    const accentGain = audio.createGain();
    const weakGain = audio.createGain();
    masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, metronomeVolumeRef.current ?? 0.72)), audio.currentTime);
    accentGain.gain.setValueAtTime(1, audio.currentTime);
    weakGain.gain.setValueAtTime(0.5, audio.currentTime);
    accentGain.connect(masterGain);
    weakGain.connect(masterGain);
    masterGain.connect(audio.destination);
    metronomeMasterGainRef.current = masterGain;
    metronomeAccentGainRef.current = accentGain;
    metronomeWeakGainRef.current = weakGain;
    return true;
  }, []);

  const prepareStage3BackingSession = useCallback(async ({
    progression = chordTransitionProgression,
    bpmValue = bpmRef.current,
    timeSignatureValue = "4/4",
    rhythmPattern = backingRhythmPatternRef.current,
    bassBeat = backingBassBeatRef.current,
    pianoBeat = backingPianoBeatRef.current,
    preloadAudio = false,
  } = {}) => {
    const token = backingPrepareTokenRef.current + 1;
    backingPrepareTokenRef.current = token;
    const sessionKey = getBackingSessionKey({
      progression,
      bpmValue,
      timeSignatureValue,
      rhythmPattern,
      bassBeat,
      pianoBeat,
    });
    if (backingPreparedSessionKeyRef.current === sessionKey && backingPreparedSessionRef.current?.events?.length) {
      setStage3BackingPrepareStatus("ready");
      return backingPreparedSessionRef.current;
    }
    if (!progression?.length) {
      backingPreparedSessionRef.current = null;
      backingPreparedSessionKeyRef.current = "";
      setStage3BackingPrepareStatus("empty");
      return null;
    }

    setStage3BackingPrepareStatus("loading");
    const session = createBackingTimelineEvents({
      progression,
      bpm: bpmValue,
      timeSignature: timeSignatureValue,
      rhythmPattern,
      bassBeat,
      pianoBeat,
    });

    try {
      if (preloadAudio || gameStateRef.current === GAME_STATES.PLAYING) {
        await ensureAudioReady();
        await loadBackingBandSamples(audioRef.current);
      }
    } catch (error) {
      console.warn("Backing samples will load on start.", error);
    }

    if (backingPrepareTokenRef.current !== token) return null;
    backingPreparedSessionRef.current = session;
    backingPreparedSessionKeyRef.current = sessionKey;
    setStage3BackingPrepareStatus(session.events.length ? "ready" : "empty");
    return session;
  }, [chordTransitionProgression, ensureAudioReady, loadBackingBandSamples]);

  const preloadStage3BackingEngine = useCallback(async ({
    progression = chordTransitionProgression,
    bpmValue = bpmRef.current,
    timeSignatureValue = "4/4",
  } = {}) => {
    if (backingEngineLoadPromiseRef.current) return backingEngineLoadPromiseRef.current;
    setStage3BackingPrepareStatus("loading");
    backingEngineLoadPromiseRef.current = (async () => {
      const audio = ensureAudioContext();
      if (audio) {
        try {
          await loadBackingBandSamples(audio);
        } catch (error) {
          console.warn("Stage3 backing samples will finish on user gesture.", error);
        }
      }

      const compileProgression = progression?.length ? progression : chordTransitionProgression;
      const safeProgression = compileProgression?.length ? compileProgression : buildStage3Progression(getChordIdsFromNames(["C", "Am", "Dm", "G7"]));
      backingCompiledPatternCacheRef.current = {
        "4beat": createBackingTimelineEvents({
          progression: safeProgression,
          bpm: bpmValue,
          timeSignature: timeSignatureValue,
          rhythmPattern: "4beat",
          bassBeat: "basic",
          pianoBeat: "2beat",
        }),
        "8beat": createBackingTimelineEvents({
          progression: safeProgression,
          bpm: bpmValue,
          timeSignature: timeSignatureValue,
          rhythmPattern: "8beat",
          bassBeat: "basic",
          pianoBeat: "2beat",
        }),
        "16beat": createBackingTimelineEvents({
          progression: safeProgression,
          bpm: bpmValue,
          timeSignature: timeSignatureValue,
          rhythmPattern: "16beat",
          bassBeat: "basic",
          pianoBeat: "2beat",
        }),
      };
      backingEngineReadyRef.current = true;
      return prepareStage3BackingSession({
        progression: safeProgression,
        bpmValue,
        timeSignatureValue,
        rhythmPattern: backingRhythmPatternRef.current,
        bassBeat: backingBassBeatRef.current,
        pianoBeat: backingPianoBeatRef.current,
      });
    })().finally(() => {
      backingEngineLoadPromiseRef.current = null;
    });
    return backingEngineLoadPromiseRef.current;
  }, [buildStage3Progression, chordTransitionProgression, ensureAudioContext, loadBackingBandSamples, prepareStage3BackingSession]);

  const requestStage3BackingPatternChange = useCallback((overrides = {}) => {
      const nextBacking = normalizeStage3BackingSettings({
        rhythmPattern: overrides.rhythmPattern ?? backingRhythmPattern,
        bassBeat: overrides.bassBeat ?? backingBassBeat,
        pianoBeat: overrides.pianoBeat ?? backingPianoBeat,
      });
      const nextRhythmPattern = nextBacking.rhythmPattern;
      const nextBassBeat = nextBacking.bassBeat;
      const nextPianoBeat = nextBacking.pianoBeat;
    if (
      nextRhythmPattern === backingRhythmPattern &&
      nextBassBeat === backingBassBeat &&
      nextPianoBeat === backingPianoBeat
    ) {
      return;
    }
    if (overrides.rhythmPattern) setBackingRhythmPattern(overrides.rhythmPattern);
    if (overrides.bassBeat || nextBassBeat !== backingBassBeat) setBackingBassBeat(nextBassBeat);
    if (overrides.pianoBeat || nextPianoBeat !== backingPianoBeat) setBackingPianoBeat(nextPianoBeat);

    const session = createBackingTimelineEvents({
      progression: chordTransitionProgression,
      bpm: bpmRef.current,
      timeSignature: "4/4",
      rhythmPattern: nextRhythmPattern,
      bassBeat: nextBassBeat,
      pianoBeat: nextPianoBeat,
    });
    const sessionKey = getBackingSessionKey({
      progression: chordTransitionProgression,
      bpmValue: bpmRef.current,
      timeSignatureValue: "4/4",
      rhythmPattern: nextRhythmPattern,
      bassBeat: nextBassBeat,
      pianoBeat: nextPianoBeat,
    });

    if (gameStateRef.current === GAME_STATES.PLAYING && backingSchedulerRunningRef.current) {
      backingPendingSessionRef.current = session;
      backingPendingSessionKeyRef.current = sessionKey;
      return;
    }

    backingRhythmPatternRef.current = nextRhythmPattern;
    backingBassBeatRef.current = nextBassBeat;
    backingPianoBeatRef.current = nextPianoBeat;
    backingPreparedSessionRef.current = session;
    backingPreparedSessionKeyRef.current = sessionKey;
    setStage3BackingPrepareStatus(session.events.length ? "ready" : "empty");
  }, [backingBassBeat, backingPianoBeat, backingRhythmPattern, chordTransitionProgression]);

  const playMetronomeDialClick = useCallback(async () => {
    if (typeof window === "undefined") return;
    const nowMs = performance.now();
    if (nowMs - metronomeDialClickLastAtRef.current < 42) return;
    metronomeDialClickLastAtRef.current = nowMs;

    const ready = await ensureAudioReady();
    const audio = audioRef.current;
    if (!ready || !audio) return;

    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const overtone = audio.createOscillator();
    const noise = audio.createBufferSource();
    const noiseBuffer = audio.createBuffer(1, Math.max(1, Math.floor(audio.sampleRate * 0.018)), audio.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    const filter = audio.createBiquadFilter();
    const noiseFilter = audio.createBiquadFilter();
    const gain = audio.createGain();
    const noiseGain = audio.createGain();

    for (let index = 0; index < noiseData.length; index += 1) {
      const decay = 1 - index / noiseData.length;
      noiseData[index] = (Math.random() * 2 - 1) * decay * decay;
    }

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(1450, now);
    oscillator.frequency.exponentialRampToValueAtTime(980, now + 0.018);

    overtone.type = "square";
    overtone.frequency.setValueAtTime(2550, now);
    overtone.frequency.exponentialRampToValueAtTime(1900, now + 0.012);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(9, now);

    noise.buffer = noiseBuffer;
    noiseFilter.type = "highpass";
    noiseFilter.frequency.setValueAtTime(2100, now);
    noiseFilter.Q.setValueAtTime(0.8, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.014, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.024);

    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.006, now + 0.002);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

    oscillator.connect(filter);
    overtone.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audio.destination);
    oscillator.start(now);
    overtone.start(now + 0.001);
    noise.start(now);
    oscillator.stop(now + 0.024);
    overtone.stop(now + 0.02);
    noise.stop(now + 0.018);
  }, [ensureAudioReady]);

  const triggerMetronomeHardwareToggle = useCallback(() => {
    playMetronomeDialClick();
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(8);
    }
  }, [playMetronomeDialClick]);

  const triggerMetronomeWheelDetent = useCallback(() => {
    playMetronomeDialClick();
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(3);
    }
  }, [playMetronomeDialClick]);

  const playTick = useCallback((accent = false, subdivisionIndex = 0, useAccentSetting = true) => {
    const audio = audioRef.current;
    if (!audio || gameStateRef.current !== GAME_STATES.PLAYING || !metronomeOnRef.current) return;
    if (audio.state === "suspended") {
      audio.resume()
        .then(() => {
          if (gameStateRef.current === GAME_STATES.PLAYING && metronomeOnRef.current) playTick(accent, subdivisionIndex, useAccentSetting);
        })
        .catch(() => {});
      return;
    }

    const now = audio.currentTime;
    const scope = activeMetronomeScopeRef.current;
    const usesTrainingTonePair = scope !== METRONOME_SETTING_SCOPES.STAGE3;
    const accentOn = usesTrainingTonePair ? true : (useAccentSetting ? metronomeAccentRef.current : true);
    const useSplitTone = usesTrainingTonePair && accentOn;
    const toneId = useSplitTone
      ? (accent ? metronomeAccentToneRef.current : metronomeWeakToneRef.current)
      : scope === METRONOME_SETTING_SCOPES.STAGE3
        ? STAGE3_FIXED_METRONOME_TONE_ID
        : metronomeToneRef.current;
    const selectedTone = getMetronomeToneOption(toneId);
    if (!ensureMetronomeOutput(audio)) return;
    const output = accentOn
      ? (accent ? metronomeAccentGainRef.current : metronomeWeakGainRef.current)
      : metronomeAccentGainRef.current;
    const tickLevel = accentOn ? 1 : 0.82;

    if (selectedTone.id === "tick") {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(accentOn ? (accent ? 1840 : 920) : 1180, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(tickLevel * 0.4, now + (accentOn && accent ? 0.003 : 0.008));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (accentOn && accent ? 0.07 : 0.05));
      oscillator.connect(gain);
      gain.connect(output || audio.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.07);
      return;
    }

    const buffer = metronomeSampleBuffersRef.current[selectedTone.id];
    if (!buffer) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(accentOn ? (accent ? 1840 : 920) : 1180, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(tickLevel * 0.4, now + (accentOn && accent ? 0.003 : 0.008));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (accentOn && accent ? 0.07 : 0.05));
      oscillator.connect(gain);
      gain.connect(output || audio.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.07);
      return;
    }

    const source = audio.createBufferSource();
    const gain = audio.createGain();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(useSplitTone ? 1 : (accentOn ? (accent ? 1.08 : 0.96) : 1), now);
    gain.gain.setValueAtTime(tickLevel, now);
    source.connect(gain);
    gain.connect(output || audio.destination);
    source.start(now);
  }, [ensureMetronomeOutput]);

  const playVisualLabTick = useCallback((beatState = METRONOME_BEAT_STATES.NORMAL) => {
    const audio = audioRef.current;
    if (!audio || beatState === METRONOME_BEAT_STATES.MUTE) return;
    if (audio.state === "suspended") {
      audio.resume().catch(() => {});
      return;
    }

    const now = audio.currentTime;
    const accent = beatState === METRONOME_BEAT_STATES.ACCENT;
    const scope = activeMetronomeScopeRef.current;
    const useSplitTone = scope === METRONOME_SETTING_SCOPES.STANDALONE;
    const toneId = useSplitTone
      ? (accent ? metronomeAccentToneRef.current : metronomeWeakToneRef.current)
      : scope === METRONOME_SETTING_SCOPES.STAGE3
        ? STAGE3_FIXED_METRONOME_TONE_ID
        : metronomeToneRef.current;
    const selectedTone = getMetronomeToneOption(toneId);
    const masterLevel = Math.max(0, Math.min(1, metronomeVolumeRef.current ?? 0.72));
    const tickLevel = (accent ? 1 : 0.5) * masterLevel;

    if (selectedTone.id === "tick") {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(accent ? 1840 : 920, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(tickLevel * 0.4, now + (accent ? 0.003 : 0.008));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (accent ? 0.07 : 0.05));
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.07);
      return;
    }

    const buffer = metronomeSampleBuffersRef.current[selectedTone.id];
    if (!buffer) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(accent ? 1840 : 920, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(tickLevel * 0.4, now + (accent ? 0.003 : 0.008));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (accent ? 0.07 : 0.05));
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.07);
      return;
    }

    const source = audio.createBufferSource();
    const gain = audio.createGain();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(useSplitTone ? 1 : (accent ? 1.08 : 0.96), now);
    gain.gain.setValueAtTime(tickLevel, now);
    source.connect(gain);
    gain.connect(audio.destination);
    source.start(now);
  }, []);

  const playPatternTick = useCallback((beatInBar = 0, subdivisionIndex = 0) => {
    const beatPatternState = metronomeBeatPatternRef.current[beatInBar] ?? getDefaultBeatState(beatInBar);
    if (beatPatternState === METRONOME_BEAT_STATES.MUTE) return;
    const isAccentBeat = subdivisionIndex === 0 && beatPatternState === METRONOME_BEAT_STATES.ACCENT;
    playTick(isAccentBeat, subdivisionIndex, false);
  }, [playTick]);

  const ensureBackingOutput = useCallback((audio) => {
    if (!audio) return false;
    if (
      backingMasterGainRef.current &&
      backingLimiterRef.current &&
      backingDrumGainRef.current &&
      backingBassGainRef.current &&
      backingPianoGainRef.current
    ) {
      return true;
    }
    const master = audio.createGain();
    const limiter = audio.createDynamicsCompressor();
    const drumGain = audio.createGain();
    const bassGain = audio.createGain();
    const pianoGain = audio.createGain();
    master.gain.setValueAtTime(0.78, audio.currentTime);
    drumGain.gain.setValueAtTime(getBackingPartOutputGain("drum", backingDrumVolumeRef.current), audio.currentTime);
    bassGain.gain.setValueAtTime(getBackingPartOutputGain("bass", backingBassVolumeRef.current), audio.currentTime);
    pianoGain.gain.setValueAtTime(getBackingPartOutputGain("piano", backingPianoVolumeRef.current), audio.currentTime);
    limiter.threshold.setValueAtTime(-10, audio.currentTime);
    limiter.knee.setValueAtTime(8, audio.currentTime);
    limiter.ratio.setValueAtTime(12, audio.currentTime);
    limiter.attack.setValueAtTime(0.004, audio.currentTime);
    limiter.release.setValueAtTime(0.12, audio.currentTime);
    drumGain.connect(master);
    bassGain.connect(master);
    pianoGain.connect(master);
    master.connect(limiter);
    limiter.connect(audio.destination);
    backingMasterGainRef.current = master;
    backingLimiterRef.current = limiter;
    backingDrumGainRef.current = drumGain;
    backingBassGainRef.current = bassGain;
    backingPianoGainRef.current = pianoGain;
    return true;
  }, []);

  const warmCoreAudioEngine = useCallback(async ({ resumeAudio = false } = {}) => {
    warmCoreAudioSampleFiles();
    if (coreAudioWarmReadyRef.current && backingPreparedSessionRef.current) return true;
    if (coreAudioWarmPromiseRef.current) return coreAudioWarmPromiseRef.current;

    coreAudioWarmPromiseRef.current = (async () => {
      const audioReady = resumeAudio ? await ensureAudioReady() : Boolean(ensureAudioContext());
      const audio = audioRef.current;
      if (!audio || (resumeAudio && !audioReady)) return false;

      await loadBackingBandSamples(audio);
      ensureMetronomeOutput(audio);
      ensureBackingOutput(audio);
      await prepareStage3BackingSession({
        progression: chordTransitionProgression,
        bpmValue: bpmRef.current,
        timeSignatureValue: metronomeTimeSignatureRef.current,
        preloadAudio: false,
      });
      coreAudioWarmReadyRef.current = true;
      return true;
    })()
      .catch((error) => {
        console.warn("Core audio engine warmup skipped.", error);
        return false;
      })
      .finally(() => {
        coreAudioWarmPromiseRef.current = null;
      });

    return coreAudioWarmPromiseRef.current;
  }, [
    chordTransitionProgression,
    ensureAudioContext,
    ensureAudioReady,
    ensureBackingOutput,
    ensureMetronomeOutput,
    loadBackingBandSamples,
    prepareStage3BackingSession,
  ]);

  const playBackingSample = useCallback((sampleId, when, volume = 0.6, playbackRate = 1, duration = null, part = "drum", shape = "") => {
    const audio = audioRef.current;
    const buffer = backingSampleBuffersRef.current[sampleId];
    if (!audio || !buffer || audio.state !== "running") return;
    if (!ensureBackingOutput(audio)) return;
    const source = audio.createBufferSource();
    const gain = audio.createGain();
    const safeVolume = Math.max(0, Math.min(0.86, volume));
    const output = part === "bass"
      ? backingBassGainRef.current
      : part === "piano"
        ? backingPianoGainRef.current
        : backingDrumGainRef.current;
    const activeSource = { source, gain };
    backingActiveSourcesRef.current.add(activeSource);
    source.onended = () => {
      backingActiveSourcesRef.current.delete(activeSource);
      try {
        source.disconnect();
      } catch {
        // Source may already be disconnected after an explicit stop.
      }
      try {
        gain.disconnect();
      } catch {
        // Gain may already be disconnected after an explicit stop.
      }
    };
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(Math.max(0.25, Math.min(4, playbackRate)), when);
    if (part === "piano") {
      const pianoAttack = 0.002;
      const pianoRelease = 0.075;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(safeVolume * 0.92, when + pianoAttack);
      if (Number.isFinite(duration) && duration > 0) {
        const end = when + duration;
        gain.gain.setValueAtTime(safeVolume * 0.78, Math.max(when + pianoAttack, end - pianoRelease));
        gain.gain.linearRampToValueAtTime(0.0001, end);
      }
      source.connect(gain);
      gain.connect(output || backingMasterGainRef.current);
      source.start(when);
      if (Number.isFinite(duration) && duration > 0) {
        source.stop(when + duration + 0.02);
      }
      return;
    }
    if (part === "drum" && (shape === "round-kick" || shape === "kick")) {
      const kickAttack = shape === "round-kick" ? 0.004 : 0.003;
      const kickRelease = shape === "round-kick" ? 0.055 : 0.04;
      const kickVolume = shape === "round-kick" ? safeVolume * 0.92 : safeVolume * 0.96;
      const end = when + (Number.isFinite(duration) && duration > 0 ? duration : 0.16);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(kickVolume, when + kickAttack);
      gain.gain.setValueAtTime(kickVolume * 0.82, Math.max(when + kickAttack, end - kickRelease));
      gain.gain.linearRampToValueAtTime(0.0001, end);
      source.connect(gain);
      gain.connect(output || backingMasterGainRef.current);
      source.start(when);
      source.stop(end + 0.02);
      return;
    }
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(safeVolume, when + 0.006);
    if (Number.isFinite(duration) && duration > 0) {
      const end = when + duration;
      gain.gain.setValueAtTime(safeVolume, Math.max(when + 0.008, end - 0.018));
      gain.gain.linearRampToValueAtTime(0.0001, end);
    }
    source.connect(gain);
    gain.connect(output || backingMasterGainRef.current);
    source.start(when);
    if (Number.isFinite(duration) && duration > 0) {
      source.stop(when + duration + 0.01);
    }
  }, [ensureBackingOutput]);

  const schedulePreparedBackingEvent = useCallback((event, when) => {
    if (!event) return;
    if (event.instrument === "drum" && !backingDrumEnabledRef.current) return;
    if (event.instrument === "bass" && !backingBassEnabledRef.current) return;
    if (event.instrument === "piano" && !backingPianoEnabledRef.current) return;
    const audio = audioRef.current;
    const compensation = getBackingEventTimingCompensation(event);
    const compensatedWhen = audio
      ? Math.max(audio.currentTime + 0.002, when - compensation)
      : when;
    playBackingSample(
      event.sample,
      compensatedWhen,
      event.volume,
      event.playbackRate,
      event.duration,
      event.instrument,
      event.shape,
    );
  }, [playBackingSample]);

  const fadeOutActiveBackingSources = useCallback((fadeSeconds = 0.04) => {
    const audio = audioRef.current;
    const now = audio?.currentTime ?? 0;
    const stopAt = audio ? now + fadeSeconds : 0;
    backingActiveSourcesRef.current.forEach(({ source, gain }) => {
      try {
        if (audio && gain?.gain) {
          if (typeof gain.gain.cancelAndHoldAtTime === "function") {
            gain.gain.cancelAndHoldAtTime(now);
          } else {
            gain.gain.cancelScheduledValues(now);
          }
          gain.gain.setTargetAtTime(0.0001, now, Math.max(0.006, fadeSeconds / 3));
        }
      } catch {
        // Gain automation can fail if the node has already ended.
      }
      try {
        source.stop(stopAt);
      } catch {
        // Source may have already ended or already been stopped.
      }
    });
  }, []);

  const stopBackingScheduler = useCallback(() => {
    backingSchedulerRunningRef.current = false;
    backingPendingSessionRef.current = null;
    backingPendingSessionKeyRef.current = "";
    fadeOutActiveBackingSources();
    if (backingSchedulerTimerRef.current) {
      window.clearInterval(backingSchedulerTimerRef.current);
      backingSchedulerTimerRef.current = null;
    }
  }, [fadeOutActiveBackingSources]);

  const runBackingScheduler = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !backingSchedulerRunningRef.current || gameStateRef.current !== GAME_STATES.PLAYING) return;
    let session = backingPreparedSessionRef.current;
    if (!session?.events?.length || !Number.isFinite(session.cycleSeconds) || session.cycleSeconds <= 0) return;
    const scheduleAheadSeconds = 0.5;
    while (backingCycleStartTimeRef.current + session.cycleSeconds < audio.currentTime - 0.02) {
      backingCycleStartTimeRef.current += session.cycleSeconds;
      backingNextEventIndexRef.current = 0;
    }
    const pendingSession = backingPendingSessionRef.current;
    const measureSeconds = session.beatsPerMeasure * session.beatSeconds;
    const relativeTime = Math.max(0, audio.currentTime - backingCycleStartTimeRef.current);
    const nextMeasureTime = backingCycleStartTimeRef.current + (Math.floor(relativeTime / measureSeconds) + 1) * measureSeconds;
    while (backingNextEventIndexRef.current < session.events.length) {
      const event = session.events[backingNextEventIndexRef.current];
      const eventTime = backingCycleStartTimeRef.current + event.offsetSeconds;
      if (eventTime < audio.currentTime - 0.02) {
        backingNextEventIndexRef.current += 1;
        continue;
      }
      if (pendingSession && eventTime >= nextMeasureTime) break;
      if (eventTime >= audio.currentTime + scheduleAheadSeconds) break;
      schedulePreparedBackingEvent(event, eventTime);
      backingNextEventIndexRef.current += 1;
    }
    if (pendingSession && nextMeasureTime < audio.currentTime + scheduleAheadSeconds) {
      backingPreparedSessionRef.current = pendingSession;
      backingPreparedSessionKeyRef.current = backingPendingSessionKeyRef.current;
      backingPendingSessionRef.current = null;
      backingPendingSessionKeyRef.current = "";
      session = pendingSession;
      const nextMeasureIndex = Math.floor((nextMeasureTime - backingCycleStartTimeRef.current) / measureSeconds);
      const nextMeasureOffset = (nextMeasureIndex % session.cycleMeasures) * session.beatsPerMeasure * session.beatSeconds;
      backingCycleStartTimeRef.current = nextMeasureTime - nextMeasureOffset;
      backingNextEventIndexRef.current = session.events.findIndex((event) => event.offsetSeconds >= nextMeasureOffset);
      if (backingNextEventIndexRef.current < 0) backingNextEventIndexRef.current = 0;
      while (backingNextEventIndexRef.current < session.events.length) {
        const event = session.events[backingNextEventIndexRef.current];
        const eventTime = backingCycleStartTimeRef.current + event.offsetSeconds;
        if (eventTime >= audio.currentTime + scheduleAheadSeconds) break;
        schedulePreparedBackingEvent(event, eventTime);
        backingNextEventIndexRef.current += 1;
      }
    }
    if (backingNextEventIndexRef.current >= session.events.length) {
      backingNextEventIndexRef.current = 0;
      backingCycleStartTimeRef.current += session.cycleSeconds;
      while (backingNextEventIndexRef.current < session.events.length) {
        const event = session.events[backingNextEventIndexRef.current];
        const eventTime = backingCycleStartTimeRef.current + event.offsetSeconds;
        if (eventTime < audio.currentTime - 0.02) {
          backingNextEventIndexRef.current += 1;
          continue;
        }
        if (eventTime >= audio.currentTime + scheduleAheadSeconds) break;
        schedulePreparedBackingEvent(event, eventTime);
        backingNextEventIndexRef.current += 1;
      }
    }
  }, [schedulePreparedBackingEvent]);

  const startBackingScheduler = useCallback((measureIndex = 0) => {
    const audio = audioRef.current;
    const session = backingPreparedSessionRef.current;
    if (!audio || !session?.events?.length) return;
    stopBackingScheduler();
    const startOffsetSeconds = Math.max(0, measureIndex) * session.beatsPerMeasure * session.beatSeconds;
    const safeStartOffset = startOffsetSeconds % session.cycleSeconds;
    backingNextEventIndexRef.current = session.events.findIndex((event) => event.offsetSeconds >= safeStartOffset);
    if (backingNextEventIndexRef.current < 0) backingNextEventIndexRef.current = 0;
    backingCycleStartTimeRef.current = audio.currentTime + 0.06 - safeStartOffset;
    backingSchedulerRunningRef.current = true;
    runBackingScheduler();
    backingSchedulerTimerRef.current = window.setInterval(runBackingScheduler, 25);
  }, [runBackingScheduler, stopBackingScheduler]);

  const stopMetronomeVisualLab = useCallback(() => {
    window.clearInterval(metronomeVisualLabTimerRef.current);
    metronomeVisualLabTimerRef.current = null;
    setMetronomeVisualLabPlaying(false);
  }, []);

  const toggleMetronomeVisualLab = useCallback(async () => {
    if (metronomeVisualLabPlaying) {
      stopMetronomeVisualLab();
      return;
    }

    const ready = await ensureAudioReady();
    await loadMetronomeSamples(audioRef.current);
    if (!ready) return;

    metronomeVisualLabBeatRef.current = 0;
    flushSync(() => setMetronomeVisualLabBeat(0));
    playVisualLabTick(metronomeVisualLabBeatPattern[0] ?? METRONOME_BEAT_STATES.ACCENT);
    setMetronomeVisualLabPlaying(true);
  }, [ensureAudioReady, loadMetronomeSamples, metronomeVisualLabBeatPattern, metronomeVisualLabPlaying, playVisualLabTick, stopMetronomeVisualLab]);

  useEffect(() => {
    metronomeVisualLabBeatRef.current = metronomeVisualLabBeat;
  }, [metronomeVisualLabBeat]);

  useEffect(() => {
    if (appMode !== APP_MODES.DESIGN_LAB || designLabSection !== "test") {
      stopMetronomeVisualLab();
    }
  }, [appMode, designLabSection, stopMetronomeVisualLab]);

  useEffect(() => {
    if (!metronomeVisualLabPlaying) return undefined;

    window.clearInterval(metronomeVisualLabTimerRef.current);
    metronomeVisualLabTimerRef.current = window.setInterval(() => {
      const nextBeat = (metronomeVisualLabBeatRef.current + 1) % metronomeVisualLabBeatsPerMeasure;
      metronomeVisualLabBeatRef.current = nextBeat;
      flushSync(() => setMetronomeVisualLabBeat(nextBeat));
      playVisualLabTick(metronomeVisualLabBeatPattern[nextBeat] ?? METRONOME_BEAT_STATES.NORMAL);
    }, beatMs);

    return () => {
      window.clearInterval(metronomeVisualLabTimerRef.current);
      metronomeVisualLabTimerRef.current = null;
    };
  }, [beatMs, metronomeVisualLabBeatPattern, metronomeVisualLabBeatsPerMeasure, metronomeVisualLabPlaying, playVisualLabTick]);

  useEffect(() => {
    metronomeVisualLabBeatRef.current = 0;
    setMetronomeVisualLabBeat(0);
  }, [metronomeVisualLabBeatsPerMeasure, metronomeVisualLabMode]);

  const playCountInVoice = useCallback((beatIndex = 0) => {
    const word = COUNT_IN_VOICE_WORDS[beatIndex] ?? String(beatIndex + 1);
    const voiceMode = metronomeCountInVoiceModeRef.current;
    if (voiceMode === "off") {
      playTick(metronomeAccentRef.current && beatIndex === 0, 0);
      return;
    }
    const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    if (!canSpeak) {
      playTick(metronomeAccentRef.current && beatIndex === 0, 0);
      return;
    }

    try {
      const utterance = new window.SpeechSynthesisUtterance(word);
      const voices = window.speechSynthesis.getVoices?.() ?? [];
      const femaleVoice = voices.find((voice) => /^en/i.test(voice.lang) && /female|woman|zira|samantha|victoria|karen|serena|susan|aria|jenny|ava/i.test(voice.name))
        ?? voices.find((voice) => /^en[-_]?US/i.test(voice.lang) && /zira|samantha|jenny|aria|ava/i.test(voice.name));
      const maleVoice = voices.find((voice) => /^en/i.test(voice.lang) && /male|man|david|mark|daniel|george|alex|fred|tom|guy/i.test(voice.name))
        ?? voices.find((voice) => /^en[-_]?US/i.test(voice.lang) && /david|mark|guy/i.test(voice.name));
      const preferredVoice = voiceMode === "male" ? maleVoice : femaleVoice;
      const englishVoice = preferredVoice
        ?? voices.find((voice) => /^en[-_]?US/i.test(voice.lang) && voice.localService)
        ?? voices.find((voice) => /^en/i.test(voice.lang) && voice.localService)
        ?? voices.find((voice) => /^en/i.test(voice.lang));
      if (englishVoice) utterance.voice = englishVoice;
      utterance.lang = englishVoice?.lang || "en-US";
      utterance.rate = 1.18;
      utterance.pitch = voiceMode === "male" ? 0.76 : 0.88;
      utterance.volume = Math.max(0.25, Math.min(0.9, metronomeVolumeRef.current ?? 0.72));
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      playTick(metronomeAccentRef.current && beatIndex === 0, 0);
    }
  }, [playTick]);

  const cancelCountInVoice = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
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

  const playShooterSound = useCallback(async (type = "hit", options = {}) => {
    const preview = Boolean(options.preview);
    if (!preview && (appModeRef.current !== APP_MODES.SHOOTER || !shooterSoundOnRef.current)) return;
    const ready = await ensureAudioReady();
    const audio = audioRef.current;
    if (!ready || !audio) return;

    const now = audio.currentTime;
    const master = audio.createGain();
    master.gain.setValueAtTime(1, now);
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

    const playNoiseHit = ({ start = 0, length = 0.06, level = 0.38, frequency = 1400, q = 4 }) => {
      const sampleRate = audio.sampleRate;
      const frameCount = Math.max(1, Math.floor(sampleRate * length));
      const buffer = audio.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);
      let seed = 22222;
      for (let index = 0; index < frameCount; index += 1) {
        const fade = 1 - index / frameCount;
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const grain = (seed / 2147483648) - 1;
        data[index] = grain * fade * fade;
      }

      const source = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      const begin = now + start;
      const end = begin + length;
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(frequency, begin);
      filter.Q.setValueAtTime(q, begin);
      gain.gain.setValueAtTime(0.0001, begin);
      gain.gain.exponentialRampToValueAtTime(level, begin + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start(begin);
      source.stop(end + 0.01);
    };

    const playHitClick = ({ start = 0, frequency = 980, length = 0.032, level = 0.24 }) => {
      playTone({ wave: "square", from: frequency, to: frequency * 0.72, start, length, level });
    };

    const playCrack = (candidateId = "chime-crash-clean", combo = 1) => {
      const candidate =
        SHOOTER_HIT_SOUND_CANDIDATES.find((item) => item.id === candidateId)
        ?? SHOOTER_HIT_SOUND_CANDIDATES[0];
      const comboBoost = combo >= 20 ? 1.18 : combo >= 10 ? 1.08 : 1;
      master.gain.setValueAtTime(1.55 * comboBoost, now);
      (candidate.chime ?? []).forEach((frequency, index) => {
        playTone({
          wave: index % 2 === 0 ? "triangle" : "sine",
          from: frequency,
          to: frequency,
          start: index * 0.003,
          length: candidate.tail * (index === 0 ? 0.82 : 0.58),
          level: ((candidate.chimeLevel * 1.5) / Math.max(1, candidate.chime.length)) * comboBoost,
        });
      });
      if (candidate.clap && candidate.clapLevel) {
        playNoiseHit({
          start: 0,
          length: Math.max(0.032, candidate.tail * 0.68),
          level: candidate.clapLevel * 1.42 * comboBoost,
          frequency: candidate.clap,
          q: 2.8,
        });
      }
      if (candidate.hat && candidate.hatLevel) {
        playNoiseHit({
          start: 0.006,
          length: 0.034,
          level: (candidate.accent || combo >= 20 ? candidate.hatLevel * 1.58 : candidate.hatLevel * 1.34) * comboBoost,
          frequency: candidate.hat,
          q: 9,
        });
      }
      if (candidate.sparkle && candidate.sparkleLevel) {
        playNoiseHit({
          start: 0.018,
          length: 0.038,
          level: candidate.sparkleLevel * 1.52 * comboBoost,
          frequency: candidate.sparkle,
          q: 12,
        });
      }
    };

    if (type === "spawn") {
      master.gain.setValueAtTime(0.13, now);
      playTone({ wave: "triangle", from: 620, to: 920, length: 0.11, level: 0.42 });
      playTone({ wave: "sine", from: 1240, to: 980, start: 0.035, length: 0.08, level: 0.18 });
      return;
    }

    if (type === "miss") {
      master.gain.setValueAtTime(0.1, now);
      playTone({ wave: "triangle", from: 220, to: 110, length: 0.26, level: 0.34 });
      playTone({ wave: "sine", from: 165, to: 82, start: 0.08, length: 0.22, level: 0.2 });
      return;
    }

    if (type === "gameover") {
      master.gain.setValueAtTime(0.12, now);
      playTone({ wave: "sine", from: 330, to: 220, length: 0.24, level: 0.38 });
      playTone({ wave: "sine", from: 247, to: 123, start: 0.14, length: 0.3, level: 0.3 });
      return;
    }

    const hitCombo = Math.max(1, Number(options.combo) || 1);
    const candidateId = options.candidateId ?? (hitCombo >= 20 ? "chime-crash-combo" : "chime-crash-clean");
    playCrack(candidateId, hitCombo);
  }, [ensureAudioReady]);

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
    const difficulty = shooterDifficultyRef.current;
    const level = getShooterEffectiveLevel(getShooterLevel(hitsRef.current), difficulty, gameTimeRef.current);
    const activeTargetCount = shooterTargetsRef.current.filter((target) => !target.defeated).length;
    if (activeTargetCount >= level.maxTargets) return false;
    const trainingNotes = getShooterDifficultyNotes(activeNotesRef.current, difficulty, gameTimeRef.current, selectedPentatonicRef.current, patternRef.current);
    activeNotesRef.current = trainingNotes;
    const pool = getShooterPool(trainingNotes, level);
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
        duration: getShooterTargetDuration(difficulty),
        difficulty,
        hitbox: SHOOTER_TARGET_HITBOX,
        level: level.name,
        phaseLabel: level.phaseLabel,
      },
    ];
    shooterNextSpawnAtRef.current = gameTimeRef.current + getShooterSpawnGap(difficulty);
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

  const getShooterGuitarAimAngle = useCallback((target) => {
    if (!target) return 0;
    const rect = shooterArenaRef.current?.getBoundingClientRect?.();
    if (rect?.width && rect?.height) {
      const targetX = (rect.width * (Number(target.x) || 50)) / 100;
      const targetY = (rect.height * (Number(target.y) || 8)) / 100;
      const pivotX = (rect.width * SHOOTER_GUITAR_PIVOT_PERCENT.x) / 100;
      const pivotY = (rect.height * SHOOTER_GUITAR_PIVOT_PERCENT.y) / 100;
      const dx = targetX - pivotX;
      const dy = Math.max(6, pivotY - targetY);
      return clampValue(Math.atan2(dx, dy) * (180 / Math.PI), -SHOOTER_GUITAR_AIM_LIMIT_DEG, SHOOTER_GUITAR_AIM_LIMIT_DEG);
    }
    const dx = (Number(target.x) || 50) - SHOOTER_GUITAR_PIVOT_PERCENT.x;
    const dy = Math.max(1.2, SHOOTER_GUITAR_PIVOT_PERCENT.y - (Number(target.y) || 8));
    return clampValue(Math.atan2(dx, dy) * (180 / Math.PI), -SHOOTER_GUITAR_AIM_LIMIT_DEG, SHOOTER_GUITAR_AIM_LIMIT_DEG);
  }, []);

  const applyShooterGuitarAim = useCallback((target, force = false) => {
    const node = shooterGuitarPlayerRef.current;
    if (!node) return;
    const angle = getShooterGuitarAimAngle(target);
    const targetId = target?.id ?? null;
    const lastAim = lastShooterGuitarAimRef.current;
    if (
      !force
      && lastAim.targetId === targetId
      && lastAim.angle != null
      && Math.abs(lastAim.angle - angle) < SHOOTER_GUITAR_AIM_MIN_DELTA_DEG
    ) {
      return;
    }
    lastShooterGuitarAimRef.current = { targetId, angle };
    node.style.setProperty("--aim-shift", "0px");
    node.style.setProperty("--aim-tilt", "0deg");
    node.style.setProperty("--guitar-aim", `${angle.toFixed(2)}deg`);
    node.style.setProperty("--arm-aim", `${clampValue(angle * 0.22, -5, 5).toFixed(2)}deg`);
  }, [getShooterGuitarAimAngle]);

  const aimShooterAtTarget = useCallback((target, holdMs = 190) => {
    applyShooterGuitarAim(target, true);
    window.clearTimeout(shooterAimResetTimerRef.current);
    shooterAimResetTimerRef.current = window.setTimeout(() => {
      applyShooterGuitarAim(getShooterPrimaryAimTarget(shooterTargetsRef.current), true);
    }, holdMs);
  }, [applyShooterGuitarAim]);

  const getShooterArenaPoint = useCallback((x, y) => {
    const rect = shooterArenaRef.current?.getBoundingClientRect?.();
    if (!rect?.width || !rect?.height) return null;
    return {
      x: (rect.width * x) / 100,
      y: (rect.height * y) / 100,
    };
  }, []);

  const applyShooterTargetTransform = useCallback((target, y = getShooterTargetYAt(target, gameTimeRef.current)) => {
    const node = shooterTargetNodesRef.current.get(target?.id);
    if (!node || !target) return;
    const point = getShooterArenaPoint(target.x, y);
    if (!point) return;
    node.style.setProperty("--target-x-px", `${point.x}px`);
    node.style.setProperty("--target-y-px", `${point.y}px`);
    node.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
  }, [getShooterArenaPoint]);

  const showImmediateProjectile = useCallback((projectile) => {
    const arena = shooterArenaRef.current;
    if (!arena || !projectile) return;
    const node = document.createElement("div");
    const projectileAssetSrc = projectile.projectileAssetSrc;
    const startPoint = getShooterArenaPoint(projectile.startX, projectile.startY);
    const endPoint = getShooterArenaPoint(projectile.endX, projectile.endY);
    node.className = `energyProjectile energyProjectile--immediate ${projectileAssetSrc ? "energyProjectile--imageProjectile" : ""}`;
    if (projectileAssetSrc) {
      const asset = document.createElement("img");
      asset.alt = "";
      asset.setAttribute("aria-hidden", "true");
      asset.className = "energyProjectileAsset";
      asset.draggable = false;
      asset.src = projectileAssetSrc;
      node.appendChild(asset);
    }
    node.style.setProperty("--projectile-start-x", `${projectile.startX}%`);
    node.style.setProperty("--projectile-start-y", `${projectile.startY}%`);
    node.style.setProperty("--projectile-end-x", `${projectile.endX}%`);
    node.style.setProperty("--projectile-end-y", `${projectile.endY}%`);
    node.style.setProperty("--projectile-start-x-px", `${startPoint?.x ?? 0}px`);
    node.style.setProperty("--projectile-start-y-px", `${startPoint?.y ?? 0}px`);
    node.style.setProperty("--projectile-end-x-px", `${endPoint?.x ?? 0}px`);
    node.style.setProperty("--projectile-end-y-px", `${endPoint?.y ?? 0}px`);
    node.style.setProperty("--projectile-duration-ms", `${projectile.duration}ms`);
    node.style.setProperty("--projectile-angle", `${projectile.angle ?? 0}deg`);
    node.style.setProperty("--projectile-spin", `${projectile.spin ?? 10}deg`);
    arena.appendChild(node);
    projectileNodesRef.current.set(projectile.id, node);
    window.setTimeout(() => {
      node.classList.add("energyProjectile--impacting");
    }, Math.max(0, Math.round(projectile.duration * SHOOTER_PROJECTILE_IMPACT_RATIO) - SHOOTER_PROJECTILE_IMPACT_SYNC_MS));
    window.setTimeout(() => {
      projectileNodesRef.current.delete(projectile.id);
      node.remove();
    }, projectile.duration + SHOOTER_PROJECTILE_CONTACT_HOLD_MS);
  }, [getShooterArenaPoint]);

  const completeShooterTargetImpact = useCallback((targetId) => {
    const target = shooterTargetsRef.current.find((item) => item.id === targetId);
    if (!target || target.defeated) return;

    const y = Number(target.y) || getShooterTargetYAt(target, gameTimeRef.current);
    applyShooterTargetTransform(target, y);

    const node = shooterTargetNodesRef.current.get(target.id);
    const arenaHeight = shooterArenaRef.current?.getBoundingClientRect?.()?.height ?? 0;
    const fallDistancePx = arenaHeight && target.duration
      ? Math.max(2, Math.min(18, ((arenaHeight * 0.8) / target.duration) * SHOOTER_TARGET_HIT_EFFECT_MS))
      : 8;
    node?.style.setProperty("--target-break-fall-px", `${fallDistancePx}px`);
    node?.classList.remove("fallingTarget");
    node?.classList.add("impacting", "defeated");

  const breakEffect = {
    id: shooterBreakEffectIdRef.current++,
    targetId: target.id,
    note: target.note,
    x: target.x,
    y,
    bornAt: gameTimeRef.current,
  };
  shooterBreakEffectsRef.current = [...shooterBreakEffectsRef.current, breakEffect].slice(-12);
  setShooterBreakEffects([...shooterBreakEffectsRef.current]);

    shooterTargetsRef.current = shooterTargetsRef.current.map((currentTarget) => (
      currentTarget.id === target.id
        ? {
            ...currentTarget,
            y,
            defeated: true,
            hitAt: gameTimeRef.current,
            impactAt: undefined,
          }
        : currentTarget
    ));

    setFeedback("Success");
    flashStage("hit");
    playShooterSound("hit", { combo: Number(target.hitCombo) || 1 });
    setShooterTargets([...shooterTargetsRef.current]);
  }, [applyShooterTargetTransform, flashStage, playShooterSound]);

  const fireProjectile = useCallback((target, noteName) => {
    const muzzleX = 50;
    const muzzleY = 79;
    const targetY = getShooterTargetYAt(target, gameTimeRef.current);
    const firstContact = getShooterHitboxContact(target, muzzleX, muzzleY, targetY);
    const estimatedDuration = Math.round(SHOOTER_PROJECTILE_MS * firstContact.durationRatio);
    const impactY = getShooterTargetYAt(target, gameTimeRef.current + estimatedDuration);
    const contact = getShooterHitboxContact(target, muzzleX, muzzleY, impactY);
    const angle = Math.atan2(contact.y - muzzleY, contact.x - muzzleX) * (180 / Math.PI);
    const projectileDuration = Math.round(SHOOTER_PROJECTILE_MS * contact.durationRatio);
    aimShooterAtTarget(target, 105);
    const projectile = {
      id: projectileIdRef.current++,
      note: noteName,
      startX: muzzleX,
      startY: muzzleY,
      endX: contact.x,
      endY: contact.y,
      bornAt: gameTimeRef.current,
      duration: projectileDuration,
      angle,
      spin: Math.random() < 0.5 ? -4 - Math.random() * 5 : 4 + Math.random() * 5,
      projectileAssetSrc: selectedGuitarVariant.projectileAssetSrc,
      renderedByDom: true,
    };
    showImmediateProjectile(projectile);

    projectilesRef.current = [
      ...projectilesRef.current,
      projectile,
    ];

    setProjectiles([...projectilesRef.current]);
    return projectile;
  }, [aimShooterAtTarget, selectedGuitarVariant.projectileAssetSrc, showImmediateProjectile]);

  const judgeShooterNote = useCallback(
    (detectedPitchName) => {
      const now = gameTimeRef.current;
      if (shooterReleaseLockRef.current === detectedPitchName) return;
      if (lastShotRef.current.note === detectedPitchName && now - lastShotRef.current.time < 220) return;

      const orderedTargets = shooterTargetsRef.current
        .map((target, index) => ({ target, index }))
        .filter(({ target }) => !target.defeated && target.impactAt == null)
        .sort((a, b) => b.target.y - a.target.y || a.target.bornAt - b.target.bornAt);
      const frontTarget = orderedTargets[0] ?? null;
      const target = frontTarget?.target ?? null;
      const targetIndex = frontTarget?.index ?? -1;
      const targetPitchName = target?.detail?.pitch ?? target?.note ?? null;
      const matchesFrontTarget = Boolean(targetPitchName && detectedPitchName && targetPitchName === detectedPitchName);
      lastShotRef.current = { note: detectedPitchName, time: now };
      shooterReleaseLockRef.current = detectedPitchName;

      if (!target || !matchesFrontTarget) {
        setFeedback("Miss");
        flashStage("miss");
        playShooterSound("miss");
        return;
      }

      const projectile = fireProjectile(target, detectedPitchName);
      const projectileDuration = projectile?.duration ?? 0;
      const impactDelay = Math.max(
        0,
        Math.round(projectileDuration * SHOOTER_PROJECTILE_IMPACT_RATIO) - SHOOTER_PROJECTILE_IMPACT_SYNC_MS,
      );
      window.setTimeout(() => {
        completeShooterTargetImpact(target.id);
      }, impactDelay);
      const nextCombo = comboRef.current + 1;
      shooterTargetsRef.current = shooterTargetsRef.current.map((currentTarget, index) => (
        index === targetIndex
          ? {
              ...currentTarget,
              impactAt: now + impactDelay,
              impactX: projectile?.endX ?? currentTarget.x,
              impactY: projectile?.endY ?? currentTarget.y,
              hitCombo: nextCombo,
            }
          : currentTarget
      ));
      setShooterTargets([...shooterTargetsRef.current]);
      setFeedback("Fire");
      scoreRef.current += 100;
      setScore((value) => value + 100);
      comboRef.current = nextCombo;
      maxComboRef.current = Math.max(maxComboRef.current, nextCombo);
      setMaxCombo((current) => Math.max(current, nextCombo));
      setCombo(nextCombo);
      setHits((value) => {
        const next = value + 1;
        hitsRef.current = next;
        return next;
      });
      attemptsRef.current += 1;
      setAttempts((value) => value + 1);
    },
    [completeShooterTargetImpact, fireProjectile, flashStage, playShooterSound],
  );

  const finalizeShooterRecord = useCallback((reason = "reset") => {
    if (shooterSessionSavedRef.current) return;
    const survivalMs = Math.max(0, Math.round(gameTimeRef.current));
    const shots = Math.max(0, Number(attemptsRef.current) || 0);
    const sessionHits = Math.max(0, Number(hitsRef.current) || 0);
    const sessionScore = Math.max(0, Number(scoreRef.current) || 0);
    const sessionMaxCombo = Math.max(0, Number(maxComboRef.current) || 0);
    if (survivalMs < 1000 && shots === 0 && sessionHits === 0 && sessionScore === 0) {
      shooterSessionSavedRef.current = true;
      return;
    }
    const session = {
      reason,
      difficulty: shooterDifficultyRef.current,
      score: sessionScore,
      maxCombo: sessionMaxCombo,
      kills: sessionHits,
      hits: sessionHits,
      shots,
      accuracy: shots > 0 ? Math.round((sessionHits / shots) * 100) : 0,
      survivalMs,
    };
    setShooterRecords((records) => RecordService.addShooterSession(records, session));
    shooterSessionSavedRef.current = true;
  }, []);

  const readMicrophone = useCallback(
    (now) => {
      const analyser = analyserRef.current;
      const buffer = bufferRef.current;
      const audio = audioRef.current;
      if (!analyser || !buffer || !audio) return;
      if (now - lastMicReadAtRef.current < MIC_READ_INTERVAL_MS) return;
      lastMicReadAtRef.current = now;

      analyser.getFloatTimeDomainData(buffer);
      const rms = getRms(buffer);
      const inputGain = isMobileLayoutRef.current ? 22 : 12;
      const normalizedLevel = Math.min(1, rms * inputGain);

      if (now - lastDebugUpdateRef.current > MIC_DISPLAY_UPDATE_MS) {
        setSignalLevel(normalizedLevel);
        lastDebugUpdateRef.current = now;
      }

      const minVolume = isMobileLayoutRef.current ? LOW_SIGNAL_LEVEL * 0.42 : LOW_SIGNAL_LEVEL;
      const gameNoteTolerance = isMobileLayoutRef.current ? 68 : 45;

      if (rms < minVolume) {
        shooterReleaseLockRef.current = null;
        stableGameNoteRef.current = { note: null, count: 0 };
        if (now - lastDetectedDisplayUpdateRef.current > MIC_LOW_SIGNAL_DISPLAY_UPDATE_MS) {
          lastDetectedDisplayUpdateRef.current = now;
          setDetected(null);
          setDetectedPitch(null);
        }
        return;
      }

      if (now - lastMicAnalysisAtRef.current < MIC_ANALYSIS_INTERVAL_MS) return;
      lastMicAnalysisAtRef.current = now;

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
      let judgePitchName = gameNote?.pitch ?? null;

      if (appModeRef.current === APP_MODES.SHOOTER && gameStateRef.current === GAME_STATES.PLAYING) {
        judgePitchName = gameNote?.pitch ?? displayNote?.pitch ?? null;
      }

      if (judgePitchName) {
        stableGameNoteRef.current =
          stableGameNoteRef.current.note === judgePitchName
            ? { note: judgePitchName, count: stableGameNoteRef.current.count + 1 }
            : { note: judgePitchName, count: 1 };
      } else {
        stableGameNoteRef.current = { note: null, count: 0 };
      }
      if (now - lastDetectedDisplayUpdateRef.current > MIC_DISPLAY_UPDATE_MS) {
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
        judgePitchName &&
        stableGameNoteRef.current.count >= 1
      ) {
        judgeShooterNote(judgePitchName);
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
        if (countInTick < beatsPerMeasure && countInTick !== lastBeatRef.current) {
          lastBeatRef.current = countInTick;
          const countInBeat = countInTick % beatsPerMeasure;
          flushSync(() => {
            setBeat(countInBeat);
          });
          playCountInVoice(countInBeat);
        }
        return;
      }

      gameTimeRef.current += deltaMs;
      if (metronomeTrackerModeRef.current === "timer") {
        const totalTimerMs = metronomeTrackerTimerTotalMsRef.current;
        const elapsedMs = totalTimerMs > 0 ? Math.min(gameTimeRef.current, totalTimerMs) : gameTimeRef.current;
        if (
          (totalTimerMs > 0 && elapsedMs >= totalTimerMs) ||
          elapsedMs - metronomeTrackerElapsedUpdateRef.current >= 250
        ) {
          metronomeTrackerElapsedUpdateRef.current = elapsedMs;
          setMetronomeTrackerElapsedMs(elapsedMs);
        }
        if (totalTimerMs > 0 && gameTimeRef.current >= totalTimerMs) {
          setMetronomeTrackerElapsedMs(totalTimerMs);
          if (metronomeTimerResetWhenReachedRef.current) {
            gameTimeRef.current = 0;
            lastBeatRef.current = -1;
            metronomeTrackerElapsedUpdateRef.current = 0;
            setBeat(0);
            setMetronomeTrackerElapsedMs(0);
            setStage3MeasureProgress(0);
          }
          if (metronomeTimerStopWhenReachedRef.current) {
            setFeedback("Complete");
            setState(GAME_STATES.IDLE);
            return;
          }
        }
      }
      setStage3MeasureProgress((gameTimeRef.current % currentMeasureMs) / currentMeasureMs);
      const currentTick = Math.floor(gameTimeRef.current / currentTickMs);
      if (currentTick === lastBeatRef.current) return;

      lastBeatRef.current = currentTick;
      const currentBeat = Math.floor(currentTick / clicksPerBeat);
      const beatInBar = currentBeat % beatsPerMeasure;
      const subdivisionIndex = currentTick % clicksPerBeat;
      const isFirstBeat = currentBeat === 0;
      if (subdivisionIndex === 0) {
        flushSync(() => {
          setBeat(beatInBar);
        });
      }
      playPatternTick(beatInBar, subdivisionIndex);

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
    [playCountInVoice, playPatternTick, selectedCategory.sequence, setState],
  );

  const runShooterFrame = useCallback(
    (deltaMs) => {
      gameTimeRef.current += deltaMs;
      const currentBeatMs = getBeatMs(bpmRef.current);

      if (
        shooterTargetsRef.current.length === 0
        && shooterNextSpawnAtRef.current - gameTimeRef.current > SHOOTER_EMPTY_REFILL_MS
      ) {
        shooterNextSpawnAtRef.current = gameTimeRef.current + SHOOTER_EMPTY_REFILL_MS;
      }

      if (gameTimeRef.current >= shooterNextSpawnAtRef.current) {
        const spawned = spawnShooterTarget();
        if (!spawned && shooterTargetsRef.current.length > 0) {
          shooterNextSpawnAtRef.current = gameTimeRef.current + 250;
        }
      }

      const currentBeat = Math.floor(gameTimeRef.current / currentBeatMs);
      if (currentBeat !== lastBeatRef.current) {
        lastBeatRef.current = currentBeat;
        const beatInBar = currentBeat % 4;
        setBeat(beatInBar);
      }

      let targetsChanged = false;
      shooterTargetsRef.current.forEach((target) => {
        if (target.defeated) return;
        const progress = Math.min(1, (gameTimeRef.current - target.bornAt) / target.duration);
        const nextY = 8 + progress * 80;
        if (target.y !== nextY) {
          target.y = nextY;
        }
        applyShooterTargetTransform(target, nextY);
      });
      applyShooterGuitarAim(getShooterPrimaryAimTarget(shooterTargetsRef.current));

      const defeatedExpiredTargets = shooterTargetsRef.current.filter(
        (target) => target.defeated && gameTimeRef.current - (target.hitAt ?? target.bornAt) >= SHOOTER_TARGET_HIT_EFFECT_MS,
      );
      const impactedTargets = shooterTargetsRef.current.filter(
        (target) => target.impactAt != null && !target.defeated && gameTimeRef.current >= target.impactAt,
      );
      if (impactedTargets.length > 0) {
        impactedTargets.forEach((target) => {
          completeShooterTargetImpact(target.id);
        });
        targetsChanged = true;
      }
      const missedTargets = shooterTargetsRef.current.filter((target) => (
        !target.defeated
        && target.impactAt == null
        && (
          gameTimeRef.current - target.bornAt >= target.duration
          || getShooterTargetYAt(target, gameTimeRef.current) >= SHOOTER_LIFE_LINE_PERCENT
        )
      ));
      const removedTargetIds = new Set([...defeatedExpiredTargets, ...missedTargets].map((target) => target.id));
      if (removedTargetIds.size > 0) {
        shooterTargetsRef.current = shooterTargetsRef.current.filter((target) => !removedTargetIds.has(target.id));
      }
      if (missedTargets.length > 0) {
        comboRef.current = 0;
        setCombo(0);
        attemptsRef.current += missedTargets.length;
        setAttempts((value) => value + missedTargets.length);
        setMissCount((value) => value + missedTargets.length);
        const nextLives = Math.max(0, shooterLivesRef.current - missedTargets.length);
        shooterLivesRef.current = nextLives;
        setShooterLives(nextLives);
        setFeedback(nextLives <= 0 ? "Game Over" : "Miss");
        flashStage("miss");
        playShooterSound(nextLives <= 0 ? "gameover" : "miss");
        if (nextLives <= 0) {
          finalizeShooterRecord("gameover");
          shooterTargetsRef.current = [];
          setState(GAME_STATES.GAMEOVER);
        }
      }

      const nextProjectiles = projectilesRef.current.filter(
        (projectile) => gameTimeRef.current - projectile.bornAt <= projectile.duration + SHOOTER_PROJECTILE_CONTACT_HOLD_MS,
      );
      if (nextProjectiles.length !== projectilesRef.current.length) {
        projectilesRef.current = nextProjectiles;
        setProjectiles([...projectilesRef.current]);
      }
  const nextBreakEffects = shooterBreakEffectsRef.current.filter(
    (effect) => gameTimeRef.current - effect.bornAt <= SHOOTER_TARGET_BREAK_EFFECT_MS,
  );
  if (nextBreakEffects.length !== shooterBreakEffectsRef.current.length) {
    shooterBreakEffectsRef.current = nextBreakEffects;
    setShooterBreakEffects([...shooterBreakEffectsRef.current]);
  }
      if (removedTargetIds.size > 0 || targetsChanged) {
        setShooterTargets([...shooterTargetsRef.current]);
      }
    },
    [applyShooterGuitarAim, applyShooterTargetTransform, completeShooterTargetImpact, finalizeShooterRecord, flashStage, playShooterSound, setState, spawnShooterTarget],
  );

  const runChordTransitionFrame = useCallback(
    (deltaMs) => {
      const signature = getTimeSignatureOption("4/4");
      const subdivision = getSubdivisionOption(metronomeSubdivisionRef.current);
      const beatsPerMeasure = signature.beats;
      const clicksPerBeat = subdivision.clicksPerBeat;
      const currentBeatMs = getBeatMs(bpmRef.current);
      const currentTickMs = currentBeatMs / clicksPerBeat;
      const currentMeasureMs = currentBeatMs * beatsPerMeasure;

      if (countInActiveRef.current) {
        const countInBars = Math.max(1, metronomeCountInBarsRef.current || 1);
        const countInTotalMs = currentMeasureMs * countInBars;
        countInTimeRef.current += deltaMs;
        const countInProgressNow = performance.now();
        if (countInProgressNow - lastStage3ProgressUiAtRef.current >= 80) {
          lastStage3ProgressUiAtRef.current = countInProgressNow;
          setStage3MeasureProgress(Math.min(1, countInTimeRef.current / countInTotalMs));
        }
        if (countInTimeRef.current >= countInTotalMs) {
          countInActiveRef.current = false;
          countInTimeRef.current = 0;
          gameTimeRef.current = chordPracticeIndexRef.current * currentMeasureMs;
          lastBeatRef.current = -1;
          setBeat(0);
          setStage3MeasureProgress(0);
          setFeedback("Play");
          startBackingScheduler(chordPracticeIndexRef.current);
          return;
        }
        const countInTick = Math.floor(countInTimeRef.current / currentBeatMs);
        if (countInTick < beatsPerMeasure * countInBars && countInTick !== lastBeatRef.current) {
          lastBeatRef.current = countInTick;
          const countInBeat = countInTick % beatsPerMeasure;
          flushSync(() => {
            setBeat(countInBeat);
          });
          playCountInVoice(countInBeat);
        }
        return;
      }

      gameTimeRef.current += deltaMs;
      if (metronomeTrackerModeRef.current === "timer") {
        const totalTimerMs = metronomeTrackerTimerTotalMsRef.current;
        const elapsedMs = metronomeTrackerBaseElapsedMsRef.current + gameTimeRef.current;
        const cappedElapsedMs = totalTimerMs > 0 ? Math.min(elapsedMs, totalTimerMs) : elapsedMs;
        if (
          (totalTimerMs > 0 && cappedElapsedMs >= totalTimerMs) ||
          cappedElapsedMs - metronomeTrackerElapsedUpdateRef.current >= 250
        ) {
          metronomeTrackerElapsedUpdateRef.current = cappedElapsedMs;
          setMetronomeTrackerElapsedMs(cappedElapsedMs);
        }
        if (totalTimerMs > 0 && elapsedMs >= totalTimerMs) {
          setMetronomeTrackerElapsedMs(totalTimerMs);
          if (metronomeTimerResetWhenReachedRef.current) {
            gameTimeRef.current = 0;
            lastBeatRef.current = -1;
            metronomeTrackerBaseElapsedMsRef.current = 0;
            metronomeTrackerElapsedUpdateRef.current = 0;
            setBeat(0);
            setMetronomeTrackerElapsedMs(0);
            setStage3MeasureProgress(0);
          }
          if (metronomeTimerStopWhenReachedRef.current) {
            setFeedback("Complete");
            stopBackingScheduler();
            setState(GAME_STATES.IDLE);
            return;
          }
        }
      }
      const audio = audioRef.current;
      const backingSession = backingPreparedSessionRef.current;
      const backingClockActive = Boolean(
        audio &&
        backingSchedulerRunningRef.current &&
        backingSession?.events?.length &&
        Number.isFinite(backingSession.beatSeconds) &&
        backingSession.beatSeconds > 0,
      );
      if (backingClockActive) {
        if (lastBeatRef.current < 0 || !backingDisplayStartTimeRef.current || backingDisplayStartTimeRef.current > audio.currentTime) {
          backingDisplayStartTimeRef.current = backingCycleStartTimeRef.current;
        }
        const displayStartTime = backingDisplayStartTimeRef.current || backingCycleStartTimeRef.current;
        const elapsedSeconds = Math.max(0, audio.currentTime - displayStartTime);
        const measureSeconds = backingSession.beatsPerMeasure * backingSession.beatSeconds;
        const visualElapsedSeconds = elapsedSeconds;
        const visualBeat = Math.floor(visualElapsedSeconds / backingSession.beatSeconds);
        const beatInBar = visualBeat % backingSession.beatsPerMeasure;
        const measureIndex = chordTransitionProgression.length > 0
          ? Math.min(
              chordTransitionProgression.length - 1,
              Math.floor((visualElapsedSeconds % backingSession.cycleSeconds) / measureSeconds)
            )
          : 0;
        const progressNow = performance.now();
        if (progressNow - lastStage3ProgressUiAtRef.current >= 80) {
          lastStage3ProgressUiAtRef.current = progressNow;
        setStage3MeasureProgress((visualElapsedSeconds % measureSeconds) / measureSeconds);
        }
        if (visualBeat !== lastBeatRef.current) {
          lastBeatRef.current = visualBeat;
          setBeat(beatInBar);
          if (chordPracticeIndexRef.current !== measureIndex) {
            chordPracticeIndexRef.current = measureIndex;
            setChordPracticeIndex(measureIndex);
          }
        }
        return;
      }

      const progressNow = performance.now();
      if (progressNow - lastStage3ProgressUiAtRef.current >= 80) {
        lastStage3ProgressUiAtRef.current = progressNow;
        setStage3MeasureProgress((gameTimeRef.current % currentMeasureMs) / currentMeasureMs);
      }
      const currentTick = Math.floor(gameTimeRef.current / currentTickMs);
      if (currentTick !== lastBeatRef.current) {
        lastBeatRef.current = currentTick;
        const currentBeat = Math.floor(currentTick / clicksPerBeat);
        const beatInBar = currentBeat % beatsPerMeasure;
        const subdivisionIndex = currentTick % clicksPerBeat;
        const rawMeasureIndex = chordTransitionProgression.length > 0
          ? Math.floor(currentBeat / beatsPerMeasure)
          : 0;
        const measureIndex = chordTransitionProgression.length > 0
          ? rawMeasureIndex % chordTransitionProgression.length
          : 0;
        if (subdivisionIndex === 0) {
          setBeat(beatInBar);
        }
        if (chordPracticeIndexRef.current !== measureIndex) {
          chordPracticeIndexRef.current = measureIndex;
          setChordPracticeIndex(measureIndex);
        }
      }
    },
    [chordTransitionProgression.length, playCountInVoice, startBackingScheduler, stopBackingScheduler],
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
        const countInBars = Math.max(1, metronomeCountInBarsRef.current || 1);
        const countInTotalMs = currentMeasureMs * countInBars;
        countInTimeRef.current += deltaMs;
        setStage3MeasureProgress(Math.min(1, countInTimeRef.current / countInTotalMs));
        if (countInTimeRef.current >= countInTotalMs) {
          countInActiveRef.current = false;
          countInTimeRef.current = 0;
          gameTimeRef.current = 0;
          lastBeatRef.current = -1;
          setBeat(0);
          setStage3MeasureProgress(0);
          setFeedback("Play");
          return;
        }
        const countInTick = Math.floor(countInTimeRef.current / currentBeatMs);
        if (countInTick < beatsPerMeasure * countInBars && countInTick !== lastBeatRef.current) {
          lastBeatRef.current = countInTick;
          const countInBeat = countInTick % beatsPerMeasure;
          flushSync(() => {
            setBeat(countInBeat);
          });
          playCountInVoice(countInBeat);
        }
        return;
      }

      gameTimeRef.current += deltaMs;
      setStage3MeasureProgress((gameTimeRef.current % currentMeasureMs) / currentMeasureMs);

      if (metronomeTrackerModeRef.current === "timer") {
        const totalTimerMs = metronomeTrackerTimerTotalMsRef.current;
        const elapsedMs = metronomeTrackerBaseElapsedMsRef.current + gameTimeRef.current;
        const cappedElapsedMs = totalTimerMs > 0 ? Math.min(elapsedMs, totalTimerMs) : elapsedMs;
        if (
          (totalTimerMs > 0 && cappedElapsedMs >= totalTimerMs) ||
          cappedElapsedMs - metronomeTrackerElapsedUpdateRef.current >= 250
        ) {
          metronomeTrackerElapsedUpdateRef.current = cappedElapsedMs;
          setMetronomeTrackerElapsedMs(cappedElapsedMs);
        }

        if (totalTimerMs > 0 && elapsedMs >= totalTimerMs) {
          setMetronomeTrackerElapsedMs(totalTimerMs);
          if (metronomeTimerResetWhenReachedRef.current) {
            gameTimeRef.current = 0;
            lastBeatRef.current = -1;
            metronomeTrackerBaseElapsedMsRef.current = 0;
            metronomeTrackerElapsedUpdateRef.current = 0;
            setBeat(0);
            setMetronomeTrackerElapsedMs(0);
            setStage3MeasureProgress(0);
          }
          if (metronomeTimerStopWhenReachedRef.current) {
            setFeedback("Complete");
            setState(GAME_STATES.IDLE);
            return;
          }
        }
      }

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

      if (subdivisionIndex === 0) {
        flushSync(() => {
          setBeat(beatInBar);
        });
      }
      if (metronomeTrackerModeRef.current === "bars") {
        const completedBars = metronomeTrackerBaseBarsRef.current + Math.floor(gameTimeRef.current / currentMeasureMs);
        setMetronomeMeasureCount(completedBars);
        if (
          metronomeBarLimitEnabledRef.current &&
          completedBars >= metronomeBarLimitRef.current &&
          metronomeBarLimitRef.current > 0
        ) {
          if (metronomeBarResetWhenReachedRef.current) {
            gameTimeRef.current = 0;
            lastBeatRef.current = -1;
            metronomeTrackerBaseBarsRef.current = 0;
            setBeat(0);
            setMetronomeMeasureCount(0);
            setStage3MeasureProgress(0);
          }
          if (metronomeBarStopWhenReachedRef.current) {
            setFeedback("Complete");
            setState(GAME_STATES.IDLE);
            return;
          }
        }
      } else if (autoBpmEnabledRef.current) {
        setMetronomeMeasureCount(measureNumber);
      }
      setMetronomeIsMutedCycle(isCoachMuted);

      const beatPatternState = metronomeBeatPatternRef.current[beatInBar] ?? getDefaultBeatState(beatInBar);
      const isBeatMuted = beatPatternState === METRONOME_BEAT_STATES.MUTE;
      const isBeatAccent = beatPatternState === METRONOME_BEAT_STATES.ACCENT && subdivisionIndex === 0;
      if (!isCoachMuted && !isBeatMuted) {
        playTick(isBeatAccent, subdivisionIndex, false);
      }

      const applyAutoBpmChange = () => {
        const direction = autoBpmDirectionRef.current === "decrease" ? -1 : 1;
        const nextBpm = clampBpm(bpmRef.current + (autoBpmStepRef.current * direction));
        bpmRef.current = nextBpm;
        setBpm(nextBpm);
        setAutoBpmIncrements((value) => value + 1);
      };

      if (
        autoBpmModeRef.current === "bars" &&
        subdivisionIndex === 0 &&
        beatInBar === 0 &&
        measureNumber > 1 &&
        measureNumber % Math.max(1, autoBpmBarsRef.current) === 0 &&
        lastAutoBpmMeasureRef.current !== measureNumber
      ) {
        lastAutoBpmMeasureRef.current = measureNumber;
        applyAutoBpmChange();
      }

      if (
        autoBpmModeRef.current === "time" &&
        gameTimeRef.current >= autoBpmTimeMsRef.current &&
        gameTimeRef.current - lastAutoBpmTimeRef.current >= autoBpmTimeMsRef.current
      ) {
        lastAutoBpmTimeRef.current = gameTimeRef.current;
        applyAutoBpmChange();
      }
    },
    [playCountInVoice, playTick],
  );

  const animationLoop = useCallback(
    (now) => {
      const deltaMs = Math.min(50, now - lastFrameRef.current);
      lastFrameRef.current = now;

      if (appModeRef.current === APP_MODES.SHOOTER && streamRef.current) readMicrophone(now);
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
    const showPermissionGuide = () => {
      window.alert("마이크 권한이 꺼져 있습니다.\n\n새로고침 후 다시 시도하거나,\n브라우저 설정에서 마이크 권한을 허용해주세요.");
    };

    try {
      if (navigator.permissions?.query) {
        try {
          const permission = await navigator.permissions.query({ name: "microphone" });
          if (permission.state === "denied") {
            setMicStatus("Permission Denied");
            setFeedback("마이크 권한 필요");
            showPermissionGuide();
            return false;
          }
        } catch {
          // Some browsers do not expose microphone permission querying.
        }
      }
      setMicStatus("No Signal");
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
      analyser.fftSize = isMobileLayoutRef.current ? MIC_FFT_SIZE_MOBILE : MIC_FFT_SIZE_DESKTOP;
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
      if (gameStateRef.current === GAME_STATES.IDLE) setState(GAME_STATES.LISTENING);
      return true;
    } catch (error) {
      setMicStatus("Permission Denied");
      setFeedback("마이크 권한 필요");
      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        showPermissionGuide();
      } else {
        window.alert("마이크를 시작할 수 없습니다.\n\n새로고침 후 다시 시도해주세요.");
      }
      console.error(error);
      return false;
    }
  }, [setState]);

  const startPractice = useCallback(async (category = selectedCategory) => {
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
      const audioReady = await warmCoreAudioEngine({ resumeAudio: true });
      if (!audioReady) {
        setFeedback("오디오 준비 필요");
        return;
      }
      const preparedSession = await prepareStage3BackingSession({ preloadAudio: false });
      if (!preparedSession?.events?.length) {
        setFeedback("반주 준비 필요");
        return;
      }
      metronomeOnRef.current = true;
      setMetronomeOn(true);
      setStage3StorageOpen(false);
      appModeRef.current = APP_MODES.PRACTICE;
      setAppMode(APP_MODES.PRACTICE);
      setSelectedCategoryId(safeCategory.id);
      resetScore();
      practiceLoopRef.current = true;
      let startIndex = 0;
      {
        const signature = getTimeSignatureOption(metronomeTimeSignatureRef.current);
        const currentMeasureMs = getBeatMs(bpmRef.current) * signature.beats;
        startIndex = hasChordTransitionProgression
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
      if (!metronomeCountInRef.current) startBackingScheduler(startIndex);
      lastFrameRef.current = performance.now();
      return;
    }
    const audio = ensureAudioContext();
    if (!audio) {
      setFeedback("오디오 준비 필요");
      return;
    }
    ensureMetronomeOutput(audio);
    void ensureAudioReady()
      .then((audioReady) => {
        if (!audioReady) return false;
        return loadMetronomeSamples(audioRef.current);
      })
      .catch(() => false);

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
  }, [chordTransitionProgression.length, ensureAudioContext, ensureAudioReady, ensureMetronomeOutput, getPlayableCategory, getPracticeSequence, hasChordTransitionProgression, loadMetronomeSamples, prepareStage3BackingSession, repeatPractice, resetScore, selectedCategory, setState, startBackingScheduler, warmCoreAudioEngine]);

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
    switchMetronomeScope(getMetronomeScopeForCategory(safeCategory.id));
    resetScore();
    setEnemies([]);
    enemiesRef.current = [];
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setLaneFeedback([]);
    setBeat(0);
    countInActiveRef.current = false;
    countInTimeRef.current = 0;
    cancelCountInVoice();
    if (safeCategory.id === "rhythm") setChordPracticeIndex(0);
    setFeedback("Ready");
    setState(GAME_STATES.IDLE);
    lastFrameRef.current = performance.now();
  }, [cancelCountInVoice, getMetronomeScopeForCategory, getPlayableCategory, getPracticeSequence, repeatPractice, resetScore, selectedCategory, setState, switchMetronomeScope]);

  const startShooter = useCallback(async (category = SHOOTER_DEFAULT_CATEGORY) => {
    const safeCategory = normalizePracticeCategory(category);
    appModeRef.current = APP_MODES.SHOOTER;
    setAppMode(APP_MODES.SHOOTER);
    await ensureAudioReady();

    if (audioRef.current?.state === "suspended") {
      await audioRef.current.resume();
    }

    if (gameStateRef.current === GAME_STATES.PAUSED) {
      let resumeDetectorReady = Boolean(streamRef.current && analyserRef.current && bufferRef.current && audioRef.current);
      if (!resumeDetectorReady) {
        resumeDetectorReady = await startMic();
      }
      if (!resumeDetectorReady) {
        setFeedback("Mic required");
        setState(GAME_STATES.LISTENING);
        return;
      }
      lastFrameRef.current = performance.now();
      setFeedback("Continue");
      setState(GAME_STATES.PLAYING);
      return;
    }

    if (gameStateRef.current === GAME_STATES.PLAYING) return;

    let detectorReady = Boolean(streamRef.current && analyserRef.current && bufferRef.current && audioRef.current);
    if (!detectorReady) {
      detectorReady = await startMic();
    }

    const baseShooterNotes = getShooterTrainingNotes(safeCategory, selectedPentatonic);
    const initialShooterNotes = getShooterDifficultyNotes(baseShooterNotes, shooterDifficultyRef.current, 0, selectedPentatonic);

    if (!detectorReady) {
      setFeedback("Mic required");
      setState(GAME_STATES.LISTENING);
      return;
    }

    activeNotesRef.current = initialShooterNotes;
    sequenceRef.current = getPracticeSequence(safeCategory);
    practiceLoopRef.current = true;
    setSelectedCategoryId(MAIN_DEFAULT_CATEGORY.id);
    resetScore();
    shooterSessionSavedRef.current = false;
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
  }, [ensureAudioReady, getPracticeSequence, resetScore, selectedPentatonic, setState, spawnShooterTarget, startMic]);

  const startShooterMic = useCallback(async () => {
    appModeRef.current = APP_MODES.SHOOTER;
    setAppMode(APP_MODES.SHOOTER);
    await startMic();
  }, [startMic]);

  const startMetronomePractice = useCallback(async () => {
    ensureAudioContext();
    ensureAudioReady()
      .then((ready) => {
        if (!ready) return false;
        return loadMetronomeSamples(audioRef.current);
      })
      .catch((error) => {
        console.warn("Metronome audio will recover on the next beat.", error);
      });
    stopMic();
    appModeRef.current = APP_MODES.METRONOME;
    setAppMode(APP_MODES.METRONOME);
    gameTimeRef.current = 0;
    lastBeatRef.current = -1;
    countInActiveRef.current = metronomeCountInRef.current;
    countInTimeRef.current = 0;
    lastAutoBpmMeasureRef.current = 0;
    lastAutoBpmTimeRef.current = 0;
    metronomeTrackerBaseBarsRef.current = metronomeMeasureCount;
    metronomeTrackerBaseElapsedMsRef.current = metronomeTrackerElapsedMs;
    metronomeTrackerElapsedUpdateRef.current = metronomeTrackerElapsedMs;
    setBeat(0);
    setAutoBpmIncrements(0);
    setMetronomeIsMutedCycle(false);
    setStage3MeasureProgress(0);
    setFeedback(metronomeCountInRef.current ? "Count In" : "Play");
    setState(GAME_STATES.PLAYING);
    lastFrameRef.current = performance.now();
  }, [ensureAudioContext, ensureAudioReady, loadMetronomeSamples, metronomeMeasureCount, metronomeTrackerElapsedMs, setState, stopMic]);

  const resetMetronomePractice = useCallback(() => {
    if (appModeRef.current !== APP_MODES.METRONOME) return;
    cancelCountInVoice();
    gameTimeRef.current = 0;
    lastBeatRef.current = -1;
    countInActiveRef.current = false;
    countInTimeRef.current = 0;
    lastAutoBpmMeasureRef.current = 0;
    lastAutoBpmTimeRef.current = 0;
    metronomeTrackerBaseBarsRef.current = 0;
    metronomeTrackerBaseElapsedMsRef.current = 0;
    metronomeTrackerElapsedUpdateRef.current = 0;
    setBeat(0);
    setMetronomeMeasureCount(0);
    setMetronomeTrackerElapsedMs(0);
    setAutoBpmIncrements(0);
    setMetronomeIsMutedCycle(false);
    setStage3MeasureProgress(0);
    setFeedback("Ready");
    setState(GAME_STATES.IDLE);
  }, [cancelCountInVoice, setState]);

  const stopMetronomePlayback = useCallback(() => {
    if (appModeRef.current !== APP_MODES.METRONOME) return;
    cancelCountInVoice();
    gameTimeRef.current = 0;
    lastBeatRef.current = -1;
    countInActiveRef.current = false;
    countInTimeRef.current = 0;
    lastAutoBpmMeasureRef.current = 0;
    lastAutoBpmTimeRef.current = 0;
    metronomeTrackerBaseBarsRef.current = metronomeMeasureCount;
    metronomeTrackerBaseElapsedMsRef.current = metronomeTrackerElapsedMs;
    metronomeTrackerElapsedUpdateRef.current = metronomeTrackerElapsedMs;
    setBeat(0);
    setAutoBpmIncrements(0);
    setMetronomeIsMutedCycle(false);
    setStage3MeasureProgress(0);
    setFeedback("Ready");
    setState(GAME_STATES.IDLE);
  }, [cancelCountInVoice, metronomeMeasureCount, metronomeTrackerElapsedMs, setState]);

  const pauseGame = useCallback(() => {
    if (gameStateRef.current !== GAME_STATES.PLAYING) return;
    stopBackingScheduler();
    setState(GAME_STATES.PAUSED);
    setFeedback("Paused");
  }, [setState, stopBackingScheduler]);

  const resumeGame = useCallback(async () => {
    if (gameStateRef.current !== GAME_STATES.PAUSED) return;
    const isRhythmPractice = appModeRef.current === APP_MODES.PRACTICE && selectedCategoryIdRef.current === "rhythm";
    if (isRhythmPractice) {
      const audioReady = await warmCoreAudioEngine({ resumeAudio: true });
      if (!audioReady) return;
    } else {
      await ensureAudioReady();
      if (appModeRef.current === APP_MODES.PRACTICE || appModeRef.current === APP_MODES.METRONOME) {
        await loadMetronomeSamples(audioRef.current);
      }
    }
    lastFrameRef.current = performance.now();
    setState(GAME_STATES.PLAYING);
    if (isRhythmPractice && !countInActiveRef.current) {
      startBackingScheduler(chordPracticeIndexRef.current);
    }
    setFeedback("Play");
  }, [ensureAudioReady, loadMetronomeSamples, setState, startBackingScheduler, warmCoreAudioEngine]);

  const handleShooterArenaClick = useCallback((event) => {
    if (appModeRef.current !== APP_MODES.SHOOTER || gameStateRef.current !== GAME_STATES.PLAYING) return;
    if (event.target?.closest?.("button, input, select, textarea, a, .enemy, .guitarPlayer, .mobileShooterLives, .shooterCenterStatus, .shooterGameHud")) {
      return;
    }
    pauseGame();
  }, [pauseGame]);

  const restartGame = useCallback(async () => {
    await ensureAudioReady();
    const safeCategory = getPlayableCategory(selectedCategory);
    const sequence = getPracticeSequence(safeCategory);
    const modeToRestart = appModeRef.current === APP_MODES.SHOOTER ? APP_MODES.SHOOTER : APP_MODES.PRACTICE;
    if (modeToRestart === APP_MODES.PRACTICE && safeCategory.id !== "rhythm") {
      await loadMetronomeSamples(audioRef.current);
    }
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

  const changeMetronomeAccentTone = useCallback((toneId) => {
    const nextTone = getMetronomeToneOption(toneId).id;
    metronomeAccentToneRef.current = nextTone;
    setMetronomeAccentTone(nextTone);
  }, []);

  const changeMetronomeWeakTone = useCallback((toneId) => {
    const nextTone = getMetronomeToneOption(toneId).id;
    metronomeWeakToneRef.current = nextTone;
    setMetronomeWeakTone(nextTone);
  }, []);

  const persistMetronomePresets = useCallback((nextPresets) => {
    const normalized = nextPresets.map((preset, index) => normalizeMetronomePreset(preset, index)).slice(0, 24);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(METRONOME_PRESET_STORAGE_KEY, JSON.stringify(normalized));
    }
    const stored = getStoredMetronomePresets();
    const confirmed = stored.length || normalized;
    setMetronomePresets(confirmed);
    return confirmed;
  }, []);

  const captureCurrentMetronomePreset = useCallback((name) => normalizeMetronomePreset({
    id: metronomePresetSelectedId || createLocalId("metro-preset"),
    name,
    bpm,
    timeSignature: metronomeTimeSignature,
    subdivision: metronomeSubdivision,
    tone: metronomeTone,
    accentTone: metronomeAccentTone,
    weakTone: metronomeWeakTone,
    accent: metronomeAccent,
    repeat: metronomeRepeat,
    displayMode: metronomeDisplayMode,
    countInBars: metronomeCountInBars,
    countInVoiceMode: metronomeCountInVoiceMode,
    autoBpmMode,
    autoBpmDirection,
    autoBpmStep,
    autoBpmBars,
    autoBpmTimeMinutes,
    autoBpmTimeSeconds,
    coachModeEnabled,
    coachPlayBars,
    coachMuteBars,
    trackerMode: metronomeTrackerMode,
    barLimitEnabled: metronomeBarLimitEnabled,
    barLimit: metronomeBarLimit,
    barStopWhenReached: metronomeBarStopWhenReached,
    barResetWhenReached: metronomeBarResetWhenReached,
    barStartFromOne: metronomeBarStartFromOne,
    timerCountdown: metronomeTimerCountdown,
    timerStopWhenReached: metronomeTimerStopWhenReached,
    timerResetWhenReached: metronomeTimerResetWhenReached,
    trackerTimerMinutes: metronomeTrackerTimerMinutes,
    trackerTimerSeconds: metronomeTrackerTimerSeconds,
    beatPattern: normalizeMetronomeBeatPattern(metronomeBeatPattern, metronomeBeatsPerMeasure),
    updatedAt: Date.now(),
  }), [
    autoBpmBars,
    autoBpmDirection,
    autoBpmMode,
    autoBpmStep,
    autoBpmTimeMinutes,
    autoBpmTimeSeconds,
    bpm,
    coachModeEnabled,
    coachMuteBars,
    coachPlayBars,
    metronomeBarLimit,
    metronomeBarLimitEnabled,
    metronomeBarResetWhenReached,
    metronomeBarStartFromOne,
    metronomeBarStopWhenReached,
    metronomeBeatPattern,
    metronomeBeatsPerMeasure,
    metronomeAccent,
    metronomeAccentTone,
    metronomeCountInBars,
    metronomeCountInVoiceMode,
    metronomeDisplayMode,
    metronomePresetSelectedId,
    metronomeRepeat,
    metronomeSubdivision,
    metronomeTimeSignature,
    metronomeTimerCountdown,
    metronomeTimerResetWhenReached,
    metronomeTimerStopWhenReached,
    metronomeTone,
    metronomeWeakTone,
    metronomeTrackerMode,
    metronomeTrackerTimerMinutes,
    metronomeTrackerTimerSeconds,
  ]);

  const saveMetronomePreset = useCallback(() => {
    const baseName = metronomePresetName.trim() || METRONOME_PRESET_DEFAULT_NAME;
    const savedAt = Date.now();
    const storedPresets = getStoredMetronomePresets();
    const presetMap = new Map();
    [...storedPresets, ...metronomePresets].forEach((preset) => {
      if (preset?.id) presetMap.set(preset.id, preset);
    });
    const latestPresets = Array.from(presetMap.values());
    const existingIndex = metronomePresetSelectedId
      ? latestPresets.findIndex((preset) => preset.id === metronomePresetSelectedId)
      : -1;
    const isUpdatingSelectedPreset = existingIndex >= 0;
    const timestamp = new Date(savedAt).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const name = isUpdatingSelectedPreset ? baseName.slice(0, 24) : `${baseName.slice(0, 15)} ${timestamp}`.trim().slice(0, 24);
    const currentPreset = {
      ...captureCurrentMetronomePreset(name),
      updatedAt: savedAt,
    };
    const nextPresets = isUpdatingSelectedPreset
      ? latestPresets.map((preset, index) => (index === existingIndex ? { ...currentPreset, id: preset.id, createdAt: preset.createdAt } : preset))
      : [{ ...currentPreset, id: createLocalId("metro-preset"), createdAt: savedAt }, ...latestPresets];
    const normalized = persistMetronomePresets(nextPresets);
    const savedPreset = isUpdatingSelectedPreset
      ? normalized.find((preset) => preset.id === metronomePresetSelectedId)
      : normalized[0];
    setMetronomePresetSelectedId(savedPreset?.id || "");
    setMetronomePresetName(savedPreset?.name || baseName);
  }, [captureCurrentMetronomePreset, metronomePresetName, metronomePresetSelectedId, metronomePresets, persistMetronomePresets]);

  const applyMetronomePreset = useCallback((presetId) => {
    const storedPresets = getStoredMetronomePresets();
    if (storedPresets.length) setMetronomePresets(storedPresets);
    const preset = [...metronomePresets, ...storedPresets].find((item) => item.id === presetId);
    if (!preset) {
      setMetronomePresetSelectedId("");
      return;
    }

    const normalized = normalizeMetronomePreset(preset);
    changeBpm(normalized.bpm);
    metronomeToneRef.current = normalized.tone;
    metronomeAccentToneRef.current = normalized.accentTone;
    metronomeWeakToneRef.current = normalized.weakTone;
    setMetronomeTimeSignature(normalized.timeSignature);
    setMetronomeSubdivision(normalized.subdivision);
    setMetronomeTone(normalized.tone);
    setMetronomeAccentTone(normalized.accentTone);
    setMetronomeWeakTone(normalized.weakTone);
    setMetronomeAccent(normalized.accent);
    setMetronomeRepeat(normalized.repeat);
    setMetronomeDisplayMode(normalized.displayMode);
    setMetronomeCountInBars(normalized.countInBars);
    setMetronomeCountInVoiceMode(normalized.countInVoiceMode);
    setMetronomeCountIn(normalized.countInBars > 0);
    setAutoBpmMode(normalized.autoBpmMode);
    setAutoBpmDirection(normalized.autoBpmDirection);
    setAutoBpmStep(normalized.autoBpmStep);
    setAutoBpmBars(normalized.autoBpmBars);
    setAutoBpmTimeMinutes(normalized.autoBpmTimeMinutes);
    setAutoBpmTimeSeconds(normalized.autoBpmTimeSeconds);
    setCoachModeEnabled(normalized.coachModeEnabled);
    setCoachPlayBars(normalized.coachPlayBars);
    setCoachMuteBars(normalized.coachMuteBars);
    setMetronomeTrackerMode(normalized.trackerMode);
    setMetronomeBarLimitEnabled(normalized.barLimitEnabled);
    setMetronomeBarLimit(normalized.barLimit);
    setMetronomeBarLimitDraft(String(normalized.barLimit));
    setMetronomeBarStopWhenReached(normalized.barStopWhenReached);
    setMetronomeBarResetWhenReached(normalized.barResetWhenReached);
    setMetronomeBarStartFromOne(normalized.barStartFromOne);
    setMetronomeTimerCountdown(normalized.timerCountdown);
    setMetronomeTimerStopWhenReached(normalized.timerStopWhenReached);
    setMetronomeTimerResetWhenReached(normalized.timerResetWhenReached);
    setMetronomeTrackerTimerMinutes(normalized.trackerTimerMinutes);
    setMetronomeTrackerTimerSeconds(normalized.trackerTimerSeconds);
    const nextBeatPattern = normalizeMetronomeBeatPattern(normalized.beatPattern, getTimeSignatureOption(normalized.timeSignature).beats);
    metronomeBeatPatternRef.current = nextBeatPattern;
    setMetronomeBeatPattern(nextBeatPattern);
    setMetronomePresetSelectedId(normalized.id);
    setMetronomePresetName(normalized.name);
  }, [changeBpm, metronomePresets]);

  const primeMetronomeAdvancedDraft = useCallback((panelId) => {
    if (panelId === "automator") {
      autoBpmTimeDraftRef.current = {
        minutes: normalizeAutoBpmTimeMinutes(autoBpmTimeMinutes),
        seconds: normalizeAutoBpmTimeSeconds(autoBpmTimeSeconds),
      };
    }
    if (panelId === "tracker") {
      metronomeTrackerTimerDraftRef.current = {
        minutes: normalizeTrackerTimerMinutes(metronomeTrackerTimerMinutes),
        seconds: normalizeTrackerTimerSeconds(metronomeTrackerTimerSeconds),
      };
    }
  }, [autoBpmTimeMinutes, autoBpmTimeSeconds, metronomeTrackerTimerMinutes, metronomeTrackerTimerSeconds]);

  const handleAutoBpmDraftMinutesChange = useCallback((nextValue) => {
    autoBpmTimeDraftRef.current = {
      ...autoBpmTimeDraftRef.current,
      minutes: normalizeAutoBpmTimeMinutes(nextValue),
    };
  }, []);

  const handleAutoBpmDraftSecondsChange = useCallback((nextValue) => {
    autoBpmTimeDraftRef.current = {
      ...autoBpmTimeDraftRef.current,
      seconds: normalizeAutoBpmTimeSeconds(nextValue),
    };
  }, []);

  const handleTrackerTimerDraftMinutesChange = useCallback((nextValue) => {
    metronomeTrackerTimerDraftRef.current = {
      ...metronomeTrackerTimerDraftRef.current,
      minutes: normalizeTrackerTimerMinutes(nextValue),
    };
  }, []);

  const handleTrackerTimerDraftSecondsChange = useCallback((nextValue) => {
    metronomeTrackerTimerDraftRef.current = {
      ...metronomeTrackerTimerDraftRef.current,
      seconds: normalizeTrackerTimerSeconds(nextValue),
    };
  }, []);

  const commitMetronomeAdvancedDraft = useCallback((panelId = metronomeAdvancedPanel) => {
    if (panelId === "automator") {
      const nextMinutes = normalizeAutoBpmTimeMinutes(autoBpmTimeDraftRef.current.minutes);
      const nextSeconds = normalizeAutoBpmTimeSeconds(autoBpmTimeDraftRef.current.seconds);
      if (nextMinutes !== autoBpmTimeMinutes) setAutoBpmTimeMinutes(nextMinutes);
      if (nextSeconds !== autoBpmTimeSeconds) setAutoBpmTimeSeconds(nextSeconds);
      return;
    }

    if (panelId === "tracker") {
      const nextMinutes = normalizeTrackerTimerMinutes(metronomeTrackerTimerDraftRef.current.minutes);
      const nextSeconds = normalizeTrackerTimerSeconds(metronomeTrackerTimerDraftRef.current.seconds);
      const changed = nextMinutes !== metronomeTrackerTimerMinutes || nextSeconds !== metronomeTrackerTimerSeconds;
      if (changed) triggerMetronomeWheelDetent();
      if (nextMinutes !== metronomeTrackerTimerMinutes) setMetronomeTrackerTimerMinutes(nextMinutes);
      if (nextSeconds !== metronomeTrackerTimerSeconds) setMetronomeTrackerTimerSeconds(nextSeconds);
    }
  }, [
    autoBpmTimeMinutes,
    autoBpmTimeSeconds,
    metronomeAdvancedPanel,
    metronomeTrackerTimerMinutes,
    metronomeTrackerTimerSeconds,
    triggerMetronomeWheelDetent,
  ]);

  const closeMetronomeAdvancedPanel = useCallback(() => {
    commitMetronomeAdvancedDraft(metronomeAdvancedPanel);
    setMetronomeAdvancedPanel("");
  }, [commitMetronomeAdvancedDraft, metronomeAdvancedPanel]);

  const toggleMetronomeAdvancedPanel = useCallback((panelId) => {
    if (metronomeAdvancedPanel === panelId) {
      closeMetronomeAdvancedPanel();
      return;
    }
    if (metronomeAdvancedPanel) {
      commitMetronomeAdvancedDraft(metronomeAdvancedPanel);
    }
    primeMetronomeAdvancedDraft(panelId);
    setMetronomeAdvancedPanel(panelId);
  }, [closeMetronomeAdvancedPanel, commitMetronomeAdvancedDraft, metronomeAdvancedPanel, primeMetronomeAdvancedDraft]);

  useEffect(() => {
    if (metronomeAdvancedPanel !== "automator") {
      autoBpmTimeDraftRef.current = {
        minutes: normalizeAutoBpmTimeMinutes(autoBpmTimeMinutes),
        seconds: normalizeAutoBpmTimeSeconds(autoBpmTimeSeconds),
      };
    }
  }, [autoBpmTimeMinutes, autoBpmTimeSeconds, metronomeAdvancedPanel]);

  useEffect(() => {
    if (metronomeAdvancedPanel !== "tracker") {
      metronomeTrackerTimerDraftRef.current = {
        minutes: normalizeTrackerTimerMinutes(metronomeTrackerTimerMinutes),
        seconds: normalizeTrackerTimerSeconds(metronomeTrackerTimerSeconds),
      };
    }
  }, [metronomeAdvancedPanel, metronomeTrackerTimerMinutes, metronomeTrackerTimerSeconds]);

  useEffect(() => {
    setMetronomeBarLimitDraft(String(metronomeBarLimit));
  }, [metronomeBarLimit]);

  const handleMetronomeBarLimitChange = useCallback((event) => {
    const rawValue = event.target.value.replace(/[^\d]/g, "");
    setMetronomeBarLimitDraft(rawValue);
    if (!rawValue) return;

    setMetronomeBarLimit(normalizeTrackerBarLimit(rawValue, metronomeBarLimit));
  }, [metronomeBarLimit]);

  const commitMetronomeBarLimit = useCallback(() => {
    const nextLimit = normalizeTrackerBarLimit(metronomeBarLimitDraft, metronomeBarLimit);
    setMetronomeBarLimit(nextLimit);
    setMetronomeBarLimitDraft(String(nextLimit));
  }, [metronomeBarLimit, metronomeBarLimitDraft]);

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

  useEffect(() => () => {
    if (bpmSwipeFrameRef.current != null) window.cancelAnimationFrame(bpmSwipeFrameRef.current);
  }, []);

  const renderBpmSwipePreview = useCallback((nextBpm) => {
    const safeBpm = clampBpm(nextBpm);
    bpmSwipePreviewValueRef.current = safeBpm;
    if (bpmSwipeFrameRef.current != null) return;
    bpmSwipeFrameRef.current = window.requestAnimationFrame(() => {
      bpmSwipeFrameRef.current = null;
      if (typeof document === "undefined") return;
      document.querySelectorAll("[data-bpm-preview-value=\"true\"]").forEach((node) => {
        node.textContent = String(bpmSwipePreviewValueRef.current);
      });
    });
  }, []);

  const resetBpmSwipePreview = useCallback(() => {
    renderBpmSwipePreview(bpmRef.current);
  }, [renderBpmSwipePreview]);

  useEffect(() => {
    resetBpmSwipePreview();
  }, [bpm, resetBpmSwipePreview]);

  const handleBpmSwipeStart = useCallback((event) => {
    if (event.target?.closest?.("button, select, input, textarea")) return;

    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const now = performance.now();
    bpmSwipeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastTime: now,
      startBpm: bpmRef.current,
      lastAppliedBpm: bpmRef.current,
      previewBpm: bpmRef.current,
      locked: false,
      canceled: false,
      pointerId: event.pointerId,
    };
  }, []);

  const handleBpmSwipeMove = useCallback((event) => {
    const swipe = bpmSwipeStartRef.current;
    if (!swipe || swipe.canceled) return;

    const deltaX = event.clientX - swipe.x;
    const deltaY = event.clientY - swipe.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (!swipe.locked) {
      if (absX < 10 && absY < 10) return;
      if (absY > absX * 1.25) {
        bpmSwipeStartRef.current = { ...swipe, canceled: true };
        resetBpmSwipePreview();
        event.currentTarget.releasePointerCapture?.(swipe.pointerId);
        return;
      }
      swipe.locked = true;
    }

    event.preventDefault();

    const now = performance.now();
    const elapsed = Math.max(16, now - swipe.lastTime);
    const velocity = (event.clientX - swipe.lastX) / elapsed;
    const velocityBoost =
      Math.sign(velocity) * Math.min(8, Math.max(0, Math.abs(velocity) - 0.25) * 5);
    const distanceBpm = deltaX / 9;
    const nextBpm = clampBpm(swipe.startBpm + Math.round(distanceBpm + velocityBoost));

    if (nextBpm !== swipe.lastAppliedBpm) {
      swipe.previewBpm = nextBpm;
      renderBpmSwipePreview(nextBpm);
      swipe.lastAppliedBpm = nextBpm;
    }

    swipe.lastX = event.clientX;
    swipe.lastTime = now;
  }, [renderBpmSwipePreview, resetBpmSwipePreview]);

  const handleBpmSwipeEnd = useCallback((event) => {
    const swipe = bpmSwipeStartRef.current;
    bpmSwipeStartRef.current = null;
    if (!swipe) return;

    event.currentTarget.releasePointerCapture?.(swipe.pointerId);
    if (!swipe.canceled && swipe.previewBpm !== undefined && swipe.previewBpm !== bpmRef.current) {
      changeBpm(swipe.previewBpm);
      return;
    }
    resetBpmSwipePreview();
  }, [changeBpm, resetBpmSwipePreview]);

  const handleBpmSwipeCancel = useCallback((event) => {
    const swipe = bpmSwipeStartRef.current;
    bpmSwipeStartRef.current = null;
    if (!swipe) return;
    event.currentTarget.releasePointerCapture?.(swipe.pointerId);
    resetBpmSwipePreview();
  }, [resetBpmSwipePreview]);

  const changeMetronomeDisplayModeBySwipe = useCallback((direction) => {
    if (!Number.isFinite(direction) || direction === 0) return;
    setMetronomeDisplayMode((currentMode) => {
      const currentIndex = METRONOME_DISPLAY_MODES.findIndex((option) => option.id === currentMode);
      const safeIndex = currentIndex >= 0 ? currentIndex : 0;
      const modeCount = METRONOME_DISPLAY_MODES.length;
      const nextIndex = modeCount > 0 ? ((safeIndex + direction) % modeCount + modeCount) % modeCount : safeIndex;
      const nextMode = METRONOME_DISPLAY_MODES[nextIndex]?.id ?? currentMode;
      if (nextMode === currentMode) return currentMode;
      metronomeModeSwipeChangedAtRef.current = performance.now();
      return nextMode;
    });
  }, []);

  const handleMetronomeModeSwipeStart = useCallback((event) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setMetronomeModeSwipeActive(true);
    setMetronomeModeSwipeOffset(0);
    const now = performance.now();
    metronomeModeSwipeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      stepX: event.clientX,
      lastX: event.clientX,
      lastY: event.clientY,
      startTime: now,
      lastTime: now,
      pointerId: event.pointerId,
      source: "pointer",
      locked: false,
      canceled: false,
    };
  }, []);

  const handleMetronomeModeSwipeMove = useCallback((event) => {
    const swipe = metronomeModeSwipeStartRef.current;
    if (!swipe || swipe.canceled) return;

    const deltaX = event.clientX - swipe.x;
    const deltaY = event.clientY - swipe.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (!swipe.locked) {
      if (absX < 10 && absY < 10) return;
      if (absY > absX * 1.18) {
        metronomeModeSwipeStartRef.current = { ...swipe, canceled: true };
        event.currentTarget.releasePointerCapture?.(swipe.pointerId);
        setMetronomeModeSwipeActive(false);
        setMetronomeModeSwipeOffset(0);
        return;
      }
      swipe.locked = true;
    }

    if (event.cancelable) event.preventDefault();
    const commitDistance = Math.max(
      METRONOME_MODE_SWIPE_STEP_THRESHOLD,
      (event.currentTarget?.clientWidth || window.innerWidth || 1) * METRONOME_MODE_SWIPE_COMMIT_RATIO,
    );
    setMetronomeModeSwipeOffset(
      Math.max(
        -METRONOME_MODE_SWIPE_STEP_THRESHOLD,
        Math.min(METRONOME_MODE_SWIPE_STEP_THRESHOLD, (deltaX / commitDistance) * METRONOME_MODE_SWIPE_STEP_THRESHOLD),
      ),
    );

    swipe.lastX = event.clientX;
    swipe.lastY = event.clientY;
    swipe.lastTime = performance.now();
  }, [changeMetronomeDisplayModeBySwipe]);

  const handleMetronomeModeSwipeEnd = useCallback((event) => {
    const swipe = metronomeModeSwipeStartRef.current;
    if (!swipe) return;

    event.currentTarget.releasePointerCapture?.(swipe.pointerId);
    metronomeModeSwipeStartRef.current = null;
    setMetronomeModeSwipeActive(false);
    setMetronomeModeSwipeOffset(0);
    if (swipe.canceled || !swipe.locked) return;

    const commitDistance = Math.max(
      METRONOME_MODE_SWIPE_STEP_THRESHOLD,
      (event.currentTarget?.clientWidth || window.innerWidth || 1) * METRONOME_MODE_SWIPE_COMMIT_RATIO,
    );
    const deltaX = event.clientX - swipe.x;
    if (Math.abs(deltaX) < commitDistance) return;
    changeMetronomeDisplayModeBySwipe(deltaX > 0 ? 1 : -1);
  }, [changeMetronomeDisplayModeBySwipe]);

  const handleMetronomeModeSwipeCancel = useCallback((event) => {
    const swipe = metronomeModeSwipeStartRef.current;
    if (!swipe) return;
    event.currentTarget.releasePointerCapture?.(swipe.pointerId);
    metronomeModeSwipeStartRef.current = null;
    setMetronomeModeSwipeActive(false);
    setMetronomeModeSwipeOffset(0);
  }, []);

  const cycleStandaloneBeatState = useCallback((beatIndex) => {
    if (performance.now() - metronomeModeSwipeChangedAtRef.current < 260) return;
    setMetronomeBeatPattern((pattern) => {
      const nextPattern = normalizeMetronomeBeatPattern(pattern, metronomeBeatsPerMeasure);
      const currentState = nextPattern[beatIndex] ?? getDefaultBeatState(beatIndex);
      const currentIndex = METRONOME_BEAT_STATE_ORDER.indexOf(currentState);
      nextPattern[beatIndex] = METRONOME_BEAT_STATE_ORDER[(currentIndex + 1) % METRONOME_BEAT_STATE_ORDER.length];
      metronomeBeatPatternRef.current = nextPattern;
      return nextPattern;
    });
  }, [metronomeBeatsPerMeasure]);

  const changeFretboardViewerModeBySwipe = useCallback((direction) => {
    const currentIndex = FRETBOARD_VIEWER_MODE_ORDER.indexOf(viewerMode);
    if (currentIndex < 0) return;

    const nextIndex = Math.max(0, Math.min(FRETBOARD_VIEWER_MODE_ORDER.length - 1, currentIndex + direction));
    const nextMode = FRETBOARD_VIEWER_MODE_ORDER[nextIndex];
    if (!nextMode || nextMode === viewerMode) return;

    setViewerMode(nextMode);
    setViewerSwipeFeedback(direction > 0 ? "next" : "prev");
    window.clearTimeout(fretboardSwipeFeedbackTimerRef.current);
    fretboardSwipeFeedbackTimerRef.current = window.setTimeout(() => {
      setViewerSwipeFeedback("");
    }, 220);
  }, [viewerMode]);

  const handleFretboardSwipeStart = useCallback((event) => {
    if (event.target?.closest?.("button, select, input, textarea")) return;
    if (event.target?.closest?.(".fretboardComponent")) return;

    const bounds = event.currentTarget.getBoundingClientRect?.();
    const surfaceWidth = bounds?.width ?? window.innerWidth ?? 0;
    const localX = bounds ? event.clientX - bounds.left : event.clientX;
    const edgeGuard = Math.max(28, Math.min(48, surfaceWidth * 0.12));
    if (surfaceWidth > 0 && (localX < edgeGuard || localX > surfaceWidth - edgeGuard)) {
      fretboardSwipeStartRef.current = null;
      return;
    }

    fretboardSwipeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  }, []);

  const handleFretboardSwipeEnd = useCallback((event) => {
    const start = fretboardSwipeStartRef.current;
    fretboardSwipeStartRef.current = null;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.45) return;

    changeFretboardViewerModeBySwipe(deltaX > 0 ? -1 : 1);
  }, [changeFretboardViewerModeBySwipe]);

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
    stopBackingScheduler();
    if (appModeRef.current === APP_MODES.SHOOTER) {
      finalizeShooterRecord("reset");
    }
    enemiesRef.current = [];
    shooterTargetsRef.current = [];
    projectilesRef.current = [];
    shooterBreakEffectsRef.current = [];
    shooterNextSpawnAtRef.current = 0;
    lastShooterNoteRef.current = null;
    lastShooterXRef.current = 50;
    shooterReleaseLockRef.current = null;
    shooterLivesRef.current = SHOOTER_MAX_LIVES;
    setEnemies([]);
    setShooterTargets([]);
    setProjectiles([]);
    setShooterBreakEffects([]);
    setShooterAim(undefined);
    setShooterLives(SHOOTER_MAX_LIVES);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    chordPracticeIndexRef.current = 0;
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
  }, [finalizeShooterRecord, setState, stopBackingScheduler]);

  const showMainMenu = useCallback(() => {
    stopBackingScheduler();
    if (appModeRef.current === APP_MODES.SHOOTER) {
      finalizeShooterRecord("exit");
    }
    stopMic();
    cancelCountInVoice();
    setUtilityMenuOpen(false);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.PRACTICE;
    setAppMode(APP_MODES.PRACTICE);
    setSelectedCategoryId("rhythm");
    setPendingStageCardId(null);
    enemiesRef.current = [];
    shooterTargetsRef.current = [];
    projectilesRef.current = [];
    shooterBreakEffectsRef.current = [];
    setEnemies([]);
    setShooterTargets([]);
    setProjectiles([]);
    setShooterBreakEffects([]);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setBeat(0);
    setFeedback("Ready");
    setState(GAME_STATES.IDLE);
  }, [cancelCountInVoice, finalizeShooterRecord, setState, stopMic]);

  const showCurriculum = useCallback(() => {
    if (appModeRef.current === APP_MODES.SHOOTER) {
      finalizeShooterRecord("exit");
    }
    stopMic();
    cancelCountInVoice();
    setUtilityMenuOpen(false);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.PRACTICE;
    setAppMode(APP_MODES.PRACTICE);
    setSelectedCategoryId("rhythm");
    setPendingStageCardId("rhythm");
    switchMetronomeScope(METRONOME_SETTING_SCOPES.STAGE3);
    enemiesRef.current = [];
    setEnemies([]);
    setBeat(0);
    setFeedback("Ready");
    setState(GAME_STATES.IDLE);
  }, [cancelCountInVoice, finalizeShooterRecord, setState, stopBackingScheduler, stopMic, switchMetronomeScope]);

  const showStage3StorageRoom = useCallback(() => {
    stopBackingScheduler();
    stopMic();
    cancelCountInVoice();
    setUtilityMenuOpen(false);
    appModeRef.current = APP_MODES.PRACTICE;
    setAppMode(APP_MODES.PRACTICE);
    setSelectedCategoryId("rhythm");
    setPendingStageCardId("rhythm");
    switchMetronomeScope(METRONOME_SETTING_SCOPES.STAGE3);
    setStage3StorageOpen(true);
    if (typeof window !== "undefined") {
      window.history.pushState(
        { appRoute: APP_ROUTES.STAGE3, stage3StorageOpen: true },
        "",
        `${window.location.pathname}${window.location.search}${APP_ROUTES.STAGE3}`,
      );
    }
    enemiesRef.current = [];
    setEnemies([]);
    setBeat(0);
    setFeedback("Ready");
    setState(GAME_STATES.IDLE);
  }, [cancelCountInVoice, setState, stopBackingScheduler, stopMic, switchMetronomeScope]);

  const showMiniChordMaker = useCallback(() => {
    stopBackingScheduler();
    stopMic();
    cancelCountInVoice();
    setUtilityMenuOpen(false);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.MINI_CHORD_MAKER;
    setAppMode(APP_MODES.MINI_CHORD_MAKER);
    setSelectedCategoryId("rhythm");
    setPendingStageCardId("rhythm");
    switchMetronomeScope(METRONOME_SETTING_SCOPES.STAGE3);
    setBeat(0);
    setFeedback("Ready");
    setState(GAME_STATES.IDLE);
  }, [cancelCountInVoice, setState, stopBackingScheduler, stopMic, switchMetronomeScope]);

  const showIndependentPracticeCategory = useCallback((categoryId) => {
    stopBackingScheduler();
    stopMic();
    cancelCountInVoice();
    setUtilityMenuOpen(false);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.PRACTICE;
    setAppMode(APP_MODES.PRACTICE);
    setSelectedCategoryId(categoryId);
    setPendingStageCardId(categoryId);
    switchMetronomeScope(getMetronomeScopeForCategory(categoryId));
    enemiesRef.current = [];
    setEnemies([]);
    setBeat(0);
    setFeedback("Ready");
    setState(GAME_STATES.IDLE);
  }, [cancelCountInVoice, getMetronomeScopeForCategory, setState, stopBackingScheduler, stopMic, switchMetronomeScope]);

  const closeStage3StorageRoom = useCallback(() => {
    stage3StorageSwipeStartRef.current = null;
    setStage3StorageSwipeActive(false);
    setStage3StorageSwipeOffset(0);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.PRACTICE;
    setAppMode(APP_MODES.PRACTICE);
    setSelectedCategoryId("rhythm");
    switchMetronomeScope(METRONOME_SETTING_SCOPES.STAGE3);
  }, [switchMetronomeScope]);

  const handleStage3StorageSwipeStart = useCallback((event) => {
    if (event.button != null && event.button !== 0) return;
    if (event.target?.closest?.("button, input, select, textarea, a, [role='button']")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - bounds.left;
    if (localX > 28) {
      stage3StorageSwipeStartRef.current = null;
      return;
    }
    stage3StorageSwipeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      width: bounds.width,
      canceled: false,
      locked: false,
    };
    setStage3StorageSwipeActive(true);
    setStage3StorageSwipeOffset(0);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const handleStage3StorageSwipeMove = useCallback((event) => {
    const start = stage3StorageSwipeStartRef.current;
    if (!start || start.canceled) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (!start.locked) {
      if (Math.abs(deltaY) > 36 && Math.abs(deltaY) > Math.abs(deltaX) * 0.85) {
        stage3StorageSwipeStartRef.current = { ...start, canceled: true };
        setStage3StorageSwipeActive(false);
        setStage3StorageSwipeOffset(0);
        event.currentTarget.releasePointerCapture?.(start.pointerId);
        return;
      }
      if (deltaX < 0 || Math.abs(deltaX) < 10) return;
      if (deltaX > Math.abs(deltaY) * 1.25) {
        start.locked = true;
      }
    }
    if (deltaX < 0) {
      stage3StorageSwipeStartRef.current = { ...start, canceled: true };
      setStage3StorageSwipeActive(false);
      setStage3StorageSwipeOffset(0);
      event.currentTarget.releasePointerCapture?.(start.pointerId);
      return;
    }
    const maxPreview = Math.max(90, start.width * 0.34);
    const easedOffset = Math.min(deltaX, maxPreview);
    setStage3StorageSwipeOffset(easedOffset);
  }, []);

  const handleStage3StorageSwipeEnd = useCallback((event) => {
    const start = stage3StorageSwipeStartRef.current;
    stage3StorageSwipeStartRef.current = null;
    if (!start) return;
    event.currentTarget.releasePointerCapture?.(start.pointerId);
    if (start.canceled) {
      setStage3StorageSwipeActive(false);
      setStage3StorageSwipeOffset(0);
      return;
    }
    const deltaX = event.clientX - start.x;
    const deltaY = Math.abs(event.clientY - start.y);
    const threshold = Math.max(96, (start.width || window.innerWidth || 390) * 0.28);
    if (deltaX >= threshold && deltaX > deltaY * 1.6) {
      closeStage3StorageRoom();
    } else {
      setStage3StorageSwipeActive(false);
      setStage3StorageSwipeOffset(0);
    }
  }, [closeStage3StorageRoom]);

  const handleStage3StorageSwipeCancel = useCallback((event) => {
    const start = stage3StorageSwipeStartRef.current;
    stage3StorageSwipeStartRef.current = null;
    if (start) event.currentTarget.releasePointerCapture?.(start.pointerId);
    setStage3StorageSwipeActive(false);
    setStage3StorageSwipeOffset(0);
  }, []);

  const showShooterMode = useCallback(() => {
    setUtilityMenuOpen(false);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.SHOOTER;
    setAppMode(APP_MODES.SHOOTER);
    enemiesRef.current = [];
    shooterTargetsRef.current = [];
    projectilesRef.current = [];
    shooterBreakEffectsRef.current = [];
    shooterNextSpawnAtRef.current = 0;
    lastShooterNoteRef.current = null;
    lastShooterXRef.current = 50;
    shooterReleaseLockRef.current = null;
    shooterLivesRef.current = SHOOTER_MAX_LIVES;
    setEnemies([]);
    setShooterTargets([]);
    setProjectiles([]);
    setShooterBreakEffects([]);
    setShooterAim(undefined);
    setShooterLives(SHOOTER_MAX_LIVES);
    setBeat(0);
    setFeedback("Start Shooter");
    setState(streamRef.current ? GAME_STATES.LISTENING : GAME_STATES.IDLE);
  }, [setState]);

  const showMetronomeMode = useCallback(() => {
    stopBackingScheduler();
    stopMic();
    cancelCountInVoice();
    setUtilityMenuOpen(false);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.METRONOME;
    setAppMode(APP_MODES.METRONOME);
    switchMetronomeScope(METRONOME_SETTING_SCOPES.STANDALONE);
    enemiesRef.current = [];
    shooterTargetsRef.current = [];
    projectilesRef.current = [];
    shooterBreakEffectsRef.current = [];
    setEnemies([]);
    setShooterTargets([]);
    setProjectiles([]);
    setShooterBreakEffects([]);
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
  }, [cancelCountInVoice, setState, stopBackingScheduler, stopMic, switchMetronomeScope]);

  const showFretboardViewer = useCallback(() => {
    stopMic();
    setUtilityMenuOpen(false);
    setStage3StorageOpen(false);
    appModeRef.current = APP_MODES.FRETBOARD_VIEWER;
    setAppMode(APP_MODES.FRETBOARD_VIEWER);
    enemiesRef.current = [];
    shooterTargetsRef.current = [];
    projectilesRef.current = [];
    shooterBreakEffectsRef.current = [];
    setEnemies([]);
    setShooterTargets([]);
    setProjectiles([]);
    setShooterBreakEffects([]);
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
    shooterBreakEffectsRef.current = [];
    setEnemies([]);
    setShooterTargets([]);
    setProjectiles([]);
    setShooterBreakEffects([]);
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setBeat(0);
    setFeedback("Design Lab");
    setState(GAME_STATES.IDLE);
  }, [designLabEnabled, setState, stopMic]);

  const selectAppTheme = useCallback((nextTheme) => {
    const normalizedTheme = normalizeAppTheme(nextTheme);
    setAppTheme(normalizedTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(APP_THEME_STORAGE_KEY, normalizedTheme);
    }
  }, []);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const root = document.documentElement;
    const nextDatasetTheme = appTheme === APP_THEMES.LIGHT ? "light" : "classic-gold";
    root.dataset.theme = nextDatasetTheme;
    return () => {
      if (root.dataset.theme === nextDatasetTheme) {
        root.dataset.theme = "classic-gold";
      }
    };
  }, [appTheme]);

  useEffect(() => {
    appModeRef.current = appMode;
  }, [appMode]);

  useEffect(() => {
    if (appMode !== APP_MODES.METRONOME && metronomeAdvancedPanel) {
      setMetronomeAdvancedPanel("");
    }
  }, [appMode, metronomeAdvancedPanel]);

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
    scopedMetronomeSettingsRef.current[activeMetronomeScopeRef.current] = {
      bpm,
      timeSignature: metronomeTimeSignature,
      subdivision: metronomeSubdivision,
      tone: metronomeTone,
      accentTone: metronomeAccentTone,
      weakTone: metronomeWeakTone,
      accent: metronomeAccent,
      countIn: metronomeCountIn,
      countInBars: metronomeCountInBars,
      beatPattern: normalizeMetronomeBeatPattern(metronomeBeatPattern, getTimeSignatureOption(metronomeTimeSignature).beats),
    };
  }, [bpm, metronomeAccent, metronomeAccentTone, metronomeBeatPattern, metronomeCountIn, metronomeCountInBars, metronomeSubdivision, metronomeTimeSignature, metronomeTone, metronomeWeakTone]);

  useEffect(() => {
    stage3StorageOpenRef.current = stage3StorageOpen;
  }, [stage3StorageOpen]);

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
    if (typeof window === "undefined") return;
    window.localStorage.setItem(METRONOME_DISPLAY_MODE_STORAGE_KEY, normalizeMetronomeDisplayMode(metronomeDisplayMode));
  }, [metronomeDisplayMode]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!window.location.hash) {
      window.history.replaceState(
        { appRoute: APP_ROUTES.STAGE3 },
        "",
        `${window.location.pathname}${window.location.search}${APP_ROUTES.STAGE3}`,
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
      if (route.appMode === APP_MODES.METRONOME) {
        switchMetronomeScope(METRONOME_SETTING_SCOPES.STANDALONE);
      } else if (route.appMode === APP_MODES.MINI_CHORD_MAKER) {
        switchMetronomeScope(METRONOME_SETTING_SCOPES.STAGE3);
      } else if (route.appMode === APP_MODES.PRACTICE) {
        switchMetronomeScope(getMetronomeScopeForCategory(route.categoryId));
      }
      setEnemies([]);
      enemiesRef.current = [];
      setShooterTargets([]);
      shooterTargetsRef.current = [];
      setProjectiles([]);
      projectilesRef.current = [];
      setHitZoneNote(null);
      setIsHitWindowActive(false);
      setBeat(0);
      setUtilityMenuOpen(false);
      if (route.appMode !== APP_MODES.METRONOME) setMetronomeAdvancedPanel("");
      setState(route.appMode === APP_MODES.SHOOTER && streamRef.current ? GAME_STATES.LISTENING : GAME_STATES.IDLE);
    };

    const handlePopState = () => {
      if (!stage3StorageOpenRef.current) return;
      stage3StorageSwipeStartRef.current = null;
      stage3StorageOpenRef.current = false;
      setStage3StorageSwipeActive(false);
      setStage3StorageSwipeOffset(0);
      setStage3StorageOpen(false);
      appModeRef.current = APP_MODES.PRACTICE;
      selectedCategoryIdRef.current = "rhythm";
      setAppMode(APP_MODES.PRACTICE);
      setSelectedCategoryId("rhythm");
      setPendingStageCardId("rhythm");
      switchMetronomeScope(METRONOME_SETTING_SCOPES.STAGE3);
    };

    window.addEventListener("hashchange", applyHashRoute);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("hashchange", applyHashRoute);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [getMetronomeScopeForCategory, setState, stopMic, switchMetronomeScope]);

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
    metronomeAccentToneRef.current = metronomeAccentTone;
  }, [metronomeAccentTone]);

  useEffect(() => {
    metronomeWeakToneRef.current = metronomeWeakTone;
  }, [metronomeWeakTone]);

  useEffect(() => {
    metronomeCountInRef.current = metronomeCountIn;
  }, [metronomeCountIn]);

  useEffect(() => {
    metronomeCountInBarsRef.current = metronomeCountInBars;
    setMetronomeCountIn(metronomeCountInBars > 0);
  }, [metronomeCountInBars]);

  useEffect(() => {
    metronomeCountInVoiceModeRef.current = metronomeCountInVoiceMode;
  }, [metronomeCountInVoiceMode]);

  useEffect(() => {
    metronomeBeatPatternRef.current = standaloneBeatPattern;
  }, [standaloneBeatPattern]);

  useEffect(() => {
    autoBpmModeRef.current = autoBpmMode;
    autoBpmEnabledRef.current = autoBpmMode !== "off";
    setAutoBpmEnabled(autoBpmMode !== "off");
    if (autoBpmMode === "off" && metronomeTrackerModeRef.current !== "bars") {
      setMetronomeMeasureCount(0);
    }
  }, [autoBpmMode]);

  useEffect(() => {
    autoBpmDirectionRef.current = autoBpmDirection;
  }, [autoBpmDirection]);

  useEffect(() => {
    autoBpmStepRef.current = autoBpmStep;
  }, [autoBpmStep]);

  useEffect(() => {
    autoBpmBarsRef.current = autoBpmBars;
  }, [autoBpmBars]);

  useEffect(() => {
    autoBpmTimeMsRef.current = Math.max(1000, ((autoBpmTimeMinutes * 60) + autoBpmTimeSeconds) * 1000);
  }, [autoBpmTimeMinutes, autoBpmTimeSeconds]);

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
    metronomeTrackerModeRef.current = metronomeTrackerMode;
  }, [metronomeTrackerMode]);

  useEffect(() => {
    metronomeBarLimitEnabledRef.current = metronomeBarLimitEnabled;
  }, [metronomeBarLimitEnabled]);

  useEffect(() => {
    metronomeBarLimitRef.current = metronomeBarLimit;
  }, [metronomeBarLimit]);

  useEffect(() => {
    metronomeBarStopWhenReachedRef.current = metronomeBarStopWhenReached;
  }, [metronomeBarStopWhenReached]);

  useEffect(() => {
    metronomeBarResetWhenReachedRef.current = metronomeBarResetWhenReached;
  }, [metronomeBarResetWhenReached]);

  useEffect(() => {
    metronomeTimerStopWhenReachedRef.current = metronomeTimerStopWhenReached;
  }, [metronomeTimerStopWhenReached]);

  useEffect(() => {
    metronomeTimerResetWhenReachedRef.current = metronomeTimerResetWhenReached;
  }, [metronomeTimerResetWhenReached]);

  useEffect(() => {
    metronomeTrackerTimerTotalMsRef.current = Math.max(0, ((metronomeTrackerTimerMinutes * 60) + metronomeTrackerTimerSeconds) * 1000);
  }, [metronomeTrackerTimerMinutes, metronomeTrackerTimerSeconds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextPayload = JSON.stringify({
      trackerMode: metronomeTrackerMode,
      barLimitEnabled: metronomeBarLimitEnabled,
      barLimit: metronomeBarLimit,
      measureCount: metronomeMeasureCount,
      trackerCurrent: metronomeMeasureCount,
      trackerTimerMinutes: metronomeTrackerTimerMinutes,
      trackerTimerSeconds: metronomeTrackerTimerSeconds,
      trackerElapsedMs: metronomeTrackerElapsedMs,
      trackerTime: metronomeTrackerElapsedMs,
    });

    if (metronomeTrackerStorageTimerRef.current != null) {
      window.clearTimeout(metronomeTrackerStorageTimerRef.current);
    }

    metronomeTrackerStorageTimerRef.current = window.setTimeout(() => {
      metronomeTrackerStorageTimerRef.current = null;
      window.localStorage.setItem(METRONOME_TRACKER_PROGRESS_STORAGE_KEY, nextPayload);
    }, METRONOME_TRACKER_STORAGE_DEBOUNCE_MS);

    return () => {
      if (metronomeTrackerStorageTimerRef.current != null) {
        window.clearTimeout(metronomeTrackerStorageTimerRef.current);
        metronomeTrackerStorageTimerRef.current = null;
      }
    };
  }, [
    metronomeBarLimit,
    metronomeBarLimitEnabled,
    metronomeMeasureCount,
    metronomeTrackerElapsedMs,
    metronomeTrackerMode,
    metronomeTrackerTimerMinutes,
    metronomeTrackerTimerSeconds,
  ]);

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
    metronomeOnRef.current = metronomeOn;
  }, [metronomeOn]);

  useEffect(() => {
    if (!metronomeMasterGainRef.current || !audioRef.current) return;
    metronomeMasterGainRef.current.gain.setTargetAtTime(
      Math.max(0, Math.min(1, metronomeVolumeRef.current ?? 0.72)),
      audioRef.current.currentTime,
      0.012,
    );
  });

  useEffect(() => {
    backingDrumEnabledRef.current = backingDrumEnabled;
  }, [backingDrumEnabled]);

  useEffect(() => {
    backingBassEnabledRef.current = backingBassEnabled;
  }, [backingBassEnabled]);

  useEffect(() => {
    backingPianoEnabledRef.current = backingPianoEnabled;
  }, [backingPianoEnabled]);

  useEffect(() => {
    backingDrumVolumeRef.current = clampBackingPartVolume(backingDrumVolume);
    if (backingDrumGainRef.current && audioRef.current) {
      backingDrumGainRef.current.gain.setTargetAtTime(
        getBackingPartOutputGain("drum", backingDrumVolumeRef.current),
        audioRef.current.currentTime,
        0.012,
      );
    }
  }, [backingDrumVolume]);

  useEffect(() => {
    backingBassVolumeRef.current = clampBackingPartVolume(backingBassVolume);
    if (backingBassGainRef.current && audioRef.current) {
      backingBassGainRef.current.gain.setTargetAtTime(
        getBackingPartOutputGain("bass", backingBassVolumeRef.current),
        audioRef.current.currentTime,
        0.012,
      );
    }
  }, [backingBassVolume]);

  useEffect(() => {
    backingPianoVolumeRef.current = clampBackingPartVolume(backingPianoVolume);
    if (backingPianoGainRef.current && audioRef.current) {
      backingPianoGainRef.current.gain.setTargetAtTime(
        getBackingPartOutputGain("piano", backingPianoVolumeRef.current),
        audioRef.current.currentTime,
        0.012,
      );
    }
  }, [backingPianoVolume]);

  useEffect(() => {
    backingRhythmPatternRef.current = backingRhythmPattern;
  }, [backingRhythmPattern]);

  useEffect(() => {
    backingBassBeatRef.current = backingBassBeat;
  }, [backingBassBeat]);

  useEffect(() => {
    backingPianoBeatRef.current = backingPianoBeat;
  }, [backingPianoBeat]);

  useEffect(() => {
    if (backingRhythmPattern === "4beat" && (backingBassBeat === "8beat" || backingBassBeat === "16beat")) {
      backingBassBeatRef.current = "basic";
      setBackingBassBeat("basic");
    }
    if (backingRhythmPattern === "8beat" && backingBassBeat === "16beat") {
      backingBassBeatRef.current = "8beat";
      setBackingBassBeat("8beat");
    }
    if (backingRhythmPattern === "4beat" && backingPianoBeat === "8beat") {
      backingPianoBeatRef.current = "2beat";
      setBackingPianoBeat("2beat");
    }
  }, [backingBassBeat, backingPianoBeat, backingRhythmPattern]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let idleId = null;
    let timerId = null;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(warmCoreAudioSampleFiles, { timeout: 1200 });
    } else {
      timerId = window.setTimeout(warmCoreAudioSampleFiles, 600);
    }
    return () => {
      if (idleId !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let started = false;
    const warmOnInteraction = () => {
      if (started) return;
      started = true;
      warmCoreAudioEngine({ resumeAudio: true });
    };
    const options = { capture: true, passive: true };
    window.addEventListener("pointerdown", warmOnInteraction, options);
    window.addEventListener("keydown", warmOnInteraction, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", warmOnInteraction, options);
      window.removeEventListener("keydown", warmOnInteraction, { capture: true });
    };
  }, [warmCoreAudioEngine]);

  useEffect(() => {
    const isRhythmPracticeScreen =
      appMode === APP_MODES.PRACTICE &&
      selectedCategoryId === "rhythm" &&
      !stage3StorageOpen;
    if (!isRhythmPracticeScreen) setStage3RecommendedSelectValue("");
  }, [appMode, selectedCategoryId, stage3StorageOpen]);

  useEffect(() => {
    if (selectedCategoryId !== "rhythm" || stage3StorageOpen) return undefined;
    if (gameStateRef.current === GAME_STATES.PLAYING) return undefined;
    const timerId = window.setTimeout(() => {
      prepareStage3BackingSession({
        progression: chordTransitionProgression,
        bpmValue: bpm,
        timeSignatureValue: metronomeTimeSignature,
        preloadAudio: false,
      });
    }, 80);
    return () => window.clearTimeout(timerId);
  }, [
    backingBassBeat,
    backingPianoBeat,
    backingRhythmPattern,
    bpm,
    chordTransitionProgression,
    metronomeTimeSignature,
    prepareStage3BackingSession,
    selectedCategoryId,
    stage3StorageOpen,
  ]);

  useEffect(() => {
    stage3StorageStrumPatternRef.current = normalizeStrumPatternGroups(stage3StorageStrumPattern);
  }, [stage3StorageStrumPattern]);

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
        }),
      );
    } catch {
      // Ignore storage failures so practice remains usable in private/restricted browsers.
    }
  }, [
    bpm,
    chordProgressionId,
    showChordFingeringGuide,
    stage3ChordIds,
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
        isCurrent: isActive,
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
  const shooterDifficultyPhase = getShooterDifficultyPhase(shooterDifficulty, gameTimeRef.current);
  const shooterLevel = getShooterEffectiveLevel(getShooterLevel(hits), shooterDifficulty, gameTimeRef.current);
  const shooterDifficultyLabel = SHOOTER_DIFFICULTY_OPTIONS.find((option) => option.id === shooterDifficulty)?.label ?? "쉬움";
  const shooterTotalAccuracy = shooterRecords.totals.shots > 0
    ? Math.round((shooterRecords.totals.hits / shooterRecords.totals.shots) * 100)
    : 0;
  const formatShooterRecordTime = (milliseconds) => {
    const totalSeconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };
  const formatShooterRecordDate = (timestamp) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "-";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const shooterPreview = getShooterQueue(hits, shooterTarget ? Math.max(0, patternRef.current - 1) : patternRef.current, 5);
  const shooterMotion = gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.PAUSED
    ? shooterAim
    : {
        "--aim-shift": "0px",
        "--aim-tilt": "0deg",
        "--guitar-aim": "0deg",
        "--arm-aim": "0deg",
      };
  const isShooterDifficultyLocked = gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.PAUSED;
  const hasDirectionPractice = selectedCategory.id === "scale-block" || selectedCategory.id === "first-position";
  const directionGuideSequence =
    selectedCategory.id === "first-position" ? FIRST_POSITION_ASCENDING_SEQUENCE : selectedPentatonic.sequence;
  const scaleStartPitch = directionGuideSequence[0] ?? selectedScaleRoot;
  const scaleEndPitch = directionGuideSequence[directionGuideSequence.length - 1] ?? selectedScaleRoot;
  const miniChordTimelineBars = useMemo(() => (
    Array.from({ length: miniChordBarCount }, (_, barIndex) => ({
      index: barIndex,
      slots: [0, 1].map((slotIndex) => {
        const globalIndex = barIndex * MINI_CHORD_SLOTS_PER_BAR + slotIndex;
        return {
          index: globalIndex,
          slotIndex,
          chord: miniChordSlots[globalIndex] ?? "",
        };
      }),
      repeatStart: Boolean(miniChordBarMarks[barIndex]?.repeatStart),
      repeatEnd: Boolean(miniChordBarMarks[barIndex]?.repeatEnd),
      ending: miniChordBarMarks[barIndex]?.ending ?? null,
    }))
  ), [miniChordBarCount, miniChordBarMarks, miniChordSlots]);

  const miniChordCanDecreaseBars = miniChordBarCount > MINI_CHORD_MIN_BARS;
  const miniChordCanIncreaseBars = miniChordBarCount < MINI_CHORD_MAX_BARS;
  const miniChordVisibleStartBar = 1;
  const miniChordVisibleEndBar = miniChordBarCount;
  const miniChordVisibleBars = miniChordTimelineBars;
  const miniChordPickerRoots = miniChordPickerAccidental === "flat"
    ? MINI_CHORD_PICKER_FLAT_ROOTS
    : MINI_CHORD_PICKER_SHARP_ROOTS;

  const miniChordActiveValue = miniChordSlots[miniChordActiveSlot] ?? "";
  const miniChordRepeatStartsFromMarks = useMemo(
    () => getMiniChordMarkersFromBarMarks(miniChordBarMarks, "repeatStart", miniChordBarCount),
    [miniChordBarCount, miniChordBarMarks],
  );
  const miniChordRepeatEndsFromMarks = useMemo(
    () => getMiniChordMarkersFromBarMarks(miniChordBarMarks, "repeatEnd", miniChordBarCount),
    [miniChordBarCount, miniChordBarMarks],
  );
  const miniChordRepeatRange = useMemo(() => {
    const start = miniChordRepeatStartsFromMarks[0];
    const end = miniChordRepeatEndsFromMarks.find((marker) => start != null && marker >= start);
    return start != null && end != null ? { start, end } : null;
  }, [miniChordRepeatEndsFromMarks, miniChordRepeatStartsFromMarks]);

  const getMiniChordFloatingPosition = useCallback((rect, size) => {
    const viewportWidth = typeof window === "undefined" ? 390 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 844 : window.innerHeight;
    const width = size?.width ?? 180;
    const height = size?.height ?? 180;
    const left = Math.max(8, Math.min(viewportWidth - width - 8, rect.left));
    const belowTop = rect.bottom + 6;
    const top = belowTop + height <= viewportHeight - 8
      ? belowTop
      : Math.max(8, rect.top - height - 6);
    return { left, top };
  }, []);

  const updateMiniChordBarCount = useCallback((nextBarCount) => {
    const safeBarCount = normalizeMiniChordBarCount(nextBarCount);
    setMiniChordBarCount(safeBarCount);
    setMiniChordSlots((slots) => normalizeMiniChordSlots(slots, safeBarCount));
    setMiniChordRepeatStarts((markers) => normalizeMiniChordMarkers(markers, safeBarCount));
    setMiniChordRepeatEnds((markers) => normalizeMiniChordMarkers(markers, safeBarCount));
    setMiniChordBarMarks((marks) => normalizeMiniChordBarMarks(marks, safeBarCount));
    setMiniChordActiveSlot((slot) => Math.min(slot, safeBarCount * MINI_CHORD_SLOTS_PER_BAR - 1));
    setMiniChordActiveBarIndex((barIndex) => (barIndex == null ? null : Math.min(barIndex, safeBarCount - 1)));
    setMiniChordChordPickerSlot(null);
    setMiniChordEndingPopoverPosition(null);
    setMiniChordChordPickerPosition(null);
    setMiniChordPlayhead((slot) => (slot == null ? null : Math.min(slot, safeBarCount * MINI_CHORD_SLOTS_PER_BAR - 1)));
    setMiniChordPageIndex((page) => Math.min(page, Math.ceil(safeBarCount / MINI_CHORD_BARS_PER_PAGE) - 1));
  }, []);

  const updateMiniChordSlot = useCallback((slotIndex, value) => {
    const safeIndex = Math.max(0, Math.min(miniChordBarCount * MINI_CHORD_SLOTS_PER_BAR - 1, Number(slotIndex) || 0));
    setMiniChordActiveSlot(safeIndex);
    setMiniChordSlots((slots) => {
      const nextSlots = normalizeMiniChordSlots(slots, miniChordBarCount);
      nextSlots[safeIndex] = String(value ?? "").trim();
      return nextSlots;
    });
  }, [miniChordBarCount]);

  const clearMiniChordSlot = useCallback(() => {
    updateMiniChordSlot(miniChordActiveSlot, "");
  }, [miniChordActiveSlot, updateMiniChordSlot]);

  const updateMiniChordBarMark = useCallback((barIndex, patch) => {
    const safeIndex = Math.max(0, Math.min(miniChordBarCount - 1, Number(barIndex) || 0));
    setMiniChordBarMarks((marks) => {
      const currentMark = marks[safeIndex] ?? {};
      const nextMark = { ...currentMark, ...patch };
      if (nextMark.repeatStart === false) delete nextMark.repeatStart;
      if (nextMark.repeatEnd === false) delete nextMark.repeatEnd;
      if (nextMark.ending == null || Number(nextMark.ending) < 1 || Number(nextMark.ending) > 5) {
        delete nextMark.ending;
      } else {
        nextMark.ending = Number(nextMark.ending);
      }

      const next = { ...marks };
      if (Object.keys(nextMark).length > 0) {
        next[safeIndex] = nextMark;
      } else {
        delete next[safeIndex];
      }
      return normalizeMiniChordBarMarks(next, miniChordBarCount);
    });
  }, [miniChordBarCount]);

  const clearMiniChordBarMark = useCallback((barIndex) => {
    const safeIndex = Math.max(0, Math.min(miniChordBarCount - 1, Number(barIndex) || 0));
    setMiniChordBarMarks((marks) => {
      const next = { ...marks };
      delete next[safeIndex];
      return next;
    });
  }, [miniChordBarCount]);

  const getCurrentMiniChordArrangement = useCallback(() => normalizeMiniChordArrangement({
    id: `mini-${Date.now()}`,
    title: miniChordTitle,
    barCount: miniChordBarCount,
    slots: miniChordSlots,
    repeatStarts: miniChordRepeatStartsFromMarks,
    repeatEnds: miniChordRepeatEndsFromMarks,
    barMarks: miniChordBarMarks,
    bpm: miniChordBpm,
    capo: miniChordCapo,
    loop: miniChordLoop,
  }), [
    miniChordBarMarks,
    miniChordBarCount,
    miniChordBpm,
    miniChordCapo,
    miniChordLoop,
    miniChordRepeatEndsFromMarks,
    miniChordRepeatStartsFromMarks,
    miniChordSlots,
    miniChordTitle,
  ]);

  const loadMiniChordArrangement = useCallback((item) => {
    const next = normalizeMiniChordArrangement(item);
    setMiniChordTitle(next.title);
    setMiniChordBarCount(next.barCount);
    setMiniChordSlots(next.slots);
    setMiniChordRepeatStarts(next.repeatStarts);
    setMiniChordRepeatEnds(next.repeatEnds);
    setMiniChordBarMarks(next.barMarks);
    setMiniChordBpm(next.bpm);
    setMiniChordCapo(next.capo);
    setMiniChordLoop(next.loop);
    setMiniChordActiveSlot(0);
    setMiniChordActiveBarIndex(null);
    setMiniChordChordPickerSlot(null);
    setMiniChordEndingPopoverPosition(null);
    setMiniChordChordPickerPosition(null);
    setMiniChordPlayhead(null);
    setMiniChordIsPlaying(false);
    setMiniChordPageIndex(0);
  }, []);

  const saveMiniChordArrangement = useCallback(() => {
    const current = getCurrentMiniChordArrangement();
    setMiniChordSavedItems((items) => [current, ...items.filter((item) => item.id !== current.id)].slice(0, 24));
  }, [getCurrentMiniChordArrangement]);

  const resetMiniChordDraft = useCallback(() => {
    loadMiniChordArrangement(createDefaultMiniChordArrangement());
  }, [loadMiniChordArrangement]);

  const stopMiniChordPreview = useCallback(() => {
    if (miniChordPlayTimerRef.current) {
      window.clearInterval(miniChordPlayTimerRef.current);
      miniChordPlayTimerRef.current = null;
    }
    setMiniChordIsPlaying(false);
    setMiniChordPlayhead(null);
  }, []);

  const startMiniChordPreview = useCallback(() => {
    if (miniChordPlayTimerRef.current) window.clearInterval(miniChordPlayTimerRef.current);
    const totalSlots = miniChordBarCount * MINI_CHORD_SLOTS_PER_BAR;
    const slotMs = Math.max(120, getBeatMs(miniChordBpm) * 2);
    setMiniChordPlayhead(0);
    setMiniChordIsPlaying(true);
    miniChordPlayTimerRef.current = window.setInterval(() => {
      setMiniChordPlayhead((slot) => {
        const currentSlot = slot == null ? 0 : slot;
        const nextSlot = currentSlot + 1;
        if (nextSlot < totalSlots) return nextSlot;
        if (miniChordLoop) return 0;
        if (miniChordPlayTimerRef.current) {
          window.clearInterval(miniChordPlayTimerRef.current);
          miniChordPlayTimerRef.current = null;
        }
        setMiniChordIsPlaying(false);
        return null;
      });
    }, slotMs);
  }, [miniChordBarCount, miniChordBpm, miniChordLoop]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(MINI_CHORD_MAKER_STORAGE_KEY, JSON.stringify(miniChordSavedItems));
    } catch (error) {
      console.warn("MINI CHORD SAVE FAILED:", error);
    }
  }, [miniChordSavedItems]);

  useEffect(() => () => {
    if (miniChordPlayTimerRef.current) {
      window.clearInterval(miniChordPlayTimerRef.current);
      miniChordPlayTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (appMode !== APP_MODES.MINI_CHORD_MAKER) stopMiniChordPreview();
  }, [appMode, stopMiniChordPreview]);

  useEffect(() => {
    if (miniChordPlayhead == null) return;
    setMiniChordPageIndex(Math.floor(miniChordPlayhead / (MINI_CHORD_BARS_PER_PAGE * MINI_CHORD_SLOTS_PER_BAR)));
  }, [miniChordPlayhead]);

  const contentHeader = appMode === APP_MODES.FRETBOARD_VIEWER
      ? { title: "지판보기", subtitle: "음표와 코드 위치를 빠르게 확인" }
    : appMode === APP_MODES.MINI_CHORD_MAKER
      ? { title: "미니코드 반주", subtitle: "4~16마디 코드 타임라인" }
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
    : { title: "리듬 & 코드", subtitle: "메트로놈 기반 기타 리듬 트레이닝" };

  const getBackingVolumeValue = (part) => {
    if (part === "bass") return backingBassVolume;
    if (part === "piano") return backingPianoVolume;
    return backingDrumVolume;
  };

  const applyBackingPartVolume = useCallback((part, value, smoothSeconds = 0.018) => {
    const safeValue = clampBackingPartVolume(value);
    const gainValue = getBackingPartOutputGain(part, safeValue);
    const gainRef = part === "bass"
      ? backingBassGainRef
      : part === "piano"
        ? backingPianoGainRef
        : backingDrumGainRef;
    if (part === "bass") {
      backingBassVolumeRef.current = safeValue;
    } else if (part === "piano") {
      backingPianoVolumeRef.current = safeValue;
    } else {
      backingDrumVolumeRef.current = safeValue;
    }
    if (gainRef.current && audioRef.current) {
      const now = audioRef.current.currentTime;
      try {
        gainRef.current.gain.cancelScheduledValues(now);
        gainRef.current.gain.setTargetAtTime(gainValue, now, smoothSeconds);
      } catch {
        // Keep the menu responsive even if the audio node is not ready yet.
      }
    }
    return safeValue;
  }, []);

  const updateBackingVolumeReadout = useCallback((input, value) => {
    const readout = input
      ?.closest(".utilitySoundSliderRow")
      ?.querySelector("[data-backing-volume-value]");
    if (readout) readout.textContent = String(value);
  }, []);

  const handleBackingVolumeInput = useCallback((part, event) => {
    const safeValue = applyBackingPartVolume(part, event.currentTarget.value, 0.014);
    updateBackingVolumeReadout(event.currentTarget, safeValue);
  }, [applyBackingPartVolume, updateBackingVolumeReadout]);

  const commitBackingVolumeInput = useCallback((part, event) => {
    const safeValue = applyBackingPartVolume(part, event.currentTarget.value, 0.018);
    updateBackingVolumeReadout(event.currentTarget, safeValue);
    if (part === "bass") {
      setBackingBassVolume(safeValue);
    } else if (part === "piano") {
      setBackingPianoVolume(safeValue);
    } else {
      setBackingDrumVolume(safeValue);
    }
  }, [applyBackingPartVolume, updateBackingVolumeReadout]);

  const resetBackingVolumeSettings = useCallback(() => {
    BACKING_PART_VOLUME_CONTROLS.forEach((control) => {
      const defaultValue = BACKING_DEFAULT_PART_VOLUMES[control.id];
      applyBackingPartVolume(control.id, defaultValue, 0.02);
      const input = typeof document === "undefined"
        ? null
        : document.querySelector(`[data-backing-volume-part="${control.id}"]`);
      if (input) {
        input.value = String(defaultValue);
        updateBackingVolumeReadout(input, defaultValue);
      }
    });
    setBackingDrumVolume(BACKING_DEFAULT_PART_VOLUMES.drum);
    setBackingBassVolume(BACKING_DEFAULT_PART_VOLUMES.bass);
    setBackingPianoVolume(BACKING_DEFAULT_PART_VOLUMES.piano);
  }, [applyBackingPartVolume, updateBackingVolumeReadout]);

  const isStage3AudioPreparing =
    selectedCategory.id === "rhythm" &&
    appMode === APP_MODES.PRACTICE &&
    !stage3StorageOpen &&
    hasChordTransitionProgression &&
    gameState !== GAME_STATES.PLAYING &&
    stage3BackingPrepareStatus !== "ready";

  return (
    <main
      className={`app notranslate theme-${appTheme} ${appMode === APP_MODES.MENU ? "menuApp" : ""} ${
        appMode === APP_MODES.MINI_CHORD_MAKER ? "miniChordMakerMode" : ""
      } ${isSignalActive ? "signalGlow" : ""}`}
      translate="no"
    >
      {utilityMenuOpen ? (
        <div className="utilityMenuLayer" role="presentation">
          <button
            aria-label="메뉴 닫기"
            className="utilityMenuDim"
            onClick={() => setUtilityMenuOpen(false)}
            type="button"
          />
          <aside
            aria-label="메뉴"
            className="utilityMenuPanel"
            id="utility-menu-panel"
          >
            <div className="utilityMenuHeader">
              <div>
                <span>MENU</span>
                <strong>메뉴</strong>
              </div>
              <button
                aria-label="메뉴 닫기"
                onClick={() => setUtilityMenuOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            {themeMenuVisible ? (
              <section className="utilityThemePanel" aria-label="테마 설정">
                <div className="utilityThemeHeader">
                  <div>
                    <strong>테마</strong>
                    <p>화면 색상 선택</p>
                  </div>
                </div>
                <div className="utilityThemeOptions" role="radiogroup" aria-label="테마">
                  {themeOptions.map((option) => (
                    <button
                      aria-checked={appTheme === option.id}
                      className={appTheme === option.id ? "selected" : ""}
                      key={option.id}
                      onClick={() => selectAppTheme(option.id)}
                      role="radio"
                      type="button"
                    >
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
            <nav className="utilityMenuList" aria-label="부가 기능 목록">
              <button
                className="utilityMenuItem utilityMenuItemSecondary utilityMenuItemActive"
                onClick={() => showIndependentPracticeCategory("first-position")}
                type="button"
              >
                <span className="utilityMenuIcon" aria-hidden="true">01</span>
                <div className="utilityMenuText">
                  <strong>단일 음 위치 익히기</strong>
                  <small>0~3프렛 기본 음 위치를 찾는 훈련</small>
                </div>
                <span className="utilityMenuChevron" aria-hidden="true">›</span>
              </button>
              <button
                className="utilityMenuItem utilityMenuItemSecondary utilityMenuItemActive"
                onClick={() => showIndependentPracticeCategory("scale-block")}
                type="button"
              >
                <span className="utilityMenuIcon" aria-hidden="true">02</span>
                <div className="utilityMenuText">
                  <strong>스케일 · 펜타토닉</strong>
                  <small>스케일과 펜타토닉 박스 위치 훈련</small>
                </div>
                <span className="utilityMenuChevron" aria-hidden="true">›</span>
              </button>
              <button className="utilityMenuItem utilityMenuItemPrimary utilityMenuItemActive" onClick={showStage3StorageRoom} type="button">
                <span className="utilityMenuIcon" aria-hidden="true">▦</span>
                <div className="utilityMenuText">
                  <strong>저장실</strong>
                  <small>코드 진행 및 주법 관리</small>
                </div>
                <span className="utilityMenuChevron" aria-hidden="true">›</span>
              </button>
              {miniChordMenuVisible ? (
                <button
                  className="utilityMenuItem utilityMenuItemSecondary utilityMenuItemActive miniChordDesktopMenuItem"
                  onClick={showMiniChordMaker}
                  type="button"
                >
                  <span className="utilityMenuIcon" aria-hidden="true">MC</span>
                  <div className="utilityMenuText">
                    <strong>미니코드 반주</strong>
                    <small>4~16마디 코드 타임라인</small>
                  </div>
                  <span className="utilityMenuChevron" aria-hidden="true">›</span>
                </button>
              ) : null}
              <section className="utilitySoundPanel" aria-label="사운드 설정">
                <details className="utilitySoundDetails">
                  <summary>
                    <span className="utilityMenuIcon" aria-hidden="true">
                      <Volume2 size={16} />
                    </span>
                    <div className="utilityMenuText">
                      <strong>사운드 설정</strong>
                      <small>드럼·베이스·피아노 밸런스</small>
                    </div>
                  </summary>
                  <div className="utilitySoundSliders">
                    {BACKING_PART_VOLUME_CONTROLS.map((control) => {
                      const value = getBackingVolumeValue(control.id);
                      return (
                        <label className="utilitySoundSliderRow" key={control.id}>
                          <span>
                            <strong>{control.label}</strong>
                            <b data-backing-volume-value>{value}</b>
                          </span>
                          <input
                            aria-label={`${control.label} 볼륨`}
                            data-backing-volume-part={control.id}
                            defaultValue={value}
                            max="100"
                            min="0"
                            onBlur={(event) => commitBackingVolumeInput(control.id, event)}
                            onInput={(event) => handleBackingVolumeInput(control.id, event)}
                            onKeyUp={(event) => commitBackingVolumeInput(control.id, event)}
                            onPointerUp={(event) => commitBackingVolumeInput(control.id, event)}
                            step="1"
                            type="range"
                          />
                        </label>
                      );
                    })}
                    <button
                      className="utilitySoundResetButton"
                      onClick={resetBackingVolumeSettings}
                      type="button"
                    >
                      셋팅 초기화
                    </button>
                  </div>
                </details>
              </section>
              <button
                className="utilityMenuItem utilityMenuItemSecondary utilityMenuItemActive"
                onClick={() => {
                  setUtilityMenuOpen(false);
                  setHelpGuideOpen(true);
                  setOpenHelpSectionId("");
                }}
                type="button"
              >
                <span className="utilityMenuIcon" aria-hidden="true">?</span>
                <div className="utilityMenuText">
                  <strong>사용설명서 & 도움말</strong>
                  <small>훈련 기능과 사용 방법 안내</small>
                </div>
                <span className="utilityMenuChevron" aria-hidden="true">›</span>
              </button>
              <a
                className="utilityMenuItem utilityMenuItemSecondary utilityMenuItemActive utilityMenuItemExternal utilityMenuItemInstagram"
                href="https://www.instagram.com/sungsu91_/"
                rel="noreferrer"
                target="_blank"
              >
                <span className="utilityMenuIcon utilityMenuInstagramIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <rect x="4" y="4" width="16" height="16" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17" cy="7" r="1.2" />
                  </svg>
                </span>
                <div className="utilityMenuText">
                  <strong>문의하기</strong>
                  <small>Instagram @sungsu91_</small>
                </div>
                <span className="utilityMenuChevron" aria-hidden="true">↗</span>
              </a>
            </nav>
          </aside>
        </div>
      ) : null}

      {helpGuideOpen ? (
        <div className="helpGuideLayer" role="presentation">
          <button
            aria-label="사용설명서 닫기"
            className="helpGuideDim"
            onClick={() => {
              setHelpGuideOpen(false);
              setOpenHelpSectionId("");
            }}
            type="button"
          />
          <section className="helpGuidePanel" aria-label="사용설명서 및 도움말">
            <div className="helpGuideHeader">
              <div>
                <span>RIFFLAB Guide</span>
                <strong>사용설명서 & 도움말</strong>
              </div>
              <button
                aria-label="닫기"
                onClick={() => {
                  setHelpGuideOpen(false);
                  setOpenHelpSectionId("");
                }}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="helpAccordion">
              {HELP_GUIDE_SECTIONS.map((section) => {
                const expanded = openHelpSectionId === section.id;
                return (
                  <article className={`helpAccordionItem ${expanded ? "open" : ""}`} key={section.id}>
                    <button
                      aria-expanded={expanded}
                      className="helpAccordionTrigger"
                      onClick={() => setOpenHelpSectionId(expanded ? "" : section.id)}
                      type="button"
                    >
                      <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
                      <strong>{section.title}</strong>
                    </button>
                    {expanded ? (
                      <div className="helpAccordionContent">
                        {section.content}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {appMode !== APP_MODES.MENU && <section className="hud">
        <BrandHeader variant={headerVariant} />
        <div className="modeSwitch">
          <button
            className={
              (
                appMode === APP_MODES.CURRICULUM ||
                appMode === APP_MODES.MINI_CHORD_MAKER ||
                (appMode === APP_MODES.PRACTICE && selectedCategory.id === "rhythm")
              )
                ? "selected"
                : ""
            }
            onClick={showCurriculum}
            type="button"
          >
            <Guitar size={17} aria-hidden="true" />
            리듬 & 코드
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
            aria-label={utilityMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            className={utilityMenuOpen ? "selected" : ""}
            onClick={() => setUtilityMenuOpen((open) => !open)}
            type="button"
          >
            <Settings size={17} aria-hidden="true" />
            메뉴
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
              <strong>리듬 & 코드</strong>
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
            <button onClick={showFretboardViewer} type="button">
              지판보기
            </button>
            <button onClick={showCurriculum} type="button">
              리듬 & 코드
            </button>
            <button onClick={showMetronomeMode} type="button">
              메트로놈
            </button>
            <button onClick={showShooterMode} translate="no" type="button">
              슈팅게임
            </button>
            <button
              aria-controls="utility-menu-panel"
              aria-expanded={utilityMenuOpen}
              aria-label={utilityMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
              className={utilityMenuOpen ? "selected" : ""}
              onClick={() => setUtilityMenuOpen((open) => !open)}
              type="button"
            >
              메뉴
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
      ) : appMode === APP_MODES.MINI_CHORD_MAKER ? (
        <section className="miniChordMakerPanel miniChordMakerPanelCompact" aria-label="미니코드 반주 모드">
          <div className="miniChordHeader miniChordHeaderCompact">
            <div>
              <span>Mini Chord</span>
              <strong>미니코드 반주</strong>
              <small>{miniChordVisibleStartBar}-{miniChordVisibleEndBar}마디 / 총 {miniChordBarCount}마디</small>
            </div>
            <div className="miniChordTransport">
              <button
                className={miniChordIsPlaying ? "selected" : ""}
                onClick={miniChordIsPlaying ? stopMiniChordPreview : startMiniChordPreview}
                type="button"
              >
                {miniChordIsPlaying ? <Square size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                {miniChordIsPlaying ? "정지" : "시작"}
              </button>
              <button onClick={resetMiniChordDraft} type="button">초기화</button>
            </div>
          </div>

          <div className="miniChordQuickBar" aria-label="미니코드 저장 도구">
            <label className="miniChordSearchField">
              <Music2 size={16} aria-hidden="true" />
              <input
                maxLength={40}
                onChange={(event) => setMiniChordTitle(event.currentTarget.value)}
                placeholder="제목 입력"
                value={miniChordTitle}
              />
            </label>
            <select
              aria-label="미니코드 불러오기"
              disabled={!miniChordSavedItems.length}
              onChange={(event) => {
                const item = miniChordSavedItems.find((savedItem) => savedItem.id === event.currentTarget.value);
                if (item) loadMiniChordArrangement(item);
                event.currentTarget.value = "";
              }}
              value=""
            >
              <option value="">불러오기</option>
              {miniChordSavedItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} - {item.slots.filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
            <button onClick={saveMiniChordArrangement} title="저장" type="button">
              <FolderOpen size={15} aria-hidden="true" />
              저장
            </button>
          </div>

          <div className="miniChordMeasureStrip" aria-label="마디와 페이지 선택">
            <span>마디</span>
            <div className="miniChordSegment" role="group" aria-label="마디 수 선택">
              {MINI_CHORD_BAR_OPTIONS.map((option) => (
                <button
                  className={miniChordBarCount === option ? "selected" : ""}
                  key={option}
                  onClick={() => updateMiniChordBarCount(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="miniChordPageStepper" aria-label="마디 수 빠른 변경">
              <button
                disabled={!miniChordCanDecreaseBars}
                onClick={() => {
                  setMiniChordActiveBarIndex(null);
                  setMiniChordChordPickerSlot(null);
                  setMiniChordEndingPopoverPosition(null);
                  setMiniChordChordPickerPosition(null);
                  updateMiniChordBarCount(miniChordBarCount - 1);
                }}
                type="button"
              >
                -
              </button>
              <strong>{miniChordBarCount}</strong>
              <button
                disabled={!miniChordCanIncreaseBars}
                onClick={() => {
                  setMiniChordActiveBarIndex(null);
                  setMiniChordChordPickerSlot(null);
                  setMiniChordEndingPopoverPosition(null);
                  setMiniChordChordPickerPosition(null);
                  updateMiniChordBarCount(miniChordBarCount + 1);
                }}
                type="button"
              >
                +
              </button>
            </div>
          </div>

          <details className="miniChordCompactSettings">
            <summary>
              <span>설정</span>
              <b>{miniChordBpm} BPM · Capo {miniChordCapo}</b>
            </summary>
            <div className="miniChordSettingsGrid">
              <label className="miniChordField">
                <span>BPM</span>
                <input
                  inputMode="numeric"
                  max="240"
                  min="30"
                  onChange={(event) => setMiniChordBpm(clampBpm(event.currentTarget.value))}
                  type="number"
                  value={miniChordBpm}
                />
              </label>
              <label className="miniChordField">
                <span>카포</span>
                <input
                  inputMode="numeric"
                  max="12"
                  min="0"
                  onChange={(event) => setMiniChordCapo(Math.max(0, Math.min(12, Number(event.currentTarget.value) || 0)))}
                  type="number"
                  value={miniChordCapo}
                />
              </label>
              <label className="miniChordSwitch">
                <input
                  checked={miniChordLoop}
                  onChange={(event) => setMiniChordLoop(event.currentTarget.checked)}
                  type="checkbox"
                />
                <span>반복 재생</span>
              </label>
              <div className="miniChordRepeatSummary">
                <span>도돌이표</span>
                <strong>
                  {miniChordRepeatRange
                    ? `${miniChordRepeatRange.start + 1}~${miniChordRepeatRange.end + 1}마디`
                    : "구간 미지정"}
                </strong>
              </div>
            </div>
          </details>

          <div className="miniChordTimelinePanel miniChordTimelinePanelCompact" aria-label="코드 타임라인">
            <div className="miniChordTimeline miniChordTimelineFour">
              {miniChordVisibleBars.map((bar) => {
                const inRepeatRange = miniChordRepeatRange
                  ? bar.index >= miniChordRepeatRange.start && bar.index <= miniChordRepeatRange.end
                  : false;
                return (
                  <article
                    className={`miniChordBar ${bar.repeatStart ? "repeatStart" : ""} ${bar.repeatEnd ? "repeatEnd" : ""} ${inRepeatRange ? "repeatRange" : ""} ${miniChordActiveBarIndex === bar.index ? "is-editing" : ""}`}
                    key={bar.index}
                  >
                    <span className={`miniChordBarNumber ${bar.ending ? "has-ending" : ""}`}>{bar.index + 1}</span>
                    {bar.ending ? <span className="barEndingLabel">{bar.ending}.</span> : null}
                    <button
                      aria-label={`${bar.index + 1}마디 도돌이표 시작`}
                      className="miniChordMarkHotspot miniChordMarkHotspotStart"
                      onClick={(event) => {
                        event.stopPropagation();
                        updateMiniChordBarMark(bar.index, { repeatStart: !bar.repeatStart });
                        setMiniChordActiveBarIndex(null);
                        setMiniChordChordPickerSlot(null);
                        setMiniChordEndingPopoverPosition(null);
                        setMiniChordChordPickerPosition(null);
                      }}
                      type="button"
                    />
                    <button
                      aria-label={`${bar.index + 1}마디 도돌이표 끝`}
                      className="miniChordMarkHotspot miniChordMarkHotspotEnd"
                      onClick={(event) => {
                        event.stopPropagation();
                        updateMiniChordBarMark(bar.index, { repeatEnd: !bar.repeatEnd });
                        setMiniChordActiveBarIndex(null);
                        setMiniChordChordPickerSlot(null);
                        setMiniChordEndingPopoverPosition(null);
                        setMiniChordChordPickerPosition(null);
                      }}
                      type="button"
                    />
                    <button
                      aria-label={`${bar.index + 1}마디 도돌이 번호`}
                      className="miniChordMarkHotspot miniChordMarkHotspotEnding"
                      onClick={(event) => {
                        event.stopPropagation();
                        const isOpening = miniChordActiveBarIndex !== bar.index;
                        setMiniChordActiveBarIndex(isOpening ? bar.index : null);
                        setMiniChordChordPickerSlot(null);
                        setMiniChordChordPickerPosition(null);
                        setMiniChordEndingPopoverPosition(
                          isOpening
                            ? getMiniChordFloatingPosition(event.currentTarget.getBoundingClientRect(), {
                              width: 156,
                              height: 96,
                            })
                            : null,
                        );
                      }}
                      type="button"
                    />
                    <div className="miniChordSlots">
                      {bar.slots.map((slot) => (
                        <div
                          className={`miniChordSlotWrap ${slot.slotIndex === 1 ? "is-backbeat" : "is-frontbeat"}`}
                          key={slot.index}
                        >
                          <button
                            className={`miniChordSlot ${miniChordActiveSlot === slot.index ? "active" : ""} ${miniChordPlayhead === slot.index ? "playing" : ""} ${slot.chord ? "filled" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setMiniChordActiveSlot(slot.index);
                              setMiniChordActiveBarIndex(null);
                              setMiniChordEndingPopoverPosition(null);
                              setMiniChordChordPickerSlot(slot.index);
                              setMiniChordChordPickerPosition(getMiniChordFloatingPosition(
                                event.currentTarget.getBoundingClientRect(),
                                { width: 218, height: 266 },
                              ));
                              setMiniChordPageIndex(Math.floor(slot.index / (MINI_CHORD_BARS_PER_PAGE * MINI_CHORD_SLOTS_PER_BAR)));
                            }}
                            type="button"
                          >
                            <strong>{slot.chord || "+"}</strong>
                          </button>
                          {miniChordChordPickerSlot === slot.index ? (
                            <div
                              className={`miniChordChordPopover ${slot.slotIndex === 1 ? "alignEnd" : ""}`}
                              onClick={(event) => event.stopPropagation()}
                              style={miniChordChordPickerPosition ?? undefined}
                            >
                              <div className="miniChordPickerSegment" role="group" aria-label="조표 선택">
                                <button
                                  className={miniChordPickerAccidental === "sharp" ? "selected" : ""}
                                  onClick={() => setMiniChordPickerAccidental("sharp")}
                                  type="button"
                                >
                                  #
                                </button>
                                <button
                                  className={miniChordPickerAccidental === "flat" ? "selected" : ""}
                                  onClick={() => setMiniChordPickerAccidental("flat")}
                                  type="button"
                                >
                                  b
                                </button>
                              </div>
                              <div className="miniChordPickerSegment" role="group" aria-label="장단조 선택">
                                <button
                                  className={miniChordPickerQuality === "major" ? "selected" : ""}
                                  onClick={() => setMiniChordPickerQuality("major")}
                                  type="button"
                                >
                                  장조
                                </button>
                                <button
                                  className={miniChordPickerQuality === "minor" ? "selected" : ""}
                                  onClick={() => setMiniChordPickerQuality("minor")}
                                  type="button"
                                >
                                  단조
                                </button>
                              </div>
                              <div className="miniChordPickerRoots" aria-label="코드 루트 선택">
                                {miniChordPickerRoots.map((root) => (
                                  <button
                                    key={root}
                                    onClick={() => {
                                      updateMiniChordSlot(
                                        slot.index,
                                        getMiniChordPickerChord(root, miniChordPickerQuality, miniChordPickerExtension),
                                      );
                                      setMiniChordChordPickerSlot(null);
                                      setMiniChordChordPickerPosition(null);
                                    }}
                                    type="button"
                                  >
                                    {root}
                                  </button>
                                ))}
                              </div>
                              <div className="miniChordPickerActions">
                                <button
                                  onClick={() => {
                                    updateMiniChordSlot(slot.index, "휴지");
                                    setMiniChordChordPickerSlot(null);
                                    setMiniChordChordPickerPosition(null);
                                  }}
                                  type="button"
                                >
                                  휴지 ×
                                </button>
                                <button
                                  onClick={() => {
                                    updateMiniChordSlot(slot.index, "");
                                    setMiniChordChordPickerSlot(null);
                                    setMiniChordChordPickerPosition(null);
                                  }}
                                  type="button"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {miniChordActiveBarIndex === bar.index ? (
                      <div
                        className="barEndingPopover"
                        onClick={(event) => event.stopPropagation()}
                        style={miniChordEndingPopoverPosition ?? undefined}
                      >
                        <div className="barEndingOptions">
                          {[1, 2, 3, 4, 5].map((ending) => (
                            <button
                              className={bar.ending === ending ? "selected" : ""}
                              key={ending}
                              onClick={() => {
                                updateMiniChordBarMark(bar.index, { ending: bar.ending === ending ? null : ending });
                                setMiniChordActiveBarIndex(null);
                                setMiniChordChordPickerSlot(null);
                                setMiniChordEndingPopoverPosition(null);
                                setMiniChordChordPickerPosition(null);
                              }}
                              type="button"
                            >
                              {ending}
                            </button>
                          ))}
                        </div>
                        <button
                          className="barEndingClear"
                          onClick={() => {
                            updateMiniChordBarMark(bar.index, { ending: null });
                            setMiniChordActiveBarIndex(null);
                            setMiniChordChordPickerSlot(null);
                            setMiniChordEndingPopoverPosition(null);
                            setMiniChordChordPickerPosition(null);
                          }}
                          type="button"
                        >
                          해제
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
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
                {getDesignLabSectionLabel(section)}
              </button>
            ))}
          </nav>
          <section className="headerPreviewSection" aria-label="Header Preview">
            <div className="headerPreviewSectionTitle">
              <span>{selectedDesignLabSectionLabel} Lab</span>
              <strong>
                {designLabSection === "logo"
                  ? `운영 Header: ${getHeaderVariantLabel(headerVariant)}`
                  : designLabSection === "app-icon"
                    ? `운영 App Icon: ${getAppIconVariantLabel(designLabAppIconState.activeIcon)}`
                    : designLabSection === "character"
                      ? `Shooter Player: ${selectedGuitarVariant.title}`
                      : designLabSection === "test"
                        ? "Metronome Visual Lab: 운영 화면 미적용"
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
              <div className="guitarLab">
                <article className="headerPreviewCard guitarLabRulesCard">
                  <div className="headerPreviewMeta">
                    <span>RIFFLAB 기타 디자인 규칙</span>
                    <small>Martin, Gibson, Taylor, Yamaha 계열 정면 구조를 참고한 신규 실제 비율 라인 기준</small>
                  </div>
                  <ul>
                    {RIFFLAB_GUITAR_DESIGN_RULES.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </article>
                <div className="guitarLabToolbar">
                  <div>
                    <strong>Guitar Lab</strong>
                    <span>디자인 {visibleGuitarLabVariants.length}개 · 아카이브 {archivedGuitarLabVariants.length}개</span>
                  </div>
                  <div className="guitarLabToolbarActions">
                    <button disabled={!guitarLabSelectedDeleteIds.length} onClick={deleteSelectedGuitarLabVariants} type="button">
                      선택 삭제
                    </button>
                    <button
                      disabled={!visibleGuitarLabVariants.some((variant) => !assignedGuitarVariantIds.has(variant.id) && selectedGuitarVariant.id !== variant.id)}
                      onClick={deleteAllGuitarLabVariants}
                      type="button"
                    >
                      전체 삭제
                    </button>
                    <button disabled={!showGuitarLabArchiveButton} onClick={openGuitarLabArchive} type="button">
                      아카이브 보기
                    </button>
                  </div>
                </div>
                {["Acoustic", "Classical", "Electric"].map((pack) => {
                  const packVariants = visibleGuitarLabVariants.filter((variant) => variant.pack === pack);
                  return (
                    <section className="guitarLabPack" key={pack} aria-label={`${pack} Guitar Pack`}>
                      <div className="headerPreviewMeta">
                        <span>{pack}</span>
                        <small>{pack === "Acoustic" ? `어쿠스틱 기타팩 ${packVariants.length}종` : pack === "Classical" ? `클래식 기타팩 ${packVariants.length}종` : `일렉 기타팩 ${packVariants.length}종`}</small>
                      </div>
                      <div className="headerPreviewGrid guitarLabGrid">
                        {packVariants.map((variant) => {
                        const isActive = selectedGuitarVariant.id === variant.id;
                        const assignedSlotNumbers = SHOOTER_PLAYER_SLOT_KEYS
                          .map((slotKey, index) => shooterPlayerSlots[slotKey] === variant.id ? index + 1 : null)
                          .filter(Boolean);
                        const variantLabel = `V${String(variant.index).padStart(2, "0")}`;
                        const isProtected = isActive || assignedSlotNumbers.length > 0;
                        const isDeleteSelected = guitarLabSelectedDeleteIds.includes(variant.id);
                        return (
                          <article className={`headerPreviewCard guitarLabCard ${assignedSlotNumbers.length ? "selected" : ""} ${isDeleteSelected ? "candidateSelected" : ""}`} key={variant.id}>
                            <div className="guitarLabCardTop">
                              <b>{variantLabel}</b>
                              <label className={`guitarLabSelectCheck ${isProtected ? "disabled" : ""}`}>
                                <input
                                  checked={isDeleteSelected}
                                  disabled={isProtected}
                                  onChange={() => toggleGuitarLabDeleteSelection(variant.id)}
                                  type="checkbox"
                                />
                                선택
                              </label>
                            </div>
                            <div className="headerPreviewMeta">
                              <span>{variantLabel} · {variant.model}</span>
                              <small>{variant.description}</small>
                              <em className="designLabCharacterSpec">
                                {variant.pack} · {assignedSlotNumbers.length ? `Shooter Slot ${assignedSlotNumbers.join(", ")}` : "후보 미지정"}
                              </em>
                            </div>
                            <GuitarLabPreview variant={variant} active={isActive || assignedSlotNumbers.length > 0} />
                            <div className="designLabItemActions">
                              {SHOOTER_PLAYER_SLOT_KEYS.map((slotKey, index) => {
                                const slotNumber = index + 1;
                                const isSlotAssigned = shooterPlayerSlots[slotKey] === variant.id;
                                return (
                                  <button
                                    className={isSlotAssigned ? "selected" : ""}
                                    key={slotKey}
                                    onClick={() => saveGuitarToShooterSlot(variant.id, slotKey)}
                                    type="button"
                                  >
                                    {slotNumber}로 저장
                                  </button>
                                );
                              })}
                              <button
                                className="danger"
                                disabled={isProtected}
                                onClick={() => deleteGuitarLabVariant(variant.id)}
                                type="button"
                              >
                                삭제
                              </button>
                            </div>
                          </article>
                        );
                      })}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : null}
            {designLabSection === "test" ? (
              <div className="metronomeVisualLab">
                <article className="headerPreviewCard svgLogoLabHero">
                  <div className="headerPreviewMeta">
                    <span>Logo Lab · R Brand Symbol Candidates</span>
                    <small>R을 중심으로 피크, 프렛, 헤드스톡, 훈련 상징을 다르게 조합한 1:1 SVG 후보입니다. 기존 V11 명판과 로고는 분리 관리됩니다.</small>
                    <em className="designLabStatus designLabStatus--draft">Experimental</em>
                  </div>
                  <SvgLogoHeaderPreview candidate={svgLogoPreviewCandidate} />
                  <div className="svgLogoLabHeroMeta">
                    <span>{svgLogoPreviewCandidate.label}</span>
                    <strong>{svgLogoPreviewCandidate.title}</strong>
                    <small>{svgLogoPreviewCandidate.description}</small>
                  </div>
                </article>

                <article className="headerPreviewCard shooterHitSoundLabCard">
                  <div className="headerPreviewMeta">
                    <span>Shooter Hit Sound Lab</span>
                    <small>몹이 깨질 때 들릴 짧은 "빠각!" 후보입니다. 게임에는 현재 A 후보가 기본 적용됩니다.</small>
                    <em className="designLabStatus designLabStatus--draft">Preview</em>
                  </div>
                  <div className="shooterHitSoundCandidates">
                    {SHOOTER_HIT_SOUND_CANDIDATES.map((candidate) => (
                      <button
                        key={candidate.id}
                        onClick={() => playShooterSound("hit", { candidateId: candidate.id, combo: candidate.id === "chime-crash-combo" ? 20 : 1, preview: true })}
                        type="button"
                      >
                        <Play size={15} />
                        <span>{candidate.label}</span>
                        <strong>{candidate.title}</strong>
                        <small>{candidate.description}</small>
                      </button>
                    ))}
                  </div>
                </article>

                <div className="svgLogoLabGrid">
                  {visibleSvgLogoCandidates.map((candidate) => {
                    const isPreview = svgLogoPreviewCandidate.id === candidate.id;
                    const isActive = svgLogoLabState.activeLogo === candidate.id;
                    return (
                      <article
                        className={`headerPreviewCard svgLogoCandidateCard ${isPreview ? "candidateSelected" : ""} ${isActive ? "selected" : ""}`}
                        key={candidate.id}
                      >
                        <div className="headerPreviewMeta">
                          <span>{candidate.label}</span>
                          <small>{candidate.title}</small>
                          <em className={`designLabStatus designLabStatus--${isActive ? "active" : "draft"}`}>
                            {isActive ? "Active Logo" : "SVG Candidate"}
                          </em>
                        </div>
                        <div className="svgLogoCandidatePreview">
                          <RiffLoopLogoSvg candidate={candidate} />
                        </div>
                        <p>{candidate.description}</p>
                        <div className="designLabItemActions">
                          <button
                            className={isPreview ? "selected" : ""}
                            onClick={() => setSvgLogoPreviewId(candidate.id)}
                            type="button"
                          >
                            Preview in Header
                          </button>
                          <button
                            className={isActive ? "selected" : ""}
                            onClick={() => selectSvgLogoCandidate(candidate.id)}
                            type="button"
                          >
                            {isActive ? "Selected" : "Select"}
                          </button>
                          <button
                            disabled={isActive}
                            onClick={() => deleteSvgLogoCandidate(candidate.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <article className="headerPreviewCard metronomeVisualLabControlCard">
                  <div className="headerPreviewMeta">
                    <span>Metronome Visual Lab</span>
                    <small>실제 메트로놈 화면에는 적용하지 않고, 같은 BPM과 오디오로 시각화만 비교합니다.</small>
                    <em className="designLabStatus designLabStatus--draft">Experimental</em>
                  </div>
                  <div className="metronomeVisualLabTabs" aria-label="Metronome visual modes">
                    {METRONOME_VISUAL_LAB_MODES.map((mode) => (
                      <button
                        className={metronomeVisualLabMode === mode.id ? "selected" : ""}
                        key={mode.id}
                        onClick={() => setMetronomeVisualLabMode(mode.id)}
                        type="button"
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                  <div className="metronomeVisualLabToolbar">
                    <button
                      className={metronomeVisualLabPlaying ? "selected" : ""}
                      onClick={toggleMetronomeVisualLab}
                      type="button"
                    >
                      {metronomeVisualLabPlaying ? "정지" : "프리뷰 재생"}
                    </button>
                    <span>{bpm} BPM</span>
                    <span>{metronomeVisualLabTimeSignature}</span>
                    <span>{getMetronomeToneOption(metronomeTone).label}</span>
                  </div>
                  <div className="metronomeVisualLabSignaturePicker" aria-label="Circle Mode time signature candidates">
                    {METRONOME_VISUAL_LAB_TIME_SIGNATURE_OPTIONS.map((option) => (
                      <button
                        className={metronomeVisualLabTimeSignature === option.id ? "selected" : ""}
                        key={option.id}
                        onClick={() => setMetronomeVisualLabTimeSignature(option.id)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </article>

                <MetronomeVisualLabPreview
                  activeBeat={metronomeVisualLabBeat}
                  beatPattern={metronomeVisualLabBeatPattern}
                  bpm={bpm}
                  isPlaying={metronomeVisualLabPlaying}
                  mode={metronomeVisualLabMode}
                  timeSignature={metronomeVisualLabTimeSignature}
                />
              </div>
            ) : null}
            {designLabSection === "archive" ? (
              <div className="designLabArchive">
                <div className="guitarLabToolbar">
                  <div>
                    <strong>삭제 후보 보관함 🗑️</strong>
                    <span>삭제한 항목은 여기에서 복원하거나 영구 삭제할 수 있어요.</span>
                    <span>디자인 {visibleGuitarLabVariants.length}개 · 아카이브 {archivedGuitarLabVariants.length}개</span>
                  </div>
                  <div className="guitarLabToolbarActions">
                    <button className="danger" disabled={!archivedGuitarLabVariants.length} onClick={emptyGuitarLabArchive} type="button">
                      휴지통 비우기
                    </button>
                  </div>
                </div>

                {archivedGuitarLabVariants.length ? (
                  <div className="headerPreviewGrid designLabArchiveGrid guitarLabArchiveGrid">
                    {archivedGuitarLabVariants.map((variant) => {
                      const variantLabel = `V${String(variant.index).padStart(2, "0")}`;
                      return (
                        <article className="headerPreviewCard designLabArchiveCard guitarLabCard" key={variant.id}>
                          <b className="guitarLabArchiveBadge">{variantLabel}</b>
                          <GuitarLabPreview variant={variant} />
                          <div className="designLabItemActions">
                            <button onClick={() => restoreGuitarLabVariant(variant.id)} type="button">
                              복원
                            </button>
                            <button className="danger" onClick={() => permanentlyDeleteGuitarLabVariant(variant.id)} type="button">
                              영구 삭제
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : null}

                {(ARCHIVED_HEADER_VARIANTS.length || ARCHIVED_APP_ICON_VARIANTS.length) ? (
                  <div className="headerPreviewGrid designLabArchiveGrid">
                    {ARCHIVED_HEADER_VARIANTS.map((variant) => (
                      <article className="headerPreviewCard designLabArchiveCard" key={variant.id}>
                        <div className="headerPreviewMeta">
                          <span>{variant.title}</span>
                          <small>{variant.description}</small>
                          <em className="designLabStatus designLabStatus--legacy">Legacy</em>
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
                          <em className="designLabStatus designLabStatus--legacy">Legacy</em>
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
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </section>
      ) : appMode === APP_MODES.FRETBOARD_VIEWER ? (
        <section className="fretboardViewerPanel" aria-label="지판 보기">
          <div
            className={`viewerControlPanel compactControls viewerSwipeSurface ${viewerSwipeFeedback ? `viewerSwipeSurface--${viewerSwipeFeedback}` : ""}`}
            onPointerCancel={() => {
              fretboardSwipeStartRef.current = null;
            }}
            onPointerDown={handleFretboardSwipeStart}
            onPointerUp={handleFretboardSwipeEnd}
          >
            <div className="viewerModeTabs" aria-label="지판 보기 종류">
              <button
                className={viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? "selected" : ""}
                onClick={() => setViewerMode(FRETBOARD_VIEWER_MODES.CHORD)}
                type="button"
              >
                코드
              </button>
              <button
                className={viewerMode === FRETBOARD_VIEWER_MODES.SCALE ? "selected" : ""}
                onClick={() => setViewerMode(FRETBOARD_VIEWER_MODES.SCALE)}
                type="button"
              >
                <span className="viewerModeTabStack">
                  <span>스케일</span>
                  <span>펜타토닉</span>
                </span>
              </button>
              <button
                className={viewerMode === FRETBOARD_VIEWER_MODES.NOTE ? "selected" : ""}
                onClick={() => setViewerMode(FRETBOARD_VIEWER_MODES.NOTE)}
                type="button"
              >
                음표
              </button>
            </div>

            <section className={`viewerMapCard viewerMapCard--${viewerMode}`} aria-label="전체 지판 음표" ref={viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? chordViewerRef : null}>
              <div className="viewerMapHeader">
                <div className="viewerMapHeaderTop">
                  <span>{viewerMode === FRETBOARD_VIEWER_MODES.NOTE ? "음표 위치" : viewerMode === FRETBOARD_VIEWER_MODES.SCALE ? "스케일 위치" : viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? "참고지판" : "기준 지판"}</span>
                  {viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? (
                    <button
                      className="viewerAllButton"
                      onClick={scrollToChordChart}
                      type="button"
                    >
                      전체보기
                    </button>
                  ) : null}
                </div>
                <div className="viewerMapTitleRow">
                  <strong>{viewerMapTitle}</strong>
                  {viewerMode === FRETBOARD_VIEWER_MODES.NOTE ? (
                    <small className="viewerSwipeHint">↔ Swipe</small>
                  ) : null}
                </div>
              </div>
              <Fretboard
                className={`viewerSharedFretboard ${viewerMode === FRETBOARD_VIEWER_MODES.NOTE && viewerNoteFilter === "ALL" ? "allNotes" : ""} ${viewerShouldFitFretboard ? "fitRange" : ""}`}
                barres={viewerChordBarres}
                fretRange={viewerFretboardRange}
                mode={viewerMode}
                notes={viewerFretboardNotes.map((note) => ({
                  ...note,
                  label:
                    viewerMode === FRETBOARD_VIEWER_MODES.NOTE
                      ? viewerNoteFilter === "ALL"
                        ? note.noteName ?? getPitchClass(note.pitch) ?? note.label
                        : note.pitch ?? note.octaveNote ?? note.label ?? note.noteName
                      : viewerMode === FRETBOARD_VIEWER_MODES.CHORD && showChordFingeringGuide && note.finger
                        ? note.finger
                        : note.label,
                  isRoot:
                    viewerMode === FRETBOARD_VIEWER_MODES.CHORD
                      ? Boolean(note.isRoot)
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

            <div className={`viewerModeControlSlot viewerModeControlSlot--${viewerMode}`}>
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
                  <MetronomeSelectControl
                    label="키"
                    onChange={setViewerScaleRoot}
                    options={SCALE_ROOT_OPTIONS.map((root) => ({ id: root.id, label: `${root.label} / ${root.solfege}` }))}
                    value={viewerScaleRoot}
                  />
                  <MetronomeSelectControl
                    label="종류"
                    onChange={setViewerScaleFamily}
                    options={Object.values(SCALE_FAMILIES).map((family) => ({ id: family.id, label: family.label }))}
                    value={viewerScaleFamily}
                  />
                  <MetronomeSelectControl
                    label="타입"
                    onChange={setViewerScaleType}
                    options={Object.values(viewerScaleTypeOptions).map((type) => ({ id: type.id, label: type.label }))}
                    value={viewerScaleType}
                  />
                  <MetronomeSelectControl
                    label="Box"
                    onChange={(nextBox) => setViewerScaleBox(Number(nextBox))}
                    options={SCALE_BOX_OPTIONS.map((boxNumber) => ({ id: boxNumber, label: `Box ${boxNumber}` }))}
                    value={viewerScaleBox}
                  />
                </div>
              ) : viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? (
                <div className="chordBuilderPanel chordBuilderPanel--composer" aria-label="코드 빌더">
                  <div className="chordBuilderPanelTitle">코드 빌더</div>

                  <ChordBuilderOptionSection layout="cols-5" title="프렛 구간">
                    {CHORD_VIEWER_POSITIONS.map((position) => (
                      <ChordBuilderChip
                        disabled={!viewerChordPositionData[position.id]}
                        key={position.id}
                        onClick={() => setViewerChordPosition(position.id)}
                        selected={viewerChordPosition === position.id}
                      >
                        {position.label}
                      </ChordBuilderChip>
                    ))}
                  </ChordBuilderOptionSection>

                  <ChordBuilderOptionSection layout="cols-7" title="루트음">
                    {chordRootOptions.map((root) => (
                      <ChordBuilderChip
                        key={root}
                        onClick={() => applyViewerChordSelection(root, "natural", "major", "none")}
                        selected={viewerChordBaseRoot === root}
                      >
                        {root}
                      </ChordBuilderChip>
                    ))}
                  </ChordBuilderOptionSection>

                  <ChordBuilderOptionSection layout="cols-3" title="변화표">
                    {CHORD_ACCIDENTAL_OPTIONS.map((accidental) => {
                      const hasDiagram = Boolean(
                        getChordFromSelector(viewerChordBaseRoot, accidental.id, viewerChordQuality, viewerChordExtension),
                      );
                      return (
                        <ChordBuilderChip
                          disabled={!hasDiagram}
                          key={accidental.id}
                          onClick={() => applyViewerChordSelection(viewerChordBaseRoot, accidental.id, viewerChordQuality, viewerChordExtension)}
                          selected={viewerChordAccidental === accidental.id}
                        >
                          {accidental.id === "flat" ? "♭" : accidental.label}
                        </ChordBuilderChip>
                      );
                    })}
                  </ChordBuilderOptionSection>

                  <ChordBuilderOptionSection layout="cols-4" title="코드 타입">
                    {CHORD_QUALITY_OPTIONS.map((quality) => (
                      <ChordBuilderChip
                        key={quality.id}
                        onClick={() => {
                          applyViewerChordSelection(viewerChordBaseRoot, viewerChordAccidental, quality.id, viewerChordExtension);
                        }}
                        selected={viewerChordQuality === quality.id}
                      >
                        {quality.label}
                      </ChordBuilderChip>
                    ))}
                  </ChordBuilderOptionSection>

                  <ChordBuilderOptionSection layout="tensions-2row" title="확장/텐션">
                    {availableChordExtensionOptions.map((extension) => {
                      const isDisabled = extension.disabled || !extension.hasDiagram;
                      return (
                        <ChordBuilderChip
                          disabled={isDisabled}
                          key={extension.id}
                          onClick={() => {
                            applyViewerChordSelection(viewerChordBaseRoot, viewerChordAccidental, viewerChordQuality, extension.id);
                          }}
                          selected={viewerChordExtension === extension.id}
                        >
                          {extension.label}
                        </ChordBuilderChip>
                      );
                    })}
                  </ChordBuilderOptionSection>
                </div>
              ) : null}
            </div>

          </div>

          {viewerMode === FRETBOARD_VIEWER_MODES.CHORD ? (
            <section className="chordCatalogPanel" aria-label="전체 코드표" ref={chordChartRef}>
              <div className="referenceHeader">
                <div className="chordCatalogCopy">
                  <strong className="chordCatalogTitle">전체 코드 운지</strong>
                </div>
                <div className="chordCatalogHints">
                  <p className="chordCatalogHint">해당 코드를 누르면 크게 볼 수 있어요</p>
                  <p className="chordCatalogHint">↔ 좌우 스와이프로 다른 코드 보기</p>
                </div>
              </div>
              <div className="chordCatalogScroll">
                {chordCatalogGroups.map((group) => (
                  <ChordCatalogRow
                    getChordStringState={getChordStringState}
                    group={group}
                    key={group.root}
                    onSelectChord={handleChordCatalogSelect}
                    showChordFingeringGuide={showChordFingeringGuide}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </section>
      ) : appMode === APP_MODES.METRONOME ? (
        <section className="standaloneMetronomePanel" aria-label="독립 메트로놈">
          <div className="metronomeAdvancedDock" aria-label="고급 메트로놈 상태 및 설정">
            <button
              className={`metronomeAdvancedSummary ${metronomeAdvancedPanel === "automator" ? "selected" : ""}`}
              onClick={() => toggleMetronomeAdvancedPanel("automator")}
              type="button"
            >
              <span>AUTOMATOR</span>
              <strong>{automatorSummaryLabel}</strong>
              <small>{automatorDetailLabel}</small>
            </button>
            <button
              className={`metronomeAdvancedSummary ${metronomeAdvancedPanel === "tracker" ? "selected" : ""}`}
              onClick={() => toggleMetronomeAdvancedPanel("tracker")}
              type="button"
            >
              <span>TRACKER</span>
              <strong>{trackerSummaryLabel}</strong>
              <small>{trackerDetailLabel}</small>
            </button>
            <button
              aria-label="메트로놈 세션 리셋"
              className="metronomeTrackerResetButton"
              onClick={resetMetronomePractice}
              type="button"
            >
              ↻
            </button>

            {metronomeAdvancedPanel ? (
              <>
              <button
                aria-label="메트로놈 설정창 닫기"
                className="metronomeAdvancedDimOverlay"
                onClick={closeMetronomeAdvancedPanel}
                type="button"
              />
              <section
                className={`metronomeAdvancedPopover metronomeAdvancedPopover--${metronomeAdvancedPanel}`}
                aria-label={`${metronomeAdvancedPanel === "automator" ? "Automator" : "Tracker"} 설정`}
              >
                <div className="metronomeAdvancedPopoverTopbar">
                  <span>{metronomeAdvancedPanel === "automator" ? "AUTOMATOR" : "TRACKER"}</span>
                  <button onClick={closeMetronomeAdvancedPanel} type="button">Done</button>
                </div>
                {metronomeAdvancedPanel === "automator" ? (
                  <>
                    <div className="metronomeTrackerSettingGroup">
                      <span>Automate tempo changes</span>
                      <div className="metronomeTrackerChoiceGrid metronomeTrackerChoiceGrid--mode">
                        {AUTOMATOR_MODE_OPTIONS.map((option) => (
                          <button
                            aria-pressed={autoBpmMode === option.id}
                            className={autoBpmMode === option.id ? "selected" : ""}
                            key={option.id}
                            onClick={() => setAutoBpmMode(option.id)}
                            type="button"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {autoBpmMode === "off" ? (
                      <div className="metronomeAutomatorNotice">
                        AUTOMATOR OFF
                      </div>
                    ) : null}

                    {autoBpmMode !== "off" ? (
                      <div className="metronomeTrackerSettingGroup">
                        <span>{autoBpmDirection === "decrease" ? "Decrease BPM by" : "Increase BPM by"}</span>
                        <div className="metronomeAutomatorDirectionRow">
                          <button
                            className={autoBpmDirection === "decrease" ? "selected" : ""}
                            onClick={() => setAutoBpmDirection("decrease")}
                            type="button"
                          >
                            Decrease
                          </button>
                          <button
                            className={autoBpmDirection === "increase" ? "selected" : ""}
                            onClick={() => setAutoBpmDirection("increase")}
                            type="button"
                          >
                            Increase
                          </button>
                        </div>
                    <div className="metronomeStepperRow">
                          <span>BPM</span>
                      <button disabled={autoBpmStep <= 1} onClick={() => setAutoBpmStep((value) => Math.max(1, value - 1))} type="button">-</button>
                      <strong>{autoBpmStep}</strong>
                      <button disabled={autoBpmStep >= 5} onClick={() => setAutoBpmStep((value) => Math.min(5, value + 1))} type="button">+</button>
                    </div>
                      </div>
                    ) : null}

                    {autoBpmMode === "bars" ? (
                    <div className="metronomeStepperRow">
                      <span>Every</span>
                      <button disabled={autoBpmBars <= 5} onClick={() => setAutoBpmBars((value) => Math.max(5, value - 5))} type="button">-</button>
                      <strong>{autoBpmBars} bars</strong>
                        <button disabled={autoBpmBars >= 200} onClick={() => setAutoBpmBars((value) => Math.min(200, value + 5))} type="button">+</button>
                    </div>
                    ) : null}

                    {autoBpmMode === "time" ? (
                      <div className="metronomeTrackerSettingGroup">
                        <span>Every</span>
                        <MetronomeWheelPicker
                          ariaLabel="AUTOMATOR 시간 간격 선택"
                          minuteOptions={AUTOMATOR_TIME_MINUTE_OPTIONS}
                          minutes={autoBpmTimeMinutes}
                          onMinutesChange={handleAutoBpmDraftMinutesChange}
                          onSecondsChange={handleAutoBpmDraftSecondsChange}
                          secondOptions={AUTOMATOR_TIME_SECOND_OPTIONS}
                          seconds={autoBpmTimeSeconds}
                        />
                      </div>
                    ) : null}

                    <div className="metronomeAdvancedPopoverHeader">
                      <span>Coach Mode</span>
                      <button
                        className={`metronomeHardwareToggle ${coachModeEnabled ? "selected" : ""}`}
                        onClick={() => {
                          triggerMetronomeHardwareToggle();
                          setCoachModeEnabled((value) => !value);
                        }}
                        type="button"
                      >
                        <span className="metronomeHardwareToggleText">{coachModeEnabled ? "ON" : "OFF"}</span>
                        <span className="metronomeHardwareToggleKnob" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="metronomeStepperRow">
                      <span>Sound</span>
                      <button disabled={coachPlayBars <= 1} onClick={() => setCoachPlayBars((value) => Math.max(1, value / 2))} type="button">-</button>
                      <strong>{coachPlayBars} bars</strong>
                      <button disabled={coachPlayBars >= 8} onClick={() => setCoachPlayBars((value) => Math.min(8, value * 2))} type="button">+</button>
                    </div>
                    <div className="metronomeStepperRow">
                      <span>Mute</span>
                      <button disabled={coachMuteBars <= 1} onClick={() => setCoachMuteBars((value) => Math.max(1, value / 2))} type="button">-</button>
                      <strong>{coachMuteBars} bars</strong>
                      <button disabled={coachMuteBars >= 8} onClick={() => setCoachMuteBars((value) => Math.min(8, value * 2))} type="button">+</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="metronomeTrackerSettingGroup">
                      <span>Count In</span>
                      <div className="metronomeTrackerChoiceGrid">
                        {TRACKER_COUNT_IN_OPTIONS.map((option) => (
                          <button
                            aria-pressed={metronomeCountInBars === option.bars}
                            className={metronomeCountInBars === option.bars ? "selected" : ""}
                            key={option.id}
                            onClick={() => setMetronomeCountInBars(option.bars)}
                            type="button"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="metronomeTrackerSettingGroup">
                      <span>Tracker Mode</span>
                      <div className="metronomeTrackerChoiceGrid metronomeTrackerChoiceGrid--mode">
                        {TRACKER_MODE_OPTIONS.map((option) => (
                          <button
                            aria-pressed={metronomeTrackerMode === option.id}
                            className={metronomeTrackerMode === option.id ? "selected" : ""}
                            key={option.id}
                            onClick={() => setMetronomeTrackerMode(option.id)}
                            type="button"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {metronomeTrackerMode === "bars" ? (
                      <div className="metronomeTrackerSettingGroup">
                        <label className="metronomeTrackerSwitchRow">
                          <span>Limit number of bars</span>
                          <button
                            className={`metronomeHardwareToggle ${metronomeBarLimitEnabled ? "selected" : ""}`}
                            onClick={() => {
                              triggerMetronomeHardwareToggle();
                              setMetronomeBarLimitEnabled((value) => !value);
                            }}
                            type="button"
                          >
                            <span className="metronomeHardwareToggleText">{metronomeBarLimitEnabled ? "ON" : "OFF"}</span>
                            <span className="metronomeHardwareToggleKnob" aria-hidden="true" />
                          </button>
                        </label>
                        <label className="metronomeTrackerCustomInput">
                          <span>Limit to</span>
                          <input
                            disabled={!metronomeBarLimitEnabled}
                            inputMode="numeric"
                            maxLength={4}
                            onBlur={commitMetronomeBarLimit}
                            onChange={handleMetronomeBarLimitChange}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.currentTarget.blur();
                              }
                            }}
                            pattern="[0-9]*"
                            type="text"
                            value={metronomeBarLimitDraft}
                          />
                          <small>Bars</small>
                        </label>
                        <label className="metronomeTrackerSwitchRow">
                          <span>Stop when reached</span>
                          <button
                            className={`metronomeHardwareToggle ${metronomeBarStopWhenReached ? "selected" : ""}`}
                            onClick={() => {
                              triggerMetronomeHardwareToggle();
                              setMetronomeBarStopWhenReached((value) => !value);
                            }}
                            type="button"
                          >
                            <span className="metronomeHardwareToggleText">{metronomeBarStopWhenReached ? "ON" : "OFF"}</span>
                            <span className="metronomeHardwareToggleKnob" aria-hidden="true" />
                          </button>
                        </label>
                        <label className="metronomeTrackerSwitchRow">
                          <span>Reset when reached</span>
                          <button
                            className={`metronomeHardwareToggle ${metronomeBarResetWhenReached ? "selected" : ""}`}
                            onClick={() => {
                              triggerMetronomeHardwareToggle();
                              setMetronomeBarResetWhenReached((value) => !value);
                            }}
                            type="button"
                          >
                            <span className="metronomeHardwareToggleText">{metronomeBarResetWhenReached ? "ON" : "OFF"}</span>
                            <span className="metronomeHardwareToggleKnob" aria-hidden="true" />
                          </button>
                        </label>
                        <label className="metronomeTrackerSwitchRow">
                          <span>Start from 1</span>
                          <button
                            className={`metronomeHardwareToggle ${metronomeBarStartFromOne ? "selected" : ""}`}
                            onClick={() => {
                              triggerMetronomeHardwareToggle();
                              setMetronomeBarStartFromOne((value) => !value);
                            }}
                            type="button"
                          >
                            <span className="metronomeHardwareToggleText">{metronomeBarStartFromOne ? "ON" : "OFF"}</span>
                            <span className="metronomeHardwareToggleKnob" aria-hidden="true" />
                          </button>
                        </label>
                      </div>
                    ) : null}

                    {metronomeTrackerMode === "timer" ? (
                      <div className="metronomeTrackerSettingGroup">
                        <label className="metronomeTrackerSwitchRow">
                          <span>Countdown</span>
                          <button
                            className={`metronomeHardwareToggle ${metronomeTimerCountdown ? "selected" : ""}`}
                            onClick={() => {
                              triggerMetronomeHardwareToggle();
                              setMetronomeTimerCountdown((value) => !value);
                            }}
                            type="button"
                          >
                            <span className="metronomeHardwareToggleText">{metronomeTimerCountdown ? "ON" : "OFF"}</span>
                            <span className="metronomeHardwareToggleKnob" aria-hidden="true" />
                          </button>
                        </label>
                        <MetronomeWheelPicker
                          ariaLabel="TRACKER 타이머 선택"
                          minuteOptions={TRACKER_TIMER_MINUTE_OPTIONS}
                          minutes={metronomeTrackerTimerMinutes}
                          onMinutesChange={handleTrackerTimerDraftMinutesChange}
                          onSecondsChange={handleTrackerTimerDraftSecondsChange}
                          secondOptions={TRACKER_TIMER_SECOND_OPTIONS}
                          seconds={metronomeTrackerTimerSeconds}
                        />
                        <label className="metronomeTrackerSwitchRow">
                          <span>Stop when reached</span>
                          <button
                            className={`metronomeHardwareToggle ${metronomeTimerStopWhenReached ? "selected" : ""}`}
                            onClick={() => {
                              triggerMetronomeHardwareToggle();
                              setMetronomeTimerStopWhenReached((value) => !value);
                            }}
                            type="button"
                          >
                            <span className="metronomeHardwareToggleText">{metronomeTimerStopWhenReached ? "ON" : "OFF"}</span>
                            <span className="metronomeHardwareToggleKnob" aria-hidden="true" />
                          </button>
                        </label>
                        <label className="metronomeTrackerSwitchRow">
                          <span>Reset when reached</span>
                          <button
                            className={`metronomeHardwareToggle ${metronomeTimerResetWhenReached ? "selected" : ""}`}
                            onClick={() => {
                              triggerMetronomeHardwareToggle();
                              setMetronomeTimerResetWhenReached((value) => !value);
                            }}
                            type="button"
                          >
                            <span className="metronomeHardwareToggleText">{metronomeTimerResetWhenReached ? "ON" : "OFF"}</span>
                            <span className="metronomeHardwareToggleKnob" aria-hidden="true" />
                          </button>
                        </label>
                      </div>
                    ) : null}
                  </>
                )}
              </section>
              </>
            ) : null}
          </div>

          <StandaloneMetronomeVisual
            activeBeat={beat}
            beatPattern={standaloneBeatPattern}
            isPlaying={gameState === GAME_STATES.PLAYING}
            mode={metronomeDisplayMode}
            onBeatClick={cycleStandaloneBeatState}
            onPointerCancel={handleMetronomeModeSwipeCancel}
            onPointerDown={handleMetronomeModeSwipeStart}
            onPointerMove={handleMetronomeModeSwipeMove}
            onPointerUp={handleMetronomeModeSwipeEnd}
            swipeActive={metronomeModeSwipeActive}
            swipeOffset={metronomeModeSwipeOffset}
          />

          <div
            aria-label="BPM 조절 영역. 좌우 스와이프는 BPM만 변경합니다"
            className="metronomeHeroCard metronomeHeroCard--interactive"
            data-bpm-swipe-zone="true"
            onPointerCancel={handleBpmSwipeCancel}
            onPointerDown={handleBpmSwipeStart}
            onPointerMove={handleBpmSwipeMove}
            onPointerUp={handleBpmSwipeEnd}
            role="group"
          >
            <button
              aria-label="BPM 1 낮추기"
              className="metronomeHeroBpmButton"
              onClick={(event) => {
                event.stopPropagation();
                changeBpm(bpm - 1);
              }}
              type="button"
            >
              -
            </button>
            <div className="metronomeHeroBpmValue">
              <span>BPM</span>
              <strong data-bpm-preview-value="true">{bpm}</strong>
            </div>
            <button
              aria-label="BPM 1 올리기"
              className="metronomeHeroBpmButton"
              onClick={(event) => {
                event.stopPropagation();
                changeBpm(bpm + 1);
              }}
              type="button"
            >
              +
            </button>
            <button
              aria-label={gameState === GAME_STATES.PLAYING ? "메트로놈 정지" : "메트로놈 시작"}
              className={`metronomeHeroPlayButton ${gameState === GAME_STATES.PLAYING ? "reset" : "primary"}`}
              onClick={(event) => {
                event.stopPropagation();
                if (gameState === GAME_STATES.PLAYING) {
                  stopMetronomePlayback();
                  return;
                }
                startMetronomePractice();
              }}
              type="button"
            >
              {gameState === GAME_STATES.PLAYING ? (
                <Square size={15} aria-hidden="true" />
              ) : (
                <Play size={18} aria-hidden="true" />
              )}
            </button>
            <button
              aria-label="탭 템포로 BPM 설정"
              className="metronomeHeroTapTempoButton"
              onClick={(event) => {
                event.stopPropagation();
                handleTapTempo();
              }}
              type="button"
            >
              TAP
            </button>
          </div>

          <MetronomeControl
            accentEnabled={metronomeAccent}
            accentTone={metronomeAccentTone}
            bpm={bpm}
            className="standaloneMetronomeControl"
            countInEnabled={metronomeCountIn}
            inputId="standalone-bpm"
            onAccentChange={setMetronomeAccent}
            onAccentToneChange={changeMetronomeAccentTone}
            onBpmChange={changeBpm}
            onCountInChange={setMetronomeCountIn}
            onSubdivisionChange={setMetronomeSubdivision}
            onTimeSignatureChange={setMetronomeTimeSignature}
            onToneChange={setMetronomeTone}
            onRepeatChange={setMetronomeRepeat}
            onWeakToneChange={changeMetronomeWeakTone}
            repeatEnabled={metronomeRepeat}
            showCountIn={false}
            showAccent={false}
            showBpmControls={false}
            showRepeat={false}
            splitToneControls
            subdivision={metronomeSubdivision}
            timeSignature={metronomeTimeSignature}
            tone={metronomeTone}
            weakTone={metronomeWeakTone}
          />

          <div className="metronomePresetStrip" aria-label="메트로놈 설정 저장 및 불러오기">
            <input
              aria-label="저장할 메트로놈 설정 이름"
              maxLength={24}
              onChange={(event) => setMetronomePresetName(event.target.value)}
              placeholder="워밍업"
              type="text"
              value={metronomePresetName}
            />
            <button onClick={saveMetronomePreset} type="button">
              저장
            </button>
            <select
              aria-label="저장된 메트로놈 설정 불러오기"
              onChange={(event) => applyMetronomePreset(event.target.value)}
              onFocus={() => setMetronomePresets(getStoredMetronomePresets())}
              onMouseDown={() => setMetronomePresets(getStoredMetronomePresets())}
              value={metronomePresetSelectedId}
            >
              <option value="">불러오기</option>
              {metronomePresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

        </section>
      ) : appMode === APP_MODES.SHOOTER ? (
        <section className="shooterPanel" aria-label="슈팅게임">
          <div className="modeHelper shooterHelper">
            반복 연습으로 지판 인식과 피킹 정확도를 키워보세요.
          </div>

          <div className="shooterDifficultyPanel" aria-label="슈팅게임 난이도">
            <div>
              <span>난이도</span>
              <strong>현재 {shooterDifficultyLabel}</strong>
              <small>{shooterDifficultyPhase.label} · 최대 {shooterLevel.maxTargets}마리</small>
            </div>
            <div className="shooterDifficultyButtons">
              {SHOOTER_DIFFICULTY_OPTIONS.map((option) => (
                <button
                  aria-disabled={isShooterDifficultyLocked}
                  aria-pressed={shooterDifficulty === option.id}
                  className={`${shooterDifficulty === option.id ? "selected" : ""} ${isShooterDifficultyLocked ? "locked" : ""}`}
                  disabled={isShooterDifficultyLocked}
                  key={option.id}
                  onClick={(event) => {
                    if (isShooterDifficultyLocked) {
                      event.preventDefault();
                      return;
                    }
                    setShooterDifficulty(option.id);
                  }}
                  title={option.hint}
                  type="button"
                >
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {showShooterRecords && (
            <section className="shooterRecordsPanel" aria-label="슈팅게임 기록">
              <div className="shooterRecordGrid">
                <article>
                  <span>BEST SCORE</span>
                  <strong>{shooterRecords.best.score.toLocaleString()}</strong>
                </article>
                <article>
                  <span>BEST COMBO</span>
                  <strong>{shooterRecords.best.combo}</strong>
                </article>
                <article>
                  <span>BEST KILLS</span>
                  <strong>{shooterRecords.best.kills.toLocaleString()}</strong>
                </article>
                <article>
                  <span>BEST TIME</span>
                  <strong>{formatShooterRecordTime(shooterRecords.best.survivalMs)}</strong>
                </article>
                <article>
                  <span>BEST ACCURACY</span>
                  <strong>{shooterRecords.best.accuracy}%</strong>
                </article>
                <article>
                  <span>TOTAL ACCURACY</span>
                  <strong>{shooterTotalAccuracy}%</strong>
                </article>
              </div>
              <div className="shooterRecordSplit">
                <article>
                  <h3>누적 연습기록</h3>
                  <p><span>총 플레이</span><strong>{shooterRecords.totals.plays.toLocaleString()}회</strong></p>
                  <p><span>총 연습시간</span><strong>{formatShooterRecordTime(shooterRecords.totals.playTimeMs)}</strong></p>
                  <p><span>총 처치</span><strong>{shooterRecords.totals.kills.toLocaleString()}</strong></p>
                  <p><span>총 발사</span><strong>{shooterRecords.totals.shots.toLocaleString()}</strong></p>
                  <p><span>총 적중</span><strong>{shooterRecords.totals.hits.toLocaleString()}</strong></p>
                </article>
                <article>
                  <h3>난이도별 기록</h3>
                  {SHOOTER_DIFFICULTY_OPTIONS.map((option) => {
                    const record = shooterRecords.difficulty[option.id] ?? getDefaultShooterDifficultyRecord();
                    return (
                      <p key={option.id}>
                        <span>{option.label}</span>
                        <strong>{Number(record.bestScore || 0).toLocaleString()} · C{record.bestCombo || 0}</strong>
                      </p>
                    );
                  })}
                </article>
              </div>
              <article className="shooterRecentRecords">
                <h3>최근 10회</h3>
                {shooterRecords.recent.length ? (
                  shooterRecords.recent.map((record) => (
                    <p key={record.id}>
                      <span>
                        {formatShooterRecordDate(record.playedAt)} · {SHOOTER_DIFFICULTY_OPTIONS.find((option) => option.id === record.difficulty)?.label ?? "쉬움"}
                      </span>
                      <strong>{Number(record.score || 0).toLocaleString()} · {record.accuracy}% · {formatShooterRecordTime(record.survivalMs)}</strong>
                    </p>
                  ))
                ) : (
                  <p><span>아직 기록 없음</span><strong>첫 플레이를 시작하세요</strong></p>
                )}
              </article>
            </section>
          )}

          <div className="shooterFretGuide">
            <div>
              <span>목표</span>
              <strong className="guidePitch">
                {shooterGuidePitch
                  ? `${shooterGuidePitch} · ${getSolfege(shooterGuidePitch) || getPitchClass(shooterGuidePitch)}`
                  : "대기"}
              </strong>
              <span className="guidePositionLine">
                {shooterGuidePitch
                  ? shooterGuidePositions.length
                    ? shooterGuidePositions
                        .slice(0, 3)
                        .map((position) => `${position.stringNumber}번줄 ${getFretLabel(position)}`)
                        .join(" · ")
                    : "지판 위치 없음"
                  : "목표 음을 기다리는 중"}
              </span>
            </div>
            {!isMobileLayout && <div className={`detector mobileShooterDetector ${isSignalActive ? "active" : ""}`}>
              <Radio size={15} />
              <div>
                <span>감지음</span>
                <strong>{detected ? detected.pitch : "--"}</strong>
              </div>
            </div>}
            <button
              className={`shooterMicButton ${streamRef.current ? "selected" : ""}`}
              onClick={startShooterMic}
              type="button"
            >
              <Mic size={15} />
              마이크
            </button>
          </div>

          <div
            className={`shooterArena ${stageFlash} ${gameState === GAME_STATES.PAUSED ? "paused" : ""}`}
            onClick={handleShooterArenaClick}
            ref={shooterArenaRef}
          >
            <div className="shooterBestHud" aria-label="슈팅게임 최고 기록">
              <span>BEST SCORE {shooterRecords.best.score.toLocaleString()}</span>
              <span>BEST COMBO {shooterRecords.best.combo}</span>
            </div>

            <div className="shooterGameHud" aria-label="슈팅게임 현재 상태">
              <div>
                <span>LEVEL</span>
                <strong>{shooterLevel.name}</strong>
                <small>{shooterLevel.phaseLabel}</small>
              </div>
              <div>
                <span>SCORE</span>
                <strong>{score}</strong>
              </div>
              <div>
                <span>COMBO</span>
                <strong>{combo}</strong>
              </div>
            </div>

            {shooterTargets.map((target) => {
              const targetDetail = target.detail ?? getShooterNoteDetail(target.note);
              const targetDifficulty = target.difficulty ?? shooterDifficulty;
              const showKoreanNoteName = targetDifficulty === SHOOTER_DIFFICULTIES.EASY;
              return (
              <div
                className={`enemy shooterEnemy shooterEnemy--monster ${getShooterEnemyDifficultyClass(targetDifficulty)} ${!target.defeated ? "fallingTarget" : ""} ${target.defeated ? "defeated" : ""}`}
                key={target.id}
                ref={(node) => {
                  if (node) {
                    shooterTargetNodesRef.current.set(target.id, node);
                    window.requestAnimationFrame(() => applyShooterTargetTransform(target, target.y));
                  } else {
                    shooterTargetNodesRef.current.delete(target.id);
                  }
                }}
                style={{
                  left: 0,
                  top: 0,
                  "--target-x": `${target.x}%`,
                  "--target-y": `${target.y}%`,
                  "--hit-note-size": `${NOTE_SIZE}px`,
                  "--target-duration-ms": `${target.duration}ms`,
                  ...getNoteColorStyle(target.note),
                }}
              >
                <img
                  alt=""
                  aria-hidden="true"
                  className="shooterEnemyMonsterAsset"
                  draggable="false"
                  src={getShooterEnemyAssetSrc(targetDifficulty)}
                />
                <i className="enemyEar enemyEar--left" aria-hidden="true" />
                <i className="enemyEar enemyEar--right" aria-hidden="true" />
                <i className="enemyFace" aria-hidden="true" />
                {showKoreanNoteName ? <em>{targetDetail?.solfege ?? getSolfege(target.note)}</em> : null}
                <span>{targetDetail?.octaveNote ?? target.note}</span>
                <small>{getFretLabel(targetDetail)}</small>
                <div className="targetBreakLayer" aria-hidden="true">
                  {SHOOTER_TARGET_BREAK_PIECES.map((piece, pieceIndex) => (
                    <i
                      className="targetBreakShard"
                      key={pieceIndex}
                      style={{
                        clipPath: piece.clip,
                        "--break-dx": piece.dx,
                        "--break-dy": piece.dy,
                        "--break-rotate": piece.rotate,
                        "--break-origin": piece.origin,
                      }}
                    />
                  ))}
                </div>
              </div>
              );
            })}


            {shooterBreakEffects.map((effect) => (
              <div
                className="targetBreakEffect"
                key={`break-${effect.id}`}
                style={{
                  left: `${effect.x}%`,
                  top: `${effect.y}%`,
                  "--hit-note-size": `${NOTE_SIZE}px`,
                  "--target-break-duration-ms": `${SHOOTER_TARGET_BREAK_EFFECT_MS}ms`,
                  ...getNoteColorStyle(effect.note),
                }}
              >
                <div className="targetBreakLayer" aria-hidden="true">
                  {SHOOTER_TARGET_BREAK_PIECES.map((piece, pieceIndex) => (
                    <i
                      className="targetBreakShard"
                      key={pieceIndex}
                      style={{
                        clipPath: piece.clip,
                        "--break-dx": piece.dx,
                        "--break-dy": piece.dy,
                        "--break-rotate": piece.rotate,
                        "--break-origin": piece.origin,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}

            {false && shooterTargets
              .filter((target) => target.lockedAt != null && !target.defeated)
              .map((target) => {
                const startX = 50;
                const startY = 75;
                const dx = target.x - startX;
                const dy = target.y - startY;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                return (
                  <div
                    className="lockOnBeam"
                    key={`lock-${target.id}`}
                    style={{
                      left: `${startX}%`,
                      top: `${startY}%`,
                      width: `${length}%`,
                      transform: `translateY(-50%) rotate(${angle}deg)`,
                    }}
                  />
                );
              })}

            {projectiles.map((projectile) => {
              if (projectile.renderedByDom) return null;
              const projectileAssetSrc = projectile.projectileAssetSrc ?? selectedGuitarVariant.projectileAssetSrc;
              return (
                <div
                  className={`energyProjectile ${projectileAssetSrc ? "energyProjectile--imageProjectile" : ""}`}
                  key={projectile.id}
                  style={{
                    "--projectile-start-x": `${projectile.startX}%`,
                    "--projectile-start-y": `${projectile.startY}%`,
                    "--projectile-end-x": `${projectile.endX}%`,
                    "--projectile-end-y": `${projectile.endY}%`,
                    "--projectile-duration-ms": `${projectile.duration}ms`,
                    "--projectile-angle": `${projectile.angle ?? 0}deg`,
                    "--projectile-spin": `${projectile.spin ?? 10}deg`,
                  }}
                >
                  {projectileAssetSrc ? (
                    <img
                      alt=""
                      aria-hidden="true"
                      className="energyProjectileAsset"
                      draggable="false"
                      src={projectileAssetSrc}
                    />
                  ) : null}
                </div>
              );
            })}

            <div className={`guitarPlayer guitarPlayer--${selectedGuitarVariant.id} ${projectiles.length > 0 ? "shooting" : ""}`} ref={shooterGuitarPlayerRef} style={shooterMotion}>
              <div className="guitarPlayerAura" aria-hidden="true" />
              <GuitarAssetSvg variant={selectedGuitarVariant} className="guitarPlayerAsset" compact />
              <span className="guitarPlayerMuzzle" aria-hidden="true" />
            </div>
            <div className="mobileShooterLives" aria-label={`남은 목숨 ${shooterLives}`}>
              {Array.from({ length: SHOOTER_MAX_LIVES }, (_, index) => (
                <i className={index < shooterLives ? "active" : ""} key={index}>♥</i>
              ))}
            </div>
            {gameState !== GAME_STATES.PLAYING && (
              <div className={`shooterCenterStatus ${classNameFromLabel(feedback)} ${gameState === GAME_STATES.GAMEOVER ? "gameOver" : ""}`}>
                <strong>
                  {gameState === GAME_STATES.GAMEOVER
                    ? "게임 오버"
                    : gameState === GAME_STATES.PAUSED
                      ? "일시정지"
                      : t(feedback)}
                </strong>
                {gameState === GAME_STATES.GAMEOVER && <span></span>}
                {gameState !== GAME_STATES.PAUSED && (
                  <button
                    className="mobileShooterStartButton"
                    onClick={(event) => {
                      event.stopPropagation();
                      setShooterGuitarRarityFilter(getShooterGuitarRarityId(selectedGuitarVariant.id));
                      setShooterGuitarPickerOpen(true);
                    }}
                    type="button"
                  >
                    기타 변경
                  </button>
                )}
                {gameState !== GAME_STATES.PAUSED && (
                  <small className="shooterPlayerSelectedLabel">
                    {selectedGuitarVariant.title}
                  </small>
                )}
                <button
                  className="mobileShooterStartButton primary"
                  onClick={(event) => {
                    event.stopPropagation();
                    startShooter();
                  }}
                  type="button"
                >
                  <Play size={18} />
                  {gameState === GAME_STATES.PAUSED ? "계속" : "시작"}
                </button>
                {gameState === GAME_STATES.PAUSED && (
                  <button
                    className="mobileShooterStartButton"
                    onClick={(event) => {
                      event.stopPropagation();
                      stopPracticeSession();
                    }}
                    type="button"
                  >
                    RESET
                  </button>
                )}
                {gameState === GAME_STATES.GAMEOVER && (
                  <button
                    className="mobileShooterStartButton"
                    onClick={(event) => {
                      event.stopPropagation();
                      stopPracticeSession();
                    }}
                    type="button"
                  >
                    RESET
                  </button>
                )}
              </div>
            )}
          </div>

          {shooterGuitarPickerOpen && (
            <div
              className="shooterGuitarPickerOverlay"
              onClick={() => setShooterGuitarPickerOpen(false)}
              role="presentation"
            >
              <div
                aria-label="슈팅게임 기타 선택"
                aria-modal="true"
                className="shooterGuitarPickerModal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
              >
                <div className="shooterGuitarPickerHeader">
                  <div>
                    <span>기타 변경</span>
                    <strong>{selectedGuitarVariant.title}</strong>
                  </div>
                  <button onClick={() => setShooterGuitarPickerOpen(false)} type="button">
                    닫기
                  </button>
                </div>
                <div className="shooterGuitarRarityTabs" aria-label="기타 등급">
                  {SHOOTER_GUITAR_RARITY_OPTIONS.map((option) => (
                    <button
                      aria-pressed={shooterGuitarRarityFilter === option.id}
                      className={shooterGuitarRarityFilter === option.id ? "selected" : ""}
                      key={option.id}
                      onClick={() => setShooterGuitarRarityFilter(option.id)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="shooterGuitarPickerList">
                  {shooterPlayerOptions.length > 0 ? shooterPlayerOptions.map(({ slotKey, variant }) => {
                    const isSelected = selectedGuitarVariant.id === variant.id;
                    return (
                      <button
                        className={`shooterGuitarPickerItem ${isSelected ? "selected" : ""}`}
                        key={`${slotKey}-${variant.id}`}
                        onClick={() => {
                          applyGuitarVariant(variant.id);
                          setShooterGuitarPickerOpen(false);
                        }}
                        type="button"
                      >
                        <GuitarAssetSvg variant={variant} className="shooterGuitarPickerAsset" compact />
                        <span>
                          <strong>{variant.title}</strong>
                          <small>{variant.pack}</small>
                        </span>
                        <em>{isSelected ? "선택됨" : "선택"}</em>
                      </button>
                    );
                  }) : (
                    <div className="shooterGuitarPickerEmpty">
                      <strong>준비중</strong>
                      <span>새 기타가 추가되면 여기에 표시됩니다.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </section>
      ) : selectedCategory.id === "rhythm" && stage3StorageOpen ? (
        <section
          className="stage3StorageRoom chordTransitionPanel"
          aria-label="코드 진행 보관함"
          onPointerCancel={handleStage3StorageSwipeCancel}
          onPointerDown={handleStage3StorageSwipeStart}
          onPointerMove={handleStage3StorageSwipeMove}
          onPointerUp={handleStage3StorageSwipeEnd}
          style={{
            "--storage-swipe-x": `${stage3StorageSwipeOffset}px`,
            "--storage-swipe-transition": stage3StorageSwipeActive ? "none" : "transform 180ms cubic-bezier(0.2, 0.85, 0.24, 1)",
          }}
        >
          <div className="stage3InlineSettings stage3StorageComposer stage3PracticeUtilityPanel">
            <div className="stage3StorageTopBar">
              <select
                className="stage3StorageNativeSelect"
                aria-label="저장실 불러오기"
                onChange={(event) => {
                  const item = stage3QuickSlots.find((slot) => slot.id === event.target.value);
                  if (!item) return;
                  editStage3StorageItem(item);
                }}
                value={stage3QuickSlots.some((item) => item.id === stage3StorageSelectedId) ? stage3StorageSelectedId : ""}
              >
                <option disabled value="">사용자 진행 선택</option>
                {stage3QuickSlots.map((item) => (
                  <option key={`storage-load-${item.id}`} value={item.id}>{getStage3DropdownLabel(item)}</option>
                ))}
              </select>
              <button className="stage3StorageBackButton" onClick={closeStage3StorageRoom} type="button">
                돌아가기
              </button>
            </div>
            <div className="stage3StorageChordBuilder" aria-label="저장실 코드 및 주법 선택">
              <div className="stage3OptionRow stage3RootPickRow">
                <span>루트</span>
                <div className="stage3SegmentControl">
                  {chordRootOptions.map((root) => (
                    <button
                      className={stage3StorageChordBaseRoot === root ? "selected" : ""}
                      key={`storage-root-${root}`}
                      onClick={() => applyStage3StorageChordSelection(root, "natural", "major", "none")}
                      type="button"
                    >
                      {root}
                    </button>
                  ))}
                </div>
              </div>
              <div className="stage3OptionRow">
                <span>변화표</span>
                <div className="stage3SegmentControl">
                      {CHORD_ACCIDENTAL_OPTIONS.map((accidental) => {
                        const hasDiagram = Boolean(
                          getStoredChordFromSelector(stage3StorageChordBaseRoot, accidental.id, stage3StorageChordQuality, stage3StorageChordExtension),
                        );
                        return (
                      <button
                        className={stage3StorageChordAccidental === accidental.id ? "selected" : ""}
                        disabled={!hasDiagram}
                        key={`storage-accidental-${accidental.id}`}
                        onClick={() => applyStage3StorageChordSelection(stage3StorageChordBaseRoot, accidental.id, stage3StorageChordQuality, stage3StorageChordExtension)}
                        type="button"
                      >
                        {accidental.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="stage3CompactOptionRow">
                <div className="stage3OptionRow">
                  <span>성격</span>
                  <div className="stage3SegmentControl">
                    {STAGE3_STORAGE_CHORD_QUALITY_OPTIONS.map((quality) => (
                      <button
                        className={stage3StorageChordQuality === quality.id ? "selected" : ""}
                        key={`storage-quality-${quality.id}`}
                        onClick={() => applyStage3StorageChordSelection(stage3StorageChordBaseRoot, stage3StorageChordAccidental, quality.id, stage3StorageChordExtension)}
                        type="button"
                      >
                        {quality.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="stage3OptionRow">
                  <span>옵션</span>
                  <div className="stage3SegmentControl">
                    {stage3StorageAvailableExtensionOptions.map((extension) => {
                      const isDisabled = extension.disabled || !extension.hasDiagram;
                      return (
                        <button
                          className={stage3StorageChordExtension === extension.id ? "selected" : ""}
                          disabled={isDisabled}
                          key={`storage-extension-${extension.id}`}
                          onClick={() => applyStage3StorageChordSelection(stage3StorageChordBaseRoot, stage3StorageChordAccidental, stage3StorageChordQuality, extension.id)}
                          type="button"
                        >
                          {extension.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="stage3OptionRow stage3StrumPickRow">
                <span>주법</span>
                <div className="stage3StrumInlineControl">
                  <div className="stage3StrumChoiceButtons stage3SegmentControl">
                    <button aria-label="다운 업 주법 추가" onClick={addStage3StrumPair} type="button">↓↑</button>
                    <button aria-label="다운 주법 추가" onClick={() => addStage3StrumStep("down", false)} type="button">↓</button>
                    <button aria-label="업 주법 추가" onClick={() => addStage3StrumStep("up", false)} type="button">↑</button>
                    <button aria-label="X2 주법 표시 추가" onClick={addStage3StrumRepeat} type="button">X2</button>
                  </div>
                  <div className="stage3SegmentControl stage3ActionSegment stage3StrumActionSegment">
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
                        stage3StorageStrumPatternRef.current = [];
                        setStage3StorageStrumPattern([]);
                      }}
                      type="button"
                    >
                      초기화
                    </button>
                  </div>
                  <div className="stage3StrumDraftInline">
                    <strong>
                      {stage3StorageStrumDraftPattern.length ? (
                        <StrumPattern onStepClick={toggleStage3StrumHit} pattern={stage3StorageStrumDraftPattern} />
                      ) : (
                        <small>주법을 선택하세요</small>
                      )}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="stage3AddRow">
                <strong>
                  <span>선택코드</span>
                  {stage3StorageSelectedChord ? stage3StorageSelectedChordName : "준비중"}
                </strong>
                <div className="stage3SegmentControl stage3ActionSegment">
                  <button
                    className="primary"
                    disabled={!stage3StorageSelectedChord}
                    onClick={() => {
                      if (!stage3StorageSelectedChord) return;
                      setStage3StorageChordIds((ids) => [
                        ...ids,
                        { id: stage3StorageSelectedChord.id, label: stage3StorageSelectedChordName },
                      ]);
                    }}
                    type="button"
                  >
                    추가
                  </button>
                  <button onClick={() => setStage3StorageChordIds([])} type="button">
                    초기화
                  </button>
                </div>
              </div>
              <div className="stage3InlineProgressionRow">
                <span>진행순서</span>
                <div className="progressionChipList">
                  {hasStage3StorageProgression ? stage3StorageProgression.map((chord, index) => (
                    <strong key={`storage-inline-${chord.id}-${index}`}>
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
              <div className="stage3InlineStrum" aria-label="추가된 주법">
                <span>추가된 주법</span>
                <div className="strumPreviewList">
                  {stage3StorageStrumPattern.length ? (
                    normalizeStrumPatternGroups(stage3StorageStrumPattern).filter((row) => row.length).map((row, index) => (
                      <StrumPattern key={`storage-inline-strum-row-${index}`} pattern={row} />
                    ))
                  ) : (
                    <small className="chordProgressionEmpty">주법을 선택해서 추가하세요</small>
                  )}
                </div>
              </div>
              <div className="stage3StorageComposerActions stage3StorageActionSegment">
                <button disabled={!hasStage3StorageProgression} onClick={() => saveStage3StorageItem("update")} type="button">
                  저장
                </button>
                <button
                  disabled={!stage3StorageEditingId || isStage3RecommendedItem(stage3StorageEditingId)}
                  onClick={() => deleteStage3StorageItem(stage3StorageEditingId || stage3StorageSelectedId)}
                  type="button"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : selectedCategory.id === "rhythm" ? (
        <section className="chordTransitionPanel" aria-label="Chord transition practice">
          <div className="chordTransitionBody">
            <aside className="referenceFretboard chordTransitionChart" aria-label="Current chord fingering">
              <div className="referenceHeader">
                <div>
                  <div className="stage3ChartTitleRow">
                    <span className="stage3ChartTitleText">
                      {stage3CurrentProgressionTitle}
                    </span>
                    {hasChordTransitionProgression ? (
                      <span className="stage3ChartStrumPreview">
                        <StrumPatternRows
                          pattern={
                            stage3LiveStrumPattern.length
                              ? stage3LiveStrumPattern
                              : normalizeStrumPatternGroups(loadedStage3LibraryItem?.strum_pattern ?? loadedStage3LibraryItem?.strumPattern ?? loadedStage3LibraryItem?.strumSlots)
                          }
                        />
                      </span>
                    ) : null}
                  </div>
                  <div className="currentProgressionReadout" aria-label="현재 진행중 코드 진행">
                    {hasChordTransitionProgression ? chordTransitionProgression.map((chord, index) => {
                      const isCurrentChord = index === (chordPracticeIndex % chordTransitionProgression.length);
                      return (
                        <button
                          aria-current={isCurrentChord ? "step" : undefined}
                          className={isCurrentChord ? "active" : ""}
                          key={`readonly-${chord.id}-${index}`}
                          onClick={() => setStage3ProgressIndex(index)}
                          type="button"
                        >
                          {chord.displayName}
                        </button>
                      );
                    }) : (
                      <small>추천 또는 사용자 진행을 선택해주세요</small>
                    )}
                  </div>
                  {hasChordTransitionProgression && chordPracticeCurrent.isEnharmonic && (
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
                barres={hasChordTransitionProgression ? chordPracticeCurrent.barres ?? [] : []}
                className="stageChordSharedFretboard fitRange"
                fretRange={
                  hasChordTransitionProgression
                    ? getCompactFretRange(chordPracticeCurrent.notes, chordPracticeCurrent.barres)
                    : getCompactFretRange([], [])
                }
                mode="chord"
                notes={
                  hasChordTransitionProgression
                    ? chordPracticeCurrent.notes
                      .filter((note) => Number(note.fretNumber) > 0)
                      .map((note, index) => ({
                        ...note,
                        id: `transition-${note.octaveNote}-${note.stringNumber}-${note.fretNumber}-${index}`,
                        label: showChordFingeringGuide ? note.finger : getChordDisplayNoteName(note.noteName),
                        isActive: false,
                        isCurrent: Boolean(note.isRoot),
                        isRoot: false,
                      }))
                    : []
                }
                rootNote=""
                selectedNotes={["__active-note-only__"]}
                showFretNumbers
                showStringNames
                stringStates={
                  hasChordTransitionProgression
                    ? Object.fromEntries(
                      [1, 2, 3, 4, 5, 6]
                        .map((stringNumber) => [stringNumber, getChordStringState(chordPracticeCurrent, stringNumber)])
                        .filter(([, state]) => state === "x" || state === "o"),
                    )
                    : {}
                }
              />
              {!hasChordTransitionProgression ? (
                <div className="stage3EmptyFretboardPrompt" role="status" aria-live="polite">
                  <strong>진행을 선택해주세요</strong>
                  <span>추천진행 또는 사용자 진행을 고르면 운지가 표시됩니다</span>
                </div>
              ) : null}
            </aside>

          </div>

          <div className="chordTransitionHud stage3ProgressHud">
            <BeatIndicator
              beat={beat}
              beatPattern={trainingBeatPattern}
              beatsPerMeasure={trainingBeatsPerMeasure}
              compact
              isPlaying={gameState === GAME_STATES.PLAYING}
              label="리듬 코드 훈련 점자 메트로놈"
              timeSignature="4/4"
            />
            <div className="stage3StartControlCluster">
              <button
                className={`trainingHudStartButton ${gameState === GAME_STATES.PLAYING ? "" : "primary"} ${
                  isStage3AudioPreparing ? "preparing" : ""
                }`}
                aria-busy={isStage3AudioPreparing}
                disabled={
                  gameState !== GAME_STATES.PLAYING &&
                  (!hasChordTransitionProgression || isStage3AudioPreparing)
                }
                onClick={gameState === GAME_STATES.PLAYING ? stopPracticeSession : () => startPractice(selectedCategory)}
                type="button"
              >
                {gameState === GAME_STATES.PLAYING ? (
                  <Square size={16} />
                ) : isStage3AudioPreparing ? (
                  <LoaderCircle className="stage3StartLoadingIcon" size={16} />
                ) : (
                  <Play size={16} />
                )}
                {gameState === GAME_STATES.PLAYING ? "STOP" : isStage3AudioPreparing ? "준비중" : "START"}
              </button>
            </div>
          </div>

          <div className="stage3PracticeUtilityPanel">
            <div className="stage3LoadToolbar">
              <MetronomeSelectControl
                className="stage3LoadSelect stage3RecommendedLoadSelect"
                dropdownDirection="up"
                label="추천"
                onChange={(slotId) => {
                  const item = stage3RecommendedSlots.find((slot) => slot.id === slotId);
                  if (!item) return;
                  setStage3RecommendedSelectValue(item.id);
                  setStage3StorageSelectedId(item.id);
                  applyStage3LibraryItem(item);
                  const nextBacking = normalizeStage3BackingSettings({
                    rhythmPattern: item.backingRhythmPattern,
                    bassBeat: item.backingBassBeat,
                    pianoBeat: item.backingPianoBeat,
                  });
                  prepareStage3BackingSession({
                    progression: buildStage3Progression(item.chordIds),
                    bpmValue: item.bpm ?? bpm,
                    timeSignatureValue: "4/4",
                    rhythmPattern: nextBacking.rhythmPattern,
                    bassBeat: nextBacking.bassBeat,
                    pianoBeat: nextBacking.pianoBeat,
                    preloadAudio: true,
                  });
                }}
                options={[
                  { id: "", label: "추천진행선택", disabled: true },
                  ...stage3RecommendedSlots.map((item) => ({ id: item.id, label: getStage3DropdownLabel(item) })),
                ]}
                value={stage3RecommendedSelectValue}
              />
              <MetronomeSelectControl
                className="stage3LoadSelect stage3UserLoadSelect"
                dropdownDirection="up"
                label="사용자"
                onChange={(slotId) => {
                  const item = stage3QuickSlots.find((slot) => slot.id === slotId);
                  if (!item) return;
                  setStage3RecommendedSelectValue("");
                  setStage3StorageSelectedId(item.id);
                  applyStage3LibraryItem(item, { useDefaultBacking: true });
                  const nextBacking = normalizeStage3BackingSettings(STAGE3_DEFAULT_BACKING_SETTINGS);
                  prepareStage3BackingSession({
                    progression: buildStage3Progression(item.chordIds),
                    bpmValue: item.bpm ?? bpm,
                    timeSignatureValue: "4/4",
                    rhythmPattern: nextBacking.rhythmPattern,
                    bassBeat: nextBacking.bassBeat,
                    pianoBeat: nextBacking.pianoBeat,
                    preloadAudio: true,
                  });
                }}
                options={[
                  { id: "", label: "사용자 진행 선택", disabled: true },
                  ...stage3QuickSlots.map((item) => ({ id: item.id, label: getStage3DropdownLabel(item) })),
                ]}
                value={!isStage3RecommendedItem(selectedStage3LibraryItem) ? selectedStage3LibraryItem?.id ?? loadedStage3LibraryItem?.id ?? "" : ""}
              />
              <button
                className="stage3StorageMoveButton"
                onClick={showStage3StorageRoom}
                type="button"
              >
                <FolderOpen size={14} />
                저장실
              </button>
            </div>
            <TrainingPanelHeader
              content={(<div
                className="stage3CollapsedBpmControl"
                aria-label="훈련장 BPM 조절"
                onPointerCancel={handleBpmSwipeCancel}
                onPointerDown={handleBpmSwipeStart}
                onPointerMove={handleBpmSwipeMove}
                onPointerUp={handleBpmSwipeEnd}
              >
                <button
                  aria-label="BPM 1 낮추기"
                  className="stage3CollapsedBpmButton"
                  onClick={(event) => {
                    event.stopPropagation();
                    changeBpm(bpm - 1);
                  }}
                  type="button"
                >
                  -
                </button>
                <div className="stage3CollapsedBpmValue">
                  <span>BPM</span>
                  <strong data-bpm-preview-value="true">{bpm}</strong>
                </div>
                <button
                  aria-label="BPM 1 올리기"
                  className="stage3CollapsedBpmButton"
                  onClick={(event) => {
                    event.stopPropagation();
                    changeBpm(bpm + 1);
                  }}
                  type="button"
                >
                  +
                </button>
              </div>)}
              title=""
            />
          </div>
          <div className="stage3BackingBandPanel" aria-label="반주 설정">
            <div className="stage3BackingPatternGrid">
              <span>리듬</span>
              <div className="stage3BackingSelectRow">
                {[
                  { id: "4beat", label: "4비트" },
                  { id: "8beat", label: "8비트" },
                  { id: "16beat", label: "16비트" },
                  { id: "shuffle", label: "Shuffle" },
                ].map((option) => (
                  <button
                    className={backingRhythmPattern === option.id ? "selected" : ""}
                    key={option.id}
                    onClick={() => {
                      requestStage3BackingPatternChange({ rhythmPattern: option.id });
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <span>베이스</span>
              <div className="stage3BackingSelectRow stage3BackingShortRow">
                {[
                  { id: "basic", label: "기본" },
                  { id: "4beat", label: "4비트" },
                  { id: "8beat", label: "8비트", disabled: backingRhythmPattern === "4beat" },
                  { id: "16beat", label: "16비트", disabled: backingRhythmPattern !== "16beat" },
                ].map((option) => (
                  <button
                    className={backingBassBeat === option.id ? "selected" : ""}
                    disabled={option.disabled}
                    key={option.id}
                    onClick={() => {
                      requestStage3BackingPatternChange({ bassBeat: option.id });
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <span>피아노</span>
              <div className="stage3BackingSelectRow stage3BackingShortRow">
                {[
                  { id: "2beat", label: "기본" },
                  { id: "4beat", label: "4비트" },
                  { id: "8beat", label: "8비트", disabled: backingRhythmPattern === "4beat" },
                ].map((option) => (
                  <button
                    className={backingPianoBeat === option.id ? "selected" : ""}
                    disabled={option.disabled}
                    key={option.id}
                    onClick={() => {
                      requestStage3BackingPatternChange({ pianoBeat: option.id });
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="stage3BackingPartSegment" aria-label="반주 파트 켜기 끄기">
                {[
                  {
                    id: "drum",
                    label: "드럼",
                    enabled: backingDrumEnabled,
                    setEnabled: setBackingDrumEnabled,
                  },
                  {
                    id: "bass",
                    label: "베이스",
                    enabled: backingBassEnabled,
                    setEnabled: setBackingBassEnabled,
                  },
                  {
                    id: "piano",
                    label: "피아노",
                    enabled: backingPianoEnabled,
                    setEnabled: setBackingPianoEnabled,
                  },
                ].map((part) => (
                  <button
                    aria-pressed={part.enabled}
                    className={part.enabled ? "selected" : ""}
                    key={part.id}
                    onClick={() => part.setEnabled((value) => !value)}
                    type="button"
                  >
                    {part.label} {part.enabled ? "ON" : "OFF"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : !LEGACY_PRACTICE_RENDERING_ENABLED ? (
        <section
          className={`referenceTrainingPanel ${selectedCategory.id === "first-position" ? "firstPositionTrainingPanel" : ""} ${selectedCategory.id === "scale-block" ? "scaleBlockTrainingPanel" : ""}`}
          aria-label="Reference fretboard training"
        >
          {selectedCategory.id !== "first-position" && selectedCategory.id !== "scale-block" ? (
            <ContentTitle {...contentHeader} />
          ) : null}
          {selectedCategory.id === "first-position" || selectedCategory.id === "scale-block" ? null : (
            <div className="trainingDetailHeaderRow">
              <span className="trainingDetailTitle">{getTrainingDetailTitle(selectedCategory)}</span>
            </div>
          )}

          <div className="referenceTrainingMainRow">
            <aside className="referenceFretboard referenceTrainingBoard" aria-label="Reference fretboard">
              {selectedCategory.id === "first-position" || selectedCategory.id === "scale-block" ? (
                selectedCategory.id === "scale-block" ? (
                  <div className="referenceHeader stage2HeaderScalePicker">
                    <div className="scalePickerPanel referenceScalePicker">
                      <MetronomeSelectControl
                        className="scaleKeySelect"
                        dropdownDirection="down"
                        label="키"
                        onChange={changeScaleRoot}
                        options={SCALE_ROOT_OPTIONS.map((root) => ({ id: root.id, label: `${root.label} / ${root.solfege}` }))}
                        value={selectedScaleRoot}
                      />
                      <div className="scaleTypeGroup">
                        <MetronomeSelectControl
                          label="종류"
                          dropdownDirection="down"
                          onChange={changeScaleFamily}
                          options={Object.values(SCALE_FAMILIES).map((family) => ({ id: family.id, label: family.label }))}
                          value={selectedScaleFamily}
                        />
                        <MetronomeSelectControl
                          label="타입"
                          dropdownDirection="down"
                          onChange={changeScaleType}
                          options={Object.values(selectedScaleTypeOptions).map((type) => ({ id: type.id, label: type.label }))}
                          value={selectedScaleType}
                        />
                      </div>
                      <MetronomeSelectControl
                        className="scaleBoxSelect"
                        dropdownDirection="down"
                        label="BOX"
                        onChange={changeScaleBox}
                        options={[1, 2, 3, 4, 5].map((box) => ({ id: box, label: `BOX${box}` }))}
                        value={selectedScaleBox}
                      />
                    </div>
                  </div>
                ) : (
                  <TrainingPanelHeader
                    title={referenceDisplayPrompt
                      ? `${referenceDisplayPrompt.solfege ?? getSolfege(referenceDisplayPrompt.pitch)} / ${referenceDisplayPrompt.pitch}`
                      : "준비"}
                  />
                )
              ) : (
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
              )}
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

            <div className={`referenceTrainingToolbar trainingSettingsPanel ${hasDirectionPractice ? "referenceTrainingToolbar--standalone" : ""}`}>
              {hasDirectionPractice ? (
                <div className="referenceStandaloneMetronomeDeck standaloneMetronomePanel">
                  <div className="referenceBeatMetronomeStrip" aria-label="점자 메트로놈">
                    <BeatIndicator
                      beat={beat}
                      beatPattern={standaloneBeatPattern}
                      beatsPerMeasure={metronomeBeatsPerMeasure}
                      compact
                      dotClassName="referenceBeatMetronomeDot"
                      isPlaying={gameState === GAME_STATES.PLAYING}
                      label="점자 메트로놈"
                      onBeatClick={cycleStandaloneBeatState}
                      timeSignature={metronomeTimeSignature}
                    />
                  </div>
                  <div
                    className="metronomeHeroCard metronomeHeroCard--interactive referenceMetronomeHeroCard"
                    onPointerCancel={handleBpmSwipeCancel}
                    onPointerDown={handleBpmSwipeStart}
                    onPointerMove={handleBpmSwipeMove}
                    onPointerUp={handleBpmSwipeEnd}
                  >
                    <button
                      aria-label="BPM 1 낮추기"
                      className="metronomeHeroBpmButton"
                      onClick={(event) => {
                        event.stopPropagation();
                        changeBpm(bpm - 1);
                      }}
                      type="button"
                    >
                      -
                    </button>
                    <div className="metronomeHeroBpmValue">
                      <span>BPM</span>
                      <strong data-bpm-preview-value="true">{bpm}</strong>
                    </div>
                    <button
                      aria-label="BPM 1 올리기"
                      className="metronomeHeroBpmButton"
                      onClick={(event) => {
                        event.stopPropagation();
                        changeBpm(bpm + 1);
                      }}
                      type="button"
                    >
                      +
                    </button>
                    <button
                      aria-label={gameState === GAME_STATES.PLAYING ? "연습 정지" : "연습 시작"}
                      className={`metronomeHeroPlayButton ${gameState === GAME_STATES.PLAYING ? "reset" : "primary"}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (gameState === GAME_STATES.PLAYING) {
                          stopPracticeSession();
                          return;
                        }
                        startPractice(selectedCategory);
                      }}
                      type="button"
                    >
                      {gameState === GAME_STATES.PLAYING ? (
                        <Square size={15} aria-hidden="true" />
                      ) : (
                        <Play size={18} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <MetronomeControl
                    accentEnabled={metronomeAccent}
                    accentTone={metronomeAccentTone}
                    bpm={bpm}
                    className="standaloneMetronomeControl referenceStandaloneMetronomeControl"
                    countInEnabled={metronomeCountIn}
                    inputId={`reference-${selectedCategory.id}-bpm`}
                    onAccentChange={changeTrainingMetronomeAccent}
                    onAccentToneChange={changeMetronomeAccentTone}
                    onBpmChange={changeBpm}
                    onCountInChange={setMetronomeCountIn}
                    onRepeatChange={setRepeatPractice}
                    onSubdivisionChange={setMetronomeSubdivision}
                    onTimeSignatureChange={changeTrainingMetronomeTimeSignature}
                    onToneChange={setMetronomeTone}
                    onWeakToneChange={changeMetronomeWeakTone}
                    repeatEnabled={repeatPractice}
                    showAccent={false}
                    showBpmControls={false}
                    showCountIn={false}
                    showRepeat={false}
                    splitToneControls
                    subdivision={metronomeSubdivision}
                    timeSignature={metronomeTimeSignature}
                    tone={metronomeTone}
                    weakTone={metronomeWeakTone}
                  />
                </div>
              ) : (
                <div className="trainingMetronomeShell referenceTrainingActions buttons playbackButtons">
                  <MetronomeControl
                    accentEnabled={metronomeAccent}
                    bpm={bpm}
                    className="trainingMetronomePanel referenceBpmControl"
                    compactToggleLabels={false}
                    countInEnabled={metronomeCountIn}
                    inputId="reference-bpm-presets"
                    onAccentChange={changeTrainingMetronomeAccent}
                    onBpmChange={changeBpm}
                    onCountInChange={setMetronomeCountIn}
                    onRepeatChange={setRepeatPractice}
                    onSubdivisionChange={setMetronomeSubdivision}
                    onTimeSignatureChange={changeTrainingMetronomeTimeSignature}
                    onToneChange={setMetronomeTone}
                    repeatEnabled={repeatPractice}
                    showRepeat
                    subdivision={metronomeSubdivision}
                    timeSignature={metronomeTimeSignature}
                    tone={metronomeTone}
                  />
                </div>
              )}
            </div>
          </div>

          {!hasDirectionPractice ? (
            <div className="chordTransitionHud referenceTransitionHud">
              <MetronomeTimeline
                beat={beat}
                beatPattern={trainingBeatPattern}
                beatsPerMeasure={trainingBeatsPerMeasure}
                compact
                currentLabel={getReferenceStageValue(referenceDisplayPrompt)}
                isPlaying={gameState === GAME_STATES.PLAYING}
                progress={stage3MeasureProgress}
                timeSignature="4/4"
              />
              <button
                className={`trainingHudStartButton ${gameState === GAME_STATES.PLAYING ? "" : "primary"}`}
                onClick={gameState === GAME_STATES.PLAYING ? stopPracticeSession : () => startPractice(selectedCategory)}
                type="button"
              >
                {gameState === GAME_STATES.PLAYING ? <Square size={16} /> : <Play size={16} />}
                {gameState === GAME_STATES.PLAYING ? "STOP" : "START"}
              </button>
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
            </div>
          ) : null}
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
                    <MetronomeSelectControl
                      className="scaleKeySelect"
                      label="키"
                      onChange={changeScaleRoot}
                      options={SCALE_ROOT_OPTIONS.map((root) => ({ id: root.id, label: `${root.label} / ${root.solfege}` }))}
                      value={selectedScaleRoot}
                    />
                    <div className="scaleTypeGroup">
                      <MetronomeSelectControl
                        label="종류"
                        onChange={changeScaleFamily}
                        options={Object.values(SCALE_FAMILIES).map((family) => ({ id: family.id, label: family.label }))}
                        value={selectedScaleFamily}
                      />
                      <MetronomeSelectControl
                        label="타입"
                        onChange={changeScaleType}
                        options={Object.values(selectedScaleTypeOptions).map((type) => ({ id: type.id, label: type.label }))}
                        value={selectedScaleType}
                      />
                    </div>
                    <MetronomeSelectControl
                      className="scaleBoxSelect"
                      label="Box"
                      onChange={changeScaleBox}
                      options={SCALE_BOX_OPTIONS.map((boxNumber) => ({ id: boxNumber, label: `Box ${boxNumber}` }))}
                      value={selectedScaleBox}
                    />
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
                      className={`scaleNote ${isActive ? "active current-note" : ""} ${detectedReferenceScaleNote && isActive ? "detectedActive" : ""}`}
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
                      className="miniNote current-note"
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
                {gameState === GAME_STATES.PAUSED ? "계속" : "시작"}
              </button>
              <button
                className={`shooterControlMicButton ${streamRef.current ? "selected" : ""}`}
                onClick={startShooterMic}
                type="button"
              >
                <Mic size={18} />
                마이크
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
                RESET
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
