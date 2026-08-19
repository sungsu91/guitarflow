import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FileUp, FolderOpen, Mic, Pause, Play, RotateCcw, Save, Scissors, Square, Trash2, X } from "lucide-react";
import { BACKING_AUDIO_SOURCE_TYPES } from "../backing-loop/backingAudioSource";
import { formatBackingLoopTime } from "../backing-loop/backingLoopUtils";
import useBackingLoop from "../backing-loop/useBackingLoop";

function BackingLoopHeader({ controller, mobile = false }) {
  const showsTotalDuration = controller.hasRecording
    && !["requesting", "armed", "recording", "processing", "trimming", "applying"].includes(controller.phase);
  const timeText = mobile
    ? formatBackingLoopTime(controller.displayTimeMs)
    : showsTotalDuration
      ? `${formatBackingLoopTime(controller.currentTimeMs)} / ${formatBackingLoopTime(controller.durationMs)}`
      : formatBackingLoopTime(controller.displayTimeMs);
  return (
    <header className="backingLoopHeader">
      <strong className="backingLoopTitle" title={controller.title}>{controller.title}</strong>
      {mobile ? (
        <i
          aria-hidden="true"
          className={`backingLoopRecLamp ${controller.isRecording ? "is-active" : ""}`}
        />
      ) : null}
      <span
        aria-label={controller.status.label}
        aria-live="polite"
        className={`backingLoopTime backingLoopTime--${controller.status.tone}`}
        role="status"
      >
        {timeText}
      </span>
      <span className="backingLoopScreenReaderStatus">{controller.status.label}</span>
    </header>
  );
}

