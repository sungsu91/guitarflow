import { getScriptedDifficultyRoundProgress } from "./scriptedDifficultyProgress.js";
import { createShooterTargetNote } from "./gameplayRules.js";

export const SHOOTER_DIFFICULT_RECOMMENDED_BPMS = Object.freeze([56, 64, 72, 80, 88]);
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
  Object.freeze({ id: SHOOTER_DIFFICULT_PATTERN_IDS.MAIN, label: "메인 왕복", shortLabel: "메인", hint: "E2~E5 상행·하행" }),
  Object.freeze({ id: SHOOTER_DIFFICULT_PATTERN_IDS.HAMMER_ON_LOW_E, label: "패턴 A", shortLabel: "A", hint: "6번줄 해머온" }),
  Object.freeze({ id: SHOOTER_DIFFICULT_PATTERN_IDS.HAMMER_ON_A, label: "패턴 B", shortLabel: "B", hint: "5번줄 해머온" }),
  Object.freeze({ id: SHOOTER_DIFFICULT_PATTERN_IDS.PULL_OFF_HIGH_E, label: "패턴 C", shortLabel: "C", hint: "1번줄 풀오프" }),
  Object.freeze({ id: SHOOTER_DIFFICULT_PATTERN_IDS.PULL_OFF_G, label: "패턴 D", shortLabel: "D", hint: "3번줄 하행" }),
]);

export const SHOOTER_DIFFICULT_SECTIONS = Object.freeze([
  Object.freeze({ id: 1, label: "1구간 · 6번줄 저음 출발", announcement: "낮은 E2에서 천천히 출발합니다.", direction: "ascending" }),
  Object.freeze({ id: 2, label: "2구간 · 5번줄 반음", announcement: "D#3을 지나 11프렛까지 올라갑니다.", direction: "ascending" }),
  Object.freeze({ id: 3, label: "3구간 · 중음부 이동", announcement: "4번줄과 3번줄을 따라 올라갑니다.", direction: "ascending" }),
  Object.freeze({ id: 4, label: "4구간 · 고음부 도착", announcement: "1번줄 12프렛 E5에 도착해 보세요.", direction: "ascending" }),
  Object.freeze({ id: 5, label: "5구간 · 고음 하행", announcement: "고음에서 풀오프·슬라이드 느낌으로 내려옵니다.", direction: "descending" }),
  Object.freeze({ id: 6, label: "6구간 · 중저음 복귀", announcement: "저음 E2의 출발 위치로 돌아옵니다.", direction: "descending" }),
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
    section: Object.freeze({ id: "A", label: "미니 A · 6번줄 상행", announcement: "E2를 피킹하고 해머온으로 이어 보세요.", direction: "ascending" }),
    steps: Object.freeze([
      ["E2", 6, 0, "피킹"], ["F#2", 6, 2, "해머온"], ["G#2", 6, 4, "해머온"], ["A2", 6, 5, "해머온"], ["B2", 6, 7, "해머온"],
    ]),
  }),
  [SHOOTER_DIFFICULT_PATTERN_IDS.HAMMER_ON_A]: Object.freeze({
    section: Object.freeze({ id: "B", label: "미니 B · 5번줄 상행", announcement: "C#3을 피킹하고 11프렛까지 해머온해 보세요.", direction: "ascending" }),
    steps: Object.freeze([
      ["C#3", 5, 4, "피킹"], ["D#3", 5, 6, "해머온"], ["E3", 5, 7, "해머온"], ["F#3", 5, 9, "해머온"], ["G#3", 5, 11, "해머온"],
    ]),
  }),
  [SHOOTER_DIFFICULT_PATTERN_IDS.PULL_OFF_HIGH_E]: Object.freeze({
    section: Object.freeze({ id: "C", label: "미니 C · 1번줄 하행", announcement: "E5 피킹 후 슬라이드와 풀오프를 시도해 보세요.", direction: "descending" }),
    steps: Object.freeze([
      ["E5", 1, 12, "피킹"], ["D#5", 1, 11, "짧은 슬라이드"], ["C#5", 1, 9, "풀오프 선택"], ["B4", 1, 7, "풀오프 선택"],
    ]),
  }),
  [SHOOTER_DIFFICULT_PATTERN_IDS.PULL_OFF_G]: Object.freeze({
    section: Object.freeze({ id: "D", label: "미니 D · 3번줄 하행", announcement: "F#4 피킹 후 풀오프·슬라이드로 내려오세요.", direction: "descending" }),
    steps: Object.freeze([
      ["F#4", 3, 11, "피킹"], ["E4", 3, 9, "풀오프/슬라이드"], ["D#4", 3, 8, "풀오프/슬라이드"], ["C#4", 3, 6, "풀오프/슬라이드"],
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
  step,
  bpm = SHOOTER_DIFFICULT_RECOMMENDED_BPMS[0],
  round = 0,
) {
  const safeBpm = Number(bpm) || SHOOTER_DIFFICULT_RECOMMENDED_BPMS[0];
  if (step?.isMiniPattern) {
    if (safeBpm >= 80) return 0.5;
    if (safeBpm <= 56) return 2;
    return 1;
  }
  if (safeBpm >= 88) {
    const focusSectionId = Math.max(0, Number(round) || 0) % 2 === 0 ? 3 : 5;
    return step?.sectionId === focusSectionId ? 0.5 : 1;
  }
  if (safeBpm >= 72) return 1;
  if (safeBpm >= 64) return Math.max(1, Number(step?.beats) || 1);
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
  if ((Number(bpm) || SHOOTER_DIFFICULT_RECOMMENDED_BPMS[0]) <= 56) return "피킹";
  const previousStep = step.index > 0 ? SHOOTER_DIFFICULT_MAIN_SCENARIO[step.index - 1] : null;
  if (!previousStep || previousStep.stringNumber !== step.stringNumber) return "피킹";
  if (step.direction === "ascending") return "해머온 선택";
  if (step.order === 23) return "짧은 슬라이드";
  return "풀오프/슬라이드 선택";
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
  if (!misses.length) return "E2~E5 상행과 하행을 정확하게 완주했습니다.";

  const weaknessCounts = [
    { label: "D# 위치를 한 번 더 확인해 보세요.", count: misses.filter((step) => step?.pitch?.startsWith("D#")).length },
    { label: "1번줄 고음 구간을 한 번 더 연습해 보세요.", count: misses.filter((step) => step?.stringNumber === 1 && step?.direction === "ascending").length },
    { label: "하행 11→7프렛 연결을 한 번 더 연습해 보세요.", count: misses.filter((step) => step?.direction === "descending" && Number(step?.fretNumber) >= 7).length },
    { label: "중저음 복귀 구간을 한 번 더 연습해 보세요.", count: misses.filter((step) => step?.sectionId === 6).length },
  ].sort((a, b) => b.count - a.count);
  return weaknessCounts[0].count > 0 ? weaknessCounts[0].label : "놓친 위치를 천천히 다시 연결해 보세요.";
}
