import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { useLanguage } from "./../i18n/react.jsx";
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Play } from 'lucide-react';
import { previewMetronomeTone, stopMetronomePreview } from '../audio/metronomePreview.js';

export default function MetronomeSettingsPanel({ fields, renderOption }) {
  useLanguage();
  const [active, setActive] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [error, setError] = useState('');
  const root = useRef(null), popup = useRef(null), triggers = useRef({});
  const id = useId();
  const field = fields.find(item => item.id === active);
  const close = (focus = false) => { setActive(null); stopMetronomePreview(); if (focus) triggers.current[active]?.focus({ preventScroll: true }); };
  useLayoutEffect(() => {
    if (!field) return;
    const trigger = triggers.current[active];
    const position = () => {
      const rect = trigger.getBoundingClientRect();
      const view = window.visualViewport;
      const style = getComputedStyle(root.current);
      const safe = side => parseFloat(style.getPropertyValue(`--rhythm-safe-${side}`)) || 0;
      const app = root.current.closest('.app')?.getBoundingClientRect();
      const viewportLeft = view?.offsetLeft || 0;
      const viewportRight = viewportLeft + (view?.width || innerWidth);
      const leftEdge = Math.max(viewportLeft, app?.left ?? viewportLeft) + Math.max(16,safe('left'));
      const rightEdge = Math.min(viewportRight, app?.right ?? viewportRight) - Math.max(16,safe('right'));
      const topEdge = (view?.offsetTop || 0) + Math.max(16,safe('top'));
      let bottomEdge = (view?.offsetTop || 0) + (view?.height || innerHeight) - Math.max(10,safe('bottom'));
      const nav = document.querySelector('.integratedBottomNav');
      if (nav?.getClientRects().length) { const nr = nav.getBoundingClientRect(); if (nr.height && nr.top > rect.bottom) bottomEdge = Math.min(bottomEdge, nr.top - 10); }
      const width = Math.min(field.tone ? 360 : field.id === 'meter' ? 300 : 324, rightEdge - leftEdge);
      const left = Math.max(leftEdge, Math.min(rect.left + rect.width / 2 - width / 2, rightEdge - width));
      const above = Math.max(0, rect.top - topEdge - 10), below = Math.max(0, bottomEdge - rect.bottom - 10);
      const ideal = field.tone ? 256 : Math.ceil(field.options.length / 4) * 52 + 24;
      const up = above >= ideal || above >= below;
      const height = Math.max(0, Math.min(ideal, up ? above : below));
      const colors = {};
      for (const name of ['--theme-surface','--theme-bg-soft','--theme-text','--theme-text-muted','--theme-border-control','--theme-accent','--theme-accent-soft','--theme-text-inverse']) colors[name] = style.getPropertyValue(name);
      setPlacement({ ...colors, theme: root.current.closest('.theme-brand') ? 'brand' : 'light', left, width, maxHeight: height, [up ? 'bottom' : 'top']: up ? innerHeight - rect.top + 10 : rect.bottom + 10, '--tail-x': `${rect.left + rect.width / 2 - left}px`, up });
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(root.current);
    const outside = event => { if (!root.current?.contains(event.target) && !popup.current?.contains(event.target)) close(); };
    const escape = event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); } };
    const other = event => { if (event.detail !== id) close(); };
    const scroll = event => { if (!popup.current?.contains(event.target)) position(); };
    const raf = requestAnimationFrame(() => popup.current?.querySelector('[aria-pressed="true"],button:not(:disabled)')?.focus({preventScroll:true}));
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape, true);
    window.addEventListener('riffDropdownOpen', other);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', scroll, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => { observer.disconnect(); cancelAnimationFrame(raf); stopMetronomePreview(); document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape, true); window.removeEventListener('riffDropdownOpen', other); window.removeEventListener('resize', position); window.removeEventListener('scroll', scroll, true); window.visualViewport?.removeEventListener('resize', position); window.visualViewport?.removeEventListener('scroll', position); };
  }, [active, id]);
  const onKeys = event => {
    const buttons = [...popup.current.querySelectorAll('button:not(:disabled)')];
    const index = buttons.indexOf(document.activeElement);
    const delta = { ArrowRight:1, ArrowLeft:-1, ArrowDown:field.tone ? 2 : 4, ArrowUp:field.tone ? -2 : -4 }[event.key];
    if (delta || event.key === 'Home' || event.key === 'End') { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + delta + buttons.length) % buttons.length; buttons[next]?.focus({preventScroll:true}); buttons[next]?.scrollIntoView({block:'nearest'}); }
    if (event.key === 'Tab' && ((!event.shiftKey && index === buttons.length - 1) || (event.shiftKey && index === 0))) { event.preventDefault(); close(true); }
  };
  return <div className="rhythmSettings" ref={root}>
    {fields.map(item => {
      const option = item.options.find(o => String(o.id) === String(item.value));
      return <div className={`rhythmSetting rhythmSetting--${item.id}`} key={item.id}>
        <span className="rhythmSettingLabel">{item.dot && <i className={`metronomeSelectLabelDot metronomeSelectLabelDot--${item.dot}`} aria-hidden="true" />}{localizeUi(item.label)}</span>
        <button ref={el => triggers.current[item.id] = el} className="rhythmSettingTrigger" type="button" disabled={item.disabled} aria-label={localizeUi(item.ariaLabel || item.label)} aria-haspopup="dialog" aria-expanded={active === item.id} aria-controls={active === item.id ? id : undefined} onClick={() => { setError(''); if (active === item.id) close(); else { window.dispatchEvent(new CustomEvent('riffDropdownOpen',{detail:id})); setPlacement(null); setActive(item.id); } }}>
          <span>{renderOption(option, item.value)}</span><ChevronDown size={14} aria-hidden="true" />
        </button>
      </div>;
    })}
    {field && placement && createPortal(<div ref={popup} id={id} className={`rhythmSettingsPopup theme-${placement.theme} ${placement.up ? 'opens-up' : 'opens-down'}`} style={Object.fromEntries(Object.entries(placement).filter(([key]) => key !== 'up' && key !== 'theme'))} role="dialog" aria-label={localizeUi(translateUi("components.selectValue1", { value1: field.label }))} onKeyDown={onKeys}>
      <svg className="rhythmSettingsTail" width="24" height="10" viewBox="0 0 24 10" aria-hidden="true"><path d="M0 0 L12 9 L24 0" /></svg>
      <div className={`rhythmSettingsChoices ${field.tone ? 'tone-choices' : 'tile-choices'}`}>
        {field.options.map(option => { const selected = String(option.id) === String(field.value); return <div className={`rhythmSettingsChoice ${selected ? 'selected' : ''}`} key={option.id}>
          <button className="rhythmSettingsChoose" type="button" aria-pressed={selected} disabled={option.disabled} aria-label={localizeUi(option.longLabel || option.label)} onClick={() => { field.onChange(option.id); if (!field.tone) close(true); }}><span>{localizeUi(renderOption(option,option.label))}</span><Check size={14} aria-hidden="true" style={{visibility:selected?'visible':'hidden'}} /></button>
          {field.tone && <button className="rhythmSettingsPreview" type="button" disabled={option.disabled} aria-label={localizeUi(translateUi("components.previewValue1", { value1: option.label }))} onClick={() => { setError(''); previewMetronomeTone(option,field.dot !== 'weak').catch(() => setError(ko["components.couldnTLoadThePreviewAudioTapToTryAgain"])); }}><Play size={14} fill="currentColor" aria-hidden="true" /></button>}
        </div>; })}
      </div>
      {error && <span role="status">{localizeUi(error)}</span>}
    </div>, document.body)}
  </div>;
}
