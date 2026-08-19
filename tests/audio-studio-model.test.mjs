import test from "node:test";
import assert from "node:assert/strict";
import {
  AUDIO_STUDIO_EDIT_MODES,
  AUDIO_STUDIO_IMPORT_MODES,
  addAudioStudioImportedSources,
  addAudioStudioMarker,
  applyAudioStudioCrossfade,
  buildAudioStudioConstruction,
  copyAudioStudioClips,
  createAudioStudioHistory,
  createAudioStudioProject,
  createAudioStudioSource,
  deleteAudioStudioRange,
  duplicateAudioStudioClips,
  duplicateAudioStudioRange,
  getAudioStudioDisplayName,
  getAudioStudioTrackGaps,
  groupAudioStudioClips,
  getAudioStudioProjectDurationMs,
  moveAudioStudioClips,
  pasteAudioStudioClips,
  rippleDeleteAudioStudioClips,
  resizeAudioStudioClipEdges,
  redoAudioStudioHistory,
  recordAudioStudioHistory,
  splitAudioStudioClips,
  splitAudioStudioRange,
  snapAudioStudioDelta,
  slipAudioStudioClips,
  trimAudioStudioClips,
  undoAudioStudioHistory,
} from "../src/audio-studio/audioStudioModel.js";

const ids = { randomUUID: (() => { let index = 0; return () => `id-${++index}`; })() };

function source(name, durationMs) {
  return createAudioStudioSource({
    durationMs,
    fileName: name,
    id: `source-${name}`,
    mimeType: "audio/wav",
    waveformPeaks: [0.2, 0.8],
  }, 100);
}

test("audio studio starts with the final Project → Track → Clip → Audio Source shape", () => {
  const project = createAudioStudioProject({ id: "project-1", name: "Session" }, 100);
  assert.equal(project.metadata.name, "Session");
  assert.equal(project.tracks.length, 1);
  assert.deepEqual(project.audioSources, []);
  assert.deepEqual(project.tracks[0].clips, []);
  assert.ok(project.practice.loop);
  assert.ok(project.practice.speed);
  assert.ok(project.mixer.master);
  assert.ok(project.tracks[0].effectsChain);
});

test("sequential import places multiple independent clips without altering sources", () => {
  const project = createAudioStudioProject({ id: "project-sequential" }, 100);
  const result = addAudioStudioImportedSources(
    project,
    [source("A.wav", 1_000), source("B.wav", 2_000)],
    { importMode: AUDIO_STUDIO_IMPORT_MODES.SEQUENTIAL },
  );
  const clips = result.project.tracks[0].clips;
  assert.equal(clips.length, 2);
  assert.equal(clips[0].timelineStartMs, 0);
  assert.equal(clips[1].timelineStartMs, 1_000);
  assert.equal(clips[0].sourceId, "source-A.wav");
  assert.equal(getAudioStudioProjectDurationMs(result.project), 3_000);
  assert.equal(result.project.audioSources.length, 2);
  assert.equal(result.project.tracks[0].name, "A 외 1개");
  assert.deepEqual(clips.map((clip) => clip.name), ["A", "B"]);
});

test("default multi-import creates independent draggable tracks at the same timeline position", () => {
  const project = createAudioStudioProject({ id: "project-default-import" }, 100);
  const result = addAudioStudioImportedSources(project, [source("Drum.m4a", 4_000), source("Bass.m4a", 5_000)]);
  assert.equal(result.project.tracks.length, 2);
  assert.deepEqual(result.project.tracks.map((track) => track.name), ["Drum", "Bass"]);
  assert.deepEqual(result.project.tracks.map((track) => track.clips[0].timelineStartMs), [0, 0]);
  assert.equal(result.project.audioSources.length, 2);
  assert.notEqual(result.project.tracks[0].clips[0].sourceId, result.project.tracks[1].clips[0].sourceId);
});

test("separate-track import reuses empty placeholders and names every track from its file", () => {
  const project = createAudioStudioProject({ id: "project-tracks" }, 100);
  const result = addAudioStudioImportedSources(
    project,
    [source("A.wav", 1_000), source("B.wav", 2_000)],
    { importMode: AUDIO_STUDIO_IMPORT_MODES.SEPARATE_TRACKS },
  );
  assert.equal(result.project.tracks.length, 2);
  assert.equal(result.trackIds.length, 2);
  assert.equal(result.project.tracks[0].name, "A");
  assert.equal(result.project.tracks[1].name, "B");
  assert.equal(result.project.tracks[0].clips[0].sourceId, "source-A.wav");
  assert.equal(result.project.tracks[1].clips[0].sourceId, "source-B.wav");
  assert.equal(result.project.tracks[0].clips[0].name, "A");
});

