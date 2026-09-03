const STEP_COUNT = 16;

const steps = (factory) => Array.from({ length: STEP_COUNT }, (_, index) => factory(index));
const booleanSteps = (indexes = []) => {
  const active = new Set(indexes);
  return steps((index) => active.has(index));
};

const drumBar = ({ kick = [], snare = [], rim = [], closedHat = [], shaker = [], crash = [] } = {}) => ({
  kick: booleanSteps(kick),
  snare: booleanSteps(snare),
  rim: booleanSteps(rim),
  closedHat: booleanSteps(closedHat),
  shaker: booleanSteps(shaker),
  crash: booleanSteps(crash),
});

const bassBar = (attacks = [], { holdToEnd = false } = {}) => {
  const result = steps(() => "rest");
  const ordered = [...attacks].sort((left, right) => left[0] - right[0]);
  ordered.forEach(([index, value], attackIndex) => {
    result[index] = value;
    const nextIndex = ordered[attackIndex + 1]?.[0] ?? (holdToEnd ? STEP_COUNT : index + 1);
    for (let cursor = index + 1; cursor < nextIndex; cursor += 1) result[cursor] = "hold";
  });
  return result;
};

const pianoBar = (events = []) => {
  const result = steps(() => ({ active: false, style: "chord", durationSteps: 1 }));
  events.forEach(([index, style, durationSteps = 1]) => {
    result[index] = { active: true, style, durationSteps };
  });
  return result;
};

const repeatBars = (bar, count) => Array.from({ length: count }, () => bar);
const fullBar = (chord) => [chord, "", "", ""];
const halfBar = (firstChord, secondChord) => [firstChord, "", secondChord, ""];
const twoOneOneBar = (firstChord, secondChord, thirdChord) => [firstChord, "", secondChord, thirdChord];

const LET_IT_BE_CHORD_BARS = [
  fullBar("C"), fullBar("G/B"), fullBar("Am"), halfBar("F", "G"),
  fullBar("C"), fullBar("G"), fullBar("Am"), fullBar("F"),
  fullBar("C"), fullBar("G"), halfBar("F", "C/E"), fullBar("Dm"),
  halfBar("C", "G/B"), fullBar("Am"), fullBar("F"), fullBar("C"),
  fullBar("G"), halfBar("F", "G"), fullBar("C"), fullBar("REST"),
  fullBar("C"), fullBar("G"), fullBar("Am"), fullBar("F"),
  fullBar("C"), fullBar("G"), halfBar("F", "C/E"), fullBar("Dm"),
  halfBar("C", "G/B"), fullBar("Am"), fullBar("F"), fullBar("C"),
  fullBar("G"), halfBar("F", "G"), fullBar("C"), fullBar("REST"),
  fullBar("Am"), fullBar("G"), fullBar("F"), fullBar("C"),
  fullBar("C"), fullBar("G"), halfBar("F", "C/E"), fullBar("Dm"),
  halfBar("C", "G/B"), fullBar("Am"), fullBar("F"), fullBar("C"),
  fullBar("G"), halfBar("F", "G"), fullBar("C"), fullBar("REST"),
  fullBar("C"), fullBar("G/B"), fullBar("Am"), fullBar("F"),
  fullBar("C"), fullBar("G"), halfBar("F", "C/E"), fullBar("Dm"),
  halfBar("C", "G/B"), fullBar("Am"), fullBar("F"), fullBar("C"),
  fullBar("G"), halfBar("F", "G"), fullBar("C"), fullBar("REST"),
  fullBar("Am"), fullBar("G"), fullBar("F"), fullBar("C"),
  fullBar("C"), fullBar("G"), halfBar("F", "C/E"), fullBar("Dm"),
  halfBar("C", "G/B"), fullBar("Am"), fullBar("F"), fullBar("C"),
  fullBar("G"), halfBar("F", "G"), fullBar("C"), fullBar("REST"),
  fullBar("F"), fullBar("C/E"), halfBar("Dm", "G"), fullBar("C"),
  fullBar("Am"), fullBar("G"), twoOneOneBar("F", "G", "C"), fullBar("C"),
  fullBar("C"), fullBar("G/B"), halfBar("Am", "F"), fullBar("Cadd9"),
];

