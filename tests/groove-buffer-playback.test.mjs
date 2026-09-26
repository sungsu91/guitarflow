import test from 'node:test';
import assert from 'node:assert/strict';
import { createGrooveBufferPlayback } from '../src/backing-loop/grooveBufferPlayback.js';

function fixture() {
  const sources = [];
  const context = {
    currentTime: 10,
    createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }),
    createBufferSource() {
      const source = {
        connect() {}, disconnect() {},
        start(time, offset) { this.startTime = time; this.offset = offset; },
        stop() { this.stopped = true; },
      };
      sources.push(source);
      return source;
    },
  };
  let ended = 0;
  const player = createGrooveBufferPlayback({ context, buffer: { duration: 24 }, output: {}, onEnded: () => ended++ });
  return { context, player, sources, ended: () => ended };
}

test('long-running groove loops wrap on the audio clock without creating or restarting sources', async () => {
  const { context, player, sources, ended } = fixture();
  player.loop = true;
  await player.play();
  for (const elapsed of [23.999, 24, 24.001, 2401.25]) {
    context.currentTime = 10 + elapsed;
    assert.ok(Math.abs(player.currentTime - elapsed % 24) < 1e-9);
    assert.equal(sources.length, 1);
    assert.equal(player.paused, false);
    assert.equal(ended(), 0);
  }
  assert.equal(sources[0].loop, true);
  assert.equal(sources[0].loopEnd, 24);
});

test('repeated play requests never allocate concurrent backing sources', async () => {
  const {player, sources} = fixture();
  await Promise.all(Array.from({length:30}, () => player.play()));
  assert.equal(sources.length, 1);
  player.pause();
  await Promise.all(Array.from({length:30}, () => player.play()));
  assert.equal(sources.length, 2);
  assert.equal(sources.filter(source => !source.stopped).length, 1);
  player.dispose();
});

test('pause, resume and seek preserve the position and suppress stale ended callbacks', async () => {
  const { context, player, sources, ended } = fixture();
  player.loop = true;
  await player.play();
  const staleEnded = sources[0].onended;
  context.currentTime += 26.25;
  player.pause();
  context.currentTime += 30;
  assert.equal(player.currentTime, 2.25);
  await player.play();
  assert.equal(sources[1].offset, 2.25);
  staleEnded();
  assert.equal(ended(), 0);
  player.currentTime = 23;
  assert.equal(sources[1].stopped, true);
  assert.equal(sources[2].offset, 23);
  context.currentTime += 2;
  assert.equal(player.currentTime, 1);
  player.dispose();
  assert.equal(sources[2].stopped, true);
  assert.equal(player.paused, true);
});

test('repeat can be disabled without a restart and natural completion advances the playlist once', async () => {
  const { context, player, sources, ended } = fixture();
  player.loop = true;
  await player.play();
  context.currentTime += 49;
  player.loop = false;
  assert.equal(player.currentTime, 1);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].loop, false);
  context.currentTime += 23;
  sources[0].onended();
  sources[0].onended();
  assert.equal(ended(), 1);
  assert.equal(player.currentTime, 24);
  assert.equal(player.paused, true);
  await player.play();
  assert.equal(sources[1].offset, 0);
});
