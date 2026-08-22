import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildWaveformPeaks,
  clampTrimRange,
  decodeLoopRecording,
  DEFAULT_MIN_TRIM_MS,
  processLoopRecording,
  trimLoopAudioData,
} from "../audio/audioPostProcessing";
import { acquireMicInput } from "../audio/micInputEngine";
import { getMicInputPreset, MIC_INPUT_PRESETS } from "../audio/micInputPresets";
import {
  AUDIO_BUS_IDS,
  connectMediaElementToBus,
  disconnectMediaElementFromBus,
  resumeSharedAudioContext,
} from "../audio/audioBus";
import { registerBackingLoopActivity } from "./activityRegistry.js";
import {
  isAudioStudioLibraryId,
  listAudioStudioBackingSources,
  loadAudioStudioBackingSource,
  subscribeAudioStudioBackingSources,
} from "./audioStudioLibrarySource.js";
import {
  deleteBackingLoopRecording,
  loadBackingLoopLibrary,
  loadBackingLoopRecording,
  saveBackingLoopRecording,
  subscribeBackingLoopLibrary,
} from "./backingLoopStorage";
import {
  addBackingPlaylistItems,
  BACKING_PLAYLIST_PLAYBACK_MODES,
  createDefaultBackingPlaylistState,
  deleteBackingPlaylistTab,
  getActiveBackingPlaylist,
  getBackingPlaylistById,
  getNextBackingPlaylistRepeatMode,
  getNextBackingPlaylistIndex,
  loadSavedBackingPlaylist,
  loadBackingPlaylistState,
  moveBackingPlaylistItem,
  reconcileBackingPlaylistState,
  removeBackingPlaylistItem,
  removeBackingPlaylistItems,
  saveCurrentBackingPlaylist,
  saveBackingPlaylistState,
  setBackingPlaylistPlaybackMode,
  setBackingPlaylistShuffleEnabled,
  shouldRestartBackingPlaylistTrack,
  subscribeBackingPlaylist,
} from "./backingPlaylist";
import {
  BACKING_AUDIO_FILE_ACCEPT,
  BACKING_AUDIO_SOURCE_TYPES,
  prepareImportedBackingAudioSources,
} from "./backingAudioSource";
import {
  BACKING_LOOP_DEFAULT_TITLE,
  createBackingLoopId,
  getBackingLoopStatus,
  getPreferredBackingLoopMimeType,
  normalizeBackingLoopTitle,
} from "./backingLoopUtils";
import {
  setBackingVolume,
  toggleBackingMute,
  useBackingVolume,
} from "./backingVolumeStore";

const BACKING_LOOP_CONSUMER_ID = "backing-loop-recorder";
const RECORDING_PRESET = getMicInputPreset(MIC_INPUT_PRESETS.GUITAR_RECORDING);
const EMPTY_INPUT_LEVEL = Object.freeze({
  clipping: false,
  normalized: 0,
  peak: 0,
  peakDb: -100,
  rms: 0,
  rmsDb: -100,
  state: "low",
});

