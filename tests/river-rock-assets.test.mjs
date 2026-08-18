import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { RIVER_ENVIRONMENT_ASSETS } from "../src/shooter/maps/assets/riverAssets.js";
import riverLayout from "../src/shooter/maps/skins/river-layout.json" with { type: "json" };

function readPngHeader(buffer) {
  return {
    signature: buffer.subarray(0, 8).toString("hex"),
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

test("river rock source is preserved and every extracted cluster is a registered RGBA PNG", async () => {
  const source = await readFile(new URL(
    "../assets-source/maps/river/river-rock-clusters-source.png",
    import.meta.url,
  ));
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "ba2902c5c5a29992908608a97626513a7559b1b2cf265515a9a1866a82ac3e48",
  );
  const rockAssets = RIVER_ENVIRONMENT_ASSETS.filter((asset) => asset.id.startsWith("rock-"));
  const rockPlacements = riverLayout.filter((placement) => placement.assetId.startsWith("rock-"));
  assert.equal(rockAssets.length, 10);
  assert.equal(rockPlacements.length, 10);
  assert.equal(riverLayout.some((placement) => placement.assetId === "watermill"), false);

  for (const asset of rockAssets) {
    const buffer = await readFile(new URL(`../public${asset.src}`, import.meta.url));
    const header = readPngHeader(buffer);
    assert.equal(header.signature, "89504e470d0a1a0a");
    assert.equal(header.colorType, 6);
    assert.ok(header.width > 100);
    assert.ok(header.height > 100);
    assert.ok(rockPlacements.some((placement) => placement.assetId === asset.id));
  }
});

test("lily-pad source is preserved and top-down variants are registered as RGBA objects", async () => {
  const source = await readFile(new URL(
    "../assets-source/maps/river/lily-pad-collection-source.png",
    import.meta.url,
  ));
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "5c271ee7ded0409ee9d57efc084aca8c11c60fa590f21cc108945d0b6ebefef8",
  );
  const lilyAssets = RIVER_ENVIRONMENT_ASSETS.filter((asset) => asset.id.startsWith("lily-pad-"));
  const lilyPlacements = riverLayout.filter((placement) => placement.assetId.startsWith("lily-pad-"));
  assert.equal(lilyAssets.length, 6);
  assert.equal(lilyPlacements.length, 6);

  for (const asset of lilyAssets) {
    const buffer = await readFile(new URL(`../public${asset.src}`, import.meta.url));
    const header = readPngHeader(buffer);
    assert.equal(header.signature, "89504e470d0a1a0a");
    assert.equal(header.colorType, 6);
    assert.ok(header.width > 150);
    assert.ok(header.height > 130);
    assert.ok(lilyPlacements.some((placement) => placement.assetId === asset.id));
  }
});

test("lotus source is preserved and three transparent decorations are registered", async () => {
  const source = await readFile(new URL(
    "../assets-source/maps/river/lotus-flower-collection-source.png",
    import.meta.url,
  ));
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "8ea4eb5a8b164b4a8147c6a10760c9ecb88384b1c01eed6d95e26c828bd5cf34",
  );

  const lotusAssets = RIVER_ENVIRONMENT_ASSETS.filter((asset) => asset.id.startsWith("lotus-flower-"));
  const lotusPlacements = riverLayout.filter((placement) => placement.assetId.startsWith("lotus-flower-"));
  assert.equal(lotusAssets.length, 3);
  assert.equal(lotusPlacements.length, 3);

  for (const asset of lotusAssets) {
    const buffer = await readFile(new URL(`../public${asset.src}`, import.meta.url));
    const header = readPngHeader(buffer);
    assert.equal(header.signature, "89504e470d0a1a0a");
    assert.equal(header.colorType, 6);
    assert.ok(header.width >= 1200);
    assert.ok(header.height >= 1000);
    assert.ok(lotusPlacements.some((placement) => placement.assetId === asset.id));
  }
});

test("stone bridge source is preserved and registered as one transparent centered object", async () => {
  const source = await readFile(new URL(
    "../assets-source/maps/river/stone-bridge-crossing-source.png",
    import.meta.url,
  ));
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "f1bd5618a0a3efaa247bae8dd70493bb272645b65ed75c11989a6b4272d0b852",
  );

  const bridgeAsset = RIVER_ENVIRONMENT_ASSETS.find((asset) => asset.id === "stone-bridge-crossing");
  const bridgePlacement = riverLayout.find((placement) => placement.assetId === "stone-bridge-crossing");
  assert.ok(bridgeAsset);
  assert.ok(bridgePlacement);
  assert.ok(Math.abs(bridgePlacement.x - 0.5) <= 0.08);
  assert.ok(bridgePlacement.y > 0.45 && bridgePlacement.y < 0.55);

  const buffer = await readFile(new URL(`../public${bridgeAsset.src}`, import.meta.url));
  const header = readPngHeader(buffer);
  assert.equal(header.signature, "89504e470d0a1a0a");
  assert.equal(header.colorType, 6);
  assert.equal(header.width, 1672);
  assert.equal(header.height, 941);
});

