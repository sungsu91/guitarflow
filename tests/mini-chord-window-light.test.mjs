import assert from "node:assert/strict";
import test from "node:test";

import { getChordToneNames } from "../src/chords/chordTheory.js";
import {
  getMiniChordRecommendedProgressions,
  MINI_CHORD_RECOMMENDED_PROGRESSION_IDS,
} from "../src/mini-chord/originalPracticeSongs.js";

const recommendations = getMiniChordRecommendedProgressions();
const windowLight = recommendations.find((item) => item.id === "fretiva-recommended-window-light");
const bars = Array.from({ length: windowLight.barCount }, (_, barIndex) => (
  windowLight.slots.slice(barIndex * 4, barIndex * 4 + 4).filter(Boolean).join(">")
));

test("window light remains the visible fourth built-in recommended progression", () => {
  assert.ok(recommendations.length >= 4);
  assert.equal(recommendations[3].title, "유리창의 불빛");
  assert.ok(MINI_CHORD_RECOMMENDED_PROGRESSION_IDS.includes(windowLight.id));
  assert.equal(windowLight.libraryType, "recommended-progression");
  assert.equal(windowLight.builtIn, true);
  assert.equal(windowLight.key, "C Major / A minor");
  assert.equal(windowLight.difficulty, "초중급");
  assert.equal(windowLight.bpm, 92);
  assert.equal(windowLight.barCount, 64);
  assert.equal(windowLight.slots.length, 256);
});

test("window light preserves all 64 bars including the three-chord ending cadence", () => {
  assert.deepEqual(bars, [
    "Cmaj7", "Am7", "Dm7", "G7", "Cmaj7", "Am7", "Dm7>G7", "Cmaj7>A7",
    "Cmaj7", "Am7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7",
    "Cmaj7", "Am7", "Dm7>G7", "Cmaj7", "Fmaj7", "Em7>A7", "Dm7>G7", "Cmaj7>A7",
    "Fmaj7", "Em7", "Am7", "D7", "Dm7>G7", "Cmaj7>A7", "Dm7>G7", "Bm7b5>E7",
    "Cmaj7", "Am7", "Dm7", "G7", "Em7", "A7", "Dm7>G7", "Cmaj7>A7",
    "Fmaj7", "Em7", "Am7>D7", "G7", "Cmaj7", "A7", "Dm7>G7", "Cmaj7>A7",
    "Dm7", "Am7", "Fmaj7", "E7", "Dm7>G7", "Cmaj7>A7", "Dm7>G7", "Bm7b5>E7",
    "Cmaj7", "Am7", "Dm7", "G7", "Em7>A7", "Dm7>G7", "Cmaj7>A7", "Dm7>G7>C6/9",
  ]);
});

test("window light exposes every requested section label and accompaniment preset", () => {
  assert.deepEqual(
    windowLight.arrangementOverrides.map(({ startBar, endBar, sectionName }) => [
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
      [41, 48, "Chorus Lift"],
      [49, 56, "Bridge"],
      [57, 63, "Final Chorus"],
      [64, 64, "Ending"],
    ],
  );
  assert.equal(windowLight.arrangementPatterns.length, 10);

  const patternIds = new Set(windowLight.arrangementPatterns.map((pattern) => pattern.id));
  windowLight.arrangementOverrides.forEach((section) => assert.ok(patternIds.has(section.patternId)));
  windowLight.arrangementPatterns.forEach((pattern) => {
    const { drum, bass, piano } = pattern.rhythmOverrides;
    assert.equal(drum.barSteps.length, bass.barSteps.length);
    assert.equal(bass.barSteps.length, piano.barSteps.length);
    drum.barSteps.forEach((bar) => assert.ok(Object.values(bar).every((steps) => steps.length === 16)));
    bass.barSteps.forEach((bar) => assert.equal(bar.length, 16));
    piano.barSteps.forEach((bar) => assert.equal(bar.length, 16));
  });
});

test("window light keeps its final transition gap and C6/9 ending hold", () => {
  const patterns = new Map(windowLight.arrangementPatterns.map((pattern) => [pattern.id, pattern.rhythmOverrides]));
  const pre = patterns.get("window-light-pre-build-jazz");
  const bridge = patterns.get("window-light-bridge-half-time");
  const final = patterns.get("window-light-final-jazz-pop");
  const ending = patterns.get("window-light-ending-hold");

  assert.equal(pre.drum.barSteps.at(-1).snare[14], true);
  assert.equal(pre.drum.barSteps.at(-1).snare[15], false);
  assert.equal(bridge.drum.barSteps.at(-1).snare[14], true);
  assert.equal(bridge.drum.barSteps.at(-1).snare[15], false);
  assert.equal(final.drum.barSteps.at(-1).snare[14], true);
  assert.equal(final.drum.barSteps.at(-1).snare[15], false);

  const endingDrum = ending.drum.barSteps[0];
  assert.equal(endingDrum.kick[0], true);
  assert.equal(endingDrum.snare[0], true);
  assert.equal(endingDrum.crash[0], true);
  assert.equal(endingDrum.shaker[8], true);
  assert.deepEqual(
    ending.bass.barSteps[0].filter((step) => step !== "hold" && step !== "rest"),
    ["root", "root", "root", "fifth"],
  );
  assert.deepEqual(ending.piano.barSteps[0][8], { active: true, style: "hold", durationSteps: 8 });
  assert.equal(ending.bass.barSteps[0].includes("approach"), false);
});

test("half-diminished and 6/9 harmony expose their complete chord tones", () => {
  assert.deepEqual(getChordToneNames("B", "minor", "m7b5"), ["B", "D", "F", "A"]);
  assert.deepEqual(getChordToneNames("C", "major", "6/9"), ["C", "E", "G", "A", "D"]);
});
