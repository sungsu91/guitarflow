import { STANDARD_GUITAR_OPEN_MIDI, createShooterTargetNote } from './gameplayRules.js';

export const SHOOTER_PROGRESS_SPEEDS = Object.freeze([.75, 1, 1.25, 1.5]);
export function normalizeShooterProgressSpeed(value) {
  return SHOOTER_PROGRESS_SPEEDS.includes(Number(value)) ? Number(value) : 1;
}
export function scaleShooterProgressDuration(duration, speed) {
  return duration / normalizeShooterProgressSpeed(speed);
}
export function getShooterProgressRecovery(difficulty, speed = 1) {
  const interval = difficulty.startsWith('difficult') ? 280 : difficulty.startsWith('normal') ? 450 : 650;
  return scaleShooterProgressDuration(interval, speed);
}
export const SHOOTER_HARD_RANDOM_POSITIONS = Object.freeze(Object.keys(STANDARD_GUITAR_OPEN_MIDI)
  .map(Number).sort((a,b)=>b-a).flatMap(stringNumber => Array.from({length:13}, (_, fretNumber) => {
    const target = createShooterTargetNote({stringNumber, fretNumber});
    return Object.freeze({...target, pitch:target.label, stringNumber, fretNumber});
  })));
