import { useSyncExternalStore } from "react";

export const BACKING_VOLUME_STORAGE_KEY = "just-play-backing-volume-v1";
export const DEFAULT_BACKING_VOLUME = 1;

const listeners = new Set();
let initialized = false;
let snapshot = Object.freeze({
  lastAudibleVolume: DEFAULT_BACKING_VOLUME,
  volume: DEFAULT_BACKING_VOLUME,
});

const clampVolume = (value) => Math.min(1, Math.max(0, Number(value) || 0));

function readStoredVolume() {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(BACKING_VOLUME_STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    const volume = clampVolume(parsed.volume);
    const lastAudibleVolume = clampVolume(parsed.lastAudibleVolume) || DEFAULT_BACKING_VOLUME;
    return { lastAudibleVolume, volume };
  } catch {
    return null;
  }
}

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  const stored = readStoredVolume();
  if (stored) snapshot = Object.freeze(stored);
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(BACKING_VOLUME_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Playback and in-memory volume remain available when storage is blocked.
  }
}

function emit(nextSnapshot) {
  snapshot = Object.freeze(nextSnapshot);
  persist();
  listeners.forEach((listener) => listener());
}

export function getBackingVolumeSnapshot() {
  ensureInitialized();
  return snapshot;
}

export function setBackingVolume(value) {
  ensureInitialized();
  const volume = clampVolume(value);
  emit({
    lastAudibleVolume: volume > 0 ? volume : snapshot.lastAudibleVolume,
    volume,
  });
}

export function toggleBackingMute() {
  ensureInitialized();
  if (snapshot.volume > 0) {
    emit({ lastAudibleVolume: snapshot.volume, volume: 0 });
  } else {
    emit({
      lastAudibleVolume: snapshot.lastAudibleVolume || DEFAULT_BACKING_VOLUME,
      volume: snapshot.lastAudibleVolume || DEFAULT_BACKING_VOLUME,
    });
  }
}

export function subscribeBackingVolume(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBackingVolume() {
  return useSyncExternalStore(
    subscribeBackingVolume,
    getBackingVolumeSnapshot,
    getBackingVolumeSnapshot,
  );
}

export function resetBackingVolumeForTests() {
  initialized = true;
  snapshot = Object.freeze({
    lastAudibleVolume: DEFAULT_BACKING_VOLUME,
    volume: DEFAULT_BACKING_VOLUME,
  });
}
