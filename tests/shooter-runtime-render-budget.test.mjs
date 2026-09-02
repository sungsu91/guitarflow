import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), "utf8");

test("normal localhost gameplay does not mount the navigation mutation profiler", async () => {
  const source = await readSource("../src/AppRuntime.jsx");

  assert.match(source, /get\("profileNavigation"\) === "1"/);
  assert.match(source, /navigationPerformanceProbeEnabled \? \(/);
  assert.match(source, /begin\(label\) \{[\s\S]*observeMutations\(\)/);
  assert.match(source, /finish\([\s\S]*observer\.disconnect\(\)/);
  assert.equal(source.match(/observer\.observe\(/g)?.length, 1);
});

test("map sprite work is scheduled at authored cadence and heavy canvases are bounded", async () => {
  const [renderer, abyssal, clockwork, autumn] = await Promise.all([
    readSource("../src/shooter/maps/MapSkinRenderer.jsx"),
    readSource("../src/shooter/maps/AbyssalMoonRuntimeField.jsx"),
    readSource("../src/shooter/maps/ClockworkAmbientField.jsx"),
    readSource("../src/shooter/maps/AutumnMoonTemplePathField.jsx"),
  ]);

  assert.match(renderer, /framesPerSecond: Math\.min\(30, Math\.max\(1, framesPerSecond \* playbackSpeed\)\)/);
  assert.match(abyssal, /framesPerSecond: 30/);
  assert.match(clockwork, /framesPerSecond: 20/);
  assert.match(autumn, /image\.decode\(\)\.then\(markReady\)/);
  assert.doesNotMatch(autumn, /setInterval|useState/);
});

test("inactive map and player ambience pauses while combat timing remains RAF-driven", async () => {
  const [app, mapStyles, styles] = await Promise.all([
    readSource("../src/App.jsx"),
    readSource("../src/shooter/maps/map-skins.css"),
    readSource("../src/style.css"),
  ]);

  assert.match(mapStyles, /shooterMapSkinStage\[data-animations-active="false"\][\s\S]*animation-play-state: paused !important/);
  assert.match(styles, /shooterArena:is\(\.paused, \.shooterArena--animationsPaused\)[\s\S]*guitarPlayerEffectLayer--animated img[\s\S]*animation-play-state: paused !important/);
  assert.match(app, /const animationLoop = useCallback[\s\S]*requestAnimationFrame\(animationLoop\)/);
  assert.match(app, /getMicrophoneSignalDisplayBand\(currentLevel\) === getMicrophoneSignalDisplayBand\(normalizedLevel\)/);
});

test("desktop game-over and responsive shell retain bounded platform-specific UI", async () => {
  const [layout, layoutStyles] = await Promise.all([
    readSource("../src/layouts/DesktopLayout.jsx"),
    readSource("../src/layouts/desktop-layout.css"),
  ]);

  assert.match(layout, /useLayoutEffect/);
  assert.match(layout, /isDesktopLayout \? "desktopLayout" : "mobileLayoutShell"/);
  assert.doesNotMatch(layout, /if \(!isDesktopLayout\) return children/);
  assert.match(layoutStyles, /desktopLayout \.shooterCenterStatus\.gameOver[\s\S]*width: 164px !important/);
  assert.match(layoutStyles, /gameOver > strong[\s\S]*font-size: 24px !important/);
});
