import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChordSymbol,compactChordLabel} from '../src/chords/chordSymbols.js';
import {harmonyLabelLines} from '../src/etudes/harmonyLabelLayout.js';
import {shapeForChordName} from '../src/etudes/arpeggioChords.js';
import {createBlankDocument} from '../src/etudes/scoreModel.js';

test('compact maj7(6) spellings preserve the extension, slash bass and generated voicing',()=>{
 for(const root of ['C','F#','Bb']){
  const compact=parseChordSymbol(`${root}maj7(6)/G`),old=parseChordSymbol(`${root}maj7add6/G`);
  assert.equal(compact.name,`${root}maj7(6)/G`);assert.deepEqual(compact,old);
  assert.deepEqual(compact.intervals,[0,4,7,9,11]);assert.equal(parseChordSymbol(`${root}M7(6)`).name,`${root}maj7(6)`);
  const d=createBlankDocument();assert.deepEqual(shapeForChordName(d,compact.name),shapeForChordName(d,`${root}maj7add6/G`));
 }
 for(const name of ['Cadd6','C6','Cadd9','Cmaj7','Emadd9','D6/9'])assert.equal(compactChordLabel(name),name);
});

test('old saved labels use compact text before measuring or rendering, including multiple chords',()=>{
 assert.equal(compactChordLabel('Cmaj7add6 F#maj7add6/B Bbmaj7add6'),'Cmaj7(6) F#maj7(6)/B Bbmaj7(6)');
 assert.deepEqual(harmonyLabelLines('Cmaj7add6',8,s=>s.length),['Cmaj7(6)']);
});
