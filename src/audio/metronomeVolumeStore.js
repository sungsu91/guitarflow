import { useSyncExternalStore } from "react";

export const METRONOME_VOLUME_STORAGE_KEY = "fretiva-metronome-volume-v1";
export const DEFAULT_METRONOME_VOLUME = 1;

const listeners = new Set();
let initialized = false;
let snapshot = Object.freeze({ volume: DEFAULT_METRONOME_VOLUME });

const clampVolume = (value) => Math.min(1, Math.max(0, Number(value) || 0));

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  if (typeof window === "undefined") return;
  try {
    const stored = window.localStorage?.getItem(METRONOME_VOLUME_STORAGE_KEY);
    if (stored !== null) snapshot = Object.freeze({ volume: clampVolume(stored) });
  } catch {
    // In-memory volume still works when browser storage is unavailable.
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(METRONOME_VOLUME_STORAGE_KEY, String(snapshot.volume));
  } catch {
    // Keep the current session usable when storage is blocked.
  }
}

export function getMetronomeVolumeSnapshot() {
  ensureInitialized();
  return snapshot;
}

export function setMetronomeVolume(value) {
  ensureInitialized();
  const volume = clampVolume(value);
  if (volume === snapshot.volume) return;
  snapshot = Object.freeze({ volume });
  persist();
  listeners.forEach((listener) => listener());
}

export function subscribeMetronomeVolume(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMetronomeVolume() {
  return useSyncExternalStore(
    subscribeMetronomeVolume,
    getMetronomeVolumeSnapshot,
    getMetronomeVolumeSnapshot,
  );
}

export function resetMetronomeVolumeForTests() {
  initialized = true;
  snapshot = Object.freeze({ volume: DEFAULT_METRONOME_VOLUME });
  listeners.clear();
}