test("guitar dock source is preserved and registered as one transparent bottom object", async () => {
  const source = await readFile(new URL(
    "../assets-source/maps/river/guitar-dock-platform-source.png",
    import.meta.url,
  ));
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "6ef2bf86adfb4a4d54509aa1df2f953ab90796c1401fb4a33bee68ddad4e1bd8",
  );

  const dockAsset = RIVER_ENVIRONMENT_ASSETS.find((asset) => asset.id === "guitar-dock-platform");
  const dockPlacement = riverLayout.find((placement) => placement.assetId === "guitar-dock-platform");
  assert.ok(dockAsset);
  assert.ok(dockPlacement);
  assert.ok(Math.abs(dockPlacement.x - 0.5) <= (8 / 390));
  assert.ok(dockPlacement.y > 0.8 && dockPlacement.y <= 1);

  const buffer = await readFile(new URL(`../public${dockAsset.src}`, import.meta.url));
  const header = readPngHeader(buffer);
  assert.equal(header.signature, "89504e470d0a1a0a");
  assert.equal(header.colorType, 6);
  assert.equal(header.width, 1905);
  assert.equal(header.height, 826);
});

test("River Garden flattened exports preserve the gameplay aspect ratio at 1x and Retina 3x", async () => {
  const preview = readPngHeader(await readFile(new URL(
    "../public/assets/maps/river/exports/river-garden-full-map.png",
    import.meta.url,
  )));
  const retina = readPngHeader(await readFile(new URL(
    "../public/assets/maps/river/exports/river-garden-full-map@3x.png",
    import.meta.url,
  )));

  assert.deepEqual([preview.width, preview.height], [390, 756]);
  assert.deepEqual([retina.width, retina.height], [1170, 2268]);
  assert.equal(preview.colorType, 2);
  assert.equal(retina.colorType, 2);
});

test("frog source is preserved and six foot-anchored RGBA frames are registered", async () => {
  const source = await readFile(new URL(
    "../assets-source/maps/river/frog-sprite-sheet-source.png",
    import.meta.url,
  ));
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "38525e8e9a28b01412178159d25fc647e572bbee95f28e5a87490d876a278544",
  );

  const frog = RIVER_ENVIRONMENT_ASSETS.find((asset) => asset.id === "ambient-frog");
  assert.ok(frog?.creature);
  assert.equal(Object.keys(frog.creature.frames).length, 6);
  for (const src of Object.values(frog.creature.frames)) {
    const header = readPngHeader(await readFile(new URL(`../public${src}`, import.meta.url)));
    assert.equal(header.colorType, 6);
    assert.equal(header.width, 300);
    assert.equal(header.height, 220);
  }

  const divingFrog = RIVER_ENVIRONMENT_ASSETS.find((asset) => asset.id === "ambient-diving-frog");
  assert.equal(divingFrog?.creature?.type, "diving-frog");
  assert.deepEqual(divingFrog.creature.frames, frog.creature.frames);
});

test("sleeping frog source is preserved and six floor-anchored RGBA poses are registered", async () => {
  const source = await readFile(new URL(
    "../assets-source/maps/river/sleeping-frog-sprite-sheet-source.png",
    import.meta.url,
  ));
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "ab2c599e4c1d5ddea992f11481cd2499df55d79b4199884ad5ddb99b044325b3",
  );

  const sleepingFrog = RIVER_ENVIRONMENT_ASSETS.find((asset) => asset.id === "ambient-sleeping-frog");
  assert.equal(sleepingFrog?.creature?.type, "sleeping-frog");
  assert.deepEqual(
    Object.keys(sleepingFrog.creature.frames),
    ["idle", "nod", "fall", "flat", "flatBreathe", "wakeup"],
  );
  for (const src of Object.values(sleepingFrog.creature.frames)) {
    const header = readPngHeader(await readFile(new URL(`../public${src}`, import.meta.url)));
    assert.equal(header.colorType, 6);
    assert.equal(header.width, 420);
    assert.equal(header.height, 340);
  }
});
