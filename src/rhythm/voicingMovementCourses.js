const STRING_COUNT = 6;
const MAX_FRET = 24;

const lightDrumBar = Object.freeze({
  kick: Object.freeze([0]),
  snare: Object.freeze([8]),
  closedHat: Object.freeze([0, 4, 8, 12]),
  shaker: Object.freeze([]),
});

const softJazzDrumBar = Object.freeze({
  kick: Object.freeze([0, 8]),
  rim: Object.freeze([4, 12]),
  snare: Object.freeze([]),
  closedHat: Object.freeze([]),
  shaker: Object.freeze([0, 2, 4, 6, 8, 10, 12, 14]),
});

const softJazzEndingDrumBar = Object.freeze({
  kick: Object.freeze([]),
  rim: Object.freeze([]),
  snare: Object.freeze([]),
  closedHat: Object.freeze([]),
  shaker: Object.freeze([0, 2, 4, 6, 8, 10, 12, 14]),
});

const softJazzBassBar = Object.freeze([
  Object.freeze({ step: 0, role: "R" }),
  Object.freeze({ step: 8, role: "5" }),
  Object.freeze({ step: 12, role: "N" }),
  Object.freeze({ step: 15, role: "REST" }),
]);

const softJazzPianoBar = Object.freeze([
  Object.freeze({ step: 0, action: "STAB" }),
  Object.freeze({ step: 6, action: "STAB", level: 0.52 }),
  Object.freeze({ step: 8, action: "STAB" }),
  Object.freeze({ step: 14, action: "REST" }),
]);

const rootBassBar = Object.freeze([
  Object.freeze({ step: 0, role: "R" }),
]);

const guideTonePianoBar = Object.freeze([
  Object.freeze({ step: 0, action: "HOLD" }),
]);

function normalizeStringValue(value) {
  const normalized = String(value ?? "x").trim().toLowerCase();
  if (normalized === "x") return "x";
  if (normalized === "o") return "0";
  const fret = Math.round(Number(normalized));
  return Number.isFinite(fret) && fret >= 0 && fret <= MAX_FRET ? String(fret) : "x";
}

export function normalizeVoicingStrings(strings = []) {
  return Array.from({ length: STRING_COUNT }, (_, index) => normalizeStringValue(strings[index]));
}

export function createVoicingFretboard(slot = {}) {
  const strings = normalizeVoicingStrings(slot.strings);
  const notes = [];
  const stringStates = {};
  strings.forEach((value, index) => {
    const stringNumber = STRING_COUNT - index;
    if (value === "x") {
      stringStates[stringNumber] = "x";
      return;
    }
    const fretNumber = Number(value);
    notes.push({ stringNumber, fretNumber });
    if (fretNumber === 0) stringStates[stringNumber] = "o";
  });
  const barres = Array.isArray(slot.barres) ? slot.barres.map((barre) => ({ ...barre })) : [];
  return {
    notes,
    barres,
    stringStates,
  };
}

function createCourseAccompanimentPresets(id, measureCount) {
  const bars = Math.max(1, measureCount);
  return {
    drumPreset: {
      id: `${id}-light-drums`,
      label: "Voicing Light Drums",
      bars: Array.from({ length: bars }, () => lightDrumBar),
    },
    bassPreset: {
      id: `${id}-root-bass`,
      label: "Root Support Bass",
      bars: Array.from({ length: bars }, () => rootBassBar),
    },
    pianoPreset: {
      id: `${id}-guide-tones`,
      label: "Guide Tone Pad",
      bars: Array.from({ length: bars }, () => guideTonePianoBar),
    },
  };
}

function getVoicingType(chord = "") {
  const label = String(chord);
  if (/m7(?:b5|♭5)$/i.test(label)) return "full-m7b5";
  if (/maj7$/i.test(label)) return "full-maj7";
  if (/m7$/i.test(label)) return "full-m7";
  if (/7$/i.test(label)) return "full-7th";
  if (/m$/i.test(label)) return "full-minor";
  return "full-major";
}

