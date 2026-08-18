import {
  DEFAULT_PERSPECTIVE_CORNERS,
  normalizePerspectiveCorners,
} from "../freeTransform.js";

export const MAP_EDIT_ANIMATION_TYPES = Object.freeze([
  Object.freeze({ id: "none", label: "없음" }),
  Object.freeze({ id: "float", label: "미세 부유" }),
  Object.freeze({ id: "sway", label: "미세 흔들림" }),
  Object.freeze({ id: "rotate", label: "지속 회전" }),
  Object.freeze({ id: "pulse", label: "빛 변화" }),
]);

export const FROG_MOVEMENT_MODES = Object.freeze([
  Object.freeze({ id: "sequence", label: "순차 이동" }),
  Object.freeze({ id: "random", label: "랜덤 이동" }),
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizedHexColor(value, fallback) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}

function normalizedAxisScale(value, fallback = 1) {
  const scale = clamp(finiteNumber(value, fallback), -3, 3);
  if (Math.abs(scale) >= 0.1) return scale;
  return scale < 0 ? -0.1 : 0.1;
}

function getAssetCatalogEntry(assetCatalog, assetId) {
  return assetCatalog.find((asset) => (
    typeof asset === "string" ? asset === assetId : asset?.id === assetId
  ));
}

function isCreatureLandingAssetId(assetId = "", creatureAssetId = "") {
  return assetId.startsWith("rock-")
    || assetId.startsWith("lily-pad-")
    || assetId === "stone-bridge-crossing"
    || (creatureAssetId === "ambient-sleeping-frog" && assetId === "guitar-dock-platform");
}

function repairCreatureLandingReferences(placements) {
  const placementsById = new Map(placements.map((placement) => [placement.instanceId, placement]));

  return placements.map((placement) => {
    if (!placement.creature) return placement;
    const landingSurfaces = placements.filter((surface) => (
      isCreatureLandingAssetId(surface.assetId, placement.assetId)
    ));
    const anchors = placement.creature.anchors.map((anchor) => {
      if (anchor.kind === "water") return anchor;
      const referencedSurface = placementsById.get(anchor.surfaceInstanceId);
      if (referencedSurface && isCreatureLandingAssetId(referencedSurface.assetId, placement.assetId)) return anchor;

      const fallbackSurface = landingSurfaces.reduce((nearest, surface) => {
        const distance = Math.hypot(surface.x - anchor.x, surface.y - anchor.y);
        return !nearest || distance < nearest.distance ? { distance, surface } : nearest;
      }, null)?.surface;
      if (!fallbackSurface) return anchor;

      const offsetX = clamp(finiteNumber(anchor.offsetX, 0), -0.5, 0.5);
      const offsetY = clamp(finiteNumber(anchor.offsetY, 0), -0.5, 0.5);
      return {
        ...anchor,
        surfaceInstanceId: fallbackSurface.instanceId,
        offsetX,
        offsetY,
        x: clamp(fallbackSurface.x + offsetX, -0.25, 1.25),
        y: clamp(fallbackSurface.y + offsetY, -0.25, 1.25),
      };
    });
    return {
      ...placement,
      creature: { ...placement.creature, anchors },
    };
  });
}

function normalizeCreatureSettings(placement, asset) {
  if (!asset || typeof asset === "string" || !asset.creature) return null;
  const defaults = asset.creature.defaults ?? {};
  const source = placement?.creature ?? {};
  const anchorIds = new Set();
  const anchors = (Array.isArray(source.anchors) ? source.anchors : [{
    id: "frog-point-a",
    x: placement?.x,
    y: placement?.y,
  }]).slice(0, 20).flatMap((point, index) => {
    const id = String(point?.id || `frog-point-${index + 1}`).slice(0, 80);
    if (!id || anchorIds.has(id)) return [];
    anchorIds.add(id);
    const kind = point?.kind === "water" ? "water" : "surface";
    return [{
      id,
      kind,
      x: clamp(finiteNumber(point?.x, placement?.x ?? 0.5), -0.25, 1.25),
      y: clamp(finiteNumber(point?.y, placement?.y ?? 0.5), -0.25, 1.25),
      surfaceInstanceId: String(point?.surfaceInstanceId ?? "").slice(0, 120),
      offsetX: clamp(finiteNumber(point?.offsetX, 0), -0.5, 0.5),
      offsetY: clamp(finiteNumber(point?.offsetY, 0), -0.5, 0.5),
    }];
  });

  if (asset.creature.type === "sleeping-frog") {
    return {
      enabled: source.enabled ?? defaults.enabled ?? true,
      sleepInterval: clamp(finiteNumber(source.sleepInterval, defaults.sleepInterval ?? 7.8), 3, 30),
      fallChance: clamp(finiteNumber(source.fallChance, defaults.fallChance ?? 0.22), 0, 0.75),
      flatDuration: clamp(finiteNumber(source.flatDuration, defaults.flatDuration ?? 8.5), 2, 30),
      openMouthDuration: clamp(finiteNumber(source.openMouthDuration, defaults.openMouthDuration ?? 1.8), 0.3, 8),
      animationSpeed: clamp(finiteNumber(source.animationSpeed, defaults.animationSpeed ?? 1), 0.35, 2.5),
      bubbleEnabled: source.bubbleEnabled ?? defaults.bubbleEnabled ?? true,
      bubbleBaseScale: clamp(finiteNumber(source.bubbleBaseScale, defaults.bubbleBaseScale ?? 0.82), 0.45, 1.5),
      bubbleMaxScale: clamp(finiteNumber(source.bubbleMaxScale, defaults.bubbleMaxScale ?? 2.45), 1.2, 3),
      bubbleSpeed: clamp(finiteNumber(source.bubbleSpeed, defaults.bubbleSpeed ?? 1), 0.4, 2),
      bubbleOpacity: clamp(finiteNumber(source.bubbleOpacity, defaults.bubbleOpacity ?? 0.78), 0.2, 1),
      bodyColor: normalizedHexColor(source.bodyColor, defaults.bodyColor ?? "#86c92a"),
      bodySaturation: clamp(finiteNumber(source.bodySaturation, defaults.bodySaturation ?? 1), 0.45, 1.8),
      bodyBrightness: clamp(finiteNumber(source.bodyBrightness, defaults.bodyBrightness ?? 1), 0.55, 1.45),
      bubbleColor: normalizedHexColor(source.bubbleColor, defaults.bubbleColor ?? "#8fe7ee"),
      anchors: anchors.slice(0, 1).map((anchor) => ({ ...anchor, kind: "surface" })),
    };
  }

  return {
    enabled: source.enabled ?? defaults.enabled ?? true,
    mode: FROG_MOVEMENT_MODES.some((option) => option.id === source.mode)
      ? source.mode
      : defaults.mode ?? "random",
    jumpInterval: clamp(finiteNumber(source.jumpInterval, defaults.jumpInterval ?? 4.8), 1, 20),
    jumpDistance: clamp(finiteNumber(source.jumpDistance, defaults.jumpDistance ?? 0.42), 0.04, 1.5),
    jumpHeight: clamp(finiteNumber(source.jumpHeight, defaults.jumpHeight ?? 0.11), 0.02, 0.3),
    animationSpeed: clamp(finiteNumber(source.animationSpeed, defaults.animationSpeed ?? 1), 0.25, 3),
    anchors,
  };
}

export function normalizeMapPlacement(placement, assetCatalog = []) {
  const assetIds = assetCatalog.map((asset) => (typeof asset === "string" ? asset : asset.id));
  const fallbackAssetId = assetIds[0] ?? "";
  const assetId = assetIds.includes(placement?.assetId)
    ? placement.assetId
    : fallbackAssetId;
  if (!assetId) return null;

  const animationIds = MAP_EDIT_ANIMATION_TYPES.map((option) => option.id);
  const animation = animationIds.includes(placement?.animation)
    ? placement.animation
    : "none";

  const normalized = {
    instanceId: String(placement?.instanceId || `${assetId}-instance`),
    assetId,
    x: clamp(finiteNumber(placement?.x, 0.5), -0.25, 1.25),
    y: clamp(finiteNumber(placement?.y, 0.5), -0.25, 1.25),
    scale: clamp(finiteNumber(placement?.scale, 1), 0.1, 3),
    rotation: clamp(finiteNumber(placement?.rotation, 0), -180, 180),
    scaleX: normalizedAxisScale(placement?.scaleX),
    scaleY: normalizedAxisScale(placement?.scaleY),
    skewX: clamp(finiteNumber(placement?.skewX, 0), -60, 60),
    skewY: clamp(finiteNumber(placement?.skewY, 0), -60, 60),
    perspective: clamp(finiteNumber(placement?.perspective, 900), 150, 3000),
    tiltX: clamp(finiteNumber(placement?.tiltX, 0), -75, 75),
    tiltY: clamp(finiteNumber(placement?.tiltY, 0), -75, 75),
    perspectiveCorners: normalizePerspectiveCorners(placement?.perspectiveCorners),
    layer: Math.round(clamp(finiteNumber(placement?.layer, 1), -999, 999)),
    animation,
    animationSpeed: clamp(finiteNumber(placement?.animationSpeed, 1), 0.1, 5),
  };
  const creature = normalizeCreatureSettings(placement, getAssetCatalogEntry(assetCatalog, assetId));
  return creature ? { ...normalized, creature } : normalized;
}

export function normalizeMapPlacements(placements, assetCatalog = []) {
  const seenInstanceIds = new Set();

  const normalizedPlacements = (Array.isArray(placements) ? placements : []).flatMap((placement) => {
    const normalized = normalizeMapPlacement(placement, assetCatalog);
    if (!normalized || seenInstanceIds.has(normalized.instanceId)) return [];
    seenInstanceIds.add(normalized.instanceId);
    return [normalized];
  });

  return repairCreatureLandingReferences(normalizedPlacements);
}

export function createMapPlacement(assetId, placements, createId = () => `${assetId}-${Date.now().toString(36)}`, asset = null) {
  const highestLayer = placements.reduce(
    (highest, placement) => Math.max(highest, placement.layer),
    0,
  );

  const placement = {
    instanceId: createId(),
    assetId,
    x: 0.5,
    y: 0.5,
    scale: 0.7,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    perspective: 900,
    tiltX: 0,
    tiltY: 0,
    perspectiveCorners: DEFAULT_PERSPECTIVE_CORNERS.map((corner) => ({ ...corner })),
    layer: highestLayer + 1,
    animation: "none",
    animationSpeed: 1,
  };
  const creature = normalizeCreatureSettings(placement, asset);
  return creature ? { ...placement, creature } : placement;
}

export function updateMapPlacement(placements, instanceId, updates) {
  return placements.map((placement) => (
    placement.instanceId === instanceId
      ? { ...placement, ...updates }
      : placement
  ));
}

export function deleteMapPlacement(placements, instanceId) {
  return placements.filter((placement) => placement.instanceId !== instanceId);
}

export function nudgeMapPlacement(
  placements,
  instanceId,
  deltaPixels,
  referenceViewport = { width: 390, height: 844 },
) {
  const width = Math.max(1, finiteNumber(referenceViewport?.width, 390));
  const height = Math.max(1, finiteNumber(referenceViewport?.height, 844));
  const deltaX = finiteNumber(deltaPixels?.x, 0) / width;
  const deltaY = finiteNumber(deltaPixels?.y, 0) / height;

  return placements.map((placement) => (
    placement.instanceId === instanceId
      ? {
        ...placement,
        x: clamp(placement.x + deltaX, -0.25, 1.25),
        y: clamp(placement.y + deltaY, -0.25, 1.25),
        ...(placement.creature ? {
          creature: {
            ...placement.creature,
            anchors: placement.creature.anchors.map((anchor) => ({
              ...anchor,
              x: clamp(anchor.x + deltaX, -0.25, 1.25),
              y: clamp(anchor.y + deltaY, -0.25, 1.25),
              offsetX: clamp(finiteNumber(anchor.offsetX, 0) + deltaX, -0.5, 0.5),
              offsetY: clamp(finiteNumber(anchor.offsetY, 0) + deltaY, -0.5, 0.5),
            })),
          },
        } : {}),
      }
      : placement
  ));
}

export function resizeMapPlacement(placements, instanceId, deltaScale) {
  const delta = finiteNumber(deltaScale, 0);
  return placements.map((placement) => (
    placement.instanceId === instanceId
      ? { ...placement, scale: clamp(placement.scale + delta, 0.1, 3) }
      : placement
  ));
}

export function duplicateMapPlacement(placements, instanceId, createId) {
  const source = placements.find((placement) => placement.instanceId === instanceId);
  if (!source) return { placements, duplicate: null };

  const duplicate = {
    ...source,
    instanceId: createId(),
    x: clamp(source.x + 0.035, -0.25, 1.25),
    y: clamp(source.y + 0.035, -0.25, 1.25),
    layer: Math.max(...placements.map((placement) => placement.layer), 0) + 1,
    ...(source.creature ? {
      creature: {
        ...source.creature,
        anchors: source.creature.anchors.map((anchor) => ({
          ...anchor,
          id: `${anchor.id}-${Math.random().toString(36).slice(2, 6)}`,
          x: clamp(anchor.x + 0.035, -0.25, 1.25),
          y: clamp(anchor.y + 0.035, -0.25, 1.25),
          offsetX: clamp(finiteNumber(anchor.offsetX, 0) + 0.035, -0.5, 0.5),
          offsetY: clamp(finiteNumber(anchor.offsetY, 0) + 0.035, -0.5, 0.5),
        })),
      },
    } : {}),
  };

  return {
    placements: [...placements, duplicate],
    duplicate,
  };
}

export function moveMapPlacementLayer(placements, instanceId, direction) {
  const selected = placements.find((placement) => placement.instanceId === instanceId);
  if (!selected) return placements;

  const layers = placements.map((placement) => placement.layer);
  const nextLayer = direction === "front"
    ? Math.max(...layers, 0) + 1
    : Math.min(...layers, 0) - 1;

  return updateMapPlacement(placements, instanceId, { layer: nextLayer });
}
