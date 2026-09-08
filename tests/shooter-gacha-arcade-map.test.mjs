import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { LAYERED_SHOOTER_MAP_SKINS, getShooterMapAssetSources } from "../src/shooter/maps/registry.js";
import { getShooterMapPerformancePolicy } from "../src/shooter/maps/performancePolicy.js";
import { GACHA_ARCADE_MAP_SKIN } from "../src/shooter/maps/skins/gachaArcade.js";
import { GACHA_ARCADE_CLEAR_CORRIDOR } from "../src/shooter/maps/skins/gachaArcadeLayout.js";

const assetRoot = new URL("../public/assets/maps/gacha-arcade/", import.meta.url);

test("V3 manifest fixes the shared axis, corridor, and seven machine slots", async () => {
  const manifest = JSON.parse(await readFile(new URL("asset_manifest.json", assetRoot), "utf8"));
  assert.equal(manifest.version, "3.6.0");
  assert.equal(manifest.canvas.center_axis_x, 768);
  assert.deepEqual(manifest.canvas.clear_corridor, { left: 460, right: 1076 });
  assert.equal(manifest.layout_rules.machine_rotation_degrees, 0);
  assert.equal(manifest.layout_rules.plinth_rotation_degrees, 0);
  assert.equal(manifest.layout_rules.plinth_width_ratio, 1.28);
  assert.equal(manifest.layout_rules.machine_base_offset_ratio, 0.16);
  assert.equal(manifest.layout_rules.machine_footline_on_plinth_ratio, 0.5);
  assert.equal(manifest.layout_rules.plinth_has_floor_contact_shadow, true);
  assert.equal(manifest.machine_slots.length, 7);
  assert.equal(manifest.machine_slots.filter((slot) => slot.side === "left").length, 4);
  assert.equal(manifest.machine_slots.filter((slot) => slot.side === "right").length, 3);
});

test("gacha arcade V3 uses an empty seven-bay background and layered render order", () => {
  assert.equal(GACHA_ARCADE_MAP_SKIN.runtimeAnimation.version, "3.6.0");
  assert.deepEqual(getShooterMapPerformancePolicy(GACHA_ARCADE_MAP_SKIN), {
    mobileGameplayEffects: "full",
    mobileGameplayAuditPassed: true,
  });
  assert.deepEqual(GACHA_ARCADE_MAP_SKIN.referenceViewport, {
    width: 1536,
    height: 3328,
    deviceWidth: 390,
    deviceHeight: 844,
  });
  assert.equal(
    GACHA_ARCADE_MAP_SKIN.background.src,
    "/assets/maps/gacha-arcade/runtime/FRETIVA_GACHA_ARCADE_MAP_BASE_EMPTY_BAYS_RUNTIME.png",
  );
  assert.deepEqual(GACHA_ARCADE_MAP_SKIN.runtimeAnimation.renderOrder, [
    "empty_seven_bay_background",
    "far_to_near_machine_groups_plinth_cabinet_claw",
    "star_light_ring",
    "gameplay",
    "guitar",
    "HUD",
  ]);
  assert.equal(LAYERED_SHOOTER_MAP_SKINS.at(0), GACHA_ARCADE_MAP_SKIN);
});

