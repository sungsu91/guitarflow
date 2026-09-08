import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEFAULT_SHOOTER_PET_SKIN_ID,
  SHOOTER_PET_SKINS,
  getShooterPetSkinById,
} from "../src/shooter/pets.js";

const builderUrl = new URL("../scripts/build-silver-barley-cat-pet-sprite.py", import.meta.url);
const runtimeUrl = new URL(
  "../public/assets/pets/silver-barley-cat/silver-barley-cat-actions-sheet-120x1.png",
  import.meta.url,
);
const masterUrl = new URL(
  "../public/assets/pets/silver-barley-cat/silver-barley-cat-actions-master-6x4.png",
  import.meta.url,
);

test("silver cat is a selectable 120-frame pet without changing the Pomeranian default", async () => {
  const pet = getShooterPetSkinById("silver-barley-cat");

  assert.equal(DEFAULT_SHOOTER_PET_SKIN_ID, "cream-pomeranian");
  assert.equal(SHOOTER_PET_SKINS.length, 3);
  assert.equal(pet.label, "실버 고양이");
  assert.equal(pet.columns, 120);
  assert.equal(pet.frameCount, 120);
  assert.equal(pet.framesPerSecond, 6);
  assert.match(pet.description, /보리풀.*꾹꾹이.*핥기.*세수/);
});

test("silver cat sheets are transparent RGBA assets with 6x4 and 120x1 geometry", async () => {
  const [runtime, master] = await Promise.all([readFile(runtimeUrl), readFile(masterUrl)]);
  for (const asset of [runtime, master]) {
    assert.equal(asset.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(asset[25], 6, "cat sheet must use RGBA color type");
  }
  assert.equal(runtime.readUInt32BE(16), 15360);
  assert.equal(runtime.readUInt32BE(20), 128);
  assert.equal(master.readUInt32BE(16), 1536);
  assert.equal(master.readUInt32BE(20), 1024);
});

test("silver cat builder holds actions and locks every runtime frame to one ground line", async () => {
  const builder = await readFile(builderUrl, "utf8");

  assert.match(builder, /FRAME_SIZE = 128/);
  assert.match(builder, /SOURCE_RENDER_SIZE = 122/);
  assert.match(builder, /GROUND_Y = 124/);
  assert.match(builder, /GROUND_Y - contact_y/);
  assert.match(builder, /GROUND_Y \+ 1/);
  assert.match(builder, /RUNTIME_HOLDS = \(/);
  assert.match(builder, /5, 18, 2, 4, 2, 4/);
  assert.match(builder, /AFTERIMAGE_ALPHA = 0\.07/);
  assert.match(builder, /transition\.alpha_composite\(next_pose\)/);
  assert.doesNotMatch(builder, /Image\.blend/);
  assert.match(builder, /Preserve the source cell's horizontal axis/);
});
