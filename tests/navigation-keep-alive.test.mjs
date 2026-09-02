import assert from "node:assert/strict";
import test from "node:test";

import {
  createMountedModeSet,
  getCachedModeElement,
  getModeActivityState,
  isNavigationKeepAliveMode,
  registerMountedMode,
  shouldMountMode,
} from "../src/navigation/keepAlive.js";

test("keep-alive modes lazy mount only after their first visit", () => {
  const initialModes = createMountedModeSet("practice");

  assert.deepEqual([...initialModes], ["practice"]);
  assert.equal(shouldMountMode("practice", initialModes, "metronome"), false);

  const afterMetronomeVisit = registerMountedMode(initialModes, "metronome");
  assert.deepEqual([...afterMetronomeVisit], ["practice", "metronome"]);
  const afterTunerVisit = registerMountedMode(afterMetronomeVisit, "tuner");
  assert.deepEqual([...afterTunerVisit], ["practice", "metronome", "tuner"]);
  assert.equal(shouldMountMode("fretboard-viewer", afterMetronomeVisit, "metronome"), true);
  assert.equal(getModeActivityState("fretboard-viewer", "metronome"), "hidden");
  assert.equal(getModeActivityState("tuner", "metronome"), "hidden");
});

test("lightweight and internal screens remain regular mount-on-demand routes", () => {
  const mountedModes = createMountedModeSet("menu");
  const afterDesignLabVisit = registerMountedMode(mountedModes, "design-lab");

  assert.equal(afterDesignLabVisit, mountedModes);
  assert.equal(shouldMountMode("menu", mountedModes, "menu"), true);
  assert.equal(shouldMountMode("practice", mountedModes, "menu"), false);
});

test("registering an already mounted mode keeps set identity stable", () => {
  const mountedModes = createMountedModeSet("mini-chord-maker");

  assert.equal(registerMountedMode(mountedModes, "mini-chord-maker"), mountedModes);
  assert.equal(getModeActivityState("mini-chord-maker", "mini-chord-maker"), "visible");
});

test("shooter unmounts outside its active route so maps do not render in the background", () => {
  const mountedModes = new Set(["practice", "shooter"]);

  assert.equal(isNavigationKeepAliveMode("shooter"), false);
  assert.equal(shouldMountMode("practice", mountedModes, "shooter"), false);
  assert.equal(shouldMountMode("shooter", mountedModes, "shooter"), true);
});

test("tuner keeps its local UI state after the first visit without staying active", () => {
  const mountedModes = registerMountedMode(createMountedModeSet("fretboard-viewer"), "tuner");

  assert.equal(isNavigationKeepAliveMode("tuner"), true);
  assert.equal(shouldMountMode("metronome", mountedModes, "tuner"), true);
  assert.equal(getModeActivityState("metronome", "tuner"), "hidden");
});

test("hidden screens reuse their last element without rebuilding the subtree", () => {
  const elementCache = new Map();
  let renderCount = 0;
  const createElement = () => ({ render: ++renderCount });

  const activeElement = getCachedModeElement("fretboard-viewer", elementCache, "fretboard-viewer", createElement);
  const hiddenElement = getCachedModeElement("metronome", elementCache, "fretboard-viewer", createElement);

  assert.equal(renderCount, 1);
  assert.equal(hiddenElement, activeElement);
  assert.deepEqual(hiddenElement, { render: 1 });
});
