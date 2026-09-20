// Original user-supplied artwork. Static backgrounds do not alter gameplay.
const definitions = [
  {
    "id": "underwater-blue",
    "nameKo": "푸른 바닷속",
    "nameEn": "Underwater Blue"
  },
  {
    "id": "aurora-glacier",
    "nameKo": "오로라 빙하",
    "nameEn": "Aurora Glacier"
  },
  {
    "id": "above-the-clouds",
    "nameKo": "구름 위",
    "nameEn": "Above the Clouds"
  },
  {
    "id": "milky-way-desert",
    "nameKo": "은하수 사막",
    "nameEn": "Milky Way Desert"
  },
  {
    "id": "firefly-forest",
    "nameKo": "반딧불 숲",
    "nameEn": "Firefly Forest"
  }
];

export const SCENIC_MAP_SKINS = Object.freeze(definitions.map(({ id, nameKo, nameEn }) => {
  const src = `/assets/maps/${id}/background.png`;
  return Object.freeze({
    id, kind: 'layered', label: nameKo, nameKo, nameEn,
    description: nameKo + ' 풍경에서 즐기는 네온 음표 연습',
    mobileOnly: false, portraitOnly: true,
    previewImage: src, pickerPreviewImage: src,
    referenceViewport: Object.freeze({ width: 853, height: 1844, deviceWidth: 390, deviceHeight: 844 }),
    background: Object.freeze({ id: id + '-background', src, fit: 'cover', position: '50% 0%', locked: true,
      ...(id === 'above-the-clouds' ? { tint: 'rgba(8, 20, 58, 0.12)' } : {}),
    }),
    assetCatalog: Object.freeze([]), ambientEvents: Object.freeze([]),
    layout: Object.freeze([]), layers: Object.freeze([]),
  });
}));
