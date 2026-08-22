import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUDIO_BUS_IDS,
  getAudioBusInput,
  getSharedAudioContext,
} from "../audio/audioBus";
import { getPreferredBackingLoopMimeType } from "../backing-loop/backingLoopUtils";
import {
  AUDIO_STUDIO_FILE_ACCEPT,
  decodeAudioStudioData,
  decodeAudioStudioFiles,
} from "./audioStudioAudio";
import {
  AUDIO_STUDIO_IMPORT_MODES,
  AUDIO_STUDIO_SELECTION_SCOPES,
  addAudioStudioMarker,
  addAudioStudioImportedSources,
  addAudioStudioTrack,
  applyAudioStudioCrossfade,
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
import {
  downloadAudioStudioBlob,
  getAudioStudioRenderedDurationMs,
  renderAudioStudioWav,
  sanitizeAudioStudioExportName,
} from "./audioStudioExport";
import {
  deleteAudioStudioMix,
  listAudioStudioMixes,
  loadAudioStudioMix,
  renameAudioStudioMix,
  saveAudioStudioMix,
  subscribeAudioStudioMixLibrary,
} from "./audioStudioStorage";
import {
  AUDIO_STUDIO_TIME_STRETCH_ALGORITHM,
  AUDIO_STUDIO_TIME_STRETCH_VERSION,
  createAudioStudioTimeStretchCacheKey,
  getAudioStudioTimeStretchRatio,
  isAudioStudioTimeStretchRatioSupported,
  renderAudioStudioTimeStretch,
} from "./audioStudioTimeStretch";

export const AUDIO_STUDIO_SCREENS = Object.freeze({
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
  const [notice, setNotice] = useState("편집실에서 MIX SAVE한 완성 음원이 이 보관함에 저장됩니다.");
  const [playbackStatus, setPlaybackStatus] = useState("stopped");
  const [libraryMixId, setLibraryMixId] = useState("");
  const [libraryPlaybackStatus, setLibraryPlaybackStatus] = useState("stopped");
  const [rangeSelection, setRangeSelection] = useState(null);
  const [recordingState, setRecordingState] = useState({ beat: 0, phase: "idle", targetTrackId: "" });
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [masterLevel, setMasterLevel] = useState(0);
  const [dragPreview, setDragPreview] = useState(null);
  const [projectOperation, setProjectOperation] = useState("");
  const [trackStretchState, setTrackStretchState] = useState({});
  const [savedMixes, setSavedMixes] = useState([]);
  const [screen, setScreen] = useState(AUDIO_STUDIO_SCREENS.LIBRARY);
  const [snapGuideMs, setSnapGuideMs] = useState(null);
  const audioBuffersRef = useRef(new Map());
  const stretchBufferCacheRef = useRef(new Map());
  const audioContextRef = useRef(null);
  const libraryAudioRef = useRef(null);
  const libraryAudioUrlRef = useRef("");
  const playbackRef = useRef(null);
  const playbackStopAtRef = useRef(null);
  const animationFrameRef = useRef(0);
  const importInputRef = useRef(null);
  const clipboardRef = useRef(null);
  const ignoreClipClickRef = useRef("");
  const importTargetTrackIdRef = useRef("");
  const countInTimerRef = useRef(0);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(0);
  const recordingStreamRef = useRef(null);
  const recordingTargetTrackIdRef = useRef("");
  const recordingTimelineStartRef = useRef(0);
  const project = history.present;
  const projectRef = useRef(project);
  projectRef.current = project;
  const selectedClipIdsRef = useRef(selectedClipIds);
  selectedClipIdsRef.current = selectedClipIds;

  const refreshSavedMixes = useCallback(async () => {
    try {
      setSavedMixes(await listAudioStudioMixes());
    } catch {
      setNotice("완성 음원 보관함을 열 수 없습니다. 브라우저 저장 권한을 확인해주세요.");
    }
  }, []);

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
    if (audioContextRef.current && audioContextRef.current.state !== "closed") return audioContextRef.current;
    const context = getSharedAudioContext();
    if (!context) throw new Error("AUDIO_CONTEXT_UNAVAILABLE");
    audioContextRef.current = context;
    return context;
  }, []);

  const ensureSourceBuffers = useCallback(async (context, studioProject) => {
    for (const source of studioProject.audioSources) {
      if (audioBuffersRef.current.has(source.id)) continue;
      const cachedStretch = [...stretchBufferCacheRef.current.values()]
        .find((entry) => entry.source.id === source.id);
      if (cachedStretch) {
        audioBuffersRef.current.set(source.id, cachedStretch.audioBuffer);
        continue;
      }
      if (!source.blob) continue;
      const buffer = await decodeAudioStudioData(context, await source.blob.arrayBuffer());
      audioBuffersRef.current.set(source.id, buffer);
    }
  }, []);

  const startPlayback = useCallback(async (requestedTimeMs = currentTimeMs, options = {}) => {
    const studioProject = options.project || projectRef.current;
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
          outputNode: getAudioBusInput(AUDIO_BUS_IDS.BACKING, context),
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
            setMasterLevel(0);
          }
          return;
        }
        animationFrameRef.current = requestAnimationFrame(tick);
      };
      animationFrameRef.current = requestAnimationFrame(tick);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Audio Studio playback failed", error);
      clearScheduledPlayback();
      setPlaybackStatus("stopped");
      setNotice("이 브라우저에서 오디오를 디코딩하거나 재생할 수 없습니다.");
    }
  }, [clearScheduledPlayback, currentTimeMs, ensurePlaybackContext, ensureSourceBuffers]);

  const pausePlayback = useCallback(() => {
    clearScheduledPlayback();
    setPlaybackStatus("paused");
    setMasterLevel(0);
  }, [clearScheduledPlayback]);

  const stopPlayback = useCallback(() => {
    clearScheduledPlayback();
    setCurrentTimeMs(0);
    setPlaybackStatus("stopped");
    setMasterLevel(0);
  }, [clearScheduledPlayback]);

  const releaseLibraryAudio = useCallback(() => {
    const audio = libraryAudioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute?.("src");
      audio.load?.();
    }
    libraryAudioRef.current = null;
    if (libraryAudioUrlRef.current) URL.revokeObjectURL(libraryAudioUrlRef.current);
    libraryAudioUrlRef.current = "";
    setLibraryMixId("");
    setLibraryPlaybackStatus("stopped");
  }, []);

  const playSavedMix = useCallback(async (mixId) => {
    if (!mixId || projectOperation) return;
    const currentAudio = libraryAudioRef.current;
    if (libraryMixId === mixId && currentAudio) {
      if (libraryPlaybackStatus === "playing") {
        currentAudio.pause();
        setLibraryPlaybackStatus("paused");
        return;
      }
      try {
        await currentAudio.play();
        setLibraryPlaybackStatus("playing");
      } catch {
        setNotice("이 브라우저에서 완성 음원을 재생할 수 없습니다.");
      }
      return;
    }
    setProjectOperation("loading-mix");
    try {
      const mix = await loadAudioStudioMix(mixId);
      if (!mix?.blob) throw new Error("MIX_NOT_FOUND");
      clearScheduledPlayback();
      releaseLibraryAudio();
      const url = URL.createObjectURL(mix.blob);
      const audio = new Audio(url);
      libraryAudioUrlRef.current = url;
      libraryAudioRef.current = audio;
      audio.preload = "metadata";
      audio.onended = releaseLibraryAudio;
      audio.onerror = () => {
        releaseLibraryAudio();
        setNotice("완성 음원 파일을 재생할 수 없습니다.");
      };
      setLibraryMixId(mixId);
      await audio.play();
      setLibraryPlaybackStatus("playing");
    } catch {
      releaseLibraryAudio();
      setNotice("완성 음원을 불러오지 못했습니다.");
    } finally {
      setProjectOperation("");
    }
  }, [clearScheduledPlayback, libraryMixId, libraryPlaybackStatus, projectOperation, releaseLibraryAudio]);

  const downloadSavedMix = useCallback(async (mixId) => {
    if (!mixId || projectOperation) return;
    setProjectOperation("downloading-mix");
    try {
      const mix = await loadAudioStudioMix(mixId);
      if (!mix?.blob) throw new Error("MIX_NOT_FOUND");
      downloadAudioStudioBlob(mix.blob, mix.fileName);
      setNotice(`“${mix.fileName}” 다운로드를 시작했습니다.`);
    } catch {
      setNotice("완성 음원을 기기로 다운로드하지 못했습니다.");
    } finally {
      setProjectOperation("");
    }
  }, [projectOperation]);

  const renameSavedMix = useCallback(async (mixId, name) => {
    if (!mixId || !String(name || "").trim() || projectOperation) return;
    setProjectOperation("renaming-mix");
    try {
      const renamed = await renameAudioStudioMix(mixId, name);
      await refreshSavedMixes();
      setNotice(`완성 음원 이름을 “${renamed.fileName}”으로 변경했습니다.`);
    } catch {
      setNotice("완성 음원 이름을 변경하지 못했습니다.");
    } finally {
      setProjectOperation("");
    }
  }, [projectOperation, refreshSavedMixes]);

  const deleteSavedMix = useCallback(async (mixId) => {
    if (!mixId || projectOperation) return;
    const saved = savedMixes.find((item) => item.id === mixId);
    if (typeof window !== "undefined" && !window.confirm(`“${saved?.fileName || "선택한 음원"}”을 삭제할까요? 이 음원을 사용하는 BACKING LOOP 재생목록에서도 제거됩니다.`)) return;
    setProjectOperation("deleting-mix");
    try {
      if (libraryMixId === mixId) releaseLibraryAudio();
      await deleteAudioStudioMix(mixId);
      await refreshSavedMixes();
      setNotice("완성 음원을 삭제했습니다.");
    } catch {
      setNotice("완성 음원을 삭제하지 못했습니다.");
    } finally {
      setProjectOperation("");
    }
  }, [libraryMixId, projectOperation, refreshSavedMixes, releaseLibraryAudio, savedMixes]);

  const seekPlayback = useCallback((timeMs) => {
    const wasPlaying = playbackStatus === "playing";
    const nextTimeMs = Math.max(0, Math.min(getAudioStudioProjectDurationMs(projectRef.current), Number(timeMs) || 0));
    clearScheduledPlayback();
    setCurrentTimeMs(nextTimeMs);
    if (wasPlaying) startPlayback(nextTimeMs);
    else setPlaybackStatus(nextTimeMs > 0 ? "paused" : "stopped");
  }, [clearScheduledPlayback, playbackStatus, startPlayback]);

  const setPlaybackPosition = useCallback((timeMs) => {
    clearScheduledPlayback();
    const nextTimeMs = Math.max(0, Number(timeMs) || 0);
    setCurrentTimeMs(nextTimeMs);
    setPlaybackStatus(nextTimeMs > 0 ? "paused" : "stopped");
    setMasterLevel(0);
  }, [clearScheduledPlayback]);

  useEffect(() => () => {
    clearScheduledPlayback();
    libraryAudioRef.current?.pause?.();
    libraryAudioRef.current = null;
    if (libraryAudioUrlRef.current) URL.revokeObjectURL(libraryAudioUrlRef.current);
    libraryAudioUrlRef.current = "";
    window.clearInterval(countInTimerRef.current);
    const recorder = mediaRecorderRef.current;
    if (recorder?.state && recorder.state !== "inactive") {
      try { recorder.stop(); } catch { /* Best-effort cleanup while leaving the route. */ }
    }
    recordingStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    audioContextRef.current = null;
  }, [clearScheduledPlayback]);

  useEffect(() => {
    refreshSavedMixes();
    return subscribeAudioStudioMixLibrary(refreshSavedMixes);
  }, [refreshSavedMixes]);

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
      gain.connect(getAudioBusInput(AUDIO_BUS_IDS.METRONOME, context) || context.destination);
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
          const context = await ensurePlaybackContext();
          const { decoded } = await decodeAudioStudioFiles([file], { context });
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
  }, [clearScheduledPlayback, currentTimeMs, ensurePlaybackContext, playCountInClick, releaseRecordingInput, startPlayback, stopRecording]);

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

  const openEditor = useCallback(() => {
    clearScheduledPlayback();
    releaseLibraryAudio();
    const nextProject = createAudioStudioProject();
    projectRef.current = nextProject;
    audioBuffersRef.current.clear();
    stretchBufferCacheRef.current.clear();
    setTrackStretchState({});
    clipboardRef.current = null;
    setHistory(createAudioStudioHistory(nextProject));
    setScreen(AUDIO_STUDIO_SCREENS.EDIT);
    setActiveTrackId(nextProject.tracks[0]?.id || "");
    setSelectedTrackId("");
    setSelectedClipIds([]);
    setRangeSelection(null);
    setCurrentTimeMs(0);
    setPlaybackStatus("stopped");
    setMasterLevel(0);
    setNotice("+ 음원 추가에서 한 개 또는 여러 파일을 선택하세요. 각 파일은 별도 TRACK에 바로 배치됩니다.");
  }, [clearScheduledPlayback, releaseLibraryAudio]);

  const goToLibrary = useCallback(() => {
    if (countInTimerRef.current || (mediaRecorderRef.current?.state && mediaRecorderRef.current.state !== "inactive")) {
      stopRecording();
      setNotice("녹음을 먼저 마무리하고 있습니다. 완료 후 다시 뒤로가기를 눌러주세요.");
      return;
    }
    clearScheduledPlayback();
    setPlaybackStatus("stopped");
    setScreen(AUDIO_STUDIO_SCREENS.LIBRARY);
    setSelectedClipIds([]);
    setSelectedTrackId("");
    setRangeSelection(null);
  }, [clearScheduledPlayback, stopRecording]);

  const goToEditor = useCallback(() => setScreen(AUDIO_STUDIO_SCREENS.EDIT), []);
  const goToMixer = useCallback(() => setScreen(AUDIO_STUDIO_SCREENS.MIX), []);

  const mixSave = useCallback(async (name) => {
    const mixName = String(name || "").trim();
    if (!mixName || projectOperation || !getAudioStudioProjectDurationMs(projectRef.current)) return null;
    setProjectOperation("mix-saving");
    setNotice("모든 트랙을 하나의 완성 WAV 음원으로 믹싱하고 있습니다.");
    try {
      const context = await ensurePlaybackContext();
      await ensureSourceBuffers(context, projectRef.current);
      const wav = await renderAudioStudioWav(projectRef.current, audioBuffersRef.current);
      const savedMix = await saveAudioStudioMix({
        blob: wav,
        durationMs: getAudioStudioRenderedDurationMs(projectRef.current),
        fileName: sanitizeAudioStudioExportName(mixName),
      });
      await refreshSavedMixes();
      clearScheduledPlayback();
      setPlaybackStatus("stopped");
      setScreen(AUDIO_STUDIO_SCREENS.LIBRARY);
      setSelectedClipIds([]);
      setSelectedTrackId("");
      setRangeSelection(null);
      setNotice(`“${savedMix.fileName}” 완성 · AUDIO STUDIO 보관함과 BACKING LOOP에서 사용할 수 있습니다.`);
      return savedMix;
    } catch {
      setNotice("MIX SAVE를 완료하지 못했습니다. 음원 길이, 브라우저 메모리와 저장 공간을 확인해주세요.");
      return null;
    } finally {
      setProjectOperation("");
    }
  }, [clearScheduledPlayback, ensurePlaybackContext, ensureSourceBuffers, projectOperation, refreshSavedMixes]);

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

  const applyTrackTimeStretch = useCallback(async (trackId, { sourceBpm, targetBpm } = {}) => {
    if (projectOperation) return false;
    const currentProject = projectRef.current;
    const track = currentProject.tracks.find((item) => item.id === trackId);
    const safeSourceBpm = Number(sourceBpm);
    const safeTargetBpm = Number(targetBpm);
    const ratio = getAudioStudioTimeStretchRatio(safeSourceBpm, safeTargetBpm);
    if (!track || !track.clips.length || !safeSourceBpm || !safeTargetBpm) {
      setNotice("원본 BPM과 목표 BPM을 모두 입력해주세요.");
      return false;
    }
    if (!isAudioStudioTimeStretchRatioSupported(ratio)) {
      setNotice("STRETCH 배율은 0.75×에서 1.50×까지만 적용할 수 있습니다.");
      return false;
    }
    clearScheduledPlayback();
    setPlaybackStatus("stopped");
    setProjectOperation("time-stretching");
    setTrackStretchState((current) => ({
      ...current,
      [trackId]: { error: "", progress: 0, status: "processing" },
    }));
    setNotice(`${safeSourceBpm} → ${safeTargetBpm} BPM · Pitch를 유지하며 변환하고 있습니다.`);
    try {
      const context = await ensurePlaybackContext();
      await ensureSourceBuffers(context, currentProject);
      const originalSourceIds = [...new Set(track.clips.map((clip) => (
        clip.timeStretch?.originalSourceId || clip.sourceId
      )))];
      const sourceMap = new Map();
      for (let index = 0; index < originalSourceIds.length; index += 1) {
        const originalSourceId = originalSourceIds[index];
        const originalSource = currentProject.audioSources.find((source) => source.id === originalSourceId);
        const originalBuffer = audioBuffersRef.current.get(originalSourceId);
        if (!originalSource || !originalBuffer) continue;
        if (Math.abs(ratio - 1) < 0.000001) {
          sourceMap.set(originalSourceId, { audioBuffer: originalBuffer, source: originalSource });
          continue;
        }
        const cacheKey = createAudioStudioTimeStretchCacheKey(originalSourceId, ratio, originalBuffer.sampleRate);
        let cached = stretchBufferCacheRef.current.get(cacheKey);
        if (!cached) {
          const audioBuffer = await renderAudioStudioTimeStretch(originalBuffer, ratio, {
            onProgress: (progress) => {
              const combinedProgress = (index + progress) / originalSourceIds.length;
              setTrackStretchState((current) => ({
                ...current,
                [trackId]: { error: "", progress: combinedProgress, status: "processing" },
              }));
            },
          });
          const source = createAudioStudioSource({
            detectedBpm: safeTargetBpm,
            durationMs: audioBuffer.duration * 1_000,
            fileName: `${originalSource.fileName.replace(/\.[^.]+$/, "")} · STRETCH ${ratio.toFixed(2)}x`,
            mimeType: "audio/x-signalsmith-pcm",
            peakAmplitude: originalSource.peakAmplitude,
            waveformPeaks: originalSource.waveformPeaks,
          });
          cached = { audioBuffer, source };
          stretchBufferCacheRef.current.set(cacheKey, cached);
          audioBuffersRef.current.set(source.id, audioBuffer);
        } else {
          audioBuffersRef.current.set(cached.source.id, cached.audioBuffer);
          setTrackStretchState((current) => ({
            ...current,
            [trackId]: {
              error: "",
              progress: (index + 1) / originalSourceIds.length,
              status: "processing",
            },
          }));
        }
        sourceMap.set(originalSourceId, cached);
      }
      if (!sourceMap.size) throw new Error("NO_STRETCH_SOURCE");
      const newSources = [...sourceMap.values()]
        .map(({ source }) => source)
        .filter((source) => !currentProject.audioSources.some((item) => item.id === source.id));
      const nextProject = {
        ...currentProject,
        audioSources: [...currentProject.audioSources, ...newSources],
        tracks: currentProject.tracks.map((item) => item.id === trackId ? {
          ...item,
          bpm: safeTargetBpm,
          timeStretch: {
            algorithm: AUDIO_STUDIO_TIME_STRETCH_ALGORITHM,
            sourceBpm: safeSourceBpm,
            targetBpm: safeTargetBpm,
            ratio,
            version: AUDIO_STUDIO_TIME_STRETCH_VERSION,
          },
          clips: item.clips.map((clip) => {
            const originalSourceId = clip.timeStretch?.originalSourceId || clip.sourceId;
            const nextSource = sourceMap.get(originalSourceId)?.source;
            if (!nextSource) return clip;
            const playbackRate = Math.max(0.25, Number(clip.playbackRate) || 1);
            return {
              ...clip,
              durationMs: Math.max(1, (clip.sourceEndMs - clip.sourceStartMs) / ratio / playbackRate),
              sourceId: originalSourceId,
              timeStretch: Math.abs(ratio - 1) < 0.000001 ? null : {
                algorithm: AUDIO_STUDIO_TIME_STRETCH_ALGORITHM,
                originalSourceId,
                ratio,
                renderedSourceId: nextSource.id,
                version: AUDIO_STUDIO_TIME_STRETCH_VERSION,
              },
            };
          }),
        } : item),
        updatedAt: Date.now(),
      };
      projectRef.current = nextProject;
      setHistory((current) => recordAudioStudioHistory(current, nextProject));
      setFitProjectRequestId((value) => value + 1);
      setCurrentTimeMs((current) => Math.min(current, getAudioStudioProjectDurationMs(nextProject)));
      setTrackStretchState((current) => ({
        ...current,
        [trackId]: { error: "", progress: 1, status: "complete" },
      }));
      setNotice(`${track.name} · ${safeSourceBpm} → ${safeTargetBpm} BPM 변환을 완료했습니다. 원본은 그대로 보존됩니다.`);
      return true;
    } catch (error) {
      const unsupported = error?.message === "AUDIO_WORKLET_UNAVAILABLE";
      const message = unsupported
        ? "이 브라우저에서는 Signalsmith WASM AudioWorklet을 사용할 수 없습니다. 최신 브라우저에서 다시 시도해주세요."
        : "Time Stretch를 완료하지 못했습니다. 기기 메모리와 음원 길이를 확인해주세요.";
      setTrackStretchState((current) => ({
        ...current,
        [trackId]: { error: message, progress: 0, status: "error" },
      }));
      setNotice(message);
      return false;
    } finally {
      setProjectOperation("");
    }
  }, [clearScheduledPlayback, ensurePlaybackContext, ensureSourceBuffers, projectOperation]);

  const matchTrackBpm = useCallback((trackId) => {
    const currentProject = projectRef.current;
    const track = currentProject.tracks.find((item) => item.id === trackId);
    return applyTrackTimeStretch(trackId, {
      sourceBpm: track?.timeStretch?.sourceBpm || track?.bpm || track?.detectedBpm,
      targetBpm: currentProject.settings.projectBpm,
    });
  }, [applyTrackTimeStretch]);

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

  const deleteTrack = useCallback((trackId) => {
    const currentProject = projectRef.current;
    const targetTrack = currentProject.tracks.find((track) => track.id === trackId);
    if (!targetTrack) return;
    clearScheduledPlayback();
    setPlaybackStatus("stopped");
    let nextProject = currentProject.tracks.length > 1
      ? removeAudioStudioTrack(currentProject, trackId)
      : updateAudioStudioTrack(currentProject, trackId, {
        clips: [],
        mute: false,
        name: "Track 1",
        solo: false,
        volume: 1,
      });
    const usedSourceIds = new Set(nextProject.tracks.flatMap((track) => track.clips.flatMap((clip) => [
      clip.sourceId,
      clip.timeStretch?.renderedSourceId,
    ].filter(Boolean))));
    currentProject.audioSources.forEach((source) => {
      if (!usedSourceIds.has(source.id)) audioBuffersRef.current.delete(source.id);
    });
    nextProject = {
      ...nextProject,
      audioSources: nextProject.audioSources.filter((source) => usedSourceIds.has(source.id)),
      updatedAt: Date.now(),
    };
    projectRef.current = nextProject;
    setHistory((current) => recordAudioStudioHistory(current, nextProject));
    setActiveTrackId(nextProject.tracks[0]?.id || "");
    setSelectedTrackId("");
    setSelectedClipIds([]);
    setRangeSelection(null);
    setCurrentTimeMs(0);
    setNotice(`“${targetTrack.name}” 음원을 삭제했습니다.`);
  }, [clearScheduledPlayback]);

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

  const openImportPicker = useCallback((_purpose = "editor-new-track", targetTrackId = "") => {
    if (importing) return;
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
      const context = await ensurePlaybackContext();
      const { decoded, rejected } = await decodeAudioStudioFiles(files, {
        context,
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
  }, [activeTrackId, ensurePlaybackContext, importing]);

  const selectedClipIdSet = useMemo(() => new Set(selectedClipIds), [selectedClipIds]);
  const selectedClips = useMemo(() => project.tracks.flatMap((track) => track.clips)
    .filter((clip) => selectedClipIdSet.has(clip.id)), [project.tracks, selectedClipIdSet]);
  const activeTrack = useMemo(() => project.tracks.find((track) => track.id === activeTrackId) || project.tracks[0], [activeTrackId, project.tracks]);
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
      if (screen !== AUDIO_STUDIO_SCREENS.EDIT) return;
      const target = event.target;
      if (target?.matches?.("input, select, textarea, [contenteditable='true']")) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (playbackStatus === "playing") pausePlayback();
        else startPlayback();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pausePlayback, playbackStatus, screen, startPlayback]);

  return {
    activeTrackId,
    activeTrack,
    applyTrackTimeStretch,
    audioBuffersRef,
    canRedo: history.future.length > 0,
    canUndo: history.past.length > 0,
    beginClipDrag,
    beginClipResize,
    addMarker,
    commitProject,
    openEditor,
    createTrack,
    currentTimeMs,
    cutSelection,
    deleteSavedMix,
    deleteSelection,
    deleteRangeSelection,
    deleteActiveTrack,
    deleteTrack,
    deleteMarker,
    dragPreview,
    duplicateSelection,
    duplicateRangeSelection,
    downloadSavedMix,
    fitProject,
    fitProjectRequestId,
    fitSelection,
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
    libraryMixId,
    libraryPlaybackStatus,
    matchTrackBpm,
    mixSave,
    notice,
    openImportPicker,
    pausePlayback,
    pasteSelection,
    playbackStatus,
    playSavedMix,
    project,
    projectOperation,
    rangeSelection,
    recordingState,
    requestProjectFit,
    playSelection,
    renameSavedMix,
    reorderTrack,
    screen,
    selectedClipIds,
    selectedClips,
    selectedTrackId,
    savedMixes,
    selectedClipIdSet,
    setActiveTrackId,
    setSelectedClipIds,
    setSelectedTrackId,
    setTimelineZoom,
    setLoopPoint,
    selectClip,
    selectTimelineRange,
    selectTrack,
    selectScope,
    seekPlayback,
    setPlaybackPosition,
    seekClipBoundary,
    startPlayback,
    stopPlayback,
    splitSelection,
    splitRangeSelection,
    startRecording,
    stopRecording,
    trackStretchState,
    trimSelection,
    trimRangeSelection,
    ungroupSelection,
    undo,
    masterLevel,
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
