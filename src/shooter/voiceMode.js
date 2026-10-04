import { centsBetween, detectPitchYinDetailed, frequencyToChromaticPitch, midiToFrequency } from "../tuner/tunerMath.js";

export const SHOOTER_VOICE_DIFFICULTY_ID = "voice";
export const SHOOTER_VOICE_TOLERANCE_CENTS = 45;
export const SHOOTER_VOICE_STABLE_MS = 180;
export const SHOOTER_VOICE_MIN_FRAMES = 4;
// Allow slower mobile/render frames while still rejecting a stale held reading.
export const SHOOTER_VOICE_MAX_FRAME_GAP_MS = 250;
export const SHOOTER_VOICE_MIN_CONFIDENCE = 0.85;

export const SHOOTER_VOICE_NOTES = Object.freeze([
  ["C4", 60, "도"], ["D4", 62, "레"], ["E4", 64, "미"], ["F4", 65, "파"],
  ["G4", 67, "솔"], ["A4", 69, "라"], ["B4", 71, "시"], ["C5", 72, "높은 도"],
].map(([pitch, midi, solfege]) => Object.freeze({
  pitch, midi, solfege, octave: Math.floor(midi / 12) - 1,
  noteName: pitch[0], frequency: midiToFrequency(midi), group: "shooter-voice",
})));

export function pickShooterVoiceNote(random = Math.random) {
  return SHOOTER_VOICE_NOTES[Math.min(7, Math.max(0, Math.floor(random() * 8)))];
}

export function getShooterVoiceNoteLabel(pitch, solfegeOn) {
  return (solfegeOn && SHOOTER_VOICE_NOTES.find(note => note.pitch === pitch)?.solfege) || pitch;
}

// Override the input only for this mode; preserve the user's guitar/MIDI setting.
export function getShooterInputSource(difficulty, selection) {
  return difficulty === SHOOTER_VOICE_DIFFICULTY_ID ? "audio" : selection.shooterSource;
}

export function detectShooterVoicePitch(buffer, sampleRate) {
  // Include adjacent octaves so an out-of-range sung note is measured and rejected,
  // rather than encouraging the detector to fold it into the target octave.
  return detectPitchYinDetailed(buffer, sampleRate, 65, 1400, 0.12);
}

export function createShooterVoiceJudgmentState() {
  return { targetKey: null, lockedTargetKey: null, firstAt: null, lastAt: null, frames: 0, signalPresent: false };
}

export function resetShooterVoiceJudgmentState(state) {
  Object.assign(state, createShooterVoiceJudgmentState());
}

export function releaseShooterVoiceJudgment(state) {
  state.firstAt = null;
  state.lastAt = null;
  state.frames = 0;
  state.signalPresent = false;
}

export function commitShooterVoiceHit(state, judgment) {
  if (judgment?.accepted) state.lockedTargetKey = judgment.targetKey;
}

export function observeShooterVoiceFrame(state, {
  now, frequency, confidence, signalPresent = true, target,
  targetKey = target?.id ?? target?.pitch ?? null, deferCommit = false,
} = {}) {
  const reject = (reason, extra = {}) => {
    releaseShooterVoiceJudgment(state);
    // A clear sung tone is still signal when it is the wrong note or no target
    // is on screen. Do not let the shared adaptive gate learn it as room noise.
    state.signalPresent = Boolean(signalPresent && Number.isFinite(frequency) && frequency > 0
      && Number.isFinite(confidence) && confidence >= SHOOTER_VOICE_MIN_CONFIDENCE);
    return { accepted: false, reason, ...extra };
  };
  if (!Number.isFinite(now)) return reject("invalid-time");
  if (!signalPresent) return reject("no-signal");
  const note = SHOOTER_VOICE_NOTES.find(note => note.pitch === target?.pitch);
  if (!note || targetKey == null) return reject("no-target");
  if (!Number.isFinite(frequency) || frequency <= 0) return reject("no-pitch");
  if (!Number.isFinite(confidence) || confidence < SHOOTER_VOICE_MIN_CONFIDENCE) return reject("low-confidence");
  // The canonical frequency is authoritative: C4 and C5 must never share a hit.
  const cents = centsBetween(frequency, note.frequency);
  const detectedPitch = frequencyToChromaticPitch(frequency)?.pitch;
  if (Math.abs(cents) > SHOOTER_VOICE_TOLERANCE_CENTS) return reject("wrong-pitch", { cents, detectedPitch });
  if (state.targetKey !== targetKey || state.lastAt == null || now < state.lastAt || now - state.lastAt > SHOOTER_VOICE_MAX_FRAME_GAP_MS) {
    releaseShooterVoiceJudgment(state);
    state.targetKey = targetKey;
  }
  state.signalPresent = true;
  if (state.lockedTargetKey === targetKey) return { accepted: false, reason: "target-lock", cents, detectedPitch };
  // Duplicate timestamps cannot manufacture a stable sequence.
  if (now !== state.lastAt) state.frames += 1;
  state.firstAt ??= now;
  state.lastAt = now;
  const stableMs = now - state.firstAt;
  if (stableMs < SHOOTER_VOICE_STABLE_MS || state.frames < SHOOTER_VOICE_MIN_FRAMES) {
    return { accepted: false, reason: "stabilizing", cents, detectedPitch, stableMs };
  }
  const judgment = { accepted: true, reason: "hit", cents, detectedPitch, stableMs, targetKey };
  if (!deferCommit) commitShooterVoiceHit(state, judgment);
  return judgment;
}
