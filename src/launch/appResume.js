export const APP_RESUME_AFTER_MS = 30_000;

// An installed iOS app can restore its existing document instead of mounting
// React again. Brief interruptions (including permission sheets) are excluded.
export function observeAppResume({ targetWindow = window, onResume, now = Date.now } = {}) {
  const doc = targetWindow.document;
  const standalone = targetWindow.navigator?.standalone === true
    || targetWindow.matchMedia?.('(display-mode: standalone)').matches;
  if (!standalone) return () => {};
  let hiddenAt = doc.hidden ? now() : null;
  let pendingRestore = false;
  const resume = () => {
    if (doc.hidden) return;
    const shouldResume = pendingRestore || (hiddenAt !== null && now() - hiddenAt >= APP_RESUME_AFTER_MS);
    pendingRestore = false;
    hiddenAt = null;
    if (shouldResume) onResume();
  };
  const visibility = () => {
    if (doc.hidden) hiddenAt ??= now();
    else resume();
  };
  const pageHide = () => { hiddenAt ??= now(); };
  const pageShow = event => {
    if (!event.persisted) return;
    pendingRestore = true;
    resume();
  };
  doc.addEventListener('visibilitychange', visibility);
  targetWindow.addEventListener('pagehide', pageHide);
  targetWindow.addEventListener('pageshow', pageShow);
  return () => {
    doc.removeEventListener('visibilitychange', visibility);
    targetWindow.removeEventListener('pagehide', pageHide);
    targetWindow.removeEventListener('pageshow', pageShow);
  };
}
