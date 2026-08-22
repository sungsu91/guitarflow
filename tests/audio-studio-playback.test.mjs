import test from "node:test";
import assert from "node:assert/strict";
import {
  createAudioStudioClip,
  createAudioStudioProject,
  createAudioStudioSource,
  createAudioStudioTrack,
} from "../src/audio-studio/audioStudioModel.js";
import { createAudioStudioPlaybackPlan, getAudioStudioPlaybackRange } from "../src/audio-studio/audioStudioPlayback.js";

function projectWithTwoTracks() {
  const source = createAudioStudioSource({ durationMs: 10_000, id: "source-a" });
  return createAudioStudioProject({
    audioSources: [source],
    tracks: [
      createAudioStudioTrack({
        id: "track-a",
        clips: [createAudioStudioClip({ durationMs: 5_000, id: "clip-a", sourceEndMs: 5_000, sourceId: source.id, trackId: "track-a" })],
      }),
      createAudioStudioTrack({
        id: "track-b",
        mute: true,
        clips: [createAudioStudioClip({ durationMs: 4_000, id: "clip-b", sourceEndMs: 4_000, sourceId: source.id, timelineStartMs: 2_000, trackId: "track-b" })],
      }),
    ],
  });
}

test("playback plan respects track mute and keeps source offsets non-destructive", () => {
  const project = projectWithTwoTracks();
  const plan = createAudioStudioPlaybackPlan(project, { fromMs: 1_000 });
  assert.deepEqual(plan.clips.map((clip) => clip.clipId), ["clip-a"]);
  assert.equal(plan.clips[0].sourceOffsetMs, 1_000);
  assert.equal(plan.clips[0].durationMs, 4_000);
});

test("practice loop defines repeat boundaries without changing clip data", () => {
  const project = projectWithTwoTracks();
  project.practice.loop = { enabled: true, startMs: 1_500, endMs: 3_500 };
  project.practice.speed.current = 0.8;
  const range = getAudioStudioPlaybackRange(project, 0);
  const plan = createAudioStudioPlaybackPlan(project, { fromMs: 1_500 });
  assert.deepEqual(range, { endMs: 3_500, loopEnabled: true, startMs: 1_500 });
  assert.equal(plan.speed, 0.8);
  assert.equal(plan.clips[0].durationMs, 2_000);
  assert.equal(project.tracks[0].clips[0].sourceStartMs, 0);
});

test("project play schedules simultaneous tracks and sequential clips on one shared clock", () => {
  const source = createAudioStudioSource({ durationMs: 8_000, id: "source-shared" });
  const project = createAudioStudioProject({
    audioSources: [source],
    tracks: [
      createAudioStudioTrack({
        id: "track-backing",
        clips: [
          createAudioStudioClip({ durationMs: 2_000, id: "clip-a", sourceEndMs: 2_000, sourceId: source.id, trackId: "track-backing" }),
          createAudioStudioClip({ durationMs: 2_000, id: "clip-b", sourceEndMs: 4_000, sourceId: source.id, sourceStartMs: 2_000, timelineStartMs: 2_000, trackId: "track-backing" }),
        ],
      }),
      createAudioStudioTrack({
        id: "track-guitar",
        clips: [createAudioStudioClip({ durationMs: 3_000, id: "clip-guitar", sourceEndMs: 4_000, sourceId: source.id, sourceStartMs: 1_000, timelineStartMs: 1_000, trackId: "track-guitar" })],
      }),
    ],
  });
  const plan = createAudioStudioPlaybackPlan(project, { fromMs: 1_000 });
  assert.deepEqual(plan.clips.map((clip) => [clip.clipId, clip.timelineOffsetMs]), [
    ["clip-a", 0],
    ["clip-b", 1_000],
    ["clip-guitar", 0],
  ]);
  assert.equal(plan.clips.find((clip) => clip.clipId === "clip-b").sourceOffsetMs, 2_000);
});

test("time-stretched clips preview and export through the same cached derived source", () => {
  const original = createAudioStudioSource({ durationMs: 10_000, id: "source-original" });
  const rendered = createAudioStudioSource({ durationMs: 8_334, id: "source-stretched" });
  const project = createAudioStudioProject({
    audioSources: [original, rendered],
    tracks: [createAudioStudioTrack({
      id: "track-stretched",
      clips: [createAudioStudioClip({
        durationMs: 4_000,
        id: "clip-stretched",
        sourceEndMs: 6_000,
        sourceId: original.id,
        sourceStartMs: 1_200,
        timeStretch: {
          originalSourceId: original.id,
          ratio: 1.2,
          renderedSourceId: rendered.id,
        },
        trackId: "track-stretched",
      })],
    })],
  });
  const plan = createAudioStudioPlaybackPlan(project, { fromMs: 1_000 });
  assert.equal(plan.clips[0].sourceId, rendered.id);
  assert.equal(plan.clips[0].sourceOffsetMs, 2_000);
  assert.equal(plan.clips[0].sourceDurationMs, 3_000);
  assert.equal(plan.clips[0].playbackRate, 1);
});
