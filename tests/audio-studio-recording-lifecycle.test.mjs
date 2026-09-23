import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from './helpers/i18n-source.mjs';
import vm from 'node:vm';

// Execute the production callbacks with deferred permission and recorder events.
// No microphone, browser, or new test dependency is needed for these races.
const source = readFileSync(new URL('../src/audio-studio/useAudioStudio.js', import.meta.url), 'utf8');
function harness({ countInBars = 0, failStart = false } = {}) {
  const requests = [], recorders = [], timers = new Map();
  let setup, cleanup, nextTimer = 0;
  const noop = () => {};
  const context = {
    useCallback: fn => fn,
    useEffect: fn => { setup = fn; cleanup = fn(); },
    navigator: { mediaDevices: { getUserMedia: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) } },
    window: {
      clearInterval: id => timers.delete(id),
      setInterval: fn => { timers.set(++nextTimer, fn); return nextTimer; },
      setTimeout: fn => { timers.set(++nextTimer, fn); return nextTimer; },
      MediaRecorder: class {
        state = 'inactive';
        constructor() { recorders.push(this); }
        start() { if (failStart) throw Error('start failed'); this.state = 'recording'; }
        stop() { this.state = 'inactive'; }
      },
    },
    URL, performance, Blob,
    localStorage: { getItem: () => true },
    getPreferredBackingLoopMimeType: () => '',
    getAudioStudioProjectDurationMs: () => 0,
    currentTimeMs: 0,
    setRecordingState: state => { context.state = typeof state === 'function' ? state(context.state) : state; },
    setNotice: value => { context.notice = value; },
    projectRef: { current: { tracks: [{ id: 'track', clips: [] }], settings: { countInBars } } },
  };
  for (const name of ['clearScheduledPlayback', 'ensurePlaybackContext', 'playCountInClick', 'startPlayback', 'setActiveTrackId', 'setSelectedTrackId', 'setSelectedClipIds', 'setRangeSelection', 'setPlaybackStatus']) context[name] = noop;
  for (const name of ['countInTimerRef', 'mediaRecorderRef', 'recordingStreamRef', 'recordingTargetTrackIdRef', 'recordingTimelineStartRef', 'recordingChunksRef', 'recordingStartedAtRef', 'libraryAudioRef', 'libraryAudioUrlRef', 'audioContextRef']) context[name] = { current: null };
  context.recordingRequestVersionRef = { current: 0 };
  context.recordingPendingRef = { current: false };
  context.recordingLiveRef = { current: true };
  const lifecycle = source.slice(source.indexOf('  useEffect(() => {\n    recordingLiveRef'), source.indexOf('  useEffect(() => {\n    refreshSavedMixes'));
  const release = source.slice(source.indexOf('  const releaseRecordingInput ='), source.indexOf('  const playCountInClick ='));
  const recording = source.slice(source.indexOf('  const stopRecording ='), source.indexOf('  const selectTimelineRange ='));
  vm.createContext(context);
  vm.runInContext(lifecycle + release + recording + '\nglobalThis.start = startRecording; globalThis.stop = stopRecording;', context);
  function stream() {
    const track = { readyState: 'live', stop() { this.readyState = 'ended'; } };
    return { track, getTracks: () => [track] };
  }
  return { context, requests, recorders, timers, stream, leave: () => cleanup(), returnToScreen: () => { cleanup = setup(); } };
}

test('permission allowed: repeated recording stops release every track before onstop', async () => {
  const h = harness();
  for (let i = 0; i < 3; i++) {
    const pending = h.context.start('track'), stream = h.stream();
    h.requests.at(-1).resolve(stream); await pending;
    assert.equal(h.recorders.at(-1).state, 'recording');
    h.context.stop();
    assert.equal(stream.track.readyState, 'ended');
    await h.recorders.at(-1).onstop();
    assert.equal(h.context.recordingStreamRef.current, null);
    assert.equal(h.context.state.phase, 'idle');
  }
});

test('permission denied leaves no pending request or recorder and allows retry', async () => {
  const h = harness(), pending = h.context.start('track');
  h.requests[0].reject(new DOMException('Denied', 'NotAllowedError')); await pending;
  assert.equal(h.context.recordingPendingRef.current, false);
  assert.equal(h.context.state.phase, 'idle');
  assert.equal(h.recorders.length, 0);
  const retry = h.context.start('track'), stream = h.stream();
  h.requests[1].resolve(stream); await retry; h.leave();
  assert.equal(stream.track.readyState, 'ended');
});

test('permission resolved after leaving and returning cannot revive an old session', async () => {
  const h = harness(), pending = h.context.start('track'), stream = h.stream();
  h.leave(); h.returnToScreen();
  h.requests[0].resolve(stream); await pending;
  assert.equal(stream.track.readyState, 'ended');
  assert.equal(h.recorders.length, 0);
});

test('cancelled request cannot stop a newer recording when it resolves or rejects late', async () => {
  for (const reject of [false, true]) {
    const h = harness(), first = h.context.start('track');
    h.context.stop();
    const second = h.context.start('track'), current = h.stream(), stale = h.stream();
    h.requests[1].resolve(current); await second;
    if (reject) h.requests[0].reject(Error('late denial'));
    else h.requests[0].resolve(stale);
    await first;
    assert.equal(current.track.readyState, 'live');
    assert.equal(h.context.state.phase, 'recording');
    if (!reject) assert.equal(stale.track.readyState, 'ended');
    h.leave(); assert.equal(current.track.readyState, 'ended');
  }
});

test('double start cancels a pending permission request instead of acquiring twice', async () => {
  const h = harness(), first = h.context.start('track'), stream = h.stream();
  await h.context.start('track');
  assert.equal(h.requests.length, 1);
  h.requests[0].resolve(stream); await first;
  assert.equal(stream.track.readyState, 'ended');
});

test('count-in cancellation clears timers and rejects an already queued callback', async () => {
  const h = harness({ countInBars: 1 }), pending = h.context.start('track'), stream = h.stream();
  h.requests[0].resolve(stream); await pending;
  const queued = [...h.timers.values()][0];
  h.context.stop(); queued();
  assert.equal(h.timers.size, 0);
  assert.equal(stream.track.readyState, 'ended');
  assert.equal(h.recorders[0].state, 'inactive');
  assert.equal(h.context.state.phase, 'idle');
});

test('leaving during recording closes tracks; old recorder events cannot affect a new session', async () => {
  const h = harness(), pending = h.context.start('track'), stream = h.stream();
  h.requests[0].resolve(stream); await pending;
  h.leave(); h.returnToScreen();
  const next = h.context.start('track'), current = h.stream();
  h.requests[1].resolve(current); await next;
  await h.recorders[0].onstop(); h.recorders[0].onerror();
  assert.equal(stream.track.readyState, 'ended');
  assert.equal(current.track.readyState, 'live');
  assert.equal(h.context.state.phase, 'recording');
  h.leave();
  assert.equal(current.track.readyState, 'ended');
});

test('recorder startup failure and error both release microphone tracks', async () => {
  for (const failStart of [true, false]) {
    const h = harness({ failStart }), pending = h.context.start('track'), stream = h.stream();
    h.requests[0].resolve(stream); await pending;
    if (!failStart) h.recorders[0].onerror();
    assert.equal(stream.track.readyState, 'ended');
    assert.equal(h.context.recordingStreamRef.current, null);
    assert.equal(h.context.state.phase, 'idle');
  }
});
