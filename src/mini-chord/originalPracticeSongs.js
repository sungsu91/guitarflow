const STEP_COUNT = 16;

const emptySteps = (valueFactory) => Array.from(
  { length: STEP_COUNT },
  (_, index) => valueFactory(index),
);

const booleanSteps = (activeIndexes = []) => {
  const active = new Set(activeIndexes);
  return emptySteps((index) => active.has(index));
};

const drumBar = ({
  kick = [],
  snare = [],
  clap = [],
  rim = [],
  closedHat = [],
  openHat = [],
  tambourine = [],
  shaker = [],
  crash = [],
} = {}) => ({
  kick: booleanSteps(kick),
  snare: booleanSteps(snare),
  clap: booleanSteps(clap),
  rim: booleanSteps(rim),
  closedHat: booleanSteps(closedHat),
  openHat: booleanSteps(openHat),
  tambourine: booleanSteps(tambourine),
  shaker: booleanSteps(shaker),
  crash: booleanSteps(crash),
});

const bassBar = (attacks = [], { holdToEnd = false } = {}) => {
  const steps = emptySteps(() => "rest");
  const ordered = attacks
    .map(([index, value]) => [Math.max(0, Math.min(STEP_COUNT - 1, index)), value])
    .sort((left, right) => left[0] - right[0]);
  ordered.forEach(([index, value], attackIndex) => {
    steps[index] = value;
    const nextIndex = ordered[attackIndex + 1]?.[0] ?? (holdToEnd ? STEP_COUNT : index + 1);
    for (let cursor = index + 1; cursor < nextIndex; cursor += 1) steps[cursor] = "hold";
  });
  return steps;
};

const pianoBar = (events = []) => {
  const steps = emptySteps(() => ({ active: false, style: "chord", durationSteps: 1 }));
  events.forEach(([index, style, durationSteps = 1]) => {
    const safeIndex = Math.max(0, Math.min(STEP_COUNT - 1, index));
    steps[safeIndex] = {
      active: true,
      style,
      durationSteps: Math.max(1, Math.min(STEP_COUNT, durationSteps)),
    };
  });
  return steps;
};

const repeatBars = (bar, count) => Array.from({ length: count }, () => bar);
const fullBar = (chord) => [chord, "", "", ""];
const halfBar = (frontChord, backChord) => [frontChord, "", backChord, ""];
const quarterQuarterHalfBar = (firstChord, secondChord, finalChord) => [
  firstChord,
  secondChord,
  finalChord,
  "",
];

const FIRST_DRIVE_CHORD_BARS = [
  fullBar("G"), fullBar("D"), fullBar("Em"), fullBar("C"),
  fullBar("G"), fullBar("D"), fullBar("Em"), fullBar("C"),
  fullBar("G"), fullBar("D"), fullBar("Em"), fullBar("C"),
  fullBar("G"), fullBar("D"), fullBar("C"), fullBar("D"),
  fullBar("G"), fullBar("D"), fullBar("Em"), fullBar("C"),
  halfBar("Am", "D"), halfBar("G", "D"), fullBar("Em"), halfBar("C", "D"),
  fullBar("Em"), fullBar("C"), fullBar("G"), fullBar("D"),
  halfBar("Em", "C"), halfBar("G", "D"), halfBar("Am", "Bm"), halfBar("C", "D"),
  fullBar("G"), fullBar("D"), fullBar("Em"), fullBar("C"),
  fullBar("G"), fullBar("D"), halfBar("C", "D"), fullBar("G"),
  fullBar("G"), fullBar("D"), fullBar("Em"), fullBar("C"),
  halfBar("G", "D"), halfBar("Em", "C"), halfBar("Am", "D"), halfBar("C", "D"),
  fullBar("Em"), fullBar("C"), fullBar("G"), fullBar("D"),
  fullBar("Em"), fullBar("C"), halfBar("Am", "D"), fullBar("D"),
  fullBar("G"), fullBar("D"), fullBar("Em"), fullBar("C"),
  halfBar("G", "D"), halfBar("Em", "C"), halfBar("Am", "D"), fullBar("G"),
];

const NIGHT_WALK_CHORD_BARS = [
  fullBar("Am"), fullBar("Fmaj7"), fullBar("C"), fullBar("G"),
  fullBar("Am"), fullBar("Fmaj7"), halfBar("Dm7", "Em7"), fullBar("E7"),
  fullBar("Am"), fullBar("F"), fullBar("C"), fullBar("G"),
  fullBar("Am"), fullBar("F"), halfBar("Dm", "Em"), fullBar("E7"),
  fullBar("Am"), fullBar("F"), halfBar("C", "G"), fullBar("Am"),
  fullBar("Dm"), halfBar("F", "G"), halfBar("C", "Em"), fullBar("E7"),
  fullBar("Dm"), fullBar("Em"), fullBar("F"), fullBar("G"),
  halfBar("Dm", "Em"), halfBar("F", "G"), halfBar("Am", "G"), halfBar("F", "E7"),
  fullBar("Am"), fullBar("F"), fullBar("C"), fullBar("G"),
  fullBar("Am"), fullBar("F"), halfBar("Dm", "G"), halfBar("C", "E7"),
  fullBar("Am"), fullBar("F"), halfBar("C", "G"), fullBar("Am"),
  fullBar("Dm"), halfBar("F", "G"), halfBar("C", "Em"), halfBar("F", "E7"),
  fullBar("Dm"), fullBar("Am"), fullBar("F"), fullBar("E7"),
  halfBar("Dm", "Am"), halfBar("F", "G"), halfBar("C", "Em"), halfBar("F", "E7"),
  fullBar("Am"), fullBar("F"), fullBar("C"), fullBar("G"),
  halfBar("Am", "F"), halfBar("C", "G"), halfBar("Dm", "E7"), fullBar("Am"),
];

const WINDOW_AFTERNOON_CHORD_BARS = [
  fullBar("C"), fullBar("G"), fullBar("Am"), fullBar("F"),
  fullBar("C"), fullBar("G"), halfBar("F", "G"), fullBar("G"),
  fullBar("C"), fullBar("G"), fullBar("Am"), fullBar("F"),
  fullBar("C"), fullBar("G"), fullBar("F"), fullBar("G"),
  fullBar("Am"), fullBar("G"), fullBar("F"), fullBar("C"),
  halfBar("Dm", "G"), halfBar("C", "Am"), halfBar("F", "G"), fullBar("G"),
  fullBar("Am"), fullBar("Em"), fullBar("F"), fullBar("C"),
  halfBar("Dm", "Em"), halfBar("F", "G"), halfBar("Am", "G"), halfBar("F", "G"),
  fullBar("C"), fullBar("G"), fullBar("Am"), fullBar("F"),
  halfBar("C", "G"), halfBar("F", "G"), halfBar("C", "G"), halfBar("Am", "G"),
  fullBar("F"), fullBar("C"), fullBar("Dm"), fullBar("G"),
  halfBar("C", "G"), halfBar("Am", "F"), halfBar("Dm", "G"), fullBar("C"),
  fullBar("Am"), fullBar("F"), fullBar("C"), fullBar("G"),
  fullBar("Dm"), fullBar("Am"), halfBar("F", "G"), fullBar("G"),
  fullBar("C"), fullBar("G"), fullBar("Am"), fullBar("F"),
  halfBar("C", "G"), halfBar("Am", "F"), halfBar("Dm", "G"), fullBar("Cadd9"),
];

const WINDOW_LIGHT_CHORD_BARS = [
  fullBar("Cmaj7"), fullBar("Am7"), fullBar("Dm7"), fullBar("G7"),
  fullBar("Cmaj7"), fullBar("Am7"), halfBar("Dm7", "G7"), halfBar("Cmaj7", "A7"),
  fullBar("Cmaj7"), fullBar("Am7"), fullBar("Dm7"), fullBar("G7"),
  fullBar("Em7"), fullBar("A7"), fullBar("Dm7"), fullBar("G7"),
  fullBar("Cmaj7"), fullBar("Am7"), halfBar("Dm7", "G7"), fullBar("Cmaj7"),
  fullBar("Fmaj7"), halfBar("Em7", "A7"), halfBar("Dm7", "G7"), halfBar("Cmaj7", "A7"),
  fullBar("Fmaj7"), fullBar("Em7"), fullBar("Am7"), fullBar("D7"),
  halfBar("Dm7", "G7"), halfBar("Cmaj7", "A7"), halfBar("Dm7", "G7"), halfBar("Bm7b5", "E7"),
  fullBar("Cmaj7"), fullBar("Am7"), fullBar("Dm7"), fullBar("G7"),
  fullBar("Em7"), fullBar("A7"), halfBar("Dm7", "G7"), halfBar("Cmaj7", "A7"),
  fullBar("Fmaj7"), fullBar("Em7"), halfBar("Am7", "D7"), fullBar("G7"),
  fullBar("Cmaj7"), fullBar("A7"), halfBar("Dm7", "G7"), halfBar("Cmaj7", "A7"),
  fullBar("Dm7"), fullBar("Am7"), fullBar("Fmaj7"), fullBar("E7"),
  halfBar("Dm7", "G7"), halfBar("Cmaj7", "A7"), halfBar("Dm7", "G7"), halfBar("Bm7b5", "E7"),
  fullBar("Cmaj7"), fullBar("Am7"), fullBar("Dm7"), fullBar("G7"),
  halfBar("Em7", "A7"), halfBar("Dm7", "G7"), halfBar("Cmaj7", "A7"),
  quarterQuarterHalfBar("Dm7", "G7", "C6/9"),
];

