import assert from "node:assert/strict";
import test from "node:test";

import {
  FRETBOARD_PREVIEW_INSTRUMENT,
  getCleanGuitarVoiceProfile,
  getGuitarPitchAtPosition,
  getGuitarStrumVoices,
  getPlayableGuitarPositions,
} from "../src/audio/fretboardPreviewEngine.js";

test("guitar position resolves the standard-tuning pitch and octave", () => {
  assert.deepEqual(
    getGuitarPitchAtPosition(6, 8),
    {
      frequency: 130.8127826502993,
      fretNumber: 8,
      midi: 48,
      noteName: "C",
      octave: 3,
      pitch: "C3",
      stringNumber: 6,
    },
  );
  assert.equal(getGuitarPitchAtPosition(2, 1).pitch, "C4");
  assert.equal(getGuitarPitchAtPosition(1, 8).pitch, "C5");
});

test("fretboard preview stays on a clean-guitar voice with position-specific timbre", () => {
  const sixthStringC = getGuitarPitchAtPosition(6, 8);
  const fifthStringC = getGuitarPitchAtPosition(5, 3);
  const sixthStringProfile = getCleanGuitarVoiceProfile(sixthStringC);
  const fifthStringProfile = getCleanGuitarVoiceProfile(fifthStringC);

  assert.equal(FRETBOARD_PREVIEW_INSTRUMENT, "clean-guitar");
  assert.equal(sixthStringC.pitch, "C3");
  assert.equal(fifthStringC.pitch, "C3");
  assert.notDeepEqual(sixthStringProfile, fifthStringProfile);
  assert.ok(sixthStringProfile.bodyGainDb > fifthStringProfile.bodyGainDb);
  assert.ok(fifthStringProfile.toneCutoff > sixthStringProfile.toneCutoff);
});

test("chord preview derives every voice from its played string and fret", () => {
  const positions = getPlayableGuitarPositions([
    { stringNumber: 6, fretNumber: 8, pitch: "C9" },
    { stringNumber: 5, fretNumber: 3 },
    { stringNumber: 4, fretNumber: 2 },
    { stringNumber: 2, fretNumber: 1 },
  ], { 6: "x", 5: "", 4: "", 3: "o", 2: "", 1: "o" });

  assert.deepEqual(
    positions.map(({ stringNumber, fretNumber, pitch }) => ({ stringNumber, fretNumber, pitch })),
    [
      { stringNumber: 5, fretNumber: 3, pitch: "C3" },
      { stringNumber: 4, fretNumber: 2, pitch: "E3" },
      { stringNumber: 3, fretNumber: 0, pitch: "G3" },
      { stringNumber: 2, fretNumber: 1, pitch: "C4" },
      { stringNumber: 1, fretNumber: 0, pitch: "E4" },
    ],
  );
});

test("invalid or duplicate string positions are ignored", () => {
  const positions = getPlayableGuitarPositions([
    { stringNumber: 4, fretNumber: 2 },
    { stringNumber: 4, fretNumber: 7 },
    { stringNumber: 8, fretNumber: 1 },
    { stringNumber: 1, fretNumber: -1 },
  ]);
  assert.deepEqual(positions.map(({ pitch }) => pitch), ["E3"]);
});

test("down strum schedules only played strings from low to high with velocity variation", () => {
  const voices = getGuitarStrumVoices([
    { stringNumber: 1, fretNumber: 0 },
    { stringNumber: 2, fretNumber: 1 },
    { stringNumber: 3, fretNumber: 0 },
    { stringNumber: 4, fretNumber: 2 },
    { stringNumber: 5, fretNumber: 3 },
    { stringNumber: 6, fretNumber: 0 },
  ], {
    stringStates: { 6: "x" },
    strumSeconds: 0.028,
    velocityVariation: 0.13,
    humanizeSeed: 3,
  });

  assert.deepEqual(voices.map(({ stringNumber }) => stringNumber), [5, 4, 3, 2, 1]);
  assert.equal(voices[0].delaySeconds, 0);
  assert.ok(voices.at(-1).delaySeconds > 0.095);
  assert.ok(voices.at(-1).delaySeconds < 0.13);
  voices.slice(1).forEach((voice, index) => {
    const interval = voice.delaySeconds - voices[index].delaySeconds;
    assert.ok(interval > 0.021, `interval ${index} is too short: ${interval}`);
    assert.ok(interval < 0.034, `interval ${index} is too long: ${interval}`);
  });
  assert.ok(new Set(voices.map(({ velocity }) => velocity.toFixed(4))).size > 2);
  assert.ok(voices.every(({ velocity }) => velocity >= 0.78 && velocity <= 1.05));
  assert.ok(new Set(voices.map(({ attackScale }) => attackScale.toFixed(4))).size > 2);
  assert.ok(new Set(voices.map(({ brightnessScale }) => brightnessScale.toFixed(4))).size > 2);
  assert.ok(voices.find(({ stringNumber }) => stringNumber === 3).durationScale > 1.05);
  assert.ok(voices.find(({ stringNumber }) => stringNumber === 4).durationScale < 1.05);
});
