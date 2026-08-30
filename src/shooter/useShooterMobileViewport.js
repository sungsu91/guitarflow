import { useLayoutEffect, useState } from "react";
import { getShooterMobileViewportSnapshot } from "./mobileViewportFrame.js";

const ROOT_CLASS_NAME = "shooterCanonicalMobile";

function sameFrame(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;
  return ["height", "left", "scale", "top", "width"].every(
    (key) => Math.abs(left[key] - right[key]) < 0.001,
  );
}

export default function useShooterMobileViewport(active) {
  const [frame, setFrame] = useState(() => (
    active && typeof window !== "undefined"
      ? getShooterMobileViewportSnapshot(window)
      : null
  ));

  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;
    const root = window.document.documentElement;
    if (!active) {
      root.classList.remove(ROOT_CLASS_NAME);
      setFrame(null);
      return undefined;
    }

    root.classList.add(ROOT_CLASS_NAME);
    let animationFrame = 0;
    const update = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const nextFrame = getShooterMobileViewportSnapshot(window);
        setFrame((currentFrame) => (
          sameFrame(currentFrame, nextFrame) ? currentFrame : nextFrame
        ));
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener?.("resize", update);
    window.visualViewport?.addEventListener?.("scroll", update);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener?.("resize", update);
      window.visualViewport?.removeEventListener?.("scroll", update);
      root.classList.remove(ROOT_CLASS_NAME);
    };
  }, [active]);

  if (!active || !frame) return undefined;
  return {
    "--shooter-mobile-canvas-left": `${frame.left.toFixed(4)}px`,
    "--shooter-mobile-canvas-scale": frame.scale.toFixed(8),
    "--shooter-mobile-canvas-top": `${frame.top.toFixed(4)}px`,
  };
}

