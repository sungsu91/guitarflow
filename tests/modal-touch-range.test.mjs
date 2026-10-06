import assert from 'node:assert/strict';
import test from 'node:test';
import { containModalTouch } from '../src/ui/modalScrollLock.js';

function fixture(t) {
  class FakeElement {
    constructor(parentElement = null, range = false, disabled = false) {
      Object.assign(this, { parentElement, range, disabled, scrollTop: 0, scrollLeft: 0,
        scrollHeight: 100, clientHeight: 100, scrollWidth: 100, clientWidth: 100,
        style: { overflowX: 'hidden', overflowY: 'auto' } });
    }
    closest() { return this.range && !this.disabled ? this : null; }
    contains(node) { return node === this || Boolean(node?.parentElement && this.contains(node.parentElement)); }
  }
  const oldElement = globalThis.Element;
  const oldGetComputedStyle = globalThis.getComputedStyle;
  globalThis.Element = FakeElement;
  globalThis.getComputedStyle = node => node.style;
  t.after(() => {
    if (oldElement === undefined) delete globalThis.Element;
    else globalThis.Element = oldElement;
    if (oldGetComputedStyle === undefined) delete globalThis.getComputedStyle;
    else globalThis.getComputedStyle = oldGetComputedStyle;
  });
  const handlers = new Map();
  const modal = new FakeElement(new FakeElement());
  modal.addEventListener = (type, listener) => handlers.set(type, listener);
  modal.removeEventListener = type => handlers.delete(type);
  const cleanup = containModalTouch(modal);
  const input = new FakeElement(modal, true);
  const content = new FakeElement(modal);
  const emit = (type, target, x, y) => {
    const event = { target, touches: [{ clientX: x, clientY: y }], cancelable: true,
      defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    handlers.get(type)(event);
    return event;
  };
  return { modal, input, content, emit, cleanup, handlers };
}

test('modal leaves enabled native range drags to the browser', t => {
  const f = fixture(t);
  f.emit('touchstart', f.input, 20, 20);
  assert.equal(f.emit('touchmove', f.input, 80, 24).defaultPrevented, false);
  assert.equal(f.emit('touchmove', f.input, 90, 80).defaultPrevented, false);
});

test('the next gesture on ordinary content is still contained', t => {
  const f = fixture(t);
  f.emit('touchstart', f.input, 20, 20);
  f.emit('touchmove', f.input, 80, 20);
  f.emit('touchstart', f.content, 20, 20);
  assert.equal(f.emit('touchmove', f.content, 80, 20).defaultPrevented, true);
});

test('disabled ranges do not bypass modal scroll containment', t => {
  const f = fixture(t);
  f.input.disabled = true;
  f.emit('touchstart', f.input, 20, 20);
  assert.equal(f.emit('touchmove', f.input, 80, 20).defaultPrevented, true);
});

test('inner content scrolls until its boundary and listeners detach', t => {
  const f = fixture(t);
  f.modal.scrollHeight = 300;
  f.emit('touchstart', f.content, 20, 100);
  assert.equal(f.emit('touchmove', f.content, 20, 80).defaultPrevented, false);
  f.modal.scrollTop = 200;
  assert.equal(f.emit('touchmove', f.content, 20, 60).defaultPrevented, true);
  f.cleanup();
  assert.equal(f.handlers.size, 0);
});
