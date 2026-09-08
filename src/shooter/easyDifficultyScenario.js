import { getScriptedDifficultyRoundProgress } from "./scriptedDifficultyProgress.js";
import { createShooterTargetNote } from "./gameplayRules.js";

export const SHOOTER_EASY_RECOMMENDED_BPMS = Object.freeze([42, 44, 46, 48, 50]);
export const SHOOTER_EASY_STABLE_ACCURACY = 85;
export const SHOOTER_EASY_STABLE_ROUNDS = 1;

export const SHOOTER_EASY_SECTIONS = Object.freeze([
  Object.freeze({
    id: 1,
    label: "1단계 · 개방현 출발",
    announcement: "개방현으로 저음부터 고음까지 올라가 보세요.",
    direction: "ascending",
    kind: "open-strings",
  }),
  Object.freeze({
    id: 2,
    label: "2단계 · 자연음 상행·하행",
    announcement: "0~3프렛의 자연음을 따라가 보세요.",
    direction: "round-trip",
    kind: "natural",
  }),
  Object.freeze({
    id: 3,
    label: "3단계 · 반음 입문",
    announcement: "바로 옆 프렛의 반음도 함께 익혀보세요.",
    direction: "round-trip",
    kind: "chromatic",
  }),
  Object.freeze({
    id: 4,
    label: "4단계 · 0~3프렛 왕복",
    announcement: "0→1→2→3, 한 칸씩 왕복해 보세요.",
    direction: "round-trip",
    kind: "fret-round-trip",
  }),
]);

export const SHOOTER_EASY_SPEED_ANNOUNCEMENT = "같은 위치에서 조금 더 빠르게 연결해 보세요.";

const OPEN_STRING_STEPS = [
  ["E2", 6, 0],
  ["A2", 5, 0],
  ["D3", 4, 0],
  ["G3", 3, 0],
  ["B3", 2, 0],
  ["E4", 1, 0],
  ["B3", 2, 0],
  ["G3", 3, 0],
  ["D3", 4, 0],
  ["A2", 5, 0],
  ["E2", 6, 0],
];

const NATURAL_ASCENDING_STEPS = [
  ["E2", 6, 0], ["F2", 6, 1], ["G2", 6, 3],
  ["A2", 5, 0], ["B2", 5, 2], ["C3", 5, 3],
  ["D3", 4, 0], ["E3", 4, 2], ["F3", 4, 3],
  ["G3", 3, 0], ["A3", 3, 2],
  ["B3", 2, 0], ["C4", 2, 1], ["D4", 2, 3],
  ["E4", 1, 0], ["F4", 1, 1], ["G4", 1, 3],
];

const CHROMATIC_ASCENDING_STEPS = [
  ["E2", 6, 0], ["F2", 6, 1], ["F#2", 6, 2], ["G2", 6, 3],
  ["A2", 5, 0], ["A#2", 5, 1], ["B2", 5, 2], ["C3", 5, 3],
  ["D3", 4, 0], ["D#3", 4, 1], ["E3", 4, 2], ["F3", 4, 3],
  ["G3", 3, 0], ["G#3", 3, 1], ["A3", 3, 2], ["A#3", 3, 3],
  ["B3", 2, 0], ["C4", 2, 1], ["C#4", 2, 2], ["D4", 2, 3],
  ["E4", 1, 0], ["F4", 1, 1], ["F#4", 1, 2], ["G4", 1, 3],
];

const FRET_ROUND_TRIP_PATTERNS = Object.freeze([
  Object.freeze({ id: "A", stringNumber: 6, steps: [["E2", 0], ["F2", 1], ["F#2", 2], ["G2", 3], ["F#2", 2], ["F2", 1], ["E2", 0]] }),
  Object.freeze({ id: "B", stringNumber: 5, steps: [["A2", 0], ["A#2", 1], ["B2", 2], ["C3", 3], ["B2", 2], ["A#2", 1], ["A2", 0]] }),
  Object.freeze({ id: "C", stringNumber: 4, steps: [["D3", 0], ["D#3", 1], ["E3", 2], ["F3", 3], ["E3", 2], ["D#3", 1], ["D3", 0]] }),
  Object.freeze({ id: "D", stringNumber: 3, steps: [["G3", 0], ["G#3", 1], ["A3", 2], ["A#3", 3], ["A3", 2], ["G#3", 1], ["G3", 0]] }),
  Object.freeze({ id: "E", stringNumber: 2, steps: [["B3", 0], ["C4", 1], ["C#4", 2], ["D4", 3], ["C#4", 2], ["C4", 1], ["B3", 0]] }),
  Object.freeze({ id: "F", stringNumber: 1, steps: [["E4", 0], ["F4", 1], ["F#4", 2], ["G4", 3], ["F#4", 2], ["F4", 1], ["E4", 0]] }),
]);

const RAW_EASY_STEPS = [
  ...OPEN_STRING_STEPS.map((step, index) => [1, ...step, 2, index < 6 ? "ascending" : "descending", null]),
  ...[
    ...NATURAL_ASCENDING_STEPS.map((step) => [...step, "ascending"]),
    ...[...NATURAL_ASCENDING_STEPS].reverse().map((step) => [...step, "descending"]),
  ].map(([pitch, stringNumber, fretNumber, direction]) => [2, pitch, stringNumber, fretNumber, 2, direction, null]),
  ...[
    ...CHROMATIC_ASCENDING_STEPS.map((step) => [...step, "ascending"]),
    ...[...CHROMATIC_ASCENDING_STEPS].reverse().map((step) => [...step, "descending"]),
  ].map(([pitch, stringNumber, fretNumber, direction]) => [3, pitch, stringNumber, fretNumber, 2, direction, null]),
  ...FRET_ROUND_TRIP_PATTERNS.flatMap((pattern) => pattern.steps.map(([pitch, fretNumber], index) => [
    4,
    pitch,
    pattern.stringNumber,
    fretNumber,
    1,
    index <= 3 ? "ascending" : "descending",
    pattern.id,
  ])),
];

