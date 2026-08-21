import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  SHOOTER_NOTE_MONSTER_ROOTS,
  getShooterNoteMonsterFrames,
  getShooterNoteMonsterSkin,
} from "./noteMonsterAssets.js";
import {
  DEFAULT_SHOOTER_NOTE_MONSTER_TUNING,
  SHOOTER_NOTE_MONSTER_TUNING_DEFAULTS,
  SHOOTER_NOTE_MONSTER_TUNING_SAVE_ENDPOINT,
  SHOOTER_NOTE_MONSTER_TUNING_STORAGE_KEY,
  getShooterNoteMonsterTuning,
  mergeShooterNoteMonsterTuningStores,
  normalizeShooterNoteMonsterTuning,
  normalizeShooterNoteMonsterTuningStore,
} from "./noteMonsterTuning.js";

function cloneTunings(value) {
  return normalizeShooterNoteMonsterTuningStore(value);
}

function getLocalTunings() {
  if (typeof window === "undefined" || !import.meta.env.DEV) return {};
  try {
    return normalizeShooterNoteMonsterTuningStore(JSON.parse(
      window.localStorage.getItem(SHOOTER_NOTE_MONSTER_TUNING_STORAGE_KEY) || "{}",
    ));
  } catch {
    return {};
  }
}

function getStoredTunings() {
  if (typeof window === "undefined") return cloneTunings(SHOOTER_NOTE_MONSTER_TUNING_DEFAULTS);
  // Deployed builds must use the source-backed values so every browser and phone matches.
  if (!import.meta.env.DEV) return cloneTunings(SHOOTER_NOTE_MONSTER_TUNING_DEFAULTS);
  try {
    return mergeShooterNoteMonsterTuningStores(
      SHOOTER_NOTE_MONSTER_TUNING_DEFAULTS,
      getLocalTunings(),
    );
  } catch {
    return cloneTunings(SHOOTER_NOTE_MONSTER_TUNING_DEFAULTS);
  }
}

function hasUnsharedLocalTunings() {
  if (typeof window === "undefined" || !import.meta.env.DEV) return false;
  const localTunings = getLocalTunings();
  if (!Object.keys(localTunings).length) return false;
  const mergedTunings = mergeShooterNoteMonsterTuningStores(
    SHOOTER_NOTE_MONSTER_TUNING_DEFAULTS,
    localTunings,
  );
  return JSON.stringify(mergedTunings) !== JSON.stringify(
    cloneTunings(SHOOTER_NOTE_MONSTER_TUNING_DEFAULTS),
  );
}

async function saveSharedTunings(tunings) {
  if (!import.meta.env.DEV) return tunings;
  const response = await fetch(SHOOTER_NOTE_MONSTER_TUNING_SAVE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tunings }),
  });
  const result = await response.json();
  if (!response.ok || !result?.ok) throw new Error(result?.error || "Monster tuning save failed");
  return normalizeShooterNoteMonsterTuningStore(result.tunings);
}

