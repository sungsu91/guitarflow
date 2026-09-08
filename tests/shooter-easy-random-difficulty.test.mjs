import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SHOOTER_EASY_RANDOM_DIFFICULTY_ID,
  SHOOTER_EASY_RANDOM_POSITIONS,
  SHOOTER_EASY_RANDOM_RANGE_LABEL,
} from "../src/shooter/easyRandomDifficulty.js";
import { STANDARD_GUITAR_OPEN_MIDI } from "../src/shooter/gameplayRules.js";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

test("easy random exposes every open through third-fret position without progression", () => {
  assert.equal(SHOOTER_EASY_RANDOM_DIFFICULTY_ID, "easy-random");
  assert.equal(SHOOTER_EASY_RANDOM_RANGE_LABEL, "개방현~3프렛 · E2~G4 랜덤");
  assert.equal(SHOOTER_EASY_RANDOM_POSITIONS.length, 24);
  for (const position of SHOOTER_EASY_RANDOM_POSITIONS) {
    assert.ok(position.stringNumber >= 1 && position.stringNumber <= 6);
    assert.ok(position.fretNumber >= 0 && position.fretNumber <= 3);
    assert.equal(position.midi, STANDARD_GUITAR_OPEN_MIDI[position.stringNumber] + position.fretNumber);
  }
  assert.deepEqual(
    [...new Set(SHOOTER_EASY_RANDOM_POSITIONS.map((position) => position.fretNumber))],
    [0, 1, 2, 3],
  );
  assert.match(appSource, /name: "랜덤"/);
  assert.match(appSource, /poolRatio: 1,[\s\S]*?randomness: 1,[\s\S]*?jumpBias: 0\.3/);
});

test("easy random announces its range only in the shared 3-2-1 count-in", () => {
  assert.match(appSource, /shooterCountInOverlay[\s\S]*?SHOOTER_EASY_RANDOM_RANGE_LABEL/);
  assert.match(appSource, /preservePositions: isEasyRandom/);
  assert.doesNotMatch(appSource, /getShooterEasyRandomScenarioStep/);
});