const drumRest = drumBar();
const drumIntroBrush = drumBar({ kick: [0], shaker: [4, 12] });
const drumVerseSoft = drumBar({ kick: [0, 8], rim: [12], shaker: [2, 4, 6, 10, 14], closedHat: [15] });
const drumVerseLift = drumBar({ kick: [0, 6, 8], rim: [4, 12], shaker: [2, 6, 10, 14], closedHat: [15] });
const drumChorusSoft = drumBar({ kick: [0, 6, 8, 11], snare: [4, 12], closedHat: [0, 2, 4, 6, 8, 10, 12, 14] });
const drumChorusFull = drumBar({
  kick: [0, 3, 6, 8, 11],
  snare: [4, 12],
  closedHat: Array.from({ length: STEP_COUNT }, (_, index) => index),
});
const drumFill = drumBar({ kick: [0, 8], snare: [12, 13, 14] });
const drumEnding = drumBar({ kick: [0], snare: [0], shaker: [8], crash: [0] });

const bassRest = bassBar();
const bassRootHold = bassBar([[0, "root"], [8, "fifth"]]);
const bassInversionHold = bassBar([[0, "third"], [8, "fifth"]]);
const bassGentle = bassBar([[0, "root"], [4, "fifth"], [8, "octave"], [12, "approach"]]);
const bassDrive = bassBar([[0, "root"], [4, "fifth"], [8, "octave"], [12, "fifth"]]);
const bassHalf = bassBar([[0, "root"], [4, "fifth"], [8, "root"], [12, "fifth"]]);
const bassHalfToFirstInversion = bassBar([[0, "root"], [4, "fifth"], [8, "third"], [12, "fifth"]]);
const bassHalfToSecondInversion = bassBar([[0, "root"], [4, "fifth"], [8, "third"], [12, "fifth"]]);
const bassEnding = bassBar([[0, "root"], [8, "octave"]], { holdToEnd: true });

const pianoRest = pianoBar();
const pianoIntro = pianoBar([[0, "arpUp", 4], [8, "arpDown", 4], [12, "hold", 4]]);
const pianoVerse = pianoBar([[0, "stab"], [6, "stab"], [8, "stab"]]);
const pianoVerseLift = pianoBar([[0, "stab"], [3, "stab"], [6, "stab"], [8, "stab"], [13, "stab"]]);
const pianoChorus = pianoBar([[0, "stab"], [3, "stab"], [8, "stab"], [11, "stab"]]);
const pianoHalf = pianoBar([[0, "stab"], [4, "stab"], [8, "stab"], [12, "stab"]]);
const pianoEnding = pianoBar([[0, "hold", 8], [8, "chord", 8]]);

const makePattern = (id, name, drumBars, bassBars, pianoBars, levels) => ({
  id,
  name,
  rhythmPattern: "custom",
  bassBeat: "custom",
  pianoBeat: "custom",
  rhythmOverrides: {
    drum: {
      type: "drum",
      version: 1,
      presetId: "custom",
      displayName: `${name} Drum`,
      level: levels.drum,
      steps: drumBars[0],
      barSteps: drumBars,
    },
    bass: {
      type: "bass",
      version: 1,
      presetId: "custom",
      displayName: `${name} Bass`,
      level: levels.bass,
      steps: bassBars[0],
      barSteps: bassBars,
    },
    piano: {
      type: "piano",
      version: 1,
      presetId: "custom",
      displayName: `${name} Piano`,
      level: levels.piano,
      voicing: "guideTones",
      steps: pianoBars[0],
      barSteps: pianoBars,
    },
  },
  tempoOverrideEnabled: false,
  bpmOverride: 76,
});