test("four left and three right cabinets each own one staggered clipped claw", () => {
  const { staticObjects, sprites } = GACHA_ARCADE_MAP_SKIN.runtimeAnimation;
  const platforms = staticObjects.filter((object) => object.kind === "platform");
  const machines = staticObjects.filter((object) => object.kind === "machine");
  const claws = sprites.filter((sprite) => sprite.id.startsWith("claw_"));
  const star = sprites.find((sprite) => sprite.id === "star_light_ring");

  assert.equal(platforms.length, 7);
  assert.equal(machines.length, 7);
  assert.equal(machines.filter((machine) => machine.side === "left").length, 4);
  assert.equal(machines.filter((machine) => machine.side === "right").length, 3);
  assert.deepEqual(machines.map((machine) => machine.theme), [
    "lavender",
    "mint",
    "pink",
    "lavender",
    "mint",
    "pink",
    "lavender",
  ]);
  assert.deepEqual(machines.map((machine) => machine.id), [
    "machine_left_1",
    "machine_right_1",
    "machine_left_2",
    "machine_right_2",
    "machine_left_3",
    "machine_right_3",
    "machine_left_4",
  ]);
  assert.deepEqual(machines.map((machine) => machine.placement), [
    { x: 76, y: 305, width: 339, height: 509 },
    { x: 1120, y: 393, width: 363, height: 545 },
    { x: -17, y: 552, width: 454, height: 681 },
    { x: 1089, y: 741, width: 484, height: 726 },
    { x: -81, y: 1027, width: 532, height: 798 },
    { x: 1077, y: 1403, width: 557, height: 836 },
    { x: -134, y: 1787, width: 569, height: 854 },
  ]);
  for (const [index, machine] of machines.entries()) {
    const platform = platforms[index];
    const machineCenter = machine.placement.x + machine.placement.width / 2;
    const platformCenter = platform.placement.x + platform.placement.width / 2;
    assert.ok(Math.abs(machineCenter - platformCenter) <= 0.5);
    assert.equal(platform.placement.width, Math.round(machine.placement.width * 1.28));
    const machineBaseY = machine.placement.y + machine.placement.height;
    const seatedMachineBaseY = platform.placement.y + platform.placement.height * 0.5;
    assert.ok(Math.abs(machineBaseY - seatedMachineBaseY) <= 1);
    assert.equal(machine.zIndex, platform.zIndex + 1);
    if (machine.side === "left") {
      assert.ok(machine.placement.x + machine.placement.width < GACHA_ARCADE_CLEAR_CORRIDOR.left);
    } else {
      assert.ok(machine.placement.x > GACHA_ARCADE_CLEAR_CORRIDOR.right);
    }
  }
  assert.equal(machines.find((machine) => machine.side === "left").src.endsWith("_right_runtime.png"), true);
  assert.equal(machines.find((machine) => machine.side === "right").src.endsWith("_left_runtime.png"), true);

  assert.equal(claws.length, 7);
  assert.deepEqual(claws.map((claw) => claw.phaseOffsetMs), [0, 857, 1714, 2571, 3428, 4285, 5142]);
  assert.equal(new Set(claws.map((claw) => claw.phaseOffsetMs)).size, 7);
  for (const claw of claws) {
    assert.equal(machines.some((machine) => machine.id === claw.machineId), true);
    assert.equal(claw.columns, 6);
    assert.equal(claw.rows, 4);
    assert.equal(claw.frameCount, 24);
    assert.equal(claw.framesPerSecond, 4);
    assert.equal(claw.durationMs, 6000);
    assert.equal(claw.scaleChange, false);
    const machine = machines.find((candidate) => candidate.id === claw.machineId);
    assert.equal(claw.zIndex, machine.zIndex + 1);
    assert.equal(claw.placement.width, claw.clipRect.width);
    assert.equal(claw.placement.height, claw.clipRect.height);
    assert.deepEqual(claw.glassClipPolygon, [
      { x: 0, y: 0 },
      { x: claw.placement.width, y: 0 },
      { x: claw.placement.width, y: claw.placement.height },
      { x: 0, y: claw.placement.height },
    ]);
  }

  assert.ok(star);
  assert.equal(star.frameCount, 24);
  assert.equal(star.framesPerSecond, 8);
  assert.equal(star.durationMs, 3000);
  assert.equal(star.scaleChange, false);
  assert.equal("rotationTurns" in star, false);
});

