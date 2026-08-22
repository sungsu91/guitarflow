import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, ListMusic, Mic, Music2, Pause, Play, Plus, Repeat2, RotateCcw, Save, Scissors, Shuffle, SkipBack, SkipForward, Square, Trash2, Volume2, VolumeX, X } from "lucide-react";
import { BACKING_AUDIO_SOURCE_TYPES } from "../backing-loop/backingAudioSource";
import { formatBackingLoopTime } from "../backing-loop/backingLoopUtils";
import useBackingLoop from "../backing-loop/useBackingLoop";

function MobileBackingLoopHardware() {
  return (
    <div aria-hidden="true" className="backingLoopRecorderHardware">
      <i className="backingLoopGrille backingLoopGrille--left" />
      <i className="backingLoopGrille backingLoopGrille--right" />
    </div>
  );
}

function BackingLoopProgress({ controller }) {
  const isCapturePhase = ["requesting", "armed", "recording", "processing"].includes(controller.phase);
  if (isCapturePhase) {
    const level = Math.round(Math.max(0, Math.min(1, controller.inputLevel?.normalized || 0)) * 100);
    return (
      <div
        aria-label={`기타 입력 레벨 ${level}%${controller.inputLevel?.clipping ? ", 피크" : ""}`}
        aria-valuemax="100"
        aria-valuemin="0"
        aria-valuenow={level}
        className={`backingLoopInputMeter backingLoopInputMeter--${controller.inputLevel?.state || "low"}`}
        role="meter"
      >
        <i aria-hidden="true" style={{ "--backing-loop-input-level": `${level}%` }} />
        {controller.inputLevel?.clipping ? <span>PEAK</span> : null}
      </div>
    );
  }

  const durationMs = Math.max(0, controller.durationMs);
  const positionMs = Math.min(durationMs, Math.max(0, controller.currentTimeMs));
  const progress = durationMs ? (positionMs / durationMs) * 100 : 0;
  const isDisabled = !controller.hasRecording || ["recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(controller.phase);

  return (
    <div className={`backingLoopProgress ${isDisabled ? "is-disabled" : ""}`}>
      <input
        aria-label="백킹 루프 재생 위치"
        disabled={isDisabled}
        max={Math.max(1, durationMs)}
        min="0"
        onChange={(event) => controller.seekPlayback(event.target.value)}
        step="10"
        style={{ "--backing-loop-progress": `${progress}%` }}
        type="range"
        value={positionMs}
      />
    </div>
  );
}

function BackingLoopVolume({ controller, mobile = false }) {
  const percentage = controller.backingVolumePercent;
  const muted = controller.isBackingMuted;
  const [popoverOpen, setPopoverOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!popoverOpen) return undefined;
    const closeFromOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setPopoverOpen(false);
    };
    const closeFromKeyboard = (event) => {
      if (event.key === "Escape") setPopoverOpen(false);
    };
    document.addEventListener("pointerdown", closeFromOutside, true);
    document.addEventListener("keydown", closeFromKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside, true);
      document.removeEventListener("keydown", closeFromKeyboard);
    };
  }, [popoverOpen]);

  return (
    <div
      className={`backingLoopVolumeMenu ${mobile ? "backingLoopVolumeMenu--mobile" : "backingLoopVolumeMenu--desktop"}`}
      data-open={popoverOpen ? "true" : "false"}
      onMouseEnter={() => setPopoverOpen(true)}
      onMouseLeave={() => setPopoverOpen(false)}
      ref={menuRef}
      style={{ "--backing-loop-volume": `${percentage}%` }}
    >
      <button
        aria-expanded={popoverOpen}
        aria-label={muted ? "백킹 볼륨 음소거 해제" : "백킹 볼륨 음소거"}
        aria-pressed={muted}
        className="backingLoopPlayerIconButton backingLoopVolumeMute"
        onClick={() => {
          controller.toggleBackingMute();
          setPopoverOpen(true);
        }}
        onFocus={() => setPopoverOpen(true)}
        title={muted ? "음소거 해제" : "음소거 · 마우스를 올리면 볼륨 조절"}
        type="button"
      >
        {muted
          ? <VolumeX aria-hidden="true" size={mobile ? 18 : 17} strokeWidth={2.2} />
          : <Volume2 aria-hidden="true" size={mobile ? 18 : 17} strokeWidth={2.2} />}
      </button>
      <div aria-label="백킹 볼륨 조절" className="backingLoopVolumePopover" role="group">
        <label className="backingLoopVolumeSlider">
          <span className="backingLoopScreenReaderStatus">백킹 볼륨</span>
          <input
            aria-label="백킹 볼륨"
            max="100"
            min="0"
            onChange={(event) => controller.setBackingVolume(Number(event.target.value) / 100)}
            step="1"
            type="range"
            value={percentage}
          />
        </label>
        <output aria-live="polite" className="backingLoopVolumeValue">{percentage}%</output>
      </div>
    </div>
  );
}

