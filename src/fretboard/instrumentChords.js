import { getChordToneDescriptors } from '../chords/chordTheory.js';
import { buildInstrumentNotes } from './instruments.js';

const cache = new Map();

function fingerShape(notes) {
  const fingers = [], barres = [];
  const frets = [...new Set(notes.map(note => note.fretNumber).filter(Boolean))].sort((a, b) => a - b);
  for (const fret of frets) {
    const sameFret = notes.filter(note => note.fretNumber === fret);
    let group = [];
    const finish = () => { if (group.length) fingers.push(group); group = []; };
    for (const note of sameFret) {
      const previous = group.at(-1);
      if (previous) {
        for (let string = previous.stringNumber + 1; string < note.stringNumber; string++) {
          if (!notes.some(n => n.stringNumber === string && n.fretNumber >= fret)) { finish(); break; }
        }
      }
      group.push(note);
    }
    finish();
  }
  if (fingers.length > 4) return null;
  const fingerByString = new Map();
  fingers.forEach((group, index) => {
    group.forEach(note => fingerByString.set(note.stringNumber, String(index + 1)));
    if (group.length > 1) barres.push({ fret: group[0].fretNumber,
      fromString: group[0].stringNumber, toString: group.at(-1).stringNumber, label: String(index + 1) });
  });
  return { notes: notes.map(note => ({ ...note, finger: fingerByString.get(note.stringNumber) ?? '' })), barres };
}

export function buildInstrumentChordPositions(profile, { root, quality, extension }) {
  const key = [profile.id, root, quality, extension].join(':');
  if (cache.has(key)) return cache.get(key);
  const tones = getChordToneDescriptors(root, quality, extension).map(tone => ({ ...tone, label: tone.noteName }));
  // On four strings extended chords retain their defining third, seventh and
  // tensions. Any omitted fifth, eleventh or root is shown beside the diagram.
  const required = [...tones];
  for (const interval of [17, 7, 0]) {
    if (required.length <= profile.stringCount) break;
    const index = required.findIndex(tone => tone.interval === interval);
    if (index >= 0) required.splice(index, 1);
  }
  const requiredNames = new Set(required.map(tone => tone.noteName));
  const all = buildInstrumentNotes(profile.tuning, 0, 15, tones.map(tone => tone.noteName));
  const candidates = new Map();
  for (let start = 0; start <= 12; start++) {
    const choices = profile.tuning.map(({ stringNumber }) => [null, ...all.filter(note =>
      note.stringNumber === stringNumber && note.fretNumber >= start && note.fretNumber <= start + 3)]);
    let best = null;
    const visit = (index, notes, names) => {
      if (requiredNames.size - [...requiredNames].filter(name => names.has(name)).length > choices.length - index) return;
      if (index < choices.length) {
        for (const note of choices[index]) visit(index + 1, note ? [...notes, note] : notes, note ? new Set([...names, note.noteName]) : names);
        return;
      }
      if (notes.length < Math.min(3, requiredNames.size) || [...requiredNames].some(name => !names.has(name))) return;
      const shape = fingerShape(notes);
      if (!shape) return;
      const fretted = notes.filter(note => note.fretNumber > 0);
      const lowNote = [...notes].sort((a, b) => a.midi - b.midi)[0];
      const score = (tones.length - names.size) * 30 + (lowNote.noteName === root ? 0 : 5)
        + (profile.stringCount - notes.length) * 3 + shape.barres.length * 1.5
        + fretted.reduce((sum, note) => sum + note.fretNumber, 0) * 0.12;
      if (!best || score < best.score) best = { ...shape, score };
    };
    visit(0, [], new Set());
    if (best) candidates.set(best.notes.map(note => `${note.stringNumber}:${note.fretNumber}`).join(','), best);
  }
  const ordered = [...candidates.values()].sort((a, b) =>
    Math.min(...a.notes.map(n => n.fretNumber)) - Math.min(...b.notes.map(n => n.fretNumber)) || a.score - b.score);
  const result = Object.fromEntries(ordered.slice(0, 5).map((shape, index) => {
    const names = new Set(shape.notes.map(note => note.noteName));
    return [`position${index + 1}`, {
      notes: shape.notes, barres: shape.barres,
      visibleFrets: shape.notes.map(note => note.fretNumber),
      stringStates: Object.fromEntries(profile.tuning.map(({ stringNumber }) => {
        const note = shape.notes.find(item => item.stringNumber === stringNumber);
        return [stringNumber, !note ? 'x' : note.fretNumber === 0 ? 'o' : ''];
      })),
      voicing: { theoreticalTones: tones, omittedTones: tones.filter(tone => !names.has(tone.noteName)) },
    }];
  }));
  if (cache.size >= 512) cache.delete(cache.keys().next().value);
  cache.set(key, result);
  return result;
}
