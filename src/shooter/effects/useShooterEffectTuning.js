import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_SHOOTER_EFFECT_TUNING,
  SHOOTER_EFFECT_TUNING_STORAGE_KEY,
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

function getStoredTunings() {
  if (typeof window === "undefined") return {};
  try {
    return normalizeShooterEffectTuningStore(JSON.parse(
      window.localStorage.getItem(SHOOTER_EFFECT_TUNING_STORAGE_KEY) || "{}",
    ));
  } catch {
    return {};
  }
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
  const [draftEffectIds, setDraftEffectIds] = useState(() => cloneEffectIds(selectedEffectIds));
  const [activeSlot, setActiveSlot] = useState("floor");
  const sessionBaseTuningsRef = useRef(cloneTunings(committedTunings));
  const sessionBaseEffectIdsRef = useRef(cloneEffectIds(selectedEffectIds));
  const wasEnabledRef = useRef(false);

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
  const hasChanges = tuningHasChanges || selectionHasChanges;

  const applyEditing = useCallback(async () => {
    const normalizedTunings = normalizeShooterEffectTuningStore(draftTunings);
    const normalizedEffectIds = cloneEffectIds(draftEffectIds);
    try {
      window.localStorage.setItem(SHOOTER_EFFECT_TUNING_STORAGE_KEY, JSON.stringify(normalizedTunings));
      if (typeof onApplyEffectIds === "function" && await onApplyEffectIds(normalizedEffectIds) === false) {
        return false;
      }
      setCommittedTunings(normalizedTunings);
      sessionBaseTuningsRef.current = cloneTunings(normalizedTunings);
      sessionBaseEffectIdsRef.current = cloneEffectIds(normalizedEffectIds);
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
