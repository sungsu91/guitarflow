const GAMEPLAY_TARGET_START_Y = 8;
const GAMEPLAY_TARGET_END_Y = 88;

export const DEFAULT_PSEUDO3D_SETTINGS = Object.freeze({
  horizon: 0.24,
  cameraPitch: 0.12,
  perspectiveStrength: 1.18,
  groundScale: 1,
  groundScrollSpeed: 0.2,
  nearSpriteScale: 1.12,
  farSpriteScale: 0.24,
  spritePerspectiveStrength: 1.08,
  xSpreadStrength: 1.04,
  enemyApproachVisualSpeed: 1,
  fov: 1,
  cameraHeight: 0.22,
  nearClip: 0.04,
  farDistance: 1,
  groundTextureRepeat: 12,
});

const PSEUDO3D_SETTING_LIMITS = Object.freeze({
  horizon: [0.12, 0.45],
  cameraPitch: [-0.35, 0.5],
  perspectiveStrength: [0.45, 2.4],
  groundScale: [0.55, 1.8],
  groundScrollSpeed: [0, 0.8],
  nearSpriteScale: [0.65, 1.8],
  farSpriteScale: [0.08, 0.65],
  spritePerspectiveStrength: [0.45, 2.4],
  xSpreadStrength: [0.45, 1.8],
  enemyApproachVisualSpeed: [0.4, 2.2],
  fov: [0.65, 1.65],
  cameraHeight: [0.08, 0.5],
  nearClip: [0.01, 0.25],
  farDistance: [0.5, 2.5],
  groundTextureRepeat: [6, 24],
});

export function clampPseudo3DNumber(value, minimum, maximum) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return minimum;
  return Math.min(maximum, Math.max(minimum, numeric));
}

export function normalizePseudo3DSettings(settings = {}) {
  const normalized = {};
  Object.entries(DEFAULT_PSEUDO3D_SETTINGS).forEach(([key, fallback]) => {
    const [minimum, maximum] = PSEUDO3D_SETTING_LIMITS[key];
    normalized[key] = clampPseudo3DNumber(settings[key] ?? fallback, minimum, maximum);
  });
  normalized.groundTextureRepeat = Math.round(normalized.groundTextureRepeat);
  normalized.farDistance = Math.max(normalized.nearClip + 0.08, normalized.farDistance);
  return normalized;
}

function lerp(start, end, ratio) {
  return start + (end - start) * ratio;
}

export function getPseudo3DDepthProgress(worldZ, settings = DEFAULT_PSEUDO3D_SETTINGS) {
  const safe = normalizePseudo3DSettings(settings);
  const depthRange = Math.max(0.001, safe.farDistance - safe.nearClip);
  return clampPseudo3DNumber((safe.farDistance - worldZ) / depthRange, 0, 1);
}

export function projectPseudo3DWorldPoint(
  { worldX = 0, worldZ = DEFAULT_PSEUDO3D_SETTINGS.farDistance } = {},
  settings = DEFAULT_PSEUDO3D_SETTINGS,
  viewport = { width: 1, height: 1 },
) {
  const safe = normalizePseudo3DSettings(settings);
  const width = Math.max(1, Number(viewport.width) || 1);
  const height = Math.max(1, Number(viewport.height) || 1);
  const rawDepth = getPseudo3DDepthProgress(worldZ, safe);
  const approachDepth = Math.pow(rawDepth, 1 / safe.enemyApproachVisualSpeed);
  const perspectiveDepth = Math.pow(approachDepth, 1 / safe.perspectiveStrength);
  const pitchExponent = clampPseudo3DNumber(1 + safe.cameraPitch * 0.72, 0.65, 1.4);
  const verticalDepth = Math.pow(perspectiveDepth, pitchExponent);
  const horizonY = safe.horizon * height;
  const groundBottomY = height * (0.9 + safe.cameraHeight * 0.08);
  const screenY = lerp(horizonY, groundBottomY, verticalDepth);
  const farSpread = 0.14 / safe.fov;
  const nearSpread = safe.xSpreadStrength / safe.fov;
  const lateralSpread = lerp(farSpread, nearSpread, perspectiveDepth);
  const screenX = width * 0.5 + (Number(worldX) || 0) * width * 0.41 * lateralSpread;
  const spriteDepth = Math.pow(approachDepth, 1 / safe.spritePerspectiveStrength);
  const scale = lerp(safe.farSpriteScale, safe.nearSpriteScale, spriteDepth);

  return {
    depth: rawDepth,
    perspectiveDepth,
    scale,
    screenX,
    screenY,
    screenXPercent: (screenX / width) * 100,
    screenYPercent: (screenY / height) * 100,
    worldX: Number(worldX) || 0,
    worldZ: Number(worldZ) || 0,
  };
}

export function gameplayPointToPseudo3DWorld(
  { x = 50, y = GAMEPLAY_TARGET_START_Y } = {},
  settings = DEFAULT_PSEUDO3D_SETTINGS,
) {
  const safe = normalizePseudo3DSettings(settings);
  const gameplayDepth = clampPseudo3DNumber(
    (Number(y) - GAMEPLAY_TARGET_START_Y) / (GAMEPLAY_TARGET_END_Y - GAMEPLAY_TARGET_START_Y),
    0,
    1,
  );
  return {
    worldX: (Number(x) - 50) / 40,
    worldZ: lerp(safe.farDistance, safe.nearClip, gameplayDepth),
  };
}

export function projectGameplayPointToPseudo3D(
  point,
  settings = DEFAULT_PSEUDO3D_SETTINGS,
  viewport = { width: 1, height: 1 },
) {
  return projectPseudo3DWorldPoint(
    gameplayPointToPseudo3DWorld(point, settings),
    settings,
    viewport,
  );
}

export function wrapPseudo3DWorldZ(worldZ, settings = DEFAULT_PSEUDO3D_SETTINGS) {
  const safe = normalizePseudo3DSettings(settings);
  const range = Math.max(0.001, safe.farDistance - safe.nearClip);
  const offset = ((Number(worldZ) - safe.nearClip) % range + range) % range;
  return safe.nearClip + offset;
}

