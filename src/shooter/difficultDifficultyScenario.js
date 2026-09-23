import ko from "../i18n/locales/ko.js";
import { getScriptedDifficultyRoundProgress } from "./scriptedDifficultyProgress.js";
import { createShooterTargetNote } from "./gameplayRules.js";

export const SHOOTER_DIFFICULT_RECOMMENDED_BPMS = Object.freeze([54, 56, 58, 60, 62]);
export const SHOOTER_DIFFICULT_STABLE_ACCURACY = 85;
export const SHOOTER_DIFFICULT_STABLE_ROUNDS = 1;

export const SHOOTER_DIFFICULT_PATTERN_IDS = Object.freeze({
  MAIN: "main",
  HAMMER_ON_LOW_E: "mini-a",
  HAMMER_ON_A: "mini-b",
  PULL_OFF_HIGH_E: "mini-c",
  PULL_OFF_G: "mini-d",
});

export const SHOOTER_DIFFICULT_PATTERN_OPTIONS = Object.freeze([
  Object.freeze({ id: SHOOTER_DIFFICULT_PATTERN_IDS.MAIN, label: ko["shooter.mainRoundTrip"], shortLabel: ko["shooter.main"], hint: ko["shooter.e2E5AscendingAndDescending"] }),
  Object.freeze({ id: SHOOTER_DIFFICULT_PATTERN_IDS.HAMMER_ON_LOW_E, label: ko["shooter.patternA"], shortLabel: "A", hint: ko["shooter.sixthStringHammerOns"] }),
  Object.freeze({ id: SHOOTER_DIFFICULT_PATTERN_IDS.HAMMER_ON_A, label: ko["shooter.patternB"], shortLabel: "B", hint: ko["shooter.fifthStringHammerOns"] }),
  Object.freeze({ id: SHOOTER_DIFFICULT_PATTERN_IDS.PULL_OFF_HIGH_E, label: ko["shooter.patternC"], shortLabel: "C", hint: ko["shooter.firstStringPullOffs"] }),
  Object.freeze({ id: SHOOTER_DIFFICULT_PATTERN_IDS.PULL_OFF_G, label: ko["shooter.patternD"], shortLabel: "D", hint: ko["shooter.thirdStringDescent"] }),
]);

export const SHOOTER_DIFFICULT_SECTIONS = Object.freeze([
  Object.freeze({ id: 1, label: ko["shooter.section1LowSixthStringStart"], announcement: ko["shooter.startSlowlyFromLowE2"], direction: "ascending" }),
  Object.freeze({ id: 2, label: ko["shooter.section2FifthStringSemitones"], announcement: ko["shooter.passThroughD3AndClimbToFret11"], direction: "ascending" }),
  Object.freeze({ id: 3, label: ko["shooter.section3ThroughTheMiddleRegister"], announcement: ko["shooter.climbAlongStrings4And3"], direction: "ascending" }),
  Object.freeze({ id: 4, label: ko["shooter.section4ReachTheHighRegister"], announcement: ko["shooter.reachE5AtString1Fret12"], direction: "ascending" }),
  Object.freeze({ id: 5, label: ko["shooter.section5DescendFromTheHighRegister"], announcement: ko["shooter.descendWithAPullOffAndSlideFeel"], direction: "descending" }),
  Object.freeze({ id: 6, label: ko["shooter.section6ReturnToTheLowerRegister"], announcement: ko["shooter.returnToYourLowE2StartingPosition"], direction: "descending" }),
]);

const RAW_DIFFICULT_MAIN_STEPS = [
  [1, "E2", 6, 0, 2],
  [1, "F#2", 6, 2, 2],
  [1, "G#2", 6, 4, 2],
  [1, "A2", 6, 5, 2],
  [1, "B2", 6, 7, 2],
  [2, "C#3", 5, 4, 2],
  [2, "D#3", 5, 6, 2],
  [2, "E3", 5, 7, 2],
  [2, "F#3", 5, 9, 2],
  [2, "G#3", 5, 11, 2],
  [3, "A3", 4, 7, 1],
  [3, "B3", 4, 9, 1],
  [3, "C#4", 3, 6, 1],
  [3, "D#4", 3, 8, 1],
  [3, "E4", 3, 9, 1],
  [3, "F#4", 3, 11, 1],
  [4, "G#4", 2, 9, 1],
  [4, "A4", 2, 10, 1],
  [4, "B4", 1, 7, 1],
  [4, "C#5", 1, 9, 1],
  [4, "D#5", 1, 11, 1],
  [4, "E5", 1, 12, 2],
  [5, "D#5", 1, 11, 1],
  [5, "C#5", 1, 9, 1],
  [5, "B4", 1, 7, 1],
  [5, "A4", 2, 10, 1],
  [5, "G#4", 2, 9, 1],
  [5, "F#4", 3, 11, 1],
  [5, "E4", 3, 9, 1],
  [5, "D#4", 3, 8, 1],
  [5, "C#4", 3, 6, 1],
  [6, "B3", 4, 9, 1],
  [6, "A3", 4, 7, 1],
  [6, "G#3", 5, 11, 1],
  [6, "F#3", 5, 9, 1],
  [6, "E3", 5, 7, 1],
  [6, "D#3", 5, 6, 1],
  [6, "C#3", 5, 4, 1],
  [6, "B2", 6, 7, 1],
  [6, "A2", 6, 5, 1],
  [6, "G#2", 6, 4, 1],
  [6, "F#2", 6, 2, 1],
  [6, "E2", 6, 0, 2],
];

