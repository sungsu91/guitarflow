import assert from "node:assert/strict";
import { readFile } from './helpers/i18n-source.mjs';
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const splashStyles = await readFile(new URL("../src/launch/splash-intro.css", import.meta.url), "utf8");

test("theme changes keep the shared readiness and progress handoff", () => {
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

test("theme transition timing stays compact", () => {
  const timingBlock = appSource.match(
    /const THEME_TRANSITION_TIMINGS = Object\.freeze\(\{([\s\S]*?)\}\);/,
  );

  assert.ok(timingBlock, "theme transition timing block is present");
  const timings = [...timingBlock[1].matchAll(/\w+Ms:\s*(\d+)/g)].map((match) => Number(match[1]));

  assert.equal(timings.length, 5);
  assert.ok(timings.every((duration) => duration >= 100 && duration <= 250));
  assert.ok(timings.reduce((total, duration) => total + duration, 0) <= 1000);
});
