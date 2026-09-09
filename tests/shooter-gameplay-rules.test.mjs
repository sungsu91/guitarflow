import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SHOOTER_COUNT_IN_MS,
  SHOOTER_RUNTIME_DIFFICULTY,
  STANDARD_GUITAR_OPEN_MIDI,
  createShooterTargetNote,
  getShooterCountInLabel,
  getShooterFrameElapsedMs,
  getShooterTempoProgress,
  midiToShooterLabel,
} from "../src/shooter/gameplayRules.js";
import { SHOOTER_EASY_SCENARIO } from "../src/shooter/easyDifficultyScenario.js";
import { SHOOTER_NORMAL_SCENARIO } from "../src/shooter/normalDifficultyScenario.js";
import { SHOOTER_DIFFICULT_MAIN_SCENARIO } from "../src/shooter/difficultDifficultyScenario.js";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../src/style.css", import.meta.url), "utf8");
const pitchMonitorStyleSource = await readFile(new URL("../src/shooter/pitch-monitor.css", import.meta.url), "utf8");

test("urgent shooter pacing starts slow and keeps travel independent from spawn beats", () => {
  assert.equal(SHOOTER_COUNT_IN_MS, 3_000);
  assert.deepEqual(SHOOTER_RUNTIME_DIFFICULTY.easy, {
    bpms: [42, 44, 46, 48, 50], maxTargets: 2, travelMs: 5_800, fretRange: [0, 3],
  });
  assert.deepEqual(SHOOTER_RUNTIME_DIFFICULTY.normal, {
    bpms: [48, 50, 52, 54, 56], maxTargets: 3, travelMs: 5_300, fretRange: [5, 10],
  });
  assert.deepEqual(SHOOTER_RUNTIME_DIFFICULTY.difficult, {
    bpms: [54, 56, 58, 60, 62], maxTargets: 3, travelMs: 4_800, fretRange: [0, 12],
  });
  assert.match(appSource, /const targetDuration = getShooterTargetDuration\(difficulty\)/);
  assert.match(appSource, /\[SHOOTER_DIFFICULTIES\.EASY\]:[\s\S]*?speedScale: 0\.8/);
  assert.match(appSource, /\[SHOOTER_DIFFICULTIES\.EASY_RANDOM\]: \{[^}]*spawnGapMinMs: 3200,[^}]*spawnGapMaxMs: 4200,[^}]*speedScale: 0\.8,[^}]*\}/);
  assert.doesNotMatch(appSource, /\[SHOOTER_DIFFICULTIES\.NORMAL_RANDOM\]: \{[^}]*speedScale:/);
  assert.match(appSource, /const SHOOTER_NOTE_RECOVERY_MS = 1000;/);
  assert.match(appSource, /const SHOOTER_MAX_SIMULTANEOUS_TARGETS = 1;/);
  assert.match(appSource, /const maxTargets = Math\.min\(pacing\.maxTargets, SHOOTER_MAX_SIMULTANEOUS_TARGETS\);/);
  assert.match(appSource, /shooterNextSpawnAtRef\.current = Math\.max\([\s\S]*?gameTimeRef\.current \+ SHOOTER_NOTE_RECOVERY_MS/);
  assert.doesNotMatch(appSource, /SHOOTER_EMPTY_REFILL_MS/);
  assert.match(appSource, /0\.9 \* 0\.85 \* \(pacing\.speedScale \?\? 1\)/);
  assert.match(appSource, /scenarioStepWindowMs \?\? getShooterSpawnGap\(difficulty\)/);
  assert.doesNotMatch(appSource, /scenarioStepWindowMs \/ \(\(SHOOTER_LIFE_LINE_PERCENT - 8\) \/ 80\)/);
});

