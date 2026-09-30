import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRootScaleRoute } from '../src/fretboard/rootScale.js';
import { selectRootScalePractice } from '../src/fretboard/rootScalePractice.js';

test('each octave practice segment loops a complete root-to-root phrase without entering another segment', () => {
  for (const intervals of [[0,2,4,5,7,9,11], [0,2,3,5,7,8,10], [0,2,4,7,9], [0,3,5,7,10]]) {
    for (const root of ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']) {
      const route = buildRootScaleRoute(root, intervals).map(segment => segment.map(n => ({...n, id:`${n.stringNumber}-${n.fretNumber}`})));
      for (const octaves of [1,2]) {
        const segments = [];
        for(let i=0;i<route.length;i+=octaves) segments.push(route.slice(i,i+octaves).flatMap((notes,offset)=>offset?notes.slice(1):notes));
        const practice = {notes:route.flat(),sequence:route.flat(),rootScaleSegments:segments};
        for(let index=0;index<segments.length;index++) {
          const selected = selectRootScalePractice(practice,index);
          assert.equal(selected.sequence.length,intervals.length*octaves+1);
          assert.equal(selected.sequence[0].noteId,segments[index][0].id);
          assert.equal(selected.sequence.at(-1).noteId,segments[index].at(-1).id);
          assert.ok(selected.sequence.every(n=>n.rootScaleSegment===index));
          assert.deepEqual(Array.from({length:selected.sequence.length*3},(_,i)=>selected.sequence[i%selected.sequence.length].noteId),Array(3).fill(segments[index].map(n=>n.id)).flat());
          assert.strictEqual(selected.notes,segments[index]);
        }
        assert.strictEqual(selectRootScalePractice(practice),practice,'the full route remains available when no segment is selected');
      }
    }
  }
});

test('segment selection clamps at both ends and leaves ordinary box practice intact', () => {
  const practice={rootScaleSegments:[[{id:'first'}],[{id:'last'}]]};
  assert.equal(selectRootScalePractice(practice,-1).activeRootScaleSegment,0);
  assert.equal(selectRootScalePractice(practice,10).activeRootScaleSegment,1);
  const box={notes:[],sequence:[]};
  assert.strictEqual(selectRootScalePractice(box,0),box);
});
