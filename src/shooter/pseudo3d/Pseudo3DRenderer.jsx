import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";

import {
  DEFAULT_PSEUDO3D_SETTINGS,
  normalizePseudo3DSettings,
  projectPseudo3DWorldPoint,
  wrapPseudo3DWorldZ,
} from "./projection.js";

const imageCache = new Map();

const CONTROL_GROUPS = Object.freeze([
  Object.freeze({ key: "horizon", label: "지평선 높이", min: 0.12, max: 0.45, step: 0.01 }),
  Object.freeze({ key: "cameraPitch", label: "카메라 기울기", min: -0.35, max: 0.5, step: 0.01 }),
  Object.freeze({ key: "perspectiveStrength", label: "원근감 강도", min: 0.45, max: 2.4, step: 0.01 }),
  Object.freeze({ key: "groundScale", label: "바닥 크기", min: 0.55, max: 1.8, step: 0.01 }),
  Object.freeze({ key: "groundScrollSpeed", label: "바닥 흐름 속도", min: 0, max: 0.8, step: 0.01 }),
  Object.freeze({ key: "nearSpriteScale", label: "가까운 오브젝트 크기", min: 0.65, max: 1.8, step: 0.01 }),
  Object.freeze({ key: "farSpriteScale", label: "먼 오브젝트 크기", min: 0.08, max: 0.65, step: 0.01 }),
  Object.freeze({ key: "spritePerspectiveStrength", label: "오브젝트 원근감", min: 0.45, max: 2.4, step: 0.01 }),
  Object.freeze({ key: "xSpreadStrength", label: "좌우 벌어짐", min: 0.45, max: 1.8, step: 0.01 }),
  Object.freeze({ key: "enemyApproachVisualSpeed", label: "적 접근 연출 속도", min: 0.4, max: 2.2, step: 0.01 }),
  Object.freeze({ key: "fov", label: "시야각 느낌", min: 0.65, max: 1.65, step: 0.01 }),
  Object.freeze({ key: "cameraHeight", label: "카메라 높이", min: 0.08, max: 0.5, step: 0.01 }),
  Object.freeze({ key: "nearClip", label: "근거리 기준", min: 0.01, max: 0.25, step: 0.01 }),
  Object.freeze({ key: "farDistance", label: "최대 표현 거리", min: 0.5, max: 2.5, step: 0.01 }),
  Object.freeze({ key: "groundTextureRepeat", label: "바닥 격자 반복", min: 6, max: 24, step: 1 }),
]);

function getCachedImage(src) {
  if (!src || typeof Image === "undefined") return null;
  if (imageCache.has(src)) return imageCache.get(src);
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  imageCache.set(src, image);
  return image;
}

function drawSky(context, width, height, settings) {
  const horizonY = settings.horizon * height;
  const sky = context.createLinearGradient(0, 0, 0, horizonY + height * 0.14);
  sky.addColorStop(0, "#071524");
  sky.addColorStop(0.48, "#1d4764");
  sky.addColorStop(1, "#efb46c");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, horizonY + 2);

  const glow = context.createRadialGradient(width * 0.5, horizonY, 0, width * 0.5, horizonY, width * 0.46);
  glow.addColorStop(0, "rgba(255, 228, 164, 0.55)");
  glow.addColorStop(0.3, "rgba(243, 172, 103, 0.17)");
  glow.addColorStop(1, "rgba(25, 64, 87, 0)");
  context.fillStyle = glow;
  context.fillRect(0, Math.max(0, horizonY - width * 0.4), width, width * 0.8);

  context.fillStyle = "rgba(255, 239, 193, 0.9)";
  context.beginPath();
  context.arc(width * 0.5, horizonY - Math.max(8, height * 0.018), Math.max(6, width * 0.025), 0, Math.PI * 2);
  context.fill();
}

function getGroundRowY(rowRatio, height, settings) {
  const horizonY = settings.horizon * height;
  const bottomY = height * 0.94;
  const exponent = 1.55 / settings.perspectiveStrength + settings.cameraPitch * 0.38;
  return horizonY + (bottomY - horizonY) * Math.pow(rowRatio, Math.max(0.65, exponent));
}

function getGroundHalfWidth(rowRatio, width, settings) {
  const farWidth = width * (0.025 + settings.cameraHeight * 0.06);
  const nearWidth = width * 0.72 * settings.groundScale / settings.fov;
  return farWidth + (nearWidth - farWidth) * Math.pow(rowRatio, 0.78);
}

