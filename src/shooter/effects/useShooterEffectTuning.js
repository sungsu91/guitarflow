import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_SHOOTER_EFFECT_TUNING,
  SHOOTER_EFFECT_TUNING_DEFAULTS,
  SHOOTER_EFFECT_TUNING_SAVE_ENDPOINT,
  SHOOTER_EFFECT_TUNING_STORAGE_KEY,
  mergeShooterEffectTuningStores,
  normalizeShooterEffectTuning,
  normalizeShooterEffectTuningStore,
} from "./effectTuning.js";

function cloneTunings(value) {
  return normalizeShooterEffectTuningStore(value);
}

function cloneEffectIds(value = {}) {
  return {
    aura: String(value?.aura || "none"),
    floor: String(value?.floor || "none"),
  };
}

function getLocalTunings() {
  if (typeof window === "undefined" || !import.meta.env.DEV) return {};
  try {
    return normalizeShooterEffectTuningStore(JSON.parse(
      window.localStorage.getItem(SHOOTER_EFFECT_TUNING_STORAGE_KEY) || "{}",
    ));
  } catch {
    return {};
  }
}

function getStoredTunings() {
  if (typeof window === "undefined") return cloneTunings(SHOOTER_EFFECT_TUNING_DEFAULTS);
  // Production must render the source-backed values so every phone matches the editor.
  if (!import.meta.env.DEV) return cloneTunings(SHOOTER_EFFECT_TUNING_DEFAULTS);
  return mergeShooterEffectTuningStores(SHOOTER_EFFECT_TUNING_DEFAULTS, getLocalTunings());
}

function hasUnsharedLocalTunings() {
  if (typeof window === "undefined" || !import.meta.env.DEV) return false;
  const localTunings = getLocalTunings();
  if (!Object.keys(localTunings).length) return false;
  const mergedTunings = mergeShooterEffectTuningStores(
    SHOOTER_EFFECT_TUNING_DEFAULTS,
    localTunings,
  );
  return JSON.stringify(mergedTunings) !== JSON.stringify(
    cloneTunings(SHOOTER_EFFECT_TUNING_DEFAULTS),
  );
}

async function saveSharedTunings(tunings) {
  if (!import.meta.env.DEV) return cloneTunings(tunings);
  const response = await fetch(SHOOTER_EFFECT_TUNING_SAVE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tunings }),
  });
  const result = await response.json();
  if (!response.ok || !result?.ok) throw new Error(result?.error || "Effect tuning save failed");
  return cloneTunings(result.tunings);
}

function resolveEffect(options = [], effectId = "none") {
  return options.find((effect) => effect.id === effectId)
    ?? options.find((effect) => effect.id === "none")
    ?? options[0]
    ?? null;
}

