export const AUDIO_STUDIO_SCHEMA_VERSION = 3;

export const AUDIO_STUDIO_IMPORT_MODES = Object.freeze({
  SEPARATE_TRACKS: "separate-tracks",
  SEQUENTIAL: "sequential",
});

export const AUDIO_STUDIO_SELECTION_SCOPES = Object.freeze({
  CLIP: "clip",
  MULTIPLE: "multiple",
  PROJECT: "project",
  TRACK: "track",
});

export const AUDIO_STUDIO_DEFAULT_PRACTICE_SPEEDS = Object.freeze([0.7, 0.8, 0.9, 1]);

export const AUDIO_STUDIO_WORKSPACE_MODES = Object.freeze({
  TRACK_CONSTRUCTION: "track-construction",
  WAVEFORM_EDITOR: "waveform-editor",
});

export const AUDIO_STUDIO_EDIT_MODES = Object.freeze({
  INSERT: "insert",
  OVERWRITE: "overwrite",
});

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
const nowValue = (now) => Math.max(1, Number(now) || Date.now());

export function getAudioStudioDisplayName(fileName, fallback = "Audio") {
  const normalized = String(fileName || "").trim().replace(/\\/g, "/").split("/").at(-1) || "";
  const withoutExtension = normalized.replace(/\.[^.]+$/, "").trim();
  return (withoutExtension || normalized || fallback).slice(0, 80);
}

