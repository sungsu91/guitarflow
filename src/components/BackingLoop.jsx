import ko from "./../i18n/locales/ko.js";
import { localizeUi } from "./../i18n/core.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import BackingGroovePicker from './BackingGroovePicker.jsx';
import {BackingLoopDragContext,BackingLoopFoldContext} from './BackingLoopDragContext.js';
import { createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AudioLines, ChevronDown, ChevronUp, ListMusic, Mic, Music2, Pause, Play, Plus, Repeat2, RotateCcw, Save, Scissors, Shuffle, SkipBack, SkipForward, Square, Trash2, Volume2, VolumeX, X } from "lucide-react";
import { BACKING_AUDIO_SOURCE_TYPES } from "../backing-loop/backingAudioSource";
import { formatBackingLoopTime } from "../backing-loop/backingLoopUtils";
import useBackingLoop from "../backing-loop/useBackingLoop";
import './backing-loop-dock.css';

const BackingLoopContext = createContext(null);
// Vite does not emit a Refresh signature for the transport's plain .js hook.
// A fresh key on development updates releases the old audio session before a
// changed hook list mounts; production keeps the same key for its full lifetime.
const backingSessionRevision = import.meta.hot
  ? (import.meta.hot.data.backingSessionRevision = (import.meta.hot.data.backingSessionRevision || 0) + 1)
  : 0;

// Playback and media elements outlive every individual screen and layout.
export function BackingLoopProvider({ children }) {
  return <BackingLoopSession key={backingSessionRevision}>{children}</BackingLoopSession>;
}

function BackingLoopSession({ children }) {
  const controller = useBackingLoop('shared');
  const playlistAnchorRef = useRef(null);
  const [dock, setDock] = useState(() => ({view: 'hidden', top: Math.round(window.innerHeight * .58), clearance: 0}));
  const setDockView = useCallback(view => setDock(previous => previous.view === view ? previous : {...previous, view}), []);
  const setDockTop = useCallback(top => setDock(previous => previous.top === top ? previous : {...previous, top}), []);
  const setDockClearance = useCallback(clearance => setDock(previous => previous.clearance === clearance ? previous : {...previous, clearance}), []);
  return <BackingLoopContext.Provider value={{...controller, sharedPlayback: true, dock, setDockView, setDockTop, setDockClearance}}>
    {children}
    <BackingLoopResources controller={controller} playlistAnchorRef={playlistAnchorRef} />
  </BackingLoopContext.Provider>;
}

// Mounted once inside the app theme, independently of individual room panels.
export function BackingLoopDock({ mobile, mode }) {
  const controller = useContext(BackingLoopContext);
  return controller ? <SharedBackingDock controller={controller} mobile={mobile} mode={mode} /> : null;
}

const BackingDockEdge = memo(function BackingDockEdge({ playing, paused, title, top, onToggle, onStop, onPointerDown, onPointerMove, onPointerUp, onKeyDown }) {
  const language = useLanguage();
  const ko = language === 'ko';
  return <div className={`backingDockEdge ${playing ? 'is-playing' : paused ? 'is-paused' : 'is-idle'}`} style={{top}}>
    <button type="button" className="backingDockHandle" aria-label={ko ? `백킹 ${playing?'재생 중':paused?'일시정지':'정지'} · 패널 열기` : `Backing ${playing?'playing':paused?'paused':'stopped'} · Open panel`}
      aria-expanded={false} aria-controls="shared-backing-dock-panel" title={title} onClick={onToggle}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onKeyDown={onKeyDown}>
      <AudioLines size={15} aria-hidden="true"/><ChevronDown className="backingDockChevron" size={13} aria-hidden="true"/>
      <i aria-hidden="true"/>
    </button>
    <button type="button" className="backingDockStop" aria-label={ko?'백킹 즉시 정지':'Stop backing now'} title={ko?'백킹 정지':'Stop backing'} onClick={onStop}><Square size={11} fill="currentColor" aria-hidden="true"/></button>
  </div>;
});

