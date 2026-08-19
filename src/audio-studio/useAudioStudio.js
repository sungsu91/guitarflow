import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { encodePcmWav } from "../audio/audioPostProcessing";
import { getPreferredBackingLoopMimeType } from "../backing-loop/backingLoopUtils";
import {
  AUDIO_STUDIO_FILE_ACCEPT,
  buildAudioStudioWaveformPeaks,
  decodeAudioStudioData,
  decodeAudioStudioFiles,
  detectAudioStudioBpm,
  stretchAudioStudioPcm,
} from "./audioStudioAudio";
import {
  AUDIO_STUDIO_IMPORT_MODES,
  AUDIO_STUDIO_SELECTION_SCOPES,
  addAudioStudioMarker,
  addAudioStudioImportedSources,
  addAudioStudioSources,
  addAudioStudioTrack,
  applyAudioStudioCrossfade,
  buildAudioStudioConstruction,
  copyAudioStudioClips,
  createAudioStudioHistory,
  createAudioStudioProject,
  createAudioStudioSource,
  deleteAudioStudioRange,
  duplicateAudioStudioClips,
  duplicateAudioStudioRange,
  getAudioStudioProjectDurationMs,
  groupAudioStudioClips,
  moveAudioStudioClips,
  moveAudioStudioTrack,
  pasteAudioStudioClips,
  redoAudioStudioHistory,
  removeAudioStudioTrack,
  resizeAudioStudioClipEdges,
  reorderAudioStudioTrack,
  recordAudioStudioHistory,
  removeAudioStudioClips,
  removeAudioStudioMarker,
  rippleDeleteAudioStudioClips,
  slipAudioStudioClips,
  snapAudioStudioDelta,
  splitAudioStudioClips,
  splitAudioStudioRange,
  trimAudioStudioRange,
  trimAudioStudioClips,
  undoAudioStudioHistory,
  ungroupAudioStudioClips,
  updateAudioStudioClips,
  updateAudioStudioTrack,
  updateAudioStudioMarker,
} from "./audioStudioModel";
import { scheduleAudioStudioPlayback, stopAudioStudioPlayback } from "./audioStudioPlayback";
import { downloadAudioStudioBlob, renderAudioStudioWav, sanitizeAudioStudioExportName } from "./audioStudioExport";
import {
  deleteAudioStudioProject,
  duplicateAudioStudioProject,
  listAudioStudioProjects,
  loadAudioStudioProject,
  renameAudioStudioProject,
  saveAudioStudioProject,
} from "./audioStudioStorage";

export const AUDIO_STUDIO_SCREENS = Object.freeze({
  CONSTRUCT: "construct",
  EDIT: "edit",
  LIBRARY: "library",
  MIX: "mix",
});

