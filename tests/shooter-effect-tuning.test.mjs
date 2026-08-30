import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SHOOTER_EFFECT_TUNING,
  SHOOTER_EFFECT_TUNING_DEFAULTS,
  applyShooterEffectTuning,
  mergeShooterEffectTuningStores,
  normalizeShooterEffectTuning,
  normalizeShooterEffectTuningStore,
} from "../src/shooter/effects/effectTuning.js";

test("effect tuning clamps unsafe values and preserves independent effect identities", () => {
  assert.deepEqual(normalizeShooterEffectTuning({
    offsetX: 999,
    offsetY: -999,
    opacity: 0,
    scale: 8,
  }), {
    offsetX: 160,
    offsetY: -180,
    opacity: 0.1,
    scale: 2.5,
  });

  const store = normalizeShooterEffectTuningStore({
    "jp-tropical-stand": { offsetX: 7, scale: 0.72 },
    "fire-lava-aura": { offsetY: -4, opacity: 0.45 },
  });
  assert.equal(store["jp-tropical-stand"].offsetX, 7);
  assert.equal(store["fire-lava-aura"].opacity, 0.45);
  assert.deepEqual(DEFAULT_SHOOTER_EFFECT_TUNING, {
    offsetX: 0,
    offsetY: 0,
    opacity: 1,
    scale: 1,
  });
});

test("source-backed effect tunings are merged with local editor overrides", () => {
  assert.equal(SHOOTER_EFFECT_TUNING_DEFAULTS["moonlight-floor"].offsetY, 22);
  assert.equal(SHOOTER_EFFECT_TUNING_DEFAULTS["moonlight-floor"].scale, 0.7999999999999998);

  const merged = mergeShooterEffectTuningStores(
    { "moonlight-floor": { offsetY: 22, scale: 0.8 } },
    { "moonlight-floor": { offsetY: 18, scale: 0.75 } },
  );
  assert.equal(merged["moonlight-floor"].offsetY, 18);
  assert.equal(merged["moonlight-floor"].scale, 0.75);
});

test("effect tuning modifies only layers with the matching effect id", () => {
  const layers = [
    { effectId: "jp-tropical-stand", offsetX: 2, offsetY: 10, opacity: 1, scale: 1 },
    { effectId: "fire-lava-aura", offsetX: 0, offsetY: 0, opacity: 0.8, scale: 0.9 },
  ];
  const tuned = applyShooterEffectTuning(layers, {
    "jp-tropical-stand": { offsetX: -5, offsetY: 6, opacity: 0.7, scale: 0.6 },
  });

  assert.deepEqual(tuned[0], {
    ...layers[0],
    offsetX: -3,
    offsetY: 16,
    opacity: 0.7,
    scale: 0.6,
  });
  assert.deepEqual(tuned[1], layers[1]);
});
