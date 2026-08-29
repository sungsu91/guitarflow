import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isBackingPlaybackSourceReady } from "../src/backing-loop/backingPlaybackSource.js";

test("playlist autoplay waits until the audio URL belongs to the loaded recording", () => {
  const previousBlob = {};
  const nextBlob = {};

  assert.equal(isBackingPlaybackSourceReady(
    { blob: previousBlob, url: "blob:previous" },
    { blob: nextBlob },
  ), false);
  assert.equal(isBackingPlaybackSourceReady(
    { blob: nextBlob, url: "blob:next" },
    { blob: nextBlob },
  ), true);
  assert.equal(isBackingPlaybackSourceReady(
    { blob: nextBlob, url: "" },
    { blob: nextBlob },
  ), false);
});

test("playlist playback retriggers autoplay when the already-loaded item is chosen again", async () => {
  const controllerSource = await readFile(
    new URL("../src/backing-loop/useBackingLoop.js", import.meta.url),
    "utf8",
  );

  assert.match(controllerSource, /setPlaylistAutoplayRequest\(\(currentRequest\) => currentRequest \+ 1\)/);
  assert.match(controllerSource, /playlistAutoplayRequest/);
  assert.match(controllerSource, /isBackingPlaybackSourceReady\(audioSource, recording\)/);
});
