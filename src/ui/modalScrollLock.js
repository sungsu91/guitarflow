// Freeze the page behind a modal on iOS as well as desktop; nested dialogs share the lock.
let depth = 0;
let restorePage;
export function lockDocumentScroll() {
  if (depth++ === 0) {
    const root = document.documentElement, body = document.body;
    const x = window.scrollX, y = window.scrollY;
    const changes = [[root,'overflow','hidden'],[root,'overscroll-behavior','none'],[body,'position','fixed'],[body,'top',`${-y}px`],[body,'left',`${-x}px`],[body,'width','100%'],[body,'overflow','hidden'],[body,'overscroll-behavior','none']];
    const previous = changes.map(([node,key]) => [node,key,node.style.getPropertyValue(key),node.style.getPropertyPriority(key)]);
    changes.forEach(([node,key,value]) => node.style.setProperty(key,value,'important'));
    restorePage = () => {
      previous.forEach(([node,key,value,priority]) => value ? node.style.setProperty(key,value,priority) : node.style.removeProperty(key));
      window.scrollTo({left:x,top:y,behavior:'instant'});
    };
  }
  let released = false;
  return () => { if (released) return; released = true; if (--depth === 0) { restorePage?.(); restorePage = null; } };
}

// Prevent rubber-band gestures from moving the page when a modal's scroller ends.
export function containModalTouch(modal) {
  let last;
  const start = event => { const touch = event.touches[0]; last = touch && {x:touch.clientX,y:touch.clientY}; };
  const move = event => {
    if (!last || event.touches.length !== 1) return;
    const touch = event.touches[0], dx = last.x-touch.clientX, dy = last.y-touch.clientY;
    last = {x:touch.clientX,y:touch.clientY};
    const vertical = Math.abs(dy) >= Math.abs(dx), delta = vertical ? dy : dx;
    for (let node = event.target; node && node !== modal.parentElement; node = node.parentElement) {
      if (!(node instanceof Element) || !modal.contains(node)) break;
      const style = getComputedStyle(node);
      const overflow = vertical ? style.overflowY : style.overflowX;
      const position = vertical ? node.scrollTop : node.scrollLeft;
      const range = vertical ? node.scrollHeight-node.clientHeight : node.scrollWidth-node.clientWidth;
      if (/auto|scroll/.test(overflow) && range > 1 && ((delta > 0 && position < range-1) || (delta < 0 && position > 0))) return;
    }
    if (event.cancelable) event.preventDefault();
  };
  modal.addEventListener('touchstart',start,{passive:true});
  modal.addEventListener('touchmove',move,{passive:false});
  return () => { modal.removeEventListener('touchstart',start); modal.removeEventListener('touchmove',move); };
}
