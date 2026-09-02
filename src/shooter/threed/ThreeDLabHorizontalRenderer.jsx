import { memo, useEffect, useRef, useState } from "react";

import {
  MOONLIT_LOTUS_CANAL_FLOW_RATES,
  MOONLIT_LOTUS_CANAL_SCENES,
  createMoonlitLotusCanalChunks,
  renderMoonlitLotusCanalFrame,
} from "./moonlitLotusCanalArt.js";
import { THREE_D_LAB_HORIZONTAL_LAYOUT } from "./threeDLabHorizontalLayout.js";
import "./three-d-lab-horizontal.css";

function normalizeFrameDelta(now, previous) {
  if (!previous) return 0;
  return Math.min(0.05, Math.max(0, (now - previous) / 1000));
}

function ThreeDLabHorizontalRenderer({ active = false, battleState = "idle", stage = "underlay" }) {
  const activeRef = useRef(active);
  const battleStateRef = useRef(battleState);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [canvasFailed, setCanvasFailed] = useState(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    battleStateRef.current = battleState;
  }, [battleState]);

  useEffect(() => {
    if (stage !== "underlay") return undefined;

    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const context = canvas?.getContext?.("2d", { alpha: false, desynchronized: true });
    if (!canvas || !scene || !context) {
      setCanvasFailed(true);
      return undefined;
    }

    let animationFrameId = 0;
    let lastFrameAt = 0;
    let lastSampleAt = 0;
    let sampledFrames = 0;
    let scrollDistance = 0;
    const battleScrollSpeeds = THREE_D_LAB_HORIZONTAL_LAYOUT.endless.scrollSpeeds;
    let scrollSpeed = battleScrollSpeeds.idle;
    let sceneTime = 0;
    let stopped = false;
    setCanvasFailed(false);
    scene.dataset.assetStatus = "loading";

    const syncCanvasSize = () => {
      const bounds = scene.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const backingWidth = Math.round(width * pixelRatio);
      const backingHeight = Math.round(height * pixelRatio);
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }
      return { height, pixelRatio, width };
    };

    const render = (now) => {
      if (stopped) return;
      const delta = normalizeFrameDelta(now, lastFrameAt);
      lastFrameAt = now;
      const requestedSpeed = battleScrollSpeeds[battleStateRef.current]
        ?? battleScrollSpeeds.idle;
      const targetSpeed = activeRef.current || requestedSpeed === 0
        ? requestedSpeed
        : Math.min(requestedSpeed, battleScrollSpeeds.idle);
      const easeRate = targetSpeed > scrollSpeed ? 3.4 : 5.4;
      const ease = 1 - Math.exp(-delta * easeRate);
      scrollSpeed += (targetSpeed - scrollSpeed) * ease;
      scrollDistance += scrollSpeed * delta;
      sceneTime += delta * (activeRef.current ? 1 : 0.18);

      const viewport = syncCanvasSize();
      context.setTransform(viewport.pixelRatio, 0, 0, viewport.pixelRatio, 0, 0);
      renderMoonlitLotusCanalFrame(context, sceneCache, {
        flowDistance: scrollDistance,
        time: sceneTime,
        viewHeight: viewport.height,
        viewWidth: viewport.width,
      });

      sampledFrames += 1;
      if (now - lastSampleAt >= 1000) {
        const sampleWindow = Math.max(1, now - lastSampleAt);
        scene.dataset.renderFps = String(Math.round(sampledFrames * 1000 / sampleWindow));
        scene.dataset.scrollDistance = scrollDistance.toFixed(2);
        scene.dataset.scrollSpeed = scrollSpeed.toFixed(2);
        scene.dataset.midgroundOffset = (scrollDistance * MOONLIT_LOTUS_CANAL_FLOW_RATES.midground).toFixed(1);
        scene.dataset.waterOffset = (scrollDistance * MOONLIT_LOTUS_CANAL_FLOW_RATES.baseWater).toFixed(1);
        scene.dataset.highlightOffset = (scrollDistance * MOONLIT_LOTUS_CANAL_FLOW_RATES.highlight).toFixed(1);
        scene.dataset.foamOffset = (scrollDistance * MOONLIT_LOTUS_CANAL_FLOW_RATES.foam).toFixed(1);
        scene.dataset.debrisOffset = (scrollDistance * MOONLIT_LOTUS_CANAL_FLOW_RATES.debris).toFixed(1);
        scene.dataset.foregroundOffset = (scrollDistance * MOONLIT_LOTUS_CANAL_FLOW_RATES.foreground).toFixed(1);
        scene.style.setProperty("--three-lab-flow-multiplier", String(Math.max(0.18, scrollSpeed)));
        sampledFrames = 0;
        lastSampleAt = now;
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    let sceneCache = null;
    createMoonlitLotusCanalChunks(THREE_D_LAB_HORIZONTAL_LAYOUT.endless.chunkVariants)
      .then((cache) => {
        if (stopped) return;
        sceneCache = cache;
        scene.dataset.assetStatus = "ready";
        animationFrameId = window.requestAnimationFrame(render);
      })
      .catch((error) => {
        if (stopped) return;
        console.error(error);
        scene.dataset.assetStatus = "failed";
        setCanvasFailed(true);
      });
    return () => {
      stopped = true;
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, [stage]);

  if (stage !== "underlay") return null;

  return (
    <div
      aria-hidden="true"
      className="threeDLabHorizontalScene"
      data-chunk-count={THREE_D_LAB_HORIZONTAL_LAYOUT.endless.chunkCount}
      data-chunk-scenes={Object.keys(MOONLIT_LOTUS_CANAL_SCENES).join(",")}
      data-animated-landmarks="waterwheel-12f,waterfall-8f"
      data-concept="river-garden-v2-close"
      data-foreground-height="15.8-percent"
      data-layer-count={THREE_D_LAB_HORIZONTAL_LAYOUT.layers.length}
      data-layer-order="sky,close-environment,river-floor,combat,riverbank-foreground,hud"
      data-parallax-levels="7"
      data-parallax-rates="0.40,0.61,0.91,1.00,1.07,1.27"
      data-render-root="environment"
      data-renderer="canvas-diorama"
      data-room-sequence="garden,pavilion,garden,waterfall,bridge,festival"
      data-water-floor="water-floor-river-rgb"
      data-water-system="seamless-mirrored-uv-multirate"
      ref={sceneRef}
    >
      <canvas className="threeDLabHorizontalCanvas" ref={canvasRef} />
      {canvasFailed ? (
        <div className="threeDLabHorizontalFallback">Moonlit Lotus Canal을 표시할 수 없습니다.</div>
      ) : null}
    </div>
  );
}

export default memo(ThreeDLabHorizontalRenderer);
