import { createAudioStudioId, normalizeAudioStudioProject } from "./audioStudioModel.js";

export const AUDIO_STUDIO_DB_NAME = "rifflab-audio-studio-v1";
export const AUDIO_STUDIO_DB_VERSION = 1;
export const AUDIO_STUDIO_PROJECT_STORE = "projects";

function openAudioStudioDatabase(indexedDBApi = typeof window !== "undefined" ? window.indexedDB : null) {
  return new Promise((resolve, reject) => {
    if (!indexedDBApi) {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    const request = indexedDBApi.open(AUDIO_STUDIO_DB_NAME, AUDIO_STUDIO_DB_VERSION);
    request.onerror = () => reject(request.error || new Error("Unable to open Audio Studio storage."));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(AUDIO_STUDIO_PROJECT_STORE)) {
        request.result.createObjectStore(AUDIO_STUDIO_PROJECT_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function runAudioStudioTransaction(mode, operation, indexedDBApi) {
  return openAudioStudioDatabase(indexedDBApi).then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STUDIO_PROJECT_STORE, mode);
    const request = operation(transaction.objectStore(AUDIO_STUDIO_PROJECT_STORE));
    let result = null;
    request.onerror = () => reject(request.error || new Error("Audio Studio storage request failed."));
    request.onsuccess = () => { result = request.result ?? null; };
    transaction.oncomplete = () => { database.close(); resolve(result); };
    transaction.onerror = () => { database.close(); reject(transaction.error || new Error("Audio Studio transaction failed.")); };
    transaction.onabort = () => database.close();
  }));
}

export function createAudioStudioProjectSummary(project) {
  return {
    clipCount: project.tracks.reduce((total, track) => total + track.clips.length, 0),
    durationMs: Math.max(0, ...project.tracks.flatMap((track) => track.clips.map((clip) => clip.timelineStartMs + clip.durationMs))),
    id: project.id,
    name: project.metadata.name,
    sourceCount: project.audioSources.length,
    trackCount: project.tracks.length,
    updatedAt: project.updatedAt,
  };
}

export async function renameAudioStudioProject(projectId, name, indexedDBApi) {
  const project = await loadAudioStudioProject(projectId, indexedDBApi);
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  return saveAudioStudioProject({
    ...project,
    metadata: { ...project.metadata, name: String(name || project.metadata.name).trim().slice(0, 120) || project.metadata.name },
    updatedAt: Date.now(),
  }, indexedDBApi);
}

export async function duplicateAudioStudioProject(projectId, indexedDBApi) {
  const project = await loadAudioStudioProject(projectId, indexedDBApi);
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  const timestamp = Date.now();
  return saveAudioStudioProject({
    ...project,
    createdAt: timestamp,
    id: createAudioStudioId("project"),
    metadata: { ...project.metadata, name: `${project.metadata.name} copy`.slice(0, 120) },
    updatedAt: timestamp,
  }, indexedDBApi);
}

export async function saveAudioStudioProject(project, indexedDBApi) {
  const normalized = normalizeAudioStudioProject({ ...project, updatedAt: Date.now() });
  await runAudioStudioTransaction("readwrite", (store) => store.put(normalized), indexedDBApi);
  return normalized;
}

export async function loadAudioStudioProject(projectId, indexedDBApi) {
  if (!projectId) return null;
  const stored = await runAudioStudioTransaction("readonly", (store) => store.get(String(projectId)), indexedDBApi);
  return stored ? normalizeAudioStudioProject(stored) : null;
}

export async function listAudioStudioProjects(indexedDBApi) {
  const records = await runAudioStudioTransaction("readonly", (store) => store.getAll(), indexedDBApi);
  return Array.from(records || [])
    .map((project) => createAudioStudioProjectSummary(normalizeAudioStudioProject(project)))
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function deleteAudioStudioProject(projectId, indexedDBApi) {
  if (!projectId) return;
  await runAudioStudioTransaction("readwrite", (store) => store.delete(String(projectId)), indexedDBApi);
}
