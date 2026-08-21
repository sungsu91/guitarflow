import { COASTAL_COVE_MAP_SKIN } from "./skins/coastalCove.js";
import { LAVA_CANYON_MAP_SKIN } from "./skins/lavaCanyon.js";
import { PARK_MAP_SKIN } from "./skins/park.js";
import { RIVER_MAP_SKIN } from "./skins/river.js";

export const LAYERED_SHOOTER_MAP_SKINS = Object.freeze([
  RIVER_MAP_SKIN,
  LAVA_CANYON_MAP_SKIN,
  COASTAL_COVE_MAP_SKIN,
  PARK_MAP_SKIN,
]);

export function getNextShooterMapId(currentMapId) {
  if (LAYERED_SHOOTER_MAP_SKINS.length === 0) return currentMapId;

  const currentIndex = LAYERED_SHOOTER_MAP_SKINS.findIndex((map) => map.id === currentMapId);
  const nextIndex = currentIndex < 0
    ? 0
    : (currentIndex + 1) % LAYERED_SHOOTER_MAP_SKINS.length;
  return LAYERED_SHOOTER_MAP_SKINS[nextIndex].id;
}

export function isLayeredShooterMap(map) {
  return map?.kind === "layered";
}

export function isEditableShooterMap(map) {
  return isLayeredShooterMap(map);
}

export function getShooterMapAssetSources(map) {
  if (!isLayeredShooterMap(map)) return [];

  return [...new Set([
    map.background?.src,
    ...(map.assetCatalog ?? []).flatMap((asset) => [
      asset?.src,
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
