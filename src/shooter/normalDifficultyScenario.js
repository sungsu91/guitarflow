import ko from "../i18n/locales/ko.js";
import { getScriptedDifficultyRoundProgress } from "./scriptedDifficultyProgress.js";
import { createShooterTargetNote } from "./gameplayRules.js";

export const SHOOTER_NORMAL_RECOMMENDED_BPMS = Object.freeze([48, 50, 52, 54, 56]);
export const SHOOTER_NORMAL_STABLE_ACCURACY = 85;
export const SHOOTER_NORMAL_STABLE_ROUNDS = 1;

export const SHOOTER_NORMAL_SECTIONS = Object.freeze([
  Object.freeze({
    id: 1,
    label: ko["shooter.section1StartAtFret5"],
    announcement: ko["shooter.letSStartAtFret5"],
    direction: "ascending",
  }),
  Object.freeze({
    id: 2,
    label: ko["shooter.section2AscendThroughFrets79"],
    announcement: ko["shooter.moveUpToAHigherPosition"],
    direction: "ascending",
  }),
  Object.freeze({
    id: 3,
    label: ko["shooter.section3HighNotesAtFret10"],
    announcement: ko["shooter.reachTheHighNotesAtFret10"],
    direction: "ascending",
  }),
  Object.freeze({
    id: 4,
    label: ko["shooter.section4DescendStepByStep"],
    announcement: ko["shooter.comeBackDownFromTheHighNotes"],
    direction: "descending",
  }),
  Object.freeze({
    id: 5,
    label: ko["shooter.section5ReturnToFret5"],
    announcement: ko["shooter.returnToTheStartingPosition"],
    direction: "descending",
  }),
]);

const RAW_NORMAL_STEPS = [
  [1, "A2", 6, 5, 2],
  [1, "B2", 6, 7, 2],
  [1, "C3", 6, 8, 2],
  [1, "D3", 5, 5, 2],
  [1, "E3", 5, 7, 2],
  [1, "F3", 5, 8, 2],
  [1, "G3", 4, 5, 2],
  [1, "A3", 4, 7, 2],
  [2, "B3", 4, 9, 1],
  [2, "C4", 3, 5, 1],
  [2, "D4", 3, 7, 1],
  [2, "E4", 3, 9, 1],
  [2, "F4", 3, 10, 1],
  [2, "G4", 2, 8, 1],
  [2, "A4", 2, 10, 1],
  [3, "B4", 1, 7, 1],
  [3, "C5", 1, 8, 1],
  [3, "D5", 1, 10, 2],
  [4, "C5", 1, 8, 1],
  [4, "B4", 1, 7, 1],
  [4, "A4", 2, 10, 1],
  [4, "G4", 2, 8, 1],
  [4, "F4", 3, 10, 1],
  [4, "E4", 3, 9, 1],
  [4, "D4", 3, 7, 1],
  [4, "C4", 3, 5, 1],
  [5, "B3", 4, 9, 1],
  [5, "A3", 4, 7, 1],
  [5, "G3", 4, 5, 1],
  [5, "F3", 5, 8, 1],
  [5, "E3", 5, 7, 1],
  [5, "D3", 5, 5, 1],
  [5, "C3", 6, 8, 1],
  [5, "B2", 6, 7, 1],
  [5, "A2", 6, 5, 2],
];

export const SHOOTER_NORMAL_SCENARIO = Object.freeze(RAW_NORMAL_STEPS.map((rawStep, index) => {
  const [sectionId, pitch, stringNumber, fretNumber, beats] = rawStep;
  const section = SHOOTER_NORMAL_SECTIONS.find((candidate) => candidate.id === sectionId);
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
    isSectionStart: index === 0 || RAW_NORMAL_STEPS[index - 1][0] !== sectionId,
    isClimax: index === 17,
    isRoundEnding: index === RAW_NORMAL_STEPS.length - 1,
  });
}));

export function getShooterNormalScenarioStep(spawnedCount = 0) {
  const safeCount = Math.max(0, Math.floor(Number(spawnedCount) || 0));
  return SHOOTER_NORMAL_SCENARIO[safeCount % SHOOTER_NORMAL_SCENARIO.length];
}

export function getShooterNormalScenarioRound(spawnedCount = 0) {
  const safeCount = Math.max(0, Math.floor(Number(spawnedCount) || 0));
  return Math.floor(safeCount / SHOOTER_NORMAL_SCENARIO.length);
}

export function getShooterNormalSectionForSpawnCount(spawnedCount = 0, activeTarget = false) {
  const currentIndex = Math.max(0, Math.floor(Number(spawnedCount) || 0) - (activeTarget ? 1 : 0));
  const step = getShooterNormalScenarioStep(currentIndex);
  return SHOOTER_NORMAL_SECTIONS.find((section) => section.id === step.sectionId);
}

export function getShooterNormalStepBeats(_step, _bpm = SHOOTER_NORMAL_RECOMMENDED_BPMS[0]) {
  return 2;
}

export function getShooterNormalStepDurationMs(step, bpm = SHOOTER_NORMAL_RECOMMENDED_BPMS[0]) {
  const safeBpm = Math.max(1, Number(bpm) || SHOOTER_NORMAL_RECOMMENDED_BPMS[0]);
  return (60_000 / safeBpm) * getShooterNormalStepBeats(step, safeBpm);
}

export function getShooterNormalTargetX(step) {
  const fret = Math.max(5, Math.min(10, Number(step?.fretNumber) || 5));
  return Math.round(22 + ((fret - 5) / 5) * 56);
}

export function getShooterNormalRoundProgress({
  bpm = SHOOTER_NORMAL_RECOMMENDED_BPMS[0],
  hits = 0,
  misses = 0,
  stableRounds = 0,
  lives = 3,
} = {}) {
  return getScriptedDifficultyRoundProgress({
    recommendedBpms: SHOOTER_NORMAL_RECOMMENDED_BPMS,
    stableAccuracy: SHOOTER_NORMAL_STABLE_ACCURACY,
    requiredStableRounds: SHOOTER_NORMAL_STABLE_ROUNDS,
    bpm,
    hits,
    misses,
    stableRounds,
    lives,
  });
}

export function getShooterNormalReviewMessage(missedSteps = []) {
  const misses = Array.isArray(missedSteps) ? missedSteps : [];
  if (!misses.length) return ko["shooter.youCompletedTheAscentAndDescentAccurately"];
  if (misses.some((step) => Number(step?.fretNumber) >= 9)) {
    return ko["shooter.practiceTheHighRegisterSectionAtFrets910Again"];
  }
  if (misses.some((step) => step?.sectionId === 4 || step?.sectionId === 5)) {
    return ko["shooter.practiceTheDescentAndReturnToFret5Again"];
  }
  return ko["shooter.practiceTheAscentThroughFrets58Again"];
}
