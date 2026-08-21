import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import AmbientCreature from "./AmbientCreature.jsx";
import MapAmbientEvents from "./FlyingDragonCrossing.jsx";
import {
  getCoastalChestFacingScaleX,
  getHermitCrabAnimationPhase,
  getHermitCrabFacingScaleX,
} from "./animationPhase.js";
import CoastalChestActor from "./events/CoastalChestActor.jsx";
import { assignRandomEventActorPlacements } from "./events/coastalChestState.js";
import {
  DEFAULT_PERSPECTIVE_CORNERS,
  getPerspectiveMatrix3d,
  normalizePerspectiveCorners,
} from "./freeTransform.js";
import { isLayeredShooterMap } from "./registry.js";
import { getLoopFrameIndex, subscribeSharedMapAnimation } from "./sharedSpriteClock.js";

const UNDERLAY_SLOTS = new Set([
  "background-environment",
  "midground-environment",
  "animated-environment",
]);

const OVERLAY_SLOTS = new Set([
  "foreground",
  "effect",
]);

const LAVA_GEYSER_PARTICLES = Object.freeze([
  Object.freeze({ left: 17, bottom: 7, size: 9, drift: -150, rise: 620, rate: 0.46 }),
  Object.freeze({ left: 31, bottom: 9, size: 6, drift: -80, rise: 840, rate: 0.38 }),
  Object.freeze({ left: 43, bottom: 8, size: 12, drift: -35, rise: 560, rate: 0.52 }),
  Object.freeze({ left: 55, bottom: 10, size: 7, drift: 60, rise: 760, rate: 0.41 }),
  Object.freeze({ left: 67, bottom: 7, size: 10, drift: 120, rise: 650, rate: 0.48 }),
  Object.freeze({ left: 78, bottom: 6, size: 5, drift: 180, rise: 900, rate: 0.36 }),
]);

const LAVA_POOL_BUBBLES = Object.freeze([
  Object.freeze({ left: 12, bottom: 24, size: 8, drift: -24, rise: 90, rate: 0.58 }),
  Object.freeze({ left: 27, bottom: 28, size: 12, drift: -12, rise: 65, rate: 0.72 }),
  Object.freeze({ left: 41, bottom: 22, size: 7, drift: 8, rise: 120, rate: 0.51 }),
  Object.freeze({ left: 54, bottom: 30, size: 14, drift: 14, rise: 72, rate: 0.78 }),
  Object.freeze({ left: 68, bottom: 23, size: 6, drift: 20, rise: 135, rate: 0.47 }),
  Object.freeze({ left: 80, bottom: 27, size: 10, drift: 30, rise: 86, rate: 0.64 }),
  Object.freeze({ left: 90, bottom: 21, size: 5, drift: 38, rise: 145, rate: 0.43 }),
]);

function getLayerPlacement(layer, layout) {
  return {
    ...(layer.placement ?? {}),
    ...(layer.layouts?.[layout] ?? {}),
  };
}

function getLayerStyle(layer, layout, referenceViewport) {
  const placement = getLayerPlacement(layer, layout);
  const referenceWidth = referenceViewport?.width || 390;
  const referenceHeight = referenceViewport?.height || 844;
  const normalized = layer.coordinateSpace === "normalized";
  const x = Number.isFinite(placement.x) ? placement.x : (normalized ? 0.5 : referenceWidth / 2);
  const y = Number.isFinite(placement.y) ? placement.y : (normalized ? 0.5 : referenceHeight / 2);
  const width = Number.isFinite(placement.width) ? placement.width : (normalized ? 1 : referenceWidth);
  const anchorX = Number.isFinite(placement.anchorX) ? placement.anchorX : 50;
  const anchorY = Number.isFinite(placement.anchorY) ? placement.anchorY : 50;
  const rotation = Number.isFinite(placement.rotation) ? placement.rotation : 0;
  const scale = Number.isFinite(placement.scale) ? placement.scale : 1;
  const animationSpeed = Number.isFinite(layer.animation?.speed) ? layer.animation.speed : 1;

  return {
    left: `${(normalized ? x : x / referenceWidth) * 100}%`,
    top: `${(normalized ? y : y / referenceHeight) * 100}%`,
    width: `${(normalized ? width : width / referenceWidth) * 100}%`,
    zIndex: Number.isFinite(layer.zIndex) ? layer.zIndex : undefined,
    "--shooter-map-anchor-x": `${-anchorX}%`,
    "--shooter-map-anchor-y": `${-anchorY}%`,
    "--shooter-map-rotation": `${rotation}deg`,
    "--shooter-map-scale": scale,
    "--shooter-map-animation-duration": `${Math.max(0.4, 6 / Math.max(0.1, animationSpeed))}s`,
  };
}

