const DEG_TO_RAD = Math.PI / 180;

const SHOOTER_NOTE_MONSTER_CORE_PROFILE = Object.freeze({ centerX: 0.5, centerY: 0.5, radius: 0.165 });

export const SHOOTER_ENEMY_HURTBOX_PROFILES = Object.freeze({
  easy: SHOOTER_NOTE_MONSTER_CORE_PROFILE,
  normal: SHOOTER_NOTE_MONSTER_CORE_PROFILE,
  difficult: SHOOTER_NOTE_MONSTER_CORE_PROFILE,
});

export const SHOOTER_PICK_HITBOX_RADIUS_SCALE = 0.18;

export function lerpNumber(start, end, ratio) {
  return start + (end - start) * ratio;
}

export function lerpPoint(start, end, ratio) {
  return {
    x: lerpNumber(start.x, end.x, ratio),
    y: lerpNumber(start.y, end.y, ratio),
  };
}

export function rotateShooterVector(point, angleDeg = 0) {
  const radians = angleDeg * DEG_TO_RAD;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  };
}

function transformShooterPoint(point, pivot, angleDeg) {
  const rotated = rotateShooterVector(point, angleDeg);
  return {
    x: pivot.x + rotated.x,
    y: pivot.y + rotated.y,
  };
}

export function createShooterGuitarCollisionGeometry({
  angleDeg = 0,
  collisionHeight,
  height,
  muzzleHeight,
  muzzleHeightScale = 1.008,
  pivotX,
  pivotY,
  width,
}) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(collisionHeight) || Number(height) || 1);
  const safeMuzzleHeight = Math.max(1, Number(muzzleHeight) || Number(height) || safeHeight);
  const pivot = { x: Number(pivotX) || 0, y: Number(pivotY) || 0 };
  const bodyCenter = transformShooterPoint({ x: 0, y: -safeHeight * 0.225 }, pivot, angleDeg);
  const neckStart = transformShooterPoint({ x: 0, y: -safeHeight * 0.78 }, pivot, angleDeg);
  const neckEnd = transformShooterPoint({ x: 0, y: -safeHeight * 0.43 }, pivot, angleDeg);
  const headCenter = transformShooterPoint({ x: 0, y: -safeHeight * 0.895 }, pivot, angleDeg);
  const safeMuzzleHeightScale = Math.max(0, Number(muzzleHeightScale) || 0);
  const muzzlePoint = transformShooterPoint({ x: 0, y: -safeMuzzleHeight * safeMuzzleHeightScale }, pivot, angleDeg);

  return {
    angleDeg,
    pivot,
    width: safeWidth,
    height: safeHeight,
    body: {
      type: "ellipse",
      center: bodyCenter,
      radiusX: safeWidth * 0.38,
      radiusY: safeHeight * 0.205,
      rotationDeg: angleDeg,
    },
    neck: {
      type: "capsule",
      start: neckStart,
      end: neckEnd,
      radius: Math.max(1.5, safeWidth * 0.058),
    },
    head: {
      type: "ellipse",
      center: headCenter,
      radiusX: safeWidth * 0.135,
      radiusY: safeHeight * 0.072,
      rotationDeg: angleDeg,
    },
    muzzlePoint,
  };
}

export function createShooterEnemyHurtbox({
  centerX,
  centerY,
  difficulty = "easy",
  height,
  width,
}) {
  const profile = SHOOTER_ENEMY_HURTBOX_PROFILES[difficulty] ?? SHOOTER_ENEMY_HURTBOX_PROFILES.easy;
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const radius = Math.min(safeWidth, safeHeight) * profile.radius;
  return {
    type: "circle",
    center: {
      x: Number(centerX) + (profile.centerX - 0.5) * safeWidth,
      y: Number(centerY) + (profile.centerY - 0.5) * safeHeight,
    },
    radius,
    radiusX: radius,
    radiusY: radius,
  };
}

export function createShooterProjectileHitbox({ centerX, centerY, height, width }) {
  return {
    type: "circle",
    center: { x: Number(centerX) || 0, y: Number(centerY) || 0 },
    radius: Math.max(2, Math.min(Math.max(1, Number(width) || 1), Math.max(1, Number(height) || 1)) * SHOOTER_PICK_HITBOX_RADIUS_SCALE),
  };
}

