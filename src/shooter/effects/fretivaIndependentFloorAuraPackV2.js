const PACK_ASSET_ROOT = "/assets/effects/fretiva_independent_floor_aura_pack_v2";

const AURA_SHEET = Object.freeze({
  width: 1536,
  height: 1024,
  frameWidth: 384,
  frameHeight: 512,
  columns: 4,
  rows: 2,
  frameCount: 8,
  direction: "forward",
});

// Measured from the supplied RGBA artwork at alpha > 4. Aura anchors use the
// union of all eight frame-local bounds so animation never changes placement.
const FLOOR_CONTENT_ANCHORS = Object.freeze({
  floor_frost_spirit_v2: Object.freeze({ centerX: 0.500326, bottomY: 0.800781 }),
  floor_tempest_amp_v2: Object.freeze({ centerX: 0.500326, bottomY: 0.773438 }),
  floor_sakura_echo_v2: Object.freeze({ centerX: 0.500326, bottomY: 0.791992 }),
  floor_dune_mirage_v2: Object.freeze({ centerX: 0.498698, bottomY: 0.705078 }),
  floor_ink_phantom_v2: Object.freeze({ centerX: 0.498698, bottomY: 0.761719 }),
  floor_prism_chorus_v2: Object.freeze({ centerX: 0.5, bottomY: 0.748047 }),
  floor_clockwork_rhythm_v2: Object.freeze({ centerX: 0.500326, bottomY: 0.817383 }),
  floor_tidal_pearl_v2: Object.freeze({ centerX: 0.5, bottomY: 0.799805 }),
  floor_neon_wave_v2: Object.freeze({ centerX: 0.499674, bottomY: 0.753906 }),
  floor_autumn_wind_v2: Object.freeze({ centerX: 0.499674, bottomY: 0.783203 }),
});

const AURA_CONTENT_ANCHORS = Object.freeze({
  aura_frost_spirit_v2: Object.freeze({ centerX: 0.5, bottomY: 1 }),
  aura_tempest_amp_v2: Object.freeze({ centerX: 0.510417, bottomY: 0.927734 }),
  aura_sakura_echo_v2: Object.freeze({ centerX: 0.498698, bottomY: 0.960938 }),
  aura_dune_mirage_v2: Object.freeze({ centerX: 0.5, bottomY: 1 }),
  aura_ink_phantom_v2: Object.freeze({ centerX: 0.497396, bottomY: 0.984375 }),
  aura_prism_chorus_v2: Object.freeze({ centerX: 0.507812, bottomY: 0.966797 }),
  aura_clockwork_rhythm_v2: Object.freeze({ centerX: 0.502604, bottomY: 0.962891 }),
  aura_tidal_pearl_v2: Object.freeze({ centerX: 0.5, bottomY: 0.964844 }),
  aura_neon_wave_v2: Object.freeze({ centerX: 0.502604, bottomY: 0.962891 }),
  aura_autumn_wind_v2: Object.freeze({ centerX: 0.486979, bottomY: 0.96875 }),
});

const ITEMS = [
  [1, "FROST SPIRIT", "floor_frost_spirit_v2", "aura_frost_spirit_v2", 120, 1, 0.9, 0.82],
  [2, "TEMPEST AMP", "floor_tempest_amp_v2", "aura_tempest_amp_v2", 85, 1, 0.9, 0.78],
  [3, "SAKURA ECHO", "floor_sakura_echo_v2", "aura_sakura_echo_v2", 130, 1, 0.9, 0.8],
  [4, "DUNE MIRAGE", "floor_dune_mirage_v2", "aura_dune_mirage_v2", 115, 1, 0.88, 0.76],
  [5, "INK PHANTOM", "floor_ink_phantom_v2", "aura_ink_phantom_v2", 135, 1, 0.88, 0.76],
  [6, "PRISM CHORUS", "floor_prism_chorus_v2", "aura_prism_chorus_v2", 95, 1, 0.9, 0.78],
  [7, "CLOCKWORK RHYTHM", "floor_clockwork_rhythm_v2", "aura_clockwork_rhythm_v2", 110, 1, 0.88, 0.76],
  [8, "TIDAL PEARL", "floor_tidal_pearl_v2", "aura_tidal_pearl_v2", 120, 1, 0.9, 0.8],
  [9, "NEON WAVE", "floor_neon_wave_v2", "aura_neon_wave_v2", 85, 1, 0.9, 0.74],
  [10, "AUTUMN WIND", "floor_autumn_wind_v2", "aura_autumn_wind_v2", 130, 1, 0.9, 0.78],
].map(([
  sortOrder,
  displayTitle,
  floorId,
  auraId,
  frameDurationMs,
  floorScale,
  auraScale,
  auraOpacity,
]) => Object.freeze({
  sortOrder,
  pairLabel: displayTitle,
  floor: Object.freeze({
    sortOrder,
    id: floorId,
    displayTitle,
    selectionCategory: "floor",
    asset: `${PACK_ASSET_ROOT}/floors/${displayTitle}_FLOOR.png`,
    width: 1536,
    height: 1024,
    static: true,
    defaultScale: floorScale,
    contentAnchor: FLOOR_CONTENT_ANCHORS[floorId],
  }),
  aura: Object.freeze({
    sortOrder,
    id: auraId,
    displayTitle,
    selectionCategory: "aura",
    asset: `${PACK_ASSET_ROOT}/auras/sheets/${displayTitle}_AURA_8F.png`,
    frameDurationMs,
    defaultScale: auraScale,
    defaultOpacity: auraOpacity,
    contentAnchor: AURA_CONTENT_ANCHORS[auraId],
    spriteSheet: AURA_SHEET,
  }),
}));

export const FRETIVA_INDEPENDENT_FLOOR_AURA_PACK_V2 = Object.freeze({
  id: "fretiva_independent_floor_aura_pack_v2",
  version: "2.0.0",
  automaticPairSelection: false,
  items: Object.freeze(ITEMS),
});

export const FRETIVA_INDEPENDENT_FLOOR_V2_ITEMS = Object.freeze(
  ITEMS.map((item) => item.floor),
);

export const FRETIVA_INDEPENDENT_AURA_V2_ITEMS = Object.freeze(
  ITEMS.map((item) => item.aura),
);
