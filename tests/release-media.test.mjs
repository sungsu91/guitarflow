import test from 'node:test';
import assert from 'node:assert/strict';
import {isPrivateReleaseAsset, checkReleaseMedia} from '../scripts/check-release-media.mjs';

test('release excludes personal music and scores while retaining instrument samples', () => {
  for (const name of ['Flower Dance.pdf','sounds/flower-dance.wav','uploads/recording.wav','song.mp3','song.m4a','score.musicxml','assets/플라워댄스.json']) {
    assert.equal(isPrivateReleaseAsset(name), true, name);
  }
  for (const name of ['sounds/kick.wav','sounds/crash.wav','assets/drum-kit.png','pdfjs/pdf.worker.min.mjs']) {
    assert.equal(isPrivateReleaseAsset(name), false, name);
  }
});

test('current public assets and source contain no personal score/audio files', async () => {
  await checkReleaseMedia('public');
  await checkReleaseMedia('src');
});
