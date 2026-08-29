import assert from "node:assert/strict";
import test from "node:test";

import {
  LAYERED_SHOOTER_MAP_SKINS,
  getNextShooterMapId,
  getRandomShooterMapId,
} from "../src/shooter/maps/registry.js";

test("shooter maps advance in catalog order and wrap after the last map", () => {
  const mapIds = LAYERED_SHOOTER_MAP_SKINS.map((map) => map.id);

  for (let index = 0; index < mapIds.length; index += 1) {
    assert.equal(getNextShooterMapId(mapIds[index]), mapIds[(index + 1) % mapIds.length]);
  }
});

test("default or unknown maps enter the first playable map", () => {
  assert.equal(getNextShooterMapId("none"), LAYERED_SHOOTER_MAP_SKINS[0].id);
  assert.equal(getNextShooterMapId("missing-map"), LAYERED_SHOOTER_MAP_SKINS[0].id);
});

test("random map selection changes once without immediately repeating the current map", () => {
  const currentMapId = LAYERED_SHOOTER_MAP_SKINS[0].id;
  const candidates = LAYERED_SHOOTER_MAP_SKINS.filter((map) => map.id !== currentMapId);

  assert.equal(getRandomShooterMapId(currentMapId, 0), candidates[0].id);
  assert.equal(getRandomShooterMapId(currentMapId, 0.999999), candidates.at(-1).id);
  assert.notEqual(getRandomShooterMapId(currentMapId, 0.5), currentMapId);
});
