import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getShooterMapPerformanceFingerprint,
  getShooterMapPerformancePolicy,
} from "../src/shooter/maps/performancePolicy.js";
import {
  SHOOTER_MOBILE_CANVAS_HEIGHT,
  SHOOTER_MOBILE_CANVAS_WIDTH,
  getShooterMobileViewportFrame,
} from "../src/shooter/mobileViewportFrame.js";
import {
  LAYERED_SHOOTER_MAP_SKINS,
  getShooterMapAssetSources,
  getShooterMapsForLayout,
  resolveLayeredShooterMap,
} from "../src/shooter/maps/registry.js";
import {
  ABYSSAL_WHALE_FIGURE8_DURATION_RANGES,
  ABYSSAL_WHALE_FIGURE8_PATH,
  ABYSSAL_WHALE_FIGURE8_STATES,
  ABYSSAL_WHALE_FIGURE8_VIEWPORT,
  advanceAbyssalWhaleFigure8,
  createAbyssalWhaleFigure8DebugState,
  createAbyssalWhaleFigure8State,
  getAbyssalWhaleFigure8Render,
} from "../src/shooter/maps/abyssalWhaleFigure8.js";
import { ABYSSAL_MOON_CATHEDRAL_MAP_SKIN } from "../src/shooter/maps/skins/abyssalMoonCathedral.js";
import { MAP_EDIT_SKINS, validateMapPlacements } from "../vite.config.js";

const MAP = ABYSSAL_MOON_CATHEDRAL_MAP_SKIN;
const ASSET_ROOT = new URL("../public/assets/maps/abyssal-moon-cathedral/", import.meta.url);

