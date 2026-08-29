import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  SHOOTER_EFFECT_ANCHOR_PRESET_IDS,
  getShooterEffectAnchorPreset,
  resolveShooterEffectAnchorOffset,
} from "../src/shooter/effects/effectAnchors.js";

const appSourceUrl = new URL("../src/App.jsx", import.meta.url);
const styleSourceUrl = new URL("../src/style.css", import.meta.url);
const floorAssetUrl = new URL("../public/assets/effects/enchanted-vine-floor.png", import.meta.url);
const auraAssetUrl = new URL("../public/assets/effects/enchanted-vine-aura.png", import.meta.url);

function readPngHeader(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

test("enchanted vine floor and aura keep the supplied high-resolution RGBA artwork", async () => {
  const [floorHeader, auraHeader] = await Promise.all([
    readFile(floorAssetUrl).then(readPngHeader),
    readFile(auraAssetUrl).then(readPngHeader),
  ]);

  assert.deepEqual(floorHeader, { width: 1536, height: 1024, colorType: 6 });
  assert.deepEqual(auraHeader, { width: 1024, height: 1536, colorType: 6 });
});

test("enchanted vine alpha artwork aligns to the shared center and bottom axes", () => {
  const auraPreset = getShooterEffectAnchorPreset(SHOOTER_EFFECT_ANCHOR_PRESET_IDS.AURA_CENTER_BOTTOM);
  const floorPreset = getShooterEffectAnchorPreset(SHOOTER_EFFECT_ANCHOR_PRESET_IDS.FLOOR_CENTER_BOTTOM);
  const auraOffset = resolveShooterEffectAnchorOffset({
    baseOffsetX: auraPreset.offsetX,
    baseOffsetY: auraPreset.offsetY,
    contentAnchor: { centerX: 0.5063, bottomY: 0.9225 },
    height: auraPreset.height,
    preset: auraPreset,
    width: auraPreset.width,
  });
  const floorOffset = resolveShooterEffectAnchorOffset({
    baseOffsetX: floorPreset.offsetX,
    baseOffsetY: floorPreset.offsetY,
    contentAnchor: { centerX: 0.499, bottomY: 0.8018 },
    height: floorPreset.height,
    preset: floorPreset,
    width: floorPreset.width,
  });

  assert.ok(Math.abs(auraOffset.offsetX + 0.278) < 0.01);
  assert.ok(Math.abs(auraOffset.offsetY + 2.819) < 0.01);
  assert.ok(Math.abs(floorOffset.offsetX - 0.653) < 0.01);
  assert.ok(Math.abs(floorOffset.offsetY - 35.294) < 0.01);
});

test("enchanted vine artwork is registered in independent floor and aura slots", async () => {
  const [appSource, styleSource] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(styleSourceUrl, "utf8"),
  ]);

  assert.match(appSource, /id: "enchanted-vine-floor"/);
  assert.match(appSource, /label: "숲 넝쿨 플로어"/);
  assert.match(appSource, /asset: "\/assets\/effects\/enchanted-vine-floor\.png"/);
  assert.match(appSource, /id: "enchanted-vine-aura"/);
  assert.match(appSource, /label: "숲 넝쿨 아우라"/);
  assert.match(appSource, /asset: "\/assets\/effects\/enchanted-vine-aura\.png"/);
  assert.match(styleSource, /\.effect-floor-enchanted-vine/);
  assert.match(styleSource, /\.effect-enchanted-vine-aura-front/);
});
