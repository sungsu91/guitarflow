// The background has its own media clock; it never drives game timing or audio.
export function connectAmbientVideoPlayback(video, {
  paused = false,
  documentObject = video.ownerDocument,
  onReady = () => {},
  onFailure = () => {},
} = {}) {
  let disposed = false;
  let failed = false;
  let playPending = false;
  let visible = true;
  const allowed = () => !disposed && !failed && !paused && visible && !documentObject.hidden;
  const fail = () => {
    if (disposed || failed) return;
    failed = true;
    video.pause();
    onFailure();
  };
  const sync = () => {
    if (!allowed()) {
      video.pause();
      return;
    }
    if (video.readyState < 2 || playPending) return;
    playPending = true;
    Promise.resolve(video.play()).then(() => {
      if (disposed) return;
      if (!allowed()) video.pause();
      else onReady();
    }).catch((error) => {
      // Browser autoplay policy and interrupted play requests are temporary.
      // Keep the video mounted so a gesture or returning to the page can retry.
      if (allowed() && !['AbortError', 'NotAllowedError'].includes(error?.name)) fail();
    }).finally(() => {
      playPending = false;
    });
  };
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.addEventListener('canplay', sync);
  video.addEventListener('loadeddata', sync);
  video.addEventListener('error', fail);
  documentObject.addEventListener('visibilitychange', sync);
  documentObject.addEventListener('pointerdown', sync);
  documentObject.addEventListener('keydown', sync);
  const windowObject = documentObject.defaultView;
  windowObject?.addEventListener?.('pageshow', sync);
  const Observer = documentObject.defaultView?.IntersectionObserver;
  const observer = Observer ? new Observer(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }) : null;
  observer?.observe(video);
  sync();
  return () => {
    disposed = true;
    video.pause();
    observer?.disconnect();
    video.removeEventListener('canplay', sync);
    video.removeEventListener('loadeddata', sync);
    video.removeEventListener('error', fail);
    documentObject.removeEventListener('visibilitychange', sync);
    documentObject.removeEventListener('pointerdown', sync);
    documentObject.removeEventListener('keydown', sync);
    windowObject?.removeEventListener?.('pageshow', sync);
  };
}