function BackingLoopPlayerBar({ controller, mobile = false }) {
  const busy = ["armed", "recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(controller.phase);
  const hasPlaylistItems = controller.playlistPlaybackItemCount > 0;
  const canPlay = controller.hasRecording || hasPlaylistItems;
  const repeatMode = controller.playlistPlaybackMode;
  const repeatActive = repeatMode === "repeat-all" || repeatMode === "repeat-one";
  const repeatLabel = repeatMode === "repeat-all"
    ? "한 곡 반복으로 변경"
    : repeatMode === "repeat-one"
      ? "반복 재생 끄기"
      : "전체 반복 켜기";
  return (
    <div className="backingLoopPlayerBar" aria-label="백킹 공용 재생 컨트롤">
      <div className="backingLoopPlayerTransport">
        <button
          aria-label="이전 백킹 또는 현재 백킹 처음부터"
          className="backingLoopPlayerIconButton"
          disabled={!hasPlaylistItems || busy}
          onClick={controller.playPreviousPlaylistItem}
          type="button"
        >
          <SkipBack aria-hidden="true" size={mobile ? 17 : 18} />
        </button>
        <button
          aria-label={controller.isPlaying ? "백킹 일시정지" : "백킹 재생"}
          aria-pressed={controller.isPlaying}
          className="backingLoopPlayerPlayButton"
          disabled={!canPlay || busy}
          onClick={controller.togglePlayerPlayback}
          type="button"
        >
          {controller.isPlaying
            ? <Pause aria-hidden="true" size={mobile ? 20 : 19} />
            : <Play aria-hidden="true" size={mobile ? 20 : 19} />}
        </button>
        <button
          aria-label="다음 백킹"
          className="backingLoopPlayerIconButton"
          disabled={!hasPlaylistItems || busy}
          onClick={controller.playNextPlaylistItem}
          type="button"
        >
          <SkipForward aria-hidden="true" size={mobile ? 17 : 18} />
        </button>
      </div>
      <div className="backingLoopPlayerModes">
        <button
          aria-label={repeatLabel}
          aria-pressed={repeatActive}
          className={`backingLoopPlayerIconButton backingLoopRepeatButton ${repeatActive ? "active" : ""}`}
          data-repeat-mode={repeatMode}
          onClick={controller.cyclePlaylistRepeatMode}
          title={repeatMode === "repeat-one" ? "한 곡 반복" : repeatMode === "repeat-all" ? "전체 반복" : "반복 꺼짐 · 목록 1회 재생"}
          type="button"
        >
          <Repeat2 aria-hidden="true" size={22} strokeWidth={2.15} />
          {repeatMode === "repeat-all" ? (
            <b aria-hidden="true" className="backingLoopRepeatState backingLoopRepeatState--all">•</b>
          ) : null}
          {repeatMode === "repeat-one" ? (
            <b aria-hidden="true" className="backingLoopRepeatState backingLoopRepeatState--one">1</b>
          ) : null}
        </button>
        <button
          aria-label={controller.playlistShuffleEnabled ? "셔플 끄기" : "셔플 켜기"}
          aria-pressed={controller.playlistShuffleEnabled}
          className={`backingLoopPlayerIconButton backingLoopShuffleButton ${controller.playlistShuffleEnabled ? "active" : ""}`}
          onClick={controller.togglePlaylistShuffle}
          title={controller.playlistShuffleEnabled ? "셔플 켜짐" : "셔플 꺼짐"}
          type="button"
        >
          <Shuffle aria-hidden="true" size={21} strokeWidth={2.15} />
          {controller.playlistShuffleEnabled ? (
            <b aria-hidden="true" className="backingLoopShuffleState">•</b>
          ) : null}
        </button>
      </div>
      <div className="backingLoopPlayerUtilities">
        <BackingLoopVolume controller={controller} mobile={mobile} />
        <button
          aria-expanded={controller.playlistDrawerOpen}
          aria-label={controller.playlistDrawerOpen ? "Playlist 닫기" : "Playlist 열기"}
          className={`backingLoopPlayerIconButton backingLoopPlaylistToggle ${controller.playlistDrawerOpen ? "active" : ""}`}
          disabled={busy}
          onClick={controller.togglePlaylistDrawer}
          type="button"
        >
          <span aria-hidden="true" className="backingLoopPlaylistToggleLabel">LIST</span>
          {controller.playlistDrawerOpen
            ? <ChevronDown aria-hidden="true" size={mobile ? 17 : 17} />
            : <ChevronUp aria-hidden="true" size={mobile ? 17 : 17} />}
        </button>
      </div>
    </div>
  );
}

function BackingLoopTrackInfo({ controller, mobile = false }) {
  const currentTime = formatBackingLoopTime(controller.currentTimeMs);
  const totalTime = formatBackingLoopTime(controller.durationMs);
  const trackTitle = controller.hasRecording ? controller.title : "PLAYLIST EMPTY";
  const trackSource = controller.playlistPlaybackActive
    ? controller.playlistPlayingTitle
    : controller.sourceType === BACKING_AUDIO_SOURCE_TYPES.IMPORT
      ? "IMPORTED AUDIO"
      : controller.hasRecording
        ? "RECORDED LOOP"
        : "OPEN PLAYLIST TO ADD AUDIO";

  return (
    <div className="backingLoopTrackInfo">
      <span aria-hidden="true" className="backingLoopTrackBadge">
        <Music2 size={mobile ? 15 : 17} />
      </span>
      <span className="backingLoopTrackText">
        <strong title={trackTitle}>{trackTitle}</strong>
        <small>{trackSource}</small>
      </span>
      <time aria-label={`${currentTime} / ${totalTime}`}>{currentTime} / {totalTime}</time>
    </div>
  );
}

function MobileBackingLoopPlayer({ controller }) {
  return (
    <div className="backingLoopMiniPlayer backingLoopMiniPlayer--mobile">
      <BackingLoopTrackInfo controller={controller} mobile />
      <BackingLoopProgress controller={controller} />
      <BackingLoopPlayerBar controller={controller} mobile />
    </div>
  );
}

function DesktopBackingLoopPlayer({ controller }) {
  return (
    <div className="backingLoopMiniPlayer backingLoopMiniPlayer--desktop">
      <BackingLoopTrackInfo controller={controller} />
      <BackingLoopProgress controller={controller} />
      <BackingLoopPlayerBar controller={controller} />
    </div>
  );
}

function BackingLoopMainControls({ controller, mobile = false }) {
  const isBusy = ["requesting", "processing", "trimming", "applying", "saving", "loading"].includes(controller.phase);
  const captureActive = controller.isRecording || controller.isArmed;
  const mediaBusy = captureActive || isBusy;
  const canCancel = controller.hasRecording || captureActive || controller.phase === "requesting";
  const showsDelete = controller.hasRecording && !captureActive && !isBusy;
  return (
    <div className={`backingLoopMainControls ${mobile ? "backingLoopMainControls--mobile" : ""}`} aria-label="백킹 녹음 및 파일 컨트롤">
      <button
        aria-label={captureActive ? "기타 녹음 종료" : "기타 녹음 시작"}
        aria-pressed={captureActive}
        className={`backingLoopButton backingLoopRecordButton ${captureActive ? "active" : ""}`}
        disabled={controller.isPlaying || isBusy}
        onClick={controller.toggleRecording}
        type="button"
      >
        {controller.isRecording
          ? <Square aria-hidden="true" size={mobile ? 10 : 12} />
          : <i aria-hidden="true" className="backingLoopRecordDot" />}
        <span>REC</span>
      </button>
      <button
        aria-label="현재 백킹 편집 화면 열기"
        className="backingLoopButton backingLoopEditButton"
        disabled={!controller.hasRecording || mediaBusy}
        onClick={controller.openTrimEditor}
        type="button"
      >
        <Scissors aria-hidden="true" size={13} />
        <span>EDIT</span>
      </button>
      <button
        aria-label={showsDelete ? "현재 백킹 삭제" : "현재 작업 취소"}
        className="backingLoopButton backingLoopCancelButton"
        disabled={!canCancel || ["saving", "loading"].includes(controller.phase)}
        onClick={controller.cancelCurrent}
        type="button"
      >
        <Trash2 aria-hidden="true" size={13} />
        <span>DEL</span>
      </button>
      <button
        aria-label="현재 백킹 제목 지정 후 저장"
        className="backingLoopButton backingLoopSaveButton"
        disabled={!controller.hasRecording || isBusy || controller.isPlaying}
        onClick={controller.openSaveDialog}
        type="button"
      >
        <Save aria-hidden="true" size={13} />
        <span>SAVE</span>
      </button>
    </div>
  );
}

const formatTrimSeconds = (milliseconds) => (Math.max(0, Number(milliseconds) || 0) / 1000).toFixed(2);

function TrimWaveform({ controller }) {
  const activeHandleRef = useRef("");
  const dragOffsetRef = useRef(0);
  const trackRef = useRef(null);
  const selection = controller.trimSelection;
  if (!selection) return null;
  const duration = Math.max(1, selection.durationMs);
  const startPercent = Math.max(0, Math.min(100, (selection.startMs / duration) * 100));
  const endPercent = Math.max(startPercent, Math.min(100, (selection.endMs / duration) * 100));
  const previewPercent = Math.max(startPercent, Math.min(endPercent, (selection.previewPositionMs / duration) * 100));
  const updateFromPointer = (event, handle) => {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    const ratio = Math.max(0, Math.min(1, (event.clientX - dragOffsetRef.current - bounds.left) / bounds.width));
    if (handle === "start") controller.updateTrimStart(ratio * selection.durationMs);
    else controller.updateTrimEnd(ratio * selection.durationMs);
  };
  const handleTrackPointerDown = (event) => {
    event.preventDefault();
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    const pressedHandle = event.target.closest?.(".backingLoopTrimHandle")?.dataset.trimHandle;
    const pointerMs = Math.max(0, Math.min(selection.durationMs,
      ((event.clientX - bounds.left) / bounds.width) * selection.durationMs));
    const handle = pressedHandle || (
      Math.abs(pointerMs - selection.startMs) <= Math.abs(pointerMs - selection.endMs) ? "start" : "end"
    );
    activeHandleRef.current = handle;
    const currentMs = handle === "start" ? selection.startMs : selection.endMs;
    dragOffsetRef.current = pressedHandle
      ? event.clientX - (bounds.left + (currentMs / duration) * bounds.width)
      : 0;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (!pressedHandle) updateFromPointer(event, handle);
  };
  const handleTrackPointerMove = (event) => {
    if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) return;
    if (activeHandleRef.current) updateFromPointer(event, activeHandleRef.current);
  };
  const handleTrackPointerEnd = (event) => {
    activeHandleRef.current = "";
    dragOffsetRef.current = 0;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };
  const handleKeyDown = (event, handle) => {
    const current = handle === "start" ? selection.startMs : selection.endMs;
    const step = event.shiftKey ? 100 : 10;
    let next = current;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") next -= step;
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") next += step;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = selection.durationMs;
    else return;
    event.preventDefault();
    if (handle === "start") controller.updateTrimStart(next);
    else controller.updateTrimEnd(next);
  };

  return (
    <div
      className="backingLoopTrimWaveform"
      onPointerCancel={handleTrackPointerEnd}
      onPointerDown={handleTrackPointerDown}
      onPointerMove={handleTrackPointerMove}
      onPointerUp={handleTrackPointerEnd}
      ref={trackRef}
    >
      <div aria-hidden="true" className="backingLoopTrimBars">
        {selection.waveform.map((peak, index) => (
          <i key={index} style={{ height: `${Math.max(5, Math.round(peak * 100))}%` }} />
        ))}
      </div>
      <i aria-hidden="true" className="backingLoopTrimMask backingLoopTrimMask--start" style={{ width: `${startPercent}%` }} />
      <i aria-hidden="true" className="backingLoopTrimMask backingLoopTrimMask--end" style={{ width: `${100 - endPercent}%` }} />
      <i
        aria-hidden="true"
        className="backingLoopTrimSelection"
        style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
      />
      {controller.trimPreviewPlaying ? (
        <i aria-hidden="true" className="backingLoopTrimPlayhead" style={{ left: `${previewPercent}%` }} />
      ) : null}
      <button
        aria-label={`Trim 시작 ${formatTrimSeconds(selection.startMs)}초`}
        aria-valuemax={selection.durationMs}
        aria-valuemin="0"
        aria-valuenow={Math.round(selection.startMs)}
        aria-valuetext={`${formatTrimSeconds(selection.startMs)}초`}
        className="backingLoopTrimHandle backingLoopTrimHandle--start"
        data-trim-handle="start"
        disabled={controller.phase === "applying"}
        onKeyDown={(event) => handleKeyDown(event, "start")}
        role="slider"
        style={{ left: `${startPercent}%` }}
        type="button"
      />
      <button
        aria-label={`Trim 종료 ${formatTrimSeconds(selection.endMs)}초`}
        aria-valuemax={selection.durationMs}
        aria-valuemin="0"
        aria-valuenow={Math.round(selection.endMs)}
        aria-valuetext={`${formatTrimSeconds(selection.endMs)}초`}
        className="backingLoopTrimHandle backingLoopTrimHandle--end"
        data-trim-handle="end"
        disabled={controller.phase === "applying"}
        onKeyDown={(event) => handleKeyDown(event, "end")}
        role="slider"
        style={{ left: `${endPercent}%` }}
        type="button"
      />
    </div>
  );
}

