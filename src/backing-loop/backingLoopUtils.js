const BACKING_LOOP_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/webm",
];

export const BACKING_LOOP_DEFAULT_TITLE = "BACKING LOOP";

export function formatBackingLoopTime(durationMs = 0) {
  const totalSeconds = Math.max(0, Math.floor(Number(durationMs) / 1000) || 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function normalizeBackingLoopTitle(title = "") {
  return String(title).replace(/\s+/g, " ").trim().slice(0, 40);
}

export function createBackingLoopId(cryptoApi = globalThis.crypto) {
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
  return `backing-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getPreferredBackingLoopMimeType(MediaRecorderApi) {
  if (!MediaRecorderApi || typeof MediaRecorderApi.isTypeSupported !== "function") return "";
  return BACKING_LOOP_MIME_TYPES.find((mimeType) => MediaRecorderApi.isTypeSupported(mimeType)) ?? "";
}

export function getBackingLoopStatus({ elapsedMs = 0, hasRecording = false, phase = "idle" } = {}) {
  const time = formatBackingLoopTime(elapsedMs);
  if (phase === "requesting") return { label: "MIC ACCESS", tone: "pending" };
  if (phase === "armed") return { label: "ARM", tone: "recording" };
  if (phase === "recording") return { label: `REC ${time}`, tone: "recording" };
  if (phase === "processing") return { label: "LEVELING", tone: "pending" };
  if (phase === "trimming") return { label: "TRIM", tone: "pending" };
  if (phase === "applying") return { label: "APPLYING", tone: "pending" };
  if (phase === "playing") return { label: `PLAY ${time}`, tone: "playing" };
  if (phase === "paused") return { label: `PAUSED ${time}`, tone: "paused" };
  if (phase === "saving") return { label: "SAVING", tone: "pending" };
  if (phase === "loading") return { label: "LOADING", tone: "pending" };
  if (phase === "error") return { label: "MIC CHECK", tone: "error" };
  if (!hasRecording) return { label: "EMPTY", tone: "empty" };
  return { label: `READY ${time}`, tone: "ready" };
}