function getTransformSurfaceStyle(layer, layout) {
  const placement = getLayerPlacement(layer, layout);
  const configuredScaleX = Number.isFinite(placement.scaleX) ? placement.scaleX : 1;
  const animatedScaleX = getHermitCrabFacingScaleX({
    animation: layer.coordinateSpace === "normalized" ? layer.spriteSheet?.animation : "",
    scaleX: configuredScaleX,
    x: placement.x,
  });
  const scaleX = getCoastalChestFacingScaleX({
    eventType: layer.eventActor?.type,
    scaleX: animatedScaleX,
    x: placement.x,
  });
  const scaleY = Number.isFinite(placement.scaleY) ? placement.scaleY : 1;
  return {
    "--shooter-map-scale-x": scaleX,
    "--shooter-map-scale-y": scaleY,
    "--shooter-map-skew-x": `${Number.isFinite(placement.skewX) ? placement.skewX : 0}deg`,
    "--shooter-map-skew-y": `${Number.isFinite(placement.skewY) ? placement.skewY : 0}deg`,
    "--shooter-map-perspective": `${Number.isFinite(placement.perspective) ? placement.perspective : 900}px`,
    "--shooter-map-tilt-x": `${Number.isFinite(placement.tiltX) ? placement.tiltX : 0}deg`,
    "--shooter-map-tilt-y": `${Number.isFinite(placement.tiltY) ? placement.tiltY : 0}deg`,
  };
}

function PerspectiveSurface({ children, corners }) {
  const surfaceRef = useRef(null);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return undefined;
    const applyTransform = () => {
      surface.style.transform = getPerspectiveMatrix3d(
        corners,
        surface.offsetWidth,
        surface.offsetHeight,
      );
    };
    applyTransform();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(applyTransform);
    observer.observe(surface);
    return () => observer.disconnect();
  }, [corners]);

  return <span className="shooterMapPerspectiveSurface" ref={surfaceRef}>{children}</span>;
}

const CORNER_LABELS = Object.freeze([
  "왼쪽 위",
  "오른쪽 위",
  "오른쪽 아래",
  "왼쪽 아래",
]);

function FreeTransformSurface({ children, editMode, layer, layout, onAssetPointerDown, selected }) {
  const placement = getLayerPlacement(layer, layout);
  const corners = normalizePerspectiveCorners(
    placement.perspectiveCorners ?? DEFAULT_PERSPECTIVE_CORNERS,
  );
  const polygonPoints = corners.map((corner) => `${corner.x * 100},${corner.y * 100}`).join(" ");

  return (
    <span className="shooterMapTransformSurface" style={getTransformSurfaceStyle(layer, layout)}>
      <PerspectiveSurface corners={corners}>{children}</PerspectiveSurface>
      {editMode && selected ? (
        <>
          <svg aria-hidden="true" className="shooterMapPerspectiveOutline" preserveAspectRatio="none" viewBox="0 0 100 100">
            <polygon points={polygonPoints} />
          </svg>
          {corners.map((corner, index) => (
            <i
              aria-label={`${CORNER_LABELS[index]} 원근 변형 핸들`}
              className={`shooterMapEditHandle shooterMapPerspectiveHandle shooterMapPerspectiveHandle--${index}`}
              key={CORNER_LABELS[index]}
              onPointerDown={(event) => {
                event.stopPropagation();
                onAssetPointerDown?.(event, layer, `corner:${index}`);
              }}
              role="button"
              style={{ left: `${corner.x * 100}%`, top: `${corner.y * 100}%` }}
            />
          ))}
        </>
      ) : null}
    </span>
  );
}

function getVisualBounds(item) {
  const bounds = item?.visualBounds;
  if (!bounds) return null;
  const values = [
    bounds.sourceWidth,
    bounds.sourceHeight,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
  ].map(Number);
  if (values.some((value) => !Number.isFinite(value)) || values[0] <= 0 || values[1] <= 0 || values[4] <= 0 || values[5] <= 0) {
    return null;
  }
  return {
    sourceWidth: values[0],
    sourceHeight: values[1],
    x: values[2],
    y: values[3],
    width: values[4],
    height: values[5],
  };
}

function getCompositeItemStyle(item) {
  const speed = Number.isFinite(item.animation?.speed) ? item.animation.speed : 1;
  const bounds = getVisualBounds(item);
  const anchorX = Number.isFinite(item.anchorX) ? item.anchorX : 0.5;
  const anchorY = Number.isFinite(item.anchorY) ? item.anchorY : 0.5;
  const transformOriginX = Number.isFinite(item.transformOriginX) ? item.transformOriginX : 0.5;
  const transformOriginY = Number.isFinite(item.transformOriginY) ? item.transformOriginY : 0.5;
  const animationOriginX = Number.isFinite(item.animationOriginX) ? item.animationOriginX : transformOriginX;
  const animationOriginY = Number.isFinite(item.animationOriginY) ? item.animationOriginY : transformOriginY;
  return {
    left: `${(Number.isFinite(item.x) ? item.x : 0.5) * 100}%`,
    top: `${(Number.isFinite(item.y) ? item.y : 0.5) * 100}%`,
    width: `${(Number.isFinite(item.width) ? item.width : 0.4) * 100}%`,
    aspectRatio: bounds ? `${bounds.width} / ${bounds.height}` : (item.aspectRatio ?? 1),
    zIndex: Number.isFinite(item.zIndex) ? item.zIndex : 0,
    "--shooter-map-composite-anchor-x": `${anchorX * -100}%`,
    "--shooter-map-composite-anchor-y": `${anchorY * -100}%`,
    "--shooter-map-part-origin-x": `${transformOriginX * 100}%`,
    "--shooter-map-part-origin-y": `${transformOriginY * 100}%`,
    "--shooter-map-part-animation-origin-x": `${animationOriginX * 100}%`,
    "--shooter-map-part-animation-origin-y": `${animationOriginY * 100}%`,
    "--shooter-map-part-perspective": `${Number.isFinite(item.perspective) ? Math.max(1, item.perspective) : 1000}px`,
    "--shooter-map-part-tilt-x": `${Number.isFinite(item.tiltX) ? item.tiltX : 0}deg`,
    "--shooter-map-part-tilt-y": `${Number.isFinite(item.tiltY) ? item.tiltY : 0}deg`,
    "--shooter-map-part-rotation": `${Number.isFinite(item.rotation) ? item.rotation : 0}deg`,
    "--shooter-map-part-animation-duration": `${Math.max(0.4, 6 / Math.max(0.1, speed))}s`,
  };
}

