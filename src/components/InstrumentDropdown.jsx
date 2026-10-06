import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createActivityPortal } from '../navigation/ActivityPortal.jsx';
import { Check, ChevronDown } from 'lucide-react';
import './instrument-dropdown.css';

function getMenuPlacement(anchor, optionCount, menuMinWidth) {
  const rect = anchor.getBoundingClientRect();
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const right = left + (viewport?.width ?? window.innerWidth);
  const bottom = top + (viewport?.height ?? window.innerHeight);
  if (rect.bottom <= top || rect.top >= bottom || rect.right <= left || rect.left >= right) return null;
  const width = Math.min(Math.max(rect.width, menuMinWidth), right - left - 16);
  const below = Math.max(0, bottom - rect.bottom - 14);
  const above = Math.max(0, rect.top - top - 14);
  const rowHeight = document.documentElement.dataset.rifflabDevice === 'desktop' ? 36 : 44;
  const down = below >= Math.min(optionCount * (rowHeight + 3) + 9, 320) || below >= above;
  // CSS sizes the menu naturally. Measuring its scrollHeight/offsetWidth after
  // writing styles forced repeated layouts of the entire fretboard catalog.
  return {
    width,
    left: Math.max(left + 8, Math.min(rect.left, right - width - 8)),
    top: down ? rect.bottom + 6 : rect.top - 6,
    maxHeight: Math.min(down ? below : above, 420),
    transform: down ? undefined : 'translateY(-100%)',
  };
}

// Selection belongs to the feature. This control only owns the open menu,
// keyboard navigation and viewport placement, shared by all three layouts.
export default function InstrumentDropdown({ label, value, options, onChange, disabled = false, title, variant = 'standard', menuMinWidth = 168 }) {
  const id = useId();
  const trigger = useRef(null);
  const menu = useRef(null);
  const firstFocus = useRef(null);
  const typeahead = useRef({ text: '', time: 0 });
  const restoreFocus = useRef(false);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState(null);
  const selected = options.find(option => String(option.id) === String(value));
  const close = (focusTrigger = true) => {
    restoreFocus.current = focusTrigger;
    setOpen(false);
  };
  const show = () => {
    const next = getMenuPlacement(trigger.current, options.length, menuMinWidth);
    if (!next) return;
    typeahead.current = { text: '', time: 0 };
    setPlacement(next);
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (disabled) setOpen(false);
    if (!open) {
      if (restoreFocus.current) trigger.current?.focus({ preventScroll: true });
      restoreFocus.current = false;
      return;
    }
    if (disabled || !menu.current) return;
    const node = menu.current;
    const anchor = trigger.current;
    let frame = 0;
    const place = event => {
      // Scrolling the options does not move their trigger.
      if (event?.target instanceof Node && node.contains(event.target)) return;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const next = getMenuPlacement(anchor, options.length, menuMinWidth);
        if (!next) { close(false); return; }
        setPlacement(previous => Object.keys(next).every(key => next[key] === previous?.[key]) ? previous : next);
      });
    };
    const choices = [...node.querySelectorAll('[role="option"]:not(:disabled)')];
    const choice = firstFocus.current === 'last' ? choices.at(-1)
      : firstFocus.current === 'first' ? choices[0]
        : choices.find(item => item.getAttribute('aria-selected') === 'true') ?? choices[0];
    choice?.focus({ preventScroll: true });
    choice?.scrollIntoView({ block: 'nearest' });
    firstFocus.current = null;
    const outside = event => {
      if (!node.contains(event.target) && !anchor.contains(event.target)) close(false);
    };
    const navigateAway = () => close(false);
    const observer = new ResizeObserver(place);
    observer.observe(anchor);
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('resize', place);
    window.addEventListener('hashchange', navigateAway);
    window.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    return () => {
      // React Activity preserves state when leaving a cached mode. A dropdown
      // is transient UI: it must not reopen when that mode becomes visible again.
      setOpen(false);
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('resize', place);
      window.removeEventListener('hashchange', navigateAway);
      window.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
    };
  }, [open, disabled, menuMinWidth, options.length]);

  const navigate = event => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key === 'Tab') {
      // The portal is at the end of body. Resume native tab order at the trigger
      // before the browser advances, without restoring focus after that move.
      close(false);
      trigger.current?.focus({ preventScroll: true });
      return;
    }
    const choices = [...menu.current.querySelectorAll('[role="option"]:not(:disabled)')];
    const index = choices.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = choices[(index + 1) % choices.length];
    else if (event.key === 'ArrowUp') next = choices[(index - 1 + choices.length) % choices.length];
    else if (event.key === 'Home') next = choices[0];
    else if (event.key === 'End') next = choices.at(-1);
    else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = performance.now();
      const text = `${now - typeahead.current.time < 600 ? typeahead.current.text : ''}${event.key}`.toLocaleLowerCase();
      typeahead.current = { text, time: now };
      next = choices.find(item => item.textContent.trim().toLocaleLowerCase().startsWith(text));
    }
    if (next) { event.preventDefault(); next.focus({ preventScroll: true }); next.scrollIntoView({ block: 'nearest' }); }
  };
  const dark = variant === 'shooter' || Boolean(trigger.current?.closest('.theme-brand'));
  return <>
    <button ref={trigger} type="button" className={`instrumentDropdownTrigger instrumentDropdownTrigger--${variant}`}
      aria-label={label} aria-describedby={`${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      data-value={value} disabled={disabled} title={title}
      onPointerDown={event => event.stopPropagation()}
      onClick={event => { event.stopPropagation(); if (open) close(); else show(); }}
      onKeyDown={event => {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault(); event.stopPropagation();
          firstFocus.current = event.key === 'Home' ? 'first' : event.key === 'End' ? 'last' : null;
          show();
        }
      }}>
      <span id={`${id}-value`} className="instrumentDropdownValue">{selected?.label ?? value}</span><ChevronDown aria-hidden="true" size={14} />
    </button>
    {open && !disabled ? createActivityPortal(
      <div ref={menu} id={id} role="listbox" aria-label={label} style={placement}
        className={`instrumentDropdownMenu instrumentDropdownMenu--${dark ? 'dark' : 'light'}`}
        onKeyDown={navigate} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
        {options.map(option => <button key={option.id} type="button" role="option" tabIndex={-1}
          className="instrumentDropdownOption" data-value={option.id} aria-label={option.ariaLabel}
          aria-selected={String(option.id) === String(value)} disabled={option.disabled}
          onClick={() => { if (String(option.id) !== String(value)) onChange(option.id); close(); }}>
          <span>{option.label}</span>{String(option.id) === String(value) ? <Check aria-hidden="true" size={16} /> : null}
        </button>)}
      </div>, document.body,
    ) : null}
  </>;
}
