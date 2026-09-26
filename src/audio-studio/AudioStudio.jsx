import { localizeUi } from "./../i18n/core.js";
import "./audio-studio.css";
import ko from "./../i18n/locales/ko.js";
import { formatMessage } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
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
  useLanguage();
  return (
    <input
      accept={controller.importAccept}
      aria-label={translateUi("audioStudio.selectAudioFiles")}
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
      <span><Translation id="originalUi.fretivaLab" /></span>
      <h1><Translation id="originalUi.audioStudio" /></h1>
      <p><Translation id="audioStudio.finishedAudioLibraryWavFiles" /></p>
    </header>
  );
}

function AudioRenameDialog({ mix, onClose, onRename }) {
  useLanguage();
  const [name, setName] = useState(mix.fileName);
  useAudioStudioModal(onClose);
  const dialog = (
    <div className="audioStudioOverlay audioStudioDialogBackdrop" role="presentation">
      <section aria-labelledby="audio-studio-rename-title" aria-modal="true" className="audioStudioDialog audioStudioDialog--compact" role="dialog">
        <header><h2 id="audio-studio-rename-title"><Translation id="audioStudio.renameAudio" /></h2><button aria-label={translateUi("common.close")} onClick={onClose} type="button"><X size={18} /></button></header>
        <label className="audioStudioDialogName"><span><Translation id="audioStudio.filename" /></span><input autoFocus maxLength="120" onChange={(event) => setName(event.target.value)} value={name} /></label>
        <small><Translation id="audioStudio.savedInWavFormatWithTheWavExtension" /></small>
        <div className="audioStudioDialogActions"><button onClick={onClose} type="button"><Translation id="common.cancel" /></button><button disabled={!name.trim()} onClick={() => onRename(mix.id, name)} type="button"><Translation id="audioStudio.change" /></button></div>
      </section>
    </div>
  );
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

function MixSaveNameDialog({ onClose, onSave, saving }) {
  useLanguage();
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
        <header><h2 id="audio-studio-mix-name-title"><Translation id="audioStudio.finishedAudioName" /></h2><button aria-label={translateUi("common.close")} disabled={saving} onClick={onClose} type="button"><X size={18} /></button></header>
        <label className="audioStudioDialogName"><span><Translation id="audioStudio.filename" /></span><input autoFocus disabled={saving} maxLength="120" onChange={(event) => setName(event.target.value)} placeholder={translateUi("audioStudio.eGGuitarMix")} value={name} /></label>
        <small><Translation id="audioStudio.savingMixesAllTracksIntoOneWavFile" /></small>
        <div className="audioStudioDialogActions"><button disabled={saving} onClick={onClose} type="button"><Translation id="common.cancel" /></button><button disabled={!name.trim() || saving} type="submit">{saving ? translateUi("audioStudio.saving") : translateUi("app.saveAMix")}</button></div>
      </form>
    </div>
  );
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

function AudioMixLibrary({ controller }) {
  useLanguage();
  const [renameMix, setRenameMix] = useState(null);
  const rename = async (mixId, name) => {
    await controller.renameSavedMix(mixId, name);
    setRenameMix(null);
  };
  return (
    <section className="audioStudioLibrary" data-audio-studio-screen="library">
      <LibraryHeader />
      <div className="audioStudioLibraryActions">
        <button onClick={controller.openEditor} type="button"><FilePlus2 size={17} /><span><Translation id="audioStudio.studio" /></span></button>
      </div>
      <div className="audioStudioLibrarySectionHeader">
        <div><span><Translation id="originalUi.myAudio" /></span><h2><Translation id="audioStudio.finishedAudio" /></h2></div>
        <small>{controller.savedMixes.length}<Translation id="audioStudio.tracks" /></small>
      </div>
      {controller.savedMixes.length ? (
        <div className="audioStudioMixList">
          {controller.savedMixes.map((saved) => {
            const isPlaying = controller.libraryMixId === saved.id && controller.libraryPlaybackStatus === "playing";
            return (
              <article className={`audioStudioMixRow ${isPlaying ? "is-playing" : ""}`} key={saved.id}>
                <button
                  aria-label={`${saved.fileName} ${isPlaying ? translateUi("app.pause") : translateUi("audioStudio.play")}`}
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
                  <small><Translation id="originalUi.wav" />{formatProjectDate(saved.updatedAt)}</small>
                </div>
                <time>{formatStudioTime(saved.durationMs)}</time>
                <div className="audioStudioMixActions">
                  <button aria-label={translateUi("audioStudio.renameValue1", { value1: saved.fileName })} onClick={() => setRenameMix(saved)} title={translateUi("audioStudio.rename")} type="button"><SlidersHorizontal size={15} /></button>
                  <button aria-label={translateUi("audioStudio.downloadValue1ToDevice", { value1: saved.fileName })} onClick={() => controller.downloadSavedMix(saved.id)} title={translateUi("audioStudio.downloadToDevice")} type="button"><Download size={15} /></button>
                  <button aria-label={translateUi("app.deleteValue1", { value1: saved.fileName })} className="is-danger" onClick={() => controller.deleteSavedMix(saved.id)} title={translateUi("common.delete")} type="button"><Trash2 size={15} /></button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="audioStudioLibraryEmpty">
          <FileAudio aria-hidden="true" size={30} />
          <h2><Translation id="audioStudio.noFinishedAudioYet" /></h2>
          <p><Translation id="audioStudio.combineSoundsInTheStudioThenUseMixSave" /></p>
        </section>
      )}
      <p aria-live="polite" className="audioStudioLibraryNotice">{localizeUi(controller.notice)}</p>
      {renameMix ? <AudioRenameDialog mix={renameMix} onClose={() => setRenameMix(null)} onRename={rename} /> : null}
    </section>
  );
}

function StudioWorkspaceTopbar({ controller, title = ko["audioStudio.studio"] }) {
  useLanguage();
  return (
    <header className="audioStudioProjectTopbar">
      <button aria-label={translateUi("audioStudio.openFinishedAudioLibrary")} onClick={controller.goToLibrary} type="button"><ArrowLeft size={19} /></button>
      <div><strong>{title}</strong><span><Translation id="audioStudio.createYourFinishedMix" /></span></div>
      <span />
    </header>
  );
}

function AudioStudioTimeline({ controller, mobile }) {
  useLanguage();
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
    <section className="audioStudioTimelineFrame" aria-label={translateUi("audioStudio.audioTimeline")}>
      <div className="audioStudioTimelineScroller" onTouchCancel={() => { pinchRef.current = null; }} onTouchEnd={() => { pinchRef.current = null; }} onTouchMove={onTouchMove} onTouchStart={onTouchStart} ref={timelineScrollerRef} tabIndex="0">
        <div className="audioStudioTimelineCanvas" style={{ "--audio-studio-timeline-width": `${timelineWidth}px` }}>
          <div className="audioStudioRulerRow">
            <strong><Translation id="originalUi.tracks" /></strong>
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
                  <span aria-label={translateUi("audioStudio.reorderValue1", { value1: track.name })} className="audioStudioTrackDrag" onPointerDown={(event) => beginTrackPointerReorder(event, track.id)} role="button" tabIndex="0"><GripVertical size={14} /></span>
                  <strong title={track.name}><b><Translation id="originalUi.track" />{trackIndex + 1}</b><span>{track.name}</span></strong>
                  <div className="audioStudioTrackSwitches">
                    <button aria-label={translateUi("audioStudio.muteValue1", { value1: track.name })} aria-pressed={track.mute} className={track.mute ? "is-on" : ""} onClick={(event) => { event.stopPropagation(); controller.updateTrack(track.id, { mute: !track.mute }); }} type="button"><Translation id="originalUi.muteAudiostudio" /></button>
                    <button aria-label={translateUi("audioStudio.soloValue1", { value1: track.name })} aria-pressed={track.solo} className={track.solo ? "is-on" : ""} onClick={(event) => { event.stopPropagation(); controller.updateTrack(track.id, { solo: !track.solo }); }} type="button"><Translation id="originalUi.solo" /></button>
                  </div>
                  <label className="audioStudioTrackVolume" onClick={(event) => event.stopPropagation()}><span><Translation id="originalUi.vol" /></span><input aria-label={translateUi("app.value1Volume", { value1: track.name })} max="2" min="0" onChange={(event) => controller.updateTrack(track.id, { volume: event.target.valueAsNumber })} step="0.05" type="range" value={track.volume} /></label>
                  <label className="audioStudioTrackBpm" onClick={(event) => event.stopPropagation()}><span><Translation id="originalUi.bpm" /></span><input aria-label={`${track.name} BPM`} max="240" min="0" onChange={(event) => controller.updateTrack(track.id, { bpm: event.target.valueAsNumber })} placeholder="—" step="1" type="number" value={track.bpm || ""} /></label>
                  {track.bpm && Math.abs(track.bpm - project.settings.projectBpm) >= 0.5 ? <button className="audioStudioBpmMatch" disabled={Boolean(controller.projectOperation)} onClick={(event) => { event.stopPropagation(); controller.matchTrackBpm(track.id); }} type="button">{Math.round(track.bpm)}→{Math.round(project.settings.projectBpm)}<Translation id="audioStudio.match" /></button> : null}
                </header>
                <div className={`audioStudioTrackLane ${track.clips.length ? "" : "is-empty"}`} data-track-id={track.id} onPointerDown={(event) => beginRangeSelection(event, track)}>
                  {!track.clips.length ? <div className="audioStudioTrackLaneEmpty"><FileAudio aria-hidden="true" size={16} /><b><Translation id="audioStudio.noAudio" /></b><div><button onPointerDown={(event) => event.stopPropagation()} onClick={() => controller.openImportPicker("editor-new-track")} type="button"><Upload size={13} /><Translation id="audioStudio.addAudio" /></button><button onPointerDown={(event) => event.stopPropagation()} onClick={() => controller.startRecording(track.id)} type="button"><Mic size={13} /><Translation id="audioStudio.record" /></button></div></div> : null}
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
                        <span className={`audioStudioWaveform ${waveformPeaks.length ? "" : "is-empty"}`} onPointerDown={(event) => beginWaveformRangeSelection(event, track, clip)}>{waveformPeaks.length ? waveformPeaks.map((peak, index) => <i aria-hidden="true" key={`${clip.id}-${index}`} style={{ height: `${Math.max(6, peak * 92)}%` }} />) : <em><Translation id="audioStudio.generatingWaveform" /></em>}</span>
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
                      <button aria-label={translateUi("audioStudio.adjustSelectionStart")} className="is-start" onPointerDown={(event) => beginRangeHandleDrag(event, "start")} type="button" />
                      <small>{formatStudioTime(rangeSelection.startMs, true)} – {formatStudioTime(rangeSelection.endMs, true)}</small>
                      <button aria-label={translateUi("audioStudio.adjustSelectionEnd")} className="is-end" onPointerDown={(event) => beginRangeHandleDrag(event, "end")} type="button" />
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
          <span aria-hidden="true" className="audioStudioPlayhead" style={{ "--audio-studio-playhead-x": `${controller.currentTimeMs / 1_000 * pixelsPerSecond}px` }} />
          {controller.snapGuideMs !== null ? <span aria-hidden="true" className="audioStudioSnapGuide" style={{ "--audio-studio-snap-x": `${controller.snapGuideMs / 1_000 * pixelsPerSecond}px` }}><i><Translation id="originalUi.snap" /></i></span> : null}
        </div>
      </div>
      {controller.importing ? <div aria-live="polite" className="audioStudioWaveformAnalyzing"><LoaderCircle aria-hidden="true" className="is-spinning" size={19} /><strong><Translation id="audioStudio.analyzingWaveform" /></strong><span><Translation id="audioStudio.theFilenameAndWaveformWillAppearWhenReady" /></span></div> : null}
      {mobile ? <small className="audioStudioPinchHint"><Translation id="audioStudio.pinchToZoomTheTimeline" /></small> : null}
    </section>
  );
}

function AudioStudioTransport({ controller, mobile }) {
  useLanguage();
  const durationMs = getAudioStudioProjectDurationMs(controller.project);
  const playing = controller.playbackStatus === "playing";
  const recordingPhase = controller.recordingState.phase;
  const recording = recordingPhase === "recording";
  const recordingBusy = ["requesting", "count-in", "recording", "processing"].includes(recordingPhase);
  return (
    <section className={`audioStudioTransport ${mobile ? "is-mobile" : "is-desktop"}`} aria-label={translateUi("audioStudio.playbackAndTimelineNavigation")}>
      <output title={`${formatStudioTime(controller.currentTimeMs, true)} / ${formatStudioTime(durationMs, true)}`}><strong>{formatStudioTime(controller.currentTimeMs, true)}</strong><span>/ {formatStudioTime(durationMs, true)}</span></output>
      <div className="audioStudioTransportPlayback">
        <button aria-label={playing ? translateUi("app.pause") : translateUi("audioStudio.play")} className="is-primary" onClick={playing ? controller.pausePlayback : () => controller.startPlayback()} type="button">{playing ? <Pause size={17} /> : <Play size={17} />}</button>
        <button aria-label={recordingBusy ? translateUi("audioStudio.stopRecording") : translateUi("audioStudio.recordNow")} aria-pressed={recordingBusy} className={`audioStudioTransportRecord ${recording ? "is-recording" : ""}`} onClick={recordingBusy ? controller.stopRecording : () => controller.startRecording()} type="button">{recordingBusy ? <Square size={13} /> : <Mic size={15} />}<span>{recording ? "REC" : recordingPhase === "count-in" ? "COUNT" : recordingPhase === "processing" ? translateUi("app.saving") : "REC"}</span></button>
        <button aria-label={translateUi("audioStudio.loopSelection")} aria-pressed={controller.project.practice.loop.enabled} className="audioStudioTransportLoop" onClick={() => controller.updatePractice({ loop: { enabled: !controller.project.practice.loop.enabled } })} type="button"><Translation id="originalUi.loop" /><span>{controller.project.practice.loop.enabled ? "ON" : "OFF"}</span></button>
      </div>
      {!mobile ? <div className="audioStudioTimelineNavigation">
        <button aria-label={translateUi("audioStudio.zoomOut")} onClick={() => controller.setTimelineZoom(controller.project.settings.pixelsPerSecond / 1.5)} type="button"><ZoomOut size={16} /></button>
        <button onClick={controller.requestProjectFit} type="button"><Maximize2 size={15} /><span><Translation id="audioStudio.fitAll" /></span></button>
        {controller.selectedClipIds.length ? <button onClick={() => controller.fitSelection(mobile ? 260 : 760)} type="button"><Maximize2 size={15} /><span><Translation id="originalUi.select" /></span></button> : null}
        <button aria-label={translateUi("audioStudio.zoomIn")} onClick={() => controller.setTimelineZoom(controller.project.settings.pixelsPerSecond * 1.5)} type="button"><ZoomIn size={16} /></button>
      </div> : null}
      <div className="audioStudioTempoControls">
        <label><span><Translation id="audioStudio.masterBpm" /></span><input max="240" min="40" onChange={(event) => controller.updateEditorSettings({ projectBpm: event.target.valueAsNumber })} step="1" type="number" value={controller.project.settings.projectBpm} /></label>
        <label><span><Translation id="originalUi.countInAudiostudio" /></span><select onChange={(event) => controller.updateEditorSettings({ countInBars: Number(event.target.value) })} value={controller.project.settings.countInBars}><option value="0"><Translation id="originalUi.off" /></option><option value="1"><Translation id="audioStudio.1Bar" /></option><option value="2"><Translation id="audioStudio.2Bars" /></option></select></label>
      </div>
      {recordingPhase === "count-in" ? <div aria-live="assertive" className="audioStudioCountIn"><span><Translation id="originalUi.countInAudiostudio" /></span><strong>{controller.recordingState.beat}</strong><small><Translation id="audioStudio.headphonesRecommended" /></small></div> : null}
      {recording ? <div aria-live="polite" className="audioStudioRecordingBanner"><i /><Translation id="audioStudio.recordingRecordingANewTrackWhilePlayingExistingTracks" /></div> : null}
    </section>
  );
}

function ContextButton({ disabled, icon: Icon, label, onClick }) {
  useLanguage();
  return <button disabled={disabled} onClick={onClick} title={localizeUi(label)} type="button">{Icon ? <Icon size={15} /> : null}<span>{localizeUi(label)}</span></button>;
}

function AudioStudioContextToolbar({ controller }) {
  useLanguage();
  const count = controller.selectedClipIds.length;
  const addMenuRef = useRef(null);
  useEffect(() => {
    addMenuRef.current?.removeAttribute("open");
  }, [controller.importCompletionId]);
  let actions;
  if (controller.rangeSelection) {
    actions = [
      [null, ko["audioStudio.trim"], controller.trimRangeSelection],
      [Scissors, ko["audioStudio.split"], controller.splitRangeSelection],
      [Trash2, ko["common.delete"], controller.deleteRangeSelection],
      [Copy, ko["audioStudio.copy"], controller.duplicateRangeSelection],
      [null, ko["audioStudio.loopSelection"], controller.loopRangeSelection],
    ];
  } else if (!count) {
    actions = [
      [Undo2, ko["app.undo"], controller.canUndo ? controller.undo : null],
      [Redo2, ko["app.redo"], controller.canRedo ? controller.redo : null],
    ];
  } else if (count === 1) {
    actions = [
      [Scissors, ko["audioStudio.split"], controller.splitSelection],
      [null, ko["audioStudio.trimStart"], () => controller.trimSelection("start")],
      [null, ko["audioStudio.trimEnd"], () => controller.trimSelection("end")],
      [Copy, ko["audioStudio.copy2"], controller.duplicateSelection],
      [Trash2, ko["common.delete"], controller.deleteSelection],
      [Undo2, ko["app.undo"], controller.canUndo ? controller.undo : null],
    ];
  } else {
    actions = [
      [Copy, ko["audioStudio.copy2"], controller.duplicateSelection],
      [Trash2, ko["common.delete"], controller.deleteSelection],
      [Undo2, ko["app.undo"], controller.canUndo ? controller.undo : null],
    ];
  }
  return (
    <section className="audioStudioContextToolbar" aria-label={translateUi("audioStudio.selectionEditingTools")}>
      <div className="audioStudioContextLabel"><span>{controller.rangeSelection ? translateUi("audioStudio.waveformRange") : count ? translateUi("audioStudio.value1ClipsSelected", { value1: count }) : "TRACK + WAVEFORM"}</span><small>{controller.rangeSelection ? translateUi("audioStudio.dragTheHandlesToFineTuneTheRange") : count ? translateUi("audioStudio.applyToSelectedClips") : translateUi("audioStudio.dragOnAWaveformToShowRangeTools")}</small></div>
      <details className="audioStudioDesktopAddMenu" ref={addMenuRef}><summary><Plus size={15} /><Translation id="audioStudio.addAudioAudioStudio" /></summary><div><button onClick={() => controller.openImportPicker("editor-new-track")} type="button"><Upload size={14} /><Translation id="audioStudio.importFiles" /></button><button onClick={() => controller.startRecording()} type="button"><Mic size={14} /><Translation id="audioStudio.recordNowAudioStudio" /></button></div></details>
      <div className="audioStudioContextActions">{actions.map(([icon, label, action]) => <ContextButton disabled={!action} icon={icon} key={label} label={localizeUi(label)} onClick={action} />)}</div>
    </section>
  );
}

function MobileTimelineToolbar({ controller }) {
  useLanguage();
  const toolbarRef = useRef(null);
  useEffect(() => {
    toolbarRef.current?.querySelectorAll("details[open]").forEach((details) => details.removeAttribute("open"));
  }, [controller.importCompletionId]);
  return (
    <section className="audioStudioMobileTimelineToolbar" aria-label={translateUi("audioStudio.timelineQuickTools")} ref={toolbarRef}>
      <details>
        <summary aria-label={translateUi("audioStudio.addAudioToTimeline")}><Plus size={16} /><span><Translation id="app.addAudio" /></span></summary>
        <div>
          <button onClick={() => controller.openImportPicker("editor-new-track")} type="button"><Upload size={14} /><Translation id="audioStudio.importFiles" /></button>
          <button onClick={() => controller.startRecording()} type="button"><Mic size={14} /><Translation id="audioStudio.recordNowAudioStudio" /></button>
        </div>
      </details>
      <button disabled={!controller.canUndo} onClick={controller.undo} type="button"><Undo2 size={15} /><span><Translation id="app.undo" /></span></button>
      <button disabled={!controller.canRedo} onClick={controller.redo} type="button"><Redo2 size={15} /><span><Translation id="app.redo" /></span></button>
      <details className="audioStudioMobileTimelineOptions">
        <summary aria-label={translateUi("audioStudio.viewAndPracticeOptions")}><MoreHorizontal size={17} /><span><Translation id="audioStudio.more" /></span></summary>
        <div>
          <button onClick={controller.requestProjectFit} type="button"><Maximize2 size={14} /><Translation id="audioStudio.fitSong" /></button>
          <button onClick={() => controller.setTimelineZoom(controller.project.settings.pixelsPerSecond / 1.5)} type="button"><ZoomOut size={14} /><Translation id="audioStudio.zoomOutAudioStudio" /></button>
          <button onClick={() => controller.setTimelineZoom(controller.project.settings.pixelsPerSecond * 1.5)} type="button"><ZoomIn size={14} /><Translation id="audioStudio.zoomInAudioStudio" /></button>
          <button onClick={() => controller.setLoopPoint("start")} type="button"><Translation id="audioStudio.setLoopAHere" /></button>
          <button onClick={() => controller.setLoopPoint("end")} type="button"><Translation id="audioStudio.setLoopBHere" /></button>
          <button onClick={controller.goToLibrary} type="button"><FolderOpen size={14} /><Translation id="audioStudio.finishedAudioLibrary" /></button>
        </div>
      </details>
    </section>
  );
}

function MobileContextToolbar({ controller, onOpenInspector }) {
  useLanguage();
  const count = controller.selectedClipIds.length;
  const selectedTrack = controller.project.tracks.find((track) => track.id === controller.selectedTrackId);
  if (!count && !selectedTrack && !controller.rangeSelection) return null;
  let label = ko["audioStudio.track"];
  let actions = selectedTrack ? [
    [null, selectedTrack.mute ? ko["audioStudio.unmute"] : ko["audioStudio.muteAudioStudio"], () => controller.updateTrack(selectedTrack.id, { mute: !selectedTrack.mute })],
    [null, selectedTrack.solo ? ko["audioStudio.unsolo"] : ko["audioStudio.soloAudioStudio"], () => controller.updateTrack(selectedTrack.id, { solo: !selectedTrack.solo })],
    [SlidersHorizontal, ko["audioStudio.volume"], onOpenInspector],
    [null, ko["audioStudio.up"], () => controller.moveActiveTrack("up")],
    [null, ko["audioStudio.down"], () => controller.moveActiveTrack("down")],
    [Trash2, ko["audioStudio.deleteTrack"], controller.deleteActiveTrack],
  ] : [];
  if (controller.rangeSelection) {
    label = ko["audioStudio.waveformRange2"];
    actions = [
      [null, ko["audioStudio.trim"], controller.trimRangeSelection],
      [Scissors, ko["audioStudio.split"], controller.splitRangeSelection],
      [Trash2, ko["common.delete"], controller.deleteRangeSelection],
      [Copy, ko["audioStudio.copy"], controller.duplicateRangeSelection],
      [null, ko["audioStudio.loopSelection"], controller.loopRangeSelection],
    ];
  } else if (count === 1) {
    label = ko["audioStudio.clip"];
    actions = [
      [Scissors, ko["audioStudio.split"], controller.splitSelection],
      [null, ko["audioStudio.trimStart"], () => controller.trimSelection("start")],
      [null, ko["audioStudio.trimEnd"], () => controller.trimSelection("end")],
      [Copy, ko["audioStudio.copy2"], controller.duplicateSelection],
      [Trash2, ko["common.delete"], controller.deleteSelection],
      [Undo2, ko["app.undo"], controller.canUndo ? controller.undo : null],
    ];
  } else if (count > 1) {
    label = formatMessage(ko["audioStudio.value1Clips"], { value1: count });
    actions = [
      [Copy, ko["audioStudio.copy2"], controller.duplicateSelection],
      [Trash2, ko["common.delete"], controller.deleteSelection],
      [Undo2, ko["app.undo"], controller.canUndo ? controller.undo : null],
    ];
  }
  return (
    <section className="audioStudioMobileContextToolbar" aria-label={translateUi("audioStudio.value1ContextTools", { value1: label })}>
      <small>{localizeUi(label)} · {controller.rangeSelection ? translateUi("audioStudio.adjustRangeWithBothHandles") : translateUi("audioStudio.dragOnTheTimelineToMove")}</small>
      <div>{actions.map(([icon, actionLabel, action]) => <ContextButton icon={icon} key={actionLabel} label={localizeUi(actionLabel)} onClick={action} />)}</div>
    </section>
  );
}

function InspectorField({ children, label }) {
  useLanguage();
  return <label className="audioStudioInspectorField"><span>{localizeUi(label)}</span>{children}</label>;
}

function ClipInspector({ controller, tab }) {
  useLanguage();
  const clip = controller.selectedClips[0];
  if (!clip) return <TrackInspector controller={controller} />;
  const source = controller.project.audioSources.find((item) => item.id === clip.sourceId);
  const update = (updates) => controller.updateSelectedClips(updates);
  if (tab === "practice") return <PracticeInspector controller={controller} />;
  if (tab === "edit") {
    return (
      <div className="audioStudioInspectorPanel">
        <div className="audioStudioSourceName"><span><Translation id="audioStudio.originalFile" /></span><strong title={source?.fileName || clip.name}>{source?.fileName || clip.name}</strong></div>
        <InspectorField label={translateUi("audioStudio.clipName")}><input maxLength="240" onChange={(event) => update({ name: event.target.value })} value={clip.name} /></InspectorField>
        <div className="audioStudioInspectorPair">
          <InspectorField label={translateUi("audioStudio.startMs")}><input min="0" onChange={(event) => update({ timelineStartMs: event.target.valueAsNumber })} step="10" type="number" value={Math.round(clip.timelineStartMs)} /></InspectorField>
          <InspectorField label={translateUi("audioStudio.lengthMs")}><input min="10" readOnly type="number" value={Math.round(clip.durationMs)} /></InspectorField>
        </div>
        <p className="audioStudioInspectorHint"><Translation id="audioStudio.dragEitherEndOfTheClipToTrimPrecisely" /></p>
        <div className="audioStudioInspectorCommands"><button onClick={controller.splitSelection} type="button"><Translation id="audioStudio.splitAtPlayhead" /></button><button onClick={controller.deleteSelection} type="button"><Translation id="audioStudio.deleteClip" /></button></div>
      </div>
    );
  }
  return (
    <div className="audioStudioInspectorPanel">
      {controller.selectedClips.length > 1 ? <p className="audioStudioGroupStatus">{controller.selectedClips.length}<Translation id="audioStudio.clipsApplyGroupValues" /></p> : null}
      <div className="audioStudioInspectorPair">
        <InspectorField label={translateUi("audioStudio.clipVolume")}><input max="2" min="0" onChange={(event) => update({ volume: event.target.valueAsNumber })} step="0.01" type="number" value={clip.volume} /></InspectorField>
        <InspectorField label={translateUi("audioStudio.fadeInMs")}><input min="0" onChange={(event) => update({ fadeInMs: event.target.valueAsNumber })} step="10" type="number" value={clip.fadeInMs} /></InspectorField>
        <InspectorField label={translateUi("audioStudio.fadeOutMs")}><input min="0" onChange={(event) => update({ fadeOutMs: event.target.valueAsNumber })} step="10" type="number" value={clip.fadeOutMs} /></InspectorField>
      </div>
      <div className="audioStudioToggleRow"><label><input checked={clip.mute} onChange={() => update({ mute: !clip.mute })} type="checkbox" /><Translation id="audioStudio.muteThisClip" /></label></div>
    </div>
  );
}

function TrackInspector({ controller }) {
  useLanguage();
  const track = controller.activeTrack;
  if (!track) return null;
  return (
    <div className="audioStudioInspectorPanel">
      <div className="audioStudioInspectorContext"><span><Translation id="audioStudio.selectedTrack" /></span><strong>{track.name}</strong></div>
      <InspectorField label={translateUi("audioStudio.trackName")}><input maxLength="80" onChange={(event) => controller.updateActiveTrack({ name: event.target.value })} value={track.name} /></InspectorField>
      <div className="audioStudioInspectorPair"><InspectorField label={translateUi("audioStudio.detectedManualBpm")}><input max="240" min="0" onChange={(event) => controller.updateActiveTrack({ bpm: event.target.valueAsNumber })} placeholder={translateUi("audioStudio.notDetected")} step="1" type="number" value={track.bpm || ""} /></InspectorField><InspectorField label={translateUi("audioStudio.masterBpm")}><input max="240" min="40" onChange={(event) => controller.updateEditorSettings({ projectBpm: event.target.valueAsNumber })} step="1" type="number" value={controller.project.settings.projectBpm} /></InspectorField></div>
      {track.bpm && Math.abs(track.bpm - controller.project.settings.projectBpm) >= 0.5 ? <button className="audioStudioInspectorBpmMatch" disabled={Boolean(controller.projectOperation)} onClick={() => controller.matchTrackBpm(track.id)} type="button">{Math.round(track.bpm)} → {Math.round(controller.project.settings.projectBpm)}<Translation id="audioStudio.matchBpmPreservePitch" /></button> : null}
      <InspectorField label={translateUi("audioStudio.trackVolume")}><input max="2" min="0" onChange={(event) => controller.updateActiveTrack({ volume: event.target.valueAsNumber })} step="0.01" type="range" value={track.volume} /></InspectorField>
      <div className="audioStudioToggleRow"><label><input checked={track.mute} onChange={() => controller.updateActiveTrack({ mute: !track.mute })} type="checkbox" /><Translation id="audioStudio.mute" /></label><label><input checked={track.solo} onChange={() => controller.updateActiveTrack({ solo: !track.solo })} type="checkbox" /><Translation id="audioStudio.solo" /></label></div>
      <div className="audioStudioInspectorCommands"><button onClick={() => controller.moveActiveTrack("up")} type="button"><Translation id="audioStudio.moveUp" /></button><button onClick={() => controller.moveActiveTrack("down")} type="button"><Translation id="audioStudio.moveDown" /></button><button disabled={controller.project.tracks.length <= 1} onClick={controller.deleteActiveTrack} type="button"><Translation id="audioStudio.deleteTrack" /></button></div>
    </div>
  );
}

function PracticeInspector({ controller }) {
  const practice = controller.project.practice;
  return (
    <div className="audioStudioInspectorPanel">
      <div className="audioStudioInspectorCommands"><button onClick={() => controller.setLoopPoint("start")} type="button"><Translation id="originalUi.setLoopA" /></button><button onClick={() => controller.setLoopPoint("end")} type="button"><Translation id="originalUi.setLoopB" /></button></div>
      <div className="audioStudioInspectorPair"><InspectorField label="SPEED"><input max="2" min="0.25" onChange={(event) => controller.updatePractice({ speed: { current: event.target.valueAsNumber } })} step="0.05" type="number" value={practice.speed.current} /></InspectorField><InspectorField label="PITCH"><input max="12" min="-12" onChange={(event) => controller.updatePractice({ pitchSemitones: event.target.valueAsNumber })} step="1" type="number" value={practice.pitchSemitones} /></InspectorField><InspectorField label="LOOP A ms"><input min="0" onChange={(event) => controller.updatePractice({ loop: { startMs: event.target.valueAsNumber } })} step="10" type="number" value={practice.loop.startMs} /></InspectorField><InspectorField label="LOOP B ms"><input min="0" onChange={(event) => controller.updatePractice({ loop: { endMs: event.target.valueAsNumber } })} step="10" type="number" value={practice.loop.endMs} /></InspectorField><InspectorField label="REPEAT"><input max="999" min="1" onChange={(event) => controller.updatePractice({ repeat: { count: event.target.valueAsNumber } })} type="number" value={practice.repeat.count} /></InspectorField></div>
      <div className="audioStudioToggleRow"><label><input checked={practice.loop.enabled} onChange={() => controller.updatePractice({ loop: { enabled: !practice.loop.enabled } })} type="checkbox" /><Translation id="originalUi.aBLoop" /></label><label><input checked={practice.repeat.enabled} onChange={() => controller.updatePractice({ repeat: { enabled: !practice.repeat.enabled } })} type="checkbox" /><Translation id="originalUi.repeatAudiostudio" /></label><label><input checked={practice.speed.stepEnabled} onChange={() => controller.updatePractice({ speed: { stepEnabled: !practice.speed.stepEnabled } })} type="checkbox" /><Translation id="originalUi.stepUp" /></label></div>
    </div>
  );
}

function EditorInspector({ controller, mobile, onClose, open = false }) {
  useLanguage();
  const [tab, setTab] = useState("edit");
  const tabs = [["edit", ko["common.edit"]], ["audio", ko["audioStudio.volumeFades"]], ["practice", ko["audioStudio.practice"]]];
  const content = <><div className="audioStudioInspectorTabs" role="tablist">{tabs.map(([key, label]) => <button aria-selected={tab === key} key={key} onClick={() => setTab(key)} role="tab" type="button">{localizeUi(label)}</button>)}</div><ClipInspector controller={controller} tab={tab} /></>;
  if (mobile) {
    if (!open) return null;
    return (
      <div className="audioStudioInspectorSheetLayer" role="presentation">
        <button aria-label={translateUi("audioStudio.closeInspector")} className="audioStudioInspectorSheetDim" onClick={onClose} type="button" />
        <section aria-label={translateUi("originalUi.audioInspector")} aria-modal="true" className="audioStudioInspectorSheet" role="dialog">
          <header><span><strong>{controller.selectedClipIds.length ? translateUi("audioStudio.value1ClipsSelected", { value1: controller.selectedClipIds.length }) : controller.activeTrack?.name || translateUi("audioStudio.trackSettings")}</strong><small><Translation id="audioStudio.essentialSettings" /></small></span><button aria-label={translateUi("audioStudio.closeInspector")} onClick={onClose} type="button"><X size={17} /></button></header>
          <div className="audioStudioInspectorSheetBody">{content}</div>
        </section>
      </div>
    );
  }
  return <aside className="audioStudioInspector">{content}</aside>;
}

function WorkspaceNavigation({ controller, screen }) {
  return (
    <nav className="audioStudioWorkspaceNav" aria-label={translateUi("originalUi.audioStudioWorkspace")}>
      <button aria-current={screen === AUDIO_STUDIO_SCREENS.EDIT ? "page" : undefined} onClick={controller.goToEditor} type="button"><Translation id="audioStudio.waveformEditing" /></button>
      <button aria-current={screen === AUDIO_STUDIO_SCREENS.MIX ? "page" : undefined} onClick={controller.goToMixer} type="button"><Translation id="audioStudio.saveMix" /></button>
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
  useLanguage();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const master = controller.project.mixer.master;
  const hasAudio = getAudioStudioProjectDurationMs(controller.project) > 0;
  return (
    <section className="audioStudioMixerWorkspace" data-audio-studio-screen="mix">
      <StudioWorkspaceTopbar controller={controller} title={translateUi("audioStudio.saveMix")} />
      <WorkspaceNavigation controller={controller} screen={AUDIO_STUDIO_SCREENS.MIX} />
      <AudioStudioTransport controller={controller} mobile={mobile} />
      <header className="audioStudioMixerHeader"><div><span><Translation id="originalUi.volumeBalance" /></span><h1><Translation id="audioStudio.balanceTheLevels" /></h1><p><Translation id="audioStudio.compareAllTracksInOneView" /></p></div><div className={`audioStudioMasterMeter ${controller.masterLevel > 0.98 ? "is-clipping" : ""}`}><i style={{ height: `${Math.max(2, controller.masterLevel * 100)}%` }} /></div></header>
      <div className={`audioStudioMixerChannels ${mobile ? "is-mobile" : "is-desktop"}`}>
        {controller.project.tracks.map((track, index) => (
          <section className="audioStudioMixerChannel" key={track.id}>
            <header><span><Translation id="originalUi.track" />{index + 1}</span><strong title={track.name}>{track.name}</strong></header>
            <div className="audioStudioMixerChannelButtons"><button aria-pressed={track.mute} onClick={() => controller.updateTrack(track.id, { mute: !track.mute })} type="button"><Translation id="audioStudio.muteAudioStudio" /></button><button aria-pressed={track.solo} onClick={() => controller.updateTrack(track.id, { solo: !track.solo })} type="button"><Translation id="audioStudio.soloAudioStudio" /></button></div>
            <label><span><Translation id="audioStudio.volume" /></span><input max="2" min="0" onChange={(event) => controller.updateTrack(track.id, { volume: event.target.valueAsNumber })} step="0.01" type="range" value={track.volume} /><output>{Math.round(track.volume * 100)}%</output></label>
          </section>
        ))}
        <section className="audioStudioMixerChannel audioStudioMixerChannel--master">
          <header><span><Translation id="originalUi.master" /></span><strong><Translation id="audioStudio.masterOutput" /></strong></header>
          <label><span><Translation id="audioStudio.masterVolume" /></span><input max="2" min="0" onChange={(event) => controller.updateMaster({ volume: event.target.valueAsNumber })} step="0.01" type="range" value={master.volume} /><output>{Math.round(master.volume * 100)}%</output></label>
        </section>
      </div>
      <div className="audioStudioMixSaveArea">
        <button className="audioStudioMixerExport" disabled={!hasAudio || controller.projectOperation === "mix-saving"} onClick={() => setSaveDialogOpen(true)} type="button"><Save size={15} /><Translation id="originalUi.mixSave" /></button>
        <small><Translation id="audioStudio.previewTheFullMixThenSaveAWavFileToTheAudio" /></small>
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
  useLanguage();
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
    setAnalysisMessage(ko["audioStudio.readyToRestoreTheOriginalRangeAndSpeedPressApply"]);
  };
  const useDetectedBpm = () => {
    if (!detectedBpm) {
      setAnalysisMessage(ko["audioStudio.couldnTReliablyDetectThisTrackSBpmEnterTheOriginalBpm"]);
      return;
    }
    setSourceBpm(String(detectedBpm));
    if (!Number(targetBpm)) setTargetBpm(String(detectedBpm));
    setAnalysisMessage(formatMessage(ko["audioStudio.loadedTheImportEstimateValue1Bpm"], { value1: detectedBpm }));
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
        <header><div><h2 id="audio-studio-simple-trim-title"><Translation id="audioStudio.trimRange" /></h2><strong>{source.fileName || track.name}</strong><span><Translation id="audioStudio.useTheHandlesToSelectTheRangeToKeep" /></span></div><button aria-label={translateUi("common.close")} disabled={processing} onClick={onClose} type="button"><X size={22} /></button></header>
        <div className="audioStudioSimpleTrimRuler" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <time key={index} style={{ left: `${index * 25}%` }}>{formatStudioTime(durationMs * index / 4)}</time>)}</div>
        <div className="audioStudioSimpleTrimWaveform" onPointerCancel={endTrim} onPointerDown={beginTrim} onPointerMove={moveTrim} onPointerUp={endTrim} ref={waveformRef}>
          <div aria-hidden="true" className="audioStudioSimpleTrimBars">{peaks.map((peak, index) => <i key={index} style={{ height: `${Math.max(5, peak * 100)}%` }} />)}</div>
          <i aria-hidden="true" className="audioStudioSimpleTrimMask is-start" style={{ width: `${startPercent}%` }} />
          <i aria-hidden="true" className="audioStudioSimpleTrimMask is-end" style={{ width: `${100 - endPercent}%` }} />
          <i aria-hidden="true" className="audioStudioSimpleTrimSelection" style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }} />
          <button aria-label={translateUi("audioStudio.useAudioFromValue1", { value1: formatStudioTime(startMs, true) })} aria-valuemax={durationMs} aria-valuemin="0" aria-valuenow={Math.round(startMs)} className="audioStudioSimpleTrimHandle is-start" data-label="START" data-trim-handle="start" onKeyDown={(event) => handleTrimKey(event, "start")} role="slider" style={{ left: `${startPercent}%` }} type="button" />
          <button aria-label={translateUi("audioStudio.useAudioThroughValue1", { value1: formatStudioTime(endMs, true) })} aria-valuemax={durationMs} aria-valuemin="0" aria-valuenow={Math.round(endMs)} className="audioStudioSimpleTrimHandle is-end" data-label="END" data-trim-handle="end" onKeyDown={(event) => handleTrimKey(event, "end")} role="slider" style={{ left: `${endPercent}%` }} type="button" />
        </div>
        <div className="audioStudioSimpleTrimTimes">
          <span><small><Translation id="originalUi.start" /></small><strong>{formatStudioTime(startMs, true)}</strong><div><button aria-label={translateUi("audioStudio.moveStartBack001S")} onClick={() => nudgeBoundary("start", -10)} type="button"><Minus size={14} /></button><button aria-label={translateUi("audioStudio.moveStartForward001S")} onClick={() => nudgeBoundary("start", 10)} type="button"><Plus size={14} /></button></div></span>
          <span><small><Translation id="originalUi.end" /></small><strong>{formatStudioTime(endMs, true)}</strong><div><button aria-label={translateUi("audioStudio.moveEndBack001S")} onClick={() => nudgeBoundary("end", -10)} type="button"><Minus size={14} /></button><button aria-label={translateUi("audioStudio.moveEndForward001S")} onClick={() => nudgeBoundary("end", 10)} type="button"><Plus size={14} /></button></div></span>
          <span><small><Translation id="originalUi.length" /></small><strong>{formatStudioTime(endMs - startMs, true)}</strong><em><Translation id="audioStudio.selection" /></em></span>
        </div>
        <div className="audioStudioSimpleTrimPreview" aria-label={translateUi("audioStudio.previewSelection")}>
          <div><button aria-label={translateUi("audioStudio.goToSelectionStart")} disabled={processing} onClick={() => controller.setPlaybackPosition(0)} type="button"><SkipBack size={19} /></button><button aria-label={previewPlaying ? translateUi("audioStudio.pausePreview") : translateUi("audioStudio.playSelection")} className="is-primary" disabled={processing} onClick={togglePreview} type="button">{previewPlaying ? <Pause size={20} /> : <Play size={20} />}</button><button aria-label={translateUi("audioStudio.goToSelectionEnd")} disabled={processing} onClick={() => controller.setPlaybackPosition(previewDurationMs)} type="button"><SkipForward size={19} /></button></div>
          <section><time>{formatStudioTime(Math.min(controller.currentTimeMs, previewDurationMs), true)} <span>/</span> {formatStudioTime(previewDurationMs, true)}</time><input aria-label={translateUi("audioStudio.selectionPlayhead")} disabled={processing} max={Math.max(1, previewDurationMs)} min="0" onChange={(event) => controller.setPlaybackPosition(event.target.valueAsNumber)} step="10" type="range" value={Math.min(previewDurationMs, controller.currentTimeMs)} /></section>
        </div>
        <section className={`audioStudioTrimStretch ${stretchEnabled ? "is-enabled" : ""}`}>
          <header><div><strong><Translation id="originalUi.timeStretch" /></strong><span><Translation id="audioStudio.speedTempoPreservePitch" /></span></div><button aria-label={translateUi("originalUi.timeStretch")} aria-checked={stretchEnabled} className="audioStudioTrimStretchToggle" disabled={processing} onClick={() => setStretchEnabled((value) => !value)} role="switch" type="button"><i /></button></header>
          <div className="audioStudioTrimStretchFields">
            <label><span><Translation id="audioStudio.originalBpm" /><small><Translation id="audioStudio.detected" /></small></span><div><input disabled={!stretchEnabled || processing} inputMode="decimal" max="320" min="1" onChange={(event) => setSourceBpm(event.target.value)} placeholder={translateUi("audioStudio.manual")} step="0.1" type="number" value={sourceBpm} /><button disabled={!stretchEnabled || processing} onClick={useDetectedBpm} type="button"><Translation id="audioStudio.analyzeBpm" /></button></div></label>
            <b aria-hidden="true">→</b>
            <label><span><Translation id="audioStudio.targetBpm" /></span><div><input disabled={!stretchEnabled || processing} inputMode="decimal" max="320" min="1" onChange={(event) => setTargetBpm(event.target.value)} placeholder={translateUi("audioStudio.manual")} step="0.1" type="number" value={targetBpm} /><button aria-label={translateUi("audioStudio.decreaseTargetBpmBy1")} disabled={!stretchEnabled || processing} onClick={() => changeTargetBpm(-1)} type="button"><Minus size={15} /></button><button aria-label={translateUi("audioStudio.increaseTargetBpmBy1")} disabled={!stretchEnabled || processing} onClick={() => changeTargetBpm(1)} type="button"><Plus size={15} /></button></div></label>
          </div>
          <div className={`audioStudioTrimStretchRatio ${stretchEnabled && hasBothBpmValues && !supportedRatio ? "is-invalid" : ""}`}><span><Translation id="audioStudio.stretchRatio" /></span><div><i style={{ width: `${Math.max(0, Math.min(100, ((ratio || 0.75) - 0.75) / 0.75 * 100))}%` }} /></div><strong>{stretchEnabled && ratio > 0 ? `${ratio.toFixed(3)}x` : "OFF"}</strong></div>
          {stretchEnabled && hasBothBpmValues && !supportedRatio ? <p className="audioStudioSimpleStretchWarning" role="alert"><Translation id="audioStudio.supportedRange" />{AUDIO_STUDIO_TIME_STRETCH_MIN_RATIO.toFixed(2)}× ~ {AUDIO_STUDIO_TIME_STRETCH_MAX_RATIO.toFixed(2)}<Translation id="audioStudio.label" /></p> : null}
          {analysisMessage ? <p className="audioStudioTrimStretchMessage">{localizeUi(analysisMessage)}</p> : null}
          {processing ? <div aria-live="polite" className="audioStudioSimpleStretchProgress"><span><LoaderCircle className="is-spinning" size={15} /><Translation id="audioStudio.processingWithPitchPreserved" /></span><progress max="100" value={Math.round((stretchState.progress || 0) * 100)} /><output>{Math.round((stretchState.progress || 0) * 100)}%</output></div> : null}
          {stretchState.status === "error" ? <p className="audioStudioSimpleStretchWarning" role="alert">{localizeUi(stretchState.error)}</p> : null}
        </section>
        <div className="audioStudioDialogActions audioStudioSimpleTrimActions"><button disabled={processing} onClick={restoreOriginal} type="button"><RotateCcw size={15} /><Translation id="audioStudio.restoreOriginalRange" /></button><button disabled={processing} onClick={onClose} type="button"><Translation id="common.cancel" /></button><button disabled={processing || (stretchEnabled && !supportedRatio)} onClick={applyTrim} type="button">{processing ? translateUi("audioStudio.processing") : translateUi("app.apply")}</button></div>
      </section>
    </div>
  );
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

function SimpleTrackRow({ controller, onDelete, onTrim, timelineDurationMs, track, trackIndex }) {
  useLanguage();
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
        <div className="audioStudioSimpleTrackName"><span><Translation id="originalUi.track" />{trackIndex + 1}</span><strong title={source?.fileName || track.name}>{source?.fileName || track.name}</strong>{track.timeStretch?.ratio && Math.abs(track.timeStretch.ratio - 1) > 0.000001 ? <small><Translation id="originalUi.stretch" />{track.timeStretch.ratio.toFixed(3)}<Translation id="originalUi.x" /></small> : null}</div>
        <div className="audioStudioSimpleTrackControls">
          <div className="audioStudioSimpleTrackActions"><button aria-label={translateUi("audioStudio.trimValue1", { value1: track.name })} disabled={Boolean(controller.projectOperation)} onClick={() => onTrim(track.id)} title={translateUi("audioStudio.trimRange")} type="button"><Scissors size={15} /><span><Translation id="originalUi.trim" /></span></button><button aria-label={translateUi("app.deleteValue1", { value1: track.name })} className="is-danger" disabled={Boolean(controller.projectOperation)} onClick={() => onDelete(track.id)} title={translateUi("common.delete")} type="button"><Trash2 size={15} /><span><Translation id="common.delete" /></span></button></div>
          <div className="audioStudioSimpleTrackSound"><label className="audioStudioSimpleVolume"><span><Translation id="originalUi.vol" /></span><input aria-label={translateUi("app.value1Volume", { value1: track.name })} max="2" min="0" onChange={(event) => controller.updateTrack(track.id, { volume: event.target.valueAsNumber })} step="0.05" type="range" value={track.volume} /><output>{Math.round(track.volume * 100)}%</output></label><button aria-label={`${track.name} ${track.mute ? translateUi("audioStudio.unmute") : translateUi("audioStudio.muteAudioStudio")}`} aria-pressed={track.mute} className={`audioStudioSimpleMute ${track.mute ? "is-active" : ""}`} onClick={() => controller.updateTrack(track.id, { mute: !track.mute })} title={track.mute ? translateUi("audioStudio.unmute") : translateUi("audioStudio.muteAudioStudio")} type="button">{track.mute ? <VolumeX size={21} /> : <Volume2 size={21} />}</button></div>
        </div>
      </header>
      <div className="audioStudioSimpleTrackLane" onPointerDown={(event) => {
        if (event.target.closest(".audioStudioSimpleClip")) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        controller.seekPlayback(((event.clientX - bounds.left) / bounds.width) * timelineDurationMs);
      }}>
        <div aria-label={translateUi("audioStudio.moveValue1CurrentlyStartingAtValue2", { value1: track.name, value2: formatStudioTime(displayedStartMs, true) })} className="audioStudioSimpleClip" onKeyDown={moveWithKeyboard} onPointerDown={beginMove} role="slider" tabIndex="0" title={translateUi("audioStudio.dragLeftOrRightToSetTheStartPosition")} style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}>
          <div aria-hidden="true" className="audioStudioSimpleWaveform">{peaks.map((peak, index) => <i key={index} style={{ height: `${Math.max(6, peak * 100)}%` }} />)}</div>
          <span>{formatStudioTime(displayedStartMs, true)} ~ {formatStudioTime(displayedEndMs, true)} <em>({(clip.durationMs / 1_000).toFixed(2)}<Translation id="originalUi.sAudiostudio" /></em></span>
        </div>
        <i aria-hidden="true" className="audioStudioSimplePlayhead" style={{ left: `${Math.min(100, (controller.currentTimeMs / timelineDurationMs) * 100)}%` }} />
      </div>
    </article>
  );
}

function SimpleAudioTimeline({ controller, onDelete, onTrim }) {
  useLanguage();
  const tracks = controller.project.tracks.filter((track) => track.clips.length);
  const contentDurationMs = getAudioStudioProjectDurationMs(controller.project);
  const timelineDurationMs = Math.max(10_000, Math.ceil((contentDurationMs + 10_000) / 10_000) * 10_000);
  const ticks = Array.from({ length: 6 }, (_, index) => (timelineDurationMs / 5) * index);
  return (
    <section className="audioStudioSimpleTimeline" aria-label={translateUi("audioStudio.sharedAudioTimeline")}>
      <div className="audioStudioSimpleRuler"><span><Translation id="originalUi.tracks" /></span><div>{ticks.map((timeMs) => <time key={timeMs} style={{ left: `${(timeMs / timelineDurationMs) * 100}%` }}>{formatStudioTime(timeMs)}</time>)}</div></div>
      {tracks.length ? tracks.map((track, index) => <SimpleTrackRow controller={controller} key={track.id} onDelete={onDelete} onTrim={onTrim} timelineDurationMs={timelineDurationMs} track={track} trackIndex={index} />) : (
        <div className="audioStudioSimpleEmpty"><FileAudio size={30} /><strong><Translation id="audioStudio.noAudioToEdit" /></strong><span><Translation id="audioStudio.selectOneOrMoreFilesEachWillBePlacedOnItsOwn" /></span><button disabled={controller.importing || Boolean(controller.projectOperation)} onClick={() => controller.openImportPicker("editor-new-track")} type="button"><Plus size={16} /><Translation id="audioStudio.addAudioAudioStudio" /></button></div>
      )}
      {controller.importing ? <div aria-live="polite" className="audioStudioSimpleImporting"><LoaderCircle className="is-spinning" size={18} /><Translation id="audioStudio.analyzingFiles" /></div> : null}
    </section>
  );
}

function SimpleEditorPlayer({ controller, onSave }) {
  useLanguage();
  const durationMs = getAudioStudioProjectDurationMs(controller.project);
  const playing = controller.playbackStatus === "playing";
  return (
    <footer className="audioStudioSimplePlayer">
      <div className="audioStudioSimplePlayerControls">
        <button aria-label={translateUi("audioStudio.goToTimelineStart")} disabled={!durationMs || Boolean(controller.projectOperation)} onClick={() => controller.seekPlayback(0)} type="button"><SkipBack size={20} /><span><Translation id="audioStudio.goToStart" /></span></button>
        <button aria-label={playing ? translateUi("app.pause") : translateUi("audioStudio.playAll")} className="is-primary" disabled={!durationMs || Boolean(controller.projectOperation)} onClick={playing ? controller.pausePlayback : () => controller.startPlayback()} type="button">{playing ? <Pause size={18} /> : <Play size={18} />}<span>{playing ? translateUi("app.pause") : translateUi("audioStudio.play")}</span></button>
        <div className="audioStudioSimpleTime"><time>{formatStudioTime(controller.currentTimeMs, true)} <span>/</span> {formatStudioTime(durationMs, true)}</time><input aria-label={translateUi("audioStudio.masterPlayhead")} disabled={!durationMs} max={Math.max(1, durationMs)} min="0" onChange={(event) => controller.seekPlayback(event.target.valueAsNumber)} step="10" type="range" value={Math.min(durationMs, controller.currentTimeMs)} /></div>
      </div>
      <div className="audioStudioSimpleSaveGroup"><button className="audioStudioSimpleSave" disabled={!durationMs || Boolean(controller.projectOperation)} onClick={onSave} type="button"><Save size={16} /><Translation id="audioStudio.saveMixAudioStudio" /></button><small><Translation id="audioStudio.combineTheCurrentArrangementIntoOneFinishedAudioFile" /></small></div>
    </footer>
  );
}

function SimpleWaveformEditor({ controller, mobile }) {
  useLanguage();
  const [trimTrackId, setTrimTrackId] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const trimTrack = controller.project.tracks.find((track) => track.id === trimTrackId);
  const trimClip = trimTrack?.clips[0];
  const trimSource = controller.project.audioSources.find((source) => source.id === trimClip?.sourceId);
  return (
    <section className={`audioStudioSimpleEditor ${mobile ? "is-mobile" : "is-desktop"}`} data-audio-studio-screen="edit">
      <header className="audioStudioSimpleTopbar">
        <button aria-label={translateUi("audioStudio.returnToFinishedAudioLibrary")} className="audioStudioSimpleBack" onClick={controller.goToLibrary} title={translateUi("audioStudio.backToLibrary")} type="button"><ArrowLeft size={27} /></button>
        <div><h1><Translation id="audioStudio.studio" /></h1><p><Translation id="audioStudio.trimAndCombineYourAudio" /></p></div>
        <button className="audioStudioSimpleAdd" disabled={controller.importing || Boolean(controller.projectOperation)} onClick={() => controller.openImportPicker("editor-new-track")} type="button"><Plus size={17} /><span><Translation id="app.addAudio" /></span></button>
      </header>
      <main><SimpleAudioTimeline controller={controller} onDelete={controller.deleteTrack} onTrim={setTrimTrackId} /><p aria-live="polite" className="audioStudioSimpleNotice">{localizeUi(controller.notice)}</p></main>
      <SimpleEditorPlayer controller={controller} onSave={() => setSaveDialogOpen(true)} />
      <section className="audioStudioSimpleGuide"><strong><Translation id="audioStudio.howToUse" /></strong><ol><li><Translation id="app.addAudio" /></li><li><Translation id="audioStudio.setRangeAndTempoInTrim" /></li><li><Translation id="audioStudio.moveWaveformsLeftOrRight" /></li><li><Translation id="audioStudio.adjustVolumeAndMute" /></li><li><Translation id="audioStudio.playTogetherAndSaveAMix" /></li></ol></section>
      {trimClip && trimSource ? <SimpleTrimDialog clip={trimClip} controller={controller} onClose={() => setTrimTrackId("")} source={trimSource} track={trimTrack} /> : null}
      {saveDialogOpen ? <MixSaveNameDialog onClose={() => setSaveDialogOpen(false)} onSave={controller.mixSave} saving={controller.projectOperation === "mix-saving"} /> : null}
    </section>
  );
}

function AudioStudioScreenRouter({ controller, mobile }) {
  if (controller.screen === AUDIO_STUDIO_SCREENS.LIBRARY) return <AudioMixLibrary controller={controller} />;
  return <SimpleWaveformEditor controller={controller} mobile={mobile} />;
}

function AudioStudioLayout({ active, controller, mobile }) {
  const focused = active && mobile && controller.screen !== AUDIO_STUDIO_SCREENS.LIBRARY;
  // Keep the editor/dialog tree mounted when the window crosses the breakpoint.
  // Platform layout is still selected by its own class and the mobile prop.
  return <section className={`audioStudio audioStudio--${mobile?'mobile':'desktop'}`} data-audio-studio-current-screen={controller.screen} data-audio-studio-focus={focused || undefined} data-audio-studio-layout={mobile?'mobile':'desktop'}><AudioStudioScreenRouter controller={controller} mobile={mobile} /></section>;
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
      <AudioStudioLayout active={active} controller={controller} mobile={mobile} />
    </>
  );
}
