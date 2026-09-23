import test from 'node:test';
import assert from 'node:assert/strict';
import {harmonyLabelLines} from '../src/etudes/harmonyLabelLayout.js';
const measure=s=>s.length*7;
test('long progressions wrap without dropping chords or shrinking the font',()=>{
 const value='Em7 → Am7 → Dm7 → Gsus4 → G';
 for(const width of [90,150,280]){
  const lines=harmonyLabelLines(value,width,measure);
  assert.ok(lines.every(s=>measure(s)<=width));assert.equal(lines.join(' '),value);
 }
});
test('short labels stay on one line and oversized imported tokens stay in bounds',()=>{
 assert.deepEqual(harmonyLabelLines('Cmaj7/G',120,measure),['Cmaj7/G']);
 const value='Cmaj7add9sus4/Ab';const lines=harmonyLabelLines(value,35,measure);
 assert.equal(lines.join(''),value);assert.ok(lines.every(s=>measure(s)<=35));
 assert.deepEqual(harmonyLabelLines('',100,measure),['']);
});
