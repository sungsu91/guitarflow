// One collection, three separately authored compositions per scene.
// Platform renderers choose their own artwork without changing gameplay state.
export const ART_MAP_CATALOG = Object.freeze([
  { id: 'glass-garden', nameKo: '유리꽃의 정원', nameEn: 'Glass Blossom Garden', glow: '#bfeafa' },
  { id: 'silk-theatre', nameKo: '비단의 대극장', nameEn: 'The Silk Grand Theatre', glow: '#f1c38d' },
  { id: 'gilded-ink', nameKo: '금빛 수묵산수', nameEn: 'Gilded Ink Mountains', glow: '#ead59b' },
].map(scene => Object.freeze({
  ...scene,
  artwork: Object.freeze(Object.fromEntries(['desktop', 'mobile', 'tablet'].map(platform => [
    platform, `/assets/maps/art-atlas-v1/${scene.id}-${platform}.webp`,
  ]))),
})));

export const ART_MAP_BY_ID = Object.freeze(Object.fromEntries(ART_MAP_CATALOG.map(map => [map.id, map])));

export const ART_MAP_SKINS = Object.freeze(ART_MAP_CATALOG.map(scene => Object.freeze({
  id: scene.id,
  kind: 'layered', renderer: 'art-atlas',
  label: scene.nameKo, nameKo: scene.nameKo, nameEn: scene.nameEn,
  mobileOnly: false, portraitOnly: true,
  previewImage: scene.artwork.mobile, pickerPreviewImage: scene.artwork.mobile,
  referenceViewport: Object.freeze({ width: 1024, height: 2048, deviceWidth: 390, deviceHeight: 780 }),
  background: Object.freeze({ id: `${scene.id}-background`, src: scene.artwork.mobile, fit: 'cover', position: '50% 100%', locked: true }),
  tabletPresentation: Object.freeze({
    posterSrc: scene.artwork.tablet,
    position: '50% 100%',
    referenceViewport: Object.freeze({ width: 2048, height: 1152 }),
  }),
  assetCatalog: Object.freeze([]), ambientEvents: Object.freeze([]),
  layout: Object.freeze([]), layers: Object.freeze([]),
})));
