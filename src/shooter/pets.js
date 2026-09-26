import ko from "../i18n/locales/ko.js";
import manifest from "./pets.manifest.json" with { type: "json" };

const PACK_ROOT = "/assets/pets/fretiva_pet_sprite_pack_v1/";
export const SHOOTER_SPRITE_PETS = Object.freeze(manifest.pets.map((pet) => Object.freeze({
  id: pet.id,
  label: pet.nameKo,
  description: "명중과 콤보에 반응하는 3가지 동작",
  renderer: "atlas",
  sheetSrc: `${PACK_ROOT}${pet.atlas}`,
  thumbnailSrc: `${PACK_ROOT}${pet.thumbnail}`,
  geometry: Object.freeze({ ...manifest.spriteSheet, anchor: Object.freeze({ ...manifest.spriteSheet.anchor }) }),
  actions: Object.freeze(Object.fromEntries(Object.entries(pet.actions).map(([name, action]) => [name, Object.freeze({ ...action })]))),
})));
export const SHOOTER_PET_SKIN_IDS = Object.freeze({
  NONE: "none",
  CREAM_POMERANIAN: "cream-pomeranian",
  SILVER_BARLEY_CAT: "silver-barley-cat",
});

export const SHOOTER_PET_SKINS = Object.freeze([
  Object.freeze({
    id: SHOOTER_PET_SKIN_IDS.NONE,
    label: ko["shooter.noPet"],
    description: ko["shooter.hideThePetBesideTheGuitar"],
    sheetSrc: "",
    columns: 1,
    frameCount: 1,
    framesPerSecond: 0,
  }),
  Object.freeze({
    id: SHOOTER_PET_SKIN_IDS.CREAM_POMERANIAN,
    label: ko["shooter.creamPomeranian"],
    description: ko["shooter.aCreamPomeranianThatTiltsItsHeadLiesDownAndSitsUp"],
    sheetSrc: "/assets/pets/pomeranian/pomeranian-pet-actions-sheet-36x1.png",
    masterSrc: "/assets/pets/pomeranian/pomeranian-pet-actions-master-6x4.png",
    columns: 36,
    frameCount: 36,
    framesPerSecond: 3,
  }),
  Object.freeze({
    id: SHOOTER_PET_SKIN_IDS.SILVER_BARLEY_CAT,
    label: ko["shooter.silverCat"],
    description: ko["shooter.aSilverWhiteCatThatPlaysWithGrassKneadsLicksItsPaws"],
    sheetSrc: "/assets/pets/silver-barley-cat/silver-barley-cat-actions-sheet-120x1.png",
    masterSrc: "/assets/pets/silver-barley-cat/silver-barley-cat-actions-master-6x4.png",
    columns: 120,
    frameCount: 120,
    framesPerSecond: 6,
  }),
  ...SHOOTER_SPRITE_PETS,
]);

export const DEFAULT_SHOOTER_PET_SKIN_ID = SHOOTER_PET_SKIN_IDS.CREAM_POMERANIAN;

export function getShooterPetSkinById(skinId) {
  return SHOOTER_PET_SKINS.find((skin) => skin.id === skinId)
    ?? SHOOTER_PET_SKINS.find((skin) => skin.id === DEFAULT_SHOOTER_PET_SKIN_ID)
    ?? SHOOTER_PET_SKINS[0];
}
