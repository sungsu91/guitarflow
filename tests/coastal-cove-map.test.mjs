import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import test from "node:test";

import {
  LAYERED_SHOOTER_MAP_SKINS,
  getShooterMapAssetSources,
  isEditableShooterMap,
  isLayeredShooterMap,
  resolveLayeredShooterMap,
} from "../src/shooter/maps/registry.js";
import { COASTAL_COVE_MAP_SKIN } from "../src/shooter/maps/skins/coastalCove.js";
import { MAP_EDIT_SKINS, validateMapPlacements } from "../vite.config.js";

function readPngHeader(buffer) {
  return {
    signature: buffer.subarray(0, 8).toString("hex"),
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

function readPngInflatedImageData(buffer) {
  const idatChunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "IDAT") idatChunks.push(buffer.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  return inflateSync(Buffer.concat(idatChunks));
}

test("coastal cove includes the supplied transparent ambient animations as editable objects", async () => {
  assert.equal(isLayeredShooterMap(COASTAL_COVE_MAP_SKIN), true);
  assert.equal(isEditableShooterMap(COASTAL_COVE_MAP_SKIN), true);
  assert.equal(COASTAL_COVE_MAP_SKIN.id, "coastal-cove");
  assert.equal(COASTAL_COVE_MAP_SKIN.label, "COAST");
  assert.equal(COASTAL_COVE_MAP_SKIN.background.fit, "cover");
  assert.equal(COASTAL_COVE_MAP_SKIN.background.position, "center center");
  assert.equal(COASTAL_COVE_MAP_SKIN.background.locked, true);
  assert.equal(
    COASTAL_COVE_MAP_SKIN.background.src,
    "/assets/maps/coastal-cove/coastal-cove-background.png",
  );
  assert.equal(COASTAL_COVE_MAP_SKIN.previewImage, COASTAL_COVE_MAP_SKIN.background.src);
  assert.deepEqual(COASTAL_COVE_MAP_SKIN.referenceViewport, {
    width: 390,
    height: 756,
    deviceWidth: 390,
    deviceHeight: 844,
  });
  assert.equal(COASTAL_COVE_MAP_SKIN.assetCatalog.length, 5);
  assert.ok(COASTAL_COVE_MAP_SKIN.layout.length >= 5);
  assert.deepEqual(COASTAL_COVE_MAP_SKIN.layers, []);
  const hermitCrabAsset = COASTAL_COVE_MAP_SKIN.assetCatalog[0];
  assert.equal(hermitCrabAsset.id, "ambient-hermit-crab");
  assert.equal(hermitCrabAsset.slot, "animated-environment");
  assert.equal(hermitCrabAsset.anchorY, 92);
  assert.equal(hermitCrabAsset.spriteSheet.columns, 1);
  assert.equal(hermitCrabAsset.spriteSheet.rows, 1);
  assert.equal(hermitCrabAsset.spriteSheet.frameCount, 7);
  assert.equal(hermitCrabAsset.spriteSheet.frames.length, 7);
  assert.equal(hermitCrabAsset.spriteSheet.animation, "hermit-crab-roam");
  const sharkAsset = COASTAL_COVE_MAP_SKIN.assetCatalog[1];
  assert.equal(sharkAsset.id, "ambient-shark-fin");
  assert.equal(sharkAsset.slot, "animated-environment");
  assert.equal(sharkAsset.anchorY, 70);
  assert.equal(sharkAsset.spriteSheet.columns, 1);
  assert.equal(sharkAsset.spriteSheet.rows, 1);
  assert.equal(sharkAsset.spriteSheet.frameCount, 10);
  assert.equal(sharkAsset.spriteSheet.frames.length, 10);
  assert.equal(sharkAsset.spriteSheet.animation, "shark-swim");
  const netFisherAsset = COASTAL_COVE_MAP_SKIN.assetCatalog.find(
    (asset) => asset.id === "ambient-net-fisher",
  );
  assert.ok(netFisherAsset);
  assert.equal(netFisherAsset.slot, "animated-environment");
  assert.equal(netFisherAsset.anchorX, 34.375);
  assert.equal(netFisherAsset.spriteSheet.frameCount, 10);
  assert.equal(netFisherAsset.spriteSheet.frames.length, 10);
  assert.deepEqual(netFisherAsset.spriteSheet.frames.map(({ hold }) => hold), [8, 2, 2, 2, 2, 2, 8, 3, 3, 8]);
  assert.equal(netFisherAsset.spriteSheet.animation, "net-fisher-cast");
  const treasureAsset = COASTAL_COVE_MAP_SKIN.assetCatalog.find(
    (asset) => asset.id === "interactive-treasure-chest",
  );
  const mimicAsset = COASTAL_COVE_MAP_SKIN.assetCatalog.find(
    (asset) => asset.id === "interactive-mimic-chest",
  );
  assert.equal(treasureAsset.eventActor.type, "coastal-chest");
  assert.equal(treasureAsset.eventActor.variant, "treasure");
  assert.equal(treasureAsset.maxInstances, 3);
  assert.equal(treasureAsset.eventActor.frames.length, 5);
  assert.equal(treasureAsset.eventActor.spawnPoints.length, 6);
  assert.ok(treasureAsset.eventActor.spawnPoints.every(({ x }) => x <= 0.27 || x >= 0.73));
  assert.equal(mimicAsset.eventActor.type, "coastal-chest");
  assert.equal(mimicAsset.eventActor.variant, "mimic");
  assert.equal(mimicAsset.maxInstances, 2);
  assert.equal(mimicAsset.eventActor.frames.length, 5);
  assert.equal(mimicAsset.eventActor.idleFrames.length, 6);
  assert.equal(mimicAsset.eventActor.hitFrames.length, 4);
  assert.equal(mimicAsset.eventActor.defeatFrames.length, 8);
  assert.equal(mimicAsset.spriteSheet.frameCount, 23);
  assert.equal(mimicAsset.eventActor.readySrc, treasureAsset.eventActor.readySrc);
  assert.equal(
    mimicAsset.eventActor.frames.at(-1),
    mimicAsset.eventActor.idleFrames[0],
    "the completed reveal must hand off to the identical first idle pose",
  );

  const resolved = resolveLayeredShooterMap(COASTAL_COVE_MAP_SKIN);
  assert.equal(resolved.layers.length, COASTAL_COVE_MAP_SKIN.layout.length);
  const resolvedHermitCrab = resolved.layers.find((layer) => layer.assetId === "ambient-hermit-crab");
  const resolvedShark = resolved.layers.find((layer) => layer.assetId === "ambient-shark-fin");
  const resolvedNetFisher = resolved.layers.find((layer) => layer.assetId === "ambient-net-fisher");
  assert.ok(resolvedHermitCrab);
  assert.equal(resolvedHermitCrab.spriteSheet.animation, "hermit-crab-roam");
  assert.ok(resolvedHermitCrab.placement.y > 0.55 && resolvedHermitCrab.placement.y < 0.9);
  assert.ok(resolvedShark);
  assert.equal(resolvedShark.spriteSheet.animation, "shark-swim");
  assert.ok(resolvedShark.placement.y > 0.15 && resolvedShark.placement.y < 0.5);
  assert.ok(resolvedNetFisher);
  assert.equal(resolvedNetFisher.spriteSheet.animation, "net-fisher-cast");
  assert.ok(resolvedNetFisher.placement.y > 0.3 && resolvedNetFisher.placement.y < 0.55);
  const resolvedChests = resolved.layers.filter((layer) => layer.eventActor?.type === "coastal-chest");
  assert.equal(resolvedChests.length, 5);
  assert.equal(resolvedChests.filter((layer) => layer.placement.x < 0.5).length, 3);
  assert.equal(resolvedChests.filter((layer) => layer.placement.x > 0.5).length, 2);
  assert.equal(
    resolved.layers.find((layer) => layer.assetId === "interactive-treasure-chest")?.eventActor.variant,
    "treasure",
  );
  assert.equal(
    resolved.layers.find((layer) => layer.assetId === "interactive-mimic-chest")?.eventActor.variant,
    "mimic",
  );
  assert.deepEqual(getShooterMapAssetSources(COASTAL_COVE_MAP_SKIN), [
    "/assets/maps/coastal-cove/coastal-cove-background.png",
    "/assets/maps/coastal-cove/creatures/hermit-crab/walk/hermit-crab-walk-01.png",
    "/assets/maps/coastal-cove/creatures/hermit-crab/walk/hermit-crab-walk-02.png",
    "/assets/maps/coastal-cove/creatures/hermit-crab/walk/hermit-crab-walk-03.png",
    "/assets/maps/coastal-cove/creatures/hermit-crab/walk/hermit-crab-walk-04.png",
    "/assets/maps/coastal-cove/creatures/hermit-crab/walk/hermit-crab-walk-05.png",
    "/assets/maps/coastal-cove/creatures/hermit-crab/walk/hermit-crab-walk-06.png",
    "/assets/maps/coastal-cove/creatures/hermit-crab/walk/hermit-crab-walk-07.png",
    "/assets/maps/coastal-cove/creatures/shark/swim/shark-swim-01.png",
    "/assets/maps/coastal-cove/creatures/shark/swim/shark-swim-02.png",
    "/assets/maps/coastal-cove/creatures/shark/swim/shark-swim-03.png",
    "/assets/maps/coastal-cove/creatures/shark/swim/shark-swim-04.png",
    "/assets/maps/coastal-cove/creatures/shark/swim/shark-swim-05.png",
    "/assets/maps/coastal-cove/creatures/shark/swim/shark-swim-06.png",
    "/assets/maps/coastal-cove/creatures/shark/swim/shark-swim-07.png",
    "/assets/maps/coastal-cove/creatures/shark/swim/shark-swim-08.png",
    "/assets/maps/coastal-cove/creatures/shark/swim/shark-swim-09.png",
    "/assets/maps/coastal-cove/creatures/shark/swim/shark-swim-10.png",
    ...Array.from(
      { length: 10 },
      (_, index) => `/assets/maps/coastal-cove/creatures/net-fisher/cast/net-fisher-cast-${String(index + 1).padStart(2, "0")}.png`,
    ),
    "/assets/maps/coastal-cove/interactive/chests/treasure/coastal-treasure-01.png",
    "/assets/maps/coastal-cove/interactive/chests/treasure/coastal-treasure-02.png",
    "/assets/maps/coastal-cove/interactive/chests/treasure/coastal-treasure-03.png",
    "/assets/maps/coastal-cove/interactive/chests/treasure/coastal-treasure-04.png",
    "/assets/maps/coastal-cove/interactive/chests/treasure/coastal-treasure-05.png",
    "/assets/maps/coastal-cove/interactive/chests/mimic/coastal-mimic-02.png",
    "/assets/maps/coastal-cove/interactive/chests/mimic/coastal-mimic-03.png",
    "/assets/maps/coastal-cove/interactive/chests/mimic/coastal-mimic-04.png",
    "/assets/maps/coastal-cove/interactive/chests/mimic/coastal-mimic-05.png",
    ...Array.from(
      { length: 6 },
      (_, index) => `/assets/maps/coastal-cove/interactive/chests/mimic-action/idle/mimic-idle-${String(index + 1).padStart(2, "0")}.png`,
    ),
    ...Array.from(
      { length: 4 },
      (_, index) => `/assets/maps/coastal-cove/interactive/chests/mimic-action/hit/mimic-hit-${String(index + 1).padStart(2, "0")}.png`,
    ),
    ...Array.from(
      { length: 8 },
      (_, index) => `/assets/maps/coastal-cove/interactive/chests/mimic-action/die/mimic-die-${String(index + 1).padStart(2, "0")}.png`,
    ),
  ]);
  assert.ok(LAYERED_SHOOTER_MAP_SKINS.includes(COASTAL_COVE_MAP_SKIN));
  assert.deepEqual(
    validateMapPlacements(
      COASTAL_COVE_MAP_SKIN.layout,
      MAP_EDIT_SKINS.get("coastal-cove").assetCatalog,
    ),
    COASTAL_COVE_MAP_SKIN.layout,
  );

  const background = await readFile(new URL(
    `../public${COASTAL_COVE_MAP_SKIN.background.src}`,
    import.meta.url,
  ));
  assert.equal(readPngHeader(background).signature, "89504e470d0a1a0a");

  const [source, archivedRuntimeSheet, rendererSource, mapStyles, ...walkFrames] = await Promise.all([
    readFile(new URL(
      "../assets-source/maps/coastal-cove/hermit-crab-motion-source.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../public/assets/maps/coastal-cove/creatures/hermit-crab/hermit-crab-motion-sheet.png",
      import.meta.url,
    )),
    readFile(new URL("../src/shooter/maps/MapSkinRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/map-skins.css", import.meta.url), "utf8"),
    ...hermitCrabAsset.spriteSheet.frames.map((src) => (
      readFile(new URL(`../public${src}`, import.meta.url))
    )),
  ]);
  const sourceHash = createHash("sha256").update(source).digest("hex");
  assert.equal(sourceHash, "f97f0a6c0a24d7c9af6f20c469a4dec1cdd56c3fa56687d5abfb523ee641b9dd");
  assert.equal(createHash("sha256").update(archivedRuntimeSheet).digest("hex"), sourceHash);
  assert.deepEqual(readPngHeader(archivedRuntimeSheet), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 6,
  });
  assert.equal(walkFrames.length, 7);
  walkFrames.forEach((walkFrame) => {
    assert.deepEqual(readPngHeader(walkFrame), {
      signature: "89504e470d0a1a0a",
      width: 256,
      height: 256,
      colorType: 6,
    });
  });
  assert.match(rendererSource, /isHermitCrabRoam/);
  assert.match(mapStyles, /@keyframes shooterMapHermitCrabFrame/);
  assert.match(mapStyles, /@keyframes shooterMapHermitCrabRoam/);
});

test("coastal cove preserves and cleanly renders the supplied shark swim sheet", async () => {
  const sharkAsset = COASTAL_COVE_MAP_SKIN.assetCatalog.find(
    (asset) => asset.id === "ambient-shark-fin",
  );
  assert.ok(sharkAsset);

  const [source, archivedRuntimeSheet, rendererSource, mapStyles, ...swimFrames] = await Promise.all([
    readFile(new URL(
      "../assets-source/maps/coastal-cove/shark-swim-source.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../public/assets/maps/coastal-cove/creatures/shark/shark-swim-sheet.png",
      import.meta.url,
    )),
    readFile(new URL("../src/shooter/maps/MapSkinRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/map-skins.css", import.meta.url), "utf8"),
    ...sharkAsset.spriteSheet.frames.map((src) => (
      readFile(new URL(`../public${src}`, import.meta.url))
    )),
  ]);

  const sourceHash = createHash("sha256").update(source).digest("hex");
  assert.equal(sourceHash, "8766f87b5f57214b3a82049fdf4751a0f48bfd0ca014b5ff3887959127d31f2e");
  assert.equal(createHash("sha256").update(archivedRuntimeSheet).digest("hex"), sourceHash);
  assert.deepEqual(readPngHeader(archivedRuntimeSheet), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 6,
  });
  assert.equal(swimFrames.length, 10);
  swimFrames.forEach((swimFrame) => {
    assert.deepEqual(readPngHeader(swimFrame), {
      signature: "89504e470d0a1a0a",
      width: 768,
      height: 288,
      colorType: 6,
    });
  });
  assert.match(rendererSource, /isSharkSwim/);
  assert.match(mapStyles, /@keyframes shooterMapSharkFrame/);
  assert.match(mapStyles, /@keyframes shooterMapSharkSwim/);
  assert.match(mapStyles, /translate3d\(-58%, -150%, 0\) scaleX\(-1\)/);
  assert.match(mapStyles, /translate3d\(-40%, 40%, 0\) scaleX\(-1\)/);
  assert.match(mapStyles, /translate3d\(58%, 70%, 0\) scaleX\(-1\)/);
});