test("runtime reuses three cabinet colorways and two claw sheets without frame duplication", async () => {
  const expected = [
    ["runtime/FRETIVA_GACHA_ARCADE_MAP_BASE_EMPTY_BAYS_RUNTIME.png", 768, 1664],
    ["runtime/machine_cabinet_left_runtime.png", 384, 576],
    ["runtime/machine_cabinet_right_runtime.png", 384, 576],
    ["runtime/machine_cabinet_lavender_left_runtime.png", 384, 576],
    ["runtime/machine_cabinet_lavender_right_runtime.png", 384, 576],
    ["runtime/machine_cabinet_mint_left_runtime.png", 384, 576],
    ["runtime/machine_cabinet_mint_right_runtime.png", 384, 576],
    ["runtime/machine_plinth_runtime.png", 640, 240],
    ["runtime/claw_left_mid_wire_sheet_6x4.png", 1800, 1120],
    ["runtime/claw_right_upper_wire_sheet_6x4.png", 1740, 1000],
    ["runtime/star_mobile_horizontal_sheet_6x4.png", 2760, 1456],
  ];
  for (const [file, width, height] of expected) {
    const png = await readFile(new URL(file, assetRoot));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", file);
    assert.equal(png.readUInt32BE(16), width, file);
    assert.equal(png.readUInt32BE(20), height, file);
    assert.equal(png[24], 8, `${file} bit depth`);
    assert.equal(png[25], 6, `${file} RGBA color type`);
  }

  const master = await readFile(new URL("FRETIVA_GACHA_ARCADE_MAP_BASE_EMPTY_BAYS.png", assetRoot));
  assert.equal(master.readUInt32BE(16), 1536);
  assert.equal(master.readUInt32BE(20), 3328);
  const preview = await readFile(new URL("preview/FRETIVA_GACHA_ARCADE_V3_LAYOUT_PREVIEW.png", assetRoot));
  assert.equal(preview.readUInt32BE(16), 768);
  assert.equal(preview.readUInt32BE(20), 1664);

  const runtimeSources = getShooterMapAssetSources(GACHA_ARCADE_MAP_SKIN);
  assert.equal(runtimeSources.length, 11);
  assert.equal(runtimeSources.some((source) => source.includes("/frames/")), false);
  assert.equal(runtimeSources.some((source) => source.includes("COMPOSITE")), false);
  assert.equal(new Set(runtimeSources).size, runtimeSources.length);
  assert.equal(GACHA_ARCADE_MAP_SKIN.previewImage, GACHA_ARCADE_MAP_SKIN.background.src);
  assert.equal(
    GACHA_ARCADE_MAP_SKIN.pickerPreviewImage,
    "/assets/maps/gacha-arcade/preview/FRETIVA_GACHA_ARCADE_V3_LAYOUT_PREVIEW.png",
  );
  assert.deepEqual(GACHA_ARCADE_MAP_SKIN.layout, []);
  assert.deepEqual(GACHA_ARCADE_MAP_SKIN.layers, []);
});

test("renderer keeps cabinets static and drives all claws from one visibility-aware 10Hz loop", async () => {
  const [renderer, field, styles, sharedClock, app] = await Promise.all([
    readFile(new URL("../src/shooter/maps/MapSkinRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/GachaArcadeField.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/map-skins.css", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/sharedSpriteClock.js", import.meta.url), "utf8"),
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(renderer, /stage === "underlay" && skin\.id === "gacha-arcade"/);
  assert.match(field, /staticObjects\.map\(\(object\)/);
  assert.match(field, /subscribeSharedMapAnimation\(field/);
  assert.match(field, /runtimeAnimation\.clockFramesPerSecond/);
  assert.doesNotMatch(field, /useState/);
  assert.doesNotMatch(field, /transform.*scale|scale\(/i);
  assert.match(field, /clipPath: getGlassClipPath\(sprite\)/);
  assert.match(field, /elapsedMs \+ \(sprite\.phaseOffsetMs \?\? 0\)/);
  assert.doesNotMatch(field, /perspective\(|rotate[XYZ]?\(/);
  assert.match(styles, /\.shooterMapGachaArcadeObject[\s\S]*?background-size: contain/);
  assert.match(styles, /\.shooterMapGachaArcadeField[\s\S]*?overflow: hidden/);
  assert.match(styles, /\.shooterMapGachaArcadeSprite[\s\S]*?overflow: hidden/);
  assert.match(sharedClock, /document\.visibilityState !== "hidden"/);
  assert.match(sharedClock, /subscriptions\.delete\(element\)/);
  assert.match(app, /const DEFAULT_SHOOTER_MAP_ID = "gacha-arcade"/);
  assert.match(app, /return DEFAULT_SHOOTER_MAP_ID;/);
});
