import manifest from "../../../public/assets/shooter/instruments/fretiva_pink_instrument_skin_pack_v1/skin_manifest.json" with { type: "json" };
export const FRETIVA_PINK_INSTRUMENT_SKIN_PACK_V1_ID = manifest.pack_id;
// Measure the solid silhouette for collisions; the original PNG stays untouched.
const BOUNDS = {
  "acoustic_candy_imp_v1": {
    "visibleWidth": 633,
    "visibleHeight": 1490,
    "visibleTop": 12
  },
  "acoustic_pink_peony_v1": {
    "visibleWidth": 632,
    "visibleHeight": 1504,
    "visibleTop": 7
  },
  "acoustic_rose_quartz_v1": {
    "visibleWidth": 619,
    "visibleHeight": 1487,
    "visibleTop": 15
  },
  "electric_pink_orbit_v1": {
    "visibleWidth": 547,
    "visibleHeight": 1501,
    "visibleTop": 14
  },
  "bass_velvet_bloom_v1": {
    "visibleWidth": 487,
    "visibleHeight": 1485,
    "visibleTop": 16
  }
};
export const FRETIVA_PINK_INSTRUMENT_SKIN_PACK_V1 = Object.freeze(manifest.items.map((item) => {
 const bounds = BOUNDS[item.id];
 return Object.freeze({
  id: item.id, category: item.category, title: item.display_title, file: item.path,
  sortOrder: item.sort_order, stringCount: item.string_count, tunerCount: item.tuner_count,
  tunerLayout: item.tuner_layout, bridge: item.bridge,
  pack: {acoustic: "Acoustic", electric: "Electric", bass: "Bass"}[item.category],
  assetSrc: `/assets/shooter/instruments/${manifest.pack_id}/${item.path}`,
  instrumentSkinPack: manifest.pack_id,
  description: `${item.display_title} 원본 투명 PNG 악기 스킨`,
  canvasWidth: manifest.image_contract.width, canvasHeight: manifest.image_contract.height,
  ...bounds, collisionAspectRatio: bounds.visibleWidth / bounds.visibleHeight,
  muzzleHeightScale: (manifest.image_contract.height - bounds.visibleTop) / manifest.image_contract.height,
 });
}));
export const FRETIVA_PINK_INSTRUMENT_SKIN_PACK_V1_IDS = Object.freeze(FRETIVA_PINK_INSTRUMENT_SKIN_PACK_V1.map((skin) => skin.id));
