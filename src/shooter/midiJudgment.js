import { midiToFrequency, frequencyToChromaticPitch } from '../tuner/tunerMath.js';

// Called only for a new device/channel/note edge from the shared MIDI manager.
// Pitch bend does not change the nominal MIDI note in this release.
export function midiMatchesShooterTarget(event, target) {
  if (event?.type !== 'noteon' || !Number.isInteger(event.note)) return false;
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(target?.pitch ?? '');
  if (!match) return false;
  const offsets = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const note = (Number(match[3]) + 1) * 12 + offsets[match[1]] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
  return event.note === note;
}
export { midiToFrequency as midiInputFrequency };
export function midiInputPitch(note) {
  const frequency = midiToFrequency(note);
  return { note: frequencyToChromaticPitch(frequency).pitch, midi: note, frequency };
}
