import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SHOOTER_SPRITE_PETS, getShooterPetSkinById } from "../src/shooter/pets.js";
import { createPetAnimation, drawPetFrame, getPetReaction } from "../src/shooter/petAnimation.js";

test("all 10 manifest pets resolve to unchanged 8x3 RGBA atlases and 240 frame files", async () => {
  assert.equal(SHOOTER_SPRITE_PETS.length, 10);
  for (const pet of SHOOTER_SPRITE_PETS) {
    assert.equal(getShooterPetSkinById(pet.id), pet);
    assert.deepEqual(pet.geometry.anchor, { x: 128, y: 224 });
    const files = [[pet.sheetSrc, 2048, 768], [pet.thumbnailSrc, 256, 256]];
    Object.entries(pet.actions).forEach(([name, action], row) => {
      assert.equal(action.row, row);
      assert.equal(action.frameCount, 8);
      for (let frame = 0; frame < 8; frame++) files.push([pet.sheetSrc.replace("atlas.png", `${name}/frame_${String(frame).padStart(2, "0")}.png`), 256, 256]);
    });
    for (const [path, width, height] of files) {
      const png = await readFile(new URL(`../public${path}`, import.meta.url));
      assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      assert.equal(png[25], 6);
      assert.equal(png.readUInt32BE(16), width);
      assert.equal(png.readUInt32BE(20), height);
    }
  }
});

test("every action plays 8 ordered frames at its manifest FPS and reactions return to idle", () => {
  for (const pet of SHOOTER_SPRITE_PETS) {
    const names = Object.keys(pet.actions);
    const idle = pet.actions[names[0]];
    for (const reaction of [1, 2]) {
      const player = createPetAnimation(pet.actions);
      assert.equal(player.advance().name, names[0]);
      for (let frame = 1; frame < 8; frame++) {
        assert.equal(player.advance(1000 / idle.fps).frame, frame);
      }
      player.react(reaction);
      let sample = player.advance(1000 / idle.fps);
      const action = pet.actions[names[reaction]];
      for (let frame = 0; frame < 8; frame++) {
        assert.equal(sample.name, names[reaction]);
        assert.equal(sample.frame, frame);
        assert.equal(sample.fps, action.fps);
        sample = player.advance(1000 / action.fps);
      }
      assert.equal(sample.name, names[0]);
      assert.equal(sample.frame, 0);
    }
  }
});

test("hit observation ignores rerenders, misses, resets and duplicate score/hit changes", () => {
  const previous = { score: 400, hits: 4, combo: 4 };
  assert.equal(getPetReaction(previous, previous), null);
  assert.equal(getPetReaction(previous, { ...previous, combo: 0 }), null);
  assert.equal(getPetReaction(previous, { score: 0, hits: 0, combo: 0 }), null);
  assert.equal(getPetReaction(previous, { score: 500, hits: 5, combo: 5 }), 2);
  assert.equal(getPetReaction({ score: 0, hits: 0, combo: 0 }, { score: 100, hits: 1, combo: 1 }), 1);
  assert.equal(getPetReaction({ score: 100, hits: 1, combo: 1 }, { score: 200, hits: 2, combo: 2 }), 1);
});

test("combo priority is bounded and late ticks keep authored cadence without resetting a pose", () => {
  const pet = SHOOTER_SPRITE_PETS[0], names = Object.keys(pet.actions);
  const player = createPetAnimation(pet.actions);
  player.react(1); player.react(2); player.react(1);
  assert.equal(player.advance(8000 / pet.actions[names[0]].fps).name, names[2]);
  const pose = player.advance(310);
  assert.equal(pose.frame, 3);
  assert.equal(Math.round(pose.nextFrameMs), 90);
  assert.deepEqual(player.advance(0), pose, "pause does not move the visual clock");
  assert.equal(player.advance(490).name, names[0]);
  assert.equal(player.advance(8000 / pet.actions[names[0]].fps).name, names[0]);
});

test("canvas replaces the whole previous pose and uses exact integer atlas cells", () => {
  for (const pet of SHOOTER_SPRITE_PETS) {
    for (const action of Object.values(pet.actions)) {
      for (let frame = 0; frame < 8; frame++) {
        const calls = [], atlas = {};
        const context = { clearRect: (...args) => calls.push(["clear", ...args]), drawImage: (...args) => calls.push(["draw", ...args]) };
        drawPetFrame(context, atlas, pet.geometry, { ...action, frame }, 192);
        assert.deepEqual(calls, [["clear", 0, 0, 192, 192], ["draw", atlas, frame * 256, action.row * 256, 256, 256, 0, 0, 192, 192]]);
      }
    }
  }
});
