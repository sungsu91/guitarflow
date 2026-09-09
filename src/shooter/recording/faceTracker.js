import { faceShapeControls } from './faceShape.js';

// Lazy, on-device tracking. At most one frame is in flight, at 6 fps or less.
// Slow/unsupported workers never block the game or the camera compositor.
export function createFaceTracker(video) {
  if (typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined') return null;
  let worker;
  try { worker = new Worker(`${import.meta.env.BASE_URL}vendor/face-landmarker/face-worker.js`); }
  catch { return null; }
  let disposed = false, ready = false, busy = false, lastSent = -Infinity;
  let controls = null, lastResult = -Infinity, interval = 167, timeout;
  const surface = document.createElement('canvas');
  const ctx = surface.getContext('2d', { alpha: false });
  const dispose = () => { disposed = true; controls = null; clearTimeout(timeout); worker.terminate(); };
  worker.onerror = dispose;
  timeout = setTimeout(dispose, 20000);
  worker.onmessage = ({ data }) => {
    if (disposed) return;
    clearTimeout(timeout);
    if (data.type === 'ready') ready = true;
    else if (data.type === 'unavailable') dispose();
    else if (data.type === 'face') {
      busy = false;
      // Drop contour processing on very slow devices instead of flashing stale warps.
      if (data.elapsed > 250) { dispose(); return; }
      interval = Math.max(167, Math.min(333, data.elapsed * 4));
      const next = faceShapeControls(data.points, video.videoWidth / video.videoHeight);
      const now = performance.now();
      // Smooth minor tracking jitter, but do not drag stale landmarks to a new face.
      const sameFace = controls && next && now - lastResult < 400 && Math.hypot(next[0].x - controls[0].x, next[0].y - controls[0].y) < 0.06;
      controls = sameFace ? next.map((p, i) => Object.fromEntries(Object.keys(p).map(k => [k, controls[i][k] * 0.35 + p[k] * 0.65]))) : next;
      lastResult = now;
    }
  };
  worker.postMessage({ type: 'init' });
  return { dispose, sample() {
    const now = performance.now();
    if (!disposed && ready && !busy && ctx && video.readyState >= 2 && video.videoWidth && now - lastSent >= interval) {
      busy = true; lastSent = now;
      const scale = Math.min(1, 320 / Math.max(video.videoWidth, video.videoHeight));
      const w = Math.max(1, Math.round(video.videoWidth * scale)), h = Math.max(1, Math.round(video.videoHeight * scale));
      if (surface.width !== w || surface.height !== h) { surface.width = w; surface.height = h; }
      try {
        ctx.drawImage(video, 0, 0, w, h);
        createImageBitmap(surface).then(bitmap => {
          if (disposed) { bitmap.close(); return; }
          try { worker.postMessage({ type: 'frame', bitmap, timestamp: now }, [bitmap]); timeout = setTimeout(dispose, 3000); }
          catch { bitmap.close(); dispose(); }
        }, dispose);
      } catch { dispose(); }
    }
    return !disposed && now - lastResult < Math.min(650, interval + 250) ? controls : null;
  } };
}
