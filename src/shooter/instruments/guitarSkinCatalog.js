import { FRETIVA_INSTRUMENT_SKIN_PACK_V1 } from "./fretivaInstrumentSkinPackV1.js";
import { FRETIVA_GUITAR_ADDON_V2 } from "./fretivaGuitarAddonV2.js";
import { FRETIVA_CREATIVE_INSTRUMENT_PACK_V3 } from "./fretivaCreativeInstrumentPackV3.js";
import { FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2 } from "./fretivaArtisanInstrumentSkinPackV2.js";
import pinkManifest from "./fretivaPinkInstrumentSkinPackV1.manifest.json" with { type: "json" };
import { FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1 } from "./fretivaPomeranianInstrumentPackV1.js";
import { HERITAGE_INSTRUMENT_PACK } from "./heritageInstrumentPack.js";
import { STAGE_INSTRUMENT_PACK } from "./stageInstrumentPack.js";

const legacy = {
  acoustic: ["acoustic-real-trace", "jp-d-black", "jp-c-mahogany", "jp-c-green", "jp-d-bloom", "jp-d-phoenix", "jp-d-celestial"],
  electric: ["jp-sunburst-classic", "jp-e-black-gold", "jp-e-natural-wood", "jp-jazz", "jp-resonator", "jp-phoenix"],
  bass: ["jp-sunburst-gold-bass", "jp-aqua-blue", "jp-b-red"],
};
export const GUITAR_SKIN_CATALOG = Object.freeze([
  ...Object.entries(legacy).flatMap(([category, ids]) => ids.map((id) => ({ id, category }))),
  ...FRETIVA_INSTRUMENT_SKIN_PACK_V1, ...FRETIVA_GUITAR_ADDON_V2,
  ...FRETIVA_CREATIVE_INSTRUMENT_PACK_V3, ...FRETIVA_ARTISAN_INSTRUMENT_SKIN_PACK_V2,
  ...pinkManifest.items, ...FRETIVA_POMERANIAN_INSTRUMENT_PACK_V1,
  ...HERITAGE_INSTRUMENT_PACK, ...STAGE_INSTRUMENT_PACK,
]);

// Keep one playable instrument in each category, including when requests race.
export function deleteGuitarSkinFromCatalog(deletedIds, id, catalog = GUITAR_SKIN_CATALOG) {
  const target = catalog.find((skin) => skin.id === id);
  if (!target) throw new Error("Unknown guitar skin");
  const deleted = new Set(deletedIds);
  if (deleted.has(id)) return [...deleted];
  if (!catalog.some((skin) => skin.category === target.category && skin.id !== id && !deleted.has(skin.id))) {
    throw new Error("Keep at least one guitar in each category");
  }
  deleted.add(id);
  return [...deleted];
}
