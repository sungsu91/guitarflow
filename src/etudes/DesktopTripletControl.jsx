import {useCallback,useRef,useState} from 'react';
import {t} from '../i18n/core.js';
import {Translation,useLanguage} from '../i18n/react.jsx';
import {EditorPopover} from './EditorSettings.jsx';

export default function DesktopTripletControl({onRemove}){
 useLanguage();
 const anchor=useRef(null),[open,setOpen]=useState(false);
 const close=useCallback((focus=false)=>{setOpen(false);if(focus)anchor.current?.focus({preventScroll:true});},[]);
 return <><button ref={anchor} type="button" aria-label={t('editor.editTriplet')} title={t('editor.editTriplet')} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>3 ▾</button>{open&&<EditorPopover anchor={anchor.current} onClose={close} label={t('editor.editTriplet')}><header><strong><Translation id="editor.editTriplet" /></strong><button type="button" aria-label={t('common.close')} onClick={()=>close(true)}>×</button></header><button type="button" onClick={()=>{onRemove(false);close(true);}}><Translation id="etudes.ungroup" /></button><button type="button" onClick={()=>{onRemove(true);close(true);}}><Translation id="etudes.deleteGroup" /></button></EditorPopover>}</>;
}