function createLearningSlot({
  barres = [],
  beats = 4,
  chord,
  formLabel = "",
  rootFret,
  rootString,
  strings,
  transitionHint = "지정 운지를 유지하며 다음 코드로 이동",
  uiLabel = "",
}) {
  const root = String(chord).match(/^[A-G](?:#|b)?/)?.[0] ?? "C";
  const rootPosition = Number(rootFret) === 0 ? "개방" : `${rootFret}프렛`;
  return {
    chord,
    beats,
    strings: normalizeVoicingStrings(strings),
    rootProvidedByBass: false,
    voicingType: getVoicingType(chord),
    formLabel,
    positionLabel: Number(rootFret) === 0 ? "너트 중심" : `${rootFret}프렛 중심`,
    uiLabel: uiLabel || `${chord} · ${rootString}번줄 Root · ${rootPosition}${formLabel ? ` ${formLabel}` : ""}`,
    transitionHint,
    rootPositions: [{ stringNumber: rootString, fretNumber: rootFret, note: root }],
    barres: barres.map((barre) => ({ ...barre })),
  };
}

const LEARNING_VOICINGS = Object.freeze({
  "gmaj7-e3": { chord: "Gmaj7", strings: ["3", "5", "4", "4", "3", "3"], rootString: 6, rootFret: 3, formLabel: "E폼 maj7", barres: [{ fret: 3, fromString: 1, toString: 6, label: "1" }] },
  "a7-e5": { chord: "A7", strings: ["5", "7", "5", "6", "5", "5"], rootString: 6, rootFret: 5, formLabel: "E폼 7", barres: [{ fret: 5, fromString: 1, toString: 6, label: "1" }] },
  "dmaj7-a5": { chord: "Dmaj7", strings: ["x", "5", "7", "6", "7", "5"], rootString: 5, rootFret: 5, formLabel: "A폼 maj7", barres: [{ fret: 5, fromString: 1, toString: 5, label: "1" }] },
  "bm7-e7": { chord: "Bm7", strings: ["7", "9", "7", "7", "7", "7"], rootString: 6, rootFret: 7, formLabel: "E폼 m7", barres: [{ fret: 7, fromString: 1, toString: 6, label: "1" }] },
  "em7-a7": { chord: "Em7", strings: ["x", "7", "9", "7", "8", "7"], rootString: 5, rootFret: 7, formLabel: "A폼 m7", barres: [{ fret: 7, fromString: 1, toString: 5, label: "1" }] },
  "amaj7-e5": { chord: "Amaj7", strings: ["5", "7", "6", "6", "5", "5"], rootString: 6, rootFret: 5, formLabel: "E폼 maj7", barres: [{ fret: 5, fromString: 1, toString: 6, label: "1" }] },
  "emaj7-a7": { chord: "Emaj7", strings: ["x", "7", "9", "8", "9", "7"], rootString: 5, rootFret: 7, formLabel: "A폼 maj7", barres: [{ fret: 7, fromString: 1, toString: 5, label: "1" }] },
  "dmaj7-d0": { chord: "Dmaj7", strings: ["x", "x", "0", "2", "2", "2"], rootString: 4, rootFret: 0, formLabel: "D폼 maj7", barres: [{ fret: 2, fromString: 1, toString: 3, label: "1" }] },
  "emaj7-d2": { chord: "Emaj7", strings: ["x", "x", "2", "4", "4", "4"], rootString: 4, rootFret: 2, formLabel: "D폼 maj7", barres: [{ fret: 4, fromString: 1, toString: 3, label: "1" }] },
  "fmaj7-d3": { chord: "Fmaj7", strings: ["x", "x", "3", "5", "5", "5"], rootString: 4, rootFret: 3, formLabel: "D폼 maj7", barres: [{ fret: 5, fromString: 1, toString: 3, label: "1" }] },
  "gmaj7-d5": { chord: "Gmaj7", strings: ["x", "x", "5", "7", "7", "7"], rootString: 4, rootFret: 5, formLabel: "D폼 maj7", barres: [{ fret: 7, fromString: 1, toString: 3, label: "1" }] },
  "amaj7-d7": { chord: "Amaj7", strings: ["x", "x", "7", "9", "9", "9"], rootString: 4, rootFret: 7, formLabel: "D폼 maj7", barres: [{ fret: 9, fromString: 1, toString: 3, label: "1" }] },
  "g-e3": { chord: "G", strings: ["3", "5", "5", "4", "3", "3"], rootString: 6, rootFret: 3, formLabel: "E폼 Major", barres: [{ fret: 3, fromString: 1, toString: 6, label: "1" }] },
  "d-a5": { chord: "D", strings: ["x", "5", "7", "7", "7", "5"], rootString: 5, rootFret: 5, formLabel: "A폼 Major", barres: [{ fret: 5, fromString: 1, toString: 5, label: "1" }] },
  "em-e7": { chord: "Em", strings: ["7", "9", "9", "7", "7", "7"], rootString: 6, rootFret: 7, formLabel: "E폼 Minor", barres: [{ fret: 7, fromString: 1, toString: 6, label: "1" }] },
  "c-a3": { chord: "C", strings: ["x", "3", "5", "5", "5", "3"], rootString: 5, rootFret: 3, formLabel: "A폼 Major", barres: [{ fret: 3, fromString: 1, toString: 5, label: "1" }] },
  "c-e8": { chord: "C", strings: ["8", "10", "10", "9", "8", "8"], rootString: 6, rootFret: 8, formLabel: "E폼 Major", barres: [{ fret: 8, fromString: 1, toString: 6, label: "1" }] },
  "am-e5": { chord: "Am", strings: ["5", "7", "7", "5", "5", "5"], rootString: 6, rootFret: 5, formLabel: "E폼 Minor", barres: [{ fret: 5, fromString: 1, toString: 6, label: "1" }] },
  "f-e1": { chord: "F", strings: ["1", "3", "3", "2", "1", "1"], rootString: 6, rootFret: 1, formLabel: "E폼 Major", barres: [{ fret: 1, fromString: 1, toString: 6, label: "1" }] },
  "bm7b5-e7": { chord: "Bm7♭5", strings: ["7", "x", "7", "7", "6", "x"], rootString: 6, rootFret: 7, formLabel: "m7♭5", barres: [] },
  "e7-a7": { chord: "E7", strings: ["x", "7", "9", "7", "9", "7"], rootString: 5, rootFret: 7, formLabel: "A폼 7", barres: [{ fret: 7, fromString: 1, toString: 5, label: "1" }] },
  "am7-e5": { chord: "Am7", strings: ["5", "7", "5", "5", "5", "5"], rootString: 6, rootFret: 5, formLabel: "E폼 m7", barres: [{ fret: 5, fromString: 1, toString: 6, label: "1" }] },
  "dm7-a5": { chord: "Dm7", strings: ["x", "5", "7", "5", "6", "5"], rootString: 5, rootFret: 5, formLabel: "A폼 m7", barres: [{ fret: 5, fromString: 1, toString: 5, label: "1" }] },
  "g7-e3": { chord: "G7", strings: ["3", "5", "3", "4", "3", "3"], rootString: 6, rootFret: 3, formLabel: "E폼 7", barres: [{ fret: 3, fromString: 1, toString: 6, label: "1" }] },
  "cmaj7-a3": { chord: "Cmaj7", strings: ["x", "3", "5", "4", "5", "3"], rootString: 5, rootFret: 3, formLabel: "A폼 maj7", barres: [{ fret: 3, fromString: 1, toString: 5, label: "1" }] },
});

function learningSlot(voicingId, beats = 4, transitionHint = "지정 운지를 유지하며 다음 코드로 이동") {
  return createLearningSlot({
    ...LEARNING_VOICINGS[voicingId],
    beats,
    transitionHint,
  });
}

function createLearningCourse({
  accompanimentName = "Voicing Light Guide",
  bpm,
  courseNumber,
  description,
  difficulty = "초중급",
  id,
  key,
  practiceSummary,
  slots,
  twoBeatExtension,
}) {
  return {
    id,
    courseNumber,
    title: description,
    description: practiceSummary,
    practiceSummary,
    key,
    bpm,
    tempoStages: [bpm],
    timeSignature: "4/4",
    repeatMode: "full-loop",
    accompanimentName,
    difficulty,
    rootlessAllowed: false,
    rootRequiredOnFretboard: true,
    ...(twoBeatExtension ? { twoBeatExtension } : {}),
    slots,
  };
}

const AUTHORED_COURSES = [
  {
    id: "voicing-course-01-seventh-cycle",
    courseNumber: "01",
    title: "7th 순환 하이코드",
    description: "7프렛에서 시작해 5프렛, 3프렛으로 내려오며 6번줄/5번줄 Root가 보이는 7th 바레코드 전환과 ii-V-I 해결을 익히는 코스",
    practiceSummary: "오픈코드 대신 하이코드로 잡고, 7→5→3프렛을 따라 이동해 보세요.",
    key: "C",
    bpm: 58,
    tempoStages: [58, 66, 74, 82],
    tempoAdvanceCondition: "success",
    timeSignature: "4/4",
    repeatMode: "full-loop",
    accompanimentName: "Soft Jazz Guide",
    rootlessAllowed: false,
    rootRequiredOnFretboard: true,
    learningPoints: [
      "Bm7 → Em7: 같은 7프렛 구역에서 6번줄 Root E폼 m7과 5번줄 Root A폼 m7 바꾸기",
      "Em7 → Am7: 7프렛에서 5프렛으로 정확히 2프렛 하행하며 Root 기준 줄 바꾸기",
      "Am7 → Dm7: 5프렛 위치를 유지하고 6번줄 Root E폼 m7에서 5번줄 Root A폼 m7로 바꾸기",
      "Dm7 → G7 → Cmaj7: 5프렛에서 3프렛으로 내려와 F→E, B→C의 반음 해결과 다음 Bm7 연결 듣기",
    ],
    twoBeatExtension: {
      unlockAfterStableBpm: 82,
      beatsPerChord: 2,
      progression: ["Bm7", "Em7", "Am7", "Dm7", "G7", "Cmaj7"],
    },
    slots: [
      {
        chord: "Bm7",
        beats: 4,
        strings: ["7", "9", "7", "7", "7", "7"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: "E폼 m7",
        positionLabel: "7프렛 중심",
        uiLabel: "Bm7 · 6번줄 Root · 7프렛 E폼 m7",
        transitionHint: "7프렛 전체 바레를 유지하고 5번줄 9프렛만 추가한 뒤, 같은 구역의 Em7 A폼으로 전환",
        soundingNotes: ["B", "F#", "A", "D", "F#", "B"],
        rootPositions: [
          { stringNumber: 6, fretNumber: 7, note: "B" },
          { stringNumber: 1, fretNumber: 7, note: "B" },
        ],
        features: ["6번줄 7프렛 B Root를 명확히 표시", "7프렛 전체 바레에 5번줄 9프렛만 추가", "코스 출발점"],
        barres: [{ fret: 7, fromString: 1, toString: 6, label: "1" }],
      },
      {
        chord: "Em7",
        beats: 4,
        strings: ["x", "7", "9", "7", "8", "7"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: "A폼 m7",
        positionLabel: "7프렛 중심",
        uiLabel: "Em7 · 5번줄 Root · 7프렛 A폼 m7",
        transitionHint: "Bm7의 6번줄을 뮤트하고 5·4·2번줄을 바꿔, 같은 7프렛 구역에서 Em7을 완성",
        soundingNotes: ["E", "B", "D", "G", "B"],
        rootPositions: [{ stringNumber: 5, fretNumber: 7, note: "E" }],
        features: ["5번줄 7프렛 E Root 필수", "Bm7과 같은 7프렛 구역에서 해결", "기존 Rootless 운지 사용 금지"],
        barres: [{ fret: 7, fromString: 1, toString: 5, label: "1" }],
      },
      {
        chord: "Am7",
        beats: 4,
        strings: ["5", "7", "5", "5", "5", "5"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: "E폼 m7",
        positionLabel: "5프렛 중심",
        uiLabel: "Am7 · 6번줄 Root · 5프렛 E폼 m7",
        transitionHint: "Em7의 7프렛 구역에서 손 전체를 정확히 2프렛 내려 5프렛 전체 바레를 만들기",
        soundingNotes: ["A", "E", "G", "C", "E", "A"],
        rootPositions: [
          { stringNumber: 6, fretNumber: 5, note: "A" },
          { stringNumber: 1, fretNumber: 5, note: "A" },
        ],
        features: ["5프렛 전체 바레에 5번줄 7프렛만 추가", "7프렛에서 정확히 2프렛 하행", "6번줄 Root 재등장"],
        barres: [{ fret: 5, fromString: 1, toString: 6, label: "1" }],
      },
      {
        chord: "Dm7",
        beats: 4,
        strings: ["x", "5", "7", "5", "6", "5"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: "A폼 m7",
        positionLabel: "5프렛 중심",
        uiLabel: "Dm7 · 5번줄 Root · 5프렛 A폼 m7",
        transitionHint: "Am7과 같은 5프렛을 유지하고 6번줄을 뮤트한 뒤 5번줄 D Root와 4·2번줄을 재배치",
        soundingNotes: ["D", "A", "C", "F", "A"],
        rootPositions: [{ stringNumber: 5, fretNumber: 5, note: "D" }],
        features: ["5번줄 5프렛 D Root 필수", "Am7과 같은 5프렛 구역 유지", "기존 Rootless 운지 사용 금지"],
        barres: [{ fret: 5, fromString: 1, toString: 5, label: "1" }],
      },
      {
        chord: "G7",
        beats: 4,
        strings: ["3", "5", "3", "4", "3", "3"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: "E폼 7",
        positionLabel: "3프렛 중심",
        uiLabel: "G7 · 6번줄 Root · 3프렛 E폼 7",
        transitionHint: "Dm7의 5프렛 구역에서 2프렛 내려 G7의 3도 B와 b7 F를 분명히 듣기",
        soundingNotes: ["G", "D", "F", "B", "D", "G"],
        rootPositions: [
          { stringNumber: 6, fretNumber: 3, note: "G" },
          { stringNumber: 1, fretNumber: 3, note: "G" },
        ],
        features: ["5프렛에서 3프렛으로 2프렛 하행", "3도 B와 b7 F를 분명히 듣기", "Cmaj7 직전 긴장 코드"],
        barres: [{ fret: 3, fromString: 1, toString: 6, label: "1" }],
      },
      {
        chord: "Cmaj7",
        beats: 4,
        strings: ["x", "3", "5", "4", "5", "3"],
        rootProvidedByBass: false,
        voicingType: "full-maj7",
        formLabel: "A폼 maj7",
        positionLabel: "3프렛 중심",
        uiLabel: "Cmaj7 · 5번줄 Root · 3프렛 A폼 maj7",
        transitionHint: "5번줄 3프렛 C Root로 도착해 F→E, B→C의 반음 해결을 듣고 다음 Bm7까지 울림 연결",
        soundingNotes: ["C", "G", "B", "E", "G"],
        rootPositions: [{ stringNumber: 5, fretNumber: 3, note: "C" }],
        features: ["1번줄 3프렛 G까지 포함", "5번줄 3프렛 C Root로 도착", "마지막 해결음의 여운 유지"],
        barres: [{ fret: 3, fromString: 1, toString: 5, label: "1" }],
      },
    ],
    drumPreset: {
      id: "soft-jazz-guide-drums",
      label: "Soft Jazz Guide · Drums",
      level: 0.66,
      instrumentLevels: { kick: 0.62, rim: 0.62, shaker: 0.32 },
      bars: [
        softJazzDrumBar,
        softJazzDrumBar,
        softJazzDrumBar,
        softJazzDrumBar,
        softJazzDrumBar,
        softJazzEndingDrumBar,
      ],
    },
    bassPreset: {
      id: "soft-jazz-guide-bass",
      label: "Soft Jazz Guide · Bass",
      level: 0.72,
      bars: Array.from({ length: 6 }, () => softJazzBassBar),
    },
    pianoPreset: {
      id: "soft-jazz-guide-piano",
      label: "Soft Jazz Guide · Piano",
      level: 0.34,
      voicing: "thirdSeventh",
      bars: Array.from({ length: 6 }, () => softJazzPianoBar),
    },
  },
  {
    id: "voicing-course-02-d-major-resolution",
    courseNumber: "02",
    title: "D키 7th 해결 이동",
    description: "6번줄과 5번줄 Root형을 바꾸며 Dmaj7에 해결하는 연습",
    practiceSummary: "하이코드로 3→5→7프렛을 이동하며 Dmaj7에 도착",
    key: "D",
    bpm: 62,
    tempoStages: [62],
    tempoAdvanceCondition: "success",
    timeSignature: "4/4",
    repeatMode: "full-loop",
    accompanimentName: "Soft 7th Guide",
    difficulty: "초중급",
    rootlessAllowed: false,
    rootRequiredOnFretboard: true,
    learningPoints: [
      "Bm7 → Em7: 7프렛 구역을 유지하며 6번줄 Root형에서 5번줄 Root형으로 전환",
      "Em7 → A7: 손 전체를 7프렛에서 5프렛으로 정확히 2프렛 하행",
      "A7 → Dmaj7: 5프렛 구역을 유지하며 6번줄 Root형에서 5번줄 Root형으로 전환",
    ],
    slots: [
      learningSlot("gmaj7-e3", 4, "3프렛 Gmaj7에서 5프렛 A7으로 이동"),
      learningSlot("a7-e5", 4, "같은 5프렛 구역의 Dmaj7으로 Root 줄을 바꾸기"),
      learningSlot("dmaj7-a5", 4, "5프렛에서 7프렛 Bm7으로 손 전체를 이동"),
      {
        chord: "Bm7",
        beats: 4,
        strings: ["7", "9", "7", "7", "7", "7"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: "E폼 m7",
        positionLabel: "7프렛 중심",
        uiLabel: "Bm7 · 6번줄 Root · 7프렛",
        transitionHint: "7프렛 구역을 유지하며 6번줄 Root형에서 5번줄 Root형 Em7으로 전환",
        soundingNotes: ["B", "F#", "A", "D", "F#", "B"],
        rootPositions: [{ stringNumber: 6, fretNumber: 7, note: "B" }],
        features: ["6번줄 7프렛 B Root", "Em7과 같은 7프렛 위치", "Em7까지 손 위치 유지"],
        barres: [{ fret: 7, fromString: 1, toString: 6, label: "1" }],
      },
      {
        chord: "Em7",
        beats: 4,
        strings: ["x", "7", "9", "7", "8", "7"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: "A폼 m7",
        positionLabel: "7프렛 중심",
        uiLabel: "Em7 · 5번줄 Root · 7프렛",
        transitionHint: "Bm7과 같은 7프렛 구역에서 5번줄 Root형으로 전환",
        soundingNotes: ["E", "B", "D", "G", "B"],
        rootPositions: [{ stringNumber: 5, fretNumber: 7, note: "E" }],
        features: ["5번줄 7프렛 E Root", "Bm7과 같은 7프렛 위치", "다음 A7에서 2프렛 하행"],
        barres: [{ fret: 7, fromString: 1, toString: 5, label: "1" }],
      },
      {
        chord: "A7",
        beats: 4,
        strings: ["5", "7", "5", "6", "5", "5"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: "E폼 7",
        positionLabel: "5프렛 중심",
        uiLabel: "A7 · 6번줄 Root · 5프렛",
        transitionHint: "Em7에서 손 전체를 2프렛 내려 5프렛 구역의 A7으로 이동",
        soundingNotes: ["A", "E", "G", "C#", "E", "A"],
        rootPositions: [{ stringNumber: 6, fretNumber: 5, note: "A" }],
        features: ["6번줄 5프렛 A Root", "7프렛에서 5프렛으로 이동", "Dmaj7까지 손 위치 유지"],
        barres: [{ fret: 5, fromString: 1, toString: 6, label: "1" }],
      },
      {
        chord: "Dmaj7",
        beats: 4,
        strings: ["x", "5", "7", "6", "7", "5"],
        rootProvidedByBass: false,
        voicingType: "full-maj7",
        formLabel: "A폼 maj7",
        positionLabel: "5프렛 중심",
        uiLabel: "Dmaj7 · 5번줄 Root · 5프렛",
        transitionHint: "A7과 같은 5프렛 구역에서 5번줄 Root형 Dmaj7으로 해결",
        soundingNotes: ["D", "A", "C#", "F#", "A"],
        rootPositions: [{ stringNumber: 5, fretNumber: 5, note: "D" }],
        features: ["5번줄 5프렛 D Root", "A7과 같은 5프렛 위치", "마지막 해결 코드"],
        barres: [{ fret: 5, fromString: 1, toString: 5, label: "1" }],
      },
    ],
    drumPreset: {
      id: "soft-seventh-guide-drums",
      label: "Soft 7th Guide · Drums",
      level: 0.58,
      bars: Array.from({ length: 7 }, () => lightDrumBar),
    },
    bassPreset: {
      id: "soft-seventh-guide-bass",
      label: "Soft 7th Guide · Bass",
      level: 0.66,
      bars: Array.from({ length: 7 }, () => rootBassBar),
    },
    pianoPreset: {
      id: "soft-seventh-guide-piano",
      label: "Soft 7th Guide · Piano",
      level: 0.32,
      voicing: "guideTones",
      bars: Array.from({ length: 7 }, () => guideTonePianoBar),
    },
  },
  createLearningCourse({
    id: "voicing-course-02-a-major-root-cross",
    courseNumber: "02",
    description: "A키 maj7 Root 교차",
    practiceSummary: "6번줄·5번줄 Root를 바꾸며 5→7프렛을 이동",
    key: "A",
    bpm: 58,
    twoBeatExtension: {
      beatsPerChord: 2,
      progression: ["Amaj7", "Dmaj7", "Emaj7", "Amaj7"],
    },
    slots: [
      learningSlot("amaj7-e5", 4, "5프렛을 유지하며 6번줄 Root형에서 5번줄 Root형으로 전환"),
      learningSlot("dmaj7-a5", 4, "손 전체를 2프렛 올려 Emaj7으로 이동"),
      learningSlot("emaj7-a7", 4, "7프렛에서 5프렛으로 내려 Amaj7에 도착"),
      learningSlot("amaj7-e5", 4, "5프렛 Amaj7의 울림을 유지하고 반복 준비"),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-02-d-double-step",
    courseNumber: "02",
    description: "D키 더블스텝 해결",
    practiceSummary: "2박마다 7→5프렛을 오가며 Dmaj7에 해결",
    key: "D",
    bpm: 54,
    slots: [
      learningSlot("bm7-e7", 2, "같은 7프렛 구역의 Em7으로 Root 줄을 바꾸기"),
      learningSlot("em7-a7", 2, "손 전체를 2프렛 내려 A7으로 이동"),
      learningSlot("a7-e5", 2, "같은 5프렛 구역의 Dmaj7으로 Root 줄을 바꾸기"),
      learningSlot("dmaj7-a5", 2, "7프렛 Bm7으로 빠르게 복귀"),
      learningSlot("bm7-e7", 2, "같은 7프렛 구역의 Em7으로 Root 줄을 바꾸기"),
      learningSlot("em7-a7", 2, "손 전체를 2프렛 내려 A7으로 이동"),
      learningSlot("a7-e5", 2, "같은 5프렛 구역의 Dmaj7으로 Root 줄을 바꾸기"),
      learningSlot("dmaj7-a5", 2, "Dmaj7의 울림을 유지하고 반복 준비"),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-03-d-form-semitone-return",
    courseNumber: "03",
    description: "D폼 반음 왕복",
    practiceSummary: "같은 maj7 모양으로 D→E→F를 오르내리기",
    key: "D",
    bpm: 56,
    slots: [
      learningSlot("dmaj7-d0", 4, "같은 D폼을 2프렛 Emaj7으로 이동"),
      learningSlot("emaj7-d2", 4, "같은 D폼을 1프렛 Fmaj7으로 이동"),
      learningSlot("fmaj7-d3", 4, "모양을 유지한 채 Emaj7으로 하행"),
      learningSlot("emaj7-d2", 4, "개방 Root Dmaj7으로 돌아오기"),
      learningSlot("dmaj7-d0", 4, "Dmaj7의 울림을 유지하고 반복 준비"),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-03-d-form-whole-step",
    courseNumber: "03",
    description: "D폼 2프렛 이동",
    practiceSummary: "같은 maj7 모양으로 F→G→A를 2프렛씩 이동",
    key: "F",
    bpm: 60,
    slots: [
      learningSlot("fmaj7-d3", 4, "D폼을 유지하고 2프렛 Gmaj7으로 이동"),
      learningSlot("gmaj7-d5", 4, "D폼을 유지하고 2프렛 Amaj7으로 이동"),
      learningSlot("amaj7-d7", 4, "같은 모양으로 Gmaj7에 하행"),
      learningSlot("gmaj7-d5", 4, "같은 모양으로 Fmaj7에 하행"),
      learningSlot("fmaj7-d3", 4, "Fmaj7의 울림을 유지하고 반복 준비"),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-03-d-form-wide-return",
    courseNumber: "03",
    description: "D폼 넓은 지판 왕복",
    practiceSummary: "3→5→7프렛의 넓은 D폼 이동 연습",
    key: "D",
    bpm: 52,
    slots: [
      learningSlot("fmaj7-d3", 2, "D폼을 유지하고 2프렛 Gmaj7으로 이동"),
      learningSlot("gmaj7-d5", 2, "D폼을 유지하고 2프렛 Amaj7으로 이동"),
      learningSlot("amaj7-d7", 4, "Amaj7을 충분히 울린 뒤 Gmaj7으로 하행"),
      learningSlot("gmaj7-d5", 2, "같은 모양으로 Fmaj7에 하행"),
      learningSlot("fmaj7-d3", 2, "같은 모양으로 Emaj7에 반음 하행"),
      learningSlot("emaj7-d2", 2, "개방 Root Dmaj7으로 돌아오기"),
      learningSlot("dmaj7-d0", 2, "Dmaj7의 울림을 유지하고 반복 준비"),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-04-g-pop-rock-barre",
    courseNumber: "04",
    description: "G키 팝록 바레",
    practiceSummary: "E폼·A폼 바레로 3→5→7프렛 이동",
    key: "G",
    bpm: 68,
    slots: [
      learningSlot("g-e3", 4, "3프렛 E폼에서 5프렛 A폼 D로 이동"),
      learningSlot("d-a5", 4, "5프렛에서 7프렛 E폼 Em으로 이동"),
      learningSlot("em-e7", 4, "7프렛에서 3프렛 A폼 C로 크게 하행"),
      learningSlot("c-a3", 4, "3프렛 C의 울림을 유지하고 반복 준비"),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-04-g-barre-double-step",
    courseNumber: "04",
    description: "G키 바레 더블스텝",
    practiceSummary: "2박마다 3→5→7→3프렛을 정확히 이동",
    key: "G",
    bpm: 56,
    slots: [
      learningSlot("g-e3", 2, "3프렛 E폼에서 5프렛 A폼 D로 이동"),
      learningSlot("d-a5", 2, "5프렛에서 7프렛 E폼 Em으로 이동"),
      learningSlot("em-e7", 2, "7프렛에서 3프렛 A폼 C로 크게 하행"),
      learningSlot("c-a3", 2, "3프렛 E폼 G로 Root 줄을 바꾸기"),
      learningSlot("g-e3", 2, "3프렛 E폼에서 5프렛 A폼 D로 이동"),
      learningSlot("d-a5", 2, "5프렛에서 7프렛 E폼 Em으로 이동"),
      learningSlot("em-e7", 2, "7프렛에서 3프렛 A폼 C로 크게 하행"),
      learningSlot("c-a3", 2, "3프렛 C의 울림을 유지하고 반복 준비"),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-04-c-1625-high-barre",
    courseNumber: "04",
    description: "C키 1625 하이 바레",
    practiceSummary: "오픈코드 없이 C키 진행을 바레코드로 연결",
    key: "C",
    bpm: 62,
    slots: [
      learningSlot("c-e8", 4, "8프렛 C에서 5프렛 Am으로 하행"),
      learningSlot("am-e5", 4, "5프렛 Am에서 1프렛 F로 하행"),
      learningSlot("f-e1", 4, "1프렛 F에서 3프렛 G로 상행"),
      learningSlot("g-e3", 4, "3프렛 G의 긴장을 유지하고 C로 반복"),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-05-minor-resolution",
    courseNumber: "05",
    description: "m7♭5 기본 해결",
    practiceSummary: "7프렛 m7♭5에서 E7을 거쳐 Am7으로 해결",
    key: "A",
    bpm: 54,
    slots: [
      learningSlot("bm7b5-e7", 4, "같은 7프렛 구역의 E7으로 전환"),
      learningSlot("e7-a7", 4, "7프렛에서 5프렛 Am7으로 해결"),
      learningSlot("am7-e5", 4, "Am7의 울림을 유지하고 반복 준비"),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-05-minor-double-step",
    courseNumber: "05",
    description: "m7♭5 더블스텝",
    practiceSummary: "2박마다 m7♭5→E7→Am7을 전환",
    key: "A",
    bpm: 50,
    slots: [
      learningSlot("bm7b5-e7", 2, "같은 7프렛 구역의 E7으로 전환"),
      learningSlot("e7-a7", 2, "7프렛에서 5프렛 Am7으로 해결"),
      learningSlot("am7-e5", 4, "Am7을 충분히 울린 뒤 7프렛으로 복귀"),
      learningSlot("bm7b5-e7", 2, "같은 7프렛 구역의 E7으로 전환"),
      learningSlot("e7-a7", 2, "7프렛에서 5프렛 Am7으로 해결"),
      learningSlot("am7-e5", 4, "Am7의 울림을 유지하고 반복 준비"),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-05-minor-cycle-expansion",
    courseNumber: "05",
    description: "m7♭5 순환 확장",
    practiceSummary: "마이너 해결 뒤 ii-V-I로 이어지는 7→5→3프렛 이동",
    key: "C",
    bpm: 52,
    slots: [
      learningSlot("bm7b5-e7", 2, "같은 7프렛 구역의 E7으로 전환"),
      learningSlot("e7-a7", 2, "7프렛에서 5프렛 Am7으로 해결"),
      learningSlot("am7-e5", 2, "5프렛을 유지하며 Dm7으로 Root 줄을 바꾸기"),
      learningSlot("dm7-a5", 2, "5프렛에서 3프렛 G7으로 하행"),
      learningSlot("g7-e3", 2, "같은 3프렛 구역의 Cmaj7으로 해결"),
      learningSlot("cmaj7-a3", 2, "Cmaj7의 울림을 유지하고 반복 준비"),
    ],
  }),
  {
    id: "voicing-course-rootless-shells",
    courseNumber: "01",
    title: "루트리스 셸 ii–V–I",
    description: "베이스에 Root를 맡기고 3·5·7도만 연결",
    key: "C",
    bpm: 72,
    timeSignature: "4/4",
    slots: [
      {
        chord: "Dm7",
        beats: 2,
        strings: ["x", "x", "7", "5", "6", "5"],
        rootProvidedByBass: true,
        voicingType: "rootless-7th",
        positionLabel: "5–7프렛",
        transitionHint: "1·2번줄 5·6프렛을 유지하며 저음 두 줄은 치지 않기",
        barres: [{ fret: 5, fromString: 1, toString: 3, label: "1" }],
      },
      {
        chord: "G7",
        beats: 2,
        strings: ["x", "x", "3", "4", "3", "x"],
        rootProvidedByBass: true,
        voicingType: "rootless-7th",
        positionLabel: "3–4프렛",
        transitionHint: "4·3·2번줄 셸만 누르고 6·5·1번줄은 뮤트",
      },
      {
        chord: "Cmaj7",
        beats: 4,
        strings: ["x", "x", "5", "4", "5", "x"],
        rootProvidedByBass: true,
        voicingType: "rootless-maj7",
        positionLabel: "4–5프렛",
        transitionHint: "가운데 3줄 모양을 반음 단위로 연결하고 양쪽 줄은 뮤트",
      },
    ],
  },
  {
    id: "voicing-course-top-three-strings",
    courseNumber: "01",
    title: "상단 3줄 최소 이동",
    description: "1–3번줄만 사용해 Am7–Dm7–G7–Cmaj7 연결",
    key: "C",
    bpm: 68,
    timeSignature: "4/4",
    slots: [
      {
        chord: "Am7",
        beats: 2,
        strings: ["x", "x", "x", "5", "5", "5"],
        rootProvidedByBass: false,
        voicingType: "upper-triad",
        positionLabel: "5프렛 상단 3줄",
        transitionHint: "3·2·1번줄 5프렛 미니 바레를 유지",
        barres: [{ fret: 5, fromString: 1, toString: 3, label: "1" }],
      },
      {
        chord: "Dm7",
        beats: 2,
        strings: ["x", "x", "x", "5", "6", "5"],
        rootProvidedByBass: true,
        voicingType: "rootless-upper",
        positionLabel: "5–6프렛 상단 3줄",
        transitionHint: "미니 바레를 둔 채 2번줄만 6프렛으로 이동",
        barres: [{ fret: 5, fromString: 1, toString: 3, label: "1" }],
      },
      {
        chord: "G7",
        beats: 2,
        strings: ["x", "x", "x", "4", "3", "3"],
        rootProvidedByBass: false,
        voicingType: "upper-triad",
        positionLabel: "3–4프렛 상단 3줄",
        transitionHint: "모양 전체를 3프렛대로 옮기고 3번줄만 4프렛",
        barres: [{ fret: 3, fromString: 1, toString: 2, label: "1" }],
      },
      {
        chord: "Cmaj7",
        beats: 2,
        strings: ["x", "x", "x", "4", "5", "3"],
        rootProvidedByBass: true,
        voicingType: "rootless-upper",
        positionLabel: "3–5프렛 상단 3줄",
        transitionHint: "1번줄 3프렛을 축으로 2번줄만 5프렛으로 이동",
      },
    ],
  },
];

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export const VOICING_MOVEMENT_COURSES = deepFreeze(AUTHORED_COURSES.map((course) => {
  const totalBeats = course.slots.reduce((total, slot) => total + slot.beats, 0);
  const measureCount = Math.max(1, Math.ceil(totalBeats / 4));
  return {
    ...course,
    category: "voicing-movement",
    loopLength: { beats: totalBeats, measures: totalBeats / 4 },
    ...(!course.drumPreset || !course.bassPreset || !course.pianoPreset
      ? createCourseAccompanimentPresets(course.id, measureCount)
      : {}),
    intro: false,
    loop: true,
    ending: false,
  };
}));
