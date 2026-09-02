import { ABYSSAL_MOON_CATHEDRAL_MAP_SKIN } from "./skins/abyssalMoonCathedral.js";
import { AUTUMN_MOON_TEMPLE_PATH_MAP_SKIN } from "./skins/autumnMoonTemplePath.js";
import { CELESTIAL_ECLIPSE_CLOCKTOWER_MAP_SKIN } from "./skins/celestialEclipseClocktower.js";
import { COASTAL_COVE_MAP_SKIN } from "./skins/coastalCove.js";
import { CLOCKWORK_OPERA_CITADEL_MAP_SKIN } from "./skins/clockworkOperaCitadel.js";
import { LAVA_CANYON_MAP_SKIN } from "./skins/lavaCanyon.js";
import { PARK_MAP_SKIN } from "./skins/park.js";
import { PSEUDO3D_TEST_MAP_SKIN } from "./skins/pseudo3dTest.js";
import { RIVER_MAP_SKIN } from "./skins/river.js";
import { THREE_D_LAB_MAP_SKIN } from "./skins/threeDLab.js";

export const LAYERED_SHOOTER_MAP_SKINS = Object.freeze([
  RIVER_MAP_SKIN,
  LAVA_CANYON_MAP_SKIN,
  COASTAL_COVE_MAP_SKIN,
  PARK_MAP_SKIN,
  CLOCKWORK_OPERA_CITADEL_MAP_SKIN,
  ABYSSAL_MOON_CATHEDRAL_MAP_SKIN,
  CELESTIAL_ECLIPSE_CLOCKTOWER_MAP_SKIN,
  AUTUMN_MOON_TEMPLE_PATH_MAP_SKIN,
]);

export const DEVELOPER_SHOOTER_MAP_SKINS = Object.freeze([
  PSEUDO3D_TEST_MAP_SKIN,
  THREE_D_LAB_MAP_SKIN,
]);

export function getNextShooterMapId(currentMapId) {
  if (LAYERED_SHOOTER_MAP_SKINS.length === 0) return currentMapId;

  const currentIndex = LAYERED_SHOOTER_MAP_SKINS.findIndex((map) => map.id === currentMapId);
  const nextIndex = currentIndex < 0
    ? 0
    : (currentIndex + 1) % LAYERED_SHOOTER_MAP_SKINS.length;
  return LAYERED_SHOOTER_MAP_SKINS[nextIndex].id;
}

export function getShooterMapsForLayout(
  isMobileLayout = true,
  { includeMobileOnly = false, isPortraitLayout = true } = {},
) {
  return LAYERED_SHOOTER_MAP_SKINS.filter(
    (map) => isShooterMapAvailableForLayout(map, isMobileLayout, {
      includeMobileOnly,
      isPortraitLayout,
    }),
  );
}

export function isShooterMapAvailableForLayout(
  map,
  isMobileLayout = true,
  { includeMobileOnly = false, isPortraitLayout = true } = {},
) {
  if (map?.portraitOnly && !isPortraitLayout) return false;
  return !map?.mobileOnly || isMobileLayout || includeMobileOnly;
}

export function getRandomShooterMapId(
  currentMapId,
  randomValue = Math.random(),
  maps = LAYERED_SHOOTER_MAP_SKINS,
) {
  if (maps.length === 0) return currentMapId;

  const candidates = maps.length > 1
    ? maps.filter((map) => map.id !== currentMapId)
    : maps;
  const normalizedRandom = Number.isFinite(randomValue)
    ? Math.min(0.999999, Math.max(0, randomValue))
    : 0;
  return candidates[Math.floor(normalizedRandom * candidates.length)].id;
}

export function isLayeredShooterMap(map) {
  return map?.kind === "layered";
}

export function isPseudo3DShooterMap(map) {
  return map?.renderer === "pseudo3d";
}

export function isThreeDLabShooterMap(map) {
  return map?.renderer === "perspective3d";
}

export function isEditableShooterMap(map) {
  return isLayeredShooterMap(map);
}

