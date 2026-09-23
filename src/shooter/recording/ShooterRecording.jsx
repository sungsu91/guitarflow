import { localizeUi } from "./../../i18n/core.js";
import ko from "./../../i18n/locales/ko.js";
import { t as translateUi } from "./../../i18n/core.js";
import { Translation, useLanguage } from "./../../i18n/react.jsx";
import ShooterSettingsPopover from '../ShooterSettingsPopover.jsx';
import CameraBeautyPreview from "./CameraBeautyPreview.jsx";
import { BEAUTY_LEVELS } from "./cameraBeauty.js";
import { mediaPermissionGuide } from "../../audio/mediaPermissionGuide.js";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Video, Maximize2, Minimize2 } from "lucide-react";
import { getActiveMicInputSession } from "../../audio/micInputEngine.js";
import { getAudioBusGraph, getSharedAudioContext } from "../../audio/audioBus.js";
import { RECORDING_WIDTH, CAMERA_FILTERS, MOBILE_CAMERA_ZOOM, MOBILE_CAMERA_HEIGHT, verifyCameraWideFraming, setCameraWideFraming, cameraContainRect, frontCameraConstraints, cameraOverlayRect, drawComposite, recorderOptions, recordingError, saveRecording, stopTracks } from "./recordingMedia.js";
import "./shooter-recording.css";

function CameraControls({ phase, seconds, ready, exit }) {
  useLanguage();
  return <div className="shooterRecordingControls">
    {phase === "preview" ? <span className="shooterRecordingClock" role="status">{ready ? translateUi("shooter.readyToRecordStartsWithTheGame") : translateUi("shooter.preparingRecording")}</span> : null}
    {phase === "recording" ? <>
      <span className="shooterRecordingClock"><Translation id="originalUi.recShooterrecording" />{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span>
    </> : null}
    {["preparing", "stopping"].includes(phase) ? <span role="status">{phase === "preparing" ? translateUi("shooter.preparingRecording") : translateUi("shooter.creatingVideo")}</span> : null}
    {exit ? <button className="shooterRecordingExit" type="button" onClick={exit} aria-label={translateUi("shooter.exitBottomCameraMode")}><Translation id="app.exit" /></button> : null}
  </div>;
}

// Platform UI remains separate; media ownership and controls are shared.
function MobileCameraLayout({ children, style, onFilter, filter, phase }) {
  useLanguage();
  const swipe = useRef(null);
  const interactive = ['preview', 'recording'].includes(phase);
  return <section className="shooterRecordingCamera shooterRecordingCamera--mobile" style={style} aria-label={translateUi("shooter.frontCamera")} tabIndex={interactive ? 0 : -1}
    onTouchStart={event => {
      swipe.current = interactive && event.touches.length === 1 && !event.target.closest('button,input')
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }}
    onTouchMove={event => { if (event.touches.length !== 1) swipe.current = null; }}
    onTouchCancel={() => { swipe.current = null; }}
    onTouchEnd={event => {
      const start = swipe.current; swipe.current = null;
      if (!start || !interactive || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.5) onFilter(dx < 0 ? 1 : -1);
    }}
    onKeyDown={event => {
      if (!interactive || event.target !== event.currentTarget) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onFilter(event.key === 'ArrowLeft' ? 1 : -1); }
    }}>
    {children}
    {interactive ? <span className="shooterRecordingFilterName" aria-live="polite">{localizeUi(filter.label)}</span> : null}
  </section>;
}
function DesktopCameraLayout({ children, style }) {
  useLanguage();
  return <section className="shooterRecordingCamera shooterRecordingCamera--desktop" style={style} aria-label={translateUi("shooter.frontCamera")}>{children}</section>;
}

