import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getMiniChordPianoStepProfile,
  getMiniChordPianoTransitionRelease,
} from "../src/mini-chord/playbackDynamics.js";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("76 BPM HOLD keeps a pedal-like body and at least one second of release", () => {
  const beatSeconds = 60 / 76;
  const profile = getMiniChordPianoStepProfile({
    measureSeconds: beatSeconds * 4,
    pattern: "custom",
    stepSeconds: beatSeconds / 4,
    style: "hold",
  });

  assert.ok(profile.duration >= 3);
  assert.ok(profile.releaseSeconds >= 1);
  assert.ok(profile.attackSeconds >= 0.005 && profile.attackSeconds <= 0.015);
  assert.ok(profile.decaySeconds >= 0.35 && profile.decaySeconds <= 0.65);
  assert.ok(profile.sustainLevel >= 0.35 && profile.sustainLevel <= 0.55);
});

test("92 BPM eighth-note STAB has musical body instead of a click gate", () => {
  const beatSeconds = 60 / 92;
  const profile = getMiniChordPianoStepProfile({
    measureSeconds: beatSeconds * 4,
    pattern: "8beat",
    stepSeconds: beatSeconds / 4,
    style: "stab",
  });
  const release = getMiniChordPianoTransitionRelease({
    beatSeconds,
    chordSpanSeconds: beatSeconds * 4,
    releaseSeconds: profile.releaseSeconds,
  });

  assert.ok(profile.duration >= 0.18);
  assert.ok(release >= 0.35 && release <= 0.55);
  assert.ok(profile.duration + release >= 0.53);
});

test("132 BPM sixteenth-note piano overlaps gently without muddy release", () => {
  const beatSeconds = 60 / 132;
  const profile = getMiniChordPianoStepProfile({
    measureSeconds: beatSeconds * 4,
    pattern: "16beat",
    stepSeconds: beatSeconds / 4,
    style: "stab",
  });

  assert.ok(profile.duration >= 0.1 && profile.duration <= 0.16);
  assert.ok(profile.releaseSeconds >= 0.15 && profile.releaseSeconds <= 0.28);
  assert.ok(profile.duration + profile.releaseSeconds > beatSeconds / 2);
});

test("piano playback has independent ADSR voices and a filtered room bus", () => {
  assert.match(appSource, /part === "piano"/);
  assert.match(appSource, /const pianoAttack = Math\.max\(0\.005, Math\.min\(0\.015/);
  assert.match(appSource, /const pianoDecay = Math\.max\(0\.35, Math\.min\(0\.65/);
  assert.match(appSource, /const pianoSustain = Math\.max\(0\.35, Math\.min\(0\.55/);
  assert.match(appSource, /const pianoRelease = Math\.max\(0\.15, Math\.min\(2/);
  assert.match(appSource, /gain\.gain\.exponentialRampToValueAtTime\(0\.0001, releaseEnd\)/);
  assert.match(appSource, /voice\.part === "piano"/);
  assert.match(appSource, /pianoVoices\.length - 41/);
  assert.match(appSource, /createBackingPianoRoomImpulse/);
  assert.match(appSource, /audio\.createConvolver\(\)/);
  assert.match(appSource, /highpassHz: 150/);
  assert.match(appSource, /preDelaySeconds: 0\.018/);
  assert.match(appSource, /wetLevel: 0\.11/);
});
