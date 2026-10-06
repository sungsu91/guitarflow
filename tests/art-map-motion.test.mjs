import assert from 'node:assert/strict';
import test from 'node:test';
import { createArtMapMotion, getArtMapCover } from '../src/shooter/maps/artMapMotion.js';

test('motion uses the same bottom-aligned cover crop as each platform poster', () => {
  for (const [iw, ih, w, h] of [[2048,1152,790,885], [1024,2048,390,700], [2048,1152,1440,850], [1024,2048,360,720]]) {
    const {scale,offset} = getArtMapCover(iw,ih,w,h);
    assert.ok(scale.every(value => value > 0 && value <= 1));
    assert.ok(Math.abs(scale[0] * iw / (scale[1] * ih) - w / h) < 1e-10);
    assert.ok(Math.abs(offset[1] + scale[1] - 1) < 1e-10, 'the guitar floor is retained');
    assert.ok(Math.abs(offset[0] * 2 + scale[0] - 1) < 1e-10);
  }
});

function fixture() {
  const callbacks = new Map(), listeners = new Map(), canvasListeners = new Map();
  let next = 0, draws = 0, deletes = 0;
  const gl = new Proxy({}, { get(_, key) {
    if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
    if (key === 'isContextLost') return () => false;
    if (key === 'drawArrays') return () => { draws++; };
    if (String(key).startsWith('delete')) return () => { deletes++; };
    return () => ({});
  } });
  const documentObject = { hidden: false, addEventListener: (name,fn) => listeners.set(name,fn), removeEventListener: name => listeners.delete(name) };
  const windowObject = { devicePixelRatio: 3,
    requestAnimationFrame: fn => { callbacks.set(++next,fn); return next; }, cancelAnimationFrame: id => callbacks.delete(id),
    ResizeObserver: class { observe() {} disconnect() {} },
  };
  documentObject.defaultView = windowObject;
  const canvas = { ownerDocument: documentObject, dataset: {}, getContext: () => gl,
    getBoundingClientRect: () => ({width:1920,height:1080}),
    addEventListener: (name,fn) => canvasListeners.set(name,fn), removeEventListener: name => canvasListeners.delete(name),
  };
  const advance = now => { const pending=[...callbacks.values()]; callbacks.clear(); for (const fn of pending) fn(now); };
  return {canvas,advance,listeners,canvasListeners,documentObject,callbacks,get draws(){return draws;},get deletes(){return deletes;}};
}

test('scenery pauses without advancing its clock, respects tab visibility, and disposes GPU resources', () => {
  const f=fixture(); let ready=0;
  const motion=createArtMapMotion(f.canvas,{naturalWidth:2048,naturalHeight:1152},'silk-theatre',{onReady:()=>ready++});
  assert.equal(ready,1); assert.equal(f.draws,1); assert.equal(f.callbacks.size,0);
  assert.ok(f.canvas.width * f.canvas.height < 1_002_000);
  motion.setActive(true); f.advance(100); f.advance(150);
  const before=f.canvas.dataset.motionTime;
  assert.ok(Number(before)>0);
  motion.setActive(false); f.advance(2000); assert.equal(f.canvas.dataset.motionTime,before);
  motion.setActive(true); f.advance(3000); f.advance(3040);
  assert.ok(Number(f.canvas.dataset.motionTime) <= Number(before)+80, 'resume must not jump by paused duration');
  f.documentObject.hidden=true; f.listeners.get('visibilitychange')(); assert.equal(f.callbacks.size,0);
  f.documentObject.hidden=false; f.listeners.get('visibilitychange')(); assert.equal(f.callbacks.size,1);
  motion.dispose(); assert.equal(f.callbacks.size,0); assert.equal(f.listeners.size,0); assert.equal(f.canvasListeners.size,0); assert.equal(f.deletes,5);
});

test('unavailable or lost WebGL leaves the still artwork usable', () => {
  let failures=0;
  assert.equal(createArtMapMotion({getContext:()=>null}, {}, 'glass-garden', {onFailure:()=>failures++}),null);
  const f=fixture();
  const motion=createArtMapMotion(f.canvas,{naturalWidth:2048,naturalHeight:1152},'glass-garden',{onFailure:()=>failures++});
  motion.setActive(true);
  f.canvasListeners.get('webglcontextlost')({preventDefault(){}});
  motion.setActive(true);
  assert.equal(f.callbacks.size,0); assert.equal(failures,2); motion.dispose();
});
