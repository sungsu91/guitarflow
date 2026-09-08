import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEFAULT_SHOOTER_PET_SKIN_ID,
  SHOOTER_PET_SKINS,
  getShooterPetSkinById,
} from "../src/shooter/pets.js";

const appUrl = new URL("../src/App.jsx", import.meta.url);
const styleUrl = new URL("../src/style.css", import.meta.url);
const builderUrl = new URL("../scripts/build-pomeranian-pet-sprite.py", import.meta.url);
const runtimeUrl = new URL("../public/assets/pets/pomeranian/pomeranian-pet-actions-sheet-36x1.png", import.meta.url);
const masterUrl = new URL("../public/assets/pets/pomeranian/pomeranian-pet-actions-master-6x4.png", import.meta.url);

test("cream Pomeranian is an optional persisted 36-frame action pet skin", async () => {
  const app = await readFile(appUrl, "utf8");
  const pet = getShooterPetSkinById("cream-pomeranian");

  assert.equal(DEFAULT_SHOOTER_PET_SKIN_ID, "cream-pomeranian");
  assert.equal(SHOOTER_PET_SKINS.length, 2);
  assert.equal(pet.columns, 36);
  assert.equal(pet.frameCount, 36);
  assert.equal(pet.framesPerSecond, 3);
  assert.match(pet.description, /갸우뚱.*엎드리고.*충성/);
  assert.match(app, /\{ id: "pet", label: "펫" \}/);
  assert.match(app, /SHOOTER_PET_SKIN_STORAGE_KEY = "rifflabShooterPetSkin"/);
  assert.match(app, /storedPetSkinId === null[\s\S]*?DEFAULT_SHOOTER_PET_SKIN_ID/);
  assert.match(app, /localStorage\.setItem\(SHOOTER_PET_SKIN_STORAGE_KEY, nextSkin\.id\)/);
  assert.match(app, /className="shooterPetCompanion"/);
});

test("pet assets are transparent RGBA sheets with stable frame geometry", async () => {
  const [runtime, master] = await Promise.all([readFile(runtimeUrl), readFile(masterUrl)]);
  for (const asset of [runtime, master]) {
    assert.equal(asset.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(asset[25], 6, "pet sheet must use RGBA color type");
  }
  assert.equal(runtime.readUInt32BE(16), 6912);
  assert.equal(runtime.readUInt32BE(20), 192);
  assert.equal(master.readUInt32BE(16), 1536);
  assert.equal(master.readUInt32BE(20), 1024);
});

test("pet animation uses CSS sprite steps and separate mobile placement", async () => {
  const [app, style, builder] = await Promise.all([
    readFile(appUrl, "utf8"),
    readFile(styleUrl, "utf8"),
    readFile(builderUrl, "utf8"),
  ]);
  assert.match(style, /\.shooterPetCompanion::before[\s\S]*?animation: shooterPetSpriteIdle[\s\S]*?steps\(var\(--shooter-pet-steps, 35\), end\)/);
  assert.match(style, /@keyframes shooterPetSpriteIdle[\s\S]*?background-position-x: 100%/);
  assert.match(style, /@media \(max-width: 430px\)[\s\S]*?\.shooterArena \.shooterPetCompanion/);
  assert.match(style, /data-animation-active="false"\]::before[\s\S]*?animation-play-state: paused/);
  assert.match(style, /left: calc\(var\(--shooter-pet-x, 80\) \* 1%\)/);
  assert.match(style, /top: calc\(var\(--shooter-pet-y, 88\) \* 1%\)/);
  assert.match(style, /touch-action: none/);
  assert.match(app, /DEFAULT_SHOOTER_PET_POSITION = Object\.freeze\(\{ x: 80, y: 88 \}\)/);
  assert.doesNotMatch(app, /SHOOTER_PET_LONG_PRESS_MS/);
  assert.match(app, /onPointerDown=\{handleShooterPetPointerDown\}/);
  assert.match(app, /onPointerMove=\{handleShooterPetPointerMove\}/);
  assert.match(app, /event\.currentTarget\.dataset\.dragging = "true"/);
  assert.match(app, /document\.addEventListener\("visibilitychange", syncVisibility\)/);
  assert.match(app, /localStorage\.setItem\(SHOOTER_PET_POSITION_STORAGE_KEY/);
  assert.match(builder, /ground_offset = 187 - visible_bounds\[3\]/);
  assert.match(builder, /contact_center = \(min\(contact_x\) \+ max\(contact_x\)\) \/ 2/);
  assert.match(builder, /for frame_index in \(18, 19, 20\):/);
});