const verseABassBars = [
  bassRootHold, bassGentle, bassGentle, bassGentle,
  bassGentle, bassGentle, bassHalfToFirstInversion, bassGentle,
  bassHalfToSecondInversion, bassGentle, bassGentle, bassGentle,
  bassGentle, bassHalf, bassRootHold, bassRest,
];
const verseAPianoBars = [
  pianoVerse, pianoVerse, pianoVerse, pianoVerse,
  pianoVerse, pianoVerse, pianoHalf, pianoVerse,
  pianoHalf, pianoVerse, pianoVerse, pianoVerseLift,
  pianoVerseLift, pianoHalf, pianoVerseLift, pianoRest,
];
const verseBDrumBars = [
  ...repeatBars(drumVerseSoft, 4),
  ...repeatBars(drumVerseLift, 11),
  drumFill,
];
const verseBPianoBars = [
  ...repeatBars(pianoVerse, 4),
  pianoVerseLift, pianoVerseLift, pianoHalf, pianoVerseLift,
  pianoHalf, pianoVerseLift, pianoVerseLift, pianoVerseLift,
  pianoVerseLift, pianoHalf, pianoVerseLift, pianoRest,
];
const chorusBassBars = [
  bassDrive, bassDrive, bassDrive, bassDrive,
  bassDrive, bassDrive, bassHalfToFirstInversion, bassDrive,
  bassHalfToSecondInversion, bassDrive, bassDrive, bassDrive,
  bassDrive, bassHalf, bassEnding, bassRest,
];
const chorusPianoBars = [
  pianoChorus, pianoChorus, pianoChorus, pianoChorus,
  pianoChorus, pianoChorus, pianoHalf, pianoChorus,
  pianoHalf, pianoChorus, pianoChorus, pianoChorus,
  pianoChorus, pianoHalf, pianoEnding, pianoRest,
];

const LET_IT_BE_PATTERNS = [
  makePattern(
    "personal-let-it-be-intro",
    "Piano Intro",
    [drumRest, drumRest, drumIntroBrush, drumIntroBrush],
    [bassRest, bassRest, bassRootHold, bassHalf],
    [pianoIntro, pianoIntro, pianoIntro, pianoHalf],
    { drum: 0.28, bass: 0.46, piano: 0.56 },
  ),
  makePattern(
    "personal-let-it-be-verse-a",
    "Verse A",
    [...repeatBars(drumVerseSoft, 11), ...repeatBars(drumVerseLift, 4), drumFill],
    verseABassBars,
    verseAPianoBars,
    { drum: 0.54, bass: 0.64, piano: 0.6 },
  ),
  makePattern(
    "personal-let-it-be-verse-b",
    "Verse B",
    verseBDrumBars,
    verseABassBars,
    verseBPianoBars,
    { drum: 0.68, bass: 0.72, piano: 0.68 },
  ),
  makePattern(
    "personal-let-it-be-chorus",
    "Chorus",
    [
      { ...drumChorusSoft, crash: booleanSteps([0]) },
      ...repeatBars(drumChorusSoft, 10),
      ...repeatBars(drumChorusFull, 4),
      drumFill,
    ],
    chorusBassBars,
    chorusPianoBars,
    { drum: 0.9, bass: 0.9, piano: 0.84 },
  ),
  makePattern(
    "personal-let-it-be-verse-c",
    "Verse C",
    [...repeatBars(drumVerseSoft, 4), ...repeatBars(drumVerseLift, 11), drumFill],
    [
      bassRootHold, bassInversionHold, bassGentle, bassGentle,
      bassGentle, bassGentle, bassHalfToFirstInversion, bassGentle,
      bassHalfToSecondInversion, bassGentle, bassGentle, bassGentle,
      bassGentle, bassHalf, bassRootHold, bassRest,
    ],
    [
      pianoIntro, pianoIntro, pianoVerse, pianoVerse,
      pianoVerseLift, pianoVerseLift, pianoHalf, pianoVerseLift,
      pianoHalf, pianoVerseLift, pianoVerseLift, pianoVerseLift,
      pianoVerseLift, pianoHalf, pianoVerseLift, pianoRest,
    ],
    { drum: 0.7, bass: 0.74, piano: 0.72 },
  ),
  makePattern(
    "personal-let-it-be-final-chorus",
    "Final Chorus",
    [
      { ...drumChorusFull, crash: booleanSteps([0]) },
      ...repeatBars(drumChorusFull, 14),
      drumFill,
    ],
    chorusBassBars,
    chorusPianoBars,
    { drum: 1.06, bass: 1, piano: 0.96 },
  ),
  makePattern(
    "personal-let-it-be-coda",
    "Coda",
    [
      ...repeatBars(drumChorusSoft, 4),
      ...repeatBars(drumChorusFull, 3),
      drumEnding,
    ],
    [
      bassRootHold,
      bassBar([[0, "third"], [4, "fifth"], [8, "octave"], [12, "approach"]]),
      bassHalf,
      bassGentle,
      bassDrive,
      bassDrive,
      bassBar([[0, "root"], [4, "fifth"], [8, "root"], [12, "root"]]),
      bassEnding,
    ],
    [pianoVerse, pianoVerse, pianoHalf, pianoChorus, pianoChorus, pianoChorus, pianoBar([[0, "stab"], [8, "stab"], [12, "stab"]]), pianoEnding],
    { drum: 0.94, bass: 0.92, piano: 0.9 },
  ),
  makePattern(
    "personal-let-it-be-ending",
    "Ending",
    [drumIntroBrush, drumIntroBrush, drumIntroBrush, drumEnding],
    [bassRootHold, bassInversionHold, bassHalf, bassEnding],
    [pianoIntro, pianoIntro, pianoHalf, pianoEnding],
    { drum: 0.72, bass: 0.86, piano: 0.92 },
  ),
];

