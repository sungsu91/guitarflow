import {
  ArrowLeft,
  Copy,
  Download,
  FileAudio,
  FilePlus2,
  FolderOpen,
  GripVertical,
  LoaderCircle,
  Maximize2,
  Minus,
  MoreHorizontal,
  Mic,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Scissors,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Square,
  Trash2,
  Undo2,
  Upload,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AUDIO_STUDIO_SELECTION_SCOPES,
  getAudioStudioClipTimeStretchRatio,
  getAudioStudioProjectDurationMs,
  getAudioStudioTrackGaps,
  updateAudioStudioClips,
} from "./audioStudioModel";
import {
  AUDIO_STUDIO_TIME_STRETCH_MAX_RATIO,
  AUDIO_STUDIO_TIME_STRETCH_MIN_RATIO,
  getAudioStudioTimeStretchRatio,
  isAudioStudioTimeStretchRatioSupported,
} from "./audioStudioTimeStretch";
import useAudioStudio, { AUDIO_STUDIO_SCREENS } from "./useAudioStudio";

function formatStudioTime(milliseconds = 0, precise = false) {
  const safeMilliseconds = Math.max(0, Number(milliseconds) || 0);
  const totalSeconds = Math.floor(safeMilliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const base = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return precise ? `${base}.${String(Math.floor(safeMilliseconds % 1_000)).padStart(3, "0")}` : base;
}

function getDisplayWaveformPeaks(peaks = [], bucketCount = 96) {
  const values = Array.from(peaks || [], (peak) => Math.max(0, Math.min(1, Number(peak) || 0)));
  if (values.length <= bucketCount) return values;
  return Array.from({ length: bucketCount }, (_, bucketIndex) => {
    const start = Math.floor(bucketIndex * values.length / bucketCount);
    const end = Math.max(start + 1, Math.floor((bucketIndex + 1) * values.length / bucketCount));
    return Math.max(...values.slice(start, end));
  });
}

function getTimelineRulerStepMs(pixelsPerSecond) {
  const steps = [1_000, 2_000, 5_000, 10_000, 30_000, 60_000, 120_000, 300_000, 600_000, 1_800_000];
  return steps.find((stepMs) => stepMs / 1_000 * pixelsPerSecond >= 48) || steps.at(-1);
}

function formatProjectDate(timestamp) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("ko-KR", { day: "2-digit", month: "2-digit", year: "numeric" })
    .format(new Date(timestamp)).replace(/\. /g, ".").replace(/\.$/, "");
}

