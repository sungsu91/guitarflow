import assert from "node:assert/strict";
import test from "node:test";

import {
  AUDIO_STUDIO_LIBRARY_ID_PREFIX,
  createAudioStudioBackingSource,
  getAudioStudioMixIdFromLibraryId,
  isAudioStudioLibraryId,
} from "../src/backing-loop/audioStudioLibrarySource.js";
import { BACKING_AUDIO_SOURCE_TYPES } from "../src/backing-loop/backingAudioSource.js";

test("Audio Studio mixes become direct Backing Loop library references", () => {
  const source = createAudioStudioBackingSource({
    createdAt: 10,
    durationMs: 9_000,
    fileName: "Lemon Tree Mix.wav",
    id: "mix-lemon",
    mimeType: "audio/wav",
    updatedAt: 20,
  });
  assert.equal(source.id, `${AUDIO_STUDIO_LIBRARY_ID_PREFIX}mix-lemon`);
  assert.equal(source.sourceType, BACKING_AUDIO_SOURCE_TYPES.AUDIO_STUDIO);
  assert.equal(source.title, "Lemon Tree Mix.wav");
  assert.equal("blob" in source, false);
  assert.equal(isAudioStudioLibraryId(source.id), true);
  assert.equal(getAudioStudioMixIdFromLibraryId(source.id), "mix-lemon");
});
