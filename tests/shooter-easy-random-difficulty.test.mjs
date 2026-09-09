import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SHOOTER_EASY_RANDOM_DIFFICULTY_ID,
  SHOOTER_EASY_RANDOM_POSITIONS,
  SHOOTER_EASY_RANDOM_RANGE_LABEL,
  SHOOTER_NORMAL_RANDOM_DIFFICULTY_ID,
  SHOOTER_NORMAL_RANDOM_POSITIONS,
  SHOOTER_NORMAL_RANDOM_RANGE_LABEL,
} from "../src/shooter/easyRandomDifficulty.js";
import { STANDARD_GUITAR_OPEN_MIDI } from "../src/shooter/gameplayRules.js";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

test("easy random uses only natural notes from open strings through the third fret", () => {
  assert.equal(SHOOTER_EASY_RANDOM_DIFFICULTY_ID, "easy-random");
  assert.equal(SHOOTER_EASY_RANDOM_RANGE_LABEL, "개방현~3프렛 · # 없이 랜덤");
  assert.equal(SHOOTER_EASY_RANDOM_POSITIONS.length, 17);
  for (const position of SHOOTER_EASY_RANDOM_POSITIONS) {
    assert.ok(position.stringNumber >= 1 && position.stringNumber <= 6);
    assert.ok(position.fretNumber >= 0 && position.fretNumber <= 3);
    assert.equal(position.midi, STANDARD_GUITAR_OPEN_MIDI[position.stringNumber] + position.fretNumber);
    assert.equal(position.accidental, "");
  }
  assert.deepEqual(
    [...new Set(SHOOTER_EASY_RANDOM_POSITIONS.map((position) => position.fretNumber))].sort((a, b) => a - b),
    [0, 1, 2, 3],
  );
  assert.match(appSource, /name: "랜덤"/);
  assert.match(appSource, /poolRatio: 1,[\s\S]*?randomness: 1,[\s\S]*?jumpBias: 0\.3/);
});

test("normal random preserves the former 24-position chromatic pool", () => {
  assert.equal(SHOOTER_NORMAL_RANDOM_DIFFICULTY_ID, "normal-random");
  assert.equal(SHOOTER_NORMAL_RANDOM_RANGE_LABEL, "개방현~3프렛 · # 포함 랜덤");
  assert.equal(SHOOTER_NORMAL_RANDOM_POSITIONS.length, 24);
  assert.equal(SHOOTER_NORMAL_RANDOM_POSITIONS.some((position) => position.accidental === "#"), true);
  assert.deepEqual(
    [...new Set(SHOOTER_NORMAL_RANDOM_POSITIONS.map((position) => position.fretNumber))],
    [0, 1, 2, 3],
  );
  assert.match(appSource, /id: SHOOTER_DIFFICULTIES\.NORMAL_RANDOM, label: "보통 랜덤"/);
  assert.match(appSource, /group: "shooter-normal-random"/);
});

test("easy random announces its range only in the shared 3-2-1 count-in", () => {
  assert.match(appSource, /shooterCountInOverlay[\s\S]*?SHOOTER_EASY_RANDOM_RANGE_LABEL/);
  assert.match(appSource, /SHOOTER_NORMAL_RANDOM_RANGE_LABEL/);
  assert.match(appSource, /preservePositions: isRandomDifficulty/);
  assert.doesNotMatch(appSource, /getShooterEasyRandomScenarioStep/);
});

test("easy random is the deployment default while tutorial easy remains selectable", () => {
  assert.match(appSource, /const DEFAULT_SHOOTER_DIFFICULTY = SHOOTER_DIFFICULTIES\.EASY_RANDOM/);
  assert.match(appSource, /useState\(DEFAULT_SHOOTER_DIFFICULTY\)/);
  assert.match(appSource, /useRef\(DEFAULT_SHOOTER_DIFFICULTY\)/);
  assert.match(appSource, /id: SHOOTER_DIFFICULTIES\.EASY, label: "쉬움"/);
});
