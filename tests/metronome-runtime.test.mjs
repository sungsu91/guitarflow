import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  advanceMetronomeRuntime,
  createMetronomeRuntimeState,
  normalizeAutomatorTimerParts,
  normalizeTrackerTimerParts,
} from "../src/metronome/runtime.js";

const BASE_CONFIGURATION = Object.freeze({
  bpm: 120,
  beatsPerMeasure: 4,
  clicksPerBeat: 1,
  automatorMode: "off",
  automatorDirection: "increase",
  automatorStep: 1,
  automatorEveryBars: 5,
  automatorEveryMs: 30000,
  coachEnabled: false,
  coachPlayBars: 4,
  coachMuteBars: 4,
  trackerMode: "off",
  trackerBarLimitEnabled: false,
  trackerBarLimit: 0,
  trackerBarStopWhenReached: false,
  trackerBarResetWhenReached: false,
  trackerTimerTotalMs: 60000,
  trackerTimerStopWhenReached: false,
  trackerTimerResetWhenReached: false,
});

class FakeMetronomeClock {
  constructor(configuration = {}, initial = {}) {
    this.configuration = { ...BASE_CONFIGURATION, ...configuration };
    this.state = createMetronomeRuntimeState(initial);
    this.running = false;
    this.autoChanges = [];
    this.stopEvents = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  restart() {
    this.state = createMetronomeRuntimeState({
      trackerBars: this.state.trackerBars,
      trackerElapsedMs: this.state.trackerElapsedMs,
      trackerMode: this.configuration.trackerMode,
    });
    this.running = true;
  }

  reset() {
    this.state = createMetronomeRuntimeState();
    this.running = false;
    this.autoChanges = [];
    this.stopEvents = 0;
  }

  configure(changes) {
    Object.assign(this.configuration, changes);
  }

  advance(milliseconds, frameMs = 50) {
    let remaining = Math.max(0, milliseconds);
    while (remaining > 0) {
      const elapsed = Math.min(frameMs, remaining);
      remaining -= elapsed;
      if (!this.running) continue;
      const frame = advanceMetronomeRuntime(this.state, elapsed, this.configuration);
      this.state = frame.state;
      if (frame.autoBpmChanges > 0) {
        this.configuration.bpm = frame.nextBpm;
        this.autoChanges.push({
          count: frame.autoBpmChanges,
          elapsedMs: this.state.elapsedMs,
          bpm: frame.nextBpm,
        });
      }
      if (frame.shouldStop) {
        this.running = false;
        this.stopEvents += 1;
      }
    }
  }
}

test("Automator OFF and OFF transitions cancel pending time changes", () => {
  const clock = new FakeMetronomeClock({ automatorMode: "time", automatorEveryMs: 30000 });
  clock.start();
  clock.advance(29950);
  assert.equal(clock.autoChanges.length, 0);

  clock.configure({ automatorMode: "off" });
  clock.advance(180000);
  assert.equal(clock.autoChanges.length, 0, "OFF must not retain or fire a pending change");

  clock.configure({ automatorMode: "time" });
  clock.advance(29950);
  assert.equal(clock.autoChanges.length, 0, "re-enabling starts a fresh interval");
  clock.advance(50);
  assert.deepEqual(clock.autoChanges, [{ count: 1, elapsedMs: 239950, bpm: 121 }]);
});

test("By Time applies increase and decrease exactly at 30 second and 1 minute boundaries", () => {
  const increase = new FakeMetronomeClock({
    bpm: 100,
    automatorMode: "time",
    automatorEveryMs: 30000,
    automatorStep: 3,
  });
  increase.start();
  increase.advance(29950);
  assert.equal(increase.configuration.bpm, 100);
  increase.advance(50);
  assert.equal(increase.configuration.bpm, 103);
  assert.equal(increase.autoChanges[0].elapsedMs, 30000);

  const decrease = new FakeMetronomeClock({
    bpm: 100,
    automatorMode: "time",
    automatorDirection: "decrease",
    automatorEveryMs: 60000,
    automatorStep: 4,
  });
  decrease.start();
  decrease.advance(59950);
  assert.equal(decrease.configuration.bpm, 100);
  decrease.advance(50);
  assert.equal(decrease.configuration.bpm, 96);
  assert.equal(decrease.autoChanges[0].elapsedMs, 60000);
});

test("By Bars changes only after the configured number of completed bars", () => {
  const clock = new FakeMetronomeClock({
    bpm: 120,
    automatorMode: "bars",
    automatorEveryBars: 5,
    automatorStep: 2,
  });
  clock.start();
  clock.advance(9950);
  assert.equal(clock.state.completedBars, 4);
  assert.equal(clock.configuration.bpm, 120);
  clock.advance(50);
  assert.equal(clock.state.completedBars, 5);
  assert.equal(clock.configuration.bpm, 122);
  assert.equal(clock.autoChanges.length, 1);
});

test("timer wheel boundary normalization matches Automator and Tracker limits", () => {
  assert.deepEqual(normalizeAutomatorTimerParts(0, 0), { minutes: 1, seconds: 1 });
  assert.deepEqual(normalizeAutomatorTimerParts(31, 60), { minutes: 30, seconds: 59 });
  assert.deepEqual(normalizeAutomatorTimerParts(undefined, undefined), { minutes: 1, seconds: 30 });
  assert.deepEqual(normalizeTrackerTimerParts(0, -1), { minutes: 1, seconds: 0 });
  assert.deepEqual(normalizeTrackerTimerParts(31, 60), { minutes: 30, seconds: 59 });
});

test("minimum and maximum minute/second timer values complete on their exact fake-clock frame", () => {
  for (const totalMs of [60000, ((30 * 60) + 59) * 1000]) {
    const clock = new FakeMetronomeClock({
      trackerMode: "timer",
      trackerTimerTotalMs: totalMs,
      trackerTimerStopWhenReached: true,
    });
    clock.start();
    clock.advance(totalMs - 50);
    assert.equal(clock.running, true);
    assert.equal(clock.state.trackerElapsedMs, totalMs - 50);
    clock.advance(50);
    assert.equal(clock.running, false);
    assert.equal(clock.state.trackerElapsedMs, totalMs);
  }
});

test("Tracker counts completed bars, stays frozen while OFF, and does not duplicate after restart", () => {
  const clock = new FakeMetronomeClock({ trackerMode: "bars" });
  clock.start();
  clock.advance(6000);
  assert.equal(clock.state.trackerBars, 3);

  clock.configure({ trackerMode: "off" });
  clock.advance(10000);
  assert.equal(clock.state.trackerBars, 3, "Tracker OFF must not count bars");

  clock.stop();
  clock.advance(10000);
  assert.equal(clock.state.trackerBars, 3, "a stopped clock must not advance");

  clock.configure({ trackerMode: "bars" });
  clock.restart();
  clock.start();
  clock.advance(2000);
  assert.equal(clock.state.trackerBars, 4, "restart must add exactly one new bar");
});

test("Tracker timer stops and resets exactly at its configured boundary", () => {
  const stopping = new FakeMetronomeClock({
    trackerMode: "timer",
    trackerTimerTotalMs: 60000,
    trackerTimerStopWhenReached: true,
  });
  stopping.start();
  stopping.advance(59950);
  assert.equal(stopping.running, true);
  assert.equal(stopping.state.trackerElapsedMs, 59950);
  stopping.advance(50);
  assert.equal(stopping.running, false);
  assert.equal(stopping.state.trackerElapsedMs, 60000);
  assert.equal(stopping.stopEvents, 1);
  stopping.advance(60000);
  assert.equal(stopping.stopEvents, 1, "stopped timers cannot fire again");

  const resetting = new FakeMetronomeClock({
    trackerMode: "timer",
    trackerTimerTotalMs: 60000,
    trackerTimerResetWhenReached: true,
  });
  resetting.start();
  resetting.advance(60000);
  assert.equal(resetting.state.trackerElapsedMs, 0);
  assert.equal(resetting.running, true);
  resetting.advance(60000);
  assert.equal(resetting.state.trackerElapsedMs, 0, "reset timers start a clean next cycle");
});

test("Tracker bar limits stop or reset once at the exact completed bar", () => {
  const stopping = new FakeMetronomeClock({
    trackerMode: "bars",
    trackerBarLimitEnabled: true,
    trackerBarLimit: 4,
    trackerBarStopWhenReached: true,
  });
  stopping.start();
  stopping.advance(7950);
  assert.equal(stopping.running, true);
  assert.equal(stopping.state.trackerBars, 3);
  stopping.advance(50);
  assert.equal(stopping.running, false);
  assert.equal(stopping.state.trackerBars, 4);
  assert.equal(stopping.stopEvents, 1);

  const resetting = new FakeMetronomeClock({
    trackerMode: "bars",
    trackerBarLimitEnabled: true,
    trackerBarLimit: 4,
    trackerBarResetWhenReached: true,
  });
  resetting.start();
  resetting.advance(8000);
  assert.equal(resetting.running, true);
  assert.equal(resetting.state.trackerBars, 0);
  resetting.advance(8000);
  assert.equal(resetting.state.trackerBars, 0, "bar reset starts one clean next cycle");
});

test("Reset removes partial Automator and Tracker schedules", () => {
  const clock = new FakeMetronomeClock({
    automatorMode: "time",
    automatorEveryMs: 30000,
    trackerMode: "timer",
    trackerTimerTotalMs: 60000,
  });
  clock.start();
  clock.advance(29950);
  clock.reset();
  clock.start();
  clock.advance(50);
  assert.equal(clock.autoChanges.length, 0);
  assert.equal(clock.state.trackerElapsedMs, 50);
  clock.advance(29950);
  assert.equal(clock.configuration.bpm, 121, "a reset Automator waits for its complete new interval");
});

test("Stop and restart preserve Tracker totals but restart the Automator interval once", () => {
  const clock = new FakeMetronomeClock({
    automatorMode: "time",
    automatorEveryMs: 30000,
    trackerMode: "timer",
  });
  clock.start();
  clock.advance(20000);
  clock.stop();
  clock.advance(90000);
  assert.equal(clock.state.trackerElapsedMs, 20000);
  assert.equal(clock.autoChanges.length, 0);

  clock.restart();
  clock.advance(29950);
  assert.equal(clock.autoChanges.length, 0);
  assert.equal(clock.state.trackerElapsedMs, 49950);
  clock.advance(50);
  assert.equal(clock.autoChanges.length, 1);
  assert.equal(clock.state.trackerElapsedMs, 50000);
});

test("Coach Mode produces exact Sound/Mute cycles for 1, 2, 4, and 8 bars", () => {
  for (const playBars of [1, 2, 4, 8]) {
    for (const muteBars of [1, 2, 4, 8]) {
      let state = createMetronomeRuntimeState();
      const configuration = {
        ...BASE_CONFIGURATION,
        coachEnabled: true,
        coachPlayBars: playBars,
        coachMuteBars: muteBars,
      };
      const cycle = playBars + muteBars;
      const observed = [];
      for (let bar = 0; bar < cycle * 2; bar += 1) {
        const sample = advanceMetronomeRuntime(state, bar === 0 ? 0 : 2000, configuration);
        state = sample.state;
        observed.push(state.coachMuted ? "mute" : "sound");
      }
      const expected = Array.from({ length: cycle * 2 }, (_, bar) => (
        bar % cycle >= playBars ? "mute" : "sound"
      ));
      assert.deepEqual(observed, expected, `${playBars}/${muteBars} Coach cycle must be exact`);
    }
  }
});

test("BPM and time-signature changes preserve bar progress without jumps", () => {
  let state = createMetronomeRuntimeState();
  let frame = advanceMetronomeRuntime(state, 1000, { ...BASE_CONFIGURATION, bpm: 120, beatsPerMeasure: 4 });
  state = frame.state;
  assert.equal(state.completedBars, 0);
  assert.equal(state.measureProgress, 0.5);

  frame = advanceMetronomeRuntime(state, 2000, { ...BASE_CONFIGURATION, bpm: 60, beatsPerMeasure: 4 });
  state = frame.state;
  assert.equal(state.completedBars, 1, "slower BPM completes only the remaining half bar");
  assert.equal(state.measureProgress, 0);

  frame = advanceMetronomeRuntime(state, 3000, { ...BASE_CONFIGURATION, bpm: 60, beatsPerMeasure: 3 });
  assert.equal(frame.state.completedBars, 2, "3/4 at 60 BPM completes one bar in three seconds");
  assert.equal(frame.state.measureProgress, 0);
});

test("standalone metronome owns one cancellable animation loop across screen changes", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const runtimeBlock = source.slice(
    source.indexOf("const runMetronomeFrame"),
    source.indexOf("const animationLoop ="),
  );
  const loopEffectStart = source.indexOf("const animationLoopActive");
  const loopEffectBlock = source.slice(
    loopEffectStart,
    source.indexOf("const visibleFrets", loopEffectStart),
  );

  assert.match(runtimeBlock, /advanceMetronomeRuntime\(metronomeRuntimeRef\.current, deltaMs/);
  assert.doesNotMatch(runtimeBlock, /setInterval|setTimeout|addEventListener/);
  assert.match(loopEffectBlock, /if \(!animationLoopActive\)[\s\S]*cancelAnimationFrame\(rafRef\.current\)/);
  assert.match(loopEffectBlock, /rafRef\.current = requestAnimationFrame\(animationLoop\)/);
  assert.match(loopEffectBlock, /return \(\) => \{[\s\S]*cancelAnimationFrame\(rafRef\.current\)/);
  assert.match(source, /const syncMetronomeTrackerFromRuntime[\s\S]*runtime\.trackerElapsedMs/);
  assert.match(source, /const stopMetronomePlayback[\s\S]*syncMetronomeTrackerFromRuntime\(\)/);
  assert.match(source, /const showTunerMode[\s\S]*appModeRef\.current === APP_MODES\.METRONOME[\s\S]*syncMetronomeTrackerFromRuntime\(\)/);
});
