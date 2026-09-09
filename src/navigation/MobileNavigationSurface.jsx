import { createPortal } from "react-dom";

// Keep portrait navigation outside the scaled game/tuner canvas. It retains
// the shared handlers and theme while using the same viewport pixels in every mode.
export default function MobileNavigationSurface({ children, detached, theme, viewportClassName, locked }) {
  if (!detached || typeof document === "undefined") return children;
  const host = document.querySelector(".appRuntime");
  if (!host) return children;
  return <>
    <section className="hud" aria-hidden="true" />
    {createPortal(
      <main
        className={`app notranslate theme-${theme} ${viewportClassName} mobileNavigationSurface`}
        role="presentation"
        inert={locked}
        aria-hidden={locked || undefined}
        translate="no"
      >
        {children}
      </main>,
      host,
    )}
  </>;
}
