import test from 'node:test';
import assert from 'node:assert/strict';
import { ETUDES } from '../src/etudes/catalog.js';
import { ETUDE_DIFFICULTY_RATINGS, etudeDifficulty } from '../src/etudes/difficultyRatings.js';

test('every supplied study has an explicit rating on the five-star half-step scale', () => {
  assert.deepEqual(Object.keys(ETUDE_DIFFICULTY_RATINGS).sort(), ETUDES.map(score => score.templateId).sort());
  const before = JSON.stringify(ETUDES);
  for (const score of ETUDES) {
    const rating = etudeDifficulty(score);
    assert.ok(rating >= .5 && rating <= 5, score.id);
    assert.ok(Number.isInteger(rating * 2), score.id);
  }
  assert.equal(JSON.stringify(ETUDES), before);
  assert.ok(new Set(ETUDES.map(etudeDifficulty)).size > 3);
});

test('a supplied rating is not attributed to an edited or saved copy', () => {
  const original = ETUDES[0];
  assert.equal(etudeDifficulty({ ...original, edited: true }), null);
  assert.equal(etudeDifficulty({ ...original, document: { ...original.document, kind: 'user' } }), null);
  assert.equal(etudeDifficulty({ ...original, kind: 'user' }), null);
  assert.equal(etudeDifficulty({ templateId: 'custom', kind: 'user' }), null);
  assert.equal(etudeDifficulty({ templateId: 'unknown' }), null);
  assert.equal(etudeDifficulty(null), null);
});
