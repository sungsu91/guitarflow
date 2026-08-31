import assert from "node:assert/strict";
import test from "node:test";

import {
  createRhythmChordBeatTimeline,
  expandRhythmChordPlaybackSlots,
  getRhythmChordBeatLabel,
  getRhythmChordIndexAtBeat,
  getRhythmChordPlaybackPosition,
  getRhythmChordStartBeat,
  groupRhythmChordProgressionMeasures,
  muteRhythmChordRestEvents,
  normalizeRhythmChordBeatLength,
  RHYTHM_CHORD_REST_ID,
} from "../src/rhythm/chordBeatTimeline.js";

test("legacy rhythm chords default to four beats", () => {
  assert.equal(normalizeRhythmChordBeatLength(undefined), 4);
  assert.equal(normalizeRhythmChordBeatLength(9), 4);
  assert.equal(normalizeRhythmChordBeatLength(1), 1);
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
  assert.equal(result.playbackSlotBeats, 2);
  assert.equal(result.playbackSlotsPerMeasure, 2);
  assert.deepEqual(result.expandedProgression.map((chord) => chord.rhythmChordIndex), [0, 1, 2, 2]);
  assert.deepEqual(result.expandedProgression.map((chord) => chord.miniChordSlotInBar), [0, 1, 0, 1]);
  assert.deepEqual(result.expandedProgression.map((chord) => chord.miniChordSlotHasExplicitChord), [true, true, true, false]);
  assert.equal(progression.length, 3);
  assert.equal("miniChordSlotIndex" in progression[0], false);
});

test("one-beat chords compile on exact one-beat slots without changing entered lengths", () => {
  const patterns = [
    [2, 1, 1],
    [1, 1, 2],
    [1, 2, 1],
    [1, 1, 1, 1],
  ];

  patterns.forEach((beatLengths) => {
    const progression = beatLengths.map((beatLength, index) => ({
      beatLength,
      id: `chord-${index}`,
    }));
    const result = expandRhythmChordPlaybackSlots(progression, 4);

    assert.equal(result.playbackCycleBeats, 4);
    assert.equal(result.playbackSlotBeats, 1);
    assert.equal(result.playbackSlotsPerMeasure, 4);
    assert.deepEqual(
      result.timeline.items.map(({ beatLength }) => beatLength),
      beatLengths,
    );
    assert.deepEqual(
      result.expandedProgression.filter((chord) => chord.miniChordSlotHasExplicitChord)
        .map((chord) => chord.rhythmChordIndex),
      beatLengths.map((_, index) => index),
    );

    let beatCursor = 0;
    beatLengths.forEach((beatLength, index) => {
      assert.equal(getRhythmChordIndexAtBeat(result.timeline, beatCursor), index);
      beatCursor += beatLength;
    });
    assert.equal(getRhythmChordIndexAtBeat(result.timeline, beatCursor), 0);
  });
});

test("continuous one-beat changes keep every chord attack on its entered beat", () => {
  const result = expandRhythmChordPlaybackSlots([
    { id: "C", beatLength: 1 },
    { id: "Dm", beatLength: 1 },
    { id: "Em", beatLength: 1 },
    { id: "F", beatLength: 1 },
  ], 4);

  assert.deepEqual(
    result.expandedProgression.map((chord) => ({
      explicit: chord.miniChordSlotHasExplicitChord,
      index: chord.rhythmChordIndex,
      slotInBar: chord.miniChordSlotInBar,
    })),
    [
      { explicit: true, index: 0, slotInBar: 0 },
      { explicit: true, index: 1, slotInBar: 1 },
      { explicit: true, index: 2, slotInBar: 2 },
      { explicit: true, index: 3, slotInBar: 3 },
    ],
  );
});

