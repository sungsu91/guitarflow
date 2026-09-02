import {
  MOBILE_LAYOUT_MAX_WIDTH,
  MOBILE_LAYOUT_MEDIA_QUERY,
  getIsMobileLayout,
} from "./mobileLayout.js";

export const VIEWPORT_COMPACT_MAX_WIDTH = 599;
export const VIEWPORT_TABLET_MAX_WIDTH = 1366;
export const VIEWPORT_SHORT_MAX_HEIGHT = 560;

const VIEWPORT_TRANSITION_DRIFT_PX = 48;
const VIEWPORT_PAIR_MATCH_TOLERANCE_PX = 24;
const MOBILE_LANDSCAPE_APP_MODES = new Set(["fretboard-viewer", "metronome"]);
const MOBILE_LANDSCAPE_PRACTICE_CATEGORIES = new Set([
  "first-position",
  "scale-block",
  "rhythm",
]);

function firstPositive(values, fallback = 0) {
  const value = values.find((candidate) => Number.isFinite(candidate) && candidate > 0);
  return value == null ? fallback : Math.round(value);
}

function getViewportPair(width, height) {
  return {
    height: firstPositive([height]),
    width: firstPositive([width]),
  };
}

function hasViewportPair(pair) {
  return pair.width > 0 && pair.height > 0;
}

function getViewportPairDistance(first, second) {
  if (!hasViewportPair(first) || !hasViewportPair(second)) return Number.POSITIVE_INFINITY;
  return Math.max(
    Math.abs(first.width - second.width),
    Math.abs(first.height - second.height),
  );
}

function getViewportSize(width) {
  return width <= VIEWPORT_COMPACT_MAX_WIDTH
    ? "compact"
    : width <= VIEWPORT_TABLET_MAX_WIDTH
      ? "tablet"
      : "wide";
}

function getLayoutViewportPair(targetWindow) {
  const documentElement = targetWindow.document?.documentElement;
  const visualViewport = targetWindow.visualViewport;
  const innerViewport = getViewportPair(targetWindow.innerWidth, targetWindow.innerHeight);
  const clientViewport = getViewportPair(
    documentElement?.clientWidth,
    documentElement?.clientHeight,
  );
  const visualViewportPair = getViewportPair(visualViewport?.width, visualViewport?.height);

  if (!hasViewportPair(innerViewport)) {
    return hasViewportPair(clientViewport) ? clientViewport : visualViewportPair;
  }
  if (!hasViewportPair(clientViewport)) return innerViewport;

  const layoutDrift = getViewportPairDistance(innerViewport, clientViewport);
  const compactMediaMatches = typeof targetWindow.matchMedia === "function"
    && targetWindow.matchMedia(MOBILE_LAYOUT_MEDIA_QUERY).matches;
  const innerMatchesCompactMedia = innerViewport.width <= MOBILE_LAYOUT_MAX_WIDTH;
  const clientMatchesCompactMedia = clientViewport.width <= MOBILE_LAYOUT_MAX_WIDTH;
  const visualScale = Number(visualViewport?.scale);
  const visualViewportUnscaled = !Number.isFinite(visualScale) || Math.abs(visualScale - 1) < 0.01;
  const visualTracksClient = visualViewportUnscaled
    && getViewportPairDistance(visualViewportPair, clientViewport) <= VIEWPORT_PAIR_MATCH_TOLERANCE_PX;
  const visualTracksInner = visualViewportUnscaled
    && getViewportPairDistance(visualViewportPair, innerViewport) <= VIEWPORT_PAIR_MATCH_TOLERANCE_PX;

  // Device emulation, rotation, fold/unfold, and split-screen transitions can
  // update the three viewport APIs on different frames. Never combine the old
  // width from one viewport with the new height from another. A normal desktop
  // scrollbar stays below this drift threshold, preserving existing breakpoints.
  // DevTools device emulation may also report a scaled visual viewport while
  // innerWidth still belongs to the previous desktop frame. The media query is
  // evaluated against the active CSS layout viewport, so use the complete pair
  // that agrees with it before consulting visualViewport.scale.
  if (
    layoutDrift > VIEWPORT_TRANSITION_DRIFT_PX
    && innerMatchesCompactMedia !== clientMatchesCompactMedia
  ) {
    return compactMediaMatches === clientMatchesCompactMedia
      ? clientViewport
      : innerViewport;
  }

  if (layoutDrift > VIEWPORT_TRANSITION_DRIFT_PX && !visualViewportUnscaled) {
    return clientViewport;
  }

  if (layoutDrift > VIEWPORT_TRANSITION_DRIFT_PX && visualTracksClient && !visualTracksInner) {
    return clientViewport;
  }

  return innerViewport;
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

  const { height, width } = getLayoutViewportPair(targetWindow);
  const isLandscape = width > height;
  const size = getViewportSize(width);

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

export function getPortraitLockedViewportProfile(profile) {
  if (!profile?.isLandscape) return profile;
  const width = Math.min(profile.width, profile.height);
  const height = Math.max(profile.width, profile.height);
  return {
    ...profile,
    height,
    isLandscape: false,
    isShort: height > 0 && height <= VIEWPORT_SHORT_MAX_HEIGHT,
    orientation: "portrait",
    size: getViewportSize(width),
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

export function isMobileLandscapeAllowed(appMode, categoryId) {
  if (MOBILE_LANDSCAPE_APP_MODES.has(appMode)) return true;
  return appMode === "practice"
    && MOBILE_LANDSCAPE_PRACTICE_CATEGORIES.has(categoryId);
}

export function isLandscapePlayFocusMode(appMode, profile, categoryId) {
  if (!profile?.isLandscape || !profile?.isMobileSurface) return false;
  return appMode === "metronome"
    || (appMode === "practice" && MOBILE_LANDSCAPE_PRACTICE_CATEGORIES.has(categoryId));
}

export function isPortraitOnlyMode(appMode, categoryId) {
  return !isMobileLandscapeAllowed(appMode, categoryId);
}

export function shouldGuardPortraitOrientation(appMode, profile, categoryId) {
  return isPortraitOnlyMode(appMode, categoryId)
    && Boolean(profile?.isLandscape && profile?.isMobileSurface);
}

export function shouldGuardShooterOrientation(appMode, profile, categoryId) {
  return appMode === "shooter" && shouldGuardPortraitOrientation(appMode, profile, categoryId);
}
