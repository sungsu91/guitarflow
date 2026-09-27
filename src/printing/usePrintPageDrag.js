import {useEffect,useRef,useState} from 'react';
import {printCoordinate} from '../rhythm-trainer/printLayout.js';

// Capture on the persistent pages container: the selected pack can change pages
// without losing its touch gesture when React reparents its section element.
export default function usePrintPageDrag({root,packs,sections,onMove,onSelect,onPage}){
 const props=useRef();props.current={root,packs,sections,onMove,onSelect,onPage};
 const drag=useRef(null),animation=useRef(0),lastTime=useRef(0);
 const [active,setActive]=useState(false),[previewPages,setPreviewPages]=useState(0);
 const apply=()=>{
  const current=drag.current;if(!current)return;
  const frames=[...props.current.root.current.querySelectorAll('[data-print-frame]')];
  const target=frames.find(el=>{const rect=el.getBoundingClientRect();return current.y>=rect.top&&current.y<=rect.bottom;});
  if(!target)return;
  const requested=printCoordinate(Number(target.dataset.pageIndex),(current.y-target.getBoundingClientRect().top)/current.zoom)-current.grabOffset;
  const result=props.current.onMove(current.pack.key,requested);current.pack=result.pack;current.blocked=result.blocked;
  setPreviewPages(old=>Math.max(old,result.pack.sections.at(-1).page+2));
 };
 const tick=time=>{
  animation.current=0;const current=drag.current;if(!current)return;
  const elapsed=Math.min(32,lastTime.current?time-lastTime.current:16);lastTime.current=time;
  // Only scroll after an intentional drag. Holding a pack near an edge must
  // not move it before the user has started moving their finger.
  if(current.moved){
   const scroller=props.current.root.current,rect=scroller.getBoundingClientRect(),edge=44;
   const speed=current.y>rect.bottom-edge?Math.min(1,(current.y-rect.bottom+edge)/edge):current.y<rect.top+edge?-Math.min(1,(rect.top+edge-current.y)/edge):0;
   if(speed&&Math.sign(speed)!==current.blocked)scroller.scrollTop+=speed*360*elapsed/1000;
   apply();
  }
  animation.current=requestAnimationFrame(tick);
 };
 const finish=()=>{
  const current=drag.current;if(!current)return;
  cancelAnimationFrame(animation.current);animation.current=0;lastTime.current=0;drag.current=null;
  if(current.target.hasPointerCapture?.(current.id))current.target.releasePointerCapture(current.id);
  setActive(false);setPreviewPages(0);
  if(current.pack.sections[0].page!==current.originPage)props.current.onPage(current.pack.sections[0].page);
 };
 useEffect(()=>{
  const interrupt=()=>finish();window.addEventListener('blur',interrupt);document.addEventListener('visibilitychange',interrupt);
  return()=>{window.removeEventListener('blur',interrupt);document.removeEventListener('visibilitychange',interrupt);cancelAnimationFrame(animation.current);};
 },[]);
 const handlers=({enabled,zoom})=>({
  onPointerDown:event=>{
   if(!enabled||event.button!==0||drag.current)return;
   const element=event.target.closest('[data-print-section]');if(!element)return;
   const section=props.current.sections.find(section=>section.id===element.dataset.printSection);
   const rect=element.closest('[data-print-frame]').getBoundingClientRect(),pack=props.current.packs.find(pack=>pack.key===section.pattern.printKey);
   event.preventDefault();props.current.onSelect(section);
   drag.current={id:event.pointerId,target:event.currentTarget,pack,originPage:pack.sections[0].page,zoom,grabOffset:printCoordinate(section.page,(event.clientY-rect.top)/zoom)-pack.start,blocked:0,y:event.clientY,startY:event.clientY,moved:false};
   event.currentTarget.setPointerCapture(event.pointerId);
   setActive(true);setPreviewPages(Math.max(...props.current.sections.map(section=>section.page))+2);
   animation.current=requestAnimationFrame(tick);
  },
  onPointerMove:event=>{const current=drag.current;if(current?.id!==event.pointerId)return;event.preventDefault();current.y=event.clientY;if(Math.abs(current.y-current.startY)>3)current.moved=true;},
  onPointerUp:event=>{if(drag.current?.id!==event.pointerId)return;drag.current.y=event.clientY;if(drag.current.moved)apply();finish();},
  onPointerCancel:event=>{if(drag.current?.id===event.pointerId)finish();},
  onLostPointerCapture:event=>{if(drag.current?.id===event.pointerId)finish();}
 });
 return {handlers,active,previewPages};
}
