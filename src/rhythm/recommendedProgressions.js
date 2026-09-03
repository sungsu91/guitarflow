export const RECOMMENDED_BASS_ROLES = Object.freeze({
  ROOT: "R",
  THIRD: "3",
  FIFTH: "5",
  OCTAVE: "8",
  FLAT_SEVENTH: "b7",
  APPROACH: "A",
  NEXT_ROOT: "N",
  REST: "REST",
});

export const RECOMMENDED_PIANO_ACTIONS = Object.freeze({
  CHORD: "CHORD",
  STAB: "STAB",
  HOLD: "HOLD",
  ARP_UP: "ARP_UP",
  ARP_DOWN: "ARP_DOWN",
  REST: "REST",
});

const bar = (steps) => steps;
const repeatBar = (steps, count) => Array.from({ length: count }, () => steps);

const popDrumBar = bar({
  kick: [0, 8],
  snare: [4, 12],
  closedHat: [0, 2, 4, 6, 8, 10, 12, 14],
  shaker: [],
});

const rootFifthOctaveApproach = bar([
  { step: 0, role: "R" },
  { step: 4, role: "5" },
  { step: 8, role: "8" },
  { step: 12, role: "A" },
]);

const chordStabBar = bar([
  { step: 0, action: "CHORD" },
  { step: 6, action: "STAB" },
  { step: 8, action: "CHORD" },
  { step: 14, action: "STAB" },
]);

