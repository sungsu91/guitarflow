import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_PET_PREFERENCES, normalizePetPreferences, PET_PREFERENCES_KEY } from "./petPreferences.js";

let preferences;
const listeners = new Set();
function readPreferences() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PET_PREFERENCES_KEY) || "{}");
    return Object.fromEntries(Object.entries(saved || {}).map(([id, value]) => [id, normalizePetPreferences(value)]));
  } catch { return {}; }
}
function getPreferences(id) {
  preferences ??= readPreferences();
  return preferences[id] ?? DEFAULT_PET_PREFERENCES;
}
function refresh(event) {
  if (event.key !== PET_PREFERENCES_KEY && event.key !== null) return;
  preferences = readPreferences();
  listeners.forEach(notify => notify());
}
function subscribe(notify) {
  if (!listeners.size) window.addEventListener("storage", refresh);
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
    if (!listeners.size) window.removeEventListener("storage", refresh);
  };
}

// Both layout UIs and the visual renderer use the same per-pet store.
export function usePetPreferences(id) {
  const snapshot = useCallback(() => getPreferences(id), [id]);
  const value = useSyncExternalStore(subscribe, snapshot, () => DEFAULT_PET_PREFERENCES);
  const update = useCallback(patch => {
    const current = getPreferences(id);
    const next = normalizePetPreferences({ ...current, ...(typeof patch === "function" ? patch(current) : patch) });
    preferences = { ...preferences, [id]: next };
    try { window.localStorage.setItem(PET_PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* Keep session controls usable when storage is blocked. */ }
    listeners.forEach(notify => notify());
  }, [id]);
  return [value, update];
}
