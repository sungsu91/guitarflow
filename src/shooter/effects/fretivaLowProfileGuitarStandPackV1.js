const PACK_ASSET_ROOT = "/assets/effects/fretiva_low_profile_guitar_stand_pack_v1";

export const FRETIVA_LOW_PROFILE_STAND_VARIANT = "fixed-low-profile-stand";

// Alpha-bound centers are measured from the supplied sRGBA PNGs at alpha > 4.
// They keep the visible stand—not merely its transparent canvas—on bottom-center.
const STAND_ROWS = [
  [1, "floor_studio_halo_v1", "STUDIO HALO", 0.500326, 0.966797],
  [2, "floor_rosette_deck_v1", "ROSETTE DECK", 0.499349, 0.949219],
  [3, "floor_footlight_club_v1", "FOOTLIGHT CLUB", 0.5, 0.943359],
  [4, "floor_analog_session_v1", "ANALOG SESSION", 0.500326, 0.930664],
  [5, "floor_chrome_soundcheck_v1", "CHROME SOUNDCHECK", 0.499349, 0.964844],
  [6, "floor_jazz_velvet_v1", "JAZZ VELVET", 0.5, 0.946289],
  [7, "floor_vinyl_groove_v1", "VINYL GROOVE", 0.5, 0.952148],
  [8, "floor_pearl_acoustic_v1", "PEARL ACOUSTIC", 0.500326, 0.938477],
  [9, "floor_roadcase_stage_v1", "ROADCASE STAGE", 0.497721, 0.939453],
  [10, "floor_brass_resonance_v1", "BRASS RESONANCE", 0.499674, 0.970703],
];

export const FRETIVA_LOW_PROFILE_GUITAR_STAND_V1_ITEMS = Object.freeze(
  STAND_ROWS.map(([sortOrder, id, displayTitle, centerX, bottomY]) => Object.freeze({
    sortOrder,
    id,
    displayTitle,
    selectionCategory: "floor",
    subtype: "stand",
    asset: `${PACK_ASSET_ROOT}/stands/${displayTitle}.png`,
    width: 1536,
    height: 1024,
    static: true,
    defaultScale: 1,
    contentAnchor: Object.freeze({ centerX, bottomY }),
  })),
);

export const FRETIVA_LOW_PROFILE_GUITAR_STAND_PACK_V1 = Object.freeze({
  id: "fretiva_low_profile_guitar_stand_pack_v1",
  version: "1.0.0",
  assetType: "static_floor_stand",
  automaticAuraSelection: false,
  requiresCollisionOrMountingLogic: false,
  items: FRETIVA_LOW_PROFILE_GUITAR_STAND_V1_ITEMS,
});
