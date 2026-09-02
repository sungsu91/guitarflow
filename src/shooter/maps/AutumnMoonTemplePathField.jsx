import { memo, useEffect, useRef } from "react";

import {
  getAutumnGroundGustDelay,
  getAutumnLoopFrame,
  getAutumnSpriteCell,
} from "./autumnMoonTempleAnimation.js";
import { subscribeSharedMapAnimation } from "./sharedSpriteClock.js";

const MAX_DEVICE_PIXEL_RATIO = 2;
const HIDDEN_RESUME_GAP_MS = 1000;

function createSheetRecord(source, onReady) {
  const record = {
    image: new Image(),
    loaded: false,
    released: false,
    sheetIndex: -1,
    source,
  };
  record.image.decoding = "async";
  record.image.onload = () => {
    const image = record.image;
    const markReady = () => {
      if (record.released || record.image !== image) return;
      record.loaded = true;
      onReady();
    };
    if (typeof image.decode !== "function") {
      markReady();
      return;
    }
    image.decode().then(markReady).catch(() => {
      if (image.complete && image.naturalWidth > 0) markReady();
    });
  };
  record.image.onerror = () => {
    record.loaded = false;
  };
  record.image.src = source;
  return record;
}

function releaseSheetRecord(record) {
  if (!record?.image) return;
  record.released = true;
  record.image.onload = null;
  record.image.onerror = null;
  record.image = null;
  record.source = "";
}

function prepareSheetRecord(sequence, sheetIndex, onReady) {
  const source = sequence.sheetSources[sheetIndex];
  const record = createSheetRecord(source, onReady);
  record.sheetIndex = sheetIndex;
  return record;
}

function ensureCurrentAndNextSheets(runtime, sheetIndex) {
  const { sequence } = runtime;
  const sheetCount = sequence.sheetSources.length;
  const desiredSheet = ((sheetIndex % sheetCount) + sheetCount) % sheetCount;
  const desiredNextSheet = (desiredSheet + 1) % sheetCount;

  if (runtime.current?.sheetIndex !== desiredSheet) {
    if (runtime.next?.sheetIndex === desiredSheet) {
      const previousCurrent = runtime.current;
      runtime.current = runtime.next;
      runtime.next = null;
      releaseSheetRecord(previousCurrent);
    } else {
      releaseSheetRecord(runtime.current);
      releaseSheetRecord(runtime.next);
      runtime.current = prepareSheetRecord(sequence, desiredSheet, runtime.requestRedraw);
      runtime.next = null;
    }
  }

  if (runtime.next?.sheetIndex !== desiredNextSheet) {
    releaseSheetRecord(runtime.next);
    runtime.next = prepareSheetRecord(sequence, desiredNextSheet, runtime.requestRedraw);
  }
}

function resizeCanvas(canvas, root) {
  const pixelRatio = Math.min(
    MAX_DEVICE_PIXEL_RATIO,
    Math.max(1, Number(window.devicePixelRatio) || 1),
  );
  const width = Math.max(1, Math.round(root.clientWidth * pixelRatio));
  const height = Math.max(1, Math.round(root.clientHeight * pixelRatio));
  if (canvas.width === width && canvas.height === height) return false;
  canvas.width = width;
  canvas.height = height;
  return true;
}

function clearRuntimeCanvas(runtime) {
  if (runtime.lastDrawnFrame === -1) return;
  runtime.context.clearRect(0, 0, runtime.canvas.width, runtime.canvas.height);
  runtime.lastDrawnFrame = -1;
}

function markGroundGustActive(runtime, active) {
  const value = active ? "true" : "false";
  if (runtime.canvas.dataset.autumnGustActive !== value) {
    runtime.canvas.dataset.autumnGustActive = value;
  }
}

function drawSequenceFrame(runtime, frameIndex, referenceHeight) {
  const frame = getAutumnSpriteCell(frameIndex, runtime.sequence);
  ensureCurrentAndNextSheets(runtime, frame.sheetIndex);
  if (!runtime.current?.loaded || !runtime.current.image) return;
  if (runtime.lastDrawnFrame === frame.frame) return;

  const { canvas, context, sequence } = runtime;
  const sourceX = frame.column * sequence.cellWidth;
  const sourceY = frame.row * sequence.cellHeight;
  const destinationX = (sequence.x ?? 0) / 768 * canvas.width;
  const destinationY = (sequence.y ?? 0) / referenceHeight * canvas.height;
  const destinationWidth = sequence.renderWidth / 768 * canvas.width;
  const destinationHeight = sequence.renderHeight / referenceHeight * canvas.height;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    runtime.current.image,
    sourceX,
    sourceY,
    sequence.cellWidth,
    sequence.cellHeight,
    destinationX,
    destinationY,
    destinationWidth,
    destinationHeight,
  );
  runtime.lastDrawnFrame = frame.frame;
}

