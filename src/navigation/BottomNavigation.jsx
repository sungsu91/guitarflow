import { t as translateUi } from "./../i18n/core.js";
import { useLanguage } from "./../i18n/react.jsx";
import { useLayoutEffect, useRef } from "react";
import { getMobileViewportBounds } from "../layouts/mobileViewportBounds.js";

// Measure the unscaled app container, including when navigation is portalled.
export default function BottomNavigation({ children, className = "", ...props }) {
  useLanguage();
  const ref = useRef(null);
  useLayoutEffect(() => {
    const nav = ref.current;
    const host = nav.closest(".appRuntime");
    if (!host) return;
    let previousLeft;
    let previousWidth;
    let previousBottom;
    const sync = () => {
      const { left, width } = host.getBoundingClientRect();
      const { bottom } = getMobileViewportBounds(window);
      if (left === previousLeft && width === previousWidth && bottom === previousBottom) return;
      previousLeft = left;
      previousWidth = width;
      previousBottom = bottom;
      nav.style.setProperty("--bottom-nav-left", `${left}px`);
      nav.style.setProperty("--bottom-nav-width", `${width}px`);
      nav.style.setProperty("--bottom-nav-viewport-bottom", `${bottom}px`);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(host);
    window.addEventListener("resize", sync);
    window.addEventListener("pageshow", sync);
    window.addEventListener("orientationchange", sync);
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("orientationchange", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
    };
  }, []);
  return <div ref={ref} data-navigation-layout="floating-bottom-v1" className={`modeSwitch integratedBottomNav ${className}`} aria-label={translateUi("navigation.appBottomNavigation")} {...props}>{children}</div>;
}
