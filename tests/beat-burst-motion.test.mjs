import assert from 'node:assert/strict';
import test from 'node:test';
import { createBeatBurstParticles, getBeatBurstPose, BEAT_BURST_CYCLE_SECONDS } from '../src/launch/beatBurstMotion.js';

for (const mobile of [false, true]) {
  const width = mobile ? 390 : 1920, height = mobile ? 844 : 1080;
  const particles = createBeatBurstParticles(mobile);
  test(`Beat Burst ${mobile ? 'mobile' : 'desktop'} repeats without a visible respawn`, () => {
    for (const p of particles) {
      const first = getBeatBurstPose(p, 0, width, height, mobile);
      const repeated = getBeatBurstPose(p, BEAT_BURST_CYCLE_SECONDS * 5, width, height, mobile);
      for (const field of Object.keys(first)) assert.ok(Math.abs(first[field] - repeated[field]) < 1e-8);
      const reset = (1 - p.phase) * BEAT_BURST_CYCLE_SECONDS;
      for (const time of [reset - 0.001, reset, reset + 0.001]) {
        assert.ok(getBeatBurstPose(p, time, width, height, mobile).opacity < 0.0001, 'respawn must remain invisible');
      }
    }
  });
  test(`Beat Burst ${mobile ? 'mobile' : 'desktop'} spirals inward with bounded continuous opacity`, () => {
    for (const p of particles) {
      let previousRadius = Infinity, previousOpacity = 0;
      for (let i = 0; i < 240; i++) {
        const pose = getBeatBurstPose(p, (i / 240 - p.phase + 1) * BEAT_BURST_CYCLE_SECONDS, width, height, mobile);
        assert.ok(Object.values(pose).every(Number.isFinite));
        assert.ok(pose.radius <= previousRadius + 1e-8);
        assert.ok(pose.opacity >= 0 && pose.opacity <= 1);
        assert.ok(Math.abs(pose.opacity - previousOpacity) < 0.08, 'no single-frame brightness jump');
        previousRadius = pose.radius;
        previousOpacity = pose.opacity;
      }
    }
  });
}