const RUN_FORWARD_CHORD_BARS = [
  fullBar("G"), fullBar("D"), fullBar("Em"), fullBar("C"),
  fullBar("G"), fullBar("D"), halfBar("Em", "C"), fullBar("D"),
  fullBar("G"), fullBar("D"), fullBar("Em"), fullBar("C"),
  fullBar("G"), fullBar("D"), halfBar("C", "D"), fullBar("G"),
  fullBar("G"), fullBar("D"), halfBar("Em", "C"), fullBar("G"),
  fullBar("Am"), halfBar("C", "D"), halfBar("G", "D"), halfBar("Em", "C"),
  fullBar("Em"), fullBar("C"), fullBar("G"), fullBar("D"),
  halfBar("Em", "C"), halfBar("G", "D"), halfBar("Am", "Bm"), halfBar("C", "D"),
  fullBar("G"), fullBar("D"), fullBar("Em"), fullBar("C"),
  fullBar("G"), fullBar("D"), halfBar("Em", "C"), fullBar("G"),
  fullBar("G"), fullBar("D"), halfBar("Em", "C"), fullBar("G"),
  fullBar("Am"), halfBar("C", "D"), halfBar("G", "D"), halfBar("Em", "C"),
  fullBar("Em"), fullBar("C"), fullBar("G"), fullBar("D"),
  halfBar("Am", "C"), halfBar("G", "D"), fullBar("Em"), halfBar("C", "D"),
  fullBar("G"), fullBar("D"), fullBar("Em"), fullBar("C"),
  halfBar("G", "D"), halfBar("Em", "C"), halfBar("Am", "D"), fullBar("Gadd9"),
];

const hats8 = [0, 2, 4, 6, 8, 10, 12, 14];
const hats16 = Array.from({ length: STEP_COUNT }, (_, index) => index);
const hatsQuarter = [0, 4, 8, 12];

const verseDrum = drumBar({ kick: [0, 8], snare: [4, 12], closedHat: hats8 });
const chorusDrum = drumBar({ kick: [0, 6, 8, 11], snare: [4, 12], closedHat: hats16 });
const finalDrum = drumBar({ kick: [0, 3, 6, 8, 11], snare: [4, 12], closedHat: hats16 });
const quarterBass = bassBar([[0, "root"], [4, "fifth"], [8, "octave"], [12, "fifth"]]);
const introPulseBass = bassBar([[0, "root"], [4, "octave"], [8, "fifth"], [12, "octave"]]);
const introPulseApproachBass = bassBar([[0, "root"], [4, "octave"], [8, "fifth"], [12, "approach"]]);
const drivingBass = bassBar([[0, "root"], [4, "fifth"], [8, "octave"], [12, "fifth"]]);
const approachBass = bassBar([[0, "root"], [4, "fifth"], [8, "octave"], [12, "approach"]]);
const halfBarBass = bassBar([[0, "root"], [4, "fifth"], [8, "root"], [12, "fifth"]]);
const chorusPiano = pianoBar([[0, "stab"], [3, "stab"], [8, "stab"], [11, "stab"]]);
const halfBarPiano = pianoBar([[0, "stab"], [6, "stab"], [8, "stab"], [14, "stab"]]);

const makePattern = (id, name, drum, bass, piano, levels) => ({
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
      displayName: drum.name,
      level: levels.drum,
      steps: drum.bars[0],
      barSteps: drum.bars,
    },
    bass: {
      type: "bass",
      version: 1,
      presetId: "custom",
      displayName: bass.name,
      level: levels.bass,
      steps: bass.bars[0],
      barSteps: bass.bars,
    },
    piano: {
      type: "piano",
      version: 1,
      presetId: "custom",
      displayName: piano.name,
      level: levels.piano,
      voicing: "guideTones",
      steps: piano.bars[0],
      barSteps: piano.bars,
    },
  },
  tempoOverrideEnabled: false,
  bpmOverride: 96,
});

