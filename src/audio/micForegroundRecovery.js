import { getAudioInputSelection, refreshAudioDevices } from '../input/audioInputSelection.js';
// Reuse the current detector when possible; never turn a deliberately disabled mic on.
export function installMicForegroundRecovery({ getSession, restart, onHidden, doc = document, win = window, mediaDevices = globalThis.navigator?.mediaDevices }) {
  let disposed = false;
  let pending = false;
  let interrupted = false;
  async function recover(allowMissing = false) {
    if (disposed || doc.visibilityState === 'hidden' || pending) return;
    const session = getSession();
    if (!session) {
      if (allowMissing !== true || getAudioInputSelection().status !== 'disconnected') return;
      pending = true;
      try { await restart(); } catch { /* Keep the explicit disconnected state. */ }
      finally { pending = false; }
      return;
    }
    const context = session.audioContext;
    const tracks = session.rawStream?.getAudioTracks() || [];
    const disconnected = session.connected === false || !tracks.length || tracks.every(track => track.readyState === 'ended');
    if (!interrupted && !disconnected && context?.state === 'running') return;
    pending = true;
    try {
      if (disconnected || !context || context.state === 'closed') await restart();
      else {
        if (context.state !== 'running') await context.resume();
        const clock = context.currentTime;
        // Some interruptions leave a nominally running context with a stopped
        // audio clock. Silence alone is never treated as a disconnected mic.
        if (Number.isFinite(clock) || tracks.some(track => track.muted)) {
          await new Promise(resolve => setTimeout(resolve, 400));
          if (disposed || doc.visibilityState === 'hidden' || getSession() !== session) return;
          const clockStopped = Number.isFinite(clock) && context.currentTime === clock;
          if (clockStopped || tracks.some(track => track.muted)) await restart();
        }
      }
      interrupted = getSession()?.audioContext?.state !== 'running';
    } catch { interrupted = true; /* Retry from the next user gesture. */ }
    finally { pending = false; }
  }
  function visibility() {
    if (doc.visibilityState === 'hidden') {
      interrupted = true;
      onHidden?.();
    } else void recover();
  }
  const bindings = [[doc,'visibilitychange',visibility],[win,'pageshow',recover],[win,'focus',recover],[doc,'pointerdown',recover],[doc,'keydown',recover]];
  async function devicesChanged() {
    await refreshAudioDevices(mediaDevices);
    if (disposed) return;
    const selection = getAudioInputSelection();
    if (selection.deviceId && !selection.devices.some(d => d.deviceId === selection.deviceId)) return;
    void recover(true);
  }
  if (mediaDevices?.addEventListener) bindings.push([mediaDevices, 'devicechange', devicesChanged]);
  for (const [target,type,handler] of bindings) target.addEventListener(type,handler);
  return () => {
    disposed = true;
    for (const [target,type,handler] of bindings) target.removeEventListener(type,handler);
  };
}
