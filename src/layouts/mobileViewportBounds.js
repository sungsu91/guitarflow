import { getViewportProfile } from './viewportProfile.js';

// Fixed phone chrome uses one coordinate system across scrollable pages and
// locked stages. Browser bars/keyboard change the visible height independently
// of CSS dvh. Ignore zoomed or stale (rotation) visual viewport measurements.
export function getMobileViewportBounds(target = window) {
  const { width, height } = getViewportProfile(target);
  const visual = target.visualViewport;
  const unscaled = Math.abs((visual?.scale ?? 1) - 1) < 0.01;
  const aligned = visual && Math.abs(visual.width - width) <= 2;
  const visibleHeight = unscaled && aligned && visual.height > 0
    ? Math.min(height, visual.height)
    : height;
  const top = unscaled && aligned
    ? Math.max(0, Math.min(visual.offsetTop || 0, height - visibleHeight))
    : 0;
  return { left: 0, top, width, height: visibleHeight, bottom: top + visibleHeight };
}