const FIRST_DRIVE_ARRANGEMENT_PATTERNS = [
  makePattern(
    "first-drive-intro-minimal",
    "Intro Minimal · Root Hold · Air Arp",
    {
      name: "introMinimal",
      bars: [
        drumBar({ kick: [0], shaker: [0, 8] }),
        drumBar({ kick: [0], shaker: [0, 8] }),
        drumBar({ kick: [0], rim: [8], closedHat: hatsQuarter }),
        drumBar({ kick: [0], rim: [8], closedHat: hatsQuarter, snare: [14, 15] }),
      ],
    },
    {
      name: "introRootHold",
      bars: [
        ...repeatBars(bassBar([[0, "root"], [8, "fifth"]]), 3),
        bassBar([[0, "root"], [8, "fifth"], [15, "approach"]]),
      ],
    },
    {
      name: "introAirArp",
      bars: repeatBars(pianoBar([[0, "arpUp", 4], [4, "arpDown", 3], [8, "arpUp", 4], [12, "hold", 4]]), 4),
    },
    { drum: 0.4, bass: 0.54, piano: 0.5 },
  ),
  makePattern(
    "first-drive-intro-build",
    "Intro Build · Pulse · Arp + Stab",
    {
      name: "introBuild",
      bars: [
        ...repeatBars(drumBar({ kick: [0, 8], rim: [12], closedHat: hats8 }), 3),
        drumBar({ kick: [0, 8], rim: [12, 15], snare: [14], closedHat: hats8 }),
      ],
    },
    {
      name: "introPulse",
      bars: [introPulseBass, introPulseBass, introPulseBass, introPulseApproachBass],
    },
    {
      name: "introArpStab",
      bars: repeatBars(pianoBar([[0, "arpUp", 4], [7, "chord"], [8, "arpDown", 4], [12, "stab"]]), 4),
    },
    { drum: 0.56, bass: 0.64, piano: 0.56 },
  ),
  makePattern(
    "first-drive-verse-pop-8",
    "Verse Pop 8 · Root Fifth · Soft Comp",
    {
      name: "versePop8",
      bars: [...repeatBars(verseDrum, 7), drumBar({ kick: [0, 8], snare: [4, 12, 14, 15], closedHat: hats8 })],
    },
    {
      name: "verseRootFifth",
      bars: [...repeatBars(quarterBass, 7), approachBass],
    },
    {
      name: "verseSoftComp",
      bars: repeatBars(pianoBar([[0, "chord", 3], [6, "chord"], [8, "chord", 3], [14, "chord"]]), 8),
    },
    { drum: 0.68, bass: 0.72, piano: 0.62 },
  ),
  makePattern(
    "first-drive-verse-lift",
    "Verse Lift · Moving · Motion",
    {
      name: "verseLift",
      bars: [
        ...repeatBars(drumBar({ kick: [0, 8], snare: [4, 12], closedHat: [...hats8, 7, 15] }), 4),
        ...repeatBars(drumBar({ kick: [0, 6, 8], snare: [4, 12], closedHat: hats8 }), 3),
        drumBar({ kick: [0, 6, 8], snare: [4, 12, 14, 15], closedHat: hats8 }),
      ],
    },
    {
      name: "verseMoving",
      bars: [quarterBass, quarterBass, quarterBass, quarterBass, halfBarBass, halfBarBass, approachBass, halfBarBass],
    },
    {
      name: "verseMotion",
      bars: [
        ...repeatBars(pianoBar([[0, "chord", 3], [6, "stab"], [8, "chord", 3], [14, "stab"]]), 4),
        ...repeatBars(pianoBar([[0, "chord", 3], [6, "stab"], [8, "chord", 3], [14, "stab"]]), 4),
      ],
    },
    { drum: 0.76, bass: 0.8, piano: 0.7 },
  ),
  makePattern(
    "first-drive-pre-build",
    "Pre Build · Rise · Build Comp",
    {
      name: "preBuild",
      bars: [
        ...repeatBars(drumBar({ kick: [0, 8, 11], snare: [4, 12], closedHat: [...hats8, 15] }), 3),
        drumBar({ kick: [0, 8, 11], snare: [4, 12, 14, 15], closedHat: [...hats8, 15] }),
        ...repeatBars(drumBar({ kick: [0, 6, 8, 11], snare: [4, 12], closedHat: [...hats8, 3, 7, 15] }), 3),
        drumBar({ kick: [0, 6, 8, 11], snare: [4, 12, 14], rim: [15], closedHat: [...hats8, 3, 7] }),
      ],
    },
    {
      name: "preRise",
      bars: [approachBass, approachBass, approachBass, approachBass, halfBarBass, halfBarBass, halfBarBass, halfBarBass],
    },
    {
      name: "preBuildComp",
      bars: [
        ...repeatBars(pianoBar([[0, "chord", 3], [4, "stab"], [8, "chord", 3], [12, "stab"]]), 4),
        ...repeatBars(halfBarPiano, 4),
      ],
    },
    { drum: 0.86, bass: 0.86, piano: 0.8 },
  ),
  makePattern(
    "first-drive-chorus-pop-16",
    "Chorus Pop 16 · Drive · Stab",
    {
      name: "chorusPop16",
      bars: [
        { ...chorusDrum, crash: booleanSteps([0]) },
        chorusDrum,
        chorusDrum,
        drumBar({ kick: [0, 6, 8, 11], snare: [4, 12, 14, 15], closedHat: hats16 }),
        { ...chorusDrum, crash: booleanSteps([0]) },
        chorusDrum,
        chorusDrum,
        drumBar({ kick: [0, 6, 8, 11], snare: [4, 12, 14, 15], closedHat: hats16 }),
      ],
    },
    {
      name: "chorusDrive",
      bars: [drivingBass, drivingBass, drivingBass, approachBass, drivingBass, drivingBass, halfBarBass, drivingBass],
    },
    {
      name: "chorusStab",
      bars: [...repeatBars(chorusPiano, 6), halfBarPiano, chorusPiano],
    },
    { drum: 1, bass: 0.95, piano: 0.9 },
  ),
  makePattern(
    "first-drive-chorus-sustain",
    "Chorus Sustain · Half-Bar Drive · Half-Bar Stab",
    {
      name: "chorusSustain",
      bars: [
        chorusDrum,
        chorusDrum,
        chorusDrum,
        drumBar({ kick: [0, 6, 8, 11], snare: [4, 12, 14], closedHat: hats16 }),
        ...repeatBars(drumBar({ kick: [0, 3, 6, 8, 11], snare: [4, 12], closedHat: hats16 }), 3),
        drumBar({ kick: [0, 3, 6, 8, 11], snare: [4, 12, 14], rim: [15], closedHat: hats8 }),
      ],
    },
    {
      name: "chorusHalfBarDrive",
      bars: [drivingBass, drivingBass, drivingBass, approachBass, halfBarBass, halfBarBass, halfBarBass, halfBarBass],
    },
    {
      name: "chorusHalfBarStab",
      bars: [...repeatBars(chorusPiano, 4), ...repeatBars(halfBarPiano, 4)],
    },
    { drum: 1.02, bass: 0.98, piano: 0.92 },
  ),
  makePattern(
    "first-drive-bridge-half-time",
    "Bridge Half-Time · Space · Air",
    {
      name: "bridgeHalfTime",
      bars: [
        ...repeatBars(drumBar({ kick: [0, 8], rim: [12], closedHat: hatsQuarter }), 6),
        drumBar({ kick: [0, 8], snare: [12], closedHat: hats8 }),
        drumBar({ kick: [0, 8], snare: [12, 14], rim: [15], closedHat: hats8 }),
      ],
    },
    {
      name: "bridgeSpace",
      bars: [
        ...repeatBars(bassBar([[0, "root"], [8, "fifth"]]), 6),
        halfBarBass,
        bassBar([[0, "root"], [12, "approach"]]),
      ],
    },
    {
      name: "bridgeAir",
      bars: [
        ...repeatBars(pianoBar([[0, "hold", 8], [8, "arpUp", 4]]), 6),
        halfBarPiano,
        pianoBar([[0, "hold", 8], [10, "arpUp", 5]]),
      ],
    },
    { drum: 0.64, bass: 0.64, piano: 0.58 },
  ),
  makePattern(
    "first-drive-final-full",
    "Final Full · Final Bass · Chorus Ending",
    {
      name: "finalFull",
      bars: [
        { ...finalDrum, crash: booleanSteps([0]) },
        finalDrum,
        { ...finalDrum, crash: booleanSteps([0]) },
        drumBar({ kick: [0, 3, 6, 8, 11], snare: [4, 12, 14], closedHat: hats16 }),
        chorusDrum,
        chorusDrum,
        drumBar({ kick: [0, 6, 8, 11], snare: [4, 12, 14], rim: [15], closedHat: hats16 }),
        drumBar({ kick: [0], snare: [0], crash: [0] }),
      ],
    },
    {
      name: "finalFullBass",
      bars: [drivingBass, drivingBass, drivingBass, approachBass, halfBarBass, halfBarBass, halfBarBass, bassBar([[0, "root"]], { holdToEnd: true })],
    },
    {
      name: "finalChorusEnding",
      bars: [
        ...repeatBars(chorusPiano, 4),
        ...repeatBars(halfBarPiano, 3),
        pianoBar([[0, "hold", 16], [8, "chord", 7]]),
      ],
    },
    { drum: 1.08, bass: 1, piano: 0.96 },
  ),
];

const nightFullMotionBass = bassBar([[0, "root"], [4, "fifth"], [8, "octave"], [12, "approach"]]);
const nightHalfBarBass = bassBar([[0, "root"], [4, "fifth"], [8, "root"], [12, "fifth"]]);
const nightFullPiano = pianoBar([[0, "chord", 3], [8, "chord", 3]]);
const nightHalfBarPiano = pianoBar([[0, "chord", 3], [8, "chord", 3]]);
const nightHalfBarStab = pianoBar([[0, "stab"], [8, "stab"]]);

