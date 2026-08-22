import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { APP_LAUNCH_TIMINGS, createAppLaunchController } from "../src/launch/appLaunch.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("launch controller resolves readiness once without remounting app state", async () => {
  const controller = createAppLaunchController();

  assert.equal(controller.isReady, false);
  assert.equal(controller.markReady("initial-effects-complete"), true);
  assert.equal(controller.markReady("duplicate-effect"), false);
  assert.equal(await controller.readyPromise, "initial-effects-complete");
  assert.equal(controller.isReady, true);
});

test("launch timings fast-forward ready apps and keep a bounded loading fallback", () => {
  assert.ok(APP_LAUNCH_TIMINGS.minimumIntroMs >= 200);
  assert.ok(APP_LAUNCH_TIMINGS.minimumIntroMs <= 400);
  assert.ok(APP_LAUNCH_TIMINGS.autonomousSequenceMs >= 1300);
  assert.ok(APP_LAUNCH_TIMINGS.autonomousSequenceMs <= 1600);
  assert.ok(APP_LAUNCH_TIMINGS.completeHoldMs >= 220);
  assert.ok(APP_LAUNCH_TIMINGS.completeHoldMs <= 320);
  assert.ok(APP_LAUNCH_TIMINGS.readySettleMs >= 160);
  assert.ok(APP_LAUNCH_TIMINGS.readySettleMs <= 260);
  assert.ok(APP_LAUNCH_TIMINGS.fallbackMs > APP_LAUNCH_TIMINGS.minimumIntroMs);
  assert.ok(APP_LAUNCH_TIMINGS.fallbackMs >= 10000);
  assert.ok(APP_LAUNCH_TIMINGS.exitMs <= 400);
});

test("launch screen preserves the four supplied FRETIVA LAB storyboard frames", () => {
  const expectedFrames = [
    ["fretiva-intro-01.png", 768, 1840, "07ceb7ec20407029613ffa35eb027ae5a9648661f5cabc232405b7b7eeb99611"],
    ["fretiva-intro-02.png", 768, 1840, "13de555db5fab8a5df7326c8921cc3061ae0c96eb6ceaaf7236b3520da01d107"],
    ["fretiva-intro-03.png", 768, 1840, "118951037210271199d734c6823986c88f307e9a0093fb86c35232df2f7b4073"],
    ["fretiva-intro-04.png", 768, 1840, "118951037210271199d734c6823986c88f307e9a0093fb86c35232df2f7b4073"],
  ];
  const splashSource = readFileSync(path.join(projectRoot, "src/launch/SplashIntro.jsx"), "utf8");
  const indexSource = readFileSync(path.join(projectRoot, "index.html"), "utf8");

  for (const [filename, width, height, hash] of expectedFrames) {
    const frame = readFileSync(path.join(projectRoot, "public/assets/branding", filename));
    assert.deepEqual([...frame.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(frame.readUInt32BE(16), width);
    assert.equal(frame.readUInt32BE(20), height);
    assert.equal(frame[25], 2);
    assert.equal(createHash("sha256").update(frame).digest("hex"), hash);
    assert.match(splashSource, new RegExp(filename.replace(".", "\\.") + "\\?v="));
  }

  assert.equal((splashSource.match(/<img/g) ?? []).length, 1);
  assert.match(splashSource, /INTRO_FRAMES\.map/);
  assert.match(splashSource, /autonomousCompletionRemainingMs/);
  assert.match(splashSource, /Math\.max\(readySettleMs, autonomousCompletionRemainingMs\)/);
  assert.doesNotMatch(splashSource, /just-play-master-logo/);
  assert.match(indexSource, /<link rel="preload" as="image" href="\/assets\/branding\/fretiva-intro-01\.png\?v=07ceb7ec" fetchpriority="high"/);
  assert.equal((indexSource.match(/fretiva-intro-\d{2}\.png\?v=/g) ?? []).length, 4);
});
