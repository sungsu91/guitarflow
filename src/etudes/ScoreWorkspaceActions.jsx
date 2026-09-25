import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {ChevronDown,Plus,Pencil,FilePlus2} from 'lucide-react';
import {t} from '../i18n/core.js';
import {useLanguage} from '../i18n/react.jsx';
import './scoreWorkspaceActions.css';

export default function ScoreWorkspaceActions({mobile,onCreate,onEdit,onImport,canEdit=true,importBusy=false}){
 useLanguage();
 const id=useId(),root=useRef(null),trigger=useRef(null),menu=useRef(null);
 const [open,setOpen]=useState(false),[position,setPosition]=useState(null);
 const close=(focus=false)=>{setOpen(false);if(focus)trigger.current?.focus({preventScroll:true});};
 useEffect(()=>{if(!open)return;const outside=e=>{if(!root.current?.contains(e.target))close();};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 useLayoutEffect(()=>{if(!open)return;const place=()=>{const r=trigger.current.getBoundingClientRect(),v=window.visualViewport,left=v?.offsetLeft??0,top=v?.offsetTop??0,width=Math.min(180,(v?.width??innerWidth)-16),bottom=top+(v?.height??innerHeight),height=menu.current.offsetHeight;setPosition({width,left:Math.max(left+8,r.right-width),top:r.bottom+height+6<=bottom?r.bottom+6:Math.max(top+8,r.top-height-6)});};place();const focusFrame=requestAnimationFrame(()=>menu.current?.querySelector('button:not(:disabled)')?.focus({preventScroll:true}));window.addEventListener('resize',place);window.addEventListener('scroll',place,true);return()=>{cancelAnimationFrame(focusFrame);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};},[open]);
 const run=action=>{close(true);action();};
 const keys=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}else if(e.key==='Tab')close();else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const buttons=[...menu.current.querySelectorAll('button:not(:disabled)')],at=buttons.indexOf(document.activeElement);buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(at+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}};
 return <div ref={root} onKeyDown={e=>{if(open)keys(e);}} className={'scoreWorkspaceActions '+(mobile?'scoreWorkspaceActions--mobile':'scoreWorkspaceActions--desktop')}>
 <button ref={trigger} className="scoreWorkspaceActionTrigger" type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(v=>!v)} onKeyDown={e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();e.stopPropagation();setOpen(true);}}}>{t('score.actions')}<ChevronDown size={14}/></button>
 {open&&<div ref={menu} id={id} className="scoreWorkspaceActionMenu" role="menu" aria-label={t('score.actions')} style={position??{visibility:'hidden'}}>
 <button type="button" role="menuitem" onClick={()=>run(onCreate)}><Plus size={17}/>{t('score.make')}</button>
 <button type="button" role="menuitem" disabled={!canEdit} onClick={()=>run(onEdit)}><Pencil size={17}/>{t('common.edit')}</button>
 {onImport&&<button type="button" role="menuitem" disabled={importBusy} onClick={()=>run(onImport)}><FilePlus2 size={17}/>{t('app.load')}</button>}
 </div>}
 </div>;
}
