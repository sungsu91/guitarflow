export const FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1_ID = "fretiva_pomeranian_instrument_pack_v1";

const ASSET_ROOT = "/assets/shooter/instruments/fretiva_pomeranian_instrument_pack_v1";
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 1536;

const SKIN_MANIFEST = [
  {
    sortOrder: 1,
    id: "acoustic_pom_cream_v1",
    category: "acoustic",
    title: "POM CREAM ACOUSTIC",
    file: "acoustic/POM CREAM ACOUSTIC.png",
    pack: "Acoustic",
    stringCount: 6,
    tunerCount: 6,
    tunerLayout: "3_left_3_right",
    visibleTop: 8,
    visibleWidth: 659,
    visibleHeight: 1488,
  },
  {
    sortOrder: 1,
    id: "electric_pom_blush_v1",
    category: "electric",
    title: "POM BLUSH ELECTRIC",
    file: "electric/POM BLUSH ELECTRIC.png",
    pack: "Electric",
    stringCount: 6,
    tunerCount: 6,
    tunerLayout: "3_left_3_right",
    visibleTop: 8,
    visibleWidth: 605,
    visibleHeight: 1502,
  },
  {
    sortOrder: 1,
    id: "bass_pom_cocoa_v1",
    category: "bass",
    title: "POM COCOA BASS",
    file: "bass/POM COCOA BASS.png",
    pack: "Bass",
    stringCount: 4,
    tunerCount: 4,
    tunerLayout: "2_left_2_right",
    visibleTop: 11,
    visibleWidth: 565,
    visibleHeight: 1506,
  },
];

export const FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1 = Object.freeze(
  SKIN_MANIFEST.map((skin) => Object.freeze({
    ...skin,
    assetSrc: `${ASSET_ROOT}/${skin.file}`,
    canvasHeight: CANVAS_HEIGHT,
    canvasWidth: CANVAS_WIDTH,
    collisionAspectRatio: skin.visibleWidth / skin.visibleHeight,
    description: `${skin.title} 크림 포메 컬렉션 투명 PNG 악기 스킨`,
    instrumentSkinPack: FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1_ID,
    muzzleHeightScale: (CANVAS_HEIGHT - skin.visibleTop) / CANVAS_HEIGHT,
  })),
);

export const FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1_IDS = Object.freeze(
  FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1.map((skin) => skin.id),
);
