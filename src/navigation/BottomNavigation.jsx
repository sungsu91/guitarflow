import { useLayoutEffect, useRef } from "react";

// Measure the unscaled app container, including when navigation is portalled.
export default function BottomNavigation({ children, className = "", ...props }) {
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
      const viewport = window.visualViewport;
      const bottom = viewport && viewport.scale === 1
        ? viewport.offsetTop + viewport.height
        : window.innerHeight;
      if (left === previousLeft && width === previousWidth && bottom === previousBottom) return;
      previousBottom = bottom;
      nav.style.setProperty("--bottom-nav-viewport-bottom", `${bottom}px`);
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
    window.visualViewport?.addEventListener("scroll", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("pageshow", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
    };
  }, []);
  return <div ref={ref} className={`modeSwitch integratedBottomNav ${className}`} aria-label="앱 하단 네비게이션" {...props}>{children}</div>;
}
