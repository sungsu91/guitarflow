export const FRETIVA_CREATIVE_INSTRUMENT_PACK_V3_ID = "fretiva_creative_instrument_pack_v3";

const ASSET_ROOT = "/assets/shooter/instruments/fretiva_creative_instrument_pack_v3";
const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 768;
const VISIBLE_TOP = 32;
const VISIBLE_HEIGHT = 704;

const SKIN_MANIFEST = [
  { id: "acoustic_harbor_mist", title: "HARBOR MIST", file: "acoustic/HARBOR MIST.png", category: "acoustic", pack: "Acoustic", visibleWidth: 267 },
  { id: "acoustic_gilded_willow", title: "GILDED WILLOW", file: "acoustic/GILDED WILLOW.png", category: "acoustic", pack: "Acoustic", visibleWidth: 264 },
  { id: "acoustic_desert_mirage", title: "DESERT MIRAGE", file: "acoustic/DESERT MIRAGE.png", category: "acoustic", pack: "Acoustic", visibleWidth: 289 },
  { id: "acoustic_raven_copper", title: "RAVEN COPPER", file: "acoustic/RAVEN COPPER.png", category: "acoustic", pack: "Acoustic", visibleWidth: 278 },
  { id: "acoustic_tidewood_parlor", title: "TIDEWOOD PARLOR", file: "acoustic/TIDEWOOD PARLOR.png", category: "acoustic", pack: "Acoustic", visibleWidth: 307 },
  { id: "electric_solar_rift", title: "SOLAR RIFT", file: "electric/SOLAR RIFT.png", category: "electric", pack: "Electric", visibleWidth: 244 },
  { id: "electric_quantum_bloom", title: "QUANTUM BLOOM", file: "electric/QUANTUM BLOOM.png", category: "electric", pack: "Electric", visibleWidth: 238 },
  { id: "electric_void_mariner", title: "VOID MARINER", file: "electric/VOID MARINER.png", category: "electric", pack: "Electric", visibleWidth: 230 },
  { id: "electric_clockwork_wasp", title: "CLOCKWORK WASP", file: "electric/CLOCKWORK WASP.png", category: "electric", pack: "Electric", visibleWidth: 233 },
  { id: "electric_prism_fang", title: "PRISM FANG", file: "electric/PRISM FANG.png", category: "electric", pack: "Electric", visibleWidth: 235 },
  { id: "bass_manta_current", title: "MANTA CURRENT", file: "bass/MANTA CURRENT.png", category: "bass", pack: "Bass", visibleWidth: 215 },
  { id: "bass_brass_vine", title: "BRASS VINE", file: "bass/BRASS VINE.png", category: "bass", pack: "Bass", visibleWidth: 206 },
  { id: "bass_sunset_circuit", title: "SUNSET CIRCUIT", file: "bass/SUNSET CIRCUIT.png", category: "bass", pack: "Bass", visibleWidth: 206 },
  { id: "bass_aurora_fretless", title: "AURORA FRETLESS", file: "bass/AURORA FRETLESS.png", category: "bass", pack: "Bass", visibleWidth: 223 },
  { id: "bass_orbital_ash", title: "ORBITAL ASH", file: "bass/ORBITAL ASH.png", category: "bass", pack: "Bass", visibleWidth: 239 },
];

export const FRETIVA_CREATIVE_INSTRUMENT_PACK_V3 = Object.freeze(
  SKIN_MANIFEST.map((skin) => Object.freeze({
    ...skin,
    assetSrc: `${ASSET_ROOT}/${skin.file}`,
    canvasHeight: CANVAS_HEIGHT,
    canvasWidth: CANVAS_WIDTH,
    collisionAspectRatio: skin.visibleWidth / VISIBLE_HEIGHT,
    description: `${skin.title} 원본 투명 PNG 악기 스킨`,
    instrumentSkinPack: FRETIVA_CREATIVE_INSTRUMENT_PACK_V3_ID,
    muzzleHeightScale: (CANVAS_HEIGHT - VISIBLE_TOP) / CANVAS_HEIGHT,
    visibleHeight: VISIBLE_HEIGHT,
  })),
);

export const FRETIVA_CREATIVE_INSTRUMENT_PACK_V3_IDS = Object.freeze(
  FRETIVA_CREATIVE_INSTRUMENT_PACK_V3.map((skin) => skin.id),
);