function TrimBackingLoopDialog({ controller }) {
  const selection = controller.trimSelection;
  if (!selection) return null;
  const applying = controller.phase === "applying";
  return (
    <section className="backingLoopDialog backingLoopTrimDialog">
      <div className="backingLoopDialogHeading backingLoopTrimHeading">
        <div>
          <strong>구간 다듬기</strong>
          <span>앞뒤 준비 시간만 잘라 자연스러운 루프로 만드세요.</span>
        </div>
        <button
          className="backingLoopTrimReset"
          disabled={applying}
          onClick={controller.resetTrimSelection}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={12} />
          RESET
        </button>
      </div>
      <TrimWaveform controller={controller} />
      <div className="backingLoopTrimTimes" aria-label="선택한 백킹 구간">
        <span><small>START</small><strong>{formatTrimSeconds(selection.startMs)}</strong></span>
        <span><small>END</small><strong>{formatTrimSeconds(selection.endMs)}</strong></span>
        <span><small>LENGTH</small><strong>{formatTrimSeconds(selection.lengthMs)}</strong></span>
      </div>
      <div className="backingLoopDialogActions backingLoopTrimActions">
        <button disabled={applying} onClick={controller.toggleTrimPreview} type="button">
          {controller.trimPreviewPlaying
            ? <Square aria-hidden="true" size={12} />
            : <Play aria-hidden="true" size={12} />}
          {controller.trimPreviewPlaying ? "STOP" : "PREVIEW"}
        </button>
        <button disabled={applying} onClick={controller.useOriginalTrimRecording} type="button">CANCEL</button>
        <button className="primary" disabled={applying} onClick={controller.applyTrim} type="button">
          {applying ? "적용 중" : "DONE"}
        </button>
      </div>
      <p className="backingLoopTrimHint">CANCEL은 이번 조정만 취소하며, SAVE 전 원본은 계속 유지됩니다.</p>
    </section>
  );
}

