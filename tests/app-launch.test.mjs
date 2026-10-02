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

test("refresh keeps the requested three-second intro without waiting for a full motion loop", () => {
  assert.equal(APP_LAUNCH_TIMINGS.minimumIntroMs, 3000);
  assert.equal(APP_LAUNCH_TIMINGS.readySettleMs, 0);
  assert.ok(APP_LAUNCH_TIMINGS.exitMs <= 400);
  assert.ok(APP_LAUNCH_TIMINGS.fallbackMs >= 10000);
});
