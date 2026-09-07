import { createShooterNoteOnState, observeShooterNoteOn } from "./noteOn.js";
export { SHOOTER_REPICK_RISE_RATIO } from "./noteOn.js";
import {
  TUNER_ATTACK_MIN_CONFIDENCE,
  TUNER_REFERENCE_FREQUENCY,
  centsBetween,
  frequencyToChromaticPitch,
  midiToFrequency,
} from "../tuner/tunerMath.js";

export const SHOOTER_REFERENCE_FREQUENCY = TUNER_REFERENCE_FREQUENCY;
export const SHOOTER_HIT_TOLERANCE_CENTS = 42;
export const SHOOTER_STABLE_FRAME_COUNT = 2;
export const SHOOTER_STABLE_MIN_MS = 24;
export const SHOOTER_IMMEDIATE_HIT_CONFIDENCE = 0.90;

const getTargetFrequency = (target) => {
  const directFrequency = Number(target?.frequency);
  if (Number.isFinite(directFrequency) && directFrequency > 0) return directFrequency;
  const pitch = String(target?.pitch || "");
  const chromatic = /^([A-G])([#b]?)(-?\d+)$/.exec(pitch);
  if (!chromatic) return null;
  const pitchClassOffsets = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = (Number(chromatic[3]) + 1) * 12
    + pitchClassOffsets[chromatic[1]]
    + (chromatic[2] === "#" ? 1 : chromatic[2] === "b" ? -1 : 0);
  return midiToFrequency(midi, SHOOTER_REFERENCE_FREQUENCY);
};

export function createShooterPitchJudgmentState() {
  return {
    noteOn: createShooterNoteOnState(),
    consumedAttackId: -1,
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
  // Keep hit deduplication across signal gaps; the next note-on gets a new id.
  state.signalPresent = false;
  return state;
}

export function observeShooterPitchFrame(state, {
  attackId,
  deferCommit = false,
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
  if (!Number.isFinite(safeNow)) return { accepted: false, reason: "invalid-time" };
  const currentAttackId = attackId ?? observeShooterNoteOn(state.noteOn, {
    now: safeNow, rms: safeRms, signalPresent,
  });
  if (!signalPresent) {
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
  if (!detected || Math.abs(cents) > SHOOTER_HIT_TOLERANCE_CENTS) {
    state.candidateFirstAt = null;
    state.candidateFrames = 0;
    state.candidatePitch = null;
    return { accepted: false, cents, detectedPitch: detected?.pitch ?? null, reason: "wrong-pitch" };
  }

  if (state.lockedTargetKey === targetKey) {
    return { accepted: false, cents, detectedPitch: detected.pitch, reason: "target-lock" };
  }
  if (state.consumedAttackId === currentAttackId && state.lockedPitch === detected.pitch) {
    return { accepted: false, cents, detectedPitch: detected.pitch, reason: "sustain-lock" };
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

  const judgment = {
    accepted: true, cents, detectedPitch: detected.pitch, reason: "hit", stableMs,
    attackId: currentAttackId, targetKey, acceptedAt: safeNow,
  };
  if (!deferCommit) commitShooterPitchHit(state, judgment);
  return judgment;
}

export function commitShooterPitchHit(state, judgment) {
  if (!judgment?.accepted) return;
  state.lastAcceptedAt = judgment.acceptedAt;
  state.consumedAttackId = judgment.attackId;
  state.lockedPitch = judgment.detectedPitch;
  state.lockedTargetKey = judgment.targetKey;
}