const MINI_PATTERN_DEFINITIONS = Object.freeze({
  [SHOOTER_DIFFICULT_PATTERN_IDS.HAMMER_ON_LOW_E]: Object.freeze({
    section: Object.freeze({ id: "A", label: ko["shooter.miniASixthStringAscent"], announcement: ko["shooter.pickE2ThenContinueWithHammerOns"], direction: "ascending" }),
    steps: Object.freeze([
      ["E2", 6, 0, ko["etudes.picking"]], ["F#2", 6, 2, ko["etudes.hammerOn"]], ["G#2", 6, 4, ko["etudes.hammerOn"]], ["A2", 6, 5, ko["etudes.hammerOn"]], ["B2", 6, 7, ko["etudes.hammerOn"]],
    ]),
  }),
  [SHOOTER_DIFFICULT_PATTERN_IDS.HAMMER_ON_A]: Object.freeze({
    section: Object.freeze({ id: "B", label: ko["shooter.miniBFifthStringAscent"], announcement: ko["shooter.pickC3ThenHammerOnUpToFret11"], direction: "ascending" }),
    steps: Object.freeze([
      ["C#3", 5, 4, ko["etudes.picking"]], ["D#3", 5, 6, ko["etudes.hammerOn"]], ["E3", 5, 7, ko["etudes.hammerOn"]], ["F#3", 5, 9, ko["etudes.hammerOn"]], ["G#3", 5, 11, ko["etudes.hammerOn"]],
    ]),
  }),
  [SHOOTER_DIFFICULT_PATTERN_IDS.PULL_OFF_HIGH_E]: Object.freeze({
    section: Object.freeze({ id: "C", label: ko["shooter.miniCFirstStringDescent"], announcement: ko["shooter.pickE5ThenTrySlidesAndPullOffs"], direction: "descending" }),
    steps: Object.freeze([
      ["E5", 1, 12, ko["etudes.picking"]], ["D#5", 1, 11, ko["shooter.shortSlide"]], ["C#5", 1, 9, ko["shooter.optionalPullOff"]], ["B4", 1, 7, ko["shooter.optionalPullOff"]],
    ]),
  }),
  [SHOOTER_DIFFICULT_PATTERN_IDS.PULL_OFF_G]: Object.freeze({
    section: Object.freeze({ id: "D", label: ko["shooter.miniDThirdStringDescent"], announcement: ko["shooter.pickF4ThenDescendWithPullOffsAndSlides"], direction: "descending" }),
    steps: Object.freeze([
      ["F#4", 3, 11, ko["etudes.picking"]], ["E4", 3, 9, ko["shooter.pullOffSlide"]], ["D#4", 3, 8, ko["shooter.pullOffSlide"]], ["C#4", 3, 6, ko["shooter.pullOffSlide"]],
    ]),
  }),
});

function createScenario(rawSteps, sections, patternId, miniPattern = false) {
  return Object.freeze(rawSteps.map((rawStep, index) => {
    const [sectionId, pitch, stringNumber, fretNumber, beats] = miniPattern
      ? [sections[0].id, rawStep[0], rawStep[1], rawStep[2], 1]
      : rawStep;
    const section = sections.find((candidate) => candidate.id === sectionId);
    return Object.freeze({
      ...createShooterTargetNote({ label: pitch, stringNumber, fretNumber }),
      index,
      order: index + 1,
      pitch,
      stringNumber,
      fretNumber,
      beats,
      sectionId,
      sectionLabel: section.label,
      sectionAnnouncement: section.announcement,
      direction: section.direction,
      patternId,
      authoredTechnique: miniPattern ? rawStep[3] : null,
      isMiniPattern: miniPattern,
      isSectionStart: index === 0 || (!miniPattern && rawSteps[index - 1][0] !== sectionId),
      isClimax: pitch === "E5" && fretNumber === 12,
      isRoundEnding: index === rawSteps.length - 1,
    });
  }));
}

export const SHOOTER_DIFFICULT_MAIN_SCENARIO = createScenario(
  RAW_DIFFICULT_MAIN_STEPS,
  SHOOTER_DIFFICULT_SECTIONS,
  SHOOTER_DIFFICULT_PATTERN_IDS.MAIN,
);

export const SHOOTER_DIFFICULT_MINI_PATTERNS = Object.freeze(Object.fromEntries(
  Object.entries(MINI_PATTERN_DEFINITIONS).map(([patternId, definition]) => [
    patternId,
    createScenario(definition.steps, [definition.section], patternId, true),
  ]),
));

export function getShooterDifficultScenario(patternId = SHOOTER_DIFFICULT_PATTERN_IDS.MAIN) {
  return SHOOTER_DIFFICULT_MINI_PATTERNS[patternId] ?? SHOOTER_DIFFICULT_MAIN_SCENARIO;
}