function getVisualImageStyle(item) {
  const bounds = getVisualBounds(item);
  if (!bounds) return undefined;
  return {
    left: `${(-bounds.x / bounds.width) * 100}%`,
    top: `${(-bounds.y / bounds.height) * 100}%`,
    width: `${(bounds.sourceWidth / bounds.width) * 100}%`,
  };
}

function CompositeArtwork({ animation, item, src }) {
  return (
    <span className="shooterMapCompositeArtwork" data-animation={animation || undefined}>
      <span className="shooterMapCompositeArtworkClip">
        <img
          alt=""
          className="shooterMapCompositeArtworkImage"
          decoding="async"
          draggable="false"
          src={src}
          style={getVisualImageStyle(item)}
        />
      </span>
    </span>
  );
}

function CompositePart({ part }) {
  const splashEffect = part.effects?.find((effect) => effect === "splash" || effect?.type === "splash");
  const splash = typeof splashEffect === "object" ? splashEffect : {};
  return (
    <span
      aria-hidden="true"
      className="shooterMapCompositeItem shooterMapCompositePart"
      data-map-part={part.id}
      style={getCompositeItemStyle(part)}
    >
      <CompositeArtwork animation={part.animation?.type} item={part} src={part.src} />
      {splashEffect ? (
        <span
          className="shooterMapWaterSplash"
          style={{
            left: `${(Number.isFinite(splash.x) ? splash.x : 0.5) * 100}%`,
            top: `${(Number.isFinite(splash.y) ? splash.y : 0.9) * 100}%`,
            width: `${(Number.isFinite(splash.width) ? splash.width : 0.5) * 100}%`,
          }}
        >
          <i className="shooterMapWaterDroplet shooterMapWaterDroplet--one" />
          <i className="shooterMapWaterDroplet shooterMapWaterDroplet--two" />
          <i className="shooterMapWaterDroplet shooterMapWaterDroplet--three" />
          <b className="shooterMapWaterFoam" />
          <em className="shooterMapWaterRipple shooterMapWaterRipple--one" />
          <em className="shooterMapWaterRipple shooterMapWaterRipple--two" />
        </span>
      ) : null}
    </span>
  );
}

function CompositeLightEffect({ effect }) {
  if (!effect) return null;
  return (
    <span
      aria-hidden="true"
      className="shooterMapCompositeLight"
      style={{
        left: `${(Number.isFinite(effect.x) ? effect.x : 0.5) * 100}%`,
        top: `${(Number.isFinite(effect.y) ? effect.y : 0.5) * 100}%`,
        width: `${(Number.isFinite(effect.width) ? effect.width : 0.2) * 100}%`,
      }}
    />
  );
}

function CreatureAnchorOverlay({ layer, onAnchorPointerDown }) {
  const anchors = layer.creature?.settings?.anchors ?? [];
  return anchors.map((anchor, index) => (
    <button
      aria-label={anchor.kind === "water" ? "개구리 다이빙 입수 포인트" : `개구리 이동 포인트 ${index + 1}`}
      className={`shooterMapCreatureAnchor ${anchor.kind === "water" ? "shooterMapCreatureAnchor--water" : ""}`}
      key={anchor.id}
      onPointerDown={(event) => onAnchorPointerDown?.(event, layer, anchor.id)}
      style={{ left: `${anchor.x * 100}%`, top: `${anchor.y * 100}%` }}
      type="button"
    >
      <span>{String.fromCharCode(65 + index)}</span>
    </button>
  ));
}

function CompositeMapAsset({ composite, src }) {
  const body = composite.body ?? {};
  const lightEffect = body.effects?.find((effect) => effect?.type === "light-pulse");
  const parts = composite.parts ?? [];
  const rearParts = parts.filter((part) => (part.zIndex ?? 0) <= 0);
  const frontParts = parts.filter((part) => (part.zIndex ?? 0) > 0);

  return (
    <span
      className="shooterMapComposite"
      style={{ "--shooter-map-composite-aspect-ratio": composite.aspectRatio ?? 1 }}
    >
      {rearParts.map((part) => (
        <CompositePart key={part.id} part={part} />
      ))}
      <span
        aria-hidden="true"
        className="shooterMapCompositeItem shooterMapCompositeBody"
        style={getCompositeItemStyle(body)}
      >
        <CompositeArtwork item={body} src={src} />
        <CompositeLightEffect effect={lightEffect} />
      </span>
      {frontParts.map((part) => (
        <CompositePart key={part.id} part={part} />
      ))}
    </span>
  );
}