test("a one-beat chord pads its bar before a four-beat chord and loops on beat one", () => {
  const result = expandRhythmChordPlaybackSlots([
    { id: "F-short", beatLength: 1 },
    { id: "F-long", beatLength: 4 },
  ], 4);

  assert.equal(result.playbackCycleBeats, 8);
  assert.deepEqual(
    result.timeline.items.map(({ beatLength, index, isAutoRest, startBeat }) => ({
      beatLength,
      index,
      isAutoRest,
      startBeat,
    })),
    [
      { beatLength: 1, index: 0, isAutoRest: false, startBeat: 0 },
      { beatLength: 3, index: -1, isAutoRest: true, startBeat: 1 },
      { beatLength: 4, index: 1, isAutoRest: false, startBeat: 4 },
    ],
  );
  assert.equal(getRhythmChordIndexAtBeat(result.timeline, 1), -1);
  assert.equal(getRhythmChordIndexAtBeat(result.timeline, 3.999), -1);
  assert.equal(getRhythmChordIndexAtBeat(result.timeline, 4), 1);
  assert.equal(getRhythmChordIndexAtBeat(result.timeline, 8), 0);
  assert.equal(getRhythmChordStartBeat(result.timeline, 1), 4);
  assert.equal(getRhythmChordBeatLabel(result.timeline.items[1].beatLength), "3박");
  assert.deepEqual(
    result.expandedProgression.map((chord) => ({
      index: chord.rhythmChordIndex,
      rest: chord.isRest,
      slot: chord.miniChordSlotInBar,
    })),
    [
      { index: 0, rest: false, slot: 0 },
      { index: -1, rest: true, slot: 1 },
      { index: -1, rest: true, slot: 2 },
      { index: -1, rest: true, slot: 3 },
      { index: 1, rest: false, slot: 0 },
      { index: 1, rest: false, slot: 1 },
      { index: 1, rest: false, slot: 2 },
      { index: 1, rest: false, slot: 3 },
    ],
  );
});

test("a two-beat chord pads the remaining two beats before a four-beat chord", () => {
  const timeline = createRhythmChordBeatTimeline([
    { id: "F-short", beatLength: 2 },
    { id: "F-long", beatLength: 4 },
  ], 4);

  assert.equal(timeline.cycleBeats, 8);
  assert.deepEqual(
    timeline.items.map(({ beatLength, index, isAutoRest, startBeat }) => ({
      beatLength,
      index,
      isAutoRest,
      startBeat,
    })),
    [
      { beatLength: 2, index: 0, isAutoRest: false, startBeat: 0 },
      { beatLength: 2, index: -1, isAutoRest: true, startBeat: 2 },
      { beatLength: 4, index: 1, isAutoRest: false, startBeat: 4 },
    ],
  );
});

test("an explicit one-beat rest stays in the entered progression without automatic padding", () => {
  const progression = [
    { id: "F", beatLength: 2 },
    { id: RHYTHM_CHORD_REST_ID, beatLength: 1, isRest: true },
    { id: "G", beatLength: 1 },
  ];
  const result = expandRhythmChordPlaybackSlots(progression, 4);

  assert.equal(result.playbackCycleBeats, 4);
  assert.deepEqual(
    result.timeline.items.map(({ index, isAutoRest, isRest, startBeat }) => ({
      index,
      isAutoRest,
      isRest,
      startBeat,
    })),
    [
      { index: 0, isAutoRest: false, isRest: false, startBeat: 0 },
      { index: 1, isAutoRest: false, isRest: true, startBeat: 2 },
      { index: 2, isAutoRest: false, isRest: false, startBeat: 3 },
    ],
  );
  assert.equal(getRhythmChordIndexAtBeat(result.timeline, 2), 1);
});

test("backing events inside rests are removed and sustaining events stop at the rest", () => {
  const timeline = createRhythmChordBeatTimeline([
    { id: "F", beatLength: 2 },
    { id: RHYTHM_CHORD_REST_ID, beatLength: 1, isRest: true },
    { id: "G", beatLength: 1 },
  ], 4);
  const events = muteRhythmChordRestEvents([
    { duration: 1.5, instrument: "piano", offsetSeconds: 0.75 },
    { duration: 0.2, instrument: "drum", offsetSeconds: 1.0 },
    { duration: 0.2, instrument: "drum", offsetSeconds: 1.25 },
    { duration: 0.5, instrument: "bass", offsetSeconds: 1.5 },
  ], timeline, 0.5);

  assert.deepEqual(events, [
    { duration: 0.25, instrument: "piano", offsetSeconds: 0.75 },
    { duration: 0.5, instrument: "bass", offsetSeconds: 1.5 },
  ]);
});

