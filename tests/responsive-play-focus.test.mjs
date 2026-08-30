import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getViewportProfile,
  getViewportProfileClassName,
  isLandscapePlayFocusMode,
  shouldGuardShooterOrientation,
} from "../src/layouts/viewportProfile.js";

function createWindow(options) {
  const { height, mobile = true, width } = options;
  const clientHeight = options.clientHeight ?? height;
  const clientWidth = options.clientWidth ?? width;
  const visualHeight = options.visualHeight ?? height;
  const visualWidth = options.visualWidth ?? width;
  return {
    document: { documentElement: { clientHeight, clientWidth } },
    innerHeight: height,
    innerWidth: width,
    matchMedia(query) {
      return { matches: query.includes("max-width") ? width <= 680 : false };
    },
    navigator: {
      maxTouchPoints: mobile ? 5 : 0,
      userAgent: mobile ? "Mozilla/5.0 (Linux; Android 16; Tablet) Mobile" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      userAgentData: { mobile },
    },
    visualViewport: { height: visualHeight, width: visualWidth },
  };
}

test("viewport profile follows the allocated CSS viewport across phone, tablet, and split sizes", () => {
  const phone = getViewportProfile(createWindow({ width: 390, height: 844 }));
  const tablet = getViewportProfile(createWindow({ width: 1180, height: 820 }));
  const split = getViewportProfile(createWindow({ width: 600, height: 720 }));

  assert.deepEqual(
    { orientation: phone.orientation, size: phone.size, mobile: phone.isMobileSurface },
    { orientation: "portrait", size: "compact", mobile: true },
  );
  assert.deepEqual(
    { orientation: tablet.orientation, size: tablet.size, mobile: tablet.isMobileSurface },
    { orientation: "landscape", size: "tablet", mobile: true },
  );
  assert.deepEqual(
    { orientation: split.orientation, size: split.size, mobile: split.isMobileSurface },
    { orientation: "portrait", size: "tablet", mobile: true },
  );
  assert.match(getViewportProfileClassName(tablet), /viewport-landscape viewport-tablet viewport-mobile-surface/);
});

test("scrollbar width does not move the 600px tablet breakpoint", () => {
  const viewport = getViewportProfile(createWindow({
    width: 600,
    height: 960,
    clientWidth: 585,
    visualWidth: 585,
  }));

  assert.equal(viewport.width, 600);
  assert.equal(viewport.size, "tablet");
});

test("landscape focus excludes editors and desktop shooter guard", () => {
  const mobileLandscape = getViewportProfile(createWindow({ width: 932, height: 430 }));
  const desktopLandscape = getViewportProfile(createWindow({ width: 1366, height: 768, mobile: false }));

  for (const mode of ["metronome", "practice", "tuner", "mini-chord-maker"]) {
    assert.equal(isLandscapePlayFocusMode(mode, mobileLandscape), true);
  }
  assert.equal(isLandscapePlayFocusMode("audio-studio", mobileLandscape), false);
  assert.equal(isLandscapePlayFocusMode("menu", mobileLandscape), false);
  assert.equal(shouldGuardShooterOrientation("shooter", mobileLandscape), true);
  assert.equal(shouldGuardShooterOrientation("shooter", desktopLandscape), false);
});

test("responsive implementation changes layout without orientation remount or storage migration", async () => {
  const [appSource, css] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/layouts/responsive-play-focus.css", import.meta.url), "utf8"),
  ]);

  assert.match(appSource, /getViewportProfileClassName\(viewportProfile\)/);
  assert.match(appSource, /appMode !== APP_MODES\.MINI_CHORD_MAKER \|\| miniChordPlaybackActive/);
  assert.match(appSource, /createPortal\(<ShooterOrientationOverlay \/>, document\.body\)/);
  assert.match(appSource, /gameStateRef\.current === GAME_STATES\.PLAYING[\s\S]*pauseGame\(\)/);
  assert.match(appSource, /gameStateRef\.current === GAME_STATES\.PAUSED[\s\S]*resumeGame\(\)/);
  assert.doesNotMatch(appSource, /key=\{(?:isLandscape|orientation|viewportProfile\.orientation)\}/);
  assert.doesNotMatch(appSource, /location\.reload\(\)/);
  assert.match(css, /100dvh/);
  assert.match(css, /env\(safe-area-inset-left/);
  assert.match(css, /\.landscapePlayFocus/);
  assert.match(css, /\.shooterOrientationOverlay/);
  assert.match(css, /animation-play-state: paused !important/);
});
