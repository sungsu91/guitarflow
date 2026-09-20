// The compositor moves the marker between audio-clock checkpoints. Do not
// invalidate the timeline's styles on every requestAnimationFrame.
export function syncMiniChordProgressAnimation(previous, element, {
  slotIndex, progress, stepSeconds, originTime,
}) {
  if (!element) {
    previous?.animation.cancel();
    return null;
  }
  const duration = Math.max(1, stepSeconds * 1000);
  const currentTime = Math.max(0, Math.min(1, progress)) * duration;
  if (previous?.element === element && previous.slotIndex === slotIndex
    && previous.duration === duration && previous.originTime === originTime) {
    // Resynchronise after a suspended tab/context or delayed main-thread frame.
    if (Math.abs(Number(previous.animation.currentTime) - currentTime) > 80) {
      previous.animation.currentTime = currentTime;
    }
    return previous;
  }
  previous?.animation.cancel();
  const animation = element.animate(
    [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
    { duration, easing: "linear", fill: "both" },
  );
  animation.currentTime = currentTime;
  return { animation, element, slotIndex, duration, originTime };
}