export default function useBackingLoop(ownerMode = "") {
  const backingVolume = useBackingVolume();
  const [audioUrl, setAudioUrl] = useState("");
  const [appliedTrimRange, setAppliedTrimRange] = useState(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [deletePending, setDeletePending] = useState(false);
  const [dialog, setDialog] = useState("");
  // Keep the untrimmed session source in memory only. SAVE promotes the current
  // edited recording to the new source, so the older raw take is not persisted.
  const [editSourceAudioData, setEditSourceAudioData] = useState(null);
  const [editSourceRecording, setEditSourceRecording] = useState(null);
  const [library, setLibrary] = useState([]);
  const [libraryHydrated, setLibraryHydrated] = useState(false);
  const [libraryEditMode, setLibraryEditMode] = useState(false);
  const [libraryView, setLibraryView] = useState("playlist");
  const [playlistPanelView, setPlaylistPanelView] = useState("queue");
  const [playlistLibraryPickerOpen, setPlaylistLibraryPickerOpen] = useState(false);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState([]);
  const [notice, setNotice] = useState("");
  const [phase, setPhase] = useState("idle");
  const [recording, setRecording] = useState(null);
  const [recordingAudioData, setRecordingAudioData] = useState(null);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [inputLevel, setInputLevel] = useState(EMPTY_INPUT_LEVEL);
  const [importCandidates, setImportCandidates] = useState([]);
  const [importRejectedCount, setImportRejectedCount] = useState(0);
  const [playlistDeleteTargetId, setPlaylistDeleteTargetId] = useState("");
  const [playlistItemsDeleteTargetId, setPlaylistItemsDeleteTargetId] = useState("");
  const [playlistItemsDeleteTargetIds, setPlaylistItemsDeleteTargetIds] = useState([]);
  const [playlistLibraryTargetId, setPlaylistLibraryTargetId] = useState("");
  const [playlistRenameDraft, setPlaylistRenameDraft] = useState("");
  const [playlistSaveTargetId, setPlaylistSaveTargetId] = useState("");
  const [playlistState, setPlaylistState] = useState(createDefaultBackingPlaylistState);
  const [playlistPlaybackActive, setPlaylistPlaybackActive] = useState(false);
  const [selectedQueueItemIds, setSelectedQueueItemIds] = useState([]);
  const [selectedSavedItemIds, setSelectedSavedItemIds] = useState([]);
  const [selectedPlaylistItemId, setSelectedPlaylistItemId] = useState("");
  const [saveError, setSaveError] = useState("");
  const [selectedImportCandidateId, setSelectedImportCandidateId] = useState("");
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [trimDraft, setTrimDraft] = useState(null);
  const [trimEndMs, setTrimEndMs] = useState(0);
  const [trimPreviewPlaying, setTrimPreviewPlaying] = useState(false);
  const [trimPreviewPositionMs, setTrimPreviewPositionMs] = useState(0);
  const [trimPreviewUrl, setTrimPreviewUrl] = useState("");
  const [trimStartMs, setTrimStartMs] = useState(0);
  const audioRef = useRef(null);
  const audioGraphRef = useRef(null);
  const backingVolumeRef = useRef(backingVolume.volume);
  const armTimerRef = useRef(null);
  const chunksRef = useRef([]);
  const deletePendingRef = useRef(false);
  const discardRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const micSessionRef = useRef(null);
  const meterStopRef = useRef(null);
  const importInputRef = useRef(null);
  const importPlaylistTargetIdRef = useRef("");
  const libraryRef = useRef(library);
  const mountedRef = useRef(true);
  const modeActiveRef = useRef(true);
  const operationVersionRef = useRef(0);
  const phaseRef = useRef("idle");
  const playlistAutoplayRef = useRef(false);
  const playlistPlaybackRef = useRef({ itemId: "", playlistId: "" });
  const playlistStateRef = useRef(playlistState);
  const playbackRequestRef = useRef(false);
  const playbackTimerRef = useRef(null);
  const recordingRequestVersionRef = useRef(0);
  const recordingPausedAtRef = useRef(0);
  const recordingPausedTotalRef = useRef(0);
  const recordingStartedAtRef = useRef(0);
  const recordingStoppedElapsedRef = useRef(0);
  const recordingTimerRef = useRef(null);
  const trimPreviewAudioRef = useRef(null);
  const trimPreviewAudioGraphRef = useRef(null);
  const trimPreviewFadeTimerRef = useRef(null);
  const trimPreviewRequestRef = useRef(false);
  const trimPreviewTimerRef = useRef(null);
  const transportFadeTimerRef = useRef(null);

  backingVolumeRef.current = backingVolume.volume;

  const setPhaseImmediate = useCallback((nextPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const clearArmTimer = useCallback(() => {
    if (armTimerRef.current != null) {
      window.clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
  }, []);

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current != null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const getRecordingElapsedMs = useCallback((now = performance.now()) => {
    const activePauseMs = recordingPausedAtRef.current > 0
      ? Math.max(0, now - recordingPausedAtRef.current)
      : 0;
    return Math.max(
      0,
      now - recordingStartedAtRef.current - recordingPausedTotalRef.current - activePauseMs,
    );
  }, []);

  const startRecordingTimer = useCallback((mediaRecorder) => {
    clearRecordingTimer();
    recordingTimerRef.current = window.setInterval(() => {
      if (mediaRecorderRef.current !== mediaRecorder || mediaRecorder.state !== "recording") return;
      setCurrentTimeMs(getRecordingElapsedMs());
    }, 160);
  }, [clearRecordingTimer, getRecordingElapsedMs]);

  const clearPlaybackTimer = useCallback(() => {
    if (playbackTimerRef.current != null) {
      window.clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }, []);

  const clearTrimPreviewTimer = useCallback(() => {
    if (trimPreviewTimerRef.current != null) {
      window.clearInterval(trimPreviewTimerRef.current);
      trimPreviewTimerRef.current = null;
    }
  }, []);

  const clearTransportFadeTimer = useCallback(() => {
    if (transportFadeTimerRef.current != null) {
      window.clearTimeout(transportFadeTimerRef.current);
      transportFadeTimerRef.current = null;
    }
  }, []);

  const ensurePlaybackAudioGraph = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return null;
    try {
      await resumeSharedAudioContext();
      const graph = audioGraphRef.current || connectMediaElementToBus(audio, {
        busId: AUDIO_BUS_IDS.BACKING,
        level: backingVolumeRef.current,
      });
      audioGraphRef.current = graph;
      if (graph) {
        graph.connect?.();
        audio.volume = 1;
        graph.setLevel(backingVolumeRef.current, { immediate: true });
      } else {
        audio.volume = backingVolumeRef.current;
      }
      return graph;
    } catch {
      audio.volume = backingVolumeRef.current;
      return null;
    }
  }, []);

  const fadeThen = useCallback((callback, fadeSeconds = 0.012) => {
    clearTransportFadeTimer();
    const audio = audioRef.current;
    const graph = audioGraphRef.current;
    if (!audio || audio.paused || !graph) {
      callback();
      return;
    }
    graph.setTransportLevel(0, { timeConstant: Math.max(0.003, fadeSeconds / 3) });
    transportFadeTimerRef.current = window.setTimeout(() => {
      transportFadeTimerRef.current = null;
      callback();
    }, Math.max(4, Math.round(fadeSeconds * 1000)));
  }, [clearTransportFadeTimer]);

  useEffect(() => {
    const audio = audioRef.current;
    const graph = audioGraphRef.current;
    if (graph) graph.setLevel(backingVolume.volume, { timeConstant: 0.012 });
    else if (audio) audio.volume = backingVolume.volume;
    const previewAudio = trimPreviewAudioRef.current;
    const previewGraph = trimPreviewAudioGraphRef.current;
    if (previewGraph) previewGraph.setLevel(backingVolume.volume, { timeConstant: 0.012 });
    else if (previewAudio) previewAudio.volume = backingVolume.volume;
  }, [backingVolume.volume]);

  const stopTrimPreview = useCallback((resetPosition = true) => {
    const audio = trimPreviewAudioRef.current;
    if (trimPreviewFadeTimerRef.current != null) {
      window.clearTimeout(trimPreviewFadeTimerRef.current);
      trimPreviewFadeTimerRef.current = null;
    }
    const finishStop = () => {
      audio?.pause?.();
      trimPreviewAudioGraphRef.current?.setTransportLevel(1, { immediate: true });
      if (resetPosition) {
        if (audio) {
          try {
            audio.currentTime = trimStartMs / 1000;
          } catch {
            // Metadata may not be ready yet; the next preview starts from trimStart.
          }
        }
        setTrimPreviewPositionMs(trimStartMs);
      }
    };
    if (audio && !audio.paused && trimPreviewAudioGraphRef.current) {
      trimPreviewAudioGraphRef.current.setTransportLevel(0, { timeConstant: 0.003 });
      trimPreviewFadeTimerRef.current = window.setTimeout(() => {
        trimPreviewFadeTimerRef.current = null;
        finishStop();
      }, 9);
    } else {
      finishStop();
    }
    clearTrimPreviewTimer();
    setTrimPreviewPlaying(false);
  }, [clearTrimPreviewTimer, trimStartMs]);

  const releaseMicrophone = useCallback(() => {
    meterStopRef.current?.();
    meterStopRef.current = null;
    const session = micSessionRef.current;
    micSessionRef.current = null;
    session?.release?.();
    setInputLevel(EMPTY_INPUT_LEVEL);
  }, []);

  const resetAudioPosition = useCallback(() => {
    const audio = audioRef.current;
    fadeThen(() => {
      if (!audio) return;
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // The next loadedmetadata event will establish the initial position.
      }
      audioGraphRef.current?.setTransportLevel(1, { immediate: true });
    });
    clearPlaybackTimer();
    setCurrentTimeMs(0);
  }, [clearPlaybackTimer, fadeThen]);

  const pausePlayback = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const audio = audioRef.current;
    if (audio) {
      setCurrentTimeMs(Math.max(0, audio.currentTime * 1000));
      fadeThen(() => {
        audio.pause();
        audioGraphRef.current?.setTransportLevel(1, { immediate: true });
        setCurrentTimeMs(Math.max(0, audio.currentTime * 1000));
      });
    }
    clearPlaybackTimer();
    setNotice("일시정지 · PLAY로 이어서 재생");
    setPhaseImmediate("paused");
  }, [clearPlaybackTimer, fadeThen, setPhaseImmediate]);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const refreshLibrary = async (showStorageNotice = false) => {
      const [backingResult, studioResult] = await Promise.allSettled([
        loadBackingLoopLibrary(),
        listAudioStudioBackingSources(),
      ]);
      const savedRecordings = backingResult.status === "fulfilled" ? backingResult.value : [];
      const studioMixes = studioResult.status === "fulfilled" ? studioResult.value : [];
      if (backingResult.status === "rejected" && studioResult.status === "rejected") {
        throw new Error("AUDIO_LIBRARY_UNAVAILABLE");
      }
      return [...studioMixes, ...savedRecordings]
        .sort((left, right) => right.updatedAt - left.updatedAt);
    };
    const applyLibrary = (showStorageNotice = false) => refreshLibrary(showStorageNotice)
      .then((savedRecordings) => {
        if (cancelled) return;
        setLibrary(savedRecordings);
        setLibraryHydrated(true);
      })
      .catch(() => {
        if (!cancelled && showStorageNotice) {
          setNotice("저장 공간을 사용할 수 없지만 녹음과 재생은 가능합니다.");
        }
      });
    const unsubscribeBacking = subscribeBackingLoopLibrary(() => applyLibrary(false));
    const unsubscribeStudio = subscribeAudioStudioBackingSources(() => applyLibrary(false));
    applyLibrary(true);

    return () => {
      cancelled = true;
      mountedRef.current = false;
      unsubscribeBacking();
      unsubscribeStudio();
    };
  }, []);

  useEffect(() => {
    const refreshPlaylist = (nextPlaylist) => setPlaylistState(nextPlaylist || loadBackingPlaylistState());
    const unsubscribe = subscribeBackingPlaylist(refreshPlaylist);
    refreshPlaylist();
    return unsubscribe;
  }, []);

  useEffect(() => {
    playlistStateRef.current = playlistState;
  }, [playlistState]);

  useEffect(() => {
    libraryRef.current = library;
  }, [library]);

  useEffect(() => {
    if (!libraryHydrated) return;
    const reconciled = reconcileBackingPlaylistState(playlistState, library.map((item) => item.id));
    const currentIds = [playlistState.currentQueue, ...(playlistState.savedPlaylists || [])]
      .filter(Boolean)
      .flatMap((playlist) => playlist.itemIds);
    const reconciledIds = [reconciled.currentQueue, ...(reconciled.savedPlaylists || [])]
      .filter(Boolean)
      .flatMap((playlist) => playlist.itemIds);
    if (currentIds.length === reconciledIds.length
      && currentIds.every((id, index) => id === reconciledIds[index])) return;
    saveBackingPlaylistState(reconciled);
  }, [library, libraryHydrated, playlistState]);

  useEffect(() => {
    if (!recording?.blob) {
      setAudioUrl("");
      return undefined;
    }

    const nextAudioUrl = URL.createObjectURL(recording.blob);
    setAudioUrl(nextAudioUrl);
    return () => URL.revokeObjectURL(nextAudioUrl);
  }, [recording?.blob]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = !playlistPlaybackActive
      || playlistState.playbackMode === BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ONE;
  }, [playlistPlaybackActive, playlistState.playbackMode]);

  useEffect(() => {
    if (!trimDraft?.recording?.blob) {
      setTrimPreviewUrl("");
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(trimDraft.recording.blob);
    setTrimPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [trimDraft?.recording?.blob]);

  useEffect(() => {
    if (phase !== "playing") {
      clearPlaybackTimer();
      return undefined;
    }

    playbackTimerRef.current = window.setInterval(() => {
      const audio = audioRef.current;
      if (audio) setCurrentTimeMs(Math.max(0, audio.currentTime * 1000));
    }, 160);
    return clearPlaybackTimer;
  }, [clearPlaybackTimer, phase]);

  const deactivateBackingLoop = useCallback(() => {
    modeActiveRef.current = false;
    const phaseBeforeDeactivate = phaseRef.current;
    const playbackPositionMs = audioRef.current
      ? Math.max(0, audioRef.current.currentTime * 1000)
      : null;
    clearArmTimer();
    clearPlaybackTimer();
    clearRecordingTimer();
    clearTrimPreviewTimer();
    if (trimPreviewFadeTimerRef.current != null) {
      window.clearTimeout(trimPreviewFadeTimerRef.current);
      trimPreviewFadeTimerRef.current = null;
    }
    clearTransportFadeTimer();
    playbackRequestRef.current = false;
    trimPreviewRequestRef.current = false;
    recordingRequestVersionRef.current += 1;
    operationVersionRef.current += 1;
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
    }
    mediaRecorderRef.current = null;
    recordingPausedAtRef.current = 0;
    recordingPausedTotalRef.current = 0;
    recordingStoppedElapsedRef.current = 0;
    chunksRef.current = [];
    audioRef.current?.pause();
    trimPreviewAudioRef.current?.pause();
    audioGraphRef.current?.setTransportLevel(1, { immediate: true });
    trimPreviewAudioGraphRef.current?.setTransportLevel(1, { immediate: true });
    disconnectMediaElementFromBus(audioRef.current);
    disconnectMediaElementFromBus(trimPreviewAudioRef.current);
    setTrimPreviewPlaying(false);
    setRecordingPaused(false);
    releaseMicrophone();
    if (phaseBeforeDeactivate === "playing") {
      if (playbackPositionMs != null) setCurrentTimeMs(playbackPositionMs);
      setNotice("화면 이동으로 일시정지 · PLAY로 이어서 재생");
      setPhaseImmediate("paused");
    } else if (["armed", "recording", "requesting"].includes(phaseBeforeDeactivate)) {
      setNotice("화면 이동으로 녹음을 안전하게 정지했어요.");
      setPhaseImmediate("idle");
    }
  }, [clearArmTimer, clearPlaybackTimer, clearRecordingTimer, clearTransportFadeTimer, clearTrimPreviewTimer, releaseMicrophone, setPhaseImmediate]);

  useEffect(() => () => deactivateBackingLoop(), [deactivateBackingLoop]);

  useEffect(
    () => registerBackingLoopActivity(
      ownerMode,
      deactivateBackingLoop,
      () => {
        mountedRef.current = true;
        modeActiveRef.current = true;
      },
    ),
    [deactivateBackingLoop, ownerMode],
  );

  const stopRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;
    if (recordingPausedAtRef.current > 0) {
      recordingPausedTotalRef.current += Math.max(0, performance.now() - recordingPausedAtRef.current);
      recordingPausedAtRef.current = 0;
    }
    recordingStoppedElapsedRef.current = getRecordingElapsedMs();
    setCurrentTimeMs(recordingStoppedElapsedRef.current);
    setRecordingPaused(false);
    setNotice("녹음을 마무리하고 있어요.");
    setPhaseImmediate("processing");
    try {
      mediaRecorder.stop();
    } catch {
      setNotice("녹음을 종료하지 못했어요. 다시 시도해주세요.");
      setPhaseImmediate("error");
    }
  }, [getRecordingElapsedMs, setPhaseImmediate]);

  const startRecording = useCallback(async () => {
    if (["requesting", "armed", "recording", "processing", "trimming", "applying", "saving", "loading"].includes(phaseRef.current)) return;
    playlistAutoplayRef.current = false;
    playlistPlaybackRef.current = { itemId: "", playlistId: "" };
    setPlaylistPlaybackActive(false);
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder !== "function") {
      setNotice("이 브라우저에서는 마이크 녹음을 지원하지 않아요.");
      setPhaseImmediate("error");
      return;
    }

    resetAudioPosition();
    discardRecordingRef.current = false;
    setDialog("");
    setNotice("");
    setPhaseImmediate("requesting");
    const requestVersion = ++recordingRequestVersionRef.current;

    try {
      const micSession = await acquireMicInput({
        consumerId: BACKING_LOOP_CONSUMER_ID,
        preset: MIC_INPUT_PRESETS.GUITAR_RECORDING,
      });
      if (!mountedRef.current || requestVersion !== recordingRequestVersionRef.current) {
        micSession.release();
        return;
      }

      const mimeType = getPreferredBackingLoopMimeType(window.MediaRecorder);
      let mediaRecorder;
      try {
        mediaRecorder = new window.MediaRecorder(
          micSession.recordingStream,
          mimeType ? { audioBitsPerSecond: RECORDING_PRESET.mediaRecorderBitsPerSecond, mimeType } : undefined,
        );
      } catch {
        mediaRecorder = new window.MediaRecorder(micSession.recordingStream);
      }

      chunksRef.current = [];
      recordingPausedAtRef.current = 0;
      recordingPausedTotalRef.current = 0;
      recordingStoppedElapsedRef.current = 0;
      setRecordingPaused(false);
      micSessionRef.current = micSession;
      meterStopRef.current = micSession.startLevelMonitoring(setInputLevel);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorder.onerror = () => {
        clearRecordingTimer();
        recordingPausedAtRef.current = 0;
        recordingPausedTotalRef.current = 0;
        recordingStoppedElapsedRef.current = 0;
        setRecordingPaused(false);
        releaseMicrophone();
        if (!mountedRef.current || requestVersion !== recordingRequestVersionRef.current) return;
        setNotice("녹음 중 문제가 발생했어요. 이전 백킹은 그대로 유지됩니다.");
        setPhaseImmediate("error");
      };
      mediaRecorder.onstop = async () => {
        clearRecordingTimer();
        clearArmTimer();
        releaseMicrophone();
        if (!mountedRef.current) return;

        const durationMs = recordingStoppedElapsedRef.current || getRecordingElapsedMs();
        const blobType = mediaRecorder.mimeType || mimeType || chunksRef.current[0]?.type || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        mediaRecorderRef.current = null;
        recordingPausedAtRef.current = 0;
        recordingPausedTotalRef.current = 0;
        recordingStoppedElapsedRef.current = 0;
        setRecordingPaused(false);
        chunksRef.current = [];

        if (requestVersion !== recordingRequestVersionRef.current) {
          discardRecordingRef.current = false;
          return;
        }

        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          setRecording(null);
          setRecordingAudioData(null);
          setEditSourceRecording(null);
          setEditSourceAudioData(null);
          setAppliedTrimRange(null);
          setCurrentTimeMs(0);
          setNotice("현재 작업을 취소했어요. 저장된 백킹은 그대로 유지됩니다.");
          setPhaseImmediate("idle");
          return;
        }

        if (blob.size === 0) {
          setNotice("녹음된 소리가 없어요. 이전 백킹은 그대로 유지됩니다.");
          setPhaseImmediate("error");
          return;
        }

        setPhaseImmediate("processing");
        setNotice("기타 톤과 루프 경계를 정돈하고 있어요.");
        const processed = await processLoopRecording(blob, durationMs);
        if (!mountedRef.current || requestVersion !== recordingRequestVersionRef.current) return;
        const nextRecording = {
          blob: processed.blob,
          createdAt: Date.now(),
          durationMs: processed.durationMs || durationMs,
          fileName: "",
          id: "",
          mimeType: processed.mimeType || blobType,
          sourceModifiedAt: 0,
          sourceType: BACKING_AUDIO_SOURCE_TYPES.RECORDING,
          title: BACKING_LOOP_DEFAULT_TITLE,
        };
        setEditSourceRecording(nextRecording);
        setAppliedTrimRange({
          endMs: nextRecording.durationMs,
          startMs: 0,
        });
        if (!processed.audioData?.channels?.length) {
          setRecording(nextRecording);
          setRecordingAudioData(null);
          setEditSourceAudioData(null);
          setCurrentTimeMs(0);
          setNotice("녹음 완료 · 이 브라우저에서는 원본 구간으로 바로 사용합니다.");
          setPhaseImmediate("idle");
          return;
        }
        setEditSourceAudioData(processed.audioData);
        setTrimDraft({
          audioData: processed.audioData,
          fallbackAudioData: processed.audioData,
          fallbackRecording: nextRecording,
          initialRecording: true,
          recording: nextRecording,
          waveform: buildWaveformPeaks(processed.audioData, 96),
        });
        setTrimStartMs(0);
        setTrimEndMs(nextRecording.durationMs);
        setTrimPreviewPositionMs(0);
        setTrimPreviewPlaying(false);
        setCurrentTimeMs(0);
        setNotice("앞뒤 준비 구간을 다듬거나 원본 그대로 사용할 수 있어요.");
        setDialog("trim");
        setPhaseImmediate("trimming");
      };

      setCurrentTimeMs(0);
      setPhaseImmediate("armed");
      setNotice("입력 준비 · 손을 뗀 뒤 녹음이 시작됩니다.");
      armTimerRef.current = window.setTimeout(() => {
        armTimerRef.current = null;
        if (!mountedRef.current || mediaRecorderRef.current !== mediaRecorder) return;
        recordingStartedAtRef.current = performance.now();
        recordingPausedAtRef.current = 0;
        recordingPausedTotalRef.current = 0;
        recordingStoppedElapsedRef.current = 0;
        setRecordingPaused(false);
        setCurrentTimeMs(0);
        setPhaseImmediate("recording");
        setNotice("기타 코드 진행 녹음 중");
        mediaRecorder.start(250);
        startRecordingTimer(mediaRecorder);
      }, RECORDING_PRESET.armDelayMs);
    } catch (error) {
      releaseMicrophone();
      if (!mountedRef.current || requestVersion !== recordingRequestVersionRef.current) return;
      const denied = error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError";
      setNotice(denied
        ? "마이크 권한을 허용한 뒤 다시 눌러주세요. 이전 백킹은 유지됩니다."
        : "사용 가능한 마이크를 확인해주세요. 이전 백킹은 유지됩니다.");
      setPhaseImmediate("error");
    }
  }, [clearArmTimer, clearRecordingTimer, getRecordingElapsedMs, releaseMicrophone, resetAudioPosition, setPhaseImmediate, startRecordingTimer]);

  const toggleRecording = useCallback(() => {
    const currentPhase = phaseRef.current;
    if (currentPhase === "recording") {
      stopRecording();
      return;
    }
    if (currentPhase === "armed") {
      recordingRequestVersionRef.current += 1;
      clearArmTimer();
      mediaRecorderRef.current = null;
      recordingPausedAtRef.current = 0;
      recordingPausedTotalRef.current = 0;
      recordingStoppedElapsedRef.current = 0;
      setRecordingPaused(false);
      releaseMicrophone();
      setNotice("녹음 준비를 취소했어요. 이전 백킹은 그대로 유지됩니다.");
      setPhaseImmediate("idle");
      return;
    }
    if (recording?.blob) {
      setDialog("clear-recording");
      return;
    }
    startRecording();
  }, [clearArmTimer, recording?.blob, releaseMicrophone, setPhaseImmediate, startRecording, stopRecording]);

  const confirmClearRecording = useCallback(() => {
    if (!recording?.blob || ["requesting", "armed", "recording", "processing", "trimming", "applying", "saving", "loading", "playing"].includes(phaseRef.current)) return;
    resetAudioPosition();
    recordingPausedAtRef.current = 0;
    recordingPausedTotalRef.current = 0;
    recordingStoppedElapsedRef.current = 0;
    setRecordingPaused(false);
    playlistPlaybackRef.current = { itemId: "", playlistId: "" };
    setPlaylistPlaybackActive(false);
    setRecording(null);
    setRecordingAudioData(null);
    setEditSourceRecording(null);
    setEditSourceAudioData(null);
    setAppliedTrimRange(null);
    setTrimDraft(null);
    setCurrentTimeMs(0);
    setDialog("");
    setNotice("현재 백킹을 비웠어요. REC를 누르면 새 녹음이 시작됩니다.");
    setPhaseImmediate("idle");
  }, [recording?.blob, resetAudioPosition, setPhaseImmediate]);

  const cancelCurrent = useCallback(() => {
    if (["saving", "loading", "applying"].includes(phaseRef.current)) return;

    recordingRequestVersionRef.current += 1;
    operationVersionRef.current += 1;
    clearArmTimer();
    setDialog("");
    setSaveError("");
    stopTrimPreview();
    setTrimDraft(null);
    resetAudioPosition();
    recordingPausedAtRef.current = 0;
    recordingPausedTotalRef.current = 0;
    recordingStoppedElapsedRef.current = 0;
    setRecordingPaused(false);
    playlistPlaybackRef.current = { itemId: "", playlistId: "" };
    setPlaylistPlaybackActive(false);
    clearRecordingTimer();

    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      discardRecordingRef.current = true;
      mediaRecorder.stop();
    } else {
      discardRecordingRef.current = false;
      releaseMicrophone();
    }

    setRecording(null);
    setRecordingAudioData(null);
    setEditSourceRecording(null);
    setEditSourceAudioData(null);
    setAppliedTrimRange(null);
    setCurrentTimeMs(0);
    setNotice("현재 작업을 취소했어요. 저장된 백킹은 그대로 유지됩니다.");
    setPhaseImmediate("idle");
  }, [clearArmTimer, clearRecordingTimer, releaseMicrophone, resetAudioPosition, setPhaseImmediate, stopTrimPreview]);

  const playRecording = useCallback(async () => {
    if (!modeActiveRef.current || !recording?.blob || !audioRef.current || !audioUrl) return;
    if (playbackRequestRef.current) return;
    if (["armed", "recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(phaseRef.current)) return;

    playbackRequestRef.current = true;
    try {
      const audio = audioRef.current;
      clearTransportFadeTimer();
      const graph = await ensurePlaybackAudioGraph();
      if (!mountedRef.current || !modeActiveRef.current) return;
      const playlistMode = playlistStateRef.current.playbackMode;
      audio.loop = !playlistPlaybackRef.current.playlistId
        || playlistMode === BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ONE;
      audio.defaultPlaybackRate = 1;
      audio.playbackRate = 1;
      if (!Number.isFinite(audio.currentTime) || audio.currentTime >= (audio.duration || Infinity)) {
        audio.currentTime = 0;
      }
      graph?.setTransportLevel(0, { immediate: true });
      await audio.play();
      if (!mountedRef.current || !modeActiveRef.current) {
        audio.pause();
        graph?.setTransportLevel(1, { immediate: true });
        graph?.disconnect?.();
        return;
      }
      graph?.setTransportLevel(1, { timeConstant: 0.006 });
      setNotice(playlistPlaybackRef.current.playlistId ? "PLAYLIST 재생 중" : "무한 반복 재생 중");
      setPhaseImmediate("playing");
    } catch {
      if (!mountedRef.current || !modeActiveRef.current) return;
      setNotice("백킹을 재생할 수 없어요. 다시 녹음하거나 다른 백킹을 LOAD해주세요.");
      setPhaseImmediate("error");
    } finally {
      playbackRequestRef.current = false;
    }
  }, [audioUrl, clearTransportFadeTimer, ensurePlaybackAudioGraph, recording?.blob, setPhaseImmediate]);

  const togglePlayback = useCallback(() => {
    if (phaseRef.current === "playing") {
      pausePlayback();
      return;
    }
    playRecording();
  }, [pausePlayback, playRecording]);

  const resetPlayback = useCallback(() => {
    if (!recording?.blob || ["armed", "recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(phaseRef.current)) return;
    resetAudioPosition();
    setNotice("재생 위치를 처음으로 되돌렸어요.");
    setPhaseImmediate("idle");
  }, [recording?.blob, resetAudioPosition, setPhaseImmediate]);

  const openSaveDialog = useCallback(() => {
    if (!recording?.blob || ["armed", "recording", "requesting", "processing", "trimming", "applying", "saving", "loading", "playing"].includes(phaseRef.current)) return;
    setSaveError("");
    setTitleDraft(recording.title === BACKING_LOOP_DEFAULT_TITLE ? "" : recording.title);
    setDialog("save");
  }, [recording]);

  const openLoadDialog = useCallback(() => {
    if (["armed", "recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(phaseRef.current)) return;
    setSelectedLibraryId("");
    setSelectedLibraryIds([]);
    setSelectedQueueItemIds([]);
    setSelectedSavedItemIds([]);
    setSelectedPlaylistItemId("");
    setLibraryEditMode(false);
    setLibraryView("playlist");
    setPlaylistPanelView("queue");
    setPlaylistLibraryPickerOpen(false);
    setPlaylistLibraryTargetId("");
    setSelectedSavedItemIds([]);
    setPlaylistLibraryTargetId("");
    setDialog("load");
  }, []);

  const openImportFilePicker = useCallback((playlistId = "") => {
    if (["armed", "recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(phaseRef.current)) return;
    const input = importInputRef.current;
    if (!input) return;
    const targetPlaylist = getBackingPlaylistById(playlistStateRef.current, playlistId);
    importPlaylistTargetIdRef.current = targetPlaylist?.id || playlistStateRef.current.currentQueue.id;
    input.value = "";
    input.click();
  }, []);

  const openImportPicker = openImportFilePicker;

  const activateImportedRecording = useCallback((importedRecording, nextNotice = "") => {
    if (!importedRecording?.blob) return;
    playlistAutoplayRef.current = false;
    playlistPlaybackRef.current = { itemId: "", playlistId: "" };
    setPlaylistPlaybackActive(false);
    resetAudioPosition();
    setRecording(importedRecording);
    setRecordingAudioData(null);
    setEditSourceRecording(importedRecording);
    setEditSourceAudioData(null);
    setAppliedTrimRange({ endMs: importedRecording.durationMs, startMs: 0 });
    setTrimDraft(null);
    setSelectedLibraryId("");
    setSelectedLibraryIds([]);
    setSelectedImportCandidateId("");
    setLibraryEditMode(false);
    setImportCandidates([]);
    setImportRejectedCount(0);
    setCurrentTimeMs(0);
    setDialog("");
    setNotice(nextNotice || `“${importedRecording.fileName}” 공용 라이브러리 등록 완료`);
    setPhaseImmediate("idle");
  }, [resetAudioPosition, setPhaseImmediate]);

  const importBackingAudio = useCallback(async (event) => {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    input.value = "";
    if (!files.length) return;
    if (["armed", "recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(phaseRef.current)) return;
    const importTarget = getBackingPlaylistById(
      playlistStateRef.current,
      importPlaylistTargetIdRef.current,
    ) || getActiveBackingPlaylist(playlistStateRef.current);
    const importTargetId = importTarget.id;
    const operationVersion = ++operationVersionRef.current;
    resetAudioPosition();
    setDialog("load");
    setLibraryView("playlist");
    setPlaylistPanelView(importTargetId === playlistStateRef.current.currentQueue.id ? "queue" : importTargetId);
    setSaveError("");
    setImportCandidates([]);
    setImportRejectedCount(0);
    setSelectedImportCandidateId("");
    setNotice(`${files.length}개 파일을 확인하고 있어요.`);
    setPhaseImmediate("loading");

    try {
      const { imported, rejected } = await prepareImportedBackingAudioSources(files, {
        onProgress: ({ completed, total }) => {
          if (mountedRef.current && operationVersion === operationVersionRef.current) {
            setNotice(`${completed}/${total} 백킹 파일 확인 중...`);
          }
        },
      });
      if (!mountedRef.current || operationVersion !== operationVersionRef.current) return;
      if (!imported.length) {
        setNotice("가져올 수 있는 오디오가 없습니다. MP3, WAV, M4A, AAC 파일을 확인해주세요.");
        setPhaseImmediate("error");
        return;
      }
      const importedRecordings = imported.map((candidate) => ({
        ...candidate,
        id: createBackingLoopId(),
      }));
      const persistedRecordings = await Promise.all(importedRecordings.map(async (candidate) => {
        try {
          return await saveBackingLoopRecording(candidate);
        } catch {
          return candidate;
        }
      }));
      if (!mountedRef.current || operationVersion !== operationVersionRef.current) return;
      const persistedIds = new Set(persistedRecordings
        .filter((candidate) => candidate.updatedAt)
        .map((candidate) => candidate.id));
      const storageFailureCount = persistedRecordings.length - persistedIds.size;
      setLibrary((currentLibrary) => [
        ...persistedRecordings,
        ...currentLibrary.filter((item) => !persistedRecordings.some((added) => added.id === item.id)),
      ]);
      const importedIds = persistedRecordings.map((candidate) => candidate.id);
      const nextPlaylistState = saveBackingPlaylistState(addBackingPlaylistItems(
        playlistStateRef.current,
        importTargetId,
        importedIds,
      ));
      playlistStateRef.current = nextPlaylistState;
      setPlaylistState(nextPlaylistState);
      if (importTargetId === nextPlaylistState.currentQueue.id) {
        setSelectedPlaylistItemId((selectedId) => selectedId || importedIds[0] || "");
        setSelectedQueueItemIds(importedIds);
      } else {
        setSelectedSavedItemIds(importedIds);
      }
      setSelectedLibraryIds([]);
      setPlaylistLibraryPickerOpen(false);
      setImportRejectedCount(rejected.length);
      const targetTitle = getBackingPlaylistById(nextPlaylistState, importTargetId)?.title || "현재 재생목록";
      setNotice(storageFailureCount
        ? `${persistedRecordings.length}개를 “${targetTitle}”에 추가했지만 ${storageFailureCount}개는 영구 보관하지 못했어요.`
        : rejected.length
          ? `${persistedRecordings.length}개를 “${targetTitle}”에 추가했어요 · ${rejected.length}개 파일 제외`
          : `${persistedRecordings.length}개 파일을 “${targetTitle}”에 추가했어요.`);
      setDialog("load");
      setPhaseImmediate("idle");
    } catch {
      if (!mountedRef.current || operationVersion !== operationVersionRef.current) return;
      setNotice("이 브라우저에서 디코딩할 수 있는 오디오 파일인지 확인해주세요.");
      setPhaseImmediate("error");
    } finally {
      importPlaylistTargetIdRef.current = "";
    }
  }, [resetAudioPosition, setPhaseImmediate]);

  const useSelectedImportCandidate = useCallback(() => {
    const selected = importCandidates.find((candidate) => candidate.id === selectedImportCandidateId);
    if (!selected) return;
    activateImportedRecording(
      selected.recording,
      importRejectedCount
        ? `“${selected.recording.fileName}” 선택 완료 · ${importRejectedCount}개 파일은 제외했습니다.`
        : "",
    );
  }, [activateImportedRecording, importCandidates, importRejectedCount, selectedImportCandidateId]);

  const openDeleteDialog = useCallback(() => {
    const targetIds = libraryEditMode ? selectedLibraryIds : [selectedLibraryId].filter(Boolean);
    const currentPhase = phaseRef.current;
    if (!targetIds.length || ["armed", "recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(currentPhase)) return;
    if (currentPhase === "playing" && targetIds.includes(recording?.id)) pausePlayback();
    setDialog("delete");
  }, [libraryEditMode, pausePlayback, recording?.id, selectedLibraryId, selectedLibraryIds]);

  const openTrimEditor = useCallback(async () => {
    if (!recording?.blob || ["armed", "recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(phaseRef.current)) return;
    const operationVersion = ++operationVersionRef.current;
    resetAudioPosition();
    setPhaseImmediate("processing");
    setNotice("편집할 파형을 준비하고 있어요.");
    try {
      const sourceRecording = editSourceRecording?.blob ? editSourceRecording : recording;
      const audioData = editSourceAudioData
        || (!editSourceRecording?.blob ? recordingAudioData : null)
        || await decodeLoopRecording(sourceRecording.blob);
      if (!mountedRef.current || operationVersion !== operationVersionRef.current) return;
      const editDurationMs = audioData.durationMs || sourceRecording.durationMs;
      const editRecording = { ...sourceRecording, durationMs: editDurationMs };
      const previousSourceDurationMs = Math.max(0, Number(sourceRecording.durationMs) || 0);
      const previousRangeUsesFullSource = !appliedTrimRange
        || (appliedTrimRange.startMs <= 1 && appliedTrimRange.endMs >= previousSourceDurationMs - 1);
      const nextRange = previousRangeUsesFullSource
        ? { endMs: editDurationMs, startMs: 0 }
        : clampTrimRange(
          appliedTrimRange.startMs,
          appliedTrimRange.endMs,
          editDurationMs,
          DEFAULT_MIN_TRIM_MS,
        );
      setEditSourceRecording(editRecording);
      setEditSourceAudioData(audioData);
      if (!editSourceRecording?.blob) setAppliedTrimRange(nextRange);
      setTrimDraft({
        audioData,
        fallbackAudioData: recordingAudioData,
        fallbackRecording: recording,
        initialRecording: false,
        recording: editRecording,
        waveform: buildWaveformPeaks(audioData, 96),
      });
      setTrimStartMs(nextRange.startMs);
      setTrimEndMs(nextRange.endMs);
      setTrimPreviewPositionMs(nextRange.startMs);
      setTrimPreviewPlaying(false);
      setDialog("trim");
      setNotice("원본 전체 범위에서 구간을 다시 다듬을 수 있어요.");
      setPhaseImmediate("trimming");
    } catch {
      if (!mountedRef.current || operationVersion !== operationVersionRef.current) return;
      setNotice("현재 백킹의 편집 파형을 불러올 수 없어요.");
      setPhaseImmediate("error");
    }
  }, [
    appliedTrimRange,
    editSourceAudioData,
    editSourceRecording,
    recording,
    recordingAudioData,
    resetAudioPosition,
    setPhaseImmediate,
  ]);

  const resetTrimSelection = useCallback(() => {
    if (!trimDraft?.recording) return;
    stopTrimPreview(false);
    setTrimStartMs(0);
    setTrimEndMs(trimDraft.recording.durationMs);
    setTrimPreviewPositionMs(0);
  }, [stopTrimPreview, trimDraft]);

  const updateTrimStart = useCallback((value) => {
    if (!trimDraft?.recording || phaseRef.current === "applying") return;
    stopTrimPreview(false);
    const duration = Math.max(0, trimDraft.recording.durationMs);
    const minimum = Math.min(duration, DEFAULT_MIN_TRIM_MS);
    const nextStart = Math.max(0, Math.min(Number(value) || 0, trimEndMs - minimum));
    setTrimStartMs(nextStart);
    setTrimPreviewPositionMs(nextStart);
  }, [stopTrimPreview, trimDraft, trimEndMs]);

  const updateTrimEnd = useCallback((value) => {
    if (!trimDraft?.recording || phaseRef.current === "applying") return;
    stopTrimPreview(false);
    const duration = Math.max(0, trimDraft.recording.durationMs);
    const minimum = Math.min(duration, DEFAULT_MIN_TRIM_MS);
    const nextEnd = Math.min(duration, Math.max(Number(value) || duration, trimStartMs + minimum));
    setTrimEndMs(nextEnd);
    setTrimPreviewPositionMs(trimStartMs);
  }, [stopTrimPreview, trimDraft, trimStartMs]);

  const useOriginalTrimRecording = useCallback(() => {
    if (!trimDraft?.recording || phaseRef.current === "applying") return;
    stopTrimPreview();
    setRecording(trimDraft.fallbackRecording || trimDraft.recording);
    setRecordingAudioData(trimDraft.fallbackAudioData || trimDraft.audioData);
    setCurrentTimeMs(0);
    setTrimDraft(null);
    setDialog("");
    setNotice(trimDraft.initialRecording
      ? "원본 녹음을 그대로 사용합니다. EDIT에서 언제든 다시 다듬을 수 있어요."
      : "이번 구간 조정을 취소하고 이전 백킹 상태를 유지합니다.");
    setPhaseImmediate("idle");
  }, [setPhaseImmediate, stopTrimPreview, trimDraft]);

  const applyTrim = useCallback(async () => {
    if (!trimDraft?.recording || !trimDraft.audioData || phaseRef.current === "applying") return;
    stopTrimPreview(false);
    setPhaseImmediate("applying");
    setNotice("선택한 구간을 루프로 정돈하고 있어요.");
    try {
      const fullDuration = trimDraft.recording.durationMs;
      const keepsFullRecording = trimStartMs <= 1 && trimEndMs >= fullDuration - 1;
      const trimmed = keepsFullRecording
        ? null
        : trimLoopAudioData(trimDraft.audioData, trimStartMs, trimEndMs, {
          minimumTrimMs: DEFAULT_MIN_TRIM_MS,
        });
      if (!mountedRef.current) return;
      setAppliedTrimRange({
        endMs: keepsFullRecording ? fullDuration : trimEndMs,
        startMs: keepsFullRecording ? 0 : trimStartMs,
      });
      setRecording(trimmed ? {
        ...trimDraft.recording,
        blob: trimmed.blob,
        durationMs: trimmed.durationMs,
        mimeType: trimmed.mimeType,
      } : trimDraft.recording);
      setRecordingAudioData(trimmed?.audioData || trimDraft.audioData);
      setCurrentTimeMs(0);
      setTrimDraft(null);
      setDialog("");
      setNotice(trimmed
        ? "선택 구간 적용 완료 · 바로 PLAY하거나 SAVE하세요."
        : "원본 전체 구간 적용 완료 · 바로 PLAY하거나 SAVE하세요.");
      setPhaseImmediate("idle");
    } catch {
      if (!mountedRef.current) return;
      setNotice("선택 구간을 적용하지 못했어요. 원본은 그대로 유지됩니다.");
      setPhaseImmediate("trimming");
    }
  }, [setPhaseImmediate, stopTrimPreview, trimDraft, trimEndMs, trimStartMs]);

  const toggleTrimPreview = useCallback(async () => {
    if (!modeActiveRef.current || !trimDraft?.recording || !trimPreviewAudioRef.current || phaseRef.current === "applying") return;
    if (trimPreviewPlaying) {
      stopTrimPreview();
      return;
    }
    if (trimPreviewRequestRef.current) return;

    const audio = trimPreviewAudioRef.current;
    clearTrimPreviewTimer();
    trimPreviewRequestRef.current = true;
    try {
      await resumeSharedAudioContext();
      const graph = trimPreviewAudioGraphRef.current || connectMediaElementToBus(audio, {
        busId: AUDIO_BUS_IDS.BACKING,
        level: backingVolumeRef.current,
      });
      trimPreviewAudioGraphRef.current = graph;
      if (graph) {
        graph.connect?.();
        audio.volume = 1;
        graph.setLevel(backingVolumeRef.current, { immediate: true });
        graph.setTransportLevel(0, { immediate: true });
      } else {
        audio.volume = backingVolumeRef.current;
      }
      audio.loop = false;
      audio.defaultPlaybackRate = 1;
      audio.playbackRate = 1;
      audio.currentTime = trimStartMs / 1000;
      if (!mountedRef.current || !modeActiveRef.current) return;
      await audio.play();
      if (!mountedRef.current || !modeActiveRef.current) {
        audio.pause();
        graph?.setTransportLevel(1, { immediate: true });
        graph?.disconnect?.();
        return;
      }
      graph?.setTransportLevel(1, { timeConstant: 0.006 });
      setTrimPreviewPositionMs(trimStartMs);
      setTrimPreviewPlaying(true);
      trimPreviewTimerRef.current = window.setInterval(() => {
        const positionMs = Math.max(trimStartMs, audio.currentTime * 1000);
        if (positionMs >= trimEndMs - 8 || audio.ended) {
          stopTrimPreview();
          return;
        }
        setTrimPreviewPositionMs(positionMs);
      }, 40);
    } catch {
      clearTrimPreviewTimer();
      setTrimPreviewPlaying(false);
      if (!mountedRef.current || !modeActiveRef.current) return;
      setNotice("선택 구간을 미리 재생할 수 없어요.");
    } finally {
      trimPreviewRequestRef.current = false;
    }
  }, [clearTrimPreviewTimer, stopTrimPreview, trimDraft, trimEndMs, trimPreviewPlaying, trimStartMs]);

  const requestSaveConfirmation = useCallback(() => {
    if (!recording?.blob || phaseRef.current === "saving") return;
    const title = normalizeBackingLoopTitle(titleDraft);
    if (!title) {
      setSaveError("제목을 입력해주세요.");
      return;
    }
    setSaveError("");
    setDialog("save-confirm");
  }, [recording?.blob, titleDraft]);

  const toggleLibraryEditMode = useCallback(() => {
    setLibraryEditMode((editing) => !editing);
    setSelectedLibraryId("");
    setSelectedLibraryIds([]);
  }, []);

  const toggleLibraryRecordingSelection = useCallback((id) => {
    setSelectedLibraryIds((ids) => (
      ids.includes(id) ? ids.filter((selectedId) => selectedId !== id) : [...ids, id]
    ));
  }, []);

  const selectAllLibraryRecordings = useCallback(() => {
    setSelectedLibraryIds(library.map((item) => item.id));
  }, [library]);

  const clearLibraryRecordingSelection = useCallback(() => {
    setSelectedLibraryId("");
    setSelectedLibraryIds([]);
  }, []);

  const commitPlaylistState = useCallback((updater) => {
    const nextState = saveBackingPlaylistState(updater(playlistStateRef.current));
    playlistStateRef.current = nextState;
    setPlaylistState(nextState);
    return nextState;
  }, []);

  const showPlaylistView = useCallback(() => {
    const activePlaylist = getActiveBackingPlaylist(playlistStateRef.current);
    setLibraryView("playlist");
    setPlaylistPanelView("queue");
    setPlaylistLibraryPickerOpen(false);
    setLibraryEditMode(false);
    setSelectedLibraryId("");
    setSelectedLibraryIds([]);
    setSelectedPlaylistItemId((selectedId) => (
      activePlaylist.itemIds.includes(selectedId) ? selectedId : activePlaylist.itemIds[0] || ""
    ));
  }, []);

  const showCurrentPlaylist = useCallback(() => {
    setPlaylistPanelView("queue");
    setPlaylistLibraryPickerOpen(false);
    setPlaylistLibraryTargetId("");
    setSelectedSavedItemIds([]);
  }, []);

  const showSavedPlaylist = useCallback((playlistId) => {
    const savedPlaylist = playlistStateRef.current.savedPlaylists.find((playlist) => playlist.id === playlistId);
    if (!savedPlaylist) return;
    setPlaylistPanelView(savedPlaylist.id);
    setPlaylistLibraryPickerOpen(false);
    setPlaylistLibraryTargetId("");
    setSelectedSavedItemIds([]);
  }, []);

  const toggleQueueItemSelection = useCallback((itemId) => {
    const normalizedId = String(itemId || "");
    if (!playlistStateRef.current.currentQueue.itemIds.includes(normalizedId)) return;
    setSelectedQueueItemIds((selectedIds) => (
      selectedIds.includes(normalizedId)
        ? selectedIds.filter((id) => id !== normalizedId)
        : [...selectedIds, normalizedId]
    ));
  }, []);

  const selectAllQueueItems = useCallback(() => {
    setSelectedQueueItemIds([...playlistStateRef.current.currentQueue.itemIds]);
  }, []);

  const clearQueueItemSelection = useCallback(() => setSelectedQueueItemIds([]), []);

  const getViewedSavedPlaylist = useCallback(() => getBackingPlaylistById(
    playlistStateRef.current,
    playlistPanelView,
  ), [playlistPanelView]);

  const toggleSavedPlaylistItemSelection = useCallback((itemId) => {
    const playlist = getViewedSavedPlaylist();
    const normalizedId = String(itemId || "");
    if (!playlist || playlist.id === playlistStateRef.current.currentQueue.id || !playlist.itemIds.includes(normalizedId)) return;
    setSelectedSavedItemIds((selectedIds) => (
      selectedIds.includes(normalizedId)
        ? selectedIds.filter((id) => id !== normalizedId)
        : [...selectedIds, normalizedId]
    ));
  }, [getViewedSavedPlaylist]);

  const selectAllSavedPlaylistItems = useCallback(() => {
    const playlist = getViewedSavedPlaylist();
    setSelectedSavedItemIds(playlist?.id === playlistStateRef.current.currentQueue.id ? [] : [...(playlist?.itemIds || [])]);
  }, [getViewedSavedPlaylist]);

  const clearSavedPlaylistItemSelection = useCallback(() => setSelectedSavedItemIds([]), []);

  const requestDeleteSavedPlaylistItems = useCallback((playlistId) => {
    const playlist = getBackingPlaylistById(playlistStateRef.current, playlistId);
    if (!playlist || playlist.id === playlistStateRef.current.currentQueue.id) return;
    const itemIds = playlist.itemIds.filter((itemId) => selectedSavedItemIds.includes(itemId));
    if (!itemIds.length) {
      setNotice("목록에서 제거할 곡을 선택해주세요.");
      return;
    }
    setPlaylistItemsDeleteTargetId(playlist.id);
    setPlaylistItemsDeleteTargetIds(itemIds);
    setDialog("playlist-items-delete");
  }, [selectedSavedItemIds]);

  const confirmDeleteSavedPlaylistItems = useCallback(() => {
    const playlist = getBackingPlaylistById(playlistStateRef.current, playlistItemsDeleteTargetId);
    const itemIds = playlist?.itemIds.filter((itemId) => playlistItemsDeleteTargetIds.includes(itemId)) || [];
    if (!playlist || playlist.id === playlistStateRef.current.currentQueue.id || !itemIds.length) return;
    if (playlistPlaybackRef.current.playlistId === playlist.id
      && itemIds.includes(playlistPlaybackRef.current.itemId)) {
      resetAudioPosition();
      playlistPlaybackRef.current = { itemId: "", playlistId: "" };
      setPlaylistPlaybackActive(false);
      setPhaseImmediate("idle");
    }
    commitPlaylistState((state) => removeBackingPlaylistItems(state, playlist.id, itemIds));
    setSelectedSavedItemIds([]);
    setPlaylistItemsDeleteTargetId("");
    setPlaylistItemsDeleteTargetIds([]);
    setPlaylistPanelView(playlist.id);
    setDialog("load");
    setNotice(`“${playlist.title}”에서 선택한 ${itemIds.length}곡을 제거했어요. 음원 파일은 유지됩니다.`);
  }, [commitPlaylistState, playlistItemsDeleteTargetId, playlistItemsDeleteTargetIds, resetAudioPosition, setPhaseImmediate]);

  const togglePlaylistLibraryPicker = useCallback((playlistId = "") => {
    const targetPlaylist = getBackingPlaylistById(playlistStateRef.current, playlistId)
      || getActiveBackingPlaylist(playlistStateRef.current);
    setPlaylistLibraryPickerOpen((open) => (
      playlistLibraryTargetId === targetPlaylist.id ? !open : true
    ));
    setPlaylistLibraryTargetId(targetPlaylist.id);
    setSelectedLibraryIds([]);
  }, [playlistLibraryTargetId]);

  const addSelectedLibraryToPlaylist = useCallback(() => {
    const selectedIds = selectedLibraryIds;
    if (!selectedIds.length) return;
    const currentState = playlistStateRef.current;
    const targetPlaylist = getBackingPlaylistById(currentState, playlistLibraryTargetId)
      || getActiveBackingPlaylist(currentState);
    const existingIds = new Set(targetPlaylist.itemIds);
    const addedIds = selectedIds.filter((id) => !existingIds.has(id));
    commitPlaylistState((state) => addBackingPlaylistItems(state, targetPlaylist.id, selectedIds));
    if (targetPlaylist.id === currentState.currentQueue.id) {
      setSelectedQueueItemIds(addedIds);
    } else {
      setSelectedSavedItemIds(addedIds);
    }
    setSelectedLibraryIds([]);
    setPlaylistLibraryPickerOpen(false);
    setNotice(addedIds.length
      ? `${addedIds.length}개 음원을 “${targetPlaylist.title}”에 추가했어요.`
      : `선택한 음원은 이미 “${targetPlaylist.title}”에 있어요.`);
  }, [commitPlaylistState, playlistLibraryTargetId, selectedLibraryIds]);

  const saveCurrentPlaylist = useCallback(() => {
    const saveTarget = playlistStateRef.current.savedPlaylists.find((playlist) => playlist.id === playlistSaveTargetId);
    const title = saveTarget?.title || playlistRenameDraft.trim();
    const currentPlaylist = getActiveBackingPlaylist(playlistStateRef.current);
    if (!currentPlaylist.itemIds.length) {
      setNotice("저장할 곡을 현재 재생목록에 먼저 추가해주세요.");
      return;
    }
    if (!title) {
      setNotice("저장할 목록 이름을 입력해주세요.");
      return;
    }
    const itemIds = currentPlaylist.itemIds.filter((itemId) => selectedQueueItemIds.includes(itemId));
    if (!itemIds.length) {
      setNotice("목록으로 저장할 곡을 선택해주세요.");
      return;
    }
    const nextState = commitPlaylistState((state) => saveCurrentBackingPlaylist(state, title, {
      itemIds,
      playlistId: saveTarget?.id || "",
    }));
    const saved = nextState.savedPlaylists.find((playlist) => playlist.id === nextState.activeSavedPlaylistId);
    if (!saveTarget) setPlaylistRenameDraft("");
    if (saved) {
      setPlaylistSaveTargetId(saved.id);
      setPlaylistPanelView(saved.id);
      setSelectedSavedItemIds([...saved.itemIds]);
    }
    setNotice(saveTarget
      ? `선택한 ${itemIds.length}곡으로 “${saveTarget.title}” 목록을 갱신했어요.`
      : `선택한 ${itemIds.length}곡을 “${saved?.title || title}” 목록으로 저장했어요.`);
  }, [commitPlaylistState, playlistRenameDraft, playlistSaveTargetId, selectedQueueItemIds]);

  const selectPlaylistSaveTarget = useCallback((playlistId) => {
    const normalizedId = String(playlistId || "");
    const exists = playlistStateRef.current.savedPlaylists.some((playlist) => playlist.id === normalizedId);
    setPlaylistSaveTargetId(exists ? normalizedId : "");
  }, []);

  const loadSavedPlaylist = useCallback((playlistId) => {
    const savedPlaylist = playlistStateRef.current.savedPlaylists.find((playlist) => playlist.id === playlistId);
    if (!savedPlaylist) return;
    if (playlistPlaybackRef.current.playlistId) {
      resetAudioPosition();
      playlistPlaybackRef.current = { itemId: "", playlistId: "" };
      setPlaylistPlaybackActive(false);
      setPhaseImmediate("idle");
    }
    const nextState = commitPlaylistState((state) => loadSavedBackingPlaylist(state, playlistId));
    const activePlaylist = getActiveBackingPlaylist(nextState);
    setSelectedPlaylistItemId(activePlaylist.itemIds[0] || "");
    setSelectedQueueItemIds([...activePlaylist.itemIds]);
    setPlaylistPanelView("queue");
    setPlaylistLibraryPickerOpen(false);
    setNotice(`“${savedPlaylist.title}” 구성을 현재 재생목록으로 불러왔어요.`);
  }, [commitPlaylistState, resetAudioPosition, setPhaseImmediate]);

  const requestDeletePlaylistTab = useCallback((playlistId) => {
    if (!playlistId) return;
    setPlaylistDeleteTargetId(playlistId);
    setDialog("playlist-delete");
  }, []);

  const confirmDeletePlaylistTab = useCallback(() => {
    const target = playlistStateRef.current.savedPlaylists.find((playlist) => playlist.id === playlistDeleteTargetId);
    if (!target) return;
    if (playlistPlaybackRef.current.playlistId === target.id) {
      resetAudioPosition();
      playlistPlaybackRef.current = { itemId: "", playlistId: "" };
      setPlaylistPlaybackActive(false);
      setPhaseImmediate("idle");
    }
    commitPlaylistState((state) => deleteBackingPlaylistTab(state, target.id));
    if (playlistSaveTargetId === target.id) setPlaylistSaveTargetId("");
    setSelectedSavedItemIds([]);
    setPlaylistDeleteTargetId("");
    setNotice(`저장된 목록 “${target.title}”만 삭제했어요. 음원 파일은 그대로 유지됩니다.`);
    setPlaylistPanelView("queue");
    setDialog("load");
  }, [commitPlaylistState, playlistDeleteTargetId, playlistSaveTargetId, resetAudioPosition, setPhaseImmediate]);

  const movePlaylistItem = useCallback((itemId, direction) => {
    const activePlaylistId = playlistStateRef.current.activePlaylistId;
    commitPlaylistState((state) => moveBackingPlaylistItem(state, activePlaylistId, itemId, direction));
  }, [commitPlaylistState]);

  const removePlaylistItem = useCallback((itemId) => {
    const activePlaylist = getActiveBackingPlaylist(playlistStateRef.current);
    if (playlistPlaybackRef.current.playlistId === activePlaylist.id
      && playlistPlaybackRef.current.itemId === itemId) {
      resetAudioPosition();
      playlistPlaybackRef.current = { itemId: "", playlistId: "" };
      setPlaylistPlaybackActive(false);
      setPhaseImmediate("idle");
    }
    const nextState = commitPlaylistState((state) => removeBackingPlaylistItem(state, activePlaylist.id, itemId));
    const nextPlaylist = getActiveBackingPlaylist(nextState);
    setSelectedPlaylistItemId((selectedId) => (
      selectedId === itemId ? nextPlaylist.itemIds[0] || "" : selectedId
    ));
    setSelectedQueueItemIds((selectedIds) => selectedIds.filter((id) => id !== itemId));
  }, [commitPlaylistState, resetAudioPosition, setPhaseImmediate]);

  const setPlaylistPlaybackMode = useCallback((playbackMode) => {
    commitPlaylistState((state) => setBackingPlaylistPlaybackMode(state, playbackMode));
  }, [commitPlaylistState]);

  const cyclePlaylistRepeatMode = useCallback(() => {
    commitPlaylistState((state) => {
      const nextMode = getNextBackingPlaylistRepeatMode(state.playbackMode);
      const audio = audioRef.current;
      if (audio && playlistPlaybackRef.current.playlistId) {
        audio.loop = nextMode === BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ONE;
      }
      return setBackingPlaylistPlaybackMode(state, nextMode);
    });
  }, [commitPlaylistState]);

  const togglePlaylistShuffle = useCallback(() => {
    commitPlaylistState((state) => setBackingPlaylistShuffleEnabled(
      state,
      !state.shuffleEnabled,
    ));
  }, [commitPlaylistState]);

  const togglePlaylistDrawer = useCallback(() => {
    if (["armed", "recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(phaseRef.current)) return;
    if (dialog === "load") {
      setDialog("");
      return;
    }
    showPlaylistView();
    setDialog("load");
  }, [dialog, showPlaylistView]);

  const closeDialog = useCallback(() => {
    if (["saving", "loading", "applying"].includes(phaseRef.current) || deletePendingRef.current) return;
    if (dialog === "trim") {
      useOriginalTrimRecording();
      return;
    }
    if (dialog === "delete") {
      setDialog("load");
      return;
    }
    if (dialog === "playlist-delete") {
      const previousPlaylistId = playlistDeleteTargetId;
      setPlaylistDeleteTargetId("");
      setPlaylistPanelView(previousPlaylistId || "queue");
      setDialog("load");
      return;
    }
    if (dialog === "playlist-items-delete") {
      const previousPlaylistId = playlistItemsDeleteTargetId;
      setPlaylistItemsDeleteTargetId("");
      setPlaylistItemsDeleteTargetIds([]);
      setPlaylistPanelView(previousPlaylistId || "queue");
      setDialog("load");
      return;
    }
    if (dialog === "save-confirm") {
      setDialog("save");
      return;
    }
    if (dialog === "import-select") {
      setImportCandidates([]);
      setImportRejectedCount(0);
      setSelectedImportCandidateId("");
    }
    setDialog("");
    setSaveError("");
    setSelectedLibraryId("");
    setSelectedLibraryIds([]);
    setLibraryEditMode(false);
  }, [dialog, playlistDeleteTargetId, playlistItemsDeleteTargetId, useOriginalTrimRecording]);

  const confirmSave = useCallback(async () => {
    if (!recording?.blob || phaseRef.current === "saving") return;
    const title = normalizeBackingLoopTitle(titleDraft);
    if (!title) {
      setSaveError("제목을 입력해주세요.");
      return;
    }

    setPhaseImmediate("saving");
    setSaveError("");
    try {
      const savedRecording = await saveBackingLoopRecording({
        ...recording,
        id: recording.id || createBackingLoopId(),
        title,
      });
      if (!mountedRef.current) return;
      setRecording(savedRecording);
      setEditSourceRecording(savedRecording);
      setEditSourceAudioData(recordingAudioData);
      setAppliedTrimRange({
        endMs: savedRecording.durationMs,
        startMs: 0,
      });
      setLibrary((currentLibrary) => [
        savedRecording,
        ...currentLibrary.filter((item) => item.id !== savedRecording.id),
      ]);
      setCurrentTimeMs(0);
      setNotice(`“${savedRecording.title}” 저장 완료`);
      setDialog("");
      setLibraryEditMode(false);
      setSelectedLibraryIds([]);
      setPhaseImmediate("idle");
    } catch {
      if (!mountedRef.current) return;
      setSaveError("저장 공간을 사용할 수 없어요.");
      setDialog("save");
      setPhaseImmediate("idle");
    }
  }, [recording, recordingAudioData, setPhaseImmediate, titleDraft]);

  const loadRecording = useCallback(async (id, options = {}) => {
    if (!id || phaseRef.current === "loading") return;
    const keepLibraryOpen = options.keepLibraryOpen === true;
    if (!options.fromPlaylist) {
      playlistAutoplayRef.current = false;
      playlistPlaybackRef.current = { itemId: "", playlistId: "" };
      setPlaylistPlaybackActive(false);
    }
    setPhaseImmediate("loading");
    resetAudioPosition();
    try {
      const inMemoryRecording = libraryRef.current.find((item) => item.id === id);
      const savedRecording = (isAudioStudioLibraryId(id)
        ? await loadAudioStudioBackingSource(id).catch(() => null)
        : await loadBackingLoopRecording(id).catch(() => null)) || (inMemoryRecording?.blob ? inMemoryRecording : null);
      if (!mountedRef.current) return;
      if (!savedRecording) throw new Error("Saved backing loop not found.");
      setRecording(savedRecording);
      setRecordingAudioData(null);
      setEditSourceRecording(savedRecording);
      setEditSourceAudioData(null);
      setAppliedTrimRange({
        endMs: savedRecording.durationMs,
        startMs: 0,
      });
      setSelectedLibraryId("");
      setSelectedLibraryIds([]);
      setLibraryEditMode(false);
      setCurrentTimeMs(0);
      setNotice(options.notice || `“${savedRecording.title}” 불러오기 완료`);
      setDialog(keepLibraryOpen ? "load" : "");
      setPhaseImmediate("idle");
      return savedRecording;
    } catch {
      if (!mountedRef.current) return;
      setNotice("저장된 백킹을 불러올 수 없어요.");
      setPhaseImmediate("error");
    }
  }, [resetAudioPosition, setPhaseImmediate]);

  const playPlaylistItem = useCallback(async (itemId, options = {}) => {
    const currentState = playlistStateRef.current;
    const playbackPlaylist = getBackingPlaylistById(currentState, options.playlistId)
      || getActiveBackingPlaylist(currentState);
    const targetId = itemId || selectedPlaylistItemId || playbackPlaylist.itemIds[0];
    if (!targetId || !playbackPlaylist.itemIds.includes(targetId)) return;
    if (!libraryRef.current.some((item) => item.id === targetId)) return;

    const requestedIds = Array.isArray(options.itemIds)
      ? playbackPlaylist.itemIds.filter((id) => options.itemIds.includes(id))
      : playbackPlaylist.itemIds;
    const playbackItemIds = requestedIds.includes(targetId) ? requestedIds : playbackPlaylist.itemIds;

    playlistPlaybackRef.current = {
      itemId: targetId,
      itemIds: playbackItemIds,
      playedItemIds: [targetId],
      playlistId: playbackPlaylist.id,
    };
    playlistAutoplayRef.current = true;
    setPlaylistPlaybackActive(true);
    if (playbackPlaylist.id === currentState.currentQueue.id) setSelectedPlaylistItemId(targetId);
    const loaded = await loadRecording(targetId, {
      fromPlaylist: true,
      keepLibraryOpen: dialog === "load",
      notice: `“${playbackPlaylist.title}” 재생 준비`,
    });
    if (!loaded) {
      playlistAutoplayRef.current = false;
      playlistPlaybackRef.current = { itemId: "", playlistId: "" };
      setPlaylistPlaybackActive(false);
    }
  }, [dialog, loadRecording, selectedPlaylistItemId]);

  const playSelectedQueueItems = useCallback(() => {
    const activePlaylist = getActiveBackingPlaylist(playlistStateRef.current);
    const itemIds = activePlaylist.itemIds.filter((itemId) => selectedQueueItemIds.includes(itemId));
    if (!itemIds.length) {
      setNotice("재생할 곡을 선택해주세요.");
      return;
    }
    playPlaylistItem(itemIds[0], { itemIds });
  }, [playPlaylistItem, selectedQueueItemIds]);

  const playSavedPlaylistItem = useCallback((playlistId, itemId) => {
    const playlist = getBackingPlaylistById(playlistStateRef.current, playlistId);
    if (!playlist || playlist.id === playlistStateRef.current.currentQueue.id) return;
    playPlaylistItem(itemId, { itemIds: playlist.itemIds, playlistId: playlist.id });
  }, [playPlaylistItem]);

  const playAllSavedPlaylistItems = useCallback((playlistId) => {
    const playlist = getBackingPlaylistById(playlistStateRef.current, playlistId);
    if (!playlist || playlist.id === playlistStateRef.current.currentQueue.id || !playlist.itemIds.length) {
      setNotice("재생할 곡이 없습니다.");
      return;
    }
    playPlaylistItem(playlist.itemIds[0], { itemIds: playlist.itemIds, playlistId: playlist.id });
  }, [playPlaylistItem]);

  const playSelectedSavedPlaylistItems = useCallback((playlistId) => {
    const playlist = getBackingPlaylistById(playlistStateRef.current, playlistId);
    if (!playlist || playlist.id === playlistStateRef.current.currentQueue.id) return;
    const itemIds = playlist.itemIds.filter((itemId) => selectedSavedItemIds.includes(itemId));
    if (!itemIds.length) {
      setNotice("재생할 곡을 선택해주세요.");
      return;
    }
    playPlaylistItem(itemIds[0], { itemIds, playlistId: playlist.id });
  }, [playPlaylistItem, selectedSavedItemIds]);

  useEffect(() => {
    if (!playlistAutoplayRef.current || !audioUrl || recording?.id !== playlistPlaybackRef.current.itemId) return undefined;
    playlistAutoplayRef.current = false;
    const frameId = window.requestAnimationFrame(() => playRecording());
    return () => window.cancelAnimationFrame(frameId);
  }, [audioUrl, playRecording, recording?.id]);

  const togglePlaylistPlayback = useCallback(() => {
    if (phaseRef.current === "playing" && playlistPlaybackActive) {
      pausePlayback();
      return;
    }
    if (playlistPlaybackActive && recording?.id === playlistPlaybackRef.current.itemId) {
      playRecording();
      return;
    }
    playPlaylistItem();
  }, [pausePlayback, playPlaylistItem, playRecording, playlistPlaybackActive, recording?.id]);

  const playAdjacentPlaylistItem = useCallback((direction) => {
    const currentState = playlistStateRef.current;
    const playbackPlaylist = getBackingPlaylistById(currentState, playlistPlaybackRef.current.playlistId)
      || getActiveBackingPlaylist(currentState);
    const playbackItemIds = playlistPlaybackRef.current.playlistId === playbackPlaylist.id
      && Array.isArray(playlistPlaybackRef.current.itemIds)
      ? playlistPlaybackRef.current.itemIds.filter((itemId) => playbackPlaylist.itemIds.includes(itemId))
      : playbackPlaylist.itemIds;
    if (!playbackItemIds.length) return;
    const currentId = playlistPlaybackRef.current.playlistId === playbackPlaylist.id
      ? playlistPlaybackRef.current.itemId
      : selectedPlaylistItemId;
    const currentIndex = Math.max(0, playbackItemIds.indexOf(currentId));
    const offset = direction === "previous" ? -1 : 1;
    const nextIndex = (currentIndex + offset + playbackItemIds.length) % playbackItemIds.length;
    playPlaylistItem(playbackItemIds[nextIndex], { itemIds: playbackItemIds, playlistId: playbackPlaylist.id });
  }, [playPlaylistItem, selectedPlaylistItemId]);

  const playPreviousPlaylistItem = useCallback(() => {
    const audio = audioRef.current;
    const positionMs = audio && Number.isFinite(audio.currentTime)
      ? audio.currentTime * 1000
      : currentTimeMs;
    if (shouldRestartBackingPlaylistTrack(positionMs) && recording?.blob) {
      try {
        if (audio) audio.currentTime = 0;
      } catch {
        // Metadata can change while a playlist item is loading.
      }
      setCurrentTimeMs(0);
      setNotice("현재 백킹을 처음부터 재생합니다.");
      return;
    }
    playAdjacentPlaylistItem("previous");
  }, [currentTimeMs, playAdjacentPlaylistItem, recording?.blob]);
  const playNextPlaylistItem = useCallback(() => playAdjacentPlaylistItem("next"), [playAdjacentPlaylistItem]);

  const togglePlayerPlayback = useCallback(() => {
    const activePlaylist = getActiveBackingPlaylist(playlistStateRef.current);
    const currentRecordingIsInPlaylist = activePlaylist.itemIds.includes(recording?.id);
    const selectedItemIsInPlaylist = activePlaylist.itemIds.includes(selectedPlaylistItemId);
    if (activePlaylist.itemIds.length
      && (playlistPlaybackActive || selectedItemIsInPlaylist || currentRecordingIsInPlaylist || !recording?.blob)) {
      togglePlaylistPlayback();
      return;
    }
    togglePlayback();
  }, [playlistPlaybackActive, recording?.blob, recording?.id, selectedPlaylistItemId, togglePlayback, togglePlaylistPlayback]);

  const confirmDelete = useCallback(async () => {
    const savedIds = libraryEditMode ? selectedLibraryIds : [selectedLibraryId].filter(Boolean);
    if (!savedIds.length || deletePendingRef.current) return;
    const deletingCurrent = savedIds.includes(recording?.id);
    deletePendingRef.current = true;
    setDeletePending(true);
    if (deletingCurrent) {
      setPhaseImmediate("loading");
      resetAudioPosition();
    }

    try {
      const persistedIds = library
        .filter((item) => savedIds.includes(item.id) && item.updatedAt && !isAudioStudioLibraryId(item.id))
        .map((item) => item.id);
      await Promise.all(persistedIds.map((savedId) => deleteBackingLoopRecording(savedId)));
      if (!mountedRef.current) return;
      setLibrary((currentLibrary) => currentLibrary.filter((item) => !savedIds.includes(item.id)));
      if (savedIds.includes(playlistPlaybackRef.current.itemId)) {
        playlistPlaybackRef.current = { itemId: "", playlistId: "" };
        setPlaylistPlaybackActive(false);
      }
      if (deletingCurrent) {
        setRecording(null);
        setRecordingAudioData(null);
        setEditSourceRecording(null);
        setEditSourceAudioData(null);
        setAppliedTrimRange(null);
        setCurrentTimeMs(0);
      }
      setSelectedLibraryId("");
      setSelectedLibraryIds([]);
      setLibraryEditMode(false);
      setNotice(savedIds.length > 1 ? `저장된 백킹 ${savedIds.length}개를 삭제했어요.` : "저장된 백킹을 삭제했어요.");
      setDialog("load");
      if (deletingCurrent) setPhaseImmediate("idle");
    } catch {
      if (!mountedRef.current) return;
      setNotice("저장된 백킹을 삭제하지 못했어요.");
      if (deletingCurrent) setPhaseImmediate("error");
    } finally {
      deletePendingRef.current = false;
      if (mountedRef.current) setDeletePending(false);
    }
  }, [library, libraryEditMode, recording?.id, resetAudioPosition, selectedLibraryId, selectedLibraryIds, setPhaseImmediate]);

  const seekPlayback = useCallback((nextTimeMs) => {
    if (!recording?.blob || ["armed", "recording", "requesting", "processing", "trimming", "applying"].includes(phaseRef.current)) return;
    const durationMs = Math.max(0, Number(recording.durationMs) || 0);
    if (!durationMs) return;
    const safeTimeMs = Math.min(durationMs, Math.max(0, Number(nextTimeMs) || 0));
    const audio = audioRef.current;
    if (audio) {
      fadeThen(() => {
        try {
          audio.currentTime = safeTimeMs / 1000;
          audioGraphRef.current?.setTransportLevel(1, { timeConstant: 0.004 });
        } catch {
          // Metadata may change during an import; the next input retries the seek.
        }
      }, 0.008);
    }
    setCurrentTimeMs(safeTimeMs);
  }, [fadeThen, recording]);

  const handlePlaybackEnded = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || phaseRef.current !== "playing") return;
    const playback = playlistPlaybackRef.current;
    if (!playback.playlistId) {
      audio.currentTime = 0;
      setCurrentTimeMs(0);
      audio.play().catch(() => {
        setNotice("반복 재생을 계속할 수 없어요. PLAY를 다시 눌러주세요.");
        setPhaseImmediate("error");
      });
      return;
    }

    const currentState = playlistStateRef.current;
    const activePlaybackList = getBackingPlaylistById(currentState, playback.playlistId);
    const currentIndex = activePlaybackList?.itemIds.indexOf(playback.itemId) ?? -1;
    if (!activePlaybackList || currentIndex < 0) {
      setPlaylistPlaybackActive(false);
      playlistPlaybackRef.current = { itemId: "", playlistId: "" };
      setPhaseImmediate("idle");
      return;
    }
    const playbackItemIds = Array.isArray(playback.itemIds) && playback.itemIds.length
      ? playback.itemIds.filter((itemId) => activePlaybackList.itemIds.includes(itemId))
      : activePlaybackList.itemIds;
    const playbackIndex = playbackItemIds.indexOf(playback.itemId);
    if (playbackIndex < 0) {
      playlistPlaybackRef.current = { itemId: "", playlistId: "" };
      setPlaylistPlaybackActive(false);
      setPhaseImmediate("idle");
      return;
    }
    const nextIndex = getNextBackingPlaylistIndex({
      currentIndex: playbackIndex,
      itemCount: playbackItemIds.length,
      playedIndexes: (Array.isArray(playback.playedItemIds) ? playback.playedItemIds : [playback.itemId])
        .map((itemId) => playbackItemIds.indexOf(itemId))
        .filter((index) => index >= 0),
      playbackMode: currentState.playbackMode,
      shuffleEnabled: currentState.shuffleEnabled,
    });
    if (nextIndex < 0) {
      playlistPlaybackRef.current = { itemId: "", playlistId: "" };
      setPlaylistPlaybackActive(false);
      setCurrentTimeMs(0);
      setNotice(`“${activePlaybackList.title}” 순차 재생 완료`);
      setPhaseImmediate("idle");
      return;
    }
    const nextItemId = playbackItemIds[nextIndex];
    if (nextItemId === playback.itemId) {
      audio.currentTime = 0;
      setCurrentTimeMs(0);
      audio.play().catch(() => setPhaseImmediate("error"));
      return;
    }
    const playedItemIds = Array.isArray(playback.playedItemIds) ? playback.playedItemIds : [playback.itemId];
    const startsNewShuffleRound = currentState.shuffleEnabled
      && currentState.playbackMode === BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ALL
      && playedItemIds.length >= playbackItemIds.length;
    playlistPlaybackRef.current = {
      itemId: nextItemId,
      itemIds: playbackItemIds,
      playedItemIds: startsNewShuffleRound
        ? [nextItemId]
        : [...new Set([...playedItemIds, nextItemId])],
      playlistId: activePlaybackList.id,
    };
    playlistAutoplayRef.current = true;
    if (activePlaybackList.id === currentState.currentQueue.id) setSelectedPlaylistItemId(nextItemId);
    await loadRecording(nextItemId, {
      fromPlaylist: true,
      keepLibraryOpen: dialog === "load",
      notice: `“${activePlaybackList.title}” 다음 백킹 준비`,
    });
  }, [dialog, loadRecording, setPhaseImmediate]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.loop = !playlistPlaybackRef.current.playlistId
        || playlistStateRef.current.playbackMode === BACKING_PLAYLIST_PLAYBACK_MODES.REPEAT_ONE;
      const actualDurationMs = Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration * 1000
        : 0;
      if (actualDurationMs) {
        setRecording((currentRecording) => {
          if (!currentRecording || Math.abs(currentRecording.durationMs - actualDurationMs) < 20) {
            return currentRecording;
          }
          return { ...currentRecording, durationMs: actualDurationMs };
        });
      }
      if (phase === "paused" && currentTimeMs > 0) {
        try {
          audio.currentTime = Math.min(currentTimeMs, actualDurationMs || currentTimeMs) / 1000;
        } catch {
          // The next PLAY action will retry from the preserved position.
        }
      }
    }
    if (phase !== "paused" && phase !== "playing") setCurrentTimeMs(0);
  }, [currentTimeMs, phase]);

  const hasRecording = Boolean(recording?.blob);
  const durationMs = hasRecording ? Math.max(0, Number(recording.durationMs) || 0) : 0;
  const trimDurationMs = Math.max(0, Number(trimDraft?.recording?.durationMs) || 0);
  const trimSelection = trimDraft ? {
    durationMs: trimDurationMs,
    endMs: trimEndMs,
    lengthMs: Math.max(0, trimEndMs - trimStartMs),
    previewPositionMs: trimPreviewPositionMs,
    startMs: trimStartMs,
    waveform: trimDraft.waveform || [],
  } : null;
  const displayTimeMs = ["recording", "playing", "paused"].includes(phase)
    ? currentTimeMs
    : durationMs;
  const status = useMemo(() => (recordingPaused
    ? { label: "RECORD PAUSED", tone: "paused" }
    : getBackingLoopStatus({
      elapsedMs: currentTimeMs,
      hasRecording,
      phase,
    })), [currentTimeMs, hasRecording, phase, recordingPaused]);
  const activePlaylist = useMemo(() => getActiveBackingPlaylist(playlistState), [playlistState]);
  const playlistEntries = useMemo(() => activePlaylist.itemIds
    .map((id) => library.find((item) => item.id === id))
    .filter(Boolean), [activePlaylist.itemIds, library]);
  const selectedQueueIds = useMemo(() => activePlaylist.itemIds
    .filter((itemId) => selectedQueueItemIds.includes(itemId)), [activePlaylist.itemIds, selectedQueueItemIds]);
  const viewedSavedPlaylist = useMemo(() => playlistState.savedPlaylists.find(
    (playlist) => playlist.id === playlistPanelView,
  ) || null, [playlistPanelView, playlistState.savedPlaylists]);
  const selectedSavedIds = useMemo(() => (viewedSavedPlaylist?.itemIds || [])
    .filter((itemId) => selectedSavedItemIds.includes(itemId)), [selectedSavedItemIds, viewedSavedPlaylist]);
  const playlistDrawerOpen = dialog === "load";
  const playlistPlayingItemId = playlistPlaybackActive ? playlistPlaybackRef.current.itemId : "";
  const playlistPlayingPlaylistId = playlistPlaybackActive ? playlistPlaybackRef.current.playlistId : "";
  const playlistPlayingTitle = playlistPlaybackActive
    ? getBackingPlaylistById(playlistState, playlistPlaybackRef.current.playlistId)?.title || "PLAYLIST"
    : "";
  const playlistPlaybackItemCount = playlistPlaybackActive
    ? (playlistPlaybackRef.current.itemIds?.length || 0)
    : activePlaylist.itemIds.length;

  return {
    activePlaylist,
    addSelectedLibraryToPlaylist,
    applyTrim,
    audioRef,
    audioUrl,
    backingVolume: backingVolume.volume,
    backingVolumePercent: Math.round(backingVolume.volume * 100),
    cancelCurrent,
    closeDialog,
    confirmDelete,
    confirmDeletePlaylistTab,
    confirmDeleteSavedPlaylistItems,
    confirmClearRecording,
    confirmSave,
    cyclePlaylistRepeatMode,
    currentTimeMs,
    deletePending,
    dialog,
    displayTimeMs,
    durationMs,
    handleLoadedMetadata,
    handlePlaybackEnded,
    hasRecording,
    importAccept: BACKING_AUDIO_FILE_ACCEPT,
    importBackingAudio,
    importCandidates,
    importInputRef,
    importRejectedCount,
    inputLevel,
    isArmed: phase === "armed",
    isBackingMuted: backingVolume.volume <= 0,
    isPaused: phase === "paused",
    isPlaying: phase === "playing",
    isRecording: phase === "recording",
    library,
    libraryEditMode,
    libraryView,
    loadSavedPlaylist,
    loadRecording,
    movePlaylistItem,
    notice,
    openDeleteDialog,
    openImportFilePicker,
    openImportPicker,
    openLoadDialog,
    openSaveDialog,
    openTrimEditor,
    pausePlayback,
    phase,
    playRecording,
    playlistDeleteTargetId,
    playlistItemsDeleteTargetId,
    playlistItemsDeleteTargetIds,
    playlistDrawerOpen,
    playlistEntries,
    playlistPlaybackActive,
    playlistPlaybackMode: playlistState.playbackMode,
    playlistLibraryPickerOpen,
    playlistLibraryTargetId,
    playlistPanelView,
    playlistPlayingItemId,
    playlistPlayingPlaylistId,
    playlistPlayingTitle,
    playlistPlaybackItemCount,
    playlistShuffleEnabled: playlistState.shuffleEnabled,
    playlistRenameDraft,
    playlistSaveTargetId,
    playlists: playlistState.playlists,
    savedPlaylists: playlistState.savedPlaylists,
    playNextPlaylistItem,
    playAllSavedPlaylistItems,
    playPlaylistItem,
    playSavedPlaylistItem,
    playSelectedQueueItems,
    playSelectedSavedPlaylistItems,
    playPreviousPlaylistItem,
    recording,
    removePlaylistItem,
    requestDeletePlaylistTab,
    requestDeleteSavedPlaylistItems,
    requestSaveConfirmation,
    resetPlayback,
    resetTrimSelection,
    saveError,
    selectedImportCandidateId,
    selectedLibraryId,
    selectedLibraryIds,
    selectedPlaylistItemId,
    selectedQueueItemIds: selectedQueueIds,
    selectedSavedItemIds: selectedSavedIds,
    selectAllLibraryRecordings,
    selectLibraryRecording: setSelectedLibraryId,
    selectImportCandidate: setSelectedImportCandidateId,
    selectPlaylistItem: setSelectedPlaylistItemId,
    selectPlaylistSaveTarget,
    setPlaylistPlaybackMode,
    setPlaylistRenameDraft,
    seekPlayback,
    setBackingVolume,
    setTitleDraft,
    status,
    sourceFileName: recording?.fileName || "",
    sourceType: recording?.sourceType || BACKING_AUDIO_SOURCE_TYPES.RECORDING,
    title: recording?.title || BACKING_LOOP_DEFAULT_TITLE,
    titleDraft,
    toggleLibraryEditMode,
    toggleBackingMute,
    toggleLibraryRecordingSelection,
    togglePlayerPlayback,
    togglePlaylistDrawer,
    togglePlaylistPlayback,
    togglePlaylistShuffle,
    togglePlayback,
    toggleRecording,
    toggleTrimPreview,
    trimPreviewAudioRef,
    trimPreviewPlaying,
    trimPreviewUrl,
    trimSelection,
    updateTrimEnd,
    updateTrimStart,
    useSelectedImportCandidate,
    useOriginalTrimRecording,
    clearLibraryRecordingSelection,
    saveCurrentPlaylist,
    showCurrentPlaylist,
    showSavedPlaylist,
    showPlaylistView,
    selectAllQueueItems,
    selectAllSavedPlaylistItems,
    clearQueueItemSelection,
    clearSavedPlaylistItemSelection,
    toggleQueueItemSelection,
    toggleSavedPlaylistItemSelection,
    togglePlaylistLibraryPicker,
  };
}
