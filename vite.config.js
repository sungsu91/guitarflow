import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { COASTAL_COVE_ENVIRONMENT_ASSETS } from "./src/shooter/maps/assets/coastalCoveAssets.js";
import { LAVA_CANYON_ENVIRONMENT_ASSETS } from "./src/shooter/maps/assets/lavaCanyonAssets.js";
import { PARK_ENVIRONMENT_ASSETS } from "./src/shooter/maps/assets/parkAssets.js";
import { RIVER_ENVIRONMENT_ASSETS } from "./src/shooter/maps/assets/riverAssets.js";
import { MAP_EDIT_ANIMATION_TYPES } from "./src/shooter/maps/editor/editorState.js";
import { DEFAULT_PERSPECTIVE_CORNERS } from "./src/shooter/maps/freeTransform.js";
import {
  SHOOTER_NOTE_MONSTER_ROOTS,
  SHOOTER_NOTE_MONSTER_SKINS,
} from "./src/shooter/noteMonsterAssets.js";

const MAP_LAYOUT_ENDPOINT = "/__rifflab/map-editor/layout";
const NOTE_MONSTER_TUNING_ENDPOINT = "/__rifflab/shooter-editor/note-monster-tuning";
const NOTE_MONSTER_TUNING_DEFAULTS_PATH = fileURLToPath(
  new URL("./src/shooter/noteMonsterTuningDefaults.js", import.meta.url),
);
const RIVER_LAYOUT_PATH = fileURLToPath(
  new URL("./src/shooter/maps/skins/river-layout.json", import.meta.url),
);
const LAVA_CANYON_LAYOUT_PATH = fileURLToPath(
  new URL("./src/shooter/maps/skins/lava-canyon-layout.json", import.meta.url),
);
const COASTAL_COVE_LAYOUT_PATH = fileURLToPath(
  new URL("./src/shooter/maps/skins/coastal-cove-layout.json", import.meta.url),
);
const PARK_LAYOUT_PATH = fileURLToPath(
  new URL("./src/shooter/maps/skins/park-layout.json", import.meta.url),
);
export const MAP_EDIT_SKINS = new Map([
  ["river-garden", { assetCatalog: RIVER_ENVIRONMENT_ASSETS, layoutPath: RIVER_LAYOUT_PATH }],
  ["lava-canyon", { assetCatalog: LAVA_CANYON_ENVIRONMENT_ASSETS, layoutPath: LAVA_CANYON_LAYOUT_PATH }],
  ["coastal-cove", { assetCatalog: COASTAL_COVE_ENVIRONMENT_ASSETS, layoutPath: COASTAL_COVE_LAYOUT_PATH }],
  ["park", { assetCatalog: PARK_ENVIRONMENT_ASSETS, layoutPath: PARK_LAYOUT_PATH }],
]);
const MAP_ANIMATION_IDS = new Set(MAP_EDIT_ANIMATION_TYPES.map((animation) => animation.id));
const FROG_MOVEMENT_MODES = new Set(["sequence", "random"]);
const NOTE_MONSTER_SKIN_IDS = new Set(SHOOTER_NOTE_MONSTER_SKINS.map((skin) => skin.id));
const DEFAULT_NOTE_MONSTER_TUNING = Object.freeze({
  jointScale: 1,
  labelColor: "",
  labelOffsetX: 0,
  labelOffsetY: 0,
  labelOutline: "",
  labelScale: 1,
  scale: 1.15,
});

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

function validateOptionalHexColor(value) {
  const color = String(value ?? "").trim();
  if (!color) return "";
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Invalid monster label color");
  return color.toLowerCase();
}

export function validateNoteMonsterTunings(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid monster tuning store");
  }

  const output = {};
  for (const [skinId, rootTunings] of Object.entries(input)) {
    if (!NOTE_MONSTER_SKIN_IDS.has(skinId)) throw new Error("Unknown monster skin");
    if (!rootTunings || typeof rootTunings !== "object" || Array.isArray(rootTunings)) {
      throw new Error("Invalid monster root tuning store");
    }
    const roots = {};
    for (const [noteRoot, tuning] of Object.entries(rootTunings)) {
      if (!SHOOTER_NOTE_MONSTER_ROOTS.includes(noteRoot)) throw new Error("Unknown monster note root");
      if (!tuning || typeof tuning !== "object" || Array.isArray(tuning)) {
        throw new Error("Invalid monster tuning");
      }
      roots[noteRoot] = {
        jointScale: finiteNumber(tuning.jointScale ?? DEFAULT_NOTE_MONSTER_TUNING.jointScale, 0.5, 2),
        labelColor: validateOptionalHexColor(tuning.labelColor),
        labelOffsetX: finiteNumber(tuning.labelOffsetX ?? DEFAULT_NOTE_MONSTER_TUNING.labelOffsetX, -80, 80),
        labelOffsetY: finiteNumber(tuning.labelOffsetY ?? DEFAULT_NOTE_MONSTER_TUNING.labelOffsetY, -80, 80),
        labelOutline: validateOptionalHexColor(tuning.labelOutline),
        labelScale: finiteNumber(tuning.labelScale ?? DEFAULT_NOTE_MONSTER_TUNING.labelScale, 0.5, 2),
        scale: finiteNumber(tuning.scale ?? DEFAULT_NOTE_MONSTER_TUNING.scale, 0.5, 2.5),
      };
    }
    if (Object.keys(roots).length) output[skinId] = roots;
  }
  return output;
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

function noteMonsterTuningSavePlugin() {
  return {
    name: "rifflab-note-monster-tuning-save",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url !== NOTE_MONSTER_TUNING_ENDPOINT || request.method !== "POST") {
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
            if (body.length > 131_072) throw new Error("Monster tuning payload is too large");
          }
          const payload = JSON.parse(body);
          const tunings = validateNoteMonsterTunings(payload?.tunings);
          const moduleSource = [
            "// The local map editor rewrites this file when monster tuning is applied.",
            "// Keeping the values in source makes the same composition available after deployment.",
            `export default Object.freeze(${JSON.stringify(tunings, null, 2)});`,
            "",
          ].join("\n");
          await writeFile(NOTE_MONSTER_TUNING_DEFAULTS_PATH, moduleSource, "utf8");
          response.statusCode = 200;
          response.end(JSON.stringify({ ok: true, tunings }));
        } catch (error) {
          response.statusCode = 400;
          response.end(JSON.stringify({ ok: false, error: error.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), mapEditorSavePlugin(), noteMonsterTuningSavePlugin()],
});
