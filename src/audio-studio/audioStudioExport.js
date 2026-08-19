import { encodePcmWav } from "../audio/audioPostProcessing.js";
import { getAudioStudioProjectDurationMs } from "./audioStudioModel.js";
import { scheduleAudioStudioPlayback, stopAudioStudioPlayback } from "./audioStudioPlayback.js";

export function sanitizeAudioStudioExportName(name) {
  const safeName = String(name || "audio-studio-mix")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return `${safeName || "audio-studio-mix"}.wav`;
}

export async function renderAudioStudioWav(project, audioBuffers, {
  OfflineAudioContextApi = typeof window !== "undefined" ? window.OfflineAudioContext || window.webkitOfflineAudioContext : null,
  sampleRate = 44_100,
} = {}) {
  if (!OfflineAudioContextApi) throw new Error("OFFLINE_AUDIO_CONTEXT_UNAVAILABLE");
  const durationMs = getAudioStudioProjectDurationMs(project);
  if (!durationMs) throw new Error("EMPTY_PROJECT");
  const speed = Math.max(0.25, Math.min(2, Number(project.practice?.speed?.current) || 1));
  const hasReverb = project.tracks.some((track) => [
    ...track.effectsChain,
    ...track.clips.flatMap((clip) => clip.processingChain),
  ].some((processor) => processor.type === "reverb" && processor.enabled !== false));
  const effectTailSeconds = hasReverb ? 2.5 : 0;
  const frameCount = Math.max(1, Math.ceil(((durationMs / 1_000 / speed) + effectTailSeconds) * sampleRate));
  const context = new OfflineAudioContextApi(2, frameCount, sampleRate);
  const exportProject = {
    ...project,
    practice: {
      ...project.practice,
      loop: { ...project.practice.loop, enabled: false },
      repeat: { ...project.practice.repeat, enabled: false },
    },
  };
  const scheduled = scheduleAudioStudioPlayback({ audioBuffers, audioContext: context, fromMs: 0, leadTimeSeconds: 0, project: exportProject });
  const rendered = await context.startRendering();
  stopAudioStudioPlayback(scheduled.nodes);
  const channels = [];
  for (let channel = 0; channel < Math.min(2, rendered.numberOfChannels); channel += 1) {
    channels.push(new Float32Array(rendered.getChannelData(channel)));
  }
  return encodePcmWav(channels, rendered.sampleRate);
}

export function downloadAudioStudioBlob(blob, fileName, documentApi = document, urlApi = URL) {
  const url = urlApi.createObjectURL(blob);
  const anchor = documentApi.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.click();
  setTimeout(() => urlApi.revokeObjectURL(url), 1_000);
}
