import { mediaPermissionGuide } from "../../audio/mediaPermissionGuide.js";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Video, Maximize2, Minimize2 } from "lucide-react";
import { getActiveMicInputSession } from "../../audio/micInputEngine.js";
import { getAudioBusGraph, getSharedAudioContext } from "../../audio/audioBus.js";
import { RECORDING_WIDTH, CAMERA_FILTERS, MOBILE_CAMERA_ZOOM, MOBILE_CAMERA_HEIGHT, setCameraWideFraming, cameraContainRect, frontCameraConstraints, cameraOverlayRect, drawComposite, recorderOptions, recordingError, saveRecording, stopTracks } from "./recordingMedia.js";
import "./shooter-recording.css";

function CameraControls({ phase, seconds, start, stop, ready, exit }) {
  return <div className="shooterRecordingControls">
    {phase === "preview" ? <button onClick={start} disabled={!ready} type="button">{ready ? "● REC" : "카메라 준비 중…"}</button> : null}
    {phase === "recording" ? <>
      <span className="shooterRecordingClock">● REC {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span>
      <button onClick={stop} type="button" aria-label="녹화 중지">■</button>
    </> : null}
    {["preparing", "stopping"].includes(phase) ? <span role="status">{phase === "preparing" ? "녹화 준비 중…" : "영상 만드는 중…"}</span> : null}
    {exit ? <button className="shooterRecordingExit" type="button" onClick={exit} aria-label="하단 촬영모드 종료">종료</button> : null}
  </div>;
}

// Platform UI remains separate; media ownership and controls are shared.
function MobileCameraLayout({ children, style, onFilter, filter, phase }) {
  const swipe = useRef(null);
  const interactive = ['preview', 'recording'].includes(phase);
  return <section className="shooterRecordingCamera shooterRecordingCamera--mobile" style={style} aria-label="전면 카메라" tabIndex={interactive ? 0 : -1}
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
    {interactive ? <span className="shooterRecordingFilterName" aria-live="polite">{filter.label}</span> : null}
  </section>;
}
function DesktopCameraLayout({ children, style }) {
  return <section className="shooterRecordingCamera shooterRecordingCamera--desktop" style={style} aria-label="전면 카메라">{children}</section>;
}

export default function ShooterRecording({ arenaRef, entryTarget, mobile, ensureMic, onActiveChange }) {
  const [phase, setPhase] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStyle, setCameraStyle] = useState({});
  const [filterIndex, setFilterIndex] = useState(0);
  const filterRef = useRef(0);
  const [wideCamera, setWideCamera] = useState(false);
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
  const active = !["idle", "requesting"].includes(phase);
  const cameraVisible = active && phase !== "review";
  const callbacks = useRef({ onActiveChange });
  callbacks.current = { onActiveChange };

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
      } else close("화면을 벗어나 촬영모드를 종료했습니다. 다시 촬영모드를 켜주세요.");
    };
    const visibility = () => { if (document.hidden) interrupt(); };
    const pageHide = () => interrupt();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pageHide);
    return () => {
      mounted.current = false;
      dispose();
      callbacks.current.onActiveChange(false);
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
      if (mobile) {
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
        overlayRef.current = { x: 0, y: visibleGameHeight / totalHeight, width: 1, height: (vh - top) / totalHeight, gameFraction: visibleGameHeight / totalHeight, gameSourceFraction: 1, outputAspect: vw / totalHeight, fit: "contain", zoom: cameraZoomRef.current, filter: CAMERA_FILTERS[filterRef.current].id };
        setCameraStyle({ left: 0, top, width: vw, height: vh - top });
        return;
      }
      const rect = cameraOverlayRect(bounds.width, bounds.height, positionRef.current, mobile, sizeRef.current);
      overlayRef.current = { x: rect.x / bounds.width, y: rect.y / bounds.height, width: rect.width / bounds.width, height: rect.height / bounds.height };
      setCameraStyle({ left: bounds.left - (viewport?.offsetLeft || 0) + rect.x, top: bounds.top - (viewport?.offsetTop || 0) + rect.y, width: rect.width, height: rect.height });
    };
    let frame = 0;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); }); };
    moveCameraRef.current = schedule;
    callbacks.current.onActiveChange(mobile);
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
  }, [active, mobile, arenaRef]);

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
      if (!applied || session.disposed || sessionRef.current !== session) return;
      // Change the camera's actual capture range, not the CSS display zoom.
      setWideCamera(wide);
      moveCameraRef.current();
    } catch {
      // Keep the existing framing if the device rejects the adjustment.
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
      if (attached && !session.disposed) close("카메라 프리뷰를 시작할 수 없습니다. 다시 시도해주세요.");
    });
    return () => { attached = false; video.pause(); video.srcObject = null; };
  }, [cameraVisible]);

  useEffect(() => {
    if (phase !== "review") return;
    const main = arenaRef.current?.closest("main");
    const wasInert = main?.inert;
    if (main) main.inert = true;
    reviewRef.current?.querySelector("button")?.focus();
    return () => { if (main) main.inert = wasInert; };
  }, [phase, arenaRef]);

  async function enter() {
    if (!["idle", "review"].includes(phase)) return;
    setError("");
    setCameraReady(false);
    setWideCamera(false);
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
      if (!window.isSecureContext) throw new Error("촬영에는 보안 연결이 필요합니다. HTTPS 주소로 열어주세요. [SECURE_CONTEXT]");
      recorderOptions();
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("현재 실행 환경에서 카메라에 접근할 수 없습니다. Safari에서 같은 주소를 직접 열어 확인해주세요. [CAMERA_API]");
      if (!HTMLCanvasElement.prototype.captureStream) throw new Error("현재 실행 환경에서 게임 화면의 영상 출력을 지원하지 않습니다. [CANVAS_STREAM]");
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
          close("카메라 또는 마이크 연결이 끊어져 촬영을 종료했습니다.");
        };
      });
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

  async function start() {
    const session = sessionRef.current;
    if (!session || phase !== "preview" || framingBusyRef.current) return;
    setPhase("preparing");
    setSaveMessage("");
    session.prepareTimeout = setTimeout(() => close("녹화 준비 시간이 초과되었습니다. 다시 시도해주세요."), 20000);
    try {
      const camera = videoRef.current;
      if (!camera?.videoWidth || camera.readyState < 2) throw new Error("카메라가 준비되지 않았습니다. 다시 시도해주세요.");
      const panel = arenaRef.current.closest(".shooterPanel");
      const { createSceneCapture } = await import("./sceneCapture.js");
      if (session.disposed) return;
      session.capture = createSceneCapture(panel);
      let game = await session.capture.capture();
      if (session.disposed) return;
      const canvas = document.createElement("canvas");
      const bounds = panel.getBoundingClientRect();
      const vw = mobile ? (window.visualViewport?.width || window.innerWidth) : bounds.width;
      const vh = mobile ? vw / overlayRef.current.outputAspect : bounds.height;
      canvas.width = RECORDING_WIDTH;
      canvas.height = Math.round(canvas.width * vh / vw / 2) * 2;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("영상 합성 화면을 만들 수 없습니다.");
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
      recorder.onerror = () => close("녹화 도중 오류가 발생했습니다. 촬영모드를 종료했습니다.");
      recorder.onstop = () => {
        if (session.disposed) return;
        finishOutput(session);
        try {
          const blob = new Blob(session.chunks, { type: recorder.mimeType || session.chunks[0]?.type || "video/mp4" });
          session.chunks = [];
          if (!blob.size) throw new Error("영상이 생성되지 않았습니다. 다시 촬영해주세요.");
          session.url = URL.createObjectURL(blob);
          session.review = true;
          setResult({ blob, url: session.url });
          if (session.interrupted) setSaveMessage("화면 전환 또는 장치 연결 중단으로 녹화를 멈췄습니다. 여기까지 찍은 영상을 저장할 수 있습니다.");
          setPhase("review");
        } catch (cause) { close(recordingError(cause)); }
      };
      recorder.start(1000);
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
    setPhase("stopping");
    clearTimeout(session.captureTimer);
    clearInterval(session.clock);
    try {
      session.recorder.stop();
      session.stopTimeout = setTimeout(() => close("영상 생성 시간이 초과되었습니다. 다시 촬영해주세요."), 15000);
    } catch (cause) { close(recordingError(cause)); }
  }

  function retry() {
    const session = sessionRef.current;
    if (session?.previewEnded || session?.camera.getVideoTracks().some(track => track.readyState !== "live")) {
      close();
      void enter();
      return;
    }
    if (session?.url) URL.revokeObjectURL(session.url);
    if (session) { session.url = null; session.recorder = null; session.review = false; session.stopRequested = false; }
    setResult(null);
    setSaveMessage("");
    setPhase("preview");
  }

  async function save() {
    if (saving || !result) return;
    const session = sessionRef.current;
    if (session) session.sharing = true;
    setSaving(true);
    try {
      const method = await saveRecording(result.blob, result.url);
      if (!session?.disposed) setSaveMessage(method === "shared" ? "사진첩에서 영상을 확인해주세요." : "다운로드 목록에서 영상을 확인해주세요.");
    } catch (cause) {
      if (!session?.disposed) setSaveMessage(cause?.name === "AbortError" ? "저장을 취소했습니다. 영상은 유지됩니다." : "저장하지 못했습니다. 아래 영상 메뉴에서 다운로드하거나 다시 시도해주세요.");
    } finally { if (session) session.sharing = false; if (mounted.current) setSaving(false); }
  }

  const cameraFilter = CAMERA_FILTERS[filterIndex];
  const cameraFrame = mobile && videoRef.current?.videoWidth && cameraStyle.width
    ? cameraContainRect(videoRef.current.videoWidth, videoRef.current.videoHeight, cameraStyle.width, cameraStyle.height, cameraZoomRef.current)
    : null;
  const CameraLayout = mobile ? MobileCameraLayout : DesktopCameraLayout;
  return createPortal(<div ref={uiRef} className={`shooterRecordingUI ${mobile ? "isMobile" : "isDesktop"}`} data-recording-ui="true">
    {entryTarget ? createPortal(
      <button className="shooterRecordingHudButton" aria-label={active ? "촬영모드 종료" : phase === "requesting" ? "권한 확인 중 · 취소" : "촬영모드"} title={active ? "촬영모드 종료" : phase === "requesting" ? "권한 요청 취소" : "촬영모드"} onClick={active || phase === "requesting" ? () => close() : enter} type="button">
        <Video aria-hidden="true" size={13} strokeWidth={1.8} />
        <span>{active ? "촬영 종료" : phase === "requesting" ? "취소" : "촬영모드"}</span>
      </button>, entryTarget,
    ) : null}
    {!active ? <div className="shooterRecordingEntry">
      {error ? <div className="shooterRecordingError" role="alert"><span>{error}</span><button onClick={() => setError("")} type="button" aria-label="알림 닫기">×</button></div> : null}
    </div> : cameraVisible ? <CameraLayout style={cameraStyle} onFilter={changeCameraFilter} filter={cameraFilter} phase={phase}>
      <video className="shooterRecordingLive" style={cameraFrame ? { left: cameraFrame.x, top: cameraFrame.y, width: cameraFrame.width, height: cameraFrame.height } : undefined} ref={videoRef} autoPlay muted playsInline onLoadedData={() => { setCameraReady(true); moveCameraRef.current(); }} onResize={() => moveCameraRef.current()} aria-label="촬영 구도 확인" />
      {mobile && cameraFrame && cameraFilter.color ? <div className="shooterRecordingFilterOverlay" aria-hidden="true" style={{ left: cameraFrame.x, top: cameraFrame.y, width: cameraFrame.width, height: cameraFrame.height, background: cameraFilter.color, mixBlendMode: cameraFilter.blend === 'source-over' ? 'normal' : cameraFilter.blend }} /> : null}
      {mobile && phase === 'preview' ? <button className="shooterRecordingWide" type="button" onClick={toggleWideCamera} disabled={!cameraReady || framingBusy} aria-pressed={wideCamera} aria-busy={framingBusy} aria-label="넓게 찍기">
        {wideCamera ? <Minimize2 size={19} aria-hidden="true" /> : <Maximize2 size={19} aria-hidden="true" />}
      </button> : null}
      {!mobile ? <><button className="shooterRecordingDrag" type="button" aria-label="카메라 위치 이동" title="드래그 또는 방향키로 이동"
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { x: event.clientX, y: event.clientY }; }}
        onPointerMove={event => { if (!dragRef.current) return; moveCamera(event.clientX - dragRef.current.x, event.clientY - dragRef.current.y); dragRef.current = { x: event.clientX, y: event.clientY }; }}
        onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} onLostPointerCapture={() => { dragRef.current = null; }}
        onKeyDown={event => { const delta = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[event.key]; if (delta) { event.preventDefault(); moveCamera(...delta); } }}>⠿ 카메라 이동</button>
      <button className="shooterRecordingResize" type="button" aria-label="카메라 크기 조절" title="모서리를 드래그하거나 방향키로 크기 조절"
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); resizeRef.current = { x: event.clientX, y: event.clientY }; }}
        onPointerMove={event => { if (!resizeRef.current) return; const dx = event.clientX - resizeRef.current.x; const dy = (event.clientY - resizeRef.current.y) / 1.12; resizeCamera(Math.abs(dx) >= Math.abs(dy) ? dx : dy); resizeRef.current = { x: event.clientX, y: event.clientY }; }}
        onPointerUp={() => { resizeRef.current = null; }} onPointerCancel={() => { resizeRef.current = null; }} onLostPointerCapture={() => { resizeRef.current = null; }}
        onKeyDown={event => { const delta = { ArrowLeft: -8, ArrowUp: -8, ArrowRight: 8, ArrowDown: 8 }[event.key]; if (delta) { event.preventDefault(); resizeCamera(delta); } }}>◢</button></> : null}
      <CameraControls phase={phase} seconds={seconds} start={start} stop={stop} ready={cameraReady && !framingBusy} exit={mobile ? () => close() : undefined} />
    </CameraLayout> : null}
    {phase === "review" && result ? <div ref={reviewRef} className="shooterRecordingReview" role="dialog" aria-modal="true" aria-label="촬영 결과 확인" onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const controls = [...reviewRef.current.querySelectorAll("video, button:not(:disabled)")];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <video src={result.url} controls playsInline onError={() => setSaveMessage("이 브라우저에서 미리보기를 재생하지 못했습니다. 영상 저장 후 확인해주세요.")} />
      <div><button onClick={retry} disabled={saving} type="button">다시 촬영</button><button onClick={save} disabled={saving} type="button">{saving ? "저장 중…" : "영상 저장"}</button><button onClick={() => close()} disabled={saving} type="button">촬영모드 종료</button></div>
      {saveMessage ? <p role="status">{saveMessage}</p> : null}
    </div> : null}
  </div>, document.body);
}
