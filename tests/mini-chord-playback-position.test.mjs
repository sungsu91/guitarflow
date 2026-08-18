import assert from "node:assert/strict";
import test from "node:test";

import {
  createMiniChordSlotChordPlan,
  createMiniChordSessionPlaybackPlan,
  findMiniChordPlaybackSequenceIndexForBar,
  getMiniChordBeatInBar,
  getMiniChordPlaybackBarIndex,
  getMiniChordPlaybackVisualPosition,
  shouldScheduleMiniChordDrumsForSlot,
} from "../src/mini-chord/playbackPosition.js";
import {
  getMiniChordBoundarySafeDuration,
  getMiniChordExplicitSlotFallbackDuration,
  getMiniChordPianoPatternLevel,
  getMiniChordPianoStepProfile,
  isMiniChordSectionBoundary,
  shouldAddMiniChordExplicitSlotFallback,
  shouldSmoothMiniChordPianoCommonTone,
} from "../src/mini-chord/playbackDynamics.js";

test("mini chord slot indexes resolve to their zero-based source bars", () => {
  assert.equal(getMiniChordPlaybackBarIndex(0), 0);
  assert.equal(getMiniChordPlaybackBarIndex(1), 0);
  assert.equal(getMiniChordPlaybackBarIndex(16), 8);
  assert.equal(getMiniChordPlaybackBarIndex(23), 11);
});

test("12-bar playback keeps a 9-12 arrangement on bars 9-12 at the loop edge", () => {
  const progression = Array.from({ length: 24 }, (_, miniChordSlotIndex) => ({
    miniChordSlotIndex,
  }));
  const plan = createMiniChordSessionPlaybackPlan(progression);

  assert.deepEqual(plan.barSequence.slice(16, 24), [8, 8, 9, 9, 10, 10, 11, 11]);
  assert.equal(plan.barSequence[0], 0);
});