test("fixed and multi-measure mixed progressions preserve every entered duration", () => {
  const patterns = [
    [4, 4, 4],
    [2, 2, 2, 2],
    [2, 1, 1, 4, 1, 2, 1],
  ];

  patterns.forEach((beatLengths) => {
    const progression = beatLengths.map((beatLength, index) => ({
      beatLength,
      id: `chord-${index}`,
    }));
    const result = expandRhythmChordPlaybackSlots(progression, 4);

    assert.equal(
      result.playbackCycleBeats,
      beatLengths.reduce((total, beatLength) => total + beatLength, 0),
    );
    assert.deepEqual(
      result.timeline.items.map(({ beatLength }) => beatLength),
      beatLengths,
    );
    assert.deepEqual(
      result.expandedProgression.filter((chord) => chord.miniChordSlotHasExplicitChord)
        .map((chord) => chord.rhythmChordIndex),
      beatLengths.map((_, index) => index),
    );
  });
});

test("one-beat duration survives the stored JSON round trip", () => {
  const storedProgression = JSON.parse(JSON.stringify([
    { beatLength: 1, id: "C" },
    { beatLength: 2, id: "G" },
    { beatLength: 1, id: "Am" },
  ]));

  assert.deepEqual(
    createRhythmChordBeatTimeline(storedProgression).items.map(({ beatLength }) => beatLength),
    [1, 2, 1],
  );
});

test("time signatures choose slots from their real beat count instead of a fixed 4/4 bar", () => {
  const threeFour = expandRhythmChordPlaybackSlots([
    { id: "C", beatLength: 2 },
    { id: "G", beatLength: 1 },
  ], 3);
  const sixEight = expandRhythmChordPlaybackSlots([
    { id: "C", beatLength: 2 },
    { id: "G", beatLength: 4 },
  ], 6);
  const twelveEight = expandRhythmChordPlaybackSlots([
    { id: "C", beatLength: 4 },
    { id: "G", beatLength: 4 },
    { id: "Am", beatLength: 4 },
  ], 12);

  assert.deepEqual(
    [threeFour.playbackSlotBeats, threeFour.playbackSlotsPerMeasure],
    [1, 3],
  );
  assert.deepEqual(
    [sixEight.playbackSlotBeats, sixEight.playbackSlotsPerMeasure],
    [2, 3],
  );
  assert.deepEqual(
    [twelveEight.playbackSlotBeats, twelveEight.playbackSlotsPerMeasure],
    [2, 6],
  );
  assert.deepEqual(
    sixEight.expandedProgression.map((chord) => chord.miniChordSlotInBar),
    [0, 1, 2],
  );
  assert.deepEqual(
    twelveEight.expandedProgression.map((chord) => chord.miniChordSlotInBar),
    [0, 1, 2, 3, 4, 5],
  );
});

test("audio-clock playback position stays exact across BPM extremes and long repeats", () => {
  const timeline = createRhythmChordBeatTimeline([
    { id: "C", beatLength: 1 },
    { id: "G", beatLength: 2 },
    { id: "Am", beatLength: 1 },
  ]);

  [30, 80, 240].forEach((bpm) => {
    const beatSeconds = 60 / bpm;
    const completedCycles = 100_000;
    const audioTime = 7.25 + (completedCycles * timeline.cycleBeats + 3) * beatSeconds;
    const position = getRhythmChordPlaybackPosition({
      audioTime,
      beatSeconds,
      beatsPerMeasure: 4,
      displayStartTime: 7.25,
      timeline,
    });

    assert.ok(Math.abs(position.cycleBeat - 3) < 1e-8);
    assert.equal(position.chordIndex, 2);
    assert.equal(position.beatInMeasure, 3);
    assert.ok(Math.abs(position.measureProgress - 0.75) < 1e-8);
  });
});

test("an incomplete final measure becomes an automatic rest before the loop", () => {
  const timeline = createRhythmChordBeatTimeline([
    { id: "C", beatLength: 2 },
    { id: "G", beatLength: 1 },
  ]);
  const beatSeconds = 0.5;
  const beforeLoop = getRhythmChordPlaybackPosition({
    audioTime: 1.5 - 1e-6,
    beatSeconds,
    beatsPerMeasure: 4,
    displayStartTime: 0,
    timeline,
  });
  const inAutomaticRest = getRhythmChordPlaybackPosition({
    audioTime: 1.5,
    beatSeconds,
    beatsPerMeasure: 4,
    displayStartTime: 0,
    timeline,
  });

  assert.equal(beforeLoop.chordIndex, 1);
  assert.equal(beforeLoop.beatInMeasure, 2);
  const atLoop = getRhythmChordPlaybackPosition({
    audioTime: 2,
    beatSeconds,
    beatsPerMeasure: 4,
    displayStartTime: 0,
    timeline,
  });

  assert.equal(inAutomaticRest.chordIndex, -1);
  assert.equal(inAutomaticRest.isAutoRest, true);
  assert.equal(inAutomaticRest.beatInMeasure, 3);
  assert.equal(atLoop.chordIndex, 0);
  assert.equal(atLoop.beatInMeasure, 0);
  assert.equal(atLoop.measureProgress, 0);
  assert.deepEqual(timeline.items.map(({ beatLength }) => beatLength), [2, 1, 1]);
});

