import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isEditableShooterMap, resolveLayeredShooterMap } from "../registry.js";
import { normalizePerspectiveCorners } from "../freeTransform.js";
import {
  createMapPlacement,
  deleteMapPlacement,
  duplicateMapPlacement,
  moveMapPlacementLayer,
  nudgeMapPlacement,
  normalizeMapPlacements,
  resizeMapPlacement,
  updateMapPlacement,
} from "./editorState.js";

const MAP_EDIT_SAVE_ENDPOINT = "/__rifflab/map-editor/layout";

async function requestMapLayoutSave(skinId, placements) {
  const response = await fetch(MAP_EDIT_SAVE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skinId, placements }),
  });
  const responsePayload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(responsePayload?.error || `Map save failed (${response.status})`);
  return responsePayload?.placements ?? placements;
}

function getSaveErrorMessage(error) {
  const message = String(error?.message ?? error ?? "");
  if (message.includes("Invalid creature landing surface")) {
    return "개구리 착지점이 삭제된 돌·연잎을 참조하고 있습니다.";
  }
  if (message.includes("Invalid map asset identity")) {
    return "등록이 해제된 맵 오브젝트가 포함되어 있습니다.";
  }
  if (message.includes("Map asset instance limit exceeded")) {
    return "한 개만 배치할 수 있는 맵 오브젝트가 중복되어 있습니다.";
  }
  if (message.includes("Local editor access only")) {
    return "맵 저장은 이 PC의 로컬 개발 화면에서만 가능합니다.";
  }
  return "저장 요청을 완료하지 못했습니다. 변경값은 편집 화면에 그대로 남아 있습니다.";
}

function isMapEditModeRequested() {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mapEdit") === "1";
}

function getDraftStorageKey(skinId) {
  return `rifflab.map-editor.draft.${skinId}.v1`;
}

