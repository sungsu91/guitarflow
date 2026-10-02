import test from 'node:test';
import assert from 'node:assert/strict';
import { connectAmbientVideoPlayback } from '../src/shooter/ambientVideoPlayback.js';

function fixture() {
  const documentObject = new EventTarget();
  documentObject.hidden = false;
  documentObject.defaultView = new EventTarget();
  const video = new EventTarget();
  Object.assign(video, { ownerDocument: documentObject, readyState: 2, plays: 0, pauses: 0,
    play() { this.plays++; return Promise.resolve(); }, pause() { this.pauses++; } });
  return { video, documentObject };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('ambient playback is silent, loops, and stops when the tab is hidden', async () => {
  const { video, documentObject } = fixture();
  let ready = 0;
  const dispose = connectAmbientVideoPlayback(video, { onReady: () => ready++ });
  await settle();
  assert.equal(ready, 1);
  assert.equal(video.muted && video.defaultMuted && video.loop && video.playsInline, true);
  documentObject.hidden = true;
  documentObject.dispatchEvent(new Event('visibilitychange'));
  assert.equal(video.pauses, 1);
  documentObject.hidden = false;
  documentObject.dispatchEvent(new Event('visibilitychange'));
  await settle();
  assert.equal(video.plays, 2);
  dispose();
  documentObject.dispatchEvent(new Event('visibilitychange'));
  video.dispatchEvent(new Event('canplay'));
  assert.equal(video.plays, 2);
});

test('a paused game and an unready video do not start playback', async () => {
  const { video, documentObject } = fixture();
  let dispose = connectAmbientVideoPlayback(video, { paused: true });
  video.dispatchEvent(new Event('canplay'));
  documentObject.dispatchEvent(new Event('pointerdown'));
  documentObject.defaultView.dispatchEvent(new Event('pageshow'));
  assert.equal(video.plays, 0);
  dispose();
  video.readyState = 0;
  dispose = connectAmbientVideoPlayback(video);
  assert.equal(video.plays, 0);
  video.readyState = 3;
  video.dispatchEvent(new Event('canplay'));
  await settle();
  assert.equal(video.plays, 1);
  dispose();
});

test('decode and unsupported playback failures fall back once', async () => {
  for (const mode of ['decode', 'unsupported']) {
    const { video, documentObject } = fixture();
    let failures = 0;
    if (mode === 'unsupported') video.play = () => Promise.reject(new DOMException('Unsupported', 'NotSupportedError'));
    const dispose = connectAmbientVideoPlayback(video, { onFailure: () => failures++ });
    if (mode === 'decode') video.dispatchEvent(new Event('error'));
    await settle();
    documentObject.dispatchEvent(new Event('visibilitychange'));
    video.dispatchEvent(new Event('error'));
    assert.equal(failures, 1);
    dispose();
  }
});

test('temporary autoplay rejection recovers on a gesture without falling back to a still image', async () => {
  const { video, documentObject } = fixture();
  let ready = 0;
  let failures = 0;
  video.play = () => ++video.plays === 1
    ? Promise.reject(new DOMException('Gesture required', 'NotAllowedError'))
    : Promise.resolve();
  const dispose = connectAmbientVideoPlayback(video, {
    onReady: () => ready++, onFailure: () => failures++,
  });
  await settle();
  assert.equal(failures, 0);
  assert.equal(ready, 0);
  documentObject.dispatchEvent(new Event('pointerdown'));
  await settle();
  assert.equal(ready, 1);
  dispose();
  documentObject.dispatchEvent(new Event('pointerdown'));
  documentObject.dispatchEvent(new Event('keydown'));
  documentObject.defaultView.dispatchEvent(new Event('pageshow'));
  assert.equal(video.plays, 2);
});

test('page restoration retries interrupted playback and coalesces pending starts', async () => {
  const { video, documentObject } = fixture();
  let rejectStart;
  video.play = () => { video.plays++; return new Promise((_, reject) => { rejectStart = reject; }); };
  const dispose = connectAmbientVideoPlayback(video);
  video.dispatchEvent(new Event('canplay'));
  documentObject.dispatchEvent(new Event('keydown'));
  assert.equal(video.plays, 1);
  rejectStart(new DOMException('Interrupted', 'AbortError'));
  await settle();
  video.play = () => { video.plays++; return Promise.resolve(); };
  documentObject.defaultView.dispatchEvent(new Event('pageshow'));
  await settle();
  assert.equal(video.plays, 2);
  dispose();
});

test('late play completion from a removed view cannot update or pause its replacement', async () => {
  const { video } = fixture();
  let finish;
  let ready = 0;
  video.play = () => new Promise(resolve => { finish = resolve; });
  const dispose = connectAmbientVideoPlayback(video, { onReady: () => ready++ });
  dispose();
  finish();
  await settle();
  assert.equal(ready, 0);
  assert.equal(video.pauses, 1);
});

test('leaving the viewport pauses playback and disposal releases the observer', async () => {
  const { video, documentObject } = fixture();
  let observe;
  let disconnected = false;
  documentObject.defaultView.IntersectionObserver = class {
    constructor(callback) { observe = callback; }
    observe(element) { assert.equal(element, video); }
    disconnect() { disconnected = true; }
  };
  const dispose = connectAmbientVideoPlayback(video);
  await settle();
  observe([{ isIntersecting: false }]);
  assert.equal(video.pauses, 1);
  observe([{ isIntersecting: true }]);
  await settle();
  assert.equal(video.plays, 2);
  dispose();
  assert.equal(disconnected, true);
});