test("display names remove only the final file extension and preserve readable identity", () => {
  assert.equal(getAudioStudioDisplayName("강릉 버스킹 반주.mp3"), "강릉 버스킹 반주");
  assert.equal(getAudioStudioDisplayName("song.final.M4A"), "song.final");
});

test("split and move remain non-destructive and retain the shared source", () => {
  const base = addAudioStudioImportedSources(
    createAudioStudioProject({ id: "project-edit" }, 100),
    [source("Take.wav", 4_000)],
  ).project;
  const original = base.tracks[0].clips[0];
  const split = splitAudioStudioClips(base, [original.id], 1_500);
  assert.equal(split.project.tracks[0].clips.length, 2);
  assert.equal(split.project.audioSources.length, 1);
  assert.equal(split.project.tracks[0].clips[0].sourceEndMs, 1_500);
  assert.equal(split.project.tracks[0].clips[1].sourceStartMs, 1_500);

  const moved = moveAudioStudioClips(split.project, split.createdClipIds, 500);
  assert.equal(moved.tracks[0].clips.find((clip) => clip.id === split.createdClipIds[0]).timelineStartMs, 2_000);
});

test("duplicate and history preserve exact project snapshots for undo and redo", () => {
  const base = addAudioStudioImportedSources(
    createAudioStudioProject({ id: "project-history" }, 100),
    [source("Take.wav", 1_000)],
  ).project;
  const duplicated = duplicateAudioStudioClips(base, [base.tracks[0].clips[0].id]).project;
  let history = createAudioStudioHistory(base);
  history = recordAudioStudioHistory(history, duplicated);
  assert.equal(history.present.tracks[0].clips.length, 2);
  history = undoAudioStudioHistory(history);
  assert.equal(history.present.tracks[0].clips.length, 1);
  history = redoAudioStudioHistory(history);
  assert.equal(history.present.tracks[0].clips.length, 2);
});

test("copy, paste, and trim preserve one shared source without destructively rewriting it", () => {
  const source = createAudioStudioSource({ durationMs: 8_000, id: "source-shared" }, 1);
  const imported = addAudioStudioImportedSources(createAudioStudioProject({}, 1), [source]);
  const original = imported.project.tracks[0].clips[0];
  const clipboard = copyAudioStudioClips(imported.project, [original.id]);
  const pasted = pasteAudioStudioClips(imported.project, clipboard, { atMs: 10_000 });
  const trimmed = trimAudioStudioClips(pasted.project, [original.id], 2_000, "start");
  assert.equal(trimmed.audioSources.length, 1);
  assert.equal(trimmed.audioSources[0].durationMs, 8_000);
  assert.equal(trimmed.tracks[0].clips.length, 2);
  assert.equal(trimmed.tracks[0].clips[0].sourceStartMs, 2_000);
  assert.equal(trimmed.tracks[0].clips[0].durationMs, 6_000);
  assert.equal(trimmed.tracks[0].clips[1].sourceId, source.id);
});

test("edge resize can reveal more source audio while retaining the original blob", () => {
  const source = createAudioStudioSource({ blob: new Blob(["source"]), durationMs: 10_000, id: "source-edge" }, 1);
  const imported = addAudioStudioImportedSources(createAudioStudioProject({}, 1), [source]);
  const clip = imported.project.tracks[0].clips[0];
  const shortened = trimAudioStudioClips(imported.project, [clip.id], 8_000, "end");
  const expanded = resizeAudioStudioClipEdges(shortened, [clip.id], 1_000, "end");
  assert.equal(expanded.tracks[0].clips[0].durationMs, 9_000);
  assert.equal(expanded.tracks[0].clips[0].sourceEndMs, 9_000);
  assert.equal(expanded.audioSources[0].blob, source.blob);
});

test("Track Construction applies the chosen order without an extra empty track", () => {
  const sources = [source("A.wav", 1_000), source("B.wav", 2_000), source("C.wav", 3_000)];
  const project = createAudioStudioProject({ audioSources: sources, id: "project-construction" }, 1);
  const sequential = buildAudioStudioConstruction(project, [sources[2].id, sources[0].id], AUDIO_STUDIO_IMPORT_MODES.SEQUENTIAL);
  assert.deepEqual(sequential.tracks[0].clips.map((clip) => clip.sourceId), [sources[2].id, sources[0].id]);
  assert.deepEqual(sequential.tracks[0].clips.map((clip) => clip.timelineStartMs), [0, 3_000]);
  assert.deepEqual(sequential.audioSources.map((item) => item.id), [sources[2].id, sources[0].id]);

  const separated = buildAudioStudioConstruction(project, [sources[1].id, sources[0].id], AUDIO_STUDIO_IMPORT_MODES.SEPARATE_TRACKS);
  assert.equal(separated.tracks.length, 2);
  assert.deepEqual(separated.tracks.map((track) => track.clips[0].sourceId), [sources[1].id, sources[0].id]);
});

