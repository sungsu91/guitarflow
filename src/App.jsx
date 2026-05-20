import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Music2,
  Pause,
  Play,
  Radio,
  Square,
  Sparkles,
  Volume2,
} from "lucide-react";

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
      stringOffsets: { 6: [0, 2, 3], 5: [0, 2, 4], 4: [0, 2, 4], 3: [1, 2, 4], 2: [2, 3, 5], 1: [2, 3, 5] },
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

const TUNER_STRINGS = OPEN_STRING_NOTES;

const EMPTY_TUNER_READING = {
  target: null,
  detectedNote: "--",
  frequency: null,
  cents: 0,
  needle: 0,
  status: "No Signal",
  tone: "idle",
  confidence: 0,
};

const DISPLAY_NOTES = [
  ...Object.entries(NOTE_FREQUENCIES).map(([pitch, frequency]) =>
    makeGuitarNote({ pitch, frequency, stringNumber: 0, fretNumber: 0, lane: 0, group: "display" }),
  ),
];

const DEFAULT_BPM = 80;
const MIN_BPM = 40;
const MAX_BPM = 220;
const MIN_REPEAT_COUNT = 1;
const MAX_REPEAT_COUNT = 12;
const HIT_WINDOW_MS = 150;
const PERFECT_WINDOW_MS = 55;
const HIT_LINE_PERCENT = 88;
const NOTE_SIZE = 36;
const HIT_ZONE_SIZE = NOTE_SIZE;
const MIN_FREQ = 75;
const MAX_FREQ = 900;
const MOBILE_TUNER_MAX_FREQ = 1400;
const LOW_SIGNAL_LEVEL = 0.012;
const ACTIVE_SIGNAL_LEVEL = 0.018;
const TUNING_TOLERANCE_CENTS = 5;
const NOTE_HOLD_MS = 2500;
const PITCH_LOCK_FRAMES = 2;
const NOTE_SWITCH_FRAMES = 4;
const RHYTHM_SUBDIVISIONS = {
  One: { label: "1/4", hint: "한 박에 한 음", beats: 6, notesPerBeat: 1 },
  Two: { label: "1/8", hint: "1 & 2 & 연속", beats: 6, notesPerBeat: 2 },
  Four: { label: "1/16", hint: "촘촘한 연속 피킹", beats: 6, notesPerBeat: 4 },
  Pair: { label: "2음/박", hint: "미파 솔라 진행", beats: 6, notesPerBeat: 2, advanceEverySubdivision: true },
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
    description: "표시된 줄/프렛 위치로 연습하는 모드예요.",
  },
};
const POSITION_MODE_WARNING =
  "같은 음은 다른 위치에서도 낼 수 있어요. 이 모드는 표시된 위치로 연습하는 것을 권장합니다.";
const BPM_PRESETS = [60, 80, 100, 120];
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
  { phase: "왕복", ko: "미파솔", en: "EFG" },
  { phase: "왕복", ko: "라시도", en: "ABC" },
  { phase: "왕복", ko: "레미파", en: "DEF" },
  { phase: "왕복", ko: "솔라", en: "GA" },
  { phase: "왕복", ko: "시도레", en: "BCD" },
  { phase: "왕복", ko: "미파솔", en: "EFG" },
  { phase: "왕복", ko: "파미", en: "FE" },
  { phase: "왕복", ko: "레도시", en: "DCB" },
  { phase: "왕복", ko: "라솔", en: "AG" },
  { phase: "왕복", ko: "파미레", en: "FED" },
  { phase: "왕복", ko: "도시라", en: "CBA" },
  { phase: "왕복", ko: "솔파미", en: "GFE" },
];

const PRACTICE_CATEGORIES = [
  {
    id: "open",
    title: "튜토리얼",
    subtitle: "간단 개방현 연습",
    notes: OPEN_STRING_NOTES,
    sequence: ["E2", "A2", "D3", "G3", "B3", "E4"],
    modeLabel: "개방현",
    judgmentMode: JUDGMENT_MODES.PITCH.id,
    loop: true,
    tutorial: true,
  },
  {
    id: "first-position",
    title: "1~3F 포지션 트레이닝",
    subtitle: "6번줄부터 1~3프렛 구간의 미파솔라시도레 흐름을 반복 연습",
    notes: FIRST_POSITION_NOTES,
    sequence: FIRST_POSITION_SEQUENCE,
    modeLabel: "Low Position",
    judgmentMode: JUDGMENT_MODES.PITCH.id,
    loop: false,
  },
  {
    id: "scale-block",
    title: "포지션 기반 지판 훈련",
    subtitle: "개방현부터 1~3프렛 포지션, 스케일·펜타토닉 Box까지 단계별로 지판 감각을 익혀요.",
    notes: NOTES,
    sequence: SCALE_ASCENDING,
    modeLabel: "Box Pattern",
    judgmentMode: JUDGMENT_MODES.POSITION.id,
    loop: true,
    featured: true,
  },
  {
    id: "rhythm",
    title: "Rhythm Sync Training",
    subtitle: "박자에 맞춰 음을 찾아 반응 속도와 타이밍 감각 강화",
    notes: OPEN_STRING_NOTES,
    sequence: ["E2", "E2", "A2", "A2", "D3", "D3", "G3", "B3", "E4"],
    modeLabel: "Beat & Timing",
    judgmentMode: JUDGMENT_MODES.PITCH.id,
    loop: true,
    unavailable: true,
  },
  {
    id: "melody",
    title: "Melody Interval Drill",
    subtitle: "간단한 멜로디와 음정 간격을 익히는 실전 연결 훈련",
    notes: FIRST_POSITION_NOTES,
    sequence: ["E2", "G2", "A2", "B2", "C3", "B2", "A2", "G2", "E2"],
    modeLabel: "Interval",
    judgmentMode: JUDGMENT_MODES.PITCH.id,
    loop: true,
    unavailable: true,
  },
];
const DEFAULT_CATEGORY = PRACTICE_CATEGORIES[0];
const MAIN_DEFAULT_CATEGORY =
  PRACTICE_CATEGORIES.find((category) => category.featured) ??
  PRACTICE_CATEGORIES.find((category) => !category.tutorial && !category.unavailable) ??
  DEFAULT_CATEGORY;

