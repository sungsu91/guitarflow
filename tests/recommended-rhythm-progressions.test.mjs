import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  RECOMMENDED_BASS_ROLES,
  RECOMMENDED_PIANO_ACTIONS,
  RHYTHM_RECOMMENDED_PROGRESSIONS,
  createRecommendedAccompanimentPatterns,
} from "../src/rhythm/recommendedProgressions.js";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const appCss = await readFile(new URL("../src/style.css", import.meta.url), "utf8");

const EXPECTED_TITLES = [
  "밝은 시작",
  "따뜻한 순환",
  "감성 발라드",
  "느린 귀환",
  "힘있는 팝록",
  "몽환적 밤",
  "소울 그루브",
  "빠른 전환",
  "긴장과 해소",
  "블루스 워크",
];

const EXPECTED_PROGRESSIONS = [
  [["C", 4], ["Am", 4], ["F", 4], ["G", 4]],
  [["C", 4], ["G", 4], ["Am", 4], ["F", 4]],
  [["Am", 4], ["F", 4], ["C", 4], ["G", 4]],
  [["C", 4], ["G", 4], ["F", 4], ["C", 4]],
  [["G", 4], ["D", 4], ["Em", 4], ["C", 4]],
  [["Am", 4], ["G", 4], ["F", 4], ["G", 4]],
  [["Cmaj7", 2], ["Am7", 2], ["Dm7", 2], ["G7", 2]],
  [["C", 2], ["Am", 1], ["G", 1], ["F", 4]],
  [["Dm", 2], ["G", 2], ["C", 2], ["Am", 2]],
  [
    ["A7", 4], ["D7", 4], ["A7", 4], ["A7", 4],
    ["D7", 4], ["D7", 4], ["A7", 4], ["A7", 4],
    ["E7", 4], ["D7", 4], ["A7", 2], ["E7", 2],
  ],
];

test("the old song-based recommendations are replaced by ten neutral practice presets", () => {
  assert.equal(RHYTHM_RECOMMENDED_PROGRESSIONS.length, 10);
  assert.deepEqual(RHYTHM_RECOMMENDED_PROGRESSIONS.map(({ title }) => title), EXPECTED_TITLES);
  assert.doesNotMatch(appSource, /recommended-let-it-be|recommended-canon|recommended-stand-by-me|recommended-hotel-california/);
});

test("every recommendation stores the complete progression and accompaniment bundle", () => {
  RHYTHM_RECOMMENDED_PROGRESSIONS.forEach((preset) => {
    assert.match(preset.id, /^recommended-/);
    assert.ok(preset.description);
    assert.ok(preset.key);
    assert.ok(preset.bpm > 0);
    assert.match(preset.timeSignature, /^\d+\/\d+$/);
    assert.ok(preset.progression.length > 0);
    assert.ok(preset.progression.every(({ chord, beats }) => chord && [1, 2, 4].includes(beats)));
    assert.ok(preset.drumPreset?.id && preset.drumPreset?.bars?.length);
    assert.ok(preset.bassPreset?.id && preset.bassPreset?.bars?.length);
    assert.ok(preset.pianoPreset?.id && preset.pianoPreset?.bars?.length);
    assert.equal(preset.loopLength.beats, preset.progression.reduce((sum, item) => sum + item.beats, 0));
    assert.equal(preset.intro, false);
    assert.equal(preset.loop, true);
    assert.equal(preset.ending, false);
  });
});

test("keys, tempos, meters, and entered chord durations match the authored set", () => {
  assert.deepEqual(RHYTHM_RECOMMENDED_PROGRESSIONS.map(({ key }) => key), ["C", "C", "C", "C", "G", "C", "C", "C", "C", "A"]);
  assert.deepEqual(RHYTHM_RECOMMENDED_PROGRESSIONS.map(({ bpm }) => bpm), [92, 96, 72, 68, 112, 78, 88, 104, 84, 104]);
  assert.ok(RHYTHM_RECOMMENDED_PROGRESSIONS.every(({ timeSignature }) => timeSignature === "4/4"));
  assert.deepEqual(
    RHYTHM_RECOMMENDED_PROGRESSIONS.map(({ progression }) => progression.map(({ chord, beats }) => [chord, beats])),
    EXPECTED_PROGRESSIONS,
  );
});

