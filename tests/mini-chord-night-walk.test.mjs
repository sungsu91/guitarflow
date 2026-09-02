import assert from "node:assert/strict";
import test from "node:test";

import {
  getMiniChordRecommendedProgressions,
  MINI_CHORD_RECOMMENDED_PROGRESSION_IDS,
} from "../src/mini-chord/originalPracticeSongs.js";

const recommendations = getMiniChordRecommendedProgressions();
const nightWalk = recommendations.find((item) => item.id === "fretiva-recommended-night-walk");
const bars = Array.from({ length: nightWalk.barCount }, (_, barIndex) => (
  nightWalk.slots.slice(barIndex * 4, barIndex * 4 + 4).filter(Boolean).join(">")
));

test("night walk is a locked-in built-in recommendation", () => {
  assert.ok(recommendations.length >= 2);
  assert.ok(MINI_CHORD_RECOMMENDED_PROGRESSION_IDS.includes("fretiva-original-first-drive"));
  assert.ok(MINI_CHORD_RECOMMENDED_PROGRESSION_IDS.includes("fretiva-recommended-night-walk"));
  assert.equal(new Set(recommendations.map((item) => item.id)).size, recommendations.length);
  assert.equal(nightWalk.title, "밤 산책");
  assert.equal(nightWalk.description, "2박 코드 전환과 여백 있는 미디엄 팝 발라드를 연습하는 64마디 프로젝트");
  assert.equal(nightWalk.libraryType, "recommended-progression");
  assert.equal(nightWalk.builtIn, true);
  assert.equal(nightWalk.key, "A minor");
  assert.equal(nightWalk.difficulty, "초급 ~ 초중급");
  assert.equal(nightWalk.timeSignature, "4/4");
  assert.equal(nightWalk.bpm, 82);
  assert.equal(nightWalk.barCount, 64);
  assert.equal(nightWalk.slots.length, 256);
});

test("night walk keeps every requested full-bar and half-bar chord change", () => {
  assert.deepEqual(bars, [
    "Am", "Fmaj7", "C", "G", "Am", "Fmaj7", "Dm7>Em7", "E7",
    "Am", "F", "C", "G", "Am", "F", "Dm>Em", "E7",
    "Am", "F", "C>G", "Am", "Dm", "F>G", "C>Em", "E7",
    "Dm", "Em", "F", "G", "Dm>Em", "F>G", "Am>G", "F>E7",
    "Am", "F", "C", "G", "Am", "F", "Dm>G", "C>E7",
    "Am", "F", "C>G", "Am", "Dm", "F>G", "C>Em", "F>E7",
    "Dm", "Am", "F", "E7", "Dm>Am", "F>G", "C>Em", "F>E7",
    "Am", "F", "C", "G", "Am>F", "C>G", "Dm>E7", "Am",
  ]);
});

