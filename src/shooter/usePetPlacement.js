import { useLayoutEffect, useRef } from "react";
import { clampPetPosition, getPetPlacement, normalizePetPosition } from "./petPreferences.js";

export function usePetPlacement({ skinId, rootRef, handleRef, size, mobile, horizontal, position, onPositionChange }) {
  const pointRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const metrics = () => {
    const root = rootRef.current;
    const rect = root.getBoundingClientRect();
    // The existing mobile landscape fallback rotates the whole app by 90 degrees.
    const app = root.closest("main");
    const transform = app ? new DOMMatrix(getComputedStyle(app).transform) : new DOMMatrix();
    const rotated = Math.abs(transform.a) < 0.01 && transform.b > 0;
    const scaleX = root.clientWidth / ((rotated ? rect.height : rect.width) || 1);
    const scaleY = root.clientHeight / ((rotated ? rect.width : rect.height) || 1);
    return { width: root.clientWidth, height: root.clientHeight, rect,
      point: (x, y) => rotated
        ? { x: (y - rect.top) * scaleX, y: (rect.right - x) * scaleY }
        : { x: (x - rect.left) * scaleX, y: (y - rect.top) * scaleY },
      delta: (x, y) => rotated ? { x: y * scaleX, y: -x * scaleY } : { x: x * scaleX, y: y * scaleY },
    };
  };
  const paint = point => {
    pointRef.current = point;
    if (!handleRef.current) return;
    handleRef.current.style.left = `${point.x}px`;
    handleRef.current.style.top = `${point.y}px`;
  };
  const place = () => {
    if (!rootRef.current || dragRef.current) return;
    const box = metrics();
    const lives = rootRef.current.parentElement?.querySelector(".mobileShooterLives");
    const rect = lives?.getBoundingClientRect();
    const a = rect && box.point(rect.left, rect.top), b = rect && box.point(rect.right, rect.bottom);
    const hearts = rect?.width ? { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x) } : null;
    paint(getPetPlacement({ position, ...box, size, hearts, mobile, horizontal }));
  };
  useLayoutEffect(() => {
    dragRef.current = null;
    delete handleRef.current.dataset.dragging;
    place();
    const resize = new ResizeObserver(place);
    resize.observe(rootRef.current);
    const lives = rootRef.current.parentElement?.querySelector(".mobileShooterLives");
    if (lives) resize.observe(lives);
    // Recording mode moves the heart HUD using a style variable without resizing it.
    const attributes = new MutationObserver(place);
    attributes.observe(rootRef.current.parentElement, { attributes: true, attributeFilter: ["style", "data-recording-raised"] });
    return () => { resize.disconnect(); attributes.disconnect(); dragRef.current = null; };
  }, [skinId, size, mobile, horizontal, position]);

  const finish = (event, cancel = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    dragRef.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (cancel) { place(); return; }
    const box = metrics();
    onPositionChange(normalizePetPosition(pointRef.current, box.width, box.height, size));
  };
  return {
    onClick: event => event.stopPropagation(),
    onPointerDown: event => {
      if (!event.isPrimary || (event.button != null && event.button !== 0)) return;
      event.stopPropagation();
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "true";
      dragRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, start: pointRef.current };
    },
    onPointerMove: event => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      event.stopPropagation();
      event.preventDefault();
      const box = metrics();
      const delta = box.delta(event.clientX - drag.clientX, event.clientY - drag.clientY);
      paint(clampPetPosition({ x: drag.start.x + delta.x, y: drag.start.y + delta.y }, box.width, box.height, size));
    },
    onPointerUp: event => finish(event),
    onPointerCancel: event => finish(event, true),
    onLostPointerCapture: event => finish(event, true),
    onKeyDown: event => {
      const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!directions[event.key]) return;
      event.preventDefault();
      event.stopPropagation();
      const [x, y] = directions[event.key], step = event.shiftKey ? 16 : 4, box = metrics();
      onPositionChange(normalizePetPosition({ x: pointRef.current.x + x * step, y: pointRef.current.y + y * step }, box.width, box.height, size));
    },
  };
}
