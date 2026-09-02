export const FRETIVA_INSTRUMENT_SKIN_PACK_V1_ID = "fretiva-instrument-skins-v1";

const ASSET_ROOT = "/assets/shooter/instruments/fretiva-instrument-skins-v1";
const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 768;
const VISIBLE_TOP = 32;
const VISIBLE_HEIGHT = 704;

const SKIN_MANIFEST = [
  { id: "cedar-classic", title: "CEDAR CLASSIC", file: "guitars/CEDAR_CLASSIC.png", category: "acoustic", pack: "Acoustic", visibleWidth: 256 },
  { id: "aurora-12", title: "AURORA 12", file: "guitars/AURORA_12.png", category: "acoustic", pack: "Acoustic", visibleWidth: 299 },
  { id: "nova-headless", title: "NOVA HEADLESS", file: "guitars/NOVA_HEADLESS.png", category: "electric", pack: "Electric", visibleWidth: 251 },
  { id: "eclipse-twin", title: "ECLIPSE TWIN", file: "guitars/ECLIPSE_TWIN.png", category: "electric", pack: "Electric", visibleWidth: 298 },
  { id: "obsidian-tide", title: "OBSIDIAN TIDE", file: "guitars/OBSIDIAN_TIDE.png", category: "electric", pack: "Electric", visibleWidth: 221 },
  { id: "midnight-5", title: "MIDNIGHT 5", file: "basses/MIDNIGHT_5.png", category: "bass", pack: "Bass", visibleWidth: 224 },
  { id: "burl-6", title: "BURL 6", file: "basses/BURL_6.png", category: "bass", pack: "Bass", visibleWidth: 216 },
  { id: "tidal-fretless", title: "TIDAL FRETLESS", file: "basses/TIDAL_FRETLESS.png", category: "bass", pack: "Bass", visibleWidth: 207 },
  { id: "frostline", title: "FROSTLINE", file: "basses/FROSTLINE.png", category: "bass", pack: "Bass", visibleWidth: 236 },
  { id: "amber-echo", title: "AMBER ECHO", file: "basses/AMBER_ECHO.png", category: "bass", pack: "Bass", visibleWidth: 201 },
  { id: "coral-pop", title: "CORAL POP", file: "basses/CORAL_POP.png", category: "bass", pack: "Bass", visibleWidth: 241 },
  { id: "violet-thunder", title: "VIOLET THUNDER", file: "basses/VIOLET_THUNDER.png", category: "bass", pack: "Bass", visibleWidth: 190 },
  { id: "celestial-clockwork", title: "CELESTIAL CLOCKWORK", file: "basses/CELESTIAL_CLOCKWORK.png", category: "bass", pack: "Bass", visibleWidth: 203 },
];

export const FRETIVA_INSTRUMENT_SKIN_PACK_V1 = Object.freeze(
  SKIN_MANIFEST.map((skin) => Object.freeze({
    ...skin,
    assetSrc: `${ASSET_ROOT}/${skin.file}`,
    canvasHeight: CANVAS_HEIGHT,
    canvasWidth: CANVAS_WIDTH,
    collisionAspectRatio: skin.visibleWidth / VISIBLE_HEIGHT,
    description: `${skin.title} 원본 투명 PNG 악기 스킨`,
    instrumentSkinPack: FRETIVA_INSTRUMENT_SKIN_PACK_V1_ID,
    muzzleHeightScale: (CANVAS_HEIGHT - VISIBLE_TOP) / CANVAS_HEIGHT,
    visibleHeight: VISIBLE_HEIGHT,
  })),
);

export const FRETIVA_INSTRUMENT_SKIN_IDS = Object.freeze(
  FRETIVA_INSTRUMENT_SKIN_PACK_V1.map((skin) => skin.id),
);
