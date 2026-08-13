import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteBackingLoopRecording,
  loadBackingLoopLibrary,
  loadBackingLoopRecording,
  saveBackingLoopRecording,
} from "./backingLoopStorage";
import {
  BACKING_LOOP_DEFAULT_TITLE,
  createBackingLoopId,
  getBackingLoopStatus,
  getPreferredBackingLoopMimeType,
  normalizeBackingLoopTitle,
} from "./backingLoopUtils";

const GUITAR_AUDIO_CONSTRAINTS = {
  autoGainControl: false,
  channelCount: 1,
  echoCancellation: false,
  noiseSuppression: false,
};

export default function useBackingLoop() {
  const [audioUrl, setAudioUrl] = useState("");
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [dialog, setDialog] = useState("");
  const [library, setLibrary] = useState([]);
  const [notice, setNotice] = useState("");
  const [phase, setPhase] = useState("idle");
  const [recording, setRecording] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const audioRef = useRef(null);
  const chunksRef = useRef([]);
  const discardRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const mountedRef = useRef(true);
  const playbackTimerRef = useRef(null);
  const recordingRequestVersionRef = useRef(0);
  const recordingStartedAtRef = useRef(0);
  const recordingTimerRef = useRef(null);
  const streamRef = useRef(null);

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current != null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const clearPlaybackTimer = useCallback(() => {
    if (playbackTimerRef.current != null) {
      window.clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }, []);

  const releaseMicrophone = useCallback(() => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const resetAudioPosition = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // The next loadedmetadata event will establish the initial position.
      }
    }
    clearPlaybackTimer();
    setCurrentTimeMs(0);
  }, [clearPlaybackTimer]);

  const pausePlayback = useCallback(() => {
    if (phase !== "playing") return;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setCurrentTimeMs(Math.max(0, audio.currentTime * 1000));
    }
    clearPlaybackTimer();
    setNotice("일시정지 · PLAY로 이어서 재생");
    setPhase("paused");
  }, [clearPlaybackTimer, phase]);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    loadBackingLoopLibrary()
      .then((savedRecordings) => {
        if (!cancelled) setLibrary(savedRecordings);
      })
      .catch(() => {
        if (!cancelled) setNotice("저장 공간을 사용할 수 없지만 녹음과 재생은 가능합니다.");
      });

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

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

  useEffect(() => () => {
    clearPlaybackTimer();
    clearRecordingTimer();
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
    }
    audioRef.current?.pause();
    releaseMicrophone();
  }, [clearPlaybackTimer, clearRecordingTimer, releaseMicrophone]);

  const stopRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;
    mediaRecorder.stop();
  }, []);

  const startRecording = useCallback(async () => {
    if (["requesting", "recording", "saving", "loading"].includes(phase)) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder !== "function") {
      setNotice("이 브라우저에서는 마이크 녹음을 지원하지 않아요.");
      setPhase("error");
      return;
    }

    resetAudioPosition();
    discardRecordingRef.current = false;
    setDialog("");
    setNotice("");
    setPhase("requesting");
    const requestVersion = ++recordingRequestVersionRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: GUITAR_AUDIO_CONSTRAINTS });
      if (!mountedRef.current || requestVersion !== recordingRequestVersionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const mimeType = getPreferredBackingLoopMimeType(window.MediaRecorder);
      let mediaRecorder;
      try {
        mediaRecorder = new window.MediaRecorder(stream, mimeType ? { audioBitsPerSecond: 128000, mimeType } : undefined);
      } catch {
        mediaRecorder = new window.MediaRecorder(stream);
      }

      chunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorder.onerror = () => {
        clearRecordingTimer();
        releaseMicrophone();
        if (!mountedRef.current) return;
        setNotice("녹음 중 문제가 발생했어요. 이전 백킹은 그대로 유지됩니다.");
        setPhase("error");
      };
      mediaRecorder.onstop = () => {
        clearRecordingTimer();
        releaseMicrophone();
        if (!mountedRef.current) return;

        const durationMs = Math.max(0, performance.now() - recordingStartedAtRef.current);
        const blobType = mediaRecorder.mimeType || mimeType || chunksRef.current[0]?.type || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        mediaRecorderRef.current = null;
        chunksRef.current = [];

        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          setRecording(null);
          setCurrentTimeMs(0);
          setNotice("현재 작업을 취소했어요. 저장된 백킹은 그대로 유지됩니다.");
          setPhase("idle");
          return;
        }

        if (blob.size === 0) {
          setNotice("녹음된 소리가 없어요. 이전 백킹은 그대로 유지됩니다.");
          setPhase("error");
          return;
        }

        setRecording({
          blob,
          createdAt: Date.now(),
          durationMs,
          id: "",
          mimeType: blobType,
          title: BACKING_LOOP_DEFAULT_TITLE,
        });
        setCurrentTimeMs(0);
        setNotice("녹음 완료 · 바로 PLAY하거나 제목을 정해 SAVE하세요.");
        setPhase("idle");
      };

      recordingStartedAtRef.current = performance.now();
      setCurrentTimeMs(0);
      setPhase("recording");
      mediaRecorder.start(250);
      recordingTimerRef.current = window.setInterval(() => {
        setCurrentTimeMs(performance.now() - recordingStartedAtRef.current);
      }, 160);
    } catch (error) {
      releaseMicrophone();
      if (!mountedRef.current || requestVersion !== recordingRequestVersionRef.current) return;
      const denied = error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError";
      setNotice(denied
        ? "마이크 권한을 허용한 뒤 다시 눌러주세요. 이전 백킹은 유지됩니다."
        : "사용 가능한 마이크를 확인해주세요. 이전 백킹은 유지됩니다.");
      setPhase("error");
    }
  }, [clearRecordingTimer, phase, releaseMicrophone, resetAudioPosition]);

  const toggleRecording = useCallback(() => {
    if (phase === "recording") {
      stopRecording();
      return;
    }
    startRecording();
  }, [phase, startRecording, stopRecording]);

  const cancelCurrent = useCallback(() => {
    if (["saving", "loading"].includes(phase)) return;

    recordingRequestVersionRef.current += 1;
    setDialog("");
    setSaveError("");
    resetAudioPosition();
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
    setCurrentTimeMs(0);
    setNotice("현재 작업을 취소했어요. 저장된 백킹은 그대로 유지됩니다.");
    setPhase("idle");
  }, [clearRecordingTimer, phase, releaseMicrophone, resetAudioPosition]);

  const playRecording = useCallback(async () => {
    if (!recording?.blob || !audioRef.current || !audioUrl) return;
    if (["recording", "requesting", "saving", "loading"].includes(phase)) return;

    try {
      const audio = audioRef.current;
      audio.loop = true;
      if (!Number.isFinite(audio.currentTime) || audio.currentTime >= (audio.duration || Infinity)) {
        audio.currentTime = 0;
      }
      await audio.play();
      setNotice("무한 반복 재생 중");
      setPhase("playing");
    } catch {
      setNotice("녹음을 재생할 수 없어요. 다시 녹음하거나 다른 백킹을 LOAD해주세요.");
      setPhase("error");
    }
  }, [audioUrl, phase, recording?.blob]);

  const togglePlayback = useCallback(() => {
    if (phase === "playing") {
      pausePlayback();
      return;
    }
    playRecording();
  }, [pausePlayback, phase, playRecording]);

  const resetPlayback = useCallback(() => {
    if (!recording?.blob || ["recording", "requesting", "saving", "loading"].includes(phase)) return;
    resetAudioPosition();
    setNotice("재생 위치를 처음으로 되돌렸어요.");
    setPhase("idle");
  }, [phase, recording?.blob, resetAudioPosition]);

  const openSaveDialog = useCallback(() => {
    if (!recording?.blob || ["recording", "requesting", "saving", "loading", "playing"].includes(phase)) return;
    setSaveError("");
    setTitleDraft(recording.title === BACKING_LOOP_DEFAULT_TITLE ? "" : recording.title);
    setDialog("save");
  }, [phase, recording]);

  const openLoadDialog = useCallback(() => {
    if (["recording", "requesting", "saving", "loading"].includes(phase)) return;
    setDialog("load");
  }, [phase]);

  const openDeleteDialog = useCallback(() => {
    if (!recording?.id || ["recording", "requesting", "saving", "loading"].includes(phase)) return;
    if (phase === "playing") pausePlayback();
    setDialog("delete");
  }, [pausePlayback, phase, recording?.id]);

  const closeDialog = useCallback(() => {
    if (["saving", "loading"].includes(phase)) return;
    setDialog("");
    setSaveError("");
  }, [phase]);

  const confirmSave = useCallback(async () => {
    if (!recording?.blob || phase === "saving") return;
    const title = normalizeBackingLoopTitle(titleDraft);
    if (!title) {
      setSaveError("제목을 입력해주세요.");
      return;
    }

    setPhase("saving");
    setSaveError("");
    try {
      const savedRecording = await saveBackingLoopRecording({
        ...recording,
        id: recording.id || createBackingLoopId(),
        title,
      });
      if (!mountedRef.current) return;
      setRecording(savedRecording);
      setLibrary((currentLibrary) => [
        savedRecording,
        ...currentLibrary.filter((item) => item.id !== savedRecording.id),
      ]);
      setCurrentTimeMs(0);
      setNotice(`“${savedRecording.title}” 저장 완료`);
      setDialog("");
      setPhase("idle");
    } catch {
      if (!mountedRef.current) return;
      setSaveError("저장 공간을 사용할 수 없어요.");
      setPhase("idle");
    }
  }, [phase, recording, titleDraft]);

  const loadRecording = useCallback(async (id) => {
    if (!id || phase === "loading") return;
    setPhase("loading");
    resetAudioPosition();
    try {
      const savedRecording = await loadBackingLoopRecording(id);
      if (!mountedRef.current) return;
      if (!savedRecording) throw new Error("Saved backing loop not found.");
      setRecording(savedRecording);
      setCurrentTimeMs(0);
      setNotice(`“${savedRecording.title}” 불러오기 완료`);
      setDialog("");
      setPhase("idle");
    } catch {
      if (!mountedRef.current) return;
      setNotice("저장된 백킹을 불러올 수 없어요.");
      setPhase("error");
    }
  }, [phase, resetAudioPosition]);

  const confirmDelete = useCallback(async () => {
    if (!recording?.id) return;
    const savedId = recording.id;
    setPhase("loading");
    resetAudioPosition();

    try {
      await deleteBackingLoopRecording(savedId);
      if (!mountedRef.current) return;
      setLibrary((currentLibrary) => currentLibrary.filter((item) => item.id !== savedId));
      setRecording(null);
      setCurrentTimeMs(0);
      setNotice("저장된 백킹을 삭제했어요.");
      setDialog("");
      setPhase("idle");
    } catch {
      if (!mountedRef.current) return;
      setNotice("저장된 백킹을 삭제하지 못했어요.");
      setPhase("error");
    }
  }, [recording, resetAudioPosition]);

  const seekPlayback = useCallback((nextTimeMs) => {
    if (!recording?.blob || phase === "recording" || phase === "requesting") return;
    const durationMs = Math.max(0, Number(recording.durationMs) || 0);
    if (!durationMs) return;
    const safeTimeMs = Math.min(durationMs, Math.max(0, Number(nextTimeMs) || 0));
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.currentTime = safeTimeMs / 1000;
      } catch {
        return;
      }
    }
    setCurrentTimeMs(safeTimeMs);
  }, [phase, recording]);

  const handlePlaybackEnded = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || phase !== "playing") return;
    audio.currentTime = 0;
    setCurrentTimeMs(0);
    audio.play().catch(() => {
      setNotice("반복 재생을 계속할 수 없어요. PLAY를 다시 눌러주세요.");
      setPhase("error");
    });
  }, [phase]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.loop = true;
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
    }
    if (phase !== "paused" && phase !== "playing") setCurrentTimeMs(0);
  }, [phase]);

  const hasRecording = Boolean(recording?.blob);
  const durationMs = hasRecording ? Math.max(0, Number(recording.durationMs) || 0) : 0;
  const displayTimeMs = ["recording", "playing", "paused"].includes(phase)
    ? currentTimeMs
    : durationMs;
  const status = useMemo(() => getBackingLoopStatus({
    elapsedMs: currentTimeMs,
    hasRecording,
    phase,
  }), [currentTimeMs, hasRecording, phase]);

  return {
    audioRef,
    audioUrl,
    cancelCurrent,
    closeDialog,
    confirmDelete,
    confirmSave,
    currentTimeMs,
    dialog,
    displayTimeMs,
    durationMs,
    handleLoadedMetadata,
    handlePlaybackEnded,
    hasRecording,
    isPaused: phase === "paused",
    isPlaying: phase === "playing",
    isRecording: phase === "recording",
    library,
    loadRecording,
    notice,
    openDeleteDialog,
    openLoadDialog,
    openSaveDialog,
    pausePlayback,
    phase,
    playRecording,
    recording,
    resetPlayback,
    saveError,
    seekPlayback,
    setTitleDraft,
    status,
    title: recording?.title || BACKING_LOOP_DEFAULT_TITLE,
    titleDraft,
    togglePlayback,
    toggleRecording,
  };
}
