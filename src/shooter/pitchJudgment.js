import {
  TUNER_ATTACK_MIN_CONFIDENCE,
  TUNER_REFERENCE_FREQUENCY,
  centsBetween,
  frequencyToChromaticPitch,
  midiToFrequency,
} from "../tuner/tunerMath.js";

export const SHOOTER_REFERENCE_FREQUENCY = TUNER_REFERENCE_FREQUENCY;
export const SHOOTER_HIT_TOLERANCE_CENTS = 42;
export const SHOOTER_STABLE_FRAME_COUNT = 3;
export const SHOOTER_STABLE_MIN_MS = 55;
export const SHOOTER_IMMEDIATE_HIT_CONFIDENCE = 0.94;
export const SHOOTER_REPICK_RISE_RATIO = 1.28;

const getTargetFrequency = (target) => {
  const directFrequency = Number(target?.frequency);
  if (Number.isFinite(directFrequency) && directFrequency > 0) return directFrequency;
  const pitch = String(target?.pitch || "");
  const chromatic = /^([A-G])(#?)(-?\d+)$/.exec(pitch);
  if (!chromatic) return null;
  const pitchClassOffsets = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = (Number(chromatic[3]) + 1) * 12
    + pitchClassOffsets[chromatic[1]]
    + (chromatic[2] ? 1 : 0);
  return midiToFrequency(midi, SHOOTER_REFERENCE_FREQUENCY);
};

export function createShooterPitchJudgmentState() {
  return {
    candidateFirstAt: null,
    candidateFrames: 0,
    candidatePitch: null,
    lastAcceptedAt: Number.NEGATIVE_INFINITY,
    lastRms: 0,
    lockedPitch: null,
    lockedTargetKey: null,
    signalPresent: false,
    targetKey: null,
  };
}

export function resetShooterPitchJudgmentState(state) {
  Object.assign(state, createShooterPitchJudgmentState());
  return state;
}

export function releaseShooterPitchJudgment(state) {
  state.candidateFirstAt = null;
  state.candidateFrames = 0;
  state.candidatePitch = null;
  state.lastRms = 0;
  state.lockedPitch = null;
  state.lockedTargetKey = null;
  state.signalPresent = false;
  return state;
}

export function observeShooterPitchFrame(state, {
  confidence,
  frequency,
  now,
  rms = 0,
  signalPresent = true,
  target,
  targetKey = target?.id ?? target?.pitch ?? null,
} = {}) {
  const safeNow = Number(now);
  const safeRms = Math.max(0, Number(rms) || 0);
  if (!signalPresent || !Number.isFinite(safeNow)) {
    releaseShooterPitchJudgment(state);
    return { accepted: false, reason: "no-signal" };
  }

  const targetFrequency = getTargetFrequency(target);
  const targetPitch = String(target?.pitch || "");
  if (!targetPitch || !Number.isFinite(targetFrequency) || targetFrequency <= 0) {
    state.lastRms = safeRms;
    state.signalPresent = true;
    return { accepted: false, reason: "no-target" };
  }

  const onset = !state.signalPresent
    || (state.lastRms > 0 && safeRms >= state.lastRms * SHOOTER_REPICK_RISE_RATIO);
  state.lastRms = safeRms;
  state.signalPresent = true;

  if (state.targetKey !== targetKey) {
    state.targetKey = targetKey;
    state.candidateFirstAt = null;
    state.candidateFrames = 0;
    state.candidatePitch = null;
  }

  if (!Number.isFinite(frequency) || frequency <= 0) {
    state.candidateFrames = 0;
    state.candidatePitch = null;
    return { accepted: false, reason: "no-pitch" };
  }
  if (!Number.isFinite(confidence) || confidence < TUNER_ATTACK_MIN_CONFIDENCE) {
    state.candidateFrames = 0;
    state.candidatePitch = null;
    return { accepted: false, reason: "low-confidence" };
  }

  const detected = frequencyToChromaticPitch(frequency, SHOOTER_REFERENCE_FREQUENCY);
  const cents = centsBetween(frequency, targetFrequency);
  if (!detected || detected.pitch !== targetPitch || Math.abs(cents) > SHOOTER_HIT_TOLERANCE_CENTS) {
    state.candidateFirstAt = null;
    state.candidateFrames = 0;
    state.candidatePitch = null;
    return { accepted: false, cents, detectedPitch: detected?.pitch ?? null, reason: "wrong-pitch" };
  }

  // A stable, different chromatic pitch proves that the player moved to a new
  // note even when the previous string's tail keeps the level above release.
  if (state.lockedPitch && state.lockedPitch !== targetPitch) {
    state.lockedPitch = null;
    state.lockedTargetKey = null;
  }

  if (state.lockedPitch === targetPitch && state.lockedTargetKey !== targetKey && !onset) {
    return { accepted: false, cents, detectedPitch: detected.pitch, reason: "sustain-lock" };
  }
  if (onset && state.lockedTargetKey !== targetKey) {
    state.lockedPitch = null;
    state.lockedTargetKey = null;
  }
  if (state.lockedTargetKey === targetKey) {
    return { accepted: false, cents, detectedPitch: detected.pitch, reason: "target-lock" };
  }

  if (state.candidatePitch === targetPitch) {
    state.candidateFrames += 1;
  } else {
    state.candidatePitch = targetPitch;
    state.candidateFrames = 1;
    state.candidateFirstAt = safeNow;
  }
  const stableMs = Math.max(0, safeNow - (state.candidateFirstAt ?? safeNow));
  if (
    confidence < SHOOTER_IMMEDIATE_HIT_CONFIDENCE
    && (state.candidateFrames < SHOOTER_STABLE_FRAME_COUNT
      || stableMs < SHOOTER_STABLE_MIN_MS)
  ) {
    return { accepted: false, cents, detectedPitch: detected.pitch, reason: "stabilizing", stableMs };
  }

  state.lastAcceptedAt = safeNow;
  state.lockedPitch = targetPitch;
  state.lockedTargetKey = targetKey;
  return { accepted: true, cents, detectedPitch: detected.pitch, reason: "hit", stableMs };
}
