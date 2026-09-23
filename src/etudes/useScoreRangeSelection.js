import {useRef} from 'react';
// Desktop range selection owns ordinary drags; Alt retains note movement.
export default function useScoreRangeSelection({canvas,enabled,onRangeChange,onSelect,clearRange}){
 const gesture=useRef(null),suppress=useRef(false);
 const locate=(x,y)=>{const bars=[...canvas.current.querySelectorAll('[data-bar-index]')];let best=null,dist=Infinity;for(const bar of bars){const r=bar.getBoundingClientRect();const dy=Math.max(r.top-y,0,y-r.bottom);const host=bar.querySelector('[data-draw-count]');for(const hit of host?.shadowRoot?.querySelectorAll('[data-event][data-cursor-x]')??[]){if(!hit.getClientRects().length)continue;const point=hit.ownerSVGElement.createSVGPoint();point.x=Number(hit.dataset.cursorX)+12;point.y=Number(hit.dataset.cursorY)||0;const screen=point.matrixTransform(hit.ownerSVGElement.getScreenCTM()),distance=dy*10000+Math.abs(screen.x-x);if(distance<dist){dist=distance;best={bar:Number(bar.dataset.barIndex),event:Number(hit.dataset.event),string:Number(hit.dataset.string)||1,mode:hit.dataset.mode??'staff',midi:Number(hit.dataset.midi)||undefined};}}}return best;};
 const finish=e=>{const g=gesture.current;if(!g)return;gesture.current=null;if(canvas.current.hasPointerCapture(g.id))canvas.current.releasePointerCapture(g.id);if(g.moved){suppress.current=true;}else{clearRange();onSelect(g.start);} };
 return enabled?{
 onPointerDownCapture:e=>{if(e.nativeEvent.composedPath().some(n=>n.dataset?.scoreAnnotation)||e.button!==0||e.altKey||e.target.closest('button,input,select,.etudeMeasureLayoutTools'))return;const start=locate(e.clientX,e.clientY);if(!start)return;e.preventDefault();e.stopPropagation();canvas.current.focus({preventScroll:true});window.getSelection()?.removeAllRanges();gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,start,moved:false};suppress.current=false;canvas.current.setPointerCapture(e.pointerId);},
 onPointerMoveCapture:e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();if(Math.hypot(e.clientX-g.x,e.clientY-g.y)<5&&!g.moved)return;g.moved=true;const r=canvas.current.getBoundingClientRect();if(e.clientY<r.top+24)canvas.current.scrollTop-=16;if(e.clientY>r.bottom-24)canvas.current.scrollTop+=16;const end=locate(e.clientX,e.clientY);if(end)onRangeChange({start:g.start,end});},
 onPointerUpCapture:e=>{if(!gesture.current)return;e.preventDefault();e.stopPropagation();finish(e);},
 onPointerCancel:()=>{gesture.current=null;clearRange();},
 onClickCapture:e=>{if(suppress.current){e.preventDefault();e.stopPropagation();suppress.current=false;}},
 onKeyDownCapture:e=>{if(e.nativeEvent.composedPath().some(n=>n.dataset?.scoreAnnotation))return;if(e.key==='Escape'){gesture.current=null;clearRange();e.preventDefault();e.stopPropagation();}},
 }:{};
}