const NIGHT_WALK_ARRANGEMENT_PATTERNS = [
  makePattern(
    "night-walk-intro-minimal",
    "Night Intro · Night Root Hold · Night Air Arp",
    {
      name: "nightIntro",
      bars: repeatBars(drumBar({ kick: [0], shaker: [0, 8] }), 4),
    },
    {
      name: "nightRootHold",
      bars: [
        ...repeatBars(bassBar([[0, "root"], [8, "fifth"]]), 3),
        bassBar([[0, "root"], [8, "fifth"], [15, "approach"]]),
      ],
    },
    {
      name: "nightAirArp",
      bars: repeatBars(pianoBar([[0, "arpUp", 4], [8, "arpDown", 4], [12, "hold", 4]]), 4),
    },
    { drum: 0.32, bass: 0.46, piano: 0.48 },
  ),
  makePattern(
    "night-walk-intro-build",
    "Intro Build · Intro Pulse · Arp + Stab",
    {
      name: "introBuild",
      bars: [
        ...repeatBars(drumBar({ kick: [0, 8], rim: [12], closedHat: hats8 }), 3),
        drumBar({ kick: [0, 8], rim: [12], snare: [14, 15], closedHat: hats8 }),
      ],
    },
    {
      name: "introPulse",
      bars: [
        bassBar([[0, "root"], [8, "fifth"], [15, "approach"]]),
        bassBar([[0, "root"], [8, "octave"], [15, "approach"]]),
        nightHalfBarBass,
        bassBar([[0, "root"], [8, "fifth"], [15, "third"]]),
      ],
    },
    {
      name: "introArpStab",
      bars: [
        ...repeatBars(pianoBar([[0, "arpUp", 4], [6, "stab"], [8, "arpDown", 3], [12, "stab"]]), 2),
        nightHalfBarPiano,
        pianoBar([[0, "arpUp", 4], [8, "chord", 3], [12, "stab"]]),
      ],
    },
    { drum: 0.48, bass: 0.56, piano: 0.54 },
  ),
  makePattern(
    "night-walk-soft-verse-8",
    "Soft Verse 8 · Verse Support · Soft Comp",
    {
      name: "softVerse8",
      bars: [
        ...repeatBars(verseDrum, 7),
        drumBar({ kick: [0, 8], snare: [4, 12, 14, 15], closedHat: hats8 }),
      ],
    },
    {
      name: "verseSupport",
      bars: [
        ...repeatBars(quarterBass, 6),
        nightHalfBarBass,
        bassBar([[0, "root"], [4, "fifth"], [8, "flatSeventh"], [12, "third"]]),
      ],
    },
    {
      name: "verseSoftComp",
      bars: [
        ...repeatBars(pianoBar([[0, "chord", 3], [6, "stab"], [8, "chord", 3], [14, "stab"]]), 6),
        nightHalfBarPiano,
        pianoBar([[0, "chord", 3], [6, "stab"], [8, "chord", 3], [14, "stab"]]),
      ],
    },
    { drum: 0.58, bass: 0.64, piano: 0.58 },
  ),
  makePattern(
    "night-walk-verse-lift",
    "Verse Lift · Half-Bar Motion · Verse Motion",
    {
      name: "verseLift",
      bars: [
        ...repeatBars(drumBar({ kick: [0, 7, 8], snare: [4, 12], closedHat: [...hats8, 15] }), 7),
        drumBar({ kick: [0, 7, 8], snare: [4, 12, 13, 14, 15], closedHat: [...hats8, 15] }),
      ],
    },
    {
      name: "halfBarMotion",
      bars: [
        nightFullMotionBass,
        nightFullMotionBass,
        nightHalfBarBass,
        nightFullMotionBass,
        nightFullMotionBass,
        nightHalfBarBass,
        nightHalfBarBass,
        bassBar([[0, "root"], [4, "fifth"], [8, "octave"], [12, "third"]]),
      ],
    },
    {
      name: "verseMotion",
      bars: [
        nightFullPiano,
        nightFullPiano,
        nightHalfBarPiano,
        nightFullPiano,
        nightFullPiano,
        nightHalfBarPiano,
        nightHalfBarPiano,
        pianoBar([[0, "chord", 3], [8, "chord", 3], [14, "stab"]]),
      ],
    },
    { drum: 0.68, bass: 0.74, piano: 0.66 },
  ),
  makePattern(
    "night-walk-pre-build",
    "Pre Build · Rising Motion · Build Comp",
    {
      name: "preBuild",
      bars: [
        ...repeatBars(drumBar({ kick: [0, 8, 11], snare: [4, 12], closedHat: [...hats8, 15] }), 4),
        ...repeatBars(drumBar({ kick: [0, 6, 8, 11], snare: [4, 12], closedHat: [...hats8, 3, 7, 15] }), 3),
        drumBar({ kick: [0, 6, 8, 11], snare: [4, 12, 13, 14], closedHat: [...hats8, 3, 7] }),
      ],
    },
    {
      name: "risingMotion",
      bars: [
        ...repeatBars(nightFullMotionBass, 4),
        nightHalfBarBass,
        nightHalfBarBass,
        nightHalfBarBass,
        bassBar([[0, "root"], [4, "fifth"], [8, "root"], [12, "fifth"], [14, "third"]]),
      ],
    },
    {
      name: "preBuildComp",
      bars: [
        ...repeatBars(pianoBar([[0, "chord", 3], [6, "stab"], [8, "chord", 3]]), 4),
        ...repeatBars(halfBarPiano, 3),
        pianoBar([[0, "chord", 3], [6, "stab"], [8, "chord", 3]]),
      ],
    },
    { drum: 0.82, bass: 0.84, piano: 0.76 },
  ),
  makePattern(
    "night-walk-warm-chorus-16",
    "Warm Chorus 16 · Chorus Drive · Chorus Stab",
    {
      name: "warmChorus16",
      bars: [
        { ...chorusDrum, crash: booleanSteps([0]) },
        chorusDrum,
        chorusDrum,
        drumBar({ kick: [0, 6, 8, 11], snare: [4, 12, 14, 15], closedHat: hats16 }),
        { ...chorusDrum, crash: booleanSteps([0]) },
        chorusDrum,
        chorusDrum,
        drumBar({ kick: [0, 6, 8, 11], snare: [4, 12, 14, 15], closedHat: hats16 }),
      ],
    },
    {
      name: "chorusDrive",
      bars: [
        drivingBass,
        drivingBass,
        drivingBass,
        approachBass,
        drivingBass,
        drivingBass,
        nightHalfBarBass,
        bassBar([[0, "root"], [4, "fifth"], [8, "root"], [12, "fifth"], [14, "third"]]),
      ],
    },
    {
      name: "chorusStab",
      bars: [...repeatBars(chorusPiano, 6), nightHalfBarStab, nightHalfBarStab],
    },
    { drum: 0.98, bass: 0.94, piano: 0.88 },
  ),
  makePattern(
    "night-walk-chorus-sustain",
    "Chorus Sustain · Chorus Half-Bar · Half-Bar Stab",
    {
      name: "chorusSustain",
      bars: [
        chorusDrum,
        chorusDrum,
        chorusDrum,
        chorusDrum,
        ...repeatBars(drumBar({ kick: [0, 3, 6, 8, 11], snare: [4, 12], closedHat: hats16 }), 3),
        drumBar({ kick: [0, 3, 6, 8, 11], snare: [4, 12, 14], closedHat: hats16 }),
      ],
    },
    {
      name: "chorusHalfBar",
      bars: [
        drivingBass,
        drivingBass,
        nightHalfBarBass,
        drivingBass,
        drivingBass,
        nightHalfBarBass,
        nightHalfBarBass,
        nightHalfBarBass,
      ],
    },
    {
      name: "halfBarStab",
      bars: [chorusPiano, chorusPiano, nightHalfBarStab, chorusPiano, chorusPiano, nightHalfBarStab, nightHalfBarStab, nightHalfBarStab],
    },
    { drum: 1, bass: 0.96, piano: 0.9 },
  ),
  makePattern(
    "night-walk-bridge-half-time",
    "Half-Time Bridge · Bridge Space · Bridge Air",
    {
      name: "halfTimeBridge",
      bars: [
        ...repeatBars(drumBar({ kick: [0, 8], rim: [12], closedHat: hatsQuarter }), 6),
        drumBar({ kick: [0, 8], snare: [12], closedHat: hats8 }),
        drumBar({ kick: [0, 8], snare: [12, 13, 14], closedHat: hats8 }),
      ],
    },
    {
      name: "bridgeSpace",
      bars: [
        ...repeatBars(bassBar([[0, "root"], [8, "fifth"]]), 6),
        nightHalfBarBass,
        bassBar([[0, "root"], [4, "fifth"], [8, "root"], [12, "fifth"], [14, "third"]]),
      ],
    },
    {
      name: "bridgeAir",
      bars: [
        ...repeatBars(pianoBar([[0, "hold", 8], [8, "arpUp", 3]]), 6),
        nightHalfBarPiano,
        nightHalfBarPiano,
      ],
    },
    { drum: 0.56, bass: 0.58, piano: 0.54 },
  ),
  makePattern(
    "night-walk-final-full",
    "Final Full · Final Ending · Final Ending Piano",
    {
      name: "finalFull",
      bars: [
        { ...finalDrum, crash: booleanSteps([0]) },
        finalDrum,
        { ...finalDrum, crash: booleanSteps([0]) },
        finalDrum,
        chorusDrum,
        chorusDrum,
        drumBar({ kick: [0, 6, 8, 11], snare: [4, 12, 13, 14, 15], closedHat: hats16 }),
        drumBar({ kick: [0], snare: [0], crash: [0] }),
      ],
    },
    {
      name: "finalEnding",
      bars: [
        drivingBass,
        drivingBass,
        drivingBass,
        approachBass,
        nightHalfBarBass,
        nightHalfBarBass,
        bassBar([[0, "root"], [4, "fifth"], [8, "root"], [12, "fifth"], [14, "third"]]),
        bassBar([[0, "root"]], { holdToEnd: true }),
      ],
    },
    {
      name: "finalEndingPiano",
      bars: [
        ...repeatBars(chorusPiano, 4),
        ...repeatBars(nightHalfBarStab, 3),
        pianoBar([[0, "hold", 16]]),
      ],
    },
    { drum: 1.08, bass: 1, piano: 0.96 },
  ),
];

const WINDOW_AFTERNOON_ARRANGEMENT_PATTERNS = FIRST_DRIVE_ARRANGEMENT_PATTERNS.map((pattern) => ({
  ...pattern,
  id: pattern.id.replace("first-drive", "window-afternoon"),
}));

const jazzMajorWalk = bassBar([[0, "root"], [4, "fifth"], [8, "seventh"], [12, "approach"]]);
const jazzMinorWalk = bassBar([[0, "root"], [4, "fifth"], [8, "flatSeventh"], [12, "approach"]]);
const jazzDominantWalk = bassBar([[0, "root"], [4, "fifth"], [8, "flatSeventh"], [12, "third"]]);
const jazzHalfBarWalk = bassBar([[0, "root"], [4, "fifth"], [8, "root"], [12, "third"]]);
const jazzSoftComp = pianoBar([[0, "stab"], [6, "stab"], [10, "stab"]]);
const jazzDominantComp = pianoBar([[0, "stab"], [7, "stab"], [8, "hold", 6]]);
const jazzMovingComp = pianoBar([[0, "stab"], [5, "stab"], [8, "arpUp", 3]]);
const jazzHalfBarComp = pianoBar([[0, "stab"], [4, "stab"], [8, "stab"], [12, "stab"]]);
const jazzChorusComp = pianoBar([[0, "stab"], [3, "stab"], [8, "stab"], [11, "stab"]]);

