import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Check} from 'lucide-react';
import {t} from '../i18n/core.js';
import {useLanguage} from '../i18n/react.jsx';
import './mobileEditorTempo.css';

const STEPS=[[-1,'−','app.decreaseBpmBy1'],[-10,'−10','app.decreaseBpmBy10'],[10,'+10','app.increaseBpmBy10'],[1,'+','app.increaseBpmBy1']];

// This mobile-only overlay shares the dock's tempo value and commit behavior.
export default function MobileEditorTempo({value,onChange,onCommit,onCancel,onStep}){
 useLanguage();
 const anchor=useRef(null),input=useRef(null),popup=useRef(null),skipBlur=useRef(false),id=useId();
 const [open,setOpen]=useState(false),[position,setPosition]=useState(null);
 useLayoutEffect(()=>{
  if(!open)return;
  const viewport=window.visualViewport,dialog=anchor.current.closest('dialog');
  const place=()=>{
   const a=anchor.current.getBoundingClientRect(),vLeft=viewport?.offsetLeft??0,vTop=viewport?.offsetTop??0;
   const vWidth=viewport?.width??innerWidth,vHeight=viewport?.height??innerHeight,width=Math.min(248,vWidth-24),height=popup.current.offsetHeight;
   const left=Math.max(vLeft+12,Math.min(a.left+a.width/2-width/2,vLeft+vWidth-width-12));
   const above=a.top-height-8>=vTop+8||a.bottom+height+8>vTop+vHeight-8;
   const top=Math.max(vTop+8,Math.min(above?a.top-height-8:a.bottom+8,vTop+vHeight-height-8));
   setPosition({left,top,width,'--tempo-tail-x':`${Math.max(12,Math.min(width-12,a.left+a.width/2-left))}px`,'--tempo-tail-top':above?'100%':'0%'});
  };
  place();const observer=new ResizeObserver(place);observer.observe(anchor.current);observer.observe(popup.current);
  window.addEventListener('resize',place);viewport?.addEventListener('resize',place);viewport?.addEventListener('scroll',place);dialog.addEventListener('scroll',place,true);
  return()=>{observer.disconnect();window.removeEventListener('resize',place);viewport?.removeEventListener('resize',place);viewport?.removeEventListener('scroll',place);dialog.removeEventListener('scroll',place,true);};
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const outside=e=>{if(!anchor.current.contains(e.target)&&!popup.current?.contains(e.target))setOpen(false);};
  document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);
 },[open]);
 const finish=()=>{if(document.activeElement===input.current)input.current.blur();else onCommit();setOpen(false);};
 const keyDown=e=>{
  e.stopPropagation();
  if(e.key==='Escape'){e.preventDefault();skipBlur.current=document.activeElement===input.current;onCancel();input.current.blur();setOpen(false);}
  else if(e.key==='Enter'&&e.target===input.current){e.preventDefault();finish();}
  else if(e.key==='Tab'&&!e.shiftKey&&e.target===input.current&&open){e.preventDefault();popup.current.querySelector('button')?.focus();}
 };
 const blur=e=>{
  if(e.target===input.current){if(skipBlur.current)skipBlur.current=false;else onCommit();}
  if(!anchor.current.contains(e.relatedTarget)&&!popup.current?.contains(e.relatedTarget))setOpen(false);
 };
 return <div ref={anchor} className="editorTempo mobileEditorTempo" onKeyDown={keyDown} onBlur={blur}>
  <input ref={input} aria-label={t('etudes.scorePlaybackBpm')} aria-expanded={open} aria-controls={open?id:undefined} inputMode="numeric" type="number" min="30" max="240" value={value} onFocus={e=>{setOpen(true);e.currentTarget.scrollIntoView({block:'nearest'});}} onClick={()=>setOpen(true)} onChange={e=>onChange(e.target.value)}/>
  {open?<button type="button" aria-label={t('etudes.confirmBpm')} onPointerDown={e=>e.preventDefault()} onClick={finish}><Check size={20}/></button>:<span onClick={()=>input.current.focus()}>BPM</span>}
  {open&&createPortal(<div ref={popup} id={id} role="group" aria-label={t('etudes.scorePlaybackBpm')} className="mobileTempoSteps" style={position??{visibility:'hidden'}}>
   {STEPS.map(([delta,label,message])=><button key={delta} type="button" aria-label={t(message)} onPointerDown={e=>e.preventDefault()} onClick={()=>onStep(delta)}>{label}</button>)}
  </div>,anchor.current.closest('dialog'))}
 </div>;
}
