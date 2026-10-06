// Motion is planned per object, in the coordinates of each authored composition.
// The poster is never uploaded to the animation renderer or displaced.
export const SILK_STREAMER_SRC = '/assets/maps/art-atlas-v2/silk-streamer.webp';
export const ART_MAP_SCENE_MOTION = {
  'silk-theatre': {
    desktop: { cloth: [[.14,-.055,.205,.53],[.66,-.105,.205,.56]] },
    mobile: { cloth: [[-.12,-.02,.43,.43],[.72,-.08,.40,.47]] },
    tablet: { cloth: [[.23,-.055,.19,.52],[.59,-.105,.19,.56]] },
  },
  'glass-garden': {
    desktop: { pool: [0,.728,1,.036] },
    mobile: { pool: [0,.737,1,.026] },
    tablet: { pool: [0,.727,1,.036] },
  },
  'gilded-ink': {
    desktop: { moon: [.50,.017,.14,.249] },
    mobile: { moon: [.487,.070,.186,.093] },
    tablet: { moon: [.501,.018,.14,.249] },
  },
};

export function getArtMapSceneMotion(id, presentation) {
  return ART_MAP_SCENE_MOTION[id]?.[presentation] ?? {};
}