function drawGround(context, width, height, settings, scrollPhase) {
  const horizonY = settings.horizon * height;
  const groundGradient = context.createLinearGradient(0, horizonY, 0, height);
  groundGradient.addColorStop(0, "#25352f");
  groundGradient.addColorStop(0.45, "#1a2a23");
  groundGradient.addColorStop(1, "#0c1513");
  context.fillStyle = groundGradient;
  context.fillRect(0, horizonY, width, height - horizonY);

  const repeat = settings.groundTextureRepeat;
  const columns = 8;
  for (let row = -1; row < repeat; row += 1) {
    const farRatio = Math.max(0, (row + scrollPhase) / repeat);
    const nearRatio = Math.min(1, (row + 1 + scrollPhase) / repeat);
    if (nearRatio <= 0 || farRatio >= 1) continue;
    const farY = getGroundRowY(farRatio, height, settings);
    const nearY = getGroundRowY(nearRatio, height, settings);
    const farHalf = getGroundHalfWidth(farRatio, width, settings);
    const nearHalf = getGroundHalfWidth(nearRatio, width, settings);
    for (let column = 0; column < columns; column += 1) {
      const x0 = column / columns * 2 - 1;
      const x1 = (column + 1) / columns * 2 - 1;
      context.beginPath();
      context.moveTo(width * 0.5 + x0 * farHalf, farY);
      context.lineTo(width * 0.5 + x1 * farHalf, farY);
      context.lineTo(width * 0.5 + x1 * nearHalf, nearY);
      context.lineTo(width * 0.5 + x0 * nearHalf, nearY);
      context.closePath();
      const checker = (row + column) % 2 === 0;
      context.fillStyle = checker ? "rgba(78, 135, 104, 0.19)" : "rgba(190, 157, 93, 0.08)";
      context.fill();
    }
  }

  context.strokeStyle = "rgba(155, 213, 175, 0.34)";
  context.lineWidth = Math.max(0.65, width / 760);
  for (let column = 0; column <= columns; column += 1) {
    const worldX = column / columns * 2 - 1;
    context.beginPath();
    context.moveTo(width * 0.5 + worldX * getGroundHalfWidth(0, width, settings), horizonY);
    context.lineTo(width * 0.5 + worldX * getGroundHalfWidth(1, width, settings), getGroundRowY(1, height, settings));
    context.stroke();
  }

  context.strokeStyle = "rgba(244, 210, 139, 0.42)";
  for (let row = 0; row <= repeat; row += 1) {
    const ratio = Math.min(1, (row + scrollPhase) / repeat);
    const y = getGroundRowY(ratio, height, settings);
    const halfWidth = getGroundHalfWidth(ratio, width, settings);
    context.beginPath();
    context.moveTo(width * 0.5 - halfWidth, y);
    context.lineTo(width * 0.5 + halfWidth, y);
    context.stroke();
  }

  const vignette = context.createLinearGradient(0, horizonY, 0, height);
  vignette.addColorStop(0, "rgba(4, 11, 12, 0.02)");
  vignette.addColorStop(1, "rgba(2, 7, 8, 0.38)");
  context.fillStyle = vignette;
  context.fillRect(0, horizonY, width, height - horizonY);
}

function drawDecorations(context, decorations, width, height, settings, travelled) {
  const movingDecorations = decorations.map((item) => {
    const worldZ = wrapPseudo3DWorldZ(item.worldZ - travelled, settings);
    return {
      ...item,
      image: getCachedImage(item.src),
      projection: projectPseudo3DWorldPoint({ worldX: item.worldX, worldZ }, settings, { width, height }),
    };
  }).sort((left, right) => left.projection.depth - right.projection.depth);

  movingDecorations.forEach((item) => {
    if (!item.image?.complete || !item.image.naturalWidth) return;
    const size = Math.max(5, item.baseSize * item.projection.scale);
    const aspect = item.image.naturalHeight / item.image.naturalWidth;
    const drawHeight = size * aspect;
    context.save();
    context.globalAlpha = item.opacity ?? Math.min(1, 0.48 + item.projection.depth * 0.52);
    context.shadowColor = "rgba(0, 0, 0, 0.42)";
    context.shadowBlur = Math.max(1, size * 0.08);
    context.drawImage(
      item.image,
      item.projection.screenX - size * 0.5,
      item.projection.screenY - drawHeight * 0.84,
      size,
      drawHeight,
    );
    context.restore();
  });
}

