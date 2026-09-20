import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { lockDocumentScroll } from '../ui/modalScrollLock.js';
import { SHOOTER_PROGRESS_SPEEDS } from './progressionSettings.js';
import './progress-settings.css';

export default function ProgressSettings({ mobile, options, difficulty, speed, onDifficulty, onSpeed, onClose }) {
  const compactOptions = [...options.filter(option => !option.id.endsWith('-random')), ...options.filter(option => option.id.endsWith('-random'))];
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    const previous = document.activeElement;
    const unlock = lockDocumentScroll();
    panel.current?.querySelector('button')?.focus();
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const buttons = [...panel.current.querySelectorAll('button:not(:disabled)')];
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { unlock(); document.removeEventListener('keydown',key); previous?.focus?.(); };
  }, []);
  return createPortal(<div className={`shooterProgressBackdrop ${mobile ? 'shooterProgressBackdrop--mobile' : 'shooterProgressBackdrop--desktop'}`} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section ref={panel} className="shooterProgressSettings" role="dialog" aria-modal="true" aria-label="난이도와 진행 속도">
      <header><h2>연습 설정</h2><button type="button" onClick={onClose} aria-label="설정 닫기">×</button></header>
      <h3>난이도</h3>
      <div className="shooterProgressLevels">{compactOptions.map(option=><button type="button" key={option.id} title={option.hint} aria-pressed={difficulty===option.id} onClick={()=>onDifficulty(option.id)}><strong>{option.label}</strong></button>)}</div>
      <h3>하강 속도</h3>
      <div className="shooterProgressSpeeds">{SHOOTER_PROGRESS_SPEEDS.map(value=><button key={value} type="button" aria-pressed={speed===value} onClick={()=>onSpeed(value)}>{value}×</button>)}</div>
      <p>등장 간격은 그대로, 내려오는 속도만 조절해요.</p>
      <button className="shooterProgressDone" type="button" onClick={onClose}>설정 완료</button>
    </section>
  </div>, document.body);
}
