import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { LAVA_CANYON_ENVIRONMENT_ASSETS } from "./src/shooter/maps/assets/lavaCanyonAssets.js";
import { RIVER_ENVIRONMENT_ASSETS } from "./src/shooter/maps/assets/riverAssets.js";
import { MAP_EDIT_ANIMATION_TYPES } from "./src/shooter/maps/editor/editorState.js";
import { DEFAULT_PERSPECTIVE_CORNERS } from "./src/shooter/maps/freeTransform.js";

const MAP_LAYOUT_ENDPOINT = "/__rifflab/map-editor/layout";
const RIVER_LAYOUT_PATH = fileURLToPath(
  new URL("./src/shooter/maps/skins/river-layout.json", import.meta.url),
);
const LAVA_CANYON_LAYOUT_PATH = fileURLToPath(
  new URL("./src/shooter/maps/skins/lava-canyon-layout.json", import.meta.url),
);
export const MAP_EDIT_SKINS = new Map([
  ["river-garden", { assetCatalog: RIVER_ENVIRONMENT_ASSETS, layoutPath: RIVER_LAYOUT_PATH }],
  ["lava-canyon", { assetCatalog: LAVA_CANYON_ENVIRONMENT_ASSETS, layoutPath: LAVA_CANYON_LAYOUT_PATH }],
]);
const MAP_ANIMATION_IDS = new Set(MAP_EDIT_ANIMATION_TYPES.map((animation) => animation.id));
const FROG_MOVEMENT_MODES = new Set(["sequence", "random"]);

function isFrogLandingAssetId(assetId = "", creatureType = "") {
  return assetId.startsWith("rock-")
    || assetId.startsWith("lily-pad-")
    || assetId === "stone-bridge-crossing"
    || (creatureType === "sleeping-frog" && assetId === "guitar-dock-platform");
}

function validateHexColor(value) {
  const color = String(value ?? "").trim();
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Invalid creature color");
  return color.toLowerCase();
}

function isLoopbackAddress(address = "") {
  return address === "127.0.0.1"
    || address === "::1"
    || address.startsWith("::ffff:127.");
}

function finiteNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new Error("Invalid placement number");
  return number;
}

function validateAxisScale(value) {
  const scale = finiteNumber(value ?? 1, -3, 3);
  if (Math.abs(scale) < 0.1) throw new Error("Invalid transform axis scale");
  return scale;
}

function validatePerspectiveCorners(input) {
  const corners = input ?? DEFAULT_PERSPECTIVE_CORNERS;
  if (!Array.isArray(corners) || corners.length !== 4) throw new Error("Invalid perspective corners");
  return corners.map((corner) => ({
    x: finiteNumber(corner?.x, -0.75, 1.75),
    y: finiteNumber(corner?.y, -0.75, 1.75),
  }));
}

function validateCreatureSettings(placement, assetId, inputByInstanceId, assetsById) {
  const asset = assetsById.get(assetId);
  if (!asset?.creature) return undefined;
  const source = placement?.creature;
  if (asset.creature.type === "baby-dragon") {
    if (!source || !Array.isArray(source.anchors) || source.anchors.length !== 0) {
      throw new Error("Invalid free creature anchor list");
    }
    return {
      enabled: source.enabled !== false,
      idleInterval: finiteNumber(source.idleInterval, 3, 20),
      breathChance: finiteNumber(source.breathChance, 0.03, 0.5),
      sleepChance: finiteNumber(source.sleepChance, 0, 0.75),
      sleepDuration: finiteNumber(source.sleepDuration, 2, 24),
      animationSpeed: finiteNumber(source.animationSpeed, 0.4, 2.5),
      anchors: [],
    };
  }
  if (!source || !Array.isArray(source.anchors) || source.anchors.length < 1 || source.anchors.length > 20) {
    throw new Error("Invalid creature anchor list");
  }
  const anchorIds = new Set();
  const anchors = source.anchors.map((anchor) => {
    const id = String(anchor?.id ?? "").slice(0, 80);
    if (!id || anchorIds.has(id)) throw new Error("Invalid creature anchor identity");
    anchorIds.add(id);
    const kind = anchor?.kind === "water" ? "water" : "surface";
    if (kind === "water") {
      return {
        id,
        kind,
        surfaceInstanceId: "",
        offsetX: 0,
        offsetY: 0,
        x: finiteNumber(anchor.x, -0.25, 1.25),
        y: finiteNumber(anchor.y, -0.25, 1.25),
      };
    }
    const surfaceInstanceId = String(anchor?.surfaceInstanceId ?? "").slice(0, 120);
    const surface = inputByInstanceId.get(surfaceInstanceId);
    if (!surfaceInstanceId || !surface || !isFrogLandingAssetId(
      String(surface.assetId ?? ""),
      asset.creature.type,
    )) {
      throw new Error("Invalid creature landing surface");
    }
    const offsetX = finiteNumber(anchor.offsetX ?? 0, -0.5, 0.5);
    const offsetY = finiteNumber(anchor.offsetY ?? 0, -0.5, 0.5);
    return {
      id,
      kind,
      surfaceInstanceId,
      offsetX,
      offsetY,
      x: finiteNumber(surface.x, -0.25, 1.25) + offsetX,
      y: finiteNumber(surface.y, -0.25, 1.25) + offsetY,
    };
  });
  if (asset.creature.type === "sleeping-frog") {
    if (anchors.length !== 1 || anchors[0].kind !== "surface") {
      throw new Error("Invalid sleeping creature spot");
    }
    return {
      enabled: source.enabled !== false,
      sleepInterval: finiteNumber(source.sleepInterval, 3, 30),
      fallChance: finiteNumber(source.fallChance, 0, 0.75),
      flatDuration: finiteNumber(source.flatDuration, 2, 30),
      openMouthDuration: finiteNumber(source.openMouthDuration, 0.3, 8),
      animationSpeed: finiteNumber(source.animationSpeed, 0.35, 2.5),
      bubbleEnabled: source.bubbleEnabled !== false,
      bubbleBaseScale: finiteNumber(source.bubbleBaseScale, 0.45, 1.5),
      bubbleMaxScale: finiteNumber(source.bubbleMaxScale, 1.2, 3),
      bubbleSpeed: finiteNumber(source.bubbleSpeed, 0.4, 2),
      bubbleOpacity: finiteNumber(source.bubbleOpacity, 0.2, 1),
      bodyColor: validateHexColor(source.bodyColor),
      bodySaturation: finiteNumber(source.bodySaturation, 0.45, 1.8),
      bodyBrightness: finiteNumber(source.bodyBrightness, 0.55, 1.45),
      bubbleColor: validateHexColor(source.bubbleColor),
      anchors,
    };
  }
  const mode = String(source.mode ?? "random");
  if (!FROG_MOVEMENT_MODES.has(mode)) throw new Error("Invalid creature movement mode");
  return {
    enabled: source.enabled !== false,
    mode,
    jumpInterval: finiteNumber(source.jumpInterval, 1, 20),
    jumpDistance: finiteNumber(source.jumpDistance, 0.04, 1.5),
    jumpHeight: finiteNumber(source.jumpHeight, 0.02, 0.3),
    animationSpeed: finiteNumber(source.animationSpeed, 0.25, 3),
    anchors,
  };
}