test("meter-aware placement inserts rests from the selected measure length", () => {
  const threeFour = createRhythmChordBeatTimeline([
    { id: "F", beatLength: 2 },
    { id: "G", beatLength: 2 },
  ], 3);
  const sixEight = createRhythmChordBeatTimeline([
    { id: "F", beatLength: 4 },
    { id: "G", beatLength: 4 },
  ], 6);
  const twelveEight = createRhythmChordBeatTimeline([
    { id: "F", beatLength: 4 },
    { id: "G", beatLength: 4 },
    { id: "A", beatLength: 4 },
  ], 12);

  assert.deepEqual(
    threeFour.items.map(({ beatLength, isAutoRest, startBeat }) => ({ beatLength, isAutoRest, startBeat })),
    [
      { beatLength: 2, isAutoRest: false, startBeat: 0 },
      { beatLength: 1, isAutoRest: true, startBeat: 2 },
      { beatLength: 2, isAutoRest: false, startBeat: 3 },
      { beatLength: 1, isAutoRest: true, startBeat: 5 },
    ],
  );
  assert.deepEqual(
    sixEight.items.map(({ beatLength, isAutoRest, startBeat }) => ({ beatLength, isAutoRest, startBeat })),
    [
      { beatLength: 4, isAutoRest: false, startBeat: 0 },
      { beatLength: 2, isAutoRest: true, startBeat: 4 },
      { beatLength: 4, isAutoRest: false, startBeat: 6 },
      { beatLength: 2, isAutoRest: true, startBeat: 10 },
    ],
  );
  assert.equal(twelveEight.cycleBeats, 12);
  assert.equal(twelveEight.items.some(({ isAutoRest }) => isAutoRest), false);
});

test("an event longer than a short meter is split into non-attacking measure segments", () => {
  const result = expandRhythmChordPlaybackSlots([
    { id: "F", beatLength: 4 },
  ], 3);

  assert.equal(result.playbackCycleBeats, 6);
  assert.deepEqual(
    result.timeline.items.map(({ beatLength, index, isAutoRest, isContinuation, startBeat }) => ({
      beatLength,
      index,
      isAutoRest,
      isContinuation,
      startBeat,
    })),
    [
      { beatLength: 3, index: 0, isAutoRest: false, isContinuation: false, startBeat: 0 },
      { beatLength: 1, index: 0, isAutoRest: false, isContinuation: true, startBeat: 3 },
      { beatLength: 2, index: -1, isAutoRest: true, isContinuation: false, startBeat: 4 },
    ],
  );
  assert.deepEqual(
    result.expandedProgression.map((chord) => chord.miniChordSlotHasExplicitChord),
    [true, false, false, false, false, false],
  );
});

test("two half-bar chords are grouped within one visible measure", () => {
  const measures = groupRhythmChordProgressionMeasures([
    { id: "C", beatLength: 2 },
    { id: "G", beatLength: 2 },
    { id: "Am", beatLength: 4 },
  ], 4);

  assert.deepEqual(measures.map((measure) => measure.items.map(({ index }) => index)), [[0, 1], [2]]);
});

test("visible measure grouping moves an oversized next chord after the automatic rest", () => {
  const measures = groupRhythmChordProgressionMeasures([
    { id: "F-short", beatLength: 1 },
    { id: "F-long", beatLength: 4 },
  ], 4);

  assert.deepEqual(measures.map((measure) => ({
    autoRestBeats: measure.autoRestBeats,
    indexes: measure.items.map(({ index }) => index),
    restItems: measure.items.filter(({ isAutoRest }) => isAutoRest).map(({ beatLength, startBeat }) => ({ beatLength, startBeat })),
  })), [
    { autoRestBeats: 3, indexes: [0, -1], restItems: [{ beatLength: 3, startBeat: 1 }] },
    { autoRestBeats: 0, indexes: [1], restItems: [] },
  ]);
});
