import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
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
  transitionHint = ko["rhythm.moveToTheNextChordUsingTheSpecifiedFingering"],
  uiLabel = "",
}) {
  const root = String(chord).match(/^[A-G](?:#|b)?/)?.[0] ?? "C";
  const rootPosition = Number(rootFret) === 0 ? ko["rhythm.open"] : formatMessage(ko["app.fretValue1"], { value1: rootFret });
  return {
    chord,
    beats,
    strings: normalizeVoicingStrings(strings),
    rootProvidedByBass: false,
    voicingType: getVoicingType(chord),
    formLabel,
    positionLabel: Number(rootFret) === 0 ? ko["rhythm.nearTheNut"] : formatMessage(ko["rhythm.aroundFretValue"], { value1: rootFret }),
    uiLabel: uiLabel || formatMessage(ko["rhythm.valueStringValueRootValueValue"], { value1: chord, value2: rootString, value3: rootPosition, value4: formLabel ? ` ${formLabel}` : "" }),
    transitionHint,
    rootPositions: [{ stringNumber: rootString, fretNumber: rootFret, note: root }],
    barres: barres.map((barre) => ({ ...barre })),
  };
}

const LEARNING_VOICINGS = Object.freeze({
  "gmaj7-e3": { chord: "Gmaj7", strings: ["3", "5", "4", "4", "3", "3"], rootString: 6, rootFret: 3, formLabel: ko["rhythm.eShapeMaj7"], barres: [{ fret: 3, fromString: 1, toString: 6, label: "1" }] },
  "a7-e5": { chord: "A7", strings: ["5", "7", "5", "6", "5", "5"], rootString: 6, rootFret: 5, formLabel: ko["rhythm.eShape7"], barres: [{ fret: 5, fromString: 1, toString: 6, label: "1" }] },
  "dmaj7-a5": { chord: "Dmaj7", strings: ["x", "5", "7", "6", "7", "5"], rootString: 5, rootFret: 5, formLabel: ko["rhythm.aShapeMaj7"], barres: [{ fret: 5, fromString: 1, toString: 5, label: "1" }] },
  "bm7-e7": { chord: "Bm7", strings: ["7", "9", "7", "7", "7", "7"], rootString: 6, rootFret: 7, formLabel: ko["rhythm.eShapeM7"], barres: [{ fret: 7, fromString: 1, toString: 6, label: "1" }] },
  "em7-a7": { chord: "Em7", strings: ["x", "7", "9", "7", "8", "7"], rootString: 5, rootFret: 7, formLabel: ko["rhythm.aShapeM7"], barres: [{ fret: 7, fromString: 1, toString: 5, label: "1" }] },
  "amaj7-e5": { chord: "Amaj7", strings: ["5", "7", "6", "6", "5", "5"], rootString: 6, rootFret: 5, formLabel: ko["rhythm.eShapeMaj7"], barres: [{ fret: 5, fromString: 1, toString: 6, label: "1" }] },
  "emaj7-a7": { chord: "Emaj7", strings: ["x", "7", "9", "8", "9", "7"], rootString: 5, rootFret: 7, formLabel: ko["rhythm.aShapeMaj7"], barres: [{ fret: 7, fromString: 1, toString: 5, label: "1" }] },
  "dmaj7-d0": { chord: "Dmaj7", strings: ["x", "x", "0", "2", "2", "2"], rootString: 4, rootFret: 0, formLabel: ko["rhythm.dShapeMaj7"], barres: [{ fret: 2, fromString: 1, toString: 3, label: "1" }] },
  "emaj7-d2": { chord: "Emaj7", strings: ["x", "x", "2", "4", "4", "4"], rootString: 4, rootFret: 2, formLabel: ko["rhythm.dShapeMaj7"], barres: [{ fret: 4, fromString: 1, toString: 3, label: "1" }] },
  "fmaj7-d3": { chord: "Fmaj7", strings: ["x", "x", "3", "5", "5", "5"], rootString: 4, rootFret: 3, formLabel: ko["rhythm.dShapeMaj7"], barres: [{ fret: 5, fromString: 1, toString: 3, label: "1" }] },
  "gmaj7-d5": { chord: "Gmaj7", strings: ["x", "x", "5", "7", "7", "7"], rootString: 4, rootFret: 5, formLabel: ko["rhythm.dShapeMaj7"], barres: [{ fret: 7, fromString: 1, toString: 3, label: "1" }] },
  "amaj7-d7": { chord: "Amaj7", strings: ["x", "x", "7", "9", "9", "9"], rootString: 4, rootFret: 7, formLabel: ko["rhythm.dShapeMaj7"], barres: [{ fret: 9, fromString: 1, toString: 3, label: "1" }] },
  "g-e3": { chord: "G", strings: ["3", "5", "5", "4", "3", "3"], rootString: 6, rootFret: 3, formLabel: ko["rhythm.eShapeMajor"], barres: [{ fret: 3, fromString: 1, toString: 6, label: "1" }] },
  "d-a5": { chord: "D", strings: ["x", "5", "7", "7", "7", "5"], rootString: 5, rootFret: 5, formLabel: ko["rhythm.aShapeMajor"], barres: [{ fret: 5, fromString: 1, toString: 5, label: "1" }] },
  "em-e7": { chord: "Em", strings: ["7", "9", "9", "7", "7", "7"], rootString: 6, rootFret: 7, formLabel: ko["rhythm.eShapeMinor"], barres: [{ fret: 7, fromString: 1, toString: 6, label: "1" }] },
  "c-a3": { chord: "C", strings: ["x", "3", "5", "5", "5", "3"], rootString: 5, rootFret: 3, formLabel: ko["rhythm.aShapeMajor"], barres: [{ fret: 3, fromString: 1, toString: 5, label: "1" }] },
  "c-e8": { chord: "C", strings: ["8", "10", "10", "9", "8", "8"], rootString: 6, rootFret: 8, formLabel: ko["rhythm.eShapeMajor"], barres: [{ fret: 8, fromString: 1, toString: 6, label: "1" }] },
  "am-e5": { chord: "Am", strings: ["5", "7", "7", "5", "5", "5"], rootString: 6, rootFret: 5, formLabel: ko["rhythm.eShapeMinor"], barres: [{ fret: 5, fromString: 1, toString: 6, label: "1" }] },
  "f-e1": { chord: "F", strings: ["1", "3", "3", "2", "1", "1"], rootString: 6, rootFret: 1, formLabel: ko["rhythm.eShapeMajor"], barres: [{ fret: 1, fromString: 1, toString: 6, label: "1" }] },
  "bm7b5-e7": { chord: "Bm7♭5", strings: ["7", "x", "7", "7", "6", "x"], rootString: 6, rootFret: 7, formLabel: "m7♭5", barres: [] },
  "e7-a7": { chord: "E7", strings: ["x", "7", "9", "7", "9", "7"], rootString: 5, rootFret: 7, formLabel: ko["rhythm.aShape7"], barres: [{ fret: 7, fromString: 1, toString: 5, label: "1" }] },
  "am7-e5": { chord: "Am7", strings: ["5", "7", "5", "5", "5", "5"], rootString: 6, rootFret: 5, formLabel: ko["rhythm.eShapeM7"], barres: [{ fret: 5, fromString: 1, toString: 6, label: "1" }] },
  "dm7-a5": { chord: "Dm7", strings: ["x", "5", "7", "5", "6", "5"], rootString: 5, rootFret: 5, formLabel: ko["rhythm.aShapeM7"], barres: [{ fret: 5, fromString: 1, toString: 5, label: "1" }] },
  "g7-e3": { chord: "G7", strings: ["3", "5", "3", "4", "3", "3"], rootString: 6, rootFret: 3, formLabel: ko["rhythm.eShape7"], barres: [{ fret: 3, fromString: 1, toString: 6, label: "1" }] },
  "cmaj7-a3": { chord: "Cmaj7", strings: ["x", "3", "5", "4", "5", "3"], rootString: 5, rootFret: 3, formLabel: ko["rhythm.aShapeMaj7"], barres: [{ fret: 3, fromString: 1, toString: 5, label: "1" }] },
});

function learningSlot(voicingId, beats = 4, transitionHint = ko["rhythm.moveToTheNextChordUsingTheSpecifiedFingering"]) {
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
  difficulty = ko["miniChord.earlyIntermediate"],
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
    title: ko["rhythm.seventhChordBarreCycle"],
    description: ko["rhythm.descendFromFret7To5To3WhileLearningSeventhChord"],
    practiceSummary: ko["rhythm.useBarreChordsInsteadOfOpenChordsAndMoveThroughFrets7"],
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
      ko["rhythm.bm7Em7SwitchFromSixthStringRootEShapeM7ToFifth"],
      ko["rhythm.em7Am7DescendExactlyTwoFretsFrom7To5WhileChanging"],
      ko["rhythm.am7Dm7StayAtFret5AndSwitchFromSixthStringRoot"],
      ko["rhythm.dm7G7Cmaj7DescendFromFret5To3HearTheF"],
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
        formLabel: ko["rhythm.eShapeM7"],
        positionLabel: ko["rhythm.aroundFret7"],
        uiLabel: ko["rhythm.bm7String6RootEShapeM7AtFret7"],
        transitionHint: ko["rhythm.holdAFullBarreAtFret7AndAddOnlyString5"],
        soundingNotes: ["B", "F#", "A", "D", "F#", "B"],
        rootPositions: [
          { stringNumber: 6, fretNumber: 7, note: "B" },
          { stringNumber: 1, fretNumber: 7, note: "B" },
        ],
        features: [ko["rhythm.clearlyShowTheBRootAtString6Fret7"], ko["rhythm.fullBarreAtFret7PlusString5Fret9"], ko["rhythm.courseStartingPoint"]],
        barres: [{ fret: 7, fromString: 1, toString: 6, label: "1" }],
      },
      {
        chord: "Em7",
        beats: 4,
        strings: ["x", "7", "9", "7", "8", "7"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: ko["rhythm.aShapeM7"],
        positionLabel: ko["rhythm.aroundFret7"],
        uiLabel: ko["rhythm.em7String5RootAShapeM7AtFret7"],
        transitionHint: ko["rhythm.muteBm7SSixthStringAndChangeStrings54And2"],
        soundingNotes: ["E", "B", "D", "G", "B"],
        rootPositions: [{ stringNumber: 5, fretNumber: 7, note: "E" }],
        features: [ko["rhythm.includeTheERootAtString5Fret7"], ko["rhythm.resolveWithinTheSameSeventhFretAreaAsBm7"], ko["rhythm.doNotUseThePreviousRootlessFingering"]],
        barres: [{ fret: 7, fromString: 1, toString: 5, label: "1" }],
      },
      {
        chord: "Am7",
        beats: 4,
        strings: ["5", "7", "5", "5", "5", "5"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: ko["rhythm.eShapeM7"],
        positionLabel: ko["rhythm.aroundFret5"],
        uiLabel: ko["rhythm.am7String6RootEShapeM7AtFret5"],
        transitionHint: ko["rhythm.moveTheWholeHandDownExactlyTwoFretsFromEm7SSeventh"],
        soundingNotes: ["A", "E", "G", "C", "E", "A"],
        rootPositions: [
          { stringNumber: 6, fretNumber: 5, note: "A" },
          { stringNumber: 1, fretNumber: 5, note: "A" },
        ],
        features: [ko["rhythm.fullBarreAtFret5PlusString5Fret7"], ko["rhythm.descendExactlyTwoFretsFromFret7"], ko["rhythm.returnToASixthStringRoot"]],
        barres: [{ fret: 5, fromString: 1, toString: 6, label: "1" }],
      },
      {
        chord: "Dm7",
        beats: 4,
        strings: ["x", "5", "7", "5", "6", "5"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: ko["rhythm.aShapeM7"],
        positionLabel: ko["rhythm.aroundFret5"],
        uiLabel: ko["rhythm.dm7String5RootAShapeM7AtFret5"],
        transitionHint: ko["rhythm.stayAtAm7SFifthFretMuteString6AndRepositionThe"],
        soundingNotes: ["D", "A", "C", "F", "A"],
        rootPositions: [{ stringNumber: 5, fretNumber: 5, note: "D" }],
        features: [ko["rhythm.includeTheDRootAtString5Fret5"], ko["rhythm.stayInTheSameFifthFretAreaAsAm7"], ko["rhythm.doNotUseThePreviousRootlessFingering"]],
        barres: [{ fret: 5, fromString: 1, toString: 5, label: "1" }],
      },
      {
        chord: "G7",
        beats: 4,
        strings: ["3", "5", "3", "4", "3", "3"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: ko["rhythm.eShape7"],
        positionLabel: ko["rhythm.aroundFret3"],
        uiLabel: ko["rhythm.g7String6RootEShape7AtFret3"],
        transitionHint: ko["rhythm.descendTwoFretsFromDm7SFifthFretAreaAndClearlyHear"],
        soundingNotes: ["G", "D", "F", "B", "D", "G"],
        rootPositions: [
          { stringNumber: 6, fretNumber: 3, note: "G" },
          { stringNumber: 1, fretNumber: 3, note: "G" },
        ],
        features: [ko["rhythm.descendTwoFretsFromFret5To3"], ko["rhythm.clearlyHearTheThirdBAndFlatSeventhF"], ko["rhythm.tensionChordBeforeCmaj7"]],
        barres: [{ fret: 3, fromString: 1, toString: 6, label: "1" }],
      },
      {
        chord: "Cmaj7",
        beats: 4,
        strings: ["x", "3", "5", "4", "5", "3"],
        rootProvidedByBass: false,
        voicingType: "full-maj7",
        formLabel: ko["rhythm.aShapeMaj7"],
        positionLabel: ko["rhythm.aroundFret3"],
        uiLabel: ko["rhythm.cmaj7String5RootAShapeMaj7AtFret3"],
        transitionHint: ko["rhythm.landOnTheCRootAtString5Fret3HearF"],
        soundingNotes: ["C", "G", "B", "E", "G"],
        rootPositions: [{ stringNumber: 5, fretNumber: 3, note: "C" }],
        features: [ko["rhythm.includeGAtString1Fret3"], ko["rhythm.landOnTheCRootAtString5Fret3"], ko["rhythm.letTheFinalResolutionRing"]],
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
    title: ko["rhythm.seventhChordResolutionInD"],
    description: ko["rhythm.switchBetweenSixthAndFifthStringRootShapesToResolveToDmaj7"],
    practiceSummary: ko["rhythm.moveThroughFrets357WithBarreChordsArrivingAtDmaj7"],
    key: "D",
    bpm: 62,
    tempoStages: [62],
    tempoAdvanceCondition: "success",
    timeSignature: "4/4",
    repeatMode: "full-loop",
    accompanimentName: "Soft 7th Guide",
    difficulty: ko["miniChord.earlyIntermediate"],
    rootlessAllowed: false,
    rootRequiredOnFretboard: true,
    learningPoints: [
      ko["rhythm.bm7Em7StayInTheSeventhFretAreaAndSwitchFromA"],
      ko["rhythm.em7A7MoveTheWholeHandDownExactlyTwoFretsFrom7"],
      ko["rhythm.a7Dmaj7StayInTheFifthFretAreaAndSwitchFromA"],
    ],
    slots: [
      learningSlot("gmaj7-e3", 4, ko["rhythm.moveFromGmaj7AtFret3ToA7AtFret5"]),
      learningSlot("a7-e5", 4, ko["rhythm.changeRootStringsToDmaj7InTheSameFifthFretArea"]),
      learningSlot("dmaj7-a5", 4, ko["rhythm.moveTheWholeHandFromFret5ToBm7AtFret7"]),
      {
        chord: "Bm7",
        beats: 4,
        strings: ["7", "9", "7", "7", "7", "7"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: ko["rhythm.eShapeM7"],
        positionLabel: ko["rhythm.aroundFret7"],
        uiLabel: ko["rhythm.bm7String6RootFret7"],
        transitionHint: ko["rhythm.stayInTheSeventhFretAreaAndSwitchFromASixthString"],
        soundingNotes: ["B", "F#", "A", "D", "F#", "B"],
        rootPositions: [{ stringNumber: 6, fretNumber: 7, note: "B" }],
        features: [ko["rhythm.bRootAtString6Fret7"], ko["rhythm.sameSeventhFretPositionAsEm7"], ko["rhythm.keepTheHandPositionThroughEm7"]],
        barres: [{ fret: 7, fromString: 1, toString: 6, label: "1" }],
      },
      {
        chord: "Em7",
        beats: 4,
        strings: ["x", "7", "9", "7", "8", "7"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: ko["rhythm.aShapeM7"],
        positionLabel: ko["rhythm.aroundFret7"],
        uiLabel: ko["rhythm.em7String5RootFret7"],
        transitionHint: ko["rhythm.switchToAFifthStringRootShapeInTheSameSeventhFret"],
        soundingNotes: ["E", "B", "D", "G", "B"],
        rootPositions: [{ stringNumber: 5, fretNumber: 7, note: "E" }],
        features: [ko["rhythm.eRootAtString5Fret7"], ko["rhythm.sameSeventhFretPositionAsBm7"], ko["rhythm.descendTwoFretsForTheNextA7"]],
        barres: [{ fret: 7, fromString: 1, toString: 5, label: "1" }],
      },
      {
        chord: "A7",
        beats: 4,
        strings: ["5", "7", "5", "6", "5", "5"],
        rootProvidedByBass: false,
        voicingType: "full-7th",
        formLabel: ko["rhythm.eShape7"],
        positionLabel: ko["rhythm.aroundFret5"],
        uiLabel: ko["rhythm.a7String6RootFret5"],
        transitionHint: ko["rhythm.moveTheWholeHandDownTwoFretsFromEm7ToA7In"],
        soundingNotes: ["A", "E", "G", "C#", "E", "A"],
        rootPositions: [{ stringNumber: 6, fretNumber: 5, note: "A" }],
        features: [ko["rhythm.aRootAtString6Fret5"], ko["rhythm.moveFromFret7To5"], ko["rhythm.keepTheHandPositionThroughDmaj7"]],
        barres: [{ fret: 5, fromString: 1, toString: 6, label: "1" }],
      },
      {
        chord: "Dmaj7",
        beats: 4,
        strings: ["x", "5", "7", "6", "7", "5"],
        rootProvidedByBass: false,
        voicingType: "full-maj7",
        formLabel: ko["rhythm.aShapeMaj7"],
        positionLabel: ko["rhythm.aroundFret5"],
        uiLabel: ko["rhythm.dmaj7String5RootFret5"],
        transitionHint: ko["rhythm.resolveToFifthStringRootDmaj7InTheSameFifthFretArea"],
        soundingNotes: ["D", "A", "C#", "F#", "A"],
        rootPositions: [{ stringNumber: 5, fretNumber: 5, note: "D" }],
        features: [ko["rhythm.dRootAtString5Fret5"], ko["rhythm.sameFifthFretPositionAsA7"], ko["rhythm.finalResolutionChord"]],
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
    description: ko["rhythm.alternatingMajorSeventhRootsInA"],
    practiceSummary: ko["rhythm.moveFromFret5To7WhileAlternatingSixthAndFifthString"],
    key: "A",
    bpm: 58,
    twoBeatExtension: {
      beatsPerChord: 2,
      progression: ["Amaj7", "Dmaj7", "Emaj7", "Amaj7"],
    },
    slots: [
      learningSlot("amaj7-e5", 4, ko["rhythm.stayAtFret5AndSwitchFromASixthStringRootShape"]),
      learningSlot("dmaj7-a5", 4, ko["rhythm.moveTheWholeHandUpTwoFretsToEmaj7"]),
      learningSlot("emaj7-a7", 4, ko["rhythm.descendFromFret7To5ArrivingAtAmaj7"]),
      learningSlot("amaj7-e5", 4, ko["rhythm.letAmaj7AtFret5RingAndPrepareToRepeat"]),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-02-d-double-step",
    courseNumber: "02",
    description: ko["rhythm.twoBeatResolutionInD"],
    practiceSummary: ko["rhythm.moveBetweenFrets7And5EveryTwoBeatsResolvingToDmaj7"],
    key: "D",
    bpm: 54,
    slots: [
      learningSlot("bm7-e7", 2, ko["rhythm.changeRootStringsToEm7InTheSameSeventhFretArea"]),
      learningSlot("em7-a7", 2, ko["rhythm.moveTheWholeHandDownTwoFretsToA7"]),
      learningSlot("a7-e5", 2, ko["rhythm.changeRootStringsToDmaj7InTheSameFifthFretArea"]),
      learningSlot("dmaj7-a5", 2, ko["rhythm.returnQuicklyToBm7AtFret7"]),
      learningSlot("bm7-e7", 2, ko["rhythm.changeRootStringsToEm7InTheSameSeventhFretArea"]),
      learningSlot("em7-a7", 2, ko["rhythm.moveTheWholeHandDownTwoFretsToA7"]),
      learningSlot("a7-e5", 2, ko["rhythm.changeRootStringsToDmaj7InTheSameFifthFretArea"]),
      learningSlot("dmaj7-a5", 2, ko["rhythm.letDmaj7RingAndPrepareToRepeat"]),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-03-d-form-semitone-return",
    courseNumber: "03",
    description: ko["rhythm.dShapeSemitoneRoundTrip"],
    practiceSummary: ko["rhythm.moveDEFAndBackWithTheSameMaj7Shape"],
    key: "D",
    bpm: 56,
    slots: [
      learningSlot("dmaj7-d0", 4, ko["rhythm.moveTheSameDShapeUpTwoFretsToEmaj7"]),
      learningSlot("emaj7-d2", 4, ko["rhythm.moveTheSameDShapeUpOneFretToFmaj7"]),
      learningSlot("fmaj7-d3", 4, ko["rhythm.keepTheShapeAndDescendToEmaj7"]),
      learningSlot("emaj7-d2", 4, ko["rhythm.returnToDmaj7WithItsOpenStringRoot"]),
      learningSlot("dmaj7-d0", 4, ko["rhythm.letDmaj7RingAndPrepareToRepeat"]),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-03-d-form-whole-step",
    courseNumber: "03",
    description: ko["rhythm.dShapeTwoFretShifts"],
    practiceSummary: ko["rhythm.moveFGAInTwoFretStepsWithTheSameMaj7"],
    key: "F",
    bpm: 60,
    slots: [
      learningSlot("fmaj7-d3", 4, ko["rhythm.keepTheDShapeAndMoveUpTwoFretsToGmaj7"]),
      learningSlot("gmaj7-d5", 4, ko["rhythm.keepTheDShapeAndMoveUpTwoFretsToAmaj7"]),
      learningSlot("amaj7-d7", 4, ko["rhythm.descendToGmaj7WithTheSameShape"]),
      learningSlot("gmaj7-d5", 4, ko["rhythm.descendToFmaj7WithTheSameShape"]),
      learningSlot("fmaj7-d3", 4, ko["rhythm.letFmaj7RingAndPrepareToRepeat"]),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-03-d-form-wide-return",
    courseNumber: "03",
    description: ko["rhythm.dShapeAcrossTheFretboard"],
    practiceSummary: ko["rhythm.practiceWideDShapeMovesThroughFrets357"],
    key: "D",
    bpm: 52,
    slots: [
      learningSlot("fmaj7-d3", 2, ko["rhythm.keepTheDShapeAndMoveUpTwoFretsToGmaj7"]),
      learningSlot("gmaj7-d5", 2, ko["rhythm.keepTheDShapeAndMoveUpTwoFretsToAmaj7"]),
      learningSlot("amaj7-d7", 4, ko["rhythm.letAmaj7RingFullyThenDescendToGmaj7"]),
      learningSlot("gmaj7-d5", 2, ko["rhythm.descendToFmaj7WithTheSameShape"]),
      learningSlot("fmaj7-d3", 2, ko["rhythm.keepTheSameShapeAndDescendASemitoneToEmaj7"]),
      learningSlot("emaj7-d2", 2, ko["rhythm.returnToDmaj7WithItsOpenStringRoot"]),
      learningSlot("dmaj7-d0", 2, ko["rhythm.letDmaj7RingAndPrepareToRepeat"]),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-04-g-pop-rock-barre",
    courseNumber: "04",
    description: ko["rhythm.popRockBarresInG"],
    practiceSummary: ko["rhythm.moveThroughFrets357WithEAndAShapeBarres"],
    key: "G",
    bpm: 68,
    slots: [
      learningSlot("g-e3", 4, ko["rhythm.moveFromTheEShapeAtFret3ToAShapeD"]),
      learningSlot("d-a5", 4, ko["rhythm.moveFromFret5ToEShapeEmAtFret7"]),
      learningSlot("em-e7", 4, ko["rhythm.makeAWideDescentFromFret7ToAShapeCAt"]),
      learningSlot("c-a3", 4, ko["rhythm.letCAtFret3RingAndPrepareToRepeat"]),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-04-g-barre-double-step",
    courseNumber: "04",
    description: ko["rhythm.twoBeatBarreChangesInG"],
    practiceSummary: ko["rhythm.movePreciselyThroughFrets3573EveryTwoBeats"],
    key: "G",
    bpm: 56,
    slots: [
      learningSlot("g-e3", 2, ko["rhythm.moveFromTheEShapeAtFret3ToAShapeD"]),
      learningSlot("d-a5", 2, ko["rhythm.moveFromFret5ToEShapeEmAtFret7"]),
      learningSlot("em-e7", 2, ko["rhythm.makeAWideDescentFromFret7ToAShapeCAt"]),
      learningSlot("c-a3", 2, ko["rhythm.changeRootStringsToEShapeGAtFret3"]),
      learningSlot("g-e3", 2, ko["rhythm.moveFromTheEShapeAtFret3ToAShapeD"]),
      learningSlot("d-a5", 2, ko["rhythm.moveFromFret5ToEShapeEmAtFret7"]),
      learningSlot("em-e7", 2, ko["rhythm.makeAWideDescentFromFret7ToAShapeCAt"]),
      learningSlot("c-a3", 2, ko["rhythm.letCAtFret3RingAndPrepareToRepeat"]),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-04-c-1625-high-barre",
    courseNumber: "04",
    description: ko["rhythm.iViIvVBarresInC"],
    practiceSummary: ko["rhythm.connectACMajorProgressionWithBarreChordsWithoutOpenChords"],
    key: "C",
    bpm: 62,
    slots: [
      learningSlot("c-e8", 4, ko["rhythm.descendFromCAtFret8ToAmAtFret5"]),
      learningSlot("am-e5", 4, ko["rhythm.descendFromAmAtFret5ToFAtFret1"]),
      learningSlot("f-e1", 4, ko["rhythm.ascendFromFAtFret1ToGAtFret3"]),
      learningSlot("g-e3", 4, ko["rhythm.holdTheTensionOfGAtFret3AndRepeatBackTo"]),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-05-minor-resolution",
    courseNumber: "05",
    description: ko["rhythm.basicM75Resolution"],
    practiceSummary: ko["rhythm.resolveFromM75AtFret7ThroughE7ToAm7"],
    key: "A",
    bpm: 54,
    slots: [
      learningSlot("bm7b5-e7", 4, ko["rhythm.switchToE7InTheSameSeventhFretArea"]),
      learningSlot("e7-a7", 4, ko["rhythm.resolveFromFret7ToAm7AtFret5"]),
      learningSlot("am7-e5", 4, ko["rhythm.letAm7RingAndPrepareToRepeat"]),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-05-minor-double-step",
    courseNumber: "05",
    description: ko["rhythm.twoBeatM75Changes"],
    practiceSummary: ko["rhythm.changeM75E7Am7EveryTwoBeats"],
    key: "A",
    bpm: 50,
    slots: [
      learningSlot("bm7b5-e7", 2, ko["rhythm.switchToE7InTheSameSeventhFretArea"]),
      learningSlot("e7-a7", 2, ko["rhythm.resolveFromFret7ToAm7AtFret5"]),
      learningSlot("am7-e5", 4, ko["rhythm.letAm7RingFullyBeforeReturningToFret7"]),
      learningSlot("bm7b5-e7", 2, ko["rhythm.switchToE7InTheSameSeventhFretArea"]),
      learningSlot("e7-a7", 2, ko["rhythm.resolveFromFret7ToAm7AtFret5"]),
      learningSlot("am7-e5", 4, ko["rhythm.letAm7RingAndPrepareToRepeat"]),
    ],
  }),
  createLearningCourse({
    id: "voicing-course-05-minor-cycle-expansion",
    courseNumber: "05",
    description: ko["rhythm.extendedM75Cycle"],
    practiceSummary: ko["rhythm.moveThroughFrets753FollowingAMinorResolutionWithIi"],
    key: "C",
    bpm: 52,
    slots: [
      learningSlot("bm7b5-e7", 2, ko["rhythm.switchToE7InTheSameSeventhFretArea"]),
      learningSlot("e7-a7", 2, ko["rhythm.resolveFromFret7ToAm7AtFret5"]),
      learningSlot("am7-e5", 2, ko["rhythm.stayAtFret5AndChangeRootStringsToDm7"]),
      learningSlot("dm7-a5", 2, ko["rhythm.descendFromFret5ToG7AtFret3"]),
      learningSlot("g7-e3", 2, ko["rhythm.resolveToCmaj7InTheSameThirdFretArea"]),
      learningSlot("cmaj7-a3", 2, ko["rhythm.letCmaj7RingAndPrepareToRepeat"]),
    ],
  }),
  {
    id: "voicing-course-rootless-shells",
    courseNumber: "01",
    title: ko["rhythm.rootlessShellIiVI"],
    description: ko["rhythm.leaveTheRootToTheBassAndConnectOnlyThe3rd5th"],
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
        positionLabel: ko["rhythm.frets57"],
        transitionHint: ko["rhythm.keepStrings1And2AtFrets5And6AndAvoid"],
        barres: [{ fret: 5, fromString: 1, toString: 3, label: "1" }],
      },
      {
        chord: "G7",
        beats: 2,
        strings: ["x", "x", "3", "4", "3", "x"],
        rootProvidedByBass: true,
        voicingType: "rootless-7th",
        positionLabel: ko["rhythm.frets34"],
        transitionHint: ko["rhythm.playOnlyTheShellOnStrings43And2MuteStrings"],
      },
      {
        chord: "Cmaj7",
        beats: 4,
        strings: ["x", "x", "5", "4", "5", "x"],
        rootProvidedByBass: true,
        voicingType: "rootless-maj7",
        positionLabel: ko["rhythm.frets45"],
        transitionHint: ko["rhythm.connectTheMiddleThreeStringShapesBySemitoneAndMuteTheOuter"],
      },
    ],
  },
  {
    id: "voicing-course-top-three-strings",
    courseNumber: "01",
    title: ko["rhythm.minimalMovementOnTheTopThreeStrings"],
    description: ko["rhythm.connectAm7Dm7G7Cmaj7UsingOnlyStrings13"],
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
        positionLabel: ko["rhythm.topThreeStringsAtFret5"],
        transitionHint: ko["rhythm.holdAMiniBarreAcrossStrings32And1AtFret"],
        barres: [{ fret: 5, fromString: 1, toString: 3, label: "1" }],
      },
      {
        chord: "Dm7",
        beats: 2,
        strings: ["x", "x", "x", "5", "6", "5"],
        rootProvidedByBass: true,
        voicingType: "rootless-upper",
        positionLabel: ko["rhythm.topThreeStringsAtFrets56"],
        transitionHint: ko["rhythm.keepTheMiniBarreAndMoveOnlyString2ToFret6"],
        barres: [{ fret: 5, fromString: 1, toString: 3, label: "1" }],
      },
      {
        chord: "G7",
        beats: 2,
        strings: ["x", "x", "x", "4", "3", "3"],
        rootProvidedByBass: false,
        voicingType: "upper-triad",
        positionLabel: ko["rhythm.topThreeStringsAtFrets34"],
        transitionHint: ko["rhythm.moveTheWholeShapeToTheThirdFretAreaWithOnlyString"],
        barres: [{ fret: 3, fromString: 1, toString: 2, label: "1" }],
      },
      {
        chord: "Cmaj7",
        beats: 2,
        strings: ["x", "x", "x", "4", "5", "3"],
        rootProvidedByBass: true,
        voicingType: "rootless-upper",
        positionLabel: ko["rhythm.topThreeStringsAtFrets35"],
        transitionHint: ko["rhythm.anchorString1AtFret3AndMoveOnlyString2To"],
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
