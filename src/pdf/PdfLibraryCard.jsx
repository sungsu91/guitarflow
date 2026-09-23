import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {FileText,FileMusic,ChevronRight,MoreVertical,Check} from 'lucide-react';
import {useEffect,useRef} from 'react';

// Both layouts use the same document identity and actions.
export default function PdfLibraryCard({item,mobile,busy,onOpen,onRename,onDelete,selecting=false,selected=false,onToggle,favorite=false,onFavorite}){
  useLanguage();
 const menu=useRef(null);
 const rawDate=item.record.updatedAt,date=rawDate&&Number.isFinite(Date.parse(rawDate))?new Date(rawDate).toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}):'—';
 useEffect(()=>{const close=e=>{if(menu.current&&!menu.current.contains(e.target))menu.current.open=false;};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
 const details=[item.type==='pdf'?'PDF':translateUi("pdf.editableScore2"),Number.isFinite(item.count)&&item.count>0?`${item.count}${item.type==='pdf'?translateUi("pdf.page"):translateUi("app.bar")}`:null,Number.isFinite(item.bpm)&&item.bpm>0?`${item.bpm} BPM`:null,item.unreadable?translateUi("pdf.readError"):null].filter(Boolean).join(' · ');
 const symbol=selecting?<span className="librarySelection" aria-hidden="true">{selected&&<Check size={18}/>}</span>:<span className="libraryDocumentIcon" aria-hidden="true">{item.type==='pdf'?<FileText size={25}/>:<FileMusic size={25}/>}</span>;
 const name=<span className="libraryScoreName"><strong>{item.title}</strong><small>{details}</small>{item.position&&<small><Translation id="pdf.recent" />{item.position}</small>}</span>;
 const buttonProps={type:'button',disabled:busy||(!selecting&&item.unreadable),'aria-pressed':selecting?selected:undefined,'aria-label':`${item.title} ${selecting?translateUi("app.select"):translateUi("common.open")}`,onClick:selecting?onToggle:onOpen};
 return <li className={`libraryScoreRow ${mobile?'libraryScoreRow--mobile':'libraryScoreRow--desktop'}`} data-document-type={item.type} data-selected={selected||undefined}>
  {mobile?<button {...buttonProps} className="libraryScoreOpen">{symbol}{name}{!selecting&&<ChevronRight size={20}/>}</button>:<button {...buttonProps} className="libraryScoreOpen libraryScoreOpen--desktop">{symbol}{name}<time dateTime={rawDate||undefined}>{date}</time>{!selecting&&<ChevronRight size={20}/>}</button>}
  <details ref={menu} className="libraryMenu" onKeyDown={e=>{if(e.key==='Escape'){menu.current.open=false;menu.current.querySelector('summary').focus();}}}>
   <summary aria-label={translateUi("app.manageValue1", { value1: item.title })}><MoreVertical size={20}/></summary>
   <div>{onFavorite&&<button type="button" disabled={busy} onClick={()=>{menu.current.open=false;onFavorite();}}>{favorite?translateUi("etudes.removeFromFavorites"):translateUi("etudes.addToFavorites")}</button>}<button type="button" disabled={busy} onClick={()=>{menu.current.open=false;onRename();}}><Translation id="audioStudio.rename" /></button><button type="button" disabled={busy} onClick={()=>{menu.current.open=false;onDelete();}}><Translation id="common.delete" /></button></div>
  </details>
 </li>;
}
