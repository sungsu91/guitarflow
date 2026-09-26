import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
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
  getAudioBusInput,
  resumeSharedAudioContext,
} from "../audio/audioBus";
import { registerBackingLoopActivity } from "./activityRegistry.js";
import { createGrooveBufferPlayback } from "./grooveBufferPlayback.js";
import { claimBackingPlayback, stopOwnedBackingPlayback } from "./playbackOwnership.js";
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
  shouldLoopBackingTrack,
  subscribeBackingPlaylist,
} from "./backingPlaylist";
import {
  BACKING_AUDIO_FILE_ACCEPT,
  BACKING_AUDIO_SOURCE_TYPES,
  prepareImportedBackingAudioSources,
} from "./backingAudioSource";
import { isBackingPlaybackSourceReady } from "./backingPlaybackSource.js";
import {isGrooveBackingId, listGrooveBackingSources, loadGrooveBackingSource} from './grooveBackingSource.js';
import {subscribeGroovePacks} from '../metronome/groovePackLibrary.js';
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
  const [audioSource, setAudioSource] = useState(() => ({ blob: null, url: "" }));
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
  const [playlistAutoplayRequest, setPlaylistAutoplayRequest] = useState(0);
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
  const groovePlaybackRef = useRef(null);
  const recordingRef = useRef(recording);
  const playbackGenerationRef = useRef(0);
  const playbackEndedRef = useRef(null);
  const playbackLeaseRef = useRef(null);
  const interruptPlaybackRef = useRef(null);
  const navigationCleanupRef = useRef(null);
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
  recordingRef.current = recording;
  const audioUrl = audioSource.url;
  const getPlaybackAudio = useCallback(() => groovePlaybackRef.current || audioRef.current, []);

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
    const currentRecording = recordingRef.current;
    if (currentRecording?.sourceType === BACKING_AUDIO_SOURCE_TYPES.GROOVE) {
      const generation = playbackGenerationRef.current;
      const context = await resumeSharedAudioContext();
      if (!context) throw new Error('Web Audio is unavailable');
      if (!groovePlaybackRef.current) {
        const buffer = await context.decodeAudioData(await currentRecording.blob.arrayBuffer());
        if (!mountedRef.current || generation !== playbackGenerationRef.current
          || recordingRef.current?.blob !== currentRecording.blob) return null;
        audio.pause();
        disconnectMediaElementFromBus(audio);
        const player = createGrooveBufferPlayback({
          context, buffer, output: getAudioBusInput(AUDIO_BUS_IDS.GROOVE, context),
          level: backingVolumeRef.current, onEnded: () => playbackEndedRef.current?.(),
        });
        player.blob = currentRecording.blob;
        // Preserve seeking before the first play as well as a paused position.
        player.currentTime = audio.currentTime;
        groovePlaybackRef.current = player;
      }
      const graph = groovePlaybackRef.current.graph;
      audioGraphRef.current = graph;
      graph.connect();
      graph.setLevel(backingVolumeRef.current, { immediate: true });
      return graph;
    }
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
    const audio = getPlaybackAudio();
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
    const audio = getPlaybackAudio();
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
    playbackGenerationRef.current += 1;
    playbackLeaseRef.current?.release();
    clearTransportFadeTimer();
    const audio = getPlaybackAudio();
    if (audio) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // The next loadedmetadata event will establish the initial position.
      }
      audioGraphRef.current?.setTransportLevel(1, { immediate: true });
    }
    clearPlaybackTimer();
    setCurrentTimeMs(0);
  }, [clearPlaybackTimer, clearTransportFadeTimer, getPlaybackAudio]);

  const pausePlayback = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    playbackGenerationRef.current += 1;
    const audio = getPlaybackAudio();
    if (audio) {
      setCurrentTimeMs(Math.max(0, audio.currentTime * 1000));
      fadeThen(() => {
        audio.pause();
        audioGraphRef.current?.setTransportLevel(1, { immediate: true });
        setCurrentTimeMs(Math.max(0, audio.currentTime * 1000));
      });
    }
    clearPlaybackTimer();
    setNotice(ko["backingLoop.pausedPressPlayToResume"]);
    setPhaseImmediate("paused");
  }, [clearPlaybackTimer, fadeThen, setPhaseImmediate]);

  // Used by Stop and by another audition taking over. Stop synchronously so a
  // delayed play/decode or fade cannot leave a second source audible.
  const stopPlayback = useCallback(() => {
    stopOwnedBackingPlayback();
    playbackGenerationRef.current += 1;
    playlistAutoplayRef.current = false;
    clearTransportFadeTimer();
    clearPlaybackTimer();
    const audio = getPlaybackAudio();
    audio?.pause();
    if (audio) audio.currentTime = 0;
    audioRef.current?.pause();
    audioGraphRef.current?.setTransportLevel(1, { immediate: true });
    playbackLeaseRef.current?.release();
    setCurrentTimeMs(0);
    if (["playing", "paused", "idle"].includes(phaseRef.current)) setPhaseImmediate("idle");
  }, [clearPlaybackTimer, clearTransportFadeTimer, getPlaybackAudio, setPhaseImmediate]);

  interruptPlaybackRef.current = () => {
    playbackGenerationRef.current += 1;
    playlistAutoplayRef.current = false;
    clearTransportFadeTimer();
    clearPlaybackTimer();
    const audio = getPlaybackAudio();
    audio?.pause();
    audioRef.current?.pause();
    if (phaseRef.current === "playing" || playbackRequestRef.current) {
      setCurrentTimeMs(Math.max(0, (audio?.currentTime || 0) * 1000));
      setPhaseImmediate("paused");
    }
  };

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

      return [...listGrooveBackingSources(), ...studioMixes, ...savedRecordings]
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
          setNotice(ko["backingLoop.storageIsUnavailableButRecordingAndPlaybackStillWork"]);
        }
      });
    const unsubscribeBacking = subscribeBackingLoopLibrary(() => applyLibrary(false));
    const unsubscribeStudio = subscribeAudioStudioBackingSources(() => applyLibrary(false));
    const unsubscribeGrooves = subscribeGroovePacks(() => applyLibrary(false));
    applyLibrary(true);

    return () => {
      cancelled = true;
      mountedRef.current = false;
      unsubscribeBacking();
      unsubscribeStudio();
      unsubscribeGrooves();
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
    if (!libraryHydrated || phase === 'loading' || recording?.sourceType !== BACKING_AUDIO_SOURCE_TYPES.GROOVE) return;
    const source = listGrooveBackingSources().find(item => item.id === recording.id);
    if (source?.grooveRevision === recording.grooveRevision) return;
    resetAudioPosition();
    setRecording(null);
    setEditSourceRecording(null);
    setEditSourceAudioData(null);
    setRecordingAudioData(null);
    playlistAutoplayRef.current = false;
    playlistPlaybackRef.current = {itemId: '', playlistId: ''};
    setPlaylistPlaybackActive(false);
    setPhaseImmediate('idle');
    setNotice(source ? ko["backingLoop.groovePackUpdatedRestartPlaybackToHearTheLatestPatternAndBpm"] : ko["backingLoop.theOriginalGroovePackWasDeleted"]);
  }, [library, libraryHydrated, phase, recording, resetAudioPosition, setPhaseImmediate]);

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
    const player = groovePlaybackRef.current;
    if (player && player.blob !== recording?.blob) {
      player.dispose();
      groovePlaybackRef.current = null;
      audioGraphRef.current = null;
    }
    if (!recording?.blob) {
      setAudioSource({ blob: null, url: "" });
      return undefined;
    }

    const nextAudioUrl = URL.createObjectURL(recording.blob);
    setAudioSource({ blob: recording.blob, url: nextAudioUrl });
    return () => URL.revokeObjectURL(nextAudioUrl);
  }, [recording?.blob]);

  useEffect(() => {
    const audio = getPlaybackAudio();
    if (!audio) return;
    audio.loop = shouldLoopBackingTrack(playlistState.playbackMode, playlistPlaybackActive, playlistPlaybackRef.current.itemIds?.length);
  }, [playlistPlaybackActive, playlistState]);

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
      const audio = getPlaybackAudio();
      if (audio) setCurrentTimeMs(Math.max(0, audio.currentTime * 1000));
    }, 160);
    return clearPlaybackTimer;
  }, [clearPlaybackTimer, phase]);

  const deactivateBackingLoop = useCallback(() => {
    modeActiveRef.current = false;
    setDialog("");
    setSaveError("");
    setPlaylistDeleteTargetId("");
    setPlaylistItemsDeleteTargetId("");
    setPlaylistItemsDeleteTargetIds([]);
    setPlaylistLibraryPickerOpen(false);
    const phaseBeforeDeactivate = phaseRef.current;
    const playbackPositionMs = getPlaybackAudio()
      ? Math.max(0, getPlaybackAudio().currentTime * 1000)
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
    playbackGenerationRef.current += 1;
    playbackLeaseRef.current?.release();
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
    getPlaybackAudio()?.pause();
    trimPreviewAudioRef.current?.pause();
    audioGraphRef.current?.setTransportLevel(1, { immediate: true });
    trimPreviewAudioGraphRef.current?.setTransportLevel(1, { immediate: true });
    disconnectMediaElementFromBus(audioRef.current);
    groovePlaybackRef.current?.dispose();
    groovePlaybackRef.current = null;
    audioGraphRef.current = null;
    disconnectMediaElementFromBus(trimPreviewAudioRef.current);
    setTrimPreviewPlaying(false);
    setRecordingPaused(false);
    releaseMicrophone();
    if (phaseBeforeDeactivate === "playing") {
      if (playbackPositionMs != null) setCurrentTimeMs(playbackPositionMs);
      setNotice(ko["backingLoop.pausedAfterNavigationPressPlayToResume"]);
      setPhaseImmediate("paused");
    } else if (["armed", "recording", "requesting"].includes(phaseBeforeDeactivate)) {
      setNotice(ko["backingLoop.recordingStoppedSafelyAfterNavigation"]);
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
      ownerMode === 'shared' ? () => {
        // Navigation dismisses editing/recording UI, but leaves the shared
        // playback transport and its playhead running across practice rooms.
        if (["armed", "recording", "requesting"].includes(phaseRef.current)) {
          deactivateBackingLoop();
          modeActiveRef.current = true;
        }
        navigationCleanupRef.current?.();
      } : null,
    ),
    [deactivateBackingLoop, ownerMode, stopTrimPreview],
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
    setNotice(ko["backingLoop.finishingRecording"]);
    setPhaseImmediate("processing");
    try {
      mediaRecorder.stop();
    } catch {
      setNotice(ko["backingLoop.couldnTStopRecordingTryAgain"]);
      setPhaseImmediate("error");
    }
  }, [getRecordingElapsedMs, setPhaseImmediate]);

  const startRecording = useCallback(async () => {
    if (["requesting", "armed", "recording", "processing", "trimming", "applying", "saving", "loading"].includes(phaseRef.current)) return;
    playlistAutoplayRef.current = false;
    playlistPlaybackRef.current = { itemId: "", playlistId: "" };
    setPlaylistPlaybackActive(false);
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder !== "function") {
      setNotice(ko["backingLoop.thisBrowserDoesNotSupportMicrophoneRecording"]);
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
        setNotice(ko["backingLoop.recordingFailedThePreviousBackingTrackIsKept"]);
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
          setNotice(ko["backingLoop.operationCanceledSavedBackingTracksAreKept"]);
          setPhaseImmediate("idle");
          return;
        }

        if (blob.size === 0) {
          setNotice(ko["backingLoop.noSoundWasRecordedThePreviousBackingTrackIsKept"]);
          setPhaseImmediate("error");
          return;
        }

        setPhaseImmediate("processing");
        setNotice(ko["backingLoop.refiningGuitarToneAndLoopBoundaries"]);
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
          setNotice(ko["backingLoop.recordedThisBrowserWillUseTheOriginalRangeDirectly"]);
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
        setNotice(ko["backingLoop.trimTheLeadInAndTailOrUseTheOriginalRecording"]);
        setDialog("trim");
        setPhaseImmediate("trimming");
      };

      setCurrentTimeMs(0);
      setPhaseImmediate("armed");
      setNotice(ko["backingLoop.inputReadyReleaseToStartRecording"]);
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
        setNotice(ko["backingLoop.recordingGuitarProgression"]);
        mediaRecorder.start(250);
        startRecordingTimer(mediaRecorder);
      }, RECORDING_PRESET.armDelayMs);
    } catch (error) {
      releaseMicrophone();
      if (!mountedRef.current || requestVersion !== recordingRequestVersionRef.current) return;
      const denied = error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError";
      setNotice(denied
        ? ko["backingLoop.allowMicrophoneAccessAndTryAgainThePreviousBackingIsKept"]
        : ko["backingLoop.checkForAnAvailableMicrophoneThePreviousBackingIsKept"]);
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
      setNotice(ko["backingLoop.recordingSetupCanceledThePreviousBackingIsKept"]);
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
    setNotice(ko["backingLoop.currentBackingClearedPressRecToStartANewRecording"]);
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
    setNotice(ko["backingLoop.operationCanceledSavedBackingTracksAreKept"]);
    setPhaseImmediate("idle");
  }, [clearArmTimer, clearRecordingTimer, releaseMicrophone, resetAudioPosition, setPhaseImmediate, stopTrimPreview]);

  const playRecording = useCallback(async () => {
    if (!modeActiveRef.current
      || !audioRef.current
      || !isBackingPlaybackSourceReady(audioSource, recording)) return;
    if (playbackRequestRef.current) return;
    if (phaseRef.current === "playing" && !getPlaybackAudio()?.paused) return;
    if (["armed", "recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(phaseRef.current)) return;

    const lease = claimBackingPlayback(() => interruptPlaybackRef.current?.());
    playbackLeaseRef.current = lease;
    playbackRequestRef.current = true;
    const generation = playbackGenerationRef.current;
    try {
      clearTransportFadeTimer();
      const graph = await ensurePlaybackAudioGraph();
      if (generation !== playbackGenerationRef.current || !lease.isCurrent()) return;
      const audio = getPlaybackAudio();
      graph?.setGrooveEnabled(recording?.sourceType === BACKING_AUDIO_SOURCE_TYPES.GROOVE);
      if (!mountedRef.current || !modeActiveRef.current) return;
      const playlistMode = playlistStateRef.current.playbackMode;
      audio.loop = shouldLoopBackingTrack(playlistMode, Boolean(playlistPlaybackRef.current.playlistId), playlistPlaybackRef.current.itemIds?.length);
      audio.defaultPlaybackRate = 1;
      audio.playbackRate = 1;
      if (!Number.isFinite(audio.currentTime) || audio.currentTime >= (audio.duration || Infinity)) {
        audio.currentTime = 0;
      }
      graph?.setTransportLevel(0, { immediate: true });
      await audio.play();
      if (!mountedRef.current || !modeActiveRef.current || generation !== playbackGenerationRef.current || !lease.isCurrent()) {
        audio.pause();
        graph?.setTransportLevel(1, { immediate: true });
        graph?.disconnect?.();
        return;
      }
      graph?.setTransportLevel(1, { timeConstant: 0.006 });
      setNotice(playlistPlaybackRef.current.playlistId ? ko["backingLoop.playlistPlaying"] : audio.loop ? ko["backingLoop.looping"] : ko["backingLoop.backingPlaying"]);
      setPhaseImmediate("playing");
    } catch {
      if (!mountedRef.current || !modeActiveRef.current || generation !== playbackGenerationRef.current) return;
      setNotice(ko["backingLoop.couldnTPlayThisBackingRecordAgainOrLoadAnotherTrack"]);
      setPhaseImmediate("error");
    } finally {
      playbackRequestRef.current = false;
    }
  }, [audioSource, clearTransportFadeTimer, ensurePlaybackAudioGraph, recording?.blob, setPhaseImmediate]);

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
    setNotice(ko["backingLoop.playheadReturnedToTheStart"]);
    setPhaseImmediate("idle");
  }, [recording?.blob, resetAudioPosition, setPhaseImmediate]);

  const openSaveDialog = useCallback(() => {
    if (recording?.sourceType === BACKING_AUDIO_SOURCE_TYPES.GROOVE) return;
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
    setNotice(nextNotice || formatMessage(ko["backingLoop.value1AddedToTheSharedLibrary"], { value1: importedRecording.fileName }));
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
    setNotice(formatMessage(ko["backingLoop.checkingValue1Files"], { value1: files.length }));
    setPhaseImmediate("loading");

    try {
      const { imported, rejected } = await prepareImportedBackingAudioSources(files, {
        onProgress: ({ completed, total }) => {
          if (mountedRef.current && operationVersion === operationVersionRef.current) {
            setNotice(formatMessage(ko["backingLoop.checkingBackingFileValue1Value2"], { value1: completed, value2: total }));
          }
        },
      });
      if (!mountedRef.current || operationVersion !== operationVersionRef.current) return;
      if (!imported.length) {
        setNotice(ko["backingLoop.noSupportedAudioToImportCheckYourMp3WavM4aOrAac"]);
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
      const targetTitle = getBackingPlaylistById(nextPlaylistState, importTargetId)?.title || ko["backingLoop.currentPlaylist"];
      setNotice(storageFailureCount
        ? formatMessage(ko["backingLoop.addedValue1FilesToValue2ButCouldnTStoreValue3Permanently"], { value1: persistedRecordings.length, value2: targetTitle, value3: storageFailureCount })
        : rejected.length
          ? formatMessage(ko["backingLoop.addedValue1FilesToValue2ExcludedValue3Files"], { value1: persistedRecordings.length, value2: targetTitle, value3: rejected.length })
          : formatMessage(ko["backingLoop.addedValue1FilesToValue2"], { value1: persistedRecordings.length, value2: targetTitle }));
      setDialog("load");
      setPhaseImmediate("idle");
    } catch {
      if (!mountedRef.current || operationVersion !== operationVersionRef.current) return;
      setNotice(ko["backingLoop.checkThatThisBrowserCanDecodeTheAudioFiles"]);
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
        ? formatMessage(ko["backingLoop.selectedValue1ExcludedValue2Files"], { value1: selected.recording.fileName, value2: importRejectedCount })
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
    if (recording?.sourceType === BACKING_AUDIO_SOURCE_TYPES.GROOVE) return;
    if (!recording?.blob || ["armed", "recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(phaseRef.current)) return;
    const operationVersion = ++operationVersionRef.current;
    resetAudioPosition();
    setPhaseImmediate("processing");
    setNotice(ko["backingLoop.preparingWaveformForEditing"]);
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
      setNotice(ko["backingLoop.youCanTrimAgainFromTheFullOriginalRange"]);
      setPhaseImmediate("trimming");
    } catch {
      if (!mountedRef.current || operationVersion !== operationVersionRef.current) return;
      setNotice(ko["backingLoop.couldnTLoadTheCurrentBackingWaveform"]);
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
      ? ko["backingLoop.usingTheOriginalRecordingTrimItAnytimeInEdit"]
      : ko["backingLoop.canceledThisTrimThePreviousBackingStateIsKept"]);
    setPhaseImmediate("idle");
  }, [setPhaseImmediate, stopTrimPreview, trimDraft]);

  const applyTrim = useCallback(async () => {
    if (!trimDraft?.recording || !trimDraft.audioData || phaseRef.current === "applying") return;
    stopTrimPreview(false);
    setPhaseImmediate("applying");
    setNotice(ko["backingLoop.preparingTheSelectedRangeAsALoop"]);
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
        ? ko["backingLoop.selectionAppliedPressPlayOrSave"]
        : ko["backingLoop.fullOriginalRangeAppliedPressPlayOrSave"]);
      setPhaseImmediate("idle");
    } catch {
      if (!mountedRef.current) return;
      setNotice(ko["backingLoop.couldnTApplyTheRangeTheOriginalIsKept"]);
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
      setNotice(ko["backingLoop.couldnTPreviewTheSelection"]);
    } finally {
      trimPreviewRequestRef.current = false;
    }
  }, [clearTrimPreviewTimer, stopTrimPreview, trimDraft, trimEndMs, trimPreviewPlaying, trimStartMs]);

  const requestSaveConfirmation = useCallback(() => {
    if (!recording?.blob || phaseRef.current === "saving") return;
    const title = normalizeBackingLoopTitle(titleDraft);
    if (!title) {
      setSaveError(ko["backingLoop.enterATitle"]);
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
      setNotice(ko["backingLoop.selectTracksToRemove"]);
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
    setNotice(formatMessage(ko["backingLoop.removedValue2SelectedTracksFromValue1AudioFilesAreKept"], { value1: playlist.title, value2: itemIds.length }));
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

  const addGrooveToPlaylist = useCallback((id) => {
    if (!listGrooveBackingSources().some(item => item.id === id)) return;
    const target = getBackingPlaylistById(playlistStateRef.current, playlistLibraryTargetId)
      || getActiveBackingPlaylist(playlistStateRef.current);
    commitPlaylistState(state => addBackingPlaylistItems(state, target.id, [id]));
    setNotice(ko["backingLoop.groovePackLinkedItsOriginalPatternAndBpmAreShared"]);
    setPlaylistLibraryPickerOpen(false);
  }, [commitPlaylistState, playlistLibraryTargetId]);

  const saveCurrentPlaylist = useCallback(() => {
    const saveTarget = playlistStateRef.current.savedPlaylists.find((playlist) => playlist.id === playlistSaveTargetId);
    const title = saveTarget?.title || playlistRenameDraft.trim();
    const currentPlaylist = getActiveBackingPlaylist(playlistStateRef.current);
    if (!currentPlaylist.itemIds.length) {
      setNotice(ko["backingLoop.addTracksToTheCurrentPlaylistBeforeSaving"]);
      return;
    }
    if (!title) {
      setNotice(ko["backingLoop.enterAPlaylistName"]);
      return;
    }
    const itemIds = currentPlaylist.itemIds.filter((itemId) => selectedQueueItemIds.includes(itemId));
    if (!itemIds.length) {
      setNotice(ko["backingLoop.selectTracksToSaveAsAPlaylist"]);
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
      ? formatMessage(ko["backingLoop.updatedValue2WithValue1SelectedTracks"], { value1: itemIds.length, value2: saveTarget.title })
      : formatMessage(ko["backingLoop.savedValue1SelectedTracksAsValue2"], { value1: itemIds.length, value2: saved?.title || title }));
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
    setNotice(formatMessage(ko["backingLoop.loadedValue1IntoTheCurrentPlaylist"], { value1: savedPlaylist.title }));
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
    setNotice(formatMessage(ko["backingLoop.deletedSavedPlaylistValue1OnlyAudioFilesAreKept"], { value1: target.title }));
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
      const audio = getPlaybackAudio();
      if (audio) {
        audio.loop = shouldLoopBackingTrack(nextMode, Boolean(playlistPlaybackRef.current.playlistId), playlistPlaybackRef.current.itemIds?.length);
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
    if (recording?.sourceType === BACKING_AUDIO_SOURCE_TYPES.GROOVE) return;
    if (!recording?.blob || phaseRef.current === "saving") return;
    const title = normalizeBackingLoopTitle(titleDraft);
    if (!title) {
      setSaveError(ko["backingLoop.enterATitle"]);
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
      setNotice(formatMessage(ko["backingLoop.savedValue1"], { value1: savedRecording.title }));
      setDialog("");
      setLibraryEditMode(false);
      setSelectedLibraryIds([]);
      setPhaseImmediate("idle");
    } catch {
      if (!mountedRef.current) return;
      setSaveError(ko["backingLoop.storageIsUnavailable"]);
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
      const savedRecording = (isGrooveBackingId(id)
        ? await loadGrooveBackingSource(id)
        : isAudioStudioLibraryId(id)
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
      setNotice(options.notice || formatMessage(ko["backingLoop.loadedValue1"], { value1: savedRecording.title }));
      setDialog(keepLibraryOpen ? "load" : "");
      setPhaseImmediate("idle");
      return savedRecording;
    } catch {
      if (!mountedRef.current) return;
      setNotice(ko["backingLoop.couldnTLoadTheSavedBackingTrack"]);
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
      notice: formatMessage(ko["backingLoop.value1ReadyToPlay"], { value1: playbackPlaylist.title }),
    });
    if (!loaded) {
      playlistAutoplayRef.current = false;
      playlistPlaybackRef.current = { itemId: "", playlistId: "" };
      setPlaylistPlaybackActive(false);
      return;
    }
    setPlaylistAutoplayRequest((currentRequest) => currentRequest + 1);
  }, [dialog, loadRecording, selectedPlaylistItemId]);

  const playSelectedQueueItems = useCallback(() => {
    const activePlaylist = getActiveBackingPlaylist(playlistStateRef.current);
    const itemIds = activePlaylist.itemIds.filter((itemId) => selectedQueueItemIds.includes(itemId));
    if (!itemIds.length) {
      setNotice(ko["backingLoop.chooseATrackToPlay"]);
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
      setNotice(ko["backingLoop.noTracksToPlay"]);
      return;
    }
    playPlaylistItem(playlist.itemIds[0], { itemIds: playlist.itemIds, playlistId: playlist.id });
  }, [playPlaylistItem]);

  const playSelectedSavedPlaylistItems = useCallback((playlistId) => {
    const playlist = getBackingPlaylistById(playlistStateRef.current, playlistId);
    if (!playlist || playlist.id === playlistStateRef.current.currentQueue.id) return;
    const itemIds = playlist.itemIds.filter((itemId) => selectedSavedItemIds.includes(itemId));
    if (!itemIds.length) {
      setNotice(ko["backingLoop.chooseATrackToPlay"]);
      return;
    }
    playPlaylistItem(itemIds[0], { itemIds, playlistId: playlist.id });
  }, [playPlaylistItem, selectedSavedItemIds]);

  useEffect(() => {
    if (!playlistAutoplayRef.current
      || !isBackingPlaybackSourceReady(audioSource, recording)
      || recording?.id !== playlistPlaybackRef.current.itemId) return undefined;
    playlistAutoplayRef.current = false;
    const frameId = window.requestAnimationFrame(() => playRecording());
    return () => window.cancelAnimationFrame(frameId);
  }, [audioSource, playRecording, playlistAutoplayRequest, recording?.id]);

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
    const audio = getPlaybackAudio();
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
      setNotice(ko["backingLoop.playingTheCurrentBackingFromTheStart"]);
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
      setNotice(savedIds.length > 1 ? formatMessage(ko["backingLoop.deletedValue1SavedBackingTracks"], { value1: savedIds.length }) : ko["backingLoop.savedBackingDeleted"]);
      setDialog("load");
      if (deletingCurrent) setPhaseImmediate("idle");
    } catch {
      if (!mountedRef.current) return;
      setNotice(ko["backingLoop.couldnTDeleteSavedBacking"]);
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
    const audio = getPlaybackAudio();
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
    const audio = getPlaybackAudio();
    if (!audio || phaseRef.current !== "playing") return;
    const playback = playlistPlaybackRef.current;
    if (!playback.playlistId) {
      if (!shouldLoopBackingTrack(playlistStateRef.current.playbackMode)) {
        audio.pause();
        setNotice(ko["backingLoop.backingPlaybackFinished"]);
        setPhaseImmediate("idle");
        return;
      }
      audio.currentTime = 0;
      setCurrentTimeMs(0);
      audio.play().catch(() => {
        setNotice(ko["backingLoop.couldnTContinueLoopingPressPlayAgain"]);
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
      setNotice(formatMessage(ko["backingLoop.value1PlaylistFinished"], { value1: activePlaybackList.title }));
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
    const loaded = await loadRecording(nextItemId, {
      fromPlaylist: true,
      keepLibraryOpen: dialog === "load",
      notice: formatMessage(ko["backingLoop.preparingNextBackingInValue1"], { value1: activePlaybackList.title }),
    });
    if (loaded) setPlaylistAutoplayRequest((currentRequest) => currentRequest + 1);
  }, [dialog, loadRecording, setPhaseImmediate]);
  playbackEndedRef.current = handlePlaybackEnded;

  const handleLoadedMetadata = useCallback(() => {
    const audio = getPlaybackAudio();
    if (audio) {
      audio.loop = shouldLoopBackingTrack(
        playlistStateRef.current.playbackMode,
        Boolean(playlistPlaybackRef.current.playlistId),
        playlistPlaybackRef.current.itemIds?.length,
      );
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
  navigationCleanupRef.current = () => {
    closeDialog();
    setDialog("");
    stopTrimPreview();
  };
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
    addGrooveToPlaylist,
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
    isGroove: recording?.sourceType === BACKING_AUDIO_SOURCE_TYPES.GROOVE,
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
    stopPlayback,
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
