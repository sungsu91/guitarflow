// Four 4/4 bars of sixteenths: 64 slots, with room for chord/technique
// symbols (60px per slot) and 256px for clefs, meters and bar edges.
export const MOBILE_SCORE_MAX_WIDTH = 4 * 16 * 60 + 256;

export function mobileScoreWidth(viewportWidth, engravedWidth, zoom = 1, focus = false) {
  const viewport = Number.isFinite(viewportWidth) ? Math.max(0, viewportWidth) : 0;
  const engraving = Number.isFinite(engravedWidth) ? Math.max(0, engravedWidth) : viewport;
  const scale = Number.isFinite(zoom) ? Math.max(.8, Math.min(1.5, zoom)) : 1;
  return Math.min(MOBILE_SCORE_MAX_WIDTH, focus ? viewport * scale : Math.max(viewport, engraving * scale));
}
