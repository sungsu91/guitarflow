import assert from 'node:assert/strict';
import test from 'node:test';
import { APP_RESUME_AFTER_MS, observeAppResume } from '../src/launch/appResume.js';

function setup(standalone = true) {
  const targetWindow = new EventTarget();
  const document = new EventTarget();
  document.hidden = false;
  Object.assign(targetWindow, { document, navigator: { standalone } });
  let time = 0;
  let resumes = 0;
  const stop = observeAppResume({ targetWindow, now: () => time, onResume: () => { resumes++; } });
  return { targetWindow, document, stop, get resumes() { return resumes; },
    elapse(ms) { time += ms; },
    visibility(hidden) { document.hidden = hidden; document.dispatchEvent(new Event('visibilitychange')); },
  };
}

test('installed app reentry prepares again after a substantial background interval', () => {
  const f = setup();
  f.visibility(true); f.elapse(APP_RESUME_AFTER_MS); f.visibility(false);
  f.visibility(false);
  assert.equal(f.resumes, 1);
  f.stop(); f.visibility(true); f.elapse(APP_RESUME_AFTER_MS); f.visibility(false);
  assert.equal(f.resumes, 1);
});

test('short interruptions and ordinary desktop tab switching do not show a splash', () => {
  for (const standalone of [true, false]) {
    const f = setup(standalone);
    f.visibility(true); f.elapse(standalone ? 1000 : APP_RESUME_AFTER_MS * 2); f.visibility(false);
    assert.equal(f.resumes, 0);
    f.stop();
  }
});

test('restoring a frozen installed document waits until it is visible', () => {
  const f = setup();
  f.visibility(true);
  const event = new Event('pageshow'); event.persisted = true;
  f.targetWindow.dispatchEvent(event);
  assert.equal(f.resumes, 0);
  f.visibility(false);
  assert.equal(f.resumes, 1);
  f.stop();
});
