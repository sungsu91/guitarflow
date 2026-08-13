import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FolderOpen, Mic, Pause, Play, RotateCcw, Save, Square, Trash2, X } from "lucide-react";
import { formatBackingLoopTime } from "../backing-loop/backingLoopUtils";
import useBackingLoop from "../backing-loop/useBackingLoop";

function BackingLoopHeader({ controller }) {
  return (
    <header className="backingLoopHeader">
      <strong className="backingLoopTitle" title={controller.title}>{controller.title}</strong>
      <span
        aria-label={controller.status.label}
        aria-live="polite"
        className={`backingLoopTime backingLoopTime--${controller.status.tone}`}
        role="status"
      >
        {formatBackingLoopTime(controller.displayTimeMs)}
      </span>
      <span className="backingLoopScreenReaderStatus">{controller.status.label}</span>
    </header>
  );
}

function BackingLoopProgress({ controller }) {
  const durationMs = Math.max(0, controller.durationMs);
  const positionMs = Math.min(durationMs, Math.max(0, controller.currentTimeMs));
  const progress = durationMs ? (positionMs / durationMs) * 100 : 0;
  const isDisabled = !controller.hasRecording || ["recording", "requesting", "saving", "loading"].includes(controller.phase);

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

function BackingLoopMainControls({ controller, mobile = false }) {
  const isBusy = ["requesting", "saving", "loading"].includes(controller.phase);
  const mediaBusy = controller.isRecording || isBusy;
  const canCancel = controller.hasRecording || controller.isRecording || controller.phase === "requesting";
  return (
    <div className="backingLoopMainControls" aria-label="백킹 녹음 및 재생 컨트롤">
      <button
        aria-label={controller.isRecording ? "기타 녹음 종료" : "기타 녹음 시작"}
        className={`backingLoopButton backingLoopRecordButton ${controller.isRecording ? "active" : ""}`}
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

function BackingLoopDeleteControl({ controller, mobile = false }) {
  const isBusy = ["recording", "requesting", "saving", "loading"].includes(controller.phase);
  return (
    <button
      aria-label="현재 저장된 백킹 삭제"
      className="backingLoopButton backingLoopDeleteButton"
      disabled={!controller.recording?.id || isBusy}
      onClick={controller.openDeleteDialog}
      type="button"
    >
      <Trash2 aria-hidden="true" size={mobile ? 9 : 12} />
      <span>DELETE</span>
    </button>
  );
}

function BackingLoopStorageControls({ controller, mobile = false }) {
  const isBusy = ["recording", "requesting", "saving", "loading"].includes(controller.phase);
  return (
    <div className="backingLoopStorageControls" aria-label="백킹 저장 및 불러오기">
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
    </div>
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
        controller.confirmSave();
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

function LoadBackingLoopDialog({ controller }) {
  return (
    <section className="backingLoopDialog backingLoopLoadDialog">
      <div className="backingLoopDialogHeading">
        <div>
          <strong>저장된 백킹</strong>
          <span>{controller.library.length ? `${controller.library.length}개의 연습 루프` : "아직 저장된 백킹이 없어요."}</span>
        </div>
        <button aria-label="불러오기 창 닫기" onClick={controller.closeDialog} type="button"><X size={15} /></button>
      </div>
      <div className="backingLoopLibrary">
        {controller.library.length ? controller.library.map((item) => (
          <button
            aria-label={`${item.title} 불러오기`}
            className={item.id === controller.recording?.id ? "selected" : ""}
            key={item.id}
            onClick={() => controller.loadRecording(item.id)}
            type="button"
          >
            <span title={item.title}>{item.title}</span>
            <small>{formatBackingLoopTime(item.durationMs)}</small>
          </button>
        )) : (
          <div className="backingLoopLibraryEmpty">
            <Mic aria-hidden="true" size={19} />
            <span>REC로 코드 진행을 녹음한 뒤 SAVE하세요.</span>
          </div>
        )}
      </div>
      <div className="backingLoopDialogActions backingLoopDialogActions--single">
        <button onClick={controller.closeDialog} type="button">닫기</button>
      </div>
    </section>
  );
}

function DeleteBackingLoopDialog({ controller }) {
  return (
    <section className="backingLoopDialog backingLoopDeleteDialog">
      <div className="backingLoopDialogHeading backingLoopDialogHeading--confirm">
        <div>
          <strong>이 백킹을 삭제할까요?</strong>
          <span>현재 패널과 저장 목록에서 함께 삭제됩니다. 이 작업은 되돌릴 수 없어요.</span>
        </div>
      </div>
      <div className="backingLoopDialogActions">
        <button onClick={controller.closeDialog} type="button">취소</button>
        <button className="danger" onClick={controller.confirmDelete} type="button">삭제</button>
      </div>
    </section>
  );
}

function BackingLoopDialogLayer({ controller }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") controller.closeDialog();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [controller]);

  if (!controller.dialog || typeof document === "undefined") return null;
  return createPortal(
    <div
      aria-hidden="false"
      className="backingLoopDialogLayer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) controller.closeDialog();
      }}
      role="presentation"
    >
      <div aria-modal="true" role="dialog">
        {controller.dialog === "save" ? <SaveBackingLoopDialog controller={controller} /> : null}
        {controller.dialog === "load" ? <LoadBackingLoopDialog controller={controller} /> : null}
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
      <BackingLoopHeader controller={controller} />
      <BackingLoopProgress controller={controller} />
      <BackingLoopMainControls controller={controller} mobile />
      <BackingLoopStorageControls controller={controller} mobile />
      <BackingLoopDeleteControl controller={controller} mobile />
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
      <BackingLoopDeleteControl controller={controller} />
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
      <BackingLoopDialogLayer controller={controller} />
    </>
  );
}
