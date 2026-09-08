import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { getShooterEasyRoundProgress } from "../src/shooter/easyDifficultyScenario.js";

const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

test("shooter advances from 42 to 44 without changing the practice tempo of 80", () => {
  const context = {
    useCallback: (callback) => callback,
    SHOOTER_DIFFICULTIES: { EASY: "easy" },
    getShooterEasyRoundProgress,
    getShooterEasyReviewMessage: () => "",
    shooterScenarioRoundStatsRef: { current: { hits: 8, misses: 0, missedSteps: [], stableRounds: 0, round: 0, evaluations: 0 } },
    shooterLivesRef: { current: 5 },
    shooterScenarioSummaryTimerRef: { current: null },
    shooterBpmRef: { current: 42 },
    bpmRef: { current: 80 },
    shooterBpm: 42,
    bpm: 80,
    setShooterScenarioRoundSummary: () => {},
    setFeedback: () => {},
    window: { setTimeout: () => 1, clearTimeout: () => {} },
  };
  context.setShooterBpm = (value) => { context.shooterBpm = value; };
  context.setBpm = () => assert.fail("Shooter must not write the practice/metronome BPM");
  vm.createContext(context);
  vm.runInContext(section("const completeShooterScenarioSegment =", "const spawnEnemy ="), context);
  for (let round = 0; round < 4; round += 1) {
    Object.assign(context.shooterScenarioRoundStatsRef.current, { hits: 8, misses: 0 });
    vm.runInContext('completeShooterScenarioSegment("easy")', context);
    if (context.shooterBpm === 44) break;
  }
  assert.equal(context.shooterBpm, 44);
  assert.equal(context.shooterBpmRef.current, 44);
  assert.equal(context.bpmRef.current, 80);
  assert.equal(context.bpm, 80);
});

test("shooter entry, difficulty changes and runtime never access the practice tempo", () => {
  for (const [start, end] of [
    ["const spawnShooterTarget =", "const judgeReferenceNote ="],
    ["const runShooterFrame =", "const runChordTransitionFrame ="],
    ["const startShooter =", "const startShooterMic ="],
    ["const changeShooterDifficulty =", "const startStage3Practice ="],
  ]) {
    assert.ok(source.includes(start), `Missing ${start}`);
    assert.ok(source.includes(end), `Missing ${end}`);
    const callback = section(start, end);
    assert.match(callback, /shooterBpmRef/);
    assert.doesNotMatch(callback, /\bbpmRef\b|\bsetBpm\(/);
  }
});
