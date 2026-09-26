import test from 'node:test';
import assert from 'node:assert/strict';
import { GUIDE_METERS, GUIDE_FAMILIES, guidePatterns } from '../src/rhythm-trainer/guideModel.js';
import { GUIDE_FAMILY_EN, guidePatternTitle } from '../src/rhythm-trainer/guideLabels.js';

test('every built-in guide family and meter has English presentation without changing pattern data', () => {
  for (const [family] of GUIDE_FAMILIES) assert.ok(GUIDE_FAMILY_EN[family]);
  for (const meter of GUIDE_METERS) for (const pattern of guidePatterns(meter)) {
    const before = structuredClone(pattern);
    assert.equal(guidePatternTitle(pattern, meter, 'ko'), pattern.title);
    const title = guidePatternTitle(pattern, meter, 'en');
    assert.ok(title.length);
    assert.doesNotMatch(title, /[가-힣]/, `${meter}: ${pattern.id}`);
    assert.deepEqual(pattern, before);
  }
});

test('guide keeps user-authored titles while translating its own suffix', () => {
  const pattern = {id:'pack-core',title:'나의 연습 · 핵심 패턴'};
  assert.equal(guidePatternTitle(pattern, '4/4', 'en'), '나의 연습 · core pattern');
});
