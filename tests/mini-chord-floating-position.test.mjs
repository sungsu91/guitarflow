import test from "node:test";
import assert from "node:assert/strict";

import {
  clampMiniChordFloatingPosition,
  getMiniChordFloatingEditorPosition,
} from "../src/mini-chord/floatingPosition.js";

test("floating chord picker drag stays inside the active viewport", () => {
  assert.deepEqual(clampMiniChordFloatingPosition({
    left: -200,
    top: -100,
    width: 284,
    height: 420,
    viewportWidth: 390,
    viewportHeight: 844,
    margin: 8,
  }), { left: 8, top: 8 });

  assert.deepEqual(clampMiniChordFloatingPosition({
    left: 900,
    top: 900,
    width: 284,
    height: 420,
    viewportWidth: 390,
    viewportHeight: 844,
    margin: 8,
  }), { left: 98, top: 416 });
});

test("floating chord editor prefers above the measure and avoids mobile navigation", () => {
  assert.deepEqual(getMiniChordFloatingEditorPosition({
    anchorRect: { left: 150, right: 230, top: 500, bottom: 564 },
    viewportWidth: 390,
    viewportHeight: 844,
    bottomInset: 92,
  }), {
    anchorX: 142,
    left: 48,
    maxHeight: 420,
    placement: "above",
    position: "fixed",
    top: 72,
    width: 284,
  });
});

test("floating chord editor falls below a high measure and remains in bounds", () => {
  assert.deepEqual(getMiniChordFloatingEditorPosition({
    anchorRect: { left: 18, right: 98, top: 60, bottom: 124 },
    viewportWidth: 390,
    viewportHeight: 844,
    bottomInset: 92,
  }), {
    anchorX: 50,
    left: 8,
    maxHeight: 420,
    placement: "below",
    position: "fixed",
    top: 132,
    width: 284,
  });
});
