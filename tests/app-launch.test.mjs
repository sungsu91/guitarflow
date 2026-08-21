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
  assert.ok(APP_LAUNCH_TIMINGS.readySettleMs >= 160);
  assert.ok(APP_LAUNCH_TIMINGS.readySettleMs <= 260);
  assert.ok(APP_LAUNCH_TIMINGS.fallbackMs > APP_LAUNCH_TIMINGS.minimumIntroMs);
  assert.ok(APP_LAUNCH_TIMINGS.fallbackMs >= 10000);
  assert.ok(APP_LAUNCH_TIMINGS.exitMs <= 400);
});

test("launch screen uses the original transparent master logo", () => {
  const logo = readFileSync(path.join(projectRoot, "public/assets/branding/just-play-master-logo.png"));
  const splashSource = readFileSync(path.join(projectRoot, "src/launch/SplashIntro.jsx"), "utf8");
  const indexSource = readFileSync(path.join(projectRoot, "index.html"), "utf8");

  assert.deepEqual([...logo.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(logo.readUInt32BE(16), 1254);
  assert.equal(logo.readUInt32BE(20), 1254);
  assert.equal(logo[25], 6);
  assert.equal(
    createHash("sha256").update(logo).digest("hex"),
    "21b0905a7b0c36d82835c07a562aa7e5346130ac3b13b4dc6b319b20df08c220",
  );
  assert.match(splashSource, /APP_MASTER_LOGO_SRC = "\/assets\/branding\/just-play-master-logo\.png\?v=21b0905a"/);
  assert.equal((splashSource.match(/<image/g) ?? []).length, 1);
  assert.match(indexSource, /<link rel="preload" as="image" href="\/assets\/branding\/just-play-master-logo\.png\?v=21b0905a" fetchpriority="high"/);
});
