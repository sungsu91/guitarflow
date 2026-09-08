import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RotateCw } from 'lucide-react';
import './mobile-pull-to-refresh.css';

const THRESHOLD = 130;
const EXCLUDED = 'button,a,input,select,textarea,[role="slider"],[role="dialog"],[contenteditable="true"],.guitarPlayer,.shooterPetCompanion,.utilityMenuLayer,.helpGuideLayer';

export default function MobilePullToRefresh({ enabled }) {
  const [distance, setDistance] = useState(0);
  useEffect(() => {
    if (!enabled) { setDistance(0); return; }
    const main = document.querySelector('main.app.shooterMode,main.app.tunerMode');
    if (!main) return;
    const originalTranslate = main.style.translate;
    let gesture = null, frame = 0;
    const reset = () => {
      gesture = null;
      cancelAnimationFrame(frame);
      frame = 0;
      main.style.translate = originalTranslate;
      setDistance(0);
    };
    const start = event => {
      reset();
      const target = event.target;
      if (event.touches.length !== 1 || !(target instanceof Element) || !main.contains(target) || main.inert || target.closest(EXCLUDED)) return;
      // A scrollable panel must first reach its top; ordinary scrolling wins.
      for (let node = target; node && node !== main.parentElement; node = node.parentElement) {
        if (node.scrollTop > 0) return;
      }
      if (window.scrollY > 0) return;
      const touch = event.touches[0];
      gesture = { x: touch.clientX, y: touch.clientY, started: performance.now(), distance: 0 };
    };
    const move = event => {
      if (!gesture) return;
      if (event.touches.length !== 1) { reset(); return; }
      const touch = event.touches[0], dx = touch.clientX - gesture.x, dy = touch.clientY - gesture.y;
      if (Math.abs(dx) > Math.max(16, Math.abs(dy)) || dy < -8) { reset(); return; }
      if (dy < 12) return;
      event.preventDefault();
      gesture.distance = Math.min(200, dy);
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        if (!gesture) return;
        main.style.translate = `0 ${gesture.distance * .45}px`;
        setDistance(gesture.distance);
      });
    };
    const end = event => {
      const refresh = gesture && gesture.distance >= THRESHOLD && performance.now() - gesture.started >= 250;
      if (gesture?.distance >= 12 && event.cancelable) event.preventDefault();
      reset();
      if (refresh) window.location.reload();
    };
    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end, { passive: false });
    document.addEventListener('touchcancel', reset);
    window.addEventListener('pagehide', reset);
    return () => {
      reset();
      document.removeEventListener('touchstart', start);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', reset);
      window.removeEventListener('pagehide', reset);
    };
  }, [enabled]);
  if (!enabled || !distance) return null;
  return createPortal(<div className="mobilePullRefresh" role="status">
    <RotateCw size={20} style={{ transform: `rotate(${distance * 2}deg)` }} aria-hidden="true" />
    <span>{distance >= THRESHOLD ? '놓으면 새로고침' : '아래로 당겨 새로고침'}</span>
  </div>, document.body);
}