test("coastal cove preserves and plays the supplied net fisher sheet", async () => {
  const netFisherAsset = COASTAL_COVE_MAP_SKIN.assetCatalog.find(
    (asset) => asset.id === "ambient-net-fisher",
  );
  assert.ok(netFisherAsset);

  const [source, archivedRuntimeSheet, rendererSource, mapStyles, ...castFrames] = await Promise.all([
    readFile(new URL(
      "../assets-source/maps/coastal-cove/net-fisher-cast-source.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../public/assets/maps/coastal-cove/creatures/net-fisher/net-fisher-cast-sheet.png",
      import.meta.url,
    )),
    readFile(new URL("../src/shooter/maps/MapSkinRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/map-skins.css", import.meta.url), "utf8"),
    ...netFisherAsset.spriteSheet.frames.map(({ src }) => (
      readFile(new URL(`../public${src}`, import.meta.url))
    )),
  ]);

  const sourceHash = createHash("sha256").update(source).digest("hex");
  assert.equal(sourceHash, "ed8ad0ade440406072d7dc34439b217e73442e3596fb152c4e8499c10ca9dc65");
  assert.equal(createHash("sha256").update(archivedRuntimeSheet).digest("hex"), sourceHash);
  assert.deepEqual(readPngHeader(archivedRuntimeSheet), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 6,
  });
  assert.equal(castFrames.length, 10);
  castFrames.forEach((castFrame) => {
    assert.deepEqual(readPngHeader(castFrame), {
      signature: "89504e470d0a1a0a",
      width: 640,
      height: 512,
      colorType: 6,
    });
  });
  assert.match(rendererSource, /isNetFisherCast/);
  assert.match(rendererSource, /shooterMapNetFisherFrame/);
  assert.match(mapStyles, /@keyframes shooterMapNetFisherFrame/);
});

