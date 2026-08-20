import {
  BACKING_AUDIO_FILE_ACCEPT,
  createImportedBackingAudioSource,
  isPotentialBackingAudioFile,
} from "../backing-loop/backingAudioSource.js";
import { createAudioStudioSource } from "./audioStudioModel.js";

export const AUDIO_STUDIO_FILE_ACCEPT = BACKING_AUDIO_FILE_ACCEPT;

export function decodeAudioStudioData(context, arrayBuffer) {
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

export function buildAudioStudioWaveformPeaks(audioBuffer, bucketCount = 180) {
  const channelCount = Math.max(0, Number(audioBuffer?.numberOfChannels) || 0);
  const length = Math.max(0, Number(audioBuffer?.length) || 0);
  if (!channelCount || !length || typeof audioBuffer.getChannelData !== "function") {
    return { peakAmplitude: 0, waveformPeaks: [] };
  }
  const safeBucketCount = Math.max(12, Math.min(512, Math.round(Number(bucketCount) || 180)));
  const peaks = Array.from({ length: safeBucketCount }, () => 0);
  let peakAmplitude = 0;
  for (let channel = 0; channel < channelCount; channel += 1) {
    const samples = audioBuffer.getChannelData(channel);
    for (let bucket = 0; bucket < safeBucketCount; bucket += 1) {
      const start = Math.floor((bucket / safeBucketCount) * length);
      const end = Math.max(start + 1, Math.floor(((bucket + 1) / safeBucketCount) * length));
      let bucketPeak = 0;
      const sampleStep = Math.max(1, Math.floor((end - start) / 96));
      for (let index = start; index < end; index += sampleStep) {
        bucketPeak = Math.max(bucketPeak, Math.abs(samples[index] || 0));
      }
      peaks[bucket] = Math.max(peaks[bucket], bucketPeak);
      peakAmplitude = Math.max(peakAmplitude, bucketPeak);
    }
  }
  return {
    peakAmplitude,
    waveformPeaks: peaks.map((peak) => peakAmplitude ? peak / peakAmplitude : 0),
  };
}

export function detectAudioStudioBpm(audioBuffer, {
  maximumBpm = 190,
  minimumBpm = 60,
} = {}) {
  const channelCount = Math.max(0, Number(audioBuffer?.numberOfChannels) || 0);
  const length = Math.max(0, Number(audioBuffer?.length) || 0);
  const sampleRate = Math.max(1, Number(audioBuffer?.sampleRate) || 44_100);
  if (!channelCount || length < sampleRate * 2 || typeof audioBuffer.getChannelData !== "function") return 0;
  const blockSize = Math.max(32, Math.round(sampleRate / 100));
  const blockCount = Math.floor(length / blockSize);
  const energies = new Float32Array(blockCount);
  for (let block = 0; block < blockCount; block += 1) {
    let energy = 0;
    for (let channel = 0; channel < channelCount; channel += 1) {
      const samples = audioBuffer.getChannelData(channel);
      for (let index = block * blockSize; index < (block + 1) * blockSize; index += 4) {
        const value = samples[index] || 0;
        energy += value * value;
      }
    }
    energies[block] = energy;
  }
  const onsets = [];
  const minimumGapBlocks = Math.max(1, Math.round(0.16 * sampleRate / blockSize));
  for (let block = 8; block < energies.length - 1; block += 1) {
    let localMean = 0;
    for (let offset = 1; offset <= 8; offset += 1) localMean += energies[block - offset];
    localMean /= 8;
    const isPeak = energies[block] > energies[block - 1] && energies[block] >= energies[block + 1];
    if (!isPeak || energies[block] < Math.max(1e-7, localMean * 1.45)) continue;
    if (!onsets.length || block - onsets.at(-1) >= minimumGapBlocks) onsets.push(block);
    else if (energies[block] > energies[onsets.at(-1)]) onsets[onsets.length - 1] = block;
  }
  if (onsets.length < 4) return 0;
  const scores = new Map();
  for (let startIndex = 0; startIndex < onsets.length - 1; startIndex += 1) {
    for (let distance = 1; distance <= 4 && startIndex + distance < onsets.length; distance += 1) {
      const intervalSeconds = ((onsets[startIndex + distance] - onsets[startIndex]) * blockSize / sampleRate) / distance;
      if (intervalSeconds <= 0) continue;
      let bpm = 60 / intervalSeconds;
      while (bpm < minimumBpm) bpm *= 2;
      while (bpm > maximumBpm) bpm /= 2;
      if (bpm < minimumBpm || bpm > maximumBpm) continue;
      const bucket = Math.round(bpm);
      scores.set(bucket, (scores.get(bucket) || 0) + distance);
    }
  }
  if (!scores.size) return 0;
  return [...scores.entries()].sort((left, right) => right[1] - left[1])[0][0];
}

export function stretchAudioStudioPcm(audioBuffer, tempoRatio = 1) {
  const ratio = Math.max(0.5, Math.min(2, Number(tempoRatio) || 1));
  const channelCount = Math.max(0, Number(audioBuffer?.numberOfChannels) || 0);
  const inputLength = Math.max(0, Number(audioBuffer?.length) || 0);
  const sampleRate = Math.max(1, Number(audioBuffer?.sampleRate) || 44_100);
  if (!channelCount || !inputLength || typeof audioBuffer.getChannelData !== "function") {
    throw new Error("INVALID_AUDIO_BUFFER");
  }
  if (Math.abs(ratio - 1) < 0.001) {
    return {
      channels: Array.from({ length: channelCount }, (_, channel) => new Float32Array(audioBuffer.getChannelData(channel))),
      sampleRate,
    };
  }
  const frameSize = 2_048;
  const analysisHop = 1_024;
  const synthesisHop = Math.max(128, Math.round(analysisHop / ratio));
  const frameCount = Math.max(1, Math.ceil(Math.max(0, inputLength - frameSize) / analysisHop) + 1);
  const outputLength = Math.max(frameSize, (frameCount - 1) * synthesisHop + frameSize);
  const window = Float32Array.from({ length: frameSize }, (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (frameSize - 1)));
  const normalization = new Float32Array(outputLength);
  const channels = Array.from({ length: channelCount }, () => new Float32Array(outputLength));
  for (let frame = 0; frame < frameCount; frame += 1) {
    const inputStart = frame * analysisHop;
    const outputStart = frame * synthesisHop;
    for (let frameIndex = 0; frameIndex < frameSize; frameIndex += 1) {
      const outputIndex = outputStart + frameIndex;
      if (outputIndex >= outputLength) break;
      const weight = window[frameIndex];
      normalization[outputIndex] += weight;
      const inputIndex = inputStart + frameIndex;
      if (inputIndex >= inputLength) continue;
      for (let channel = 0; channel < channelCount; channel += 1) {
        channels[channel][outputIndex] += (audioBuffer.getChannelData(channel)[inputIndex] || 0) * weight;
      }
    }
  }
  for (let index = 0; index < outputLength; index += 1) {
    const weight = normalization[index];
    if (weight < 1e-6) continue;
    for (let channel = 0; channel < channelCount; channel += 1) channels[channel][index] /= weight;
  }
  return { channels, sampleRate };
}

export async function decodeAudioStudioFiles(files, {
  AudioContextApi = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null,
  bucketCount = 180,
  context: providedContext = null,
  onProgress = null,
} = {}) {
  const candidates = Array.from(files || []);
  if (!providedContext && !AudioContextApi) throw new Error("AUDIO_CONTEXT_UNAVAILABLE");
  const context = providedContext || new AudioContextApi();
  const ownsContext = !providedContext;
  const decoded = [];
  const rejected = [];
  try {
    for (let index = 0; index < candidates.length; index += 1) {
      const file = candidates[index];
      let status = "decoded";
      if (!isPotentialBackingAudioFile(file)) {
        rejected.push({ fileName: file?.name || "Unknown file", reason: "unsupported-type" });
        status = "rejected";
        onProgress?.({ completed: index + 1, fileName: file?.name || "Unknown file", status, total: candidates.length });
        continue;
      }
      try {
        const imported = createImportedBackingAudioSource(file, 0);
        const audioBuffer = await decodeAudioStudioData(context, await imported.blob.arrayBuffer());
        const durationMs = Math.max(1, Number(audioBuffer.duration) * 1000 || 0);
        const waveform = buildAudioStudioWaveformPeaks(audioBuffer, bucketCount);
        const detectedBpm = detectAudioStudioBpm(audioBuffer);
        decoded.push({
          audioBuffer,
          source: createAudioStudioSource({
            blob: imported.blob,
            durationMs,
            detectedBpm,
            fileName: imported.fileName,
            lastModified: imported.sourceModifiedAt,
            mimeType: imported.mimeType,
            ...waveform,
          }),
        });
      } catch {
        rejected.push({ fileName: file?.name || "Unknown file", reason: "decode-failed" });
        status = "rejected";
      }
      onProgress?.({ completed: index + 1, fileName: file?.name || "Unknown file", status, total: candidates.length });
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    }
  } finally {
    if (ownsContext) {
      try {
        await context.close?.();
      } catch {
        // A decode-only context may already be closed by Safari when backgrounded.
      }
    }
  }
  return { decoded, rejected };
}
