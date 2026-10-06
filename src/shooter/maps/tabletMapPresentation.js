import { MOONLIT_ROOFTOP_MOTION, SCENIC_MAP_MOTION } from '../mapMotionAssets.js';

export const TABLET_DEFAULT_SHOOTER_MAP_ID = 'moonlit-rooftop';
export const TABLET_MAP_DEFAULT_STORAGE_KEY = 'rifflabTabletMapDefaultV1';

// Only these scenes have an authored wide composition, with the sky/water
// surface above and a continuous floor below. A tall phone image may have
// enough pixels, but covering a tablet with it cuts off those landmarks.
const TABLET_MAP_MOTION = Object.freeze({
  'moonlit-rooftop': MOONLIT_ROOFTOP_MOTION.desktop,
  ...Object.fromEntries(Object.entries(SCENIC_MAP_MOTION).map(([id, motion]) => [id, motion.desktop])),
});

export function hasTabletMapComposition(map) {
  return !!TABLET_MAP_MOTION[map?.id]
    || !!map?.tabletPresentation?.posterSrc
    || map?.renderer === 'pseudo3d'
    || map?.renderer === 'perspective3d';
}

export function resolveShooterMapForLayout(map, { isTabletLayout = false } = {}) {
  const motion = isTabletLayout && (map?.tabletPresentation ?? TABLET_MAP_MOTION[map?.id]);
  if (!motion) return map;
  return {
    ...map,
    portraitOnly: false,
    tabletComposition: 'landscape',
    previewImage: motion.posterSrc,
    pickerPreviewImage: motion.posterSrc,
    referenceViewport: motion.referenceViewport ?? { width: 1920, height: 1080 },
    background: {
      ...map.background,
      src: motion.posterSrc,
      fallbackSrc: undefined,
      videoSrc: motion.videoSrc,
      position: motion.position,
    },
  };
}