function getFrameEntry(entry) {
  return typeof entry === "string" ? { src: entry } : entry;
}

function getTimelineFrames(spriteFrames, sequence, { respectHold = false } = {}) {
  const authoredSequence = Array.isArray(sequence)
    ? sequence
      .map(Number)
      .filter((sourceIndex) => Number.isInteger(sourceIndex) && sourceIndex >= 0 && sourceIndex < spriteFrames.length)
    : [];
  if (authoredSequence.length > 0) {
    return authoredSequence.map((sourceIndex) => ({
      frameEntry: getFrameEntry(spriteFrames[sourceIndex]),
      sourceIndex,
    }));
  }
  if (!respectHold) {
    return spriteFrames.map((entry, sourceIndex) => ({
      frameEntry: getFrameEntry(entry),
      sourceIndex,
    }));
  }
  return spriteFrames.flatMap((entry, sourceIndex) => {
    const frameEntry = getFrameEntry(entry);
    const hold = Math.max(1, Math.round(Number(frameEntry.hold) || 1));
    return Array.from({ length: hold }, () => ({ frameEntry, sourceIndex }));
  });
}

function SharedSpriteFrameImage({
  active,
  className,
  editMode,
  frames,
  framesPerSecond,
  phaseOffsetSeconds = 0,
  playbackSpeed,
  previewFrame,
  transformFrame = false,
}) {
  const imageRef = useRef(null);
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const previewTimelineIndex = Math.max(0, frames.findIndex(({ sourceIndex }) => sourceIndex === previewFrame));
  const previewEntry = frames[previewTimelineIndex] ?? frames[0];
  const previewSrc = previewEntry?.frameEntry.src ?? "";
  const previewSourceIndex = previewEntry?.sourceIndex ?? 0;
  const previewTransform = transformFrame && previewEntry
    ? `translate(${Number(previewEntry.frameEntry.translateX) || 0}%, ${Number(previewEntry.frameEntry.translateY) || 0}%) scale(${Number(previewEntry.frameEntry.scale) || 1})`
    : "";
  const frameSignature = frames
    .map(({ frameEntry, sourceIndex }) => `${sourceIndex}:${frameEntry?.src ?? ""}:${frameEntry?.translateX ?? ""}:${frameEntry?.translateY ?? ""}:${frameEntry?.scale ?? ""}`)
    .join("|");

  useLayoutEffect(() => {
    const image = imageRef.current;
    if (!image || !previewSrc) return;
    image.src = previewSrc;
    image.dataset.spriteSrc = previewSrc;
    image.dataset.frameIndex = String(previewSourceIndex);
    if (transformFrame) image.style.transform = previewTransform;
  }, [previewSourceIndex, previewSrc, previewTransform, transformFrame]);

  useEffect(() => {
    const image = imageRef.current;
    const container = image?.parentElement;
    if (!image || !container || !active || editMode || frames.length <= 1) return undefined;
    let renderedTimelineIndex = -1;
    const renderFrame = (timestampMs) => {
      const timelineIndex = getLoopFrameIndex(
        timestampMs,
        frames.length,
        framesPerSecond,
        playbackSpeed,
        phaseOffsetSeconds,
      );
      if (timelineIndex === renderedTimelineIndex) return;
      renderedTimelineIndex = timelineIndex;
      const nextFrame = framesRef.current[timelineIndex];
      if (!nextFrame) return;
      if (image.dataset.spriteSrc !== nextFrame.frameEntry.src) {
        image.src = nextFrame.frameEntry.src;
        image.dataset.spriteSrc = nextFrame.frameEntry.src;
      }
      image.dataset.frameIndex = String(nextFrame.sourceIndex);
      if (transformFrame) {
        image.style.transform = `translate(${Number(nextFrame.frameEntry.translateX) || 0}%, ${Number(nextFrame.frameEntry.translateY) || 0}%) scale(${Number(nextFrame.frameEntry.scale) || 1})`;
      }
    };
    return subscribeSharedMapAnimation(container, renderFrame);
  }, [active, editMode, frameSignature, framesPerSecond, phaseOffsetSeconds, playbackSpeed, transformFrame]);

  if (!previewEntry) return null;
  return (
    <img
      alt=""
      className={`${className} shooterMapSpriteFrame--shared`}
      data-frame-index={previewEntry.sourceIndex}
      data-sprite-src={previewEntry.frameEntry.src}
      decoding="async"
      draggable="false"
      ref={imageRef}
      src={previewEntry.frameEntry.src}
    />
  );
}

