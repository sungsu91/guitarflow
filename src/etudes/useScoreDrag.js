import {useEffect,useRef} from 'react';
import {midiAtStaffStep} from './scoreModel.js';

function hitAt(x,y){
 let node=document.elementFromPoint(x,y);
 while(node?.shadowRoot){const inner=node.shadowRoot.elementFromPoint(x,y);if(!inner||inner===node)break;node=inner;}
 return node?.closest?.('[data-event]');
}
function location(hit,x,y,key,instrument){
 if(hit?.dataset.mode==='staff'&&instrument!=='piano')return null;
 const section=hit?.getRootNode().host?.closest('[data-bar-index]');if(!section)return null;
 const result={bar:Number(section.dataset.barIndex),event:Number(hit.dataset.event),mode:hit.dataset.mode,string:Number(hit.dataset.string??1)};
 if(result.mode==='staff'){
  const svg=hit.ownerSVGElement,p=svg.createSVGPoint();p.x=x;p.y=y;
  const local=p.matrixTransform(svg.getScreenCTM().inverse());
  result.staffStep=Math.round((Number(hit.dataset.staffBottom)-local.y)/5);
  result.midi=midiAtStaffStep(result.staffStep,key,instrument);
 }
 return result;
}
// Pointer moves update only a DOM preview. Musical state changes once on drop.
export default function useScoreDrag({canvas,score,onSelect,onMove,onMessage,enabled=true}){
 const drag=useRef(null),suppressClick=useRef(false),callbacks=useRef(null);
 callbacks.current={score,onSelect,onMove,onMessage};
 const clear=()=>{const state=drag.current;if(!state)return;cancelAnimationFrame(state.frame);state.preview.remove();state.marker?.remove();drag.current=null;if(canvas.current?.hasPointerCapture(state.pointerId))canvas.current.releasePointerCapture(state.pointerId);};
 useEffect(()=>{const node=canvas.current;const pinch=()=>{clear();suppressClick.current=false;};node.addEventListener('scorepinchstart',pinch);return()=>{clear();node.removeEventListener('scorepinchstart',pinch);};},[]);
 const paint=()=>{
  const state=drag.current;if(!state)return;state.frame=0;
  state.preview.style.transform=`translate(${state.x+16}px,${state.y+16}px)`;
  const hit=hitAt(state.x,state.y);state.target=hit&&canvas.current.contains(hit.getRootNode().host)?location(hit,state.x,state.y,callbacks.current.score.keySignature,callbacks.current.score.instrument):null;
  if(state.from.mode==='staff'&&state.target?.mode==='staff'&&state.target.staffStep===state.from.staffStep)state.target.midi=state.from.midi;
  state.marker?.remove();state.marker=null;
  state.preview.textContent=state.target?`${state.target.bar+1}마디 · ${state.target.event+1}박 · ${state.target.mode==='tab'?`${state.target.string}번줄`:'음높이 변경'}`:'악보 안에 놓으세요 · Esc 취소';
  if(hit&&state.target){
   const marker=document.createElementNS('http://www.w3.org/2000/svg','rect');let y=Number(hit.dataset.cursorY),height=14;
   if(state.target.mode==='staff'){const svg=hit.ownerSVGElement,p=svg.createSVGPoint();p.x=state.x;p.y=state.y;const local=p.matrixTransform(svg.getScreenCTM().inverse());y=Number(hit.dataset.staffBottom)-Math.round((Number(hit.dataset.staffBottom)-local.y)/5)*5-5;height=10;}
   Object.entries({x:hit.dataset.cursorX,y,width:24,height,fill:'#c9972944',stroke:'#a46c0c','stroke-width':2,'pointer-events':'none','vector-effect':'non-scaling-stroke',class:'etudeDropMarker'}).forEach(([k,v])=>marker.setAttribute(k,String(v)));hit.ownerSVGElement.append(marker);state.marker=marker;
  }
 };
 const down=e=>{
  if(!enabled||e.button!==0||drag.current)return;
  suppressClick.current=false;
  // Mobile Chrome can retarget a touch to a nearby clickable notehead. Use
  // the actual pointer position so a ledger extension keeps its own owner.
  const hit=hitAt(e.clientX,e.clientY);
  if(!hit||!canvas.current.contains(hit.getRootNode().host)||hit.dataset.midi===undefined)return;
  const from=location(hit,e.clientX,e.clientY,score.keySignature,score.instrument);if(!from)return;from.string=Number(hit.dataset.string);from.midi=Number(hit.dataset.midi);if(from.mode==='staff')from.staffStep=Math.round((Number(hit.dataset.staffBottom)-Number(hit.dataset.cursorY)-7)/5);
  if(e.pointerType!=='touch'){onSelect(from);canvas.current.focus({preventScroll:true});e.preventDefault();}
  // Ledger lines select their note; they are not separate draggable objects.
  if(hit.dataset.dragTone===undefined){if(e.pointerType!=='touch')suppressClick.current=true;return;}
  const preview=document.createElement('div');preview.className='etudeDragPreview';preview.hidden=true;canvas.current.append(preview);
  const matrix=hit.ownerSVGElement.getScreenCTM(),threshold=Math.max(1.5,Math.min(5,Math.hypot(matrix.a,matrix.b)*5));
  drag.current={from,touch:e.pointerType==='touch',pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,preview,active:false,frame:0,threshold};canvas.current.setPointerCapture(e.pointerId);
 };
 const move=e=>{
  const state=drag.current;if(!state||state.pointerId!==e.pointerId)return;
  state.x=e.clientX;state.y=e.clientY;
  if(!state.active&&Math.hypot(state.x-state.startX,state.y-state.startY)<state.threshold)return;
  state.active=true;state.preview.hidden=false;e.preventDefault();
  if(!state.frame)state.frame=requestAnimationFrame(paint);
 };
 const up=e=>{
  const state=drag.current;if(!state||state.pointerId!==e.pointerId)return;
  if(state.active){state.x=e.clientX;state.y=e.clientY;cancelAnimationFrame(state.frame);paint();suppressClick.current=true;const {from,target}=state;clear();if(target)callbacks.current.onMove(from,target);else callbacks.current.onMessage('이동을 취소했습니다. 악보 내용은 유지됩니다.');}
  else {if(state.touch)callbacks.current.onSelect(state.from);suppressClick.current=true;clear();}
 };
 const cancel=()=>{if(drag.current){suppressClick.current=true;clear();callbacks.current.onMessage('이동을 취소했습니다.');}};
 return {onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:cancel,onLostPointerCapture:cancel,onClickCapture:e=>{if(suppressClick.current){suppressClick.current=false;e.preventDefault();e.stopPropagation();}},onKeyDownCapture:e=>{if(e.key==='Escape'&&drag.current){e.preventDefault();e.stopPropagation();cancel();}}};
}
