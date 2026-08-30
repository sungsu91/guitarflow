import { getIsMobileLayout } from "./mobileLayout.js";

export const VIEWPORT_COMPACT_MAX_WIDTH = 599;
export const VIEWPORT_TABLET_MAX_WIDTH = 1366;
export const VIEWPORT_SHORT_MAX_HEIGHT = 560;

function firstPositive(values, fallback = 0) {
  const value = values.find((candidate) => Number.isFinite(candidate) && candidate > 0);
  return value == null ? fallback : Math.round(value);
}

export function getViewportProfile(targetWindow = typeof window === "undefined" ? null : window) {
  if (!targetWindow) {
    return {
      height: 0,
      isLandscape: false,
      isMobileSurface: false,
      isShort: false,
      orientation: "portrait",
      size: "compact",
      width: 0,
    };
  }

  const documentElement = targetWindow.document?.documentElement;
  const visualViewport = targetWindow.visualViewport;
  const width = firstPositive([
    targetWindow.innerWidth,
    visualViewport?.width,
    documentElement?.clientWidth,
  ]);
  const height = firstPositive([
    visualViewport?.height,
    targetWindow.innerHeight,
    documentElement?.clientHeight,
  ]);
  const isLandscape = width > height;
  const size = width <= VIEWPORT_COMPACT_MAX_WIDTH
    ? "compact"
    : width <= VIEWPORT_TABLET_MAX_WIDTH
      ? "tablet"
      : "wide";

  return {
    height,
    isLandscape,
    isMobileSurface: getIsMobileLayout(targetWindow),
    isShort: height > 0 && height <= VIEWPORT_SHORT_MAX_HEIGHT,
    orientation: isLandscape ? "landscape" : "portrait",
    size,
    width,
  };
}

export function getViewportProfileClassName(profile) {
  return [
    `viewport-${profile?.orientation ?? "portrait"}`,
    `viewport-${profile?.size ?? "compact"}`,
    profile?.isMobileSurface ? "viewport-mobile-surface" : "viewport-desktop-surface",
    profile?.isShort ? "viewport-short" : "viewport-tall",
  ].join(" ");
}

export function isLandscapePlayFocusMode(appMode, profile) {
  if (!profile?.isLandscape || !profile?.isMobileSurface) return false;
  return ["metronome", "practice", "tuner", "mini-chord-maker"].includes(appMode);
}

export function shouldGuardShooterOrientation(appMode, profile) {
  return appMode === "shooter" && Boolean(profile?.isLandscape && profile?.isMobileSurface);
}
