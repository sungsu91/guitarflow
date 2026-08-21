import { centsBetween, getTunerGaugePosition } from "./tunerMath.js";

export const TUNER_SWIMMER_SPRITE_COLUMNS = 10;
export const TUNER_SWIMMER_SPRITE_ROWS = 6;

// The supplied sheet contains pose variations facing several directions rather
// than one continuous directional animation. Keep only the first-row,
// upward-facing poses and play them back-and-forth so pitch movement never
// makes the swimmer appear to turn around.
const UPWARD_SWIM_FRAME_INDICES = Object.freeze([0, 1, 2, 3, 4, 3, 2, 1]);
const CALM_FRAME_INDICES = Object.freeze([0, 1, 2, 1]);

function clampNumber(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getTunerSwimmerTarget({
  cents,
  completed = false,
  frequency,
  hasSignal,
  previousFrequency,
}) {
  if (!hasSignal || !Number.isFinite(cents) || !Number.isFinite(frequency)) {
    return {
      frequencyDeltaCents: 0,
      intensity: 0,
      settled: true,
      waiting: true,
      x: 50,
      y: 52,
    };
  }

  const hasPreviousFrequency = Number.isFinite(previousFrequency) && previousFrequency > 0;
  const frequencyDeltaCents = hasPreviousFrequency
    ? clampNumber(centsBetween(frequency, previousFrequency), -32, 32)
    : 0;
  const centered = Math.abs(cents) <= 3;
  const stableInput = hasPreviousFrequency && Math.abs(frequencyDeltaCents) < 0.5;
  const horizontalPosition = 50 + getTunerGaugePosition(cents) * 42;
  const verticalTravel = clampNumber(frequencyDeltaCents / 28, -1, 1) * 6;
  const pitchActivity = clampNumber(Math.abs(frequencyDeltaCents) / 28, 0, 1);
  const distanceActivity = clampNumber(Math.abs(cents) / 300, 0, 1);

  return {
    frequencyDeltaCents,
    intensity: centered
      ? (completed ? 0.02 : 0.06)
      : stableInput
        ? 0.08
        : clampNumber(0.12 + pitchActivity * 0.76 + distanceActivity * 0.12, 0.12, 1),
    settled: centered || stableInput,
    waiting: false,
    x: clampNumber(horizontalPosition, 8, 92),
    y: centered ? 50 : clampNumber(50 - verticalTravel, 44, 56),
  };
}

export function getTunerSwimmerFrame(step, { settled = false, waiting = false } = {}) {
  const safeStep = Math.max(0, Math.floor(Number.isFinite(step) ? step : 0));
  const frameSequence = settled || waiting ? CALM_FRAME_INDICES : UPWARD_SWIM_FRAME_INDICES;
  const frameIndex = frameSequence[safeStep % frameSequence.length];

  return {
    column: frameIndex % TUNER_SWIMMER_SPRITE_COLUMNS,
    row: Math.floor(frameIndex / TUNER_SWIMMER_SPRITE_COLUMNS),
  };
}
