import test from 'node:test';
import assert from 'node:assert/strict';
import {getGrooveBackingTiming, listGrooveBackingSources, loadGrooveBackingSource, grooveBackingId} from '../src/backing-loop/grooveBackingSource.js';
import {defaults, readPacks, savePacks, subscribeGroovePacks} from '../src/metronome/groovePackLibrary.js';
import {saveBackingLoopRecording} from '../src/backing-loop/backingLoopStorage.js';
import {createDefaultBackingPlaylistState, addBackingPlaylistItems, reconcileBackingPlaylistState} from '../src/backing-loop/backingPlaylist.js';

test('backing groove duration is eight bars and subdivision keeps the same tempo', () => {
  const straight = getGrooveBackingTiming({timeSignature:'4/4', subdivision:'sixteenth'}, 120);
  const swing = getGrooveBackingTiming({timeSignature:'4/4', subdivision:'eighth-triplet'}, 120);
  assert.equal(straight.durationSeconds, 16);
  assert.equal(swing.durationSeconds, 16);
  assert.equal(straight.steps * straight.stepSeconds, 2);
  assert.equal(swing.steps * swing.stepSeconds, 2);
  assert.equal(getGrooveBackingTiming({timeSignature:'3/4'}, 60).durationSeconds, 24);
});

test('playlist references share pack edits, deduplicate and disappear with the original pack', async () => {
  const prior = globalThis.localStorage;
  let stored = '[]', notifications = 0;
  globalThis.localStorage = {getItem: () => stored, setItem: (key,value) => {stored=value;}};
  const unsubscribe = subscribeGroovePacks(() => notifications++);
  try {
    const pack = {...defaults[0], builtin:false, id:'shared', title:'Shared', bpm:100};
    savePacks([pack]);
    const id = grooveBackingId(pack);
    let playlist = addBackingPlaylistItems(createDefaultBackingPlaylistState(), '', [id,id]);
    assert.deepEqual(playlist.currentQueue.itemIds, [id]);
    const source = listGrooveBackingSources().find(item => item.id === id);
    assert.equal(source.blob, undefined);
    savePacks([{...pack, title:'Updated', bpm:120}]);
    const updated = listGrooveBackingSources().find(item => item.id === id);
    assert.equal(updated.title, 'Updated');assert.equal(updated.bpm,120);
    assert.notEqual(updated.grooveRevision, source.grooveRevision);
    savePacks([]);
    assert.equal(await loadGrooveBackingSource(id), null);
    playlist = reconcileBackingPlaylistState(playlist, listGrooveBackingSources().map(item => item.id));
    assert.deepEqual(playlist.currentQueue.itemIds, []);
    assert.equal(notifications,3);
    await assert.rejects(saveBackingLoopRecording({sourceType:'groove',blob:new Blob(['audio'])}), /references/);
  } finally {unsubscribe();globalThis.localStorage=prior;}
});

test('backing catalog shares built-ins and safely reads saved packs', () => {
  assert.ok(defaults.length > 2);
  assert.equal(new Set(defaults.map(pack => pack.id)).size, defaults.length);
  const prior = globalThis.localStorage;
  try {
    globalThis.localStorage = {getItem: () => JSON.stringify([defaults[0], {id:'broken'}])};
    assert.deepEqual(readPacks(), [defaults[0]]);
    globalThis.localStorage = {getItem: () => '{'};
    assert.deepEqual(readPacks(), []);
  } finally { globalThis.localStorage = prior; }
});
