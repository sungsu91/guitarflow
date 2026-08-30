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
  const documentElement = targetWindow.document?.documentElement;
  const visualViewport = targetWindow.visualViewport;
  const widths = [
    targetWindow.innerWidth,
    documentElement?.clientWidth,
    visualViewport?.width,
  ].filter((value) => Number.isFinite(value) && value > 0);
  const heights = [
    targetWindow.innerHeight,
    documentElement?.clientHeight,
    visualViewport?.height,
  ].filter((value) => Number.isFinite(value) && value > 0);

  return getShooterMobileViewportFrame({
    viewportHeight: heights.length > 0
      ? Math.min(...heights)
      : SHOOTER_MOBILE_CANVAS_HEIGHT,
    viewportLeft: visualViewport?.offsetLeft ?? 0,
    viewportTop: visualViewport?.offsetTop ?? 0,
    viewportWidth: widths.length > 0
      ? Math.min(...widths)
      : SHOOTER_MOBILE_CANVAS_WIDTH,
  });
}

