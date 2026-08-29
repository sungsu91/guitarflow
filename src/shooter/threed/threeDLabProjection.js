const GAMEPLAY_TARGET_START_Y = 8;
const GAMEPLAY_TARGET_END_Y = 88;
const CAMERA_Z = 4;
const ENEMY_WORLD_HEIGHT = 1.9;

export const DEFAULT_THREE_D_LAB_SETTINGS = Object.freeze({
  cameraFov: 55,
  cameraHeight: 3.2,
  cameraPitch: -5,
  horizonPosition: 0.31,
  groundWidth: 32,
  railWidth: 7.6,
  railLength: 82,
  enemySpawnZ: 72,
  enemyHitZ: 6.2,
  enemyApproachSpeed: 1,
  enemyFarVisibility: 0.16,
  enemyNearSize: 1.1,
  guitarIdleX: 0.5,
  guitarIdleY: 0.87,
  guitarIdleScale: 1,
  guitarDashDuration: 64,
  guitarSlashDuration: 104,
  guitarReturnDuration: 138,
  slashRotation: -68,
  slashArcSize: 32,
  afterimageStrength: 0.72,
  hitParticleStrength: 0.76,
  cameraShakeStrength: 0.38,
});

export const THREE_D_LAB_SETTING_LIMITS = Object.freeze({
  cameraFov: [36, 82],
  cameraHeight: [1.8, 5.4],
  cameraPitch: [-15, 6],
  horizonPosition: [0.2, 0.43],
  groundWidth: [18, 52],
  railWidth: [4.2, 13],
  railLength: [48, 128],
  enemySpawnZ: [42, 112],
  enemyHitZ: [3.8, 11],
  enemyApproachSpeed: [0.62, 1.7],
  enemyFarVisibility: [0.08, 0.42],
  enemyNearSize: [0.72, 1.65],
  guitarIdleX: [0.34, 0.66],
  guitarIdleY: [0.76, 0.94],
  guitarIdleScale: [0.68, 1.42],
  guitarDashDuration: [40, 80],
  guitarSlashDuration: [80, 120],
  guitarReturnDuration: [100, 160],
  slashRotation: [-105, -34],
  slashArcSize: [12, 64],
  afterimageStrength: [0, 1],
  hitParticleStrength: [0, 1],
  cameraShakeStrength: [0, 1],
});

function clamp(value, minimum, maximum) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return minimum;
  return Math.min(maximum, Math.max(minimum, numeric));
}

function lerp(start, end, ratio) {
  return start + (end - start) * ratio;
}

export function normalizeThreeDLabSettings(settings = {}) {
  const normalized = {};
  Object.entries(DEFAULT_THREE_D_LAB_SETTINGS).forEach(([key, fallback]) => {
    const [minimum, maximum] = THREE_D_LAB_SETTING_LIMITS[key];
    normalized[key] = clamp(settings[key] ?? fallback, minimum, maximum);
  });
  normalized.cameraFov = Math.round(normalized.cameraFov);
  normalized.groundWidth = Math.round(normalized.groundWidth * 10) / 10;
  normalized.railWidth = Math.min(normalized.groundWidth * 0.72, normalized.railWidth);
  normalized.railLength = Math.round(normalized.railLength);
  normalized.enemySpawnZ = Math.max(normalized.enemyHitZ + 18, normalized.enemySpawnZ);
  normalized.guitarDashDuration = Math.round(normalized.guitarDashDuration);
  normalized.guitarSlashDuration = Math.round(normalized.guitarSlashDuration);
  normalized.guitarReturnDuration = Math.round(normalized.guitarReturnDuration);
  return normalized;
}

export function getThreeDLabCamera(settings = DEFAULT_THREE_D_LAB_SETTINGS, viewport = { width: 1, height: 1 }) {
  const safe = normalizeThreeDLabSettings(settings);
  const width = Math.max(1, Number(viewport.width) || 1);
  const height = Math.max(1, Number(viewport.height) || 1);
  const pitch = safe.cameraPitch * Math.PI / 180;
  const fovRadians = safe.cameraFov * Math.PI / 180;
  const tanHalfFov = Math.tan(fovRadians * 0.5);
  const forward = [0, Math.sin(pitch), -Math.cos(pitch)];
  const right = [1, 0, 0];
  const up = [0, Math.cos(pitch), Math.sin(pitch)];
  const position = [0, safe.cameraHeight, CAMERA_Z];
  const horizonNdcY = -Math.tan(pitch) / tanHalfFov;
  const naturalHorizonY = (1 - horizonNdcY) * 0.5 * height;
  const horizonOffsetY = safe.horizonPosition * height - naturalHorizonY;

  return {
    aspect: width / height,
    far: Math.max(160, safe.railLength + 48),
    forward,
    fovRadians,
    height,
    horizonOffsetY,
    near: 0.1,
    position,
    right,
    safe,
    tanHalfFov,
    up,
    width,
  };
}