const PRESETS = [
  {
    id: "recommended-bright-start",
    title: "밝은 시작",
    description: "밝고 기본적인 팝 리듬 연습",
    key: "C",
    bpm: 92,
    timeSignature: "4/4",
    progression: [
      { chord: "C", beats: 4 },
      { chord: "Am", beats: 4 },
      { chord: "F", beats: 4 },
      { chord: "G", beats: 4 },
    ],
    drumPreset: {
      id: "bright-pop-16",
      label: "Bright Pop 16",
      bars: [
        popDrumBar,
        popDrumBar,
        popDrumBar,
        bar({ ...popDrumBar, snare: [4, 12, 14, 15] }),
      ],
    },
    bassPreset: {
      id: "pop-root-pulse",
      label: "Pop Root Pulse",
      bars: repeatBar(bar([
        { step: 0, role: "R" },
        { step: 4, role: "8" },
        { step: 8, role: "5" },
        { step: 12, role: "A" },
      ]), 4),
    },
    pianoPreset: {
      id: "warm-pop-stab",
      label: "Warm Pop Stab",
      bars: repeatBar(chordStabBar, 4),
    },
  },
  {
    id: "recommended-warm-cycle",
    title: "따뜻한 순환",
    description: "어쿠스틱 팝 · 부드러운 스트럼",
    key: "C",
    bpm: 96,
    timeSignature: "4/4",
    progression: [
      { chord: "C", beats: 4 },
      { chord: "G", beats: 4 },
      { chord: "Am", beats: 4 },
      { chord: "F", beats: 4 },
    ],
    drumPreset: {
      id: "acoustic-pop-8",
      label: "Acoustic Pop 8",
      bars: [
        ...repeatBar(bar({ kick: [0, 8], snare: [4, 12], closedHat: [], shaker: [0, 2, 4, 6, 8, 10, 12, 14] }), 3),
        bar({ kick: [0, 8], snare: [4, 12, 14], closedHat: [], shaker: [0, 2, 4, 6, 8, 10, 12, 14] }),
      ],
    },
    bassPreset: { id: "gentle-walk", label: "Gentle Walk", bars: repeatBar(rootFifthOctaveApproach, 4) },
    pianoPreset: {
      id: "light-arpeggio",
      label: "Light Arpeggio",
      bars: repeatBar(bar([
        { step: 0, action: "ARP_UP" },
        { step: 4, action: "ARP_DOWN" },
        { step: 8, action: "ARP_UP" },
        { step: 12, action: "HOLD" },
      ]), 4),
    },
  },
  {
    id: "recommended-power-pop-rock",
    title: "힘있는 팝록",
    description: "밴드 스트럼 · 중간 템포 록",
    key: "G",
    bpm: 112,
    timeSignature: "4/4",
    progression: [
      { chord: "G", beats: 4 },
      { chord: "D", beats: 4 },
      { chord: "Em", beats: 4 },
      { chord: "C", beats: 4 },
    ],
    drumPreset: {
      id: "pop-rock-16",
      label: "Pop Rock 16",
      bars: [
        ...repeatBar(bar({ kick: [0, 8, 10], snare: [4, 12], closedHat: [0, 2, 4, 6, 8, 10, 12, 14], shaker: [3, 7, 11, 15] }), 3),
        bar({ kick: [0, 8, 10], snare: [4, 12, 13, 14, 15], closedHat: [0, 2, 4, 6, 8, 10], shaker: [3, 7, 11] }),
      ],
    },
    bassPreset: {
      id: "rock-drive",
      label: "Rock Drive",
      bars: repeatBar(bar([
        { step: 0, role: "R" },
        { step: 4, role: "5" },
        { step: 8, role: "8" },
        { step: 12, role: "5" },
      ]), 4),
    },
    pianoPreset: { id: "rock-stab", label: "Rock Stab", bars: repeatBar(chordStabBar, 4) },
  },
  {
    id: "recommended-soul-groove",
    title: "소울 그루브",
    description: "2박 단위 코드 전환 연습 · 부드러운 소울",
    key: "C",
    bpm: 88,
    timeSignature: "4/4",
    progression: [
      { chord: "Cmaj7", beats: 2 },
      { chord: "Am7", beats: 2 },
      { chord: "Dm7", beats: 2 },
      { chord: "G7", beats: 2 },
    ],
    drumPreset: {
      id: "soft-soul-16",
      label: "Soft Soul 16",
      bars: repeatBar(bar({
        kick: [0, 8],
        snare: [4, 12],
        closedHat: Array.from({ length: 16 }, (_, index) => index),
        shaker: [],
      }), 2),
    },
    bassPreset: {
      id: "soul-step",
      label: "Soul Step",
      bars: repeatBar(bar([
        { step: 0, role: "R" },
        { step: 4, role: "5" },
        { step: 8, role: "R" },
        { step: 12, role: "5" },
      ]), 2),
    },
    pianoPreset: {
      id: "soul-comp",
      label: "Soul Comp",
      bars: repeatBar(bar([
        { step: 0, action: "CHORD" },
        { step: 6, action: "STAB" },
        { step: 8, action: "CHORD" },
        { step: 14, action: "STAB" },
      ]), 2),
    },
  },
  {
    id: "recommended-fast-changes",
    title: "빠른 전환",
    description: "2박 + 1박 + 1박 코드 전환 연습",
    key: "C",
    bpm: 104,
    timeSignature: "4/4",
    progression: [
      { chord: "C", beats: 2 },
      { chord: "Am", beats: 1 },
      { chord: "G", beats: 1 },
      { chord: "F", beats: 4 },
    ],
    drumPreset: {
      id: "clear-change-pop",
      label: "Clear Change Pop",
      bars: repeatBar(popDrumBar, 2),
    },
    bassPreset: {
      id: "change-marker",
      label: "Change Marker",
      bars: [
        bar([
          { step: 0, role: "R" },
          { step: 4, role: "5" },
          { step: 8, role: "R" },
          { step: 12, role: "R" },
        ]),
        bar([{ step: 0, role: "R" }, { step: 8, role: "5" }]),
      ],
    },
    pianoPreset: {
      id: "change-stab",
      label: "Change Stab",
      bars: [
        bar([
          { step: 0, action: "CHORD" },
          { step: 6, action: "STAB" },
          { step: 8, action: "CHORD" },
          { step: 12, action: "CHORD" },
        ]),
        bar([{ step: 0, action: "HOLD" }]),
      ],
    },
  },
  {
    id: "recommended-tension-release",
    title: "긴장과 해소",
    description: "2박 단위 자연스러운 진행 연습",
    key: "C",
    bpm: 84,
    timeSignature: "4/4",
    progression: [
      { chord: "Dm", beats: 2 },
      { chord: "G", beats: 2 },
      { chord: "C", beats: 2 },
      { chord: "Am", beats: 2 },
    ],
    drumPreset: { id: "smooth-pop-8", label: "Smooth Pop 8", bars: repeatBar(popDrumBar, 2) },
    bassPreset: {
      id: "two-beat-motion",
      label: "Two Beat Motion",
      bars: repeatBar(bar([
        { step: 0, role: "R" },
        { step: 4, role: "A" },
        { step: 8, role: "R" },
        { step: 12, role: "A" },
      ]), 2),
    },
    pianoPreset: {
      id: "half-bar-comp",
      label: "Half Bar Comp",
      bars: repeatBar(bar([
        { step: 0, action: "CHORD" },
        { step: 6, action: "STAB" },
        { step: 8, action: "CHORD" },
        { step: 14, action: "STAB" },
      ]), 2),
    },
  },
  {
    id: "recommended-blues-walk",
    title: "블루스 워크",
    description: "12마디 블루스 기본형 · 루프 턴어라운드",
    key: "A",
    bpm: 104,
    timeSignature: "4/4",
    progression: [
      { chord: "A7", beats: 4 }, { chord: "D7", beats: 4 },
      { chord: "A7", beats: 4 }, { chord: "A7", beats: 4 },
      { chord: "D7", beats: 4 }, { chord: "D7", beats: 4 },
      { chord: "A7", beats: 4 }, { chord: "A7", beats: 4 },
      { chord: "E7", beats: 4 }, { chord: "D7", beats: 4 },
      { chord: "A7", beats: 2 }, { chord: "E7", beats: 2 },
    ],
    drumPreset: {
      id: "basic-blues-shuffle",
      label: "Basic Blues Shuffle",
      swing: 2 / 3,
      bars: [
        ...repeatBar(popDrumBar, 11),
        bar({ ...popDrumBar, snare: [4, 12, 14, 15] }),
      ],
    },
    bassPreset: {
      id: "blues-walk",
      label: "Blues Walk",
      swing: 2 / 3,
      bars: repeatBar(bar([
        { step: 0, role: "R" },
        { step: 4, role: "3" },
        { step: 8, role: "5" },
        { step: 12, role: "b7" },
      ]), 12),
    },
    pianoPreset: {
      id: "blues-comp",
      label: "Blues Comp",
      swing: 2 / 3,
      bars: repeatBar(bar([
        { step: 0, action: "STAB" },
        { step: 6, action: "STAB" },
        { step: 8, action: "STAB" },
        { step: 14, action: "STAB" },
      ]), 12),
    },
  },
].map((preset) => ({
  ...preset,
  loopLength: {
    beats: preset.progression.reduce((total, item) => total + item.beats, 0),
    measures: preset.progression.reduce((total, item) => total + item.beats, 0) / Number(preset.timeSignature.split("/")[0]),
  },
  intro: false,
  loop: true,
  ending: false,
}));

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export const RHYTHM_RECOMMENDED_PROGRESSIONS = deepFreeze(PRESETS);

