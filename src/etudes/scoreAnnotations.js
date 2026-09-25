import { localizeUi } from "../i18n/core.js";
import ko from "../i18n/locales/ko.js";
// Offsets use engraving units, so zooming and printing preserve placement.
export function annotationOffset(offset){
 return {x:Number.isFinite(offset?.x)?offset.x:0,y:Number.isFinite(offset?.y)?offset.y:0};
}
export function applyAnnotationOffsets(svg,bar,offsets){
 for(const node of svg.querySelectorAll(`[data-score-annotation][data-annotation-bar="${bar}"]`)){
  const {x,y}=annotationOffset(offsets?.[node.dataset.scoreAnnotation]);
  node.setAttribute('transform',`translate(${x} ${y})`);
 }
}
export function bindAnnotationEditing(svg,{offsets,onMove,onName,onChord,onNameEdit}){
 const ns='http://www.w3.org/2000/svg';
 for(const node of svg.querySelectorAll('[data-score-annotation]')){
  const kind=node.dataset.scoreAnnotation,box=node.getBBox();
  // Only this panel's actual rectangle captures gestures, never a whole bar.
  const hit=document.createElementNS(ns,'rect');
  for(const [key,value] of Object.entries({x:box.x,y:box.y,width:box.width,height:box.height,fill:'transparent',stroke:'none','pointer-events':'all'}))hit.setAttribute(key,value);
  node.prepend(hit);svg.append(node);node.style.cursor='grab';node.style.touchAction='none';
  node.setAttribute('tabindex','0');node.setAttribute('role','button');
  node.setAttribute('aria-label',localizeUi(kind==='section'?ko["etudes.moveSectionMarker"]:kind==='chord'?ko["etudes.moveChordDiagram"]:ko["etudes.editChordName"]));
  let gesture=null,suppress=false;
  const local=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
  const editName=()=>{
   if(kind==='chord'){onChord?.();return;}if(kind!=='harmony'||node.querySelector('foreignObject'))return;if(onNameEdit){onNameEdit();return;}
   const field=document.createElementNS(ns,'foreignObject');
   for(const [k,v] of Object.entries({x:box.x,y:box.y-3,width:Math.max(110,box.width+16),height:30}))field.setAttribute(k,v);
   const input=document.createElementNS('http://www.w3.org/1999/xhtml','input');
   input.setAttribute('aria-label',localizeUi(ko["etudes.enterChordName"]));input.maxLength=40;
   const fullName=node.dataset.harmonyText??node.querySelector('text')?.textContent??'';
   input.value=fullName===ko["etudes.chordNames"]?'':fullName;
   input.style.cssText='box-sizing:border-box;width:100%;height:28px;font:14px Arial;color:#111;background:white;border:1px solid #795536;border-radius:2px;padding:3px';
   let done=false;const finish=save=>{if(done)return;done=true;const value=input.value.trim();field.remove();if(save)onName(value);};
   input.onblur=()=>finish(true);
   input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true);}if(e.key==='Escape'){e.preventDefault();finish(false);}};
   input.onpointerdown=e=>e.stopPropagation();field.append(input);node.append(field);input.focus();input.select();
  };
  node.onpointerdown=e=>{if(e.button!==0||e.target.closest('foreignObject'))return;e.stopPropagation();e.preventDefault();const p=local(e);gesture={id:e.pointerId,p,screen:{x:e.clientX,y:e.clientY},origin:annotationOffset(offsets?.[kind]),moved:false};node.setPointerCapture(e.pointerId);};
  node.onpointermove=e=>{if(!gesture||gesture.id!==e.pointerId)return;e.stopPropagation();const p=local(e);if(Math.hypot(e.clientX-gesture.screen.x,e.clientY-gesture.screen.y)>4)gesture.moved=true;if(!gesture.moved)return;gesture.next={x:gesture.origin.x+p.x-gesture.p.x,y:gesture.origin.y+p.y-gesture.p.y};node.setAttribute('transform',`translate(${gesture.next.x} ${gesture.next.y})`);};
  node.onpointerup=e=>{if(!gesture)return;e.stopPropagation();const g=gesture;gesture=null;suppress=g.moved;if(node.hasPointerCapture(g.id))node.releasePointerCapture(g.id);if(g.moved)onMove(kind,g.next);};
  node.onpointercancel=()=>{if(gesture)node.setAttribute('transform',`translate(${gesture.origin.x} ${gesture.origin.y})`);gesture=null;};
  node.onclick=e=>{e.stopPropagation();if(!suppress)editName();suppress=false;};
  node.onkeydown=e=>{if(e.target!==node)return;if((e.key==='Enter'||e.key===' ')&&(kind==='harmony'||kind==='chord')){e.preventDefault();e.stopPropagation();editName();return;}const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(direction){e.preventDefault();e.stopPropagation();const old=annotationOffset(offsets?.[kind]),step=e.shiftKey?10:1;onMove(kind,{x:old.x+direction[0]*step,y:old.y+direction[1]*step});}};
 }
}
