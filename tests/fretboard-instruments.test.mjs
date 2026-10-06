import test from 'node:test';
import assert from 'node:assert/strict';
import { VIEWER_PROFILES, buildInstrumentNotes, normalizeViewerSelection, selectViewerInstrument, selectViewerProfile } from '../src/fretboard/instruments.js';
import { buildInstrumentScale, supportsInstrumentScalePosition } from '../src/fretboard/instrumentScales.js';
import { buildInstrumentChordPositions } from '../src/fretboard/instrumentChords.js';
import { getPlayableGuitarPositions, getGuitarStrumVoices } from '../src/audio/fretboardPreviewEngine.js';
import { SCALE_DEFINITIONS } from '../src/fretboard/scaleCatalog.js';
import { CHROMATIC_NOTES, NOTE_INDEX } from '../src/music/noteNotation.js';
import { CHORD_TONE_INTERVALS, getChordToneNames } from '../src/chords/chordTheory.js';

test('physical string ordering and sounding octave are correct for all seven tunings', () => {
  const expected = {
    'guitar-6': ['E4','B3','G3','D3','A2','E2'], 'guitar-7': ['E4','B3','G3','D3','A2','E2','B1'],
    'bass-4': ['G2','D2','A1','E1'], 'bass-5': ['G2','D2','A1','E1','B0'],
    'bass-6': ['C3','G2','D2','A1','E1','B0'],
    'ukulele-high-g': ['A4','E4','C4','G4'], 'ukulele-low-g': ['A4','E4','C4','G3'],
  };
  for (const [id, pitches] of Object.entries(expected)) {
    const profile = VIEWER_PROFILES[id], notes = buildInstrumentNotes(profile.tuning);
    assert.equal(notes.length, pitches.length * 16);
    assert.deepEqual(notes.filter(note => note.fretNumber === 0).map(note => note.pitch), pitches);
    for (const note of notes) assert.equal(note.midi, profile.tuning[note.stringNumber - 1].midi + note.fretNumber);
    const voices = getPlayableGuitarPositions(notes.filter(note => note.fretNumber === 12).map(note => ({ ...note, pitch: 'C0' })), {}, profile.tuning);
    assert.equal(voices.length, pitches.length);
    for (const voice of voices) assert.equal(voice.midi, profile.tuning[voice.stringNumber - 1].midi + 12);
  }
});

test('bass low B and guitar seventh string are playable; muted strings stay silent', () => {
  for (const id of ['guitar-7','bass-5','bass-6']) {
    const profile = VIEWER_PROFILES[id], stringNumber = profile.stringCount;
    const notes = [{ stringNumber, fretNumber: 0 }];
    assert.equal(getGuitarStrumVoices(notes, { tuning: profile.tuning })[0].midi, id === 'guitar-7' ? 35 : 23);
    assert.equal(getPlayableGuitarPositions(notes, { [stringNumber]: 'x' }, profile.tuning).length, 0);
  }
  assert.equal(getPlayableGuitarPositions([{ stringNumber: 7, fretNumber: 0 }]).length, 0, 'other guitar surfaces retain the six-string default');
});

test('instrument changes remember each family selection and reject stale saved settings', () => {
  let selection = normalizeViewerSelection({ instrument: 'piano', bass: 'guitar-7' });
  assert.equal(selection.instrument, 'guitar');
  assert.equal(selection.bass, 'bass-4');
  selection = selectViewerProfile(selection, 'guitar-7');
  selection = selectViewerProfile(selection, 'bass-6');
  selection = selectViewerProfile(selection, 'ukulele-low-g');
  selection = selectViewerInstrument(selection, 'guitar');
  assert.equal(selection.guitar, 'guitar-7');
  assert.equal(selection.bass, 'bass-6');
  assert.equal(selection.ukulele, 'ukulele-low-g');
  assert.deepEqual(normalizeViewerSelection(JSON.parse(JSON.stringify(selection))), selection);
});

test('all scale modes use the selected tuning and correct scale tones for every root', () => {
  for (const profile of Object.values(VIEWER_PROFILES)) {
    for (const root of CHROMATIC_NOTES) for (const scale of SCALE_DEFINITIONS) {
      for (const position of [1,2,3,4,5,'root-1','root-2','all']) {
        const result = buildInstrumentScale(profile, root, scale.id, position);
        assert.ok(result.notes.length > 0, `${profile.id} ${root} ${scale.id} ${position}`);
        for (const note of result.notes) {
          assert.equal(note.midi, profile.tuning[note.stringNumber - 1].midi + note.fretNumber);
          assert.ok(scale.intervals.includes((note.midi - NOTE_INDEX[root] + 120) % 12));
          assert.ok(result.visibleFrets.includes(note.fretNumber));
        }
        if (String(position).startsWith('root-')) {
          assert.equal(result.notes[0].noteName, root);
          assert.equal(result.notes.at(-1).midi - result.notes[0].midi, Number(result.position.slice(-1)) * 12);
          assert.equal(result.position === position, supportsInstrumentScalePosition(profile, root, position));
          assert.ok(result.notes.every((note, i) => !i || note.midi > result.notes[i - 1].midi));
        }
        if (position === 'all') assert.equal(result.notes.length, buildInstrumentNotes(profile.tuning, 0, 24, getScaleToneNames(root, scale)).length);
      }
    }
  }
});
const getScaleToneNames = (root, scale) => scale.intervals.map(interval => CHROMATIC_NOTES[(NOTE_INDEX[root] + interval) % 12]);

test('chord positions and omissions match the tuning across roots and chord families', () => {
  for (const profile of Object.values(VIEWER_PROFILES).filter(profile => profile.id !== 'guitar-6')) {
    for (const root of CHROMATIC_NOTES) for (const [quality, extensions] of Object.entries(CHORD_TONE_INTERVALS)) {
      for (const extension of Object.keys(extensions)) {
        const positions = buildInstrumentChordPositions(profile, { root, quality, extension });
        assert.ok(positions.position1, `${profile.id} ${root} ${quality} ${extension}`);
        for (const chord of Object.values(positions)) {
          const tones = getChordToneNames(root, quality, extension);
          assert.equal(new Set(chord.notes.map(note => note.stringNumber)).size, chord.notes.length);
          for (const note of chord.notes) {
            assert.equal(note.midi, profile.tuning[note.stringNumber - 1].midi + note.fretNumber);
            assert.ok(tones.includes(note.noteName));
            assert.ok(Number(note.finger) >= 0 && Number(note.finger) <= 4);
          }
          const played = new Set(chord.notes.map(note => note.noteName));
          assert.deepEqual(chord.voicing.omittedTones.map(tone => tone.noteName), tones.filter(tone => !played.has(tone)));
          for (const barre of chord.barres) for (let string = barre.fromString; string <= barre.toString; string++) {
            assert.ok(chord.notes.find(note => note.stringNumber === string)?.fretNumber >= barre.fret);
          }
        }
      }
    }
  }
});