export const SHOOTER_EASY_SCENARIO = Object.freeze(RAW_EASY_STEPS.map((rawStep, index) => {
  const [sectionId, pitch, stringNumber, fretNumber, beats, direction, subPatternId] = rawStep;
  const section = SHOOTER_EASY_SECTIONS.find((candidate) => candidate.id === sectionId);
  const previousStep = RAW_EASY_STEPS[index - 1];
  const isSubPatternStart = sectionId === 4 && subPatternId !== previousStep?.[6];
  return Object.freeze({
    ...createShooterTargetNote({ label: pitch, stringNumber, fretNumber }),
    index,
    order: index + 1,
    pitch,
    stringNumber,
    fretNumber,
    beats,
    sectionId,
    sectionKind: section.kind,
    sectionLabel: isSubPatternStart ? `${section.label} · 패턴 ${subPatternId}` : section.label,
    sectionAnnouncement: isSubPatternStart
      ? subPatternId === "A"
        ? section.announcement
        : `${stringNumber}번줄에서 0→1→2→3→0으로 왕복합니다.`
      : section.announcement,
    direction,
    subPatternId,
    isSharp: pitch.includes("#"),
    isSectionStart: index === 0 || previousStep?.[0] !== sectionId || isSubPatternStart,
    isRoundEnding: index === RAW_EASY_STEPS.length - 1,
  });
}));

export function getShooterEasyScenarioStep(spawnedCount = 0) {
  const safeCount = Math.max(0, Math.floor(Number(spawnedCount) || 0));
  return SHOOTER_EASY_SCENARIO[safeCount % SHOOTER_EASY_SCENARIO.length];
}

export function getShooterEasyScenarioRound(spawnedCount = 0) {
  const safeCount = Math.max(0, Math.floor(Number(spawnedCount) || 0));
  return Math.floor(safeCount / SHOOTER_EASY_SCENARIO.length);
}

export function getShooterEasySectionForSpawnCount(spawnedCount = 0, activeTarget = false) {
  const currentIndex = Math.max(0, Math.floor(Number(spawnedCount) || 0) - (activeTarget ? 1 : 0));
  const step = getShooterEasyScenarioStep(currentIndex);
  return SHOOTER_EASY_SECTIONS.find((section) => section.id === step.sectionId);
}

export function getShooterEasyStepBeats(
  _step,
  _bpm = SHOOTER_EASY_RECOMMENDED_BPMS[0],
  _round = 0,
) {
  return 2;
}

export function getShooterEasyStepDurationMs(
  step,
  bpm = SHOOTER_EASY_RECOMMENDED_BPMS[0],
  round = 0,
) {
  const safeBpm = Math.max(1, Number(bpm) || SHOOTER_EASY_RECOMMENDED_BPMS[0]);
  return (60_000 / safeBpm) * getShooterEasyStepBeats(step, safeBpm, round);
}

export function getShooterEasyTargetX(step) {
  const fret = Math.max(0, Math.min(3, Number(step?.fretNumber) || 0));
  const stringNumber = Math.max(1, Math.min(6, Number(step?.stringNumber) || 6));
  return Math.round(Math.max(13, Math.min(87, 16 + (fret / 3) * 58 + (6 - stringNumber) * 2.2)));
}

export function getShooterEasyRoundProgress({
  bpm = SHOOTER_EASY_RECOMMENDED_BPMS[0],
  hits = 0,
  misses = 0,
  stableRounds = 0,
  lives = 3,
} = {}) {
  return getScriptedDifficultyRoundProgress({
    recommendedBpms: SHOOTER_EASY_RECOMMENDED_BPMS,
    stableAccuracy: SHOOTER_EASY_STABLE_ACCURACY,
    requiredStableRounds: SHOOTER_EASY_STABLE_ROUNDS,
    bpm,
    hits,
    misses,
    stableRounds,
    lives,
  });
}

export function getShooterEasyReviewMessage(missedSteps = []) {
  const misses = Array.isArray(missedSteps) ? missedSteps : [];
  if (!misses.length) return "0~3프렛 기초 코스를 정확하게 완주했습니다.";
  const weaknessCounts = [
    { label: "여섯 개 개방현 위치를 한 번 더 확인해 보세요.", count: misses.filter((step) => step?.sectionId === 1).length },
    { label: "F#2를 포함한 바로 옆 반음 위치를 다시 연습해 보세요.", count: misses.filter((step) => step?.isSharp).length },
    { label: "0~3프렛 자연음 상행·하행을 다시 연결해 보세요.", count: misses.filter((step) => step?.sectionId === 2).length },
    { label: "한 줄의 0→1→2→3 왕복을 천천히 다시 연습해 보세요.", count: misses.filter((step) => step?.sectionId === 4).length },
  ].sort((a, b) => b.count - a.count);
  return weaknessCounts[0].count > 0 ? weaknessCounts[0].label : "놓친 0~3프렛 위치를 천천히 다시 확인해 보세요.";
}
