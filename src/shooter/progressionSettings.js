import { STANDARD_GUITAR_OPEN_MIDI, createShooterTargetNote } from './gameplayRules.js';

export const SHOOTER_PROGRESS_SPEEDS = Object.freeze([.75, 1, 1.25, 1.5]);
export function normalizeShooterProgressSpeed(value) {
  return SHOOTER_PROGRESS_SPEEDS.includes(Number(value)) ? Number(value) : 1;
}
export function scaleShooterProgressDuration(duration, speed) {
  return duration / normalizeShooterProgressSpeed(speed);
}
export function getShooterProgressRecovery(difficulty) {
  const interval = difficulty.startsWith('difficult') ? 280 : difficulty.startsWith('normal') ? 450 : 650;
  return interval;
}
export function getShooterConcurrentTargetLimit(difficulty) {
  return difficulty.startsWith('difficult') ? 4 : difficulty.startsWith('normal') ? 3 : 2;
}
// Use the unscaled baseline duration: fall-speed selection must not change
// spawn cadence. At 1x the next note arrives before the previous reaches bottom.
export function getShooterStreamInterval(difficulty, targetDuration) {
  const fraction = difficulty.startsWith('difficult') ? .27 : difficulty.startsWith('normal') ? .36 : .5;
  return targetDuration * fraction;
}
export const SHOOTER_HARD_RANDOM_POSITIONS = Object.freeze(Object.keys(STANDARD_GUITAR_OPEN_MIDI)
  .map(Number).sort((a,b)=>b-a).flatMap(stringNumber => Array.from({length:13}, (_, fretNumber) => {
    const target = createShooterTargetNote({stringNumber, fretNumber});
    return Object.freeze({...target, pitch:target.label, stringNumber, fretNumber});
  })));
