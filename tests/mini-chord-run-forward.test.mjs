import assert from "node:assert/strict";
import test from "node:test";

import {
  getMiniChordRecommendedProgressions,
  MINI_CHORD_RECOMMENDED_PROGRESSION_IDS,
} from "../src/mini-chord/originalPracticeSongs.js";

const recommendations = getMiniChordRecommendedProgressions();
const runForward = recommendations.find((item) => item.id === "fretiva-recommended-run-forward");
const bars = Array.from({ length: runForward.barCount }, (_, barIndex) => (
  runForward.slots.slice(barIndex * 4, barIndex * 4 + 4).filter(Boolean).join(">")
));
const activeIndexes = (steps) => steps
  .map((active, index) => active ? index : -1)
  .filter((index) => index >= 0);

test("run forward is the visible fifth built-in recommended progression", () => {
  assert.equal(recommendations.length, 5);
  assert.equal(recommendations[4].title, "달려가자");
  assert.ok(MINI_CHORD_RECOMMENDED_PROGRESSION_IDS.includes(runForward.id));
  assert.equal(runForward.libraryType, "recommended-progression");
  assert.equal(runForward.builtIn, true);
  assert.equal(runForward.key, "G Major");
  assert.equal(runForward.difficulty, "초급 ~ 초중급");
  assert.equal(runForward.bpm, 132);
  assert.equal(runForward.barCount, 64);
  assert.equal(runForward.slots.length, 256);
});

test("run forward preserves the requested 64-bar progression", () => {
  assert.deepEqual(bars, [
    "G", "D", "Em", "C", "G", "D", "Em>C", "D",
    "G", "D", "Em", "C", "G", "D", "C>D", "G",
    "G", "D", "Em>C", "G", "Am", "C>D", "G>D", "Em>C",
    "Em", "C", "G", "D", "Em>C", "G>D", "Am>Bm", "C>D",
    "G", "D", "Em", "C", "G", "D", "Em>C", "G",
    "G", "D", "Em>C", "G", "Am", "C>D", "G>D", "Em>C",
    "Em", "C", "G", "D", "Am>C", "G>D", "Em", "C>D",
    "G", "D", "Em", "C", "G>D", "Em>C", "Am>D", "Gadd9",
  ]);
});

test("run forward exposes ten aligned section accompaniment presets", () => {
  assert.deepEqual(
    runForward.arrangementOverrides.map(({ startBar, endBar, sectionName }) => [
      startBar + 1,
      endBar + 1,
      sectionName,
    ]),
    [
      [1, 4, "Intro"],
      [5, 8, "Intro Build"],
      [9, 16, "Verse 1"],
      [17, 24, "Verse 2"],
      [25, 32, "Pre-Chorus"],
      [33, 40, "Chorus"],
      [41, 48, "Chorus 확장"],
      [49, 56, "Bridge"],
      [57, 63, "Final Chorus"],
      [64, 64, "Ending"],
    ],
  );
  assert.equal(runForward.arrangementPatterns.length, 10);

  const patternIds = new Set(runForward.arrangementPatterns.map((pattern) => pattern.id));
  runForward.arrangementOverrides.forEach((section) => assert.ok(patternIds.has(section.patternId)));
  runForward.arrangementPatterns.forEach((pattern) => {
    const { drum, bass, piano } = pattern.rhythmOverrides;
    assert.equal(drum.barSteps.length, bass.barSteps.length);
    assert.equal(bass.barSteps.length, piano.barSteps.length);
    drum.barSteps.forEach((bar) => assert.ok(Object.values(bar).every((steps) => steps.length === 16)));
    bass.barSteps.forEach((bar) => assert.equal(bar.length, 16));
    piano.barSteps.forEach((bar) => assert.equal(bar.length, 16));
  });
});

test("run forward keeps fills, transition gaps, and the Gadd9 ending hit", () => {
  const patterns = new Map(runForward.arrangementPatterns.map((pattern) => [pattern.id, pattern.rhythmOverrides]));
  const verseLift = patterns.get("run-forward-verse-lift");
  const pre = patterns.get("run-forward-pre-chorus-build");
  const chorusLift = patterns.get("run-forward-chorus-lift");
  const bridge = patterns.get("run-forward-bridge-space");
  const ending = patterns.get("run-forward-ending-bright");

  [verseLift, pre, chorusLift, bridge].forEach((pattern) => {
    assert.deepEqual(activeIndexes(pattern.drum.barSteps.at(-1).snare).slice(-3), [12, 13, 14]);
    assert.equal(pattern.drum.barSteps.at(-1).openHat[15], true);
  });
  assert.equal(pre.piano.barSteps.at(-1).slice(12).some((step) => step.active), false);
  assert.equal(chorusLift.piano.barSteps.at(-1).slice(12).some((step) => step.active), false);

  const endingDrum = ending.drum.barSteps[0];
  assert.deepEqual(activeIndexes(endingDrum.kick), [0]);
  assert.deepEqual(activeIndexes(endingDrum.snare), [0]);
  assert.deepEqual(activeIndexes(endingDrum.clap), [0]);
  assert.deepEqual(activeIndexes(endingDrum.tambourine), [0]);
  assert.deepEqual(activeIndexes(endingDrum.openHat), [8]);
  assert.equal(ending.bass.barSteps[0].includes("approach"), false);
  assert.equal(ending.bass.barSteps[0][0], "root");
  assert.equal(ending.bass.barSteps[0][8], "octave");
  assert.deepEqual(ending.piano.barSteps[0][0], { active: true, style: "hold", durationSteps: 16 });
  assert.deepEqual(ending.piano.barSteps[0][8], { active: true, style: "chord", durationSteps: 8 });
});
