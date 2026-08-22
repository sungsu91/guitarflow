import {
  listAudioStudioMixes,
  loadAudioStudioMix,
  subscribeAudioStudioMixLibrary,
} from "../audio-studio/audioStudioStorage.js";
import { BACKING_AUDIO_SOURCE_TYPES } from "./backingAudioSource.js";

export const AUDIO_STUDIO_LIBRARY_ID_PREFIX = "audio-studio:";

export function isAudioStudioLibraryId(id) {
  return String(id || "").startsWith(AUDIO_STUDIO_LIBRARY_ID_PREFIX);
}

export function getAudioStudioMixIdFromLibraryId(id) {
  return isAudioStudioLibraryId(id) ? String(id).slice(AUDIO_STUDIO_LIBRARY_ID_PREFIX.length) : "";
}

export function createAudioStudioBackingSource(mix) {
  if (!mix?.id) return null;
  return {
    ...(mix.blob instanceof Blob ? { blob: mix.blob } : {}),
    audioStudioMixId: String(mix.id),
    createdAt: Math.max(0, Number(mix.createdAt) || Date.now()),
    durationMs: Math.max(0, Number(mix.durationMs) || 0),
    fileName: String(mix.fileName || "Audio Studio Mix.wav"),
    id: `${AUDIO_STUDIO_LIBRARY_ID_PREFIX}${mix.id}`,
    mimeType: mix.mimeType || mix.blob?.type || "audio/wav",
    sourceModifiedAt: Math.max(0, Number(mix.updatedAt) || 0),
    sourceType: BACKING_AUDIO_SOURCE_TYPES.AUDIO_STUDIO,
    title: String(mix.fileName || "Audio Studio Mix.wav"),
    updatedAt: Math.max(0, Number(mix.updatedAt) || Number(mix.createdAt) || Date.now()),
  };
}

export async function listAudioStudioBackingSources() {
  const mixes = await listAudioStudioMixes();
  return mixes.map(createAudioStudioBackingSource).filter(Boolean);
}

export async function loadAudioStudioBackingSource(libraryId) {
  const mixId = getAudioStudioMixIdFromLibraryId(libraryId);
  if (!mixId) return null;
  return createAudioStudioBackingSource(await loadAudioStudioMix(mixId));
}

export function subscribeAudioStudioBackingSources(listener) {
  return subscribeAudioStudioMixLibrary(listener);
}