test("bass and piano presets only use transposable roles and non-melodic comping actions", () => {
  const bassRoles = new Set(Object.values(RECOMMENDED_BASS_ROLES));
  const pianoActions = new Set(Object.values(RECOMMENDED_PIANO_ACTIONS));
  RHYTHM_RECOMMENDED_PROGRESSIONS.forEach((preset) => {
    preset.bassPreset.bars.flat().forEach(({ role }) => assert.ok(bassRoles.has(role)));
    preset.pianoPreset.bars.flat().forEach(({ action }) => assert.ok(pianoActions.has(action)));
  });
});

test("the four priority presets compile their authored 16-step backing bars", () => {
  const priorityIds = [
    "recommended-bright-start",
    "recommended-emotional-ballad",
    "recommended-soul-groove",
    "recommended-fast-changes",
  ];
  priorityIds.forEach((id) => {
    const preset = RHYTHM_RECOMMENDED_PROGRESSIONS.find((item) => item.id === id);
    const patterns = createRecommendedAccompanimentPatterns(preset);
    assert.equal(patterns.drum.steps.kick.length, 16);
    assert.equal(patterns.bass.steps.length, 16);
    assert.equal(patterns.piano.steps.length, 16);
    assert.equal(patterns.piano.voicing, "guideTones");
    assert.equal(patterns.drum.barSteps.length, preset.drumPreset.bars.length);
    assert.equal(patterns.bass.barSteps.length, preset.bassPreset.bars.length);
    assert.equal(patterns.piano.barSteps.length, preset.pianoPreset.bars.length);
  });

  const fast = RHYTHM_RECOMMENDED_PROGRESSIONS.find((item) => item.id === "recommended-fast-changes");
  const fastPatterns = createRecommendedAccompanimentPatterns(fast);
  assert.deepEqual(fast.progression.map(({ beats }) => beats), [2, 1, 1, 4]);
  assert.deepEqual(
    fastPatterns.bass.barSteps[0].map((role, index) => [index, role]).filter(([, role]) => role !== "rest"),
    [[0, "root"], [4, "fifth"], [8, "root"], [12, "root"]],
  );
  assert.deepEqual(
    fastPatterns.piano.barSteps[0].map((step, index) => [index, step.style]).filter(([index]) => fastPatterns.piano.barSteps[0][index].active),
    [[0, "chord"], [6, "stab"], [8, "chord"], [12, "chord"]],
  );
  assert.equal(fastPatterns.piano.barSteps[1][0].style, "hold");
});

test("recommendation selection applies and preserves its fixed accompaniment", () => {
  assert.match(appSource, /stage3RecommendedPatternsRef\.current = recommendedPatterns/);
  assert.match(appSource, /setBackingRhythmPattern\(MINI_CHORD_CUSTOM_PATTERN_ID\)/);
  assert.match(appSource, /const stage3RecommendedAccompanimentLocked = appMode === APP_MODES\.PRACTICE/);
  assert.match(appSource, /const requestGlobalAccompanimentPatternChange = \(overrides = \{\}, options = \{\}\) => \{\s+if \(stage3RecommendedAccompanimentLocked\) return;/);
  assert.doesNotMatch(appSource, /delete nextRecommendedPatterns\.(?:drum|bass|piano)/);
  assert.match(appSource, /recommendedPatterns: stage3RecommendedPatternsRef\.current/);
});

test("recommendation dropdowns show titles with descriptions and beat widths are proportional", () => {
  assert.match(appSource, /label: item\.title \|\| "추천 진행",\s+description: item\.description/);
  assert.match(appSource, /metronomeSelectOptionDescription/);
  assert.match(appSource, /style=\{\{ "--rhythm-chord-beats": beatLength \}\}/);
  assert.match(appCss, /flex: var\(--rhythm-chord-beats, 1\) 1 0 !important/);
});

test("operator recommendation objects are immutable", () => {
  assert.equal(Object.isFrozen(RHYTHM_RECOMMENDED_PROGRESSIONS), true);
  assert.equal(Object.isFrozen(RHYTHM_RECOMMENDED_PROGRESSIONS[0].progression), true);
  assert.equal(Object.isFrozen(RHYTHM_RECOMMENDED_PROGRESSIONS[0].drumPreset.bars), true);
});