const WINDOW_LIGHT_ARRANGEMENT_PATTERNS = [
  makePattern(
    "window-light-intro-brush-air",
    "Intro Brush Air · Intro Root Guide · Intro Air Arp",
    {
      name: "drum_introBrushAir",
      bars: repeatBars(drumBar({ kick: [0], shaker: [4, 12] }), 4),
    },
    {
      name: "bass_introRootGuide",
      bars: [
        bassBar([[0, "root"], [8, "fifth"], [12, "approach"]]),
        bassBar([[0, "root"], [8, "fifth"], [12, "approach"]]),
        bassBar([[0, "root"], [8, "fifth"], [12, "approach"]]),
        bassBar([[0, "root"], [8, "fifth"], [12, "third"]], { holdToEnd: true }),
      ],
    },
    {
      name: "piano_introAirArp",
      bars: [
        ...repeatBars(pianoBar([[0, "arpUp", 4], [8, "arpDown", 4], [12, "hold", 4]]), 3),
        pianoBar([[0, "arpUp", 4], [6, "stab"], [8, "hold", 6]]),
      ],
    },
    { drum: 0.3, bass: 0.48, piano: 0.5 },
  ),
  makePattern(
    "window-light-intro-brush-pulse",
    "Intro Brush Pulse · Walking Light · Comp Light",
    {
      name: "drum_introBrushPulse",
      bars: repeatBars(drumBar({ kick: [0, 8], rim: [12], shaker: [2, 4, 6, 10, 12, 14] }), 4),
    },
    {
      name: "bass_introWalkingLight",
      bars: [jazzMajorWalk, jazzMinorWalk, nightHalfBarBass, jazzHalfBarWalk],
    },
    {
      name: "piano_introCompLight",
      bars: [
        ...repeatBars(pianoBar([[0, "stab"], [6, "stab"], [8, "arpUp", 4]]), 2),
        pianoBar([[0, "stab"], [8, "stab"]]),
        pianoBar([[0, "stab"], [8, "stab"]]),
      ],
    },
    { drum: 0.46, bass: 0.6, piano: 0.58 },
  ),
  makePattern(
    "window-light-verse-bossa",
    "Verse Bossa Light · Walk Basic · Soft Comp",
    {
      name: "drum_verseBossaLight",
      bars: repeatBars(drumBar({ kick: [0, 6, 8], rim: [4, 12], shaker: [2, 10, 14], closedHat: [15] }), 8),
    },
    {
      name: "bass_verseWalkBasic",
      bars: [
        jazzMajorWalk,
        jazzMinorWalk,
        jazzMinorWalk,
        bassBar([[0, "root"], [4, "fifth"], [8, "flatSeventh"], [12, "approach"]]),
        jazzMinorWalk,
        jazzDominantWalk,
        jazzMinorWalk,
        jazzDominantWalk,
      ],
    },
    {
      name: "piano_verseSoftComp",
      bars: [jazzSoftComp, jazzSoftComp, jazzSoftComp, jazzDominantComp, jazzSoftComp, jazzDominantComp, jazzSoftComp, jazzDominantComp],
    },
    { drum: 0.58, bass: 0.7, piano: 0.62 },
  ),
  makePattern(
    "window-light-verse-moving-bossa",
    "Verse Moving Bossa · Walk Motion · Motion Comp",
    {
      name: "drum_verseMovingBossa",
      bars: repeatBars(drumBar({ kick: [0, 5, 8, 11], rim: [4, 12], shaker: [2, 6, 10, 14], closedHat: [15] }), 8),
    },
    {
      name: "bass_verseWalkMotion",
      bars: [
        jazzMajorWalk,
        jazzMinorWalk,
        jazzHalfBarWalk,
        bassBar([[0, "root"], [4, "fifth"], [8, "seventh"], [12, "third"]]),
        jazzMajorWalk,
        jazzHalfBarWalk,
        jazzHalfBarWalk,
        jazzHalfBarWalk,
      ],
    },
    {
      name: "piano_verseMotionComp",
      bars: [jazzMovingComp, jazzMovingComp, jazzHalfBarComp, jazzMovingComp, jazzMovingComp, jazzHalfBarComp, jazzHalfBarComp, jazzHalfBarComp],
    },
    { drum: 0.68, bass: 0.78, piano: 0.7 },
  ),
  makePattern(
    "window-light-pre-build-jazz",
    "Pre Build Jazz · Chromatic Approach · Build Comp",
    {
      name: "drum_preBuildJazz",
      bars: [
        ...repeatBars(drumBar({ kick: [0, 6, 8, 11], rim: [4, 12], shaker: [2, 6, 10, 14], closedHat: [1, 5, 9, 13] }), 7),
        drumBar({ kick: [0, 6, 8, 11], rim: [4, 12], snare: [13, 14], shaker: [2, 6, 10], closedHat: [1, 5, 9] }),
      ],
    },
    {
      name: "bass_preChromaticApproach",
      bars: [
        jazzMajorWalk,
        jazzMinorWalk,
        jazzMinorWalk,
        bassBar([[0, "root"], [4, "fifth"], [8, "flatSeventh"], [12, "approach"]]),
        jazzHalfBarWalk,
        jazzHalfBarWalk,
        jazzHalfBarWalk,
        bassBar([[0, "root"], [4, "flatFifth"], [8, "root"], [12, "third"]]),
      ],
    },
    {
      name: "piano_preBuildComp",
      bars: [
        ...repeatBars(pianoBar([[0, "stab"], [3, "stab"], [6, "stab"], [8, "stab"], [13, "stab"]]), 3),
        pianoBar([[0, "stab"], [4, "stab"], [8, "hold", 5]]),
        ...repeatBars(jazzHalfBarComp, 3),
        pianoBar([[0, "stab"], [8, "stab"], [12, "stab"]]),
      ],
    },
    { drum: 0.82, bass: 0.88, piano: 0.8 },
  ),
  makePattern(
    "window-light-chorus-jazz-pop",
    "Chorus Jazz Pop · Walking Drive · Syncopated Comp",
    {
      name: "drum_chorusJazzPop",
      bars: [
        drumBar({ kick: [0, 3, 6, 8, 11], snare: [4, 12], closedHat: hats8, shaker: [15], crash: [0] }),
        ...repeatBars(drumBar({ kick: [0, 3, 6, 8, 11], snare: [4, 12], closedHat: hats8, shaker: [15] }), 3),
        drumBar({ kick: [0, 3, 6, 8, 11], snare: [4, 12], closedHat: hats8, shaker: [15], crash: [0] }),
        ...repeatBars(drumBar({ kick: [0, 3, 6, 8, 11], snare: [4, 12], closedHat: hats8, shaker: [15] }), 3),
      ],
    },
    {
      name: "bass_chorusWalkingDrive",
      bars: [jazzMajorWalk, jazzMinorWalk, jazzMinorWalk, jazzMinorWalk, jazzMinorWalk, jazzDominantWalk, jazzHalfBarWalk, jazzHalfBarWalk],
    },
    {
      name: "piano_chorusSyncopatedComp",
      bars: [jazzChorusComp, jazzChorusComp, jazzChorusComp, jazzHalfBarComp, jazzChorusComp, jazzHalfBarComp, jazzHalfBarComp, jazzHalfBarComp],
    },
    { drum: 0.98, bass: 0.98, piano: 0.92 },
  ),
  makePattern(
    "window-light-chorus-lift",
    "Chorus Lift · Half-Bar Walk · Lift Comp",
    {
      name: "drum_chorusLift",
      bars: [
        ...repeatBars(drumBar({ kick: [0, 3, 6, 8, 11, 14], snare: [4, 12], closedHat: hats16 }), 7),
        drumBar({ kick: [0, 3, 6, 8, 11, 14], snare: [4, 12, 13, 14], closedHat: hats16.slice(0, 15) }),
      ],
    },
    {
      name: "bass_chorusHalfBarWalk",
      bars: [jazzMajorWalk, jazzMinorWalk, jazzHalfBarWalk, jazzDominantWalk, jazzMajorWalk, jazzDominantWalk, jazzHalfBarWalk, jazzHalfBarWalk],
    },
    {
      name: "piano_chorusLiftComp",
      bars: [
        ...repeatBars(pianoBar([[0, "stab"], [3, "stab"], [6, "stab"], [8, "stab"], [13, "stab"]]), 2),
        jazzHalfBarComp,
        pianoBar([[0, "stab"], [4, "stab"], [8, "hold", 3], [14, "stab"]]),
        pianoBar([[0, "stab"], [3, "stab"], [6, "stab"], [8, "stab"], [13, "stab"]]),
        pianoBar([[0, "stab"], [4, "stab"], [8, "hold", 3], [14, "stab"]]),
        jazzHalfBarComp,
        pianoBar([[0, "stab"], [4, "stab"], [8, "stab"]]),
      ],
    },
    { drum: 1.06, bass: 1, piano: 0.96 },
  ),
  makePattern(
    "window-light-bridge-half-time",
    "Bridge Half-Time Brush · Space Walk · Air Voicing",
    {
      name: "drum_bridgeHalfTimeBrush",
      bars: [
        ...repeatBars(drumBar({ kick: [0, 8], rim: [12], shaker: [0, 4, 8, 12], closedHat: [15] }), 7),
        drumBar({ kick: [0, 8], rim: [12], snare: [13, 14], shaker: [0, 4, 8] }),
      ],
    },
    {
      name: "bass_bridgeSpaceWalk",
      bars: [
        bassBar([[0, "root"], [8, "fifth"]]),
        bassBar([[0, "root"], [8, "fifth"]]),
        bassBar([[0, "root"], [8, "fifth"]]),
        bassBar([[0, "root"], [8, "fifth"], [12, "third"]]),
        nightHalfBarBass,
        nightHalfBarBass,
        nightHalfBarBass,
        bassBar([[0, "root"], [4, "flatFifth"], [8, "root"], [12, "third"]]),
      ],
    },
    {
      name: "piano_bridgeAirVoicing",
      bars: [
        ...repeatBars(pianoBar([[0, "hold", 4], [8, "arpUp", 3]]), 3),
        pianoBar([[0, "hold", 7], [8, "stab"]]),
        ...repeatBars(pianoBar([[0, "stab"], [8, "stab"]]), 3),
        pianoBar([[0, "stab"], [8, "stab"]]),
      ],
    },
    { drum: 0.54, bass: 0.62, piano: 0.58 },
  ),
  makePattern(
    "window-light-final-jazz-pop",
    "Final Jazz Pop · Walking Drive · Syncopated Comp",
    {
      name: "drum_finalJazzPop",
      bars: [
        drumBar({ kick: [0, 3, 6, 8, 11, 14], snare: [4, 12], closedHat: hats16, crash: [0] }),
        drumBar({ kick: [0, 3, 6, 8, 11, 14], snare: [4, 12], closedHat: hats16 }),
        drumBar({ kick: [0, 3, 6, 8, 11, 14], snare: [4, 12], closedHat: hats16, crash: [0] }),
        ...repeatBars(drumBar({ kick: [0, 3, 6, 8, 11, 14], snare: [4, 12], closedHat: hats16 }), 3),
        drumBar({ kick: [0, 3, 6, 8, 11, 14], snare: [4, 12, 13, 14], closedHat: hats16.slice(0, 15) }),
      ],
    },
    {
      name: "bass_finalWalkingDrive",
      bars: [jazzMajorWalk, jazzMinorWalk, jazzMinorWalk, jazzMinorWalk, jazzHalfBarWalk, jazzHalfBarWalk, jazzHalfBarWalk],
    },
    {
      name: "piano_finalSyncopatedComp",
      bars: [jazzChorusComp, jazzChorusComp, jazzChorusComp, jazzHalfBarComp, jazzHalfBarComp, jazzHalfBarComp, jazzHalfBarComp],
    },
    { drum: 1.08, bass: 1.02, piano: 0.98 },
  ),
  makePattern(
    "window-light-ending-hold",
    "Ending Hold · C6/9 Bass · C6/9 Piano Hold",
    {
      name: "drum_endingHold",
      bars: [drumBar({ kick: [0], snare: [0], shaker: [8], crash: [0] })],
    },
    {
      name: "bass_endingC69",
      bars: [bassBar([[0, "root"], [4, "root"], [8, "root"], [12, "fifth"]], { holdToEnd: true })],
    },
    {
      name: "piano_endingC69Hold",
      bars: [pianoBar([[0, "stab", 3], [4, "stab", 3], [8, "hold", 8]])],
    },
    { drum: 0.9, bass: 1, piano: 1 },
  ),
];

