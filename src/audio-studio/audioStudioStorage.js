import { createAudioStudioId } from "./audioStudioModel.js";
import { sanitizeAudioStudioExportName } from "./audioStudioExport.js";

export const AUDIO_STUDIO_DB_NAME = "rifflab-audio-studio-v1";
export const AUDIO_STUDIO_DB_VERSION = 2;
export const AUDIO_STUDIO_MIX_STORE = "mixes";

const audioStudioMixListeners = new Set();

function notifyAudioStudioMixLibraryChanged() {
  queueMicrotask(() => audioStudioMixListeners.forEach((listener) => listener()));
}

export function subscribeAudioStudioMixLibrary(listener) {
  if (typeof listener !== "function") return () => {};
  audioStudioMixListeners.add(listener);
  return () => audioStudioMixListeners.delete(listener);
}

function openAudioStudioDatabase(indexedDBApi = typeof window !== "undefined" ? window.indexedDB : null) {
  return new Promise((resolve, reject) => {
    if (!indexedDBApi) {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    const request = indexedDBApi.open(AUDIO_STUDIO_DB_NAME, AUDIO_STUDIO_DB_VERSION);
    request.onerror = () => reject(request.error || new Error("Unable to open Audio Studio storage."));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(AUDIO_STUDIO_MIX_STORE)) {
        request.result.createObjectStore(AUDIO_STUDIO_MIX_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function runAudioStudioTransaction(storeName, mode, operation, indexedDBApi) {
  return openAudioStudioDatabase(indexedDBApi).then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    let result = null;
    request.onerror = () => reject(request.error || new Error("Audio Studio storage request failed."));
    request.onsuccess = () => { result = request.result ?? null; };
    transaction.oncomplete = () => { database.close(); resolve(result); };
    transaction.onerror = () => { database.close(); reject(transaction.error || new Error("Audio Studio transaction failed.")); };
    transaction.onabort = () => database.close();
  }));
}

export function normalizeAudioStudioMix(mix, now = Date.now()) {
  if (!(mix?.blob instanceof Blob) || mix.blob.size === 0) return null;
  const createdAt = Math.max(0, Number(mix.createdAt) || Number(now) || Date.now());
  const fileName = sanitizeAudioStudioExportName(mix.fileName || mix.name);
  return {
    blob: mix.blob.type === "audio/wav" ? mix.blob : new Blob([mix.blob], { type: "audio/wav" }),
    createdAt,
    durationMs: Math.max(0, Number(mix.durationMs) || 0),
    fileName,
    id: String(mix.id || createAudioStudioId("mix")),
    mimeType: "audio/wav",
    updatedAt: Math.max(createdAt, Number(mix.updatedAt) || createdAt),
  };
}

export function createAudioStudioMixSummary(mix) {
  return {
    createdAt: mix.createdAt,
    durationMs: mix.durationMs,
    fileName: mix.fileName,
    id: mix.id,
    mimeType: mix.mimeType,
    updatedAt: mix.updatedAt,
  };
}

export async function saveAudioStudioMix(mix, indexedDBApi) {
  const normalized = normalizeAudioStudioMix({ ...mix, updatedAt: Date.now() });
  if (!normalized) throw new Error("INVALID_AUDIO_STUDIO_MIX");
  await runAudioStudioTransaction(AUDIO_STUDIO_MIX_STORE, "readwrite", (store) => store.put(normalized), indexedDBApi);
  notifyAudioStudioMixLibraryChanged();
  return normalized;
}

export async function loadAudioStudioMix(mixId, indexedDBApi) {
  if (!mixId) return null;
  const stored = await runAudioStudioTransaction(AUDIO_STUDIO_MIX_STORE, "readonly", (store) => store.get(String(mixId)), indexedDBApi);
  return stored ? normalizeAudioStudioMix(stored) : null;
}

export async function listAudioStudioMixes(indexedDBApi) {
  const records = await runAudioStudioTransaction(AUDIO_STUDIO_MIX_STORE, "readonly", (store) => store.getAll(), indexedDBApi);
  return Array.from(records || [])
    .map((mix) => normalizeAudioStudioMix(mix))
    .filter(Boolean)
    .map(createAudioStudioMixSummary)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function renameAudioStudioMix(mixId, name, indexedDBApi) {
  const mix = await loadAudioStudioMix(mixId, indexedDBApi);
  if (!mix) throw new Error("MIX_NOT_FOUND");
  return saveAudioStudioMix({ ...mix, fileName: name }, indexedDBApi);
}

export async function deleteAudioStudioMix(mixId, indexedDBApi) {
  if (!mixId) return;
  await runAudioStudioTransaction(AUDIO_STUDIO_MIX_STORE, "readwrite", (store) => store.delete(String(mixId)), indexedDBApi);
  notifyAudioStudioMixLibraryChanged();
}
