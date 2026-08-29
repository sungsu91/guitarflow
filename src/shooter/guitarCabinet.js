export const SHOOTER_GUITAR_CABINET_SKIN_IDS = Object.freeze({
  NONE: "none",
  CLIMATE: "climate-cabinet",
});

export const SHOOTER_GUITAR_CABINET_SKINS = Object.freeze([
  Object.freeze({
    id: SHOOTER_GUITAR_CABINET_SKIN_IDS.NONE,
    label: "없음",
    description: "현재 기타만 표시",
    backAssetSrc: "",
    frontAssetSrc: "",
  }),
  Object.freeze({
    id: SHOOTER_GUITAR_CABINET_SKIN_IDS.CLIMATE,
    label: "온습도 캐비닛",
    description: "조명과 전면 유리문이 있는 온습도 보관 캐비닛",
    backAssetSrc: "/assets/shooter/guitar-cabinet/cabinet-back-alpha.png",
    frontAssetSrc: "/assets/shooter/guitar-cabinet/cabinet-glass-front-alpha.png",
  }),
]);

export const DEFAULT_SHOOTER_GUITAR_CABINET_SKIN_ID = SHOOTER_GUITAR_CABINET_SKIN_IDS.NONE;

export function getShooterGuitarCabinetSkinById(skinId) {
  return SHOOTER_GUITAR_CABINET_SKINS.find((skin) => skin.id === skinId)
    ?? SHOOTER_GUITAR_CABINET_SKINS[0];
}

export function getShooterGuitarCabinetAssetSources(skin = SHOOTER_GUITAR_CABINET_SKINS[1]) {
  return [...new Set([
    skin?.backAssetSrc,
    skin?.frontAssetSrc,
  ].filter((src) => typeof src === "string" && src.trim()))];
}
