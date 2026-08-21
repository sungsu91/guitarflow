export const NAVIGATION_KEEP_ALIVE_MODES = Object.freeze([
  "practice",
  "mini-chord-maker",
  "fretboard-viewer",
  "metronome",
]);

const NAVIGATION_KEEP_ALIVE_MODE_SET = new Set(NAVIGATION_KEEP_ALIVE_MODES);

export function isNavigationKeepAliveMode(mode) {
  return NAVIGATION_KEEP_ALIVE_MODE_SET.has(mode);
}

export function createMountedModeSet(initialMode) {
  return isNavigationKeepAliveMode(initialMode) ? new Set([initialMode]) : new Set();
}

export function registerMountedMode(mountedModes, mode) {
  if (!isNavigationKeepAliveMode(mode) || mountedModes.has(mode)) return mountedModes;
  const nextModes = new Set(mountedModes);
  nextModes.add(mode);
  return nextModes;
}

export function shouldMountMode(activeMode, mountedModes, mode) {
  return activeMode === mode || (isNavigationKeepAliveMode(mode) && mountedModes.has(mode));
}

export function getModeActivityState(activeMode, mode) {
  return activeMode === mode ? "visible" : "hidden";
}

export function getCachedModeElement(activeMode, elementCache, mode, createElement) {
  if (activeMode !== mode) return elementCache.get(mode) ?? null;
  const nextElement = createElement();
  elementCache.set(mode, nextElement);
  return nextElement;
}
