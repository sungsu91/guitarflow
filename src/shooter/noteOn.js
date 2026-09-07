export const SHOOTER_NOTE_ON_DEBOUNCE_MS = 70;
export const SHOOTER_REPICK_RISE_RATIO = 1.28;

export function createShooterNoteOnState() {
  return { id: 0, at: -Infinity, active: false, lastRms: 0 };
}

// Observe the input envelope even on frames where pitch is not yet available.
// The event id persists so an attack's noisy first frame cannot swallow it.
export function observeShooterNoteOn(state, { now, rms = 0, signalPresent }) {
  const level = Math.max(0, Number(rms) || 0);
  if (!signalPresent) {
    state.active = false;
    state.lastRms = 0;
    return state.id;
  }
  const rise = state.lastRms > 0 && level >= state.lastRms * SHOOTER_REPICK_RISE_RATIO;
  if ((!state.active || rise) && now - state.at >= SHOOTER_NOTE_ON_DEBOUNCE_MS) {
    state.id += 1;
    state.at = now;
  }
  state.active = true;
  state.lastRms = level;
  return state.id;
}
