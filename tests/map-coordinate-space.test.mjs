import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getMapCoverPlaneSize } from "../src/shooter/maps/mapCoordinateSpace.js";

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

