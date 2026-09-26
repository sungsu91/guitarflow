import { memo, useEffect, useRef, useState } from "react";
import { createPetAnimation, drawPetFrame, getPetReaction } from "./petAnimation.js";
import { getPetLayoutKey } from "./petPreferences.js";
import { usePetPreferences } from "./usePetPreferences.js";
import { usePetPlacement } from "./usePetPlacement.js";
import { useLanguage } from "../i18n/react.jsx";
import "./sprite-pets.css";

function MobilePetLayout({ children, horizontal }) {
  return <div className="shooterSpritePetLayer shooterSpritePetLayer--mobile" data-horizontal={horizontal}>{children}</div>;
}

function DesktopPetLayout({ children, horizontal }) {
  return <div className="shooterSpritePetLayer shooterSpritePetLayer--desktop" data-horizontal={horizontal}>{children}</div>;
}

function PetCanvas({ skin, active, playing, score, combo, hits, size, playbackSpeed, facing }) {
  const canvasRef = useRef(null);
  const [atlas, setAtlas] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const playerRef = useRef(null);
  if (!playerRef.current) playerRef.current = createPetAnimation(skin.actions);
  const previousRef = useRef({ score, combo, hits });

  useEffect(() => {
    let disposed = false;
    const image = new Image();
    image.decoding = "async";
    image.onload = async () => {
      // Safari may reject decode() for an already loaded image; onload is also a valid fallback.
      try { await image.decode?.(); } catch { /* dimensions below still validate the decoded source */ }
      if (disposed) return;
      if (image.naturalWidth !== skin.geometry.width || image.naturalHeight !== skin.geometry.height) {
        setLoadFailed(true);
        return;
      }
      setAtlas(image);
    };
    image.onerror = () => { if (!disposed) setLoadFailed(true); };
    image.src = skin.sheetSrc;
    return () => { disposed = true; image.onload = null; image.onerror = null; };
  }, [skin]);

  useEffect(() => {
    const current = { score, combo, hits };
    const previous = previousRef.current;
    const reset = score < previous.score || hits < previous.hits;
    if (reset) playerRef.current = createPetAnimation(skin.actions);
    if (playing && atlas && !reset) playerRef.current.react(getPetReaction(previous, current));
    previousRef.current = current;
  }, [score, combo, hits, playing, skin, atlas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!atlas || !context) return undefined;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;
    let lastAt = 0;
    let disposed = false;
    const paint = (delta = 0) => {
      const frame = playerRef.current.advance(delta * playbackSpeed);
      drawPetFrame(context, atlas, skin.geometry, frame, canvas.width, facing);
      canvas.dataset.action = frame.name;
      canvas.dataset.frame = String(frame.frame);
      canvas.dataset.fps = String(frame.fps * playbackSpeed);
      canvas.dataset.sourceFps = String(frame.fps);
      return frame.nextFrameMs / playbackSpeed;
    };
    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const delay = paint(now - lastAt);
      lastAt = now;
      timer = window.setTimeout(tick, Math.max(1, delay));
    };
    const sync = () => {
      window.clearTimeout(timer);
      const delay = paint();
      if (active && document.visibilityState !== "hidden" && !motion.matches) {
        lastAt = performance.now();
        timer = window.setTimeout(tick, Math.max(1, delay));
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pageshow", sync);
    motion.addEventListener("change", sync);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pageshow", sync);
      motion.removeEventListener("change", sync);
    };
  }, [atlas, active, skin, size, playbackSpeed, facing]);

  return <canvas ref={canvasRef} className="shooterSpritePetCanvas" width={size * 3} height={size * 3}
    style={{ width: size, height: size }} data-pet-skin={skin.id} aria-hidden="true"
    data-facing={facing} data-playback-speed={playbackSpeed}
    data-load-state={loadFailed ? "error" : atlas ? "ready" : "loading"} />;
}

function ShooterSpritePet({ skin, mobile, horizontal, ...props }) {
  const language = useLanguage();
  const [preferences, update] = usePetPreferences(skin.id);
  const rootRef = useRef(null), handleRef = useRef(null);
  const size = mobile ? 64 : 80;
  const layout = getPetLayoutKey(mobile, horizontal);
  const drag = usePetPlacement({ skinId: skin.id, rootRef, handleRef, size, mobile, horizontal,
    position: preferences.positions[layout],
    onPositionChange: position => update(current => ({ positions: { ...current.positions, [layout]: position } })),
  });
  const Layout = mobile ? MobilePetLayout : DesktopPetLayout;
  return <div className="shooterSpritePet" ref={rootRef}>
    <Layout horizontal={horizontal}>
      <button type="button" className="shooterSpritePetHandle" ref={handleRef} {...drag}
        aria-label={language === "en" ? `Move ${skin.label}` : `${skin.label} 위치 이동`}
        title={language === "en" ? "Drag or use arrow keys to move" : "드래그하거나 방향키로 위치를 조절하세요"}
        style={{ width: size, height: size }}>
        <PetCanvas key={skin.id} skin={skin} size={size} playbackSpeed={import.meta.env.DEV ? preferences.speed : 0.5} facing={import.meta.env.DEV ? preferences.facing : "left"} {...props} />
      </button>
    </Layout>
  </div>;
}

export default memo(ShooterSpritePet);
