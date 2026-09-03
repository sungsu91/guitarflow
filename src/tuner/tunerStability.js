import { centsBetween, getMedian } from "./tunerMath.js";

export const TUNER_ATTACK_GUARD_MS = 80;
export const TUNER_COMPLETION_ENTER_CENTS = 3;
export const TUNER_COMPLETION_EXIT_CENTS = 4.5;
export const TUNER_COMPLETION_HOLD_MS = 320;
export const TUNER_FREQUENCY_HISTORY_SIZE = 5;
export const TUNER_JUMP_CONFIRM_FRAMES = 3;
export const TUNER_MANUAL_DECAY_OUTLIER_CENTS = 250;
export const TUNER_OUTLIER_CENTS = 32;
export const TUNER_NO_SIGNAL_TIMEOUT_MS = 720;

export const TUNER_SIGNAL_PHASES = Object.freeze({
  ACQUIRED: "ACQUIRED",
  DECAYING: "DECAYING",
  LISTENING: "LISTENING",
  NO_SIGNAL: "NO_SIGNAL",
  STABLE: "STABLE",
});

const TUNER_JUMP_CLUSTER_CENTS = 18;
const TUNER_ATTACK_CLUSTER_CENTS = 45;
const TUNER_MANUAL_OCTAVE_RANGE_CENTS = 90;

export function createTunerSignalState() {
  return {
    acquired: false,
    lastValidPitchAt: null,
    lowSignalStartedAt: null,
    phase: TUNER_SIGNAL_PHASES.LISTENING,
  };
}

export function resetTunerSignalState(state) {
  Object.assign(state, createTunerSignalState());
  return state;
}

export function updateTunerSignalState(
  state,
  {
    now,
    pitchPresent,
    releasePresent,
    stable = false,
  },
) {
  if (!Number.isFinite(now)) {
    return { hasSignal: state.acquired, phase: state.phase, shouldClear: false };
  }

  if (pitchPresent) {
    state.acquired = true;
    state.lastValidPitchAt = now;
    state.lowSignalStartedAt = null;
    state.phase = !releasePresent
      ? TUNER_SIGNAL_PHASES.DECAYING
      : stable
        ? TUNER_SIGNAL_PHASES.STABLE
        : TUNER_SIGNAL_PHASES.ACQUIRED;
    return { hasSignal: true, phase: state.phase, shouldClear: false };
  }

  if (!state.acquired) {
    if (state.phase !== TUNER_SIGNAL_PHASES.NO_SIGNAL) state.phase = TUNER_SIGNAL_PHASES.LISTENING;
    return { hasSignal: false, phase: state.phase, shouldClear: false };
  }

  state.phase = TUNER_SIGNAL_PHASES.DECAYING;
  if (releasePresent) {
    state.lowSignalStartedAt = null;
    return { hasSignal: true, phase: state.phase, shouldClear: false };
  }

  state.lowSignalStartedAt ??= now;
  if (now - state.lowSignalStartedAt < TUNER_NO_SIGNAL_TIMEOUT_MS) {
    return { hasSignal: true, phase: state.phase, shouldClear: false };
  }

  state.acquired = false;
  state.lowSignalStartedAt = null;
  state.phase = TUNER_SIGNAL_PHASES.NO_SIGNAL;
  return { hasSignal: false, phase: state.phase, shouldClear: true };
}

function medianFrequency(frequencies) {
  const medianLogFrequency = getMedian(
    frequencies
      .filter((frequency) => Number.isFinite(frequency) && frequency > 0)
      .map(Math.log2),
  );
  return medianLogFrequency == null ? null : 2 ** medianLogFrequency;
}

export function createTunerFrequencyState() {
  return {
    attackFrequencies: [],
    attackStartedAt: null,
    frequency: null,
    history: [],
    pendingFrequencies: [],
  };
}

export function resetTunerFrequencyState(state) {
  Object.assign(state, createTunerFrequencyState());
  return state;
}

export function resolveManualTunerOctave(rawFrequency, targetFrequency) {
  if (
    !Number.isFinite(rawFrequency)
    || rawFrequency <= 0
    || !Number.isFinite(targetFrequency)
    || targetFrequency <= 0
  ) {
    return rawFrequency;
  }

  const rawDistance = Math.abs(centsBetween(rawFrequency, targetFrequency));
  if (rawDistance < 700) return rawFrequency;

  let bestFrequency = rawFrequency;
  let bestDistance = rawDistance;
  for (let octaveShift = -2; octaveShift <= 2; octaveShift += 1) {
    const candidate = rawFrequency * 2 ** octaveShift;
    const distance = Math.abs(centsBetween(candidate, targetFrequency));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestFrequency = candidate;
    }
  }

  return bestDistance <= TUNER_MANUAL_OCTAVE_RANGE_CENTS ? bestFrequency : rawFrequency;
}

