import { buildInstrumentNotes } from './instruments.js';
import { buildInstrumentScale } from './instrumentScales.js';
import { rootScaleOctaves } from './rootScale.js';
import { getScaleDefinition } from './scaleCatalog.js';
import { SOLFEGE } from '../music/noteNotation.js';

const ascending = notes => [...notes].sort((a,b) => a.midi - b.midi || b.stringNumber - a.stringNumber || a.fretNumber - b.fretNumber);
export const instrumentPracticeNote = (note, profile) => ({
  ...note, name: note.pitch, octaveNote: note.pitch, fret: note.fretNumber,
  solfege: SOLFEGE[note.noteName] ?? '', lane: profile.stringCount - note.stringNumber,
});
export const instrumentPracticeStep = note => ({
  pitch: note.pitch, noteName: note.pitch, noteId: note.id,
  stringNumber: note.stringNumber, fretNumber: note.fretNumber,
});

export function buildInstrumentFirstPosition(profile, category) {
  const notes = ascending(buildInstrumentNotes(profile.tuning, 0, category.id === 'open' ? 0 : 3))
    .filter(note => !note.noteName.includes('#')).map(note => instrumentPracticeNote(note, profile));
  const ascendingSequence = notes.map(instrumentPracticeStep);
  return { ...category, notes, ascendingSequence,
    sequence: [...ascendingSequence, ...ascendingSequence.slice(0,-1).reverse()] };
}

export function buildInstrumentScalePractice(profile, root, scaleId, position) {
  const scale = getScaleDefinition(scaleId);
  const base = buildInstrumentScale(profile,root,scaleId,position);
  const notes = ascending(base.notes).map(note => instrumentPracticeNote(note,profile));
  const practice = { ...base, notes, displayBox: position,
    type: { id: scale.typeId, label: scale.label, intervals: scale.intervals },
    family: { id: scale.familyId, label: scale.label },
    sequence: notes.map(instrumentPracticeStep) };
  const octaves = rootScaleOctaves(base.position);
  if (octaves) {
    const roots = buildInstrumentNotes(profile.tuning,0,24,[root]).map(note => note.midi);
    const lowest = Math.min(...roots), highest = Math.max(...roots);
    const segments = [];
    for (let midi = lowest; midi + octaves * 12 <= highest; midi += octaves * 12) {
      segments.push(buildInstrumentScale(profile,root,scaleId,`root-${octaves}`,midi).notes
        .map(note => instrumentPracticeNote(note,profile)));
    }
    practice.rootScaleSegments = segments;
    practice.octaves = octaves;
    practice.notes = [...new Map(segments.flat().map(note => [note.id,note])).values()];
    practice.sequence = segments.flatMap((segment,index) => segment.map(note => ({...instrumentPracticeStep(note),rootScaleSegment:index})));
    practice.visibleFrets = practice.notes.map(note => note.fretNumber);
  }
  return practice;
}