function SpriteSheetMapAsset({ active = true, editMode = false, layer, layout }) {
  if (layer.eventActor?.readySrc) {
    return (
      <img
        alt=""
        className="shooterMapEventActorReady"
        decoding="async"
        draggable="false"
        src={layer.eventActor.readySrc}
      />
    );
  }

  const sheet = layer.spriteSheet ?? {};
  const columns = Math.max(1, Number(sheet.columns) || 1);
  const rows = Math.max(1, Number(sheet.rows) || 1);
  const frameCount = Math.max(1, Number(sheet.frameCount) || columns * rows);
  const frame = Math.abs(Number(sheet.previewFrame) || 0) % frameCount;
  const column = frame % columns;
  const row = Math.floor(frame / columns) % rows;
  const backgroundX = columns === 1 ? 0 : (column / (columns - 1)) * 100;
  const backgroundY = rows === 1 ? 0 : (row / (rows - 1)) * 100;
  const playbackType = sheet.animation;
  const playbackFps = Math.max(1, Number(sheet.framesPerSecond) || 10);
  const playbackSpeed = Number.isFinite(layer.animationSpeed)
    ? Math.max(0.1, layer.animationSpeed)
    : Number.isFinite(layer.animation?.speed)
      ? Math.max(0.1, layer.animation.speed)
    : 1;
  const spriteFrames = Array.isArray(sheet.frames)
    ? sheet.frames.filter((entry) => typeof entry === "string" || entry?.src)
    : [];
  const isLayeredWindFlag = playbackType === "wind-flag"
    && spriteFrames.length === 3
    && Boolean(sheet.staticSrc);
  const isWindFlag = playbackType === "wind-flag" && (
    isLayeredWindFlag || (columns === 3 && rows === 1 && frameCount === 3)
  );
  const playbackDuration = frameCount / (playbackFps * playbackSpeed);
  const isHermitCrabRoam = playbackType === "hermit-crab-roam"
    && spriteFrames.length >= 2;
  const isSharkSwim = playbackType === "shark-swim"
    && spriteFrames.length >= 2;
  const isNetFisherCast = playbackType === "net-fisher-cast"
    && spriteFrames.length === 10;
  const isMiniPoodleTilt = playbackType === "mini-poodle-tilt"
    && spriteFrames.length === 15;
  const isBorderCollieAcrobat = playbackType === "border-collie-acrobat"
    && spriteFrames.length === 22;
  const isBritishShorthairPlay = playbackType === "british-shorthair-play"
    && spriteFrames.length === 61;
  const isMunchkinPlay = playbackType === "munchkin-play"
    && spriteFrames.length === 49;
  const isGardenSwing = playbackType === "garden-swing"
    && spriteFrames.length === 10;
  const isParkFountainFlow = playbackType === "park-fountain-flow"
    && spriteFrames.length === 32
    && Boolean(sheet.staticSrc);

  if (isParkFountainFlow) {
    const loopDuration = spriteFrames.length / (playbackFps * playbackSpeed);
    const timelineFrames = getTimelineFrames(spriteFrames);
    return (
      <span
        aria-hidden="true"
        className="shooterMapSpriteSheetAsset shooterMapSpriteSheetAsset--park-fountain-flow"
        data-playback-type={playbackType}
        style={{ "--shooter-park-fountain-loop-duration": `${loopDuration}s` }}
      >
        <img
          alt=""
          className="shooterMapParkFountainBody"
          decoding="async"
          draggable="false"
          src={sheet.staticSrc}
        />
        <SharedSpriteFrameImage
          active={active}
          className="shooterMapParkFountainWaterFrame"
          editMode={editMode}
          frames={timelineFrames}
          framesPerSecond={playbackFps}
          playbackSpeed={playbackSpeed}
          previewFrame={frame}
        />
      </span>
    );
  }

  if (isGardenSwing) {
    const timelineFrames = getTimelineFrames(spriteFrames, sheet.sequence);
    const loopDuration = timelineFrames.length / (playbackFps * playbackSpeed);
    return (
      <span
        aria-hidden="true"
        className="shooterMapSpriteSheetAsset shooterMapSpriteSheetAsset--garden-swing"
        data-playback-type={playbackType}
        style={{ "--shooter-garden-swing-loop-duration": `${loopDuration}s` }}
      >
        <SharedSpriteFrameImage
          active={active}
          className="shooterMapGardenSwingFrame"
          editMode={editMode}
          frames={timelineFrames}
          framesPerSecond={playbackFps}
          playbackSpeed={playbackSpeed}
          previewFrame={frame}
        />
      </span>
    );
  }

  if (isBritishShorthairPlay || isMunchkinPlay) {
    const timelineFrames = getTimelineFrames(spriteFrames, sheet.sequence);
    const loopDuration = timelineFrames.length / (playbackFps * playbackSpeed);
    const wrapperModifier = isMunchkinPlay ? "munchkin-play" : "british-shorthair-play";
    const frameClassName = isMunchkinPlay
      ? "shooterMapMunchkinFrame"
      : "shooterMapBritishShorthairFrame";
    const durationVariable = isMunchkinPlay
      ? "--shooter-munchkin-loop-duration"
      : "--shooter-british-shorthair-loop-duration";
    return (
      <span
        aria-hidden="true"
        className={`shooterMapSpriteSheetAsset shooterMapSpriteSheetAsset--${wrapperModifier}`}
        data-playback-type={playbackType}
        style={{ [durationVariable]: `${loopDuration}s` }}
      >
        <SharedSpriteFrameImage
          active={active}
          className={frameClassName}
          editMode={editMode}
          frames={timelineFrames}
          framesPerSecond={playbackFps}
          playbackSpeed={playbackSpeed}
          previewFrame={frame}
        />
      </span>
    );
  }

  if (isBorderCollieAcrobat) {
    const timelineFrames = getTimelineFrames(spriteFrames, sheet.sequence, { respectHold: true });
    const loopDuration = timelineFrames.length / (playbackFps * playbackSpeed);
    return (
      <span
        aria-hidden="true"
        className="shooterMapSpriteSheetAsset shooterMapSpriteSheetAsset--border-collie-acrobat"
        style={{ "--shooter-border-collie-loop-duration": `${loopDuration}s` }}
      >
        <SharedSpriteFrameImage
          active={active}
          className="shooterMapBorderCollieAcrobatFrame"
          editMode={editMode}
          frames={timelineFrames}
          framesPerSecond={playbackFps}
          playbackSpeed={playbackSpeed}
          previewFrame={frame}
        />
      </span>
    );
  }

  if (isMiniPoodleTilt) {
    const loopDuration = spriteFrames.length / (playbackFps * playbackSpeed);
    const timelineFrames = getTimelineFrames(spriteFrames);
    return (
      <span
        aria-hidden="true"
        className="shooterMapSpriteSheetAsset shooterMapSpriteSheetAsset--mini-poodle"
        style={{ "--shooter-mini-poodle-loop-duration": `${loopDuration}s` }}
      >
        <SharedSpriteFrameImage
          active={active}
          className="shooterMapMiniPoodleFrame"
          editMode={editMode}
          frames={timelineFrames}
          framesPerSecond={playbackFps}
          playbackSpeed={playbackSpeed}
          previewFrame={frame}
        />
      </span>
    );
  }

  if (isHermitCrabRoam) {
    const placement = getLayerPlacement(layer, layout);
    const frameDuration = spriteFrames.length / (playbackFps * playbackSpeed);
    const roamDuration = Math.max(
      3,
      (Number(sheet.roamDurationSeconds) || 9.6) / playbackSpeed,
    );
    const animationPhase = getHermitCrabAnimationPhase({
      instanceId: layer.instanceId,
      x: placement.x,
      y: placement.y,
    });
    const timelineFrames = getTimelineFrames(spriteFrames);
    return (
      <span
        aria-hidden="true"
        className="shooterMapSpriteSheetAsset shooterMapSpriteSheetAsset--hermit-crab"
        data-animation-phase={animationPhase.toFixed(4)}
        style={{
          "--shooter-hermit-crab-frame-duration": `${frameDuration}s`,
          "--shooter-hermit-crab-roam-duration": `${roamDuration}s`,
          animationDelay: `${-(animationPhase * roamDuration)}s`,
        }}
      >
        <SharedSpriteFrameImage
          active={active}
          className="shooterMapHermitCrabFrame"
          editMode={editMode}
          frames={timelineFrames}
          framesPerSecond={playbackFps}
          phaseOffsetSeconds={animationPhase * frameDuration}
          playbackSpeed={playbackSpeed}
          previewFrame={frame}
        />
      </span>
    );
  }

  if (isSharkSwim) {
    const frameDuration = spriteFrames.length / (playbackFps * playbackSpeed);
    const timelineFrames = getTimelineFrames(spriteFrames);
    const roamDuration = Math.max(
      4,
      (Number(sheet.roamDurationSeconds) || 12.8) / playbackSpeed,
    );
    return (
      <span
        aria-hidden="true"
        className="shooterMapSpriteSheetAsset shooterMapSpriteSheetAsset--shark"
        style={{
          "--shooter-shark-frame-duration": `${frameDuration}s`,
          "--shooter-shark-roam-duration": `${roamDuration}s`,
        }}
      >
        <SharedSpriteFrameImage
          active={active}
          className="shooterMapSharkFrame"
          editMode={editMode}
          frames={timelineFrames}
          framesPerSecond={playbackFps}
          playbackSpeed={playbackSpeed}
          previewFrame={frame}
        />
      </span>
    );
  }

  if (isNetFisherCast) {
    const timelineFrames = getTimelineFrames(spriteFrames, null, { respectHold: true });
    const loopDuration = timelineFrames.length / (playbackFps * playbackSpeed);
    return (
      <span
        aria-hidden="true"
        className="shooterMapSpriteSheetAsset shooterMapSpriteSheetAsset--net-fisher"
        style={{ "--shooter-net-fisher-loop-duration": `${loopDuration}s` }}
      >
        <SharedSpriteFrameImage
          active={active}
          className="shooterMapNetFisherFrame"
          editMode={editMode}
          frames={timelineFrames}
          framesPerSecond={playbackFps}
          playbackSpeed={playbackSpeed}
          previewFrame={frame}
        />
      </span>
    );
  }

  if (isLayeredWindFlag) {
    const timelineFrames = getTimelineFrames(spriteFrames);
    return (
      <span
        aria-hidden="true"
        className="shooterMapSpriteSheetAsset shooterMapSpriteSheetAsset--wind-flag shooterMapSpriteSheetAsset--layered-wind-flag"
        style={{ "--shooter-map-sprite-duration": `${playbackDuration}s` }}
      >
        <SharedSpriteFrameImage
          active={active}
          className="shooterMapWindFlagClothFrame"
          editMode={editMode}
          frames={timelineFrames}
          framesPerSecond={playbackFps}
          playbackSpeed={playbackSpeed}
          previewFrame={frame}
          transformFrame
        />
        <img
          alt=""
          className="shooterMapWindFlagPole"
          decoding="async"
          draggable="false"
          src={sheet.staticSrc}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`shooterMapSpriteSheetAsset${isWindFlag ? " shooterMapSpriteSheetAsset--wind-flag" : ""}`}
      style={{
        backgroundImage: `url(${layer.src})`,
        backgroundPosition: `${backgroundX}% ${backgroundY}%`,
        backgroundSize: `${columns * 100}% ${rows * 100}%`,
        ...(isWindFlag ? {
          "--shooter-map-sprite-duration": `${playbackDuration}s`,
        } : {}),
      }}
    />
  );
}