function ClearRecordingDialog({ controller }) {
  return (
    <section className="backingLoopDialog backingLoopClearDialog">
      <div className="backingLoopDialogHeading backingLoopDialogHeading--confirm">
        <div>
          <strong>현재 백킹을 지울까요?</strong>
          <span>현재 패널의 녹음이 제거됩니다. SAVE한 백킹은 저장 목록에 그대로 남습니다.</span>
        </div>
      </div>
      <div className="backingLoopDialogActions">
        <button onClick={controller.closeDialog} type="button">취소</button>
        <button className="danger" onClick={controller.confirmClearRecording} type="button">지우기</button>
      </div>
    </section>
  );
}

function SaveBackingLoopDialog({ controller }) {
  const inputRef = useRef(null);
  useEffect(() => {
    window.setTimeout(() => inputRef.current?.focus(), 40);
  }, []);

  return (
    <form
      className="backingLoopDialog backingLoopSaveDialog"
      onSubmit={(event) => {
        event.preventDefault();
        controller.requestSaveConfirmation();
      }}
    >
      <div className="backingLoopDialogHeading">
        <div>
          <strong>백킹 저장</strong>
          <span>연습할 때 알아보기 쉬운 제목을 적어주세요.</span>
        </div>
        <button aria-label="저장 창 닫기" onClick={controller.closeDialog} type="button"><X size={15} /></button>
      </div>
      <label className="backingLoopTitleField">
        <span>제목</span>
        <input
          aria-label="백킹 제목"
          autoComplete="off"
          maxLength={40}
          onChange={(event) => controller.setTitleDraft(event.target.value)}
          onFocus={(event) => {
            const input = event.currentTarget;
            window.setTimeout(() => input.scrollIntoView({ block: "center", behavior: "smooth" }), 120);
          }}
          placeholder="예: Am Practice"
          ref={inputRef}
          value={controller.titleDraft}
        />
      </label>
      <span aria-live="polite" className="backingLoopDialogError">{controller.saveError}</span>
      <div className="backingLoopDialogActions">
        <button onClick={controller.closeDialog} type="button">취소</button>
        <button className="primary" disabled={controller.phase === "saving"} type="submit">
          {controller.phase === "saving" ? "저장 중" : "저장"}
        </button>
      </div>
    </form>
  );
}