test("snap, markers, grouping, slip, and crossfade stay non-destructive", () => {
  const sources = [source("A.wav", 4_000), source("B.wav", 4_000)];
  let project = buildAudioStudioConstruction(
    createAudioStudioProject({ audioSources: sources }, 1),
    sources.map((item) => item.id),
    AUDIO_STUDIO_IMPORT_MODES.SEQUENTIAL,
  );
  const [first, second] = project.tracks[0].clips;
  const markerResult = addAudioStudioMarker(project, 5_000, "VERSE");
  project = markerResult.project;
  const snapped = snapAudioStudioDelta(project, [second.id], 920, 0, 120);
  assert.equal(snapped.deltaMs, 1_000);
  assert.equal(snapped.guideMs, 5_000);

  project = groupAudioStudioClips(project, [first.id, second.id], "group-test");
  assert.ok(project.tracks[0].clips.every((clip) => clip.groupId === "group-test"));
  project = slipAudioStudioClips(project, [first.id], 250);
  assert.equal(project.tracks[0].clips[0].sourceStartMs, 0);
  project = applyAudioStudioCrossfade(project, [first.id, second.id], 500);
  assert.equal(project.tracks[0].clips[0].crossfadeOutMs, 500);
  assert.equal(project.tracks[0].clips[1].crossfadeInMs, 500);
  assert.equal(project.audioSources.length, 2);
});

test("ripple delete closes only the removed span and insert paste opens room", () => {
  const sources = [source("A.wav", 1_000), source("B.wav", 1_000), source("C.wav", 1_000)];
  const built = buildAudioStudioConstruction(
    createAudioStudioProject({ audioSources: sources }, 1),
    sources.map((item) => item.id),
    AUDIO_STUDIO_IMPORT_MODES.SEQUENTIAL,
  );
  const [first, second, third] = built.tracks[0].clips;
  const ripple = rippleDeleteAudioStudioClips(built, [second.id]);
  assert.equal(ripple.tracks[0].clips.find((clip) => clip.id === third.id).timelineStartMs, 1_000);
  assert.deepEqual(getAudioStudioTrackGaps(ripple.tracks[0]), []);

  const clipboard = copyAudioStudioClips(ripple, [first.id]);
  const inserted = pasteAudioStudioClips(ripple, clipboard, { atMs: 1_000, editMode: AUDIO_STUDIO_EDIT_MODES.INSERT });
  const originalThird = inserted.project.tracks[0].clips.find((clip) => clip.id === third.id);
  assert.equal(originalThird.timelineStartMs, 2_000);
  assert.equal(inserted.createdClipIds.length, 1);
});

test("waveform range split, delete, and duplicate preserve the original source", () => {
  const base = addAudioStudioImportedSources(
    createAudioStudioProject({ id: "project-range" }, 100),
    [source("Range.wav", 8_000)],
  ).project;
  const trackId = base.tracks[0].id;
  const split = splitAudioStudioRange(base, trackId, 2_000, 4_000);
  assert.deepEqual(split.project.tracks[0].clips.map((clip) => clip.durationMs), [2_000, 2_000, 4_000]);
  assert.equal(split.project.audioSources.length, 1);
  assert.equal(split.selectedClipIds.length, 1);

  const deleted = deleteAudioStudioRange(base, trackId, 2_000, 4_000);
  assert.deepEqual(deleted.project.tracks[0].clips.map((clip) => [clip.timelineStartMs, clip.durationMs]), [[0, 2_000], [4_000, 4_000]]);
  assert.equal(deleted.project.audioSources[0].id, "source-Range.wav");

  const duplicated = duplicateAudioStudioRange(base, trackId, 2_000, 4_000);
  const copy = duplicated.project.tracks[0].clips.find((clip) => duplicated.createdClipIds.includes(clip.id));
  assert.equal(copy.timelineStartMs, 8_000);
  assert.equal(copy.sourceStartMs, 2_000);
  assert.equal(copy.sourceEndMs, 4_000);
});