export function gameplayPointToThreeDLabWorld(point = {}, settings = DEFAULT_THREE_D_LAB_SETTINGS) {
  const safe = normalizeThreeDLabSettings(settings);
  const progress = clamp(
    (Number(point.y ?? GAMEPLAY_TARGET_START_Y) - GAMEPLAY_TARGET_START_Y)
      / (GAMEPLAY_TARGET_END_Y - GAMEPLAY_TARGET_START_Y),
    0,
    1,
  );
  const approachProgress = Math.pow(progress, 1 / safe.enemyApproachSpeed);
  return {
    progress,
    worldX: ((Number(point.x ?? 50) - 50) / 50) * safe.railWidth * 0.58,
    worldY: 2.32,
    worldZ: -lerp(safe.enemySpawnZ, safe.enemyHitZ, approachProgress),
  };
}

export function projectThreeDLabWorldPoint(
  point = {},
  settings = DEFAULT_THREE_D_LAB_SETTINGS,
  viewport = { width: 1, height: 1 },
) {
  const camera = getThreeDLabCamera(settings, viewport);
  const worldX = Number(point.worldX) || 0;
  const worldY = Number(point.worldY) || 0;
  const worldZ = Number(point.worldZ) || 0;
  const relative = [
    worldX - camera.position[0],
    worldY - camera.position[1],
    worldZ - camera.position[2],
  ];
  const cameraX = relative[0] * camera.right[0] + relative[1] * camera.right[1] + relative[2] * camera.right[2];
  const cameraY = relative[0] * camera.up[0] + relative[1] * camera.up[1] + relative[2] * camera.up[2];
  const cameraDepth = Math.max(0.001, relative[0] * camera.forward[0] + relative[1] * camera.forward[1] + relative[2] * camera.forward[2]);
  const ndcX = cameraX / (cameraDepth * camera.tanHalfFov * camera.aspect);
  const ndcY = cameraY / (cameraDepth * camera.tanHalfFov);
  const screenX = (ndcX + 1) * 0.5 * camera.width;
  const screenY = (1 - ndcY) * 0.5 * camera.height + camera.horizonOffsetY;
  const projectedHeight = camera.height * ENEMY_WORLD_HEIGHT / (2 * camera.tanHalfFov * cameraDepth);
  const physicalScale = projectedHeight / 86;
  const scale = Math.max(camera.safe.enemyFarVisibility, physicalScale * camera.safe.enemyNearSize);

  return {
    cameraDepth,
    scale,
    screenX,
    screenXPercent: screenX / camera.width * 100,
    screenY,
    screenYPercent: screenY / camera.height * 100,
    worldX,
    worldY,
    worldZ,
  };
}

export function projectGameplayPointToThreeDLab(
  point,
  settings = DEFAULT_THREE_D_LAB_SETTINGS,
  viewport = { width: 1, height: 1 },
) {
  return projectThreeDLabWorldPoint(gameplayPointToThreeDLabWorld(point, settings), settings, viewport);
}

function multiplyMatrices(left, right) {
  const output = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let value = 0;
      for (let index = 0; index < 4; index += 1) {
        value += left[index * 4 + row] * right[column * 4 + index];
      }
      output[column * 4 + row] = value;
    }
  }
  return output;
}

export function createThreeDLabViewProjection(settings, viewport) {
  const camera = getThreeDLabCamera(settings, viewport);
  const [rightX, rightY, rightZ] = camera.right;
  const [upX, upY, upZ] = camera.up;
  const back = camera.forward.map((value) => -value);
  const [backX, backY, backZ] = back;
  const [positionX, positionY, positionZ] = camera.position;
  const view = new Float32Array([
    rightX, upX, backX, 0,
    rightY, upY, backY, 0,
    rightZ, upZ, backZ, 0,
    -(rightX * positionX + rightY * positionY + rightZ * positionZ),
    -(upX * positionX + upY * positionY + upZ * positionZ),
    -(backX * positionX + backY * positionY + backZ * positionZ),
    1,
  ]);
  const f = 1 / camera.tanHalfFov;
  const rangeInverse = 1 / (camera.near - camera.far);
  const ndcShiftY = -2 * camera.horizonOffsetY / camera.height;
  const projection = new Float32Array([
    f / camera.aspect, 0, 0, 0,
    0, f, 0, 0,
    0, -ndcShiftY, (camera.far + camera.near) * rangeInverse, -1,
    0, 0, 2 * camera.far * camera.near * rangeInverse, 0,
  ]);
  return multiplyMatrices(projection, view);
}
