import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SHOOTER_DIFFICULT_MAIN_SCENARIO,
  SHOOTER_DIFFICULT_MINI_PATTERNS,
  SHOOTER_DIFFICULT_PATTERN_IDS,
  SHOOTER_DIFFICULT_PATTERN_OPTIONS,
  SHOOTER_DIFFICULT_RECOMMENDED_BPMS,
  getShooterDifficultReviewMessage,
  getShooterDifficultRoundProgress,
  getShooterDifficultScenario,
  getShooterDifficultScenarioRound,
  getShooterDifficultScenarioStep,
  getShooterDifficultStepBeats,
  getShooterDifficultStepDurationMs,
  getShooterDifficultTargetX,
  getShooterDifficultTechniqueLabel,
} from "../src/shooter/difficultDifficultyScenario.js";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

const positions = (steps) => steps.map((step) => (
  `${step.pitch}:s${step.stringNumber}f${step.fretNumber}:${step.beats}`
));

const PITCH_CLASS_TO_SEMITONE = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};
const OPEN_STRING_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };

function pitchToMidi(pitch) {
  const match = /^([A-G]#?)(\d)$/.exec(pitch);
  assert.ok(match, `invalid pitch ${pitch}`);
  return (Number(match[2]) + 1) * 12 + PITCH_CLASS_TO_SEMITONE[match[1]];
}

test("difficult shooter follows the exact 43-note E-major ascent and descent", () => {
  assert.equal(SHOOTER_DIFFICULT_MAIN_SCENARIO.length, 43);
  assert.deepEqual(positions(SHOOTER_DIFFICULT_MAIN_SCENARIO), [
    "E2:s6f0:2", "F#2:s6f2:2", "G#2:s6f4:2", "A2:s6f5:2", "B2:s6f7:2",
    "C#3:s5f4:2", "D#3:s5f6:2", "E3:s5f7:2", "F#3:s5f9:2", "G#3:s5f11:2",
    "A3:s4f7:1", "B3:s4f9:1", "C#4:s3f6:1", "D#4:s3f8:1", "E4:s3f9:1", "F#4:s3f11:1",
    "G#4:s2f9:1", "A4:s2f10:1", "B4:s1f7:1", "C#5:s1f9:1", "D#5:s1f11:1", "E5:s1f12:2",
    "D#5:s1f11:1", "C#5:s1f9:1", "B4:s1f7:1", "A4:s2f10:1", "G#4:s2f9:1",
    "F#4:s3f11:1", "E4:s3f9:1", "D#4:s3f8:1", "C#4:s3f6:1",
    "B3:s4f9:1", "A3:s4f7:1", "G#3:s5f11:1", "F#3:s5f9:1", "E3:s5f7:1", "D#3:s5f6:1", "C#3:s5f4:1",
    "B2:s6f7:1", "A2:s6f5:1", "G#2:s6f4:1", "F#2:s6f2:1", "E2:s6f0:2",
  ]);
  assert.deepEqual(
    SHOOTER_DIFFICULT_MAIN_SCENARIO.filter((step) => step.isSectionStart).map((step) => step.order),
    [1, 6, 11, 17, 23, 32],
  );
  assert.equal(SHOOTER_DIFFICULT_MAIN_SCENARIO[21].isClimax, true);
  assert.equal(SHOOTER_DIFFICULT_MAIN_SCENARIO.at(-1).isRoundEnding, true);
  assert.equal(getShooterDifficultScenarioStep(43), SHOOTER_DIFFICULT_MAIN_SCENARIO[0]);
  assert.equal(getShooterDifficultScenarioRound(43), 1);
});

test("every authored target matches standard EADGBE tuning and D# never falls below octave 3", () => {
  for (const step of SHOOTER_DIFFICULT_MAIN_SCENARIO) {
    assert.equal(pitchToMidi(step.pitch), OPEN_STRING_MIDI[step.stringNumber] + step.fretNumber);
  }
  const sharpDTargets = SHOOTER_DIFFICULT_MAIN_SCENARIO.filter((step) => step.pitch.startsWith("D#"));
  assert.ok(sharpDTargets.length > 0);
  assert.deepEqual([...new Set(sharpDTargets.map((step) => step.pitch))], ["D#3", "D#4", "D#5"]);
  assert.ok(!SHOOTER_DIFFICULT_MAIN_SCENARIO.some((step) => step.pitch === "D#2"));
  assert.equal(SHOOTER_DIFFICULT_MAIN_SCENARIO[0].pitch, "E2");
  assert.equal(SHOOTER_DIFFICULT_MAIN_SCENARIO[21].pitch, "E5");
});

test("mini patterns A through D keep their exact frets and technique prompts", () => {
  assert.equal(SHOOTER_DIFFICULT_PATTERN_OPTIONS.length, 5);
  assert.deepEqual(positions(SHOOTER_DIFFICULT_MINI_PATTERNS[SHOOTER_DIFFICULT_PATTERN_IDS.HAMMER_ON_LOW_E]), [
    "E2:s6f0:1", "F#2:s6f2:1", "G#2:s6f4:1", "A2:s6f5:1", "B2:s6f7:1",
  ]);
  assert.deepEqual(positions(SHOOTER_DIFFICULT_MINI_PATTERNS[SHOOTER_DIFFICULT_PATTERN_IDS.HAMMER_ON_A]), [
    "C#3:s5f4:1", "D#3:s5f6:1", "E3:s5f7:1", "F#3:s5f9:1", "G#3:s5f11:1",
  ]);
  assert.deepEqual(positions(SHOOTER_DIFFICULT_MINI_PATTERNS[SHOOTER_DIFFICULT_PATTERN_IDS.PULL_OFF_HIGH_E]), [
    "E5:s1f12:1", "D#5:s1f11:1", "C#5:s1f9:1", "B4:s1f7:1",
  ]);
  assert.deepEqual(positions(SHOOTER_DIFFICULT_MINI_PATTERNS[SHOOTER_DIFFICULT_PATTERN_IDS.PULL_OFF_G]), [
    "F#4:s3f11:1", "E4:s3f9:1", "D#4:s3f8:1", "C#4:s3f6:1",
  ]);

  const miniA = getShooterDifficultScenario(SHOOTER_DIFFICULT_PATTERN_IDS.HAMMER_ON_LOW_E);
  const miniC = getShooterDifficultScenario(SHOOTER_DIFFICULT_PATTERN_IDS.PULL_OFF_HIGH_E);
  assert.equal(getShooterDifficultTechniqueLabel(miniA[0], 80), "피킹");
  assert.equal(getShooterDifficultTechniqueLabel(miniA[1], 80), "해머온");
  assert.equal(getShooterDifficultTechniqueLabel(miniC[1], 80), "짧은 슬라이드");
  assert.equal(getShooterDifficultTechniqueLabel(miniC[2], 80), "풀오프 선택");
});

test("difficult tempo rises only two BPM at a time and never compresses target spacing", () => {
  assert.deepEqual(SHOOTER_DIFFICULT_RECOMMENDED_BPMS, [56, 58, 60, 62, 64]);
  for (const bpm of SHOOTER_DIFFICULT_RECOMMENDED_BPMS) {
    assert.ok(SHOOTER_DIFFICULT_MAIN_SCENARIO.every((step) => getShooterDifficultStepBeats(step, bpm) === 2));
  }
  const miniA = getShooterDifficultScenario(SHOOTER_DIFFICULT_PATTERN_IDS.HAMMER_ON_LOW_E);
  assert.equal(getShooterDifficultStepBeats(miniA[1], 56), 2);
  assert.equal(getShooterDifficultStepBeats(miniA[1], 64), 2);
  assert.ok(Math.abs(getShooterDifficultStepDurationMs(SHOOTER_DIFFICULT_MAIN_SCENARIO[0], 56) - (120_000 / 56)) < 0.001);

  const firstStableRound = getShooterDifficultRoundProgress({ bpm: 56, hits: 39, misses: 4, lives: 2 });
  assert.equal(firstStableRound.accuracy, 91);
  assert.equal(firstStableRound.bpm, 58);
  assert.equal(firstStableRound.bpmRaised, true);
  assert.equal(getShooterDifficultRoundProgress({ bpm: 56, hits: 7, misses: 0, lives: 3 }).bpm, 56);
});

test("main technique guidance is advisory and round feedback names weak regions", () => {
  assert.equal(getShooterDifficultTechniqueLabel(SHOOTER_DIFFICULT_MAIN_SCENARIO[6], 56), "피킹");
  assert.equal(getShooterDifficultTechniqueLabel(SHOOTER_DIFFICULT_MAIN_SCENARIO[6], 64), "해머온 선택");
  assert.equal(getShooterDifficultTechniqueLabel(SHOOTER_DIFFICULT_MAIN_SCENARIO[22], 64), "짧은 슬라이드");
  assert.equal(getShooterDifficultTechniqueLabel(SHOOTER_DIFFICULT_MAIN_SCENARIO[23], 64), "풀오프/슬라이드 선택");
  assert.ok(getShooterDifficultTargetX({ fretNumber: 0, stringNumber: 6 }) < getShooterDifficultTargetX({ fretNumber: 12, stringNumber: 1 }));
  assert.match(getShooterDifficultReviewMessage([{ pitch: "D#3", stringNumber: 5, direction: "ascending" }]), /D# 위치/);
  assert.match(getShooterDifficultReviewMessage([{ pitch: "C#5", stringNumber: 1, direction: "ascending" }]), /1번줄 고음/);
  assert.match(getShooterDifficultReviewMessage([{ pitch: "C#5", stringNumber: 1, fretNumber: 9, direction: "descending" }]), /하행 11→7프렛/);
  assert.match(getShooterDifficultReviewMessage([]), /E2~E5/);
});

test("App routes difficult targets through the main authored scenario without the A/B/C/D selector", () => {
  const spawnStart = appSource.indexOf("const spawnShooterTarget = useCallback");
  const spawnEnd = appSource.indexOf("const judgeReferenceNote", spawnStart);
  const spawnSource = appSource.slice(spawnStart, spawnEnd);
  const missStart = appSource.indexOf("const missedTargets = shooterTargetsRef.current.filter");
  const missEnd = appSource.indexOf("const expiredProjectiles", missStart);
  const missSource = appSource.slice(missStart, missEnd);

  assert.match(spawnSource, /getShooterDifficultScenarioStep\(patternRef\.current, difficultPatternId\)/);
  assert.match(spawnSource, /getShooterDifficultStepDurationMs\(resolvedScenarioStep, bpmRef\.current, scenarioRound\)/);
  assert.match(spawnSource, /getShooterDifficultTechniqueLabel\(scenarioStep, bpmRef\.current\)/);
  assert.match(spawnSource, /isDifficultScenario[\s\S]*\? "shooter-difficult-scenario"/);
  assert.match(missSource, /const lifeLossCount = missedTargets\.length/);
  assert.match(spawnSource, /const difficultPatternId = SHOOTER_DIFFICULT_PATTERN_IDS\.MAIN/);
  assert.doesNotMatch(appSource, /SHOOTER_DIFFICULT_PATTERN_OPTIONS/);
  assert.doesNotMatch(appSource, /desktopShooterDifficultPatternPanel/);
  assert.doesNotMatch(appSource, /mobileShooterDifficultPatternRow/);
});
