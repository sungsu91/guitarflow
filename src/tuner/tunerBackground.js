export const TUNER_BACKGROUND_SWIPE_EDGE_PX = 52;
export const TUNER_BACKGROUND_SWIPE_DISTANCE_PX = 56;
export const TUNER_BACKGROUND_CENTER_SWIPE_DISTANCE_PX = 72;

export function getTunerBackgroundSwipeOffset({ edge = "center", deltaX = 0, deltaY = 0 } = {}) {
  const horizontalDistance = Math.abs(Number(deltaX) || 0);
  const verticalDistance = Math.abs(Number(deltaY) || 0);
  const minimumDistance = edge === "center"
    ? TUNER_BACKGROUND_CENTER_SWIPE_DISTANCE_PX
    : TUNER_BACKGROUND_SWIPE_DISTANCE_PX;

  if (horizontalDistance < minimumDistance || horizontalDistance <= verticalDistance * 1.25) return 0;
  if (edge === "left") return deltaX > 0 ? -1 : 0;
  if (edge === "right") return deltaX < 0 ? 1 : 0;
  return deltaX < 0 ? 1 : -1;
}