const GAME_STATES = {
  IDLE: "idle",
  LISTENING: "listening",
  PLAYING: "playing",
  PAUSED: "paused",
  GAMEOVER: "gameover",
};

const APP_MODES = {
  MENU: "menu",
  TUNER: "tuner",
  CURRICULUM: "curriculum",
  PRACTICE: "practice",
  SHOOTER: "shooter",
};

const SCALE_DIRECTIONS = {
  ASC: "ascending",
  DESC: "descending",
  LOOP: "loop",
};

const SCALE_DIRECTION_OPTIONS = [
  { id: SCALE_DIRECTIONS.ASC, label: "상행", hint: "낮은 A부터 위로" },
  { id: SCALE_DIRECTIONS.LOOP, label: "왕복", hint: "상행 후 되돌아오기" },
  { id: SCALE_DIRECTIONS.DESC, label: "하행", hint: "높은 C부터 아래로" },
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
  "Tune Up": "튜닝 시작",
  "Choose a practice card": "연습 카드를 선택하세요",
  "Permission Denied": "마이크 권한 거부",
  "Mic Connected": "마이크 연결됨",
  "Listening...": "감지 중",
  "No Signal": "신호 없음",
  "Holding last note": "마지막 음 유지 중",
  "In Tune": "튜닝 완료",
  "Too Low": "음이 낮음",
  "Too High": "음이 높음",
  "Slightly Low": "조금 낮음",
  "Slightly High": "조금 높음",
  tuner: "튜너",
  curriculum: "연습 목차",
  practice: "프렛보드 트레이너",
  shooter: "슈팅게임",
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
  return category?.id === "scale-block" || category?.id === "first-position"
    ? false
    : category?.loop !== false;
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

function getTuningStatus(cents) {
  const absCents = Math.abs(cents);
  if (absCents <= TUNING_TOLERANCE_CENTS) {
    return { label: "In Tune", tone: "good" };
  }
  if (absCents <= 18) {
    return { label: cents < 0 ? "Slightly Low" : "Slightly High", tone: "warn" };
  }
  return { label: cents < 0 ? "Too Low" : "Too High", tone: "bad" };
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
  const [appMode, setAppMode] = useState(APP_MODES.MENU);
  const [gameState, setGameState] = useState(GAME_STATES.IDLE);
  const [micStatus, setMicStatus] = useState("No Signal");
  const [detected, setDetected] = useState(null);
  const [detectedPitch, setDetectedPitch] = useState(null);
  const [tunerReading, setTunerReading] = useState(EMPTY_TUNER_READING);
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
  const [stageFlash, setStageFlash] = useState("");
  const [noteSpeed, setNoteSpeed] = useState(RHYTHM_SUBDIVISIONS.One);
  const [selectedCategoryId, setSelectedCategoryId] = useState(MAIN_DEFAULT_CATEGORY.id);
  const [scaleDirection, setScaleDirection] = useState(SCALE_DIRECTIONS.LOOP);
  const [selectedScaleRoot, setSelectedScaleRoot] = useState("A");
  const [selectedScaleFamily, setSelectedScaleFamily] = useState(SCALE_FAMILIES.pentatonic.id);
  const [selectedScaleType, setSelectedScaleType] = useState(PENTATONIC_TYPES.minor.id);
  const [selectedScaleBox, setSelectedScaleBox] = useState(1);
  const [repeatPractice, setRepeatPractice] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [metronomeOn, setMetronomeOn] = useState(true);
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

  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const bufferRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const flashTimerRef = useRef(null);
  const appModeRef = useRef(APP_MODES.MENU);
  const gameStateRef = useRef(GAME_STATES.IDLE);
  const isMobileLayoutRef = useRef(false);
  const speedRef = useRef(RHYTHM_SUBDIVISIONS.One);
  const bpmRef = useRef(DEFAULT_BPM);
  const metronomeOnRef = useRef(true);
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
  const nextSpawnAtRef = useRef(0);
  const lastBeatRef = useRef(-1);
  const lastHitRef = useRef({ note: null, time: 0 });
  const lastMissRef = useRef({ note: null, time: 0 });
  const stableGameNoteRef = useRef({ note: null, count: 0 });
  const hitsRef = useRef(0);
  const lastDebugUpdateRef = useRef(0);
  const lastDetectedDisplayUpdateRef = useRef(0);
  const tunerCandidateRef = useRef({ name: null, count: 0 });
  const lockedTunerStringRef = useRef(null);
  const smoothedCentsRef = useRef(0);
  const lastStableNoteRef = useRef(null);
  const lastStableFrequencyRef = useRef(null);
  const lastStableCentsRef = useRef(0);
  const lastStableTargetRef = useRef(null);
  const lastDetectedTimeRef = useRef(0);
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
    if (gameState === GAME_STATES.PLAYING || appMode === APP_MODES.TUNER) {
      return isSignalActive ? "Listening..." : "No Signal";
    }
    return "Mic Connected";
  }, [appMode, gameState, hasMic, isSignalActive, micStatus]);

  const tunerNeedle = Math.max(-50, Math.min(50, tunerReading.needle));
  const selectedCategory =
    PRACTICE_CATEGORIES.find((category) => category.id === selectedCategoryId) ??
    DEFAULT_CATEGORY;
  const selectedScaleTypeOptions =
    selectedScaleFamily === SCALE_FAMILIES.scale.id ? DIATONIC_SCALE_TYPES : PENTATONIC_TYPES;
  const selectedPentatonic = useMemo(
    () => buildScaleBlockPractice(selectedScaleRoot, selectedScaleType, selectedScaleFamily, selectedScaleBox),
    [selectedScaleBox, selectedScaleFamily, selectedScaleRoot, selectedScaleType],
  );
  const getPlayableCategory = useCallback((category = selectedCategory) => {
    const safeCategory = normalizePracticeCategory(category);
    if (safeCategory.id !== "scale-block") return safeCategory;
    return {
      ...safeCategory,
      title: "포지션 기반 지판 훈련",
      subtitle: `${selectedPentatonic.label} 블록을 선택해 연습해요`,
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
  const tunerDisplayStatus =
    tunerReading.status === "Holding last note" || tunerReading.status === "No Signal"
      ? tunerReading.status
      : tunerReading.tone === "good"
        ? "In Tune"
        : tunerReading.cents < 0
          ? "Too Low"
          : "Too High";

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
    setHitZoneNote(null);
    setIsHitWindowActive(false);
    setLaneFeedback([]);
    setStageFlash("");
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

  const holdLastStableNote = useCallback((now, fallbackStatus = "No Signal") => {
    const hasRecentStableNote =
      lastStableNoteRef.current && now - lastDetectedTimeRef.current < NOTE_HOLD_MS;
    const shouldUpdateDisplay = now - lastDetectedDisplayUpdateRef.current > 70;

    if (hasRecentStableNote) {
      if (!shouldUpdateDisplay) return true;
      lastDetectedDisplayUpdateRef.current = now;
      const heldNote = {
        ...(lastStableTargetRef.current ?? {}),
        name: lastStableNoteRef.current,
        frequency: lastStableFrequencyRef.current,
        cents: lastStableCentsRef.current,
      };

      setDetected(heldNote);
      setDetectedPitch({
        frequency: lastStableFrequencyRef.current,
        note: lastStableNoteRef.current,
      });
      setTunerReading({
        target: lastStableTargetRef.current,
        detectedNote: lastStableNoteRef.current,
        frequency: lastStableFrequencyRef.current,
        cents: lastStableCentsRef.current,
        needle: lastStableCentsRef.current,
        status: "Holding last note",
        tone: "hold",
        confidence: 1,
      });
      return true;
    }

    if (!shouldUpdateDisplay) return false;
    lastDetectedDisplayUpdateRef.current = now;
    setDetected(null);
    setDetectedPitch(null);
    lockedTunerStringRef.current = null;
    tunerCandidateRef.current = { name: null, count: 0 };
    setTunerReading({
      ...EMPTY_TUNER_READING,
      status: fallbackStatus,
      needle: 0,
    });
    return false;
  }, []);

  const ensureAudioReady = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;
    if (audio.state === "suspended") await audio.resume();
    return audio.state === "running";
  }, []);

  const playTick = useCallback((accent = false) => {
    const audio = audioRef.current;
    if (!audio || gameStateRef.current !== GAME_STATES.PLAYING || !metronomeOnRef.current) return;
    if (audio.state === "suspended") {
      audio.resume().catch(() => {});
      return;
    }

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = accent ? 1760 : 1040;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.42 : 0.3, audio.currentTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.055);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(audio.currentTime);
    oscillator.stop(audio.currentTime + 0.06);
  }, []);

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
        if (appModeRef.current === APP_MODES.TUNER) {
          holdLastStableNote(now);
        } else if (now - lastDetectedDisplayUpdateRef.current > 70) {
          lastDetectedDisplayUpdateRef.current = now;
          setDetected(null);
          setDetectedPitch(null);
        }
        return;
      }

      const isMobileTuner = isMobileLayoutRef.current && appModeRef.current === APP_MODES.TUNER;
      const maxDetectFrequency = isMobileTuner ? MOBILE_TUNER_MAX_FREQ : MAX_FREQ;
      const yinPitch = detectPitchYin(
        buffer,
        audio.sampleRate,
        MIN_FREQ,
        maxDetectFrequency,
        isMobileTuner ? 0.16 : 0.12,
      );
      const pitch =
        yinPitch ??
        detectPitchAutocorrelation(
          buffer,
          audio.sampleRate,
          MIN_FREQ,
          maxDetectFrequency,
          isMobileTuner ? 0.0038 : 0.006,
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

      if (appModeRef.current === APP_MODES.TUNER) {
        const detectedString = frequencyToNearest(pitch, TUNER_STRINGS, isMobileLayoutRef.current ? 145 : 90);

        if (detectedString) {
          if (tunerCandidateRef.current.name === detectedString.pitch) {
            tunerCandidateRef.current.count += 1;
          } else {
            tunerCandidateRef.current = { name: detectedString.pitch, count: 1 };
          }

          if (
            (!lockedTunerStringRef.current && tunerCandidateRef.current.count >= PITCH_LOCK_FRAMES) ||
            (lockedTunerStringRef.current &&
              lockedTunerStringRef.current.pitch !== detectedString.pitch &&
              tunerCandidateRef.current.count >= NOTE_SWITCH_FRAMES)
          ) {
            lockedTunerStringRef.current = TUNER_STRINGS.find(
              (stringNote) => stringNote.pitch === detectedString.pitch,
            );
          }
        }

        const targetString = lockedTunerStringRef.current ?? detectedString;
        if (!targetString) {
          const isHolding = holdLastStableNote(now, detectedString ? "Listening..." : "No Signal");
          if (!isHolding && detectedString) {
            setTunerReading({
              ...EMPTY_TUNER_READING,
              status: "Listening...",
              confidence: Math.min(1, tunerCandidateRef.current.count / PITCH_LOCK_FRAMES),
            });
          }
        } else if (pitch) {
          const rawCents = centsBetween(pitch, targetString.frequency);
          if (Math.abs(rawCents) <= (isMobileLayoutRef.current ? 150 : 95)) {
            smoothedCentsRef.current += (rawCents - smoothedCentsRef.current) * 0.32;
            const status = getTuningStatus(smoothedCentsRef.current);
            const stableCents = Math.round(smoothedCentsRef.current);

            if (tunerCandidateRef.current.count >= PITCH_LOCK_FRAMES) {
              lastStableNoteRef.current = targetString.pitch;
              lastStableFrequencyRef.current = pitch;
              lastStableCentsRef.current = stableCents;
              lastStableTargetRef.current = targetString;
              lastDetectedTimeRef.current = now;
            }

            setTunerReading({
              target: targetString,
              detectedNote: targetString.pitch,
              frequency: pitch,
              cents: stableCents,
              needle: smoothedCentsRef.current,
              status:
                tunerCandidateRef.current.count >= PITCH_LOCK_FRAMES ? status.label : "Listening...",
              tone: status.tone,
              confidence: Math.min(1, tunerCandidateRef.current.count / PITCH_LOCK_FRAMES),
            });
          } else {
            holdLastStableNote(now, "Listening...");
          }
        }
      }

      if (
        appModeRef.current === APP_MODES.PRACTICE &&
        gameStateRef.current === GAME_STATES.PLAYING &&
        gameNote &&
        stableGameNoteRef.current.count >= (isMobileLayoutRef.current ? 1 : 2)
      ) {
        judgeNote(gameNote.pitch);
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
    [holdLastStableNote, judgeNote, judgeShooterNote],
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
        setState(streamRef.current ? GAME_STATES.LISTENING : GAME_STATES.IDLE);
      }
    },
    [flashStage, playTick, setState, showLaneFeedback, spawnEnemy],
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

  const animationLoop = useCallback(
    (now) => {
      const deltaMs = Math.min(50, now - lastFrameRef.current);
      lastFrameRef.current = now;

      if (streamRef.current) readMicrophone(now);
      if (appModeRef.current === APP_MODES.PRACTICE && gameStateRef.current === GAME_STATES.PLAYING) {
        runGameFrame(deltaMs);
      }
      if (appModeRef.current === APP_MODES.SHOOTER && gameStateRef.current === GAME_STATES.PLAYING) {
        runShooterFrame(deltaMs);
      }

      rafRef.current = requestAnimationFrame(animationLoop);
    },
    [readMicrophone, runGameFrame, runShooterFrame],
  );

  const startMic = useCallback(async () => {
    try {
      setMicStatus("Mic Connected");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audio = audioRef.current ?? new AudioContext();
      await audio.resume();

      const analyser = audio.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;

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
      setFeedback("Permission Denied");
      console.error(error);
      return false;
    }
  }, [setState]);

  const startTuner = useCallback(async () => {
    appModeRef.current = APP_MODES.TUNER;
    setAppMode(APP_MODES.TUNER);
    const microphoneReady = streamRef.current || (await startMic());
    if (!microphoneReady) return;
    await ensureAudioReady();
    setFeedback("Tune Up");
    setState(GAME_STATES.LISTENING);
    lastFrameRef.current = performance.now();
  }, [ensureAudioReady, setState, startMic]);

  const startPractice = useCallback(async (category = selectedCategory) => {
    const safeCategory = getPlayableCategory(category);
    if (safeCategory.unavailable) {
      setSelectedCategoryId(safeCategory.id);
      setFeedback("Choose a practice card");
      return;
    }
    const microphoneReady = streamRef.current || (await startMic());
    if (!microphoneReady) return;
    await ensureAudioReady();

    const sequence = getPracticeSequence(safeCategory);
    activeNotesRef.current = safeCategory.notes;
    sequenceRef.current = sequence;
    appModeRef.current = APP_MODES.PRACTICE;
    setAppMode(APP_MODES.PRACTICE);
    setSelectedCategoryId(safeCategory.id);
    resetScore();
    practiceLoopRef.current = shouldLoopPractice(safeCategory, repeatPractice);
    setFeedback("Listen and play");
    setState(GAME_STATES.PLAYING);
    lastFrameRef.current = performance.now();
  }, [ensureAudioReady, getPlayableCategory, getPracticeSequence, repeatPractice, resetScore, selectedCategory, setState, startMic]);

  const enterPracticePreview = useCallback((category = selectedCategory) => {
    const safeCategory = getPlayableCategory(category);
    if (safeCategory.unavailable) {
      setSelectedCategoryId(safeCategory.id);
      setFeedback("Choose a practice card");
      return;
    }
    const sequence = getPracticeSequence(safeCategory);
    activeNotesRef.current = safeCategory.notes;
    sequenceRef.current = sequence;
    practiceLoopRef.current = shouldLoopPractice(safeCategory, repeatPractice);
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
    setFeedback("Ready");
    setState(streamRef.current ? GAME_STATES.LISTENING : GAME_STATES.IDLE);
    lastFrameRef.current = performance.now();
  }, [getPlayableCategory, getPracticeSequence, repeatPractice, resetScore, selectedCategory, setState]);

  const startShooter = useCallback(async (category = selectedCategory) => {
    const safeCategory = normalizePracticeCategory(category);
    const microphoneReady = streamRef.current || (await startMic());
    if (!microphoneReady) return;
    await ensureAudioReady();

    activeNotesRef.current = getShooterTrainingNotes(safeCategory, selectedPentatonic);
    sequenceRef.current = getPracticeSequence(safeCategory);
    practiceLoopRef.current = true;
    appModeRef.current = APP_MODES.SHOOTER;
    setAppMode(APP_MODES.SHOOTER);
    setSelectedCategoryId(safeCategory.id);
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
  }, [ensureAudioReady, getPracticeSequence, resetScore, selectedCategory, selectedPentatonic, setState, spawnShooterTarget, startMic]);

  const pauseGame = useCallback(() => {
    if (gameStateRef.current !== GAME_STATES.PLAYING) return;
    setState(GAME_STATES.PAUSED);
    setFeedback("Paused");
  }, [setState]);

  const resumeGame = useCallback(async () => {
    if (gameStateRef.current !== GAME_STATES.PAUSED) return;
    await ensureAudioReady();
    lastFrameRef.current = performance.now();
    setState(GAME_STATES.PLAYING);
    setFeedback("Play");
  }, [ensureAudioReady, setState]);

  const restartGame = useCallback(async () => {
    const microphoneReady = streamRef.current || (await startMic());
    if (!microphoneReady) return;
    await ensureAudioReady();
    const safeCategory = getPlayableCategory(selectedCategory);
    const sequence = getPracticeSequence(safeCategory);
    const modeToRestart = appModeRef.current === APP_MODES.SHOOTER ? APP_MODES.SHOOTER : APP_MODES.PRACTICE;
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
  }, [ensureAudioReady, getPlayableCategory, getPracticeSequence, repeatPractice, resetScore, selectedCategory, selectedPentatonic, setState, spawnShooterTarget, startMic]);

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

  const stopMicrophone = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    bufferRef.current = null;
    setDetected(null);
    setDetectedPitch(null);
    tunerCandidateRef.current = { name: null, count: 0 };
    lockedTunerStringRef.current = null;
    smoothedCentsRef.current = 0;
    lastStableNoteRef.current = null;
    lastStableFrequencyRef.current = null;
    lastStableCentsRef.current = 0;
    lastStableTargetRef.current = null;
    lastDetectedTimeRef.current = 0;
    setTunerReading(EMPTY_TUNER_READING);
    setSignalLevel(0);
    setMicStatus("No Signal");
    setState(GAME_STATES.IDLE);
    setFeedback("Mic Stopped");
  }, [setState]);

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
    setBeat(0);
    setFeedback("Ready");
    setState(streamRef.current ? GAME_STATES.LISTENING : GAME_STATES.IDLE);
  }, [setState]);

  const backToTuner = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    bufferRef.current = null;
    appModeRef.current = APP_MODES.TUNER;
    setAppMode(APP_MODES.TUNER);
    enemiesRef.current = [];
    setEnemies([]);
    setBeat(0);
    setDetected(null);
    setDetectedPitch(null);
    tunerCandidateRef.current = { name: null, count: 0 };
    lockedTunerStringRef.current = null;
    smoothedCentsRef.current = 0;
    lastStableNoteRef.current = null;
    lastStableFrequencyRef.current = null;
    lastStableCentsRef.current = 0;
    lastStableTargetRef.current = null;
    lastDetectedTimeRef.current = 0;
    setTunerReading(EMPTY_TUNER_READING);
    setSignalLevel(0);
    setMicStatus("No Signal");
    setFeedback("Tune Up");
    setState(GAME_STATES.IDLE);
  }, [setState]);

  const showCurriculum = useCallback(() => {
    appModeRef.current = APP_MODES.CURRICULUM;
    setAppMode(APP_MODES.CURRICULUM);
    enemiesRef.current = [];
    setEnemies([]);
    setBeat(0);
    setFeedback("Choose a practice card");
    setState(streamRef.current ? GAME_STATES.LISTENING : GAME_STATES.IDLE);
  }, [setState]);

  const showShooterMode = useCallback(() => {
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

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    appModeRef.current = appMode;
  }, [appMode]);

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
    metronomeOnRef.current = metronomeOn;
  }, [metronomeOn]);

  useEffect(() => {
    shooterSoundOnRef.current = shooterSoundOn;
  }, [shooterSoundOn]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 680px)");
    const updateMobileLayout = () => {
      isMobileLayoutRef.current = mediaQuery.matches;
      setIsMobileLayout(mediaQuery.matches);
    };
    updateMobileLayout();
    mediaQuery.addEventListener?.("change", updateMobileLayout);
    return () => mediaQuery.removeEventListener?.("change", updateMobileLayout);
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
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioRef.current?.close();
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
    if (fret === 0) return "30px";
    const exactIndex = visibleFrets.indexOf(fret);
    const fretIndex = exactIndex >= 0
      ? exactIndex
      : visibleFrets
          .map((visibleFret, index) => ({ index, distance: Math.abs(visibleFret - fret) }))
          .sort((a, b) => a.distance - b.distance)[0]?.index ?? 0;
    const ratio = ((fretIndex + 0.5) / visibleFrets.length).toFixed(4);
    return `calc(42px + (100% - 52px) * ${ratio})`;
  }, [visibleFrets]);
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
    const sequence = Array.isArray(sequenceRef.current) && sequenceRef.current.length > 0
      ? sequenceRef.current
      : DEFAULT_CATEGORY.sequence;
    const noteList =
      Array.isArray(activeNotesRef.current) && activeNotesRef.current.length > 0
        ? activeNotesRef.current
        : DEFAULT_CATEGORY.notes;
    return Array.from({ length: 5 }, (_, index) => {
      const startIndex = patternRef.current % sequence.length;
      const sequenceStep = sequence[(startIndex + index) % sequence.length];
      const noteName = getSequenceStepNoteName(sequenceStep);
      const note = noteList.find((item) => item.pitch === noteName) ?? DEFAULT_CATEGORY.notes[0];
      return { ...note, ghost: Boolean(sequenceStep?.ghost) };
    });
  }, [enemies, selectedCategoryId, scaleDirection, selectedPentatonic.sequence]);
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
  const referenceDisplayPrompt = isMobileLayout ? null : referencePrompt;
  const detectedReferenceScaleNote = isMobileLayout ? null : detectedScaleNote;
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

  return (
    <main
      className={`app notranslate ${appMode === APP_MODES.MENU ? "menuApp" : ""} ${isSignalActive ? "signalGlow" : ""}`}
      translate="no"
    >
      {appMode !== APP_MODES.MENU && <section className="hud">
        <div>
          <p className="eyebrow">Guitar Fretboard Training</p>
          <h1>
            {appMode === APP_MODES.TUNER
              ? "튜너"
              : appMode === APP_MODES.CURRICULUM
                ? "프렛보드 트레이너"
              : appMode === APP_MODES.SHOOTER
                ? "슈팅게임"
                : selectedCategory.title}
          </h1>
        </div>
        <div className="modeSwitch">
          <button
            className={appMode === APP_MODES.TUNER ? "selected" : ""}
            onClick={backToTuner}
            type="button"
          >
            튜너
          </button>
          <button
            className={appMode === APP_MODES.CURRICULUM || appMode === APP_MODES.PRACTICE ? "selected" : ""}
            onClick={showCurriculum}
            type="button"
          >
            프렛보드
          </button>
          <button
            className={appMode === APP_MODES.SHOOTER ? "selected" : ""}
            onClick={showShooterMode}
            translate="no"
            type="button"
          >
            슈팅게임
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
            <span>Guitar Fretboard Training</span>
            <h1>프렛보드 트레이너</h1>
            <p>튜닝부터 Open String, Position, Scale, Pentatonic Box까지 단계별로 익혀요.</p>
          </div>

          <div className="hubGuitarHead" aria-hidden="true">
            <i className="hubHeadBody" />
            <i className="hubNeck" />
            <span className="peg pegLeft top" />
            <span className="peg pegLeft mid" />
            <span className="peg pegLeft bottom" />
            <span className="peg pegRight top" />
            <span className="peg pegRight mid" />
            <span className="peg pegRight bottom" />
            <span className="hubString s1" />
            <span className="hubString s2" />
            <span className="hubString s3" />
            <span className="hubString s4" />
            <span className="hubString s5" />
            <span className="hubString s6" />
          </div>

          <div className="hubMenuPanel">
            <button className="hubMenuButton tuner" onClick={backToTuner} type="button">
              <span>01</span>
              <strong>튜너</strong>
              <small>Practice Tuner · 기준음 확인</small>
            </button>
            <button className="hubMenuButton rhythm" onClick={showCurriculum} type="button">
              <span>02</span>
              <strong>프렛보드 트레이너</strong>
              <small>Position · Scale · Pentatonic Box</small>
            </button>
            <button
              aria-label="슈팅게임"
              className="hubMenuButton shooter notranslate"
              onClick={showShooterMode}
              title="슈팅게임"
              translate="no"
              type="button"
            >
              <span>03</span>
              <strong>슈팅게임</strong>
              <small>Fretboard Recognition · 반응 훈련</small>
            </button>
          </div>

          <div className="hubSecondary">
            <button disabled type="button">기록 준비중</button>
            <button disabled type="button">설정 준비중</button>
          </div>
        </section>
      ) : appMode === APP_MODES.TUNER ? (
        <section className="tunerStage" aria-label="Guitar tuner">
          <div className={`proTuner ${tunerReading.tone}`}>
            <div className="tunerHeroHeader">
              <div>
                <span>튜너</span>
                <small>{tunerReading.frequency ? `${tunerReading.frequency.toFixed(1)} Hz` : "소리를 기다리는 중"}</small>
              </div>
              <div className="tunerHeaderControls buttons">
                <button className="primary" onClick={startTuner} type="button">
                  <Mic size={16} />
                  시작
                </button>
                <button onClick={stopMicrophone} type="button" disabled={!hasMic}>
                  <MicOff size={16} />
                  정지
                </button>
              </div>
            </div>

            <div
              className="movingTunerMeter"
              style={{ "--note-offset": `${tunerNeedle * 2.65}px` }}
            >
              <div className="tunerSideLabels" aria-hidden="true">
                <span>← 낮음</span>
                <strong>OK</strong>
                <span>높음 →</span>
              </div>
              <div className="tunerColorField" aria-hidden="true">
                <span className="lowField" />
                <span className="centerField" />
                <span className="highField" />
              </div>
              <div className="fixedCenterLine" aria-hidden="true">
                <span />
              </div>
              <div className="centerOkHalo" aria-hidden="true">OK</div>
              <div className={`movingDetectedNote ${tunerReading.tone}`}>
                <strong>{tunerReading.detectedNote}</strong>
                <span>{tunerReading.frequency ? `${tunerReading.frequency.toFixed(1)} Hz` : "--"}</span>
              </div>
              <div className="tunerGuitarHead" aria-hidden="true">
                <i />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              {tunerReading.tone === "good" && <div className="okBadge">OK</div>}
            </div>
          </div>

          <div className="modeHelper tunerHelper">
            이 튜너는 연습과 참고용입니다. 정확한 조율은 전용 클립 튜너를 사용하세요.
          </div>

          <div className="tunerDeviceFooter">
            <div className="tunerSignal">
              <div className="meterHeader">
                <span>신호 세기</span>
                <strong>{Math.round(signalLevel * 100)}%</strong>
              </div>
              <div className="meter">
                <span style={{ width: `${Math.round(signalLevel * 100)}%` }} />
              </div>
            </div>

            <div className="tunerMicControls buttons playbackButtons">
              <button className="primary" onClick={startTuner} type="button">
                <Mic size={18} />
                시작
              </button>
              <button onClick={stopMicrophone} type="button" disabled={!hasMic}>
                <MicOff size={18} />
                정지
              </button>
            </div>
          </div>
        </section>
      ) : appMode === APP_MODES.CURRICULUM ? (
        <section className="curriculum" aria-label="Beginner curriculum">
          <div className="curriculumHeader">
            <span>연습 목차</span>
            <strong>{selectedCategory.title}</strong>
            <small>한 번 클릭은 선택, 선택된 카드를 한 번 더 누르면 연습 화면으로 들어가요.</small>
          </div>

          <div className="trainingGrid">
          {PRACTICE_CATEGORIES.map((category, index) => (
            <button
              aria-pressed={selectedCategoryId === category.id}
              className={`trainingCard ${category.tutorial ? "tutorialCard" : ""} ${category.featured ? "featuredCard" : ""} ${category.unavailable ? "comingSoonCard" : ""} ${selectedCategoryId === category.id ? "selected" : ""}`}
              key={category.id}
              onClick={() => {
                if (isMobileLayout && selectedCategoryId === category.id && !category.unavailable) {
                  enterPracticePreview(category);
                  return;
                }
                setSelectedCategoryId(category.id);
                setFeedback("Choose a practice card");
              }}
              onDoubleClick={() => enterPracticePreview(category)}
              type="button"
            >
              <span>{category.tutorial ? "튜토리얼" : `${index}단계`}</span>
              <strong>{category.title}</strong>
              <small>{category.subtitle}</small>
              <em>{category.modeLabel}</em>
              <b>
                {category.unavailable
                  ? "미구현 · 준비중"
                  : selectedCategoryId === category.id
                    ? category.featured ? "메인 연습 · 선택됨" : "선택됨"
                    : category.featured ? "메인 연습" : category.tutorial ? "튜토리얼" : "선택"}
              </b>
            </button>
          ))}
          </div>

          <div className="curriculumActions">
            <div>
              <span>선택한 연습</span>
              <strong>{selectedCategory.title}</strong>
            </div>
            <button
              className="primary"
              disabled={selectedCategory.unavailable}
              onClick={() => enterPracticePreview(selectedCategory)}
              type="button"
            >
              <Play size={18} />
              {selectedCategory.unavailable ? "준비중" : "접속"}
            </button>
            <button onClick={startMic} type="button">
              <Mic size={18} />
              마이크
            </button>
          </div>
        </section>
      ) : appMode === APP_MODES.SHOOTER ? (
        <section className="shooterPanel" aria-label="슈팅게임">
          <div className="shooterGameHud">
            <div>
              <span>성공</span>
              <strong>{hits}</strong>
            </div>
            <div>
              <span>점수</span>
              <strong>{score}</strong>
            </div>
            <div>
              <span>목표 음</span>
              <strong>{shooterTarget ? `${getSolfege(shooterTarget.note)} / ${shooterTarget.note}` : "준비"}</strong>
            </div>
            <div>
              <span>레벨</span>
              <strong>{shooterLevel.name}</strong>
            </div>
            <div className="shooterLivesHud">
              <span>목숨</span>
              <strong className="lifeHearts" aria-label={`남은 목숨 ${shooterLives}`}>
                {Array.from({ length: SHOOTER_MAX_LIVES }, (_, index) => (
                  <i className={index < shooterLives ? "active" : ""} key={index}>♥</i>
                ))}
              </strong>
            </div>
          </div>

          <div className="modeHelper shooterHelper">
            반복 연습으로 지판 인식과 피킹 정확도를 함께 키워보세요.
          </div>

          <div className={`shooterFretGuide ${showShooterFretGuide ? "" : "collapsed"}`}>
            <div>
              <span>목표음 지판</span>
              <strong className="guidePitch">
                {showShooterFretGuide && shooterGuidePitch
                  ? `${shooterGuidePitch} · ${getSolfege(shooterGuidePitch) || getPitchClass(shooterGuidePitch)}`
                  : "숨김"}
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
              {showShooterFretGuide ? "안보이게" : "보이게"}
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
              return <span className="musicParticle" key={particle.id} style={{ left: `${x}%`, top: `${y}%` }}>♪</span>;
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
                {gameState === GAME_STATES.GAMEOVER && <span>시작을 눌러 다시 연습하세요</span>}
                <button className="mobileShooterStartButton primary" onClick={() => startShooter(selectedCategory)} type="button">
                  <Play size={18} />
                  시작
                </button>
              </div>
            )}
          </div>

        </section>
      ) : (
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
                      <span>키</span>
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
                      aria-label="반복 횟수 늘리기"
                      disabled={repeatCount >= MAX_REPEAT_COUNT}
                      onClick={() => changeRepeatCount(repeatCount + 1)}
                      type="button"
                    >
                      ▲
                    </button>
                    <button
                      aria-label="반복 횟수 줄이기"
                      disabled={repeatCount <= MIN_REPEAT_COUNT}
                      onClick={() => changeRepeatCount(repeatCount - 1)}
                      type="button"
                    >
                      ▼
                    </button>
                  </div>
                  <small>회</small>
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
            <div className={`detector ${isSignalActive ? "active" : ""}`}>
              <Radio size={20} />
              <div>
                <span>감지된 음</span>
                <strong>{detected ? detected.pitch : "--"}</strong>
              </div>
              <small>
                {detectedPitch
                  ? `${detectedPitch.frequency.toFixed(1)} Hz / ${detected?.cents ?? 0} cents`
                  : "신호를 기다리는 중"}
              </small>
            </div>

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
              <button onClick={startMic} type="button">
                <Mic size={18} />
                마이크
              </button>
            </div>
          </div>
          </div>

            <div className="practiceQueueRow">
              <div className="rhythmHelperStack">
                <p className="modeHelper">
                  같은 음은 여러 위치에 있을 수 있어요. 참고지판을 보면서 따라가세요.
                </p>
                {selectedCategory.id === "scale-block" && (
                  <p className="modeHelper">
                    이론 암기보다 리듬과 손가락 컨트롤에 집중하세요.
                  </p>
                )}
              </div>
              {currentPrompt && (
                <div className="practiceHint">
              <span>연주할 음</span>
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
                    const isRoot = note.noteName === selectedScaleRoot;
                    const isActive =
                      referenceDisplayPrompt?.pitch === note.pitch &&
                      referenceDisplayPrompt?.stringNumber === note.stringNumber &&
                      referenceDisplayPrompt?.fretNumber === note.fretNumber;
                    return (
                      <span
                      className={`scaleNote ${isRoot ? "root" : ""} ${isActive ? "active" : ""} ${detectedReferenceScaleNote && isActive ? "detectedActive" : ""}`}
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
                    ? "지금 친 음이 선택한 박스에서 빛나고 있어요."
                    : `${selectedPentatonic.label} 안에서 연주할 줄과 프렛을 확인하세요.`
                  : referenceDisplayPrompt?.hint ?? "다음 음의 줄과 프렛을 확인하세요."}
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
                <span>음 정확도</span>
                <strong>{noteAccuracy}%</strong>
              </div>
              <div className="summaryCards">
                <div>
                  <span>총 연주 수</span>
                  <strong>{attempts}</strong>
                </div>
                <div>
                  <span>완벽 판정</span>
                  <strong>{perfectCount}</strong>
                </div>
                <div>
                  <span>실패 수</span>
                  <strong>{missCount}</strong>
                </div>
                <div>
                  <span>가장 많이 틀린 음</span>
                  <strong>{mostMissedNote}</strong>
                </div>
              </div>
            </aside>
            )}
          </div>
        </section>
      )}

      {appMode === APP_MODES.SHOOTER && <section className="controlBar compactControls shooterControlBar">
        <div className={`detector ${isSignalActive ? "active" : ""}`}>
          <Radio size={20} />
          <div>
            <span>감지된 음</span>
            <strong>{detected ? detected.pitch : "--"}</strong>
          </div>
          <small>
            {detectedPitch
              ? `${detectedPitch.frequency.toFixed(1)} Hz / ${detected?.cents ?? 0} cents`
              : "신호를 기다리는 중"}
          </small>
        </div>

        <div className="buttons playbackButtons">
          {appMode === APP_MODES.TUNER && (
            <>
              <button className="primary" onClick={startTuner} type="button">
                <Mic size={18} />
                시작
              </button>
              <button onClick={stopMicrophone} type="button" disabled={!hasMic}>
                <MicOff size={18} />
                정지
              </button>
            </>
          )}

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
              <button onClick={startMic} type="button">
                <Mic size={18} />
                마이크
              </button>
            </>
          )}

          {appMode === APP_MODES.SHOOTER && (
            <>
              <button className="primary" onClick={() => startShooter(selectedCategory)} type="button">
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
            <span>입력 레벨</span>
            <strong>{Math.round(signalLevel * 100)}%</strong>
          </div>
          <div className="meter">
            <span style={{ width: `${Math.round(signalLevel * 100)}%` }} />
          </div>
          {showLowSignalWarning && <p>마이크 볼륨이 낮아요. 기타를 조금 더 가까이 하거나 입력 볼륨을 올려보세요.</p>}
        </div>
        <div className="debugGrid">
          <div>
            <span>주파수</span>
            <strong>{detectedPitch ? `${detectedPitch.frequency.toFixed(1)} Hz` : "--"}</strong>
          </div>
          <div>
            <span>음</span>
            <strong>{detectedPitch ? detectedPitch.note : "--"}</strong>
          </div>
          <div>
            <span>목표 옥타브 음</span>
            <strong>{debugTargetNote?.octaveNote ?? debugTargetNote?.name ?? "--"}</strong>
          </div>
          <div>
            <span>감지 옥타브 음</span>
            <strong>{detected?.octaveNote ?? detected?.name ?? "--"}</strong>
          </div>
          <div>
            <span>목표 주파수</span>
            <strong>{debugTargetNote?.frequency ? `${debugTargetNote.frequency.toFixed(2)} Hz` : "--"}</strong>
          </div>
          <div>
            <span>감지 주파수</span>
            <strong>{detectedPitch ? `${detectedPitch.frequency.toFixed(2)} Hz` : "--"}</strong>
          </div>
          <div>
            <span>줄/프렛</span>
            <strong>{debugTargetNote ? `${debugTargetNote.stringNumber}번줄 ${getFretLabel(debugTargetNote)}` : "--"}</strong>
          </div>
          <div>
            <span>판정 모드</span>
            <strong>{currentJudgmentMode.shortLabel}</strong>
          </div>
          <div>
            <span>신호</span>
            <strong>{signalLevel.toFixed(3)}</strong>
          </div>
          <div>
            <span>신뢰도</span>
            <strong>{Math.round(tunerReading.confidence * 100)}%</strong>
          </div>
          <div>
            <span>현재 BPM</span>
            <strong>{bpm}</strong>
          </div>
          <div>
            <span>연습 단계</span>
            <strong>{appMode === APP_MODES.PRACTICE || appMode === APP_MODES.SHOOTER ? selectedCategory.title : t(appMode)}</strong>
          </div>
        </div>
      </section>}
    </main>
  );
}

export default App;