export default function useShooterNoteMonsterTuning({
  enabled = false,
  selectedSkinId,
} = {}) {
  const [committedTunings, setCommittedTunings] = useState(getStoredTunings);
  const [draftTunings, setDraftTunings] = useState(getStoredTunings);
  const [hasUnsharedTunings, setHasUnsharedTunings] = useState(hasUnsharedLocalTunings);
  const [activeRoot, setActiveRoot] = useState("C");
  const sessionBaseTuningsRef = useRef(cloneTunings(committedTunings));
  const legacyMigrationStartedRef = useRef(false);
  const wasEnabledRef = useRef(false);
  const activeSkin = getShooterNoteMonsterSkin(selectedSkinId);

  useEffect(() => {
    const sharedDefaultsAreEmpty = !Object.keys(SHOOTER_NOTE_MONSTER_TUNING_DEFAULTS).length;
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
        SHOOTER_NOTE_MONSTER_TUNING_STORAGE_KEY,
        JSON.stringify(sharedTunings),
      );
      setCommittedTunings(sharedTunings);
      sessionBaseTuningsRef.current = cloneTunings(sharedTunings);
      setHasUnsharedTunings(false);
    }).catch((error) => {
      legacyMigrationStartedRef.current = false;
      console.error("Legacy shooter monster tuning migration failed", error);
    });

    return () => {
      cancelled = true;
    };
  }, [committedTunings, hasUnsharedTunings]);

  useEffect(() => {
    if (enabled && !wasEnabledRef.current) {
      const tuningSnapshot = cloneTunings(committedTunings);
      sessionBaseTuningsRef.current = tuningSnapshot;
      setDraftTunings(tuningSnapshot);
    } else if (!enabled && wasEnabledRef.current) {
      setDraftTunings(cloneTunings(committedTunings));
    }
    wasEnabledRef.current = enabled;
  }, [committedTunings, enabled]);

  const activeTuning = getShooterNoteMonsterTuning(draftTunings, activeSkin.id, activeRoot);

  const selectRoot = useCallback((noteRoot) => {
    if (SHOOTER_NOTE_MONSTER_ROOTS.includes(noteRoot)) setActiveRoot(noteRoot);
  }, []);

  const updateActiveTuning = useCallback((updates) => {
    setDraftTunings((current) => ({
      ...current,
      [activeSkin.id]: {
        ...(current[activeSkin.id] ?? {}),
        [activeRoot]: normalizeShooterNoteMonsterTuning({
          ...getShooterNoteMonsterTuning(current, activeSkin.id, activeRoot),
          ...updates,
        }),
      },
    }));
  }, [activeRoot, activeSkin.id]);

  const nudgeLabel = useCallback((deltaX, deltaY) => {
    updateActiveTuning({
      labelOffsetX: activeTuning.labelOffsetX + deltaX,
      labelOffsetY: activeTuning.labelOffsetY + deltaY,
    });
  }, [activeTuning.labelOffsetX, activeTuning.labelOffsetY, updateActiveTuning]);

  const resizeActive = useCallback((deltaScale) => {
    updateActiveTuning({ scale: activeTuning.scale + deltaScale });
  }, [activeTuning.scale, updateActiveTuning]);

  const setActiveLabelScale = useCallback((nextLabelScale) => {
    updateActiveTuning({ labelScale: nextLabelScale });
  }, [updateActiveTuning]);

  const resizeActiveLabel = useCallback((deltaScale) => {
    setActiveLabelScale(activeTuning.labelScale + deltaScale);
  }, [activeTuning.labelScale, setActiveLabelScale]);

  const setActiveJointScale = useCallback((nextJointScale) => {
    updateActiveTuning({ jointScale: nextJointScale });
  }, [updateActiveTuning]);

  const resizeActiveJoint = useCallback((deltaScale) => {
    setActiveJointScale(activeTuning.jointScale + deltaScale);
  }, [activeTuning.jointScale, setActiveJointScale]);

  const resetActive = useCallback(() => {
    setDraftTunings((current) => {
      const next = cloneTunings(current);
      if (!next[activeSkin.id]?.[activeRoot]) return next;
      delete next[activeSkin.id][activeRoot];
      if (!Object.keys(next[activeSkin.id]).length) delete next[activeSkin.id];
      return next;
    });
  }, [activeRoot, activeSkin.id]);

  const resetActiveColors = useCallback(() => {
    updateActiveTuning({ labelColor: "", labelOutline: "" });
  }, [updateActiveTuning]);

  const hasChanges = hasUnsharedTunings || JSON.stringify(cloneTunings(draftTunings))
    !== JSON.stringify(cloneTunings(sessionBaseTuningsRef.current));

  const applyEditing = useCallback(async () => {
    const normalizedTunings = cloneTunings(draftTunings);
    try {
      const sharedTunings = await saveSharedTunings(normalizedTunings);
      window.localStorage.setItem(
        SHOOTER_NOTE_MONSTER_TUNING_STORAGE_KEY,
        JSON.stringify(sharedTunings),
      );
      setCommittedTunings(sharedTunings);
      sessionBaseTuningsRef.current = cloneTunings(sharedTunings);
      setHasUnsharedTunings(false);
      return true;
    } catch (error) {
      console.error("Shooter monster tuning save failed", error);
      return false;
    }
  }, [draftTunings]);

  const cancelEditing = useCallback(() => {
    setDraftTunings(cloneTunings(sessionBaseTuningsRef.current));
  }, []);

  return useMemo(() => ({
    activeFrames: getShooterNoteMonsterFrames(`${activeRoot}4`, activeSkin.id),
    activeRoot,
    activeSkin,
    activeTuning,
    applyEditing,
    cancelEditing,
    defaultTuning: DEFAULT_SHOOTER_NOTE_MONSTER_TUNING,
    hasChanges,
    hasUnsharedTunings,
    nudgeLabel,
    previewTunings: enabled ? draftTunings : committedTunings,
    resetActive,
    resetActiveColors,
    resizeActive,
    resizeActiveJoint,
    resizeActiveLabel,
    setActiveJointScale,
    setActiveLabelScale,
    roots: SHOOTER_NOTE_MONSTER_ROOTS,
    selectRoot,
    updateActiveTuning,
  }), [
    activeRoot,
    activeSkin,
    activeTuning,
    applyEditing,
    cancelEditing,
    committedTunings,
    draftTunings,
    enabled,
    hasChanges,
    hasUnsharedTunings,
    nudgeLabel,
    resetActive,
    resetActiveColors,
    resizeActive,
    resizeActiveJoint,
    resizeActiveLabel,
    setActiveJointScale,
    setActiveLabelScale,
    selectRoot,
    updateActiveTuning,
  ]);
}
