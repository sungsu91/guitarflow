import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { SCALE_DEFINITIONS, SCALE_OPTIONS, getScaleDefinition, getScalePatterns } from '../src/fretboard/scaleCatalog.js';
import { selectRootScalePractice } from '../src/fretboard/rootScalePractice.js';

// Independent C-tonic pitch fixtures, using the app's existing sharp spelling.
const expectedNotes = {
  'major-scale': 'C D E F G A B',
  'minor-scale': 'C D D# F G G# A#',
  'major-pentatonic': 'C D E G A',
  'minor-pentatonic': 'C D# F G A#',
  'major-blues': 'C D D# E G A',
  'minor-blues': 'C D# F F# G A#',
  dorian: 'C D D# F G A A#',
  phrygian: 'C C# D# F G G# A#',
  lydian: 'C D E F# G A B',
  mixolydian: 'C D E F G A A#',
  locrian: 'C C# D# F F# G# A#',
  'harmonic-minor': 'C D D# F G G# B',
  'melodic-minor': 'C D D# F G A B',
  'phrygian-dominant': 'C C# E F G G# A#',
  'lydian-dominant': 'C D E F# G A A#',
  altered: 'C C# D# E F# G# A#',
};
const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const tuning = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };
let server, build;
before(async () => {
  server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
  build = (await server.ssrLoadModule('/src/App.jsx')).buildNamedScalePractice;
});
after(async () => { await server?.close(); });

function verifyNote(note, tonic, allowed, context) {
  assert.ok(Number.isInteger(note.fretNumber) && note.fretNumber >= 0 && note.fretNumber <= 18, context);
  const midi = tuning[note.stringNumber] + note.fretNumber;
  assert.equal(note.pitch, `${keys[midi % 12]}${Math.floor(midi / 12) - 1}`, context);
  assert.ok(allowed.includes((midi - tonic + 120) % 12), `${context}: non-scale pitch ${note.pitch}`);
  assert.ok(Math.abs(note.frequency - 440 * 2 ** ((midi - 69) / 12)) < 0.01, `${context}: frequency`);
  return midi;
}

test('catalog has 16 distinct named scales with independently verified pitch formulas', () => {
  assert.deepEqual(SCALE_OPTIONS.map(scale => scale.id), Object.keys(expectedNotes));
  assert.equal(new Set(SCALE_OPTIONS.map(scale => scale.label)).size, 16);
  for (const scale of SCALE_DEFINITIONS) {
    assert.deepEqual(scale.intervals.map(interval => keys[interval]), expectedNotes[scale.id].split(' '), scale.id);
    if (scale.parent) {
      const relative = getScaleDefinition(scale.parent).intervals.map(n => (n - scale.parentTonicOffset + 12) % 12).sort((a, b) => a - b);
      assert.deepEqual(scale.intervals, relative, `${scale.id}: parent mode`);
    }
  }
  assert.deepEqual(getScaleDefinition('major-scale').aliases, ['Ionian']);
  assert.ok(getScaleDefinition('minor-scale').aliases.includes('Aeolian'));
  assert.equal(getScaleDefinition('melodic-minor').direction, 'same-both-directions');
});

test('all 960 scale / key / BOX combinations have correct tuning, complete scale tones, roots and connected positions', () => {
  for (const [scaleId, names] of Object.entries(expectedNotes)) for (const [tonic, key] of keys.entries()) {
    const allowed = names.split(' ').map(name => keys.indexOf(name));
    const practices = [];
    for (let box = 1; box <= 5; box += 1) {
      const context = `${key} ${scaleId} BOX ${box}`;
      const practice = build(key, scaleId, box);
      practices.push(practice);
      assert.equal(practice.displayBox, box, context);
      assert.equal(practice.scale.id, scaleId, context);
      assert.match(practice.label, new RegExp(getScaleDefinition(scaleId).label), context);
      const midis = practice.notes.map(note => verifyNote(note, tonic, allowed, context));
      assert.deepEqual([...new Set(midis.map(midi => (midi - tonic + 120) % 12))].sort((a, b) => a - b), allowed, context);
      assert.equal(new Set(practice.notes.map(note => note.id)).size, practice.notes.length, context);
      assert.equal(new Set(practice.notes.map(note => note.stringNumber)).size, 6, context);
      assert.equal(practice.visibleFrets[0], Math.min(...practice.notes.map(note => note.fretNumber)), context);
      assert.equal(practice.visibleFrets.at(-1), Math.max(...practice.notes.map(note => note.fretNumber)), context);
      assert.ok(practice.visibleFrets.length <= 7, `${context}: excessive stretch`);
      assert.deepEqual(practice.sequence, [...new Set(practice.notes.map(note => note.pitch))], context);
      assert.deepEqual([...midis].sort((a, b) => a - b), midis, `${context}: ascending order`);
    }
    assert.equal(new Set(practices.map(practice => practice.sourceBox)).size, 5);
    for (let i = 1; i < practices.length; i += 1) {
      assert.ok(practices[i].visibleFrets[0] > practices[i - 1].visibleFrets[0], `${key} ${scaleId}: box order`);
      assert.ok(practices[i].visibleFrets[0] <= practices[i - 1].visibleFrets.at(-1), `${key} ${scaleId}: connected boxes`);
    }
  }
});