function MobileBackingLoopHardware() {
  return (
    <div aria-hidden="true" className="backingLoopRecorderHardware">
      <i className="backingLoopScrew backingLoopScrew--topLeft" />
      <i className="backingLoopScrew backingLoopScrew--topRight" />
      <i className="backingLoopScrew backingLoopScrew--bottomLeft" />
      <i className="backingLoopScrew backingLoopScrew--bottomRight" />
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

function MobileBackingLoopDisplay({ controller }) {
  const currentTime = formatBackingLoopTime(controller.currentTimeMs);
  const totalTime = formatBackingLoopTime(controller.durationMs);
  const importedFileName = controller.sourceType === BACKING_AUDIO_SOURCE_TYPES.IMPORT
    ? controller.sourceFileName
    : "";
  const statusText = controller.phase === "loading"
    ? controller.status.label
    : !controller.hasRecording && controller.phase === "idle"
      ? "NO LOOP LOADED"
      : importedFileName || controller.status.label;

  return (
    <div className={`backingLoopDeckDisplay backingLoopDeckDisplay--${controller.status.tone}`}>
      <div className="backingLoopDeckTimeline">
        <span aria-hidden="true">{currentTime}</span>
        <BackingLoopProgress controller={controller} />
        <span aria-hidden="true">{totalTime}</span>
      </div>
      <div aria-hidden="true" className="backingLoopCassetteWindow">
        <i className="backingLoopDeckReel backingLoopDeckReel--left" />
        <strong className="backingLoopDeckStatus" title={statusText}>{statusText}</strong>
        <i className="backingLoopDeckReel backingLoopDeckReel--right" />
      </div>
    </div>
  );
}

function BackingLoopMainControls({ controller, mobile = false }) {
  const isBusy = ["requesting", "processing", "trimming", "applying", "saving", "loading"].includes(controller.phase);
  const captureActive = controller.isRecording || controller.isArmed;
  const mediaBusy = captureActive || isBusy;
  const canCancel = controller.hasRecording || captureActive || controller.phase === "requesting";
  return (
    <div className="backingLoopMainControls" aria-label="백킹 녹음 및 재생 컨트롤">
      <button
        aria-label={captureActive ? "기타 녹음 종료" : "기타 녹음 시작"}
        aria-pressed={captureActive}
        className={`backingLoopButton backingLoopRecordButton ${captureActive ? "active" : ""}`}
        disabled={controller.isPlaying || isBusy}
        onClick={controller.toggleRecording}
        type="button"
      >
        {controller.isRecording
          ? <Square aria-hidden="true" size={mobile ? 9 : 12} />
          : <i aria-hidden="true" className="backingLoopRecordDot" />}
        <span>REC</span>
      </button>
      <button
        aria-label={controller.isPlaying
          ? "백킹 루프 일시정지"
          : controller.isPaused
            ? "백킹 루프 이어서 재생"
            : "백킹 루프 무한 반복 재생"}
        aria-pressed={controller.isPlaying}
        className={`backingLoopButton ${controller.isPlaying ? "backingLoopPauseButton active" : "backingLoopPlayButton"}`}
        disabled={!controller.hasRecording || mediaBusy}
        onClick={controller.togglePlayback}
        type="button"
      >
        {controller.isPlaying
          ? <Pause aria-hidden="true" size={mobile ? 11 : 14} />
          : <Play aria-hidden="true" size={mobile ? 11 : 14} />}
        <span>{controller.isPlaying ? "PAUSE" : "PLAY"}</span>
      </button>
      <button
        aria-label="백킹 루프 재생 위치 처음으로 이동"
        className="backingLoopButton backingLoopResetButton"
        disabled={!controller.hasRecording || mediaBusy}
        onClick={controller.resetPlayback}
        type="button"
      >
        <RotateCcw aria-hidden="true" size={mobile ? 11 : 14} />
        <span>RESET</span>
      </button>
      <button
        aria-label="현재 백킹 구간 편집"
        className="backingLoopButton backingLoopEditButton"
        disabled={!controller.hasRecording || mediaBusy || controller.isPlaying}
        onClick={controller.openTrimEditor}
        type="button"
      >
        <Scissors aria-hidden="true" size={mobile ? 11 : 14} />
        <span>EDIT</span>
      </button>
      <button
        aria-label="현재 작업 취소"
        className="backingLoopButton backingLoopCancelButton"
        disabled={!canCancel || ["saving", "loading"].includes(controller.phase)}
        onClick={controller.cancelCurrent}
        type="button"
      >
        <X aria-hidden="true" size={mobile ? 11 : 14} />
        <span>CANCEL</span>
      </button>
    </div>
  );
}

function BackingLoopStorageControls({ controller, mobile = false }) {
  const isBusy = ["armed", "recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(controller.phase);
  return (
    <div className="backingLoopStorageControls" aria-label="백킹 저장, 불러오기 및 파일 가져오기">
      <button
        aria-label="현재 백킹 제목 지정 후 저장"
        className="backingLoopButton backingLoopSaveButton"
        disabled={!controller.hasRecording || isBusy || controller.isPlaying}
        onClick={controller.openSaveDialog}
        type="button"
      >
        <Save aria-hidden="true" size={mobile ? 10 : 13} />
        <span>SAVE</span>
      </button>
      <button
        aria-label="저장된 백킹 목록 열기"
        className="backingLoopButton backingLoopLoadButton"
        disabled={isBusy}
        onClick={controller.openLoadDialog}
        type="button"
      >
        <FolderOpen aria-hidden="true" size={mobile ? 10 : 13} />
        <span>LOAD</span>
      </button>
      <button
        aria-label="휴대폰 또는 PC에서 오디오 파일 가져오기"
        className="backingLoopButton backingLoopImportButton"
        disabled={isBusy}
        onClick={controller.openImportPicker}
        type="button"
      >
        <FileUp aria-hidden="true" size={mobile ? 10 : 13} />
        <span>IMPORT</span>
      </button>
      <input
        accept={controller.importAccept}
        aria-label="가져올 백킹 오디오 파일 선택"
        className="backingLoopImportInput"
        onChange={controller.importBackingAudio}
        ref={controller.importInputRef}
        multiple
        tabIndex="-1"
        type="file"
      />
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

function LoadBackingLoopDialog({ controller }) {
  const selectedItem = controller.library.find((item) => item.id === controller.selectedLibraryId);
  const selectedCount = controller.libraryEditMode ? controller.selectedLibraryIds.length : selectedItem ? 1 : 0;
  return (
    <section className="backingLoopDialog backingLoopLoadDialog">
      <div className="backingLoopDialogHeading">
        <div>
          <strong>저장된 백킹</strong>
          <span>{controller.library.length ? `${controller.library.length}개의 연습 루프` : "아직 저장된 백킹이 없어요."}</span>
        </div>
        <div className="backingLoopDialogHeadingActions">
          <button
            aria-pressed={controller.libraryEditMode}
            className={controller.libraryEditMode ? "selected" : ""}
            disabled={!controller.library.length}
            onClick={controller.toggleLibraryEditMode}
            type="button"
          >
            {controller.libraryEditMode ? "완료" : "편집"}
          </button>
          <button aria-label="불러오기 창 닫기" onClick={controller.closeDialog} type="button"><X size={15} /></button>
        </div>
      </div>
      <div className="backingLoopLibrary">
        {controller.library.length ? controller.library.map((item) => (
          controller.libraryEditMode ? (
            <label className="backingLoopLibraryEditItem" key={item.id}>
              <input
                aria-label={`${item.title} 선택`}
                checked={controller.selectedLibraryIds.includes(item.id)}
                onChange={() => controller.toggleLibraryRecordingSelection(item.id)}
                type="checkbox"
              />
              <span title={item.title}>{item.title}</span>
              <small>{formatBackingLoopTime(item.durationMs)}</small>
            </label>
          ) : (
            <button
              aria-label={`${item.title} 선택`}
              aria-pressed={item.id === controller.selectedLibraryId}
              className={item.id === controller.selectedLibraryId ? "selected" : ""}
              key={item.id}
              onClick={() => controller.selectLibraryRecording(item.id)}
              type="button"
            >
              <span title={item.title}>{item.title}</span>
              <small>{formatBackingLoopTime(item.durationMs)}</small>
            </button>
          )
        )) : (
          <div className="backingLoopLibraryEmpty">
            <Mic aria-hidden="true" size={19} />
            <span>REC로 코드 진행을 녹음한 뒤 SAVE하세요.</span>
          </div>
        )}
      </div>
      <div className="backingLoopDialogActions backingLoopDialogActions--load">
        <button onClick={controller.closeDialog} type="button">닫기</button>
        <button
          className="danger"
          disabled={!selectedCount}
          onClick={controller.openDeleteDialog}
          type="button"
        >
          <Trash2 aria-hidden="true" size={12} />
          {controller.libraryEditMode && selectedCount ? `${selectedCount}개 삭제` : "삭제"}
        </button>
        <button
          className="primary"
          disabled={!selectedItem || controller.libraryEditMode}
          onClick={() => controller.loadRecording(selectedItem?.id)}
          type="button"
        >
          불러오기
        </button>
      </div>
    </section>
  );
}

function ImportBackingLoopDialog({ controller }) {
  const selectedItem = controller.importCandidates.find((item) => item.id === controller.selectedImportCandidateId);
  return (
    <section className="backingLoopDialog backingLoopImportSelectDialog">
      <div className="backingLoopDialogHeading">
        <div>
          <strong>현재 백킹 선택</strong>
          <span>
            {controller.importCandidates.length}개 파일 중 반복 재생할 하나를 선택하세요.
            {controller.importRejectedCount ? ` · ${controller.importRejectedCount}개 제외` : ""}
          </span>
        </div>
        <button aria-label="가져온 파일 선택 창 닫기" onClick={controller.closeDialog} type="button"><X size={15} /></button>
      </div>
      <div className="backingLoopLibrary backingLoopImportLibrary">
        {controller.importCandidates.map((item) => (
          <button
            aria-label={`${item.recording.fileName} 현재 백킹 후보 선택`}
            aria-pressed={item.id === controller.selectedImportCandidateId}
            className={item.id === controller.selectedImportCandidateId ? "selected" : ""}
            key={item.id}
            onClick={() => controller.selectImportCandidate(item.id)}
            type="button"
          >
            <span title={item.recording.fileName}>{item.recording.fileName}</span>
            <small>{formatBackingLoopTime(item.recording.durationMs)}</small>
          </button>
        ))}
      </div>
      <div className="backingLoopDialogActions">
        <button onClick={controller.closeDialog} type="button">취소</button>
        <button className="primary" disabled={!selectedItem} onClick={controller.useSelectedImportCandidate} type="button">
          현재 백킹으로 사용
        </button>
      </div>
    </section>
  );
}

function DeleteBackingLoopDialog({ controller }) {
  const selectedItems = controller.libraryEditMode
    ? controller.library.filter((item) => controller.selectedLibraryIds.includes(item.id))
    : controller.library.filter((item) => item.id === controller.selectedLibraryId);
  return (
    <section className="backingLoopDialog backingLoopDeleteDialog">
      <div className="backingLoopDialogHeading backingLoopDialogHeading--confirm">
        <div>
          <strong>
            {selectedItems.length > 1
              ? `선택한 백킹 ${selectedItems.length}개를 삭제할까요?`
              : `“${selectedItems[0]?.title || "선택한 백킹"}”을 삭제할까요?`}
          </strong>
          <span>저장 목록에서 삭제되며 이 작업은 되돌릴 수 없어요.</span>
        </div>
      </div>
      <div className="backingLoopDialogActions">
        <button disabled={controller.deletePending} onClick={controller.closeDialog} type="button">취소</button>
        <button className="danger" disabled={controller.deletePending} onClick={controller.confirmDelete} type="button">
          {controller.deletePending ? "삭제 중" : "삭제"}
        </button>
      </div>
    </section>
  );
}

function BackingLoopDialogLayer({ controller }) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
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

  if (!controller.dialog || typeof document === "undefined") return null;
  return createPortal(
    <div
      aria-hidden="false"
      className={`backingLoopDialogLayer storageModalLayer ${controller.dialog === "clear-recording" ? "backingLoopDialogLayer--centered" : ""}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) controller.closeDialog();
      }}
      role="presentation"
    >
      <div aria-modal="true" ref={dialogRef} role="dialog" tabIndex="-1">
        {controller.dialog === "trim" ? <TrimBackingLoopDialog controller={controller} /> : null}
        {controller.dialog === "clear-recording" ? <ClearRecordingDialog controller={controller} /> : null}
        {controller.dialog === "save" ? <SaveBackingLoopDialog controller={controller} /> : null}
        {controller.dialog === "save-confirm" ? <ConfirmSaveBackingLoopDialog controller={controller} /> : null}
        {controller.dialog === "load" ? <LoadBackingLoopDialog controller={controller} /> : null}
        {controller.dialog === "import-select" ? <ImportBackingLoopDialog controller={controller} /> : null}
        {controller.dialog === "delete" ? <DeleteBackingLoopDialog controller={controller} /> : null}
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
      <BackingLoopHeader controller={controller} mobile />
      <MobileBackingLoopDisplay controller={controller} />
      <BackingLoopMainControls controller={controller} mobile />
      <BackingLoopStorageControls controller={controller} mobile />
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
      <BackingLoopHeader controller={controller} />
      <BackingLoopProgress controller={controller} />
      <BackingLoopMainControls controller={controller} />
      <BackingLoopStorageControls controller={controller} />
      <p className="backingLoopDesktopNotice" aria-live="polite">
        {controller.notice || "코드 진행을 녹음하고 반복해 솔로를 연습하세요."}
      </p>
    </section>
  );
}

export default function BackingLoop({ mobile = false }) {
  const controller = useBackingLoop();
  return (
    <>
      {mobile ? <MobileBackingLoop controller={controller} /> : <DesktopBackingLoop controller={controller} />}
      <audio
        className="backingLoopAudio"
        loop
        onEnded={controller.handlePlaybackEnded}
        onLoadedMetadata={controller.handleLoadedMetadata}
        preload="metadata"
        ref={controller.audioRef}
        src={controller.audioUrl || undefined}
      />
      <audio
        className="backingLoopAudio"
        preload="metadata"
        ref={controller.trimPreviewAudioRef}
        src={controller.trimPreviewUrl || undefined}
      />
      <BackingLoopDialogLayer controller={controller} />
    </>
  );
}