export function updateTunerFrequencyState(
  state,
  {
    allowLargeJump = true,
    manualTargetFrequency = null,
    now,
    rawFrequency,
  },
) {
  if (!Number.isFinite(rawFrequency) || rawFrequency <= 0 || !Number.isFinite(now)) {
    return { accepted: false, frequency: state.frequency, stage: "invalid" };
  }

  const candidateFrequency = manualTargetFrequency == null
    ? rawFrequency
    : resolveManualTunerOctave(rawFrequency, manualTargetFrequency);

  if (!Number.isFinite(state.frequency) || state.frequency <= 0) {
    state.attackStartedAt ??= now;
    state.attackFrequencies = [
      ...state.attackFrequencies.slice(-(TUNER_FREQUENCY_HISTORY_SIZE - 1)),
      candidateFrequency,
    ];
    const attackElapsed = now - state.attackStartedAt;
    const attackMedian = medianFrequency(state.attackFrequencies);
    const attackCluster = attackMedian == null
      ? []
      : state.attackFrequencies.filter((frequency) => (
          Math.abs(centsBetween(frequency, attackMedian)) <= TUNER_ATTACK_CLUSTER_CENTS
        ));
    if (attackElapsed < TUNER_ATTACK_GUARD_MS || attackCluster.length < 3) {
      return { accepted: false, frequency: null, stage: "attack" };
    }

    const initialFrequency = medianFrequency(attackCluster) ?? candidateFrequency;
    state.frequency = initialFrequency;
    state.history = [...attackCluster];
    state.pendingFrequencies = [];
    return {
      accepted: true,
      frequency: state.frequency,
      octaveAdjusted: candidateFrequency !== rawFrequency,
      stage: "tracking",
    };
  }

  const jumpCents = Math.abs(centsBetween(candidateFrequency, state.frequency));
  if (
    manualTargetFrequency != null
    && !allowLargeJump
    && jumpCents > TUNER_MANUAL_DECAY_OUTLIER_CENTS
  ) {
    state.pendingFrequencies = [];
    return {
      accepted: false,
      frequency: state.frequency,
      octaveAdjusted: candidateFrequency !== rawFrequency,
      stage: "decay-outlier",
    };
  }

  if (jumpCents > TUNER_OUTLIER_CENTS) {
    const pendingMedian = medianFrequency(state.pendingFrequencies);
    const belongsToPendingCluster = pendingMedian != null
      && Math.abs(centsBetween(candidateFrequency, pendingMedian)) <= TUNER_JUMP_CLUSTER_CENTS;
    state.pendingFrequencies = belongsToPendingCluster
      ? [...state.pendingFrequencies, candidateFrequency].slice(-TUNER_JUMP_CONFIRM_FRAMES)
      : [candidateFrequency];

    if (state.pendingFrequencies.length < TUNER_JUMP_CONFIRM_FRAMES) {
      return {
        accepted: false,
        frequency: state.frequency,
        octaveAdjusted: candidateFrequency !== rawFrequency,
        stage: "confirming",
      };
    }

    state.frequency = medianFrequency(state.pendingFrequencies) ?? candidateFrequency;
    state.history = [...state.pendingFrequencies];
    state.pendingFrequencies = [];
    return {
      accepted: true,
      frequency: state.frequency,
      octaveAdjusted: candidateFrequency !== rawFrequency,
      stage: "tracking",
    };
  }

  state.pendingFrequencies = [];
  state.history = [
    ...state.history.slice(-(TUNER_FREQUENCY_HISTORY_SIZE - 1)),
    candidateFrequency,
  ];
  const historyMedian = medianFrequency(state.history) ?? candidateFrequency;
  const medianDeltaCents = Math.abs(centsBetween(historyMedian, state.frequency));
  const followAmount = medianDeltaCents > 18 ? 0.56 : medianDeltaCents > 7 ? 0.38 : 0.22;
  const currentLog = Math.log2(state.frequency);
  state.frequency = 2 ** (currentLog + (Math.log2(historyMedian) - currentLog) * followAmount);

  return {
    accepted: true,
    frequency: state.frequency,
    octaveAdjusted: candidateFrequency !== rawFrequency,
    stage: "tracking",
  };
}

export function createTunerCompletionState() {
  return {
    completed: false,
    enteredAt: null,
    lastValidAt: null,
    pitchKey: null,
    stableMs: 0,
  };
}

export function resetTunerCompletionState(state) {
  Object.assign(state, createTunerCompletionState());
  return state;
}

export function updateTunerCompletionState(state, { cents, now, pitchKey }) {
  if (!Number.isFinite(cents) || !Number.isFinite(now) || !pitchKey) {
    resetTunerCompletionState(state);
    return false;
  }

  if (state.pitchKey !== pitchKey) {
    resetTunerCompletionState(state);
    state.pitchKey = pitchKey;
  }

  const distance = Math.abs(cents);
  if (state.completed) {
    if (distance <= TUNER_COMPLETION_EXIT_CENTS) {
      state.lastValidAt = now;
      return true;
    }
    state.completed = false;
    state.enteredAt = null;
    state.lastValidAt = null;
    state.stableMs = 0;
  }

  if (distance > TUNER_COMPLETION_ENTER_CENTS) {
    state.enteredAt = null;
    state.lastValidAt = null;
    state.stableMs = 0;
    return false;
  }

  if (state.enteredAt == null) {
    state.enteredAt = now;
    state.lastValidAt = now;
    state.stableMs = 0;
    return false;
  }

  const elapsed = Math.max(0, now - (state.lastValidAt ?? now));
  state.stableMs += Math.min(elapsed, 65);
  state.lastValidAt = now;
  state.completed = state.stableMs >= TUNER_COMPLETION_HOLD_MS;
  return state.completed;
}
