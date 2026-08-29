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
const floorAssetUrl = new URL("../public/assets/effects/galactic-orbital-floor.png", import.meta.url);
const auraAssetUrl = new URL("../public/assets/effects/galactic-orbital-aura.png", import.meta.url);

function readPngHeader(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

test("galactic orbital floor and aura keep the supplied high-resolution RGBA artwork", async () => {
  const [floorHeader, auraHeader] = await Promise.all([
    readFile(floorAssetUrl).then(readPngHeader),
    readFile(auraAssetUrl).then(readPngHeader),
  ]);

  assert.deepEqual(floorHeader, { width: 1536, height: 1024, colorType: 6 });
  assert.deepEqual(auraHeader, { width: 1024, height: 1536, colorType: 6 });
});

test("galactic orbital alpha artwork aligns to the shared center and bottom axes", () => {
  const auraPreset = getShooterEffectAnchorPreset(SHOOTER_EFFECT_ANCHOR_PRESET_IDS.AURA_CENTER_BOTTOM);
  const floorPreset = getShooterEffectAnchorPreset(SHOOTER_EFFECT_ANCHOR_PRESET_IDS.FLOOR_CENTER_BOTTOM);
  const auraOffset = resolveShooterEffectAnchorOffset({
    baseOffsetX: auraPreset.offsetX,
    baseOffsetY: auraPreset.offsetY,
    contentAnchor: { centerX: 0.5034, bottomY: 0.987 },
    height: auraPreset.height,
    preset: auraPreset,
    width: auraPreset.width,
  });
  const floorOffset = resolveShooterEffectAnchorOffset({
    baseOffsetX: floorPreset.offsetX,
    baseOffsetY: floorPreset.offsetY,
    contentAnchor: { centerX: 0.4997, bottomY: 0.8994 },
    height: floorPreset.height,
    preset: floorPreset,
    width: floorPreset.width,
  });

  assert.ok(Math.abs(auraOffset.offsetX - 0.058) < 0.01);
  assert.ok(Math.abs(auraOffset.offsetY + 14.04) < 0.02);
  assert.ok(Math.abs(floorOffset.offsetX - 0.515) < 0.01);
  assert.ok(Math.abs(floorOffset.offsetY - 22.41) < 0.02);
});

test("galactic orbital artwork is registered in independent floor and aura slots", async () => {
  const [appSource, styleSource] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(styleSourceUrl, "utf8"),
  ]);

  assert.match(appSource, /id: "galactic-orbital-floor"/);
  assert.match(appSource, /label: "은하 오비탈 플로어"/);
  assert.match(appSource, /asset: "\/assets\/effects\/galactic-orbital-floor\.png"/);
  assert.match(appSource, /id: "galactic-orbital-aura"/);
  assert.match(appSource, /label: "은하 오비탈 아우라"/);
  assert.match(appSource, /asset: "\/assets\/effects\/galactic-orbital-aura\.png"/);
  assert.match(styleSource, /\.effect-floor-galactic-orbital/);
  assert.match(styleSource, /\.effect-galactic-orbital-aura-front/);
});
