const feedbacks = new WeakMap();

export function triggerNoteRipple(element) {
  const ring = element?.querySelector('.fretboardNoteRippleRing');
  const drops = element?.querySelector('.fretboardNoteRippleDrops');
  if (!ring || !drops) return;
  feedbacks.get(element)?.();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animations = [];
  let timer;
  const clear = () => {
    animations.forEach(animation => { animation.onfinish = null; animation.cancel(); });
    clearTimeout(timer);
    ring.style.opacity = '';
    feedbacks.delete(element);
  };
  feedbacks.set(element, clear);
  if (reduced || typeof ring.animate !== 'function') {
    ring.style.opacity = '.65';
    timer = setTimeout(clear, 140);
    return;
  }
  animations.push(ring.animate([
    {opacity: .7, transform: 'scale(.85)'},
    {opacity: .45, offset: .35, transform: 'scale(1.18)'},
    {opacity: 0, transform: 'scale(1.48)'},
  ], {duration: 360, easing: 'cubic-bezier(.2,.6,.35,1)'}));
  animations.push(drops.animate([
    {opacity: 0, transform: 'scale(.9)'},
    {opacity: .65, offset: .2, transform: 'scale(1.06)'},
    {opacity: 0, transform: 'scale(1.35)'},
  ], {duration: 280, easing: 'ease-out'}));
  animations[0].onfinish = clear;
}