test("coastal cove preserves and aligns the supplied treasure and mimic frames", async () => {
  const frameSources = ["treasure", "mimic"].flatMap((variant) => (
    Array.from(
      { length: 5 },
      (_, index) => `/assets/maps/coastal-cove/interactive/chests/${variant}/coastal-${variant}-${String(index + 1).padStart(2, "0")}.png`,
    )
  ));
  const [source, archivedRuntimeSheet, actorSource, rendererSource, appSource, mapStyles, ...frames] = await Promise.all([
    readFile(new URL(
      "../assets-source/maps/coastal-cove/treasure-mimic-source.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../public/assets/maps/coastal-cove/interactive/chests/treasure-mimic-sheet.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../src/shooter/maps/events/CoastalChestActor.jsx",
      import.meta.url,
    ), "utf8"),
    readFile(new URL("../src/shooter/maps/MapSkinRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/maps/map-skins.css", import.meta.url), "utf8"),
    ...frameSources.map((src) => readFile(new URL(`../public${src}`, import.meta.url))),
  ]);

  const sourceHash = createHash("sha256").update(source).digest("hex");
  assert.equal(sourceHash, "0007476cd51f674c52afa1a28e87c2c52b642d98183acc25d6befc374b4f25cf");
  assert.equal(createHash("sha256").update(archivedRuntimeSheet).digest("hex"), sourceHash);
  assert.deepEqual(readPngHeader(archivedRuntimeSheet), {
    signature: "89504e470d0a1a0a",
    width: 1672,
    height: 941,
    colorType: 6,
  });
  assert.equal(frames.length, 10);
  frames.forEach((frame) => {
    assert.deepEqual(readPngHeader(frame), {
      signature: "89504e470d0a1a0a",
      width: 448,
      height: 448,
      colorType: 6,
    });
  });
  assert.match(actorSource, /COASTAL_MIMIC_HITS_TO_DEFEAT/);
  assert.match(actorSource, /onSound\?\.\("mimic-hit"/);
  assert.match(rendererSource, /onSound=\{onEventSound\}/);
  assert.match(appSource, /type === "mimic-hit"/);
  assert.match(appSource, /onEventSound=\{playShooterSound\}/);
  assert.doesNotMatch(actorSource, /aria-disabled=/);
  assert.match(actorSource, /data-interaction-locked=/);
  assert.match(mapStyles, /data-state="closed"\], \[data-state="preview"\]/);
  assert.match(mapStyles, /transform: scaleX\(-1\)/);
  assert.match(rendererSource, /assignRandomEventActorPlacements/);
  assert.match(mapStyles, /@keyframes shooterMapTreasureRewardBurst/);
  assert.match(actorSource, /shooterMapChestGroundShadow/);
  assert.match(mapStyles, /\.shooterMapChestGroundShadow/);
  assert.match(mapStyles, /data-state="revealing"\]\[data-frame-index="1"\]/);
  assert.match(actorSource, /defeat-advance/);
});

