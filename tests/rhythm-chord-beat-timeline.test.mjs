import assert from "node:assert/strict";
import test from "node:test";

import {
  createRhythmChordBeatTimeline,
  expandRhythmChordPlaybackSlots,
  getRhythmChordBeatLabel,
  getRhythmChordIndexAtBeat,
  groupRhythmChordProgressionMeasures,
  normalizeRhythmChordBeatLength,
} from "../src/rhythm/chordBeatTimeline.js";

test("legacy rhythm chords default to four beats", () => {
  assert.equal(normalizeRhythmChordBeatLength(undefined), 4);
  assert.equal(normalizeRhythmChordBeatLength(9), 4);
  assert.equal(normalizeRhythmChordBeatLength(2), 2);
  assert.equal(getRhythmChordBeatLabel(), "4박");
});

test("two-beat chords switch on the shared cumulative beat timeline", () => {
  const progression = [
    { id: "C", beatLength: 2 },
    { id: "G", beatLength: 2 },
    { id: "Am", beatLength: 4 },
  ];
  const timeline = createRhythmChordBeatTimeline(progression);

  assert.equal(timeline.cycleBeats, 8);
  assert.deepEqual(
    timeline.items.map(({ beatLength, endBeat, index, startBeat }) => ({ beatLength, endBeat, index, startBeat })),
    [
      { beatLength: 2, endBeat: 2, index: 0, startBeat: 0 },
      { beatLength: 2, endBeat: 4, index: 1, startBeat: 2 },
      { beatLength: 4, endBeat: 8, index: 2, startBeat: 4 },
    ],
  );
  assert.equal(getRhythmChordIndexAtBeat(timeline, 0), 0);
  assert.equal(getRhythmChordIndexAtBeat(timeline, 1.999), 0);
  assert.equal(getRhythmChordIndexAtBeat(timeline, 2), 1);
  assert.equal(getRhythmChordIndexAtBeat(timeline, 4), 2);
  assert.equal(getRhythmChordIndexAtBeat(timeline, 8), 0);
});

test("playback compilation reuses the existing two-slot Web Audio bar clock", () => {
  const progression = [
    { id: "C", beatLength: 2 },
    { id: "G", beatLength: 2 },
    { id: "Am", beatLength: 4 },
  ];
  const result = expandRhythmChordPlaybackSlots(progression, 4);

  assert.equal(result.isRhythmChordTimeline, true);
  assert.deepEqual(result.expandedProgression.map((chord) => chord.rhythmChordIndex), [0, 1, 2, 2]);
  assert.deepEqual(result.expandedProgression.map((chord) => chord.miniChordSlotInBar), [0, 1, 0, 1]);
  assert.deepEqual(result.expandedProgression.map((chord) => chord.miniChordSlotHasExplicitChord), [true, true, true, false]);
  assert.equal(progression.length, 3);
  assert.equal("miniChordSlotIndex" in progression[0], false);
});

test("two half-bar chords are grouped within one visible measure", () => {
  const measures = groupRhythmChordProgressionMeasures([
    { id: "C", beatLength: 2 },
    { id: "G", beatLength: 2 },
    { id: "Am", beatLength: 4 },
  ], 4);

  assert.deepEqual(measures.map((measure) => measure.items.map(({ index }) => index)), [[0, 1], [2]]);
});
