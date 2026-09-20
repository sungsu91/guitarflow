// Keep static practice screens awake too; playback and input are not required.
export function keepScreenAwake(doc = document, nav = navigator, win = window) {
  if (!nav.wakeLock?.request) return () => {};
  let disposed = false;
  let pending = false;
  let sentinel = null;
  let pageHidden = false;
  const visible = () => !disposed && !pageHidden && doc.visibilityState === 'visible';
  const release = () => {
    const current = sentinel;
    sentinel = null;
    if (current) void current.release().catch(() => {});
  };
  const acquire = async () => {
    if (!visible() || pending || (sentinel && !sentinel.released)) return;
    pending = true;
    try {
      const current = await nav.wakeLock.request('screen');
      if (!visible()) {
        await current.release();
        return;
      }
      sentinel = current;
      // Respect system revocation; retry on returning or user interaction,
      // never continuously fight a battery or manual-lock decision.
      current.addEventListener('release', () => {
        if (sentinel === current) sentinel = null;
      }, { once: true });
    } catch {
      // Unsupported contexts, power saving, and permission denial are nonfatal.
    } finally {
      pending = false;
    }
  };
  const visibility = () => visible() ? void acquire() : release();
  const hide = () => { pageHidden = true; release(); };
  const show = () => { pageHidden = false; void acquire(); };
  doc.addEventListener('visibilitychange', visibility);
  doc.addEventListener('pointerdown', acquire, { passive: true });
  doc.addEventListener('keydown', acquire);
  win.addEventListener('pagehide', hide);
  win.addEventListener('pageshow', show);
  void acquire();
  return () => {
    disposed = true;
    doc.removeEventListener('visibilitychange', visibility);
    doc.removeEventListener('pointerdown', acquire);
    doc.removeEventListener('keydown', acquire);
    win.removeEventListener('pagehide', hide);
    win.removeEventListener('pageshow', show);
    release();
  };
}
