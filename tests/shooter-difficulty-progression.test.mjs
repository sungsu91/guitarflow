import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SHOOTER_NORMAL_RECOMMENDED_BPMS,
  SHOOTER_NORMAL_SCENARIO,
  SHOOTER_NORMAL_SECTIONS,
  getShooterNormalReviewMessage,
  getShooterNormalRoundProgress,
  getShooterNormalScenarioStep,
  getShooterNormalStepBeats,
  getShooterNormalStepDurationMs,
  getShooterNormalTargetX,
} from "../src/shooter/normalDifficultyScenario.js";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

const positions = (steps) => steps.map((step) => (
  `${step.pitch}:s${step.stringNumber}f${step.fretNumber}:${step.beats}`
));

test("normal shooter follows the authored 35-note ascent and descent exactly", () => {
  assert.equal(SHOOTER_NORMAL_SCENARIO.length, 35);
  assert.deepEqual(positions(SHOOTER_NORMAL_SCENARIO), [
    "A2:s6f5:2", "B2:s6f7:2", "C3:s6f8:2", "D3:s5f5:2", "E3:s5f7:2", "F3:s5f8:2", "G3:s4f5:2", "A3:s4f7:2",
    "B3:s4f9:1", "C4:s3f5:1", "D4:s3f7:1", "E4:s3f9:1", "F4:s3f10:1", "G4:s2f8:1", "A4:s2f10:1",
    "B4:s1f7:1", "C5:s1f8:1", "D5:s1f10:2",
    "C5:s1f8:1", "B4:s1f7:1", "A4:s2f10:1", "G4:s2f8:1", "F4:s3f10:1", "E4:s3f9:1", "D4:s3f7:1", "C4:s3f5:1",
    "B3:s4f9:1", "A3:s4f7:1", "G3:s4f5:1", "F3:s5f8:1", "E3:s5f7:1", "D3:s5f5:1", "C3:s6f8:1", "B2:s6f7:1", "A2:s6f5:2",
  ]);
  assert.deepEqual(SHOOTER_NORMAL_SCENARIO.filter((step) => step.isSectionStart).map((step) => step.order), [1, 9, 16, 19, 27]);
  assert.equal(SHOOTER_NORMAL_SCENARIO.filter((step) => step.isClimax)[0].pitch, "D5");
  assert.equal(SHOOTER_NORMAL_SCENARIO.at(-1).isRoundEnding, true);
  assert.equal(getShooterNormalScenarioStep(35), SHOOTER_NORMAL_SCENARIO[0]);
});

test("normal shooter contains only natural notes at frets 5 through 10", () => {
  assert.ok(SHOOTER_NORMAL_SCENARIO.every((step) => /^[A-G]\d$/.test(step.pitch)));
  assert.ok(SHOOTER_NORMAL_SCENARIO.every((step) => step.fretNumber >= 5 && step.fretNumber <= 10));
  assert.ok(SHOOTER_NORMAL_SCENARIO.every((step) => step.fretNumber !== 0 && step.fretNumber > 3));
  assert.deepEqual(SHOOTER_NORMAL_SECTIONS.map((section) => section.direction), [
    "ascending",
    "ascending",
    "ascending",
    "descending",
    "descending",
  ]);
  assert.ok(getShooterNormalTargetX({ fretNumber: 5 }) < getShooterNormalTargetX({ fretNumber: 10 }));
});

test("normal shooter tempo starts at 64 and unlocks 72, 80, and 88 after stable rounds", () => {
  assert.deepEqual(SHOOTER_NORMAL_RECOMMENDED_BPMS, [64, 72, 80, 88]);
  assert.equal(getShooterNormalStepDurationMs(SHOOTER_NORMAL_SCENARIO[0], 64), 1875);
  assert.equal(getShooterNormalStepBeats(SHOOTER_NORMAL_SCENARIO[0], 72), 1);
  assert.equal(getShooterNormalStepBeats(SHOOTER_NORMAL_SCENARIO[8], 88), 0.5);
  assert.equal(getShooterNormalStepBeats(SHOOTER_NORMAL_SCENARIO[18], 88), 0.5);
  assert.equal(getShooterNormalStepBeats(SHOOTER_NORMAL_SCENARIO[15], 88), 1);

  const firstStableRound = getShooterNormalRoundProgress({ bpm: 64, hits: 31, misses: 4 });
  assert.equal(firstStableRound.accuracy, 89);
  assert.equal(firstStableRound.bpm, 64);
  assert.equal(firstStableRound.stableRounds, 1);

  const secondStableRound = getShooterNormalRoundProgress({
    bpm: firstStableRound.bpm,
    hits: 31,
    misses: 4,
    stableRounds: firstStableRound.stableRounds,
  });
  assert.equal(secondStableRound.bpm, 72);
  assert.equal(secondStableRound.bpmRaised, true);
  assert.equal(secondStableRound.stableRounds, 0);
});

test("round feedback points the player to the missed fret region", () => {
  assert.equal(getShooterNormalReviewMessage([]), "상행과 하행을 정확하게 완주했습니다.");
  assert.match(getShooterNormalReviewMessage([{ fretNumber: 10, sectionId: 3 }]), /9~10프렛/);
  assert.match(getShooterNormalReviewMessage([{ fretNumber: 7, sectionId: 5 }]), /하행과 5프렛 복귀/);
  assert.match(getShooterNormalReviewMessage([{ fretNumber: 7, sectionId: 1 }]), /5~8프렛 상행/);
});

test("App routes normal difficulty through the scenario instead of the random note picker", () => {
  const spawnStart = appSource.indexOf("const spawnShooterTarget = useCallback");
  const spawnEnd = appSource.indexOf("const judgeReferenceNote", spawnStart);
  const spawnSource = appSource.slice(spawnStart, spawnEnd);
  const missStart = appSource.indexOf("const missedTargets = shooterTargetsRef.current.filter");
  const missEnd = appSource.indexOf("const expiredProjectiles", missStart);
  const missSource = appSource.slice(missStart, missEnd);

  assert.match(spawnSource, /getShooterNormalScenarioStep\(patternRef\.current\)/);
  assert.match(spawnSource, /scenarioStep[\s\S]*makeGuitarNote/);
  assert.match(spawnSource, /getShooterNormalStepDurationMs\(resolvedScenarioStep, bpmRef\.current\)/);
  assert.match(spawnSource, /getShooterNormalTargetX\(resolvedScenarioStep\)/);
  assert.match(spawnSource, /resolvedScenarioStep\?\.isSectionStart[\s\S]*resolvedScenarioStep\.sectionAnnouncement/);
  assert.match(missSource, /!isShooterScriptedDifficulty\(target\.difficulty\)/);
  assert.match(missSource, /shooterScenarioRoundStatsRef\.current\.missedSteps\.push/);
});
