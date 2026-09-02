import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DESKTOP_HORIZONTAL_SHOOTER_FEATURE,
  SHOOTER_RENDERER_MODES,
  getFrontShooterTarget,
  getShooterRendererMode,
  getShooterTargetProgress,
  projectDesktopHorizontalTarget,
} from "../src/shooter/desktopHorizontal/desktopHorizontalShooter.js";
import {
  DESKTOP_HORIZONTAL_MAP_BACKDROPS,
  getDesktopHorizontalMapBackdrop,
} from "../src/shooter/desktopHorizontal/desktopHorizontalMaps.js";

test("desktop horizontal renderer is isolated to desktop DEV 3D LAB", () => {
  assert.equal(DESKTOP_HORIZONTAL_SHOOTER_FEATURE.devMapId, "dev-three-d-lab");
  assert.equal(getShooterRendererMode({ devMapActive: true, featureEnabled: true, isMobileLayout: false }), SHOOTER_RENDERER_MODES.DESKTOP_HORIZONTAL);
  assert.equal(getShooterRendererMode({ devMapActive: false, featureEnabled: true, isMobileLayout: false }), SHOOTER_RENDERER_MODES.DESKTOP_PORTRAIT);
  assert.equal(getShooterRendererMode({ devMapActive: true, featureEnabled: true, isMobileLayout: true }), SHOOTER_RENDERER_MODES.MOBILE_VERTICAL);
  assert.equal(getShooterRendererMode({ devMapActive: true, featureEnabled: true, isMobileLayout: false, mapEditorEnabled: true }), SHOOTER_RENDERER_MODES.MAP_EDITOR);
  assert.equal(getShooterRendererMode({ featureEnabled: false, isMobileLayout: false }), SHOOTER_RENDERER_MODES.DESKTOP_PORTRAIT);
});

test("one shared progress value drives right-to-left position and perspective scale", () => {
  const far = projectDesktopHorizontalTarget({ id: 1, progress: 0, x: 50 });
  const middle = projectDesktopHorizontalTarget({ id: 1, progress: 0.5, x: 50 });
  const near = projectDesktopHorizontalTarget({ id: 1, progress: 1, x: 50 });

  assert.ok(far.x > middle.x && middle.x > near.x);
  assert.ok(far.scale < middle.scale && middle.scale < near.scale);
  assert.equal(far.y, middle.y);
  assert.equal(middle.y, near.y);
  assert.ok(far.scale >= 0.58);
  assert.ok(near.scale <= 1.14);
});

test("lane variation stays inside the desktop playfield", () => {
  const upper = projectDesktopHorizontalTarget({ progress: 0.4, x: 18 });
  const lower = projectDesktopHorizontalTarget({ progress: 0.4, x: 82 });

  assert.equal(upper.y, 30);
  assert.equal(lower.y, 72);
});

test("front target selection follows progress, never pitch or visual lane", () => {
  const targets = [
    { id: 1, note: "C4", progress: 0.25, x: 18, bornAt: 0 },
    { id: 2, note: "E4", progress: 0.72, x: 82, bornAt: 100 },
    { id: 3, note: "C4", progress: 0.52, x: 50, bornAt: 200 },
  ];

  assert.equal(getFrontShooterTarget(targets)?.id, 2);
  targets[1].hitboxActive = false;
  assert.equal(getFrontShooterTarget(targets)?.id, 3);
});

test("legacy y values remain a compatible progress fallback for mobile targets", () => {
  assert.equal(getShooterTargetProgress({ y: 8 }), 0);
  assert.equal(getShooterTargetProgress({ y: 48 }), 0.5);
  assert.equal(getShooterTargetProgress({ y: 88 }), 1);
});

test("preserved horizontal backdrop prototypes remain dormant standalone wide assets", async () => {
  const expectedMapIds = ["coastal-cove", "river-garden", "park", "lava-canyon"];
  assert.deepEqual(Object.keys(DESKTOP_HORIZONTAL_MAP_BACKDROPS), expectedMapIds);

  for (const mapId of expectedMapIds) {
    const backdrop = getDesktopHorizontalMapBackdrop(mapId);
    assert.ok(backdrop?.src.startsWith("/assets/maps/desktop-horizontal/"));
    const png = await readFile(new URL(`../public${backdrop.src}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    assert.ok(width / height > 2, `${mapId} must remain an ultra-wide landscape asset`);
  }

  assert.equal(getDesktopHorizontalMapBackdrop("dev-three-d-lab"), null);
});

test("desktop battle CSS is scoped to the dedicated renderer class", async () => {
  const [css, componentSource, mapSource, appSource] = await Promise.all([
    readFile(new URL("../src/shooter/desktopHorizontal/desktop-horizontal-battle.css", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/desktopHorizontal/DesktopHorizontalBattleView.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/desktopHorizontal/desktopHorizontalMaps.js", import.meta.url), "utf8"),
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(css, /@media \(min-width: 681px\)/);
  assert.match(css, /shooterArena--desktopHorizontal/);
  assert.doesNotMatch(css, /100cqh|rotate\(90deg\)|rotate\(-90deg\)/);
  assert.match(css, /shooterArena--desktopHorizontal\.shooterArena--layeredMap \.shooterMapSkinStage \{[\s\S]*display: none !important/);
  assert.match(css, /desktopHorizontalMapBackdropImage/);
  assert.match(css, /shooterEnemy--monster \.shooterEnemyMonsterAsset \{[\s\S]*background: transparent !important/);
  assert.match(componentSource, /aria-live="polite"/);
  assert.doesNotMatch(componentSource, /MONSTER FLOW|DEV · HORIZONTAL BATTLE/);
  assert.match(componentSource, /data-desktop-map=\{mapBackdrop\.id\}/);
  assert.equal(mapSource.match(/\/assets\/maps\/desktop-horizontal\//g)?.length, 4);
  assert.doesNotMatch(mapSource, /rotate/);
  assert.match(componentSource, /data-wave-system="gerstner-lite"/);
  assert.equal(componentSource.match(/desktopHorizontalWaveLayer--/g)?.length, 3);
  assert.doesNotMatch(componentSource, /requestAnimationFrame|setInterval/);
  assert.match(appSource, /devMapActive: selectedMapIsThreeDLab/);
  assert.match(appSource, /threeDLabHorizontalBattle=\{desktopHorizontalShooterActive\}/);
  assert.match(appSource, /waterFlowActive=\{false\}/);
  assert.match(appSource, /mapId=\{selectedMap\.id\}/);
  assert.match(css, /@keyframes desktopHorizontalWaveFar/);
  assert.match(css, /@keyframes desktopHorizontalWaveMid/);
  assert.match(css, /@keyframes desktopHorizontalWaveNear/);
  assert.match(css, /will-change: transform;/);
  assert.doesNotMatch(css, /will-change: transform, background-position/);
  assert.match(css, /shooterArena--animationsPaused \.desktopHorizontalWaveLayer/);
  assert.match(appSource, /const attackShooterTargetByClick = useCallback/);
  assert.match(appSource, /const desktopHorizontalClickAttackActive = import\.meta\.env\.DEV && desktopHorizontalShooterActive/);
  assert.match(appSource, /data-click-attack=\{desktopHorizontalClickAttackActive/);
  assert.match(appSource, /detectorReady = shooterHitboxDebugEnabled[\s\S]*\|\| desktopHorizontalClickAttackActive/);
  assert.match(appSource, /desktopHorizontalShooterActive \|\| !shooterGuitarCabinetActive/);
  assert.doesNotMatch(css, /@media \(max-width: 680px\)[\s\S]*shooterArena--desktopHorizontal/);
});
