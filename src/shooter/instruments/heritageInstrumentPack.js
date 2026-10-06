import manifest from "./heritageInstrumentPack.manifest.json" with { type: "json" };

export const HERITAGE_INSTRUMENT_PACK_ID = "fl-custom-heritage-v1";
export const HERITAGE_INSTRUMENT_PACK = Object.freeze(manifest.map((skin) => Object.freeze({
  ...skin,
  pack: { acoustic: "Acoustic", electric: "Electric", bass: "Bass" }[skin.category],
  assetSrc: `/assets/shooter/instruments/${HERITAGE_INSTRUMENT_PACK_ID}/${skin.id}.png`,
  instrumentSkinPack: HERITAGE_INSTRUMENT_PACK_ID,
  collisionAspectRatio: skin.visibleWidth / skin.visibleHeight,
  muzzleHeightScale: (skin.canvasHeight - skin.visibleTop) / skin.canvasHeight,
})));
export const HERITAGE_INSTRUMENT_PACK_IDS = Object.freeze(HERITAGE_INSTRUMENT_PACK.map((skin) => skin.id));