export default function ShooterRecording({ arenaRef, entryTarget, landscape = false, mobile, ensureMic, onActiveChange, onLayoutChange, gamePlaying = false, onReview }) {
  useLanguage();
  const [layoutMode, setLayoutMode] = useState(null);
  const entryButtonRef = useRef(null);
  const fullCamera = layoutMode === "full";
  const [phase, setPhase] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [captureReady, setCaptureReady] = useState(false);
  const [cameraStyle, setCameraStyle] = useState({});
  const [filterIndex, setFilterIndex] = useState(0);
  const filterRef = useRef(0);
  const [beautyLevel, setBeautyLevel] = useState(0);
  const [beautyUnavailable, setBeautyUnavailable] = useState(false);
  const [beautyReady, setBeautyReady] = useState(false);
  const beautyRef = useRef(0);
  const disableBeauty = useCallback(() => {
    beautyRef.current = 0;
    setBeautyLevel(0);
    setBeautyUnavailable(true);
    if (overlayRef.current) overlayRef.current.beauty = 0;
  }, []);
  function changeBeauty() {
    const next = (beautyRef.current + 1) % BEAUTY_LEVELS.length;
    if (beautyRef.current === 0) setBeautyReady(false);
    beautyRef.current = next;
    setBeautyLevel(next);
    if (overlayRef.current) overlayRef.current.beauty = next;
  }
  const [wideCamera, setWideCamera] = useState(false);
  const [canWidenCamera, setCanWidenCamera] = useState(false);
  const [framingBusy, setFramingBusy] = useState(false);
  const framingBusyRef = useRef(false);
  const cameraZoomRef = useRef(MOBILE_CAMERA_ZOOM);
  const positionRef = useRef({ x: 1, y: .24 });
  const sizeRef = useRef(1);
  const resizeRef = useRef(null);
  const overlayRef = useRef(null);
  const moveCameraRef = useRef(() => {});
  const dragRef = useRef(null);
  const videoRef = useRef(null);
  const reviewRef = useRef(null);
  const uiRef = useRef(null);
  const sessionRef = useRef(null);
  const versionRef = useRef(0);
  const mounted = useRef(true);
  const active = !["idle", "choosing", "requesting"].includes(phase);
  const cameraVisible = active && phase !== "review";
  const callbacks = useRef({ onActiveChange, onLayoutChange, onReview });
  callbacks.current = { onActiveChange, onLayoutChange, onReview };

  function dispose() {
    ++versionRef.current;
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return;
    session.disposed = true;
    clearTimeout(session.captureTimer);
    clearTimeout(session.stopTimeout);
    clearTimeout(session.prepareTimeout);
    clearInterval(session.clock);
    cancelAnimationFrame(session.frame);
    if (session.recorder) {
      session.recorder.ondataavailable = null;
      session.recorder.onstop = null;
      session.recorder.onerror = null;
      try { if (session.recorder.state !== "inactive") session.recorder.stop(); } catch { /* Already interrupted. */ }
    }
    session.detach?.();
    session.capture?.dispose();
    stopTracks(session.output);
    stopTracks(session.camera);
    stopTracks(session.mic);
    if (session.url) URL.revokeObjectURL(session.url);
    session.chunks = [];
  }

  function close(message = "") {
    dispose();
    callbacks.current.onActiveChange(false);
    callbacks.current.onLayoutChange?.(null);
    if (!mounted.current) return;
    setPhase("idle");
    setResult(null);
    setError(message);
    setSeconds(0);
    setSaveMessage("");
  }

  useEffect(() => {
    mounted.current = true;
    const interrupt = () => {
      const session = sessionRef.current;
      if (!session || session.review || session.sharing) return;
      if (session.recorder && (session.recorder.state !== 'inactive' || session.stopRequested)) {
        session.interrupted = true;
        stop();
      } else close(ko["shooter.recordingModeClosedBecauseYouLeftTheScreenTurnRecordingModeOn"]);
    };
    const visibility = () => { if (document.hidden) interrupt(); };
    const pageHide = () => interrupt();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pageHide);
    return () => {
      mounted.current = false;
      dispose();
      callbacks.current.onActiveChange(false);
    callbacks.current.onLayoutChange?.(null);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pageHide);
    };
  }, []);

  useLayoutEffect(() => {
    const update = () => {
      const viewport = window.visualViewport;
      const style = uiRef.current?.style;
      if (!style) return;
      style.width = `${viewport?.width || window.innerWidth}px`;
      style.height = `${viewport?.height || window.innerHeight}px`;
      style.left = `${viewport?.offsetLeft || 0}px`;
      style.top = `${viewport?.offsetTop || 0}px`;
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  useLayoutEffect(() => {
    if (!active) return;
    const panel = arenaRef.current?.closest(".shooterPanel");
    if (!panel) return;
    const arena = arenaRef.current;
    const originalScale = panel.style.scale;
    const originalOrigin = panel.style.transformOrigin;
    const update = () => {
      if (mobile) panel.style.scale = originalScale;
      const bounds = panel.getBoundingClientRect();
      const viewport = window.visualViewport;
      if (fullCamera) {
        const rect = arena.getBoundingClientRect();
        overlayRef.current = { mode: "full", outputAspect: bounds.width / bounds.height, beauty: beautyRef.current, filter: CAMERA_FILTERS[filterRef.current].id };
        setCameraStyle({ left: rect.left - (viewport?.offsetLeft || 0), top: rect.top - (viewport?.offsetTop || 0), width: rect.width, height: rect.height });
        return;
      }
      if (mobile && !landscape) {
        const vh = viewport?.height || window.innerHeight;
        const vw = viewport?.width || window.innerWidth;
        const panelTop = bounds.top - (viewport?.offsetTop || 0);
        const totalHeight = Math.max(1, vh - panelTop);
        const gameHeight = totalHeight * (1 - MOBILE_CAMERA_HEIGHT);
        const scale = Math.min(1, gameHeight / bounds.height, vw / bounds.width);
        panel.style.transformOrigin = '50% 0';
        panel.style.scale = String(scale);
        // Scale the complete game once. Logical arena coordinates stay intact.
        const visibleGameHeight = bounds.height * scale;
        const top = panelTop + visibleGameHeight;
        overlayRef.current = { x: 0, y: visibleGameHeight / totalHeight, width: 1, height: (vh - top) / totalHeight, gameFraction: visibleGameHeight / totalHeight, gameSourceFraction: 1, outputAspect: vw / totalHeight, fit: "contain", zoom: cameraZoomRef.current, filter: CAMERA_FILTERS[filterRef.current].id, beauty: beautyRef.current };
        setCameraStyle({ left: 0, top, width: vw, height: vh - top });
        return;
      }
      if (landscape) {
        const edgeInset = 2;
        const width = Math.min(300, Math.max(225, bounds.width * 0.36));
        const height = width * 9 / 16;
        const left = bounds.left - (viewport?.offsetLeft || 0) + bounds.width - width - edgeInset;
        const topInset = edgeInset;
        const top = bounds.top - (viewport?.offsetTop || 0) + topInset;
        overlayRef.current = {
          x: (bounds.width - width - edgeInset) / bounds.width,
          y: topInset / bounds.height,
          width: width / bounds.width,
          height: height / bounds.height,
          fit: "contain",
          outputAspect: bounds.width / bounds.height,
          zoom: cameraZoomRef.current,
          filter: CAMERA_FILTERS[filterRef.current].id,
          beauty: beautyRef.current,
        };
        setCameraStyle({ left, top, width, height });
        return;
      }
      const rect = cameraOverlayRect(bounds.width, bounds.height, positionRef.current, mobile, sizeRef.current);
      overlayRef.current = { x: rect.x / bounds.width, y: rect.y / bounds.height, width: rect.width / bounds.width, height: rect.height / bounds.height, beauty: beautyRef.current };
      setCameraStyle({ left: bounds.left - (viewport?.offsetLeft || 0) + rect.x, top: bounds.top - (viewport?.offsetTop || 0) + rect.y, width: rect.width, height: rect.height });
    };
    let frame = 0;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); }); };
    moveCameraRef.current = schedule;
    callbacks.current.onActiveChange(mobile);
    callbacks.current.onLayoutChange?.(fullCamera ? "full" : "split");
    update();
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      arena.style.removeProperty("--recording-lift");
      delete arena.dataset.recordingRaised;
      panel.style.scale = originalScale;
      panel.style.transformOrigin = originalOrigin;
      cancelAnimationFrame(frame);
      moveCameraRef.current = () => {};
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [active, landscape, mobile, arenaRef, fullCamera]);

  function moveCamera(dx, dy) {
    const bounds = arenaRef.current.closest(".shooterPanel").getBoundingClientRect();
    const rect = cameraOverlayRect(bounds.width, bounds.height, positionRef.current, mobile, sizeRef.current);
    const clamp = value => Math.max(0, Math.min(1, value));
    positionRef.current = { x: clamp(positionRef.current.x + dx / Math.max(1, bounds.width - rect.width - 16)), y: clamp(positionRef.current.y + dy / Math.max(1, bounds.height - rect.height - 64)) };
    moveCameraRef.current();
  }

  function resizeCamera(delta) {
    const bounds = arenaRef.current.closest(".shooterPanel").getBoundingClientRect();
    const old = cameraOverlayRect(bounds.width, bounds.height, positionRef.current, mobile, sizeRef.current);
    const base = Math.min(bounds.width * (mobile ? .36 : .22), mobile ? 160 : 240);
    const next = cameraOverlayRect(bounds.width, bounds.height, positionRef.current, mobile, (old.width + delta) / base);
    sizeRef.current = next.width / base;
    const clamp = value => Math.max(0, Math.min(1, value));
    positionRef.current = { x: clamp((old.x - 8) / Math.max(1, bounds.width - next.width - 16)), y: clamp((old.y - 48) / Math.max(1, bounds.height - next.height - 64)) };
    moveCameraRef.current();
  }

  function changeCameraFilter(step) {
    const index = (filterRef.current + step + CAMERA_FILTERS.length) % CAMERA_FILTERS.length;
    filterRef.current = index;
    if (overlayRef.current) overlayRef.current.filter = CAMERA_FILTERS[index].id;
    setFilterIndex(index);
  }

  async function toggleWideCamera() {
    const session = sessionRef.current;
    if (!session || phase !== 'preview' || framingBusyRef.current) return;
    framingBusyRef.current = true;
    setFramingBusy(true);
    const wide = !wideCamera;
    try {
      const applied = await setCameraWideFraming(session.camera.getVideoTracks()[0], wide, session.originalCameraZoom);
      if (session.disposed || sessionRef.current !== session) return;
      if (!applied) { setCanWidenCamera(false); return; }
      // Change the camera's actual capture range, not the CSS display zoom.
      setWideCamera(wide);
      moveCameraRef.current();
    } catch {
      // Stop offering a control the device has stopped accepting.
      if (!session.disposed && sessionRef.current === session) setCanWidenCamera(false);
    } finally {
      if (sessionRef.current === session) { framingBusyRef.current = false; setFramingBusy(false); }
    }
  }

  useEffect(() => {
    if (!cameraVisible || !videoRef.current || !sessionRef.current) return;
    const video = videoRef.current;
    const session = sessionRef.current;
    let attached = true;
    video.srcObject = session.camera;
    video.play().catch(() => {
      if (attached && !session.disposed) close(ko["shooter.couldNotStartTheCameraPreviewTryAgain"]);
    });
    return () => { attached = false; video.pause(); video.srcObject = null; };
  }, [cameraVisible]);

  // Warm the reusable capture cache before REC, not in its click handler.
  useEffect(() => {
    setCaptureReady(false);
    const session = sessionRef.current;
    if (!cameraVisible || !cameraReady || !session) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled && !session.disposed) close(ko["shooter.recordingPreparationTimedOutTryAgain"]);
    }, 20000);
    const prepare = async () => {
      // Let the camera and its controls paint before the first capture pass.
      await new Promise(resolve => setTimeout(resolve, 80));
      if (cancelled || session.disposed) return;
      const { createSceneCapture } = await import("./sceneCapture.js");
      if (cancelled || session.disposed) return;
      const camera = videoRef.current;
      const panel = arenaRef.current?.closest(".shooterPanel");
      if (!camera || !panel) return;
      session.capture = createSceneCapture(panel, { paintCamera: (context, width, height) => {
        drawComposite(context, null, camera, width, height, { x: 0, y: 0, width: 1, height: 1, beauty: beautyRef.current, filter: CAMERA_FILTERS[filterRef.current].id });
      } });
      await session.capture.capture();
      if (!cancelled && !session.disposed) setCaptureReady(true);
    };
    prepare().catch(cause => {
      if (!cancelled && !session.disposed) close(recordingError(cause));
    }).finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [cameraVisible, cameraReady, arenaRef]);

  useEffect(() => {
    if (phase !== "review") return;
    const main = arenaRef.current?.closest("main");
    const wasInert = main?.inert;
    if (main) main.inert = true;
    reviewRef.current?.querySelector("button")?.focus();
    return () => { if (main) main.inert = wasInert; };
  }, [phase, arenaRef]);

  async function enter(mode = layoutMode) {
    if (!["choosing", "review"].includes(phase) || !["full", "split"].includes(mode) || sessionRef.current) return;
    setLayoutMode(mode);
    setError("");
    setCameraReady(false);
    setWideCamera(false);
    setCanWidenCamera(false);
    setBeautyLevel(0);
    beautyRef.current = 0;
    setBeautyUnavailable(false);
    setFilterIndex(0);
    filterRef.current = 0;
    cameraZoomRef.current = MOBILE_CAMERA_ZOOM;
    framingBusyRef.current = false;
    setFramingBusy(false);
    setPhase("requesting");
    const token = ++versionRef.current;
    const session = { disposed: false, chunks: [] };
    sessionRef.current = session;
    const current = () => token === versionRef.current && !session.disposed;
    let permissionResource = "camera";
    try {
      if (!window.isSecureContext) throw new Error(ko["shooter.recordingRequiresASecureConnectionOpenAnHttpsAddressSecureContext"]);
      recorderOptions();
      if (!navigator.mediaDevices?.getUserMedia) throw new Error(ko["shooter.cameraAccessIsUnavailableInThisEnvironmentOpenTheSameAddressDirectly"]);
      if (!HTMLCanvasElement.prototype.captureStream) throw new Error(ko["shooter.thisEnvironmentDoesNotSupportVideoOutputFromTheGameCanvasCanvas"]);
      session.camera = await navigator.mediaDevices.getUserMedia(frontCameraConstraints(mobile, navigator.mediaDevices.getSupportedConstraints?.()));
      if (!current()) { stopTracks(session.camera); return; }
      session.originalCameraZoom = session.camera.getVideoTracks()[0]?.getSettings?.().zoom;
      if (!getActiveMicInputSession()?.rawStream?.getAudioTracks().some((track) => track.readyState === "live")) {
        permissionResource = "microphone";
        await ensureMic({ quiet: true });
      }
      if (!current()) return;
      const microphone = getActiveMicInputSession()?.rawStream;
      if (!microphone?.getAudioTracks().some((track) => track.readyState === "live")) throw new Error(mediaPermissionGuide({ mobile }));
      session.mic = new MediaStream(microphone.getAudioTracks().map((track) => track.clone()));
      [...session.camera.getTracks(), ...session.mic.getTracks()].forEach((track) => {
        track.onended = () => {
          if (!current()) return;
          if (session.review || session.stopRequested) { session.previewEnded = true; return; }
          if (session.recorder?.state === 'recording') { session.previewEnded = true; session.interrupted = true; stop(); return; }
          close(ko["shooter.recordingStoppedBecauseTheCameraOrMicrophoneDisconnected"]);
        };
      });
      const canWiden = mobile && await verifyCameraWideFraming(session.camera.getVideoTracks()[0], session.originalCameraZoom);
      if (!current()) return;
      setCanWidenCamera(canWiden);
      setPhase("preview");
    } catch (cause) { if (current()) close(recordingError(cause, { mobile, resource: permissionResource })); }
  }

  function finishOutput(session) {
    clearInterval(session.clock);
    clearTimeout(session.captureTimer);
    clearTimeout(session.stopTimeout);
    cancelAnimationFrame(session.frame);
    session.capture?.dispose();
    session.capture = null;
    session.detach?.();
    session.detach = null;
    stopTracks(session.output);
    session.output = null;
  }

  const readyToRecord = cameraReady && captureReady && !framingBusy && (beautyLevel === 0 || beautyReady);
  useEffect(() => {
    if (gamePlaying && phase === "preview" && readyToRecord) void start();
  }, [gamePlaying, phase, readyToRecord]);

  function requestExit() {
    if (saving) return;
    if (phase === "review") {
      if (confirmDiscard(ko["shooter.closeRecordingMode"])) close();
    } else if (phase === "preparing") {
      if (sessionRef.current) sessionRef.current.finishAfterStart = true;
      callbacks.current.onReview?.();
    } else if (phase === "recording") {
      stop();
    } else if (phase !== "stopping") close();
  }

  function confirmDiscard(action) {
    return window.confirm(localizeUi(action + ko["shooter.andTheCurrentVideoWillDisappearFromThisScreenToKeepIt"]));
  }

  async function start() {
    const session = sessionRef.current;
    if (!session || phase !== "preview" || framingBusyRef.current || !captureReady || !session.capture || session.startRequested) return;
    session.startRequested = true;
    setPhase("preparing");
    setSaveMessage("");
    session.prepareTimeout = setTimeout(() => close(ko["shooter.recordingPreparationTimedOutTryAgain"]), 20000);
    try {
      const camera = videoRef.current;
      if (!camera?.videoWidth || camera.readyState < 2) throw new Error(ko["shooter.theCameraIsNotReadyTryAgain"]);
      const panel = arenaRef.current.closest(".shooterPanel");
      // Present the preparing state before allocating the recorder output.
      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
      if (session.disposed) return;
      let game = await session.capture.capture();
      if (session.disposed) return;
      const canvas = document.createElement("canvas");
      const bounds = panel.getBoundingClientRect();
      const vw = mobile ? (window.visualViewport?.width || window.innerWidth) : bounds.width;
      const vh = mobile ? vw / overlayRef.current.outputAspect : bounds.height;
      canvas.width = RECORDING_WIDTH;
      canvas.height = Math.round(canvas.width * vh / vw / 2) * 2;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error(ko["shooter.couldNotCreateTheVideoCompositionCanvas"]);
      drawComposite(context, game, camera, canvas.width, canvas.height, overlayRef.current);
      // Detect tainted images before creating a recorder or losing the preview.
      context.getImageData(0, 0, 1, 1);
      session.output = canvas.captureStream(30);
      // Add a parallel recording branch. Never disconnect/close the game graph.
      try {
        const audioContext = getSharedAudioContext();
        await audioContext.resume();
        if (session.disposed) return;
        const graph = getAudioBusGraph(audioContext);
        const destination = audioContext.createMediaStreamDestination();
        const source = audioContext.createMediaStreamSource(session.mic);
        session.detach = () => {
          try { source.disconnect(); } catch { /* Already detached. */ }
          try { graph.limiter.disconnect(destination); } catch { /* Already detached. */ }
          stopTracks(destination.stream);
        };
        source.connect(destination);
        graph.limiter.connect(destination);
        destination.stream.getAudioTracks().forEach((track) => session.output.addTrack(track));
      } catch {
        session.detach?.();
        session.detach = null;
        if (session.disposed) return;
        session.mic.getAudioTracks().forEach((track) => session.output.addTrack(track.clone()));
      }
      const recorder = new MediaRecorder(session.output, recorderOptions());
      session.recorder = recorder;
      session.stopRequested = false;
      session.interrupted = false;
      session.chunks = [];
      session.bytes = 0;
      recorder.ondataavailable = (event) => {
        if (session.disposed || !event.data?.size) return;
        session.chunks.push(event.data);
        session.bytes += event.data.size;
        if (session.bytes > 200 * 1024 * 1024 && recorder.state === "recording") stop();
      };
      recorder.onerror = () => close(ko["shooter.anErrorOccurredDuringRecordingRecordingModeHasClosed"]);
      recorder.onstop = () => {
        if (session.disposed) return;
        finishOutput(session);
        try {
          const blob = new Blob(session.chunks, { type: recorder.mimeType || session.chunks[0]?.type || "video/mp4" });
          session.chunks = [];
          if (!blob.size) throw new Error(ko["shooter.noVideoWasCreatedRecordAgain"]);
          session.url = URL.createObjectURL(blob);
          session.review = true;
          setResult({ blob, url: session.url });
          if (session.interrupted) setSaveMessage(ko["shooter.recordingStoppedBecauseTheScreenChangedOrADeviceDisconnectedYouCan"]);
          setPhase("review");
        } catch (cause) { close(recordingError(cause)); }
      };
      recorder.start(1000);
      if (session.finishAfterStart) { clearTimeout(session.prepareTimeout); stop(); return; }
      clearTimeout(session.prepareTimeout);
      session.startedAt = performance.now();
      setSeconds(0);
      setPhase("recording");
      session.clock = setInterval(() => {
        const elapsed = Math.floor((performance.now() - session.startedAt) / 1000);
        setSeconds(elapsed);
        if (elapsed >= 600) stop();
      }, 250);
      const draw = async () => {
        if (session.disposed || recorder.state !== "recording") return;
        const started = performance.now();
        try {
          game = await session.capture.capture();
          if (session.disposed || recorder.state !== "recording") return;
          drawComposite(context, game, camera, canvas.width, canvas.height, overlayRef.current);
          session.captureTimer = setTimeout(draw, Math.max(0, 1000 / 30 - (performance.now() - started)));
        } catch (cause) { if (!session.disposed && recorder.state === "recording") close(recordingError(cause)); }
      };
      session.captureTimer = setTimeout(draw, 1000 / 30);
      // One serialized loop samples the live game and camera into the same frame.
    } catch (cause) { if (!session.disposed) close(recordingError(cause)); }
  }

  function stop() {
    const session = sessionRef.current;
    if (!session?.recorder || session.stopRequested || session.recorder.state === "inactive") return;
    session.stopRequested = true;
    callbacks.current.onReview?.();
    setPhase("stopping");
    clearTimeout(session.captureTimer);
    clearInterval(session.clock);
    try {
      session.recorder.stop();
      session.stopTimeout = setTimeout(() => close(ko["shooter.videoCreationTimedOutRecordAgain"]), 15000);
    } catch (cause) { close(recordingError(cause)); }
  }

  function retry() {
    if (saving || !confirmDiscard(ko["shooter.recordAgain"])) return;
    const session = sessionRef.current;
    if (session?.previewEnded || session?.camera.getVideoTracks().some(track => track.readyState !== "live")) {
      close();
      void enter();
      return;
    }
    if (session?.url) URL.revokeObjectURL(session.url);
    if (session) { session.url = null; session.recorder = null; session.review = false; session.stopRequested = false; session.startRequested = false; session.finishAfterStart = false; }
    setResult(null);
    setSaveMessage("");
    setSeconds(0);
    setPhase("preview");
  }

  async function save() {
    if (saving || !result) return;
    const session = sessionRef.current;
    if (session) session.sharing = true;
    setSaving(true);
    try {
      const method = await saveRecording(result.blob, result.url);
      if (!session?.disposed) setSaveMessage(method === "shared" ? ko["shooter.findYourVideoInPhotos"] : ko["shooter.findYourVideoInDownloads"]);
    } catch (cause) {
      if (!session?.disposed) setSaveMessage(cause?.name === "AbortError" ? ko["shooter.saveCanceledYourVideoIsStillAvailable"] : ko["shooter.couldNotSaveDownloadFromTheVideoMenuBelowOrTryAgain"]);
    } finally { if (session) session.sharing = false; if (mounted.current) setSaving(false); }
  }

  const cameraFilter = CAMERA_FILTERS[filterIndex];
  const cameraFrame = !fullCamera && mobile && videoRef.current?.videoWidth && cameraStyle.width
    ? cameraContainRect(videoRef.current.videoWidth, videoRef.current.videoHeight, cameraStyle.width, cameraStyle.height, cameraZoomRef.current)
    : null;
  const cameraVisual = <>
      <video className="shooterRecordingLive" style={cameraFrame ? { left: cameraFrame.x, top: cameraFrame.y, width: cameraFrame.width, height: cameraFrame.height } : undefined} ref={videoRef} autoPlay muted playsInline onLoadedData={() => { setCameraReady(true); moveCameraRef.current(); }} onResize={() => moveCameraRef.current()} aria-label={translateUi("shooter.checkCameraFraming")} />
      {beautyLevel > 0 ? <CameraBeautyPreview videoRef={videoRef} level={beautyLevel} frame={cameraFrame} onUnavailable={disableBeauty} onReady={setBeautyReady} /> : null}
      {mobile && cameraFilter.color ? <div className="shooterRecordingFilterOverlay" aria-hidden="true" style={{ ...(cameraFrame ? { left: cameraFrame.x, top: cameraFrame.y, width: cameraFrame.width, height: cameraFrame.height } : { inset: 0 }), background: cameraFilter.color, mixBlendMode: cameraFilter.blend === 'source-over' ? 'normal' : cameraFilter.blend }} /> : null}
  </>;
  const CameraLayout = mobile ? MobileCameraLayout : DesktopCameraLayout;
  return createPortal(<div ref={uiRef} className={`shooterRecordingUI ${mobile ? "isMobile" : "isDesktop"} ${landscape ? "isLandscape" : ""} ${fullCamera ? "isFullCamera" : ""}`} data-recording-ui="true">
    {entryTarget ? createPortal(
      <button ref={entryButtonRef} aria-expanded={phase === "choosing"} aria-haspopup="dialog" className="shooterRecordingHudButton" aria-label={active ? translateUi("shooter.exitCameraMode") : phase === "requesting" ? translateUi("shooter.checkingPermissionsCancel") : translateUi("shooter.cameraMode")} title={active ? translateUi("shooter.exitCameraMode") : phase === "requesting" ? translateUi("shooter.cancelPermissionRequest") : translateUi("shooter.cameraMode")} onClick={active || phase === "requesting" ? requestExit : () => { setLayoutMode(null); setError(""); setPhase(phase === "choosing" ? "idle" : "choosing"); }} type="button">
        <Video aria-hidden="true" size={13} strokeWidth={1.8} />
        <span>{phase === "requesting" ? translateUi("common.cancel") : landscape ? active ? translateUi("shooter.cameraOff") : translateUi("shooter.cameraOn") : active ? translateUi("shooter.stopCapture") : translateUi("shooter.cameraMode")}</span>
      </button>, entryTarget,
    ) : null}
    {!active ? <div className="shooterRecordingEntry">
      {error ? <div className="shooterRecordingError" role="alert"><span>{localizeUi(error)}</span><button onClick={() => setError("")} type="button" aria-label={translateUi("shooter.dismissNotification")}>×</button></div> : null}
    </div> : cameraVisible ? <CameraLayout style={cameraStyle} onFilter={changeCameraFilter} filter={cameraFilter} phase={phase}>
      {fullCamera && arenaRef.current ? createPortal(<div className="shooterRecordingMapCamera">{cameraVisual}</div>, arenaRef.current) : cameraVisual}
      {beautyLevel > 0 && !beautyReady ? <span className="shooterRecordingBeautyStatus" role="status"><Translation id="shooter.preparingSkinSmoothing" /></span> : null}
      {['preview', 'recording'].includes(phase) && !beautyUnavailable ? <button className="shooterRecordingBeauty" type="button" onClick={changeBeauty} disabled={!cameraReady} aria-label={translateUi("shooter.skinSmoothingValue1", { value1: BEAUTY_LEVELS[beautyLevel] })} aria-pressed={beautyLevel > 0}><Translation id="shooter.enhance" /><br />{BEAUTY_LEVELS[beautyLevel]}</button> : null}
      {mobile && canWidenCamera && phase === 'preview' ? <button className="shooterRecordingWide" type="button" onClick={toggleWideCamera} disabled={!cameraReady || framingBusy} aria-pressed={wideCamera} aria-busy={framingBusy} aria-label={translateUi("shooter.wideCapture")}>
        {wideCamera ? <Minimize2 size={19} aria-hidden="true" /> : <Maximize2 size={19} aria-hidden="true" />}
      </button> : null}
      {!mobile && !fullCamera ? <><button className="shooterRecordingDrag" type="button" aria-label={translateUi("shooter.moveCamera")} title={translateUi("shooter.dragOrUseArrowKeysToMove")}
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { x: event.clientX, y: event.clientY }; }}
        onPointerMove={event => { if (!dragRef.current) return; moveCamera(event.clientX - dragRef.current.x, event.clientY - dragRef.current.y); dragRef.current = { x: event.clientX, y: event.clientY }; }}
        onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} onLostPointerCapture={() => { dragRef.current = null; }}
        onKeyDown={event => { const delta = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[event.key]; if (delta) { event.preventDefault(); moveCamera(...delta); } }}><Translation id="shooter.moveCameraShooterRecording" /></button>
      <button className="shooterRecordingResize" type="button" aria-label={translateUi("shooter.resizeCamera")} title={translateUi("shooter.dragACornerOrUseArrowKeysToResize")}
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); resizeRef.current = { x: event.clientX, y: event.clientY }; }}
        onPointerMove={event => { if (!resizeRef.current) return; const dx = event.clientX - resizeRef.current.x; const dy = (event.clientY - resizeRef.current.y) / 1.12; resizeCamera(Math.abs(dx) >= Math.abs(dy) ? dx : dy); resizeRef.current = { x: event.clientX, y: event.clientY }; }}
        onPointerUp={() => { resizeRef.current = null; }} onPointerCancel={() => { resizeRef.current = null; }} onLostPointerCapture={() => { resizeRef.current = null; }}
        onKeyDown={event => { const delta = { ArrowLeft: -8, ArrowUp: -8, ArrowRight: 8, ArrowDown: 8 }[event.key]; if (delta) { event.preventDefault(); resizeCamera(delta); } }}>◢</button></> : null}
      <CameraControls phase={phase} seconds={seconds} ready={readyToRecord} exit={requestExit} />
    </CameraLayout> : null}
    {phase === "choosing" ? <ShooterSettingsPopover anchor={entryButtonRef.current} mobile={mobile} label={translateUi("shooter.chooseCameraMode")} compact className="shooterRecordingChoice" onClose={() => setPhase("idle")}>
      <div className="shooterRecordingChoices">
        <button type="button" onClick={() => enter("full")} title={translateUi("shooter.showCameraOverFullMap")}><Translation id="app.all" /></button>
        <button type="button" onClick={() => enter("split")} title={translateUi("shooter.splitGameAndCameraViews")}><Translation id="audioStudio.split" /></button>
      </div>
    </ShooterSettingsPopover> : null}
    {phase === "review" && result ? <div ref={reviewRef} className="shooterRecordingReview" role="dialog" aria-modal="true" aria-label={translateUi("shooter.reviewRecording")} onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const controls = [...reviewRef.current.querySelectorAll("video, button:not(:disabled)")];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <video src={result.url} controls playsInline onError={() => setSaveMessage(ko["shooter.thisBrowserCouldnTPlayThePreviewSaveTheVideoToView"])} />
      <div><button onClick={retry} disabled={saving} type="button"><Translation id="shooter.recordAgain" /></button><button onClick={save} disabled={saving} type="button">{saving ? translateUi("pdf.saving") : translateUi("shooter.saveVideo")}</button><button onClick={requestExit} disabled={saving} type="button"><Translation id="shooter.exitCameraMode" /></button></div>
      {saveMessage ? <p role="status">{localizeUi(saveMessage)}</p> : null}
    </div> : null}
  </div>, document.body);
}
