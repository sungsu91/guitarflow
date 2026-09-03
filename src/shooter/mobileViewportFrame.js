import { getViewportProfile } from "../layouts/viewportProfile.js";

export const SHOOTER_MOBILE_CANVAS_WIDTH = 430;
export const SHOOTER_MOBILE_CANVAS_HEIGHT = 932;

function positiveNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getShooterMobileViewportFrame({
  viewportHeight,
  viewportLeft = 0,
  viewportTop = 0,
  viewportWidth,
} = {}) {
  const availableWidth = positiveNumber(viewportWidth, SHOOTER_MOBILE_CANVAS_WIDTH);
  const availableHeight = positiveNumber(viewportHeight, SHOOTER_MOBILE_CANVAS_HEIGHT);
  const scale = Math.min(
    availableWidth / SHOOTER_MOBILE_CANVAS_WIDTH,
    availableHeight / SHOOTER_MOBILE_CANVAS_HEIGHT,
  );
  const width = SHOOTER_MOBILE_CANVAS_WIDTH * scale;
  const height = SHOOTER_MOBILE_CANVAS_HEIGHT * scale;

  return {
    height,
    left: (Number(viewportLeft) || 0) + (availableWidth - width) / 2,
    scale,
    top: (Number(viewportTop) || 0) + (availableHeight - height) / 2,
    width,
  };
}

export function getShooterMobileViewportSnapshot(targetWindow = window) {
  const viewport = getViewportProfile(targetWindow);
  const portraitLocked = Boolean(viewport.isLandscape && viewport.isMobileSurface);
  const frame = getShooterMobileViewportFrame({
    viewportHeight: portraitLocked
      ? viewport.width || SHOOTER_MOBILE_CANVAS_HEIGHT
      : viewport.height || SHOOTER_MOBILE_CANVAS_HEIGHT,
    viewportWidth: portraitLocked
      ? viewport.height || SHOOTER_MOBILE_CANVAS_WIDTH
      : viewport.width || SHOOTER_MOBILE_CANVAS_WIDTH,
  });

  if (!portraitLocked) return { ...frame, rotation: 0 };

  // Screen Orientation locking is unavailable in several mobile browsers.
  // Rotate the complete portrait canvas as one unit in that fallback case so
  // turning the phone cannot reflow it into a narrow upright column.
  return {
    ...frame,
    left: frame.top + frame.height,
    rotation: 90,
    top: frame.left,
  };
}
