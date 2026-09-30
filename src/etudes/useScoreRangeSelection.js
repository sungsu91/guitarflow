import {useEffect,useRef} from 'react';
// Desktop range selection owns ordinary drags; Alt retains note movement.
// Capture only after dragging starts so a click reaches the exact string/note.
export default function useScoreRangeSelection({canvas,enabled,hasRange,onRangeChange,clearRange}){
 const gesture=useRef(null),suppress=useRef(false);
 const release=()=>{
  const g=gesture.current;gesture.current=null;
  if(g&&canvas.current?.hasPointerCapture(g.id))canvas.current.releasePointerCapture(g.id);
  return g;
 };
 useEffect(()=>()=>release(),[enabled]);
 const locate=(x,y)=>{
  let best=null,distance=Infinity;
  for(const bar of canvas.current.querySelectorAll('[data-bar-index]')){
   const bounds=bar.getBoundingClientRect(),dy=Math.max(bounds.top-y,0,y-bounds.bottom);
   const dx=Math.max(bounds.left-x,0,x-bounds.right);
   for(const hit of bar.querySelector('[data-draw-count]')?.shadowRoot?.querySelectorAll('[data-event][data-cursor-x]')??[]){
    if(!hit.getClientRects().length)continue;
    const point=hit.ownerSVGElement.createSVGPoint();
    point.x=Number(hit.dataset.cursorX)+12;point.y=(Number(hit.dataset.cursorY)||0)+7;
    const screen=point.matrixTransform(hit.ownerSVGElement.getScreenCTM());
    const next=dy*1e6+dx*1e4+Math.abs(screen.x-x)*100+Math.abs(screen.y-y);
    if(next<distance){distance=next;best={bar:Number(bar.dataset.barIndex),event:Number(hit.dataset.event)};}
   }
  }
  return best;
 };
 const cancel=()=>{if(release()){suppress.current=true;clearRange();}};
 return enabled?{
  onPointerDownCapture:e=>{
   if(e.nativeEvent.composedPath().some(n=>n.dataset?.scoreAnnotation)||e.button!==0||e.altKey||e.target.closest('button,input,select,.etudeMeasureLayoutTools'))return;
   const start=locate(e.clientX,e.clientY);if(!start)return;
   e.preventDefault();e.stopPropagation();canvas.current.focus({preventScroll:true});window.getSelection()?.removeAllRanges();
   gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,start,moved:false};suppress.current=false;
  },
  onPointerMoveCapture:e=>{
   const g=gesture.current;if(!g||g.id!==e.pointerId)return;
   if(!(e.buttons&1)){release();return;}
   if(Math.hypot(e.clientX-g.x,e.clientY-g.y)<5&&!g.moved)return;
   e.preventDefault();e.stopPropagation();
   if(!g.moved){g.moved=true;canvas.current.setPointerCapture(e.pointerId);}
   const r=canvas.current.getBoundingClientRect();
   if(e.clientY<r.top+24)canvas.current.scrollTop-=16;
   if(e.clientY>r.bottom-24)canvas.current.scrollTop+=16;
   const end=locate(e.clientX,e.clientY);
   if(end&&(end.bar!==g.end?.bar||end.event!==g.end?.event)){g.end=end;onRangeChange({start:g.start,end});}
  },
  onPointerUpCapture:e=>{
   if(gesture.current?.id!==e.pointerId)return;
   const g=release();
   if(g.moved){e.preventDefault();e.stopPropagation();suppress.current=true;}
   else clearRange();
  },
  onPointerCancel:cancel,
  onLostPointerCapture:cancel,
  onClickCapture:e=>{if(suppress.current){e.preventDefault();e.stopPropagation();suppress.current=false;}},
  onKeyDownCapture:e=>{
   if(e.nativeEvent.composedPath().some(n=>n.dataset?.scoreAnnotation))return;
   if(e.key==='Escape'&&(gesture.current||hasRange)){cancel();clearRange();e.preventDefault();e.stopPropagation();}
  },
 }:{};
}
