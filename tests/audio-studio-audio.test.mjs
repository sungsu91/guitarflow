import test from "node:test";
import assert from "node:assert/strict";
import {
  AUDIO_STUDIO_FILE_ACCEPT,
  AUDIO_STUDIO_MAX_IMPORT_BYTES,
  AUDIO_STUDIO_MAX_DECODED_IMPORT_BYTES,
  buildAudioStudioWaveformPeaks,
  decodeAudioStudioFiles,
  detectAudioStudioBpm,
} from "../src/audio-studio/audioStudioAudio.js";

test('oversized imports are rejected before reading and decoded batches are bounded', async () => {
  let reads = 0;
  const huge = { name: 'huge.wav', type: 'audio/wav', size: AUDIO_STUDIO_MAX_IMPORT_BYTES + 1, arrayBuffer() { reads++; throw Error('must not read'); } };
  const small = new File([new Uint8Array([1])], 'small.wav', { type: 'audio/wav' });
  const context = { decodeAudioData: async () => ({ length: AUDIO_STUDIO_MAX_DECODED_IMPORT_BYTES / 4 + 1, numberOfChannels: 1, duration: 3600 }) };
  const result = await decodeAudioStudioFiles([huge, small], { context });
  assert.equal(reads, 0);
  assert.equal(result.decoded.length, 0);
  assert.deepEqual(result.rejected.map(r => r.reason), ['file-too-large', 'decoded-limit']);
});

test("Audio Studio multi-import advertises the common mobile audio formats", () => {
  assert.match(AUDIO_STUDIO_FILE_ACCEPT, /audio\/\*/);
  for (const extension of [".mp3", ".wav", ".m4a", ".aac"]) {
    assert.ok(AUDIO_STUDIO_FILE_ACCEPT.includes(extension));
  }
});

test("local BPM analysis operates on decoded PCM without forcing its estimate", () => {
  const sampleRate = 1_000;
  const samples = new Float32Array(sampleRate * 8);
  for (let beat = 0; beat < 16; beat += 1) {
    const start = beat * 500;
    for (let index = start; index < start + 20; index += 1) samples[index] = 1 - ((index - start) / 20);
  }
  const buffer = {
    getChannelData: () => samples,
    length: samples.length,
    numberOfChannels: 1,
    sampleRate,
  };
  assert.ok(Math.abs(detectAudioStudioBpm(buffer) - 120) <= 2);
});

test("waveform analysis creates bounded normalized peaks without retaining PCM copies", () => {
  const left = new Float32Array(1_000);
  const right = new Float32Array(1_000);
  left[120] = 0.5;
  right[880] = -1;
  const result = buildAudioStudioWaveformPeaks({
    getChannelData: (channel) => channel ? right : left,
    length: 1_000,
    numberOfChannels: 2,
  }, 20);
  assert.equal(result.waveformPeaks.length, 20);
  assert.equal(result.peakAmplitude, 1);
  assert.ok(result.waveformPeaks.every((peak) => peak >= 0 && peak <= 1));
});

test("multi-file decode preserves selection order and reports unsupported files separately", async () => {
  class FakeAudioContext {
    async close() {}
    decodeAudioData(arrayBuffer, complete) {
      const duration = new Uint8Array(arrayBuffer)[0];
      const buffer = {
        duration,
        getChannelData: () => new Float32Array([0, 0.5, -0.25]),
        length: 3,
        numberOfChannels: 1,
      };
      queueMicrotask(() => complete(buffer));
      return Promise.resolve(buffer);
    }
  }
  const file = (name, duration) => {
    const blob = new Blob([new Uint8Array([duration])], { type: "audio/wav" });
    Object.defineProperty(blob, "name", { value: name });
    return blob;
  };
  const invalid = new Blob(["x"], { type: "text/plain" });
  Object.defineProperty(invalid, "name", { value: "notes.txt" });
  const progress = [];
  const result = await decodeAudioStudioFiles([file("A.wav", 1), invalid, file("B.wav", 2)], {
    AudioContextApi: FakeAudioContext,
    bucketCount: 12,
    onProgress: (update) => progress.push(update),
  });
  assert.deepEqual(result.decoded.map((item) => item.source.fileName), ["A.wav", "B.wav"]);
  assert.deepEqual(result.decoded.map((item) => item.source.durationMs), [1_000, 2_000]);
  assert.equal(result.rejected[0].fileName, "notes.txt");
  assert.deepEqual(progress.map(({ completed, status }) => [completed, status]), [
    [1, "decoded"],
    [2, "rejected"],
    [3, "decoded"],
  ]);
});
