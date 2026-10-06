import {useCallback,useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ChevronDown,SlidersHorizontal} from 'lucide-react';
import {t} from '../i18n/core.js';
import {useLanguage} from '../i18n/react.jsx';

export default function MobilePdfMeasureSettings({hasBars,disabled,busy,onAnalyse,onReset,compact=false}){
 useLanguage();
 const id=useId(),trigger=useRef(null),menu=useRef(null);
 const [open,setOpen]=useState(false),[position,setPosition]=useState(null);
 const close=useCallback((focus=false)=>{setOpen(false);if(focus)trigger.current?.focus({preventScroll:true});},[]);
 useEffect(()=>{
  if(!open)return;
  const outside=e=>{if(!trigger.current?.contains(e.target)&&!menu.current?.contains(e.target))close();};
  document.addEventListener('pointerdown',outside);
  return()=>document.removeEventListener('pointerdown',outside);
 },[open,close]);
 useLayoutEffect(()=>{
  if(!open)return;
  const place=()=>{
   const r=trigger.current.getBoundingClientRect(),v=window.visualViewport;
   const left=v?.offsetLeft??0,top=v?.offsetTop??0,width=Math.min(200,(v?.width??innerWidth)-16);
   const bottom=top+(v?.height??innerHeight),height=menu.current.offsetHeight;
   setPosition({width,left:Math.max(left+8,Math.min(r.left,left+(v?.width??innerWidth)-width-8)),top:r.bottom+height+6<=bottom?r.bottom+6:Math.max(top+8,r.top-height-6)});
  };
  place();const frame=requestAnimationFrame(()=>menu.current?.querySelector('button:not(:disabled)')?.focus({preventScroll:true}));
  window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
 },[open]);
 const keys=e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}
  else if(e.key==='Tab')close();
  else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
   e.preventDefault();const buttons=[...menu.current.querySelectorAll('button:not(:disabled)')],at=buttons.indexOf(document.activeElement);
   buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(at+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
  }
 };
 const run=action=>{close(true);action();};
 return <div className={'pdfMeasureSettings'+(compact?' pdfMeasureSettings--compact':'')}>
  <button ref={trigger} type="button" className="pdfMeasureSettingsTrigger" aria-label={t('pdf.measureSettings')} title={t('pdf.measureSettings')} aria-haspopup="menu" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(v=>!v)} onKeyDown={e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();setOpen(true);}}}>{compact?<SlidersHorizontal size={18} aria-hidden="true"/>:<>{t('pdf.measureSettings')}<ChevronDown size={14} aria-hidden="true"/></>}</button>
  {open&&createPortal(<div ref={menu} id={id} className="pdfMeasureSettingsMenu" role="menu" aria-label={t('pdf.measureSettings')} style={position??{visibility:'hidden'}} onKeyDown={keys}>
   <button type="button" role="menuitem" disabled={disabled||busy} onClick={()=>run(onAnalyse)}>{t('pdf.autoDetect')}</button>
   <button type="button" role="menuitem" disabled={disabled||!hasBars} onClick={()=>run(onReset)}>{t('pdf.resetMeasureAreas')}</button>
  </div>,trigger.current?.closest('.app')??document.body)}
 </div>;
}
