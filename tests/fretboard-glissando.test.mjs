import test from 'node:test';
import assert from 'node:assert/strict';
import {containsNotePoint, notesAlongSegment} from '../src/fretboard/noteGlissando.js';

const notes = [0, 1, 2, 3].map(index => ({key: index, x: index * 40, y: 20, radius: 12}));

test('a single fast move includes intermediate notes in travel order', () => {
  assert.deepEqual(notesAlongSegment({x: -20, y: 20}, {x: 140, y: 20}, notes).map(n => n.key), [0, 1, 2, 3]);
  assert.deepEqual(notesAlongSegment({x: 140, y: 20}, {x: -20, y: 20}, notes).map(n => n.key), [3, 2, 1, 0]);
});

test('diagonal travel hits only crossed notes rather than every fret in its bounding box', () => {
  const diagonal = [{key: 'a', x: 0, y: 0, radius: 10}, {key: 'b', x: 40, y: 40, radius: 10}, {key: 'miss', x: 0, y: 40, radius: 10}];
  assert.deepEqual(notesAlongSegment({x: -20, y: -20}, {x: 60, y: 60}, diagonal).map(n => n.key), ['a', 'b']);
});

test('stationary press and entry/exit boundaries are handled without extending the path', () => {
  assert.deepEqual(notesAlongSegment({x: 40, y: 20}, {x: 40, y: 20}, notes).map(n => n.key), [1]);
  assert.deepEqual(notesAlongSegment({x: 18, y: 20}, {x: 20, y: 20}, notes), []);
  assert(containsNotePoint(notes[1], {x: 40, y: 25}));
  assert(!containsNotePoint(notes[1], {x: 40, y: 40}));
  assert.deepEqual(notesAlongSegment({x: 40, y: 20}, {x: 55, y: 20}, notes).map(n => n.key), [1]);
});
