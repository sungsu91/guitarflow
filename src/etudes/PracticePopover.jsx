import { useLanguage } from "./../i18n/react.jsx";
import { localizeUi } from "./../i18n/core.js";
import {useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
export default function PracticePopover({anchor,onClose,label,children,width:preferredWidth=330}){
  useLanguage();
 const ref=useRef(null),[place,setPlace]=useState(null);
 useLayoutEffect(()=>{
  let frame,last='';
  const position=()=>{const a=anchor.current?.getBoundingClientRect(),el=ref.current;if(a&&el){const v=visualViewport,left=(v?.offsetLeft??0)+12,top=(v?.offsetTop??0)+12,right=left+(v?.width??innerWidth)-24;let bottom=top+(v?.height??innerHeight)-24;const nav=document.querySelector('.integratedBottomNav')?.getBoundingClientRect();if(nav?.height&&nav.top>top)bottom=Math.min(bottom,nav.top-8);const width=Math.min(preferredWidth,right-left),above=a.top-top-12,below=bottom-a.bottom-12,up=above>=Math.min(el.scrollHeight,340)||above>=below;const side=right-a.right>width+12&&Math.max(above,below)<Math.min(el.scrollHeight,340);const height=Math.max(44,side?bottom-top:up?above:below),x=Math.max(left,Math.min(a.right-width,right-width)),y=up?Math.max(top,a.top-12-Math.min(el.scrollHeight,height)):a.bottom+12;const next={left:side?a.right+12:x,top:side?Math.max(top,Math.min(a.top,bottom-Math.min(el.scrollHeight,height))):y,width,maxHeight:height,side,'--tail-y':Math.max(12,Math.min(height-12,a.top+a.height/2-Math.max(top,Math.min(a.top,bottom-Math.min(el.scrollHeight,height)))))+'px','--tail-x':Math.max(12,Math.min(width-12,a.left+a.width/2-x))+'px',up};const signature=JSON.stringify(next);if(signature!==last){last=signature;setPlace(next);}}frame=requestAnimationFrame(position);};position();
  const outside=e=>{if(!ref.current?.contains(e.target)&&!anchor.current?.contains(e.target)&&!e.target.closest('.rhythmSettingsPopup'))onClose(false);};
  const escape=e=>{if(e.key==='Escape'&&!document.querySelector('.rhythmSettingsPopup')){e.stopPropagation();onClose(true);}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{cancelAnimationFrame(frame);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[anchor,onClose,preferredWidth]);
 const style=place?Object.fromEntries(Object.entries(place).filter(([k])=>k!=='up'&&k!=='side')):{visibility:'hidden',width:preferredWidth};
 return createPortal(<div className="etudeFloatingTheme"><div ref={ref} className={'etudeRemotePopover '+(place?.side?'opens-side':place?.up?'opens-up':'opens-down')} style={style} role="dialog" aria-label={localizeUi(label)}><div className="etudeRemotePopoverBody">{children}</div></div></div>,anchor.current?.closest('.app')??document.body);
}
