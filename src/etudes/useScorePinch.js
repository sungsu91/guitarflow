import {useEffect,useRef} from 'react';

// Capture two-finger gestures only inside the focused score. One finger still scrolls.
export default function useScorePinch(viewportRef,enabled,zoom,onZoom){
 const current=useRef({zoom,onZoom});current.current={zoom,onZoom};
 useEffect(()=>{
  const element=viewportRef.current;if(!enabled||!element)return;
  let gesture=null;
  const distance=touches=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
  const start=event=>{if(event.touches.length!==2)return;event.preventDefault();gesture={distance:distance(event.touches),zoom:current.current.zoom};};
  const move=event=>{if(event.touches.length!==2)return;event.preventDefault();if(!gesture){start(event);return;}if(gesture.distance>0)current.current.onZoom(Math.max(.6,Math.min(2.5,gesture.zoom*distance(event.touches)/gesture.distance)));};
  const end=()=>{gesture=null;};
  element.addEventListener('touchstart',start,{passive:false});element.addEventListener('touchmove',move,{passive:false});element.addEventListener('touchend',end);element.addEventListener('touchcancel',end);
  return()=>{element.removeEventListener('touchstart',start);element.removeEventListener('touchmove',move);element.removeEventListener('touchend',end);element.removeEventListener('touchcancel',end);};
 },[enabled,viewportRef]);
}