test("coastal cove preserves and plays the supplied mimic action sheet", async () => {
  const mimicAsset = COASTAL_COVE_MAP_SKIN.assetCatalog.find(
    (asset) => asset.id === "interactive-mimic-chest",
  );
  const actionFrames = [
    ...mimicAsset.eventActor.idleFrames,
    ...mimicAsset.eventActor.hitFrames,
    ...mimicAsset.eventActor.defeatFrames,
  ];
  const [source, archivedRuntimeSheet, actorSource, ...frames] = await Promise.all([
    readFile(new URL(
      "../assets-source/maps/coastal-cove/mimic-action-source.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../public/assets/maps/coastal-cove/interactive/chests/mimic-action-sheet.png",
      import.meta.url,
    )),
    readFile(new URL(
      "../src/shooter/maps/events/CoastalChestActor.jsx",
      import.meta.url,
    ), "utf8"),
    ...actionFrames.map((src) => readFile(new URL(`../public${src}`, import.meta.url))),
  ]);

  const sourceHash = createHash("sha256").update(source).digest("hex");
  assert.equal(sourceHash, "433c86b3706b5d128784be592981795e4dc543a7cf8f4883da0007e14087aa55");
  assert.equal(createHash("sha256").update(archivedRuntimeSheet).digest("hex"), sourceHash);
  assert.deepEqual(readPngHeader(archivedRuntimeSheet), {
    signature: "89504e470d0a1a0a",
    width: 1536,
    height: 1024,
    colorType: 6,
  });
  assert.equal(frames.length, 18);
  frames.forEach((frame) => {
    assert.deepEqual(readPngHeader(frame), {
      signature: "89504e470d0a1a0a",
      width: 448,
      height: 448,
      colorType: 6,
    });
  });
  assert.equal(readPngInflatedImageData(frames.at(-1)).every((value) => value === 0), true);
  assert.match(actorSource, /COASTAL_MIMIC_IDLE_FRAME_DURATION_MS/);
  assert.match(actorSource, /COASTAL_MIMIC_HIT_FRAME_DURATION_MS/);
  assert.match(actorSource, /COASTAL_MIMIC_DEFEAT_FRAME_DURATION_MS/);
});