function useAudioStudioModal(onClose) {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.add("audio-studio-modal-open");
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("audio-studio-modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);
}

function AudioStudioHiddenImport({ controller }) {
  return (
    <input
      accept={controller.importAccept}
      aria-label="오디오 파일 여러 개 선택"
      className="audioStudioFileInput"
      multiple
      onChange={controller.importFiles}
      ref={controller.importInputRef}
      tabIndex="-1"
      type="file"
    />
  );
}

function LibraryHeader() {
  return (
    <header className="audioStudioLibraryHeader">
      <span>FRETIVA LAB</span>
      <h1>Audio Studio</h1>
      <p>완성 음원 보관함 · 실제 WAV 파일</p>
    </header>
  );
}

function AudioRenameDialog({ mix, onClose, onRename }) {
  const [name, setName] = useState(mix.fileName);
  useAudioStudioModal(onClose);
  const dialog = (
    <div className="audioStudioOverlay audioStudioDialogBackdrop" role="presentation">
      <section aria-labelledby="audio-studio-rename-title" aria-modal="true" className="audioStudioDialog audioStudioDialog--compact" role="dialog">
        <header><h2 id="audio-studio-rename-title">음원 이름 변경</h2><button aria-label="닫기" onClick={onClose} type="button"><X size={18} /></button></header>
        <label className="audioStudioDialogName"><span>파일명</span><input autoFocus maxLength="120" onChange={(event) => setName(event.target.value)} value={name} /></label>
        <small>실제 출력 형식인 .wav 확장자로 저장됩니다.</small>
        <div className="audioStudioDialogActions"><button onClick={onClose} type="button">취소</button><button disabled={!name.trim()} onClick={() => onRename(mix.id, name)} type="button">변경</button></div>
      </section>
    </div>
  );
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

function MixSaveNameDialog({ onClose, onSave, saving }) {
  const [name, setName] = useState("");
  useAudioStudioModal(onClose);
  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    await onSave(name);
  };
  const dialog = (
    <div className="audioStudioOverlay audioStudioDialogBackdrop" role="presentation">
      <form aria-labelledby="audio-studio-mix-name-title" aria-modal="true" className="audioStudioDialog audioStudioDialog--compact" onSubmit={submit} role="dialog">
        <header><h2 id="audio-studio-mix-name-title">완성 음원 이름</h2><button aria-label="닫기" disabled={saving} onClick={onClose} type="button"><X size={18} /></button></header>
        <label className="audioStudioDialogName"><span>파일명</span><input autoFocus disabled={saving} maxLength="120" onChange={(event) => setName(event.target.value)} placeholder="예: Guitar Mix" value={name} /></label>
        <small>저장하면 모든 트랙이 실제 WAV 파일 하나로 만들어집니다.</small>
        <div className="audioStudioDialogActions"><button disabled={saving} onClick={onClose} type="button">취소</button><button disabled={!name.trim() || saving} type="submit">{saving ? "저장 중..." : "하나로 저장"}</button></div>
      </form>
    </div>
  );
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

function AudioMixLibrary({ controller }) {
  const [renameMix, setRenameMix] = useState(null);
  const rename = async (mixId, name) => {
    await controller.renameSavedMix(mixId, name);
    setRenameMix(null);
  };
  return (
    <section className="audioStudioLibrary" data-audio-studio-screen="library">
      <LibraryHeader />
      <div className="audioStudioLibraryActions">
        <button onClick={controller.openEditor} type="button"><FilePlus2 size={17} /><span>편집실</span></button>
      </div>
      <div className="audioStudioLibrarySectionHeader">
        <div><span>MY AUDIO</span><h2>완성 음원</h2></div>
        <small>{controller.savedMixes.length}곡</small>
      </div>
      {controller.savedMixes.length ? (
        <div className="audioStudioMixList">
          {controller.savedMixes.map((saved) => {
            const isPlaying = controller.libraryMixId === saved.id && controller.libraryPlaybackStatus === "playing";
            return (
              <article className={`audioStudioMixRow ${isPlaying ? "is-playing" : ""}`} key={saved.id}>
                <button
                  aria-label={`${saved.fileName} ${isPlaying ? "일시정지" : "재생"}`}
                  aria-pressed={isPlaying}
                  className="audioStudioMixPlay"
                  disabled={controller.projectOperation === "loading-mix"}
                  onClick={() => controller.playSavedMix(saved.id)}
                  type="button"
                >
                  {isPlaying ? <Pause size={17} /> : <Play size={17} />}
                </button>
                <div className="audioStudioMixCopy">
                  <strong title={saved.fileName}>{saved.fileName}</strong>
                  <small>WAV · {formatProjectDate(saved.updatedAt)}</small>
                </div>
                <time>{formatStudioTime(saved.durationMs)}</time>
                <div className="audioStudioMixActions">
                  <button aria-label={`${saved.fileName} 이름 변경`} onClick={() => setRenameMix(saved)} title="이름 변경" type="button"><SlidersHorizontal size={15} /></button>
                  <button aria-label={`${saved.fileName} 기기로 다운로드`} onClick={() => controller.downloadSavedMix(saved.id)} title="기기로 다운로드" type="button"><Download size={15} /></button>
                  <button aria-label={`${saved.fileName} 삭제`} className="is-danger" onClick={() => controller.deleteSavedMix(saved.id)} title="삭제" type="button"><Trash2 size={15} /></button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="audioStudioLibraryEmpty">
          <FileAudio aria-hidden="true" size={30} />
          <h2>아직 완성된 음원이 없습니다.</h2>
          <p>편집실에서 여러 소리를 조합한 뒤 MIX SAVE를 완료해보세요.</p>
        </section>
      )}
      <p aria-live="polite" className="audioStudioLibraryNotice">{controller.notice}</p>
      {renameMix ? <AudioRenameDialog mix={renameMix} onClose={() => setRenameMix(null)} onRename={rename} /> : null}
    </section>
  );
}

function StudioWorkspaceTopbar({ controller, title = "편집실" }) {
  return (
    <header className="audioStudioProjectTopbar">
      <button aria-label="완성 음원 보관함으로" onClick={controller.goToLibrary} type="button"><ArrowLeft size={19} /></button>
      <div><strong>{title}</strong><span>완성 음원을 만드는 작업 공간</span></div>
      <span />
    </header>
  );
}

function AudioStudioTimeline({ controller, mobile }) {
  const { project } = controller;
  const pixelsPerSecond = project.settings.pixelsPerSecond;
  const durationMs = getAudioStudioProjectDurationMs(project);
  const timelineDurationMs = Math.max(12_000, durationMs);
  const timelineWidth = Math.ceil((timelineDurationMs / 1_000) * pixelsPerSecond);
  const rulerStepMs = getTimelineRulerStepMs(pixelsPerSecond);
  const ticks = Array.from({ length: Math.floor(timelineDurationMs / rulerStepMs) + 1 }, (_, index) => index * rulerStepMs);
  if (ticks.at(-1) !== timelineDurationMs) ticks.push(timelineDurationMs);
  const pinchRef = useRef(null);
  const timelineScrollerRef = useRef(null);
  const trackDragRef = useRef("");
  const [fadePreview, setFadePreview] = useState(null);
  const rangeSelection = controller.rangeSelection;
  useEffect(() => {
    if (!controller.fitProjectRequestId || !durationMs) return;
    const scroller = timelineScrollerRef.current;
    if (!scroller) return;
    const headerWidth = mobile ? 104 : 150;
    const availableWidth = Math.max(80, scroller.clientWidth - headerWidth - 4);
    controller.fitProject(availableWidth);
    requestAnimationFrame(() => { scroller.scrollLeft = 0; });
  }, [controller.fitProject, controller.fitProjectRequestId, durationMs, mobile]);

  useEffect(() => {
    const pinch = pinchRef.current;
    const scroller = timelineScrollerRef.current;
    if (!pinch?.active || !scroller) return;
    const headerWidth = mobile ? 104 : 150;
    scroller.scrollLeft = Math.max(0, headerWidth + pinch.anchorTimeMs / 1_000 * pixelsPerSecond - pinch.centerX);
  }, [mobile, pixelsPerSecond]);
  const beginTrackPointerReorder = (event, trackId) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    let targetTrackId = trackId;
    const onMove = (moveEvent) => {
      targetTrackId = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)
        ?.closest?.(".audioStudioTrackRow")?.dataset?.trackId || targetTrackId;
    };
    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      if (targetTrackId !== trackId) controller.reorderTrack(trackId, targetTrackId);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    window.addEventListener("pointercancel", onEnd, { once: true });
  };
  const beginRangeSelection = (event, track) => {
    if (event.button !== 0 || event.target.closest?.(".audioStudioClip")) return;
    controller.setSelectedTrackId("");
    const bounds = event.currentTarget.getBoundingClientRect();
    const startMs = Math.max(0, ((event.clientX - bounds.left) / pixelsPerSecond) * 1_000);
    let moved = false;
    const onMove = (moveEvent) => {
      if (Math.abs(moveEvent.clientX - event.clientX) < 4) return;
      moved = true;
      const currentMs = Math.max(0, ((moveEvent.clientX - bounds.left) / pixelsPerSecond) * 1_000);
      const start = Math.min(startMs, currentMs);
      const end = Math.max(startMs, currentMs);
      controller.selectTimelineRange({ endMs: end, startMs: start, trackId: track.id });
    };
    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      if (!moved) {
        controller.seekPlayback(startMs);
        controller.selectTimelineRange(null);
        controller.setSelectedClipIds([]);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    window.addEventListener("pointercancel", onEnd, { once: true });
  };
  const beginWaveformRangeSelection = (event, track, clip) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const clipBounds = event.currentTarget.closest(".audioStudioClip")?.getBoundingClientRect();
    if (!clipBounds) return;
    const timeAt = (clientX) => clip.timelineStartMs + Math.max(0, Math.min(1, (clientX - clipBounds.left) / Math.max(1, clipBounds.width))) * clip.durationMs;
    const anchorMs = timeAt(event.clientX);
    let moved = false;
    const onMove = (moveEvent) => {
      if (Math.abs(moveEvent.clientX - event.clientX) < 4) return;
      moved = true;
      const currentMs = timeAt(moveEvent.clientX);
      controller.selectTimelineRange({
        endMs: Math.max(anchorMs, currentMs),
        startMs: Math.min(anchorMs, currentMs),
        trackId: track.id,
      });
    };
    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      if (!moved) {
        controller.selectTimelineRange(null);
        controller.setActiveTrackId(track.id);
        controller.setSelectedClipIds([clip.id]);
        controller.seekPlayback(anchorMs);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    window.addEventListener("pointercancel", onEnd, { once: true });
  };
  const beginRangeHandleDrag = (event, edge) => {
    if (!rangeSelection || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const lane = event.currentTarget.closest(".audioStudioTrackLane");
    const bounds = lane?.getBoundingClientRect();
    if (!bounds) return;
    const onMove = (moveEvent) => {
      const timeMs = Math.max(0, ((moveEvent.clientX - bounds.left) / pixelsPerSecond) * 1_000);
      controller.selectTimelineRange({
        ...rangeSelection,
        ...(edge === "start"
          ? { startMs: Math.min(timeMs, rangeSelection.endMs - 10) }
          : { endMs: Math.max(timeMs, rangeSelection.startMs + 10) }),
      });
    };
    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    window.addEventListener("pointercancel", onEnd, { once: true });
  };
  const beginFadeDrag = (event, clip, edge) => {
    event.preventDefault();
    event.stopPropagation();
    const bounds = event.currentTarget.parentElement.getBoundingClientRect();
    let fadeMs = edge === "in" ? clip.fadeInMs : clip.fadeOutMs;
    const onMove = (moveEvent) => {
      const ratio = edge === "in"
        ? (moveEvent.clientX - bounds.left) / Math.max(1, bounds.width)
        : (bounds.right - moveEvent.clientX) / Math.max(1, bounds.width);
      fadeMs = Math.max(0, Math.min(clip.durationMs, ratio * clip.durationMs));
      setFadePreview({ clipId: clip.id, edge, fadeMs });
    };
    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      setFadePreview(null);
      controller.commitProject((current) => updateAudioStudioClips(current, [clip.id], edge === "in" ? { fadeInMs: fadeMs } : { fadeOutMs: fadeMs }));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
    window.addEventListener("pointercancel", onEnd, { once: true });
  };
  const dragPlayhead = (event) => {
    const target = event.currentTarget;
    const bounds = target.getBoundingClientRect();
    const move = (moveEvent) => controller.seekPlayback(((moveEvent.clientX - bounds.left) / pixelsPerSecond) * 1_000);
    move(event);
    const end = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  };
  const onTouchStart = (event) => {
    if (event.touches.length !== 2) return;
    const scroller = timelineScrollerRef.current;
    if (!scroller) return;
    const bounds = scroller.getBoundingClientRect();
    const headerWidth = mobile ? 104 : 150;
    const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - bounds.left;
    pinchRef.current = {
      active: true,
      anchorTimeMs: Math.max(0, (scroller.scrollLeft + centerX - headerWidth) / Math.max(0.02, pixelsPerSecond) * 1_000),
      centerX,
      distance: Math.abs(event.touches[0].clientX - event.touches[1].clientX),
      zoom: pixelsPerSecond,
    };
  };
  const onTouchMove = (event) => {
    if (event.touches.length !== 2 || !pinchRef.current) return;
    event.preventDefault();
    const distance = Math.abs(event.touches[0].clientX - event.touches[1].clientX);
    controller.setTimelineZoom(pinchRef.current.zoom * distance / Math.max(1, pinchRef.current.distance));
  };
  const loop = project.practice.loop;
  return (
    <section className="audioStudioTimelineFrame" aria-label="전문 오디오 Timeline">
      <div className="audioStudioTimelineScroller" onTouchCancel={() => { pinchRef.current = null; }} onTouchEnd={() => { pinchRef.current = null; }} onTouchMove={onTouchMove} onTouchStart={onTouchStart} ref={timelineScrollerRef} tabIndex="0">
        <div className="audioStudioTimelineCanvas" style={{ "--audio-studio-timeline-width": `${timelineWidth}px` }}>
          <div className="audioStudioRulerRow">
            <strong>TRACKS</strong>
            <div className="audioStudioRuler" onPointerDown={dragPlayhead}>
              {ticks.map((timeMs) => <span className="audioStudioRulerTick" key={timeMs} style={{ left: `${timeMs / 1_000 * pixelsPerSecond}px` }}>{formatStudioTime(timeMs)}</span>)}
              {loop.enabled && loop.endMs > loop.startMs ? <i className="audioStudioLoopRange" style={{ left: `${loop.startMs / 1_000 * pixelsPerSecond}px`, width: `${(loop.endMs - loop.startMs) / 1_000 * pixelsPerSecond}px` }} /> : null}
            </div>
          </div>
          {project.tracks.map((track, trackIndex) => {
            const gaps = getAudioStudioTrackGaps(track);
            return (
              <div className={`audioStudioTrackRow ${controller.activeTrackId === track.id ? "is-active" : ""}`} data-track-id={track.id} key={track.id} onDragOver={(event) => event.preventDefault()} onDrop={() => controller.reorderTrack(trackDragRef.current, track.id)}>
                <header className="audioStudioTrackHeader" draggable onClick={() => controller.selectTrack(track.id)} onDragStart={() => { trackDragRef.current = track.id; }}>
                  <span aria-label={`${track.name} 순서 이동`} className="audioStudioTrackDrag" onPointerDown={(event) => beginTrackPointerReorder(event, track.id)} role="button" tabIndex="0"><GripVertical size={14} /></span>
                  <strong title={track.name}><b>TRACK {trackIndex + 1}</b><span>{track.name}</span></strong>
                  <div className="audioStudioTrackSwitches">
                    <button aria-label={`${track.name} 음소거`} aria-pressed={track.mute} className={track.mute ? "is-on" : ""} onClick={(event) => { event.stopPropagation(); controller.updateTrack(track.id, { mute: !track.mute }); }} type="button">MUTE</button>
                    <button aria-label={`${track.name} 솔로`} aria-pressed={track.solo} className={track.solo ? "is-on" : ""} onClick={(event) => { event.stopPropagation(); controller.updateTrack(track.id, { solo: !track.solo }); }} type="button">SOLO</button>
                  </div>
                  <label className="audioStudioTrackVolume" onClick={(event) => event.stopPropagation()}><span>VOL</span><input aria-label={`${track.name} 볼륨`} max="2" min="0" onChange={(event) => controller.updateTrack(track.id, { volume: event.target.valueAsNumber })} step="0.05" type="range" value={track.volume} /></label>
                  <label className="audioStudioTrackBpm" onClick={(event) => event.stopPropagation()}><span>BPM</span><input aria-label={`${track.name} BPM`} max="240" min="0" onChange={(event) => controller.updateTrack(track.id, { bpm: event.target.valueAsNumber })} placeholder="—" step="1" type="number" value={track.bpm || ""} /></label>
                  {track.bpm && Math.abs(track.bpm - project.settings.projectBpm) >= 0.5 ? <button className="audioStudioBpmMatch" disabled={Boolean(controller.projectOperation)} onClick={(event) => { event.stopPropagation(); controller.matchTrackBpm(track.id); }} type="button">{Math.round(track.bpm)}→{Math.round(project.settings.projectBpm)} 맞추기</button> : null}
                </header>
                <div className={`audioStudioTrackLane ${track.clips.length ? "" : "is-empty"}`} data-track-id={track.id} onPointerDown={(event) => beginRangeSelection(event, track)}>
                  {!track.clips.length ? <div className="audioStudioTrackLaneEmpty"><FileAudio aria-hidden="true" size={16} /><b>오디오가 없습니다</b><div><button onPointerDown={(event) => event.stopPropagation()} onClick={() => controller.openImportPicker("editor-new-track")} type="button"><Upload size={13} /> + 음원 추가</button><button onPointerDown={(event) => event.stopPropagation()} onClick={() => controller.startRecording(track.id)} type="button"><Mic size={13} /> 녹음</button></div></div> : null}
                  {gaps.map((gap) => <span className="audioStudioGap" key={`${gap.startMs}-${gap.endMs}`} style={{ left: `${gap.startMs / 1_000 * pixelsPerSecond}px`, width: `${Math.max(2, gap.gapMs / 1_000 * pixelsPerSecond)}px` }} title={`Gap ${Math.round(gap.gapMs)}ms`} />)}
                  {track.clips.map((clip) => {
                    const source = project.audioSources.find((item) => item.id === clip.sourceId);
                    const left = clip.timelineStartMs / 1_000 * pixelsPerSecond;
                    const width = Math.max(10, clip.durationMs / 1_000 * pixelsPerSecond);
                    const selected = controller.selectedClipIdSet.has(clip.id);
                    const previewing = controller.dragPreview?.clipIds.includes(clip.id);
                    const previewDelta = previewing ? controller.dragPreview.deltaMs / 1_000 * pixelsPerSecond : 0;
                    const resizeEdge = previewing ? controller.dragPreview.resizeEdge : "";
                    const fadeInMs = fadePreview?.clipId === clip.id && fadePreview.edge === "in" ? fadePreview.fadeMs : clip.fadeInMs;
                    const fadeOutMs = fadePreview?.clipId === clip.id && fadePreview.edge === "out" ? fadePreview.fadeMs : clip.fadeOutMs;
                    const waveformBucketCount = Math.max(8, Math.min(mobile ? 64 : 128, Math.floor(width / (mobile ? 3 : 2.5))));
                    const waveformPeaks = getDisplayWaveformPeaks(source?.waveformPeaks, waveformBucketCount);
                    return (
                      <button
                        aria-pressed={selected}
                        className={`audioStudioClip ${waveformPeaks.length ? "" : "has-no-waveform"} ${selected ? "is-selected" : ""} ${clip.mute ? "is-muted" : ""} ${clip.locked || track.locked ? "is-locked" : ""} ${clip.groupId ? "is-grouped" : ""}`}
                        data-clip-id={clip.id}
                        key={clip.id}
                        onClick={(event) => controller.selectClip(event, clip.id)}
                        onPointerDown={(event) => controller.beginClipDrag(event, clip.id)}
                        style={{
                          left: `${left + (resizeEdge === "start" ? previewDelta : 0)}px`,
                          transform: previewing && !resizeEdge ? `translateX(${previewDelta}px)` : undefined,
                          width: `${Math.max(10, width + (resizeEdge === "start" ? -previewDelta : resizeEdge === "end" ? previewDelta : 0))}px`,
                        }}
                        title={source?.fileName || clip.name}
                        type="button"
                      >
                        <span className="audioStudioClipName">{clip.name}</span>
                        <span className={`audioStudioWaveform ${waveformPeaks.length ? "" : "is-empty"}`} onPointerDown={(event) => beginWaveformRangeSelection(event, track, clip)}>{waveformPeaks.length ? waveformPeaks.map((peak, index) => <i aria-hidden="true" key={`${clip.id}-${index}`} style={{ height: `${Math.max(6, peak * 92)}%` }} />) : <em>파형 생성 중...</em>}</span>
                        {fadeInMs ? <span className="audioStudioFade audioStudioFade--in" style={{ width: `${Math.min(100, fadeInMs / clip.durationMs * 100)}%` }} /> : null}
                        {fadeOutMs ? <span className="audioStudioFade audioStudioFade--out" style={{ width: `${Math.min(100, fadeOutMs / clip.durationMs * 100)}%` }} /> : null}
                        {selected ? <span aria-hidden="true" className="audioStudioFadeHandle audioStudioFadeHandle--in" onPointerDown={(event) => beginFadeDrag(event, clip, "in")} /> : null}
                        {selected ? <span aria-hidden="true" className="audioStudioFadeHandle audioStudioFadeHandle--out" onPointerDown={(event) => beginFadeDrag(event, clip, "out")} /> : null}
                        <span aria-hidden="true" className="audioStudioClipEdge audioStudioClipEdge--start" onPointerDown={(event) => controller.beginClipResize(event, clip.id, "start")} />
                        <span aria-hidden="true" className="audioStudioClipEdge audioStudioClipEdge--end" onPointerDown={(event) => controller.beginClipResize(event, clip.id, "end")} />
                      </button>
                    );
                  })}
                  {rangeSelection?.trackId === track.id ? (
                    <span className="audioStudioRangeSelection" style={{ left: `${rangeSelection.startMs / 1_000 * pixelsPerSecond}px`, width: `${Math.max(2, (rangeSelection.endMs - rangeSelection.startMs) / 1_000 * pixelsPerSecond)}px` }}>
                      <button aria-label="선택 구간 시작 조절" className="is-start" onPointerDown={(event) => beginRangeHandleDrag(event, "start")} type="button" />
                      <small>{formatStudioTime(rangeSelection.startMs, true)} – {formatStudioTime(rangeSelection.endMs, true)}</small>
                      <button aria-label="선택 구간 끝 조절" className="is-end" onPointerDown={(event) => beginRangeHandleDrag(event, "end")} type="button" />
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
          <span aria-hidden="true" className="audioStudioPlayhead" style={{ "--audio-studio-playhead-x": `${controller.currentTimeMs / 1_000 * pixelsPerSecond}px` }} />
          {controller.snapGuideMs !== null ? <span aria-hidden="true" className="audioStudioSnapGuide" style={{ "--audio-studio-snap-x": `${controller.snapGuideMs / 1_000 * pixelsPerSecond}px` }}><i>SNAP</i></span> : null}
        </div>
      </div>
      {controller.importing ? <div aria-live="polite" className="audioStudioWaveformAnalyzing"><LoaderCircle aria-hidden="true" className="is-spinning" size={19} /><strong>파형 분석 중...</strong><span>완료되면 파일명과 실제 파형이 자동으로 표시됩니다.</span></div> : null}
      {mobile ? <small className="audioStudioPinchHint">두 손가락으로 Timeline 확대·축소</small> : null}
    </section>
  );
}

function AudioStudioTransport({ controller, mobile }) {
  const durationMs = getAudioStudioProjectDurationMs(controller.project);
  const playing = controller.playbackStatus === "playing";
  const recordingPhase = controller.recordingState.phase;
  const recording = recordingPhase === "recording";
  const recordingBusy = ["requesting", "count-in", "recording", "processing"].includes(recordingPhase);
  return (
    <section className={`audioStudioTransport ${mobile ? "is-mobile" : "is-desktop"}`} aria-label="재생과 Timeline 탐색">
      <output title={`${formatStudioTime(controller.currentTimeMs, true)} / ${formatStudioTime(durationMs, true)}`}><strong>{formatStudioTime(controller.currentTimeMs, true)}</strong><span>/ {formatStudioTime(durationMs, true)}</span></output>
      <div className="audioStudioTransportPlayback">
        <button aria-label={playing ? "일시정지" : "재생"} className="is-primary" onClick={playing ? controller.pausePlayback : () => controller.startPlayback()} type="button">{playing ? <Pause size={17} /> : <Play size={17} />}</button>
        <button aria-label={recordingBusy ? "녹음 정지" : "바로 녹음"} aria-pressed={recordingBusy} className={`audioStudioTransportRecord ${recording ? "is-recording" : ""}`} onClick={recordingBusy ? controller.stopRecording : () => controller.startRecording()} type="button">{recordingBusy ? <Square size={13} /> : <Mic size={15} />}<span>{recording ? "REC" : recordingPhase === "count-in" ? "COUNT" : recordingPhase === "processing" ? "저장 중" : "REC"}</span></button>
        <button aria-label="구간 반복" aria-pressed={controller.project.practice.loop.enabled} className="audioStudioTransportLoop" onClick={() => controller.updatePractice({ loop: { enabled: !controller.project.practice.loop.enabled } })} type="button">LOOP <span>{controller.project.practice.loop.enabled ? "ON" : "OFF"}</span></button>
      </div>
      {!mobile ? <div className="audioStudioTimelineNavigation">
        <button aria-label="축소" onClick={() => controller.setTimelineZoom(controller.project.settings.pixelsPerSecond / 1.5)} type="button"><ZoomOut size={16} /></button>
        <button onClick={controller.requestProjectFit} type="button"><Maximize2 size={15} /><span>전체 보기</span></button>
        {controller.selectedClipIds.length ? <button onClick={() => controller.fitSelection(mobile ? 260 : 760)} type="button"><Maximize2 size={15} /><span>SELECT</span></button> : null}
        <button aria-label="확대" onClick={() => controller.setTimelineZoom(controller.project.settings.pixelsPerSecond * 1.5)} type="button"><ZoomIn size={16} /></button>
      </div> : null}
      <div className="audioStudioTempoControls">
        <label><span>전체 BPM</span><input max="240" min="40" onChange={(event) => controller.updateEditorSettings({ projectBpm: event.target.valueAsNumber })} step="1" type="number" value={controller.project.settings.projectBpm} /></label>
        <label><span>COUNT-IN</span><select onChange={(event) => controller.updateEditorSettings({ countInBars: Number(event.target.value) })} value={controller.project.settings.countInBars}><option value="0">OFF</option><option value="1">1마디</option><option value="2">2마디</option></select></label>
      </div>
      {recordingPhase === "count-in" ? <div aria-live="assertive" className="audioStudioCountIn"><span>COUNT-IN</span><strong>{controller.recordingState.beat}</strong><small>이어폰/헤드폰 권장</small></div> : null}
      {recording ? <div aria-live="polite" className="audioStudioRecordingBanner"><i /> RECORDING · 기존 트랙을 들으며 새 트랙에 녹음 중</div> : null}
    </section>
  );
}

function ContextButton({ disabled, icon: Icon, label, onClick }) {
  return <button disabled={disabled} onClick={onClick} title={label} type="button">{Icon ? <Icon size={15} /> : null}<span>{label}</span></button>;
}

function AudioStudioContextToolbar({ controller }) {
  const count = controller.selectedClipIds.length;
  const addMenuRef = useRef(null);
  useEffect(() => {
    addMenuRef.current?.removeAttribute("open");
  }, [controller.importCompletionId]);
  let actions;
  if (controller.rangeSelection) {
    actions = [
      [null, "자르기", controller.trimRangeSelection],
      [Scissors, "분할", controller.splitRangeSelection],
      [Trash2, "삭제", controller.deleteRangeSelection],
      [Copy, "복사", controller.duplicateRangeSelection],
      [null, "구간 반복", controller.loopRangeSelection],
    ];
  } else if (!count) {
    actions = [
      [Undo2, "되돌리기", controller.canUndo ? controller.undo : null],
      [Redo2, "다시 실행", controller.canRedo ? controller.redo : null],
    ];
  } else if (count === 1) {
    actions = [
      [Scissors, "분할", controller.splitSelection],
      [null, "앞 자르기", () => controller.trimSelection("start")],
      [null, "뒤 자르기", () => controller.trimSelection("end")],
      [Copy, "복사본", controller.duplicateSelection],
      [Trash2, "삭제", controller.deleteSelection],
      [Undo2, "되돌리기", controller.canUndo ? controller.undo : null],
    ];
  } else {
    actions = [
      [Copy, "복사본", controller.duplicateSelection],
      [Trash2, "삭제", controller.deleteSelection],
      [Undo2, "되돌리기", controller.canUndo ? controller.undo : null],
    ];
  }
  return (
    <section className="audioStudioContextToolbar" aria-label="선택 문맥 편집 도구">
      <div className="audioStudioContextLabel"><span>{controller.rangeSelection ? "파형 구간 선택" : count ? `클립 ${count}개 선택` : "TRACK + WAVEFORM"}</span><small>{controller.rangeSelection ? "핸들을 움직여 범위를 정밀하게 조절하세요" : count ? "선택한 클립에 적용" : "파형을 드래그하면 구간 도구가 나타납니다"}</small></div>
      <details className="audioStudioDesktopAddMenu" ref={addMenuRef}><summary><Plus size={15} /> 음원 추가</summary><div><button onClick={() => controller.openImportPicker("editor-new-track")} type="button"><Upload size={14} /> 파일 가져오기</button><button onClick={() => controller.startRecording()} type="button"><Mic size={14} /> 바로 녹음하기</button></div></details>
      <div className="audioStudioContextActions">{actions.map(([icon, label, action]) => <ContextButton disabled={!action} icon={icon} key={label} label={label} onClick={action} />)}</div>
    </section>
  );
}

function MobileTimelineToolbar({ controller }) {
  const toolbarRef = useRef(null);
  useEffect(() => {
    toolbarRef.current?.querySelectorAll("details[open]").forEach((details) => details.removeAttribute("open"));
  }, [controller.importCompletionId]);
  return (
    <section className="audioStudioMobileTimelineToolbar" aria-label="Timeline 빠른 도구" ref={toolbarRef}>
      <details>
        <summary aria-label="Timeline에 음원 추가"><Plus size={16} /><span>음원 추가</span></summary>
        <div>
          <button onClick={() => controller.openImportPicker("editor-new-track")} type="button"><Upload size={14} /> 파일 가져오기</button>
          <button onClick={() => controller.startRecording()} type="button"><Mic size={14} /> 바로 녹음하기</button>
        </div>
      </details>
      <button disabled={!controller.canUndo} onClick={controller.undo} type="button"><Undo2 size={15} /><span>되돌리기</span></button>
      <button disabled={!controller.canRedo} onClick={controller.redo} type="button"><Redo2 size={15} /><span>다시 실행</span></button>
      <details className="audioStudioMobileTimelineOptions">
        <summary aria-label="보기와 연습 옵션"><MoreHorizontal size={17} /><span>더보기</span></summary>
        <div>
          <button onClick={controller.requestProjectFit} type="button"><Maximize2 size={14} /> 전체 곡 보기</button>
          <button onClick={() => controller.setTimelineZoom(controller.project.settings.pixelsPerSecond / 1.5)} type="button"><ZoomOut size={14} /> 축소</button>
          <button onClick={() => controller.setTimelineZoom(controller.project.settings.pixelsPerSecond * 1.5)} type="button"><ZoomIn size={14} /> 확대</button>
          <button onClick={() => controller.setLoopPoint("start")} type="button">현재 위치를 Loop A로</button>
          <button onClick={() => controller.setLoopPoint("end")} type="button">현재 위치를 Loop B로</button>
          <button onClick={controller.goToLibrary} type="button"><FolderOpen size={14} /> 완성 음원 보관함</button>
        </div>
      </details>
    </section>
  );
}

function MobileContextToolbar({ controller, onOpenInspector }) {
  const count = controller.selectedClipIds.length;
  const selectedTrack = controller.project.tracks.find((track) => track.id === controller.selectedTrackId);
  if (!count && !selectedTrack && !controller.rangeSelection) return null;
  let label = "트랙";
  let actions = selectedTrack ? [
    [null, selectedTrack.mute ? "음소거 해제" : "음소거", () => controller.updateTrack(selectedTrack.id, { mute: !selectedTrack.mute })],
    [null, selectedTrack.solo ? "솔로 해제" : "솔로", () => controller.updateTrack(selectedTrack.id, { solo: !selectedTrack.solo })],
    [SlidersHorizontal, "볼륨", onOpenInspector],
    [null, "위로", () => controller.moveActiveTrack("up")],
    [null, "아래로", () => controller.moveActiveTrack("down")],
    [Trash2, "트랙 삭제", controller.deleteActiveTrack],
  ] : [];
  if (controller.rangeSelection) {
    label = "파형 구간";
    actions = [
      [null, "자르기", controller.trimRangeSelection],
      [Scissors, "분할", controller.splitRangeSelection],
      [Trash2, "삭제", controller.deleteRangeSelection],
      [Copy, "복사", controller.duplicateRangeSelection],
      [null, "구간 반복", controller.loopRangeSelection],
    ];
  } else if (count === 1) {
    label = "클립";
    actions = [
      [Scissors, "분할", controller.splitSelection],
      [null, "앞 자르기", () => controller.trimSelection("start")],
      [null, "뒤 자르기", () => controller.trimSelection("end")],
      [Copy, "복사본", controller.duplicateSelection],
      [Trash2, "삭제", controller.deleteSelection],
      [Undo2, "되돌리기", controller.canUndo ? controller.undo : null],
    ];
  } else if (count > 1) {
    label = `클립 ${count}개`;
    actions = [
      [Copy, "복사본", controller.duplicateSelection],
      [Trash2, "삭제", controller.deleteSelection],
      [Undo2, "되돌리기", controller.canUndo ? controller.undo : null],
    ];
  }
  return (
    <section className="audioStudioMobileContextToolbar" aria-label={`${label} 문맥 도구`}>
      <small>{label} · {controller.rangeSelection ? "양쪽 핸들로 범위 조절" : "Timeline에서 직접 드래그해 이동"}</small>
      <div>{actions.map(([icon, actionLabel, action]) => <ContextButton icon={icon} key={actionLabel} label={actionLabel} onClick={action} />)}</div>
    </section>
  );
}

function InspectorField({ children, label }) {
  return <label className="audioStudioInspectorField"><span>{label}</span>{children}</label>;
}

function ClipInspector({ controller, tab }) {
  const clip = controller.selectedClips[0];
  if (!clip) return <TrackInspector controller={controller} />;
  const source = controller.project.audioSources.find((item) => item.id === clip.sourceId);
  const update = (updates) => controller.updateSelectedClips(updates);
  if (tab === "practice") return <PracticeInspector controller={controller} />;
  if (tab === "edit") {
    return (
      <div className="audioStudioInspectorPanel">
        <div className="audioStudioSourceName"><span>원본 파일</span><strong title={source?.fileName || clip.name}>{source?.fileName || clip.name}</strong></div>
        <InspectorField label="클립 이름"><input maxLength="240" onChange={(event) => update({ name: event.target.value })} value={clip.name} /></InspectorField>
        <div className="audioStudioInspectorPair">
          <InspectorField label="시작 위치 (ms)"><input min="0" onChange={(event) => update({ timelineStartMs: event.target.valueAsNumber })} step="10" type="number" value={Math.round(clip.timelineStartMs)} /></InspectorField>
          <InspectorField label="길이 (ms)"><input min="10" readOnly type="number" value={Math.round(clip.durationMs)} /></InspectorField>
        </div>
        <p className="audioStudioInspectorHint">클립 양 끝을 드래그하면 앞·뒤를 정밀하게 자를 수 있습니다.</p>
        <div className="audioStudioInspectorCommands"><button onClick={controller.splitSelection} type="button">현재 재생 위치에서 분할</button><button onClick={controller.deleteSelection} type="button">클립 삭제</button></div>
      </div>
    );
  }
  return (
    <div className="audioStudioInspectorPanel">
      {controller.selectedClips.length > 1 ? <p className="audioStudioGroupStatus">{controller.selectedClips.length} Clips · 그룹 값 적용</p> : null}
      <div className="audioStudioInspectorPair">
        <InspectorField label="클립 볼륨"><input max="2" min="0" onChange={(event) => update({ volume: event.target.valueAsNumber })} step="0.01" type="number" value={clip.volume} /></InspectorField>
        <InspectorField label="페이드 인 (ms)"><input min="0" onChange={(event) => update({ fadeInMs: event.target.valueAsNumber })} step="10" type="number" value={clip.fadeInMs} /></InspectorField>
        <InspectorField label="페이드 아웃 (ms)"><input min="0" onChange={(event) => update({ fadeOutMs: event.target.valueAsNumber })} step="10" type="number" value={clip.fadeOutMs} /></InspectorField>
      </div>
      <div className="audioStudioToggleRow"><label><input checked={clip.mute} onChange={() => update({ mute: !clip.mute })} type="checkbox" /> 이 클립 음소거</label></div>
    </div>
  );
}

function TrackInspector({ controller }) {
  const track = controller.activeTrack;
  if (!track) return null;
  return (
    <div className="audioStudioInspectorPanel">
      <div className="audioStudioInspectorContext"><span>선택한 트랙</span><strong>{track.name}</strong></div>
      <InspectorField label="트랙 이름"><input maxLength="80" onChange={(event) => controller.updateActiveTrack({ name: event.target.value })} value={track.name} /></InspectorField>
      <div className="audioStudioInspectorPair"><InspectorField label="감지/수정 BPM"><input max="240" min="0" onChange={(event) => controller.updateActiveTrack({ bpm: event.target.valueAsNumber })} placeholder="감지 안 됨" step="1" type="number" value={track.bpm || ""} /></InspectorField><InspectorField label="전체 BPM"><input max="240" min="40" onChange={(event) => controller.updateEditorSettings({ projectBpm: event.target.valueAsNumber })} step="1" type="number" value={controller.project.settings.projectBpm} /></InspectorField></div>
      {track.bpm && Math.abs(track.bpm - controller.project.settings.projectBpm) >= 0.5 ? <button className="audioStudioInspectorBpmMatch" disabled={Boolean(controller.projectOperation)} onClick={() => controller.matchTrackBpm(track.id)} type="button">{Math.round(track.bpm)} → {Math.round(controller.project.settings.projectBpm)} BPM 맞추기 · 음정 유지</button> : null}
      <InspectorField label="트랙 볼륨"><input max="2" min="0" onChange={(event) => controller.updateActiveTrack({ volume: event.target.valueAsNumber })} step="0.01" type="range" value={track.volume} /></InspectorField>
      <div className="audioStudioToggleRow"><label><input checked={track.mute} onChange={() => controller.updateActiveTrack({ mute: !track.mute })} type="checkbox" /> 음소거</label><label><input checked={track.solo} onChange={() => controller.updateActiveTrack({ solo: !track.solo })} type="checkbox" /> 솔로</label></div>
      <div className="audioStudioInspectorCommands"><button onClick={() => controller.moveActiveTrack("up")} type="button">위로 이동</button><button onClick={() => controller.moveActiveTrack("down")} type="button">아래로 이동</button><button disabled={controller.project.tracks.length <= 1} onClick={controller.deleteActiveTrack} type="button">트랙 삭제</button></div>
    </div>
  );
}

function PracticeInspector({ controller }) {
  const practice = controller.project.practice;
  return (
    <div className="audioStudioInspectorPanel">
      <div className="audioStudioInspectorCommands"><button onClick={() => controller.setLoopPoint("start")} type="button">SET LOOP A</button><button onClick={() => controller.setLoopPoint("end")} type="button">SET LOOP B</button></div>
      <div className="audioStudioInspectorPair"><InspectorField label="SPEED"><input max="2" min="0.25" onChange={(event) => controller.updatePractice({ speed: { current: event.target.valueAsNumber } })} step="0.05" type="number" value={practice.speed.current} /></InspectorField><InspectorField label="PITCH"><input max="12" min="-12" onChange={(event) => controller.updatePractice({ pitchSemitones: event.target.valueAsNumber })} step="1" type="number" value={practice.pitchSemitones} /></InspectorField><InspectorField label="LOOP A ms"><input min="0" onChange={(event) => controller.updatePractice({ loop: { startMs: event.target.valueAsNumber } })} step="10" type="number" value={practice.loop.startMs} /></InspectorField><InspectorField label="LOOP B ms"><input min="0" onChange={(event) => controller.updatePractice({ loop: { endMs: event.target.valueAsNumber } })} step="10" type="number" value={practice.loop.endMs} /></InspectorField><InspectorField label="REPEAT"><input max="999" min="1" onChange={(event) => controller.updatePractice({ repeat: { count: event.target.valueAsNumber } })} type="number" value={practice.repeat.count} /></InspectorField></div>
      <div className="audioStudioToggleRow"><label><input checked={practice.loop.enabled} onChange={() => controller.updatePractice({ loop: { enabled: !practice.loop.enabled } })} type="checkbox" /> A-B LOOP</label><label><input checked={practice.repeat.enabled} onChange={() => controller.updatePractice({ repeat: { enabled: !practice.repeat.enabled } })} type="checkbox" /> REPEAT</label><label><input checked={practice.speed.stepEnabled} onChange={() => controller.updatePractice({ speed: { stepEnabled: !practice.speed.stepEnabled } })} type="checkbox" /> STEP-UP</label></div>
    </div>
  );
}

function EditorInspector({ controller, mobile, onClose, open = false }) {
  const [tab, setTab] = useState("edit");
  const tabs = [["edit", "편집"], ["audio", "볼륨·페이드"], ["practice", "연습"]];
  const content = <><div className="audioStudioInspectorTabs" role="tablist">{tabs.map(([key, label]) => <button aria-selected={tab === key} key={key} onClick={() => setTab(key)} role="tab" type="button">{label}</button>)}</div><ClipInspector controller={controller} tab={tab} /></>;
  if (mobile) {
    if (!open) return null;
    return (
      <div className="audioStudioInspectorSheetLayer" role="presentation">
        <button aria-label="Inspector 닫기" className="audioStudioInspectorSheetDim" onClick={onClose} type="button" />
        <section aria-label="Audio Inspector" aria-modal="true" className="audioStudioInspectorSheet" role="dialog">
          <header><span><strong>{controller.selectedClipIds.length ? `클립 ${controller.selectedClipIds.length}개 선택` : controller.activeTrack?.name || "트랙 설정"}</strong><small>필요한 설정만 표시합니다</small></span><button aria-label="Inspector 닫기" onClick={onClose} type="button"><X size={17} /></button></header>
          <div className="audioStudioInspectorSheetBody">{content}</div>
        </section>
      </div>
    );
  }
  return <aside className="audioStudioInspector">{content}</aside>;
}

function WorkspaceNavigation({ controller, screen }) {
  return (
    <nav className="audioStudioWorkspaceNav" aria-label="Audio Studio Workspace">
      <button aria-current={screen === AUDIO_STUDIO_SCREENS.EDIT ? "page" : undefined} onClick={controller.goToEditor} type="button">파형 편집</button>
      <button aria-current={screen === AUDIO_STUDIO_SCREENS.MIX ? "page" : undefined} onClick={controller.goToMixer} type="button">믹스 저장</button>
    </nav>
  );
}

function WaveformEditor({ controller, mobile }) {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  if (mobile) {
    return (
      <section className="audioStudioEditor audioStudioEditor--mobile" data-audio-studio-screen="edit">
        <StudioWorkspaceTopbar controller={controller} />
        <WorkspaceNavigation controller={controller} screen={AUDIO_STUDIO_SCREENS.EDIT} />
        <AudioStudioTransport controller={controller} mobile />
        <MobileTimelineToolbar controller={controller} />
        <main className="audioStudioMobileTimelineStage"><AudioStudioTimeline controller={controller} mobile /></main>
        <MobileContextToolbar controller={controller} onOpenInspector={() => setInspectorOpen(true)} />
        <EditorInspector controller={controller} mobile onClose={() => setInspectorOpen(false)} open={inspectorOpen} />
      </section>
    );
  }
  return (
    <section className="audioStudioEditor" data-audio-studio-screen="edit">
      <StudioWorkspaceTopbar controller={controller} />
      <WorkspaceNavigation controller={controller} screen={AUDIO_STUDIO_SCREENS.EDIT} />
      <AudioStudioTransport controller={controller} mobile={mobile} />
      <AudioStudioContextToolbar controller={controller} />
      <div className={`audioStudioEditorGrid ${mobile ? "is-mobile" : "is-desktop"}`}>
        <main><AudioStudioTimeline controller={controller} mobile={mobile} /></main>
        <EditorInspector controller={controller} mobile={false} />
      </div>
    </section>
  );
}

function MixerWorkspace({ controller, mobile }) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const master = controller.project.mixer.master;
  const hasAudio = getAudioStudioProjectDurationMs(controller.project) > 0;
  return (
    <section className="audioStudioMixerWorkspace" data-audio-studio-screen="mix">
      <StudioWorkspaceTopbar controller={controller} title="믹스 저장" />
      <WorkspaceNavigation controller={controller} screen={AUDIO_STUDIO_SCREENS.MIX} />
      <AudioStudioTransport controller={controller} mobile={mobile} />
      <header className="audioStudioMixerHeader"><div><span>VOLUME BALANCE</span><h1>각 소리의 크기를 맞추세요</h1><p>모든 트랙을 같은 화면에서 비교할 수 있습니다.</p></div><div className={`audioStudioMasterMeter ${controller.masterLevel > 0.98 ? "is-clipping" : ""}`}><i style={{ height: `${Math.max(2, controller.masterLevel * 100)}%` }} /></div></header>
      <div className={`audioStudioMixerChannels ${mobile ? "is-mobile" : "is-desktop"}`}>
        {controller.project.tracks.map((track, index) => (
          <section className="audioStudioMixerChannel" key={track.id}>
            <header><span>TRACK {index + 1}</span><strong title={track.name}>{track.name}</strong></header>
            <div className="audioStudioMixerChannelButtons"><button aria-pressed={track.mute} onClick={() => controller.updateTrack(track.id, { mute: !track.mute })} type="button">음소거</button><button aria-pressed={track.solo} onClick={() => controller.updateTrack(track.id, { solo: !track.solo })} type="button">솔로</button></div>
            <label><span>볼륨</span><input max="2" min="0" onChange={(event) => controller.updateTrack(track.id, { volume: event.target.valueAsNumber })} step="0.01" type="range" value={track.volume} /><output>{Math.round(track.volume * 100)}%</output></label>
          </section>
        ))}
        <section className="audioStudioMixerChannel audioStudioMixerChannel--master">
          <header><span>MASTER</span><strong>전체 출력</strong></header>
          <label><span>전체 볼륨</span><input max="2" min="0" onChange={(event) => controller.updateMaster({ volume: event.target.valueAsNumber })} step="0.01" type="range" value={master.volume} /><output>{Math.round(master.volume * 100)}%</output></label>
        </section>
      </div>
      <div className="audioStudioMixSaveArea">
        <button className="audioStudioMixerExport" disabled={!hasAudio || controller.projectOperation === "mix-saving"} onClick={() => setSaveDialogOpen(true)} type="button"><Save size={15} /> MIX SAVE</button>
        <small>전체 Preview를 확인한 뒤 실제 WAV 파일 하나로 만들어 AUDIO STUDIO 보관함에 저장합니다.</small>
      </div>
      {saveDialogOpen ? <MixSaveNameDialog onClose={() => setSaveDialogOpen(false)} onSave={controller.mixSave} saving={controller.projectOperation === "mix-saving"} /> : null}
    </section>
  );
}

function getSimpleClipWaveform(source, clip, bucketCount = 84) {
  const peaks = Array.from(source?.waveformPeaks || []);
  const sourceDurationMs = Math.max(1, Number(source?.durationMs) || 1);
  if (!peaks.length) return [];
  const startIndex = Math.max(0, Math.floor((clip.sourceStartMs / sourceDurationMs) * peaks.length));
  const endIndex = Math.max(startIndex + 1, Math.ceil((clip.sourceEndMs / sourceDurationMs) * peaks.length));
  return getDisplayWaveformPeaks(peaks.slice(startIndex, endIndex), bucketCount);
}

function SimpleTrimDialog({ clip, controller, onClose, source, track }) {
  const durationMs = Math.max(10, Number(source?.durationMs) || clip.sourceEndMs || clip.durationMs);
  const minimumDurationMs = Math.min(100, durationMs);
  const [startMs, setStartMs] = useState(Math.max(0, Math.min(durationMs - minimumDurationMs, clip.sourceStartMs)));
  const [endMs, setEndMs] = useState(Math.max(minimumDurationMs, Math.min(durationMs, clip.sourceEndMs)));
  const previousStretch = track.timeStretch;
  const detectedBpm = Number(track.detectedBpm || source.detectedBpm) || 0;
  const initialSourceBpm = Number(previousStretch?.sourceBpm || detectedBpm) || 0;
  const [stretchEnabled, setStretchEnabled] = useState(Boolean(previousStretch?.ratio && Math.abs(previousStretch.ratio - 1) > 0.000001));
  const [sourceBpm, setSourceBpm] = useState(initialSourceBpm ? String(initialSourceBpm) : "");
  const [targetBpm, setTargetBpm] = useState(previousStretch?.targetBpm ? String(previousStretch.targetBpm) : (initialSourceBpm ? String(initialSourceBpm) : ""));
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const activeHandleRef = useRef("");
  const dragOffsetRef = useRef(0);
  const waveformRef = useRef(null);
  const stretchState = controller.trackStretchState[track.id] || {};
  const processing = applying || stretchState.status === "processing";
  const ratio = getAudioStudioTimeStretchRatio(sourceBpm, targetBpm);
  const hasBothBpmValues = Number(sourceBpm) > 0 && Number(targetBpm) > 0;
  const supportedRatio = hasBothBpmValues && isAudioStudioTimeStretchRatioSupported(ratio);
  const currentStretchRatio = getAudioStudioClipTimeStretchRatio(clip);
  const previewDurationMs = Math.max(minimumDurationMs / currentStretchRatio, (endMs - startMs) / currentStretchRatio);
  const previewPlaying = controller.playbackStatus === "playing";
  useAudioStudioModal(processing ? () => {} : onClose);
  useEffect(() => {
    controller.stopPlayback();
    return () => controller.stopPlayback();
  }, [controller.stopPlayback]);
  const startPercent = (startMs / durationMs) * 100;
  const endPercent = (endMs / durationMs) * 100;
  const peaks = getDisplayWaveformPeaks(source?.waveformPeaks, 96);
  const updateStart = (value) => setStartMs(Math.max(0, Math.min(Number(value) || 0, endMs - minimumDurationMs)));
  const updateEnd = (value) => setEndMs(Math.min(durationMs, Math.max(Number(value) || durationMs, startMs + minimumDurationMs)));
  const updateFromPointer = (event, handle) => {
    const bounds = waveformRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    const ratio = Math.max(0, Math.min(1, (event.clientX - dragOffsetRef.current - bounds.left) / bounds.width));
    if (handle === "start") updateStart(ratio * durationMs);
    else updateEnd(ratio * durationMs);
  };
  const beginTrim = (event) => {
    event.preventDefault();
    const bounds = waveformRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    const pressedHandle = event.target.closest?.(".audioStudioSimpleTrimHandle")?.dataset.trimHandle;
    const pointerMs = Math.max(0, Math.min(durationMs, ((event.clientX - bounds.left) / bounds.width) * durationMs));
    const handle = pressedHandle || (Math.abs(pointerMs - startMs) <= Math.abs(pointerMs - endMs) ? "start" : "end");
    activeHandleRef.current = handle;
    const currentMs = handle === "start" ? startMs : endMs;
    dragOffsetRef.current = pressedHandle ? event.clientX - (bounds.left + (currentMs / durationMs) * bounds.width) : 0;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (!pressedHandle) updateFromPointer(event, handle);
  };
  const moveTrim = (event) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId) && activeHandleRef.current) updateFromPointer(event, activeHandleRef.current);
  };
  const endTrim = (event) => {
    activeHandleRef.current = "";
    dragOffsetRef.current = 0;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
  const handleTrimKey = (event, handle) => {
    const step = event.shiftKey ? 1_000 : 100;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = handle === "start" ? startMs : endMs;
    const next = event.key === "Home" ? 0 : event.key === "End" ? durationMs : current + (event.key === "ArrowLeft" ? -step : step);
    if (handle === "start") updateStart(next);
    else updateEnd(next);
  };
  const nudgeBoundary = (boundary, deltaMs) => {
    if (boundary === "start") updateStart(startMs + deltaMs);
    else updateEnd(endMs + deltaMs);
  };
  const restoreOriginal = () => {
    setStartMs(0);
    setEndMs(durationMs);
    setStretchEnabled(false);
    if (detectedBpm) {
      setSourceBpm(String(detectedBpm));
      setTargetBpm(String(detectedBpm));
    }
    setAnalysisMessage("원본 구간과 속도로 되돌릴 준비가 되었습니다. 적용을 눌러 반영하세요.");
  };
  const useDetectedBpm = () => {
    if (!detectedBpm) {
      setAnalysisMessage("이 음원에서는 BPM을 안정적으로 추정하지 못했습니다. 원본 BPM을 직접 입력해주세요.");
      return;
    }
    setSourceBpm(String(detectedBpm));
    if (!Number(targetBpm)) setTargetBpm(String(detectedBpm));
    setAnalysisMessage(`가져올 때 분석한 추정값 ${detectedBpm} BPM을 불러왔습니다.`);
  };
  const changeTargetBpm = (delta) => {
    const fallback = Number(sourceBpm) || detectedBpm || 120;
    setTargetBpm(String(Math.max(1, Math.min(320, (Number(targetBpm) || fallback) + delta))));
  };
  const buildPreviewProject = () => ({
    ...controller.project,
    practice: {
      ...controller.project.practice,
      loop: { ...controller.project.practice.loop, enabled: false },
      speed: { ...controller.project.practice.speed, current: 1 },
    },
    tracks: controller.project.tracks.map((item) => item.id === track.id ? {
      ...item,
      mute: false,
      solo: false,
      clips: [{
        ...clip,
        durationMs: previewDurationMs,
        mute: false,
        sourceEndMs: endMs,
        sourceStartMs: startMs,
        timelineStartMs: 0,
      }],
    } : { ...item, clips: [], mute: true, solo: false }),
  });
  const togglePreview = () => {
    if (previewPlaying) {
      controller.pausePlayback();
      return;
    }
    const fromMs = controller.currentTimeMs >= previewDurationMs - 2 ? 0 : controller.currentTimeMs;
    controller.startPlayback(fromMs, { project: buildPreviewProject(), stopAtMs: previewDurationMs });
  };
  const applyTrim = async () => {
    if (processing || (stretchEnabled && !supportedRatio)) return;
    setApplying(true);
    controller.pausePlayback();
    const resetSourceBpm = Number(sourceBpm) || Number(previousStretch?.sourceBpm) || detectedBpm || 120;
    const requestedRatio = stretchEnabled ? ratio : 1;
    const shouldUpdateStretch = stretchEnabled
      || Math.abs(Number(previousStretch?.ratio || 1) - requestedRatio) > 0.000001;
    if (shouldUpdateStretch) {
      const stretched = await controller.applyTrackTimeStretch(track.id, {
        sourceBpm: resetSourceBpm,
        targetBpm: stretchEnabled ? Number(targetBpm) : resetSourceBpm,
      });
      if (!stretched) {
        setApplying(false);
        return;
      }
    }
    const sourceRate = Math.max(0.25, clip.playbackRate || 1) * requestedRatio;
    controller.commitProject((current) => updateAudioStudioClips(current, [clip.id], {
      durationMs: Math.max(minimumDurationMs / sourceRate, (endMs - startMs) / sourceRate),
      sourceEndMs: endMs,
      sourceStartMs: startMs,
    }));
    setApplying(false);
    onClose();
  };
  const dialog = (
    <div className="audioStudioOverlay audioStudioDialogBackdrop" role="presentation">
      <section aria-labelledby="audio-studio-simple-trim-title" aria-modal="true" className="audioStudioDialog audioStudioSimpleTrimDialog" role="dialog">
        <header><div><h2 id="audio-studio-simple-trim-title">구간 다듬기</h2><strong>{source.fileName || track.name}</strong><span>양쪽 손잡이로 실제 사용할 구간을 정하세요.</span></div><button aria-label="닫기" disabled={processing} onClick={onClose} type="button"><X size={22} /></button></header>
        <div className="audioStudioSimpleTrimRuler" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <time key={index} style={{ left: `${index * 25}%` }}>{formatStudioTime(durationMs * index / 4)}</time>)}</div>
        <div className="audioStudioSimpleTrimWaveform" onPointerCancel={endTrim} onPointerDown={beginTrim} onPointerMove={moveTrim} onPointerUp={endTrim} ref={waveformRef}>
          <div aria-hidden="true" className="audioStudioSimpleTrimBars">{peaks.map((peak, index) => <i key={index} style={{ height: `${Math.max(5, peak * 100)}%` }} />)}</div>
          <i aria-hidden="true" className="audioStudioSimpleTrimMask is-start" style={{ width: `${startPercent}%` }} />
          <i aria-hidden="true" className="audioStudioSimpleTrimMask is-end" style={{ width: `${100 - endPercent}%` }} />
          <i aria-hidden="true" className="audioStudioSimpleTrimSelection" style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }} />
          <button aria-label={`앞부분 ${formatStudioTime(startMs, true)}부터 사용`} aria-valuemax={durationMs} aria-valuemin="0" aria-valuenow={Math.round(startMs)} className="audioStudioSimpleTrimHandle is-start" data-label="START" data-trim-handle="start" onKeyDown={(event) => handleTrimKey(event, "start")} role="slider" style={{ left: `${startPercent}%` }} type="button" />
          <button aria-label={`뒷부분 ${formatStudioTime(endMs, true)}까지 사용`} aria-valuemax={durationMs} aria-valuemin="0" aria-valuenow={Math.round(endMs)} className="audioStudioSimpleTrimHandle is-end" data-label="END" data-trim-handle="end" onKeyDown={(event) => handleTrimKey(event, "end")} role="slider" style={{ left: `${endPercent}%` }} type="button" />
        </div>
        <div className="audioStudioSimpleTrimTimes">
          <span><small>START</small><strong>{formatStudioTime(startMs, true)}</strong><div><button aria-label="시작 0.01초 줄이기" onClick={() => nudgeBoundary("start", -10)} type="button"><Minus size={14} /></button><button aria-label="시작 0.01초 늘리기" onClick={() => nudgeBoundary("start", 10)} type="button"><Plus size={14} /></button></div></span>
          <span><small>END</small><strong>{formatStudioTime(endMs, true)}</strong><div><button aria-label="끝 0.01초 줄이기" onClick={() => nudgeBoundary("end", -10)} type="button"><Minus size={14} /></button><button aria-label="끝 0.01초 늘리기" onClick={() => nudgeBoundary("end", 10)} type="button"><Plus size={14} /></button></div></span>
          <span><small>LENGTH</small><strong>{formatStudioTime(endMs - startMs, true)}</strong><em>선택 구간</em></span>
        </div>
        <div className="audioStudioSimpleTrimPreview" aria-label="선택 구간 미리듣기">
          <div><button aria-label="선택 구간 처음으로" disabled={processing} onClick={() => controller.setPlaybackPosition(0)} type="button"><SkipBack size={19} /></button><button aria-label={previewPlaying ? "미리듣기 일시정지" : "선택 구간 재생"} className="is-primary" disabled={processing} onClick={togglePreview} type="button">{previewPlaying ? <Pause size={20} /> : <Play size={20} />}</button><button aria-label="선택 구간 끝으로" disabled={processing} onClick={() => controller.setPlaybackPosition(previewDurationMs)} type="button"><SkipForward size={19} /></button></div>
          <section><time>{formatStudioTime(Math.min(controller.currentTimeMs, previewDurationMs), true)} <span>/</span> {formatStudioTime(previewDurationMs, true)}</time><input aria-label="선택 구간 재생 위치" disabled={processing} max={Math.max(1, previewDurationMs)} min="0" onChange={(event) => controller.setPlaybackPosition(event.target.valueAsNumber)} step="10" type="range" value={Math.min(previewDurationMs, controller.currentTimeMs)} /></section>
        </div>
        <section className={`audioStudioTrimStretch ${stretchEnabled ? "is-enabled" : ""}`}>
          <header><div><strong>TIME STRETCH</strong><span>속도/템포 조절 · Pitch 유지</span></div><button aria-checked={stretchEnabled} className="audioStudioTrimStretchToggle" disabled={processing} onClick={() => setStretchEnabled((value) => !value)} role="switch" type="button"><i /></button></header>
          <div className="audioStudioTrimStretchFields">
            <label><span>원본 BPM <small>분석값</small></span><div><input disabled={!stretchEnabled || processing} inputMode="decimal" max="320" min="1" onChange={(event) => setSourceBpm(event.target.value)} placeholder="직접 입력" step="0.1" type="number" value={sourceBpm} /><button disabled={!stretchEnabled || processing} onClick={useDetectedBpm} type="button">BPM 분석</button></div></label>
            <b aria-hidden="true">→</b>
            <label><span>목표 BPM</span><div><input disabled={!stretchEnabled || processing} inputMode="decimal" max="320" min="1" onChange={(event) => setTargetBpm(event.target.value)} placeholder="직접 입력" step="0.1" type="number" value={targetBpm} /><button aria-label="목표 BPM 1 줄이기" disabled={!stretchEnabled || processing} onClick={() => changeTargetBpm(-1)} type="button"><Minus size={15} /></button><button aria-label="목표 BPM 1 늘리기" disabled={!stretchEnabled || processing} onClick={() => changeTargetBpm(1)} type="button"><Plus size={15} /></button></div></label>
          </div>
          <div className={`audioStudioTrimStretchRatio ${stretchEnabled && hasBothBpmValues && !supportedRatio ? "is-invalid" : ""}`}><span>변환 배율</span><div><i style={{ width: `${Math.max(0, Math.min(100, ((ratio || 0.75) - 0.75) / 0.75 * 100))}%` }} /></div><strong>{stretchEnabled && ratio > 0 ? `${ratio.toFixed(3)}x` : "OFF"}</strong></div>
          {stretchEnabled && hasBothBpmValues && !supportedRatio ? <p className="audioStudioSimpleStretchWarning" role="alert">지원 범위는 {AUDIO_STUDIO_TIME_STRETCH_MIN_RATIO.toFixed(2)}× ~ {AUDIO_STUDIO_TIME_STRETCH_MAX_RATIO.toFixed(2)}×입니다.</p> : null}
          {analysisMessage ? <p className="audioStudioTrimStretchMessage">{analysisMessage}</p> : null}
          {processing ? <div aria-live="polite" className="audioStudioSimpleStretchProgress"><span><LoaderCircle className="is-spinning" size={15} /> Pitch를 유지하며 변환 중</span><progress max="100" value={Math.round((stretchState.progress || 0) * 100)} /><output>{Math.round((stretchState.progress || 0) * 100)}%</output></div> : null}
          {stretchState.status === "error" ? <p className="audioStudioSimpleStretchWarning" role="alert">{stretchState.error}</p> : null}
        </section>
        <div className="audioStudioDialogActions audioStudioSimpleTrimActions"><button disabled={processing} onClick={restoreOriginal} type="button"><RotateCcw size={15} /> 원본 구간으로 복원</button><button disabled={processing} onClick={onClose} type="button">취소</button><button disabled={processing || (stretchEnabled && !supportedRatio)} onClick={applyTrim} type="button">{processing ? "처리 중..." : "적용"}</button></div>
      </section>
    </div>
  );
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

function SimpleTrackRow({ controller, onDelete, onTrim, timelineDurationMs, track, trackIndex }) {
  const [dragStartMs, setDragStartMs] = useState(null);
  const clip = track.clips[0];
  const source = controller.project.audioSources.find((item) => item.id === clip?.sourceId);
  if (!clip) return null;
  const displayedStartMs = dragStartMs ?? clip.timelineStartMs;
  const startPercent = Math.max(0, Math.min(100, (displayedStartMs / timelineDurationMs) * 100));
  const widthPercent = Math.max(0.8, Math.min(100 - startPercent, (clip.durationMs / timelineDurationMs) * 100));
  const displayedEndMs = displayedStartMs + clip.durationMs;
  const peaks = getSimpleClipWaveform(source, clip);
  const updatePosition = (milliseconds) => {
    const nextStartMs = Math.max(0, Number(milliseconds) || 0);
    controller.commitProject((current) => updateAudioStudioClips(current, [clip.id], { timelineStartMs: nextStartMs }));
  };
  const beginMove = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const lane = event.currentTarget.closest(".audioStudioSimpleTrackLane");
    const bounds = lane?.getBoundingClientRect();
    if (!bounds?.width) return;
    const originX = event.clientX;
    const originStartMs = clip.timelineStartMs;
    let nextStartMs = originStartMs;
    const move = (moveEvent) => {
      nextStartMs = Math.max(0, Math.min(timelineDurationMs - clip.durationMs, originStartMs + ((moveEvent.clientX - originX) / bounds.width) * timelineDurationMs));
      setDragStartMs(nextStartMs);
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      setDragStartMs(null);
      updatePosition(nextStartMs);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
    window.addEventListener("pointercancel", end, { once: true });
  };
  const moveWithKeyboard = (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const stepMs = event.shiftKey ? 1_000 : 100;
    updatePosition(clip.timelineStartMs + (event.key === "ArrowLeft" ? -stepMs : stepMs));
  };
  return (
    <article className={`audioStudioSimpleTrack ${track.mute ? "is-muted" : ""}`}>
      <header className="audioStudioSimpleTrackHeader">
        <div className="audioStudioSimpleTrackName"><span>TRACK {trackIndex + 1}</span><strong title={source?.fileName || track.name}>{source?.fileName || track.name}</strong>{track.timeStretch?.ratio && Math.abs(track.timeStretch.ratio - 1) > 0.000001 ? <small>STRETCH {track.timeStretch.ratio.toFixed(3)}x</small> : null}</div>
        <div className="audioStudioSimpleTrackControls">
          <div className="audioStudioSimpleTrackActions"><button aria-label={`${track.name} 구간 다듬기`} disabled={Boolean(controller.projectOperation)} onClick={() => onTrim(track.id)} title="구간 다듬기" type="button"><Scissors size={15} /><span>TRIM</span></button><button aria-label={`${track.name} 삭제`} className="is-danger" disabled={Boolean(controller.projectOperation)} onClick={() => onDelete(track.id)} title="삭제" type="button"><Trash2 size={15} /><span>삭제</span></button></div>
          <div className="audioStudioSimpleTrackSound"><label className="audioStudioSimpleVolume"><span>VOL</span><input aria-label={`${track.name} 볼륨`} max="2" min="0" onChange={(event) => controller.updateTrack(track.id, { volume: event.target.valueAsNumber })} step="0.05" type="range" value={track.volume} /><output>{Math.round(track.volume * 100)}%</output></label><button aria-label={`${track.name} ${track.mute ? "음소거 해제" : "음소거"}`} aria-pressed={track.mute} className={`audioStudioSimpleMute ${track.mute ? "is-active" : ""}`} onClick={() => controller.updateTrack(track.id, { mute: !track.mute })} title={track.mute ? "음소거 해제" : "음소거"} type="button">{track.mute ? <VolumeX size={21} /> : <Volume2 size={21} />}</button></div>
        </div>
      </header>
      <div className="audioStudioSimpleTrackLane" onPointerDown={(event) => {
        if (event.target.closest(".audioStudioSimpleClip")) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        controller.seekPlayback(((event.clientX - bounds.left) / bounds.width) * timelineDurationMs);
      }}>
        <div aria-label={`${track.name} 위치 이동, 현재 ${formatStudioTime(displayedStartMs, true)} 시작`} className="audioStudioSimpleClip" onKeyDown={moveWithKeyboard} onPointerDown={beginMove} role="slider" tabIndex="0" title="좌우로 드래그해 시작 위치를 맞추세요" style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}>
          <div aria-hidden="true" className="audioStudioSimpleWaveform">{peaks.map((peak, index) => <i key={index} style={{ height: `${Math.max(6, peak * 100)}%` }} />)}</div>
          <span>{formatStudioTime(displayedStartMs, true)} ~ {formatStudioTime(displayedEndMs, true)} <em>({(clip.durationMs / 1_000).toFixed(2)}s)</em></span>
        </div>
        <i aria-hidden="true" className="audioStudioSimplePlayhead" style={{ left: `${Math.min(100, (controller.currentTimeMs / timelineDurationMs) * 100)}%` }} />
      </div>
    </article>
  );
}

function SimpleAudioTimeline({ controller, onDelete, onTrim }) {
  const tracks = controller.project.tracks.filter((track) => track.clips.length);
  const contentDurationMs = getAudioStudioProjectDurationMs(controller.project);
  const timelineDurationMs = Math.max(10_000, Math.ceil((contentDurationMs + 10_000) / 10_000) * 10_000);
  const ticks = Array.from({ length: 6 }, (_, index) => (timelineDurationMs / 5) * index);
  return (
    <section className="audioStudioSimpleTimeline" aria-label="모든 음원이 공유하는 시간축">
      <div className="audioStudioSimpleRuler"><span>TRACKS</span><div>{ticks.map((timeMs) => <time key={timeMs} style={{ left: `${(timeMs / timelineDurationMs) * 100}%` }}>{formatStudioTime(timeMs)}</time>)}</div></div>
      {tracks.length ? tracks.map((track, index) => <SimpleTrackRow controller={controller} key={track.id} onDelete={onDelete} onTrim={onTrim} timelineDurationMs={timelineDurationMs} track={track} trackIndex={index} />) : (
        <div className="audioStudioSimpleEmpty"><FileAudio size={30} /><strong>편집할 음원이 없습니다.</strong><span>한 개 또는 여러 파일을 선택하면 각각 별도 TRACK에 놓입니다.</span><button disabled={controller.importing || Boolean(controller.projectOperation)} onClick={() => controller.openImportPicker("editor-new-track")} type="button"><Plus size={16} /> 음원 추가</button></div>
      )}
      {controller.importing ? <div aria-live="polite" className="audioStudioSimpleImporting"><LoaderCircle className="is-spinning" size={18} /> 파일을 분석하고 있습니다.</div> : null}
    </section>
  );
}

function SimpleEditorPlayer({ controller, onSave }) {
  const durationMs = getAudioStudioProjectDurationMs(controller.project);
  const playing = controller.playbackStatus === "playing";
  return (
    <footer className="audioStudioSimplePlayer">
      <div className="audioStudioSimplePlayerControls">
        <button aria-label="타임라인 처음으로" disabled={!durationMs || Boolean(controller.projectOperation)} onClick={() => controller.seekPlayback(0)} type="button"><SkipBack size={20} /><span>처음으로</span></button>
        <button aria-label={playing ? "일시정지" : "전체 재생"} className="is-primary" disabled={!durationMs || Boolean(controller.projectOperation)} onClick={playing ? controller.pausePlayback : () => controller.startPlayback()} type="button">{playing ? <Pause size={18} /> : <Play size={18} />}<span>{playing ? "일시정지" : "재생"}</span></button>
        <div className="audioStudioSimpleTime"><time>{formatStudioTime(controller.currentTimeMs, true)} <span>/</span> {formatStudioTime(durationMs, true)}</time><input aria-label="전체 재생 위치" disabled={!durationMs} max={Math.max(1, durationMs)} min="0" onChange={(event) => controller.seekPlayback(event.target.valueAsNumber)} step="10" type="range" value={Math.min(durationMs, controller.currentTimeMs)} /></div>
      </div>
      <div className="audioStudioSimpleSaveGroup"><button className="audioStudioSimpleSave" disabled={!durationMs || Boolean(controller.projectOperation)} onClick={onSave} type="button"><Save size={16} /> 하나로 저장</button><small>현재 배치 그대로 하나의 완성 음원으로 합칩니다.</small></div>
    </footer>
  );
}

function SimpleWaveformEditor({ controller, mobile }) {
  const [trimTrackId, setTrimTrackId] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const trimTrack = controller.project.tracks.find((track) => track.id === trimTrackId);
  const trimClip = trimTrack?.clips[0];
  const trimSource = controller.project.audioSources.find((source) => source.id === trimClip?.sourceId);
  return (
    <section className={`audioStudioSimpleEditor ${mobile ? "is-mobile" : "is-desktop"}`} data-audio-studio-screen="edit">
      <header className="audioStudioSimpleTopbar">
        <button aria-label="완성 음원 보관함으로 돌아가기" className="audioStudioSimpleBack" onClick={controller.goToLibrary} title="보관함으로 돌아가기" type="button"><ArrowLeft size={27} /></button>
        <div><h1>편집실</h1><p>여러 음원을 다듬고 하나로 합쳐보세요.</p></div>
        <button className="audioStudioSimpleAdd" disabled={controller.importing || Boolean(controller.projectOperation)} onClick={() => controller.openImportPicker("editor-new-track")} type="button"><Plus size={17} /><span>음원 추가</span></button>
      </header>
      <main><SimpleAudioTimeline controller={controller} onDelete={controller.deleteTrack} onTrim={setTrimTrackId} /><p aria-live="polite" className="audioStudioSimpleNotice">{controller.notice}</p></main>
      <SimpleEditorPlayer controller={controller} onSave={() => setSaveDialogOpen(true)} />
      <section className="audioStudioSimpleGuide"><strong>사용 방법</strong><ol><li>음원 추가</li><li>TRIM에서 구간·템포 조절</li><li>파형을 좌우로 이동</li><li>볼륨·음소거 조절</li><li>함께 재생 후 하나로 저장</li></ol></section>
      {trimClip && trimSource ? <SimpleTrimDialog clip={trimClip} controller={controller} onClose={() => setTrimTrackId("")} source={trimSource} track={trimTrack} /> : null}
      {saveDialogOpen ? <MixSaveNameDialog onClose={() => setSaveDialogOpen(false)} onSave={controller.mixSave} saving={controller.projectOperation === "mix-saving"} /> : null}
    </section>
  );
}

function AudioStudioScreenRouter({ controller, mobile }) {
  if (controller.screen === AUDIO_STUDIO_SCREENS.LIBRARY) return <AudioMixLibrary controller={controller} />;
  return <SimpleWaveformEditor controller={controller} mobile={mobile} />;
}

function MobileAudioStudioLayout({ active, controller }) {
  const focused = active && controller.screen !== AUDIO_STUDIO_SCREENS.LIBRARY;
  return <section className="audioStudio audioStudio--mobile" data-audio-studio-current-screen={controller.screen} data-audio-studio-focus={focused || undefined} data-audio-studio-layout="mobile"><AudioStudioScreenRouter controller={controller} mobile /></section>;
}

function DesktopAudioStudioLayout({ controller }) {
  return <section className="audioStudio audioStudio--desktop" data-audio-studio-layout="desktop"><AudioStudioScreenRouter controller={controller} mobile={false} /></section>;
}

export default function AudioStudio({ active = true, mobile = false }) {
  const controller = useAudioStudio();
  const focused = active && mobile && controller.screen !== AUDIO_STUDIO_SCREENS.LIBRARY;
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.toggle("audio-studio-focus-mode", focused);
    return () => document.body.classList.remove("audio-studio-focus-mode");
  }, [focused]);
  return (
    <>
      <AudioStudioHiddenImport controller={controller} />
      {mobile ? <MobileAudioStudioLayout active={active} controller={controller} /> : <DesktopAudioStudioLayout controller={controller} />}
    </>
  );
}
