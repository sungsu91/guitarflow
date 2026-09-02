export const FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2_ID = "fretiva_artisan_instrument_skin_pack_v2";

const ASSET_ROOT = "/assets/shooter/instruments/fretiva_artisan_instrument_skin_pack_v2";
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 1536;

const SKIN_MANIFEST = [
  { sortOrder: 1, id: "acoustic_willow_crest_v2", category: "acoustic", title: "WILLOW CREST", file: "acoustic/WILLOW CREST.png", pack: "Acoustic", stringCount: 6, tunerCount: 6, tunerLayout: "3_left_3_right", visibleTop: 4, visibleWidth: 596, visibleHeight: 1524 },
  { sortOrder: 2, id: "acoustic_rosewater_v2", category: "acoustic", title: "ROSEWATER", file: "acoustic/ROSEWATER.png", pack: "Acoustic", stringCount: 6, tunerCount: 6, tunerLayout: "3_left_3_right", visibleTop: 9, visibleWidth: 589, visibleHeight: 1515 },
  { sortOrder: 3, id: "acoustic_blue_heron_v2", category: "acoustic", title: "BLUE HERON", file: "acoustic/BLUE HERON.png", pack: "Acoustic", stringCount: 6, tunerCount: 6, tunerLayout: "3_left_3_right", visibleTop: 3, visibleWidth: 624, visibleHeight: 1532 },
  { sortOrder: 4, id: "acoustic_sunlace_v2", category: "acoustic", title: "SUNLACE", file: "acoustic/SUNLACE.png", pack: "Acoustic", stringCount: 6, tunerCount: 6, tunerLayout: "3_left_3_right", visibleTop: 12, visibleWidth: 617, visibleHeight: 1507 },
  { sortOrder: 5, id: "acoustic_ivory_tide_v2", category: "acoustic", title: "IVORY TIDE", file: "acoustic/IVORY TIDE.png", pack: "Acoustic", stringCount: 6, tunerCount: 6, tunerLayout: "3_left_3_right", visibleTop: 10, visibleWidth: 603, visibleHeight: 1512 },
  { sortOrder: 1, id: "electric_night_orchid_v2", category: "electric", title: "NIGHT ORCHID", file: "electric/NIGHT ORCHID.png", pack: "Electric", stringCount: 6, tunerCount: 6, tunerLayout: "3_left_3_right", visibleTop: 13, visibleWidth: 523, visibleHeight: 1502 },
  { sortOrder: 2, id: "electric_copper_swan_v2", category: "electric", title: "COPPER SWAN", file: "electric/COPPER SWAN.png", pack: "Electric", stringCount: 6, tunerCount: 6, tunerLayout: "3_left_3_right", visibleTop: 9, visibleWidth: 523, visibleHeight: 1505 },
  { sortOrder: 3, id: "electric_verdant_signal_v2", category: "electric", title: "VERDANT SIGNAL", file: "electric/VERDANT SIGNAL.png", pack: "Electric", stringCount: 6, tunerCount: 6, tunerLayout: "3_left_3_right", visibleTop: 15, visibleWidth: 522, visibleHeight: 1510 },
  { sortOrder: 4, id: "electric_cherry_static_v2", category: "electric", title: "CHERRY STATIC", file: "electric/CHERRY STATIC.png", pack: "Electric", stringCount: 6, tunerCount: 6, tunerLayout: "3_left_3_right", visibleTop: 4, visibleWidth: 534, visibleHeight: 1516 },
  { sortOrder: 5, id: "electric_silver_comet_v2", category: "electric", title: "SILVER COMET", file: "electric/SILVER COMET.png", pack: "Electric", stringCount: 6, tunerCount: 6, tunerLayout: "3_left_3_right", visibleTop: 10, visibleWidth: 508, visibleHeight: 1508 },
  { sortOrder: 1, id: "bass_deep_lotus_v2", category: "bass", title: "DEEP LOTUS", file: "bass/DEEP LOTUS.png", pack: "Bass", stringCount: 4, tunerCount: 4, tunerLayout: "2_left_2_right", visibleTop: 11, visibleWidth: 505, visibleHeight: 1504 },
  { sortOrder: 2, id: "bass_amber_current_v2", category: "bass", title: "AMBER CURRENT", file: "bass/AMBER CURRENT.png", pack: "Bass", stringCount: 4, tunerCount: 4, tunerLayout: "2_left_2_right", visibleTop: 10, visibleWidth: 524, visibleHeight: 1515 },
  { sortOrder: 3, id: "bass_violet_fin_v2", category: "bass", title: "VIOLET FIN", file: "bass/VIOLET FIN.png", pack: "Bass", stringCount: 4, tunerCount: 4, tunerLayout: "2_left_2_right", visibleTop: 5, visibleWidth: 492, visibleHeight: 1524 },
  { sortOrder: 4, id: "bass_pearl_circuit_v2", category: "bass", title: "PEARL CIRCUIT", file: "bass/PEARL CIRCUIT.png", pack: "Bass", stringCount: 4, tunerCount: 4, tunerLayout: "2_left_2_right", visibleTop: 9, visibleWidth: 488, visibleHeight: 1512 },
  { sortOrder: 5, id: "bass_moss_echo_v2", category: "bass", title: "MOSS ECHO", file: "bass/MOSS ECHO.png", pack: "Bass", stringCount: 4, tunerCount: 4, tunerLayout: "2_left_2_right", visibleTop: 0, visibleWidth: 512, visibleHeight: 1536 },
];

export const FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2 = Object.freeze(
  SKIN_MANIFEST.map((skin) => Object.freeze({
    ...skin,
    assetSrc: `${ASSET_ROOT}/${skin.file}`,
    canvasHeight: CANVAS_HEIGHT,
    canvasWidth: CANVAS_WIDTH,
    collisionAspectRatio: skin.visibleWidth / skin.visibleHeight,
    description: `${skin.title} 원본 투명 PNG 악기 스킨`,
    instrumentSkinPack: FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2_ID,
    muzzleHeightScale: (CANVAS_HEIGHT - skin.visibleTop) / CANVAS_HEIGHT,
  })),
);

export const FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2_IDS = Object.freeze(
  FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2.map((skin) => skin.id),
);
