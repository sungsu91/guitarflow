const BACKING_LOOP_DB_NAME = "rifflab-backing-loop-v1";
const BACKING_LOOP_DB_VERSION = 1;
const BACKING_LOOP_STORE_NAME = "recordings";
const LEGACY_BACKING_LOOP_RECORD_ID = "current";

function openBackingLoopDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }

    const request = window.indexedDB.open(BACKING_LOOP_DB_NAME, BACKING_LOOP_DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Unable to open backing loop storage."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(BACKING_LOOP_STORE_NAME)) {
        database.createObjectStore(BACKING_LOOP_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function runBackingLoopTransaction(mode, operation) {
  return openBackingLoopDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(BACKING_LOOP_STORE_NAME, mode);
    const store = transaction.objectStore(BACKING_LOOP_STORE_NAME);
    const request = operation(store);
    let settled = false;

    request.onerror = () => {
      if (settled) return;
      settled = true;
      reject(request.error ?? new Error("Backing loop storage request failed."));
    };
    request.onsuccess = () => {
      if (settled) return;
      settled = true;
      resolve(request.result ?? null);
    };
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      if (settled) return;
      settled = true;
      reject(transaction.error ?? new Error("Backing loop storage transaction failed."));
    };
    transaction.onabort = () => database.close();
  }));
}

function normalizeStoredBackingLoop(recording) {
  if (!(recording?.blob instanceof Blob) || recording.blob.size === 0) return null;
  const createdAt = Number(recording.createdAt) || Date.now();
  return {
    blob: recording.blob,
    createdAt,
    durationMs: Math.max(0, Number(recording.durationMs) || 0),
    id: String(recording.id || LEGACY_BACKING_LOOP_RECORD_ID),
    mimeType: recording.mimeType || recording.blob.type || "audio/webm",
    title: String(recording.title || "Backing Loop").trim().slice(0, 40) || "Backing Loop",
    updatedAt: Number(recording.updatedAt) || createdAt,
  };
}

export async function loadBackingLoopLibrary() {
  const savedRecordings = await runBackingLoopTransaction("readonly", (store) => store.getAll());
  return (Array.isArray(savedRecordings) ? savedRecordings : [])
    .map(normalizeStoredBackingLoop)
    .filter(Boolean)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function loadBackingLoopRecording(id) {
  if (!id) return null;
  const savedRecording = await runBackingLoopTransaction("readonly", (store) => store.get(String(id)));
  return normalizeStoredBackingLoop(savedRecording);
}

export async function saveBackingLoopRecording(recording) {
  if (!(recording?.blob instanceof Blob) || recording.blob.size === 0) {
    throw new Error("There is no backing loop to save.");
  }

  const storedRecording = normalizeStoredBackingLoop({
    ...recording,
    id: recording.id,
    title: recording.title,
    updatedAt: Date.now(),
  });
  if (!storedRecording) throw new Error("The backing loop is invalid.");

  await runBackingLoopTransaction("readwrite", (store) => store.put(storedRecording));
  return storedRecording;
}

export async function deleteBackingLoopRecording(id) {
  if (!id) return;
  await runBackingLoopTransaction("readwrite", (store) => store.delete(String(id)));
}
