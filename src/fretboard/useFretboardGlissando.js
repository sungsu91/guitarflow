import {useEffect, useRef} from 'react';
import {containsNotePoint, notesAlongSegment} from './noteGlissando.js';

export default function useFretboardGlissando({enabled, notes, onPlay}) {
  const gesture = useRef(null);
  const reset = () => {
    const current = gesture.current;
    gesture.current = null;
    if (current?.surface.hasPointerCapture(current.pointerId)) current.surface.releasePointerCapture(current.pointerId);
  };
  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('blur', reset);
    window.addEventListener('resize', reset);
    window.addEventListener('scroll', reset, true);
    document.addEventListener('visibilitychange', reset);
    return () => {
      reset();
      window.removeEventListener('blur', reset);
      window.removeEventListener('resize', reset);
      window.removeEventListener('scroll', reset, true);
      document.removeEventListener('visibilitychange', reset);
    };
  }, [enabled, notes]);

  const traverse = point => {
    const current = gesture.current;
    for (const target of notesAlongSegment(current.point, point, current.targets)) {
      if (target.key !== current.lastKey) onPlay(target.element, target.note);
      current.lastKey = target.key;
    }
    current.lastKey = current.targets.find(target => containsNotePoint(target, point))?.key ?? null;
    current.point = point;
  };

  if (!enabled) return {};
  return {
    onPointerDown(event) {
      if (event.button !== 0 || event.isPrimary === false || event.pointerType === 'touch' || gesture.current) return;
      const surface = event.currentTarget, bounds = surface.getBoundingClientRect();
      const positions = new Map(notes.map(note => [`${note.stringNumber}:${note.fretNumber}`, note]));
      const targets = [...surface.querySelectorAll('[data-note-pitch].is-interactive')].flatMap(element => {
        const rect = element.getBoundingClientRect();
        const key = `${element.dataset.stringNumber}:${element.dataset.fretNumber}`;
        const note = positions.get(key), x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
        if (!note || !rect.width || x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return [];
        return [{key, note, element, x, y, radius: Math.min(rect.width, rect.height) / 2 + 3}];
      });
      event.preventDefault();
      event.stopPropagation();
      const point = {x: event.clientX, y: event.clientY};
      gesture.current = {surface, targets, pointerId: event.pointerId, point, lastKey: null};
      surface.setPointerCapture(event.pointerId);
      targets.find(target => containsNotePoint(target, point))?.element.focus({preventScroll: true});
      traverse(point);
    },
    onPointerMove(event) {
      if (gesture.current?.pointerId !== event.pointerId) return;
      if (!(event.buttons & 1)) { reset(); return; }
      event.preventDefault();
      const samples = event.nativeEvent.getCoalescedEvents?.() ?? [];
      for (const sample of samples) traverse({x: sample.clientX, y: sample.clientY});
      traverse({x: event.clientX, y: event.clientY});
    },
    onPointerUp(event) { if (gesture.current?.pointerId === event.pointerId) reset(); },
    onPointerCancel: reset,
    onLostPointerCapture: reset,
    onDragStart(event) { event.preventDefault(); },
  };
}
