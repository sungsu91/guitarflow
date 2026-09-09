import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SHOOTER_MOBILE_CANVAS_HEIGHT,
  SHOOTER_MOBILE_CANVAS_WIDTH,
  getShooterMobileViewportFrame,
  getShooterMobileViewportSnapshot,
} from "../src/shooter/mobileViewportFrame.js";

function createViewportWindow({
  clientHeight,
  clientWidth,
  innerHeight,
  innerWidth,
  mediaMatches = false,
  mobile = false,
  visualHeight,
  visualScale = 1,
  visualWidth,
}) {
  return {
    document: { documentElement: { clientHeight, clientWidth } },
    innerHeight,
    innerWidth,
    matchMedia: () => ({ matches: mediaMatches }),
    navigator: {
      maxTouchPoints: mobile ? 5 : 0,
      userAgent: mobile ? "mobile-test Android" : "desktop-test",
    },
    visualViewport: {
      height: visualHeight,
      offsetLeft: 0,
      offsetTop: 0,
      scale: visualScale,
      width: visualWidth,
    },
  };
}

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

test("device emulation uses one coherent viewport pair during desktop-to-mobile transition", () => {
  const frame = getShooterMobileViewportSnapshot(createViewportWindow({
    clientHeight: 896,
    clientWidth: 414,
    innerHeight: 900,
    innerWidth: 1440,
    mediaMatches: true,
    visualHeight: 2240,
    visualScale: 0.4,
    visualWidth: 1035,
  }));
  const expectedScale = Math.min(
    414 / SHOOTER_MOBILE_CANVAS_WIDTH,
    896 / SHOOTER_MOBILE_CANVAS_HEIGHT,
  );

  assert.ok(Math.abs(frame.scale - expectedScale) < 1e-12);
  assert.ok(frame.left >= 0);
  assert.ok(frame.height <= 896);
});

test("a stale visual viewport height cannot inflate the inverse-scaled mobile navigation", () => {
  const frame = getShooterMobileViewportSnapshot(createViewportWindow({
    clientHeight: 896,
    clientWidth: 414,
    innerHeight: 896,
    innerWidth: 414,
    mediaMatches: true,
    visualHeight: 360,
    visualScale: 1,
    visualWidth: 414,
  }));

  assert.ok(frame.scale > 0.9);
  assert.ok(1 / frame.scale < 1.1);
});

test("mobile landscape rotates one full portrait canvas instead of shrinking an upright copy", () => {
  const frame = getShooterMobileViewportSnapshot(createViewportWindow({
    clientHeight: 430,
    clientWidth: 932,
    innerHeight: 430,
    innerWidth: 932,
    mediaMatches: false,
    mobile: true,
    visualHeight: 430,
    visualWidth: 932,
  }));

  assert.equal(frame.rotation, 90);
  assert.equal(frame.scale, 1);
  assert.equal(frame.left, 932);
  assert.equal(frame.top, 0);
  assert.equal(frame.height, 932);
  assert.equal(frame.width, 430);
});

test("shooter route applies the canonical frame to the entire app surface", async () => {
  const [appSource, runtimeSource, viewportSource, styles] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/AppRuntime.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/useShooterMobileViewport.js", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/mobile-canonical-viewport.css", import.meta.url), "utf8"),
  ]);

  assert.match(appSource, /useShooterMobileViewport/);
  assert.match(appSource, /\(appMode === APP_MODES\.SHOOTER \|\| appMode === APP_MODES\.TUNER\)[\s\S]*&& isMobileLayout[\s\S]*&& !mobileLandscapeShooterActive/);
  assert.match(appSource, /const portraitOrientationGuardActive = !mobileLandscapeShooterSelected[\s\S]*&& shouldGuardPortraitOrientation/);
  assert.match(appSource, /style=\{shooterMobileViewportStyle\}/);
  assert.match(runtimeSource, /mobile-canonical-viewport\.css/);
  assert.match(styles, /width: 430px !important/);
  assert.match(styles, /height: 932px !important/);
  assert.match(styles, /--shooter-mobile-canvas-transform/);
  assert.match(viewportSource, /rotate\(\$\{frame\.rotation\}deg\) scale/);
  assert.match(styles, /main\.app\.app\.app\.tunerMode/);
  assert.match(styles, /--shooter-mobile-nav-space: 88px/);
  assert.match(viewportSource, /--shooter-mobile-nav-inverse-scale/);
  assert.match(styles, /scale\(var\(--shooter-mobile-nav-inverse-scale, 1\)\)/);
  assert.match(styles, /transform-origin: bottom center !important/);
  assert.match(styles, /\.shooterCenterStatus\.shooterCenterStatus--pauseMenu/);
  assert.match(styles, /\.utilityMenuPanel/);
  assert.match(styles, /html\.shooterCanonicalMobile[\s\S]*?\.shooterStartPanelButton:is\(\.shooterStartPanelButton--primary, \.shooterStartPanelButton--secondary\)/);
  assert.match(styles, /min-height: 48px !important/);
  assert.match(styles, /border: 1px solid rgba\(255, 218, 139, 0\.52\) !important/);
  assert.match(styles, /linear-gradient\(180deg, rgba\(34, 30, 23, 0\.72\), rgba\(5, 10, 13, 0\.68\)\) !important/);
});