test("session playback plan preserves repeated source bars without rotating later bars", () => {
  const sourceSlots = [0, 1, 0, 1, ...Array.from({ length: 22 }, (_, index) => index + 2)];
  const progression = sourceSlots.map((miniChordSlotIndex) => ({ miniChordSlotIndex }));

  assert.deepEqual(
    createMiniChordSessionPlaybackPlan(progression).barSequence,
    [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
  );
});

test("non-mini-chord progressions do not publish a partial playback plan", () => {
  assert.deepEqual(
    createMiniChordSessionPlaybackPlan([{ id: "C" }, { miniChordSlotIndex: 1 }]),
    { barSequence: [], slotSequence: [] },
  );
});

test("click-to-seek resolves the first playback occurrence of a source bar", () => {
  const plan = createMiniChordSessionPlaybackPlan([
    { miniChordSlotIndex: 0 },
    { miniChordSlotIndex: 1 },
    { miniChordSlotIndex: 0 },
    { miniChordSlotIndex: 1 },
    { miniChordSlotIndex: 2 },
    { miniChordSlotIndex: 3 },
  ]);

  assert.equal(findMiniChordPlaybackSequenceIndexForBar(plan, 0), 0);
  assert.equal(findMiniChordPlaybackSequenceIndexForBar(plan, 1), 4);
  assert.equal(findMiniChordPlaybackSequenceIndexForBar(plan, 8), -1);
});

test("front and back chords in one bar remain separate playback chords", () => {
  assert.deepEqual(
    createMiniChordSlotChordPlan(["Bb", "C"], [0, 1]),
    [
      { barIndex: 0, hasExplicitChord: true, sequenceIndex: 0, slotIndex: 0, slotInBar: 0, sourceChordLabel: "Bb" },
      { barIndex: 0, hasExplicitChord: true, sequenceIndex: 1, slotIndex: 1, slotInBar: 1, sourceChordLabel: "C" },
    ],
  );
});

test("front and back slots share one continuous four-beat bar clock", () => {
  assert.deepEqual(
    [
      getMiniChordBeatInBar(0, 0),
      getMiniChordBeatInBar(0, 1),
      getMiniChordBeatInBar(1, 0),
      getMiniChordBeatInBar(1, 1),
    ],
    [0, 1, 2, 3],
  );
});

test("mini chord drums are scheduled once from the full-bar front slot", () => {
  assert.equal(shouldScheduleMiniChordDrumsForSlot(0), true);
  assert.equal(shouldScheduleMiniChordDrumsForSlot(1), false);
});

test("an explicit backbeat chord gets a fallback attack when basic patterns are silent there", () => {
  const bassSteps = Array.from({ length: 16 }, () => "rest");
  bassSteps[0] = "root";
  const pianoSteps = Array.from({ length: 16 }, () => ({ active: false }));
  pianoSteps[0] = { active: true };

  assert.equal(shouldAddMiniChordExplicitSlotFallback({
    end: 16,
    hasExplicitChord: true,
    part: "bass",
    start: 8,
    steps: bassSteps,
  }), true);
  assert.equal(shouldAddMiniChordExplicitSlotFallback({
    end: 16,
    hasExplicitChord: true,
    part: "piano",
    start: 8,
    steps: pianoSteps,
  }), true);
  assert.equal(shouldAddMiniChordExplicitSlotFallback({
    end: 8,
    hasExplicitChord: true,
    part: "bass",
    start: 0,
    steps: bassSteps,
  }), false);
});

test("a carried blank backbeat does not force an extra basic-pattern attack", () => {
  assert.equal(shouldAddMiniChordExplicitSlotFallback({
    end: 16,
    hasExplicitChord: false,
    part: "bass",
    start: 8,
    steps: Array.from({ length: 16 }, () => "rest"),
  }), false);
});

test("explicit backbeat fallback uses a short pattern attack instead of sustaining through the slot", () => {
  const measureSeconds = 1.5;
  const stepSeconds = measureSeconds / 8;
  const bassDuration = getMiniChordExplicitSlotFallbackDuration({
    measureSeconds,
    part: "bass",
    pattern: "basic",
    stepSeconds,
  });
  const pianoDuration = getMiniChordExplicitSlotFallbackDuration({
    measureSeconds,
    overlapRatio: 1.04,
    part: "piano",
    pattern: "basic",
    stepSeconds,
  });

  assert.equal(bassDuration, 0.2);
  assert.ok(Math.abs(pianoDuration - 0.45) < 0.000001);
  assert.ok(bassDuration < measureSeconds * 0.82);
  assert.ok(pianoDuration < measureSeconds * 0.82);
});

test("four-beat backbeats with their own attacks never use the explicit-slot fallback", () => {
  const bassSteps = Array.from({ length: 16 }, () => "rest");
  bassSteps[8] = "root";
  bassSteps[12] = "fifth";
  const pianoSteps = Array.from({ length: 16 }, () => ({ active: false }));
  pianoSteps[8] = { active: true };
  pianoSteps[12] = { active: true };

  assert.equal(shouldAddMiniChordExplicitSlotFallback({
    end: 16,
    hasExplicitChord: true,
    part: "bass",
    start: 8,
    steps: bassSteps,
  }), false);
  assert.equal(shouldAddMiniChordExplicitSlotFallback({
    end: 16,
    hasExplicitChord: true,
    part: "piano",
    start: 8,
    steps: pianoSteps,
  }), false);
});

test("audio-clock visual position changes exactly at each half-bar boundary", () => {
  const playbackPlan = {
    slotSequence: [0, 1, 2, 3],
    barSequence: [0, 0, 1, 1],
  };
  const beforeBoundary = getMiniChordPlaybackVisualPosition({
    audioTime: 10.999,
    cycleSeconds: 4,
    displayStartTime: 10,
    playbackPlan,
    stepSeconds: 1,
  });
  const atBoundary = getMiniChordPlaybackVisualPosition({
    audioTime: 11,
    cycleSeconds: 4,
    displayStartTime: 10,
    playbackPlan,
    stepSeconds: 1,
  });

  assert.equal(beforeBoundary.slotIndex, 0);
  assert.ok(beforeBoundary.progress > 0.99);
  assert.equal(atBoundary.slotIndex, 1);
  assert.equal(atBoundary.barIndex, 0);
  assert.equal(atBoundary.progress, 0);
});

test("8-beat piano has enough event level to stay audible in the band mix", () => {
  assert.equal(getMiniChordPianoPatternLevel("8beat"), 0.28);
  assert.ok(getMiniChordPianoPatternLevel("8beat") > getMiniChordPianoPatternLevel("16beat"));
});

test("8-beat piano pulses keep an audible body and immediate attack", () => {
  const profile = getMiniChordPianoStepProfile({
    measureSeconds: 1.2,
    overlapRatio: 1.04,
    pattern: "8beat",
    stepSeconds: 0.15,
    style: "stab",
  });

  assert.equal(profile.level, 0.28);
  assert.equal(profile.duration, 0.24);
  assert.equal(profile.commonToneSmoothing, false);
  assert.equal(shouldSmoothMiniChordPianoCommonTone("8beat", "chord"), false);
  assert.equal(shouldSmoothMiniChordPianoCommonTone("basic", "chord"), true);
});

test("section boundaries keep the final piano and bass tails inside the outgoing bar", () => {
  const verse = { backingArrangement: { overrideId: "verse-1" } };
  const chorus = { backingArrangement: { overrideId: "chorus-1" } };
  assert.equal(isMiniChordSectionBoundary(verse, verse), false);
  assert.equal(isMiniChordSectionBoundary(verse, chorus), true);
  assert.ok(
    Math.abs(getMiniChordBoundarySafeDuration({
      duration: 0.285,
      eventOffset: 1.116,
      isSectionBoundary: true,
      slotDuration: 1.2,
    }) - 0.078) < 0.000001,
  );
  assert.equal(
    getMiniChordBoundarySafeDuration({
      duration: 0.285,
      eventOffset: 1.116,
      isSectionBoundary: false,
      slotDuration: 1.2,
    }),
    0.285,
  );
});
