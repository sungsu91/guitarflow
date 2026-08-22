import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  addBackingPlaylistItems,
  BACKING_PLAYLIST_PREVIOUS_RESTART_THRESHOLD_MS,
  BACKING_PLAYLIST_PLAYBACK_MODES,
  createDefaultBackingPlaylistState,
  deleteBackingPlaylistTab,
  getActiveBackingPlaylist,
  getBackingPlaylistById,
  getNextBackingPlaylistIndex,
  getNextBackingPlaylistRepeatMode,
  loadSavedBackingPlaylist,
  loadBackingPlaylistState,
  moveBackingPlaylistItem,
  reconcileBackingPlaylistState,
  removeBackingPlaylistItem,
  removeBackingPlaylistItems,
  saveCurrentBackingPlaylist,
  saveBackingPlaylistState,
  setBackingPlaylistPlaybackMode,
  setBackingPlaylistShuffleEnabled,
  shouldRestartBackingPlaylistTrack,
} from "../src/backing-loop/backingPlaylist.js";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    values,
  };
}

test("current queue saves named configurations while playback mode stays global", () => {
  let state = createDefaultBackingPlaylistState({ now: 1 });
  state = addBackingPlaylistItems(state, state.activePlaylistId, ["intro", "verse"]);
  state = saveCurrentBackingPlaylist(state, "버스킹 세트", { id: "saved-1", now: 2 });
  state = removeBackingPlaylistItem(state, state.activePlaylistId, "intro");
  state = removeBackingPlaylistItem(state, state.activePlaylistId, "verse");
  state = addBackingPlaylistItems(state, state.activePlaylistId, ["solo", "outro"]);
  state = saveCurrentBackingPlaylist(state, "연습곡", { id: "saved-2", now: 3 });
  state = setBackingPlaylistPlaybackMode(state, BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ALL);
  state = setBackingPlaylistShuffleEnabled(state, true);

  assert.deepEqual(state.currentQueue.itemIds, ["solo", "outro"]);
  assert.deepEqual(state.savedPlaylists.map((playlist) => playlist.itemIds), [["intro", "verse"], ["solo", "outro"]]);
  assert.equal(state.playbackMode, BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ALL);
  assert.equal(state.shuffleEnabled, true);

  state = loadSavedBackingPlaylist(state, "saved-1");
  assert.equal(getActiveBackingPlaylist(state).id, "current-queue");
  assert.deepEqual(getActiveBackingPlaylist(state).itemIds, ["intro", "verse"]);
  assert.equal(state.playbackMode, BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ALL);
  assert.equal(state.shuffleEnabled, true);
});

test("queue order, item removal, and saved-list deletion only change id references", () => {
  let state = createDefaultBackingPlaylistState({ now: 1 });
  state = addBackingPlaylistItems(state, state.activePlaylistId, ["intro", "verse", "chorus", "verse"]);
  assert.deepEqual(getActiveBackingPlaylist(state).itemIds, ["intro", "verse", "chorus"]);

  state = moveBackingPlaylistItem(state, state.activePlaylistId, "chorus", "up");
  state = removeBackingPlaylistItem(state, state.activePlaylistId, "intro");
  assert.deepEqual(getActiveBackingPlaylist(state).itemIds, ["chorus", "verse"]);

  state = saveCurrentBackingPlaylist(state, "Canon 연습", { id: "saved-1", now: 2 });
  state = deleteBackingPlaylistTab(state, "saved-1");
  assert.deepEqual(getActiveBackingPlaylist(state).itemIds, ["chorus", "verse"]);
  assert.equal(state.savedPlaylists.length, 0);
  assert.equal(state.playlists.length, 1);
  assert.equal(state.playlists[0].id, "current-queue");
});

test("named lists can save only the selected current-queue items in queue order", () => {
  let state = createDefaultBackingPlaylistState({ now: 1 });
  state = addBackingPlaylistItems(state, state.activePlaylistId, ["intro", "verse", "chorus"]);
  state = saveCurrentBackingPlaylist(state, "너의 모든 순간", {
    id: "selected-list",
    itemIds: ["chorus", "intro", "missing"],
    now: 2,
  });

  assert.deepEqual(state.currentQueue.itemIds, ["intro", "verse", "chorus"]);
  assert.deepEqual(state.savedPlaylists[0].itemIds, ["intro", "chorus"]);
  assert.equal(state.savedPlaylists[0].title, "너의 모든 순간");
});

