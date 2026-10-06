import manifest from "./stageInstrumentPack.manifest.json" with { type: "json" };

export const STAGE_INSTRUMENT_PACK_ID = "fl-stage-fantasy-v1";
export const STAGE_INSTRUMENT_PACK = Object.freeze(manifest.map((skin) => Object.freeze({
  ...skin,
  neckStrings: Object.freeze([...skin.neckStrings]),
  pack: { acoustic: "Acoustic", electric: "Electric", bass: "Bass" }[skin.category],
  assetSrc: `/assets/shooter/instruments/${STAGE_INSTRUMENT_PACK_ID}/${skin.id}.png`,
  instrumentSkinPack: STAGE_INSTRUMENT_PACK_ID,
  collisionAspectRatio: skin.visibleWidth / skin.visibleHeight,
  muzzleHeightScale: (skin.canvasHeight - skin.visibleTop) / skin.canvasHeight,
})));
export const STAGE_INSTRUMENT_PACK_IDS = Object.freeze(STAGE_INSTRUMENT_PACK.map((skin) => skin.id));
