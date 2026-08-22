import test from "node:test";
import assert from "node:assert/strict";
import {
  AUDIO_STUDIO_TIME_STRETCH_MAX_RATIO,
  AUDIO_STUDIO_TIME_STRETCH_MIN_RATIO,
  AUDIO_STUDIO_TIME_STRETCH_VERSION,
  createAudioStudioTimeStretchCacheKey,
  getAudioStudioTimeStretchRatio,
  isAudioStudioTimeStretchRatioSupported,
} from "../src/audio-studio/audioStudioTimeStretch.js";

test("manual BPM values produce the expected supported tempo ratio", () => {
  assert.equal(getAudioStudioTimeStretchRatio(100, 120), 1.2);
  assert.equal(getAudioStudioTimeStretchRatio(100, 80), 0.8);
  assert.equal(getAudioStudioTimeStretchRatio(0, 120), 0);
  assert.equal(AUDIO_STUDIO_TIME_STRETCH_MIN_RATIO, 0.75);
  assert.equal(AUDIO_STUDIO_TIME_STRETCH_MAX_RATIO, 1.5);
  assert.equal(isAudioStudioTimeStretchRatioSupported(0.75), true);
  assert.equal(isAudioStudioTimeStretchRatioSupported(1.5), true);
  assert.equal(isAudioStudioTimeStretchRatioSupported(0.749), false);
  assert.equal(isAudioStudioTimeStretchRatioSupported(1.501), false);
});

test("derived buffers are cached by immutable source, ratio, sample rate, and algorithm version", () => {
  const first = createAudioStudioTimeStretchCacheKey("source-a", 1.2, 44_100);
  assert.equal(first, createAudioStudioTimeStretchCacheKey("source-a", 1.2, 44_100));
  assert.notEqual(first, createAudioStudioTimeStretchCacheKey("source-a", 0.8, 44_100));
  assert.notEqual(first, createAudioStudioTimeStretchCacheKey("source-b", 1.2, 44_100));
  assert.match(first, new RegExp(AUDIO_STUDIO_TIME_STRETCH_VERSION.replaceAll(".", "\\.")));
});
