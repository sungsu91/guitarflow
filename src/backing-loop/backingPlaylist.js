const BACKING_PLAYLIST_STORAGE_KEY = "rifflab-backing-playlist-v3";
const LEGACY_BACKING_PLAYLIST_STORAGE_KEYS = ["rifflab-backing-playlist-v2", "rifflab-backing-playlist-v1"];
const CURRENT_QUEUE_ID = "current-queue";
const backingPlaylistListeners = new Set();

export const BACKING_PLAYLIST_PREVIOUS_RESTART_THRESHOLD_MS = 3000;

export const BACKING_PLAYLIST_PLAYBACK_MODES = Object.freeze({
  REPEAT_ALL: "repeat-all",
  REPEAT_ONE: "repeat-one",
  SEQUENTIAL: "sequential",
  SHUFFLE: "shuffle",
});

const PLAYBACK_MODE_VALUES = new Set(Object.values(BACKING_PLAYLIST_PLAYBACK_MODES));

export function createBackingPlaylistId(cryptoApi = globalThis.crypto) {
  return cryptoApi?.randomUUID?.() || `playlist-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeItemIds(value) {
  return Array.isArray(value)
    ? value.map((id) => String(id || "").trim()).filter((id, index, ids) => id && ids.indexOf(id) === index)
    : [];
}

function normalizeTitle(value, fallback) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 40) || fallback;
}

function normalizeSavedPlaylist(value, fallbackIndex = 0) {
  const source = value && typeof value === "object" ? value : {};
  return {
    createdAt: Math.max(0, Number(source.createdAt) || Date.now()),
    id: String(source.id || createBackingPlaylistId()),
    itemIds: normalizeItemIds(source.itemIds),
    title: normalizeTitle(source.title, `목록 ${fallbackIndex + 1}`),
    updatedAt: Math.max(0, Number(source.updatedAt) || 0),
  };
}

function createCurrentQueue(value = {}) {
  return {
    createdAt: Math.max(0, Number(value.createdAt) || Date.now()),
    id: CURRENT_QUEUE_ID,
    itemIds: normalizeItemIds(value.itemIds),
    title: "현재 재생목록",
    updatedAt: Math.max(0, Number(value.updatedAt) || 0),
  };
}

function withQueueCompatibility(state, queue) {
  return { ...state, activePlaylistId: CURRENT_QUEUE_ID, currentQueue: queue, playlists: [queue] };
}

export function createDefaultBackingPlaylistState(options = {}) {
  const now = Math.max(0, Number(options.now) || Date.now());
  return withQueueCompatibility({
    activeSavedPlaylistId: "",
    playbackMode: BACKING_PLAYLIST_PLAYBACK_MODES.SEQUENTIAL,
    savedPlaylists: [],
    shuffleEnabled: false,
    updatedAt: now,
    version: 3,
  }, createCurrentQueue({ createdAt: now }));
}

export function normalizeBackingPlaylistState(value) {
  const source = value && typeof value === "object" ? value : {};
  const legacyPlaylists = Array.isArray(source.playlists)
    ? source.playlists.map(normalizeSavedPlaylist)
    : Array.isArray(source.itemIds)
      ? [normalizeSavedPlaylist(source)]
      : [];
  const isCurrentVersion = Number(source.version) >= 3 || Array.isArray(source.savedPlaylists) || source.currentQueue;
  const requestedLegacyId = String(source.activePlaylistId || "");
  const legacyActive = legacyPlaylists.find((playlist) => playlist.id === requestedLegacyId) || legacyPlaylists[0];
  const queue = createCurrentQueue(isCurrentVersion ? source.currentQueue || legacyPlaylists[0] || {} : legacyActive || {});
  const rawSavedPlaylists = isCurrentVersion
    ? source.savedPlaylists || []
    : legacyPlaylists.filter((playlist) => playlist.itemIds.length || legacyPlaylists.length > 1);
  const seenIds = new Set();
  const savedPlaylists = rawSavedPlaylists.map(normalizeSavedPlaylist).filter((playlist) => {
    if (playlist.id === CURRENT_QUEUE_ID || seenIds.has(playlist.id)) return false;
    seenIds.add(playlist.id);
    return true;
  });
  const requestedSavedId = String(source.activeSavedPlaylistId || "");
  const legacyShuffleEnabled = source.playbackMode === BACKING_PLAYLIST_PLAYBACK_MODES.SHUFFLE;
  return withQueueCompatibility({
    activeSavedPlaylistId: savedPlaylists.some((playlist) => playlist.id === requestedSavedId) ? requestedSavedId : "",
    playbackMode: PLAYBACK_MODE_VALUES.has(source.playbackMode) && !legacyShuffleEnabled
      ? source.playbackMode
      : BACKING_PLAYLIST_PLAYBACK_MODES.SEQUENTIAL,
    savedPlaylists,
    shuffleEnabled: typeof source.shuffleEnabled === "boolean" ? source.shuffleEnabled : legacyShuffleEnabled,
    updatedAt: Math.max(0, Number(source.updatedAt) || 0),
    version: 3,
  }, queue);
}

export function getActiveBackingPlaylist(state) {
  return normalizeBackingPlaylistState(state).currentQueue;
}

export function getBackingPlaylistById(state, playlistId) {
  const current = normalizeBackingPlaylistState(state);
  const normalizedId = String(playlistId || "");
  if (!normalizedId || normalizedId === current.currentQueue.id) return current.currentQueue;
  return current.savedPlaylists.find((playlist) => playlist.id === normalizedId) || null;
}

function updateCurrentQueue(state, updater) {
  const current = normalizeBackingPlaylistState(state);
  return withQueueCompatibility(current, updater(current.currentQueue));
}

export function addBackingPlaylistItems(state, playlistId, libraryIds) {
  const current = normalizeBackingPlaylistState(state);
  const targetId = String(playlistId || current.currentQueue.id);
  const additions = Array.isArray(libraryIds) ? libraryIds.map(String).filter(Boolean) : [];
  const addItems = (playlist) => {
    if (!playlist) return playlist;
    const existingIds = new Set(playlist.itemIds);
    const nextIds = [...playlist.itemIds];
    additions.forEach((id) => {
      if (existingIds.has(id)) return;
      existingIds.add(id);
      nextIds.push(id);
    });
    return { ...playlist, itemIds: nextIds, updatedAt: Date.now() };
  };
  if (targetId === current.currentQueue.id) return updateCurrentQueue(current, addItems);
  if (!current.savedPlaylists.some((playlist) => playlist.id === targetId)) return current;
  return {
    ...current,
    savedPlaylists: current.savedPlaylists.map((playlist) => (
      playlist.id === targetId ? addItems(playlist) : playlist
    )),
  };
}

export function removeBackingPlaylistItems(state, playlistId, libraryIds) {
  const current = normalizeBackingPlaylistState(state);
  const targetId = String(playlistId || current.currentQueue.id);
  const removals = new Set(normalizeItemIds(libraryIds));
  if (!removals.size) return current;
  const removeItems = (playlist) => ({
    ...playlist,
    itemIds: playlist.itemIds.filter((id) => !removals.has(id)),
    updatedAt: Date.now(),
  });
  if (targetId === current.currentQueue.id) return updateCurrentQueue(current, removeItems);
  if (!current.savedPlaylists.some((playlist) => playlist.id === targetId)) return current;
  return {
    ...current,
    savedPlaylists: current.savedPlaylists.map((playlist) => (
      playlist.id === targetId ? removeItems(playlist) : playlist
    )),
  };
}

export function removeBackingPlaylistItem(state, playlistId, libraryId) {
  return removeBackingPlaylistItems(state, playlistId, [libraryId]);
}

export function moveBackingPlaylistItem(state, playlistId, libraryId, direction) {
  const current = normalizeBackingPlaylistState(state);
  const targetId = String(playlistId || current.currentQueue.id);
  const moveItem = (playlist) => {
    const currentIndex = playlist.itemIds.indexOf(String(libraryId || ""));
    const offset = direction === "up" ? -1 : direction === "down" ? 1 : 0;
    const nextIndex = currentIndex + offset;
    if (!offset || currentIndex < 0 || nextIndex < 0 || nextIndex >= playlist.itemIds.length) return playlist;
    const nextIds = [...playlist.itemIds];
    [nextIds[currentIndex], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[currentIndex]];
    return { ...playlist, itemIds: nextIds, updatedAt: Date.now() };
  };
  if (targetId === current.currentQueue.id) return updateCurrentQueue(current, moveItem);
  if (!current.savedPlaylists.some((playlist) => playlist.id === targetId)) return current;
  return {
    ...current,
    savedPlaylists: current.savedPlaylists.map((playlist) => (
      playlist.id === targetId ? moveItem(playlist) : playlist
    )),
  };
}

export function saveCurrentBackingPlaylist(state, title, options = {}) {
  const current = normalizeBackingPlaylistState(state);
  const normalizedTitle = normalizeTitle(title, "");
  const selectedIds = Array.isArray(options.itemIds) ? new Set(normalizeItemIds(options.itemIds)) : null;
  const requestedItemIds = selectedIds
    ? current.currentQueue.itemIds.filter((itemId) => selectedIds.has(itemId))
    : current.currentQueue.itemIds;
  if (!normalizedTitle || !requestedItemIds.length) return current;
  const now = Math.max(0, Number(options.now) || Date.now());
  const requestedPlaylistId = String(options.playlistId || "");
  const existing = current.savedPlaylists.find((playlist) => playlist.id === requestedPlaylistId)
    || current.savedPlaylists.find((playlist) => playlist.title.toLocaleLowerCase() === normalizedTitle.toLocaleLowerCase());
  const savedPlaylist = normalizeSavedPlaylist({
    createdAt: existing?.createdAt || now,
    id: existing?.id || options.id || createBackingPlaylistId(options.cryptoApi),
    itemIds: requestedItemIds,
    title: normalizedTitle,
    updatedAt: now,
  }, current.savedPlaylists.length);
  return {
    ...current,
    activeSavedPlaylistId: savedPlaylist.id,
    savedPlaylists: existing
      ? current.savedPlaylists.map((playlist) => (playlist.id === existing.id ? savedPlaylist : playlist))
      : [...current.savedPlaylists, savedPlaylist],
  };
}

export function loadSavedBackingPlaylist(state, playlistId) {
  const current = normalizeBackingPlaylistState(state);
  const saved = current.savedPlaylists.find((playlist) => playlist.id === playlistId);
  if (!saved) return current;
  return withQueueCompatibility({ ...current, activeSavedPlaylistId: saved.id }, {
    ...current.currentQueue,
    itemIds: [...saved.itemIds],
    updatedAt: Date.now(),
  });
}

export function deleteBackingPlaylistTab(state, playlistId) {
  const current = normalizeBackingPlaylistState(state);
  return {
    ...current,
    activeSavedPlaylistId: current.activeSavedPlaylistId === playlistId ? "" : current.activeSavedPlaylistId,
    savedPlaylists: current.savedPlaylists.filter((playlist) => playlist.id !== playlistId),
  };
}

export function renameBackingPlaylistTab(state, playlistId, title) {
  const current = normalizeBackingPlaylistState(state);
  const normalizedTitle = normalizeTitle(title, "");
  if (!normalizedTitle) return current;
  return {
    ...current,
    savedPlaylists: current.savedPlaylists.map((playlist) => (
      playlist.id === playlistId ? { ...playlist, title: normalizedTitle, updatedAt: Date.now() } : playlist
    )),
  };
}

export function addBackingPlaylistTab(state, options = {}) {
  const current = normalizeBackingPlaylistState(state);
  const nextNumber = current.savedPlaylists.reduce((highest, playlist) => {
    const match = /^목록\s+(\d+)$/.exec(playlist.title);
    return match ? Math.max(highest, Number(match[1]) || 0) : highest;
  }, 0) + 1;
  return saveCurrentBackingPlaylist(current, options.title || `목록 ${nextNumber}`, options);
}

export function selectBackingPlaylistTab(state, playlistId) {
  return loadSavedBackingPlaylist(state, playlistId);
}

export function setBackingPlaylistPlaybackMode(state, playbackMode) {
  const current = normalizeBackingPlaylistState(state);
  if (playbackMode === BACKING_PLAYLIST_PLAYBACK_MODES.SHUFFLE) {
    return { ...current, playbackMode: BACKING_PLAYLIST_PLAYBACK_MODES.SEQUENTIAL, shuffleEnabled: true };
  }
  return PLAYBACK_MODE_VALUES.has(playbackMode) ? { ...current, playbackMode } : current;
}

export function setBackingPlaylistShuffleEnabled(state, enabled) {
  const current = normalizeBackingPlaylistState(state);
  return { ...current, shuffleEnabled: Boolean(enabled) };
}

export function getNextBackingPlaylistRepeatMode(playbackMode) {
  if (playbackMode === BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ALL) return BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ONE;
  if (playbackMode === BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ONE) return BACKING_PLAYLIST_PLAYBACK_MODES.SEQUENTIAL;
  return BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ALL;
}

export function shouldRestartBackingPlaylistTrack(positionMs, thresholdMs = BACKING_PLAYLIST_PREVIOUS_RESTART_THRESHOLD_MS) {
  return Math.max(0, Number(positionMs) || 0) >= Math.max(0, Number(thresholdMs) || 0);
}

export function reconcileBackingPlaylistState(state, libraryIds) {
  const current = normalizeBackingPlaylistState(state);
  const availableIds = new Set(Array.isArray(libraryIds) ? libraryIds.map(String) : []);
  const queue = { ...current.currentQueue, itemIds: current.currentQueue.itemIds.filter((id) => availableIds.has(id)) };
  return withQueueCompatibility({
    ...current,
    savedPlaylists: current.savedPlaylists.map((playlist) => ({
      ...playlist,
      itemIds: playlist.itemIds.filter((id) => availableIds.has(id)),
    })),
  }, queue);
}

export function getNextBackingPlaylistIndex({
  currentIndex = -1,
  itemCount = 0,
  playedIndexes = [],
  playbackMode = BACKING_PLAYLIST_PLAYBACK_MODES.SEQUENTIAL,
  random = Math.random,
  shuffleEnabled = false,
} = {}) {
  const count = Math.max(0, Math.floor(Number(itemCount) || 0));
  if (!count) return -1;
  const safeIndex = Math.min(count - 1, Math.max(0, Math.floor(Number(currentIndex) || 0)));
  if (playbackMode === BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ONE) return safeIndex;
  if (shuffleEnabled || playbackMode === BACKING_PLAYLIST_PLAYBACK_MODES.SHUFFLE) {
    const played = new Set((Array.isArray(playedIndexes) ? playedIndexes : [])
      .map((index) => Math.floor(Number(index)))
      .filter((index) => Number.isFinite(index) && index >= 0 && index < count));
    played.add(safeIndex);
    let candidates = Array.from({ length: count }, (_, index) => index).filter((index) => !played.has(index));
    if (!candidates.length) {
      if (playbackMode !== BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ALL) return -1;
      candidates = Array.from({ length: count }, (_, index) => index).filter((index) => count === 1 || index !== safeIndex);
    }
    const randomIndex = Math.floor(Math.min(0.999999, Math.max(0, Number(random?.()) || 0)) * candidates.length);
    return candidates[randomIndex];
  }
  if (playbackMode === BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ALL) return (safeIndex + 1) % count;
  return safeIndex + 1 < count ? safeIndex + 1 : -1;
}

function getPlaylistStorage(storage) {
  if (storage) return storage;
  if (typeof window !== "undefined") return window.localStorage;
  return null;
}

export function loadBackingPlaylistState(storage) {
  const target = getPlaylistStorage(storage);
  if (!target) return createDefaultBackingPlaylistState();
  try {
    const current = target.getItem(BACKING_PLAYLIST_STORAGE_KEY);
    const legacy = current || LEGACY_BACKING_PLAYLIST_STORAGE_KEYS.map((key) => target.getItem(key)).find(Boolean);
    const normalized = normalizeBackingPlaylistState(JSON.parse(legacy || "null"));
    if (!current) target.setItem(BACKING_PLAYLIST_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return createDefaultBackingPlaylistState();
  }
}

export function saveBackingPlaylistState(state, storage) {
  const target = getPlaylistStorage(storage);
  const normalized = { ...normalizeBackingPlaylistState(state), updatedAt: Date.now() };
  if (target) target.setItem(BACKING_PLAYLIST_STORAGE_KEY, JSON.stringify(normalized));
  backingPlaylistListeners.forEach((listener) => listener(normalized));
  return normalized;
}

export function subscribeBackingPlaylist(listener) {
  if (typeof listener !== "function") return () => {};
  backingPlaylistListeners.add(listener);
  return () => backingPlaylistListeners.delete(listener);
}
