import {useCallback,useRef,useState} from 'react';
import {t} from '../i18n/core.js';
import {useLanguage} from '../i18n/react.jsx';
import {EditorPopover} from './EditorSettings.jsx';

// Notices open over the mobile workspace so imported scores keep their paper height.
export default function MobileScoreNotices({children,count=0}){
 useLanguage();
 const anchor=useRef(null),[open,setOpen]=useState(false);
 const close=useCallback((focus=false)=>{setOpen(false);if(focus)anchor.current?.focus({preventScroll:true});},[]);
 return <>
  <button ref={anchor} className="mobileScoreNoticesToggle" type="button" aria-label={t('editor.mobileScoreNotices')} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{t('editor.mobileScoreNotices')}{count>0&&<span className="mobileScoreNoticeCount">{count}</span>}</button>
  {open&&<EditorPopover anchor={anchor.current} onClose={close} label={t('editor.mobileScoreNotices')}>
   <header><strong>{t('editor.mobileScoreNotices')}</strong><button type="button" aria-label={t('common.close')} onClick={()=>close(true)}>×</button></header>
   <div className="mobileScoreNoticesBody">{children}</div>
  </EditorPopover>}
 </>;
}
