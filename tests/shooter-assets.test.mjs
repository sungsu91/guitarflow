import assert from "node:assert/strict";
import test from "node:test";

import {
  collectShooterEntryImageSources,
  preloadShooterEntryImages,
} from "../src/shooter/assetPreload.js";

const entryAssets = {
  effectLayers: [
    { asset: "/effects/aura.png" },
    { asset: "/effects/floor.png" },
    { asset: "/effects/aura.png" },
  ],
  emblemAssetSrc: "/emblems/lion.png",
  enemyAssetSources: ["/enemies/easy.svg", "/enemies/hard.svg"],
  guitarAssetSrc: "/guitars/player.png",
  guitarProjectileAssetSrc: "",
  mapBackgroundSrc: "/maps/studio.png",
  mapLayerAssetSources: [
    "/maps/river/background.png",
    "/maps/river/reeds.png",
    "/maps/river/background.png",
  ],
  mapPreviewSrc: "/maps/studio.png",
  pickAssetSrc: "/picks/gold.png",
};

test("shooter entry image list includes visible loadout assets once", () => {
  assert.deepEqual(collectShooterEntryImageSources(entryAssets), [
    "/guitars/player.png",
    "/picks/gold.png",
    "/maps/studio.png",
    "/maps/river/background.png",
    "/maps/river/reeds.png",
    "/emblems/lion.png",
    "/effects/aura.png",
    "/effects/floor.png",
    "/enemies/easy.svg",
    "/enemies/hard.svg",
  ]);
});

test("shooter entry waits for every selected image preloader", async () => {
  const loaded = [];
  await preloadShooterEntryImages(entryAssets, async (src) => {
    loaded.push(src);
  });

  assert.deepEqual(loaded, collectShooterEntryImageSources(entryAssets));
});
