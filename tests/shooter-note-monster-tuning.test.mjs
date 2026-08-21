import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SHOOTER_NOTE_MONSTER_TUNING,
  SHOOTER_NOTE_MONSTER_TUNING_DEFAULTS,
  getShooterNoteMonsterLabelPosition,
  getShooterNoteMonsterRenderedScales,
  getShooterNoteMonsterTuning,
  normalizeShooterNoteMonsterTuning,
  normalizeShooterNoteMonsterTuningStore,
  mergeShooterNoteMonsterTuningStores,
} from "../src/shooter/noteMonsterTuning.js";
import { validateNoteMonsterTunings } from "../vite.config.js";

test("monster visuals are fifteen percent larger by default without changing collision data", () => {
  assert.deepEqual(DEFAULT_SHOOTER_NOTE_MONSTER_TUNING, {
    jointScale: 1,
    labelColor: "",
    labelOffsetX: 0,
    labelOffsetY: 0,
    labelOutline: "",
    labelScale: 1,
    scale: 1.15,
  });
  assert.equal(getShooterNoteMonsterTuning({}, "cute-object", "F#4").scale, 1.15);
});

test("deployed defaults include the desktop editor calibration for every monster root", () => {
  assert.deepEqual(Object.keys(SHOOTER_NOTE_MONSTER_TUNING_DEFAULTS["cute-object"]), [
    "C", "D", "E", "F", "G", "A", "B",
  ]);
  assert.deepEqual(Object.keys(SHOOTER_NOTE_MONSTER_TUNING_DEFAULTS.elemental), [
    "C", "D", "E", "F", "G", "A", "B",
  ]);
  assert.equal(getShooterNoteMonsterTuning(undefined, "cute-object", "C3").labelOffsetX, 10);
  assert.equal(getShooterNoteMonsterTuning(undefined, "cute-object", "B2").labelOffsetX, 8);
  assert.equal(getShooterNoteMonsterTuning(undefined, "elemental", "C4").labelOffsetX, 3);
});

test("monster size and label offsets stay isolated by skin and root note", () => {
  const store = normalizeShooterNoteMonsterTuningStore({
    "cute-object": {
      A: { labelColor: "#F0CA11", labelOffsetX: -3, labelOffsetY: -6, labelOutline: "#101820", labelScale: 1.18, scale: 1.24 },
    },
    elemental: {
      A: { labelOffsetX: 2, labelOffsetY: 1, scale: 0.96 },
    },
  });

  assert.deepEqual(getShooterNoteMonsterTuning(store, "cute-object", "A#4"), {
    jointScale: 1,
    labelColor: "#f0ca11",
    labelOffsetX: -3,
    labelOffsetY: -6,
    labelOutline: "#101820",
    labelScale: 1.18,
    scale: 1.24,
  });
  assert.deepEqual(getShooterNoteMonsterTuning(store, "elemental", "A4"), {
    jointScale: 1,
    labelColor: "",
    labelOffsetX: 2,
    labelOffsetY: 1,
    labelOutline: "",
    labelScale: 1,
    scale: 0.96,
  });
  assert.equal(getShooterNoteMonsterTuning(store, "cute-object", "B3").scale, 1.15);
});

test("monster editor values are bounded to safe visual ranges", () => {
  assert.deepEqual(normalizeShooterNoteMonsterTuning({
    jointScale: -3,
    labelColor: "not-a-color",
    labelOffsetX: -900,
    labelOffsetY: 900,
    labelOutline: "#ABCDEF",
    labelScale: 8,
    scale: 9,
  }), {
    jointScale: 0.5,
    labelColor: "",
    labelOffsetX: -80,
    labelOffsetY: 80,
    labelOutline: "#abcdef",
    labelScale: 2,
    scale: 2.5,
  });
  assert.deepEqual(normalizeShooterNoteMonsterTuningStore({
    "cute-object": { A: null, H: { scale: 2 } },
    elemental: [],
  }), {});
});

test("text, monster, and joint scales compose as three independent controls", () => {
  assert.deepEqual(
    getShooterNoteMonsterRenderedScales({ jointScale: 0.8, labelScale: 0.9, scale: 1.25 }),
    { labelScale: 0.7200000000000001, monsterScale: 1 },
  );
  assert.deepEqual(
    getShooterNoteMonsterRenderedScales({ jointScale: 1, labelScale: 0.9, scale: 1.25 }),
    { labelScale: 0.9, monsterScale: 1.25 },
  );
});

test("label offsets use the monster coordinate system instead of viewport pixels", () => {
  assert.deepEqual(
    getShooterNoteMonsterLabelPosition(
      { x: 50, y: 40 },
      { labelOffsetX: 9.936, labelOffsetY: -4.968 },
    ),
    { x: 60, y: 35 },
  );
});

test("device-local tuning overrides shared deployed defaults per skin and note", () => {
  assert.deepEqual(
    mergeShooterNoteMonsterTuningStores(
      { "cute-object": { A: { labelOffsetY: -4 }, B: { scale: 1.2 } } },
      { "cute-object": { A: { labelOffsetY: -7 } }, elemental: { F: { labelScale: 1.1 } } },
    ),
    {
      "cute-object": {
        A: { ...DEFAULT_SHOOTER_NOTE_MONSTER_TUNING, labelOffsetY: -7 },
        B: { ...DEFAULT_SHOOTER_NOTE_MONSTER_TUNING, scale: 1.2 },
      },
      elemental: {
        F: { ...DEFAULT_SHOOTER_NOTE_MONSTER_TUNING, labelScale: 1.1 },
      },
    },
  );
});

test("shared deployment tuning save accepts only known skins, roots, and safe values", () => {
  assert.deepEqual(validateNoteMonsterTunings({
    "cute-object": {
      A: { labelColor: "#F0CA11", labelOffsetX: -3, labelOffsetY: -7, scale: 1.2 },
    },
  }), {
    "cute-object": {
      A: {
        ...DEFAULT_SHOOTER_NOTE_MONSTER_TUNING,
        labelColor: "#f0ca11",
        labelOffsetX: -3,
        labelOffsetY: -7,
        scale: 1.2,
      },
    },
  });
  assert.throws(() => validateNoteMonsterTunings({ unknown: { A: { scale: 1 } } }));
  assert.throws(() => validateNoteMonsterTunings({ elemental: { H: { scale: 1 } } }));
});
