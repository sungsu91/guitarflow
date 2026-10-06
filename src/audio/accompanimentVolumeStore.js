import { useSyncExternalStore } from "react";

export const ACCOMPANIMENT_VOLUME_STORAGE_KEY = "fretiva-accompaniment-volume-v1";
export const DEFAULT_ACCOMPANIMENT_VOLUME = 1;
export const MAX_ACCOMPANIMENT_VOLUME = 2;

const listeners = new Set();
let initialized = false;
let snapshot = Object.freeze({ volume: DEFAULT_ACCOMPANIMENT_VOLUME });

function clampVolume(value) {
  const volume = Number(value);
  return Number.isFinite(volume)
    ? Math.min(MAX_ACCOMPANIMENT_VOLUME, Math.max(0, volume))
    : DEFAULT_ACCOMPANIMENT_VOLUME;
}

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  if (typeof window === "undefined") return;
  try {
    const stored = window.localStorage?.getItem(ACCOMPANIMENT_VOLUME_STORAGE_KEY);
    if (stored != null && stored.trim() !== "") {
      snapshot = Object.freeze({ volume: clampVolume(stored) });
    }
  } catch {
    // In-memory volume still works when browser storage is unavailable.
  }
}

export function getAccompanimentVolumeSnapshot() {
  ensureInitialized();
  return snapshot;
}

export function setAccompanimentVolume(value) {
  ensureInitialized();
  const volume = clampVolume(value);
  if (volume === snapshot.volume) return;
  snapshot = Object.freeze({ volume });
  try {
    if (typeof window !== "undefined") {
      window.localStorage?.setItem(ACCOMPANIMENT_VOLUME_STORAGE_KEY, String(volume));
    }
  } catch {
    // Keep the current session usable when storage is blocked.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeAccompanimentVolume(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccompanimentVolume() {
  return useSyncExternalStore(
    subscribeAccompanimentVolume,
    getAccompanimentVolumeSnapshot,
    getAccompanimentVolumeSnapshot,
  );
}

export function resetAccompanimentVolumeForTests() {
  initialized = false;
  snapshot = Object.freeze({ volume: DEFAULT_ACCOMPANIMENT_VOLUME });
  listeners.clear();
}
