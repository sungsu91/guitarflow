// Backing playback and groove auditions have one owner. A new request cancels
// the old owner synchronously, including work still waiting for audio decoding.
let activeLease = null;

export function claimBackingPlayback(stop) {
  const previous = activeLease;
  activeLease = null;
  previous?.stop();
  const lease = {
    stop,
    isCurrent: () => activeLease === lease,
    release() { if (activeLease === lease) activeLease = null; },
  };
  activeLease = lease;
  return lease;
}

export function stopOwnedBackingPlayback() {
  const previous = activeLease;
  activeLease = null;
  previous?.stop();
}

if (import.meta.hot) import.meta.hot.dispose(stopOwnedBackingPlayback);
