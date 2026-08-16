import assert from "node:assert/strict";
import test from "node:test";

import { APP_LAUNCH_TIMINGS, createAppLaunchController } from "../src/launch/appLaunch.js";

test("launch controller resolves readiness once without remounting app state", async () => {
  const controller = createAppLaunchController();

  assert.equal(controller.isReady, false);
  assert.equal(controller.markReady("initial-effects-complete"), true);
  assert.equal(controller.markReady("duplicate-effect"), false);
  assert.equal(await controller.readyPromise, "initial-effects-complete");
  assert.equal(controller.isReady, true);
});

test("launch timings keep a short real intro and a bounded fallback", () => {
  assert.ok(APP_LAUNCH_TIMINGS.minimumIntroMs >= 800);
  assert.ok(APP_LAUNCH_TIMINGS.minimumIntroMs <= 1200);
  assert.ok(APP_LAUNCH_TIMINGS.fallbackMs > APP_LAUNCH_TIMINGS.minimumIntroMs);
  assert.ok(APP_LAUNCH_TIMINGS.exitMs < APP_LAUNCH_TIMINGS.minimumIntroMs);
});