export function getShooterDifficultScenarioStep(spawnedCount = 0, patternId = SHOOTER_DIFFICULT_PATTERN_IDS.MAIN) {
  const scenario = getShooterDifficultScenario(patternId);
  const safeCount = Math.max(0, Math.floor(Number(spawnedCount) || 0));
  return scenario[safeCount % scenario.length];
}

export function getShooterDifficultScenarioRound(spawnedCount = 0, patternId = SHOOTER_DIFFICULT_PATTERN_IDS.MAIN) {
  const scenario = getShooterDifficultScenario(patternId);
  const safeCount = Math.max(0, Math.floor(Number(spawnedCount) || 0));
  return Math.floor(safeCount / scenario.length);
}

export function getShooterDifficultSectionForSpawnCount(
  spawnedCount = 0,
  activeTarget = false,
  patternId = SHOOTER_DIFFICULT_PATTERN_IDS.MAIN,
) {
  const currentIndex = Math.max(0, Math.floor(Number(spawnedCount) || 0) - (activeTarget ? 1 : 0));
  const step = getShooterDifficultScenarioStep(currentIndex, patternId);
  if (step.isMiniPattern) {
    return MINI_PATTERN_DEFINITIONS[step.patternId]?.section ?? SHOOTER_DIFFICULT_SECTIONS[0];
  }
  return SHOOTER_DIFFICULT_SECTIONS.find((section) => section.id === step.sectionId);
}

export function getShooterDifficultStepBeats(
  _step,
  _bpm = SHOOTER_DIFFICULT_RECOMMENDED_BPMS[0],
  _round = 0,
) {
  return 2;
}

export function getShooterDifficultStepDurationMs(
  step,
  bpm = SHOOTER_DIFFICULT_RECOMMENDED_BPMS[0],
  round = 0,
) {
  const safeBpm = Math.max(1, Number(bpm) || SHOOTER_DIFFICULT_RECOMMENDED_BPMS[0]);
  return (60_000 / safeBpm) * getShooterDifficultStepBeats(step, safeBpm, round);
}

export function getShooterDifficultTargetX(step) {
  const fret = Math.max(0, Math.min(12, Number(step?.fretNumber) || 0));
  const stringNumber = Math.max(1, Math.min(6, Number(step?.stringNumber) || 6));
  return Math.round(Math.max(12, Math.min(88, 14 + (fret / 12) * 66 + (6 - stringNumber) * 1.6)));
}

export function getShooterDifficultTechniqueLabel(step, bpm = SHOOTER_DIFFICULT_RECOMMENDED_BPMS[0]) {
  if (!step) return "";
  if (step.authoredTechnique) return step.authoredTechnique;
  if ((Number(bpm) || SHOOTER_DIFFICULT_RECOMMENDED_BPMS[0]) <= 56) return ko["etudes.picking"];
  const previousStep = step.index > 0 ? SHOOTER_DIFFICULT_MAIN_SCENARIO[step.index - 1] : null;
  if (!previousStep || previousStep.stringNumber !== step.stringNumber) return ko["etudes.picking"];
  if (step.direction === "ascending") return ko["shooter.optionalHammerOn"];
  if (step.order === 23) return ko["shooter.shortSlide"];
  return ko["shooter.optionalPullOffSlide"];
}

export function getShooterDifficultRoundProgress({
  bpm = SHOOTER_DIFFICULT_RECOMMENDED_BPMS[0],
  hits = 0,
  misses = 0,
  stableRounds = 0,
  lives = 3,
} = {}) {
  return getScriptedDifficultyRoundProgress({
    recommendedBpms: SHOOTER_DIFFICULT_RECOMMENDED_BPMS,
    stableAccuracy: SHOOTER_DIFFICULT_STABLE_ACCURACY,
    requiredStableRounds: SHOOTER_DIFFICULT_STABLE_ROUNDS,
    bpm,
    hits,
    misses,
    stableRounds,
    lives,
  });
}

export function getShooterDifficultReviewMessage(missedSteps = []) {
  const misses = Array.isArray(missedSteps) ? missedSteps : [];
  if (!misses.length) return ko["shooter.youCompletedTheE2E5AscentAndDescentAccurately"];

  const weaknessCounts = [
    { label: ko["shooter.reviewTheDPositionsOnceMore"], count: misses.filter((step) => step?.pitch?.startsWith("D#")).length },
    { label: ko["shooter.practiceTheFirstStringHighRegisterSectionAgain"], count: misses.filter((step) => step?.stringNumber === 1 && step?.direction === "ascending").length },
    { label: ko["shooter.practiceTheDescendingFret117ConnectionAgain"], count: misses.filter((step) => step?.direction === "descending" && Number(step?.fretNumber) >= 7).length },
    { label: ko["shooter.practiceReturningToTheLowerRegisterAgain"], count: misses.filter((step) => step?.sectionId === 6).length },
  ].sort((a, b) => b.count - a.count);
  return weaknessCounts[0].count > 0 ? weaknessCounts[0].label : ko["shooter.reconnectTheMissedPositionsSlowly"];
}
