import { getScriptedDifficultyRoundProgress } from "./scriptedDifficultyProgress.js";
import { createShooterTargetNote } from "./gameplayRules.js";

export const SHOOTER_NORMAL_RECOMMENDED_BPMS = Object.freeze([50, 58, 66, 74, 82]);
export const SHOOTER_NORMAL_STABLE_ACCURACY = 85;
export const SHOOTER_NORMAL_STABLE_ROUNDS = 1;

export const SHOOTER_NORMAL_SECTIONS = Object.freeze([
  Object.freeze({
    id: 1,
    label: "1구간 · 5프렛 출발",
    announcement: "5프렛에서 시작해 볼까요?",
    direction: "ascending",
  }),
  Object.freeze({
    id: 2,
    label: "2구간 · 7~9프렛 상행",
    announcement: "조금 더 높은 위치로 올라갑니다.",
    direction: "ascending",
  }),
  Object.freeze({
    id: 3,
    label: "3구간 · 10프렛 고음",
    announcement: "10프렛 고음에 도착해 보세요.",
    direction: "ascending",
  }),
  Object.freeze({
    id: 4,
    label: "4구간 · 계단식 하행",
    announcement: "높은 음에서 다시 내려옵니다.",
    direction: "descending",
  }),
  Object.freeze({
    id: 5,
    label: "5구간 · 5프렛 복귀",
    announcement: "출발 위치로 돌아옵니다.",
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

export function getShooterNormalStepBeats(step, bpm = SHOOTER_NORMAL_RECOMMENDED_BPMS[0]) {
  const safeBpm = Number(bpm) || SHOOTER_NORMAL_RECOMMENDED_BPMS[0];
  if (safeBpm <= 50) return 2;
  if (safeBpm >= 82 && (step?.sectionId === 2 || step?.sectionId === 4)) return 0.5;
  if (safeBpm >= 58) return 1;
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
  if (!misses.length) return "상행과 하행을 정확하게 완주했습니다.";
  if (misses.some((step) => Number(step?.fretNumber) >= 9)) {
    return "9~10프렛 고음 구간을 한 번 더 연습해 보세요.";
  }
  if (misses.some((step) => step?.sectionId === 4 || step?.sectionId === 5)) {
    return "하행과 5프렛 복귀 구간을 한 번 더 연습해 보세요.";
  }
  return "5~8프렛 상행 구간을 한 번 더 연습해 보세요.";
}