export default function useAudioStudio() {
  const [history, setHistory] = useState(() => createAudioStudioHistory(createAudioStudioProject()));
  const [activeTrackId, setActiveTrackId] = useState(() => history.present.tracks[0]?.id || "");
  const [selectedClipIds, setSelectedClipIds] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importCompletionId, setImportCompletionId] = useState(0);
  const [fitProjectRequestId, setFitProjectRequestId] = useState(0);
  const [notice, setNotice] = useState("여러 오디오 파일을 한 번에 가져올 수 있습니다.");
  const [playbackStatus, setPlaybackStatus] = useState("stopped");
  const [quickPlayingProjectId, setQuickPlayingProjectId] = useState("");
  const [rangeSelection, setRangeSelection] = useState(null);
  const [recordingState, setRecordingState] = useState({ beat: 0, phase: "idle", targetTrackId: "" });
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [masterLevel, setMasterLevel] = useState(0);
  const [dragPreview, setDragPreview] = useState(null);
  const [projectOperation, setProjectOperation] = useState("");
  const [savedProjects, setSavedProjects] = useState([]);
  const [selectedSavedProjectId, setSelectedSavedProjectId] = useState("");
  const [screen, setScreen] = useState(AUDIO_STUDIO_SCREENS.LIBRARY);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [projectActive, setProjectActive] = useState(false);
  const [snapGuideMs, setSnapGuideMs] = useState(null);
  const audioBuffersRef = useRef(new Map());
  const audioContextRef = useRef(null);
  const playbackRef = useRef(null);
  const playbackStopAtRef = useRef(null);
  const animationFrameRef = useRef(0);
  const importInputRef = useRef(null);
  const clipboardRef = useRef(null);
  const ignoreClipClickRef = useRef("");
  const importPurposeRef = useRef("construction");
  const importTargetTrackIdRef = useRef("");
  const countInTimerRef = useRef(0);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(0);
  const recordingStreamRef = useRef(null);
  const recordingTargetTrackIdRef = useRef("");
  const recordingTimelineStartRef = useRef(0);
  const autoSaveTimerRef = useRef(0);
  const suppressAutoSaveRef = useRef(true);
  const project = history.present;
  const projectRef = useRef(project);
  projectRef.current = project;
  const selectedClipIdsRef = useRef(selectedClipIds);
  selectedClipIdsRef.current = selectedClipIds;

  const cancelPlaybackFrame = useCallback(() => {
    if (animationFrameRef.current && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = 0;
  }, []);

  const clearScheduledPlayback = useCallback(() => {
    cancelPlaybackFrame();
    stopAudioStudioPlayback(playbackRef.current?.nodes);
    playbackRef.current = null;
    playbackStopAtRef.current = null;
  }, [cancelPlaybackFrame]);

  const ensurePlaybackContext = useCallback(async () => {
    if (audioContextRef.current) return audioContextRef.current;
    const AudioContextApi = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
    if (!AudioContextApi) throw new Error("AUDIO_CONTEXT_UNAVAILABLE");
    const context = new AudioContextApi();
    audioContextRef.current = context;
    return context;
  }, []);

  const ensureSourceBuffers = useCallback(async (context, studioProject) => {
    for (const source of studioProject.audioSources) {
      if (audioBuffersRef.current.has(source.id) || !source.blob) continue;
      const buffer = await decodeAudioStudioData(context, await source.blob.arrayBuffer());
      audioBuffersRef.current.set(source.id, buffer);
    }
  }, []);

  const restoreMissingWaveforms = useCallback(async (studioProject) => {
    const missingSources = studioProject.audioSources.filter((source) => source.blob && (!source.waveformPeaks?.length || !source.detectedBpm));
    if (!missingSources.length) return studioProject;
    setNotice(`${missingSources.length}개 파일의 파형을 분석하고 있습니다.`);
    const context = await ensurePlaybackContext();
    const analyzedById = new Map();
    for (const source of missingSources) {
      try {
        const audioBuffer = await decodeAudioStudioData(context, await source.blob.arrayBuffer());
        audioBuffersRef.current.set(source.id, audioBuffer);
        analyzedById.set(source.id, {
          ...buildAudioStudioWaveformPeaks(audioBuffer, 180),
          detectedBpm: source.detectedBpm || detectAudioStudioBpm(audioBuffer),
        });
      } catch {
        // Keep the source playable even when a legacy blob cannot be analyzed.
      }
    }
    if (!analyzedById.size) return studioProject;
    return {
      ...studioProject,
      audioSources: studioProject.audioSources.map((source) => analyzedById.has(source.id)
        ? { ...source, ...analyzedById.get(source.id) }
        : source),
      tracks: studioProject.tracks.map((track) => {
        if (track.detectedBpm) return track;
        const firstSourceId = track.clips[0]?.sourceId;
        const detectedBpm = analyzedById.get(firstSourceId)?.detectedBpm || 0;
        return detectedBpm ? { ...track, bpm: track.bpm || detectedBpm, detectedBpm } : track;
      }),
    };
  }, [ensurePlaybackContext]);

  const startPlayback = useCallback(async (requestedTimeMs = currentTimeMs, options = {}) => {
    const studioProject = projectRef.current;
    const soloClipIds = new Set(options.soloClipIds || []);
    let playbackProject = soloClipIds.size ? {
      ...studioProject,
      tracks: studioProject.tracks.map((track) => ({
        ...track,
        mute: false,
        solo: false,
        clips: track.clips
          .filter((clip) => soloClipIds.has(clip.id))
          .map((clip) => ({ ...clip, mute: false })),
      })),
    } : studioProject;
    const durationMs = getAudioStudioProjectDurationMs(playbackProject);
    if (!durationMs) {
      setNotice("먼저 오디오 파일을 IMPORT 해주세요.");
      return;
    }
    try {
      const context = await ensurePlaybackContext();
      await ensureSourceBuffers(context, studioProject);
      await context.resume?.();
      clearScheduledPlayback();
      playbackStopAtRef.current = Number.isFinite(options.stopAtMs) ? options.stopAtMs : null;
      const loop = studioProject.practice.loop;
      const loopStartMs = loop.enabled && loop.endMs > loop.startMs ? loop.startMs : 0;
      const safeStartMs = requestedTimeMs >= durationMs ? loopStartMs : Math.max(0, requestedTimeMs);
      const scheduleFrom = (fromMs, repeatIteration = 0) => {
        const session = scheduleAudioStudioPlayback({
          audioBuffers: audioBuffersRef.current,
          audioContext: context,
          fromMs,
          project: playbackProject,
        });
        playbackRef.current = { ...session, fromMs, repeatIteration };
        setCurrentTimeMs(fromMs);
        return session;
      };
      scheduleFrom(safeStartMs);
      setPlaybackStatus("playing");
      const tick = () => {
        const session = playbackRef.current;
        if (!session) return;
        const elapsedMs = Math.max(0, context.currentTime - session.startAt) * 1_000 * session.speed;
        const playbackEndMs = playbackStopAtRef.current === null
          ? session.range.endMs
          : Math.min(session.range.endMs, playbackStopAtRef.current);
        const nextTimeMs = Math.min(playbackEndMs, session.fromMs + elapsedMs);
        setCurrentTimeMs(nextTimeMs);
        if (session.analyser) {
          const samples = new Uint8Array(session.analyser.fftSize);
          session.analyser.getByteTimeDomainData(samples);
          let peak = 0;
          for (let index = 0; index < samples.length; index += 1) peak = Math.max(peak, Math.abs(samples[index] - 128) / 128);
          setMasterLevel(peak);
        }
        if (nextTimeMs >= playbackEndMs - 2) {
          stopAudioStudioPlayback(session.nodes);
          if (session.range.loopEnabled && playbackStopAtRef.current === null) {
            let nextIteration = session.repeatIteration + 1;
            const repeat = playbackProject.practice.repeat;
            if (repeat.enabled && nextIteration >= repeat.count) {
              const speed = playbackProject.practice.speed;
              const nextSpeed = speed.stepEnabled
                ? speed.steps.find((candidate) => candidate > speed.current + 0.001)
                : null;
              if (!nextSpeed) {
                playbackRef.current = null;
                animationFrameRef.current = 0;
                setPlaybackStatus("stopped");
                setQuickPlayingProjectId("");
                setMasterLevel(0);
                return;
              }
              playbackProject = {
                ...playbackProject,
                practice: { ...playbackProject.practice, speed: { ...speed, current: nextSpeed } },
                updatedAt: Date.now(),
              };
              projectRef.current = playbackProject;
              setHistory((current) => ({ ...current, present: playbackProject }));
              nextIteration = 0;
            }
            scheduleFrom(session.range.startMs, nextIteration);
            animationFrameRef.current = requestAnimationFrame(tick);
          } else {
            playbackRef.current = null;
            animationFrameRef.current = 0;
            setPlaybackStatus("stopped");
            setQuickPlayingProjectId("");
            setMasterLevel(0);
          }
          return;
        }
        animationFrameRef.current = requestAnimationFrame(tick);
      };
      animationFrameRef.current = requestAnimationFrame(tick);
    } catch {
      clearScheduledPlayback();
      setPlaybackStatus("stopped");
      setQuickPlayingProjectId("");
      setNotice("이 브라우저에서 오디오를 디코딩하거나 재생할 수 없습니다.");
    }
  }, [clearScheduledPlayback, currentTimeMs, ensurePlaybackContext, ensureSourceBuffers]);

  const pausePlayback = useCallback(() => {
    clearScheduledPlayback();
    setPlaybackStatus("paused");
    setQuickPlayingProjectId("");
    setMasterLevel(0);
  }, [clearScheduledPlayback]);

  const stopPlayback = useCallback(() => {
    clearScheduledPlayback();
    setCurrentTimeMs(0);
    setPlaybackStatus("stopped");
    setQuickPlayingProjectId("");
    setMasterLevel(0);
  }, [clearScheduledPlayback]);

  const seekPlayback = useCallback((timeMs) => {
    const wasPlaying = playbackStatus === "playing";
    const nextTimeMs = Math.max(0, Math.min(getAudioStudioProjectDurationMs(projectRef.current), Number(timeMs) || 0));
    clearScheduledPlayback();
    setCurrentTimeMs(nextTimeMs);
    if (wasPlaying) startPlayback(nextTimeMs);
    else setPlaybackStatus(nextTimeMs > 0 ? "paused" : "stopped");
  }, [clearScheduledPlayback, playbackStatus, startPlayback]);

  useEffect(() => () => {
    clearScheduledPlayback();
    window.clearInterval(countInTimerRef.current);
    const recorder = mediaRecorderRef.current;
    if (recorder?.state && recorder.state !== "inactive") {
      try { recorder.stop(); } catch { /* Best-effort cleanup while leaving the route. */ }
    }
    recordingStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    const context = audioContextRef.current;
    audioContextRef.current = null;
    context?.close?.();
  }, [clearScheduledPlayback]);

  const refreshSavedProjects = useCallback(async (preferredId = "") => {
    try {
      const projects = await listAudioStudioProjects();
      setSavedProjects(projects);
      setSelectedSavedProjectId((current) => {
        const requested = preferredId || current;
        return projects.some((item) => item.id === requested) ? requested : projects[0]?.id || "";
      });
    } catch {
      setNotice("프로젝트 저장소를 열 수 없습니다. 브라우저 저장 권한을 확인해주세요.");
    }
  }, []);

  useEffect(() => {
    refreshSavedProjects();
  }, [refreshSavedProjects]);

  const persistProjectNow = useCallback(async (studioProject = projectRef.current) => {
    setSaveStatus("saving");
    try {
      const saved = await saveAudioStudioProject(studioProject);
      await refreshSavedProjects(saved.id);
      setSaveStatus("saved");
      return saved;
    } catch {
      setSaveStatus("error");
      throw new Error("PROJECT_SAVE_FAILED");
    }
  }, [refreshSavedProjects]);

  useEffect(() => {
    if (!projectActive || screen === AUDIO_STUDIO_SCREENS.LIBRARY) return undefined;
    if (suppressAutoSaveRef.current) {
      suppressAutoSaveRef.current = false;
      return undefined;
    }
    setSaveStatus("dirty");
    window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      persistProjectNow(projectRef.current).catch(() => {
        setNotice("자동 저장에 실패했습니다. 기기 저장 공간을 확인해주세요.");
      });
    }, 700);
    return () => window.clearTimeout(autoSaveTimerRef.current);
  }, [persistProjectNow, project, projectActive, screen]);

  const commitProject = useCallback((updater) => {
    setHistory((current) => {
      const nextProject = typeof updater === "function" ? updater(current.present) : updater;
      return recordAudioStudioHistory(current, nextProject);
    });
  }, []);

  const releaseRecordingInput = useCallback(() => {
    window.clearInterval(countInTimerRef.current);
    countInTimerRef.current = 0;
    recordingStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  }, []);

  const playCountInClick = useCallback(async (accent = false) => {
    try {
      const context = await ensurePlaybackContext();
      await context.resume?.();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt = context.currentTime;
      oscillator.frequency.setValueAtTime(accent ? 1_100 : 820, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.14, startAt + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.08);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.09);
    } catch {
      // The visual count-in remains usable if an OS blocks the short click sound.
    }
  }, [ensurePlaybackContext]);

  const stopRecording = useCallback(() => {
    window.clearInterval(countInTimerRef.current);
    countInTimerRef.current = 0;
    const recorder = mediaRecorderRef.current;
    if (recorder?.state && recorder.state !== "inactive") {
      setRecordingState((current) => ({ ...current, phase: "processing" }));
      try { recorder.stop(); } catch { /* Recorder may have stopped between taps. */ }
      return;
    }
    releaseRecordingInput();
    setRecordingState({ beat: 0, phase: "idle", targetTrackId: "" });
    setNotice("녹음 준비를 취소했습니다.");
  }, [releaseRecordingInput]);

  const startRecording = useCallback(async (requestedTrackId = "") => {
    if (countInTimerRef.current || (mediaRecorderRef.current?.state && mediaRecorderRef.current.state !== "inactive")) {
      stopRecording();
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder !== "function") {
      setNotice("이 브라우저에서는 마이크 녹음을 지원하지 않습니다.");
      return;
    }
    setRecordingState({ beat: 0, phase: "requesting", targetTrackId: requestedTrackId });
    setNotice("마이크 사용 권한을 확인하고 있습니다.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { autoGainControl: false, echoCancellation: false, noiseSuppression: false },
      });
      recordingStreamRef.current = stream;
      let targetTrackId = requestedTrackId || projectRef.current.tracks.find((track) => !track.clips.length)?.id || "";
      if (!projectRef.current.tracks.some((track) => track.id === targetTrackId)) {
        const recordingIndex = projectRef.current.tracks.filter((track) => /^Recording\b/i.test(track.name)).length + 1;
        const nextProject = addAudioStudioTrack(projectRef.current, `Recording ${recordingIndex}`);
        projectRef.current = nextProject;
        setHistory((current) => recordAudioStudioHistory(current, nextProject));
        targetTrackId = nextProject.tracks.at(-1)?.id || "";
      }
      recordingTargetTrackIdRef.current = targetTrackId;
      recordingTimelineStartRef.current = currentTimeMs;
      setActiveTrackId(targetTrackId);
      setSelectedTrackId("");
      setSelectedClipIds([]);
      setRangeSelection(null);

      const preferredMimeType = getPreferredBackingLoopMimeType(window.MediaRecorder);
      let recorder;
      try {
        recorder = new window.MediaRecorder(stream, preferredMimeType ? { audioBitsPerSecond: 192_000, mimeType: preferredMimeType } : undefined);
      } catch {
        recorder = new window.MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        releaseRecordingInput();
        mediaRecorderRef.current = null;
        recordingChunksRef.current = [];
        setRecordingState({ beat: 0, phase: "idle", targetTrackId: "" });
        setNotice("녹음 중 문제가 발생했습니다. 기존 트랙은 그대로 유지됩니다.");
      };
      recorder.onstop = async () => {
        const durationMs = Math.max(0, performance.now() - recordingStartedAtRef.current);
        const blobType = recorder.mimeType || preferredMimeType || recordingChunksRef.current[0]?.type || "audio/webm";
        const blob = new Blob(recordingChunksRef.current, { type: blobType });
        const targetId = recordingTargetTrackIdRef.current;
        const timelineStartMs = recordingTimelineStartRef.current;
        mediaRecorderRef.current = null;
        recordingChunksRef.current = [];
        releaseRecordingInput();
        clearScheduledPlayback();
        setPlaybackStatus("paused");
        if (!blob.size || durationMs < 100) {
          setRecordingState({ beat: 0, phase: "idle", targetTrackId: "" });
          setNotice("녹음된 오디오가 너무 짧습니다. 기존 트랙은 그대로 유지됩니다.");
          return;
        }
        setRecordingState({ beat: 0, phase: "processing", targetTrackId: targetId });
        setNotice("녹음 파형과 BPM을 분석하고 있습니다.");
        try {
          const recordingNumber = projectRef.current.audioSources.filter((source) => /^Recording\b/i.test(source.fileName)).length + 1;
          const extension = blobType.includes("ogg") ? "ogg" : blobType.includes("mp4") ? "m4a" : "webm";
          let file;
          if (typeof File === "function") file = new File([blob], `Recording ${recordingNumber}.${extension}`, { lastModified: Date.now(), type: blobType });
          else {
            file = blob;
            Object.defineProperty(file, "name", { value: `Recording ${recordingNumber}.${extension}` });
            Object.defineProperty(file, "lastModified", { value: Date.now() });
          }
          const { decoded } = await decodeAudioStudioFiles([file]);
          if (!decoded.length) throw new Error("RECORDING_DECODE_FAILED");
          const [{ audioBuffer, source }] = decoded;
          audioBuffersRef.current.set(source.id, audioBuffer);
          const placement = addAudioStudioImportedSources(projectRef.current, [source], {
            activeTrackId: targetId,
            importMode: AUDIO_STUDIO_IMPORT_MODES.SEQUENTIAL,
            timelineStartMs,
          });
          projectRef.current = placement.project;
          setHistory((current) => recordAudioStudioHistory(current, placement.project));
          setSelectedClipIds(placement.clipIds);
          setCurrentTimeMs(timelineStartMs + source.durationMs);
          setFitProjectRequestId((value) => value + 1);
          setNotice(`“${source.fileName.replace(/\.[^.]+$/, "")}” 녹음과 실제 파형을 추가했습니다.`);
        } catch {
          setNotice("녹음 파일을 디코딩하지 못했습니다. 브라우저의 녹음 형식 지원을 확인해주세요.");
        } finally {
          setRecordingState({ beat: 0, phase: "idle", targetTrackId: "" });
        }
      };

      try {
        if (!localStorage.getItem("rifflab-audio-studio-headphone-tip")) {
          localStorage.setItem("rifflab-audio-studio-headphone-tip", "shown");
          setNotice("기존 반주를 들으며 녹음할 때는 이어폰/헤드폰 사용을 권장합니다.");
        }
      } catch {
        // Private browsing may deny localStorage; recording itself remains available.
      }

      const startRecorder = () => {
        window.clearInterval(countInTimerRef.current);
        countInTimerRef.current = 0;
        recordingStartedAtRef.current = performance.now();
        recorder.start(250);
        setRecordingState({ beat: 0, phase: "recording", targetTrackId });
        if (getAudioStudioProjectDurationMs(projectRef.current) > recordingTimelineStartRef.current) {
          startPlayback(recordingTimelineStartRef.current);
        }
      };
      const bars = [0, 1, 2].includes(Number(projectRef.current.settings.countInBars)) ? Number(projectRef.current.settings.countInBars) : 1;
      const totalBeats = bars * 4;
      if (!totalBeats) {
        startRecorder();
        return;
      }
      const beatMs = 60_000 / Math.max(40, Math.min(240, Number(projectRef.current.settings.projectBpm) || 120));
      let elapsedBeats = 0;
      const advanceCountIn = () => {
        elapsedBeats += 1;
        const beat = ((elapsedBeats - 1) % 4) + 1;
        setRecordingState({ beat, phase: "count-in", targetTrackId });
        playCountInClick(beat === 1);
        if (elapsedBeats >= totalBeats) {
          window.clearInterval(countInTimerRef.current);
          countInTimerRef.current = window.setTimeout(startRecorder, beatMs);
        }
      };
      advanceCountIn();
      countInTimerRef.current = window.setInterval(advanceCountIn, beatMs);
    } catch {
      releaseRecordingInput();
      mediaRecorderRef.current = null;
      setRecordingState({ beat: 0, phase: "idle", targetTrackId: "" });
      setNotice("마이크 권한을 허용해야 바로 녹음할 수 있습니다.");
    }
  }, [clearScheduledPlayback, currentTimeMs, playCountInClick, releaseRecordingInput, startPlayback, stopRecording]);

  const selectTimelineRange = useCallback((selection) => {
    if (!selection?.trackId || Number(selection.endMs) - Number(selection.startMs) < 10) {
      setRangeSelection(null);
      return;
    }
    const startMs = Math.max(0, Math.min(Number(selection.startMs) || 0, Number(selection.endMs) || 0));
    const endMs = Math.max(startMs + 10, Number(selection.startMs) || 0, Number(selection.endMs) || 0);
    setRangeSelection({ endMs, startMs, trackId: selection.trackId });
    setActiveTrackId(selection.trackId);
    setSelectedTrackId("");
    setSelectedClipIds(projectRef.current.tracks.find((track) => track.id === selection.trackId)?.clips
      .filter((clip) => clip.timelineStartMs < endMs && clip.timelineStartMs + clip.durationMs > startMs)
      .map((clip) => clip.id) || []);
  }, []);

  const splitRangeSelection = useCallback(() => {
    if (!rangeSelection) return;
    const result = splitAudioStudioRange(projectRef.current, rangeSelection.trackId, rangeSelection.startMs, rangeSelection.endMs);
    projectRef.current = result.project;
    setHistory((current) => recordAudioStudioHistory(current, result.project));
    setSelectedClipIds(result.selectedClipIds);
    setNotice("선택 구간의 시작과 끝에서 클립을 분할했습니다.");
  }, [rangeSelection]);

  const trimRangeSelection = useCallback(() => {
    if (!rangeSelection) return;
    const result = trimAudioStudioRange(projectRef.current, rangeSelection.trackId, rangeSelection.startMs, rangeSelection.endMs);
    if (!result.selectedClipIds.length) return;
    projectRef.current = result.project;
    setHistory((current) => recordAudioStudioHistory(current, result.project));
    setSelectedClipIds(result.selectedClipIds);
    setNotice("선택 구간만 남도록 클립의 앞뒤를 잘랐습니다.");
  }, [rangeSelection]);

  const deleteRangeSelection = useCallback(() => {
    if (!rangeSelection) return;
    const result = deleteAudioStudioRange(projectRef.current, rangeSelection.trackId, rangeSelection.startMs, rangeSelection.endMs);
    projectRef.current = result.project;
    setHistory((current) => recordAudioStudioHistory(current, result.project));
    setSelectedClipIds(result.createdClipIds);
    setRangeSelection(null);
    setNotice("선택한 구간을 원본 파일 손상 없이 제거했습니다.");
  }, [rangeSelection]);

  const duplicateRangeSelection = useCallback(() => {
    if (!rangeSelection) return;
    const result = duplicateAudioStudioRange(projectRef.current, rangeSelection.trackId, rangeSelection.startMs, rangeSelection.endMs);
    if (!result.createdClipIds.length) return;
    projectRef.current = result.project;
    setHistory((current) => recordAudioStudioHistory(current, result.project));
    setSelectedClipIds(result.createdClipIds);
    setRangeSelection(null);
    setNotice("선택 구간의 복사본을 같은 트랙 끝에 배치했습니다.");
  }, [rangeSelection]);

  const loopRangeSelection = useCallback(() => {
    if (!rangeSelection) return;
    commitProject((current) => ({
      ...current,
      practice: {
        ...current.practice,
        loop: { enabled: true, endMs: rangeSelection.endMs, startMs: rangeSelection.startMs },
      },
      updatedAt: Date.now(),
    }));
    setNotice("선택 구간을 LOOP 범위로 설정했습니다.");
  }, [commitProject, rangeSelection]);

  const undo = useCallback(() => {
    clearScheduledPlayback();
    setPlaybackStatus("paused");
    setHistory((current) => undoAudioStudioHistory(current));
  }, [clearScheduledPlayback]);

  const redo = useCallback(() => {
    clearScheduledPlayback();
    setPlaybackStatus("paused");
    setHistory((current) => redoAudioStudioHistory(current));
  }, [clearScheduledPlayback]);

  const deleteSelection = useCallback(() => {
    if (!selectedClipIdsRef.current.length) return;
    commitProject((current) => current.settings.rippleEnabled
      ? rippleDeleteAudioStudioClips(current, selectedClipIdsRef.current)
      : removeAudioStudioClips(current, selectedClipIdsRef.current));
    setSelectedClipIds([]);
  }, [commitProject]);

  const copySelection = useCallback(() => {
    const copied = copyAudioStudioClips(projectRef.current, selectedClipIdsRef.current);
    if (!copied.clips.length) return;
    clipboardRef.current = copied;
    setNotice(`${copied.clips.length}개 Clip을 Audio Studio 클립보드에 복사했습니다.`);
  }, []);

  const cutSelection = useCallback(() => {
    const copied = copyAudioStudioClips(projectRef.current, selectedClipIdsRef.current);
    if (!copied.clips.length) return;
    clipboardRef.current = copied;
    commitProject((current) => current.settings.rippleEnabled
      ? rippleDeleteAudioStudioClips(current, selectedClipIdsRef.current)
      : removeAudioStudioClips(current, selectedClipIdsRef.current));
    setSelectedClipIds([]);
    setNotice(`${copied.clips.length}개 Clip을 잘라냈습니다.`);
  }, [commitProject]);

  const pasteSelection = useCallback(() => {
    const result = pasteAudioStudioClips(projectRef.current, clipboardRef.current, {
      atMs: currentTimeMs,
      editMode: projectRef.current.settings.editMode,
      targetTrackId: activeTrackId,
    });
    if (!result.createdClipIds.length) return;
    setHistory((current) => recordAudioStudioHistory(current, result.project));
    setSelectedClipIds(result.createdClipIds);
  }, [activeTrackId, currentTimeMs]);

  const duplicateSelection = useCallback(() => {
    const result = duplicateAudioStudioClips(projectRef.current, selectedClipIdsRef.current);
    if (!result.createdClipIds.length) return;
    setHistory((current) => recordAudioStudioHistory(current, result.project));
    setSelectedClipIds(result.createdClipIds);
  }, []);

  const splitSelection = useCallback(() => {
    const result = splitAudioStudioClips(projectRef.current, selectedClipIdsRef.current, currentTimeMs);
    if (!result.createdClipIds.length) return;
    setHistory((current) => recordAudioStudioHistory(current, result.project));
    setSelectedClipIds([...selectedClipIdsRef.current, ...result.createdClipIds]);
  }, [currentTimeMs]);

  const trimSelection = useCallback((edge) => {
    if (!selectedClipIdsRef.current.length) return;
    commitProject((current) => trimAudioStudioClips(current, selectedClipIdsRef.current, currentTimeMs, edge));
  }, [commitProject, currentTimeMs]);

  const groupSelection = useCallback(() => {
    if (selectedClipIdsRef.current.length < 2) return;
    commitProject((current) => groupAudioStudioClips(current, selectedClipIdsRef.current));
  }, [commitProject]);

  const ungroupSelection = useCallback(() => {
    if (!selectedClipIdsRef.current.length) return;
    commitProject((current) => ungroupAudioStudioClips(current, selectedClipIdsRef.current));
  }, [commitProject]);

  const slipSelection = useCallback((deltaMs) => {
    if (!selectedClipIdsRef.current.length) return;
    commitProject((current) => slipAudioStudioClips(current, selectedClipIdsRef.current, deltaMs));
  }, [commitProject]);

  const crossfadeSelection = useCallback((durationMs = 1_000) => {
    if (selectedClipIdsRef.current.length < 2) return;
    commitProject((current) => applyAudioStudioCrossfade(current, selectedClipIdsRef.current, durationMs));
  }, [commitProject]);

  const selectScope = useCallback((scope) => {
    const studioProject = projectRef.current;
    if (scope === AUDIO_STUDIO_SELECTION_SCOPES.PROJECT) {
      setSelectedClipIds(studioProject.tracks.flatMap((track) => track.clips.map((clip) => clip.id)));
      return;
    }
    if (scope === AUDIO_STUDIO_SELECTION_SCOPES.TRACK) {
      setSelectedClipIds(studioProject.tracks.find((track) => track.id === activeTrackId)?.clips.map((clip) => clip.id) || []);
      return;
    }
    if (scope === AUDIO_STUDIO_SELECTION_SCOPES.CLIP) {
      setSelectedClipIds((selected) => selected.slice(0, 1));
      return;
    }
    setSelectedClipIds([]);
  }, [activeTrackId]);

  const selectClip = useCallback((event, clipId) => {
    event.stopPropagation();
    if (ignoreClipClickRef.current === clipId) return;
    setRangeSelection(null);
    setSelectedTrackId("");
    const clickedClip = projectRef.current.tracks.flatMap((track) => track.clips).find((clip) => clip.id === clipId);
    const relatedIds = clickedClip?.groupId
      ? projectRef.current.tracks.flatMap((track) => track.clips).filter((clip) => clip.groupId === clickedClip.groupId).map((clip) => clip.id)
      : [clipId];
    setSelectedClipIds((selected) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey) {
        return selected.includes(clipId)
          ? selected.filter((id) => !relatedIds.includes(id))
          : [...new Set([...selected, ...relatedIds])];
      }
      return relatedIds;
    });
  }, []);

  const selectTrack = useCallback((trackId) => {
    if (!projectRef.current.tracks.some((track) => track.id === trackId)) return;
    setActiveTrackId(trackId);
    setRangeSelection(null);
    setSelectedTrackId(trackId);
    setSelectedClipIds([]);
  }, []);

  const beginClipDrag = useCallback((event, clipId) => {
    if (event.button !== 0) return;
    const clipIds = selectedClipIdsRef.current.includes(clipId) ? selectedClipIdsRef.current : [clipId];
    if (!selectedClipIdsRef.current.includes(clipId)) setSelectedClipIds(clipIds);
    const startX = event.clientX;
    let lastX = startX;
    let lastDeltaMs = 0;
    let targetTrackId = "";
    const pixelsPerSecond = projectRef.current.settings.pixelsPerSecond;
    const onMove = (moveEvent) => {
      lastX = moveEvent.clientX;
      targetTrackId = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)
        ?.closest?.(".audioStudioTrackLane")?.dataset?.trackId || targetTrackId;
      const rawDeltaMs = ((lastX - startX) / pixelsPerSecond) * 1_000;
      const snapped = snapAudioStudioDelta(projectRef.current, clipIds, rawDeltaMs, currentTimeMs);
      lastDeltaMs = snapped.deltaMs;
      setSnapGuideMs(snapped.guideMs);
      setDragPreview({ clipIds, deltaMs: lastDeltaMs });
    };
    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      setDragPreview(null);
      setSnapGuideMs(null);
      if (Math.abs(lastX - startX) < 3) return;
      commitProject((current) => moveAudioStudioClips(current, clipIds, lastDeltaMs, targetTrackId));
      if (targetTrackId) setActiveTrackId(targetTrackId);
      ignoreClipClickRef.current = clipId;
      setTimeout(() => { ignoreClipClickRef.current = ""; }, 0);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    window.addEventListener("pointercancel", onEnd, { once: true });
  }, [commitProject, currentTimeMs]);

  const beginClipResize = useCallback((event, clipId, edge) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const clipIds = selectedClipIdsRef.current.includes(clipId) ? selectedClipIdsRef.current : [clipId];
    if (!selectedClipIdsRef.current.includes(clipId)) setSelectedClipIds(clipIds);
    const startX = event.clientX;
    let lastX = startX;
    let lastDeltaMs = 0;
    const pixelsPerSecond = projectRef.current.settings.pixelsPerSecond;
    const onMove = (moveEvent) => {
      lastX = moveEvent.clientX;
      const rawDeltaMs = ((lastX - startX) / pixelsPerSecond) * 1_000;
      const snapped = snapAudioStudioDelta(projectRef.current, clipIds, rawDeltaMs, currentTimeMs);
      lastDeltaMs = snapped.deltaMs;
      setSnapGuideMs(snapped.guideMs);
      setDragPreview({ clipIds, deltaMs: lastDeltaMs, resizeEdge: edge });
    };
    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      setDragPreview(null);
      setSnapGuideMs(null);
      if (Math.abs(lastX - startX) < 3) return;
      commitProject((current) => resizeAudioStudioClipEdges(current, clipIds, lastDeltaMs, edge));
      ignoreClipClickRef.current = clipId;
      setTimeout(() => { ignoreClipClickRef.current = ""; }, 0);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    window.addEventListener("pointercancel", onEnd, { once: true });
  }, [commitProject, currentTimeMs]);

  const setProjectName = useCallback((name) => {
    commitProject((current) => ({
      ...current,
      metadata: { ...current.metadata, name: String(name).slice(0, 120) },
      updatedAt: Date.now(),
    }));
  }, [commitProject]);

  const setTimelineZoom = useCallback((pixelsPerSecond) => {
    commitProject((current) => ({
      ...current,
      settings: {
        ...current.settings,
        pixelsPerSecond: Math.max(0.02, Math.min(320, Number(pixelsPerSecond) || 56)),
      },
      updatedAt: Date.now(),
    }));
  }, [commitProject]);

  const requestProjectFit = useCallback(() => {
    setFitProjectRequestId((value) => value + 1);
  }, []);

  const updateEditorSettings = useCallback((updates) => {
    commitProject((current) => ({
      ...current,
      settings: { ...current.settings, ...updates },
      updatedAt: Date.now(),
    }));
  }, [commitProject]);

  const addMarker = useCallback(() => {
    const result = addAudioStudioMarker(projectRef.current, currentTimeMs);
    setHistory((current) => recordAudioStudioHistory(current, result.project));
  }, [currentTimeMs]);

  const updateMarker = useCallback((markerId, updates) => {
    commitProject((current) => updateAudioStudioMarker(current, markerId, updates));
  }, [commitProject]);

  const deleteMarker = useCallback((markerId) => {
    commitProject((current) => removeAudioStudioMarker(current, markerId));
  }, [commitProject]);

  const setLoopPoint = useCallback((edge) => {
    commitProject((current) => ({
      ...current,
      practice: {
        ...current.practice,
        loop: {
          ...current.practice.loop,
          enabled: true,
          ...(edge === "start"
            ? { startMs: Math.min(currentTimeMs, current.practice.loop.endMs || currentTimeMs + 1_000) }
            : { endMs: Math.max(currentTimeMs, current.practice.loop.startMs + 10) }),
        },
      },
      updatedAt: Date.now(),
    }));
  }, [commitProject, currentTimeMs]);

  const fitProject = useCallback((availableWidth = 760) => {
    const durationSeconds = Math.max(12, getAudioStudioProjectDurationMs(projectRef.current) / 1_000);
    setTimelineZoom(Math.max(0.02, Math.min(320, (Number(availableWidth) || 760) / durationSeconds)));
  }, [setTimelineZoom]);

  const fitSelection = useCallback((availableWidth = 760) => {
    const clips = projectRef.current.tracks.flatMap((track) => track.clips).filter((clip) => selectedClipIdsRef.current.includes(clip.id));
    if (!clips.length) return;
    const startMs = Math.min(...clips.map((clip) => clip.timelineStartMs));
    const endMs = Math.max(...clips.map((clip) => clip.timelineStartMs + clip.durationMs));
    setTimelineZoom(Math.max(0.02, Math.min(320, (Number(availableWidth) || 760) / Math.max(1, (endMs - startMs) / 1_000))));
    seekPlayback(startMs);
  }, [seekPlayback, setTimelineZoom]);

  const seekClipBoundary = useCallback((direction) => {
    const boundaries = [...new Set(projectRef.current.tracks.flatMap((track) => track.clips.flatMap((clip) => [clip.timelineStartMs, clip.timelineStartMs + clip.durationMs])))]
      .sort((left, right) => left - right);
    const target = direction === "previous"
      ? [...boundaries].reverse().find((timeMs) => timeMs < currentTimeMs - 5) ?? 0
      : boundaries.find((timeMs) => timeMs > currentTimeMs + 5) ?? getAudioStudioProjectDurationMs(projectRef.current);
    seekPlayback(target);
  }, [currentTimeMs, seekPlayback]);

  const playSelection = useCallback(() => {
    const clips = projectRef.current.tracks.flatMap((track) => track.clips).filter((clip) => selectedClipIdsRef.current.includes(clip.id));
    if (!clips.length) return;
    const startMs = Math.min(...clips.map((clip) => clip.timelineStartMs));
    const endMs = Math.max(...clips.map((clip) => clip.timelineStartMs + clip.durationMs));
    startPlayback(startMs, { soloClipIds: selectedClipIdsRef.current, stopAtMs: endMs });
  }, [startPlayback]);

  const saveProject = useCallback(async () => {
    if (projectOperation) return;
    setProjectOperation("saving");
    try {
      const saved = await persistProjectNow(projectRef.current);
      setNotice(`프로젝트 “${saved.metadata.name}”을 전체 상태로 저장했습니다.`);
    } catch {
      setNotice("프로젝트를 저장하지 못했습니다. 기기 저장 공간을 확인해주세요.");
    } finally {
      setProjectOperation("");
    }
  }, [persistProjectNow, projectOperation]);

  const createNewProject = useCallback((name = "Untitled Project", startWithFiles = false) => {
    clearScheduledPlayback();
    const nextProject = createAudioStudioProject({ name: String(name || "Untitled Project").trim() || "Untitled Project" });
    projectRef.current = nextProject;
    audioBuffersRef.current.clear();
    clipboardRef.current = null;
    suppressAutoSaveRef.current = false;
    setHistory(createAudioStudioHistory(nextProject));
    setProjectActive(true);
    setScreen(AUDIO_STUDIO_SCREENS.CONSTRUCT);
    setActiveTrackId(nextProject.tracks[0]?.id || "");
    setSelectedTrackId("");
    setSelectedClipIds([]);
    setRangeSelection(null);
    setCurrentTimeMs(0);
    setPlaybackStatus("stopped");
    setMasterLevel(0);
    setSaveStatus("dirty");
    setNotice("여러 파일을 고르면 각각 독립 Track과 Clip으로 준비합니다.");
    if (startWithFiles) {
      importPurposeRef.current = "construction";
      const input = importInputRef.current;
      if (input) {
        input.value = "";
        input.click();
      }
    }
  }, [clearScheduledPlayback]);

  const loadProject = useCallback(async (projectId = selectedSavedProjectId) => {
    if (!projectId || projectOperation) return;
    setProjectOperation("loading");
    try {
      let loaded = await loadAudioStudioProject(projectId);
      if (!loaded) throw new Error("PROJECT_NOT_FOUND");
      loaded = await restoreMissingWaveforms(loaded);
      clearScheduledPlayback();
      audioBuffersRef.current.clear();
      clipboardRef.current = null;
      projectRef.current = loaded;
      suppressAutoSaveRef.current = true;
      setHistory(createAudioStudioHistory(loaded));
      setProjectActive(true);
      setScreen(AUDIO_STUDIO_SCREENS.EDIT);
      setActiveTrackId(loaded.tracks[0]?.id || "");
      setSelectedTrackId("");
      setSelectedClipIds([]);
      setRangeSelection(null);
      setCurrentTimeMs(0);
      setPlaybackStatus("stopped");
      setSaveStatus("saved");
      setNotice(`프로젝트 “${loaded.metadata.name}”을 불러왔습니다.`);
      setFitProjectRequestId((value) => value + 1);
    } catch {
      setNotice("선택한 프로젝트를 불러오지 못했습니다.");
    } finally {
      setProjectOperation("");
    }
  }, [clearScheduledPlayback, projectOperation, restoreMissingWaveforms, selectedSavedProjectId]);

  const playSavedProject = useCallback(async (projectId) => {
    if (!projectId || projectOperation) return;
    if (quickPlayingProjectId === projectId && playbackStatus === "playing") {
      pausePlayback();
      return;
    }
    setProjectOperation("loading-preview");
    try {
      let loaded = await loadAudioStudioProject(projectId);
      if (!loaded) throw new Error("PROJECT_NOT_FOUND");
      loaded = await restoreMissingWaveforms(loaded);
      clearScheduledPlayback();
      audioBuffersRef.current.clear();
      projectRef.current = loaded;
      suppressAutoSaveRef.current = true;
      setHistory(createAudioStudioHistory(loaded));
      setProjectActive(true);
      setCurrentTimeMs(0);
      setQuickPlayingProjectId(projectId);
      setSaveStatus("saved");
      setNotice(`“${loaded.metadata.name}” 전체 트랙을 재생합니다.`);
      await startPlayback(0);
    } catch {
      setQuickPlayingProjectId("");
      setNotice("프로젝트를 바로 재생하지 못했습니다.");
    } finally {
      setProjectOperation("");
    }
  }, [clearScheduledPlayback, pausePlayback, playbackStatus, projectOperation, quickPlayingProjectId, restoreMissingWaveforms, startPlayback]);

  const renameSavedProject = useCallback(async (projectId, name) => {
    if (!projectId || !String(name || "").trim()) return;
    setProjectOperation("renaming");
    try {
      const renamed = await renameAudioStudioProject(projectId, name);
      await refreshSavedProjects(renamed.id);
      if (projectRef.current.id === renamed.id) {
        projectRef.current = renamed;
        setHistory((current) => ({ ...current, present: renamed }));
      }
    } catch {
      setNotice("프로젝트 이름을 변경하지 못했습니다.");
    } finally {
      setProjectOperation("");
    }
  }, [refreshSavedProjects]);

  const duplicateSavedProject = useCallback(async (projectId) => {
    if (!projectId) return;
    setProjectOperation("duplicating");
    try {
      const duplicated = await duplicateAudioStudioProject(projectId);
      await refreshSavedProjects(duplicated.id);
      setNotice(`“${duplicated.metadata.name}” 프로젝트를 복제했습니다.`);
    } catch {
      setNotice("프로젝트를 복제하지 못했습니다.");
    } finally {
      setProjectOperation("");
    }
  }, [refreshSavedProjects]);

  const deleteSavedProject = useCallback(async (projectId = selectedSavedProjectId) => {
    if (!projectId || projectOperation) return;
    const savedName = savedProjects.find((item) => item.id === projectId)?.name || "선택한 프로젝트";
    if (typeof window !== "undefined" && !window.confirm(`저장된 “${savedName}” 프로젝트를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    setProjectOperation("deleting");
    try {
      await deleteAudioStudioProject(projectId);
      await refreshSavedProjects();
      setNotice("저장된 프로젝트를 삭제했습니다. 현재 작업 중인 프로젝트는 유지됩니다.");
    } catch {
      setNotice("저장된 프로젝트를 삭제하지 못했습니다.");
    } finally {
      setProjectOperation("");
    }
  }, [projectOperation, refreshSavedProjects, savedProjects, selectedSavedProjectId]);

  const goToLibrary = useCallback(async () => {
    if (countInTimerRef.current || (mediaRecorderRef.current?.state && mediaRecorderRef.current.state !== "inactive")) {
      stopRecording();
      setNotice("녹음을 먼저 마무리하고 있습니다. 완료 후 다시 뒤로가기를 눌러주세요.");
      return;
    }
    clearScheduledPlayback();
    setPlaybackStatus("stopped");
    if (projectActive && saveStatus !== "saved") {
      try {
        window.clearTimeout(autoSaveTimerRef.current);
        await persistProjectNow(projectRef.current);
      } catch {
        setNotice("저장에 실패해 작업실을 닫지 않았습니다.");
        return;
      }
    }
    setScreen(AUDIO_STUDIO_SCREENS.LIBRARY);
    setSelectedClipIds([]);
    setSelectedTrackId("");
    setRangeSelection(null);
  }, [clearScheduledPlayback, persistProjectNow, projectActive, saveStatus, stopRecording]);

  const goToConstruction = useCallback(() => {
    const current = projectRef.current;
    const clipSourceIds = current.tracks.flatMap((track) => [...track.clips]
      .sort((left, right) => left.timelineStartMs - right.timelineStartMs)
      .map((clip) => clip.sourceId));
    const order = [...new Set([...(current.settings.constructionSourceIds || []), ...clipSourceIds, ...current.audioSources.map((source) => source.id)])];
    commitProject((value) => ({ ...value, settings: { ...value.settings, constructionSourceIds: order }, updatedAt: Date.now() }));
    setScreen(AUDIO_STUDIO_SCREENS.CONSTRUCT);
  }, [commitProject]);

  const finishConstruction = useCallback(() => {
    const current = projectRef.current;
    const hasExistingClips = current.tracks.some((track) => track.clips.length > 0);
    const nextProject = buildAudioStudioConstruction(
      current,
      current.settings.constructionSourceIds,
      hasExistingClips ? current.settings.importMode : AUDIO_STUDIO_IMPORT_MODES.SEPARATE_TRACKS,
    );
    projectRef.current = nextProject;
    setHistory((value) => recordAudioStudioHistory(value, nextProject));
    setActiveTrackId(nextProject.tracks[0]?.id || "");
    setSelectedTrackId("");
    setSelectedClipIds([]);
    setRangeSelection(null);
    setCurrentTimeMs(0);
    setScreen(AUDIO_STUDIO_SCREENS.EDIT);
    setFitProjectRequestId((value) => value + 1);
  }, []);

  const goToEditor = useCallback(() => setScreen(AUDIO_STUDIO_SCREENS.EDIT), []);
  const goToMixer = useCallback(() => setScreen(AUDIO_STUDIO_SCREENS.MIX), []);

  const reorderConstructionSource = useCallback((sourceId, targetId) => {
    commitProject((current) => {
      const order = [...current.settings.constructionSourceIds];
      const fromIndex = order.indexOf(sourceId);
      const targetIndex = order.indexOf(targetId);
      if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return current;
      order.splice(fromIndex, 1);
      order.splice(targetIndex, 0, sourceId);
      return { ...current, settings: { ...current.settings, constructionSourceIds: order }, updatedAt: Date.now() };
    });
  }, [commitProject]);

  const removeConstructionSource = useCallback((sourceId) => {
    commitProject((current) => ({
      ...current,
      settings: {
        ...current.settings,
        constructionSourceIds: current.settings.constructionSourceIds.filter((id) => id !== sourceId),
      },
      updatedAt: Date.now(),
    }));
  }, [commitProject]);

  const exportProject = useCallback(async () => {
    if (projectOperation || !getAudioStudioProjectDurationMs(projectRef.current)) return;
    setProjectOperation("exporting");
    setNotice("현재 Project / Track / Clip / FX 상태를 WAV로 렌더링하고 있습니다.");
    try {
      const context = await ensurePlaybackContext();
      await ensureSourceBuffers(context, projectRef.current);
      const wav = await renderAudioStudioWav(projectRef.current, audioBuffersRef.current);
      downloadAudioStudioBlob(wav, sanitizeAudioStudioExportName(projectRef.current.metadata.name));
      setNotice("전체 프로젝트 WAV 내보내기를 완료했습니다.");
    } catch {
      setNotice("WAV를 렌더링하지 못했습니다. 프로젝트 길이와 브라우저 메모리를 확인해주세요.");
    } finally {
      setProjectOperation("");
    }
  }, [ensurePlaybackContext, ensureSourceBuffers, projectOperation]);

  const updateSelectedClips = useCallback((updates) => {
    if (!selectedClipIdsRef.current.length) return;
    commitProject((current) => updateAudioStudioClips(current, selectedClipIdsRef.current, updates));
  }, [commitProject]);

  const updateActiveTrack = useCallback((updates) => {
    if (!activeTrackId) return;
    commitProject((current) => updateAudioStudioTrack(current, activeTrackId, updates));
  }, [activeTrackId, commitProject]);

  const updateTrack = useCallback((trackId, updates) => {
    if (!trackId) return;
    commitProject((current) => updateAudioStudioTrack(current, trackId, updates));
  }, [commitProject]);

  const matchTrackBpm = useCallback(async (trackId) => {
    if (projectOperation) return;
    const currentProject = projectRef.current;
    const track = currentProject.tracks.find((item) => item.id === trackId);
    const sourceBpm = Number(track?.bpm || track?.detectedBpm) || 0;
    const targetBpm = Number(currentProject.settings.projectBpm) || 0;
    if (!track || !sourceBpm || !targetBpm) {
      setNotice("감지 BPM과 Project BPM을 먼저 확인해주세요.");
      return;
    }
    if (Math.abs(sourceBpm - targetBpm) < 0.1) {
      setNotice("이미 Project BPM과 일치합니다.");
      return;
    }
    setProjectOperation("matching-bpm");
    setNotice(`${Math.round(sourceBpm)} → ${Math.round(targetBpm)} BPM으로 음정을 유지하며 변환하고 있습니다.`);
    try {
      const context = await ensurePlaybackContext();
      await ensureSourceBuffers(context, currentProject);
      const ratio = targetBpm / sourceBpm;
      const sourceIds = [...new Set(track.clips.map((clip) => clip.sourceId))];
      const sourceMap = new Map();
      for (const sourceId of sourceIds) {
        const originalSource = currentProject.audioSources.find((source) => source.id === sourceId);
        const originalBuffer = audioBuffersRef.current.get(sourceId);
        if (!originalSource || !originalBuffer) continue;
        const stretched = stretchAudioStudioPcm(originalBuffer, ratio);
        const blob = encodePcmWav(stretched.channels, stretched.sampleRate);
        const audioBuffer = await decodeAudioStudioData(context, await blob.arrayBuffer());
        const source = createAudioStudioSource({
          blob,
          detectedBpm: targetBpm,
          durationMs: audioBuffer.duration * 1_000,
          fileName: `${originalSource.fileName.replace(/\.[^.]+$/, "")} · ${Math.round(targetBpm)} BPM.wav`,
          mimeType: "audio/wav",
          ...buildAudioStudioWaveformPeaks(audioBuffer, 180),
        });
        sourceMap.set(sourceId, source);
        audioBuffersRef.current.set(source.id, audioBuffer);
      }
      if (!sourceMap.size) throw new Error("NO_STRETCH_SOURCE");
      const nextProject = {
        ...currentProject,
        audioSources: [...currentProject.audioSources, ...sourceMap.values()],
        tracks: currentProject.tracks.map((item) => item.id === trackId ? {
          ...item,
          bpm: targetBpm,
          clips: item.clips.map((clip) => {
            const nextSource = sourceMap.get(clip.sourceId);
            if (!nextSource) return clip;
            return {
              ...clip,
              durationMs: clip.durationMs / ratio,
              sourceEndMs: clip.sourceEndMs / ratio,
              sourceId: nextSource.id,
              sourceStartMs: clip.sourceStartMs / ratio,
            };
          }),
        } : item),
        updatedAt: Date.now(),
      };
      projectRef.current = nextProject;
      setHistory((current) => recordAudioStudioHistory(current, nextProject));
      setFitProjectRequestId((value) => value + 1);
      setNotice(`${track.name}을 ${Math.round(targetBpm)} BPM에 맞췄습니다. 원본 오디오는 보존됩니다.`);
    } catch {
      setNotice("이 기기에서 BPM Match 변환을 완료하지 못했습니다. 원본 트랙은 그대로 유지됩니다.");
    } finally {
      setProjectOperation("");
    }
  }, [ensurePlaybackContext, ensureSourceBuffers, projectOperation]);

  const createTrack = useCallback(() => {
    const nextProject = addAudioStudioTrack(projectRef.current);
    const trackId = nextProject.tracks.at(-1)?.id || "";
    setHistory((current) => recordAudioStudioHistory(current, nextProject));
    setActiveTrackId(trackId);
    setSelectedClipIds([]);
  }, []);

  const deleteActiveTrack = useCallback(() => {
    const currentProject = projectRef.current;
    const nextProject = removeAudioStudioTrack(currentProject, activeTrackId);
    if (nextProject === currentProject) return;
    setHistory((current) => recordAudioStudioHistory(current, nextProject));
    setActiveTrackId(nextProject.tracks[0]?.id || "");
    setSelectedClipIds([]);
  }, [activeTrackId]);

  const moveActiveTrack = useCallback((direction) => {
    commitProject((current) => reorderAudioStudioTrack(current, activeTrackId, direction));
  }, [activeTrackId, commitProject]);

  const reorderTrack = useCallback((trackId, targetTrackId) => {
    commitProject((current) => moveAudioStudioTrack(current, trackId, targetTrackId));
  }, [commitProject]);

  const updatePractice = useCallback((updates) => {
    commitProject((current) => ({
      ...current,
      practice: {
        ...current.practice,
        ...updates,
        loop: updates.loop ? { ...current.practice.loop, ...updates.loop } : current.practice.loop,
        repeat: updates.repeat ? { ...current.practice.repeat, ...updates.repeat } : current.practice.repeat,
        speed: updates.speed ? { ...current.practice.speed, ...updates.speed } : current.practice.speed,
      },
      updatedAt: Date.now(),
    }));
  }, [commitProject]);

  const updateMaster = useCallback((updates) => {
    commitProject((current) => ({
      ...current,
      mixer: {
        ...current.mixer,
        master: { ...current.mixer.master, ...updates },
      },
      updatedAt: Date.now(),
    }));
  }, [commitProject]);

  const openImportPicker = useCallback((purpose = "construction", targetTrackId = "") => {
    if (importing) return;
    importPurposeRef.current = purpose;
    importTargetTrackIdRef.current = targetTrackId;
    const input = importInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  }, [importing]);

  const importFiles = useCallback(async (event) => {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    input.value = "";
    if (!files.length || importing) return;
    setImporting(true);
    setNotice(`${files.length}개 파일의 재생시간과 파형을 분석하고 있습니다.`);
    try {
      const { decoded, rejected } = await decodeAudioStudioFiles(files, {
        onProgress: ({ completed, total }) => {
          setNotice(`${completed}/${total} 파일 파형 생성 중...`);
        },
      });
      if (!decoded.length) {
        setNotice("가져올 수 있는 오디오가 없습니다. MP3, WAV, M4A, AAC 파일을 확인해주세요.");
        return;
      }
      decoded.forEach(({ audioBuffer, source }) => audioBuffersRef.current.set(source.id, audioBuffer));
      const currentProject = projectRef.current;
      if (importPurposeRef.current === "construction") {
        const decodedSources = decoded.map(({ source }) => source);
        const withSources = addAudioStudioSources(currentProject, decodedSources);
        const nextProject = {
          ...withSources,
          settings: {
            ...withSources.settings,
            constructionSourceIds: [
              ...withSources.settings.constructionSourceIds,
              ...decodedSources.map((source) => source.id).filter((id) => !withSources.settings.constructionSourceIds.includes(id)),
            ],
          },
          updatedAt: Date.now(),
        };
        projectRef.current = nextProject;
        setHistory((current) => recordAudioStudioHistory(current, nextProject));
        setScreen(AUDIO_STUDIO_SCREENS.CONSTRUCT);
        setImportCompletionId((value) => value + 1);
        setNotice(rejected.length
          ? `${decoded.length}개 추가 · ${rejected.length}개 디코딩 실패`
          : `${decoded.length}개 오디오를 구성 목록에 추가했습니다.`);
        return;
      }
      const targetTrackId = importTargetTrackIdRef.current || activeTrackId;
      const editorImportMode = AUDIO_STUDIO_IMPORT_MODES.SEPARATE_TRACKS;
      const placement = addAudioStudioImportedSources(
        currentProject,
        decoded.map(({ source }) => source),
        { activeTrackId: targetTrackId, importMode: editorImportMode },
      );
      projectRef.current = placement.project;
      setHistory((current) => recordAudioStudioHistory(current, placement.project));
      setSelectedClipIds(placement.clipIds);
      setSelectedTrackId("");
      if (placement.trackIds[0]) setActiveTrackId(placement.trackIds[0]);
      setImportCompletionId((value) => value + 1);
      importTargetTrackIdRef.current = "";
      setFitProjectRequestId((value) => value + 1);
      setNotice(rejected.length
        ? `${decoded.length}개 가져오기 완료 · ${rejected.length}개는 브라우저에서 디코딩하지 못했습니다.`
        : `${decoded.length}개 파일을 독립 Track으로 추가했습니다. Timeline에서 위치를 정하세요.`);
    } catch {
      setNotice("오디오 디코더를 시작할 수 없습니다. 브라우저 오디오 지원을 확인해주세요.");
    } finally {
      importTargetTrackIdRef.current = "";
      setImporting(false);
    }
  }, [activeTrackId, importing]);

  const selectedClipIdSet = useMemo(() => new Set(selectedClipIds), [selectedClipIds]);
  const selectedClips = useMemo(() => project.tracks.flatMap((track) => track.clips)
    .filter((clip) => selectedClipIdSet.has(clip.id)), [project.tracks, selectedClipIdSet]);
  const activeTrack = useMemo(() => project.tracks.find((track) => track.id === activeTrackId) || project.tracks[0], [activeTrackId, project.tracks]);
  const constructionSources = useMemo(() => project.settings.constructionSourceIds
    .map((sourceId) => project.audioSources.find((source) => source.id === sourceId))
    .filter(Boolean), [project.audioSources, project.settings.constructionSourceIds]);

  useEffect(() => {
    const validTrackIds = new Set(project.tracks.map((track) => track.id));
    const validClipIds = new Set(project.tracks.flatMap((track) => track.clips.map((clip) => clip.id)));
    if (!validTrackIds.has(activeTrackId)) setActiveTrackId(project.tracks[0]?.id || "");
    if (selectedTrackId && !validTrackIds.has(selectedTrackId)) setSelectedTrackId("");
    setSelectedClipIds((current) => current.every((id) => validClipIds.has(id))
      ? current
      : current.filter((id) => validClipIds.has(id)));
  }, [activeTrackId, project.tracks, selectedTrackId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (screen !== AUDIO_STUDIO_SCREENS.EDIT && screen !== AUDIO_STUDIO_SCREENS.MIX) return;
      const target = event.target;
      if (target?.matches?.("input, select, textarea, [contenteditable='true']")) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (modifier && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelection();
      } else if (modifier && event.key.toLowerCase() === "x") {
        event.preventDefault();
        cutSelection();
      } else if (modifier && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteSelection();
      } else if (modifier && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelection();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (rangeSelection) deleteRangeSelection();
        else deleteSelection();
      } else if (event.code === "Space") {
        event.preventDefault();
        if (playbackStatus === "playing") pausePlayback();
        else startPlayback();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copySelection, cutSelection, deleteRangeSelection, deleteSelection, duplicateSelection, pasteSelection, pausePlayback, playbackStatus, rangeSelection, redo, screen, startPlayback, undo]);

  return {
    activeTrackId,
    activeTrack,
    audioBuffersRef,
    canRedo: history.future.length > 0,
    canUndo: history.past.length > 0,
    beginClipDrag,
    beginClipResize,
    addMarker,
    commitProject,
    createNewProject,
    createTrack,
    constructionSources,
    currentTimeMs,
    cutSelection,
    deleteSelection,
    deleteRangeSelection,
    deleteActiveTrack,
    deleteSavedProject,
    deleteMarker,
    dragPreview,
    duplicateSelection,
    duplicateRangeSelection,
    duplicateSavedProject,
    exportProject,
    finishConstruction,
    fitProject,
    fitProjectRequestId,
    fitSelection,
    goToConstruction,
    goToEditor,
    goToLibrary,
    goToMixer,
    groupSelection,
    importAccept: AUDIO_STUDIO_FILE_ACCEPT,
    importCompletionId,
    importFiles,
    importing,
    importInputRef,
    loopRangeSelection,
    matchTrackBpm,
    notice,
    openImportPicker,
    pausePlayback,
    pasteSelection,
    playbackStatus,
    playSavedProject,
    project,
    projectOperation,
    quickPlayingProjectId,
    rangeSelection,
    recordingState,
    projectActive,
    requestProjectFit,
    playSelection,
    removeConstructionSource,
    renameSavedProject,
    reorderConstructionSource,
    reorderTrack,
    saveStatus,
    screen,
    selectedClipIds,
    selectedClips,
    selectedSavedProjectId,
    selectedTrackId,
    savedProjects,
    selectedClipIdSet,
    setActiveTrackId,
    setProjectName,
    setSelectedClipIds,
    setSelectedSavedProjectId,
    setSelectedTrackId,
    setTimelineZoom,
    setLoopPoint,
    selectClip,
    selectTimelineRange,
    selectTrack,
    selectScope,
    seekPlayback,
    seekClipBoundary,
    startPlayback,
    stopPlayback,
    splitSelection,
    splitRangeSelection,
    startRecording,
    stopRecording,
    trimSelection,
    trimRangeSelection,
    ungroupSelection,
    undo,
    loadProject,
    masterLevel,
    saveProject,
    updateActiveTrack,
    updateMaster,
    updatePractice,
    updateSelectedClips,
    updateEditorSettings,
    updateMarker,
    updateTrack,
    moveActiveTrack,
    redo,
    copySelection,
    crossfadeSelection,
    slipSelection,
    snapGuideMs,
  };
}
