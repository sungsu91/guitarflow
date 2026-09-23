import {useCallback,useEffect,useRef,useState} from 'react';
import { t as translateUi } from '../i18n/core.js';

// Keep the same page renderer mounted. Popover supplies a top-layer fallback
// on browsers without element fullscreen, without remounting the page renderer.
export default function usePdfFullscreen() {
 const ref=useRef(null),fallback=useRef(false),[active,setActive]=useState(false);
 const exit=useCallback(async()=>{
  const node=ref.current;
  if(document.fullscreenElement===node)await document.exitFullscreen();
  if(fallback.current){if(node?.hidePopover&&node.matches(':popover-open'))node.hidePopover();node?.removeAttribute('popover');fallback.current=false;}
  setActive(false);
 },[]);
 const enter=useCallback(async()=>{
  const node=ref.current;if(!node)return;
  if(node.requestFullscreen){try{await node.requestFullscreen();setActive(true);return;}catch{/* Use the document-only in-app fallback. */}}
  fallback.current=true;
  if(node.showPopover){node.setAttribute('popover','manual');node.showPopover();}
  setActive(true);
 },[]);
 useEffect(()=>{
  const changed=()=>setActive(document.fullscreenElement===ref.current||fallback.current);
  document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed);
 },[]);
 useEffect(()=>{
  if(!active)return;
  const before=document.body.style.overflow,root=document.documentElement;
  const rootBefore={overflow:root.style.overflow,scrollbarGutter:root.style.scrollbarGutter};
  document.body.style.overflow='hidden';root.style.overflow='hidden';root.style.scrollbarGutter='auto';
  const node=ref.current,previous=document.activeElement;
  node.querySelector(`[aria-label="${translateUi('pdf.closeFullscreenScore')}"]`)?.focus({preventScroll:true});
  const key=e=>{if(e.key==='Escape'){e.preventDefault();void exit();}};
  document.addEventListener('keydown',key);
  return()=>{document.body.style.overflow=before;root.style.overflow=rootBefore.overflow;root.style.scrollbarGutter=rootBefore.scrollbarGutter;document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[active,exit]);
 return {ref,active,enter,exit};
}