export default function useShooterEffectTuning({
  effectOptionsBySlot = {},
  enabled = false,
  onApplyEffectIds,
  selectedEffectIds = {},
} = {}) {
  const [committedTunings, setCommittedTunings] = useState(getStoredTunings);
  const [draftTunings, setDraftTunings] = useState(getStoredTunings);
  const [hasUnsharedTunings, setHasUnsharedTunings] = useState(hasUnsharedLocalTunings);
  const [draftEffectIds, setDraftEffectIds] = useState(() => cloneEffectIds(selectedEffectIds));
  const [activeSlot, setActiveSlot] = useState("floor");
  const sessionBaseTuningsRef = useRef(cloneTunings(committedTunings));
  const sessionBaseEffectIdsRef = useRef(cloneEffectIds(selectedEffectIds));
  const legacyMigrationStartedRef = useRef(false);
  const wasEnabledRef = useRef(false);

  useEffect(() => {
    const sharedDefaultsAreEmpty = !Object.keys(SHOOTER_EFFECT_TUNING_DEFAULTS).length;
    if (
      !import.meta.env.DEV
      || !sharedDefaultsAreEmpty
      || !hasUnsharedTunings
      || legacyMigrationStartedRef.current
    ) return undefined;

    legacyMigrationStartedRef.current = true;
    let cancelled = false;
    const legacyTunings = cloneTunings(committedTunings);
    saveSharedTunings(legacyTunings).then((sharedTunings) => {
      if (cancelled) return;
      window.localStorage.setItem(
        SHOOTER_EFFECT_TUNING_STORAGE_KEY,
        JSON.stringify(sharedTunings),
      );
      setCommittedTunings(sharedTunings);
      sessionBaseTuningsRef.current = cloneTunings(sharedTunings);
      setHasUnsharedTunings(false);
    }).catch((error) => {
      legacyMigrationStartedRef.current = false;
      console.error("Legacy shooter effect tuning migration failed", error);
    });

    return () => {
      cancelled = true;
    };
  }, [committedTunings, hasUnsharedTunings]);

  useEffect(() => {
    if (enabled && !wasEnabledRef.current) {
      const tuningSnapshot = cloneTunings(committedTunings);
      const effectSnapshot = cloneEffectIds(selectedEffectIds);
      sessionBaseTuningsRef.current = tuningSnapshot;
      sessionBaseEffectIdsRef.current = effectSnapshot;
      setDraftTunings(tuningSnapshot);
      setDraftEffectIds(effectSnapshot);
    } else if (!enabled && wasEnabledRef.current) {
      setDraftTunings(cloneTunings(committedTunings));
      setDraftEffectIds(cloneEffectIds(selectedEffectIds));
    }
    wasEnabledRef.current = enabled;
  }, [committedTunings, enabled, selectedEffectIds.aura, selectedEffectIds.floor]);

  const previewEffectIds = useMemo(
    () => (enabled ? draftEffectIds : cloneEffectIds(selectedEffectIds)),
    [draftEffectIds, enabled, selectedEffectIds.aura, selectedEffectIds.floor],
  );
  const previewEffects = useMemo(() => ["floor", "aura"].map((slot) => ({
      ...resolveEffect(effectOptionsBySlot[slot], previewEffectIds[slot]),
      slot,
    })).filter((effect) => effect.id),
  [effectOptionsBySlot, previewEffectIds]);
  const activeOptions = effectOptionsBySlot[activeSlot] ?? [];
  const activeEffect = previewEffects.find((effect) => effect.slot === activeSlot) ?? previewEffects[0] ?? null;
  const activeTuning = activeEffect
    ? draftTunings[activeEffect.id] ?? DEFAULT_SHOOTER_EFFECT_TUNING
    : DEFAULT_SHOOTER_EFFECT_TUNING;

  const selectEffect = useCallback((slot, effectId) => {
    const options = effectOptionsBySlot[slot] ?? [];
    const nextEffect = resolveEffect(options, effectId);
    if (!nextEffect) return;
    setDraftEffectIds((current) => ({ ...current, [slot]: nextEffect.id }));
    setActiveSlot(slot);
  }, [effectOptionsBySlot]);

  const updateActiveTuning = useCallback((updates) => {
    if (!activeEffect?.id || activeEffect.id === "none") return;
    setDraftTunings((current) => ({
      ...current,
      [activeEffect.id]: normalizeShooterEffectTuning({
        ...(current[activeEffect.id] ?? DEFAULT_SHOOTER_EFFECT_TUNING),
        ...updates,
      }),
    }));
  }, [activeEffect?.id]);

  const nudgeActive = useCallback((deltaX, deltaY) => {
    updateActiveTuning({
      offsetX: activeTuning.offsetX + deltaX,
      offsetY: activeTuning.offsetY + deltaY,
    });
  }, [activeTuning.offsetX, activeTuning.offsetY, updateActiveTuning]);

  const resizeActive = useCallback((deltaScale) => {
    updateActiveTuning({ scale: activeTuning.scale + deltaScale });
  }, [activeTuning.scale, updateActiveTuning]);

  const resetActive = useCallback(() => {
    if (!activeEffect?.id || activeEffect.id === "none") return;
    setDraftTunings((current) => {
      const next = { ...current };
      delete next[activeEffect.id];
      return next;
    });
  }, [activeEffect?.id]);

  const tuningHasChanges = JSON.stringify(normalizeShooterEffectTuningStore(draftTunings))
    !== JSON.stringify(normalizeShooterEffectTuningStore(sessionBaseTuningsRef.current));
  const selectionHasChanges = JSON.stringify(cloneEffectIds(draftEffectIds))
    !== JSON.stringify(cloneEffectIds(sessionBaseEffectIdsRef.current));
  const hasChanges = hasUnsharedTunings || tuningHasChanges || selectionHasChanges;

  const applyEditing = useCallback(async () => {
    const normalizedTunings = normalizeShooterEffectTuningStore(draftTunings);
    const normalizedEffectIds = cloneEffectIds(draftEffectIds);
    try {
      const sharedTunings = await saveSharedTunings(normalizedTunings);
      window.localStorage.setItem(SHOOTER_EFFECT_TUNING_STORAGE_KEY, JSON.stringify(sharedTunings));
      if (typeof onApplyEffectIds === "function" && await onApplyEffectIds(normalizedEffectIds) === false) {
        return false;
      }
      setCommittedTunings(sharedTunings);
      sessionBaseTuningsRef.current = cloneTunings(sharedTunings);
      sessionBaseEffectIdsRef.current = cloneEffectIds(normalizedEffectIds);
      setHasUnsharedTunings(false);
      return true;
    } catch (error) {
      console.error("Shooter effect tuning save failed", error);
      return false;
    }
  }, [draftEffectIds, draftTunings, onApplyEffectIds]);

  const cancelEditing = useCallback(() => {
    setDraftTunings(cloneTunings(sessionBaseTuningsRef.current));
    setDraftEffectIds(cloneEffectIds(sessionBaseEffectIdsRef.current));
  }, []);

  return useMemo(() => ({
    activeEffect,
    activeOptions,
    activeSlot,
    activeTuning,
    applyEditing,
    cancelEditing,
    hasChanges,
    hasUnsharedTunings,
    nudgeActive,
    previewEffectIds,
    previewEffects,
    previewTunings: enabled ? draftTunings : committedTunings,
    resetActive,
    resizeActive,
    selectEffect,
    selectSlot: setActiveSlot,
    selectionHasChanges,
    updateActiveTuning,
  }), [
    activeEffect,
    activeOptions,
    activeSlot,
    activeTuning,
    applyEditing,
    cancelEditing,
    committedTunings,
    draftTunings,
    enabled,
    hasChanges,
    hasUnsharedTunings,
    nudgeActive,
    previewEffectIds,
    previewEffects,
    resetActive,
    resizeActive,
    selectEffect,
    selectionHasChanges,
    updateActiveTuning,
  ]);
}
