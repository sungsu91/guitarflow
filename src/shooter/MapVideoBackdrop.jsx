import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { connectAmbientVideoPlayback } from './ambientVideoPlayback.js';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotionPreference(listener) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener('change', listener);
  navigator.connection?.addEventListener('change', listener);
  return () => {
    query.removeEventListener('change', listener);
    navigator.connection?.removeEventListener('change', listener);
  };
}
const shouldUseStillImage = () => window.matchMedia(reducedMotionQuery).matches || Boolean(navigator.connection?.saveData);

function AmbientVideo({ src, paused, className }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (failed) return;
    return connectAmbientVideoPlayback(ref.current, {
      paused,
      onReady: () => setReady(true),
      onFailure: () => setFailed(true),
    });
  }, [paused, failed]);
  if (failed) return null;
  return <video ref={ref} className={className} data-ready={ready}
    src={src} muted loop playsInline preload="auto" aria-hidden="true" tabIndex={-1}
    disablePictureInPicture disableRemotePlayback />;
}

// Shared playback logic. Placement and source selection remain in each platform UI.
export default function MapVideoBackdrop({
  posterSrc, videoSrc, paused = false,
  imageClassName = 'desktopShooterMapImage',
  videoClassName = 'desktopShooterMapVideo',
}) {
  const still = useSyncExternalStore(subscribeMotionPreference, shouldUseStillImage, () => true);
  return <>
    <img className={imageClassName} src={posterSrc} alt="" draggable={false} />
    {videoSrc && !still ? <AmbientVideo key={videoSrc} src={videoSrc} paused={paused} className={videoClassName} /> : null}
  </>;
}
