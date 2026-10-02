import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareInitialSurface } from '../src/launch/prepareInitialSurface.js';

function setup({ images = [], fonts = Promise.resolve(), paused = false } = {}) {
  const decoded = [];
  const frames = new Map();
  let frameCount = 0;
  let layouts = 0;
  const targetWindow = {
    innerWidth: 390, innerHeight: 844,
    setTimeout, clearTimeout,
    requestAnimationFrame(callback) {
      const id = ++frameCount;
      frames.set(id, paused ? null : setTimeout(() => { frames.delete(id); callback(); }, 0));
      return id;
    },
    cancelAnimationFrame(id) { clearTimeout(frames.get(id)); frames.delete(id); },
  };
  const root = {
    ownerDocument: { fonts: { ready: fonts }, defaultView: targetWindow },
    getBoundingClientRect() { layouts += 1; return { width: 390, height: 844 }; },
    querySelectorAll(selector) {
      assert.equal(selector, 'img');
      return images.map(({ id, bounds, ...overrides }) => ({
        complete: true, naturalWidth: 100, naturalHeight: 100,
        getBoundingClientRect: () => bounds ?? { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 },
        decode() { decoded.push(id); return Promise.resolve(); },
        ...overrides,
      }));
    },
  };
  return { root, decoded, frames, get frameCount() { return frameCount; }, get layouts() { return layouts; } };
}

test('startup prepares only loaded on-screen images and the same initial layout', async () => {
  const fixture = setup({ images: [
    { id: 'visible' },
    { id: 'pending', complete: false },
    { id: 'broken', naturalWidth: 0 },
    { id: 'offscreen', bounds: { left: 0, top: 900, right: 100, bottom: 1000, width: 100, height: 100 } },
    { id: 'inactive', bounds: { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 } },
    { id: 'oversized', naturalWidth: 5000, naturalHeight: 3000 },
  ] });
  assert.deepEqual(await prepareInitialSurface({ root: fixture.root }), { status: 'prepared', images: 1 });
  assert.deepEqual(fixture.decoded, ['visible']);
  assert.equal(fixture.layouts, 1);
  assert.equal(fixture.frames.size, 0);
});

test('startup image preparation has both count and pixel budgets', async () => {
  const count = setup({ images: Array.from({ length: 12 }, (_, id) => ({ id })) });
  assert.equal((await prepareInitialSurface({ root: count.root })).images, 6);
  const pixels = setup({ images: [
    { id: 1, naturalWidth: 2000, naturalHeight: 1500 },
    { id: 2, naturalWidth: 2000, naturalHeight: 1500 },
    { id: 3 },
  ] });
  await prepareInitialSurface({ root: pixels.root });
  assert.deepEqual(pixels.decoded, [1, 3]);
});

test('optional font or image decoding failures do not block entry', async () => {
  const fixture = setup({ images: [{ id: 'failed', decode() { throw new Error('unavailable'); } }] });
  assert.equal((await prepareInitialSurface({ root: fixture.root })).status, 'prepared');
});

test('a stalled font stops preparation at its budget and schedules no late layout work', async () => {
  let finishFont;
  const fonts = new Promise(resolve => { finishFont = resolve; });
  const fixture = setup({ fonts });
  assert.equal((await prepareInitialSurface({ root: fixture.root, budgetMs: 20 })).status, 'budget-reached');
  const frameCount = fixture.frameCount;
  finishFont();
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(fixture.frameCount, frameCount);
  assert.equal(fixture.layouts, 0);
  assert.equal(fixture.frames.size, 0);
});

test('background-tab frames cannot hold startup indefinitely', async () => {
  const fixture = setup({ paused: true });
  assert.equal((await prepareInitialSurface({ root: fixture.root, budgetMs: 10 })).status, 'budget-reached');
  assert.equal(fixture.frames.size, 0);
  assert.equal((await prepareInitialSurface()).status, 'skipped');
});
