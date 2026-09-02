export const FRETIVA_GUITAR_ADDON_V2_ID = "fretiva-guitar-addon-v2";

const ASSET_ROOT = "/assets/shooter/instruments/fretiva-guitar-addon-v2";
const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 768;
const VISIBLE_TOP = 32;
const VISIBLE_HEIGHT = 704;

const SKIN_MANIFEST = [
  { id: "moonlit-parlor", title: "MOONLIT PARLOR", file: "acoustic/MOONLIT_PARLOR.png", category: "acoustic", pack: "Acoustic", visibleWidth: 250 },
  { id: "autumn-copper", title: "AUTUMN COPPER", file: "acoustic/AUTUMN_COPPER.png", category: "acoustic", pack: "Acoustic", visibleWidth: 273 },
  { id: "glacier-comet", title: "GLACIER COMET", file: "electric/GLACIER_COMET.png", category: "electric", pack: "Electric", visibleWidth: 233 },
  { id: "neon-serpent", title: "NEON SERPENT", file: "electric/NEON_SERPENT.png", category: "electric", pack: "Electric", visibleWidth: 223 },
];

export const FRETIVA_GUITAR_ADDON_V2 = Object.freeze(
  SKIN_MANIFEST.map((skin) => Object.freeze({
    ...skin,
    assetSrc: `${ASSET_ROOT}/${skin.file}`,
    canvasHeight: CANVAS_HEIGHT,
    canvasWidth: CANVAS_WIDTH,
    collisionAspectRatio: skin.visibleWidth / VISIBLE_HEIGHT,
    description: `${skin.title} 원본 투명 PNG 기타 스킨`,
    instrumentSkinPack: FRETIVA_GUITAR_ADDON_V2_ID,
    muzzleHeightScale: (CANVAS_HEIGHT - VISIBLE_TOP) / CANVAS_HEIGHT,
    visibleHeight: VISIBLE_HEIGHT,
  })),
);

export const FRETIVA_GUITAR_ADDON_V2_IDS = Object.freeze(
  FRETIVA_GUITAR_ADDON_V2.map((skin) => skin.id),
);
