export const AUDIO_STUDIO_TIME_STRETCH_ALGORITHM = "signalsmith-stretch";
export const AUDIO_STUDIO_TIME_STRETCH_VERSION = "1.3.2";
export const AUDIO_STUDIO_TIME_STRETCH_MIN_RATIO = 0.75;
export const AUDIO_STUDIO_TIME_STRETCH_MAX_RATIO = 1.5;

let signalsmithModulePromise = null;

function loadSignalsmithStretch() {
  signalsmithModulePromise ||= import("signalsmith-stretch");
  return signalsmithModulePromise.then((module) => module.default);
}

export function getAudioStudioTimeStretchRatio(sourceBpm, targetBpm) {
  const source = Number(sourceBpm);
  const target = Number(targetBpm);
  if (!Number.isFinite(source) || !Number.isFinite(target) || source <= 0 || target <= 0) return 0;
  return target / source;
}

export function isAudioStudioTimeStretchRatioSupported(ratio) {
  const value = Number(ratio);
  return Number.isFinite(value)
    && value >= AUDIO_STUDIO_TIME_STRETCH_MIN_RATIO
    && value <= AUDIO_STUDIO_TIME_STRETCH_MAX_RATIO;
}

export function createAudioStudioTimeStretchCacheKey(sourceId, ratio, sampleRate = 44_100) {
  return [
    AUDIO_STUDIO_TIME_STRETCH_ALGORITHM,
    AUDIO_STUDIO_TIME_STRETCH_VERSION,
    String(sourceId || ""),
    Math.max(1, Math.round(Number(sampleRate) || 44_100)),
    Number(ratio).toFixed(6),
  ].join(":");
}

function reportProgress(callback, value) {
  callback?.(Math.max(0, Math.min(1, Number(value) || 0)));
}

export async function renderAudioStudioTimeStretch(audioBuffer, tempoRatio, {
  OfflineAudioContextApi = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext,
  onProgress = null,
} = {}) {
  const ratio = Number(tempoRatio);
  if (!isAudioStudioTimeStretchRatioSupported(ratio)) throw new Error("UNSUPPORTED_TIME_STRETCH_RATIO");
  const channelCount = Math.max(0, Math.round(Number(audioBuffer?.numberOfChannels) || 0));
  const inputLength = Math.max(0, Math.round(Number(audioBuffer?.length) || 0));
  const sampleRate = Math.max(1, Math.round(Number(audioBuffer?.sampleRate) || 44_100));
  if (!channelCount || !inputLength || typeof audioBuffer.getChannelData !== "function") {
    throw new Error("INVALID_AUDIO_BUFFER");
  }
  if (!OfflineAudioContextApi || typeof globalThis.AudioWorkletNode !== "function") {
    throw new Error("AUDIO_WORKLET_UNAVAILABLE");
  }

  const outputLength = Math.max(1, Math.ceil(inputLength / ratio));
  const context = new OfflineAudioContextApi(channelCount, outputLength, sampleRate);
  if (!context.audioWorklet || typeof context.startRendering !== "function") {
    throw new Error("AUDIO_WORKLET_UNAVAILABLE");
  }

  reportProgress(onProgress, 0.02);
  const SignalsmithStretch = await loadSignalsmithStretch();
  const stretch = await SignalsmithStretch(context, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [channelCount],
  });
  reportProgress(onProgress, 0.08);

  const channels = Array.from(
    { length: channelCount },
    (_, channel) => new Float32Array(audioBuffer.getChannelData(channel)),
  );
  const transfer = channels.map((channel) => channel.buffer);
  await stretch.addBuffers(channels, transfer);
  const inputDuration = inputLength / sampleRate;
  const updateInterval = Math.max(0.05, Math.min(0.5, inputDuration / 40));
  await stretch.setUpdateInterval(updateInterval, (inputTime) => {
    reportProgress(onProgress, 0.1 + Math.min(0.86, (Math.max(0, inputTime) / inputDuration) * 0.86));
  });
  await stretch.start({
    active: true,
    input: 0,
    output: 0,
    rate: ratio,
    semitones: 0,
  });
  stretch.connect(context.destination);
  reportProgress(onProgress, 0.1);

  try {
    const rendered = await context.startRendering();
    reportProgress(onProgress, 1);
    return rendered;
  } finally {
    try {
      stretch.disconnect();
      stretch.port?.close?.();
    } catch {
      // The offline context may already have released its worklet after rendering.
    }
  }
}
