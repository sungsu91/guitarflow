import shooterEffectTuningDefaults from "./effectTuningDefaults.js";
import {
  DEFAULT_SHOOTER_EFFECT_TUNING,
  normalizeShooterEffectTuning,
  normalizeShooterEffectTuningStore,
} from "./effectTuningNormalization.js";

export {
  DEFAULT_SHOOTER_EFFECT_TUNING,
  normalizeShooterEffectTuning,
  normalizeShooterEffectTuningStore,
} from "./effectTuningNormalization.js";

export const SHOOTER_EFFECT_TUNING_STORAGE_KEY = "rifflabShooterEffectTuningV1";
export const SHOOTER_EFFECT_TUNING_SAVE_ENDPOINT = "/__rifflab/shooter-editor/effect-tuning";

export const SHOOTER_EFFECT_TUNING_DEFAULTS = Object.freeze(
  normalizeShooterEffectTuningStore(shooterEffectTuningDefaults),
);

export function mergeShooterEffectTuningStores(baseStore = {}, overrideStore = {}) {
  return {
    ...normalizeShooterEffectTuningStore(baseStore),
    ...normalizeShooterEffectTuningStore(overrideStore),
  };
}

export function applyShooterEffectTuning(layers = [], tuningStore = {}) {
  const normalizedStore = normalizeShooterEffectTuningStore(tuningStore);
  return layers.map((layer) => {
    const tuning = normalizedStore[layer.effectId] ?? DEFAULT_SHOOTER_EFFECT_TUNING;
    return {
      ...layer,
      offsetX: (layer.offsetX ?? 0) + tuning.offsetX,
      offsetY: (layer.offsetY ?? 0) + tuning.offsetY,
      opacity: (layer.opacity ?? 1) * tuning.opacity,
      scale: (layer.scale ?? 1) * tuning.scale,
    };
  });
}