test("night walk maps the arrangement to the requested visible section labels", () => {
  assert.deepEqual(
    nightWalk.arrangementOverrides.map(({ startBar, endBar, sectionName, patternId }) => [
      startBar + 1,
      endBar + 1,
      sectionName,
      patternId,
    ]),
    [
      [1, 4, "Intro", "night-walk-intro-minimal"],
      [5, 8, "Intro 상승", "night-walk-intro-build"],
      [9, 16, "Verse 1", "night-walk-soft-verse-8"],
      [17, 24, "Verse 2", "night-walk-verse-lift"],
      [25, 32, "Pre-Chorus", "night-walk-pre-build"],
      [33, 40, "Chorus", "night-walk-warm-chorus-16"],
      [41, 48, "Chorus 확장", "night-walk-chorus-sustain"],
      [49, 56, "Bridge", "night-walk-bridge-half-time"],
      [57, 63, "Final Chorus", "night-walk-final-full"],
      [64, 64, "Ending", "night-walk-final-full"],
    ],
  );
  assert.deepEqual(
    nightWalk.arrangementOverrides
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
  assert.ok(nightWalk.arrangementOverrides.slice(-2).every((section) => section.patternShared));
});

test("night walk supplies complete 16-step accompaniment data for every section", () => {
  assert.equal(nightWalk.arrangementPatterns.length, 9);
  const allowedBassRoles = new Set([
    "rest", "root", "hold", "third", "fifth", "octave", "approach", "flatSeventh",
  ]);
  const allowedPianoActions = new Set(["chord", "hold", "stab", "arpUp", "arpDown"]);

  nightWalk.arrangementPatterns.forEach((pattern) => {
    const { drum, bass, piano } = pattern.rhythmOverrides;
    assert.equal(pattern.rhythmPattern, "custom");
    assert.equal(pattern.bassBeat, "custom");
    assert.equal(pattern.pianoBeat, "custom");
    assert.equal(piano.voicing, "guideTones");
    assert.equal(drum.barSteps.length, bass.barSteps.length);
    assert.equal(bass.barSteps.length, piano.barSteps.length);
    assert.ok([4, 8].includes(drum.barSteps.length));

    drum.barSteps.forEach((bar) => {
      ["kick", "snare", "rim", "closedHat", "shaker", "crash"].forEach((part) => {
        assert.equal(bar[part].length, 16);
        assert.ok(bar[part].every((step) => typeof step === "boolean"));
      });
    });
    bass.barSteps.forEach((bar) => {
      assert.equal(bar.length, 16);
      assert.ok(bar.every((step) => allowedBassRoles.has(step)));
    });
    piano.barSteps.forEach((bar) => {
      assert.equal(bar.length, 16);
      assert.ok(bar.every((step) => typeof step.active === "boolean"));
      assert.ok(bar.filter((step) => step.active).every((step) => allowedPianoActions.has(step.style)));
    });
  });
});

test("night walk preserves its E7 guide tones, transition gaps and final Am hold", () => {
  const patternById = new Map(nightWalk.arrangementPatterns.map((pattern) => [pattern.id, pattern]));
  const intro = patternById.get("night-walk-intro-minimal").rhythmOverrides;
  const verse = patternById.get("night-walk-soft-verse-8").rhythmOverrides;
  const pre = patternById.get("night-walk-pre-build").rhythmOverrides;
  const chorus = patternById.get("night-walk-warm-chorus-16").rhythmOverrides;
  const bridge = patternById.get("night-walk-bridge-half-time").rhythmOverrides;
  const final = patternById.get("night-walk-final-full").rhythmOverrides;

  assert.equal(verse.bass.barSteps.at(-1)[8], "flatSeventh");
  assert.equal(verse.bass.barSteps.at(-1)[12], "third");
  assert.equal(pre.drum.barSteps.at(-1).snare[14], true);
  assert.equal(pre.drum.barSteps.at(-1).snare[15], false);
  assert.equal(bridge.drum.barSteps.at(-1).snare[14], true);
  assert.equal(bridge.drum.barSteps.at(-1).snare[15], false);

  assert.ok(intro.drum.level < verse.drum.level);
  assert.ok(verse.drum.level < chorus.drum.level);
  assert.ok(bridge.drum.level < chorus.drum.level);
  assert.ok(final.drum.level > chorus.drum.level);

  const finalDrumBar = final.drum.barSteps.at(-1);
  const activeSteps = (steps) => steps.flatMap((active, index) => active ? [index] : []);
  assert.deepEqual(activeSteps(finalDrumBar.kick), [0]);
  assert.deepEqual(activeSteps(finalDrumBar.snare), [0]);
  assert.deepEqual(activeSteps(finalDrumBar.crash), [0]);
  assert.deepEqual(final.bass.barSteps.at(-1), ["root", ...Array.from({ length: 15 }, () => "hold")]);
  assert.deepEqual(final.piano.barSteps.at(-1)[0], { active: true, style: "hold", durationSteps: 16 });
  assert.equal(final.piano.barSteps.at(-1).slice(1).some((step) => step.active), false);
});

test("recommended progression factories return fresh data that cannot mutate the library", () => {
  const mutableCopy = getMiniChordRecommendedProgressions();
  mutableCopy[1].title = "변경됨";
  mutableCopy[1].arrangementPatterns[0].rhythmOverrides.drum.barSteps[0].kick[0] = false;

  const freshNightWalk = getMiniChordRecommendedProgressions()[1];
  assert.equal(freshNightWalk.title, "밤 산책");
  assert.equal(freshNightWalk.arrangementPatterns[0].rhythmOverrides.drum.barSteps[0].kick[0], true);
});
