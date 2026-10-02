import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_PREPARED_MODES, prepareAppModes } from '../src/launch/prepareAppModes.js';
import { getCachedModeElement } from '../src/navigation/keepAlive.js';

function fixture() {
  const markers = new Set(INITIAL_PREPARED_MODES);
  const observers = new Set();
  const root = {
    ownerDocument: { defaultView: { MutationObserver: class {
      constructor(check) { this.check = check; }
      observe() { observers.add(this); }
      disconnect() { observers.delete(this); }
    } } },
    querySelector(selector) { return markers.has(selector.match(/"([^"]+)"/)[1]); },
  };
  return { root, markers, observers, commit(mode) {
    markers.add(mode);
    for (const observer of [...observers]) observer.check();
  } };
}

test('startup waits for actual hidden DOM commits and image decoding', async () => {
  const f = fixture();
  let finishImages;
  let mounted;
  let ready = false;
  const preparation = prepareAppModes({
    root: f.root, loaders: [['rhythm-trainer', async () => {}]],
    prepareImages: () => new Promise(resolve => { finishImages = resolve; }),
    mountModes: modes => { mounted = modes; },
  }).then(result => { ready = true; return result; });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(mounted, ['rhythm-trainer']);
  assert.equal(ready, false);
  f.commit('rhythm-trainer');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ready, false);
  finishImages();
  assert.equal(await preparation, 'modes-prepared');
  assert.equal(f.observers.size, 0);
});

test('an optional failed import leaves the current screen usable', async () => {
  const f = fixture();
  let mounted;
  assert.equal(await prepareAppModes({
    root: f.root, loaders: [['etudes', async () => { throw Error('offline'); }]],
    prepareImages: async () => {}, mountModes: modes => { mounted = modes; },
  }), 'modes-prepared');
  assert.deepEqual(mounted, []);
});

test('a stalled import times out and cannot mount a late screen after entry', async () => {
  const f = fixture();
  let finishImport;
  const mounted = [];
  assert.equal(await prepareAppModes({
    root: f.root, budgetMs: 15,
    loaders: [['etudes', () => new Promise(resolve => { finishImport = resolve; })]],
    prepareImages: async () => {}, mountModes: modes => { mounted.push(...modes); },
  }), 'budget-reached');
  finishImport();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(mounted, INITIAL_PREPARED_MODES);
  assert.equal(f.observers.size, 0);
});

test('startup creates an inactive mode once and keeps its element for navigation', () => {
  const cache = new Map();
  let renders = 0;
  const build = () => ({ id: ++renders });
  const prepared = getCachedModeElement('fretboard-viewer', cache, 'tuner', build, true);
  assert.equal(getCachedModeElement('metronome', cache, 'tuner', build, true), prepared);
  assert.equal(renders, 1);
  assert.deepEqual(getCachedModeElement('tuner', cache, 'tuner', build, true), { id: 2 });
});