function Pseudo3DControlPanel({ defaults, onSettingsChange, settings }) {
  const [open, setOpen] = useState(() => typeof window !== "undefined" && window.innerWidth > 620);

  return (
    <aside className={`pseudo3dDevPanel ${open ? "is-open" : ""}`}>
      <button
        aria-expanded={open}
        className="pseudo3dDevPanelToggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <SlidersHorizontal aria-hidden="true" size={14} />
        <span>모드7 설정</span>
        <ChevronDown aria-hidden="true" size={13} />
      </button>
      {open ? (
        <div className="pseudo3dDevPanelBody">
          <div className="pseudo3dDevPanelHeading">
            <span><i />개발자 전용</span>
            <strong>실시간 원근 조정</strong>
          </div>
          <div className="pseudo3dDevControls">
            {CONTROL_GROUPS.map((control) => (
              <label className="pseudo3dDevControl" key={control.key}>
                <span>{control.label}<output>{Number(settings[control.key]).toFixed(control.step >= 1 ? 0 : 2)}</output></span>
                <input
                  aria-label={control.label}
                  max={control.max}
                  min={control.min}
                  onChange={(event) => onSettingsChange({
                    ...settings,
                    [control.key]: Number(event.target.value),
                  })}
                  step={control.step}
                  type="range"
                  value={settings[control.key]}
                />
              </label>
            ))}
          </div>
          <button
            className="pseudo3dResetButton"
            onClick={() => onSettingsChange(defaults)}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={13} />
            원근 설정 초기화
          </button>
        </div>
      ) : null}
    </aside>
  );
}

function Pseudo3DRenderer({
  active = true,
  developer = false,
  onSettingsChange,
  settings = DEFAULT_PSEUDO3D_SETTINGS,
  skin,
  stage = "underlay",
}) {
  const canvasRef = useRef(null);
  const settingsRef = useRef(normalizePseudo3DSettings(settings));
  const travelRef = useRef(0);
  const lastFrameRef = useRef(0);
  settingsRef.current = normalizePseudo3DSettings(settings);
  const defaults = useMemo(
    () => normalizePseudo3DSettings(skin?.pseudo3d ?? DEFAULT_PSEUDO3D_SETTINGS),
    [skin?.pseudo3d],
  );

  useEffect(() => {
    if (stage !== "underlay") return undefined;
    const canvas = canvasRef.current;
    const context = canvas?.getContext?.("2d", { alpha: false });
    if (!canvas || !context) return undefined;
    let frameId = 0;
    let stopped = false;

    const syncSize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
      const nextWidth = Math.max(1, Math.round(bounds.width * pixelRatio));
      const nextHeight = Math.max(1, Math.round(bounds.height * pixelRatio));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      return { width: nextWidth, height: nextHeight };
    };

    const renderFrame = (timestamp = performance.now()) => {
      if (stopped) return;
      const { width, height } = syncSize();
      const safeSettings = settingsRef.current;
      const elapsedSeconds = lastFrameRef.current > 0
        ? Math.min(0.05, (timestamp - lastFrameRef.current) / 1000)
        : 0;
      lastFrameRef.current = timestamp;
      if (active) {
        travelRef.current += elapsedSeconds * safeSettings.groundScrollSpeed * 0.42;
      }
      const scrollPhase = (travelRef.current * safeSettings.groundTextureRepeat * 1.8) % 1;
      context.clearRect(0, 0, width, height);
      drawSky(context, width, height, safeSettings);
      drawGround(context, width, height, safeSettings, scrollPhase);
      drawDecorations(
        context,
        skin?.decorations ?? [],
        width,
        height,
        safeSettings,
        travelRef.current,
      );
      if (active) frameId = window.requestAnimationFrame(renderFrame);
    };

    (skin?.decorations ?? []).forEach((item) => getCachedImage(item.src));
    renderFrame();
    const handleResize = () => {
      if (!active) renderFrame(performance.now());
    };
    window.addEventListener("resize", handleResize);
    return () => {
      stopped = true;
      lastFrameRef.current = 0;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [active, settings, skin?.decorations, stage]);

  if (stage !== "underlay") return null;

  return (
    <>
      <canvas aria-hidden="true" className="pseudo3dGroundCanvas" ref={canvasRef} />
      <div aria-hidden="true" className="pseudo3dHorizonLabel"><span>지평선</span></div>
      {developer && typeof onSettingsChange === "function" ? (
        <Pseudo3DControlPanel
          defaults={defaults}
          onSettingsChange={(next) => onSettingsChange(normalizePseudo3DSettings(next))}
          settings={settingsRef.current}
        />
      ) : null}
    </>
  );
}

export default memo(Pseudo3DRenderer);
