import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DEFAULT_PSEUDO3D_SETTINGS,
  gameplayPointToPseudo3DWorld,
  normalizePseudo3DSettings,
  projectGameplayPointToPseudo3D,
  projectPseudo3DWorldPoint,
  wrapPseudo3DWorldZ,
} from "../src/shooter/pseudo3d/projection.js";
import { PSEUDO3D_TEST_MAP_SKIN } from "../src/shooter/maps/skins/pseudo3dTest.js";

test("pseudo3d projection makes approaching sprites lower, larger, and wider", () => {
  const viewport = { width: 390, height: 756 };
  const farLeft = projectGameplayPointToPseudo3D({ x: 18, y: 8 }, DEFAULT_PSEUDO3D_SETTINGS, viewport);
  const nearLeft = projectGameplayPointToPseudo3D({ x: 18, y: 88 }, DEFAULT_PSEUDO3D_SETTINGS, viewport);

  assert.ok(farLeft.screenY < nearLeft.screenY);
  assert.ok(farLeft.scale < nearLeft.scale);
  assert.ok(Math.abs(farLeft.screenX - viewport.width / 2) < Math.abs(nearLeft.screenX - viewport.width / 2));
});

test("gameplay adapter exposes worldX/worldZ without changing gameplay coordinates", () => {
  const far = gameplayPointToPseudo3DWorld({ x: 50, y: 8 });
  const near = gameplayPointToPseudo3DWorld({ x: 82, y: 88 });

  assert.equal(far.worldX, 0);
  assert.equal(far.worldZ, DEFAULT_PSEUDO3D_SETTINGS.farDistance);
  assert.equal(near.worldX, 0.8);
  assert.ok(Math.abs(near.worldZ - DEFAULT_PSEUDO3D_SETTINGS.nearClip) < 1e-9);
});

test("pseudo3d settings normalize unsafe live panel values", () => {
  const normalized = normalizePseudo3DSettings({
    horizon: 99,
    nearClip: -4,
    farDistance: 0,
    groundTextureRepeat: 10.7,
  });

  assert.equal(normalized.horizon, 0.45);
  assert.equal(normalized.nearClip, 0.01);
  assert.ok(normalized.farDistance >= normalized.nearClip + 0.08);
  assert.equal(normalized.groundTextureRepeat, 11);
});

test("world projection and wrapping remain bounded", () => {
  const wrapped = wrapPseudo3DWorldZ(-3, DEFAULT_PSEUDO3D_SETTINGS);
  const projected = projectPseudo3DWorldPoint(
    { worldX: 0.5, worldZ: wrapped },
    DEFAULT_PSEUDO3D_SETTINGS,
    { width: 390, height: 756 },
  );

  assert.ok(wrapped >= DEFAULT_PSEUDO3D_SETTINGS.nearClip);
  assert.ok(wrapped <= DEFAULT_PSEUDO3D_SETTINGS.farDistance);
  assert.ok(projected.depth >= 0 && projected.depth <= 1);
  assert.ok(Number.isFinite(projected.screenX));
  assert.ok(Number.isFinite(projected.screenY));
});

test("developer test map is reusable renderer data and reuses current assets", () => {
  assert.equal(PSEUDO3D_TEST_MAP_SKIN.renderer, "pseudo3d");
  assert.equal(PSEUDO3D_TEST_MAP_SKIN.devOnly, true);
  assert.ok(PSEUDO3D_TEST_MAP_SKIN.decorations.length >= 6);
  assert.ok(PSEUDO3D_TEST_MAP_SKIN.decorations.some((item) => item.src.includes("/assets/maps/river/")));
  assert.ok(PSEUDO3D_TEST_MAP_SKIN.decorations.some((item) => item.src.includes("/assets/shooter/note-monsters/")));
});

test("developer map is gated by the dev build and dispatched through an isolated renderer", () => {
  const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const dispatcherSource = readFileSync(new URL("../src/shooter/maps/ShootingMapRenderer.jsx", import.meta.url), "utf8");

  assert.match(appSource, /import\.meta\.env\.DEV \? DEVELOPER_SHOOTER_MAP_SKINS : \[\]/);
  assert.match(dispatcherSource, /skin\?\.renderer === "pseudo3d"/);
  assert.match(dispatcherSource, /return <MapSkinRenderer/);
});

test("pseudo3d developer controls are presented in Korean", () => {
  const rendererSource = readFileSync(
    new URL("../src/shooter/pseudo3d/Pseudo3DRenderer.jsx", import.meta.url),
    "utf8",
  );

  assert.match(rendererSource, /label: "지평선 높이"/);
  assert.match(rendererSource, /label: "원근감 강도"/);
  assert.match(rendererSource, /원근 설정 초기화/);
  assert.doesNotMatch(rendererSource, /label: "Horizon"/);
});
