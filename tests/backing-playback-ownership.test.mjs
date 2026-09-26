import test from 'node:test';
import assert from 'node:assert/strict';
import {claimBackingPlayback, stopOwnedBackingPlayback} from '../src/backing-loop/playbackOwnership.js';

test('a new backing or preview synchronously stops the previous owner', () => {
  const calls = [];
  const first = claimBackingPlayback(() => calls.push('backing stopped'));
  const preview = claimBackingPlayback(() => calls.push('preview stopped'));
  assert.deepEqual(calls, ['backing stopped']);
  assert.equal(first.isCurrent(), false);
  first.release(); // A late old cleanup cannot release the new owner.
  assert.equal(preview.isCurrent(), true);
  stopOwnedBackingPlayback();
  stopOwnedBackingPlayback();
  assert.deepEqual(calls, ['backing stopped', 'preview stopped']);
  assert.equal(preview.isCurrent(), false);
});

test('an earlier pending decode cannot play after a later request takes ownership', async () => {
  const played = [];
  let finishDecode;
  const pending = new Promise(resolve => { finishDecode = resolve; });
  const first = claimBackingPlayback(() => {});
  const start = async () => { await pending; if (first.isCurrent()) played.push('old'); };
  const oldRequest = start();
  const second = claimBackingPlayback(() => {});
  if (second.isCurrent()) played.push('new');
  finishDecode();
  await oldRequest;
  assert.deepEqual(played, ['new']);
  second.release();
});

test('stop invalidates a pending request before it can become audible', async () => {
  let stopped = false;
  const lease = claimBackingPlayback(() => { stopped = true; });
  stopOwnedBackingPlayback();
  await Promise.resolve();
  assert.equal(stopped, true);
  assert.equal(lease.isCurrent(), false);
});
