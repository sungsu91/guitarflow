import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SHOOTER_MOBILE_CANVAS_HEIGHT,
  SHOOTER_MOBILE_CANVAS_WIDTH,
  getShooterMobileViewportFrame,
} from "../src/shooter/mobileViewportFrame.js";

test("430 x 932 development preview is the unscaled shooter canvas", () => {
  assert.deepEqual(getShooterMobileViewportFrame({
    viewportHeight: 932,
    viewportWidth: 430,
  }), {
    height: 932,
    left: 0,
    scale: 1,
    top: 0,
    width: 430,
  });
});

test("short phone viewports uniformly fit the complete development canvas", () => {
  const frame = getShooterMobileViewportFrame({
    viewportHeight: 880,
    viewportWidth: 430,
  });
  const expectedScale = 880 / SHOOTER_MOBILE_CANVAS_HEIGHT;

  assert.ok(Math.abs(frame.scale - expectedScale) < 1e-12);
  assert.ok(Math.abs(frame.height - 880) < 1e-9);
  assert.ok(Math.abs(frame.width - SHOOTER_MOBILE_CANVAS_WIDTH * expectedScale) < 1e-9);
  assert.ok(Math.abs(frame.left - (430 - frame.width) / 2) < 1e-9);
  assert.equal(frame.top, 0);
});

test("narrow phones preserve every authored normalized position", () => {
  const frame = getShooterMobileViewportFrame({
    viewportHeight: 844,
    viewportWidth: 390,
  });
  const authoredPoint = { x: 215, y: 760 };
  const renderedPoint = {
    x: frame.left + authoredPoint.x * frame.scale,
    y: frame.top + authoredPoint.y * frame.scale,
  };

  assert.ok(Math.abs((renderedPoint.x - frame.left) / frame.scale - authoredPoint.x) < 1e-9);
  assert.ok(Math.abs((renderedPoint.y - frame.top) / frame.scale - authoredPoint.y) < 1e-9);
  assert.ok(Math.abs(frame.width / frame.height - SHOOTER_MOBILE_CANVAS_WIDTH / SHOOTER_MOBILE_CANVAS_HEIGHT) < 1e-12);
});

test("unfolded and rotated foldables fit the same complete canvas without cropping", () => {
  for (const viewport of [
    { viewportHeight: 904, viewportWidth: 768 },
    { viewportHeight: 768, viewportWidth: 904 },
  ]) {
    const frame = getShooterMobileViewportFrame(viewport);
    assert.ok(frame.width <= viewport.viewportWidth + 1e-9);
    assert.ok(frame.height <= viewport.viewportHeight + 1e-9);
    assert.ok(Math.abs(frame.width / frame.height - SHOOTER_MOBILE_CANVAS_WIDTH / SHOOTER_MOBILE_CANVAS_HEIGHT) < 1e-12);
    assert.ok(frame.left >= 0);
    assert.ok(frame.top >= 0);
  }
});

test("shooter route applies the canonical frame to the entire app surface", async () => {
  const [appSource, runtimeSource, styles] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/AppRuntime.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/mobile-canonical-viewport.css", import.meta.url), "utf8"),
  ]);

  assert.match(appSource, /useShooterMobileViewport/);
  assert.match(appSource, /style=\{shooterMobileViewportStyle\}/);
  assert.match(runtimeSource, /mobile-canonical-viewport\.css/);
  assert.match(styles, /width: 430px !important/);
  assert.match(styles, /height: 932px !important/);
  assert.match(styles, /transform: scale\(var\(--shooter-mobile-canvas-scale, 1\)\) !important/);
  assert.match(styles, /--shooter-mobile-nav-space: 88px/);
  assert.match(styles, /\.shooterCenterStatus\.shooterCenterStatus--pauseMenu/);
  assert.match(styles, /\.utilityMenuPanel/);
});
