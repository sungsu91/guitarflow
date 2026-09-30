import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight, Volume2, X } from 'lucide-react';
import { Translation, useLanguage } from '../i18n/react.jsx';
import { t } from '../i18n/core.js';
import './desktop-sound-settings.css';

export default function DesktopSoundSettings({ activeKey, children }) {
  useLanguage();
  const id = useId();
  const trigger = useRef(null);
  const panel = useRef(null);
  const [open, setOpen] = useState(false);

  const close = (restoreFocus = false) => {
    panel.current?.hidePopover();
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };

  // Keep the panel beside the rail, even when its button is near the bottom.
  useLayoutEffect(() => {
    if (!open) return;
    const popup = panel.current;
    const anchor = trigger.current;
    const rail = anchor.closest('.desktopSidebar');
    const nav = anchor.closest('.desktopSidebarNav');
    const position = () => {
      const viewport = window.visualViewport;
      const leftEdge = viewport?.offsetLeft || 0;
      const topEdge = viewport?.offsetTop || 0;
      const rightEdge = leftEdge + (viewport?.width || innerWidth);
      const bottomEdge = topEdge + (viewport?.height || innerHeight);
      const railRect = rail.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const left = railRect.right + 10;
      popup.style.width = `${Math.min(320, rightEdge - left - 12)}px`;
      popup.style.maxHeight = `${bottomEdge - topEdge - 24}px`;
      popup.style.left = `${left}px`;
      popup.style.top = `${Math.max(topEdge + 12, Math.min(anchorRect.top, bottomEdge - popup.getBoundingClientRect().height - 12))}px`;
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(popup);
    observer.observe(rail);
    nav.addEventListener('scroll', position);
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      observer.disconnect();
      nav.removeEventListener('scroll', position);
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [open]);

  useEffect(() => { panel.current?.hidePopover(); }, [activeKey]);

  return (
    <div className="desktopSidebarSettings desktopSoundSettings">
      <button
        ref={trigger}
        className="desktopSidebarNavItem desktopSoundSettingsTrigger"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        popoverTarget={id}
      >
        <span className="desktopSidebarIcon" aria-hidden="true"><Volume2 size={18} /></span>
        <span className="desktopSidebarLabel"><Translation id="app.soundRhythm" /></span>
        <ChevronRight className="desktopSidebarChevron" size={16} aria-hidden="true" />
      </button>
      <section
        ref={panel}
        id={id}
        popover="auto"
        className="desktopSoundSettingsPanel"
        role="dialog"
        aria-labelledby={`${id}-title`}
        onToggle={event => setOpen(event.newState === 'open')}
      >
        <header className="desktopSoundSettingsHeader">
          <Volume2 size={18} aria-hidden="true" />
          <strong id={`${id}-title`}><Translation id="app.soundRhythm" /></strong>
          <button className="desktopSoundSettingsClose" type="button" aria-label={t('common.close')} onClick={() => close(true)}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="desktopSoundSettingsBody">{children(close)}</div>
      </section>
    </div>
  );
}
