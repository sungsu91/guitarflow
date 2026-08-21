import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SHOOTER_MAP_MOBILE_RENDER_BUDGET,
  getShooterMapPerformancePolicy,
  getShooterMapPerformanceFingerprint,
  getShooterMapRuntimePerformance,
  isShooterMapMobileAuditWithinBudget,
} from "../src/shooter/maps/performancePolicy.js";
import { COASTAL_COVE_MAP_SKIN } from "../src/shooter/maps/skins/coastalCove.js";
import { LAVA_CANYON_MAP_SKIN } from "../src/shooter/maps/skins/lavaCanyon.js";
import { PARK_MAP_SKIN } from "../src/shooter/maps/skins/park.js";
import { RIVER_MAP_SKIN } from "../src/shooter/maps/skins/river.js";

test("mobile map policy allows only audited effects that fit the common render budget", () => {
  assert.deepEqual(SHOOTER_MAP_MOBILE_RENDER_BUDGET, {
    activeCssAnimations: 8,
    ambientEventLayers: 0,
    filteredElements: 10,
    particleElements: 0,
    sharedSpriteSubscribers: 8,
  });

  for (const map of [RIVER_MAP_SKIN, COASTAL_COVE_MAP_SKIN, PARK_MAP_SKIN]) {
    assert.equal(isShooterMapMobileAuditWithinBudget(map.performance.mobileGameplay.audit), true);
    assert.equal(getShooterMapPerformancePolicy(map).mobileGameplayEffects, "full");
  }

  assert.equal(
    isShooterMapMobileAuditWithinBudget(LAVA_CANYON_MAP_SKIN.performance.mobileGameplay.audit),
    false,
  );
  assert.equal(getShooterMapPerformancePolicy(LAVA_CANYON_MAP_SKIN).mobileGameplayEffects, "reduced");
});

test("new and incomplete maps fail closed to reduced mobile gameplay effects", () => {
  const futureMap = { id: "future-map", kind: "layered" };
  const unauditedFullMap = {
    id: "unaudited-full-map",
    kind: "layered",
    performance: { mobileGameplay: { mode: "full" } },
  };
  const overBudgetFullMap = {
    id: "over-budget-full-map",
    kind: "layered",
    performance: {
      mobileGameplay: {
        mode: "full",
        audit: {
          completed: true,
          activeCssAnimations: 9,
          ambientEventLayers: 0,
          filteredElements: 0,
          particleElements: 0,
          sharedSpriteSubscribers: 0,
        },
      },
    },
  };

  assert.equal(getShooterMapPerformancePolicy(futureMap).mobileGameplayEffects, "reduced");
  assert.equal(getShooterMapPerformancePolicy(unauditedFullMap).mobileGameplayEffects, "reduced");
  assert.equal(getShooterMapPerformancePolicy(overBudgetFullMap).mobileGameplayEffects, "reduced");
});

test("an audited map falls back to reduced effects when its content changes", () => {
  const changedPark = {
    ...PARK_MAP_SKIN,
    layout: [
      ...PARK_MAP_SKIN.layout,
      { instanceId: "future-effect", assetId: "future-effect", x: 0.5, y: 0.5 },
    ],
  };

  assert.notEqual(
    getShooterMapPerformanceFingerprint(changedPark),
    PARK_MAP_SKIN.performance.mobileGameplay.audit.contentFingerprint,
  );
  assert.equal(getShooterMapPerformancePolicy(changedPark).mobileGameplayEffects, "reduced");
});

test("reduced effects apply only to mobile gameplay and never to the editor", () => {
  const mobilePlay = getShooterMapRuntimePerformance({
    isMobileLayout: true,
    isPlaying: true,
    map: LAVA_CANYON_MAP_SKIN,
  });
  assert.deepEqual(mobilePlay, {
    ambientEventsActive: false,
    animationsActive: false,
    reduceEffects: true,
  });

  assert.equal(getShooterMapRuntimePerformance({
    isMobileLayout: true,
    isPlaying: false,
    map: LAVA_CANYON_MAP_SKIN,
  }).reduceEffects, false);
  assert.equal(getShooterMapRuntimePerformance({
    isEditing: true,
    isMobileLayout: true,
    isPlaying: true,
    map: LAVA_CANYON_MAP_SKIN,
  }).reduceEffects, false);
  assert.equal(getShooterMapRuntimePerformance({
    isMobileLayout: false,
    isPlaying: true,
    map: LAVA_CANYON_MAP_SKIN,
  }).reduceEffects, false);
  assert.equal(getShooterMapRuntimePerformance({
    isMobileLayout: true,
    isPlaying: true,
    map: PARK_MAP_SKIN,
  }).reduceEffects, false);
});

test("the app and renderer consume the common map policy instead of a map-specific exception", async () => {
  const [appSource, creatureSource, styles] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/AmbientCreature.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/map-skins.css", import.meta.url), "utf8"),
  ]);

  assert.match(appSource, /getShooterMapRuntimePerformance/);
  assert.match(appSource, /shooterMapRuntimePerformance\.reduceEffects/);
  assert.doesNotMatch(appSource, /mobileLavaGameplayPerformanceMode/);
  assert.match(creatureSource, /animationActive && !editMode/);
  assert.match(styles, /\.shooterArena--mapEffectsReduced \.shooterMapSkinAsset/);
  assert.doesNotMatch(styles, /shooterMapSkin--lava-canyon\.shooterArena--mapEffectsReduced/);
});
