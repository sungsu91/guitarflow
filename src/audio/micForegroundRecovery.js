// Reuse the current detector when possible; never turn a deliberately disabled mic on.
export function installMicForegroundRecovery({ getSession, restart, onHidden, doc = document, win = window }) {
  let disposed = false;
  let pending = false;
  let interrupted = false;
  async function recover() {
    if (disposed || doc.visibilityState === 'hidden' || pending) return;
    const session = getSession();
    if (!session) return;
    const context = session.audioContext;
    const tracks = session.rawStream?.getAudioTracks() || [];
    const disconnected = !tracks.length || tracks.every(track => track.readyState === 'ended');
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
  for (const [target,type,handler] of bindings) target.addEventListener(type,handler);
  return () => {
    disposed = true;
    for (const [target,type,handler] of bindings) target.removeEventListener(type,handler);
  };
}
