import {useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {MoreHorizontal} from 'lucide-react';
import {t} from '../i18n/core.js';
import {useLanguage} from '../i18n/react.jsx';
import './mobileMeasureRowMenu.css';

// These are mobile shortcuts, not limits on saved or imported score layouts.
const OPTIONS=[5,6,8];
export default function MobileMeasureRowMenu({value,onChange}){
 useLanguage();
 const [open,setOpen]=useState(false),[position,setPosition]=useState(null);
 const trigger=useRef(null),menu=useRef(null),id=useId();
 const close=(focus=false)=>{setOpen(false);if(focus)trigger.current?.focus({preventScroll:true});};
 useLayoutEffect(()=>{
  if(!open)return;
  const button=trigger.current,node=menu.current,viewport=window.visualViewport;
  const place=()=>{
   const a=button.getBoundingClientRect(),left=(viewport?.offsetLeft??0)+8,top=(viewport?.offsetTop??0)+8;
   const right=left+(viewport?.width??innerWidth)-16,bottom=top+(viewport?.height??innerHeight)-16;
   const width=Math.min(152,right-left),height=node.offsetHeight,up=a.bottom+6+height>bottom&&a.top-top>height+6;
   const x=Math.max(left,Math.min(a.right-width,right-width));
   setPosition({left:x,top:up?a.top-height-6:a.bottom+6,width,'--row-menu-origin':`${a.left+a.width/2-x}px ${up?'100%':'0'}`});
  };
  place();(node.querySelector('[aria-selected="true"]')??node.querySelector('[role="option"]'))?.focus({preventScroll:true});
  const outside=e=>{if(!node.contains(e.target)&&!button.contains(e.target))close();};
  const observer=new ResizeObserver(place);observer.observe(node);observer.observe(button);
  document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);viewport?.addEventListener('resize',place);viewport?.addEventListener('scroll',place);
  return()=>{observer.disconnect();document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);viewport?.removeEventListener('resize',place);viewport?.removeEventListener('scroll',place);};
 },[open]);
 const keyDown=e=>{
  e.stopPropagation();
  if(e.key==='Escape'){e.preventDefault();close(true);return;}
  if(e.key==='Tab'){close(true);return;}
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
  e.preventDefault();
  if(!open){setOpen(true);return;}
  const buttons=[...menu.current.querySelectorAll('[role="option"]')],at=buttons.indexOf(document.activeElement);
  const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,at+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)));
  buttons[next]?.focus({preventScroll:true});
 };
 const host=trigger.current?.closest('dialog');
 return <>
  <button ref={trigger} type="button" className="mobileMeasureRowTrigger" aria-label={t('editor.moreBarsPerLine')} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} aria-pressed={value>4} onClick={()=>setOpen(v=>!v)} onKeyDown={keyDown}>{value>4?value:<MoreHorizontal size={17} aria-hidden="true"/>}</button>
  {open&&host&&createPortal(<div ref={menu} className="mobileMeasureRowMenu" style={position??{visibility:'hidden'}} onKeyDown={keyDown}>
   <span className="mobileMeasureRowCaption" id={`${id}-label`}>{t('etudes.barsPerLine')}</span>
   <div id={id} role="listbox" aria-labelledby={`${id}-label`}>
    {OPTIONS.map(n=><button key={n} type="button" role="option" aria-label={t('etudes.value1BarsPerLine',{value1:n})} aria-selected={value===n} onClick={()=>{close(true);onChange(n);}}>{n}</button>)}
   </div>
  </div>,host)}
 </>;
}
