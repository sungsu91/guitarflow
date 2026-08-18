import { useEffect, useState } from "react";

const DESKTOP_MIN_WIDTH = 1024;
const DESKTOP_LAYOUT_QUERY = `(min-width: ${DESKTOP_MIN_WIDTH}px) and (hover: hover) and (pointer: fine)`;
const MOBILE_USER_AGENT_PATTERN = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|BlackBerry|Opera Mini|IEMobile/i;

function getViewportWidth() {
  const widths = [
    window.innerWidth,
    document.documentElement?.clientWidth,
    window.visualViewport?.width,
  ].filter((width) => Number.isFinite(width) && width > 0);

  return widths.length > 0 ? Math.min(...widths) : 0;
}

function isLikelyMobileDevice() {
  const userAgent = window.navigator?.userAgent ?? "";
  const isIPadLike = /Macintosh/i.test(userAgent) && (window.navigator?.maxTouchPoints ?? 0) > 1;
  return MOBILE_USER_AGENT_PATTERN.test(userAgent) || isIPadLike;
}

function getIsDesktopLayout() {
  if (typeof window === "undefined") return false;
  if (getViewportWidth() < DESKTOP_MIN_WIDTH) return false;
  if (isLikelyMobileDevice()) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia(DESKTOP_LAYOUT_QUERY).matches;
}

export default function DesktopLayout({ children }) {
  const [isDesktopLayout, setIsDesktopLayout] = useState(getIsDesktopLayout);

  useEffect(() => {
    const mediaQuery = typeof window.matchMedia === "function"
      ? window.matchMedia(DESKTOP_LAYOUT_QUERY)
      : null;
    const syncDesktopLayout = () => setIsDesktopLayout(getIsDesktopLayout());

    syncDesktopLayout();
    window.addEventListener("resize", syncDesktopLayout);
    window.addEventListener("orientationchange", syncDesktopLayout);
    window.visualViewport?.addEventListener?.("resize", syncDesktopLayout);

    if (mediaQuery && typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncDesktopLayout);
    } else if (mediaQuery) {
      mediaQuery.addListener(syncDesktopLayout);
    }

    return () => {
      window.removeEventListener("resize", syncDesktopLayout);
      window.removeEventListener("orientationchange", syncDesktopLayout);
      window.visualViewport?.removeEventListener?.("resize", syncDesktopLayout);

      if (mediaQuery && typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", syncDesktopLayout);
      } else if (mediaQuery) {
        mediaQuery.removeListener(syncDesktopLayout);
      }
    };
  }, []);

  if (!isDesktopLayout) return children;

  return (
    <div className="desktopLayout">
      <section className="desktopWorkspace" aria-label="JUST PLAY workspace">
        <div className="desktopWorkspaceContent">
          {children}
        </div>
      </section>
    </div>
  );
}
