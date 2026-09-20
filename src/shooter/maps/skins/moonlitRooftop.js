const background = '/assets/maps/moonlit-rooftop/moonlit-rooftop.png';

// User-supplied background; no moving foreground objects or gameplay overrides.
export const MOONLIT_ROOFTOP_MAP_SKIN = Object.freeze({
  id: 'moonlit-rooftop', kind: 'layered', label: '달빛 옥상',
  nameKo: '달빛 옥상', nameEn: 'Moonlit Rooftop',
  description: '별빛과 보름달이 비추는 도시의 옥상',
  mobileOnly: false, portraitOnly: true,
  previewImage: background, pickerPreviewImage: background,
  referenceViewport: Object.freeze({ width: 853, height: 1844, deviceWidth: 390, deviceHeight: 844 }),
  background: Object.freeze({ id: 'moonlit-rooftop-background', src: background, fit: 'cover', position: '50% 0%', locked: true }),
  assetCatalog: Object.freeze([]), ambientEvents: Object.freeze([]),
  layout: Object.freeze([]), layers: Object.freeze([]),
});
