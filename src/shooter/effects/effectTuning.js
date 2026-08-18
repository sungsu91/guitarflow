export const SHOOTER_EFFECT_TUNING_STORAGE_KEY = "rifflabShooterEffectTuningV1";

export const DEFAULT_SHOOTER_EFFECT_TUNING = Object.freeze({
  offsetX: 0,
  offsetY: 0,
  opacity: 1,
  scale: 1,
});

function clamp(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

export function normalizeShooterEffectTuning(value = DEFAULT_SHOOTER_EFFECT_TUNING) {
  return {
    offsetX: clamp(value?.offsetX, -160, 160, 0),
    offsetY: clamp(value?.offsetY, -180, 220, 0),
    opacity: clamp(value?.opacity, 0.1, 1, 1),
    scale: clamp(value?.scale, 0.25, 2.5, 1),
  };
}

export function normalizeShooterEffectTuningStore(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([effectId]) => Boolean(effectId))
    .map(([effectId, tuning]) => [effectId, normalizeShooterEffectTuning(tuning)]));
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
