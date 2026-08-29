import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SHOOTER_EFFECT_ANCHOR_PRESET_IDS,
  getShooterEffectAnchorPreset,
  resolveShooterEffectAnchorOffset,
} from "../src/shooter/effects/effectAnchors.js";

const appSourceUrl = new URL("../src/App.jsx", import.meta.url);
const styleSourceUrl = new URL("../src/style.css", import.meta.url);
const stageAssetUrl = new URL("../public/assets/effects/concert-stage-floor.png", import.meta.url);

function readPngHeader(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

test("concert stage floor keeps the transparent square artwork", async () => {
  const header = readPngHeader(await readFile(stageAssetUrl));

  assert.deepEqual(header, {
    width: 1254,
    height: 1254,
    colorType: 6,
  });
});

test("concert stage floor aligns its measured content to the shared floor axis", () => {
  const preset = getShooterEffectAnchorPreset(SHOOTER_EFFECT_ANCHOR_PRESET_IDS.FLOOR_CENTER_BOTTOM);
  const offset = resolveShooterEffectAnchorOffset({
    baseOffsetX: 0,
    baseOffsetY: 95,
    contentAnchor: { centerX: 0.4992, bottomY: 0.9059 },
    height: 280,
    preset,
    width: 280,
  });

  assert.ok(Math.abs(offset.offsetX - 0.868) < 0.01);
  assert.ok(Math.abs(offset.offsetY - 60.112) < 0.01);
});

test("concert stage is registered as an independent floor 2 skin", async () => {
  const [appSource, styleSource] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(styleSourceUrl, "utf8"),
  ]);

  assert.match(appSource, /id: "concert-stage-floor"/);
  assert.match(appSource, /label: "라이브 콘서트 스테이지"/);
  assert.match(appSource, /asset: "\/assets\/effects\/concert-stage-floor\.png"/);
  assert.match(appSource, /className: "effect-floor-concert-stage"/);
  assert.match(appSource, /SHOOTER_STANDALONE_FLOOR_EFFECT_OPTIONS = SHOOTER_FLOOR_EFFECT_OPTIONS\.filter/);
  assert.match(styleSource, /\.effect-floor-concert-stage/);
});
