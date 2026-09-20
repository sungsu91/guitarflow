import assert from "node:assert/strict";
import test from "node:test";
import { syncMiniChordProgressAnimation } from "../src/mini-chord/progressAnimation.js";

test("progress reuses its compositor animation and catches up to the audio clock", () => {
  const animations = [];
  const element = { animate(keyframes, timing) {
    const animation = { currentTime: 0, cancelled: false, cancel() { this.cancelled = true; }, timing, keyframes };
    animations.push(animation);
    return animation;
  } };
  const position = { slotIndex: 0, progress: 0.2, stepSeconds: 0.5, originTime: 10 };
  let state = syncMiniChordProgressAnimation(null, element, position);
  assert.equal(state.animation.currentTime, 100);
  assert.equal(state.animation.timing.duration, 500);
  const previous = state;
  state.animation.currentTime = 150;
  state = syncMiniChordProgressAnimation(state, element, { ...position, progress: 0.3 });
  assert.equal(state, previous);
  assert.equal(animations.length, 1);
  state = syncMiniChordProgressAnimation(state, element, { ...position, progress: 0.9 });
  assert.equal(state.animation.currentTime, 450);
  assert.equal(animations.length, 1, "resuming a delayed frame must not replay from zero");
  state = syncMiniChordProgressAnimation(state, element, { ...position, originTime: 20, progress: 0 });
  assert.equal(animations[0].cancelled, true);
  assert.equal(state.animation.currentTime, 0, "seeking the same slot must reset its animation");
  assert.equal(syncMiniChordProgressAnimation(state, null, position), null);
  assert.equal(animations[1].cancelled, true);
});