test("saved lists can be selected, updated, extended, and trimmed without changing the current queue", () => {
  let state = createDefaultBackingPlaylistState({ now: 1 });
  state = addBackingPlaylistItems(state, state.activePlaylistId, ["intro", "verse", "chorus"]);
  state = saveCurrentBackingPlaylist(state, "111", {
    id: "saved-111",
    itemIds: ["intro", "verse"],
    now: 2,
  });
  state = saveCurrentBackingPlaylist(state, "111", {
    itemIds: ["chorus", "verse"],
    now: 3,
    playlistId: "saved-111",
  });
  state = addBackingPlaylistItems(state, "saved-111", ["outro"]);
  state = removeBackingPlaylistItems(state, "saved-111", ["verse"]);

  assert.deepEqual(state.currentQueue.itemIds, ["intro", "verse", "chorus"]);
  assert.deepEqual(getBackingPlaylistById(state, "saved-111").itemIds, ["chorus", "outro"]);
  assert.equal(getBackingPlaylistById(state, "saved-111").title, "111");
});

test("playlist reconciliation removes deleted audio ids from queue and saved lists", () => {
  let state = createDefaultBackingPlaylistState({ now: 1 });
  state = addBackingPlaylistItems(state, state.activePlaylistId, ["shared", "deleted-a"]);
  state = saveCurrentBackingPlaylist(state, "목록 1", { id: "saved-1", now: 2 });

  const reconciled = reconcileBackingPlaylistState(state, ["shared"]);
  assert.deepEqual(reconciled.currentQueue.itemIds, ["shared"]);
  assert.deepEqual(reconciled.savedPlaylists.map((playlist) => playlist.itemIds), [["shared"]]);
});

test("playlist playback resolver supports sequential, repeat-one, repeat-all, and shuffle", () => {
  assert.equal(getNextBackingPlaylistIndex({ currentIndex: 0, itemCount: 3 }), 1);
  assert.equal(getNextBackingPlaylistIndex({ currentIndex: 2, itemCount: 3 }), -1);
  assert.equal(getNextBackingPlaylistIndex({ currentIndex: 1, itemCount: 3, playbackMode: "repeat-one" }), 1);
  assert.equal(getNextBackingPlaylistIndex({ currentIndex: 2, itemCount: 3, playbackMode: "repeat-all" }), 0);
  assert.equal(getNextBackingPlaylistIndex({ currentIndex: 0, itemCount: 3, playbackMode: "shuffle", random: () => 0 }), 1);
  assert.equal(getNextBackingPlaylistIndex({ currentIndex: 0, itemCount: 3, playbackMode: "shuffle", random: () => 0.99 }), 2);
  assert.equal(getNextBackingPlaylistIndex({ currentIndex: 0, itemCount: 3, playbackMode: "repeat-all", shuffleEnabled: true, random: () => 0.99 }), 2);
  assert.equal(getNextBackingPlaylistIndex({ currentIndex: 1, itemCount: 3, playbackMode: "repeat-one", shuffleEnabled: true, random: () => 0.99 }), 1);
  assert.equal(getNextBackingPlaylistIndex({ currentIndex: 2, itemCount: 3, playedIndexes: [0, 2], shuffleEnabled: true, random: () => 0 }), 1);
  assert.equal(getNextBackingPlaylistIndex({ currentIndex: 1, itemCount: 3, playedIndexes: [0, 1, 2], shuffleEnabled: true }), -1);
  assert.equal(getNextBackingPlaylistIndex({ currentIndex: 2, itemCount: 3, playedIndexes: [0, 1, 2], playbackMode: "repeat-all", shuffleEnabled: true, random: () => 0 }), 0);
});

