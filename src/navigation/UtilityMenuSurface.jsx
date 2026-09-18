import { lockDocumentScroll, containModalTouch } from "../ui/modalScrollLock.js";
import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Menu chrome uses viewport pixels, independently of the game/tuner canvas.
export default function UtilityMenuSurface({ children, theme, onClose }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const previous = document.activeElement;
    const unlock = lockDocumentScroll();
    const panel = ref.current?.querySelector("#utility-menu-panel");
    const releaseTouch = panel ? containModalTouch(panel) : () => {};
    panel?.querySelector(".utilityMenuHeader button")?.focus({ preventScroll: true });
    const handleKey = event => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab" || !panel) return;
      const controls = [...panel.querySelectorAll('button:not(:disabled), a[href], summary, input:not(:disabled), [tabindex="0"]')]
        .filter(node => node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    panel?.addEventListener("keydown", handleKey);
    return () => {
      panel?.removeEventListener("keydown", handleKey);
      releaseTouch();
      unlock();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [onClose]);
  const host = typeof document === "undefined" ? null : document.querySelector(".appRuntime");
  if (!host) return children;
  return createPortal(<div ref={ref} className={`app theme-${theme} utilityMenuSurface`}>{children}</div>, host);
}
