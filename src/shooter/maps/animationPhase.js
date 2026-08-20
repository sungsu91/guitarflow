const MAP_CENTER_X = 0.5;

function stableHash(value = "") {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getHermitCrabAnimationPhase({ instanceId = "", x = 0.5, y = 0.5 } = {}) {
  const safeX = Number.isFinite(x) ? x : MAP_CENTER_X;
  const safeY = Number.isFinite(y) ? y : 0.5;
  const identityPhase = (stableHash(instanceId) % 997) / 997;
  const sideOffset = safeX > MAP_CENTER_X ? 0.43 : 0;
  const verticalOffset = Math.max(0, Math.min(1, safeY)) * 0.17;
  return (identityPhase + sideOffset + verticalOffset) % 1;
}

export function getHermitCrabFacingScaleX({ animation = "", scaleX = 1, x = 0.5 } = {}) {
  const safeScaleX = Number.isFinite(scaleX) && scaleX !== 0 ? scaleX : 1;
  if (animation !== "hermit-crab-roam") return safeScaleX;
  return (Number.isFinite(x) ? x : MAP_CENTER_X) > MAP_CENTER_X
    ? -Math.abs(safeScaleX)
    : Math.abs(safeScaleX);
}

export function getCoastalChestFacingScaleX({ eventType = "", scaleX = 1, x = 0.5 } = {}) {
  const safeScaleX = Number.isFinite(scaleX) && scaleX !== 0 ? scaleX : 1;
  if (eventType !== "coastal-chest") return safeScaleX;

  // The supplied chest sheets face left. Chests always face inward:
  // keep the source direction on the right, flip the complete actor on the left.
  return (Number.isFinite(x) ? x : MAP_CENTER_X) < MAP_CENTER_X
    ? -Math.abs(safeScaleX)
    : Math.abs(safeScaleX);
}