function LavaEnvironmentAsset({ layer }) {
  const animationType = layer.animation?.type;
  if (animationType === "torch-flame") {
    const speed = Number.isFinite(layer.animation?.speed) ? Math.max(0.1, layer.animation.speed) : 1;
    const cycleDuration = Math.max(0.85, 5.4 / speed);
    return (
      <span
        className="shooterMapTorchFlame"
        style={{ "--shooter-torch-cycle-duration": `${cycleDuration}s` }}
      >
        <i aria-hidden="true" className="shooterMapTorchFlameGlow" />
        <img
          alt=""
          className="shooterMapTorchFlameArtwork"
          decoding="async"
          draggable="false"
          src={layer.src}
        />
      </span>
    );
  }
  if (animationType !== "lava-geyser" && animationType !== "lava-boil") {
    return <img alt="" decoding="async" draggable="false" src={layer.src} />;
  }

  const speed = Number.isFinite(layer.animation?.speed) ? Math.max(0.1, layer.animation.speed) : 1;
  const cycleDuration = Math.max(1.25, 6 / speed);
  const particles = animationType === "lava-geyser" ? LAVA_GEYSER_PARTICLES : LAVA_POOL_BUBBLES;
  const effectType = animationType === "lava-geyser" ? "geyser" : "boil";

  return (
    <span
      className={`shooterMapLavaEffect shooterMapLavaEffect--${effectType}`}
      style={{ "--shooter-lava-cycle-duration": `${cycleDuration}s` }}
    >
      <i aria-hidden="true" className="shooterMapLavaEffectBase" />
      <img
        alt=""
        className="shooterMapLavaEffectArtwork"
        decoding="async"
        draggable="false"
        src={layer.src}
      />
      <span aria-hidden="true" className="shooterMapLavaParticles">
        {particles.map((particle, index) => (
          <i
            className="shooterMapLavaParticle"
            key={`${effectType}-${particle.left}-${index}`}
            style={{
              "--shooter-lava-bottom": `${particle.bottom}%`,
              "--shooter-lava-delay": animationType === "lava-geyser"
                ? `${index * 0.045 * cycleDuration}s`
                : `${-(index * 0.23 * cycleDuration)}s`,
              "--shooter-lava-drift": `${particle.drift}%`,
              "--shooter-lava-duration": `${Math.max(0.72, cycleDuration * particle.rate)}s`,
              "--shooter-lava-left": `${particle.left}%`,
              "--shooter-lava-rise-42": `${particle.rise * -0.42}%`,
              "--shooter-lava-rise-54": `${particle.rise * -0.54}%`,
              "--shooter-lava-rise-72": `${particle.rise * -0.72}%`,
              "--shooter-lava-rise-90": `${particle.rise * -0.9}%`,
              "--shooter-lava-rise-full": `${particle.rise * -1}%`,
              "--shooter-lava-rise-over": `${particle.rise * -1.14}%`,
              "--shooter-lava-size": `${particle.size}%`,
            }}
          />
        ))}
      </span>
    </span>
  );
}

