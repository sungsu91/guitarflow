import { lockDocumentScroll, containModalTouch } from "../ui/modalScrollLock.js";
import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Menu chrome uses viewport pixels, independently of the game/tuner canvas.
export default function UtilityMenuSurface({ children, theme, onClose, anchor }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const layer = ref.current?.querySelector('.utilityMenuLayer');
    const panel = layer?.querySelector('#utility-menu-panel');
    if (!panel) return;
    const syncPosition = () => {
      const bounds = layer.getBoundingClientRect();
      const viewport = window.visualViewport;
      const style = getComputedStyle(layer);
      const top = (viewport?.offsetTop ?? 0) - bounds.top + parseFloat(style.paddingTop);
      const bottom = (viewport ? viewport.offsetTop + viewport.height : window.innerHeight) - bounds.top - parseFloat(style.paddingBottom);
      const left = (viewport?.offsetLeft ?? 0) - bounds.left + parseFloat(style.paddingLeft);
      const right = (viewport ? viewport.offsetLeft + viewport.width : window.innerWidth) - bounds.left - parseFloat(style.paddingRight);
      const trigger = anchor?.isConnected && anchor.getClientRects().length ? anchor.getBoundingClientRect() : null;
      const toolbar = trigger && anchor.closest('.integratedBottomNav, .etudeRemote--tabletPanel')?.getBoundingClientRect();
      const above = !trigger || trigger.top - bounds.top - top >= bottom - (trigger.bottom - bounds.top);
      // Bottom navigation opens upward; header menus open below their trigger.
      // In both cases the opening tap stays outside every menu action.
      const edge = trigger ? (above ? (toolbar?.top ?? trigger.top) - bounds.top - 12 : trigger.bottom - bounds.top + 12) : bottom;
      const available = Math.max(0, above ? Math.min(edge, bottom) - top : bottom - Math.max(edge, top));
      const panelRight = Math.max(left + panel.getBoundingClientRect().width, Math.min(trigger ? trigger.right - bounds.left : right, right));
      layer.style.setProperty('--utility-menu-top', above ? 'auto' : `${Math.max(edge, top)}px`);
      layer.style.setProperty('--utility-menu-bottom', above ? `${bounds.height - Math.min(edge, bottom)}px` : 'auto');
      layer.style.setProperty('--utility-menu-right', `${bounds.width - panelRight}px`);
      layer.style.setProperty('--utility-menu-available-height', `${available}px`);
    };
    syncPosition();
    const observer = new ResizeObserver(syncPosition);
    observer.observe(layer);
    if (anchor?.isConnected) observer.observe(anchor);
    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);
    window.visualViewport?.addEventListener('resize', syncPosition);
    window.visualViewport?.addEventListener('scroll', syncPosition);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
      window.visualViewport?.removeEventListener('resize', syncPosition);
      window.visualViewport?.removeEventListener('scroll', syncPosition);
    };
  }, [anchor]);
  useLayoutEffect(() => {
    const previous = anchor ?? document.activeElement;
    const unlock = lockDocumentScroll();
    const panel = ref.current?.querySelector("#utility-menu-panel");
    const releaseTouch = panel ? containModalTouch(panel) : () => {};
    panel?.querySelector(".utilityMenuHeader button")?.focus({ preventScroll: true });
    const handleKey = event => {
      if (event.key === "Escape" && !panel?.querySelector('#utility-settings')) { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key !== "Tab" || !panel) return;
      const controls = [...panel.querySelectorAll('button:not(:disabled), a[href], summary, input:not(:disabled), [tabindex="0"]')]
        .filter(node => node.getClientRects().length && !node.closest('[inert]'));
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
  }, [onClose, anchor]);
  const host = typeof document === "undefined" ? null : document.querySelector(".appRuntime");
  if (!host) return children;
  return createPortal(<div ref={ref} className={`app theme-${theme} utilityMenuSurface`}>{children}</div>, host);
}