function AutumnMoonTemplePathField({ active = true, runtimeAnimation, stage = "underlay" }) {
  const rootRef = useRef(null);
  const activeElapsedRef = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    const sequences = stage === "overlay"
      ? runtimeAnimation?.overlaySequences
      : runtimeAnimation?.underlaySequences;
    if (!root || !sequences?.length || typeof Image === "undefined") return undefined;

    let disposed = false;
    let redrawQueued = false;
    let activeElapsedMs = activeElapsedRef.current;
    let lastTimestampMs = null;
    let renderFrame = () => {};

    const requestRedraw = () => {
      if (disposed || redrawQueued) return;
      redrawQueued = true;
      Promise.resolve().then(() => {
        redrawQueued = false;
        if (!disposed) renderFrame(activeElapsedMs);
      });
    };

    const runtimes = sequences.flatMap((sequence) => {
      const canvas = root.querySelector(`[data-autumn-layer="${sequence.id}"]`);
      const context = canvas?.getContext("2d", { alpha: true });
      if (!canvas || !context) return [];
      return [{
        canvas,
        context,
        current: null,
        gustStartedAt: null,
        lastDrawnFrame: -2,
        next: null,
        nextGustAt: activeElapsedMs + getAutumnGroundGustDelay(sequence.randomDelayMs),
        requestRedraw,
        sequence,
      }];
    });

    const resizeAllCanvases = () => {
      runtimes.forEach((runtime) => {
        if (resizeCanvas(runtime.canvas, root)) runtime.lastDrawnFrame = -2;
      });
    };

    const drawGroundGust = (runtime, elapsedMs) => {
      const { sequence } = runtime;
      ensureCurrentAndNextSheets(runtime, 0);
      if (runtime.gustStartedAt === null) {
        if (elapsedMs < runtime.nextGustAt || !active) {
          markGroundGustActive(runtime, false);
          clearRuntimeCanvas(runtime);
          return;
        }
        runtime.gustStartedAt = elapsedMs;
        markGroundGustActive(runtime, true);
      }

      const elapsedFrames = Math.floor(
        (elapsedMs - runtime.gustStartedAt) * sequence.framesPerSecond / 1000,
      );
      if (elapsedFrames >= sequence.frameCount) {
        runtime.gustStartedAt = null;
        runtime.nextGustAt = elapsedMs + getAutumnGroundGustDelay(sequence.randomDelayMs);
        markGroundGustActive(runtime, false);
        clearRuntimeCanvas(runtime);
        return;
      }
      drawSequenceFrame(runtime, elapsedFrames, runtimeAnimation.referenceHeight);
    };

    renderFrame = (elapsedMs) => {
      runtimes.forEach((runtime) => {
        if (runtime.sequence.loop === false) {
          drawGroundGust(runtime, elapsedMs);
          return;
        }
        drawSequenceFrame(
          runtime,
          getAutumnLoopFrame(elapsedMs, runtime.sequence),
          runtimeAnimation.referenceHeight,
        );
      });
    };

    resizeAllCanvases();
    renderFrame(activeElapsedMs);

    const resizeObserver = typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
        resizeAllCanvases();
        renderFrame(activeElapsedMs);
      })
      : null;
    resizeObserver?.observe(root);

    const unsubscribe = active
      ? subscribeSharedMapAnimation(root, (timestampMs) => {
        if (lastTimestampMs === null) {
          lastTimestampMs = timestampMs;
        } else {
          const deltaMs = timestampMs - lastTimestampMs;
          lastTimestampMs = timestampMs;
          if (deltaMs > 0 && deltaMs < HIDDEN_RESUME_GAP_MS) activeElapsedMs += deltaMs;
        }
        activeElapsedRef.current = activeElapsedMs;
        renderFrame(activeElapsedMs);
      }, { framesPerSecond: 16 })
      : () => {};

    return () => {
      disposed = true;
      activeElapsedRef.current = activeElapsedMs;
      unsubscribe();
      resizeObserver?.disconnect();
      runtimes.forEach((runtime) => {
        releaseSheetRecord(runtime.current);
        releaseSheetRecord(runtime.next);
        runtime.current = null;
        runtime.next = null;
      });
    };
  }, [active, runtimeAnimation, stage]);

  const sequences = stage === "overlay"
    ? runtimeAnimation?.overlaySequences
    : runtimeAnimation?.underlaySequences;

  return (
    <div
      className={`shooterMapAutumnRuntime shooterMapAutumnRuntime--${stage}`}
      data-autumn-runtime-stage={stage}
      ref={rootRef}
    >
      {(sequences ?? []).map((sequence) => (
        <canvas
          aria-hidden="true"
          className={`shooterMapAutumnCanvas shooterMapAutumnCanvas--${sequence.id}`}
          data-autumn-layer={sequence.id}
          key={sequence.id}
        />
      ))}
    </div>
  );
}

export default memo(AutumnMoonTemplePathField);