export function getShooterMapAssetSources(map, { includeFallbacks = true } = {}) {
  if (isPseudo3DShooterMap(map)) {
    return [...new Set((map.decorations ?? [])
      .map((decoration) => decoration?.src)
      .filter((src) => typeof src === "string" && src.trim()))];
  }
  if (!isLayeredShooterMap(map)) return [];

  return [...new Set([
    map.background?.src,
    includeFallbacks ? map.background?.fallbackSrc : "",
    map.architectureMask?.src,
    includeFallbacks ? map.architectureMask?.fallbackSrc : "",
    map.animatedBackdrop?.src,
    includeFallbacks ? map.animatedBackdrop?.fallbackSrc : "",
    map.foregroundOccluder?.src,
    includeFallbacks ? map.foregroundOccluder?.fallbackSrc : "",
    ...(map.runtimeAnimation?.preloadSources ?? []),
    ...(map.assetCatalog ?? []).flatMap((asset) => [
      asset?.src,
      ...(asset?.farWhale?.frames ?? []),
      asset?.spriteSheet?.staticSrc,
      ...(asset?.spriteSheet?.frames ?? []).map((frame) => (
        typeof frame === "string" ? frame : frame?.src
      )),
      ...(asset?.composite?.parts ?? []).map((part) => part?.src),
      ...Object.values(asset?.creature?.frames ?? {}),
    ]),
    ...(map.ambientEvents ?? []).flatMap((event) => [
      event?.flightSheet?.src,
      event?.breathSheet?.src,
    ]),
    ...(map.layers ?? []).flatMap((layer) => [
      layer?.src,
      ...(layer?.composite?.parts ?? []).map((part) => part?.src),
    ]),
  ].filter((src) => typeof src === "string" && src.trim()))];
}

function isFrogLandingAssetId(assetId = "", creatureType = "") {
  return assetId.startsWith("rock-")
    || assetId.startsWith("lily-pad-")
    || assetId === "stone-bridge-crossing"
    || (creatureType === "sleeping-frog" && assetId === "guitar-dock-platform");
}

function resolveCreatureSettings(settings, placementsById, creatureType = "") {
  if (!settings) return settings;
  const anchors = (settings.anchors ?? []).flatMap((anchor) => {
    if (anchor.kind === "water") {
      return [{
        ...anchor,
        x: Number.isFinite(anchor.x) ? anchor.x : 0.5,
        y: Number.isFinite(anchor.y) ? anchor.y : 0.5,
      }];
    }
    const surface = placementsById.get(anchor.surfaceInstanceId);
    if (!surface || !isFrogLandingAssetId(surface.assetId, creatureType)) return [];
    return [{
      ...anchor,
      x: surface.x + (Number.isFinite(anchor.offsetX) ? anchor.offsetX : 0),
      y: surface.y + (Number.isFinite(anchor.offsetY) ? anchor.offsetY : 0),
    }];
  });
  return { ...settings, anchors };
}

export function resolveLayeredShooterMap(map, placements = map?.layout) {
  if (!isLayeredShooterMap(map)) return map;

  const assetsById = new Map(
    (map.assetCatalog ?? []).map((asset) => [asset.id, asset]),
  );
  const placementsById = new Map(
    (placements ?? []).map((placement) => [placement.instanceId, placement]),
  );
  const layers = (placements ?? []).flatMap((placement) => {
    const asset = assetsById.get(placement.assetId);
    if (!asset) return [];

    const animationType = placement.animation && placement.animation !== "none"
      ? placement.animation
      : "";

    return [{
      id: placement.instanceId,
      instanceId: placement.instanceId,
      assetId: placement.assetId,
      label: asset.label,
      src: asset.src,
      farWhale: asset.farWhale,
      composite: asset.composite,
      eventActor: asset.eventActor,
      spriteSheet: asset.spriteSheet,
      creature: asset.creature ? {
        ...asset.creature,
        settings: resolveCreatureSettings(
          placement.creature ?? asset.creature.defaults,
          placementsById,
          asset.creature.type,
        ),
      } : undefined,
      slot: asset.slot ?? "background-environment",
      aspectRatio: asset.aspectRatio,
      coordinateSpace: "normalized",
      placement: {
        x: placement.x,
        y: placement.y,
        width: asset.baseWidth ?? 0.4,
        scale: placement.scale,
        rotation: placement.rotation,
        scaleX: placement.scaleX,
        scaleY: placement.scaleY,
        skewX: placement.skewX,
        skewY: placement.skewY,
        perspective: placement.perspective,
        tiltX: placement.tiltX,
        tiltY: placement.tiltY,
        perspectiveCorners: placement.perspectiveCorners,
        anchorX: asset.anchorX,
        anchorY: asset.anchorY,
      },
      zIndex: placement.layer,
      animationSpeed: placement.animationSpeed,
      animation: animationType ? {
        type: animationType,
        speed: placement.animationSpeed,
      } : undefined,
    }];
  });

  return {
    ...map,
    layers,
  };
}