const runIntroDrum = drumBar({
  kick: [0],
  clap: [4, 12],
  shaker: hats8,
});
const runVerseDrum = drumBar({
  kick: [0, 8],
  snare: [4, 12],
  closedHat: hats8,
});
const runVerseLiftDrum = drumBar({
  kick: [0, 6, 8],
  snare: [4, 12],
  closedHat: hats8,
  openHat: [15],
});
const runPreDrum = drumBar({
  kick: [0, 3, 6, 8, 11],
  snare: [4, 12],
  closedHat: hats16,
  tambourine: [4, 12],
});
const runChorusDrum = drumBar({
  kick: [0, 3, 6, 8, 11],
  snare: [4, 12],
  clap: [4, 12],
  closedHat: hats16,
  openHat: [15],
  tambourine: hats8,
});
const runBridgeDrum = drumBar({
  kick: [0, 8],
  rim: [12],
  shaker: hatsQuarter,
});
const runVerseFillDrum = drumBar({
  kick: [0, 8],
  snare: [4, 12, 13, 14],
  closedHat: hats8,
  openHat: [15],
});
const runVerseLiftFillDrum = drumBar({
  kick: [0, 6, 8],
  snare: [4, 12, 13, 14],
  closedHat: hats8,
  openHat: [15],
});
const runPreFillDrum = drumBar({
  kick: [0, 3, 6, 8, 11],
  snare: [4, 12, 13, 14],
  closedHat: hats16.slice(0, 15),
  openHat: [15],
  tambourine: [4],
});
const runChorusFillDrum = drumBar({
  kick: [0, 3, 6, 8, 11],
  snare: [4, 12, 13, 14],
  clap: [4],
  closedHat: hats16.slice(0, 15),
  openHat: [15],
  tambourine: hats8.slice(0, 7),
});
const runIntroBass = bassBar([[0, "root"], [8, "fifth"]]);
const runVerseBass = bassBar([[0, "root"], [4, "fifth"], [8, "octave"], [12, "approach"]]);
const runVerseBassNoApproach = bassBar([[0, "root"], [4, "fifth"], [8, "octave"], [12, "fifth"]]);
const runHalfBarBass = bassBar([[0, "root"], [4, "fifth"], [8, "root"], [12, "fifth"]]);
const runIntroPiano = pianoBar([[0, "arpUp", 4], [8, "arpDown", 4], [12, "hold", 4]]);
const runVersePiano = pianoBar([[0, "stab"], [6, "stab"], [8, "stab"]]);
const runPrePiano = pianoBar([[0, "stab"], [3, "stab"], [6, "stab"], [8, "stab"], [13, "stab"]]);
const runChorusPiano = pianoBar([[0, "stab"], [3, "stab"], [8, "stab"], [11, "stab"], [14, "stab"]]);
const runHalfBarPiano = pianoBar([[0, "stab"], [4, "stab"], [8, "stab"], [12, "stab"]]);
const runHalfBarPianoEarlyCut = pianoBar([[0, "stab"], [4, "stab"], [8, "stab"]]);

