import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createArtMapMotion } from './artMapMotion.js';
import { createArtMapClothSurface } from './artMapClothSurface.js';

function subscribe(listener) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', listener);
  navigator.connection?.addEventListener('change', listener);
  return () => { query.removeEventListener('change', listener); navigator.connection?.removeEventListener('change', listener); };
}
const wantsStill = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || Boolean(navigator.connection?.saveData);

function MotionCanvas({ id, src, presentation, active }) {
  const ref = useRef(null), renderer = useRef(null), activeRef = useRef(active);
  const [ready, setReady] = useState(false);
  activeRef.current = active;
  useEffect(() => {
    let cancelled = false;
    const image = new Image(); image.src = src;
    image.decode().then(() => {
      if (cancelled) return;
      const sprite = id === 'silk-theatre' ? createArtMapClothSurface(image,presentation,ref.current.ownerDocument) : null;
      renderer.current = createArtMapMotion(ref.current, image, id, {
        presentation, sprite, onReady: () => setReady(true), onFailure: error => {
          if (ref.current) ref.current.dataset.motionFallback = error?.message ?? 'Context lost';
          setReady(false);
        },
      });
      renderer.current?.setActive(activeRef.current);
    }).catch(() => { /* The still image remains visible if decoding or WebGL fails. */ });
    return () => { cancelled = true; renderer.current?.dispose(); renderer.current = null; };
  }, [id, src, presentation]);
  useEffect(() => { renderer.current?.setActive(active); }, [active]);
  return <canvas ref={ref} className="artMapMotionCanvas" data-ready={ready} aria-hidden="true" />;
}

export default function ArtMapMotionCanvas(props) {
  const still = useSyncExternalStore(subscribe, wantsStill, () => true);
  return still ? null : <MotionCanvas key={`${props.id}:${props.src}`} {...props} />;
}
