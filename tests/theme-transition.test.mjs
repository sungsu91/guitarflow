import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const splashSource = await readFile(new URL("../src/launch/SplashIntro.jsx", import.meta.url), "utf8");
const splashStyles = await readFile(new URL("../src/launch/splash-intro.css", import.meta.url), "utf8");
const polishStyles = await readFile(new URL("../src/polish.css", import.meta.url), "utf8");

test("theme changes advance the shared launch logo through the storyboard milestones", () => {
  assert.match(appSource, /function ThemeTransitionOverlay[\s\S]*?<SplashIntro/);
  assert.match(appSource, /phase: "covering",\s*progress: 0/);

  for (const progress of [25, 55, 80, 100]) {
    assert.match(appSource, new RegExp(`progress: ${progress}`));
  }

  assert.match(appSource, /readyPromise=\{transition\.readyPromise\}/);
  assert.match(appSource, /resolveReady\?\.\("theme-ready"\)/);
  assert.match(appSource, /classList\.add\("app-is-theme-loading"\)/);
  assert.match(splashStyles, /html\.app-is-theme-loading[\s\S]*?overflow: hidden/);
});

test("controlled splash reveals one high-resolution master asset with lightweight stages", () => {
  const masterImageReferences = splashSource.match(/href=\{APP_MASTER_LOGO_SRC\}/g) ?? [];

  assert.equal(masterImageReferences.length, 1);
  assert.match(splashSource, /const JUST_PIECE_CLIP_PATH/);
  assert.match(splashSource, /const PLAY_PIECE_CLIP_PATH/);
  assert.match(splashSource, /launchSplash__piece--visible/);
  assert.match(splashSource, /role="progressbar"/);
  assert.match(splashSource, /launchSplash--step-\$\{progressStep\}/);
  assert.match(splashStyles, /\.launchSplash--controlled/);
  assert.match(splashStyles, /\.launchSplash--controlled \.launchSplash__piece[\s\S]*?transition:/);
  assert.match(splashStyles, /transform:/);
  assert.match(splashStyles, /opacity:/);
  assert.match(splashStyles, /clip-path:/);
  assert.doesNotMatch(splashStyles, /launchSplash__maskJust/);
  assert.doesNotMatch(polishStyles, /\.themeTransitionOverlay/);
});

test("theme storyboard timing stays compact", () => {
  const timingBlock = appSource.match(
    /const THEME_TRANSITION_TIMINGS = Object\.freeze\(\{([\s\S]*?)\}\);/,
  );

  assert.ok(timingBlock, "theme transition timing block is present");
  const timings = [...timingBlock[1].matchAll(/\w+Ms:\s*(\d+)/g)].map((match) => Number(match[1]));

  assert.equal(timings.length, 5);
  assert.ok(timings.every((duration) => duration >= 100 && duration <= 250));
  assert.ok(timings.reduce((total, duration) => total + duration, 0) <= 1000);
});