const RUN_FORWARD_ARRANGEMENT_PATTERNS = [
  makePattern(
    "run-forward-bright-intro",
    "Bright Intro · Root Hold · Intro Arp",
    { name: "drum_brightIntro", bars: repeatBars(runIntroDrum, 4) },
    { name: "bass_introRootHold", bars: repeatBars(runIntroBass, 4) },
    { name: "piano_introArp", bars: repeatBars(runIntroPiano, 4) },
    { drum: 0.52, bass: 0.58, piano: 0.56 },
  ),
  makePattern(
    "run-forward-intro-to-verse",
    "Intro to Verse · Motion · Verse Comp",
    { name: "drum_introToVerse", bars: [...repeatBars(runVerseDrum, 3), runVerseFillDrum] },
    { name: "bass_introMotion", bars: [runVerseBass, runVerseBass, runHalfBarBass, runVerseBass] },
    { name: "piano_verseComp", bars: [runVersePiano, runVersePiano, runHalfBarPiano, runVersePiano] },
    { drum: 0.7, bass: 0.72, piano: 0.64 },
  ),
  makePattern(
    "run-forward-pop-verse",
    "Pop Verse · Verse Drive · Verse Comp",
    { name: "drum_popVerse", bars: [...repeatBars(runVerseDrum, 6), ...repeatBars(runVerseLiftDrum, 2)] },
    { name: "bass_verseDrive", bars: [...repeatBars(runVerseBass, 6), runHalfBarBass, runVerseBassNoApproach] },
    { name: "piano_verseComp", bars: [...repeatBars(runVersePiano, 6), runHalfBarPiano, runPrePiano] },
    { drum: 0.76, bass: 0.78, piano: 0.68 },
  ),
  makePattern(
    "run-forward-verse-lift",
    "Verse Lift · Half-Bar Motion · Pre Comp",
    {
      name: "drum_verseLift",
      bars: [runVerseDrum, runVerseDrum, ...repeatBars(runVerseLiftDrum, 5), runVerseLiftFillDrum],
    },
    {
      name: "bass_halfBarMotion",
      bars: [runVerseBass, runVerseBass, runHalfBarBass, runVerseBass, runVerseBass, ...repeatBars(runHalfBarBass, 3)],
    },
    {
      name: "piano_preComp",
      bars: [runVersePiano, runVersePiano, runHalfBarPiano, runPrePiano, runPrePiano, ...repeatBars(runHalfBarPiano, 3)],
    },
    { drum: 0.84, bass: 0.82, piano: 0.76 },
  ),
  makePattern(
    "run-forward-pre-chorus-build",
    "Pre-Chorus Build · Drive · Pre Comp",
    { name: "drum_preChorusBuild", bars: [...repeatBars(runPreDrum, 7), runPreFillDrum] },
    { name: "bass_preChorusDrive", bars: [...repeatBars(runVerseBass, 4), ...repeatBars(runHalfBarBass, 4)] },
    { name: "piano_preComp", bars: [...repeatBars(runPrePiano, 4), ...repeatBars(runHalfBarPiano, 3), runHalfBarPianoEarlyCut] },
    { drum: 0.94, bass: 0.9, piano: 0.84 },
  ),
  makePattern(
    "run-forward-chorus-full",
    "Chorus Full · Chorus Drive · Chorus Comp",
    { name: "drum_chorusFull", bars: [...repeatBars(runChorusDrum, 7), runChorusFillDrum] },
    { name: "bass_chorusDrive", bars: [...repeatBars(runVerseBass, 6), runHalfBarBass, runVerseBassNoApproach] },
    { name: "piano_chorusComp", bars: [...repeatBars(runChorusPiano, 6), runHalfBarPiano, runChorusPiano] },
    { drum: 1.08, bass: 1.02, piano: 0.96 },
  ),
  makePattern(
    "run-forward-chorus-lift",
    "Chorus Lift · Half-Bar Drive · Chorus Comp",
    { name: "drum_chorusLift", bars: [...repeatBars(runChorusDrum, 7), runChorusFillDrum] },
    {
      name: "bass_chorusHalfBar",
      bars: [runVerseBass, runVerseBass, runHalfBarBass, runVerseBass, runVerseBass, ...repeatBars(runHalfBarBass, 3)],
    },
    {
      name: "piano_chorusComp",
      bars: [runChorusPiano, runChorusPiano, runHalfBarPiano, runChorusPiano, runChorusPiano, runHalfBarPiano, runHalfBarPiano, runHalfBarPianoEarlyCut],
    },
    { drum: 1.12, bass: 1.06, piano: 1 },
  ),
  makePattern(
    "run-forward-bridge-space",
    "Bridge Space · Root Hold · Bridge Arp",
    {
      name: "drum_bridgeSpace",
      bars: [...repeatBars(runBridgeDrum, 6), runVerseLiftDrum, runVerseLiftFillDrum],
    },
    {
      name: "bass_bridgeRootHold",
      bars: [...repeatBars(runIntroBass, 4), ...repeatBars(runHalfBarBass, 2), runVerseBassNoApproach, runHalfBarBass],
    },
    {
      name: "piano_bridgeArp",
      bars: [...repeatBars(runIntroPiano, 4), ...repeatBars(runHalfBarPiano, 2), runVersePiano, runHalfBarPiano],
    },
    { drum: 0.62, bass: 0.68, piano: 0.62 },
  ),
  makePattern(
    "run-forward-final-chorus",
    "Final Chorus · Final Drive · Final Comp",
    { name: "drum_finalChorus", bars: [...repeatBars(runChorusDrum, 6), runChorusFillDrum] },
    { name: "bass_finalDrive", bars: [...repeatBars(runVerseBass, 4), ...repeatBars(runHalfBarBass, 3)] },
    { name: "piano_finalComp", bars: [...repeatBars(runChorusPiano, 4), ...repeatBars(runHalfBarPiano, 3)] },
    { drum: 1.16, bass: 1.08, piano: 1.02 },
  ),
  makePattern(
    "run-forward-ending-bright",
    "Ending Bright · Gadd9 Bass · Gadd9 Hold",
    {
      name: "drum_endingBright",
      bars: [drumBar({ kick: [0], snare: [0], clap: [0], tambourine: [0], openHat: [8] })],
    },
    {
      name: "bass_endingGadd9",
      bars: [bassBar([[0, "root"], [8, "octave"]], { holdToEnd: true })],
    },
    {
      name: "piano_endingGadd9",
      bars: [pianoBar([[0, "hold", 16], [8, "chord", 8]])],
    },
    { drum: 1, bass: 1.04, piano: 1.02 },
  ),
];

const section = (id, startBar, endBar, sectionType, sectionName, patternId, showSectionLabel = true) => ({
  id,
  startBar,
  endBar,
  sectionType,
  sectionName,
  showSectionLabel,
  patternId,
  patternNameAuto: false,
  patternShared: [
    "first-drive-final-full",
    "night-walk-final-full",
    "window-afternoon-final-full",
  ].includes(patternId),
});

const FIRST_DRIVE_PROJECT = {
  id: "fretiva-original-first-drive",
  title: "첫 번째 드라이브",
  description: "오픈 코드 전환과 구간별 밴드 편곡을 함께 익히는 64마디 어쿠스틱 팝 연습곡",
  libraryType: "recommended-progression",
  builtIn: true,
  key: "G Major",
  difficulty: "초급 ~ 초중급",
  timeSignature: "4/4",
  barCount: 64,
  slotFormatVersion: 2,
  slotsPerBar: 4,
  slots: FIRST_DRIVE_CHORD_BARS.flat(),
  splitSlots: [],
  repeatStarts: [],
  repeatEnds: [],
  barMarks: {},
  endingRanges: [],
  bpm: 96,
  capo: 0,
  accidentalPreference: "sharp",
  loop: true,
  pianoStyle: "custom",
  arrangementPatterns: FIRST_DRIVE_ARRANGEMENT_PATTERNS,
  arrangementOverrides: [
    section("first-drive-section-intro-a", 0, 3, "intro", "Intro", "first-drive-intro-minimal"),
    section("first-drive-section-intro-b", 4, 7, "intro", "Intro 상승", "first-drive-intro-build", false),
    section("first-drive-section-verse-1", 8, 15, "verse", "Verse 1", "first-drive-verse-pop-8"),
    section("first-drive-section-verse-2", 16, 23, "verse", "Verse 2", "first-drive-verse-lift"),
    section("first-drive-section-pre", 24, 31, "pre-chorus", "Pre-Chorus", "first-drive-pre-build"),
    section("first-drive-section-chorus", 32, 39, "chorus", "Chorus", "first-drive-chorus-pop-16"),
    section("first-drive-section-chorus-extension", 40, 47, "chorus", "Chorus 확장", "first-drive-chorus-sustain"),
    section("first-drive-section-bridge", 48, 55, "bridge", "Bridge", "first-drive-bridge-half-time"),
    section("first-drive-section-final", 56, 62, "chorus", "Final Chorus", "first-drive-final-full"),
    section("first-drive-section-ending", 63, 63, "outro", "Ending", "first-drive-final-full"),
  ],
};

