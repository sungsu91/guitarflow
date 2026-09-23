import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
import {CHORD_TONE_INTERVALS} from '../chords/chordTheory.js';
export const TUNING = Object.freeze([64, 59, 55, 50, 45, 40]);
export const ROOTS = Object.freeze(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
export const NATURAL = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const MINOR = [0, 2, 3, 5, 7, 8, 10];
export const PENTA = [0, 3, 5, 7, 10];
export const BLUES = [0, 3, 5, 6, 7, 10];
export const TECHNIQUES = Object.freeze({ H: ko["etudes.hammerOn"], P: ko["etudes.pullOff"], S: ko["etudes.slide"] });

export function parseChord(symbol) {
  const match=symbol.match(/^([A-G])([#♯b♭]?)(maj7|m7b5|m7|m|7|m\(add9\)|madd9|add9|sus2|sus4|6)?(?:\/([A-G])([#♯b♭]?))?$/);
  if(!match)throw new Error(ko["etudes.unsupportedChord"]+symbol);
  const [,letter,acc,quality='',bass,bassAcc]=match;
  const root=letter+(acc==='♯'?'#':acc==='♭'?'b':acc);
  const pitchClass=(letter,acc)=>(NATURAL[letter]+(acc==='#'||acc==='♯'?1:acc==='b'||acc==='♭'?-1:0)+12)%12;
  const pc=pitchClass(letter,acc),family=quality.startsWith('m')&&!quality.startsWith('maj')?'minor':'major';
  const type=quality==='m'?'none':quality==='m(add9)'||quality==='madd9'?'add9':quality||'none';
  const intervals=CHORD_TONE_INTERVALS[family][type].map(n=>n%12).sort((a,b)=>a-b);
  return {root,pc,intervals,family,...(bass?{bassPc:pitchClass(bass,bassAcc)}:{})};
}

export function spellMidi(midi, root, family, blue = false) {
  const degrees = family === 'major' ? MAJOR : MINOR;
  const tonic=NATURAL[root[0]]+(root[1]==='#'?1:root[1]==='b'?-1:0);
  const interval = ((midi - tonic) % 12 + 12) % 12;
  const degree = blue && interval === 6 ? 4 : interval === 10 && family === 'major' ? 6 : degrees.indexOf(interval);
  if (degree < 0) throw new Error(formatMessage(ko["etudes.noteOutsideTheScaleValueValue"], { value1: root, value2: midi }));
  const letter = ROOTS[(ROOTS.indexOf(root[0]) + degree) % 7];
  let alter = ((midi % 12) - NATURAL[letter] + 18) % 12 - 6;
  const octave = (midi - NATURAL[letter] - alter) / 12 - 1;
  return { letter, alter, octave, key: `${letter.toLowerCase()}${alter === -1 ? 'b' : alter === 1 ? '#' : ''}/${octave + 1}` };
}

export function validateEtude(etude) {
  const errors = [];
  etude.measures.forEach((measure, bar) => {
    if (Math.abs(measure.reduce((sum, n) => sum + 4 / Number(n.duration) * (n.dotted ? 1.5 : 1) * (n.tuplet ? n.tuplet.normalNotes / n.tuplet.actualNotes : 1), 0) - 4) > 1e-8) errors.push(formatMessage(ko["etudes.barValueBeatTotal"], { value1: bar + 1 }));
    let nextTick=0;
    measure.forEach((n, i) => {
      const tick=n.onset??nextTick;
      nextTick=tick+1920/Number(n.duration)*(n.dotted?1.5:1)*(n.tuplet?n.tuplet.normalNotes/n.tuplet.actualNotes:1);
      const voicings=etude.document?.measures[bar]?.sketchVoicings;
      const grip=voicings?.find(v=>tick>=v.startTick&&tick<v.endTick);
      const chord=grip?parseChord(grip.name):etude.accompaniment?parseChord(etude.harmony[bar]):null;
      const label = `${bar + 1}:${i + 1}`;
      const sounding = n.tones ?? [n];
      if(n.tones && (n.rest || n.tones.length<2 || n.technique || new Set(n.tones.map(t=>t.string)).size!==n.tones.length)) errors.push(formatMessage(ko["etudes.valueSimultaneousNoteStructure"], { value1: label }));
      if(n.tones && ['string','fret','midi'].some(key=>n[key]!==n.tones[0]?.[key])) errors.push(formatMessage(ko["etudes.valueSimultaneousNoteReferencePitch"], { value1: label }));
      for(const tone of n.rest?[]:sounding) {
        if(voicings&&(!grip||grip.frets[6-tone.string]!==tone.fret))errors.push(formatMessage(ko["etudes.valueVoicingAndTabMismatch"], { value1: label }));
        if(etude.chordShapes && !n.rest && etude.chordShapes[bar]?.frets[6-tone.string]!==tone.fret) errors.push(formatMessage(ko["etudes.valueChordDiagramAndTabMismatch"], { value1: label }));
        if (tone.string < 1 || tone.string > 6 || !Number.isInteger(tone.fret) || tone.fret < 0 || tone.fret > 24) errors.push(formatMessage(ko["etudes.valueFingeringRange"], { value1: label }));
        if (TUNING[tone.string - 1] + tone.fret !== tone.midi) errors.push(formatMessage(ko["etudes.valueTabPitch"], { value1: label }));
        if ((tone.pitch.octave + 1) * 12 + NATURAL[tone.pitch.letter] + tone.pitch.alter !== tone.midi) errors.push(formatMessage(ko["etudes.valueNotatedPitch"], { value1: label }));
        if (!(chord?.intervals??etude.intervals??[]).includes((tone.midi - (chord?.pc??NATURAL[etude.root]) + 120) % 12)&&tone.midi%12!==chord?.bassPc) errors.push(formatMessage(ko["etudes.valueScaleOrChordTone"], { value1: label }));
      }
      if (n.technique) {
        const next = measure[i + 1];
        if (!TECHNIQUES[n.technique] || n.rest || !next || next.rest || next.string !== n.string || next.fret === n.fret) errors.push(formatMessage(ko["etudes.valueTechniqueConnection"], { value1: label }));
        else if ((n.technique === 'H' && next.fret < n.fret) || (n.technique === 'P' && next.fret > n.fret)) errors.push(formatMessage(ko["etudes.valueTechniqueDirection"], { value1: label }));
      }
    });
  });
  return errors;
}

