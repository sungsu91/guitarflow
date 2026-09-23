import { useLanguage } from "./../i18n/react.jsx";
import { localizeUi } from "./../i18n/core.js";
import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './settings-popover.css';

let activeSettings = null;

// Shared anchoring and dismissal; each setting keeps its own platform UI.
export default function ShooterSettingsPopover({ anchor, mobile, label, className = '', compact = false, panelWidth, onClose, children }) {
  useLanguage();
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    if (!anchor || !panel.current) return;
    const node = panel.current;
    const previous = document.activeElement;
    // Opening from keyboard or a HUD that stops pointer bubbling must also
    // replace the previous settings panel.
    activeSettings?.dismiss();
    const owner = { dismiss: () => close.current() };
    activeSettings = owner;
    anchor.dataset.settingsOpen = 'true';
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const leftEdge = viewport?.offsetLeft ?? 0;
      const topEdge = viewport?.offsetTop ?? 0;
      const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth);
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight);
      const width = Math.min(panelWidth ?? (compact ? 148 : mobile ? 340 : 360), rightEdge - leftEdge - 16);
      const left = Math.max(leftEdge, Math.min(rect.left, rightEdge - width - 8));
      const top = rect.bottom - 1;
      node.style.width = `${width}px`;
      node.style.left = `${left}px`;
      node.style.top = `${top}px`;
      node.style.maxHeight = `${Math.max(80, bottomEdge - top - 8)}px`;
      node.style.setProperty('--settings-anchor-left', `${Math.max(0, rect.left - left)}px`);
      node.style.setProperty('--settings-anchor-width', `${Math.min(rect.right, left + width) - Math.max(rect.left, left)}px`);
      node.style.setProperty('--settings-anchor-height', `${rect.height}px`);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(anchor);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    node.querySelector('button')?.focus({ preventScroll: true });
    const outside = event => {
      if (!node.contains(event.target) && !anchor.contains(event.target)) close.current();
    };
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const buttons = [...node.querySelectorAll('button:not(:disabled)')];
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', key);
    return () => {
      if (activeSettings === owner) activeSettings = null;
      delete anchor.dataset.settingsOpen;
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', key);
      if (node.contains(document.activeElement) || document.activeElement === document.body) previous?.focus?.({ preventScroll: true });
    };
  }, [anchor, mobile, compact, panelWidth]);
  return createPortal(<section ref={panel} className={`shooterSettingsPopover ${mobile ? 'shooterSettingsPopover--mobile' : 'shooterSettingsPopover--desktop'} ${className}`} role="dialog" aria-label={localizeUi(label)}>
    <span className="shooterSettingsConnection" aria-hidden="true" />
    <div className="shooterSettingsPopoverContent">{children}</div>
  </section>, document.body);
}
