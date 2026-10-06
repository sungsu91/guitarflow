import {useLayoutEffect} from 'react';

// Navigation uses shared score coordinates. Desktop history and both platforms'
// import review opt in explicitly; ordinary mobile input keeps its own cursor.
export default function useDesktopScoreLocation({canvas,location,mobile,score,view,zoom,spacing,fitScale}){
 useLayoutEffect(()=>{
  if(!location?.cursor||mobile&&location.kind!=='review')return;
  const viewport=canvas.current,cursor=location.cursor;
  const bar=viewport?.querySelector(`[data-bar-index="${cursor.bar}"]`);
  const root=bar?.querySelector('[data-draw-count]')?.shadowRoot;
  const mode=view==='staff'?'staff':cursor.mode;
  const hit=root?.querySelector(`[data-event="${cursor.event}"][data-mode="${mode}"][data-string="${cursor.string}"]`)
   ??root?.querySelector(`[data-event="${cursor.event}"][data-mode="${mode}"]`);
  if(!bar||!hit)return;
  const targetClass=mobile?'reviewLocationTarget':'desktopLocationTarget';
  bar.classList.add(targetClass);
  const svg=hit.ownerSVGElement,mark=document.createElementNS('http://www.w3.org/2000/svg','rect');
  const x=Number(hit.dataset.cursorX)+12;
  const top=Number(svg.dataset.playbackTop)||Number(hit.dataset.cursorY)-12;
  const bottom=Number(svg.dataset.playbackBottom)||Number(hit.dataset.cursorY)+26;
  for(const [key,value] of Object.entries({class:mobile?'reviewLocationMarker':'desktopLocationMarker',x:x-10,y:top,width:20,height:Math.max(20,bottom-top),rx:4,fill:'#b57a20','fill-opacity':.12,stroke:'#a46a13','stroke-width':2,'vector-effect':'non-scaling-stroke','pointer-events':'none','aria-label':location.label}))mark.setAttribute(key,String(value));
  svg.append(mark);
  const bounds=viewport.getBoundingClientRect(),target=mark.getBoundingClientRect();
  if(target.top<bounds.top+16||target.bottom>bounds.bottom-16)viewport.scrollTop+=target.top-bounds.top-Math.max(16,(bounds.height-target.height)/2);
  if(target.left<bounds.left+16||target.right>bounds.right-16)viewport.scrollLeft+=target.left-bounds.left-Math.max(16,(bounds.width-target.width)/2);
  return()=>{bar.classList.remove(targetClass);mark.remove();};
 },[canvas,location,mobile,score,view,zoom,spacing,fitScale]);
}
