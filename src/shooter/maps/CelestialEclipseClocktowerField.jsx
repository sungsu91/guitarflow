import { memo, useEffect, useRef } from "react";

import { applyMapImageFallback, markMapImageLoaded } from "./mapImageFallback.js";
import { getLoopFrameIndex, subscribeSharedMapAnimation } from "./sharedSpriteClock.js";

export const CELESTIAL_ECLIPSE_ASTROLABE_FRAME_COUNT = 48;
export const CELESTIAL_ECLIPSE_ASTROLABE_FPS = 12;
export const CELESTIAL_ECLIPSE_ASTROLABE_COLUMNS = 8;
export const CELESTIAL_ECLIPSE_ASTROLABE_ROWS = 6;
export const CELESTIAL_ECLIPSE_ASTROLABE_CELL_SIZE = 320;

const STARS = Object.freeze([
  Object.freeze({ x: 0.08, y: 0.18, phase: 0.04, speed: 0.012, size: 0.8 }),
  Object.freeze({ x: 0.16, y: 0.31, phase: 0.27, speed: 0.009, size: 1.15 }),
  Object.freeze({ x: 0.25, y: 0.44, phase: 0.51, speed: 0.011, size: 0.72 }),
  Object.freeze({ x: 0.12, y: 0.59, phase: 0.76, speed: 0.008, size: 1.05 }),
  Object.freeze({ x: 0.28, y: 0.72, phase: 0.19, speed: 0.01, size: 0.68 }),
  Object.freeze({ x: 0.19, y: 0.86, phase: 0.63, speed: 0.007, size: 0.92 }),
  Object.freeze({ x: 0.92, y: 0.2, phase: 0.37, speed: 0.011, size: 0.76 }),
  Object.freeze({ x: 0.84, y: 0.34, phase: 0.7, speed: 0.008, size: 1.08 }),
  Object.freeze({ x: 0.73, y: 0.48, phase: 0.12, speed: 0.01, size: 0.7 }),
  Object.freeze({ x: 0.89, y: 0.62, phase: 0.45, speed: 0.009, size: 0.96 }),
  Object.freeze({ x: 0.76, y: 0.75, phase: 0.83, speed: 0.007, size: 0.66 }),
  Object.freeze({ x: 0.82, y: 0.88, phase: 0.21, speed: 0.012, size: 0.88 }),
]);

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function syncCanvasSize(canvas, maximumPixelRatio = 3) {
  const width = Math.round(canvas.clientWidth);
  const height = Math.round(canvas.clientHeight);
  if (!width || !height) return null;
  const pixelRatio = Math.min(maximumPixelRatio, Math.max(1, window.devicePixelRatio || 1));
  const renderWidth = Math.round(width * pixelRatio);
  const renderHeight = Math.round(height * pixelRatio);
  if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
    canvas.width = renderWidth;
    canvas.height = renderHeight;
  }
  return { height, pixelRatio, renderHeight, renderWidth, width };
}

function drawAstrolabeFrame(root, image, frame) {
  const canvas = root?.querySelector(".shooterMapCelestialAstrolabeCanvas");
  if (!canvas || !image?.complete || !image.naturalWidth || !image.naturalHeight) return false;
  const size = syncCanvasSize(canvas);
  if (!size) return false;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return false;
  const column = frame % CELESTIAL_ECLIPSE_ASTROLABE_COLUMNS;
  const row = Math.floor(frame / CELESTIAL_ECLIPSE_ASTROLABE_COLUMNS);
  context.clearRect(0, 0, size.renderWidth, size.renderHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    column * CELESTIAL_ECLIPSE_ASTROLABE_CELL_SIZE,
    row * CELESTIAL_ECLIPSE_ASTROLABE_CELL_SIZE,
    CELESTIAL_ECLIPSE_ASTROLABE_CELL_SIZE,
    CELESTIAL_ECLIPSE_ASTROLABE_CELL_SIZE,
    0,
    0,
    size.renderWidth,
    size.renderHeight,
  );
  root.dataset.astrolabeFrame = String(frame);
  root.dataset.astrolabeColumn = String(column);
  root.dataset.astrolabeRow = String(row);
  root.dataset.astrolabeCenterOffset = "0,0";
  return true;
}