const BASS_RUNTIME_ROLE = Object.freeze({
  R: "root",
  3: "third",
  5: "fifth",
  8: "octave",
  b7: "flatSeventh",
  A: "approach",
  N: "nextRoot",
  REST: "rest",
});

const PIANO_RUNTIME_ACTION = Object.freeze({
  CHORD: "chord",
  STAB: "stab",
  HOLD: "hold",
  ARP_UP: "arpUp",
  ARP_DOWN: "arpDown",
  REST: "rest",
});

function booleanSteps(indexes = []) {
  const active = new Set(indexes);
  return Array.from({ length: 16 }, (_, index) => active.has(index));
}

function createRuntimeDrumBar(source = {}) {
  return Object.fromEntries(["kick", "snare", "rim", "closedHat", "shaker"].map((part) => [
    part,
    booleanSteps(source[part]),
  ]));
}

function createRuntimeBassBar(source = []) {
  const steps = Array.from({ length: 16 }, () => "rest");
  source.forEach(({ step, role }) => {
    if (Number.isInteger(step) && step >= 0 && step < steps.length) {
      steps[step] = BASS_RUNTIME_ROLE[role] ?? "rest";
    }
  });
  return steps;
}

function createRuntimePianoBar(source = []) {
  const steps = Array.from({ length: 16 }, () => ({ active: false, style: "chord" }));
  source.forEach(({ step, action, level }) => {
    if (!Number.isInteger(step) || step < 0 || step >= steps.length) return;
    const style = PIANO_RUNTIME_ACTION[action] ?? "rest";
    steps[step] = style === "rest"
      ? { active: false, style: "chord" }
      : {
          active: true,
          style,
          ...(Number.isFinite(Number(level)) ? { level: Number(level) } : {}),
        };
  });
  return steps;
}

export function createRecommendedAccompanimentPatterns(preset) {
  if (!preset) return null;
  const drumBars = preset.drumPreset.bars.map(createRuntimeDrumBar);
  const bassBars = preset.bassPreset.bars.map(createRuntimeBassBar);
  const pianoBars = preset.pianoPreset.bars.map(createRuntimePianoBar);
  return {
    drum: {
      type: "drum",
      version: 1,
      presetId: preset.drumPreset.id,
      displayName: preset.drumPreset.label,
      level: preset.drumPreset.level ?? 1,
      ...(preset.drumPreset.instrumentLevels
        ? { instrumentLevels: { ...preset.drumPreset.instrumentLevels } }
        : {}),
      swing: preset.drumPreset.swing ?? 0,
      steps: drumBars[0],
      barSteps: drumBars,
    },
    bass: {
      type: "bass",
      version: 1,
      presetId: preset.bassPreset.id,
      displayName: preset.bassPreset.label,
      level: preset.bassPreset.level ?? 1,
      swing: preset.bassPreset.swing ?? 0,
      steps: bassBars[0],
      barSteps: bassBars,
    },
    piano: {
      type: "piano",
      version: 1,
      presetId: preset.pianoPreset.id,
      displayName: preset.pianoPreset.label,
      level: preset.pianoPreset.level ?? 1,
      voicing: preset.pianoPreset.voicing ?? "guideTones",
      swing: preset.pianoPreset.swing ?? 0,
      steps: pianoBars[0],
      barSteps: pianoBars,
    },
  };
}