const NIGHT_WALK_PROJECT = {
  id: "fretiva-recommended-night-walk",
  title: "밤 산책",
  description: "2박 코드 전환과 여백 있는 미디엄 팝 발라드를 연습하는 64마디 프로젝트",
  libraryType: "recommended-progression",
  builtIn: true,
  key: "A minor",
  difficulty: "초급 ~ 초중급",
  timeSignature: "4/4",
  barCount: 64,
  slotFormatVersion: 2,
  slotsPerBar: 4,
  slots: NIGHT_WALK_CHORD_BARS.flat(),
  splitSlots: [],
  repeatStarts: [],
  repeatEnds: [],
  barMarks: {},
  endingRanges: [],
  bpm: 82,
  capo: 0,
  accidentalPreference: "sharp",
  loop: true,
  pianoStyle: "custom",
  arrangementPatterns: NIGHT_WALK_ARRANGEMENT_PATTERNS,
  arrangementOverrides: [
    section("night-walk-section-intro-a", 0, 3, "intro", "Intro", "night-walk-intro-minimal"),
    section("night-walk-section-intro-b", 4, 7, "intro", "Intro 상승", "night-walk-intro-build", false),
    section("night-walk-section-verse-1", 8, 15, "verse", "Verse 1", "night-walk-soft-verse-8"),
    section("night-walk-section-verse-2", 16, 23, "verse", "Verse 2", "night-walk-verse-lift"),
    section("night-walk-section-pre", 24, 31, "pre-chorus", "Pre-Chorus", "night-walk-pre-build"),
    section("night-walk-section-chorus", 32, 39, "chorus", "Chorus", "night-walk-warm-chorus-16"),
    section("night-walk-section-chorus-extension", 40, 47, "chorus", "Chorus 확장", "night-walk-chorus-sustain"),
    section("night-walk-section-bridge", 48, 55, "bridge", "Bridge", "night-walk-bridge-half-time"),
    section("night-walk-section-final", 56, 62, "chorus", "Final Chorus", "night-walk-final-full"),
    section("night-walk-section-ending", 63, 63, "outro", "Ending", "night-walk-final-full"),
  ],
};

const WINDOW_AFTERNOON_PROJECT = {
  id: "fretiva-recommended-window-afternoon",
  title: "창가의 오후",
  description: "C·G·Am·F 오픈 코드와 8비트 스트럼, 2박 전환을 익히는 밝은 64마디 미디엄 팝 진행",
  libraryType: "recommended-progression",
  builtIn: true,
  key: "C Major",
  difficulty: "초급",
  timeSignature: "4/4",
  barCount: 64,
  slotFormatVersion: 2,
  slotsPerBar: 4,
  slots: WINDOW_AFTERNOON_CHORD_BARS.flat(),
  splitSlots: [],
  repeatStarts: [],
  repeatEnds: [],
  barMarks: {},
  endingRanges: [],
  bpm: 98,
  capo: 0,
  accidentalPreference: "sharp",
  loop: true,
  pianoStyle: "custom",
  arrangementPatterns: WINDOW_AFTERNOON_ARRANGEMENT_PATTERNS,
  arrangementOverrides: [
    section("window-afternoon-section-intro-a", 0, 3, "intro", "Intro", "window-afternoon-intro-minimal"),
    section("window-afternoon-section-intro-b", 4, 7, "intro", "Intro 상승", "window-afternoon-intro-build", false),
    section("window-afternoon-section-verse-1", 8, 15, "verse", "Verse 1", "window-afternoon-verse-pop-8"),
    section("window-afternoon-section-verse-2", 16, 23, "verse", "Verse 2", "window-afternoon-verse-lift"),
    section("window-afternoon-section-pre", 24, 31, "pre-chorus", "Pre-Chorus", "window-afternoon-pre-build"),
    section("window-afternoon-section-chorus", 32, 39, "chorus", "Chorus", "window-afternoon-chorus-pop-16"),
    section("window-afternoon-section-chorus-extension", 40, 47, "chorus", "Chorus 확장", "window-afternoon-chorus-sustain"),
    section("window-afternoon-section-bridge", 48, 55, "bridge", "Bridge", "window-afternoon-bridge-half-time"),
    section("window-afternoon-section-final", 56, 62, "chorus", "Final Chorus", "window-afternoon-final-full"),
    section("window-afternoon-section-ending", 63, 63, "outro", "Ending", "window-afternoon-final-full"),
  ],
};

const WINDOW_LIGHT_PROJECT = {
  id: "fretiva-recommended-window-light",
  title: "유리창의 불빛",
  description: "ii–V–I 진행, 7th 코드, 워킹 베이스와 소프트 재즈 팝 리듬을 연습하는 64마디 진행",
  libraryType: "recommended-progression",
  builtIn: true,
  key: "C Major / A minor",
  difficulty: "초중급",
  timeSignature: "4/4",
  barCount: 64,
  slotFormatVersion: 2,
  slotsPerBar: 4,
  slots: WINDOW_LIGHT_CHORD_BARS.flat(),
  splitSlots: [],
  repeatStarts: [],
  repeatEnds: [],
  barMarks: {},
  endingRanges: [],
  bpm: 92,
  capo: 0,
  accidentalPreference: "sharp",
  loop: true,
  pianoStyle: "custom",
  arrangementPatterns: WINDOW_LIGHT_ARRANGEMENT_PATTERNS,
  arrangementOverrides: [
    section("window-light-section-intro-air", 0, 3, "intro", "Intro", "window-light-intro-brush-air"),
    section("window-light-section-intro-build", 4, 7, "intro", "Intro Build", "window-light-intro-brush-pulse"),
    section("window-light-section-verse-1", 8, 15, "verse", "Verse 1", "window-light-verse-bossa"),
    section("window-light-section-verse-2", 16, 23, "verse", "Verse 2", "window-light-verse-moving-bossa"),
    section("window-light-section-pre", 24, 31, "pre-chorus", "Pre-Chorus", "window-light-pre-build-jazz"),
    section("window-light-section-chorus", 32, 39, "chorus", "Chorus", "window-light-chorus-jazz-pop"),
    section("window-light-section-chorus-lift", 40, 47, "chorus", "Chorus Lift", "window-light-chorus-lift"),
    section("window-light-section-bridge", 48, 55, "bridge", "Bridge", "window-light-bridge-half-time"),
    section("window-light-section-final", 56, 62, "chorus", "Final Chorus", "window-light-final-jazz-pop"),
    section("window-light-section-ending", 63, 63, "outro", "Ending", "window-light-ending-hold"),
  ],
};

const RUN_FORWARD_PROJECT = {
  id: "fretiva-recommended-run-forward",
  title: "달려가자",
  description: "오픈 코드 8비트 스트럼과 빠른 2박 전환을 연습하는 신나는 64마디 팝록 진행",
  libraryType: "recommended-progression",
  builtIn: true,
  key: "G Major",
  difficulty: "초급 ~ 초중급",
  timeSignature: "4/4",
  barCount: 64,
  slotFormatVersion: 2,
  slotsPerBar: 4,
  slots: RUN_FORWARD_CHORD_BARS.flat(),
  splitSlots: [],
  repeatStarts: [],
  repeatEnds: [],
  barMarks: {},
  endingRanges: [],
  bpm: 132,
  capo: 0,
  accidentalPreference: "sharp",
  loop: true,
  pianoStyle: "custom",
  arrangementPatterns: RUN_FORWARD_ARRANGEMENT_PATTERNS,
  arrangementOverrides: [
    section("run-forward-section-intro-a", 0, 3, "intro", "Intro", "run-forward-bright-intro"),
    section("run-forward-section-intro-b", 4, 7, "intro", "Intro Build", "run-forward-intro-to-verse"),
    section("run-forward-section-verse-1", 8, 15, "verse", "Verse 1", "run-forward-pop-verse"),
    section("run-forward-section-verse-2", 16, 23, "verse", "Verse 2", "run-forward-verse-lift"),
    section("run-forward-section-pre", 24, 31, "pre-chorus", "Pre-Chorus", "run-forward-pre-chorus-build"),
    section("run-forward-section-chorus", 32, 39, "chorus", "Chorus", "run-forward-chorus-full"),
    section("run-forward-section-chorus-lift", 40, 47, "chorus", "Chorus 확장", "run-forward-chorus-lift"),
    section("run-forward-section-bridge", 48, 55, "bridge", "Bridge", "run-forward-bridge-space"),
    section("run-forward-section-final", 56, 62, "chorus", "Final Chorus", "run-forward-final-chorus"),
    section("run-forward-section-ending", 63, 63, "outro", "Ending", "run-forward-ending-bright"),
  ],
};

export const MINI_CHORD_RECOMMENDED_PROGRESSION_IDS = Object.freeze([
  FIRST_DRIVE_PROJECT.id,
  NIGHT_WALK_PROJECT.id,
  WINDOW_AFTERNOON_PROJECT.id,
  WINDOW_LIGHT_PROJECT.id,
  RUN_FORWARD_PROJECT.id,
]);

export function getMiniChordRecommendedProgressions() {
  return JSON.parse(JSON.stringify([
    FIRST_DRIVE_PROJECT,
    NIGHT_WALK_PROJECT,
    WINDOW_AFTERNOON_PROJECT,
    WINDOW_LIGHT_PROJECT,
    RUN_FORWARD_PROJECT,
  ]));
}
