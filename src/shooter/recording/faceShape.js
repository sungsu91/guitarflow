// Four local inward pulls, expressed as inverse texture sampling coordinates.
// The nose is only an anchor; eyes, nose and mouth are not resized.
export function faceShapeControls(points, aspect = 1) {
  if (!points || points.length !== 5 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const width = Math.hypot((points[1].x - points[0].x) * aspect, points[1].y - points[0].y);
  if (width < 0.06 || width > 1.5) return null;
  const center = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
  // Extreme profiles are unstable and can deform the visible central features.
  if (Math.abs((points[4].x - center.x) * aspect) > width * 0.28) return null;
  return points.slice(0, 4).map((p, i) => ({
    x: p.x, y: 1 - p.y,
    dx: (p.x - center.x) * (i < 2 ? 0.065 : 0.08),
    dy: 0,
    radius: width * (i < 2 ? 0.26 : 0.24),
  }));
}
