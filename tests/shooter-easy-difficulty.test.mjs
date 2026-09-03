import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SHOOTER_EASY_RECOMMENDED_BPMS,
  SHOOTER_EASY_SCENARIO,
  SHOOTER_EASY_SECTIONS,
  SHOOTER_EASY_SPEED_ANNOUNCEMENT,
  getShooterEasyReviewMessage,
  getShooterEasyRoundProgress,
  getShooterEasyScenarioRound,
  getShooterEasyScenarioStep,
  getShooterEasyStepBeats,
  getShooterEasyStepDurationMs,
  getShooterEasyTargetX,
} from "../src/shooter/easyDifficultyScenario.js";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const positions = (steps) => steps.map((step) => `${step.pitch}:s${step.stringNumber}f${step.fretNumber}`);

const PITCH_CLASS_TO_SEMITONE = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};
const OPEN_STRING_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };

function pitchToMidi(pitch) {
  const match = /^([A-G]#?)(\d)$/.exec(pitch);
  assert.ok(match, `invalid pitch ${pitch}`);
  return (Number(match[2]) + 1) * 12 + PITCH_CLASS_TO_SEMITONE[match[1]];
}

test("easy shooter begins with the exact six-open-string ascent and descent", () => {
  const openStringSection = SHOOTER_EASY_SCENARIO.filter((step) => step.sectionId === 1);
  assert.deepEqual(positions(openStringSection), [
    "E2:s6f0", "A2:s5f0", "D3:s4f0", "G3:s3f0", "B3:s2f0", "E4:s1f0",
    "B3:s2f0", "G3:s3f0", "D3:s4f0", "A2:s5f0", "E2:s6f0",
  ]);
  assert.ok(openStringSection.every((step) => step.beats === 2));
  assert.equal(openStringSection[0].isSectionStart, true);
  assert.deepEqual(SHOOTER_EASY_SECTIONS.map((section) => section.announcement), [
    "개방현으로 저음부터 고음까지 올라가 보세요.",
    "0~3프렛의 자연음을 따라가 보세요.",
    "바로 옆 프렛의 반음도 함께 익혀보세요.",
    "0→1→2→3, 한 칸씩 왕복해 보세요.",
  ]);
  assert.equal(SHOOTER_EASY_SPEED_ANNOUNCEMENT, "같은 위치에서 조금 더 빠르게 연결해 보세요.");
});

test("natural and chromatic sections travel low-to-high and back in the authored order", () => {
  const naturalSection = SHOOTER_EASY_SCENARIO.filter((step) => step.sectionId === 2);
  const chromaticSection = SHOOTER_EASY_SCENARIO.filter((step) => step.sectionId === 3);
  const naturalAscent = [
    "E2:s6f0", "F2:s6f1", "G2:s6f3", "A2:s5f0", "B2:s5f2", "C3:s5f3",
    "D3:s4f0", "E3:s4f2", "F3:s4f3", "G3:s3f0", "A3:s3f2", "B3:s2f0",
    "C4:s2f1", "D4:s2f3", "E4:s1f0", "F4:s1f1", "G4:s1f3",
  ];
  const chromaticAscent = [
    "E2:s6f0", "F2:s6f1", "F#2:s6f2", "G2:s6f3",
    "A2:s5f0", "A#2:s5f1", "B2:s5f2", "C3:s5f3",
    "D3:s4f0", "D#3:s4f1", "E3:s4f2", "F3:s4f3",
    "G3:s3f0", "G#3:s3f1", "A3:s3f2", "A#3:s3f3",
    "B3:s2f0", "C4:s2f1", "C#4:s2f2", "D4:s2f3",
    "E4:s1f0", "F4:s1f1", "F#4:s1f2", "G4:s1f3",
  ];

  assert.deepEqual(positions(naturalSection), [...naturalAscent, ...[...naturalAscent].reverse()]);
  assert.deepEqual(positions(chromaticSection), [...chromaticAscent, ...[...chromaticAscent].reverse()]);
  assert.ok(!naturalSection.some((step) => step.isSharp));
  assert.ok(chromaticSection.some((step) => step.pitch === "F#2" && step.stringNumber === 6 && step.fretNumber === 2));
});

test("all easy targets stay on standard-tuned frets zero through three", () => {
  assert.equal(SHOOTER_EASY_SCENARIO.length, 135);
  assert.deepEqual(SHOOTER_EASY_SECTIONS.map((section) => section.id), [1, 2, 3, 4]);
  assert.ok(SHOOTER_EASY_SCENARIO.every((step) => step.fretNumber >= 0 && step.fretNumber <= 3));
  assert.deepEqual([...new Set(SHOOTER_EASY_SCENARIO.map((step) => step.fretNumber))], [0, 1, 3, 2]);
  for (const step of SHOOTER_EASY_SCENARIO) {
    assert.equal(pitchToMidi(step.pitch), OPEN_STRING_MIDI[step.stringNumber] + step.fretNumber);
  }
  assert.equal(getShooterEasyScenarioStep(135), SHOOTER_EASY_SCENARIO[0]);
  assert.equal(getShooterEasyScenarioRound(135), 1);
  assert.ok(getShooterEasyTargetX({ fretNumber: 0, stringNumber: 6 }) < getShooterEasyTargetX({ fretNumber: 3, stringNumber: 1 }));
});

test("six one-string patterns each complete a zero-to-three round trip", () => {
  const roundTripSection = SHOOTER_EASY_SCENARIO.filter((step) => step.sectionId === 4);
  assert.equal(roundTripSection.length, 42);
  for (const [patternIndex, patternId] of ["A", "B", "C", "D", "E", "F"].entries()) {
    const pattern = roundTripSection.filter((step) => step.subPatternId === patternId);
    assert.deepEqual(pattern.map((step) => step.fretNumber), [0, 1, 2, 3, 2, 1, 0]);
    assert.ok(pattern.every((step) => step.stringNumber === 6 - patternIndex));
    assert.equal(pattern[0].isSectionStart, true);
  }
});

test("easy tempo follows 50, 58, 66, 74, and 82 BPM without accelerating the whole course", () => {
  assert.deepEqual(SHOOTER_EASY_RECOMMENDED_BPMS, [50, 58, 66, 74, 82]);
  const naturalStep = SHOOTER_EASY_SCENARIO.find((step) => step.sectionId === 2);
  const chromaticStep = SHOOTER_EASY_SCENARIO.find((step) => step.sectionId === 3 && step.pitch === "F#2");
  const fastPatternA = SHOOTER_EASY_SCENARIO.find((step) => step.sectionId === 4 && step.subPatternId === "A");
  const regularPatternB = SHOOTER_EASY_SCENARIO.find((step) => step.sectionId === 4 && step.subPatternId === "B");

  assert.ok(SHOOTER_EASY_SCENARIO.every((step) => getShooterEasyStepBeats(step, 50) === 2));
  assert.equal(getShooterEasyStepBeats(naturalStep, 58), 1);
  assert.equal(getShooterEasyStepBeats(chromaticStep, 58), 2);
  assert.equal(getShooterEasyStepBeats(fastPatternA, 58), 1);
  assert.ok(SHOOTER_EASY_SCENARIO.every((step) => getShooterEasyStepBeats(step, 66) === 1));
  assert.ok(SHOOTER_EASY_SCENARIO.every((step) => getShooterEasyStepBeats(step, 74) === 1));
  assert.equal(getShooterEasyStepBeats(fastPatternA, 82, 0), 0.5);
  assert.equal(getShooterEasyStepBeats(regularPatternB, 82, 0), 1);
  assert.equal(getShooterEasyStepBeats(fastPatternA, 82, 1), 1);
  assert.equal(getShooterEasyStepBeats(regularPatternB, 82, 1), 0.5);
  assert.equal(getShooterEasyStepBeats(naturalStep, 82), 1);
  assert.equal(getShooterEasyStepDurationMs(SHOOTER_EASY_SCENARIO[0], 50), 2400);

  const stableRound = getShooterEasyRoundProgress({ bpm: 50, hits: 122, misses: 13 });
  assert.equal(stableRound.accuracy, 90);
  assert.equal(stableRound.bpm, 58);
  assert.equal(stableRound.bpmRaised, true);
  assert.equal(getShooterEasyRoundProgress({ bpm: 58, hits: 90, misses: 45 }).bpm, 58);
});

test("easy review feedback identifies open strings, semitones, and fret round trips", () => {
  assert.match(getShooterEasyReviewMessage([]), /0~3프렛 기초 코스/);
  assert.match(getShooterEasyReviewMessage([{ sectionId: 1, isSharp: false }]), /개방현/);
  assert.match(getShooterEasyReviewMessage([{ sectionId: 3, isSharp: true }]), /F#2/);
  assert.match(getShooterEasyReviewMessage([{ sectionId: 4, isSharp: false }]), /0→1→2→3/);
});

test("App routes easy difficulty through the fixed course rather than the random picker", () => {
  const spawnStart = appSource.indexOf("const spawnShooterTarget = useCallback");
  const spawnEnd = appSource.indexOf("const judgeReferenceNote", spawnStart);
  const spawnSource = appSource.slice(spawnStart, spawnEnd);
  const missStart = appSource.indexOf("const missedTargets = shooterTargetsRef.current.filter");
  const missEnd = appSource.indexOf("const expiredProjectiles", missStart);
  const missSource = appSource.slice(missStart, missEnd);

  assert.match(spawnSource, /getShooterEasyScenarioStep\(patternRef\.current\)/);
  assert.match(spawnSource, /getShooterEasyScenarioRound\(patternRef\.current\)/);
  assert.match(spawnSource, /getShooterEasyStepDurationMs\(resolvedScenarioStep, bpmRef\.current, scenarioRound\)/);
  assert.match(spawnSource, /getShooterEasyTargetX\(resolvedScenarioStep\)/);
  assert.match(spawnSource, /"shooter-easy-scenario"/);
  assert.match(missSource, /!isShooterScriptedDifficulty\(target\.difficulty\)/);
  assert.match(appSource, /50 BPM · 0~3프렛 기초 완성/);
});