function createInstanceId(assetId) {
  return `${assetId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createAnchorId() {
  return `frog-point-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function clampAnchor(value) {
  return Math.min(1.25, Math.max(-0.25, value));
}

function getMapEditorViewport(referenceViewport) {
  return {
    width: Math.max(1, referenceViewport?.width ?? referenceViewport?.deviceWidth ?? 390),
    height: Math.max(1, referenceViewport?.height ?? referenceViewport?.deviceHeight ?? 756),
  };
}

function clonePlacementSnapshot(placements) {
  return placements.map((placement) => ({
    ...placement,
    ...(placement.perspectiveCorners ? {
      perspectiveCorners: placement.perspectiveCorners.map((corner) => ({ ...corner })),
    } : {}),
    ...(placement.creature ? {
      creature: {
        ...placement.creature,
        anchors: placement.creature.anchors.map((anchor) => ({ ...anchor })),
      },
    } : {}),
  }));
}

function isFrogLandingAssetId(assetId = "", creatureType = "") {
  return assetId.startsWith("rock-")
    || assetId.startsWith("lily-pad-")
    || assetId === "stone-bridge-crossing"
    || (creatureType === "sleeping-frog" && assetId === "guitar-dock-platform");
}

function isWaterCreatureAnchor(asset, anchor) {
  return asset?.creature?.type === "diving-frog" && anchor?.kind === "water";
}

function isFreePlacedCreatureType(creatureType = "") {
  return creatureType === "baby-dragon";
}

function projectAnchorToLandingSurface(surface, asset, desired = null) {
  const assetId = surface?.assetId ?? "";
  const width = Math.max(0.04, (asset?.baseWidth ?? 0.3) * (surface?.scale ?? 1));
  if (assetId === "stone-bridge-crossing") {
    const desiredX = Number.isFinite(desired?.x) ? desired.x : surface.x;
    const x = clampAnchor(Math.min(surface.x + width * 0.34, Math.max(surface.x - width * 0.34, desiredX)));
    const offsetX = x - surface.x;
    const surfaceLineOffsetY = -0.3 * offsetX;
    const desiredOffsetY = Number.isFinite(desired?.y)
      ? desired.y - surface.y
      : surfaceLineOffsetY;
    const offsetY = Math.min(
      surfaceLineOffsetY + 0.025,
      Math.max(surfaceLineOffsetY - 0.025, desiredOffsetY),
    );
    return { x, y: clampAnchor(surface.y + offsetY), offsetX, offsetY };
  }

  if (assetId === "guitar-dock-platform") {
    const desiredOffsetX = Number.isFinite(desired?.x) ? desired.x - surface.x : 0;
    const desiredOffsetY = Number.isFinite(desired?.y) ? desired.y - surface.y : -0.015;
    const offsetX = Math.min(width * 0.39, Math.max(width * -0.39, desiredOffsetX));
    const offsetY = Math.min(0.045, Math.max(-0.055, desiredOffsetY));
    return {
      x: clampAnchor(surface.x + offsetX),
      y: clampAnchor(surface.y + offsetY),
      offsetX,
      offsetY,
    };
  }

  const halfWidth = width * (assetId.startsWith("lily-pad-") ? 0.24 : 0.28);
  const defaultOffsetY = assetId.startsWith("lily-pad-") ? -0.005 : -0.018;
  const desiredOffsetX = Number.isFinite(desired?.x) ? desired.x - surface.x : 0;
  const desiredOffsetY = Number.isFinite(desired?.y) ? desired.y - surface.y : defaultOffsetY;
  const halfHeight = Math.max(0.018, Math.min(0.055, width * 0.12));
  const offsetX = Math.min(halfWidth, Math.max(-halfWidth, desiredOffsetX));
  const offsetY = Math.min(halfHeight, Math.max(-halfHeight, desiredOffsetY));
  return {
    x: clampAnchor(surface.x + offsetX),
    y: clampAnchor(surface.y + offsetY),
    offsetX,
    offsetY,
  };
}

function findNearestLandingSurface(placements, point, referenceViewport, creatureType = "") {
  const { width, height } = getMapEditorViewport(referenceViewport);
  return placements
    .filter((placement) => isFrogLandingAssetId(placement.assetId, creatureType))
    .reduce((nearest, placement) => {
      const distance = Math.hypot((placement.x - point.x) * width, (placement.y - point.y) * height);
      return !nearest || distance < nearest.distance ? { placement, distance } : nearest;
    }, null)?.placement ?? null;
}

export default function useMapEditMode(skin, editingAllowed = true) {
  const requested = isMapEditModeRequested();
  const available = editingAllowed
    && import.meta.env.DEV
    && isEditableShooterMap(skin);
  const [editingActive, setEditingActive] = useState(() => requested && available);
  const enabled = available && editingActive;
  const defaultPlacements = useMemo(
    () => normalizeMapPlacements(skin?.layout, skin?.assetCatalog),
    [skin],
  );
  const assetsById = useMemo(
    () => new Map((skin?.assetCatalog ?? []).map((asset) => [asset.id, asset])),
    [skin],
  );
  const [committedState, setCommittedState] = useState({ skinId: "", placements: [] });
  const [draftState, setDraftState] = useState({ skinId: "", placements: [] });
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [creaturePreviewState, setCreaturePreviewState] = useState({ instanceId: "", mode: "" });
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const gestureCleanupRef = useRef(null);
  const sessionBaseRef = useRef({ skinId: "", placements: [] });
  const historyRef = useRef({ skinId: "", past: [], future: [] });
  const draftCacheRef = useRef(new Map());
  const sessionBaseCacheRef = useRef(new Map());
  const historyCacheRef = useRef(new Map());

  const committedPlacements = committedState.skinId === skin?.id
    ? committedState.placements
    : defaultPlacements;
  const placements = enabled && draftState.skinId === skin?.id
    ? draftState.placements
    : committedPlacements;
  const selectedCreatureType = assetsById.get(
    placements.find((placement) => placement.instanceId === selectedInstanceId)?.assetId,
  )?.creature?.type ?? "";
  const landingSurfaces = useMemo(() => placements
    .filter((placement) => isFrogLandingAssetId(placement.assetId, selectedCreatureType))
    .map((placement) => ({
      ...placement,
      label: assetsById.get(placement.assetId)?.label ?? placement.assetId,
    })), [assetsById, placements, selectedCreatureType]);

  useEffect(() => {
    setCommittedState({
      skinId: skin?.id ?? "",
      placements: defaultPlacements,
    });
  }, [defaultPlacements, skin?.id]);

  useEffect(() => {
    if (!editingAllowed) setEditingActive(false);
  }, [editingAllowed]);

  useEffect(() => {
    gestureCleanupRef.current?.();
    gestureCleanupRef.current = null;
    setSelectedInstanceId("");
    setCreaturePreviewState({ instanceId: "", mode: "" });
    setSaveStatus("idle");
    setSaveError("");
    if (!enabled) {
      setDraftState({ skinId: skin?.id ?? "", placements: committedPlacements });
      return;
    }

    const cachedDraft = draftCacheRef.current.get(skin.id);
    const sessionPlacements = clonePlacementSnapshot(cachedDraft ?? committedPlacements);
    if (!sessionBaseCacheRef.current.has(skin.id)) {
      sessionBaseCacheRef.current.set(skin.id, clonePlacementSnapshot(committedPlacements));
    }
    sessionBaseRef.current = {
      skinId: skin.id,
      placements: clonePlacementSnapshot(sessionBaseCacheRef.current.get(skin.id)),
    };
    historyRef.current = historyCacheRef.current.get(skin.id) ?? {
      skinId: skin.id,
      past: [],
      future: [],
    };
    historyCacheRef.current.set(skin.id, historyRef.current);
    draftCacheRef.current.set(skin.id, sessionPlacements);
    setSaveStatus(
      JSON.stringify(sessionPlacements) === JSON.stringify(sessionBaseRef.current.placements)
        ? "idle"
        : "dirty",
    );
    setDraftState({
      skinId: skin.id,
      placements: sessionPlacements,
    });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(getDraftStorageKey(skin.id));
    }
  }, [committedPlacements, enabled, skin]);

  useEffect(() => () => gestureCleanupRef.current?.(), []);

  const replacePlacements = useCallback((updater, options = {}) => {
    setDraftState((current) => {
      const currentPlacements = current.skinId === skin.id
        ? current.placements
        : defaultPlacements;
      const nextPlacements = typeof updater === "function"
        ? updater(currentPlacements)
        : updater;
      const normalizedPlacements = normalizeMapPlacements(nextPlacements, skin.assetCatalog);
      if (JSON.stringify(currentPlacements) === JSON.stringify(normalizedPlacements)) return current;
      if (options.recordHistory !== false) {
        const history = historyRef.current.skinId === skin.id
          ? historyRef.current
          : { skinId: skin.id, past: [], future: [] };
        historyRef.current = {
          skinId: skin.id,
          past: [...history.past, clonePlacementSnapshot(currentPlacements)].slice(-100),
          future: [],
        };
        historyCacheRef.current.set(skin.id, historyRef.current);
      }
      const nextSnapshot = clonePlacementSnapshot(normalizedPlacements);
      draftCacheRef.current.set(skin.id, nextSnapshot);
      return {
        skinId: skin.id,
        placements: nextSnapshot,
      };
    });
    setSaveStatus("dirty");
    setSaveError("");
  }, [defaultPlacements, skin]);

  const checkpointHistory = useCallback((snapshot = placements) => {
    const history = historyRef.current.skinId === skin.id
      ? historyRef.current
      : { skinId: skin.id, past: [], future: [] };
    historyRef.current = {
      skinId: skin.id,
      past: [...history.past, clonePlacementSnapshot(snapshot)].slice(-100),
      future: [],
    };
    historyCacheRef.current.set(skin.id, historyRef.current);
  }, [placements, skin?.id]);

  const selectInstance = useCallback((instanceId) => {
    const nextInstanceId = instanceId || "";
    setSelectedInstanceId(nextInstanceId);
    setCreaturePreviewState((current) => (
      current.instanceId === nextInstanceId ? current : { instanceId: nextInstanceId, mode: "" }
    ));
  }, []);

  const previewSelectedCreature = useCallback((mode = "") => {
    if (!selectedInstanceId) return;
    setCreaturePreviewState({ instanceId: selectedInstanceId, mode });
  }, [selectedInstanceId]);

  const startEditing = useCallback(() => {
    if (!available) return;
    setEditingActive(true);
  }, [available]);

  const finishEditing = useCallback(() => {
    gestureCleanupRef.current?.();
    gestureCleanupRef.current = null;
    setSelectedInstanceId("");
    setCreaturePreviewState({ instanceId: "", mode: "" });
    draftCacheRef.current.clear();
    sessionBaseCacheRef.current.clear();
    historyCacheRef.current.clear();
    setEditingActive(false);
  }, []);

  const closeEditing = useCallback(() => {
    const sessionBase = sessionBaseRef.current.skinId === skin.id
      ? sessionBaseRef.current.placements
      : committedPlacements;
    setDraftState({ skinId: skin.id, placements: sessionBase });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(getDraftStorageKey(skin.id));
    }
    finishEditing();
  }, [committedPlacements, finishEditing, skin?.id]);

  const updateSelected = useCallback((updates) => {
    if (!selectedInstanceId) return;
    replacePlacements((current) => {
      const selected = current.find((placement) => placement.instanceId === selectedInstanceId);
      const creatureType = assetsById.get(selected?.assetId)?.creature?.type ?? "";
      if (
        !selected?.creature
        || isFreePlacedCreatureType(creatureType)
        || (!Number.isFinite(updates.x) && !Number.isFinite(updates.y))
      ) {
        return updateMapPlacement(current, selectedInstanceId, updates);
      }
      const desired = {
        x: Number.isFinite(updates.x) ? updates.x : selected.x,
        y: Number.isFinite(updates.y) ? updates.y : selected.y,
      };
      const surface = findNearestLandingSurface(current, desired, skin.referenceViewport, creatureType);
      if (!surface) return current;
      const projected = projectAnchorToLandingSurface(surface, assetsById.get(surface.assetId), desired);
      const anchors = selected.creature.anchors.map((anchor, index) => index === 0 ? {
        ...anchor,
        surfaceInstanceId: surface.instanceId,
        ...projected,
      } : anchor);
      return updateMapPlacement(current, selectedInstanceId, {
        ...updates,
        x: projected.x,
        y: projected.y,
        creature: {
          ...selected.creature,
          anchors,
        },
      });
    });
  }, [assetsById, replacePlacements, selectedInstanceId, skin.referenceViewport]);

  const updateSelectedCreature = useCallback((updates) => {
    if (!selectedInstanceId) return;
    replacePlacements((current) => {
      const selected = current.find((placement) => placement.instanceId === selectedInstanceId);
      if (!selected?.creature) return current;
      return updateMapPlacement(current, selectedInstanceId, {
        creature: { ...selected.creature, ...updates },
      });
    });
  }, [replacePlacements, selectedInstanceId]);

  const updateSelectedCreatureAnchor = useCallback((anchorId, updates) => {
    if (!selectedInstanceId) return;
    replacePlacements((current) => {
      const selected = current.find((placement) => placement.instanceId === selectedInstanceId);
      if (!selected?.creature) return current;
      const selectedAsset = assetsById.get(selected.assetId);
      const anchors = selected.creature.anchors.map((anchor) => (
        anchor.id === anchorId ? (() => {
          if (isWaterCreatureAnchor(selectedAsset, anchor)) {
            return {
              ...anchor,
              ...updates,
              kind: "water",
              surfaceInstanceId: "",
              offsetX: 0,
              offsetY: 0,
              x: clampAnchor(Number.isFinite(updates.x) ? updates.x : anchor.x),
              y: clampAnchor(Number.isFinite(updates.y) ? updates.y : anchor.y),
            };
          }
          const surface = current.find((placement) => placement.instanceId === anchor.surfaceInstanceId)
            ?? findNearestLandingSurface(
              current,
              { ...anchor, ...updates },
              skin.referenceViewport,
              selectedAsset?.creature?.type,
            );
          if (!surface) return anchor;
          const projected = projectAnchorToLandingSurface(
            surface,
            assetsById.get(surface.assetId),
            { ...anchor, ...updates },
          );
          return { ...anchor, ...updates, surfaceInstanceId: surface.instanceId, ...projected };
        })() : anchor
      ));
      const firstAnchor = anchors[0];
      return updateMapPlacement(current, selectedInstanceId, {
        ...(firstAnchor?.id === anchorId ? { x: firstAnchor.x, y: firstAnchor.y } : {}),
        creature: { ...selected.creature, anchors },
      });
    });
  }, [assetsById, replacePlacements, selectedInstanceId, skin.referenceViewport]);

  const attachSelectedCreatureAnchor = useCallback((anchorId, surfaceInstanceId) => {
    if (!selectedInstanceId || !surfaceInstanceId) return;
    replacePlacements((current) => {
      const selected = current.find((placement) => placement.instanceId === selectedInstanceId);
      const surface = current.find((placement) => placement.instanceId === surfaceInstanceId);
      const creatureType = assetsById.get(selected?.assetId)?.creature?.type ?? "";
      if (!selected?.creature || !surface || !isFrogLandingAssetId(surface.assetId, creatureType)) return current;
      const projected = projectAnchorToLandingSurface(surface, assetsById.get(surface.assetId));
      const anchors = selected.creature.anchors.map((anchor) => anchor.id === anchorId ? {
        ...anchor,
        surfaceInstanceId,
        ...projected,
      } : anchor);
      return updateMapPlacement(current, selectedInstanceId, {
        ...(anchors[0]?.id === anchorId ? { x: projected.x, y: projected.y } : {}),
        creature: { ...selected.creature, anchors },
      });
    });
  }, [assetsById, replacePlacements, selectedInstanceId]);

  const addSelectedCreatureAnchor = useCallback(() => {
    if (!selectedInstanceId) return;
    replacePlacements((current) => {
      const selected = current.find((placement) => placement.instanceId === selectedInstanceId);
      if (!selected?.creature || selected.creature.anchors.length >= 20) return current;
      const selectedAsset = assetsById.get(selected.assetId);
      if (selectedAsset?.creature?.type === "diving-frog") {
        if (selected.creature.anchors.some((anchor) => anchor.kind === "water")) return current;
        return updateMapPlacement(current, selectedInstanceId, {
          creature: {
            ...selected.creature,
            anchors: [...selected.creature.anchors, {
              id: createAnchorId(),
              kind: "water",
              surfaceInstanceId: "",
              offsetX: 0,
              offsetY: 0,
              x: clampAnchor(selected.x + 0.12),
              y: clampAnchor(selected.y + 0.08),
            }],
          },
        });
      }
      const usedSurfaceIds = new Set(selected.creature.anchors.map((anchor) => anchor.surfaceInstanceId));
      const surface = current.find((placement) => (
        isFrogLandingAssetId(placement.assetId, selectedAsset?.creature?.type)
          && !usedSurfaceIds.has(placement.instanceId)
      )) ?? current.find((placement) => (
        isFrogLandingAssetId(placement.assetId, selectedAsset?.creature?.type)
      ));
      if (!surface) return current;
      const projected = projectAnchorToLandingSurface(surface, assetsById.get(surface.assetId));
      return updateMapPlacement(current, selectedInstanceId, {
        creature: {
          ...selected.creature,
          anchors: [...selected.creature.anchors, {
            id: createAnchorId(),
            surfaceInstanceId: surface.instanceId,
            ...projected,
          }],
        },
      });
    });
  }, [assetsById, replacePlacements, selectedInstanceId]);

  const removeSelectedCreatureAnchor = useCallback((anchorId) => {
    if (!selectedInstanceId) return;
    replacePlacements((current) => {
      const selected = current.find((placement) => placement.instanceId === selectedInstanceId);
      if (!selected?.creature || selected.creature.anchors.length <= 1) return current;
      const anchors = selected.creature.anchors.filter((anchor) => anchor.id !== anchorId);
      return updateMapPlacement(current, selectedInstanceId, {
        x: anchors[0].x,
        y: anchors[0].y,
        creature: { ...selected.creature, anchors },
      });
    });
  }, [replacePlacements, selectedInstanceId]);

  const nudgeSelected = useCallback((deltaX, deltaY) => {
    if (!selectedInstanceId) return;
    const selected = placements.find((placement) => placement.instanceId === selectedInstanceId);
    const editorViewport = getMapEditorViewport(skin.referenceViewport);
    if (selected?.creature) {
      updateSelected({
        x: selected.x + deltaX / editorViewport.width,
        y: selected.y + deltaY / editorViewport.height,
      });
      return;
    }
    replacePlacements((current) => nudgeMapPlacement(
      current,
      selectedInstanceId,
      { x: deltaX, y: deltaY },
      editorViewport,
    ));
  }, [placements, replacePlacements, selectedInstanceId, skin.referenceViewport, updateSelected]);

  const resizeSelected = useCallback((deltaScale) => {
    if (!selectedInstanceId) return;
    replacePlacements((current) => resizeMapPlacement(current, selectedInstanceId, deltaScale));
  }, [replacePlacements, selectedInstanceId]);

  const undoEditing = useCallback(() => {
    if (!enabled) return;
    setDraftState((current) => {
      const history = historyRef.current;
      if (history.skinId !== skin.id || !history.past.length) return current;
      const previous = history.past.at(-1);
      historyRef.current = {
        skinId: skin.id,
        past: history.past.slice(0, -1),
        future: [clonePlacementSnapshot(current.placements), ...history.future].slice(0, 100),
      };
      historyCacheRef.current.set(skin.id, historyRef.current);
      const previousSnapshot = clonePlacementSnapshot(previous);
      draftCacheRef.current.set(skin.id, previousSnapshot);
      return { skinId: skin.id, placements: previousSnapshot };
    });
    setSaveStatus("dirty");
  }, [enabled, skin?.id]);

  const redoEditing = useCallback(() => {
    if (!enabled) return;
    setDraftState((current) => {
      const history = historyRef.current;
      if (history.skinId !== skin.id || !history.future.length) return current;
      const [next, ...remaining] = history.future;
      historyRef.current = {
        skinId: skin.id,
        past: [...history.past, clonePlacementSnapshot(current.placements)].slice(-100),
        future: remaining,
      };
      historyCacheRef.current.set(skin.id, historyRef.current);
      const nextSnapshot = clonePlacementSnapshot(next);
      draftCacheRef.current.set(skin.id, nextSnapshot);
      return { skinId: skin.id, placements: nextSnapshot };
    });
    setSaveStatus("dirty");
  }, [enabled, skin?.id]);

  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event) => {
      const shortcut = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (shortcut && !event.altKey && (key === "z" || key === "y")) {
        event.preventDefault();
        if (key === "y" || event.shiftKey) redoEditing();
        else undoEditing();
        return;
      }

      if (!selectedInstanceId) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, select, textarea, [contenteditable='true']")) return;

      const step = event.shiftKey ? 5 : 1;
      const movement = {
        ArrowDown: [0, step],
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
      }[event.key];
      if (movement) {
        event.preventDefault();
        nudgeSelected(movement[0], movement[1]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, nudgeSelected, redoEditing, selectedInstanceId, undoEditing]);

  const addAsset = useCallback((assetId) => {
    const asset = skin.assetCatalog?.find((candidate) => candidate.id === assetId);
    if (!asset) return;
    const existingInstances = placements.filter((placement) => placement.assetId === assetId);
    const maxInstances = Number.isFinite(asset.maxInstances)
      ? Math.max(1, Math.floor(asset.maxInstances))
      : Infinity;
    if (existingInstances.length >= maxInstances) {
      setSelectedInstanceId(existingInstances[0]?.instanceId ?? "");
      return;
    }
    let nextInstance = createMapPlacement(
      assetId,
      placements,
      () => createInstanceId(assetId),
      asset,
    );
    if (nextInstance.creature && !isFreePlacedCreatureType(asset.creature?.type)) {
      const surface = findNearestLandingSurface(
        placements,
        nextInstance,
        skin.referenceViewport,
        asset.creature?.type,
      );
      if (!surface) return;
      const projected = projectAnchorToLandingSurface(surface, assetsById.get(surface.assetId));
      nextInstance = {
        ...nextInstance,
        x: projected.x,
        y: projected.y,
        creature: {
          ...nextInstance.creature,
          anchors: nextInstance.creature.anchors.map((anchor, index) => index === 0 ? {
            ...anchor,
            kind: "surface",
            surfaceInstanceId: surface.instanceId,
            ...projected,
          } : anchor).concat(asset.creature?.type === "diving-frog" ? [{
            id: createAnchorId(),
            kind: "water",
            surfaceInstanceId: "",
            offsetX: 0,
            offsetY: 0,
            x: clampAnchor(projected.x + 0.12),
            y: clampAnchor(projected.y + 0.08),
          }] : []),
        },
      };
    }
    replacePlacements([...placements, nextInstance]);
    setSelectedInstanceId(nextInstance.instanceId);
  }, [assetsById, placements, replacePlacements, skin]);

  const duplicateSelected = useCallback(() => {
    if (!selectedInstanceId) return;
    const selectedAssetId = placements.find((item) => item.instanceId === selectedInstanceId)?.assetId || "asset";
    const selectedAsset = assetsById.get(selectedAssetId);
    const maxInstances = Number.isFinite(selectedAsset?.maxInstances)
      ? Math.max(1, Math.floor(selectedAsset.maxInstances))
      : Infinity;
    if (placements.filter((placement) => placement.assetId === selectedAssetId).length >= maxInstances) return;
    const result = duplicateMapPlacement(
      placements,
      selectedInstanceId,
      () => createInstanceId(selectedAssetId),
    );
    replacePlacements(result.placements);
    if (result.duplicate) setSelectedInstanceId(result.duplicate.instanceId);
  }, [assetsById, placements, replacePlacements, selectedInstanceId]);

  const deleteSelected = useCallback(() => {
    if (!selectedInstanceId) return;
    replacePlacements((current) => deleteMapPlacement(current, selectedInstanceId));
    setSelectedInstanceId("");
  }, [replacePlacements, selectedInstanceId]);

  useEffect(() => {
    if (!enabled || !selectedInstanceId) return undefined;
    const handleDeleteKey = (event) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, select, textarea, [contenteditable='true']")) return;
      event.preventDefault();
      deleteSelected();
    };
    window.addEventListener("keydown", handleDeleteKey);
    return () => window.removeEventListener("keydown", handleDeleteKey);
  }, [deleteSelected, enabled, selectedInstanceId]);

  const moveSelectedLayer = useCallback((direction) => {
    if (!selectedInstanceId) return;
    replacePlacements((current) => moveMapPlacementLayer(current, selectedInstanceId, direction));
  }, [replacePlacements, selectedInstanceId]);

  const restoreSelected = useCallback(() => {
    if (!selectedInstanceId) return;
    const original = sessionBaseRef.current.skinId === skin.id
      ? sessionBaseRef.current.placements.find((item) => item.instanceId === selectedInstanceId)
      : null;
    if (!original) {
      deleteSelected();
      return;
    }
    replacePlacements((current) => updateMapPlacement(current, selectedInstanceId, original));
  }, [deleteSelected, replacePlacements, selectedInstanceId, skin?.id]);

  const beginAssetGesture = useCallback((event, layer, gestureType) => {
    if (!enabled) return;
    event.preventDefault();
    event.stopPropagation();
    gestureCleanupRef.current?.();
    setSelectedInstanceId(layer.instanceId);

    const arena = event.currentTarget.closest(".shooterArena");
    const arenaRect = arena?.getBoundingClientRect();
    const placement = placements.find((item) => item.instanceId === layer.instanceId);
    if (!arenaRect || !placement) return;
    checkpointHistory(placements);

    const startX = event.clientX;
    const startY = event.clientY;
    const centerX = arenaRect.left + placement.x * arenaRect.width;
    const centerY = arenaRect.top + placement.y * arenaRect.height;
    const startDistance = Math.max(12, Math.hypot(startX - centerX, startY - centerY));
    const assetElement = event.currentTarget.closest(".shooterMapSkinAsset");
    const baseDisplayWidth = Math.max(1, (assetElement?.offsetWidth ?? 1) * placement.scale);
    const baseDisplayHeight = Math.max(1, (assetElement?.offsetHeight ?? 1) * placement.scale);
    const cornerIndex = gestureType.startsWith("corner:")
      ? Number(gestureType.slice("corner:".length))
      : -1;
    const startCorners = normalizePerspectiveCorners(placement.perspectiveCorners);
    const rotationRadians = (placement.rotation ?? 0) * (Math.PI / 180);
    const rotationCosine = Math.cos(rotationRadians);
    const rotationSine = Math.sin(rotationRadians);

    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      if (gestureType === "scale") {
        const distance = Math.max(8, Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY));
        replacePlacements((current) => updateMapPlacement(current, layer.instanceId, {
          scale: placement.scale * (distance / startDistance),
        }), { recordHistory: false });
        return;
      }

      if (cornerIndex >= 0 && cornerIndex < startCorners.length) {
        const screenDeltaX = moveEvent.clientX - startX;
        const screenDeltaY = moveEvent.clientY - startY;
        const rotatedDeltaX = (screenDeltaX * rotationCosine) + (screenDeltaY * rotationSine);
        const rotatedDeltaY = (-screenDeltaX * rotationSine) + (screenDeltaY * rotationCosine);
        const axisScaleX = Math.abs(placement.scaleX ?? 1) < 0.1 ? 0.1 : (placement.scaleX ?? 1);
        const axisScaleY = Math.abs(placement.scaleY ?? 1) < 0.1 ? 0.1 : (placement.scaleY ?? 1);
        const nextCorners = startCorners.map((corner, index) => index === cornerIndex ? {
          x: corner.x + (rotatedDeltaX / (baseDisplayWidth * axisScaleX)),
          y: corner.y + (rotatedDeltaY / (baseDisplayHeight * axisScaleY)),
        } : corner);
        replacePlacements((current) => updateMapPlacement(current, layer.instanceId, {
          perspectiveCorners: nextCorners,
        }), { recordHistory: false });
        return;
      }

      replacePlacements((current) => updateMapPlacement(current, layer.instanceId, {
        ...(() => {
          const desired = {
            x: placement.x + (moveEvent.clientX - startX) / arenaRect.width,
            y: placement.y + (moveEvent.clientY - startY) / arenaRect.height,
          };
          const creatureType = assetsById.get(placement.assetId)?.creature?.type ?? "";
          if (!placement.creature || isFreePlacedCreatureType(creatureType)) return desired;
          const surface = findNearestLandingSurface(current, desired, skin.referenceViewport, creatureType);
          if (!surface) return {};
          const projected = projectAnchorToLandingSurface(surface, assetsById.get(surface.assetId), desired);
          return {
            x: projected.x,
            y: projected.y,
            creature: {
              ...placement.creature,
              anchors: placement.creature.anchors.map((anchor, index) => index === 0 ? {
                ...anchor,
                surfaceInstanceId: surface.instanceId,
                ...projected,
              } : anchor),
            },
          };
        })(),
      }), { recordHistory: false });
    };

    const finishGesture = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishGesture);
      window.removeEventListener("pointercancel", finishGesture);
      gestureCleanupRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", finishGesture, { once: true });
    window.addEventListener("pointercancel", finishGesture, { once: true });
    gestureCleanupRef.current = finishGesture;
  }, [assetsById, checkpointHistory, enabled, placements, replacePlacements, skin.referenceViewport]);

  const beginCreatureAnchorGesture = useCallback((event, layer, anchorId) => {
    if (!enabled) return;
    event.preventDefault();
    event.stopPropagation();
    gestureCleanupRef.current?.();
    setSelectedInstanceId(layer.instanceId);
    const arena = event.currentTarget.closest(".shooterArena");
    const arenaRect = arena?.getBoundingClientRect();
    if (!arenaRect) return;
    checkpointHistory(placements);

    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const x = clampAnchor((moveEvent.clientX - arenaRect.left) / arenaRect.width);
      const y = clampAnchor((moveEvent.clientY - arenaRect.top) / arenaRect.height);
      replacePlacements((current) => {
        const selected = current.find((placement) => placement.instanceId === layer.instanceId);
        if (!selected?.creature) return current;
        const selectedAsset = assetsById.get(selected.assetId);
        const editedAnchor = selected.creature.anchors.find((anchor) => anchor.id === anchorId);
        if (isWaterCreatureAnchor(selectedAsset, editedAnchor)) {
          const anchors = selected.creature.anchors.map((anchor) => anchor.id === anchorId ? {
            ...anchor,
            kind: "water",
            surfaceInstanceId: "",
            offsetX: 0,
            offsetY: 0,
            x,
            y,
          } : anchor);
          return updateMapPlacement(current, layer.instanceId, {
            creature: { ...selected.creature, anchors },
          });
        }
        const surface = findNearestLandingSurface(
          current,
          { x, y },
          skin.referenceViewport,
          selectedAsset?.creature?.type,
        );
        if (!surface) return current;
        const projected = projectAnchorToLandingSurface(surface, assetsById.get(surface.assetId), { x, y });
        const anchors = selected.creature.anchors.map((anchor) => (
          anchor.id === anchorId ? {
            ...anchor,
            surfaceInstanceId: surface.instanceId,
            ...projected,
          } : anchor
        ));
        const firstAnchor = anchors[0];
        return updateMapPlacement(current, layer.instanceId, {
          ...(firstAnchor?.id === anchorId ? { x: projected.x, y: projected.y } : {}),
          creature: { ...selected.creature, anchors },
        });
      }, { recordHistory: false });
    };
    const finishGesture = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishGesture);
      window.removeEventListener("pointercancel", finishGesture);
      gestureCleanupRef.current = null;
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", finishGesture, { once: true });
    window.addEventListener("pointercancel", finishGesture, { once: true });
    gestureCleanupRef.current = finishGesture;
  }, [assetsById, checkpointHistory, enabled, placements, replacePlacements, skin.referenceViewport]);

  const handleStagePointerDown = useCallback((event) => {
    if (event.target === event.currentTarget || event.target.classList?.contains("shooterMapSkinBackground")) {
      setSelectedInstanceId("");
    }
  }, []);

  const savePlacements = useCallback(async () => {
    if (!enabled) return null;
    setSaveStatus("saving");
    setSaveError("");
    try {
      const normalizedPlacements = normalizeMapPlacements(placements, skin.assetCatalog);
      const savedPlacements = normalizeMapPlacements(
        await requestMapLayoutSave(skin.id, normalizedPlacements),
        skin.assetCatalog,
      );
      window.localStorage.removeItem(getDraftStorageKey(skin.id));
      setSaveStatus("saved");
      return savedPlacements;
    } catch (error) {
      console.error("Map layout save failed", error);
      setSaveStatus("error");
      setSaveError(getSaveErrorMessage(error));
      return null;
    }
  }, [enabled, placements, skin]);

  const sessionBasePlacements = sessionBaseRef.current.skinId === skin?.id
    ? sessionBaseRef.current.placements
    : committedPlacements;
  const currentHasChanges = JSON.stringify(placements) !== JSON.stringify(sessionBasePlacements);
  const hasChanges = currentHasChanges || [...draftCacheRef.current.entries()].some(([skinId, draft]) => {
    const base = sessionBaseCacheRef.current.get(skinId);
    return base && JSON.stringify(draft) !== JSON.stringify(base);
  });
  const activeHistory = historyRef.current.skinId === skin?.id
    ? historyRef.current
    : { past: [], future: [] };
  const canUndo = activeHistory.past.length > 0;
  const canRedo = activeHistory.future.length > 0;

  const saveSessionPlacements = useCallback(async () => {
    if (!enabled) return null;
    const changedDrafts = [...draftCacheRef.current.entries()].filter(([skinId, draft]) => {
      const base = sessionBaseCacheRef.current.get(skinId);
      return base && JSON.stringify(draft) !== JSON.stringify(base);
    });
    if (!changedDrafts.length) return clonePlacementSnapshot(placements);

    setSaveStatus("saving");
    setSaveError("");
    try {
      const savedEntries = await Promise.all(changedDrafts.map(async ([skinId, draft]) => [
        skinId,
        await requestMapLayoutSave(skinId, draft),
      ]));
      savedEntries.forEach(([skinId]) => window.localStorage.removeItem(getDraftStorageKey(skinId)));
      const currentSaved = savedEntries.find(([skinId]) => skinId === skin.id)?.[1] ?? placements;
      setSaveStatus("saved");
      return normalizeMapPlacements(currentSaved, skin.assetCatalog);
    } catch (error) {
      console.error("Map session save failed", error);
      setSaveStatus("error");
      setSaveError(getSaveErrorMessage(error));
      return null;
    }
  }, [enabled, placements, skin]);

  const applyEditing = useCallback(async (beforeFinish) => {
    if (!enabled) return false;
    if (!hasChanges) {
      if (typeof beforeFinish === "function" && await beforeFinish() === false) {
        setSaveStatus("error");
        setSaveError("이펙트 보정값을 저장하지 못했습니다.");
        return false;
      }
      setSaveError("");
      finishEditing();
      return true;
    }
    const savedPlacements = await saveSessionPlacements();
    if (!savedPlacements) return false;
    if (typeof beforeFinish === "function" && await beforeFinish() === false) {
      setSaveStatus("error");
      setSaveError("이펙트 보정값을 저장하지 못했습니다.");
      return false;
    }
    const appliedPlacements = clonePlacementSnapshot(savedPlacements);
    setCommittedState({ skinId: skin.id, placements: appliedPlacements });
    sessionBaseRef.current = { skinId: skin.id, placements: appliedPlacements };
    historyRef.current = { skinId: skin.id, past: [], future: [] };
    finishEditing();
    return true;
  }, [enabled, finishEditing, hasChanges, saveSessionPlacements, skin?.id]);

  const selectedPlacement = placements.find((item) => item.instanceId === selectedInstanceId) ?? null;
  const selectedAsset = selectedPlacement ? assetsById.get(selectedPlacement.assetId) : null;
  const canDuplicateSelected = Boolean(selectedPlacement) && (
    !Number.isFinite(selectedAsset?.maxInstances)
    || placements.filter((placement) => placement.assetId === selectedPlacement.assetId).length < selectedAsset.maxInstances
  );
  const renderSkin = useMemo(() => {
    const resolvedSkin = resolveLayeredShooterMap(skin, placements);
    if (!enabled || !creaturePreviewState.mode || !creaturePreviewState.instanceId) {
      return resolvedSkin;
    }
    return {
      ...resolvedSkin,
      layers: resolvedSkin.layers.map((layer) => (
        layer.instanceId === creaturePreviewState.instanceId && layer.creature
          ? { ...layer, creature: { ...layer.creature, previewMode: creaturePreviewState.mode } }
          : layer
      )),
    };
  }, [creaturePreviewState, enabled, placements, skin]);

  return {
    addAsset,
    addSelectedCreatureAnchor,
    applyEditing,
    attachSelectedCreatureAnchor,
    assetCatalog: skin?.assetCatalog ?? [],
    available,
    beginAssetGesture,
    beginCreatureAnchorGesture,
    canDuplicateSelected,
    canRedo,
    canUndo,
    closeEditing,
    deleteSelected,
    duplicateSelected,
    enabled,
    handleStagePointerDown,
    hasChanges,
    landingSurfaces,
    moveSelectedLayer,
    nudgeSelected,
    placements,
    previewSelectedCreature,
    renderSkin,
    removeSelectedCreatureAnchor,
    redoEditing,
    resizeSelected,
    restoreSelected,
    savePlacements,
    saveError,
    saveStatus,
    selectInstance,
    selectedAsset,
    selectedInstanceId,
    selectedPlacement,
    creaturePreviewMode: creaturePreviewState.instanceId === selectedInstanceId
      ? creaturePreviewState.mode
      : "",
    skin,
    startEditing,
    updateSelected,
    updateSelectedCreature,
    updateSelectedCreatureAnchor,
    undoEditing,
  };
}
