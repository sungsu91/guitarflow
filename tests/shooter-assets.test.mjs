import assert from "node:assert/strict";
import test from "node:test";

import {
  collectShooterEntryImageSources,
  preloadShooterEntryImages,
} from "../src/shooter/assetPreload.js";
import {
  DEFAULT_SHOOTER_GUITAR_CABINET_SKIN_ID,
  SHOOTER_GUITAR_CABINET_SKINS,
  getShooterGuitarCabinetAssetSources,
} from "../src/shooter/guitarCabinet.js";

const entryAssets = {
  cabinetAssetSources: [
    "/guitar-cabinet/back.png",
    "/guitar-cabinet/front.png",
  ],
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
    "/guitar-cabinet/back.png",
    "/guitar-cabinet/front.png",
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

test("guitar cabinet keeps the fixed back and glass layer order", () => {
  const cabinet = SHOOTER_GUITAR_CABINET_SKINS.find(
    (skin) => skin.id !== DEFAULT_SHOOTER_GUITAR_CABINET_SKIN_ID,
  );

  assert.deepEqual(getShooterGuitarCabinetAssetSources(cabinet), [
    "/assets/shooter/guitar-cabinet/cabinet-back-alpha.png",
    "/assets/shooter/guitar-cabinet/cabinet-glass-front-alpha.png",
  ]);
});
