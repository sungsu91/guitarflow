import { frequencyToChromaticPitch } from "../tuner/tunerMath.js";

export const SHOOTER_PITCH_DISPLAY_HOLD_MS = 900;

export function createShooterPitchDisplayState() {
  return { pitch: null, seenAt: -Infinity, pendingNote: null, pendingFrames: 0, reason: "no-signal" };
}

// This is display memory only. Never feed a held reading back into hit judgment.
export function updateShooterPitchDisplay(state, { now, frequency, confidence = 0, reason, accepted = false }) {
  const note = confidence >= 0.82 ? frequencyToChromaticPitch(frequency) : null;
  if (note) {
    const changed = state.pitch && state.pitch.note !== note.pitch;
    if (changed && !accepted) {
      state.pendingFrames = state.pendingNote === note.pitch ? state.pendingFrames + 1 : 1;
      state.pendingNote = note.pitch;
      const octaveJump = Math.abs(note.midi - state.pitch.midi) >= 12;
      if (state.pendingFrames < (octaveJump ? 3 : 2)) {
        return { pitch: state.pitch, reason: state.reason };
      }
    }
    state.pitch = { note: note.pitch, midi: note.midi, frequency };
    state.seenAt = now;
    state.pendingNote = null;
    state.pendingFrames = 0;
    state.reason = reason;
    return { pitch: state.pitch, reason };
  }
  state.pendingNote = null;
  state.pendingFrames = 0;
  if (state.pitch && now - state.seenAt <= SHOOTER_PITCH_DISPLAY_HOLD_MS) {
    return { pitch: state.pitch, reason: state.reason === "hit" || state.reason === "target-lock" ? "hit" : "held" };
  }
  state.pitch = null;
  state.reason = reason ?? "no-signal";
  return { pitch: null, reason: state.reason };
}
