export const SHOOTER_PET_SKIN_IDS = Object.freeze({
  NONE: "none",
  CREAM_POMERANIAN: "cream-pomeranian",
  SILVER_BARLEY_CAT: "silver-barley-cat",
});

export const SHOOTER_PET_SKINS = Object.freeze([
  Object.freeze({
    id: SHOOTER_PET_SKIN_IDS.NONE,
    label: "펫 없음",
    description: "기타 옆 펫을 표시하지 않습니다.",
    sheetSrc: "",
    columns: 1,
    frameCount: 1,
    framesPerSecond: 0,
  }),
  Object.freeze({
    id: SHOOTER_PET_SKIN_IDS.CREAM_POMERANIAN,
    label: "크림 포메",
    description: "갸우뚱하고 엎드리고 충성 자세를 하는 크림 포메라니안",
    sheetSrc: "/assets/pets/pomeranian/pomeranian-pet-actions-sheet-36x1.png",
    masterSrc: "/assets/pets/pomeranian/pomeranian-pet-actions-master-6x4.png",
    columns: 36,
    frameCount: 36,
    framesPerSecond: 3,
  }),
  Object.freeze({
    id: SHOOTER_PET_SKIN_IDS.SILVER_BARLEY_CAT,
    label: "실버 고양이",
    description: "보리풀 놀이와 꾹꾹이, 앞발 핥기와 세수를 하는 은백색 고양이",
    sheetSrc: "/assets/pets/silver-barley-cat/silver-barley-cat-actions-sheet-120x1.png",
    masterSrc: "/assets/pets/silver-barley-cat/silver-barley-cat-actions-master-6x4.png",
    columns: 120,
    frameCount: 120,
    framesPerSecond: 8,
  }),
]);

export const DEFAULT_SHOOTER_PET_SKIN_ID = SHOOTER_PET_SKIN_IDS.CREAM_POMERANIAN;

export function getShooterPetSkinById(skinId) {
  return SHOOTER_PET_SKINS.find((skin) => skin.id === skinId)
    ?? SHOOTER_PET_SKINS.find((skin) => skin.id === DEFAULT_SHOOTER_PET_SKIN_ID)
    ?? SHOOTER_PET_SKINS[0];
}