function SharedBackingDock({ controller, mobile, mode }) {
  const language = useLanguage();
  const korean = language === 'ko';
  const {dock, setDockView, setDockTop} = controller;
  const open = dock.view === 'open';
  const top = dock.top;
  const drag = useRef(null);
  const dragged = useRef(false);
  const panel = useRef(null);
  const panelHeight = useRef(250);
  const previousMode = useRef(mode);
  const clearance = Math.max(mobile ? 88 : 12, dock.clearance);
  const clampTop = useCallback(value => Math.max(12, Math.min(window.innerHeight - clearance - panelHeight.current - 12, value)), [clearance]);
  useEffect(() => {
    if (previousMode.current !== mode && open) setDockView('collapsed');
    previousMode.current = mode;
  }, [mode, open, setDockView]);
  useLayoutEffect(() => {
    if (dock.view === 'hidden') return;
    const resize = () => {
      if (panel.current) panelHeight.current = panel.current.getBoundingClientRect().height;
      setDockTop(clampTop(top));
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener('resize', resize);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); };
  }, [dock.view, top, clampTop, setDockTop]);
  useEffect(() => { if (open) panel.current?.querySelector('button')?.focus({preventScroll:true}); }, [open]);
  const toggle = useCallback(() => {
    if (dragged.current) { dragged.current = false; return; }
    setDockView('open');
  }, [setDockView]);
  const close = useCallback(() => { setDockView('collapsed'); controller.closeDialog(); }, [setDockView, controller.closeDialog]);
  const stop = useCallback(() => { controller.stopPlayback(); if (!open) setDockView('hidden'); }, [controller.stopPlayback, open, setDockView]);
  const pointerDown = useCallback(event => {
    if (event.button !== 0) return;
    dragged.current = false;
    drag.current = { y: event.clientY, top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [top]);
  const pointerMove = useCallback(event => {
    if (!drag.current) return;
    const dy = event.clientY - drag.current.y;
    if (Math.abs(dy) > 5) dragged.current = true;
    if (dragged.current) setDockTop(clampTop(drag.current.top + dy));
  }, [clampTop, setDockTop]);
  const pointerUp = useCallback(event => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);
  const keyDown = useCallback(event => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    setDockTop(clampTop(top + (event.key === 'ArrowUp' ? -24 : 24)));
  }, [clampTop, top, setDockTop]);
  if (dock.view === 'hidden') return null;
  const moveHandle = {onPointerDown:pointerDown, onPointerMove:pointerMove, onPointerUp:pointerUp, onPointerCancel:pointerUp, onKeyDown:keyDown};
  return <div className={`sharedBackingDock ${mobile?'sharedBackingDock--mobile':'sharedBackingDock--desktop'}`} data-ui="backing-loop" style={{'--dock-clearance':`${clearance}px`}}>
    {!open && <BackingDockEdge playing={controller.isPlaying} paused={controller.isPaused} title={controller.title} top={top} onToggle={toggle} onStop={stop} {...moveHandle}/>}
    {open && <aside ref={panel} id="shared-backing-dock-panel" className="backingDockPanel" style={{top}} aria-label={korean?'백킹루프':'Backing loop'} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();close();}}}>
      <BackingLoopDragContext.Provider value={moveHandle}>
        <BackingLoopFoldContext.Provider value={close}>
          {mobile ? <MobileBackingLoop controller={controller}/> : <DesktopBackingLoop controller={controller} presentation="standalone"/>}
        </BackingLoopFoldContext.Provider>
      </BackingLoopDragContext.Provider>
    </aside>}
  </div>;
}

function MobileBackingLoopHardware() {
  return (
    <div aria-hidden="true" className="backingLoopRecorderHardware">
      <i className="backingLoopGrille backingLoopGrille--left" />
      <i className="backingLoopGrille backingLoopGrille--right" />
    </div>
  );
}

