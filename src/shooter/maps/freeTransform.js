export const DEFAULT_PERSPECTIVE_CORNERS = Object.freeze([
  Object.freeze({ x: 0, y: 0 }),
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: 1, y: 1 }),
  Object.freeze({ x: 0, y: 1 }),
]);

const EPSILON = 1e-8;

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizePerspectiveCorners(corners, min = -0.75, max = 1.75) {
  return DEFAULT_PERSPECTIVE_CORNERS.map((fallback, index) => {
    const corner = Array.isArray(corners) ? corners[index] : null;
    return {
      x: Math.min(max, Math.max(min, finite(corner?.x, fallback.x))),
      y: Math.min(max, Math.max(min, finite(corner?.y, fallback.y))),
    };
  });
}

export function solveUnitSquareHomography(corners) {
  const [topLeft, topRight, bottomRight, bottomLeft] = normalizePerspectiveCorners(corners);
  const dx1 = topRight.x - bottomRight.x;
  const dx2 = bottomLeft.x - bottomRight.x;
  const dx3 = topLeft.x - topRight.x + bottomRight.x - bottomLeft.x;
  const dy1 = topRight.y - bottomRight.y;
  const dy2 = bottomLeft.y - bottomRight.y;
  const dy3 = topLeft.y - topRight.y + bottomRight.y - bottomLeft.y;

  let projectiveX = 0;
  let projectiveY = 0;
  if (Math.abs(dx3) > EPSILON || Math.abs(dy3) > EPSILON) {
    const denominator = (dx1 * dy2) - (dx2 * dy1);
    if (Math.abs(denominator) < EPSILON) return null;
    projectiveX = ((dx3 * dy2) - (dx2 * dy3)) / denominator;
    projectiveY = ((dx1 * dy3) - (dx3 * dy1)) / denominator;
  }

  return {
    a: topRight.x - topLeft.x + (projectiveX * topRight.x),
    b: bottomLeft.x - topLeft.x + (projectiveY * bottomLeft.x),
    c: topLeft.x,
    d: topRight.y - topLeft.y + (projectiveX * topRight.y),
    e: bottomLeft.y - topLeft.y + (projectiveY * bottomLeft.y),
    f: topLeft.y,
    g: projectiveX,
    h: projectiveY,
  };
}

export function projectUnitPoint(homography, point) {
  if (!homography) return { x: point.x, y: point.y };
  const denominator = (homography.g * point.x) + (homography.h * point.y) + 1;
  if (Math.abs(denominator) < EPSILON) return { x: point.x, y: point.y };
  return {
    x: ((homography.a * point.x) + (homography.b * point.y) + homography.c) / denominator,
    y: ((homography.d * point.x) + (homography.e * point.y) + homography.f) / denominator,
  };
}

export function getPerspectiveMatrix3d(corners, width, height) {
  const safeWidth = Math.max(1, finite(width, 1));
  const safeHeight = Math.max(1, finite(height, 1));
  const homography = solveUnitSquareHomography(corners);
  if (!homography) return "none";

  const values = [
    homography.a,
    homography.d * (safeHeight / safeWidth),
    0,
    homography.g / safeWidth,
    homography.b * (safeWidth / safeHeight),
    homography.e,
    0,
    homography.h / safeHeight,
    0,
    0,
    1,
    0,
    homography.c * safeWidth,
    homography.f * safeHeight,
    0,
    1,
  ].map((value) => Math.abs(value) < 1e-12 ? 0 : Number(value.toFixed(10)));

  return `matrix3d(${values.join(",")})`;
}
