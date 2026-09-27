import React,{useLayoutEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {lockDocumentScroll} from '../ui/modalScrollLock.js';
import {useLanguage} from '../i18n/react.jsx';
import './printPreview.css';
import './a4Print.css';

export default function PrintPreviewDialog({mobile,onClose,children}) {
 const language=useLanguage(),ref=useRef(),close=useRef(onClose),requestClose=useRef();
 close.current=onClose;
 useLayoutEffect(()=>{
  const node=ref.current,previous=document.activeElement,unlock=lockDocumentScroll();
  const token=crypto.randomUUID();let active=true;
  history.pushState({...history.state,printPreview:token},'',location.href);
  const back=event=>{
   if(!active||history.state?.printPreview===token)return;
   event.stopImmediatePropagation();active=false;close.current();
  };
  window.addEventListener('popstate',back,true);
  requestClose.current=()=>{if(active&&history.state?.printPreview===token)history.back();else close.current();};
  node.showModal();
  return()=>{
   active=false;window.removeEventListener('popstate',back,true);node.close();unlock();
   previous?.focus({preventScroll:true});
   if(history.state?.printPreview===token){const state={...history.state};delete state.printPreview;history.replaceState(state,'');}
  };
 },[]);
 const title=mobile?(language==='ko'?'PDF 미리보기':'PDF preview'):(language==='ko'?'A4 인쇄 · PDF 미리보기':'A4 print · PDF preview');
 return createPortal(<dialog ref={ref} className="rt-overlay print-preview-overlay" data-layout={mobile?'mobile':'desktop'} aria-label={title} onCancel={event=>{event.preventDefault();requestClose.current();}} onKeyDown={event=>event.stopPropagation()}>
  <section className="rt-dialog"><header><h2>{title}</h2><button type="button" aria-label={language==='ko'?'닫기':'Close'} onClick={()=>requestClose.current()}>×</button></header><div className="rt-dialog-body">{children}</div></section>
 </dialog>,document.body);
}
