const DEFAULT_TARGET_PEAK_DB = -1.5;
const DEFAULT_FADE_MS = 6;
const DEFAULT_MAX_BOOST_DB = 12;
export const DEFAULT_MIN_TRIM_MS = 300;
const DEFAULT_ZERO_CROSSING_WINDOW_MS = 4;

const dbToGain = (value) => 10 ** (value / 20);

export function calculatePeakNormalizationGain(
  peak,
  targetPeakDb = DEFAULT_TARGET_PEAK_DB,
  maxBoostDb = DEFAULT_MAX_BOOST_DB,
) {
  const safePeak = Math.max(0, Number(peak) || 0);
  if (!safePeak) return 1;
  const targetPeak = dbToGain(targetPeakDb);
  if (safePeak >= targetPeak) return 1;
  return Math.min(targetPeak / safePeak, dbToGain(maxBoostDb));
}

export function applyEdgeFades(samples, sampleRate, fadeMs = DEFAULT_FADE_MS) {
  const fadeSamples = Math.min(
    Math.floor(samples.length / 2),
    Math.max(0, Math.round((sampleRate * fadeMs) / 1000)),
  );
  for (let index = 0; index < fadeSamples; index += 1) {
    const gain = index / Math.max(1, fadeSamples);
    samples[index] *= gain;
    samples[samples.length - 1 - index] *= gain;
  }
  return samples;
}

function writeAscii(view, offset, text) {
  for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
}

export function encodePcmWav(channels, sampleRate) {
  const safeChannels = Array.from(channels || []).filter((channel) => channel?.length);
  if (!safeChannels.length) return new Blob([], { type: "audio/wav" });
  const channelCount = safeChannels.length;
  const frameCount = Math.min(...safeChannels.map((channel) => channel.length));
  const bytesPerFrame = channelCount * 2;
  const buffer = new ArrayBuffer(44 + frameCount * bytesPerFrame);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + frameCount * bytesPerFrame, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerFrame, true);
  view.setUint16(32, bytesPerFrame, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, frameCount * bytesPerFrame, true);
  let offset = 44;
  for (let index = 0; index < frameCount; index += 1) {
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const sample = Math.max(-1, Math.min(1, safeChannels[channelIndex][index]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function encodeMonoPcmWav(samples, sampleRate) {
  return encodePcmWav([samples], sampleRate);
}

function decodeAudioData(context, arrayBuffer) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const complete = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    try {
      const promise = context.decodeAudioData(arrayBuffer, complete, fail);
      promise?.then?.(complete, fail);
    } catch (error) {
      fail(error);
    }
  });
}

function copyDecodedAudio(decoded) {
  const channels = [];
  for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
    channels.push(new Float32Array(decoded.getChannelData(channel)));
  }
  return {
    channels,
    durationMs: (decoded.length / decoded.sampleRate) * 1000,
    length: decoded.length,
    sampleRate: decoded.sampleRate,
  };
}

export async function decodeLoopRecording(blob) {
  const AudioContextApi = typeof window !== "undefined"
    ? window.AudioContext || window.webkitAudioContext
    : null;
  if (!AudioContextApi || !blob?.arrayBuffer) throw new Error("AUDIO_DECODE_UNAVAILABLE");

  let context;
  try {
    context = new AudioContextApi();
    const decoded = await decodeAudioData(context, await blob.arrayBuffer());
    return copyDecodedAudio(decoded);
  } finally {
    try {
      await context?.close?.();
    } catch {
      // Safari may close a decode context while the app is backgrounded.
    }
  }
}

export function buildWaveformPeaks(audioData, bucketCount = 96) {
  const channels = audioData?.channels || [];
  const frameCount = Math.max(0, Number(audioData?.length) || channels[0]?.length || 0);
  const count = Math.max(1, Math.floor(bucketCount));
  if (!channels.length || !frameCount) return Array(count).fill(0);

  const peaks = Array(count).fill(0);
  let overallPeak = 0;
  for (let bucket = 0; bucket < count; bucket += 1) {
    const start = Math.floor((bucket * frameCount) / count);
    const end = Math.max(start + 1, Math.floor(((bucket + 1) * frameCount) / count));
    let peak = 0;
    for (const channel of channels) {
      for (let index = start; index < Math.min(end, channel.length); index += 1) {
        peak = Math.max(peak, Math.abs(channel[index]));
      }
    }
    peaks[bucket] = peak;
    overallPeak = Math.max(overallPeak, peak);
  }
  if (!overallPeak) return peaks;
  return peaks.map((peak) => peak / overallPeak);
}

export function clampTrimRange(startMs, endMs, durationMs, minimumTrimMs = DEFAULT_MIN_TRIM_MS) {
  const duration = Math.max(0, Number(durationMs) || 0);
  const minimum = Math.min(duration, Math.max(0, Number(minimumTrimMs) || 0));
  let start = Math.max(0, Math.min(duration, Number(startMs) || 0));
  let end = Math.max(0, Math.min(duration, Number(endMs) || duration));
  if (end - start < minimum) {
    if (start + minimum <= duration) end = start + minimum;
    else start = Math.max(0, end - minimum);
  }
  return { startMs: start, endMs: end, lengthMs: Math.max(0, end - start) };
}

