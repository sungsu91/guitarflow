const root = `${import.meta.env?.BASE_URL ?? '/'}assets/`;

// One motion catalog; each UI chooses the composition made for its viewport.
export const MOONLIT_ROOFTOP_MOTION = Object.freeze({
  mobile: Object.freeze({
    videoSrc: `${root}maps/moonlit-rooftop/moonlit-rooftop-motion-v2.mp4`,
    posterSrc: `${root}maps/moonlit-rooftop/moonlit-rooftop-motion-v2.jpg`,
    position: '50% 0%',
  }),
  desktop: Object.freeze({
    videoSrc: `${root}shooter/desktop-maps/01-moonlit-rooftop-motion-v1.mp4`,
    posterSrc: `${root}shooter/desktop-maps/01-moonlit-rooftop-motion-v1.jpg`,
    position: 'center',
  }),
});

export const UNDERWATER_BLUE_MOTION = Object.freeze({
  mobile: Object.freeze({
    videoSrc: `${root}maps/underwater-blue/underwater-blue-motion-v4.mp4`,
    posterSrc: `${root}maps/underwater-blue/underwater-blue-motion-v4.jpg`,
    position: '50% 0%',
  }),
  desktop: Object.freeze({
    videoSrc: `${root}shooter/desktop-maps/06-underwater-blue-motion-v4.mp4`,
    posterSrc: `${root}shooter/desktop-maps/06-underwater-blue-motion-v4.jpg`,
    position: 'center',
  }),
});

export const AURORA_GLACIER_MOTION = Object.freeze({
  mobile: Object.freeze({
    videoSrc: `${root}maps/aurora-glacier/aurora-glacier-motion-v2.mp4`,
    posterSrc: `${root}maps/aurora-glacier/aurora-glacier-motion-v2.jpg`,
    position: '50% 0%',
  }),
  desktop: Object.freeze({
    videoSrc: `${root}shooter/desktop-maps/03-aurora-lake-motion-v2.mp4`,
    posterSrc: `${root}shooter/desktop-maps/03-aurora-lake-motion-v2.jpg`,
    position: 'center',
  }),
});

export const ABOVE_THE_CLOUDS_MOTION = Object.freeze({
  mobile: Object.freeze({
    videoSrc: `${root}maps/above-the-clouds/above-the-clouds-motion-v2.mp4`,
    posterSrc: `${root}maps/above-the-clouds/above-the-clouds-motion-v2.jpg`,
    position: '50% 0%',
  }),
  desktop: Object.freeze({
    videoSrc: `${root}shooter/desktop-maps/02-cloud-sanctuary-motion-v3.mp4`,
    posterSrc: `${root}shooter/desktop-maps/02-cloud-sanctuary-motion-v3.jpg`,
    position: 'center',
  }),
});

export const MILKY_WAY_DESERT_MOTION = Object.freeze({
  mobile: Object.freeze({
    videoSrc: `${root}maps/milky-way-desert/milky-way-desert-motion-v2.mp4`,
    posterSrc: `${root}maps/milky-way-desert/milky-way-desert-motion-v2.jpg`,
    position: '50% 0%',
  }),
  desktop: Object.freeze({
    videoSrc: `${root}shooter/desktop-maps/05-desert-observatory-motion-v2.mp4`,
    posterSrc: `${root}shooter/desktop-maps/05-desert-observatory-motion-v2.jpg`,
    position: 'center',
  }),
});

export const FIREFLY_FOREST_MOTION = Object.freeze({
  mobile: Object.freeze({
    videoSrc: `${root}maps/firefly-forest/firefly-forest-motion-v1.mp4`,
    posterSrc: `${root}maps/firefly-forest/firefly-forest-motion-v1.jpg`,
    position: '50% 0%',
  }),
  desktop: Object.freeze({
    videoSrc: `${root}shooter/desktop-maps/07-firefly-forest-motion-v1.mp4`,
    posterSrc: `${root}shooter/desktop-maps/07-firefly-forest-motion-v1.jpg`,
    position: 'center',
  }),
});

export const SCENIC_MAP_MOTION = Object.freeze({
  'underwater-blue': UNDERWATER_BLUE_MOTION,
  'aurora-glacier': AURORA_GLACIER_MOTION,
  'above-the-clouds': ABOVE_THE_CLOUDS_MOTION,
  'milky-way-desert': MILKY_WAY_DESERT_MOTION,
  'firefly-forest': FIREFLY_FOREST_MOTION,
});

export const DESKTOP_MAP_MOTION = Object.freeze({
  '01-moonlit-rooftop': MOONLIT_ROOFTOP_MOTION.desktop,
  '06-underwater-blue': UNDERWATER_BLUE_MOTION.desktop,
  '03-aurora-lake': AURORA_GLACIER_MOTION.desktop,
  '02-cloud-sanctuary': ABOVE_THE_CLOUDS_MOTION.desktop,
  '05-desert-observatory': MILKY_WAY_DESERT_MOTION.desktop,
  '07-firefly-forest': FIREFLY_FOREST_MOTION.desktop,
});
