import { memo, useLayoutEffect, useRef } from "react";

import AmbientCreature from "./AmbientCreature.jsx";
import {
  DEFAULT_PERSPECTIVE_CORNERS,
  getPerspectiveMatrix3d,
  normalizePerspectiveCorners,
} from "./freeTransform.js";
import { isLayeredShooterMap } from "./registry.js";

const UNDERLAY_SLOTS = new Set([
  "background-environment",
  "midground-environment",
  "animated-environment",
]);

const OVERLAY_SLOTS = new Set([
  "foreground",
  "effect",
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
  const scaleX = Number.isFinite(placement.scaleX) ? placement.scaleX : 1;
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

function MapSkinRenderer({
  editMode = false,
  layout = "mobile",
  onAssetPointerDown,
  onAssetSelect,
  onCreatureAnchorPointerDown,
  onStagePointerDown,
  selectedAssetId = "",
  skin,
  stage = "underlay",
}) {
  if (!isLayeredShooterMap(skin)) return null;

  const stageSlots = stage === "overlay" ? OVERLAY_SLOTS : UNDERLAY_SLOTS;
  const layers = (skin.layers ?? []).filter((layer) => stageSlots.has(layer.slot));
  const selectedCreatureLayer = editMode
    ? layers.find((layer) => layer.instanceId === selectedAssetId && layer.creature)
    : null;
  if (stage === "overlay" && layers.length === 0) return null;

  return (
    <div
      aria-hidden={editMode ? undefined : "true"}
      className={`shooterMapSkinStage shooterMapSkinStage--${stage} ${editMode ? "shooterMapSkinStage--editing" : ""}`}
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

      {layers.map((layer) => (
        <span
          aria-label={editMode ? `${layer.label} 배치 오브젝트` : undefined}
          className={`shooterMapSkinAsset shooterMapSkinAsset--${layer.slot} ${selectedAssetId === layer.instanceId ? "shooterMapSkinAsset--selected" : ""}`}
          data-animation={layer.composite ? undefined : layer.animation?.type || undefined}
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
            {layer.composite ? (
              <CompositeMapAsset
                composite={layer.composite}
                src={layer.src}
              />
            ) : layer.creature ? (
              <AmbientCreature creature={layer.creature} editMode={editMode} placement={layer.placement} />
            ) : (
              <img alt="" decoding="async" draggable="false" src={layer.src} />
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
