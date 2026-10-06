import test from 'node:test';
import assert from 'node:assert/strict';
import { getMobileViewportBounds } from '../src/layouts/mobileViewportBounds.js';

function phone(visual = {}, layout = {}) {
  const width = layout.width ?? 393, height = layout.height ?? 852;
  return {
    innerWidth: width, innerHeight: height,
    document: { documentElement: { clientWidth: width, clientHeight: height } },
    matchMedia: () => ({ matches: true }),
    visualViewport: { width, height, offsetTop: 0, scale: 1, ...visual },
  };
}

test('browser bars and keyboard use the visible bottom, without accumulating insets', () => {
  const target = phone();
  for (const height of [852, 730, 410, 730, 852, 730, 852]) {
    target.visualViewport.height = height;
    assert.deepEqual(getMobileViewportBounds(target), { left: 0, top: 0, width: 393, height, bottom: height });
  }
});

test('visible viewport offsets are respected but rubber-band overshoot is clamped', () => {
  assert.equal(getMobileViewportBounds(phone({ height: 600, offsetTop: 100 })).bottom, 700);
  assert.equal(getMobileViewportBounds(phone({ height: 852, offsetTop: 34 })).bottom, 852);
  assert.equal(getMobileViewportBounds(phone({ height: 730, offsetTop: -40 })).bottom, 730);
  assert.equal(getMobileViewportBounds(phone({ height: 900 })).bottom, 852);
});

test('pinch zoom does not cause the chrome to rescale a second time', () => {
  assert.deepEqual(getMobileViewportBounds(phone({ width: 196.5, height: 426, scale: 2, offsetTop: 80 })),
    { left: 0, top: 0, width: 393, height: 852, bottom: 852 });
});

test('rotation ignores a stale portrait visual viewport until its width settles', () => {
  assert.equal(getMobileViewportBounds(phone({ width: 393, height: 852 }, { width: 852, height: 393 })).bottom, 393);
  assert.equal(getMobileViewportBounds(phone({ width: 852, height: 320 }, { width: 852, height: 393 })).bottom, 320);
});

test('browsers without visualViewport fall back to their layout viewport', () => {
  const target = phone();
  delete target.visualViewport;
  assert.equal(getMobileViewportBounds(target).bottom, 852);
});
