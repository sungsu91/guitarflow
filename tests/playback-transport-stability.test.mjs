import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AUDIO_TRANSPORT_LOOKAHEAD_SECONDS,
  AUDIO_TRANSPORT_SCHEDULER_INTERVAL_MS,
  collectAudioTransportSteps,
  createAudioTransportCursor,
  getAudioTransportElapsedSeconds,
  getAudioTransportStepSeconds,
} from "../src/audio/transportClock.js";

const BPMS = [58, 80, 120, 160];

test("58, 80, 120, and 160 BPM keep a drift-free 64-bar sixteenth-note grid", () => {
  const jitter = [0.011, 0.047, 0.029, 0.083, 0.018, 0.061, 0.026];
  for (const bpm of BPMS) {
    const stepSeconds = getAudioTransportStepSeconds(bpm, 4);
    const originTime = 0.06;
    const expectedCount = 64 * 4 * 4;
    const stopBeforeTime = originTime + expectedCount * stepSeconds;
    let cursor = createAudioTransportCursor({ originTime, positionSeconds: 0, stepSeconds });
    let currentTime = 0;
    let jitterIndex = 0;
    const scheduled = [];

    while (currentTime < stopBeforeTime + AUDIO_TRANSPORT_LOOKAHEAD_SECONDS) {
      const batch = collectAudioTransportSteps(cursor, {
        currentTime,
        horizonSeconds: AUDIO_TRANSPORT_LOOKAHEAD_SECONDS,
        stopBeforeTime,
      });
      cursor = batch.cursor;
      scheduled.push(...batch.steps);
      currentTime += jitter[jitterIndex % jitter.length];
      jitterIndex += 1;
    }

    assert.equal(scheduled.length, expectedCount, `${bpm} BPM event count`);
    assert.equal(new Set(scheduled.map(({ index }) => index)).size, expectedCount, `${bpm} BPM duplicate`);
    scheduled.forEach(({ index, time }) => {
      assert.ok(
        Math.abs(time - (originTime + index * stepSeconds)) < 1e-10,
        `${bpm} BPM drift at step ${index}`,
      );
    });
  }
});

test("transport pause, stop, restart, and looping positions have explicit semantics", () => {
  assert.equal(getAudioTransportElapsedSeconds({ audioTime: 12.5, originTime: 10 }), 2.5);
  assert.equal(getAudioTransportElapsedSeconds({ audioTime: 18, originTime: 10, durationSeconds: 6 }), 6);
  assert.equal(getAudioTransportElapsedSeconds({ audioTime: 18.5, originTime: 10, durationSeconds: 6, loop: true }), 2.5);

  const stepSeconds = getAudioTransportStepSeconds(120, 1);
  const paused = createAudioTransportCursor({ originTime: 20, positionSeconds: 1.25, stepSeconds });
  assert.equal(paused.nextStepIndex, 3);
  assert.equal(paused.nextStepTime, 21.5);
  const restarted = createAudioTransportCursor({ originTime: 30, positionSeconds: 0, stepSeconds });
  assert.equal(restarted.nextStepIndex, 0);
  assert.equal(restarted.nextStepTime, 30);
});

test("app audio paths schedule clicks and accompaniment ahead on the shared Web Audio clock", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const backingScheduler = source.slice(
    source.indexOf("const runBackingScheduler"),
    source.indexOf("const stopMetronomeVisualLab"),
  );
  const metronomeScheduler = source.slice(
    source.indexOf("const runMetronomeAudioScheduler"),
    source.indexOf("const ensureBackingOutput"),
  );
  const rhythmFrame = source.slice(
    source.indexOf("const runChordTransitionFrame"),
    source.indexOf("const runMetronomeFrame"),
  );

  assert.equal(AUDIO_TRANSPORT_SCHEDULER_INTERVAL_MS, 25);
  assert.match(backingScheduler, /collectAudioTransportSteps\(backingMetronomeCursorRef\.current/);
  assert.match(backingScheduler, /playStage3PatternTick\(beatInBar, subdivisionIndex, time\)/);
  assert.match(backingScheduler, /schedulePreparedBackingEvent\(event, eventTime\)/);
  assert.match(backingScheduler, /backingDisplayStartTimeRef\.current = backingCycleStartTimeRef\.current/);
  assert.match(metronomeScheduler, /collectAudioTransportSteps\(metronomeAudioCursorRef\.current/);
  assert.match(metronomeScheduler, /playPatternTick\(beatInBar, subdivisionIndex, time\)/);
  assert.match(rhythmFrame, /audioTime: audio\.currentTime/);
  assert.doesNotMatch(
    rhythmFrame.slice(0, rhythmFrame.indexOf("const progressNow", rhythmFrame.indexOf("backingClockActive"))),
    /playStage3PatternTick\(beatInBar, subdivisionIndex\)/,
  );
});

test("stop and unmount paths cancel pending audio nodes and the one scheduler interval", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const cancelSource = source.slice(
    source.indexOf("const cancelScheduledMetronomeTicks"),
    source.indexOf("const playTick"),
  );
  const stopSource = source.slice(
    source.indexOf("const stopBackingScheduler"),
    source.indexOf("const runBackingScheduler"),
  );
  assert.match(cancelSource, /cancelScheduledValues/);
  assert.match(cancelSource, /source\.stop/);
  assert.match(stopSource, /window\.clearInterval\(backingSchedulerTimerRef\.current\)/);
  assert.match(stopSource, /cancelScheduledMetronomeTicks\(\)/);
  assert.match(source, /useEffect\(\(\) => \(\) => \{[\s\S]*stopMetronomeAudioScheduler\(\)/);
});
