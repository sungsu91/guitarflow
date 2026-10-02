import ko from "../../../i18n/locales/ko.js";
import { MOONLIT_ROOFTOP_MOTION } from '../../mapMotionAssets.js';
const background = '/assets/maps/moonlit-rooftop/moonlit-rooftop.png';
const motion = MOONLIT_ROOFTOP_MOTION.mobile;
const motionPoster = motion.posterSrc;

// Approved portrait motion: existing artwork with twinkling stars and five meteors.
export const MOONLIT_ROOFTOP_MAP_SKIN = Object.freeze({
  id: 'moonlit-rooftop', kind: 'layered', renderer: 'ambient-video', label: ko["app.moonlitRooftop"],
  nameKo: ko["app.moonlitRooftop"], nameEn: 'Moonlit Rooftop',
  description: ko["shooter.aCityRooftopUnderStarlightAndAFullMoon"],
  mobileOnly: false, portraitOnly: true,
  previewImage: motionPoster, pickerPreviewImage: motionPoster,
  referenceViewport: Object.freeze({ width: 853, height: 1844, deviceWidth: 390, deviceHeight: 844 }),
  background: Object.freeze({
    id: 'moonlit-rooftop-background', src: motionPoster, fallbackSrc: background,
    videoSrc: motion.videoSrc,
    fit: 'cover', position: motion.position, locked: true,
  }),
  assetCatalog: Object.freeze([]), ambientEvents: Object.freeze([]),
  layout: Object.freeze([]), layers: Object.freeze([]),
});