function BackingLoopProgress({ controller }) {
  useLanguage();
  const isCapturePhase = ["requesting", "armed", "recording", "processing"].includes(controller.phase);
  if (isCapturePhase) {
    const level = Math.round(Math.max(0, Math.min(1, controller.inputLevel?.normalized || 0)) * 100);
    return (
      <div
        aria-label={localizeUi(translateUi("components.guitarInputLevelValue1Value2", { value1: level, value2: controller.inputLevel?.clipping ? ko["components.peak"] : "" }))}
        aria-valuemax="100"
        aria-valuemin="0"
        aria-valuenow={level}
        className={`backingLoopInputMeter backingLoopInputMeter--${controller.inputLevel?.state || "low"}`}
        role="meter"
      >
        <i aria-hidden="true" style={{ "--backing-loop-input-level": `${level}%` }} />
        {controller.inputLevel?.clipping ? <span><Translation id="originalUi.peak" /></span> : null}
      </div>
    );
  }

  const durationMs = Math.max(0, controller.durationMs);
  const positionMs = Math.min(durationMs, Math.max(0, controller.currentTimeMs));
  const progress = durationMs ? (positionMs / durationMs) * 100 : 0;
  const isDisabled = !controller.hasRecording || ["recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(controller.phase);

  return (
    <div
      className={`backingLoopProgress ${isDisabled ? "is-disabled" : ""}`}
      style={{ "--backing-loop-progress": `${progress}%` }}
    >
      <input
        aria-label={translateUi("components.backingLoopPlayhead")}
        disabled={isDisabled}
        max={Math.max(1, durationMs)}
        min="0"
        onChange={(event) => controller.seekPlayback(event.target.value)}
        step="10"
        type="range"
        value={positionMs}
      />
      <i aria-hidden="true" className="backingLoopProgressThumb" />
    </div>
  );
}

function BackingLoopVolume({ controller, mobile = false }) {
  useLanguage();
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
        aria-label={muted ? translateUi("components.unmuteBackingTrack") : translateUi("components.muteBackingTrack")}
        aria-pressed={muted}
        className="backingLoopPlayerIconButton backingLoopVolumeMute"
        onClick={() => {
          controller.toggleBackingMute();
          setPopoverOpen(true);
        }}
        onFocus={() => setPopoverOpen(true)}
        title={muted ? translateUi("audioStudio.unmute") : translateUi("components.mutedHoverToAdjustVolume")}
        type="button"
      >
        {muted
          ? <VolumeX aria-hidden="true" size={mobile ? 18 : 17} strokeWidth={2.2} />
          : <Volume2 aria-hidden="true" size={mobile ? 18 : 17} strokeWidth={2.2} />}
      </button>
      <div aria-label={translateUi("components.adjustBackingVolume")} className="backingLoopVolumePopover" role="group">
        <label className="backingLoopVolumeSlider">
          <span className="backingLoopScreenReaderStatus"><Translation id="components.backingVolume" /></span>
          <input
            aria-label={translateUi("components.backingVolume")}
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

function BackingLoopPlayerBar({ controller, mobile = false, inlinePlaylist = false }) {
  useLanguage();
  const busy = ["armed", "recording", "requesting", "processing", "trimming", "applying", "saving", "loading"].includes(controller.phase);
  const hasPlaylistItems = controller.playlistPlaybackItemCount > 0;
  const canPlay = controller.hasRecording || hasPlaylistItems;
  const repeatMode = controller.playlistPlaybackMode;
  const repeatActive = repeatMode === "repeat-all" || repeatMode === "repeat-one";
  const repeatLabel = repeatMode === "repeat-all"
    ? ko["components.repeatOneTrack"]
    : repeatMode === "repeat-one"
      ? ko["components.turnRepeatOff"]
      : ko["components.repeatAllTracks"];
  return (
    <div className="backingLoopPlayerBar" aria-label={translateUi("components.sharedBackingPlaybackControls")}>
      <div className="backingLoopPlayerTransport">
        <button
          aria-label={translateUi("components.previousBackingTrackOrRestartCurrentTrack")}
          className="backingLoopPlayerIconButton"
          disabled={!hasPlaylistItems || busy}
          onClick={controller.playPreviousPlaylistItem}
          type="button"
        >
          <SkipBack aria-hidden="true" size={mobile ? 17 : 18} />
        </button>
        <button
          aria-label={controller.isPlaying ? translateUi("components.pauseBacking") : translateUi("components.playBacking")}
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
          aria-label={translateUi("components.nextBackingTrack")}
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
          aria-label={localizeUi(repeatLabel)}
          aria-pressed={repeatActive}
          className={`backingLoopPlayerIconButton backingLoopRepeatButton ${repeatActive ? "active" : ""}`}
          data-repeat-mode={repeatMode}
          onClick={controller.cyclePlaylistRepeatMode}
          title={repeatMode === "repeat-one" ? translateUi("components.repeatOne") : repeatMode === "repeat-all" ? translateUi("components.repeatAll") : translateUi("components.repeatOffPlayListOnce")}
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
          aria-label={controller.playlistShuffleEnabled ? translateUi("components.turnShuffleOff") : translateUi("components.turnShuffleOn")}
          aria-pressed={controller.playlistShuffleEnabled}
          className={`backingLoopPlayerIconButton backingLoopShuffleButton ${controller.playlistShuffleEnabled ? "active" : ""}`}
          onClick={controller.togglePlaylistShuffle}
          title={controller.playlistShuffleEnabled ? translateUi("components.shuffleOn") : translateUi("components.shuffleOff")}
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
        {!inlinePlaylist && <button
          aria-expanded={controller.playlistDrawerOpen}
          aria-label={controller.playlistDrawerOpen ? translateUi("components.closePlaylist") : translateUi("app.openPlaylist")}
          className={`backingLoopPlayerIconButton backingLoopPlaylistToggle ${controller.playlistDrawerOpen ? "active" : ""}`}
          disabled={busy}
          onClick={controller.togglePlaylistDrawer}
          type="button"
        >
          <span aria-hidden="true" className="backingLoopPlaylistToggleLabel"><Translation id="originalUi.list" /></span>
          {controller.playlistDrawerOpen
            ? <ChevronDown aria-hidden="true" size={mobile ? 17 : 17} />
            : <ChevronUp aria-hidden="true" size={mobile ? 17 : 17} />}
        </button>}
      </div>
    </div>
  );
}

function BackingLoopTrackInfo({ controller, mobile = false }) {
  const drag=useContext(BackingLoopDragContext);
  const currentTime = formatBackingLoopTime(controller.currentTimeMs);
  const totalTime = formatBackingLoopTime(controller.durationMs);
  const trackTitle = controller.hasRecording ? controller.title : "PLAYLIST EMPTY";
  const trackSource = controller.playlistPlaybackActive
    ? ""
    : controller.sourceType === BACKING_AUDIO_SOURCE_TYPES.IMPORT
      ? "IMPORTED AUDIO"
      : controller.hasRecording
        ? "RECORDED LOOP"
        : "OPEN PLAYLIST TO ADD AUDIO";

  return (
    <div className={"backingLoopTrackInfo"+(drag?" is-drag-handle":"")} {...(drag?{...drag,role:"button",tabIndex:0,"aria-label":ko["components.moveBackingLoopDragOrUseArrowKeys"]}:{})}>
      <span aria-hidden="true" className="backingLoopTrackBadge">
        <AudioLines size={mobile ? 15 : 17} />
      </span>
      <span className="backingLoopTrackText">
        <strong title={trackTitle}>{trackTitle}</strong>
        {trackSource ? <small>{trackSource}</small> : null}
      </span>
      <time aria-label={`${currentTime} / ${totalTime}`}>{currentTime} / {totalTime}</time>
    </div>
  );
}

function MobileBackingLoopPlayer({ controller, inlinePlaylist = false }) {
  return (
    <div className="backingLoopMiniPlayer backingLoopMiniPlayer--mobile">
      <BackingLoopTrackInfo controller={controller} mobile />
      <BackingLoopProgress controller={controller} />
      <BackingLoopPlayerBar controller={controller} mobile inlinePlaylist={inlinePlaylist} />
    </div>
  );
}

function DesktopBackingLoopPlayer({ controller, inlinePlaylist = false }) {
  return (
    <div className="backingLoopMiniPlayer backingLoopMiniPlayer--desktop">
      <BackingLoopTrackInfo controller={controller} />
      <BackingLoopProgress controller={controller} />
      <BackingLoopPlayerBar controller={controller} inlinePlaylist={inlinePlaylist} />
    </div>
  );
}

function BackingLoopMainControls({ controller, mobile = false }) {
  useLanguage();
  const isBusy = ["requesting", "processing", "trimming", "applying", "saving", "loading"].includes(controller.phase);
  const captureActive = controller.isRecording || controller.isArmed;
  const mediaBusy = captureActive || isBusy;
  const canCancel = controller.hasRecording || captureActive || controller.phase === "requesting";
  const showsDelete = controller.hasRecording && !captureActive && !isBusy;
  return (
    <div className={`backingLoopMainControls ${mobile ? "backingLoopMainControls--mobile" : ""}`} aria-label={translateUi("components.backingRecordingAndFileControls")}>
      <button
        aria-label={captureActive ? translateUi("components.stopGuitarRecording") : translateUi("components.startGuitarRecording")}
        aria-pressed={captureActive}
        className={`backingLoopButton backingLoopRecordButton ${captureActive ? "active" : ""}`}
        disabled={controller.isPlaying || isBusy}
        onClick={controller.toggleRecording}
        type="button"
      >
        {controller.isRecording
          ? <Square aria-hidden="true" size={mobile ? 10 : 12} />
          : <i aria-hidden="true" className="backingLoopRecordDot" />}
        <span><Translation id="originalUi.rec" /></span>
      </button>
      <button
        aria-label={translateUi("components.editCurrentBackingTrack")}
        className="backingLoopButton backingLoopEditButton"
        disabled={!controller.hasRecording || controller.isGroove || mediaBusy}
        onClick={controller.openTrimEditor}
        type="button"
      >
        <Scissors aria-hidden="true" size={13} />
        <span><Translation id="originalUi.edit" /></span>
      </button>
      <button
        aria-label={showsDelete ? translateUi("components.deleteCurrentBackingTrack") : translateUi("components.cancelCurrentOperation")}
        className="backingLoopButton backingLoopCancelButton"
        disabled={!canCancel || ["saving", "loading"].includes(controller.phase)}
        onClick={controller.cancelCurrent}
        type="button"
      >
        <Trash2 aria-hidden="true" size={13} />
        <span><Translation id="originalUi.del" /></span>
      </button>
      <button
        aria-label={translateUi("components.nameAndSaveCurrentBackingTrack")}
        className="backingLoopButton backingLoopSaveButton"
        disabled={!controller.hasRecording || controller.isGroove || isBusy || controller.isPlaying}
        onClick={controller.openSaveDialog}
        type="button"
      >
        <Save aria-hidden="true" size={13} />
        <span><Translation id="originalUi.save" /></span>
      </button>
    </div>
  );
}

const formatTrimSeconds = (milliseconds) => (Math.max(0, Number(milliseconds) || 0) / 1000).toFixed(2);

function TrimWaveform({ controller }) {
  useLanguage();
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
        aria-label={translateUi("components.trimStartValue1S", { value1: formatTrimSeconds(selection.startMs) })}
        aria-valuemax={selection.durationMs}
        aria-valuemin="0"
        aria-valuenow={Math.round(selection.startMs)}
        aria-valuetext={translateUi("components.value1S", { value1: formatTrimSeconds(selection.startMs) })}
        className="backingLoopTrimHandle backingLoopTrimHandle--start"
        data-trim-handle="start"
        disabled={controller.phase === "applying"}
        onKeyDown={(event) => handleKeyDown(event, "start")}
        role="slider"
        style={{ left: `${startPercent}%` }}
        type="button"
      />
      <button
        aria-label={translateUi("components.trimEndValue1S", { value1: formatTrimSeconds(selection.endMs) })}
        aria-valuemax={selection.durationMs}
        aria-valuemin="0"
        aria-valuenow={Math.round(selection.endMs)}
        aria-valuetext={translateUi("components.value1S", { value1: formatTrimSeconds(selection.endMs) })}
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
  useLanguage();
  const selection = controller.trimSelection;
  if (!selection) return null;
  const applying = controller.phase === "applying";
  return (
    <section className="backingLoopDialog backingLoopTrimDialog">
      <div className="backingLoopDialogHeading backingLoopTrimHeading">
        <div>
          <strong><Translation id="audioStudio.trimRange" /></strong>
          <span><Translation id="components.trimTheLeadInAndTailForASeamlessLoop" /></span>
        </div>
        <button
          className="backingLoopTrimReset"
          disabled={applying}
          onClick={controller.resetTrimSelection}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={12} /><Translation id="originalUi.reset" /></button>
      </div>
      <TrimWaveform controller={controller} />
      <div className="backingLoopTrimTimes" aria-label={translateUi("components.selectedBackingRange")}>
        <span><small><Translation id="originalUi.start" /></small><strong>{formatTrimSeconds(selection.startMs)}</strong></span>
        <span><small><Translation id="originalUi.end" /></small><strong>{formatTrimSeconds(selection.endMs)}</strong></span>
        <span><small><Translation id="originalUi.length" /></small><strong>{formatTrimSeconds(selection.lengthMs)}</strong></span>
      </div>
      <div className="backingLoopDialogActions backingLoopTrimActions">
        <button disabled={applying} onClick={controller.toggleTrimPreview} type="button">
          {controller.trimPreviewPlaying
            ? <Square aria-hidden="true" size={12} />
            : <Play aria-hidden="true" size={12} />}
          {controller.trimPreviewPlaying ? "STOP" : "PREVIEW"}
        </button>
        <button disabled={applying} onClick={controller.useOriginalTrimRecording} type="button"><Translation id="originalUi.cancel" /></button>
        <button className="primary" disabled={applying} onClick={controller.applyTrim} type="button">
          {applying ? translateUi("components.applying") : "DONE"}
        </button>
      </div>
      <p className="backingLoopTrimHint"><Translation id="components.cancelDiscardsThisAdjustmentOnlyTheOriginalIsKeptUntilSave" /></p>
    </section>
  );
}

function ClearRecordingDialog({ controller }) {
  return (
    <section className="backingLoopDialog backingLoopClearDialog">
      <div className="backingLoopDialogHeading backingLoopDialogHeading--confirm">
        <div>
          <strong><Translation id="components.clearTheCurrentBackingTrack" /></strong>
          <span><Translation id="components.theRecordingInThisPanelWillBeRemovedSavedBackingTracksRemain" /></span>
        </div>
      </div>
      <div className="backingLoopDialogActions">
        <button onClick={controller.closeDialog} type="button"><Translation id="common.cancel" /></button>
        <button className="danger" onClick={controller.confirmClearRecording} type="button"><Translation id="components.clear" /></button>
      </div>
    </section>
  );
}

function SaveBackingLoopDialog({ controller }) {
  useLanguage();
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
          <strong><Translation id="components.saveBackingTrack" /></strong>
          <span><Translation id="components.enterATitleYouCanRecognizeDuringPractice" /></span>
        </div>
        <button aria-label={translateUi("components.closeSaveDialog")} onClick={controller.closeDialog} type="button"><X size={15} /></button>
      </div>
      <label className="backingLoopTitleField">
        <span><Translation id="app.title" /></span>
        <input
          aria-label={translateUi("components.backingTitle")}
          autoComplete="off"
          maxLength={40}
          onChange={(event) => controller.setTitleDraft(event.target.value)}
          onFocus={(event) => {
            const input = event.currentTarget;
            window.setTimeout(() => input.scrollIntoView({ block: "center", behavior: "smooth" }), 120);
          }}
          placeholder={translateUi("components.eGAmPractice")}
          ref={inputRef}
          value={controller.titleDraft}
        />
      </label>
      <span aria-live="polite" className="backingLoopDialogError">{localizeUi(controller.saveError)}</span>
      <div className="backingLoopDialogActions">
        <button onClick={controller.closeDialog} type="button"><Translation id="common.cancel" /></button>
        <button className="primary" disabled={controller.phase === "saving"} type="submit">
          {controller.phase === "saving" ? translateUi("app.saving") : translateUi("common.save")}
        </button>
      </div>
    </form>
  );
}

function ConfirmSaveBackingLoopDialog({ controller }) {
  useLanguage();
  return (
    <section className="backingLoopDialog backingLoopSaveConfirmDialog">
      <div className="backingLoopDialogHeading backingLoopDialogHeading--confirm">
        <div>
          <strong>“{controller.titleDraft.trim() || translateUi("components.currentBackingTrack")}<Translation id="app.saveThisProgression" /></strong>
          <span><Translation id="components.theCurrentRecordingAndTitleWillBeAddedToYourSavedItems" /></span>
        </div>
      </div>
      <div className="backingLoopDialogActions">
        <button onClick={controller.closeDialog} type="button"><Translation id="components.no" /></button>
        <button className="primary" disabled={controller.phase === "saving"} onClick={controller.confirmSave} type="button">
          {controller.phase === "saving" ? translateUi("app.saving") : translateUi("common.save")}
        </button>
      </div>
    </section>
  );
}

function BackingPlaylistNavigation({ controller }) {
  useLanguage();
  return (
    <div aria-label={translateUi("components.currentAndSavedPlaylistTabs")} className="backingLoopPlaylistNavigation" role="tablist">
      <button
        aria-selected={controller.playlistPanelView === "queue"}
        className={controller.playlistPanelView === "queue" ? "selected" : ""}
        onClick={controller.showCurrentPlaylist}
        role="tab"
        type="button"
      >
        <ListMusic aria-hidden="true" size={12} /><Translation id="backingLoop.currentPlaylist" /></button>
      {controller.savedPlaylists.map((playlist) => (
        <button
          aria-label={translateUi("components.openSavedPlaylistValue1", { value1: playlist.title })}
          aria-selected={controller.playlistPanelView === playlist.id}
          className={controller.playlistPanelView === playlist.id ? "selected" : ""}
          key={playlist.id}
          onClick={() => controller.showSavedPlaylist(playlist.id)}
          role="tab"
          title={playlist.title}
          type="button"
        >
          <Save aria-hidden="true" size={12} />
          <span><Translation id="components.saved" />{playlist.title}</span>
        </button>
      ))}
    </div>
  );
}

function BackingCurrentPlaylistPane({ controller }) {
  useLanguage();
  const selectedCount = controller.selectedQueueItemIds.length;
  return (
    <>
      <div className="backingLoopPlaylistActions">
        <button className="primary" onClick={() => controller.togglePlaylistLibraryPicker(controller.activePlaylist.id)} type="button">
          <Plus aria-hidden="true" size={13} /><Translation id="app.groovePacksApp" /></button>
        <button onClick={() => controller.openImportFilePicker(controller.activePlaylist.id)} type="button">
          <Plus aria-hidden="true" size={13} /><Translation id="components.addDeviceFiles" /></button>
        <span>{controller.playlistEntries.length}<Translation id="audioStudio.tracks" /></span>
      </div>
      {controller.playlistLibraryPickerOpen ? <BackingGroovePicker controller={controller} /> : null}
      <div className="backingLoopPlaylistSelectionTools">
        <button
          disabled={!controller.playlistEntries.length || selectedCount === controller.playlistEntries.length}
          onClick={controller.selectAllQueueItems}
          type="button"
        ><Translation id="app.selectAll" /></button>
        <button disabled={!selectedCount} onClick={controller.clearQueueItemSelection} type="button"><Translation id="app.deselectAll" /></button>
        <button className="primary" disabled={!selectedCount} onClick={controller.playSelectedQueueItems} type="button">
          <Play aria-hidden="true" size={10} /><Translation id="components.playSelected" /></button>
        <span>{selectedCount}<Translation id="components.selectTracks" /></span>
      </div>
      <div className="backingLoopPlaylistItems">
        {controller.playlistEntries.length ? controller.playlistEntries.map((item, index) => (
          <div
            className={`backingLoopPlaylistItem ${controller.selectedQueueItemIds.includes(item.id) ? "selected" : ""} ${item.id === controller.playlistPlayingItemId ? "playing" : ""}`}
            key={item.id}
          >
            <label className="backingLoopPlaylistItemCheck">
              <input
                aria-label={translateUi("components.selectValue1InList", { value1: item.title })}
                checked={controller.selectedQueueItemIds.includes(item.id)}
                onChange={() => controller.toggleQueueItemSelection(item.id)}
                type="checkbox"
              />
            </label>
            <button
              aria-current={item.id === controller.playlistPlayingItemId ? "true" : undefined}
              aria-label={translateUi("components.playValue1Now", { value1: item.title })}
              className="backingLoopPlaylistItemSelect"
              onClick={() => controller.playPlaylistItem(item.id)}
              type="button"
            >
              <b><Play aria-hidden="true" size={9} /></b>
              <span title={item.title}>{item.title}</span>
              <small>{formatBackingLoopTime(item.durationMs)}</small>
            </button>
            <button aria-label={translateUi("components.moveValue1Up", { value1: item.title })} disabled={index === 0} onClick={() => controller.movePlaylistItem(item.id, "up")} type="button"><ChevronUp size={12} /></button>
            <button aria-label={translateUi("components.moveValue1Down", { value1: item.title })} disabled={index === controller.playlistEntries.length - 1} onClick={() => controller.movePlaylistItem(item.id, "down")} type="button"><ChevronDown size={12} /></button>
            <button aria-label={translateUi("components.removeValue1FromPlaylist", { value1: item.title })} onClick={() => controller.removePlaylistItem(item.id)} type="button"><X size={12} /></button>
          </div>
        )) : (
          <div className="backingLoopLibraryEmpty">
            <ListMusic aria-hidden="true" size={19} />
            <span><Translation id="components.addFilesOrSavedAudioToBuildAPlaylist" /></span>
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
            aria-label={translateUi("components.chooseAPlaylistToSaveTo")}
            onChange={(event) => controller.selectPlaylistSaveTarget(event.target.value)}
            value={controller.playlistSaveTargetId}
          >
            <option value=""><Translation id="components.saveAsNewPlaylist" /></option>
            {controller.savedPlaylists.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>{playlist.title}<Translation id="components.saveSelection" /></option>
            ))}
          </select>
          {!controller.playlistSaveTargetId ? (
            <input
              aria-label={translateUi("components.newPlaylistName")}
              maxLength={40}
              onChange={(event) => controller.setPlaylistRenameDraft(event.target.value)}
              placeholder={translateUi("components.newPlaylistNameEGBuskingSet")}
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
          {controller.playlistSaveTargetId ? translateUi("components.saveSelected") : translateUi("components.savePlaylist")}
        </button>
      </form>
    </>
  );
}

function BackingSavedPlaylistPane({ controller }) {
  useLanguage();
  const playlist = controller.savedPlaylists.find((item) => item.id === controller.playlistPanelView);
  if (!playlist) {
    return (
      <div className="backingLoopLibraryEmpty">
        <Save aria-hidden="true" size={19} />
        <span><Translation id="components.selectTracksInTheCurrentPlaylistThenSaveTheList" /></span>
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
          <small>{entries.length}<Translation id="components.tracks" />{formatBackingLoopTime(durationMs)}</small>
        </div>
        <button aria-label={translateUi("components.deleteValue1TitleAndSavedPlaylist", { value1: playlist.title })} className="danger" onClick={() => controller.requestDeletePlaylistTab(playlist.id)} title={translateUi("components.deletePlaylistTitle")} type="button">
          <Trash2 aria-hidden="true" size={13} />
        </button>
      </div>
      <div className="backingLoopPlaylistActions backingLoopSavedPlaylistActions">
        <button className="primary" onClick={() => controller.togglePlaylistLibraryPicker(playlist.id)} type="button">
          <Plus aria-hidden="true" size={13} /><Translation id="app.groovePacksApp" /></button>
        <button onClick={() => controller.openImportFilePicker(playlist.id)} type="button">
          <Plus aria-hidden="true" size={13} /><Translation id="components.addDeviceFiles" /></button>
        <span>{entries.length}<Translation id="audioStudio.tracks" /></span>
      </div>
      {controller.playlistLibraryPickerOpen && controller.playlistLibraryTargetId === playlist.id
        ? <BackingGroovePicker controller={controller} />
        : null}
      <div className="backingLoopPlaylistSelectionTools backingLoopSavedPlaylistSelectionTools">
        <button
          disabled={!entries.length || selectedCount === entries.length}
          onClick={controller.selectAllSavedPlaylistItems}
          type="button"
        ><Translation id="app.selectAll" /></button>
        <button disabled={!selectedCount} onClick={controller.clearSavedPlaylistItemSelection} type="button"><Translation id="app.deselectAll" /></button>
        <button className="primary" disabled={!entries.length} onClick={() => controller.playAllSavedPlaylistItems(playlist.id)} type="button">
          <Play aria-hidden="true" size={10} /><Translation id="audioStudio.playAll" /></button>
        <button className="primary" disabled={!selectedCount} onClick={() => controller.playSelectedSavedPlaylistItems(playlist.id)} type="button">
          <Play aria-hidden="true" size={10} /><Translation id="components.playSelected" /></button>
        <button className="danger" disabled={!selectedCount} onClick={() => controller.requestDeleteSavedPlaylistItems(playlist.id)} type="button">
          <Trash2 aria-hidden="true" size={10} /><Translation id="components.removeSelected" /></button>
        <span>{selectedCount}<Translation id="components.selectTracks" /></span>
      </div>
      <div className="backingLoopSavedPlaylistTracks">
        {entries.length ? entries.map((item, index) => (
          <div
            className={`${controller.selectedSavedItemIds.includes(item.id) ? "selected" : ""} ${controller.playlistPlayingPlaylistId === playlist.id && item.id === controller.playlistPlayingItemId ? "playing" : ""}`}
            key={item.id}
          >
            <label className="backingLoopPlaylistItemCheck">
              <input
                aria-label={translateUi("components.selectValue1InSavedPlaylist", { value1: item.title })}
                checked={controller.selectedSavedItemIds.includes(item.id)}
                onChange={() => controller.toggleSavedPlaylistItemSelection(item.id)}
                type="checkbox"
              />
            </label>
            <button
              aria-current={controller.playlistPlayingPlaylistId === playlist.id && item.id === controller.playlistPlayingItemId ? "true" : undefined}
              aria-label={translateUi("components.playValue1FromSavedPlaylist", { value1: item.title })}
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
            <span><Translation id="components.addGroovePacksOrDeviceFilesToThisPlaylist" /></span>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadBackingLoopDialog({ controller }) {
  useLanguage();
  return (
    <section className="backingLoopDialog backingLoopLoadDialog backingLoopPlaylistDialog">
      <div className="backingLoopDialogHeading">
        <div>
          <strong><Translation id="originalUi.playlist" /></strong>
        </div>
        <button aria-label={translateUi("components.closePlaylist")} onClick={controller.closeDialog} type="button">
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
  useLanguage();
  const target = controller.savedPlaylists.find((playlist) => playlist.id === controller.playlistDeleteTargetId);
  return (
    <section className="backingLoopDialog backingLoopDeleteDialog">
      <div className="backingLoopDialogHeading backingLoopDialogHeading--confirm">
        <div>
          <strong>“{target?.title || translateUi("components.selectedPlaylist")}<Translation id="components.deleteThisSavedPlaylist" /></strong>
          <span><Translation id="components.onlyTheSavedPlaybackOrderWillBeDeletedAudioFilesAndThe" /></span>
        </div>
      </div>
      <div className="backingLoopDialogActions">
        <button onClick={controller.closeDialog} type="button"><Translation id="common.cancel" /></button>
        <button className="danger" disabled={!target} onClick={controller.confirmDeletePlaylistTab} type="button"><Translation id="components.deletePlaylist" /></button>
      </div>
    </section>
  );
}

function DeleteBackingPlaylistItemsDialog({ controller }) {
  useLanguage();
  const target = controller.savedPlaylists.find((playlist) => playlist.id === controller.playlistItemsDeleteTargetId);
  const selectedCount = controller.playlistItemsDeleteTargetIds.length;
  return (
    <section className="backingLoopDialog backingLoopDeleteDialog">
      <div className="backingLoopDialogHeading backingLoopDialogHeading--confirm">
        <div>
          <strong>“{target?.title || translateUi("components.selectedPlaylist")}<Translation id="components.label" />{selectedCount}<Translation id="components.tracksRemoveThem" /></strong>
          <span><Translation id="components.tracksAreRemovedFromThisPlaylistOnlyAudioFilesStoredInThe" /></span>
        </div>
      </div>
      <div className="backingLoopDialogActions">
        <button onClick={controller.closeDialog} type="button"><Translation id="common.cancel" /></button>
        <button className="danger" disabled={!target || !selectedCount} onClick={controller.confirmDeleteSavedPlaylistItems} type="button"><Translation id="components.removeSelected" /></button>
      </div>
    </section>
  );
}

function BackingLoopDialogLayer({ controller, playlistAnchorRef }) {
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
    const anchorPanel = playlistAnchorRef.current || document.activeElement?.closest?.(".backingLoopPanel");
    const applyPlaylistAnchor = () => {
      if (!window.matchMedia("(max-width: 680px)").matches) {
        setPlaylistAnchorStyle(null);
        return;
      }
      const panel = anchorPanel;
      const player = panel?.querySelector(".backingLoopMiniPlayer");
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
  }, [controller.playlistDrawerOpen, playlistAnchorRef]);

  if (!controller.dialog || typeof document === "undefined") return null;
  return createPortal(
    <div
      aria-hidden="false"
      className={`backingLoopDialogLayer storageModalLayer ${controller.dialog === "clear-recording" ? "backingLoopDialogLayer--centered" : ""} ${controller.playlistDrawerOpen ? "backingLoopDialogLayer--playlistDrawer" : ""}`}
      onPointerDown={(event) => {
        if (!controller.playlistDrawerOpen && event.target === event.currentTarget) controller.closeDialog();
      }}
      role="presentation"
      style={playlistAnchorStyle || undefined}
    >
      <div aria-modal={controller.playlistDrawerOpen ? "false" : "true"} ref={dialogRef} role="dialog" tabIndex="-1">
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

function BackingLoopFoldButton(){
  useLanguage();
 const fold=useContext(BackingLoopFoldContext);
 return fold?<button type="button" className="backingPanelClose" aria-label={translateUi("components.collapseBackingLoopToTheRight")} onClick={fold}>›</button>:null;
}

function MobileBackingLoop({ controller, panelRef }) {
  useLanguage();
  return (
    <section
      aria-label={translateUi("components.backingLoopGuitarRecordingAndLoopPlayback")}
      className={`backingLoopPanel backingLoopPanel--mobile backingLoopPanel--${controller.phase}`}
      data-backing-loop-phase={controller.phase}
      ref={panelRef}
      title={localizeUi(controller.notice)}
    >
      <BackingLoopFoldButton />
      <MobileBackingLoopHardware />
      <span aria-live="polite" className="backingLoopScreenReaderStatus" role="status">{localizeUi(controller.status.label)}</span>
      <MobileBackingLoopPlayer controller={controller} />
      <BackingLoopMainControls controller={controller} mobile />
    </section>
  );
}

function DesktopBackingLoop({ controller, presentation = "default" }) {
  useLanguage();
  const fold=useContext(BackingLoopFoldContext);
  const presentationClassName = presentation === "standalone"
    ? " backingLoopPanel--standaloneDesktop"
    : "";
  return (
    <section
      aria-label={translateUi("components.backingLoopGuitarRecordingAndLoopPlayback")}
      className={`backingLoopPanel backingLoopPanel--desktop backingLoopPanel--${controller.phase}${presentationClassName}`}
      data-backing-loop-phase={controller.phase}
    >
      <span aria-live="polite" className="backingLoopScreenReaderStatus" role="status">{localizeUi(controller.status.label)}</span>
      <BackingLoopFoldButton />
      <DesktopBackingLoopPlayer controller={controller} />
      <BackingLoopMainControls controller={controller} />
      {!fold&&<p className="backingLoopDesktopNotice" aria-live="polite">
        {controller.notice || translateUi("components.recordAChordProgressionAndLoopItToPracticeSoloing")}
      </p>}
    </section>
  );
}

export default function BackingLoop(props) {
  const controller = useContext(BackingLoopContext);
  const latest = useRef(controller);
  latest.current = controller;
  const inline = Boolean(controller?.sharedPlayback && !props.renderSurface);
  useEffect(() => {
    if (!inline) return;
    latest.current.setDockView('hidden');
    return () => {
      const current = latest.current;
      // Leaving an inline player folds it into the same shared drawer.
      if (current.isPlaying || current.isPaused) current.setDockView('collapsed');
    };
  }, [inline]);
  return controller ? <BackingLoopSurface {...props} controller={controller} /> : <LocalBackingLoop key={backingSessionRevision} {...props} />;
}

function LocalBackingLoop(props) {
  const controller = useBackingLoop(props.ownerMode);
  const playlistAnchorRef = useRef(null);
  return <>
    <BackingLoopSurface {...props} controller={controller} panelRef={playlistAnchorRef} />
    <BackingLoopResources controller={controller} playlistAnchorRef={playlistAnchorRef} />
  </>;
}

function BackingLoopSurface({ controller, desktopPresentation = "default", mobile = false, renderSurface, panelRef }) {
  useLanguage();
  return (
    <>
      {renderSurface ? renderSurface(controller, mobile
        ? <MobileBackingLoop controller={controller} />
        : <DesktopBackingLoop controller={controller} presentation={desktopPresentation} />) : mobile
        ? <MobileBackingLoop controller={controller} panelRef={panelRef} />
        : <DesktopBackingLoop controller={controller} presentation={desktopPresentation} />}
    </>
  );
}

function BackingLoopResources({ controller, playlistAnchorRef }) {
  useLanguage();
  return <>
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
        aria-label={translateUi("components.chooseBackingAudioFilesToAddToTheCurrentPlaylist")}
        className="backingLoopImportInput"
        multiple
        onChange={controller.importBackingAudio}
        ref={controller.importInputRef}
        tabIndex="-1"
        type="file"
      />
      <BackingLoopDialogLayer controller={controller} playlistAnchorRef={playlistAnchorRef} />
    </>;
}
