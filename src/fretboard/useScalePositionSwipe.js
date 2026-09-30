import { useRef } from 'react';

export function useScalePositionSwipe({ enabled, index, count, onSelect }) {
  const startRef = useRef(null);
  if (!enabled) return {};
  return {
    onPointerDown(event) {
      startRef.current = null;
      if (event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
      if (event.target.closest('button, input, select')) return;
      if (!event.target.closest('.trainingSharedFretboard, .mobileScalePositionNavigation')) return;
      startRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerCancel() { startRef.current = null; },
    onPointerUp(event) {
      const start = startRef.current;
      startRef.current = null;
      if (!start || start.id !== event.pointerId) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.45) return;
      const next = Math.max(0, Math.min(count - 1, index + (dx < 0 ? 1 : -1)));
      if (next !== index) onSelect(next);
    },
  };
}
