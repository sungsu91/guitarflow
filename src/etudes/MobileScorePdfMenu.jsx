import {useEffect,useId,useRef,useState} from 'react';
import {t} from '../i18n/core.js';
import {useLanguage} from '../i18n/react.jsx';
import './mobileScorePdfMenu.css';

export default function MobileScorePdfMenu({onImport,onSave,canSave,onShow}){
  useLanguage();
  const [open,setOpen]=useState(false),root=useRef(null),trigger=useRef(null),id=useId();
  useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};
    document.addEventListener('pointerdown',outside);
    return()=>document.removeEventListener('pointerdown',outside);
  },[open]);
  const show=()=>{onShow();setOpen(true);};
  const focusItem=last=>requestAnimationFrame(()=>{const items=root.current?.querySelectorAll('[role="menuitem"]:not(:disabled)');(last?items?.[items.length-1]:items?.[0])?.focus();});
  return <div ref={root} className="mobileScorePdfMenu" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{
    e.stopPropagation();
    if(e.key==='Escape'&&open){e.preventDefault();setOpen(false);trigger.current.focus();}
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
      e.preventDefault();
      if(!open){show();focusItem(e.key==='ArrowUp'||e.key==='End');return;}
      const items=[...root.current.querySelectorAll('[role="menuitem"]:not(:disabled)')],at=items.indexOf(document.activeElement);
      const next=e.key==='Home'?0:e.key==='End'?items.length-1:(at+(e.key==='ArrowUp'?-1:1)+items.length)%items.length;
      items[next]?.focus();
    }
  }}>
    <button ref={trigger} type="button" aria-label={t('editor.pdfMenu')} aria-haspopup="menu" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>{if(open)setOpen(false);else show();}}>PDF <span aria-hidden="true">▾</span></button>
    {open&&<div id={id} role="menu" aria-label={t('editor.pdfMenu')} className="mobileScorePdfChoices">
      <button type="button" role="menuitem" onClick={()=>{setOpen(false);onImport();}}>{t('editor.pdfImportConvert')}</button>
      <button type="button" role="menuitem" disabled={!canSave} onClick={()=>{setOpen(false);onSave();}}>{t('etudes.savePdf')}</button>
    </div>}
  </div>;
}
