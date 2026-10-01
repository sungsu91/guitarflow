import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { localizeUi, t } from '../i18n/core.js';
import { useLanguage } from '../i18n/react.jsx';
import { getIsMobileLayout, MOBILE_LAYOUT_MEDIA_QUERY } from '../layouts/mobileLayout.js';
import { APP_LAUNCH_TIMINGS } from './appLaunch.js';
import { DesktopLayout, MobileLayout } from './SplashLayouts.jsx';

function subscribeLayout(listener) {
  const queries = [window.matchMedia(MOBILE_LAYOUT_MEDIA_QUERY), window.matchMedia('(pointer: coarse)')];
  queries.forEach(query => query.addEventListener('change', listener));
  return () => queries.forEach(query => query.removeEventListener('change', listener));
}

export default function SplashIntro({
  ariaLabel,
  exitMs = APP_LAUNCH_TIMINGS.exitMs,
  fallbackMs = APP_LAUNCH_TIMINGS.fallbackMs,
  minimumIntroMs = APP_LAUNCH_TIMINGS.minimumIntroMs,
  onComplete,
  progress = null,
  readySettleMs = APP_LAUNCH_TIMINGS.readySettleMs,
  readyPromise,
  statusText,
}) {
  useLanguage();
  const mobile = useSyncExternalStore(subscribeLayout, getIsMobileLayout, () => false);
  const [phase, setPhase] = useState('entering');
  const completedRef = useRef(false);
  const completeExit = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
  }, [onComplete]);
  const normalizedProgress = Number.isFinite(progress) ? Math.min(100, Math.max(0, Math.round(progress))) : null;

  useEffect(() => {
    let cancelled = false;
    let minimumTimerId, fallbackTimerId, readyTimerId;
    const minimum = minimumIntroMs > 0
      ? new Promise(resolve => { minimumTimerId = window.setTimeout(resolve, minimumIntroMs); })
      : Promise.resolve();
    const fallback = new Promise(resolve => {
      fallbackTimerId = window.setTimeout(() => resolve('fallback'), fallbackMs);
    });
    const appReady = Promise.resolve(readyPromise).then(() => 'ready', () => 'ready-error');
    Promise.all([minimum, Promise.race([appReady, fallback])]).then(([, result]) => {
      if (cancelled) return;
      window.clearTimeout(fallbackTimerId);
      if (result === 'fallback') console.warn('FRETIVA LAB launch fallback released the splash before the app-ready signal.');
      // Readiness controls the handoff; never wait for the four-second visual loop.
      if (readySettleMs > 0) {
        setPhase('ready');
        readyTimerId = window.setTimeout(() => setPhase('exiting'), readySettleMs);
      } else setPhase('exiting');
    });
    return () => {
      cancelled = true;
      window.clearTimeout(minimumTimerId);
      window.clearTimeout(fallbackTimerId);
      window.clearTimeout(readyTimerId);
    };
  }, [fallbackMs, minimumIntroMs, readyPromise, readySettleMs]);

  useEffect(() => {
    if (phase !== 'exiting') return undefined;
    // Release even if a browser cancels CSS animation or drops its end event.
    const timer = window.setTimeout(completeExit, exitMs + 100);
    return () => window.clearTimeout(timer);
  }, [completeExit, exitMs, phase]);

  const Layout = mobile ? MobileLayout : DesktopLayout;
  return (
    <section
      aria-label={ariaLabel ? localizeUi(ariaLabel) : t('launch.loadingFretivaLab')}
      aria-live="polite" className={`launchSplash launchSplash--${phase}`} role="status"
      onAnimationEnd={event => {
        if (phase === 'exiting' && event.target === event.currentTarget && event.animationName === 'launchBackdropOut') completeExit();
      }}
      style={{ '--launch-exit-ms': `${exitMs}ms` }}
    >
      <Layout progress={normalizedProgress} ready={phase !== 'entering'} statusText={statusText ? localizeUi(statusText) : t('launch.preparingMusic')} />
    </section>
  );
}
