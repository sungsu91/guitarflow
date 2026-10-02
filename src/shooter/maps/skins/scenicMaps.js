import ko from "../../../i18n/locales/ko.js";
import { SCENIC_MAP_MOTION } from '../../mapMotionAssets.js';
// Original artwork with approved motion compositions, independent of gameplay.
const definitions = [
  {
    "id": "underwater-blue",
    "nameKo": ko["shooter.blueOcean"],
    "nameEn": "Underwater Blue"
  },
  {
    "id": "aurora-glacier",
    "nameKo": ko["shooter.auroraGlacier"],
    "nameEn": "Aurora Glacier"
  },
  {
    "id": "above-the-clouds",
    "nameKo": ko["shooter.aboveTheClouds"],
    "nameEn": "Above the Clouds"
  },
  {
    "id": "milky-way-desert",
    "nameKo": ko["shooter.milkyWayDesert"],
    "nameEn": "Milky Way Desert"
  },
  {
    "id": "firefly-forest",
    "nameKo": ko["shooter.fireflyForest"],
    "nameEn": "Firefly Forest"
  }
];

export const SCENIC_MAP_SKINS = Object.freeze(definitions.map(({ id, nameKo, nameEn }) => {
  const src = `/assets/maps/${id}/background.png`;
  const motion = SCENIC_MAP_MOTION[id]?.mobile;
  const poster = motion?.posterSrc ?? src;
  return Object.freeze({
    id, kind: 'layered', label: nameKo, nameKo, nameEn,
    ...(motion ? { renderer: 'ambient-video' } : {}),
    description: nameKo + ko["shooter.sceneryForNeonNotePractice"],
    mobileOnly: false, portraitOnly: true,
    previewImage: poster, pickerPreviewImage: poster,
    referenceViewport: Object.freeze({ width: 853, height: 1844, deviceWidth: 390, deviceHeight: 844 }),
    background: Object.freeze({ id: id + '-background', src: poster, fit: 'cover', position: motion?.position ?? '50% 0%', locked: true,
      ...(motion ? { fallbackSrc: src, videoSrc: motion.videoSrc } : {}),
      ...(id === 'above-the-clouds' ? { tint: 'rgba(8, 20, 58, 0.12)' } : {}),
    }),
    assetCatalog: Object.freeze([]), ambientEvents: Object.freeze([]),
    layout: Object.freeze([]), layers: Object.freeze([]),
  });
}));
