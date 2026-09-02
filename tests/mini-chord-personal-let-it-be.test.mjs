import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getMiniChordRecommendedProgressions } from "../src/mini-chord/originalPracticeSongs.js";
import { getMiniChordPersonalPracticeProjects } from "../src/mini-chord/personalPracticeProjects.js";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const [personalProject] = getMiniChordPersonalPracticeProjects();
const bars = Array.from({ length: personalProject.barCount }, (_, barIndex) => (
  personalProject.slots.slice(barIndex * 4, barIndex * 4 + 4).filter(Boolean).join(">")
));

test("Let It Be is a deletable personal saved-code project, never a recommendation", () => {
  assert.equal(personalProject.id, "personal-practice-let-it-be");
  assert.equal(personalProject.title, "Let It Be");
  assert.equal(personalProject.libraryType, "user");
  assert.equal(personalProject.builtIn, false);
  assert.equal(personalProject.personalOnly, true);
  assert.equal(personalProject.key, "C Major");
  assert.equal(personalProject.bpm, 76);
  assert.equal(personalProject.barCount, 96);
  assert.equal(personalProject.slots.length, 384);
  assert.equal(personalProject.loop, false);
  assert.equal(getMiniChordRecommendedProgressions().some((item) => item.id === personalProject.id), false);
});

test("the personal project preserves the authored 96-bar structure", () => {
  assert.deepEqual(bars, [
    "C", "G/B", "Am", "F>G",
    "C", "G", "Am", "F", "C", "G", "F>C/E", "Dm", "C>G/B", "Am", "F", "C", "G", "F>G", "C", "REST",
    "C", "G", "Am", "F", "C", "G", "F>C/E", "Dm", "C>G/B", "Am", "F", "C", "G", "F>G", "C", "REST",
    "Am", "G", "F", "C", "C", "G", "F>C/E", "Dm", "C>G/B", "Am", "F", "C", "G", "F>G", "C", "REST",
    "C", "G/B", "Am", "F", "C", "G", "F>C/E", "Dm", "C>G/B", "Am", "F", "C", "G", "F>G", "C", "REST",
    "Am", "G", "F", "C", "C", "G", "F>C/E", "Dm", "C>G/B", "Am", "F", "C", "G", "F>G", "C", "REST",
    "F", "C/E", "Dm>G", "C", "Am", "G", "F>G>C", "C",
    "C", "G/B", "Am>F", "Cadd9",
  ]);
  assert.deepEqual(
    personalProject.arrangementOverrides.map(({ startBar, endBar, sectionName }) => [startBar + 1, endBar + 1, sectionName]),
    [
      [1, 4, "Intro"],
      [5, 20, "Verse A"],
      [21, 36, "Verse B"],
      [37, 52, "Chorus"],
      [53, 68, "Verse C"],
      [69, 84, "Final Chorus"],
      [85, 92, "Coda"],
      [93, 96, "Ending"],
    ],
  );
});

test("all personal accompaniment sections carry complete synchronized 16-step bars", () => {
  assert.equal(personalProject.arrangementPatterns.length, 8);
  const allowedBassRoles = new Set([
    "rest", "root", "hold", "third", "fifth", "octave", "approach",
  ]);
  personalProject.arrangementPatterns.forEach((pattern) => {
    const { drum, bass, piano } = pattern.rhythmOverrides;
    assert.equal(drum.barSteps.length, bass.barSteps.length);
    assert.equal(bass.barSteps.length, piano.barSteps.length);
    drum.barSteps.forEach((bar) => {
      Object.values(bar).forEach((part) => {
        assert.equal(part.length, 16);
        assert.ok(part.every((step) => typeof step === "boolean"));
      });
    });
    bass.barSteps.forEach((bar) => {
      assert.equal(bar.length, 16);
      assert.ok(bar.every((step) => allowedBassRoles.has(step)));
    });
    piano.barSteps.forEach((bar) => assert.equal(bar.length, 16));
  });
});

test("the ending has one accent, a held Cadd9, and no loop approach note", () => {
  const ending = personalProject.arrangementPatterns
    .find((pattern) => pattern.id === "personal-let-it-be-ending")
    .rhythmOverrides;
  const endingDrum = ending.drum.barSteps.at(-1);
  const activeIndexes = (part) => part.flatMap((active, index) => active ? [index] : []);

  assert.deepEqual(activeIndexes(endingDrum.kick), [0]);
  assert.deepEqual(activeIndexes(endingDrum.snare), [0]);
  assert.deepEqual(activeIndexes(endingDrum.crash), [0]);
  assert.equal(ending.bass.barSteps.at(-1).includes("approach"), false);
  assert.deepEqual(ending.piano.barSteps.at(-1)[0], { active: true, style: "hold", durationSteps: 8 });
});

test("the app seeds the personal project once into saved codes without changing built-in recommendations", () => {
  assert.match(appSource, /getMiniChordPersonalPracticeProjects/);
  assert.match(appSource, /MINI_CHORD_PERSONAL_PRACTICE_SEED_KEY/);
  assert.match(appSource, /personalPracticeSeeds = !import\.meta\.env\.DEV/);
  assert.match(appSource, /window\.localStorage\.getItem\(MINI_CHORD_PERSONAL_PRACTICE_SEED_KEY\) === "1"/);
  assert.match(appSource, /return \[\.\.\.recommendedProgressions, \.\.\.personalPracticeSeeds, \.\.\.userItems\]/);
  assert.match(appSource, /JSON\.stringify\(userItems\)/);
  assert.match(appSource, /const MINI_CHORD_BAR_OPTIONS = \[4, 8, 16, 32, 64, 96\]/);
});
