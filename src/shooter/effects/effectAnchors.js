export const SHOOTER_EFFECT_ANCHOR_PRESET_IDS = Object.freeze({
  AURA_CENTER_BOTTOM: "aura-center-bottom",
  FLOOR_CENTER_BOTTOM: "floor-center-bottom",
});

export const SHOOTER_EFFECT_ANCHOR_PRESETS = Object.freeze({
  [SHOOTER_EFFECT_ANCHOR_PRESET_IDS.AURA_CENTER_BOTTOM]: Object.freeze({
    coordinateSpace: "guitar-player",
    horizontalAxis: "center",
    verticalAxis: "bottom",
    width: 116,
    height: 174,
    offsetX: 0,
    offsetY: 0,
    previewScale: 0.62,
    contentAnchor: Object.freeze({ centerX: 0.5039, bottomY: 0.9063 }),
  }),
  [SHOOTER_EFFECT_ANCHOR_PRESET_IDS.FLOOR_CENTER_BOTTOM]: Object.freeze({
    coordinateSpace: "guitar-player",
    horizontalAxis: "center",
    verticalAxis: "bottom",
    width: 198,
    height: 132,
    offsetX: 0,
    offsetY: 38,
    previewScale: 0.58,
    contentAnchor: Object.freeze({ centerX: 0.5023, bottomY: 0.7813 }),
  }),
});

export function getShooterEffectAnchorPreset(presetId) {
  return SHOOTER_EFFECT_ANCHOR_PRESETS[presetId] ?? null;
}

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function resolveShooterEffectAnchorOffset({
  baseOffsetX = 0,
  baseOffsetY = 0,
  contentAnchor,
  height = 0,
  preset,
  width = 0,
} = {}) {
  if (!preset) {
    return {
      offsetX: finiteOr(baseOffsetX, 0),
      offsetY: finiteOr(baseOffsetY, 0),
    };
  }

  const targetAnchor = preset.contentAnchor ?? { centerX: 0.5, bottomY: 1 };
  const sourceAnchor = contentAnchor ?? targetAnchor;
  const targetCenterX = finiteOr(targetAnchor.centerX, 0.5);
  const targetBottomY = finiteOr(targetAnchor.bottomY, 1);
  const sourceCenterX = finiteOr(sourceAnchor.centerX, targetCenterX);
  const sourceBottomY = finiteOr(sourceAnchor.bottomY, targetBottomY);

  return {
    offsetX: finiteOr(baseOffsetX, 0) + finiteOr(width, 0) * (targetCenterX - sourceCenterX),
    offsetY: finiteOr(baseOffsetY, 0) + finiteOr(height, 0) * (targetBottomY - sourceBottomY),
  };
}
