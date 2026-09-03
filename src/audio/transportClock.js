export const AUDIO_TRANSPORT_START_LEAD_SECONDS = 0.06;
export const AUDIO_TRANSPORT_LOOKAHEAD_SECONDS = 0.18;
export const AUDIO_TRANSPORT_SCHEDULER_INTERVAL_MS = 25;

const EPSILON_SECONDS = 1e-9;

const finiteNonNegative = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
};

export function getAudioTransportStepSeconds(bpm, stepsPerBeat = 1) {
  const safeBpm = Math.max(1, Number(bpm) || 1);
  const safeStepsPerBeat = Math.max(1, Math.round(Number(stepsPerBeat) || 1));
  return 60 / safeBpm / safeStepsPerBeat;
}

export function createAudioTransportCursor({
  originTime = 0,
  positionSeconds = 0,
  stepSeconds,
} = {}) {
  const safeOriginTime = finiteNonNegative(originTime);
  const safePositionSeconds = finiteNonNegative(positionSeconds);
  const safeStepSeconds = Math.max(EPSILON_SECONDS, Number(stepSeconds) || 0);
  const stepIndex = Math.max(
    0,
    Math.ceil((safePositionSeconds / safeStepSeconds) - EPSILON_SECONDS),
  );
  return {
    nextStepIndex: stepIndex,
    nextStepTime: safeOriginTime + stepIndex * safeStepSeconds,
    originTime: safeOriginTime,
    stepSeconds: safeStepSeconds,
  };
}

export function collectAudioTransportSteps(cursor, {
  currentTime = 0,
  horizonSeconds = AUDIO_TRANSPORT_LOOKAHEAD_SECONDS,
  stopBeforeTime = Number.POSITIVE_INFINITY,
} = {}) {
  const now = finiteNonNegative(currentTime);
  const horizon = now + finiteNonNegative(horizonSeconds, AUDIO_TRANSPORT_LOOKAHEAD_SECONDS);
  const boundary = Number.isFinite(stopBeforeTime)
    ? finiteNonNegative(stopBeforeTime)
    : Number.POSITIVE_INFINITY;
  const scheduleUntil = Math.min(horizon, boundary);
  const next = { ...cursor };
  const steps = [];

  if (!Number.isFinite(next.nextStepTime) || !Number.isFinite(next.stepSeconds) || next.stepSeconds <= 0) {
    return { cursor: next, steps };
  }

  while (next.nextStepTime < now - EPSILON_SECONDS) {
    next.nextStepIndex += 1;
    next.nextStepTime = next.originTime + next.nextStepIndex * next.stepSeconds;
  }

  while (next.nextStepTime < scheduleUntil - EPSILON_SECONDS) {
    steps.push({ index: next.nextStepIndex, time: next.nextStepTime });
    next.nextStepIndex += 1;
    // Always derive from the immutable origin. Repeated floating-point addition
    // would otherwise accumulate error during long arrangements.
    next.nextStepTime = next.originTime + next.nextStepIndex * next.stepSeconds;
  }

  return { cursor: next, steps };
}

export function getAudioTransportElapsedSeconds({
  audioTime = 0,
  originTime = 0,
  durationSeconds = Number.POSITIVE_INFINITY,
  loop = false,
} = {}) {
  const elapsed = Math.max(0, finiteNonNegative(audioTime) - finiteNonNegative(originTime));
  const duration = Number(durationSeconds);
  if (!Number.isFinite(duration) || duration <= 0) return elapsed;
  if (loop) return elapsed % duration;
  return Math.min(duration, elapsed);
}