test("count-in exposes 3, 2, 1, START before gameplay", () => {
  assert.equal(getShooterCountInLabel(0), "3");
  assert.equal(getShooterCountInLabel(1_000), "2");
  assert.equal(getShooterCountInLabel(2_000), "1");
  assert.equal(getShooterCountInLabel(2_900), "START");
  assert.equal(getShooterCountInLabel(3_000), null);
  assert.match(appSource, /shooterCountInActiveRef\.current = true/);
  assert.match(appSource, /className="shooterCountInOverlay"/);
  assert.match(styleSource, /\.shooterCountInOverlay strong[\s\S]*linear-gradient\(135deg, #fff95c[\s\S]*#54f6ff[\s\S]*#ff78dc/);
  assert.match(styleSource, /-webkit-text-stroke: 1\.5px/);
});

test("pitch monitor text keeps readable colors over every shooter map", () => {
  assert.match(pitchMonitorStyleSource, /\.shooterPitchMonitorMobile > span \{[\s\S]*?color: #fff;[\s\S]*?-webkit-text-fill-color: currentColor !important;/);
  assert.match(pitchMonitorStyleSource, /\.shooterPitchMonitorMobile b \{[\s\S]*?color: #bfffe3;[\s\S]*?-webkit-text-fill-color: currentColor !important;/);
  assert.match(pitchMonitorStyleSource, /\.shooterPitchMonitorMobile small \{[\s\S]*?color: #eef6ff;[\s\S]*?-webkit-text-fill-color: currentColor !important;/);
});

test("every scripted target carries exact MIDI, octave label, string, and fret", () => {
  assert.deepEqual(STANDARD_GUITAR_OPEN_MIDI, { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 });
  for (const scenario of [SHOOTER_EASY_SCENARIO, SHOOTER_NORMAL_SCENARIO, SHOOTER_DIFFICULT_MAIN_SCENARIO]) {
    for (const step of scenario) {
      assert.equal(step.midi, STANDARD_GUITAR_OPEN_MIDI[step.stringNumber] + step.fretNumber);
      assert.equal(step.label, step.pitch);
      assert.equal(step.string, step.stringNumber);
      assert.equal(step.fret, step.fretNumber);
      assert.match(step.label, /^[A-G](?:#|b)?\d$/);
    }
  }
  assert.deepEqual(createShooterTargetNote({ label: "F#2", stringNumber: 6, fretNumber: 2 }), {
    midi: 42, noteName: "F#", accidental: "#", octave: 2, label: "F#2", string: 6, fret: 2,
  });
  assert.equal(midiToShooterLabel(61, "sharp"), "C#4");
  assert.equal(midiToShooterLabel(61, "flat"), "Db4");
});

test("tempo rises only after eight processed targets, 85 percent accuracy, and two lives", () => {
  const stages = SHOOTER_RUNTIME_DIFFICULTY.normal.bpms;
  assert.equal(getShooterTempoProgress({ bpms: stages, bpm: 50, hits: 7, misses: 0, lives: 3 }).bpm, 50);
  assert.equal(getShooterTempoProgress({ bpms: stages, bpm: 50, hits: 6, misses: 2, lives: 3 }).bpm, 50);
  assert.equal(getShooterTempoProgress({ bpms: stages, bpm: 50, hits: 8, misses: 0, lives: 1 }).bpm, 50);
  assert.equal(getShooterTempoProgress({ bpms: stages, bpm: 50, hits: 8, misses: 0, lives: 2 }).bpm, 52);
});

test("frame elapsed time is timestamp based and never capped to display refresh rate", () => {
  assert.ok(Math.abs(getShooterFrameElapsedMs(1_016.67, 1_000) - 16.67) < 1e-9);
  assert.ok(Math.abs(getShooterFrameElapsedMs(1_008.33, 1_000) - 8.33) < 1e-9);
  assert.equal(getShooterFrameElapsedMs(1_250, 1_000), 250);
  assert.match(appSource, /runShooterFrame\(shooterElapsedMs\)/);
  assert.doesNotMatch(appSource, /runShooterFrame\(deltaMs\)/);
});

test("life, active target, wrong-note, and cleanup rules are explicit in the runtime", () => {
  assert.match(appSource, /const lifeLossCount = missedTargets\.length/);
  assert.match(appSource, /&& !target\.lifeLost/);
  assert.match(appSource, /target\.lifeLost = true/);
  assert.match(appSource, /comboRef\.current = 0;\s*setCombo\(0\);\s*setFeedback\("Miss"\)/);
  assert.match(appSource, /candidate\.id === shooterActiveTargetIdRef\.current/);
  assert.match(appSource, /if \(targetId !== shooterActiveTargetIdRef\.current\) return false/);
  assert.match(appSource, /className="shooterActiveTargetArrow"/);
  assert.match(appSource, /setShooterLives\(SHOOTER_MAX_LIVES\)/);
  assert.match(appSource, /projectileNodesRef\.current\.clear\(\)/);
  assert.match(appSource, /silenceShooterSoundGroups\(shooterActiveSoundGroupsRef\.current\)/);
});
