import { useSyncExternalStore } from "react";

export const GROOVE_VOLUME_STORAGE_KEY = "fretiva-groove-volume-v1";
export const DEFAULT_GROOVE_VOLUME = 1;
export const GROOVE_VOLUME_UNITY_PERCENT = 70;
export const MAX_GROOVE_VOLUME = 100 / GROOVE_VOLUME_UNITY_PERCENT;

const listeners = new Set();
let initialized = false;
let snapshot = Object.freeze({ volume: DEFAULT_GROOVE_VOLUME });

const clampVolume = (value) => Math.min(MAX_GROOVE_VOLUME, Math.max(0, Number(value) || 0));

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  if (typeof window === "undefined") return;
  try {
    const stored = window.localStorage?.getItem(GROOVE_VOLUME_STORAGE_KEY);
    if (stored !== null) snapshot = Object.freeze({ volume: clampVolume(stored) });
  } catch {
    // In-memory volume still works when browser storage is unavailable.
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(GROOVE_VOLUME_STORAGE_KEY, String(snapshot.volume));
  } catch {
    // Keep the current session usable when storage is blocked.
  }
}

export function getGrooveVolumeSnapshot() {
  ensureInitialized();
  return snapshot;
}

export function setGrooveVolume(value) {
  ensureInitialized();
  const volume = clampVolume(value);
  if (volume === snapshot.volume) return;
  snapshot = Object.freeze({ volume });
  persist();
  listeners.forEach((listener) => listener());
}

export function subscribeGrooveVolume(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGrooveVolume() {
  return useSyncExternalStore(
    subscribeGrooveVolume,
    getGrooveVolumeSnapshot,
    getGrooveVolumeSnapshot,
  );
}

export function resetGrooveVolumeForTests() {
  initialized = true;
  snapshot = Object.freeze({ volume: DEFAULT_GROOVE_VOLUME });
  listeners.clear();
}