function MapSkinRenderer({
  ambientEventsActive = false,
  animationsActive = true,
  editMode = false,
  layout = "mobile",
  onAssetPointerDown,
  onAssetSelect,
  onCreatureAnchorPointerDown,
  onEventSound,
  onStagePointerDown,
  selectedAssetId = "",
  skin,
  stage = "underlay",
}) {
  const [eventHiddenLayerIds, setEventHiddenLayerIds] = useState(() => new Set());
  const runtimeEventPlacementsRef = useRef({ key: "", layers: [] });
  const handleEventOriginHiddenChange = useCallback((instanceId, hidden) => {
    if (!instanceId) return;
    setEventHiddenLayerIds((current) => {
      if (current.has(instanceId) === hidden) return current;
      const next = new Set(current);
      if (hidden) next.add(instanceId);
      else next.delete(instanceId);
      return next;
    });
  }, []);

  if (!isLayeredShooterMap(skin)) return null;

  const stageSlots = stage === "overlay" ? OVERLAY_SLOTS : UNDERLAY_SLOTS;
  const layers = (skin.layers ?? []).filter((layer) => stageSlots.has(layer.slot));
  const runtimeSpawnKey = `${skin.id}:${stage}:${layers.map((layer) => layer.instanceId).join("|")}`;
  if (!editMode && runtimeEventPlacementsRef.current.key !== runtimeSpawnKey) {
    runtimeEventPlacementsRef.current = {
      key: runtimeSpawnKey,
      layers: assignRandomEventActorPlacements(layers),
    };
  }
  const renderLayers = editMode ? layers : runtimeEventPlacementsRef.current.layers;
  const hasInteractiveActor = renderLayers.some(
    (layer) => layer.eventActor?.type === "coastal-chest",
  );
  const selectedCreatureLayer = editMode
    ? renderLayers.find((layer) => layer.instanceId === selectedAssetId && layer.creature)
    : null;
  if (stage === "overlay" && renderLayers.length === 0) return null;

  return (
    <div
      aria-hidden={editMode || hasInteractiveActor ? undefined : "true"}
      className={`shooterMapSkinStage shooterMapSkinStage--${stage} ${editMode ? "shooterMapSkinStage--editing" : ""}`}
      data-animations-active={animationsActive ? "true" : "false"}
      data-map-skin={skin.id}
      onPointerDown={editMode ? onStagePointerDown : undefined}
    >
      {stage === "underlay" && skin.background?.src ? (
        <img
          alt=""
          className="shooterMapSkinBackground"
          decoding="async"
          draggable="false"
          src={skin.background.src}
          style={{
            "--shooter-map-background-fit": skin.background.fit ?? "cover",
            "--shooter-map-background-position": skin.background.position ?? "center",
          }}
        />
      ) : null}

      {renderLayers.map((layer) => (
        <span
          aria-label={editMode ? `${layer.label} 배치 오브젝트` : undefined}
          className={`shooterMapSkinAsset shooterMapSkinAsset--${layer.slot} ${selectedAssetId === layer.instanceId ? "shooterMapSkinAsset--selected" : ""} ${eventHiddenLayerIds.has(layer.instanceId) ? "shooterMapSkinAsset--event-hidden" : ""} ${layer.eventActor ? "shooterMapSkinAsset--event-actor" : ""} ${layer.eventActor?.type === "coastal-chest" ? "shooterMapSkinAsset--interactive-event" : ""}`}
          data-animation={layer.composite ? undefined : layer.animation?.type || undefined}
          data-asset-id={layer.assetId}
          data-instance-id={layer.instanceId}
          key={layer.id}
          onPointerDown={editMode
            ? (event) => {
              if (event.target.closest?.(".shooterMapEditHandle")) return;
              onAssetPointerDown?.(event, layer, "drag");
            }
            : undefined}
          onClick={editMode
            ? (event) => {
              if (event.target.closest?.(".shooterMapEditHandle")) return;
              event.stopPropagation();
              onAssetSelect?.(layer.instanceId);
            }
            : undefined}
          onKeyDown={editMode
            ? (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              onAssetSelect?.(layer.instanceId);
            }
            : undefined}
          role={editMode ? "button" : undefined}
          style={getLayerStyle(layer, layout, skin.referenceViewport)}
          tabIndex={editMode ? 0 : undefined}
        >
          <FreeTransformSurface
            editMode={editMode}
            layer={layer}
            layout={layout}
            onAssetPointerDown={onAssetPointerDown}
            selected={selectedAssetId === layer.instanceId}
          >
            {layer.eventActor?.type === "coastal-chest" ? (
              <CoastalChestActor
                editMode={editMode}
                eventActor={layer.eventActor}
                instanceId={layer.instanceId}
                onSound={onEventSound}
              />
            ) : layer.composite ? (
              <CompositeMapAsset
                composite={layer.composite}
                src={layer.src}
              />
            ) : layer.creature ? (
              <AmbientCreature
                animationActive={animationsActive}
                creature={layer.creature}
                editMode={editMode}
                placement={layer.placement}
              />
            ) : layer.spriteSheet ? (
              <SpriteSheetMapAsset
                active={animationsActive}
                editMode={editMode}
                layer={layer}
                layout={layout}
              />
            ) : (
              <LavaEnvironmentAsset layer={layer} />
            )}
          </FreeTransformSurface>
          {editMode && selectedAssetId === layer.instanceId ? (
            <i
              aria-label="전체 크기 조절 핸들"
              className="shooterMapEditHandle shooterMapEditScaleHandle"
              onPointerDown={(event) => {
                event.stopPropagation();
                onAssetPointerDown?.(event, layer, "scale");
              }}
              role="button"
            />
          ) : null}
        </span>
      ))}
      {stage === "underlay" ? (
        <MapAmbientEvents
          active={ambientEventsActive && !editMode}
          events={skin.ambientEvents ?? []}
          layers={renderLayers}
          onOriginHiddenChange={handleEventOriginHiddenChange}
        />
      ) : null}
      {selectedCreatureLayer ? (
        <CreatureAnchorOverlay
          layer={selectedCreatureLayer}
          onAnchorPointerDown={onCreatureAnchorPointerDown}
        />
      ) : null}
    </div>
  );
}

export default memo(MapSkinRenderer);
