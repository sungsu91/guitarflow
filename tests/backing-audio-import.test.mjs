import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  BACKING_AUDIO_FILE_ACCEPT,
  BACKING_AUDIO_SOURCE_TYPES,
  createImportedBackingAudioSource,
  inferBackingAudioMimeType,
  isPotentialBackingAudioFile,
  prepareImportedBackingAudioSources,
  probeBackingAudioDuration,
} from "../src/backing-loop/backingAudioSource.js";

function createNamedBlob(name, type = "", bytes = "audio") {
  const blob = new Blob([bytes], { type });
  Object.defineProperties(blob, {
    lastModified: { value: 123_456 },
    name: { value: name },
  });
  return blob;
}

test("backing import accepts common mobile and desktop audio file types", () => {
  assert.match(BACKING_AUDIO_FILE_ACCEPT, /audio\/\*/);
  for (const extension of [".mp3", ".wav", ".m4a", ".aac"]) {
    assert.ok(BACKING_AUDIO_FILE_ACCEPT.includes(extension));
  }
  assert.equal(isPotentialBackingAudioFile(createNamedBlob("practice.MP3")), true);
  assert.equal(inferBackingAudioMimeType(createNamedBlob("practice.mp3", "application/octet-stream")), "audio/mpeg");
  assert.equal(isPotentialBackingAudioFile(createNamedBlob("iphone-export", "audio/mp4")), true);
  assert.equal(isPotentialBackingAudioFile(createNamedBlob("notes.txt", "text/plain")), false);
  assert.equal(isPotentialBackingAudioFile(createNamedBlob("empty.wav", "", "")), false);
});

test("backing import infers iPhone-friendly audio MIME types and keeps source metadata", () => {
  const file = createNamedBlob("  Slow   Blues.m4a  ");
  assert.equal(inferBackingAudioMimeType(file), "audio/mp4");

  const source = createImportedBackingAudioSource(file, 62_500, 999);
  assert.equal(source.sourceType, BACKING_AUDIO_SOURCE_TYPES.IMPORT);
  assert.equal(source.fileName, "Slow Blues.m4a");
  assert.equal(source.title, "Slow Blues.m4a");
  assert.equal(source.mimeType, "audio/mp4");
  assert.equal(source.durationMs, 62_500);
  assert.equal(source.createdAt, 999);
  assert.equal(source.sourceModifiedAt, 123_456);
  assert.equal(source.id, "");
});

test("backing import validates browser metadata before replacing the loaded track", async () => {
  let revokedUrl = "";
  const fakeAudio = {
    duration: 12.5,
    load() {
      if (this.src && this.onloadedmetadata) queueMicrotask(() => this.onloadedmetadata?.());
    },
    removeAttribute() {
      this.src = "";
    },
    src: "",
  };
  const durationMs = await probeBackingAudioDuration(new Blob(["audio"]), {
    audioFactory: () => fakeAudio,
    createObjectUrl: () => "blob:backing-import-test",
    revokeObjectUrl: (url) => { revokedUrl = url; },
    timeoutMs: 1_000,
  });

  assert.equal(durationMs, 12_500);
  assert.equal(revokedUrl, "blob:backing-import-test");
});

test("backing multi-import preserves valid file order and isolates rejected files", async () => {
  const files = [
    createNamedBlob("drum.m4a"),
    createNamedBlob("notes.txt", "text/plain"),
    createNamedBlob("bass.wav", "audio/wav"),
  ];
  const progress = [];
  let durationIndex = 0;
  const result = await prepareImportedBackingAudioSources(files, {
    onProgress: (update) => progress.push(update),
    probeDuration: async () => [4_000, 5_000][durationIndex++],
  });

  assert.deepEqual(result.imported.map((item) => item.fileName), ["drum.m4a", "bass.wav"]);
  assert.deepEqual(result.imported.map((item) => item.durationMs), [4_000, 5_000]);
  assert.deepEqual(result.rejected, [{ fileName: "notes.txt", reason: "unsupported-type" }]);
  assert.deepEqual(progress.map(({ completed, status }) => [completed, status]), [
    [1, "imported"],
    [2, "rejected"],
    [3, "imported"],
  ]);
});

test("Backing Loop exposes separate LOAD and IMPORT controls in an equal three-way row", async () => {
  const [componentSource, cssSource, storageSource] = await Promise.all([
    readFile(new URL("../src/components/BackingLoop.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/backing-loop.css", import.meta.url), "utf8"),
    readFile(new URL("../src/backing-loop/backingLoopStorage.js", import.meta.url), "utf8"),
  ]);
  const controls = componentSource.slice(
    componentSource.indexOf("function BackingLoopStorageControls"),
    componentSource.indexOf("const formatTrimSeconds"),
  );

  assert.match(controls, /backingLoopLoadButton/);
  assert.match(controls, /backingLoopImportButton/);
  assert.match(controls, /type="file"/);
  assert.match(controls, /multiple/);
  assert.match(controls, /accept=\{controller\.importAccept\}/);
  assert.match(componentSource, /function ImportBackingLoopDialog/);
  assert.match(componentSource, /현재 백킹으로 사용/);
  assert.match(cssSource, /\.backingLoopStorageControls\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s);
  assert.match(storageSource, /subscribeBackingLoopLibrary/);
  assert.match(storageSource, /sourceType/);
  assert.ok(controls.indexOf("backingLoopSaveButton") < controls.indexOf("backingLoopLoadButton"));
  assert.ok(controls.indexOf("backingLoopLoadButton") < controls.indexOf("backingLoopImportButton"));
});
