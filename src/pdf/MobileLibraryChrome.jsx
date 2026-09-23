import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {useEffect,useRef,useState} from 'react';
import {Menu,Search,ChevronDown,ChevronRight,Cloud,Music} from 'lucide-react';
import './mobileLibraryChrome.css';

export function MobileLibraryHeader({onMenu,onExit}){
  useLanguage();
 return <header className="mobileLibraryHud"><button type="button" className="mobileLibraryBrand" aria-label={translateUi("pdf.fretivaLabHome")} onClick={onExit}><Music size={27} strokeWidth={2.4} aria-hidden="true"/><strong><Translation id="originalUi.fretivaLab" /></strong></button><button type="button" onClick={onMenu} aria-label={translateUi("pdf.fullMenu")}><Menu size={27} strokeWidth={2.2}/><span><Translation id="app.menu" /></span></button></header>;
}
const sorts=[['practice',ko["pdf.recentPractice"]],['added',ko["pdf.recentlyAdded"]],['title',ko["pdf.title"]],['bpm',ko["pdf.bpm"]]];
export function MobileLibrarySearch({search,onSearch,sort,onSort}){
  useLanguage();
 const [open,setOpen]=useState(false),root=useRef(null),trigger=useRef(null);
 useEffect(()=>{const close=e=>{if(!root.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',close,true);return()=>document.removeEventListener('pointerdown',close,true);},[]);
 return <div className="mobileLibrarySearch" ref={root}>
  <label><Search size={23} strokeWidth={1.8}/><input aria-label={translateUi("etudes.searchScores")} placeholder={translateUi("pdf.searchTitleOrArtist")} value={search} onChange={e=>onSearch(e.target.value)}/></label>
  <button ref={trigger} type="button" aria-label={translateUi("pdf.sortScores")} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{localizeUi(sorts.find(s=>s[0]===sort)?.[1])}<ChevronDown size={16}/></button>
  {open&&<div className="mobileLibrarySortMenu" role="group" aria-label={translateUi("pdf.chooseScoreOrder")} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);trigger.current.focus();}}}>{sorts.map(([value,label])=><button type="button" key={value} aria-pressed={sort===value} onClick={()=>{onSort(value);setOpen(false);trigger.current.focus();}}>{localizeUi(label)}</button>)}</div>}
 </div>;
}
export function MobileLibraryStorage({children}){
 const [open,setOpen]=useState(false);
 return <><button type="button" className="mobileLibraryStorage" onClick={()=>setOpen(true)}><Cloud size={26} strokeWidth={1.8}/><span><Translation id="app.localStorageAndBackups" /></span><ChevronRight size={20} strokeWidth={1.8}/></button>{open&&<StorageSheet onClose={()=>setOpen(false)}>{children}</StorageSheet>}</>;
}
function StorageSheet({children,onClose}){
  useLanguage();
 const ref=useRef(null);
 useEffect(()=>{ref.current.showModal();},[]);
 return <dialog ref={ref} className="pdfDialog mobileLibraryStorageDialog" aria-label={translateUi("pdf.deviceStorageAndBackup")} onCancel={onClose}><header><h2><Translation id="app.localStorageAndBackups" /></h2><button type="button" onClick={onClose}><Translation id="pdf.close" /></button></header><div>{children}</div></dialog>;
}
