import assert from "node:assert/strict";
import test from "node:test";

import {
  clearSectionRhythmOverride,
  normalizeSectionRhythmOverrides,
  resolveRhythmHierarchyPattern,
  setSectionRhythmOverride,
} from "../src/rhythm/rhythmHierarchy.js";
import { TEXTBOOK_RHYTHM_DEFAULTS } from "../src/rhythm/textbookRhythmDefaults.js";

const normalizePattern = (part, pattern) => ({ ...pattern, part });

test("rhythm hierarchy resolves section, global user, then app default", () => {
  const appDefaultPattern = { steps: ["app"] };
  const userDefaultPattern = { steps: ["user"] };
  const sectionPattern = { steps: ["section"] };

  assert.deepEqual(resolveRhythmHierarchyPattern({
    appDefaultPattern,
    userDefaultPattern,
    sectionPattern,
    part: "drum",
    normalizePattern,
  }), {
    pattern: { steps: ["section"], part: "drum" },
    source: "section-override",
  });
  assert.equal(resolveRhythmHierarchyPattern({
    appDefaultPattern,
    userDefaultPattern,
    part: "bass",
  }).source, "global-user");
  assert.equal(resolveRhythmHierarchyPattern({
    appDefaultPattern,
    part: "piano",
  }).source, "app-default");
});

test("section rhythm reset removes only the requested instrument override", () => {
  const overrides = setSectionRhythmOverride(
    { drum: { steps: [1] } },
    "bass",
    { steps: [2] },
    normalizePattern,
  );

  assert.deepEqual(Object.keys(overrides), ["drum", "bass"]);
  assert.deepEqual(clearSectionRhythmOverride(overrides, "drum", normalizePattern), {
    bass: { steps: [2], part: "bass" },
  });
});

test("section override normalization ignores unrelated arrangement data", () => {
  assert.deepEqual(normalizeSectionRhythmOverrides({
    drum: { steps: [true] },
    tempo: { bpm: 120 },
  }, normalizePattern), {
    drum: { steps: [true], part: "drum" },
  });
});

test("textbook defaults give drum, bass, and piano distinct musical roles", () => {
  assert.deepEqual(TEXTBOOK_RHYTHM_DEFAULTS.drum.kick, [0, 8]);
  assert.deepEqual(TEXTBOOK_RHYTHM_DEFAULTS.drum.snare, [4, 12]);
  assert.deepEqual(TEXTBOOK_RHYTHM_DEFAULTS.drum.closedHat, [0, 2, 4, 6, 8, 10, 12, 14]);
  assert.deepEqual(TEXTBOOK_RHYTHM_DEFAULTS.bass.map(({ index }) => index), [0, 4, 8, 12]);
  assert.deepEqual(TEXTBOOK_RHYTHM_DEFAULTS.piano.map(({ index }) => index), [0, 6, 8, 14]);
  assert.notDeepEqual(
    TEXTBOOK_RHYTHM_DEFAULTS.bass.map(({ index }) => index),
    TEXTBOOK_RHYTHM_DEFAULTS.piano.map(({ index }) => index),
  );
});
