import { useRef } from 'react';

// Touch/trackpad scrolling stays native. Mouse dragging and keyboard panning
// are enabled only on an explicitly scrollable overview.
export default function useFretboardPan(enabled) {
  const drag = useRef(null);
  if (!enabled) return {};
  const finish = event => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return {
    onPointerDown(event) {
      if (event.pointerType !== 'mouse' || event.button !== 0 || event.isPrimary === false) return;
      const surface = event.currentTarget;
      if (surface.scrollWidth <= surface.clientWidth) return;
      event.preventDefault();
      surface.focus({ preventScroll: true });
      drag.current = { id: event.pointerId, x: event.clientX, scrollLeft: surface.scrollLeft };
      surface.setPointerCapture(event.pointerId);
    },
    onPointerMove(event) {
      if (drag.current?.id !== event.pointerId) return;
      if (!(event.buttons & 1)) { finish(event); return; }
      event.currentTarget.scrollLeft = drag.current.scrollLeft + drag.current.x - event.clientX;
    },
    onPointerUp: finish,
    onPointerCancel: finish,
    onLostPointerCapture() { drag.current = null; },
    onDragStart(event) { event.preventDefault(); },
    onKeyDown(event) {
      if (event.target !== event.currentTarget) return;
      const surface = event.currentTarget;
      const destinations = {
        ArrowLeft: surface.scrollLeft - 92, ArrowRight: surface.scrollLeft + 92,
        Home: 0, End: surface.scrollWidth - surface.clientWidth,
      };
      if (!(event.key in destinations)) return;
      event.preventDefault();
      surface.scrollLeft = destinations[event.key];
    },
  };
}
