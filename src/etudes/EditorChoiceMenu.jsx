import { useLanguage } from "./../i18n/react.jsx";
import { localizeUi } from "./../i18n/core.js";
import { Translation } from "./../i18n/react.jsx";
import {useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './editorChoiceMenu.css';

// A bounded two-column list in the editor's top layer, including nested settings.
export default function EditorChoiceMenu({label,value,onChange,options,disabled=false,className='',direction='auto',triggerLabel,selectedValues}){
  useLanguage();
 const id=useId(),trigger=useRef(null),menu=useRef(null);
 const [open,setOpen]=useState(false),[position,setPosition]=useState(null),[submenu,setSubmenu]=useState(null);
 const choices=submenu?.options??options;
 const selected=options.find(option=>String(option.value)===String(value));
 const close=(focus=false)=>{setOpen(false);setSubmenu(null);if(focus)trigger.current?.focus();};
 useLayoutEffect(()=>{
  if(!open||disabled)return;
  const button=trigger.current,node=menu.current,viewport=window.visualViewport;
  const place=()=>{
   const rect=button.getBoundingClientRect(),left=(viewport?.offsetLeft??0)+8,top=(viewport?.offsetTop??0)+8;
   const right=left+(viewport?.width??innerWidth)-16,bottom=top+(viewport?.height??innerHeight)-16;
   const width=Math.min(320,Math.max(240,rect.width),right-left),above=Math.max(0,rect.top-top-6),below=Math.max(0,bottom-rect.bottom-6);
   const up=direction==='up'||(below<Math.min(300,node.scrollHeight)&&above>below);
   const height=Math.max(0,Math.min(300,up?above:below));
   setPosition({left:Math.max(left,Math.min(rect.left,right-width)),top:up?Math.max(top,rect.top-6-Math.min(node.scrollHeight,height)):Math.min(bottom-height,rect.bottom+6),width,maxHeight:height});
  };
  place();(node.querySelector('[aria-selected="true"]')??node.querySelector('[role="option"]'))?.focus({preventScroll:true});
  const outside=e=>{if(!node.contains(e.target)&&!button.contains(e.target))close();};
  const resize=new ResizeObserver(place);resize.observe(node);
  document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);viewport?.addEventListener('resize',place);viewport?.addEventListener('scroll',place);
  return()=>{resize.disconnect();document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);viewport?.removeEventListener('resize',place);viewport?.removeEventListener('scroll',place);};
 },[open,disabled,direction,submenu]);
 const keyDown=e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);return;}
  if(e.key==='Tab'){close();return;}
  if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();e.stopPropagation();
  const buttons=[...menu.current.querySelectorAll('[role="option"]')],current=buttons.indexOf(document.activeElement);
  const offset=e.key==='ArrowDown'?2:e.key==='ArrowUp'?-2:e.key==='ArrowLeft'?-1:1;
  const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,current+offset));
  buttons[next]?.focus();
 };
 const host=trigger.current?.closest('.editorSettingsPopover')??trigger.current?.closest('dialog');
 return <><button ref={trigger} type="button" role="combobox" aria-label={localizeUi(label)} aria-expanded={open&&!disabled} aria-controls={open?id:undefined} aria-haspopup="listbox" disabled={disabled} className={`editorChoiceTrigger ${className}`} onClick={()=>setOpen(v=>!v)} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);}}}><span>{localizeUi(triggerLabel??selected?.label??value)}</span><span aria-hidden="true">{open&&direction==='up'?'▴':'▾'}</span></button>
 {open&&!disabled&&host&&createPortal(<div ref={menu} id={id} role="listbox" aria-multiselectable={selectedValues?true:undefined} aria-label={localizeUi(label)} className="editorChoiceMenu" style={position??{visibility:'hidden'}} onKeyDown={keyDown}>{submenu&&<button type="button" role="option" aria-selected="false" onClick={()=>setSubmenu(null)}><Translation id="etudes.techniques" /></button>}{choices.map(option=><button type="button" role="option" aria-selected={selectedValues?selectedValues.includes(option.value):String(option.value)===String(value)} key={option.value} onClick={()=>{if(option.options){setSubmenu(option);return;}close(true);onChange(option.value);}}>{localizeUi(option.label)}</button>)}</div>,host)}</>;
}
