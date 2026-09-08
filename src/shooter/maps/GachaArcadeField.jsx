import { useEffect, useRef } from "react";

import { subscribeSharedMapAnimation } from "./sharedSpriteClock.js";

function setSpriteFrame(element, frameIndex, columns, rows) {
  const column = frameIndex % columns;
  const row = Math.floor(frameIndex / columns) % rows;
  element.style.backgroundPosition = `${columns === 1 ? 0 : (column / (columns - 1)) * 100}% ${rows === 1 ? 0 : (row / (rows - 1)) * 100}%`;
  element.dataset.frameIndex = String(frameIndex);
}

function getGlassClipPath(sprite) {
  if (!sprite.glassClipPolygon) return undefined;
  return `polygon(${sprite.glassClipPolygon.map(({ x, y }) => (
    `${(x / sprite.placement.width) * 100}% ${(y / sprite.placement.height) * 100}%`
  )).join(", ")})`;
}

export default function GachaArcadeField({ active = true, runtimeAnimation }) {
  const fieldRef = useRef(null);
  const startedAtRef = useRef(null);
  const sprites = runtimeAnimation?.sprites ?? [];

  useEffect(() => {
    const field = fieldRef.current;
    if (!field || !active || sprites.length === 0) return undefined;
    startedAtRef.current = null;

    return subscribeSharedMapAnimation(field, (timestampMs) => {
      if (startedAtRef.current === null) startedAtRef.current = timestampMs;
      const elapsedMs = timestampMs - startedAtRef.current;
      field.querySelectorAll("[data-gacha-sprite-index]").forEach((element) => {
        const sprite = sprites[Number(element.dataset.gachaSpriteIndex)];
        if (!sprite) return;
        const phasedElapsedMs = elapsedMs + (sprite.phaseOffsetMs ?? 0);
        const frameIndex = Math.floor((phasedElapsedMs * sprite.framesPerSecond) / 1000) % sprite.frameCount;
        if (element.dataset.frameIndex !== String(frameIndex)) {
          setSpriteFrame(element, frameIndex, sprite.columns, sprite.rows);
          if (sprite.rotationTurns) {
            element.style.transform = `rotate(${(frameIndex / sprite.frameCount) * sprite.rotationTurns * 360}deg)`;
          }
        }
      });
    }, { framesPerSecond: runtimeAnimation.clockFramesPerSecond });
  }, [active, sprites]);

  return (
    <div
      aria-hidden="true"
      className="shooterMapGachaArcadeField"
      data-gacha-hitboxes="none"
      ref={fieldRef}
    >
      {sprites.map((sprite, index) => (
        <span
          className={`shooterMapGachaArcadeSprite shooterMapGachaArcadeSprite--${sprite.id}`}
          data-animation-phase-offset-ms={sprite.phaseOffsetMs ?? 0}
          data-frame-count={sprite.frameCount}
          data-frame-index="0"
          data-frames-per-second={sprite.framesPerSecond}
          data-gacha-sprite-index={index}
          data-scale-change={sprite.scaleChange ? "true" : "false"}
          key={sprite.id}
          style={{
            backgroundImage: `url(${sprite.src})`,
            backgroundPosition: "0% 0%",
            backgroundSize: `${sprite.columns * 100}% ${sprite.rows * 100}%`,
            clipPath: getGlassClipPath(sprite),
            height: `${(sprite.placement.height / runtimeAnimation.canvasHeight) * 100}%`,
            left: `${(sprite.placement.x / runtimeAnimation.canvasWidth) * 100}%`,
            top: `${(sprite.placement.y / runtimeAnimation.canvasHeight) * 100}%`,
            transformOrigin: sprite.rotationTurns ? "50% 50%" : undefined,
            width: `${(sprite.placement.width / runtimeAnimation.canvasWidth) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}
