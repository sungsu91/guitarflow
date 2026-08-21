import assert from "node:assert/strict";
import test from "node:test";

import {
  LAYERED_SHOOTER_MAP_SKINS,
  getNextShooterMapId,
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
