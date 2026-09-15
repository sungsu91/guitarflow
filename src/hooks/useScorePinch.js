import {useLayoutEffect,useRef} from 'react';

export const clampScoreZoom=value=>Math.max(25,Math.min(400,Math.round(value)));
const midpoint=touches=>({x:(touches[0].clientX+touches[1].clientX)/2,y:(touches[0].clientY+touches[1].clientY)/2});
const distance=touches=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);

// Shared document-only gesture. Touch moves paint a temporary transform, not
// React state, music data or PDF render jobs. Native one-finger scrolling stays.
export default function useScorePinch({enabled,viewport,content,bounds,zoom,onZoom,controller}) {
 const latest=useRef({zoom,onZoom}),session=useRef(null),settle=useRef(null),frame=useRef(0),blockedUntil=useRef(0);
 latest.current={zoom,onZoom};
 const capture=center=>{
  const node=content.current,v=viewport.current,r=node.getBoundingClientRect(),box=v.getBoundingClientRect();
  const candidates=[...node.querySelectorAll('[data-pinch-anchor]')];if(node.matches('[data-pinch-anchor]'))candidates.unshift(node);
  const target=candidates.find(el=>{const b=el.getBoundingClientRect();return center.y>=b.top&&center.y<=b.bottom&&center.x>=b.left&&center.x<=b.right;})??node;
  const a=target.getBoundingClientRect();
  return {width:r.width,height:r.height,baseZoom:latest.current.zoom,zoom:latest.current.zoom,center,box,
   originX:r.left-box.left+v.scrollLeft,originY:r.top-box.top+v.scrollTop,x:center.x-r.left,y:center.y-r.top,
   target,targetWidth:a.width,anchorX:(center.x-a.left)/a.width,anchorY:(center.y-a.top)/a.height,
   contentStyle:node.getAttribute('style'),boundsStyle:bounds.current.getAttribute('style')};
 };
 const restoreAnchor=s=>{
  if(!s.target.isConnected)return;
  const r=s.target.getBoundingClientRect(),v=viewport.current;
  v.scrollLeft+=r.left+r.width*s.anchorX-s.center.x;
  v.scrollTop+=r.top+r.height*s.anchorY-s.center.y;
 };
 const paint=()=>{
  frame.current=0;const s=session.current;if(!s)return;
  const ratio=s.zoom/s.baseZoom,node=content.current,b=bounds.current,v=viewport.current;
  node.style.width=`${s.width}px`;node.style.transformOrigin='0 0';node.style.transform=`scale(${ratio})`;
  b.style.width=`${s.width*ratio}px`;b.style.height=`${s.height*ratio}px`;
  v.scrollLeft=s.originX+s.x*ratio-(s.center.x-s.box.left);
  v.scrollTop=s.originY+s.y*ratio-(s.center.y-s.box.top);
  v.dataset.pinchZoom=String(s.zoom);
  v.dispatchEvent(new CustomEvent('scorezoompreview',{bubbles:true,detail:s.zoom}));
 };
 const finish=(cancel,blockClicks=true)=>{
  const s=session.current;if(!s)return;
  if(!viewport.current||!content.current||!bounds.current){session.current=null;return;}
  cancelAnimationFrame(frame.current);paint();session.current=null;
  for(const [node,style] of [[content.current,s.contentStyle],[bounds.current,s.boundsStyle]])style==null?node.removeAttribute('style'):node.setAttribute('style',style);
  if(cancel){delete viewport.current.dataset.pinching;restoreAnchor(s);viewport.current.dispatchEvent(new CustomEvent('scorezoompreview',{bubbles:true,detail:latest.current.zoom}));return;}
  blockedUntil.current=blockClicks?performance.now()+350:0;
  settle.current={...s,expectedWidth:s.width*s.zoom/s.baseZoom,until:performance.now()+1200};
  latest.current.onZoom(s.zoom);
 };
 const zoomTo=value=>{
  if(!enabled||!content.current)return;
  const v=viewport.current,b=v.getBoundingClientRect();
  session.current=capture({x:b.left+v.clientWidth/2,y:b.top+Math.min(v.clientHeight/2,160)});
  session.current.zoom=clampScoreZoom(value);finish(false,false);
 };
 if(controller)controller.current={zoomTo};
 useLayoutEffect(()=>{
  if(!enabled)return;const v=viewport.current,node=content.current;let settleFrame=0;
  // PDF.js updates its layout asynchronously after the zoom commit.
  const check=()=>{
   const s=settle.current;if(!s)return;
   // Engraved measures retain fixed borders/gaps; raster pages resize later.
   if(Math.abs(node.getBoundingClientRect().width-s.expectedWidth)<2&&Math.abs(s.target.getBoundingClientRect().width-s.targetWidth*s.zoom/s.baseZoom)<Math.max(2,Math.abs(s.zoom/s.baseZoom-1)*18)){restoreAnchor(s);settle.current=null;delete v.dataset.pinching;}
   else if(performance.now()>s.until){settle.current=null;delete v.dataset.pinching;}
   else settleFrame=requestAnimationFrame(check);
  };
  const observer=new ResizeObserver(()=>{cancelAnimationFrame(settleFrame);check();});observer.observe(node);
  const start=e=>{
   if(e.touches.length<2)return;
   e.preventDefault();e.stopPropagation();
   if(!session.current){settle.current=null;session.current=capture(midpoint(e.touches));session.current.distance=Math.max(1,distance(e.touches));v.dataset.pinching='true';v.dispatchEvent(new Event('scorepinchstart'));}
  };
  const move=e=>{
   const s=session.current;if(!s)return;
   e.preventDefault();e.stopPropagation();
   if(e.touches.length<2)return;
   s.zoom=clampScoreZoom(s.baseZoom*distance(e.touches)/s.distance);s.center=midpoint(e.touches);
   if(!frame.current)frame.current=requestAnimationFrame(paint);
  };
  const end=e=>{if(!session.current)return;e.preventDefault();e.stopPropagation();if(e.touches.length<2){finish(e.type==='touchcancel');check();}};
  const pointer=e=>{if(e.pointerType==='touch'&&(session.current||performance.now()<blockedUntil.current)){e.preventDefault();e.stopImmediatePropagation();}};
  const click=e=>{if(session.current||performance.now()<blockedUntil.current){e.preventDefault();e.stopImmediatePropagation();}};
  v.addEventListener('touchstart',start,{capture:true,passive:false});v.addEventListener('touchmove',move,{capture:true,passive:false});
  v.addEventListener('touchend',end,{capture:true,passive:false});v.addEventListener('touchcancel',end,{capture:true,passive:false});
  v.addEventListener('pointerup',pointer,true);v.addEventListener('click',click,true);
  return()=>{observer.disconnect();cancelAnimationFrame(frame.current);cancelAnimationFrame(settleFrame);finish(true);settle.current=null;delete v.dataset.pinching;v.removeEventListener('touchstart',start,true);v.removeEventListener('touchmove',move,true);v.removeEventListener('touchend',end,true);v.removeEventListener('touchcancel',end,true);v.removeEventListener('pointerup',pointer,true);v.removeEventListener('click',click,true);};
 },[enabled]);
 useLayoutEffect(()=>{
  const s=settle.current;if(s&&content.current&&Math.abs(content.current.getBoundingClientRect().width-s.expectedWidth)<2&&Math.abs(s.target.getBoundingClientRect().width-s.targetWidth*s.zoom/s.baseZoom)<Math.max(2,Math.abs(s.zoom/s.baseZoom-1)*18)){restoreAnchor(s);settle.current=null;delete viewport.current.dataset.pinching;}
 },[zoom]);
 return {zoomTo,isBusy:()=>Boolean(session.current||settle.current)};
}
