import test from "node:test";
import assert from "node:assert/strict";
import { createAudioStudioProject, createAudioStudioTrack } from "../src/audio-studio/audioStudioModel.js";
import { sanitizeAudioStudioExportName } from "../src/audio-studio/audioStudioExport.js";
import { createAudioStudioProjectSummary } from "../src/audio-studio/audioStudioStorage.js";

test("project summaries retain exact identity without duplicating source blobs", () => {
  const project = createAudioStudioProject({ id: "project-a", name: "Session A", tracks: [createAudioStudioTrack({ name: "Guitar" })] }, 10);
  const summary = createAudioStudioProjectSummary(project);
  assert.deepEqual(summary, { clipCount: 0, durationMs: 0, id: "project-a", name: "Session A", sourceCount: 0, trackCount: 1, updatedAt: 10 });
  assert.equal("audioSources" in summary, false);
});

test("WAV export names are safe for mobile Files and desktop downloads", () => {
  assert.equal(sanitizeAudioStudioExportName("My / Practice: 01"), "My - Practice- 01.wav");
  assert.equal(sanitizeAudioStudioExportName(""), "audio-studio-mix.wav");
});