export function solveShooterIntercept({
  maxTimeMs = 1000,
  projectileSpeed,
  start,
  target,
  targetVelocity = { x: 0, y: 0 },
}) {
  const speed = Math.max(0.001, Number(projectileSpeed) || 0.001);
  const relative = { x: target.x - start.x, y: target.y - start.y };
  const velocity = { x: Number(targetVelocity.x) || 0, y: Number(targetVelocity.y) || 0 };
  const a = velocity.x ** 2 + velocity.y ** 2 - speed ** 2;
  const b = 2 * (relative.x * velocity.x + relative.y * velocity.y);
  const c = relative.x ** 2 + relative.y ** 2;
  const candidates = [];

  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) > 1e-9) candidates.push(-c / b);
  } else {
    const discriminant = b ** 2 - 4 * a * c;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      candidates.push((-b - root) / (2 * a), (-b + root) / (2 * a));
    }
  }

  const fallbackTime = Math.sqrt(c) / speed;
  const timeMs = Math.min(
    Math.max(1, Number(maxTimeMs) || 1),
    candidates.filter((value) => Number.isFinite(value) && value > 0).sort((left, right) => left - right)[0] ?? fallbackTime,
  );

  return {
    timeMs,
    point: {
      x: target.x + velocity.x * timeMs,
      y: target.y + velocity.y * timeMs,
    },
  };
}

export function sweepCircleAgainstMovingEllipse({
  end,
  projectileRadius = 0,
  start,
  targetEnd,
  targetRadiusX,
  targetRadiusY,
  targetStart,
}) {
  const expandedRadiusX = Math.max(0.001, Number(targetRadiusX) + Number(projectileRadius || 0));
  const expandedRadiusY = Math.max(0.001, Number(targetRadiusY) + Number(projectileRadius || 0));
  const relativeStart = {
    x: start.x - targetStart.x,
    y: start.y - targetStart.y,
  };
  const relativeEnd = {
    x: end.x - targetEnd.x,
    y: end.y - targetEnd.y,
  };
  const delta = {
    x: relativeEnd.x - relativeStart.x,
    y: relativeEnd.y - relativeStart.y,
  };
  const a = (delta.x ** 2) / (expandedRadiusX ** 2) + (delta.y ** 2) / (expandedRadiusY ** 2);
  const b = 2 * (
    (relativeStart.x * delta.x) / (expandedRadiusX ** 2)
    + (relativeStart.y * delta.y) / (expandedRadiusY ** 2)
  );
  const c = (relativeStart.x ** 2) / (expandedRadiusX ** 2)
    + (relativeStart.y ** 2) / (expandedRadiusY ** 2)
    - 1;

  let ratio = null;
  if (c <= 0) {
    ratio = 0;
  } else if (a > 1e-12) {
    const discriminant = b ** 2 - 4 * a * c;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      const first = (-b - root) / (2 * a);
      const second = (-b + root) / (2 * a);
      ratio = [first, second].find((value) => value >= 0 && value <= 1) ?? null;
    }
  }
  if (ratio == null) return null;

  const projectileCenter = lerpPoint(start, end, ratio);
  const targetCenter = lerpPoint(targetStart, targetEnd, ratio);
  let direction = {
    x: projectileCenter.x - targetCenter.x,
    y: projectileCenter.y - targetCenter.y,
  };
  if (Math.hypot(direction.x, direction.y) < 1e-6) {
    direction = { x: start.x - end.x, y: start.y - end.y };
  }
  if (Math.hypot(direction.x, direction.y) < 1e-6) direction = { x: -1, y: 0 };
  const ellipseScale = 1 / Math.sqrt(
    (direction.x ** 2) / (Number(targetRadiusX) ** 2)
    + (direction.y ** 2) / (Number(targetRadiusY) ** 2),
  );

  return {
    ratio,
    projectileCenter,
    targetCenter,
    collisionPoint: {
      x: targetCenter.x + direction.x * ellipseScale,
      y: targetCenter.y + direction.y * ellipseScale,
    },
  };
}
