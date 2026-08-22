export const WHEEL_PICKER_ITEM_HEIGHT = 34;
export const WHEEL_PICKER_DRAG_RATIO = 1.12;
export const WHEEL_PICKER_MAX_VELOCITY_ITEMS_PER_MS = 0.055;
export const WHEEL_PICKER_MIN_INERTIA_VELOCITY = 0.0015;
export const WHEEL_PICKER_INERTIA_TIME_CONSTANT_MS = 210;
export const WHEEL_PICKER_MAX_INERTIA_MS = 900;
export const WHEEL_PICKER_TOUCH_DRAG_RATIO = 1.32;
export const WHEEL_PICKER_TOUCH_MAX_VELOCITY_ITEMS_PER_MS = 0.065;
export const WHEEL_PICKER_TOUCH_MIN_INERTIA_VELOCITY = 0.0011;
export const WHEEL_PICKER_TOUCH_INERTIA_TIME_CONSTANT_MS = 260;
export const WHEEL_PICKER_TOUCH_MAX_INERTIA_MS = 1050;

const WHEEL_PICKER_RELEASE_SAMPLE_MS = 80;
const WHEEL_PICKER_RELEASE_IDLE_MS = 70;
const WHEEL_PICKER_MOUSE_PROFILE = Object.freeze({
  dragRatio: WHEEL_PICKER_DRAG_RATIO,
  inertiaTimeConstantMs: WHEEL_PICKER_INERTIA_TIME_CONSTANT_MS,
  maxInertiaMs: WHEEL_PICKER_MAX_INERTIA_MS,
  maxVelocityItemsPerMs: WHEEL_PICKER_MAX_VELOCITY_ITEMS_PER_MS,
  minInertiaVelocity: WHEEL_PICKER_MIN_INERTIA_VELOCITY,
});
const WHEEL_PICKER_TOUCH_PROFILE = Object.freeze({
  dragRatio: WHEEL_PICKER_TOUCH_DRAG_RATIO,
  inertiaTimeConstantMs: WHEEL_PICKER_TOUCH_INERTIA_TIME_CONSTANT_MS,
  maxInertiaMs: WHEEL_PICKER_TOUCH_MAX_INERTIA_MS,
  maxVelocityItemsPerMs: WHEEL_PICKER_TOUCH_MAX_VELOCITY_ITEMS_PER_MS,
  minInertiaVelocity: WHEEL_PICKER_TOUCH_MIN_INERTIA_VELOCITY,
});

export function getWheelInputProfile(pointerType = "mouse") {
  const usesTouchMotion = pointerType === "touch" || pointerType === "pen";
  return usesTouchMotion ? WHEEL_PICKER_TOUCH_PROFILE : WHEEL_PICKER_MOUSE_PROFILE;
}

export function clampWheelIndex(index, optionCount) {
  const lastIndex = Math.max(0, Number(optionCount) - 1);
  const safeIndex = Number.isFinite(index) ? Math.round(index) : 0;
  return Math.max(0, Math.min(lastIndex, safeIndex));
}

export function clampWheelPosition(position, optionCount) {
  const lastIndex = Math.max(0, Number(optionCount) - 1);
  const safePosition = Number.isFinite(position) ? position : 0;
  return Math.max(0, Math.min(lastIndex, safePosition));
}

export function getWheelSnapIndex(position, direction, optionCount) {
  const safePosition = clampWheelPosition(position, optionCount);
  const safeDirection = Math.sign(Number(direction) || 0);
  if (safeDirection > 0) return clampWheelIndex(Math.ceil(safePosition - 0.000001), optionCount);
  if (safeDirection < 0) return clampWheelIndex(Math.floor(safePosition + 0.000001), optionCount);
  return clampWheelIndex(safePosition, optionCount);
}

export function getWheelDragPosition(startPosition, startY, currentY, optionCount, pointerType = "mouse") {
  const deltaY = Number(currentY) - Number(startY);
  const { dragRatio } = getWheelInputProfile(pointerType);
  return clampWheelPosition(
    Number(startPosition) - ((deltaY * dragRatio) / WHEEL_PICKER_ITEM_HEIGHT),
    optionCount,
  );
}

export function getWheelReleaseVelocity(samples, releasedAt, pointerType = "mouse") {
  const safeSamples = (Array.isArray(samples) ? samples : [])
    .filter((sample) => Number.isFinite(sample?.y) && Number.isFinite(sample?.time));
  const lastSample = safeSamples[safeSamples.length - 1];

  if (!lastSample || Number(releasedAt) - lastSample.time > WHEEL_PICKER_RELEASE_IDLE_MS) return 0;

  const sampleWindowStart = lastSample.time - WHEEL_PICKER_RELEASE_SAMPLE_MS;
  const firstSample = safeSamples.find((sample) => sample.time >= sampleWindowStart) ?? lastSample;
  const elapsedMs = lastSample.time - firstSample.time;
  if (elapsedMs < 8) return 0;

  const pointerVelocity = (lastSample.y - firstSample.y) / elapsedMs;
  const { dragRatio, maxVelocityItemsPerMs } = getWheelInputProfile(pointerType);
  const wheelVelocity = -(pointerVelocity * dragRatio) / WHEEL_PICKER_ITEM_HEIGHT;
  return Math.max(
    -maxVelocityItemsPerMs,
    Math.min(maxVelocityItemsPerMs, wheelVelocity),
  );
}

export function stepWheelInertia(position, velocity, elapsedMs, optionCount, pointerType = "mouse") {
  const frameMs = Math.max(0, Math.min(32, Number(elapsedMs) || 0));
  const { inertiaTimeConstantMs } = getWheelInputProfile(pointerType);
  const nextVelocity = velocity * Math.exp(-frameMs / inertiaTimeConstantMs);
  const unboundedPosition = position + (((velocity + nextVelocity) / 2) * frameMs);
  const nextPosition = clampWheelPosition(unboundedPosition, optionCount);
  const reachedBoundary = Math.abs(nextPosition - unboundedPosition) > 0.000001;

  return {
    position: nextPosition,
    velocity: reachedBoundary ? 0 : nextVelocity,
  };
}

export function shouldContinueWheelInertia(velocity, elapsedMs, pointerType = "mouse") {
  const { maxInertiaMs, minInertiaVelocity } = getWheelInputProfile(pointerType);
  return Math.abs(velocity) >= minInertiaVelocity
    && elapsedMs < maxInertiaMs;
}

export function getWheelSnapDuration(distanceInItems, reduceMotion = false) {
  if (reduceMotion) return 0;
  return Math.min(180, 105 + (Math.abs(distanceInItems) * 120));
}
