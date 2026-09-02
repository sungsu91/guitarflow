import { useLayoutEffect, useState } from "react";
import { isLikelyMobileDevice } from "./mobileLayout.js";
import { getViewportProfile } from "./viewportProfile.js";

const DESKTOP_MIN_WIDTH = 1024;
const DESKTOP_LAYOUT_QUERY = `(min-width: ${DESKTOP_MIN_WIDTH}px) and (hover: hover) and (pointer: fine)`;

function getViewportWidth() {
  return getViewportProfile(window).width;
}

function getIsDesktopLayout() {
  if (typeof window === "undefined") return false;
  if (getViewportWidth() < DESKTOP_MIN_WIDTH) return false;
  if (isLikelyMobileDevice(window.navigator)) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia(DESKTOP_LAYOUT_QUERY).matches;
}

export default function DesktopLayout({ children }) {
  const [isDesktopLayout, setIsDesktopLayout] = useState(getIsDesktopLayout);

  useLayoutEffect(() => {
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

  return (
    <div className={isDesktopLayout ? "desktopLayout" : "mobileLayoutShell"}>
      <section
        className={isDesktopLayout ? "desktopWorkspace" : "mobileLayoutWorkspace"}
        aria-label="FRETIVA LAB workspace"
      >
        <div className={isDesktopLayout ? "desktopWorkspaceContent" : "mobileLayoutContent"}>
          {children}
        </div>
      </section>
    </div>
  );
}
