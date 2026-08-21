import assert from "node:assert/strict";
import test from "node:test";

import {
  SHOOTER_PLAY_HELP_LEVELS,
  getShooterPlayHelpLevelLabel,
  getShooterPlayHelpMessage,
} from "../src/shooter/playHelp.js";

test("shooter play help exposes OFF, fret, and fret with string levels", () => {
  assert.deepEqual(SHOOTER_PLAY_HELP_LEVELS, [0, 1, 2]);
  assert.equal(getShooterPlayHelpLevelLabel(0), "OFF");
  assert.equal(getShooterPlayHelpLevelLabel(1), "1");
  assert.equal(getShooterPlayHelpLevelLabel(2), "2");
});

test("shooter play help keeps the target's fret and string wording compact", () => {
  const positions = [{ fretNumber: 1, stringNumber: 2 }];
  assert.equal(getShooterPlayHelpMessage(0, positions, true), "");
  assert.equal(getShooterPlayHelpMessage(1, positions, true), "1프렛에 위치했습니다");
  assert.equal(getShooterPlayHelpMessage(2, positions, true), "1프렛 · 2번줄에 위치했습니다");
  assert.equal(getShooterPlayHelpMessage(2, [{ fretNumber: 0, stringNumber: 6 }], true), "개방현 · 6번줄에 위치했습니다");
  assert.equal(getShooterPlayHelpMessage(1, [], false), "목표 음을 기다리는 중");
});
