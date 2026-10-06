import test from 'node:test';
import assert from 'node:assert/strict';
import { VIEWER_PROFILES, getInstrumentPosition } from '../src/fretboard/instruments.js';
import { buildInstrumentFirstPosition, buildInstrumentScalePractice } from '../src/fretboard/instrumentPractice.js';
import { SCALE_DEFINITIONS } from '../src/fretboard/scaleCatalog.js';
import { CHROMATIC_NOTES, NOTE_INDEX } from '../src/music/noteNotation.js';
import { selectRootScalePractice } from '../src/fretboard/rootScalePractice.js';
import { buildInstrumentChordPositions } from '../src/fretboard/instrumentChords.js';
import {
  createChordFretboardSnapshot, resolveChordFretboardSnapshot,
  addChordFretboardNote, removeChordFretboardNote, addChordFretboardBarre,
  getChordFretboardMidiVoicing, getChordFretboardSignature,
} from '../src/rhythm/chordFretboardState.js';

const profiles = Object.values(VIEWER_PROFILES);
const actualPitch = (profile, note) => getInstrumentPosition(profile.tuning, note.stringNumber, note.fretNumber);

test('stage 1 includes every natural note in frets 0–3 and preserves physical positions when pitches repeat', () => {
  for (const profile of profiles) {
    const practice = buildInstrumentFirstPosition(profile, { id: 'first-position' });
    const expected = profile.tuning.flatMap(({stringNumber}) => Array.from({length:4}, (_,fret) => getInstrumentPosition(profile.tuning,stringNumber,fret)))
      .filter(note => !note.noteName.includes('#'));
    assert.deepEqual(new Set(practice.notes.map(n=>n.id)),new Set(expected.map(n=>n.id)));
    assert.equal(practice.sequence.length,expected.length*2-1);
    assert.equal(practice.sequence[0].noteId,practice.sequence.at(-1).noteId);
    assert.equal(new Set(practice.ascendingSequence.map(n=>n.noteId)).size,expected.length);
    assert.ok(practice.notes.every((n,i)=>!i || n.midi>=practice.notes[i-1].midi));
    for (const step of practice.sequence) assert.equal(step.pitch,actualPitch(profile,step).pitch);
    const open = buildInstrumentFirstPosition(profile,{id:'open'});
    assert.equal(open.notes.length,profile.stringCount);
    assert.ok(open.notes.every(n=>n.fretNumber===0));
  }
  assert.equal(buildInstrumentFirstPosition(VIEWER_PROFILES['bass-5'],{id:'first-position'}).notes[0].pitch,'B0');
  const highG = buildInstrumentFirstPosition(VIEWER_PROFILES['ukulele-high-g'],{id:'first-position'});
  assert.equal(highG.notes[0].stringNumber,3,'High G ascent starts on sounding C4, not physical string 4');
});

test('stage 2 sequences match every tuning and scale; octave segments stay complete root-to-root phrases', () => {
  for (const profile of profiles) for (const root of CHROMATIC_NOTES) for (const scale of SCALE_DEFINITIONS) {
    for (const position of [1,2,3,4,5,'all','root-1','root-2']) {
      const practice=buildInstrumentScalePractice(profile,root,scale.id,position);
      assert.ok(practice.notes.length,`${profile.id} ${root} ${scale.id} ${position}`);
      for (const step of practice.sequence) {
        const note=actualPitch(profile,step);
        assert.equal(step.pitch,note.pitch);
        assert.ok(scale.intervals.includes((note.midi-NOTE_INDEX[root]+120)%12));
        assert.ok(practice.notes.some(n=>n.id===step.noteId));
      }
      for (let i=0;i<(practice.rootScaleSegments?.length??0);i++) {
        const segment=selectRootScalePractice(practice,i);
        assert.equal(segment.notes[0].noteName,root);
        assert.equal(segment.notes.at(-1).noteName,root);
        assert.equal(segment.notes.at(-1).midi-segment.notes[0].midi,practice.octaves*12);
        assert.equal(segment.sequence.length,scale.intervals.length*practice.octaves+1);
        assert.ok(segment.notes.every((n,j)=>!j||n.midi>segment.notes[j-1].midi));
      }
    }
  }
});

test('stage 3 edited snapshots retain actual string counts, tuning and MIDI through save/load', () => {
  for (const profile of profiles) {
    const blank=createChordFretboardSnapshot({},'B',profile);
    let edited=addChordFretboardNote(blank,profile.stringCount,0,'B');
    edited=addChordFretboardNote(edited,1,3,'B');
    edited=addChordFretboardBarre(edited,3,1,profile.stringCount,'B');
    assert.equal(edited.barres[0].toString,profile.stringCount);
    const saved=JSON.parse(JSON.stringify(edited));
    const reloaded=createChordFretboardSnapshot(saved,'B');
    assert.deepEqual(reloaded,edited);
    assert.equal(reloaded.instrumentProfileId??'guitar-6',profile.id);
    assert.deepEqual(getChordFretboardMidiVoicing(reloaded),[profile.tuning.at(-1).midi,profile.tuning[0].midi+3].sort((a,b)=>a-b));
    assert.deepEqual(addChordFretboardNote(reloaded,profile.stringCount+1,2),createChordFretboardSnapshot(reloaded));
    assert.equal(removeChordFretboardNote(reloaded,1,3).notes.length,1);
  }
  const shape={notes:[{stringNumber:4,fretNumber:0}]};
  const hi=createChordFretboardSnapshot(shape,'G',VIEWER_PROFILES['ukulele-high-g']);
  const lo=createChordFretboardSnapshot(shape,'G',VIEWER_PROFILES['ukulele-low-g']);
  assert.notEqual(getChordFretboardSignature(hi),getChordFretboardSignature(lo));
  assert.equal(getChordFretboardMidiVoicing(hi)[0]-getChordFretboardMidiVoicing(lo)[0],12);
});

test('changing instruments derives a playable chord without overwriting the original custom fingering', () => {
  const original=createChordFretboardSnapshot({notes:[{stringNumber:6,fretNumber:8},{stringNumber:2,fretNumber:5}]},'C');
  const savedJson=JSON.stringify(original);
  for (const profile of profiles) {
    const fallback=buildInstrumentChordPositions(profile,{root:'C',quality:'major',extension:'none'}).position1;
    const resolved=resolveChordFretboardSnapshot(original,fallback,'C',profile);
    assert.ok(resolved.notes.length>=2);
    for (const note of resolved.notes) {
      assert.equal(note.pitch,actualPitch(profile,note).pitch);
      assert.ok(['C','E','G'].includes(note.noteName));
    }
    assert.equal(JSON.stringify(original),savedJson);
  }
  assert.deepEqual(resolveChordFretboardSnapshot(original,{},'C',VIEWER_PROFILES['guitar-6']),original);
});
