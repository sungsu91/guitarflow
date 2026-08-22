import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeAudioStudioExportName } from "../src/audio-studio/audioStudioExport.js";
import {
  createAudioStudioMixSummary,
  normalizeAudioStudioMix,
} from "../src/audio-studio/audioStudioStorage.js";

test("WAV export names are safe for mobile Files and desktop downloads", () => {
  assert.equal(sanitizeAudioStudioExportName("My / Practice: 01"), "My - Practice- 01.wav");
  assert.equal(sanitizeAudioStudioExportName("Practice Mix.wav"), "Practice Mix.wav");
  assert.equal(sanitizeAudioStudioExportName("Practice Mix.mp3"), "Practice Mix.wav");
  assert.equal(sanitizeAudioStudioExportName(""), "audio-studio-mix.wav");
});

test("completed mixes keep real WAV blobs while library summaries omit their bytes", () => {
  const mix = normalizeAudioStudioMix({
    blob: new Blob(["RIFF-WAVE"], { type: "audio/wav" }),
    durationMs: 12_340,
    fileName: "Practice Mix.wav",
    id: "mix-a",
  }, 100);
  assert.equal(mix.fileName, "Practice Mix.wav");
  assert.equal(mix.mimeType, "audio/wav");
  const summary = createAudioStudioMixSummary(mix);
  assert.equal(summary.durationMs, 12_340);
  assert.equal("blob" in summary, false);
  assert.equal("sourceProjectId" in summary, false);
});