export function createAudioStudioId(prefix = "audio", cryptoApi = globalThis.crypto) {
  const normalizedPrefix = String(prefix || "audio").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  if (typeof cryptoApi?.randomUUID === "function") return `${normalizedPrefix}-${cryptoApi.randomUUID()}`;
  return `${normalizedPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createAudioStudioSource({
  blob = null,
  detectedBpm = 0,
  durationMs = 0,
  fileName = "Audio Source",
  id = createAudioStudioId("source"),
  lastModified = 0,
  mimeType = blob?.type || "application/octet-stream",
  peakAmplitude = 0,
  waveformPeaks = [],
} = {}, now = Date.now()) {
  return {
    blob,
    createdAt: nowValue(now),
    detectedBpm: clamp(detectedBpm, 0, 320),
    durationMs: Math.max(0, Number(durationMs) || 0),
    fileName: String(fileName || "Audio Source").trim().slice(0, 240) || "Audio Source",
    id: String(id || createAudioStudioId("source")),
    lastModified: Math.max(0, Number(lastModified) || 0),
    mimeType: String(mimeType || blob?.type || "application/octet-stream"),
    peakAmplitude: clamp(peakAmplitude, 0, 1),
    waveformPeaks: Array.from(waveformPeaks || [], (value) => clamp(value, 0, 1)).slice(0, 512),
  };
}

export function createAudioStudioClip({
  crossfadeInMs = 0,
  crossfadeOutMs = 0,
  durationMs,
  fadeInMs = 0,
  fadeOutMs = 0,
  gainDb = 0,
  groupId = "",
  id = createAudioStudioId("clip"),
  locked = false,
  mute = false,
  name = "Audio Clip",
  pan = 0,
  pitchSemitones = 0,
  playbackRate = 1,
  processingChain = [],
  sourceEndMs,
  sourceId,
  sourceStartMs = 0,
  timelineStartMs = 0,
  trackId,
  volume = 1,
} = {}) {
  const safeRate = clamp(playbackRate || 1, 0.25, 4);
  const safeSourceStart = Math.max(0, Number(sourceStartMs) || 0);
  const safeSourceEnd = Math.max(safeSourceStart + 1, Number(sourceEndMs) || safeSourceStart + Math.max(1, Number(durationMs) || 1));
  const safeDuration = Math.max(1, Number(durationMs) || (safeSourceEnd - safeSourceStart) / safeRate);
  return {
    crossfadeInMs: clamp(crossfadeInMs, 0, safeDuration),
    crossfadeOutMs: clamp(crossfadeOutMs, 0, safeDuration),
    durationMs: safeDuration,
    fadeInMs: clamp(fadeInMs, 0, safeDuration),
    fadeOutMs: clamp(fadeOutMs, 0, safeDuration),
    gainDb: clamp(gainDb, -60, 24),
    groupId: String(groupId || ""),
    id: String(id || createAudioStudioId("clip")),
    locked: Boolean(locked),
    mute: Boolean(mute),
    name: String(name || "Audio Clip").trim().slice(0, 240) || "Audio Clip",
    pan: clamp(pan, -1, 1),
    pitchSemitones: clamp(pitchSemitones, -24, 24),
    playbackRate: safeRate,
    processingChain: Array.from(processingChain || [], (processor) => ({ ...processor })),
    sourceEndMs: safeSourceEnd,
    sourceId: String(sourceId || ""),
    sourceStartMs: safeSourceStart,
    timelineStartMs: Math.max(0, Number(timelineStartMs) || 0),
    trackId: String(trackId || ""),
    volume: clamp(volume || 0, 0, 2),
  };
}

export function createAudioStudioTrack({
  bpm = 0,
  clips = [],
  detectedBpm = 0,
  effectsChain = [],
  id = createAudioStudioId("track"),
  locked = false,
  mute = false,
  name = "Track",
  pan = 0,
  solo = false,
  volume = 1,
} = {}) {
  const trackId = String(id || createAudioStudioId("track"));
  return {
    bpm: clamp(bpm, 0, 320),
    clips: Array.from(clips || [], (clip) => createAudioStudioClip({ ...clip, trackId })),
    detectedBpm: clamp(detectedBpm, 0, 320),
    effectsChain: Array.from(effectsChain || [], (processor) => ({ ...processor })),
    id: trackId,
    locked: Boolean(locked),
    mute: Boolean(mute),
    name: String(name || "Track").trim().slice(0, 80) || "Track",
    pan: clamp(pan, -1, 1),
    solo: Boolean(solo),
    volume: clamp(volume || 0, 0, 2),
  };
}

export function createAudioStudioProject({
  audioSources = [],
  id = createAudioStudioId("project"),
  name = "Untitled Project",
  tracks,
} = {}, now = Date.now()) {
  const timestamp = nowValue(now);
  const initialTracks = tracks?.length ? tracks : [createAudioStudioTrack({ name: "Track 1" })];
  return {
    audioSources: Array.from(audioSources || [], (source) => createAudioStudioSource(source, source.createdAt || timestamp)),
    createdAt: timestamp,
    id: String(id || createAudioStudioId("project")),
    metadata: {
      artist: "",
      description: "",
      name: String(name || "Untitled Project").trim().slice(0, 120) || "Untitled Project",
    },
    markers: [],
    mixer: {
      master: {
        limiterEnabled: true,
        mute: false,
        volume: 1,
      },
    },
    practice: {
      loop: { enabled: false, endMs: 0, startMs: 0 },
      pitchSemitones: 0,
      repeat: { count: 1, enabled: false },
      speed: {
        current: 1,
        stepEnabled: false,
        steps: [...AUDIO_STUDIO_DEFAULT_PRACTICE_SPEEDS],
      },
    },
    schemaVersion: AUDIO_STUDIO_SCHEMA_VERSION,
    settings: {
      countInBars: 1,
      constructionSourceIds: [],
      importMode: AUDIO_STUDIO_IMPORT_MODES.SEPARATE_TRACKS,
      editMode: AUDIO_STUDIO_EDIT_MODES.INSERT,
      pixelsPerSecond: 56,
      projectBpm: 120,
      rippleEnabled: false,
      snapEnabled: true,
      snapMs: 100,
      workspaceMode: AUDIO_STUDIO_WORKSPACE_MODES.TRACK_CONSTRUCTION,
    },
    tracks: initialTracks.map((track) => createAudioStudioTrack(track)),
    updatedAt: timestamp,
  };
}

export function normalizeAudioStudioProject(value, now = Date.now()) {
  const fallback = createAudioStudioProject({}, now);
  if (!value || typeof value !== "object") return fallback;
  const project = createAudioStudioProject({
    audioSources: value.audioSources,
    id: value.id,
    name: value.metadata?.name || value.name,
    tracks: value.tracks,
  }, value.createdAt || now);
  const trackIds = new Set(project.tracks.map((track) => track.id));
  const sourceIds = new Set(project.audioSources.map((source) => source.id));
  project.tracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips
      .filter((clip) => sourceIds.has(clip.sourceId))
      .map((clip) => createAudioStudioClip({ ...clip, trackId: track.id })),
  }));
  project.metadata = {
    ...project.metadata,
    artist: String(value.metadata?.artist || "").slice(0, 120),
    description: String(value.metadata?.description || "").slice(0, 500),
  };
  project.markers = Array.from(value.markers || [], (marker) => ({
    color: String(marker?.color || "bronze").slice(0, 24),
    id: String(marker?.id || createAudioStudioId("marker")),
    name: String(marker?.name || "Marker").trim().slice(0, 80) || "Marker",
    timeMs: Math.max(0, Number(marker?.timeMs) || 0),
  })).slice(0, 500);
  project.mixer.master = {
    limiterEnabled: value.mixer?.master?.limiterEnabled !== false,
    mute: Boolean(value.mixer?.master?.mute),
    volume: clamp(value.mixer?.master?.volume ?? 1, 0, 2),
  };
  project.practice = {
    loop: {
      enabled: Boolean(value.practice?.loop?.enabled),
      endMs: Math.max(0, Number(value.practice?.loop?.endMs) || 0),
      startMs: Math.max(0, Number(value.practice?.loop?.startMs) || 0),
    },
    pitchSemitones: clamp(value.practice?.pitchSemitones, -12, 12),
    repeat: {
      count: Math.max(1, Math.min(999, Math.round(Number(value.practice?.repeat?.count) || 1))),
      enabled: Boolean(value.practice?.repeat?.enabled),
    },
    speed: {
      current: clamp(value.practice?.speed?.current || 1, 0.25, 2),
      stepEnabled: Boolean(value.practice?.speed?.stepEnabled),
      steps: Array.from(value.practice?.speed?.steps || AUDIO_STUDIO_DEFAULT_PRACTICE_SPEEDS, (speed) => clamp(speed, 0.25, 2)).slice(0, 12),
    },
  };
  project.settings = {
    countInBars: [0, 1, 2].includes(Number(value.settings?.countInBars)) ? Number(value.settings.countInBars) : 1,
    constructionSourceIds: Array.from(value.settings?.constructionSourceIds || [], (id) => String(id)).filter((id) => sourceIds.has(id)),
    editMode: Object.values(AUDIO_STUDIO_EDIT_MODES).includes(value.settings?.editMode)
      ? value.settings.editMode
      : AUDIO_STUDIO_EDIT_MODES.INSERT,
    importMode: Object.values(AUDIO_STUDIO_IMPORT_MODES).includes(value.settings?.importMode)
      ? value.settings.importMode
      : AUDIO_STUDIO_IMPORT_MODES.SEPARATE_TRACKS,
    pixelsPerSecond: clamp(value.settings?.pixelsPerSecond || 56, 0.02, 320),
    projectBpm: clamp(value.settings?.projectBpm || 120, 40, 240),
    rippleEnabled: Boolean(value.settings?.rippleEnabled),
    snapEnabled: value.settings?.snapEnabled !== false,
    snapMs: Math.max(0, Math.min(2_000, Number(value.settings?.snapMs) || 0)),
    workspaceMode: Object.values(AUDIO_STUDIO_WORKSPACE_MODES).includes(value.settings?.workspaceMode)
      ? value.settings.workspaceMode
      : AUDIO_STUDIO_WORKSPACE_MODES.TRACK_CONSTRUCTION,
  };
  project.updatedAt = Math.max(project.createdAt, Number(value.updatedAt) || project.createdAt);
  if (!trackIds.size) project.tracks = [createAudioStudioTrack({ name: "Track 1" })];
  return project;
}

export function getAudioStudioTrackDurationMs(track) {
  return Math.max(0, ...Array.from(track?.clips || [], (clip) => (
    Math.max(0, Number(clip.timelineStartMs) || 0) + Math.max(0, Number(clip.durationMs) || 0)
  )));
}

export function getAudioStudioProjectDurationMs(project) {
  return Math.max(0, ...Array.from(project?.tracks || [], getAudioStudioTrackDurationMs));
}

export function getAudioStudioSource(project, sourceId) {
  return project?.audioSources?.find((source) => source.id === sourceId) || null;
}

export function addAudioStudioTrack(project, name = `Track ${(project?.tracks?.length || 0) + 1}`) {
  return {
    ...project,
    tracks: [...project.tracks, createAudioStudioTrack({ name })],
    updatedAt: Date.now(),
  };
}

export function addAudioStudioSources(project, importedSources) {
  const existingIds = new Set(project.audioSources.map((source) => source.id));
  const sources = Array.from(importedSources || []).filter((source) => source?.id && source.durationMs > 0 && !existingIds.has(source.id));
  if (!sources.length) return project;
  return {
    ...project,
    audioSources: [...project.audioSources, ...sources],
    updatedAt: Date.now(),
  };
}

export function buildAudioStudioConstruction(project, orderedSourceIds, importMode = AUDIO_STUDIO_IMPORT_MODES.SEPARATE_TRACKS) {
  const sourceById = new Map(project.audioSources.map((source) => [source.id, source]));
  const orderedIds = Array.from(orderedSourceIds || []);
  const orderedIdSet = new Set(orderedIds);
  const orderedSources = orderedIds.map((id) => sourceById.get(id)).filter(Boolean);
  const baseProject = {
    ...project,
    audioSources: orderedSources,
    settings: { ...project.settings, constructionSourceIds: [...orderedIdSet], importMode },
    tracks: importMode === AUDIO_STUDIO_IMPORT_MODES.SEPARATE_TRACKS
      ? []
      : [createAudioStudioTrack({ name: "Track 1" })],
    updatedAt: Date.now(),
  };
  if (!orderedSources.length) {
    return { ...baseProject, tracks: [createAudioStudioTrack({ name: "Track 1" })] };
  }
  return addAudioStudioImportedSources(baseProject, orderedSources, {
    activeTrackId: baseProject.tracks[0]?.id,
    importMode,
  }).project;
}

export function addAudioStudioImportedSources(project, importedSources, {
  activeTrackId = project?.tracks?.[0]?.id,
  importMode = project?.settings?.importMode || AUDIO_STUDIO_IMPORT_MODES.SEPARATE_TRACKS,
  timelineStartMs = null,
} = {}) {
  const sources = Array.from(importedSources || []).filter((source) => source?.id && source.durationMs > 0);
  if (!sources.length) return { clipIds: [], project, sourceIds: [], trackIds: [] };
  const sourceIds = new Set(project.audioSources.map((source) => source.id));
  const newSources = sources.filter((source) => !sourceIds.has(source.id));
  const clipIds = [];
  const trackIds = [];
  let tracks = project.tracks.map((track) => ({ ...track, clips: [...track.clips] }));

  if (importMode === AUDIO_STUDIO_IMPORT_MODES.SEPARATE_TRACKS) {
    const emptyTrackIds = tracks
      .filter((track) => !track.clips.length)
      .map((track) => track.id)
      .sort((left, right) => (left === activeTrackId ? -1 : right === activeTrackId ? 1 : 0));
    sources.forEach((source) => {
      const displayName = getAudioStudioDisplayName(source.fileName);
      const reusableTrackId = emptyTrackIds.shift();
      const reusableTrack = reusableTrackId ? tracks.find((track) => track.id === reusableTrackId) : null;
      const track = reusableTrack
        ? createAudioStudioTrack({ ...reusableTrack, bpm: source.detectedBpm, detectedBpm: source.detectedBpm, name: displayName })
        : createAudioStudioTrack({ bpm: source.detectedBpm, detectedBpm: source.detectedBpm, name: displayName });
      const clip = createAudioStudioClip({
        durationMs: source.durationMs,
        name: displayName,
        sourceEndMs: source.durationMs,
        sourceId: source.id,
        timelineStartMs: 0,
        trackId: track.id,
      });
      track.clips.push(clip);
      clipIds.push(clip.id);
      trackIds.push(track.id);
      if (reusableTrack) tracks = tracks.map((item) => item.id === track.id ? track : item);
      else tracks.push(track);
    });
  } else {
    let trackIndex = tracks.findIndex((track) => track.id === activeTrackId);
    if (trackIndex < 0) {
      tracks.push(createAudioStudioTrack({ name: `Track ${tracks.length + 1}` }));
      trackIndex = tracks.length - 1;
    }
    const track = tracks[trackIndex];
    const trackWasEmpty = track.clips.length === 0;
    let cursorMs = Number.isFinite(Number(timelineStartMs)) ? Math.max(0, Number(timelineStartMs)) : getAudioStudioTrackDurationMs(track);
    sources.forEach((source) => {
      const displayName = getAudioStudioDisplayName(source.fileName);
      const clip = createAudioStudioClip({
        durationMs: source.durationMs,
        name: displayName,
        sourceEndMs: source.durationMs,
        sourceId: source.id,
        timelineStartMs: cursorMs,
        trackId: track.id,
      });
      cursorMs += clip.durationMs;
      track.clips.push(clip);
      clipIds.push(clip.id);
    });
    if (trackWasEmpty) {
      track.bpm = sources[0]?.detectedBpm || 0;
      track.detectedBpm = sources[0]?.detectedBpm || 0;
      track.name = sources.length === 1
        ? getAudioStudioDisplayName(sources[0].fileName)
        : `${getAudioStudioDisplayName(sources[0].fileName)} 외 ${sources.length - 1}개`;
    }
    trackIds.push(track.id);
  }

  return {
    clipIds,
    project: {
      ...project,
      audioSources: [...project.audioSources, ...newSources],
      settings: { ...project.settings, importMode },
      tracks,
      updatedAt: Date.now(),
    },
    sourceIds: newSources.map((source) => source.id),
    trackIds,
  };
}

function getAudioStudioClipIntersection(clip, startMs, endMs) {
  const clipStartMs = clip.timelineStartMs;
  const clipEndMs = clip.timelineStartMs + clip.durationMs;
  const intersectionStartMs = Math.max(clipStartMs, startMs);
  const intersectionEndMs = Math.min(clipEndMs, endMs);
  if (intersectionEndMs - intersectionStartMs < 1) return null;
  return { endMs: intersectionEndMs, startMs: intersectionStartMs };
}

function createAudioStudioClipSegment(clip, startMs, endMs, id = clip.id) {
  const offsetStartMs = startMs - clip.timelineStartMs;
  const offsetEndMs = endMs - clip.timelineStartMs;
  return createAudioStudioClip({
    ...clip,
    durationMs: endMs - startMs,
    fadeInMs: offsetStartMs <= 1 ? clip.fadeInMs : 0,
    fadeOutMs: offsetEndMs >= clip.durationMs - 1 ? clip.fadeOutMs : 0,
    id,
    sourceEndMs: clip.sourceStartMs + offsetEndMs * clip.playbackRate,
    sourceStartMs: clip.sourceStartMs + offsetStartMs * clip.playbackRate,
    timelineStartMs: startMs,
  });
}

export function splitAudioStudioRange(project, trackId, startMs, endMs) {
  const safeStartMs = Math.max(0, Math.min(Number(startMs) || 0, Number(endMs) || 0));
  const safeEndMs = Math.max(safeStartMs, Number(startMs) || 0, Number(endMs) || 0);
  const selectedClipIds = [];
  const tracks = project.tracks.map((track) => {
    if (track.id !== trackId || track.locked) return track;
    return {
      ...track,
      clips: track.clips.flatMap((clip) => {
        const intersection = getAudioStudioClipIntersection(clip, safeStartMs, safeEndMs);
        if (!intersection || clip.locked) return [clip];
        const pieces = [];
        if (clip.timelineStartMs < intersection.startMs - 1) {
          pieces.push(createAudioStudioClipSegment(clip, clip.timelineStartMs, intersection.startMs, clip.id));
        }
        const middleId = pieces.length ? createAudioStudioId("clip") : clip.id;
        const middle = createAudioStudioClipSegment(clip, intersection.startMs, intersection.endMs, middleId);
        pieces.push(middle);
        selectedClipIds.push(middle.id);
        const clipEndMs = clip.timelineStartMs + clip.durationMs;
        if (intersection.endMs < clipEndMs - 1) {
          pieces.push(createAudioStudioClipSegment(clip, intersection.endMs, clipEndMs, createAudioStudioId("clip")));
        }
        return pieces;
      }),
    };
  });
  return { project: { ...project, tracks, updatedAt: Date.now() }, selectedClipIds };
}

export function trimAudioStudioRange(project, trackId, startMs, endMs) {
  const safeStartMs = Math.max(0, Math.min(Number(startMs) || 0, Number(endMs) || 0));
  const safeEndMs = Math.max(safeStartMs, Number(startMs) || 0, Number(endMs) || 0);
  const selectedClipIds = [];
  return {
    project: {
      ...project,
      tracks: project.tracks.map((track) => track.id === trackId ? {
        ...track,
        clips: track.clips.map((clip) => {
          const intersection = getAudioStudioClipIntersection(clip, safeStartMs, safeEndMs);
          if (!intersection || clip.locked || track.locked) return clip;
          const segment = createAudioStudioClipSegment(clip, intersection.startMs, intersection.endMs, clip.id);
          selectedClipIds.push(segment.id);
          return segment;
        }),
      } : track),
      updatedAt: Date.now(),
    },
    selectedClipIds,
  };
}

export function deleteAudioStudioRange(project, trackId, startMs, endMs) {
  const safeStartMs = Math.max(0, Math.min(Number(startMs) || 0, Number(endMs) || 0));
  const safeEndMs = Math.max(safeStartMs, Number(startMs) || 0, Number(endMs) || 0);
  const createdClipIds = [];
  const tracks = project.tracks.map((track) => {
    if (track.id !== trackId || track.locked) return track;
    return {
      ...track,
      clips: track.clips.flatMap((clip) => {
        const intersection = getAudioStudioClipIntersection(clip, safeStartMs, safeEndMs);
        if (!intersection || clip.locked) return [clip];
        const pieces = [];
        if (clip.timelineStartMs < intersection.startMs - 1) {
          pieces.push(createAudioStudioClipSegment(clip, clip.timelineStartMs, intersection.startMs, clip.id));
        }
        const clipEndMs = clip.timelineStartMs + clip.durationMs;
        if (intersection.endMs < clipEndMs - 1) {
          const right = createAudioStudioClipSegment(
            clip,
            intersection.endMs,
            clipEndMs,
            pieces.length ? createAudioStudioId("clip") : clip.id,
          );
          pieces.push(right);
          createdClipIds.push(right.id);
        }
        return pieces;
      }),
    };
  });
  return { createdClipIds, project: { ...project, tracks, updatedAt: Date.now() } };
}

export function duplicateAudioStudioRange(project, trackId, startMs, endMs) {
  const safeStartMs = Math.max(0, Math.min(Number(startMs) || 0, Number(endMs) || 0));
  const safeEndMs = Math.max(safeStartMs, Number(startMs) || 0, Number(endMs) || 0);
  const track = project.tracks.find((item) => item.id === trackId);
  if (!track || safeEndMs - safeStartMs < 1) return { createdClipIds: [], project };
  const createdClipIds = [];
  const destinationMs = getAudioStudioTrackDurationMs(track);
  const copies = track.clips.flatMap((clip) => {
    const intersection = getAudioStudioClipIntersection(clip, safeStartMs, safeEndMs);
    if (!intersection) return [];
    const copy = createAudioStudioClipSegment(
      clip,
      intersection.startMs,
      intersection.endMs,
      createAudioStudioId("clip"),
    );
    copy.name = `${clip.name} copy`;
    copy.timelineStartMs = destinationMs + (intersection.startMs - safeStartMs);
    createdClipIds.push(copy.id);
    return [copy];
  });
  return {
    createdClipIds,
    project: {
      ...project,
      tracks: project.tracks.map((item) => item.id === trackId ? { ...item, clips: [...item.clips, ...copies] } : item),
      updatedAt: Date.now(),
    },
  };
}

export function updateAudioStudioTrack(project, trackId, updates) {
  return {
    ...project,
    tracks: project.tracks.map((track) => track.id === trackId
      ? createAudioStudioTrack({ ...track, ...(typeof updates === "function" ? updates(track) : updates), id: track.id })
      : track),
    updatedAt: Date.now(),
  };
}

export function updateAudioStudioClips(project, clipIds, updates) {
  const selectedIds = new Set(clipIds || []);
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => selectedIds.has(clip.id)
        ? createAudioStudioClip({ ...clip, ...(typeof updates === "function" ? updates(clip) : updates), id: clip.id, trackId: track.id })
        : clip),
    })),
    updatedAt: Date.now(),
  };
}

export function removeAudioStudioClips(project, clipIds) {
  const removedIds = new Set(clipIds || []);
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.filter((clip) => !removedIds.has(clip.id)),
    })),
    updatedAt: Date.now(),
  };
}

export function rippleDeleteAudioStudioClips(project, clipIds) {
  const removedIds = new Set(clipIds || []);
  return {
    ...project,
    tracks: project.tracks.map((track) => {
      const removed = track.clips.filter((clip) => removedIds.has(clip.id)).sort((left, right) => left.timelineStartMs - right.timelineStartMs);
      if (!removed.length) return track;
      return {
        ...track,
        clips: track.clips.filter((clip) => !removedIds.has(clip.id)).map((clip) => {
          const shiftMs = removed
            .filter((removedClip) => removedClip.timelineStartMs < clip.timelineStartMs)
            .reduce((total, removedClip) => total + removedClip.durationMs, 0);
          return shiftMs ? createAudioStudioClip({ ...clip, timelineStartMs: Math.max(0, clip.timelineStartMs - shiftMs) }) : clip;
        }),
      };
    }),
    updatedAt: Date.now(),
  };
}

export function groupAudioStudioClips(project, clipIds, groupId = createAudioStudioId("group")) {
  return updateAudioStudioClips(project, clipIds, { groupId });
}

export function ungroupAudioStudioClips(project, clipIds) {
  return updateAudioStudioClips(project, clipIds, { groupId: "" });
}

export function slipAudioStudioClips(project, clipIds, deltaMs) {
  const selectedIds = new Set(clipIds || []);
  const sourceById = new Map(project.audioSources.map((source) => [source.id, source]));
  return updateAudioStudioClips(project, selectedIds, (clip) => {
    const source = sourceById.get(clip.sourceId);
    if (!source || clip.locked) return clip;
    const sourceLengthMs = clip.sourceEndMs - clip.sourceStartMs;
    const nextStartMs = clamp(clip.sourceStartMs + (Number(deltaMs) || 0), 0, Math.max(0, source.durationMs - sourceLengthMs));
    return { ...clip, sourceStartMs: nextStartMs, sourceEndMs: nextStartMs + sourceLengthMs };
  });
}

export function applyAudioStudioCrossfade(project, clipIds, durationMs = 1_000) {
  const selectedIds = new Set(clipIds || []);
  const safeDurationMs = Math.max(10, Math.min(10_000, Number(durationMs) || 1_000));
  return {
    ...project,
    tracks: project.tracks.map((track) => {
      const selected = track.clips.filter((clip) => selectedIds.has(clip.id)).sort((left, right) => left.timelineStartMs - right.timelineStartMs);
      if (selected.length < 2) return track;
      const updates = new Map();
      for (let index = 1; index < selected.length; index += 1) {
        const previous = updates.get(selected[index - 1].id) || selected[index - 1];
        const current = updates.get(selected[index].id) || selected[index];
        const overlapMs = Math.min(safeDurationMs, previous.durationMs / 2, current.durationMs / 2);
        updates.set(previous.id, createAudioStudioClip({ ...previous, crossfadeOutMs: overlapMs, fadeOutMs: Math.max(previous.fadeOutMs, overlapMs) }));
        updates.set(current.id, createAudioStudioClip({
          ...current,
          crossfadeInMs: overlapMs,
          fadeInMs: Math.max(current.fadeInMs, overlapMs),
          timelineStartMs: Math.max(0, previous.timelineStartMs + previous.durationMs - overlapMs),
        }));
      }
      return { ...track, clips: track.clips.map((clip) => updates.get(clip.id) || clip) };
    }),
    updatedAt: Date.now(),
  };
}

export function getAudioStudioTrackGaps(track, toleranceMs = 8) {
  const clips = [...(track?.clips || [])].sort((left, right) => left.timelineStartMs - right.timelineStartMs);
  const gaps = [];
  for (let index = 1; index < clips.length; index += 1) {
    const previousEndMs = clips[index - 1].timelineStartMs + clips[index - 1].durationMs;
    const gapMs = clips[index].timelineStartMs - previousEndMs;
    if (gapMs > toleranceMs) gaps.push({ endMs: clips[index].timelineStartMs, gapMs, startMs: previousEndMs });
  }
  return gaps;
}

export function getAudioStudioSnapPoints(project, excludedClipIds = []) {
  const excluded = new Set(excludedClipIds || []);
  const points = new Set([0, project.practice?.loop?.startMs || 0, project.practice?.loop?.endMs || 0]);
  project.markers.forEach((marker) => points.add(marker.timeMs));
  project.tracks.forEach((track) => track.clips.forEach((clip) => {
    if (excluded.has(clip.id)) return;
    points.add(clip.timelineStartMs);
    points.add(clip.timelineStartMs + clip.durationMs);
  }));
  return [...points].filter((point) => point >= 0).sort((left, right) => left - right);
}

export function snapAudioStudioDelta(project, clipIds, rawDeltaMs, playheadMs = 0, thresholdMs = 120) {
  if (!project.settings.snapEnabled) return { deltaMs: Number(rawDeltaMs) || 0, guideMs: null };
  const selected = project.tracks.flatMap((track) => track.clips).filter((clip) => clipIds.includes(clip.id));
  if (!selected.length) return { deltaMs: Number(rawDeltaMs) || 0, guideMs: null };
  const points = [...getAudioStudioSnapPoints(project, clipIds), Math.max(0, Number(playheadMs) || 0)];
  const movingEdges = selected.flatMap((clip) => [clip.timelineStartMs, clip.timelineStartMs + clip.durationMs]);
  let best = { distance: Infinity, deltaMs: Number(rawDeltaMs) || 0, guideMs: null };
  movingEdges.forEach((edge) => points.forEach((point) => {
    const candidateDelta = point - edge;
    const distance = Math.abs(candidateDelta - rawDeltaMs);
    if (distance < best.distance && distance <= thresholdMs) best = { distance, deltaMs: candidateDelta, guideMs: point };
  }));
  if (best.guideMs !== null) return { deltaMs: best.deltaMs, guideMs: best.guideMs };
  const gridMs = Math.max(0, Number(project.settings.snapMs) || 0);
  return { deltaMs: gridMs ? Math.round(rawDeltaMs / gridMs) * gridMs : rawDeltaMs, guideMs: null };
}

export function addAudioStudioMarker(project, timeMs, name = `Marker ${project.markers.length + 1}`) {
  const marker = {
    color: "bronze",
    id: createAudioStudioId("marker"),
    name: String(name || "Marker").trim().slice(0, 80) || "Marker",
    timeMs: Math.max(0, Number(timeMs) || 0),
  };
  return { marker, project: { ...project, markers: [...project.markers, marker], updatedAt: Date.now() } };
}

export function updateAudioStudioMarker(project, markerId, updates) {
  return {
    ...project,
    markers: project.markers.map((marker) => marker.id === markerId ? {
      ...marker,
      ...updates,
      id: marker.id,
      name: String(updates.name ?? marker.name).trim().slice(0, 80) || "Marker",
      timeMs: Math.max(0, Number(updates.timeMs ?? marker.timeMs) || 0),
    } : marker),
    updatedAt: Date.now(),
  };
}

export function removeAudioStudioMarker(project, markerId) {
  return { ...project, markers: project.markers.filter((marker) => marker.id !== markerId), updatedAt: Date.now() };
}

export function trimAudioStudioClips(project, clipIds, timelineTimeMs, edge = "end") {
  const selectedIds = new Set(clipIds || []);
  const timeMs = Math.max(0, Number(timelineTimeMs) || 0);
  return updateAudioStudioClips(project, selectedIds, (clip) => {
    const offsetMs = timeMs - clip.timelineStartMs;
    if (clip.locked || offsetMs <= 1 || offsetMs >= clip.durationMs - 1) return clip;
    if (edge === "start") {
      return {
        ...clip,
        durationMs: clip.durationMs - offsetMs,
        fadeInMs: Math.min(clip.fadeInMs, clip.durationMs - offsetMs),
        sourceStartMs: clip.sourceStartMs + offsetMs * clip.playbackRate,
        timelineStartMs: timeMs,
      };
    }
    return {
      ...clip,
      durationMs: offsetMs,
      fadeOutMs: Math.min(clip.fadeOutMs, offsetMs),
      sourceEndMs: clip.sourceStartMs + offsetMs * clip.playbackRate,
    };
  });
}

export function resizeAudioStudioClipEdges(project, clipIds, deltaMs, edge = "end") {
  const selectedIds = new Set(clipIds || []);
  const requestedDeltaMs = Number(deltaMs) || 0;
  const sources = new Map(project.audioSources.map((source) => [source.id, source]));
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => {
        if (!selectedIds.has(clip.id) || clip.locked || track.locked) return clip;
        const source = sources.get(clip.sourceId);
        if (!source) return clip;
        const minimumDurationMs = 10;
        if (edge === "start") {
          const minimumDelta = -clip.sourceStartMs / clip.playbackRate;
          const maximumDelta = clip.durationMs - minimumDurationMs;
          const appliedDelta = clamp(requestedDeltaMs, minimumDelta, maximumDelta);
          return createAudioStudioClip({
            ...clip,
            durationMs: clip.durationMs - appliedDelta,
            fadeInMs: Math.min(clip.fadeInMs, clip.durationMs - appliedDelta),
            sourceStartMs: clip.sourceStartMs + appliedDelta * clip.playbackRate,
            timelineStartMs: Math.max(0, clip.timelineStartMs + appliedDelta),
          });
        }
        const minimumDelta = -(clip.durationMs - minimumDurationMs);
        const maximumDelta = (source.durationMs - clip.sourceEndMs) / clip.playbackRate;
        const appliedDelta = clamp(requestedDeltaMs, minimumDelta, maximumDelta);
        return createAudioStudioClip({
          ...clip,
          durationMs: clip.durationMs + appliedDelta,
          fadeOutMs: Math.min(clip.fadeOutMs, clip.durationMs + appliedDelta),
          sourceEndMs: clip.sourceEndMs + appliedDelta * clip.playbackRate,
        });
      }),
    })),
    updatedAt: Date.now(),
  };
}

export function splitAudioStudioClips(project, clipIds, timelineTimeMs) {
  const selectedIds = new Set(clipIds || []);
  const createdClipIds = [];
  const tracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.flatMap((clip) => {
      const splitOffsetMs = Number(timelineTimeMs) - clip.timelineStartMs;
      if (!selectedIds.has(clip.id) || splitOffsetMs <= 1 || splitOffsetMs >= clip.durationMs - 1 || clip.locked || track.locked) return [clip];
      const sourceSplitMs = clip.sourceStartMs + splitOffsetMs * clip.playbackRate;
      const left = createAudioStudioClip({
        ...clip,
        durationMs: splitOffsetMs,
        fadeInMs: Math.min(clip.fadeInMs, splitOffsetMs),
        fadeOutMs: 0,
        sourceEndMs: sourceSplitMs,
      });
      const right = createAudioStudioClip({
        ...clip,
        durationMs: clip.durationMs - splitOffsetMs,
        fadeInMs: 0,
        fadeOutMs: Math.min(clip.fadeOutMs, clip.durationMs - splitOffsetMs),
        id: createAudioStudioId("clip"),
        sourceStartMs: sourceSplitMs,
        timelineStartMs: Number(timelineTimeMs),
      });
      createdClipIds.push(right.id);
      return [left, right];
    }),
  }));
  return {
    createdClipIds,
    project: { ...project, tracks, updatedAt: Date.now() },
  };
}

export function moveAudioStudioClips(project, clipIds, deltaMs, targetTrackId = "") {
  const selectedIds = new Set(clipIds || []);
  const movableClips = [];
  let tracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.filter((clip) => {
      if (!selectedIds.has(clip.id) || clip.locked || track.locked) return true;
      movableClips.push(clip);
      return false;
    }),
  }));
  if (!movableClips.length) return project;
  const destinationId = tracks.some((track) => track.id === targetTrackId) ? targetTrackId : movableClips[0].trackId;
  tracks = tracks.map((track) => track.id === destinationId ? {
    ...track,
    clips: [
      ...track.clips,
      ...movableClips.map((clip) => createAudioStudioClip({
        ...clip,
        timelineStartMs: Math.max(0, clip.timelineStartMs + (Number(deltaMs) || 0)),
        trackId: destinationId,
      })),
    ],
  } : track);
  return { ...project, tracks, updatedAt: Date.now() };
}

export function duplicateAudioStudioClips(project, clipIds, offsetMs = 120) {
  const selectedIds = new Set(clipIds || []);
  const createdClipIds = [];
  const tracks = project.tracks.map((track) => ({
    ...track,
    clips: track.clips.flatMap((clip) => {
      if (!selectedIds.has(clip.id)) return [clip];
      const copy = createAudioStudioClip({
        ...clip,
        id: createAudioStudioId("clip"),
        name: `${clip.name} copy`,
        timelineStartMs: clip.timelineStartMs + clip.durationMs + Math.max(0, Number(offsetMs) || 0),
      });
      createdClipIds.push(copy.id);
      return [clip, copy];
    }),
  }));
  return { createdClipIds, project: { ...project, tracks, updatedAt: Date.now() } };
}

export function copyAudioStudioClips(project, clipIds) {
  const selectedIds = new Set(clipIds || []);
  const selected = project.tracks.flatMap((track) => track.clips
    .filter((clip) => selectedIds.has(clip.id))
    .map((clip) => ({ clip: { ...clip }, trackId: track.id })));
  const earliestStartMs = Math.min(...selected.map(({ clip }) => clip.timelineStartMs));
  return {
    clips: selected.map(({ clip, trackId }) => ({
      clip,
      relativeStartMs: clip.timelineStartMs - (Number.isFinite(earliestStartMs) ? earliestStartMs : 0),
      trackId,
    })),
    copiedAt: Date.now(),
  };
}

export function pasteAudioStudioClips(project, clipboard, {
  atMs = getAudioStudioProjectDurationMs(project),
  editMode = project.settings?.editMode || AUDIO_STUDIO_EDIT_MODES.INSERT,
  targetTrackId = "",
} = {}) {
  const validTrackIds = new Set(project.tracks.map((track) => track.id));
  const sourceIds = new Set(project.audioSources.map((source) => source.id));
  const entries = Array.from(clipboard?.clips || []).filter(({ clip, trackId }) => (
    clip?.sourceId
    && sourceIds.has(clip.sourceId)
    && (validTrackIds.has(targetTrackId) || validTrackIds.has(trackId) || validTrackIds.has(clip.trackId))
  ));
  if (!entries.length) return { createdClipIds: [], project };
  const createdClipIds = [];
  const copiesByTrack = new Map();
  const insertSpanMs = Math.max(0, ...entries.map(({ clip, relativeStartMs }) => (Number(relativeStartMs) || 0) + clip.durationMs));
  entries.forEach(({ clip, relativeStartMs, trackId }) => {
    const destinationId = validTrackIds.has(targetTrackId) ? targetTrackId : (validTrackIds.has(trackId) ? trackId : clip.trackId);
    if (!validTrackIds.has(destinationId)) return;
    const copy = createAudioStudioClip({
      ...clip,
      id: createAudioStudioId("clip"),
      timelineStartMs: Math.max(0, Number(atMs) || 0) + Math.max(0, Number(relativeStartMs) || 0),
      trackId: destinationId,
    });
    createdClipIds.push(copy.id);
    copiesByTrack.set(destinationId, [...(copiesByTrack.get(destinationId) || []), copy]);
  });
  return {
    createdClipIds,
    project: {
      ...project,
      tracks: project.tracks.map((track) => ({
        ...track,
        clips: [
          ...track.clips.map((clip) => (
            editMode === AUDIO_STUDIO_EDIT_MODES.INSERT
              && copiesByTrack.has(track.id)
              && clip.timelineStartMs >= atMs
              ? createAudioStudioClip({ ...clip, timelineStartMs: clip.timelineStartMs + insertSpanMs })
              : clip
          )),
          ...(copiesByTrack.get(track.id) || []),
        ],
      })),
      updatedAt: Date.now(),
    },
  };
}

export function reorderAudioStudioTrack(project, trackId, direction) {
  const index = project.tracks.findIndex((track) => track.id === trackId);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= project.tracks.length) return project;
  const tracks = [...project.tracks];
  [tracks[index], tracks[nextIndex]] = [tracks[nextIndex], tracks[index]];
  return { ...project, tracks, updatedAt: Date.now() };
}

export function moveAudioStudioTrack(project, trackId, targetTrackId) {
  const fromIndex = project.tracks.findIndex((track) => track.id === trackId);
  const targetIndex = project.tracks.findIndex((track) => track.id === targetTrackId);
  if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return project;
  const tracks = [...project.tracks];
  const [moved] = tracks.splice(fromIndex, 1);
  tracks.splice(targetIndex, 0, moved);
  return { ...project, tracks, updatedAt: Date.now() };
}

export function removeAudioStudioTrack(project, trackId) {
  if (project.tracks.length <= 1) return project;
  const tracks = project.tracks.filter((track) => track.id !== trackId);
  return { ...project, tracks, updatedAt: Date.now() };
}

export function createAudioStudioHistory(project) {
  return { future: [], past: [], present: project };
}

export function recordAudioStudioHistory(history, project, limit = 60) {
  if (history.present === project) return history;
  return {
    future: [],
    past: [...history.past, history.present].slice(-Math.max(1, limit)),
    present: project,
  };
}

export function undoAudioStudioHistory(history) {
  if (!history.past.length) return history;
  return {
    future: [history.present, ...history.future],
    past: history.past.slice(0, -1),
    present: history.past.at(-1),
  };
}

export function redoAudioStudioHistory(history) {
  if (!history.future.length) return history;
  return {
    future: history.future.slice(1),
    past: [...history.past, history.present],
    present: history.future[0],
  };
}