function findNearestZeroCrossing(samples, targetIndex, windowSamples) {
  if (!samples?.length) return targetIndex;
  const start = Math.max(0, targetIndex - windowSamples);
  const end = Math.min(samples.length - 1, targetIndex + windowSamples);
  let bestIndex = Math.max(start, Math.min(end, targetIndex));
  let bestScore = Math.abs(samples[bestIndex] || 0);
  for (let index = start; index <= end; index += 1) {
    const current = samples[index] || 0;
    const previous = index > 0 ? samples[index - 1] || 0 : current;
    const crossesZero = (previous <= 0 && current >= 0) || (previous >= 0 && current <= 0);
    const score = Math.abs(current) * (crossesZero ? 0.25 : 1);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return bestIndex;
}

export function trimLoopAudioData(audioData, startMs, endMs, options = {}) {
  const channels = audioData?.channels || [];
  const sampleRate = Math.max(1, Number(audioData?.sampleRate) || 0);
  const frameCount = Math.max(0, Number(audioData?.length) || channels[0]?.length || 0);
  if (!channels.length || !frameCount || !sampleRate) throw new Error("INVALID_AUDIO_DATA");

  const durationMs = (frameCount / sampleRate) * 1000;
  const range = clampTrimRange(
    startMs,
    endMs,
    durationMs,
    options.minimumTrimMs ?? DEFAULT_MIN_TRIM_MS,
  );
  let startSample = Math.max(0, Math.min(frameCount - 1, Math.round((range.startMs * sampleRate) / 1000)));
  let endSample = Math.max(startSample + 1, Math.min(frameCount, Math.round((range.endMs * sampleRate) / 1000)));
  const minimumSamples = Math.min(
    frameCount,
    Math.max(1, Math.round((Math.min(durationMs, options.minimumTrimMs ?? DEFAULT_MIN_TRIM_MS) * sampleRate) / 1000)),
  );
  const zeroWindow = Math.max(
    0,
    Math.round((sampleRate * (options.zeroCrossingWindowMs ?? DEFAULT_ZERO_CROSSING_WINDOW_MS)) / 1000),
  );
  const reference = channels[0];
  const adjustedStart = startSample === 0 ? 0 : findNearestZeroCrossing(reference, startSample, zeroWindow);
  const adjustedEnd = endSample === frameCount
    ? frameCount
    : Math.min(frameCount, findNearestZeroCrossing(reference, endSample, zeroWindow));
  if (adjustedEnd - adjustedStart >= minimumSamples) {
    startSample = adjustedStart;
    endSample = adjustedEnd;
  }

  const trimmedChannels = channels.map((channel) => new Float32Array(channel.slice(startSample, endSample)));
  let peak = 0;
  for (const channel of trimmedChannels) {
    for (let index = 0; index < channel.length; index += 1) peak = Math.max(peak, Math.abs(channel[index]));
  }
  const normalizationGain = calculatePeakNormalizationGain(
    peak,
    options.targetPeakDb ?? DEFAULT_TARGET_PEAK_DB,
    options.maxBoostDb ?? DEFAULT_MAX_BOOST_DB,
  );
  for (const channel of trimmedChannels) {
    for (let index = 0; index < channel.length; index += 1) channel[index] *= normalizationGain;
    applyEdgeFades(channel, sampleRate, options.fadeMs ?? DEFAULT_FADE_MS);
  }

  return {
    audioData: {
      channels: trimmedChannels,
      durationMs: ((endSample - startSample) / sampleRate) * 1000,
      length: endSample - startSample,
      sampleRate,
    },
    blob: encodePcmWav(trimmedChannels, sampleRate),
    durationMs: ((endSample - startSample) / sampleRate) * 1000,
    endSample,
    mimeType: "audio/wav",
    normalizationGain,
    peakBefore: peak,
    startSample,
  };
}

export async function processLoopRecording(blob, fallbackDurationMs = 0, options = {}) {
  const AudioContextApi = typeof window !== "undefined"
    ? window.AudioContext || window.webkitAudioContext
    : null;
  if (!AudioContextApi || !blob?.arrayBuffer) {
    return { blob, durationMs: fallbackDurationMs, mimeType: blob?.type || "audio/webm", processed: false };
  }

  let context;
  try {
    context = new AudioContextApi();
    const decoded = await decodeAudioData(context, await blob.arrayBuffer());
    const mono = new Float32Array(decoded.length);
    let peak = 0;
    for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
      const source = decoded.getChannelData(channel);
      for (let index = 0; index < decoded.length; index += 1) mono[index] += source[index] / decoded.numberOfChannels;
    }
    for (let index = 0; index < mono.length; index += 1) peak = Math.max(peak, Math.abs(mono[index]));
    const normalizationGain = calculatePeakNormalizationGain(
      peak,
      options.targetPeakDb ?? DEFAULT_TARGET_PEAK_DB,
      options.maxBoostDb ?? DEFAULT_MAX_BOOST_DB,
    );
    for (let index = 0; index < mono.length; index += 1) mono[index] *= normalizationGain;
    applyEdgeFades(mono, decoded.sampleRate, options.fadeMs ?? DEFAULT_FADE_MS);
    return {
      audioData: {
        channels: [mono],
        durationMs: (decoded.length / decoded.sampleRate) * 1000,
        length: decoded.length,
        sampleRate: decoded.sampleRate,
      },
      blob: encodeMonoPcmWav(mono, decoded.sampleRate),
      durationMs: (decoded.length / decoded.sampleRate) * 1000,
      mimeType: "audio/wav",
      normalizationGain,
      peakBefore: peak,
      processed: true,
    };
  } catch {
    return { blob, durationMs: fallbackDurationMs, mimeType: blob?.type || "audio/webm", processed: false };
  } finally {
    try {
      await context?.close?.();
    } catch {
      // Safari may close a decode context while the app is backgrounded.
    }
  }
}