function readPngHeader(buffer) {
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  return {
    colorType: buffer[25],
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}

test("Abyssal Moon Cathedral is an independent mobile and desktop layered map using the clean background", async () => {
  assert.equal(MAP.id, "abyssalMoonCathedral");
  assert.equal(MAP.nameKo, "심해 월광 대성당");
  assert.equal(MAP.mobileOnly, false);
  assert.equal(MAP.background.src.endsWith("01_clean_background.png"), true);
  assert.equal(MAP.previewImage.endsWith("00_master_reference.png"), true);
  assert.equal(MAP.background.fit, "cover");
  assert.deepEqual(
    { width: MAP.referenceViewport.width, height: MAP.referenceViewport.height },
    { width: 841, height: 1870 },
  );
  assert.ok(LAYERED_SHOOTER_MAP_SKINS.includes(MAP));
  assert.ok(getShooterMapsForLayout(true).includes(MAP));
  assert.equal(getShooterMapsForLayout(false).includes(MAP), true);
  assert.ok(getShooterMapsForLayout(false, { includeMobileOnly: true }).includes(MAP));

  const [master, background, mask] = await Promise.all([
    readFile(new URL("00_master_reference.png", ASSET_ROOT)),
    readFile(new URL("01_clean_background.png", ASSET_ROOT)),
    readFile(new URL("architecture_occlusion_foreground.png", ASSET_ROOT)),
  ]);
  assert.deepEqual(readPngHeader(master), { colorType: 2, height: 1870, width: 841 });
  assert.deepEqual(readPngHeader(background), { colorType: 2, height: 1870, width: 841 });
  assert.deepEqual(readPngHeader(mask), { colorType: 6, height: 1870, width: 841 });
  assert.equal(MAP.architectureMask.fit, MAP.background.fit);
  assert.equal(MAP.architectureMask.position, MAP.background.position);
});

test("all 23 supplied RGBA objects are runtime assets without contact-sheet fallback", async () => {
  assert.equal(MAP.assetCatalog.length, 23);
  assert.equal(new Set(MAP.assetCatalog.map((asset) => asset.id)).size, 23);
  const sources = getShooterMapAssetSources(MAP);
  assert.equal(sources.length, 104);
  assert.equal(sources.some((src) => src.includes("00_master_reference")), false);
  assert.equal(sources.some((src) => src.includes("02_asset_contact_sheet")), false);
  assert.equal(sources.some((src) => src.includes("architecture_occlusion_foreground")), true);

  const whaleAsset = MAP.assetCatalog.find((asset) => asset.id === "abyssal-distant-whale");
  assert.ok(whaleAsset);
  assert.equal(whaleAsset.src.endsWith("whale-v8/frames/02_right_approach_frame_15.png"), true);
  assert.equal(whaleAsset.baseWidth, 0.28);
  assert.equal(whaleAsset.aspectRatio, 308 / 318);
  assert.equal(whaleAsset.farWhale.mode, "figure8-v8");
  assert.equal(whaleAsset.farWhale.frames.length, 80);
  assert.equal(Object.keys(whaleAsset.farWhale.phases).length, 5);
  assert.deepEqual(whaleAsset.farWhale.viewport, ABYSSAL_WHALE_FIGURE8_VIEWPORT);
  const frameHeaders = await Promise.all(whaleAsset.farWhale.frames.map(async (src) => (
    readPngHeader(await readFile(new URL(src.replace("/assets/maps/abyssal-moon-cathedral/", ""), ASSET_ROOT)))
  )));
  assert.ok(frameHeaders.every((header) => header.colorType === 6));
  assert.deepEqual(
    [...new Set(frameHeaders.map(({ width, height }) => `${width}x${height}`))].sort(),
    ["306x321", "308x318", "308x320", "314x314", "384x256"],
  );
  await assert.rejects(readFile(new URL("objects/distant_whale_far_rgba.png", ASSET_ROOT)));
  await assert.rejects(readFile(new URL("objects/whale_approach_turn_12f_rgba_sheet.png", ASSET_ROOT)));
  await assert.rejects(readFile(new URL("objects/whale_side_swim_12f_rgba_sheet.png", ASSET_ROOT)));
  await assert.rejects(readFile(new URL("objects/distant_whale_v2_rgba.png", ASSET_ROOT)));
  await assert.rejects(readFile(new URL("objects/distant_whale_rgba.png", ASSET_ROOT)));

  for (const asset of MAP.assetCatalog) {
    const png = await readFile(new URL(asset.src.replace("/assets/maps/abyssal-moon-cathedral/", ""), ASSET_ROOT));
    assert.equal(readPngHeader(png).colorType, 6, asset.id);
  }
});

test("master-aligned architecture and flora protect the persistent combat corridor", () => {
  const assets = new Map(MAP.assetCatalog.map((asset) => [asset.id, asset]));
  const usedAssets = new Set(MAP.layout.map((placement) => placement.assetId));
  assert.equal(usedAssets.size, 23);
  assert.equal(MAP.layout.length, 24);

  MAP.layout
    .filter((placement) => !["abyssal-whale-figure8-v8", "abyssal-fish-school"].includes(placement.animation))
    .forEach((placement) => {
      const asset = assets.get(placement.assetId);
      const width = asset.baseWidth * (placement.scale ?? 1);
      const left = placement.x - width * ((asset.anchorX ?? 50) / 100);
      const right = left + width;
      assert.ok(right <= 0.35 || left >= 0.65, `${placement.instanceId} crosses the combat corridor`);
    });
});

test("bell, clapper, orrery rings, kelp, banners, whale, and fish resolve independently", () => {
  const resolved = resolveLayeredShooterMap(MAP);
  assert.equal(resolved.layers.length, 24);
  const byAnimation = new Map();
  resolved.layers.forEach((layer) => {
    const type = layer.animation?.type ?? "none";
    byAnimation.set(type, (byAnimation.get(type) ?? 0) + 1);
  });
  assert.equal(byAnimation.get("abyssal-whale-figure8-v8"), 1);
  assert.equal(byAnimation.get("abyssal-fish-school"), 2);
  assert.equal(byAnimation.get("abyssal-bell-body"), 1);
  assert.equal(byAnimation.get("abyssal-bell-clapper"), 1);
  assert.equal(byAnimation.get("abyssal-orrery-outer"), 1);
  assert.equal(byAnimation.get("abyssal-orrery-middle"), 1);
  assert.equal(byAnimation.get("abyssal-orrery-inner"), 1);
  assert.equal(byAnimation.get("abyssal-kelp"), 7);
  assert.equal(byAnimation.get("abyssal-banner"), 2);
  assert.equal(byAnimation.get("abyssal-guardian"), 3);

  const catalog = new Map(MAP.assetCatalog.map((asset) => [asset.id, asset]));
  assert.equal(catalog.get("abyssal-bell-body").anchorY, 2);
  assert.equal(catalog.get("abyssal-bell-clapper").anchorY, 1);
  assert.equal(catalog.get("abyssal-orrery-complete").anchorY, 39);
});

test("the desktop map editor validates and saves the complete Abyssal layout", () => {
  const editorSkin = MAP_EDIT_SKINS.get(MAP.id);
  assert.ok(editorSkin);
  assert.equal(editorSkin.layoutPath.endsWith("abyssal-moon-cathedral-layout.json"), true);
  const validated = validateMapPlacements(MAP.layout, editorSkin.assetCatalog);
  assert.equal(validated.length, 24);
});

test("V8 whale rises into the ceiling after receding, then repeats from the right", () => {
  const whale = createAbyssalWhaleFigure8State(0xa62b4d1);
  assert.equal(whale.state, ABYSSAL_WHALE_FIGURE8_STATES.HIDDEN);
  assert.ok(whale.stateDuration >= 1 && whale.stateDuration <= 2);
  assert.ok(whale.motionDuration >= 19 && whale.motionDuration <= 21.8);
  assert.equal(getAbyssalWhaleFigure8Render(whale).opacity, 0);

  const requestedStates = [
    ABYSSAL_WHALE_FIGURE8_STATES.RIGHT_REVEAL_APPROACH,
    ABYSSAL_WHALE_FIGURE8_STATES.CENTER_TURN_DIVE,
    ABYSSAL_WHALE_FIGURE8_STATES.DEEP_REAR_CURVE,
  ];
  const expectedPhases = [
    "rightApproach",
    "centerTurnDive",
    "distantRearCurve",
  ];
  const samples = requestedStates.map((state, index) => {
    const debug = createAbyssalWhaleFigure8DebugState(state, 0.78);
    const render = getAbyssalWhaleFigure8Render(debug);
    assert.equal(render.phaseId, expectedPhases[index]);
    assert.ok(render.frameA >= 0 && render.frameA <= 15);
    assert.ok(render.frameB >= render.frameA && render.frameB <= 15);
    assert.ok(render.frameMix >= 0 && render.frameMix <= 1);
    return render;
  });
  assert.ok(samples[0].scale > 0.23 && samples[0].opacity >= 0.44);
  assert.equal(samples[0].frontLayerMix, 1);
  assert.ok(samples[1].scale < samples[0].scale, "center turn must dive away from the viewer");
  assert.ok(samples[1].frontLayerMix < samples[0].frontLayerMix);
  assert.equal(samples[2].x, 0.505);
  assert.ok(samples[2].y < 0.07 && samples[2].scale <= 0.11);
  assert.ok(samples[2].opacity < 0.08);
  assert.equal(samples[2].frontLayerMix, 0);
  assert.equal(ABYSSAL_WHALE_FIGURE8_PATH.length, 4);
  assert.deepEqual(ABYSSAL_WHALE_FIGURE8_PATH.at(-1), { x: 0.505, y: 0.055, scale: 0.1 });

  const ceilingStart = getAbyssalWhaleFigure8Render(
    createAbyssalWhaleFigure8DebugState(ABYSSAL_WHALE_FIGURE8_STATES.DEEP_REAR_CURVE, 0),
  );
  const ceilingEnd = getAbyssalWhaleFigure8Render(
    createAbyssalWhaleFigure8DebugState(ABYSSAL_WHALE_FIGURE8_STATES.DEEP_REAR_CURVE, 1),
  );
  assert.equal(ceilingStart.x, ceilingEnd.x, "ceiling exit must not drift left or right");
  assert.ok(ceilingEnd.y < ceilingStart.y, "the smallest whale must rise toward the ceiling");
  assert.ok(ceilingEnd.scale < ceilingStart.scale);
  assert.equal(ceilingEnd.opacity, 0);

  const visited = [];
  let elapsed = 0;
  let lastState = whale.state;
  while (elapsed < 60 && whale.state !== ABYSSAL_WHALE_FIGURE8_STATES.COOLDOWN) {
    advanceAbyssalWhaleFigure8(whale, 1 / 30);
    elapsed += 1 / 30;
    if (whale.state !== lastState) {
      visited.push(whale.state);
      lastState = whale.state;
    }
  }
  assert.deepEqual(visited, [
    ...requestedStates,
    ABYSSAL_WHALE_FIGURE8_STATES.DEEP_HOLD,
    ABYSSAL_WHALE_FIGURE8_STATES.COOLDOWN,
  ]);
  assert.ok(elapsed >= 20 && elapsed <= 25);
  const cooldownRange = ABYSSAL_WHALE_FIGURE8_DURATION_RANGES[ABYSSAL_WHALE_FIGURE8_STATES.COOLDOWN];
  assert.ok(whale.stateDuration >= cooldownRange[0] && whale.stateDuration <= cooldownRange[1]);
  assert.equal(getAbyssalWhaleFigure8Render(whale).opacity, 0);
  let cooldownElapsed = 0;
  while (whale.state === ABYSSAL_WHALE_FIGURE8_STATES.COOLDOWN && cooldownElapsed < 8) {
    advanceAbyssalWhaleFigure8(whale, 0.1);
    cooldownElapsed += 0.1;
  }
  assert.ok(cooldownElapsed >= cooldownRange[0] && cooldownElapsed <= cooldownRange[1] + 0.1);
  assert.equal(whale.state, ABYSSAL_WHALE_FIGURE8_STATES.RIGHT_REVEAL_APPROACH);
  assert.ok(whale.motionElapsed >= 0 && whale.motionElapsed <= 0.1);
  assert.ok(getAbyssalWhaleFigure8Render(whale).opacity < 0.05);
  for (let frame = 0; frame < 20; frame += 1) advanceAbyssalWhaleFigure8(whale, 0.1);
  const repeatedApproach = getAbyssalWhaleFigure8Render(whale);
  assert.ok(repeatedApproach.opacity > 0.2);
  assert.ok(repeatedApproach.x > 0.65);
  assert.equal(visited.includes(ABYSSAL_WHALE_FIGURE8_STATES.LEFT_RETURN_APPROACH), false);
  assert.equal(visited.includes(ABYSSAL_WHALE_FIGURE8_STATES.CENTER_CROSS_RIGHT_EXIT), false);
});

test("all five requested portrait sizes preserve the complete map and combat corridor", () => {
  for (const [viewportWidth, viewportHeight] of [
    [360, 800],
    [375, 812],
    [390, 844],
    [393, 852],
    [430, 932],
  ]) {
    const frame = getShooterMobileViewportFrame({ viewportHeight, viewportWidth });
    assert.ok(frame.width <= viewportWidth + 1e-9, `${viewportWidth}x${viewportHeight} width crop`);
    assert.ok(frame.height <= viewportHeight + 1e-9, `${viewportWidth}x${viewportHeight} height crop`);
    assert.ok(frame.left >= 0 && frame.top >= 0, `${viewportWidth}x${viewportHeight} negative offset`);
    assert.ok(Math.abs(
      frame.width / frame.height - SHOOTER_MOBILE_CANVAS_WIDTH / SHOOTER_MOBILE_CANVAS_HEIGHT,
    ) < 1e-12, `${viewportWidth}x${viewportHeight} aspect drift`);

    const combatLeft = frame.left + frame.width * 0.35;
    const combatRight = frame.left + frame.width * 0.65;
    assert.ok(combatLeft >= frame.left && combatRight <= frame.left + frame.width);
  }
});

test("one shared paused-aware runtime pools travelers and bubbles without React frame state", async () => {
  const [runtimeSource, rendererSource, styles, editorStyles] = await Promise.all([
    readFile(new URL("../src/shooter/maps/AbyssalMoonRuntimeField.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/MapSkinRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/map-skins.css", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/editor/map-editor.css", import.meta.url), "utf8"),
  ]);

  assert.match(runtimeSource, /subscribeSharedMapAnimation/);
  assert.match(runtimeSource, /Array\.from\(\{ length: 32 \}/);
  assert.match(runtimeSource, /FIGURE8_FRAME_IMAGE_CACHE = new Map\(\)/);
  assert.match(runtimeSource, /preloadFigure8Frames/);
  assert.match(runtimeSource, /advanceAbyssalWhaleFigure8/);
  assert.match(runtimeSource, /getAbyssalWhaleFigure8Render/);
  assert.match(runtimeSource, /layerOpacity \* \(1 - render\.frameMix\)/);
  assert.match(runtimeSource, /render\.frontLayerMix/);
  assert.match(runtimeSource, /framesPerSecond: 30/);
  assert.match(runtimeSource, /context\.drawImage\(/);
  assert.doesNotMatch(runtimeSource, /WHALE_SLICE|drawFarWhale|distant_whale_far_rgba|setInterval|requestAnimationFrame/);
  assert.match(runtimeSource, /reaction\.wait = range\(reaction\.random, 10, 25\)/);
  assert.match(runtimeSource, /if \(paused\) return/);
  assert.match(runtimeSource, /Math\.min\(0\.1/);
  assert.doesNotMatch(runtimeSource, /useState|setInterval|setTimeout|requestAnimationFrame/);
  assert.match(rendererSource, /AbyssalMoonRuntimeField active=\{animationsActive && !editMode\}/);
  assert.match(rendererSource, /shooterMapAquariumWaterLayer/);
  assert.match(rendererSource, /shooterMapFigure8WhaleCanvas/);
  assert.match(rendererSource, /data-whale-depth-layer="rear"/);
  assert.match(rendererSource, /data-whale-depth-layer="front"/);
  assert.doesNotMatch(rendererSource, /shooterMapFarWhaleSource/);
  assert.doesNotMatch(rendererSource, /backgroundSize: "400% 300%"|cinematicWhale/);
  assert.match(styles, /shooterMapArchitectureMask/);
  assert.match(styles, /object-fit: var\(--shooter-map-mask-fit, cover\)/);
  assert.match(styles, /shooterMapWhaleViewport[\s\S]*inset: 5\.5% 17% 71% 17%/);
  assert.match(styles, /shooterMapWhaleViewport--front[\s\S]*z-index: 3/);
  assert.match(styles, /shooterMapAquariumWaterLayer/);
  assert.match(editorStyles, /data-animation="abyssal-whale-figure8-v8"[\s\S]*?z-index: 1 !important/);
  assert.match(styles, /clip-path: inset\(80% 0 0 0\)/);
  assert.match(styles, /shooterMapAbyssalBannerTop[\s\S]*clip-path: inset\(0 0 76% 0\)/);
  assert.match(styles, /shooterMapAbyssalGatekeeperHead/);
  assert.match(styles, /transform-origin: 50% 2%/);

  assert.equal(getShooterMapPerformanceFingerprint(MAP).length, 8);
  assert.deepEqual(getShooterMapPerformancePolicy(MAP), {
    mobileGameplayAuditPassed: true,
    mobileGameplayEffects: "full",
  });
});