function drawAmbientStars(canvas, timestampMs) {
  const size = syncCanvasSize(canvas, 2);
  if (!size) return;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;
  const elapsedSeconds = Math.max(0, Number(timestampMs) || 0) / 1000;
  context.setTransform(size.pixelRatio, 0, 0, size.pixelRatio, 0, 0);
  context.clearRect(0, 0, size.width, size.height);
  context.save();
  context.globalCompositeOperation = "screen";
  STARS.forEach((star) => {
    const travel = modulo(star.phase + elapsedSeconds * star.speed, 1);
    const pulse = 0.5 + 0.5 * Math.sin(elapsedSeconds * 0.72 + star.phase * Math.PI * 2);
    const x = star.x * size.width;
    const y = modulo(star.y - travel * 0.055, 1) * size.height;
    context.globalAlpha = 0.12 + pulse * 0.23;
    context.fillStyle = pulse > 0.58 ? "#dff8ff" : "#b6cfff";
    context.beginPath();
    context.arc(x, y, star.size, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function CelestialEclipseClocktowerField({ active = true, atlas }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const image = root.querySelector(".shooterMapCelestialAstrolabeAtlasSource");
    const ambientCanvas = root.querySelector(".shooterMapCelestialAmbientCanvas");
    const render = (timestampMs) => {
      const frame = getLoopFrameIndex(
        timestampMs,
        CELESTIAL_ECLIPSE_ASTROLABE_FRAME_COUNT,
        CELESTIAL_ECLIPSE_ASTROLABE_FPS,
      );
      drawAstrolabeFrame(root, image, frame);
      drawAmbientStars(ambientCanvas, timestampMs);
      if (import.meta.env.DEV) {
        root.dataset.astrolabeTickCount = String(
          (Number.parseInt(root.dataset.astrolabeTickCount || "0", 10) || 0) + 1,
        );
      }
    };

    if (!root.dataset.astrolabeFrame) render(0);
    if (!active) return undefined;
    return subscribeSharedMapAnimation(root, render, {
      framesPerSecond: CELESTIAL_ECLIPSE_ASTROLABE_FPS,
    });
  }, [active, atlas?.fallbackSrc, atlas?.src]);

  return (
    <div
      aria-hidden="true"
      className="shooterMapCelestialRuntime"
      data-astrolabe-direction="forward"
      data-astrolabe-fps={CELESTIAL_ECLIPSE_ASTROLABE_FPS}
      data-astrolabe-frame-count={CELESTIAL_ECLIPSE_ASTROLABE_FRAME_COUNT}
      data-astrolabe-instance-count="1"
      ref={rootRef}
    >
      <div className="shooterMapCelestialAstrolabe">
        <canvas className="shooterMapCelestialAstrolabeCanvas" />
        <img
          alt=""
          className="shooterMapCelestialAstrolabeAtlasSource"
          data-map-asset-role="astrolabe-atlas"
          decoding="async"
          draggable="false"
          onError={(event) => applyMapImageFallback(event.currentTarget, atlas?.fallbackSrc)}
          onLoad={(event) => {
            markMapImageLoaded(event.currentTarget);
            const root = rootRef.current;
            const frame = Number.parseInt(root?.dataset.astrolabeFrame || "0", 10) || 0;
            drawAstrolabeFrame(root, event.currentTarget, frame);
          }}
          src={atlas?.src}
        />
      </div>
      <canvas
        aria-hidden="true"
        className="shooterMapCelestialAmbientCanvas"
        data-particle-count={STARS.length}
      />
    </div>
  );
}

export default memo(CelestialEclipseClocktowerField);