const section = (id, startBar, endBar, sectionName, patternId) => ({
  id,
  startBar,
  endBar,
  sectionType: sectionName.includes("Chorus") ? "chorus" : sectionName === "Intro" ? "intro" : sectionName === "Coda" || sectionName === "Ending" ? "outro" : "verse",
  sectionName,
  showSectionLabel: true,
  patternId,
  patternNameAuto: false,
  patternShared: false,
});

const LET_IT_BE_PERSONAL_PROJECT = {
  id: "personal-practice-let-it-be",
  title: "Let It Be",
  description: "개인 연습용 추천 진행 · 96마디 피아노 발라드와 소프트 팝 밴드 편곡",
  libraryType: "recommended-progression",
  builtIn: true,
  personalOnly: true,
  key: "C Major",
  difficulty: "개인 연습",
  timeSignature: "4/4",
  barCount: 96,
  slotFormatVersion: 2,
  slotsPerBar: 4,
  slots: LET_IT_BE_CHORD_BARS.flat(),
  splitSlots: [],
  repeatStarts: [],
  repeatEnds: [],
  barMarks: {},
  endingRanges: [],
  bpm: 76,
  transposeSemitones: 0,
  loop: false,
  pianoStyle: "custom",
  arrangementPatterns: LET_IT_BE_PATTERNS,
  arrangementOverrides: [
    section("personal-let-it-be-section-intro", 0, 3, "Intro", "personal-let-it-be-intro"),
    section("personal-let-it-be-section-verse-a", 4, 19, "Verse A", "personal-let-it-be-verse-a"),
    section("personal-let-it-be-section-verse-b", 20, 35, "Verse B", "personal-let-it-be-verse-b"),
    section("personal-let-it-be-section-chorus", 36, 51, "Chorus", "personal-let-it-be-chorus"),
    section("personal-let-it-be-section-verse-c", 52, 67, "Verse C", "personal-let-it-be-verse-c"),
    section("personal-let-it-be-section-final", 68, 83, "Final Chorus", "personal-let-it-be-final-chorus"),
    section("personal-let-it-be-section-coda", 84, 91, "Coda", "personal-let-it-be-coda"),
    section("personal-let-it-be-section-ending", 92, 95, "Ending", "personal-let-it-be-ending"),
  ],
};

export function getMiniChordPersonalRecommendedProgressions() {
  return JSON.parse(JSON.stringify([LET_IT_BE_PERSONAL_PROJECT]));
}
