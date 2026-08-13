import test from "node:test";
import assert from "node:assert/strict";
import {
  createBackingLoopId,
  formatBackingLoopTime,
  getBackingLoopStatus,
  getPreferredBackingLoopMimeType,
  normalizeBackingLoopTitle,
} from "../src/backing-loop/backingLoopUtils.js";

test("backing loop timer keeps a stable minute and second shape", () => {
  assert.equal(formatBackingLoopTime(0), "00:00");
  assert.equal(formatBackingLoopTime(8_900), "00:08");
  assert.equal(formatBackingLoopTime(68_000), "01:08");
  assert.equal(formatBackingLoopTime(-1), "00:00");
});

test("backing loop title is compact, trimmed, and safe for one-line display", () => {
  assert.equal(normalizeBackingLoopTitle("  Am    Practice  "), "Am Practice");
  assert.equal(normalizeBackingLoopTitle(" "), "");
  assert.equal(normalizeBackingLoopTitle("x".repeat(60)).length, 40);
});

test("backing loop creates stable ids with the browser crypto API when available", () => {
  assert.equal(createBackingLoopId({ randomUUID: () => "loop-id" }), "loop-id");
});

test("backing loop chooses the first supported recording format", () => {
  const supported = new Set(["audio/mp4", "audio/webm"]);
  const MediaRecorderApi = { isTypeSupported: (mimeType) => supported.has(mimeType) };
  assert.equal(getPreferredBackingLoopMimeType(MediaRecorderApi), "audio/mp4");
  assert.equal(getPreferredBackingLoopMimeType(null), "");
});

test("backing loop status describes empty, recording, playback, pause, and ready states", () => {
  assert.deepEqual(
    getBackingLoopStatus({ elapsedMs: 0, hasRecording: false, phase: "idle" }),
    { label: "EMPTY", tone: "empty" },
  );
  assert.deepEqual(
    getBackingLoopStatus({ elapsedMs: 8_000, phase: "recording" }),
    { label: "REC 00:08", tone: "recording" },
  );
  assert.deepEqual(
    getBackingLoopStatus({ elapsedMs: 8_000, hasRecording: true, phase: "playing" }),
    { label: "PLAY 00:08", tone: "playing" },
  );
  assert.deepEqual(
    getBackingLoopStatus({ elapsedMs: 8_000, hasRecording: true, phase: "paused" }),
    { label: "PAUSED 00:08", tone: "paused" },
  );
  assert.deepEqual(
    getBackingLoopStatus({ elapsedMs: 0, hasRecording: true, phase: "idle" }),
    { label: "READY 00:00", tone: "ready" },
  );
});