test('all 384 root-position combinations retain complete one/two-octave phrases and reversible playback', () => {
  for (const [scaleId, names] of Object.entries(expectedNotes)) for (const [tonic, key] of keys.entries()) for (const octaves of [1, 2]) {
    const allowed = names.split(' ').map(name => keys.indexOf(name));
    const context = `${key} ${scaleId} root-${octaves}`;
    const practice = build(key, scaleId, `root-${octaves}`);
    assert.equal(practice.rootScaleSegments.length, 4 / octaves, context);
    practice.rootScaleSegments.forEach((segment, index) => {
      const midis = segment.map(note => verifyNote(note, tonic, allowed, context));
      const expected = Array.from({ length: octaves }, (_, octave) => allowed.map(n => n + octave * 12)).flat();
      expected.push(octaves * 12);
      assert.equal(midis[0] % 12, tonic, context);
      assert.deepEqual(midis.map(midi => midi - midis[0]), expected, context);
      assert.deepEqual([...midis].reverse().map(midi => midi - midis[0]), [...expected].reverse(), context);
      const selected = selectRootScalePractice(practice, index);
      assert.equal(selected.sequence.length, allowed.length * octaves + 1, context);
      assert.ok(selected.sequence.every(note => note.rootScaleSegment === index), context);
    });
  }
});

test('blues adds only passing blue notes and preserves every original pentatonic fingering', () => {
  for (const type of ['major', 'minor']) {
    const pentatonic = getScalePatterns(`${type}-pentatonic`);
    const blues = getScalePatterns(`${type}-blues`);
    for (let index = 0; index < 5; index += 1) {
      assert.equal(blues[index].startOffset, pentatonic[index].startOffset);
      for (const string of Object.keys(tuning)) {
        assert.ok(pentatonic[index].stringOffsets[string].every(offset => blues[index].stringOffsets[string].includes(offset)));
      }
    }
  }
});

test('blues includes every blue-note location in the displayed box across all 12 keys', () => {
  for (const [tonic, root] of keys.entries()) for (const type of ['major', 'minor']) for (let box = 1; box <= 5; box += 1) {
    const context = `${root} ${type} blues BOX ${box}`;
    const pentatonic = build(root, `${type}-pentatonic`, box);
    const blues = build(root, `${type}-blues`, box);
    const bluePitchClass = (tonic + (type === 'major' ? 3 : 6)) % 12;
    const expected = new Set(pentatonic.notes.map(note => `${note.stringNumber}:${note.fretNumber}`));
    for (const [string, openMidi] of Object.entries(tuning)) for (const fret of pentatonic.visibleFrets) {
      if ((openMidi + fret) % 12 === bluePitchClass) expected.add(`${string}:${fret}`);
    }
    assert.deepEqual(blues.visibleFrets, pentatonic.visibleFrets, `${context}: unchanged box range`);
    assert.ok(blues.notes.length > pentatonic.notes.length, `${context}: visibly distinct scales`);
    assert.deepEqual(new Set(blues.notes.map(note => `${note.stringNumber}:${note.fretNumber}`)), expected, context);
  }
  const aMinorBlues = build('A', 'minor-blues', 2);
  assert.ok(aMinorBlues.notes.some(note => note.stringNumber === 3 && note.fretNumber === 8 && note.pitch === 'D#4'));
  assert.ok(aMinorBlues.sequence.includes('D#4'), 'the previously omitted blue note is also practiced');
});

test('all 192 full-scale views contain exactly every matching string/fret from open strings to fret 24', () => {
  for (const [id, names] of Object.entries(expectedNotes)) for (const [tonic, root] of keys.entries()) {
    const context = `${root} ${id} all`;
    const allowed = new Set(names.split(' ').map(name => (keys.indexOf(name) + tonic) % 12));
    const expected = new Map();
    for (const [string, openMidi] of Object.entries(tuning)) for (let fret = 0; fret <= 24; fret += 1) {
      const midi = openMidi + fret;
      if (allowed.has(midi % 12)) expected.set(`${string}:${fret}`, `${keys[midi % 12]}${Math.floor(midi / 12) - 1}`);
    }
    const practice = build(root, id, 'all');
    assert.equal(practice.allPositions, true, context);
    assert.equal(practice.displayBox, 'all', context);
    assert.deepEqual(practice.visibleFrets, Array.from({ length: 25 }, (_, fret) => fret), context);
    assert.deepEqual(new Map(practice.notes.map(note => [`${note.stringNumber}:${note.fretNumber}`, note.pitch])), expected, context);
    assert.equal(practice.notes.length, expected.size, `${context}: no duplicates`);
    assert.deepEqual(practice.sequence, [...new Set(practice.notes.map(note => note.pitch))], context);
    assert.ok(practice.notes.every(note => Number.isFinite(note.frequency)), context);
    assert.strictEqual(selectRootScalePractice(practice, 0), practice, 'all positions are not an octave segment');
  }
});