test("outside player cycles repeat display and restarts previous at the shared three-second threshold", () => {
  assert.equal(getNextBackingPlaylistRepeatMode("sequential"), "repeat-all");
  assert.equal(getNextBackingPlaylistRepeatMode("repeat-all"), "repeat-one");
  assert.equal(getNextBackingPlaylistRepeatMode("repeat-one"), "sequential");
  assert.equal(getNextBackingPlaylistRepeatMode("shuffle"), "repeat-all");
  assert.equal(BACKING_PLAYLIST_PREVIOUS_RESTART_THRESHOLD_MS, 3000);
  assert.equal(shouldRestartBackingPlaylistTrack(2999), false);
  assert.equal(shouldRestartBackingPlaylistTrack(3000), true);
  assert.equal(shouldRestartBackingPlaylistTrack(4200), true);
});

test("playlist persistence stores only audio ids and migrates legacy playlist tabs", () => {
  const storage = createMemoryStorage();
  let state = createDefaultBackingPlaylistState({ now: 1 });
  state = addBackingPlaylistItems(state, state.activePlaylistId, ["audio-a", "audio-b"]);
  state = saveCurrentBackingPlaylist(state, "버스킹 세트", { id: "saved-1", now: 2 });
  state = setBackingPlaylistPlaybackMode(state, BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ALL);
  state = setBackingPlaylistShuffleEnabled(state, true);
  const saved = saveBackingPlaylistState(state, storage);
  const serialized = [...storage.values.values()].join("");
  assert.doesNotMatch(serialized, /blob|audio\//i);
  assert.deepEqual(loadBackingPlaylistState(storage).currentQueue.itemIds, ["audio-a", "audio-b"]);
  assert.deepEqual(loadBackingPlaylistState(storage).savedPlaylists[0].itemIds, ["audio-a", "audio-b"]);
  assert.equal(saved.playbackMode, BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ALL);
  assert.equal(saved.shuffleEnabled, true);

  const legacyStorage = createMemoryStorage();
  legacyStorage.setItem("rifflab-backing-playlist-v1", JSON.stringify({
    id: "legacy",
    itemIds: ["library-a"],
    playbackMode: "repeat-all",
    title: "PLAYLIST",
  }));
  const migrated = loadBackingPlaylistState(legacyStorage);
  assert.equal(migrated.currentQueue.title, "현재 재생목록");
  assert.deepEqual(migrated.currentQueue.itemIds, ["library-a"]);
  assert.equal(migrated.savedPlaylists[0].title, "PLAYLIST");
  assert.equal(migrated.playbackMode, "repeat-all");

  const legacyShuffleStorage = createMemoryStorage();
  legacyShuffleStorage.setItem("rifflab-backing-playlist-v2", JSON.stringify({
    activePlaylistId: "legacy-shuffle",
    playbackMode: "shuffle",
    playlists: [{ id: "legacy-shuffle", itemIds: ["library-b"], title: "노래 1" }],
  }));
  const migratedShuffle = loadBackingPlaylistState(legacyShuffleStorage);
  assert.equal(migratedShuffle.playbackMode, "sequential");
  assert.equal(migratedShuffle.shuffleEnabled, true);
});

test("Backing Loop UI uses Playlist as the single queue, import, and saved-list entry point", async () => {
  const [componentSource, controllerSource, playerCss] = await Promise.all([
    readFile(new URL("../src/components/BackingLoop.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/backing-loop/useBackingLoop.js", import.meta.url), "utf8"),
    readFile(new URL("../src/components/backing-loop.css", import.meta.url), "utf8"),
  ]);
  assert.match(componentSource, /현재 재생목록/);
  assert.match(componentSource, /App 내 파일 추가/);
  assert.match(componentSource, /기기 파일 추가/);
  assert.doesNotMatch(componentSource, /저장 음원 추가/);
  assert.match(componentSource, /선택 해제/);
  assert.match(componentSource, /선택 재생/);
  assert.match(componentSource, /전체 선택/);
  assert.match(componentSource, /목록 저장/);
  assert.match(componentSource, /Playlist에서 제거/);
  assert.doesNotMatch(componentSource, /현재 목록으로 불러오기/);
  assert.match(componentSource, /savedPlaylists\.map[\s\S]*?role="tab"/);
  assert.match(componentSource, /showSavedPlaylist\(playlist\.id\)/);
  assert.match(componentSource, /저장 · \{playlist\.title\}/);
  assert.doesNotMatch(componentSource, /음원 추가부터 재생 순서 정리와 목록 저장까지 한곳에서 관리합니다/);
  assert.match(componentSource, /backingLoopSavedPlaylistTracks/);
  assert.match(componentSource, /저장할 재생목록 선택/);
  assert.match(componentSource, /새 목록으로 저장/);
  assert.match(componentSource, /에 선택 저장/);
  assert.match(componentSource, /전체 재생/);
  assert.match(componentSource, /선택 제거/);
  assert.match(componentSource, /DeleteBackingPlaylistItemsDialog/);
  assert.match(componentSource, /toggleQueueItemSelection/);
  assert.match(controllerSource, /saveCurrentBackingPlaylist\(state, title, \{[\s\S]*?itemIds,[\s\S]*?playlistId:/);
  assert.match(controllerSource, /playSelectedQueueItems/);
  assert.match(controllerSource, /playSelectedSavedPlaylistItems/);
  assert.match(controllerSource, /removeBackingPlaylistItems/);
  assert.match(controllerSource, /getBackingPlaylistById/);
  assert.match(controllerSource, /itemIds: playbackItemIds/);
  assert.doesNotMatch(controllerSource, /showSavedPlaylists/);
  assert.doesNotMatch(componentSource, /function BackingLoopStorageControls/);
  assert.doesNotMatch(componentSource, /backingLoopPlaylistTabs/);
  assert.doesNotMatch(componentSource, /새 Playlist 탭 추가/);
  assert.doesNotMatch(componentSource, />LOAD</);
  assert.doesNotMatch(componentSource, />IMPORT</);
  assert.match(componentSource, /backingLoopPlayerBar/);
  assert.match(componentSource, /backingLoopPlayerTransport/);
  assert.match(componentSource, /backingLoopVolumePopover/);
  assert.match(componentSource, /backingLoopMiniPlayer/);
  const recordingControls = componentSource.slice(
    componentSource.indexOf("function BackingLoopMainControls"),
    componentSource.indexOf("const formatTrimSeconds"),
  );
  assert.match(recordingControls, /REC[\s\S]*?EDIT[\s\S]*?DEL[\s\S]*?SAVE/);
  assert.match(recordingControls, /disabled=\{!controller\.hasRecording \|\| mediaBusy\}/);
  assert.match(recordingControls, /onClick=\{controller\.openTrimEditor\}/);
  assert.doesNotMatch(recordingControls, /toggleRecordingPause|RESUME|>PAUSE</);
  assert.match(componentSource, /Playlist 열기/);
  assert.match(componentSource, /playlistPlayingItemId/);
  assert.match(componentSource, /playPlaylistItem\(item\.id\)/);
  assert.match(componentSource, /한 곡 반복으로 변경/);
  assert.match(componentSource, /셔플 켜기/);
  assert.match(componentSource, /backingLoopRepeatState--all[\s\S]*?•/);
  assert.match(componentSource, /backingLoopRepeatState--one[\s\S]*?>1</);
  assert.match(componentSource, /playlistShuffleEnabled[\s\S]*?backingLoopShuffleState[\s\S]*?•/);
  assert.match(componentSource, /<Shuffle[\s\S]*?size=\{21\}/);
  assert.match(componentSource, /<Volume(?:2|X)[\s\S]*?size=\{mobile \? 18 : 17\}/);
  assert.match(componentSource, /backingLoopPlaylistToggleLabel[\s\S]*?>LIST</);
  assert.match(playerCss, /\.backingLoopRepeatState--all\s*\{[\s\S]*?width: 4px;[\s\S]*?height: 4px;[\s\S]*?background: currentColor;/);
  assert.match(playerCss, /\.backingLoopShuffleState\s*\{[\s\S]*?top: 50%;[\s\S]*?left: calc\(50% - 9px\);[\s\S]*?width: 4px;/);
  assert.match(playerCss, /\.backingLoopRepeatButton\[data-repeat-mode="sequential"\][\s\S]*?rgba\(27, 22, 17, 0\.72\)[\s\S]*?filter: none;/);
  assert.match(playerCss, /data-repeat-mode="repeat-all"[\s\S]*?data-repeat-mode="repeat-one"[\s\S]*?rgba\(255, 241, 211, 0\.96\)[\s\S]*?filter: none;/);
  assert.match(playerCss, /\.backingLoopRepeatButton\[data-repeat-mode="repeat-all"\][\s\S]*?\.backingLoopShuffleButton\.active[\s\S]*?> svg \{[\s\S]*?stroke: rgba\(255, 241, 211, 0\.96\) !important;/);
  assert.match(playerCss, /theme-light[\s\S]*?\.backingLoopRepeatButton\[data-repeat-mode="sequential"\][\s\S]*?\.backingLoopShuffleButton:not\(\.active\)[\s\S]*?> svg \{[\s\S]*?stroke: rgb\(30, 20, 8\) !important;/);
  assert.match(playerCss, /\.backingLoopPlaylistToggle\s*\{[\s\S]*?width: 54px;[\s\S]*?gap: 2px;/);
  assert.match(playerCss, /\.backingLoopPlaylistToggleLabel\s*\{[\s\S]*?font-size: 11px;[\s\S]*?font-weight: 1000;/);
  assert.match(playerCss, /theme-light\) \.backingLoopDialogLayer--playlistDrawer[\s\S]*?background: rgba\(18, 14, 10, 0\.14\);[\s\S]*?backdrop-filter: none;/);
  assert.match(playerCss, /bottom: var\(--backing-loop-playlist-bottom, 160px\);/);
  assert.match(playerCss, /max-height: min\(60dvh, var\(--backing-loop-playlist-max-height, 520px\)\);/);
  assert.match(playerCss, /\.backingLoopPlaylistDialog \.backingLoopDialogHeading strong[\s\S]*?font-size: 17px;[\s\S]*?letter-spacing: 1\.4px;/);
  assert.match(playerCss, /\.backingLoopPlaylistNavigation button:first-child\.selected[\s\S]*?rgba\(249, 219, 222, 0\.98\)/);
  assert.match(playerCss, /\.backingLoopPlaylistNavigation button:not\(:first-child\)\.selected[\s\S]*?rgba\(251, 226, 166, 0\.98\)/);
  assert.match(componentSource, /\.backingLoopPanel--mobile \.backingLoopMiniPlayer/);
  assert.match(componentSource, /playlistDrawerOpen[\s\S]*?ChevronDown[\s\S]*?ChevronUp/);
  assert.doesNotMatch(componentSource, /ChevronLeft|ChevronRight/);
  assert.doesNotMatch(componentSource, /backingLoopPlaylistModes/);
  assert.doesNotMatch(componentSource, /backingLoopPlaylistTransport/);
  assert.doesNotMatch(componentSource, /backingLoopResetButton/);
  assert.match(controllerSource, /getNextBackingPlaylistIndex/);
  assert.match(controllerSource, /playPreviousPlaylistItem/);
  assert.match(controllerSource, /playNextPlaylistItem/);
  assert.match(controllerSource, /shouldRestartBackingPlaylistTrack/);
  assert.match(controllerSource, /playlistState\.playbackMode/);
  assert.match(controllerSource, /playlistState\.shuffleEnabled/);
  assert.match(controllerSource, /audio\.loop = nextMode === BACKING_PLAYLIST_PLAYBACK_MODES\.REPEAT_ONE/);
  assert.match(controllerSource, /saveCurrentBackingPlaylist/);
  assert.match(controllerSource, /loadSavedBackingPlaylist/);
  assert.match(controllerSource, /개 파일을 “\$\{targetTitle\}”에 추가했어요/);
  assert.match(controllerSource, /mediaRecorder\.onstop = async \(\) => \{[\s\S]*?setDialog\("trim"\)[\s\S]*?setPhaseImmediate\("trimming"\)/);
  assert.match(controllerSource, /const openTrimEditor = useCallback\(async \(\) => \{[\s\S]*?setDialog\("trim"\)[\s\S]*?setPhaseImmediate\("trimming"\)/);
  assert.doesNotMatch(controllerSource, /toggleRecordingPause|mediaRecorder\.pause\(\)|mediaRecorder\.resume\(\)/);
});
