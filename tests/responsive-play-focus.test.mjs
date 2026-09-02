import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getViewportProfile,
  getViewportProfileClassName,
  getPortraitLockedViewportProfile,
  isLandscapePlayFocusMode,
  isMobileLandscapeAllowed,
  isPortraitOnlyMode,
  shouldGuardPortraitOrientation,
  shouldGuardShooterOrientation,
} from "../src/layouts/viewportProfile.js";

function createWindow(options) {
  const { height, mobile = true, width } = options;
  const clientHeight = options.clientHeight ?? height;
  const clientWidth = options.clientWidth ?? width;
  const mediaWidth = options.mediaWidth ?? width;
  const visualHeight = options.visualHeight ?? height;
  const visualScale = options.visualScale ?? 1;
  const visualWidth = options.visualWidth ?? width;
  return {
    document: { documentElement: { clientHeight, clientWidth } },
    innerHeight: height,
    innerWidth: width,
    matchMedia(query) {
      return { matches: query.includes("max-width") ? mediaWidth <= 680 : false };
    },
    navigator: {
      maxTouchPoints: mobile ? 5 : 0,
      userAgent: mobile ? "Mozilla/5.0 (Linux; Android 16; Tablet) Mobile" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      userAgentData: { mobile },
    },
    visualViewport: { height: visualHeight, scale: visualScale, width: visualWidth },
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

test("device emulation transition uses one coherent mobile viewport pair", () => {
  const viewport = getViewportProfile(createWindow({
    width: 1440,
    height: 900,
    clientWidth: 390,
    clientHeight: 844,
    mediaWidth: 390,
    visualWidth: 390,
    visualHeight: 844,
  }));

  assert.deepEqual(
    {
      height: viewport.height,
      mobile: viewport.isMobileSurface,
      orientation: viewport.orientation,
      size: viewport.size,
      width: viewport.width,
    },
    {
      height: 844,
      mobile: true,
      orientation: "portrait",
      size: "compact",
      width: 390,
    },
  );
});

test("scaled DevTools emulation follows the active CSS viewport in both directions", () => {
  const enteringMobile = getViewportProfile(createWindow({
    width: 1440,
    height: 900,
    clientWidth: 390,
    clientHeight: 844,
    mediaWidth: 390,
    visualWidth: 975,
    visualHeight: 2110,
    visualScale: 0.4,
  }));
  const returningDesktop = getViewportProfile(createWindow({
    width: 390,
    height: 844,
    clientWidth: 1440,
    clientHeight: 900,
    mediaWidth: 1440,
    visualWidth: 3600,
    visualHeight: 2250,
    visualScale: 0.4,
    mobile: false,
  }));
  const enteringMobileLandscape = getViewportProfile(createWindow({
    width: 1440,
    height: 900,
    clientWidth: 844,
    clientHeight: 390,
    mediaWidth: 844,
    visualWidth: 2110,
    visualHeight: 975,
    visualScale: 0.4,
  }));

  assert.deepEqual(
    { height: enteringMobile.height, orientation: enteringMobile.orientation, size: enteringMobile.size, width: enteringMobile.width },
    { height: 844, orientation: "portrait", size: "compact", width: 390 },
  );
  assert.deepEqual(
    { height: returningDesktop.height, orientation: returningDesktop.orientation, size: returningDesktop.size, width: returningDesktop.width },
    { height: 900, orientation: "landscape", size: "wide", width: 1440 },
  );
  assert.deepEqual(
    {
      height: enteringMobileLandscape.height,
      orientation: enteringMobileLandscape.orientation,
      size: enteringMobileLandscape.size,
      width: enteringMobileLandscape.width,
    },
    { height: 390, orientation: "landscape", size: "tablet", width: 844 },
  );
});

test("mobile keyboard and pinch zoom do not masquerade as orientation changes", () => {
  const keyboard = getViewportProfile(createWindow({
    width: 390,
    height: 844,
    visualWidth: 390,
    visualHeight: 340,
  }));
  const zoomed = getViewportProfile(createWindow({
    width: 390,
    height: 844,
    visualWidth: 195,
    visualHeight: 422,
    visualScale: 2,
  }));

  assert.deepEqual(
    { height: keyboard.height, orientation: keyboard.orientation, width: keyboard.width },
    { height: 844, orientation: "portrait", width: 390 },
  );
  assert.deepEqual(
    { height: zoomed.height, orientation: zoomed.orientation, width: zoomed.width },
    { height: 844, orientation: "portrait", width: 390 },
  );
});

test("rotation transition follows the viewport pair that has settled together", () => {
  const viewport = getViewportProfile(createWindow({
    width: 390,
    height: 844,
    clientWidth: 844,
    clientHeight: 390,
    mediaWidth: 844,
    visualWidth: 844,
    visualHeight: 390,
  }));

  assert.deepEqual(
    { height: viewport.height, orientation: viewport.orientation, width: viewport.width },
    { height: 390, orientation: "landscape", width: 844 },
  );
});

test("mobile landscape is limited to the implemented route whitelist", () => {
  const mobileLandscape = getViewportProfile(createWindow({ width: 932, height: 430 }));
  const desktopLandscape = getViewportProfile(createWindow({ width: 1366, height: 768, mobile: false }));

  for (const [mode, categoryId] of [
    ["fretboard-viewer", "open"],
    ["metronome", "open"],
    ["practice", "first-position"],
    ["practice", "scale-block"],
    ["practice", "rhythm"],
  ]) {
    assert.equal(isMobileLandscapeAllowed(mode, categoryId), true);
    assert.equal(isPortraitOnlyMode(mode, categoryId), false);
  }

  for (const [mode, categoryId] of [
    ["tuner", "open"],
    ["shooter", "open"],
    ["mini-chord-maker", "rhythm"],
    ["audio-studio", "open"],
    ["design-lab", "open"],
    ["curriculum", "rhythm"],
    ["menu", "open"],
    ["practice", "open"],
    ["practice", "melody"],
  ]) {
    assert.equal(isMobileLandscapeAllowed(mode, categoryId), false);
    assert.equal(isPortraitOnlyMode(mode, categoryId), true);
    assert.equal(shouldGuardPortraitOrientation(mode, mobileLandscape, categoryId), true);
    assert.equal(shouldGuardPortraitOrientation(mode, desktopLandscape, categoryId), false);
  }

  assert.equal(isLandscapePlayFocusMode("metronome", mobileLandscape, "open"), true);
  assert.equal(isLandscapePlayFocusMode("practice", mobileLandscape, "first-position"), true);
  assert.equal(isLandscapePlayFocusMode("practice", mobileLandscape, "scale-block"), true);
  assert.equal(isLandscapePlayFocusMode("practice", mobileLandscape, "rhythm"), true);
  assert.equal(isLandscapePlayFocusMode("fretboard-viewer", mobileLandscape, "open"), false);
  assert.equal(isLandscapePlayFocusMode("practice", mobileLandscape, "melody"), false);
  assert.equal(isLandscapePlayFocusMode("mini-chord-maker", mobileLandscape, "rhythm"), false);
  assert.equal(isLandscapePlayFocusMode("metronome", desktopLandscape, "open"), false);
  assert.equal(shouldGuardShooterOrientation("shooter", mobileLandscape), true);
  assert.equal(shouldGuardShooterOrientation("shooter", desktopLandscape), false);

  assert.deepEqual(
    getPortraitLockedViewportProfile(mobileLandscape),
    {
      ...mobileLandscape,
      height: 932,
      isLandscape: false,
      isShort: false,
      orientation: "portrait",
      size: "compact",
      width: 430,
    },
  );
});

test("responsive implementation changes layout without orientation remount or storage migration", async () => {
  const [appSource, css] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/layouts/responsive-play-focus.css", import.meta.url), "utf8"),
  ]);

  assert.match(appSource, /getPortraitLockedViewportProfile\(viewportProfile\)/);
  assert.match(
    appSource,
    /isLandscapePlayFocusMode\(\s*appMode,\s*viewportProfile,\s*selectedCategoryId,\s*\)/,
  );
  assert.doesNotMatch(appSource, /ShooterOrientationOverlay|슈팅게임은 세로 화면 전용입니다/);
  assert.match(appSource, /screenOrientation\.lock\?\.call\(screenOrientation, "portrait"\)/);
  assert.match(appSource, /appInteractionLocked \|\| portraitOrientationGuardActive/);
  assert.match(appSource, /gameStateRef\.current === GAME_STATES\.PLAYING[\s\S]*pauseGame\(\)/);
  assert.match(appSource, /gameStateRef\.current === GAME_STATES\.PAUSED[\s\S]*resumeGame\(\)/);
  assert.doesNotMatch(appSource, /key=\{(?:isLandscape|orientation|viewportProfile\.orientation)\}/);
  assert.doesNotMatch(appSource, /location\.reload\(\)/);
  assert.match(css, /100dvh/);
  assert.match(css, /env\(safe-area-inset-left/);
  assert.match(css, /\.landscapePlayFocus/);
  assert.match(css, /metronomeMode\.viewport-mobile-surface\.landscapePlayFocus > \.hud\.hud \{\s*display: none !important/);
  assert.match(css, /metronomeHeroCard\.metronomeHeroCard--interactive \{\s*grid-column: 1 \/ -1;\s*grid-row: 2/);
  assert.match(css, /\.referenceTrainingPanel \{[\s\S]*width: 100vw !important/);
  assert.match(css, /stage3ProgressHud\.stage3ProgressHud \{[\s\S]*grid-template-columns: minmax\(120px, 1fr\) auto !important/);
  assert.doesNotMatch(css, /tunerMode\.landscapePlayFocus|shooterOrientationOverlay/);
  assert.match(css, /animation-play-state: paused !important/);
});
