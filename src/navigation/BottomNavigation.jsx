import { t as translateUi } from "./../i18n/core.js";
import { useLanguage } from "./../i18n/react.jsx";
import { useLayoutEffect, useRef } from "react";

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
    const sync = () => {
      const { left, width } = host.getBoundingClientRect();
      if (left === previousLeft && width === previousWidth) return;
      previousLeft = left;
      previousWidth = width;
      nav.style.setProperty("--bottom-nav-left", `${left}px`);
      nav.style.setProperty("--bottom-nav-width", `${width}px`);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(host);
    window.addEventListener("resize", sync);
    window.addEventListener("pageshow", sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("pageshow", sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, []);
  return <div ref={ref} data-navigation-layout="floating-bottom-v1" className={`modeSwitch integratedBottomNav ${className}`} aria-label={translateUi("navigation.appBottomNavigation")} {...props}>{children}</div>;
}