function ConfirmSaveBackingLoopDialog({ controller }) {
  return (
    <section className="backingLoopDialog backingLoopSaveConfirmDialog">
      <div className="backingLoopDialogHeading backingLoopDialogHeading--confirm">
        <div>
          <strong>“{controller.titleDraft.trim() || "현재 백킹"}”을 저장하시겠습니까?</strong>
          <span>현재 녹음과 제목이 저장 목록에 추가됩니다.</span>
        </div>
      </div>
      <div className="backingLoopDialogActions">
        <button onClick={controller.closeDialog} type="button">아니오</button>
        <button className="primary" disabled={controller.phase === "saving"} onClick={controller.confirmSave} type="button">
          {controller.phase === "saving" ? "저장 중" : "저장"}
        </button>
      </div>
    </section>
  );
}

function BackingPlaylistNavigation({ controller }) {
  return (
    <div aria-label="현재 재생목록과 저장 목록 탭" className="backingLoopPlaylistNavigation" role="tablist">
      <button
        aria-selected={controller.playlistPanelView === "queue"}
        className={controller.playlistPanelView === "queue" ? "selected" : ""}
        onClick={controller.showCurrentPlaylist}
        role="tab"
        type="button"
      >
        <ListMusic aria-hidden="true" size={12} />
        현재 재생목록
      </button>
      {controller.savedPlaylists.map((playlist) => (
        <button
          aria-label={`${playlist.title} 저장 목록 열기`}
          aria-selected={controller.playlistPanelView === playlist.id}
          className={controller.playlistPanelView === playlist.id ? "selected" : ""}
          key={playlist.id}
          onClick={() => controller.showSavedPlaylist(playlist.id)}
          role="tab"
          title={playlist.title}
          type="button"
        >
          <Save aria-hidden="true" size={12} />
          <span>저장 · {playlist.title}</span>
        </button>
      ))}
    </div>
  );
}

