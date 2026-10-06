import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getMapCoverPlaneSize } from "../src/shooter/maps/mapCoordinateSpace.js";

test("tablet full-map fit keeps all four edges visible without distorting the shared scene", () => {
  const reference = { width: 390, height: 756 };
  for (const [width, height] of [[990, 1049], [736, 728], [1228, 520], [475, 850]]) {
    const plane = getMapCoverPlaneSize(width, height, reference, "contain");
    assert.ok(plane.offsetX >= -1e-9 && plane.offsetY >= -1e-9);
    assert.ok(plane.offsetX + plane.width <= width + 1e-9);
    assert.ok(plane.offsetY + plane.height <= height + 1e-9);
    assert.ok(Math.abs(plane.width / plane.height - reference.width / reference.height) < 1e-9);
    assert.ok(Math.abs(plane.width - width) < 1e-9 || Math.abs(plane.height - height) < 1e-9);
  }
});

test("map cover plane follows the same crop as its reference background", () => {
  assert.deepEqual(getMapCoverPlaneSize(390, 756, { width: 390, height: 756 }), {
    height: 756,
    offsetX: 0,
    offsetY: 0,
    width: 390,
  });

  assert.deepEqual(getMapCoverPlaneSize(390, 716, { width: 390, height: 756 }), {
    height: 756,
    offsetX: 0,
    offsetY: -20,
    width: 390,
  });

  const tallViewport = getMapCoverPlaneSize(390, 804, { width: 390, height: 756 });
  assert.equal(tallViewport.height, 804);
  assert.ok(Math.abs(tallViewport.width - 414.76190476190476) < 1e-9);
  assert.ok(Math.abs(tallViewport.offsetX - -12.38095238095238) < 1e-9);
  assert.equal(tallViewport.offsetY, 0);
});

test("map renderer shares one cover-aligned plane between editor and gameplay", async () => {
  const [rendererSource, styles] = await Promise.all([
    readFile(new URL("../src/shooter/maps/MapSkinRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/map-skins.css", import.meta.url), "utf8"),
  ]);

  assert.match(rendererSource, /getMapCoverPlaneSize/);
  assert.match(rendererSource, /className="shooterMapCoordinatePlane"/);
  assert.match(rendererSource, /--shooter-map-cover-width/);
  assert.match(rendererSource, /--shooter-map-cover-height/);
  assert.match(styles, /\.shooterMapCoordinatePlane/);
  assert.match(styles, /width: var\(--shooter-map-cover-width, 100%\)/);
  assert.match(styles, /height: var\(--shooter-map-cover-height, 100%\)/);
});
