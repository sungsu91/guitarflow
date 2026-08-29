import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  DEFAULT_THREE_D_LAB_SETTINGS,
  createThreeDLabViewProjection,
  normalizeThreeDLabSettings,
  projectGameplayPointToThreeDLab,
} from "../src/shooter/threed/threeDLabProjection.js";
import { THREE_D_LAB_MAP_SKIN } from "../src/shooter/maps/skins/threeDLab.js";

const appSource = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const registrySource = fs.readFileSync(new URL("../src/shooter/maps/registry.js", import.meta.url), "utf8");
const rendererSource = fs.readFileSync(new URL("../src/shooter/threed/ThreeDLabRenderer.jsx", import.meta.url), "utf8");
const mapRendererSource = fs.readFileSync(new URL("../src/shooter/maps/ShootingMapRenderer.jsx", import.meta.url), "utf8");

test("3D LAB uses a real perspective projection for approaching billboard enemies", () => {
  const viewport = { width: 390, height: 756 };
  const far = projectGameplayPointToThreeDLab({ x: 68, y: 8 }, DEFAULT_THREE_D_LAB_SETTINGS, viewport);
  const near = projectGameplayPointToThreeDLab({ x: 68, y: 84 }, DEFAULT_THREE_D_LAB_SETTINGS, viewport);

  assert.ok(near.screenY > far.screenY, "approaching enemies should move down from the horizon");
  assert.ok(near.scale > far.scale * 3, "Perspective Camera distance should make near enemies much larger");
  assert.ok(Math.abs(near.screenX - viewport.width / 2) > Math.abs(far.screenX - viewport.width / 2));
  assert.equal(createThreeDLabViewProjection(DEFAULT_THREE_D_LAB_SETTINGS, viewport).length, 16);
});

test("3D LAB tuning clamps every live developer control to mobile-safe ranges", () => {
  const normalized = normalizeThreeDLabSettings({
    cameraFov: 999,
    railWidth: 999,
    groundWidth: 18,
    enemySpawnZ: -10,
    enemyHitZ: 11,
    guitarDashDuration: 2,
    guitarSlashDuration: 900,
    guitarReturnDuration: 4,
    afterimageStrength: 12,
  });

  assert.equal(normalized.cameraFov, 82);
  assert.ok(normalized.railWidth <= normalized.groundWidth * 0.72);
  assert.ok(normalized.enemySpawnZ >= normalized.enemyHitZ + 18);
  assert.equal(normalized.guitarDashDuration, 40);
  assert.equal(normalized.guitarSlashDuration, 120);
  assert.equal(normalized.guitarReturnDuration, 100);
  assert.equal(normalized.afterimageStrength, 1);
});

test("3D LAB is a developer-only map isolated from MODE7 LAB and formal map cycling", () => {
  assert.equal(THREE_D_LAB_MAP_SKIN.id, "dev-three-d-lab");
  assert.equal(THREE_D_LAB_MAP_SKIN.renderer, "perspective3d");
  assert.equal(THREE_D_LAB_MAP_SKIN.devOnly, true);
  assert.equal(THREE_D_LAB_MAP_SKIN.label, "3D LAB");
  assert.match(registrySource, /PSEUDO3D_TEST_MAP_SKIN,\s*THREE_D_LAB_MAP_SKIN/);
  assert.match(appSource, /\.\.\.\(import\.meta\.env\.DEV \? DEVELOPER_SHOOTER_MAP_SKINS : \[\]\)/);
  assert.match(appSource, /developerShooterMapOptions/);
  assert.match(mapRendererSource, /skin\?\.renderer === "perspective3d"/);
});

test("3D LAB renders lightweight WebGL planes and exposes the complete live tuning panel", () => {
  assert.match(rendererSource, /getContext\?\.\("webgl"/);
  assert.match(rendererSource, /createThreeDLabViewProjection/);
  assert.match(rendererSource, /gl\.drawArrays\(gl\.TRIANGLES/);
  assert.match(rendererSource, /gl\.deleteBuffer/);
  assert.match(rendererSource, /window\.cancelAnimationFrame/);

  [
    "Camera FOV",
    "Camera Height",
    "Camera Pitch",
    "Horizon Position",
    "Ground Width",
    "Rail Width",
    "Rail Length",
    "Enemy Spawn Z",
    "Enemy Hit Z",
    "Enemy Approach Speed",
    "Enemy Far Visibility",
    "Enemy Near Size",
    "Guitar Idle X",
    "Guitar Idle Y",
    "Guitar Idle Scale",
    "Guitar Dash Speed",
    "Guitar Slash Duration",
    "Guitar Return Duration",
    "Slash Rotation",
    "Slash Arc Size",
    "Afterimage Strength",
    "Hit Particle Strength",
    "Camera Shake Strength",
    "RESET 3D LAB",
  ].forEach((label) => assert.match(rendererSource, new RegExp(label)));
});

test("3D LAB shares current-target pitch judgment but replaces projectiles with an automatic slash", () => {
  assert.match(appSource, /sort\(\(a, b\) => b\.target\.y - a\.target\.y \|\| a\.target\.bornAt - b\.target\.bornAt\)/);
  assert.match(appSource, /targetPitchName === detectedPitchName/);
  assert.match(appSource, /if \(selectedMapIsThreeDLab\) \{\s*if \(!resolveShooterSlashHit\(target\)\) return;/);
  assert.match(appSource, /playThreeDLabGuitarSlash/);
  assert.match(appSource, /threeDLabAfterimage/);
  assert.match(appSource, /threeDLabSlashArc/);
  assert.match(appSource, /target\.hitboxActive !== false/);
  assert.doesNotMatch(appSource, /handleShooterArenaClick[\s\S]{0,500}resolveShooterSlashHit/);
});
