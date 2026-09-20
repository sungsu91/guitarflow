import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { lockDocumentScroll } from '../ui/modalScrollLock.js';
import { SHOOTER_PROGRESS_SPEEDS } from './progressionSettings.js';
import './progress-settings.css';

export default function ProgressSettings({ mobile, options, difficulty, speed, onDifficulty, onSpeed, onClose }) {
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
      <header><div><small>연습 설정</small><h2>내 속도로 연주하기</h2></div><button type="button" onClick={onClose} aria-label="설정 닫기">×</button></header>
      <h3>난이도</h3>
      <div className="shooterProgressLevels">{options.map(option=><button type="button" key={option.id} aria-pressed={difficulty===option.id} onClick={()=>onDifficulty(option.id)}><strong>{option.label}</strong><small>{option.hint}</small></button>)}</div>
      <h3>진행 속도 <span>{speed}×</span></h3>
      <p>모든 난이도의 1×는 쉬움 랜덤과 같은 하강 속도예요.</p>
      <p>다음 음은 쉬움 → 보통 → 어려움 순으로 더 빠르게 이어져요.</p>
      <div className="shooterProgressSpeeds">{SHOOTER_PROGRESS_SPEEDS.map(value=><button key={value} type="button" aria-pressed={speed===value} onClick={()=>onSpeed(value)}>{value}×<small>{value<1?'천천히':value===1?'기본':value===1.25?'빠르게':'더 빠르게'}</small></button>)}</div>
      <p>음표 하강과 등장 간격에 적용됩니다. 연습 중에는 변경할 수 없어요.</p>
      <button className="shooterProgressDone" type="button" onClick={onClose}>설정 완료</button>
    </section>
  </div>, document.body);
}
