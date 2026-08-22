import { normalizeBackingLoopTitle } from "./backingLoopUtils.js";

export const BACKING_AUDIO_SOURCE_TYPES = Object.freeze({
  AUDIO_STUDIO: "audio-studio",
  IMPORT: "import",
  RECORDING: "recording",
});

export const BACKING_AUDIO_FILE_ACCEPT = [
  "audio/*",
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".mp4",
  ".ogg",
  ".oga",
  ".opus",
  ".webm",
  ".flac",
  ".aif",
  ".aiff",
  ".caf",
].join(",");

const BACKING_AUDIO_MIME_TYPES_BY_EXTENSION = Object.freeze({
  aac: "audio/aac",
  aif: "audio/aiff",
  aiff: "audio/aiff",
  caf: "audio/x-caf",
  flac: "audio/flac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  mp4: "audio/mp4",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  wave: "audio/wav",
  webm: "audio/webm",
});

const IMPORT_PROBE_TIMEOUT_MS = 20_000;

export function getBackingAudioFileExtension(fileName = "") {
  const match = String(fileName).trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
}

export function normalizeBackingAudioFileName(fileName = "") {
  return String(fileName)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export function inferBackingAudioMimeType(file = {}) {
  const declaredType = String(file.type || "").trim().toLowerCase();
  if (declaredType.startsWith("audio/")) return declaredType;
  return BACKING_AUDIO_MIME_TYPES_BY_EXTENSION[getBackingAudioFileExtension(file.name)] || declaredType;
}

export function isPotentialBackingAudioFile(file) {
  if (!file || Math.max(0, Number(file.size) || 0) <= 0) return false;
  const declaredType = String(file.type || "").trim().toLowerCase();
  if (declaredType.startsWith("audio/")) return true;
  return Boolean(BACKING_AUDIO_MIME_TYPES_BY_EXTENSION[getBackingAudioFileExtension(file.name)]);
}

export function createImportedBackingAudioSource(file, durationMs = 0, now = Date.now()) {
  if (!isPotentialBackingAudioFile(file)) throw new Error("UNSUPPORTED_BACKING_AUDIO_FILE");
  const fileName = normalizeBackingAudioFileName(file.name) || "IMPORTED AUDIO";
  const mimeType = inferBackingAudioMimeType(file) || "application/octet-stream";
  const declaredType = String(file.type || "").trim().toLowerCase();
  const blob = declaredType === mimeType ? file : new Blob([file], { type: mimeType });
  return {
    blob,
    createdAt: Number(now) || Date.now(),
    durationMs: Math.max(0, Number(durationMs) || 0),
    fileName,
    id: "",
    mimeType,
    sourceModifiedAt: Math.max(0, Number(file.lastModified) || 0),
    sourceType: BACKING_AUDIO_SOURCE_TYPES.IMPORT,
    title: normalizeBackingLoopTitle(fileName) || "IMPORTED AUDIO",
  };
}

export async function prepareImportedBackingAudioSources(files, {
  onProgress = null,
  probeDuration = probeBackingAudioDuration,
} = {}) {
  const candidates = Array.from(files || []);
  const imported = [];
  const rejected = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const file = candidates[index];
    let status = "imported";
    if (!isPotentialBackingAudioFile(file)) {
      rejected.push({ fileName: file?.name || "Unknown file", reason: "unsupported-type" });
      status = "rejected";
    } else {
      try {
        const source = createImportedBackingAudioSource(file, 0);
        const durationMs = await probeDuration(source.blob);
        imported.push({ ...source, durationMs });
      } catch {
        rejected.push({ fileName: file?.name || "Unknown file", reason: "decode-failed" });
        status = "rejected";
      }
    }
    onProgress?.({
      completed: index + 1,
      fileName: file?.name || "Unknown file",
      status,
      total: candidates.length,
    });
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
  }
  return { imported, rejected };
}

export function probeBackingAudioDuration(blob, {
  audioFactory,
  createObjectUrl,
  revokeObjectUrl,
  timeoutMs = IMPORT_PROBE_TIMEOUT_MS,
} = {}) {
  const makeAudio = audioFactory || (() => document.createElement("audio"));
  const makeUrl = createObjectUrl || ((value) => URL.createObjectURL(value));
  const releaseUrl = revokeObjectUrl || ((value) => URL.revokeObjectURL(value));

  return new Promise((resolve, reject) => {
    let audio;
    let objectUrl = "";
    let timeoutId = null;
    let settled = false;

    const cleanup = () => {
      if (timeoutId != null) globalThis.clearTimeout(timeoutId);
      if (audio) {
        audio.onloadedmetadata = null;
        audio.onerror = null;
        audio.removeAttribute?.("src");
        audio.load?.();
      }
      if (objectUrl) releaseUrl(objectUrl);
    };
    const complete = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };

    try {
      audio = makeAudio();
      objectUrl = makeUrl(blob);
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        const durationMs = Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration * 1000
          : 0;
        if (!durationMs) {
          complete(reject, new Error("INVALID_BACKING_AUDIO_DURATION"));
          return;
        }
        complete(resolve, durationMs);
      };
      audio.onerror = () => complete(reject, new Error("UNSUPPORTED_BACKING_AUDIO_CODEC"));
      timeoutId = globalThis.setTimeout(
        () => complete(reject, new Error("BACKING_AUDIO_METADATA_TIMEOUT")),
        Math.max(1_000, Number(timeoutMs) || IMPORT_PROBE_TIMEOUT_MS),
      );
      audio.src = objectUrl;
      audio.load?.();
    } catch (error) {
      complete(reject, error);
    }
  });
}
