import { THREE_D_LAB_HORIZONTAL_LAYOUT } from "./threeDLabHorizontalLayout.js";

const GAMEPLAY_TARGET_START_Y = 8;
const GAMEPLAY_TARGET_END_Y = 88;
const ENEMY_WORLD_HEIGHT = 2.2;

function clamp(value, minimum, maximum) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return minimum;
  return Math.min(maximum, Math.max(minimum, numeric));
}

function lerp(start, end, ratio) {
  return start + (end - start) * ratio;
}

export function getThreeDLabHorizontalCamera(
  viewport = { width: 1, height: 1 },
  layout = THREE_D_LAB_HORIZONTAL_LAYOUT,
) {
  const width = Math.max(1, Number(viewport.width) || 1);
  const height = Math.max(1, Number(viewport.height) || 1);
  const pitch = layout.camera.pitch * Math.PI / 180;
  const fovRadians = layout.camera.fov * Math.PI / 180;
  const tanHalfFov = Math.tan(fovRadians * 0.5);
  const forward = [0, Math.sin(pitch), -Math.cos(pitch)];
  const right = [1, 0, 0];
  const up = [0, Math.cos(pitch), Math.sin(pitch)];
  const position = [0, layout.camera.height, layout.camera.positionZ];
  const horizonNdcY = -Math.tan(pitch) / tanHalfFov;
  const naturalHorizonY = (1 - horizonNdcY) * 0.5 * height;
  const horizonOffsetY = layout.camera.horizonPosition * height - naturalHorizonY;

  return {
    aspect: width / height,
    far: 90,
    forward,
    fovRadians,
    height,
    horizonOffsetY,
    near: 0.1,
    position,
    right,
    tanHalfFov,
    up,
    width,
  };
}

export function gameplayPointToThreeDLabHorizontalWorld(
  point = {},
  layout = THREE_D_LAB_HORIZONTAL_LAYOUT,
) {
  const progress = Number.isFinite(point.progress)
    ? clamp(point.progress, 0, 1)
    : clamp(
        (Number(point.y ?? GAMEPLAY_TARGET_START_Y) - GAMEPLAY_TARGET_START_Y)
          / (GAMEPLAY_TARGET_END_Y - GAMEPLAY_TARGET_START_Y),
        0,
        1,
      );
  const approachProgress = progress * progress * (3 - 2 * progress);
  const laneRatio = clamp((Number(point.x ?? 50) - 18) / 64, 0, 1);

  return {
    progress,
    worldX: lerp(layout.combat.enemySpawnX, layout.combat.enemyHitX, approachProgress),
    worldY: layout.combat.targetHeight,
    worldZ: lerp(-layout.combat.laneDepth * 0.5, layout.combat.laneDepth * 0.5, laneRatio),
  };
}

export function projectThreeDLabHorizontalWorldPoint(
  point = {},
  viewport = { width: 1, height: 1 },
  layout = THREE_D_LAB_HORIZONTAL_LAYOUT,
) {
  const camera = getThreeDLabHorizontalCamera(viewport, layout);
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
  const scale = clamp(projectedHeight / 86 * 1.08, 0.64, 1.08);

  return {
    cameraDepth,
    progress: clamp(point.progress ?? 0, 0, 1),
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

export function projectGameplayPointToThreeDLabHorizontal(
  point,
  viewport = { width: 1, height: 1 },
  layout = THREE_D_LAB_HORIZONTAL_LAYOUT,
) {
  const world = gameplayPointToThreeDLabHorizontalWorld(point, layout);
  return {
    ...projectThreeDLabHorizontalWorldPoint(world, viewport, layout),
    progress: world.progress,
  };
}

export function projectGameplayPointToThreeDLabMobileLandscape(
  point,
  viewport = { width: 1, height: 1 },
  layout = THREE_D_LAB_HORIZONTAL_LAYOUT,
) {
  const projection = projectGameplayPointToThreeDLabHorizontal(point, viewport, layout);
  const height = Math.max(1, Number(viewport.height) || 1);
  const laneRatio = clamp(
    (projection.worldZ + layout.combat.laneDepth * 0.5) / layout.combat.laneDepth,
    0,
    1,
  );
  const screenYPercent = lerp(44, 56, laneRatio);

  return {
    ...projection,
    screenY: height * screenYPercent / 100,
    screenYPercent,
  };
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

export function createThreeDLabHorizontalViewProjection(
  viewport,
  layout = THREE_D_LAB_HORIZONTAL_LAYOUT,
) {
  const camera = getThreeDLabHorizontalCamera(viewport, layout);
  const [rightX, rightY, rightZ] = camera.right;
  const [upX, upY, upZ] = camera.up;
  const [backX, backY, backZ] = camera.forward.map((value) => -value);
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