function BackingAudioStudioPicker({ controller }) {
  const appFiles = controller.library;
  const targetPlaylist = controller.savedPlaylists.find((playlist) => playlist.id === controller.playlistLibraryTargetId)
    || controller.activePlaylist;
  const queueIds = new Set(targetPlaylist.itemIds);
  return (
    <section className="backingLoopAudioStudioPicker">
      <header>
        <div><strong>APP 내 파일</strong><span>앱 보관함의 완성 음원을 “{targetPlaylist.title}”에 추가합니다.</span></div>
        <button aria-label="음원 선택 닫기" onClick={controller.togglePlaylistLibraryPicker} type="button"><X size={12} /></button>
      </header>
      {appFiles.length ? (
        <div className="backingLoopAudioStudioPickerList">
          {appFiles.map((item) => {
            const alreadyAdded = queueIds.has(item.id);
            return (
              <label className={alreadyAdded ? "is-added" : ""} key={item.id}>
                <input
                  aria-label={`${item.title} 선택`}
                  checked={controller.selectedLibraryIds.includes(item.id)}
                  disabled={alreadyAdded}
                  onChange={() => controller.toggleLibraryRecordingSelection(item.id)}
                  type="checkbox"
                />
                <Music2 aria-hidden="true" size={13} />
                <span title={item.title}>{item.title}</span>
                <small>{alreadyAdded ? "추가됨" : formatBackingLoopTime(item.durationMs)}</small>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="backingLoopLibraryEmpty">
          <Music2 aria-hidden="true" size={18} />
          <span>App에 저장된 녹음이나 완성 음원이 아직 없습니다.</span>
        </div>
      )}
      <footer>
        <span>{controller.selectedLibraryIds.length}곡 선택</span>
        <button className="primary" disabled={!controller.selectedLibraryIds.length} onClick={controller.addSelectedLibraryToPlaylist} type="button">선택 파일 추가</button>
      </footer>
    </section>
  );
}

function BackingCurrentPlaylistPane({ controller }) {
  const selectedCount = controller.selectedQueueItemIds.length;
  return (
    <>
      <div className="backingLoopPlaylistActions">
        <button className="primary" onClick={() => controller.togglePlaylistLibraryPicker(controller.activePlaylist.id)} type="button">
          <Plus aria-hidden="true" size={13} />
          App 내 파일 추가
        </button>
        <button onClick={() => controller.openImportFilePicker(controller.activePlaylist.id)} type="button">
          <Plus aria-hidden="true" size={13} />
          기기 파일 추가
        </button>
        <span>{controller.playlistEntries.length}곡</span>
      </div>
      {controller.playlistLibraryPickerOpen ? <BackingAudioStudioPicker controller={controller} /> : null}
      <div className="backingLoopPlaylistSelectionTools">
        <button
          disabled={!controller.playlistEntries.length || selectedCount === controller.playlistEntries.length}
          onClick={controller.selectAllQueueItems}
          type="button"
        >
          전체 선택
        </button>
        <button disabled={!selectedCount} onClick={controller.clearQueueItemSelection} type="button">선택 해제</button>
        <button className="primary" disabled={!selectedCount} onClick={controller.playSelectedQueueItems} type="button">
          <Play aria-hidden="true" size={10} />
          선택 재생
        </button>
        <span>{selectedCount}곡 선택</span>
      </div>
      <div className="backingLoopPlaylistItems">
        {controller.playlistEntries.length ? controller.playlistEntries.map((item, index) => (
          <div
            className={`backingLoopPlaylistItem ${controller.selectedQueueItemIds.includes(item.id) ? "selected" : ""} ${item.id === controller.playlistPlayingItemId ? "playing" : ""}`}
            key={item.id}
          >
            <label className="backingLoopPlaylistItemCheck">
              <input
                aria-label={`${item.title} 목록 선택`}
                checked={controller.selectedQueueItemIds.includes(item.id)}
                onChange={() => controller.toggleQueueItemSelection(item.id)}
                type="checkbox"
              />
            </label>
            <button
              aria-current={item.id === controller.playlistPlayingItemId ? "true" : undefined}
              aria-label={`${item.title} 바로 재생`}
              className="backingLoopPlaylistItemSelect"
              onClick={() => controller.playPlaylistItem(item.id)}
              type="button"
            >
              <b><Play aria-hidden="true" size={9} /></b>
              <span title={item.title}>{item.title}</span>
              <small>{formatBackingLoopTime(item.durationMs)}</small>
            </button>
            <button aria-label={`${item.title} 위로 이동`} disabled={index === 0} onClick={() => controller.movePlaylistItem(item.id, "up")} type="button"><ChevronUp size={12} /></button>
            <button aria-label={`${item.title} 아래로 이동`} disabled={index === controller.playlistEntries.length - 1} onClick={() => controller.movePlaylistItem(item.id, "down")} type="button"><ChevronDown size={12} /></button>
            <button aria-label={`${item.title} Playlist에서 제거`} onClick={() => controller.removePlaylistItem(item.id)} type="button"><X size={12} /></button>
          </div>
        )) : (
          <div className="backingLoopLibraryEmpty">
            <ListMusic aria-hidden="true" size={19} />
            <span>파일 또는 저장된 음원을 추가해 재생목록을 만들어보세요.</span>
          </div>
        )}
      </div>
      <form
        className="backingLoopPlaylistSaveForm"
        onSubmit={(event) => {
          event.preventDefault();
          controller.saveCurrentPlaylist();
        }}
      >
        <div className="backingLoopPlaylistSaveDestination">
          <select
            aria-label="저장할 재생목록 선택"
            onChange={(event) => controller.selectPlaylistSaveTarget(event.target.value)}
            value={controller.playlistSaveTargetId}
          >
            <option value="">새 목록으로 저장</option>
            {controller.savedPlaylists.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>{playlist.title}에 선택 저장</option>
            ))}
          </select>
          {!controller.playlistSaveTargetId ? (
            <input
              aria-label="새 재생목록 이름"
              maxLength={40}
              onChange={(event) => controller.setPlaylistRenameDraft(event.target.value)}
              placeholder="새 목록 이름 (예: 버스킹 세트)"
              value={controller.playlistRenameDraft}
            />
          ) : null}
        </div>
        <button
          className="primary"
          disabled={!selectedCount || (!controller.playlistSaveTargetId && !controller.playlistRenameDraft.trim())}
          type="submit"
        >
          <Save aria-hidden="true" size={12} />
          {controller.playlistSaveTargetId ? "선택 저장" : "목록 저장"}
        </button>
      </form>
    </>
  );
}

function BackingSavedPlaylistPane({ controller }) {
  const playlist = controller.savedPlaylists.find((item) => item.id === controller.playlistPanelView);
  if (!playlist) {
    return (
      <div className="backingLoopLibraryEmpty">
        <Save aria-hidden="true" size={19} />
        <span>현재 재생목록에서 곡을 선택하고 목록을 저장해주세요.</span>
      </div>
    );
  }
  const entries = playlist.itemIds
    .map((itemId) => controller.library.find((item) => item.id === itemId))
    .filter(Boolean);
  const durationMs = entries.reduce((total, item) => total + (item.durationMs || 0), 0);
  const selectedCount = controller.selectedSavedItemIds.length;
  return (
    <div className="backingLoopSavedPlaylistPane">
      <div className="backingLoopSavedPlaylistSummary">
        <div>
          <strong>{playlist.title}</strong>
          <small>{entries.length}곡 · {formatBackingLoopTime(durationMs)}</small>
        </div>
        <button aria-label={`${playlist.title} 제목과 저장 목록 삭제`} className="danger" onClick={() => controller.requestDeletePlaylistTab(playlist.id)} title="목록 제목 삭제" type="button">
          <Trash2 aria-hidden="true" size={13} />
        </button>
      </div>
      <div className="backingLoopPlaylistActions backingLoopSavedPlaylistActions">
        <button className="primary" onClick={() => controller.togglePlaylistLibraryPicker(playlist.id)} type="button">
          <Plus aria-hidden="true" size={13} />
          App 내 파일 추가
        </button>
        <button onClick={() => controller.openImportFilePicker(playlist.id)} type="button">
          <Plus aria-hidden="true" size={13} />
          기기 파일 추가
        </button>
        <span>{entries.length}곡</span>
      </div>
      {controller.playlistLibraryPickerOpen && controller.playlistLibraryTargetId === playlist.id
        ? <BackingAudioStudioPicker controller={controller} />
        : null}
      <div className="backingLoopPlaylistSelectionTools backingLoopSavedPlaylistSelectionTools">
        <button
          disabled={!entries.length || selectedCount === entries.length}
          onClick={controller.selectAllSavedPlaylistItems}
          type="button"
        >
          전체 선택
        </button>
        <button disabled={!selectedCount} onClick={controller.clearSavedPlaylistItemSelection} type="button">선택 해제</button>
        <button className="primary" disabled={!entries.length} onClick={() => controller.playAllSavedPlaylistItems(playlist.id)} type="button">
          <Play aria-hidden="true" size={10} />
          전체 재생
        </button>
        <button className="primary" disabled={!selectedCount} onClick={() => controller.playSelectedSavedPlaylistItems(playlist.id)} type="button">
          <Play aria-hidden="true" size={10} />
          선택 재생
        </button>
        <button className="danger" disabled={!selectedCount} onClick={() => controller.requestDeleteSavedPlaylistItems(playlist.id)} type="button">
          <Trash2 aria-hidden="true" size={10} />
          선택 제거
        </button>
        <span>{selectedCount}곡 선택</span>
      </div>
      <div className="backingLoopSavedPlaylistTracks">
        {entries.length ? entries.map((item, index) => (
          <div
            className={`${controller.selectedSavedItemIds.includes(item.id) ? "selected" : ""} ${controller.playlistPlayingPlaylistId === playlist.id && item.id === controller.playlistPlayingItemId ? "playing" : ""}`}
            key={item.id}
          >
            <label className="backingLoopPlaylistItemCheck">
              <input
                aria-label={`${item.title} 저장 목록 선택`}
                checked={controller.selectedSavedItemIds.includes(item.id)}
                onChange={() => controller.toggleSavedPlaylistItemSelection(item.id)}
                type="checkbox"
              />
            </label>
            <button
              aria-current={controller.playlistPlayingPlaylistId === playlist.id && item.id === controller.playlistPlayingItemId ? "true" : undefined}
              aria-label={`${item.title} 저장 목록에서 재생`}
              onClick={() => controller.playSavedPlaylistItem(playlist.id, item.id)}
              type="button"
            >
              <b>{index + 1}</b>
              <span title={item.title}>{item.title}</span>
              <small>{formatBackingLoopTime(item.durationMs)}</small>
            </button>
          </div>
        )) : (
          <div className="backingLoopLibraryEmpty">
            <ListMusic aria-hidden="true" size={18} />
            <span>이 목록에 App 내 파일이나 기기 파일을 추가해주세요.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadBackingLoopDialog({ controller }) {
  return (
    <section className="backingLoopDialog backingLoopLoadDialog backingLoopPlaylistDialog">
      <div className="backingLoopDialogHeading">
        <div>
          <strong>PLAYLIST</strong>
        </div>
        <button aria-label="Playlist 닫기" onClick={controller.closeDialog} type="button">
          <ChevronDown size={15} />
        </button>
      </div>
      <BackingPlaylistNavigation controller={controller} />
      {controller.playlistPanelView === "queue"
        ? <BackingCurrentPlaylistPane controller={controller} />
        : <BackingSavedPlaylistPane controller={controller} />}
    </section>
  );
}

function DeleteBackingPlaylistDialog({ controller }) {
  const target = controller.savedPlaylists.find((playlist) => playlist.id === controller.playlistDeleteTargetId);
  return (
    <section className="backingLoopDialog backingLoopDeleteDialog">
      <div className="backingLoopDialogHeading backingLoopDialogHeading--confirm">
        <div>
          <strong>“{target?.title || "선택한 목록"}” 저장 목록을 삭제할까요?</strong>
          <span>저장된 재생 순서만 삭제되며 실제 음원 파일과 현재 재생목록은 유지됩니다.</span>
        </div>
      </div>
      <div className="backingLoopDialogActions">
        <button onClick={controller.closeDialog} type="button">취소</button>
        <button className="danger" disabled={!target} onClick={controller.confirmDeletePlaylistTab} type="button">목록 삭제</button>
      </div>
    </section>
  );
}

function DeleteBackingPlaylistItemsDialog({ controller }) {
  const target = controller.savedPlaylists.find((playlist) => playlist.id === controller.playlistItemsDeleteTargetId);
  const selectedCount = controller.playlistItemsDeleteTargetIds.length;
  return (
    <section className="backingLoopDialog backingLoopDeleteDialog">
      <div className="backingLoopDialogHeading backingLoopDialogHeading--confirm">
        <div>
          <strong>“{target?.title || "선택한 목록"}”에서 {selectedCount}곡을 제거할까요?</strong>
          <span>이 저장 목록에서만 제외되며 App에 보관된 실제 음원 파일은 유지됩니다.</span>
        </div>
      </div>
      <div className="backingLoopDialogActions">
        <button onClick={controller.closeDialog} type="button">취소</button>
        <button className="danger" disabled={!target || !selectedCount} onClick={controller.confirmDeleteSavedPlaylistItems} type="button">선택 제거</button>
      </div>
    </section>
  );
}

function BackingLoopDialogLayer({ controller }) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [playlistAnchorStyle, setPlaylistAnchorStyle] = useState(null);
  const dialogOpen = Boolean(controller.dialog);

  useEffect(() => {
    if (!dialogOpen || typeof document === "undefined") return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.classList.add("backingLoopDialogOpen");
    const handleKeyDown = (event) => {
      if (event.key === "Escape") controller.closeDialog();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("backingLoopDialogOpen");
      window.removeEventListener("keydown", handleKeyDown);
      const previousFocus = previousFocusRef.current;
      previousFocusRef.current = null;
      window.requestAnimationFrame(() => {
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      });
    };
  }, [controller.closeDialog, dialogOpen]);

  useEffect(() => {
    if (!dialogOpen || typeof window === "undefined") return undefined;
    const frameId = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.contains(document.activeElement)) return;
      const focusTarget = dialog.querySelector(
        "[data-dialog-initial-focus], input:not(:disabled), button:not(:disabled), [tabindex]:not([tabindex='-1'])",
      );
      (focusTarget || dialog).focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [controller.dialog, dialogOpen]);

  useLayoutEffect(() => {
    if (!controller.playlistDrawerOpen || typeof window === "undefined") {
      setPlaylistAnchorStyle(null);
      return undefined;
    }

    let frameId = 0;
    const applyPlaylistAnchor = () => {
      if (!window.matchMedia("(max-width: 680px)").matches) {
        setPlaylistAnchorStyle(null);
        return;
      }
      const player = document.querySelector(".backingLoopPanel--mobile .backingLoopMiniPlayer");
      if (!player) {
        setPlaylistAnchorStyle(null);
        return;
      }
      const playerRect = player.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const bottom = Math.max(8, viewportHeight - playerRect.top + 6);
      const maxHeight = Math.max(240, playerRect.top - 20);
      setPlaylistAnchorStyle({
        "--backing-loop-playlist-bottom": `${bottom}px`,
        "--backing-loop-playlist-max-height": `${maxHeight}px`,
      });
    };
    const updatePlaylistAnchor = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(applyPlaylistAnchor);
    };

    applyPlaylistAnchor();
    window.addEventListener("resize", updatePlaylistAnchor);
    window.addEventListener("scroll", updatePlaylistAnchor, true);
    window.visualViewport?.addEventListener("resize", updatePlaylistAnchor);
    window.visualViewport?.addEventListener("scroll", updatePlaylistAnchor);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updatePlaylistAnchor);
      window.removeEventListener("scroll", updatePlaylistAnchor, true);
      window.visualViewport?.removeEventListener("resize", updatePlaylistAnchor);
      window.visualViewport?.removeEventListener("scroll", updatePlaylistAnchor);
    };
  }, [controller.playlistDrawerOpen]);

  if (!controller.dialog || typeof document === "undefined") return null;
  return createPortal(
    <div
      aria-hidden="false"
      className={`backingLoopDialogLayer storageModalLayer ${controller.dialog === "clear-recording" ? "backingLoopDialogLayer--centered" : ""} ${controller.playlistDrawerOpen ? "backingLoopDialogLayer--playlistDrawer" : ""}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) controller.closeDialog();
      }}
      role="presentation"
      style={playlistAnchorStyle || undefined}
    >
      <div aria-modal="true" ref={dialogRef} role="dialog" tabIndex="-1">
        {controller.dialog === "trim" ? <TrimBackingLoopDialog controller={controller} /> : null}
        {controller.dialog === "clear-recording" ? <ClearRecordingDialog controller={controller} /> : null}
        {controller.dialog === "save" ? <SaveBackingLoopDialog controller={controller} /> : null}
        {controller.dialog === "save-confirm" ? <ConfirmSaveBackingLoopDialog controller={controller} /> : null}
        {controller.dialog === "load" ? <LoadBackingLoopDialog controller={controller} /> : null}
        {controller.dialog === "playlist-delete" ? <DeleteBackingPlaylistDialog controller={controller} /> : null}
        {controller.dialog === "playlist-items-delete" ? <DeleteBackingPlaylistItemsDialog controller={controller} /> : null}
      </div>
    </div>,
    document.body,
  );
}

function MobileBackingLoop({ controller }) {
  return (
    <section
      aria-label="Backing Loop 기타 녹음 및 반복 재생"
      className={`backingLoopPanel backingLoopPanel--mobile backingLoopPanel--${controller.phase}`}
      data-backing-loop-phase={controller.phase}
      title={controller.notice}
    >
      <MobileBackingLoopHardware />
      <span aria-live="polite" className="backingLoopScreenReaderStatus" role="status">{controller.status.label}</span>
      <MobileBackingLoopPlayer controller={controller} />
      <BackingLoopMainControls controller={controller} mobile />
    </section>
  );
}

function DesktopBackingLoop({ controller }) {
  return (
    <section
      aria-label="Backing Loop 기타 녹음 및 반복 재생"
      className={`backingLoopPanel backingLoopPanel--desktop backingLoopPanel--${controller.phase}`}
      data-backing-loop-phase={controller.phase}
    >
      <span aria-live="polite" className="backingLoopScreenReaderStatus" role="status">{controller.status.label}</span>
      <DesktopBackingLoopPlayer controller={controller} />
      <BackingLoopMainControls controller={controller} />
      <p className="backingLoopDesktopNotice" aria-live="polite">
        {controller.notice || "코드 진행을 녹음하고 반복해 솔로를 연습하세요."}
      </p>
    </section>
  );
}

export default function BackingLoop({ mobile = false, ownerMode = "" }) {
  const controller = useBackingLoop(ownerMode);
  return (
    <>
      {mobile ? <MobileBackingLoop controller={controller} /> : <DesktopBackingLoop controller={controller} />}
      <audio
        className="backingLoopAudio"
        onEnded={controller.handlePlaybackEnded}
        onLoadedMetadata={controller.handleLoadedMetadata}
        playsInline
        preload="auto"
        ref={controller.audioRef}
        src={controller.audioUrl || undefined}
      />
      <audio
        className="backingLoopAudio"
        preload="metadata"
        ref={controller.trimPreviewAudioRef}
        src={controller.trimPreviewUrl || undefined}
      />
      <input
        accept={controller.importAccept}
        aria-label="현재 재생목록에 추가할 백킹 오디오 파일 선택"
        className="backingLoopImportInput"
        multiple
        onChange={controller.importBackingAudio}
        ref={controller.importInputRef}
        tabIndex="-1"
        type="file"
      />
      <BackingLoopDialogLayer controller={controller} />
    </>
  );
}
