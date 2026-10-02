import ko from '../../../i18n/locales/ko.js';

const root = `${import.meta.env?.BASE_URL ?? '/'}assets/maps/storm-cloister/`;
const poster = `${root}storm-cloister-poster.jpg`;

// AI-designed scenery with authored rain, lightning and ripples in an 8-second loop.
export const STORM_CLOISTER_MAP_SKIN = Object.freeze({
  id: 'storm-cloister', kind: 'layered', renderer: 'ambient-video',
  label: ko['shooter.stormCloister'],
  nameKo: ko['shooter.stormCloister'], nameEn: 'Storm Cloister',
  description: ko['shooter.stormCloisterDescription'],
  mobileOnly: true, portraitOnly: true,
  previewImage: poster, pickerPreviewImage: poster,
  referenceViewport: Object.freeze({ width: 900, height: 1600, deviceWidth: 390, deviceHeight: 844 }),
  background: Object.freeze({
    id: 'storm-cloister-background', src: poster,
    videoSrc: `${root}storm-cloister-loop.mp4`,
    fit: 'cover', position: '50% 50%', locked: true,
  }),
  assetCatalog: Object.freeze([]), ambientEvents: Object.freeze([]),
  layout: Object.freeze([]), layers: Object.freeze([]),
});