export function validateMapPlacements(input, assetCatalog = []) {
  if (!Array.isArray(input) || input.length > 300) throw new Error("Invalid placement list");
  const assetIds = new Set(assetCatalog.map((asset) => asset.id));
  const assetsById = new Map(assetCatalog.map((asset) => [asset.id, asset]));
  const instanceIds = new Set();
  const assetInstanceCounts = new Map();
  const inputByInstanceId = new Map(input.map((placement) => [String(placement?.instanceId ?? ""), placement]));

  return input.map((placement) => {
    const instanceId = String(placement?.instanceId ?? "").slice(0, 120);
    const assetId = String(placement?.assetId ?? "");
    if (!instanceId || instanceIds.has(instanceId) || !assetIds.has(assetId)) {
      throw new Error("Invalid map asset identity");
    }
    const asset = assetsById.get(assetId);
    const instanceCount = (assetInstanceCounts.get(assetId) ?? 0) + 1;
    if (Number.isFinite(asset?.maxInstances) && instanceCount > asset.maxInstances) {
      throw new Error("Map asset instance limit exceeded");
    }
    instanceIds.add(instanceId);
    assetInstanceCounts.set(assetId, instanceCount);

    const animation = String(placement?.animation ?? "none");
    if (!MAP_ANIMATION_IDS.has(animation)) throw new Error("Invalid animation type");

    const normalized = {
      instanceId,
      assetId,
      x: finiteNumber(placement.x, -0.25, 1.25),
      y: finiteNumber(placement.y, -0.25, 1.25),
      scale: finiteNumber(placement.scale, 0.1, 3),
      rotation: finiteNumber(placement.rotation, -180, 180),
      scaleX: validateAxisScale(placement.scaleX),
      scaleY: validateAxisScale(placement.scaleY),
      skewX: finiteNumber(placement.skewX ?? 0, -60, 60),
      skewY: finiteNumber(placement.skewY ?? 0, -60, 60),
      perspective: finiteNumber(placement.perspective ?? 900, 80, 3000),
      tiltX: finiteNumber(placement.tiltX ?? 0, -88, 88),
      tiltY: finiteNumber(placement.tiltY ?? 0, -88, 88),
      perspectiveCorners: validatePerspectiveCorners(placement.perspectiveCorners),
      layer: Math.round(finiteNumber(placement.layer, -999, 999)),
      animation,
      animationSpeed: finiteNumber(placement.animationSpeed, 0.1, 5),
    };
    const creature = validateCreatureSettings(placement, assetId, inputByInstanceId, assetsById);
    return creature ? { ...normalized, creature } : normalized;
  });
}

export function validateRiverPlacements(input) {
  return validateMapPlacements(input, RIVER_ENVIRONMENT_ASSETS);
}

function mapEditorSavePlugin() {
  return {
    name: "rifflab-map-editor-save",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url !== MAP_LAYOUT_ENDPOINT || request.method !== "POST") {
          next();
          return;
        }

        response.setHeader("Content-Type", "application/json; charset=utf-8");
        if (!isLoopbackAddress(request.socket.remoteAddress)) {
          response.statusCode = 403;
          response.end(JSON.stringify({ ok: false, error: "Local editor access only" }));
          return;
        }

        try {
          let body = "";
          for await (const chunk of request) {
            body += chunk;
            if (body.length > 262_144) throw new Error("Map layout payload is too large");
          }
          const payload = JSON.parse(body);
          const skinConfig = MAP_EDIT_SKINS.get(payload?.skinId);
          if (!skinConfig) throw new Error("Unknown map skin");
          const placements = validateMapPlacements(payload.placements, skinConfig.assetCatalog);
          await writeFile(skinConfig.layoutPath, `${JSON.stringify(placements, null, 2)}\n`, "utf8");
          response.statusCode = 200;
          response.end(JSON.stringify({ ok: true, count: placements.length, placements }));
        } catch (error) {
          response.statusCode = 400;
          response.end(JSON.stringify({ ok: false, error: error.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), mapEditorSavePlugin()],
});
