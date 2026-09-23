import ko from "../../../i18n/locales/ko.js";
const background = '/assets/maps/moonlit-rooftop/moonlit-rooftop.png';

// User-supplied background; no moving foreground objects or gameplay overrides.
export const MOONLIT_ROOFTOP_MAP_SKIN = Object.freeze({
  id: 'moonlit-rooftop', kind: 'layered', label: ko["app.moonlitRooftop"],
  nameKo: ko["app.moonlitRooftop"], nameEn: 'Moonlit Rooftop',
  description: ko["shooter.aCityRooftopUnderStarlightAndAFullMoon"],
  mobileOnly: false, portraitOnly: true,
  previewImage: background, pickerPreviewImage: background,
  referenceViewport: Object.freeze({ width: 853, height: 1844, deviceWidth: 390, deviceHeight: 844 }),
  background: Object.freeze({ id: 'moonlit-rooftop-background', src: background, fit: 'cover', position: '50% 0%', locked: true }),
  assetCatalog: Object.freeze([]), ambientEvents: Object.freeze([]),
  layout: Object.freeze([]), layers: Object.freeze([]),
});
