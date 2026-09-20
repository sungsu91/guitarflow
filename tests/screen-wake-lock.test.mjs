import test from 'node:test';
import assert from 'node:assert/strict';
import { keepScreenAwake } from '../src/ui/screenWakeLock.js';

const settle = () => new Promise(resolve => setImmediate(resolve));
function fixture(request) {
  const doc = new EventTarget();
  doc.visibilityState = 'visible';
  const win = new EventTarget();
  const locks = [];
  const nav = { wakeLock: { request: request || (async type => {
    assert.equal(type, 'screen');
    const lock = new EventTarget();
    lock.released = false;
    lock.release = async () => { lock.released = true; lock.dispatchEvent(new Event('release')); };
    locks.push(lock);
    return lock;
  }) } };
  return { doc, win, nav, locks };
}

test('idle app stays awake, background releases, returning reacquires, cleanup releases', async () => {
  const f = fixture();
  const stop = keepScreenAwake(f.doc, f.nav, f.win);
  await settle();
  assert.equal(f.locks.length, 1);
  f.doc.dispatchEvent(new Event('pointerdown'));
  await settle();
  assert.equal(f.locks.length, 1);
  f.doc.visibilityState = 'hidden';
  f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.locks[0].released, true);
  f.doc.visibilityState = 'visible';
  f.doc.dispatchEvent(new Event('visibilitychange'));
  await settle();
  assert.equal(f.locks.length, 2);
  stop();
  assert.equal(f.locks[1].released, true);
  f.doc.dispatchEvent(new Event('pointerdown'));
  await settle();
  assert.equal(f.locks.length, 2);
});

test('late acquisition after unmount releases immediately', async () => {
  let resolve;
  const f = fixture(() => new Promise(r => { resolve = r; }));
  const stop = keepScreenAwake(f.doc, f.nav, f.win);
  stop();
  let released = false;
  resolve({ release: async () => { released = true; } });
  await settle();
  assert.equal(released, true);
});

test('system revocation does not trigger a retry loop', async () => {
  const f = fixture();
  const stop = keepScreenAwake(f.doc, f.nav, f.win);
  await settle();
  await f.locks[0].release();
  await settle();
  assert.equal(f.locks.length, 1);
  stop();
});

test('denied and unavailable APIs do not break the app', async () => {
  const f = fixture(async () => { throw new Error('NotAllowedError'); });
  const stop = keepScreenAwake(f.doc, f.nav, f.win);
  await settle();
  stop();
  keepScreenAwake(f.doc, {}, f.win)();
});
