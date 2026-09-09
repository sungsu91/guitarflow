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
import { projectGameplayPointToThreeDLabMobileLandscape } from "../src/shooter/threed/threeDLabHorizontalProjection.js";

test("wide renderer is isolated to desktop 3D LAB or its mobile landscape mode", () => {
  assert.equal(DESKTOP_HORIZONTAL_SHOOTER_FEATURE.devMapId, "dev-three-d-lab");
  assert.equal(getShooterRendererMode({ devMapActive: true, featureEnabled: true, isMobileLayout: false }), SHOOTER_RENDERER_MODES.DESKTOP_HORIZONTAL);
  assert.equal(getShooterRendererMode({ devMapActive: false, featureEnabled: true, isMobileLayout: false }), SHOOTER_RENDERER_MODES.DESKTOP_PORTRAIT);
  assert.equal(getShooterRendererMode({ devMapActive: true, featureEnabled: true, isMobileLayout: true }), SHOOTER_RENDERER_MODES.MOBILE_VERTICAL);
  assert.equal(getShooterRendererMode({ devMapActive: true, featureEnabled: true, isMobileLayout: true, mobileLandscapeActive: true }), SHOOTER_RENDERER_MODES.MOBILE_HORIZONTAL);
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

test("mobile landscape targets stay in a readable middle-height band", () => {
  const viewport = { width: 844, height: 390 };
  const upper = projectGameplayPointToThreeDLabMobileLandscape({ progress: 0.4, x: 18 }, viewport);
  const lower = projectGameplayPointToThreeDLabMobileLandscape({ progress: 0.4, x: 82 }, viewport);

  assert.equal(upper.screenYPercent, 44);
  assert.equal(lower.screenYPercent, 56);
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
  assert.match(css, /mobileLandscapeShooter[\s\S]*shooterEnemy--monster \{[\s\S]*width: calc\(var\(--target-render-size, 86\.4px\) \* 1\.48\) !important;[\s\S]*height: calc\(var\(--target-render-size, 86\.4px\) \* 1\.48\) !important/);
  assert.match(css, /mobileLandscapeShooter[\s\S]*shooterEnemyPitchLabel \{[\s\S]*font-size: calc\(var\(--target-label-font-size, 13px\) \* 1\.2\) !important/);
  assert.match(css, /desktopHorizontalSelectControl select \{[\s\S]*color: transparent !important;[\s\S]*opacity: 0 !important/);
  assert.match(componentSource, /aria-live="polite"/);
  assert.match(componentSource, /<HudItem label="BEST" meta="HIGH SCORE">\{Number\(bestScore \|\| 0\)\.toLocaleString\(\)\}<\/HudItem>/);
  assert.doesNotMatch(componentSource, /<HudItem label="(?:SCORE|COMBO)"/);
  assert.doesNotMatch(componentSource, /MONSTER FLOW|DEV · HORIZONTAL BATTLE/);
  assert.match(componentSource, /data-desktop-map=\{mapBackdrop\.id\}/);
  assert.equal(mapSource.match(/\/assets\/maps\/desktop-horizontal\//g)?.length, 4);
  assert.doesNotMatch(mapSource, /rotate/);
  assert.match(componentSource, /data-wave-system="gerstner-lite"/);
  assert.equal(componentSource.match(/desktopHorizontalWaveLayer--/g)?.length, 3);
  assert.doesNotMatch(componentSource, /requestAnimationFrame|setInterval/);
  assert.match(appSource, /devMapActive: selectedMapIsThreeDLab/);
  assert.match(appSource, /const horizontalShooterActive = desktopHorizontalShooterActive[\s\S]*SHOOTER_RENDERER_MODES\.MOBILE_HORIZONTAL/);
  assert.match(appSource, /threeDLabHorizontalBattle=\{horizontalShooterActive\}/);
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
  assert.match(appSource, /horizontalShooterActive \|\| !shooterGuitarCabinetActive/);
  assert.match(appSource, /<ShootingMapRenderer[\s\S]*threeDLabPreview=\{mobileLandscapeShooterSelected && !mobileLandscapeShooterActive\}[\s\S]*className="mobileLandscapeShooterPrompt"/);
  assert.match(appSource, /className="mobileLandscapeShooterHome"/);
  assert.match(appSource, /className="mobileLandscapeShooterReturn"[\s\S]*returnToPortraitShooterMap\(\)[\s\S]*돌아가기/);
  assert.match(appSource, /lastPortraitShooterMapIdRef[\s\S]*selectedMap\.landscapeOnly[\s\S]*lastPortraitShooterMapIdRef\.current = selectedMap\.id/);
  assert.match(appSource, /const returnToPortraitShooterMap = useCallback[\s\S]*orientation\?\.unlock[\s\S]*exitFullscreen/);
  assert.match(componentSource, /className="shooterRecordingEntrySlot shooterRecordingEntrySlot--landscapeControl"/);
  assert.match(appSource, /appMode === APP_MODES\.SHOOTER && !mobileLandscapeShooterActive && typeof document !== "undefined" \? createPortal\([\s\S]*<ShooterPitchMonitor/);
  assert.match(appSource, /className="desktopHorizontalGameOverStats"[\s\S]*SCORE[\s\S]*score\.toLocaleString\(\)[\s\S]*COMBO[\s\S]*maxCombo/);
  assert.match(appSource, /desktopHorizontalRestartNow[\s\S]*바로 시작/);
  assert.match(css, /main\.app\.app\.app\.mobileLandscapeShooter/);
  assert.match(css, /mobileLandscapeShooter \.desktopHorizontalBattleControls \{[\s\S]*top: calc\(env\(safe-area-inset-top\) \+ 6px\)[\s\S]*bottom: auto[\s\S]*grid-template-columns: minmax\(126px, 1\.1fr\)[\s\S]*minmax\(82px, 0\.7fr\)/);
  assert.match(componentSource, /mobileLandscape \? \([\s\S]*label="SIGNAL"[\s\S]*currentPitch/);
  assert.match(componentSource, /!mobileLandscape \? <button onClick=\{onSkin\}/);
  assert.match(componentSource, /!mobileLandscape \? <button aria-pressed=\{soundOn\}/);
  assert.doesNotMatch(componentSource, /desktopHorizontalPauseButton/);
  assert.match(componentSource, /desktopHorizontalSelectControl[\s\S]*aria-label="난이도 선택"/);
  assert.match(componentSource, /desktopHorizontalScorePair[\s\S]*BEST[\s\S]*현재/);
  assert.match(css, /mobileLandscapeShooter[\s\S]*shooterGuitarPickerList--filtered \.shooterGuitarPickerGrid \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /mobileLandscapeShooter[\s\S]*shooterEffectSetPicker \{[\s\S]*grid-template-columns: minmax\(0, 1\.35fr\) minmax\(210px, 0\.8fr\) !important/);
  assert.match(css, /shooterEffectSetTrack,[\s\S]*shooterEffectStandaloneTrack[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /desktopLayout \.shooterPanel--desktopHorizontal:not\(\.shooterPanel--mapEditorWorkspace\)[\s\S]*> \.desktopHorizontalBattleControls \{[\s\S]*position: absolute[\s\S]*top: 8px[\s\S]*grid-template-columns: repeat\(7, minmax\(0, 1fr\)\)/);
  assert.match(css, /mobileLandscapeShooterSelected:not\(\.mobileLandscapeShooter\)[\s\S]*background: #0a0a0a !important/);
  assert.match(css, /shooterArena > \.mobileLandscapeShooterPrompt \{[\s\S]*position: absolute[\s\S]*bottom: 14px[\s\S]*pointer-events: none/);
  assert.match(css, /shooterArena > \.mobileLandscapeShooterPrompt button \{[\s\S]*pointer-events: auto/);
  assert.match(css, /mobileLandscapeShooter \.desktopHorizontalBattleHud \{[\s\S]*background: transparent;[\s\S]*box-shadow: none/);
  assert.match(css, /desktopHorizontalResultReceipt[\s\S]*PLAY RECORD · RESULT/);
  assert.match(css, /desktopHorizontalResultReceipt \.desktopHorizontalRestartNow[\s\S]*visibility: visible !important/);
  assert.match(css, /shooterRecordingEntrySlot--landscapeControl \{[\s\S]*width: 100%;[\s\S]*height: 40px/);
  assert.match(css, /shooterRecordingEntrySlot--landscapeControl > \.shooterRecordingHudButton \{[\s\S]*width: 100% !important[\s\S]*height: 100% !important/);
  assert.doesNotMatch(css, /@media \(max-width: 680px\)[\s\S]*shooterArena--desktopHorizontal/);
});
