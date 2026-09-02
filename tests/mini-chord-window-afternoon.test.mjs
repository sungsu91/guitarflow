import assert from "node:assert/strict";
import test from "node:test";

import {
  getMiniChordRecommendedProgressions,
  MINI_CHORD_RECOMMENDED_PROGRESSION_IDS,
} from "../src/mini-chord/originalPracticeSongs.js";

const windowAfternoon = getMiniChordRecommendedProgressions()
  .find((item) => item.id === "fretiva-recommended-window-afternoon");
const bars = Array.from({ length: windowAfternoon.barCount }, (_, barIndex) => (
  windowAfternoon.slots.slice(barIndex * 4, barIndex * 4 + 4).filter(Boolean).join(">")
));

test("window afternoon is visible as a built-in recommended progression", () => {
  assert.ok(MINI_CHORD_RECOMMENDED_PROGRESSION_IDS.includes(windowAfternoon.id));
  assert.equal(windowAfternoon.title, "창가의 오후");
  assert.equal(windowAfternoon.libraryType, "recommended-progression");
  assert.equal(windowAfternoon.builtIn, true);
  assert.equal(windowAfternoon.key, "C Major");
  assert.equal(windowAfternoon.difficulty, "초급");
  assert.equal(windowAfternoon.bpm, 98);
  assert.equal(windowAfternoon.barCount, 64);
  assert.equal(windowAfternoon.slots.length, 256);
});

test("window afternoon has eight complete eight-bar sections", () => {
  assert.deepEqual(bars, [
    "C", "G", "Am", "F", "C", "G", "F>G", "G",
    "C", "G", "Am", "F", "C", "G", "F", "G",
    "Am", "G", "F", "C", "Dm>G", "C>Am", "F>G", "G",
    "Am", "Em", "F", "C", "Dm>Em", "F>G", "Am>G", "F>G",
    "C", "G", "Am", "F", "C>G", "F>G", "C>G", "Am>G",
    "F", "C", "Dm", "G", "C>G", "Am>F", "Dm>G", "C",
    "Am", "F", "C", "G", "Dm", "Am", "F>G", "G",
    "C", "G", "Am", "F", "C>G", "Am>F", "Dm>G", "Cadd9",
  ]);
  assert.deepEqual(
    windowAfternoon.arrangementOverrides
      .filter((section) => section.showSectionLabel !== false)
      .map((section) => [section.startBar + 1, section.sectionName]),
    [
      [1, "Intro"],
      [9, "Verse 1"],
      [17, "Verse 2"],
      [25, "Pre-Chorus"],
      [33, "Chorus"],
      [41, "Chorus 확장"],
      [49, "Bridge"],
      [57, "Final Chorus"],
      [64, "Ending"],
    ],
  );
});

test("window afternoon includes full accompaniment presets and a clean ending", () => {
  assert.equal(windowAfternoon.arrangementPatterns.length, 9);
  const patternIds = new Set(windowAfternoon.arrangementPatterns.map((pattern) => pattern.id));
  windowAfternoon.arrangementOverrides.forEach((section) => {
    assert.ok(patternIds.has(section.patternId));
  });
  windowAfternoon.arrangementPatterns.forEach((pattern) => {
    const { drum, bass, piano } = pattern.rhythmOverrides;
    assert.equal(drum.barSteps.length, bass.barSteps.length);
    assert.equal(bass.barSteps.length, piano.barSteps.length);
    drum.barSteps.forEach((bar) => assert.equal(bar.kick.length, 16));
    bass.barSteps.forEach((bar) => assert.equal(bar.length, 16));
    piano.barSteps.forEach((bar) => assert.equal(bar.length, 16));
  });

  const final = windowAfternoon.arrangementPatterns
    .find((pattern) => pattern.id === "window-afternoon-final-full")
    .rhythmOverrides;
  assert.deepEqual(final.bass.barSteps.at(-1), ["root", ...Array.from({ length: 15 }, () => "hold")]);
  assert.equal(final.piano.barSteps.at(-1)[0].durationSteps, 16);
  assert.ok(windowAfternoon.arrangementOverrides.slice(-2).every((section) => section.patternShared));
});
