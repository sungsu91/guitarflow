import { t as translateUi } from "../i18n/core.js";
import { createContext, useContext, useLayoutEffect, useState } from "react";
import { isLikelyMobileDevice } from "./mobileLayout.js";
import { getViewportProfile } from "./viewportProfile.js";
import TabletLayout from './TabletLayout.jsx';
import { getIsTabletLayout } from './tabletLayout.js';

const DESKTOP_MIN_WIDTH = 1024;
const DESKTOP_LAYOUT_QUERY = `(min-width: ${DESKTOP_MIN_WIDTH}px) and (hover: hover) and (pointer: fine)`;
const DesktopLayoutContext = createContext(false);

export function useDesktopLayout() {
  return useContext(DesktopLayoutContext);
}

function getViewportWidth() {
  return getViewportProfile(window).width;
}

function getIsDesktopLayout() {
  if (typeof window === "undefined") return false;
  if (getIsTabletLayout(window)) return false;
  if (getViewportWidth() < DESKTOP_MIN_WIDTH) return false;
  if (isLikelyMobileDevice(window.navigator)) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia(DESKTOP_LAYOUT_QUERY).matches;
}

export default function DesktopLayout({ children }) {
  const [isDesktopLayout, setIsDesktopLayout] = useState(getIsDesktopLayout);
  const [isTabletLayout, setIsTabletLayout] = useState(getIsTabletLayout);

  useLayoutEffect(() => {
    document.documentElement.dataset.rifflabLayout = isDesktopLayout ? "desktop" : "mobile";
    document.documentElement.dataset.rifflabDevice = isTabletLayout ? "tablet" : isDesktopLayout ? "desktop" : "mobile";
    return () => { delete document.documentElement.dataset.rifflabLayout; delete document.documentElement.dataset.rifflabDevice; };
  }, [isDesktopLayout, isTabletLayout]);

  useLayoutEffect(() => {
    const mediaQuery = typeof window.matchMedia === "function"
      ? window.matchMedia(DESKTOP_LAYOUT_QUERY)
      : null;
    const syncDesktopLayout = () => {
      setIsDesktopLayout(getIsDesktopLayout());
      setIsTabletLayout(getIsTabletLayout());
    };

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
    <DesktopLayoutContext.Provider value={isDesktopLayout}>
      <TabletLayout active={isTabletLayout}>
      <div className={`${isDesktopLayout ? "desktopLayout" : "mobileLayoutShell"}${isTabletLayout ? " tabletLayout" : ""}`}>
        <section
          className={isDesktopLayout ? "desktopWorkspace" : "mobileLayoutWorkspace"}
          aria-label={translateUi("originalUi.fretivaLabWorkspace")}
        >
          <div className={isDesktopLayout ? "desktopWorkspaceContent" : "mobileLayoutContent"}>
            {children}
          </div>
        </section>
      </div>
      </TabletLayout>
    </DesktopLayoutContext.Provider>
  );
}
