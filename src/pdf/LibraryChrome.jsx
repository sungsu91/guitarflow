import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {Menu,Music,Search,ArrowDownWideNarrow,ChevronDown,ChevronRight,HardDrive} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';

export function LibraryHeader({onMenu,onExit,mobile=true}){
  useLanguage();
 return <header className="libraryHeader"><button type="button" aria-label={translateUi("pdf.fretivaLabHome")} onClick={onExit}><Music size={26}/><strong><Translation id="originalUi.fretivaLab" /></strong></button>{mobile&&<button type="button" aria-label={translateUi("pdf.fullMenu")} onClick={onMenu}><Menu size={22}/><span><Translation id="app.menu" /></span></button>}</header>;
}
const sorts=[['practice',ko["pdf.mostRecent"],ko["pdf.recentPractice"]],['added',ko["pdf.dateAdded"],ko["pdf.recentlyAdded"]],['title',ko["pdf.title"],ko["pdf.title"]],['bpm',ko["pdf.bpm"],ko["pdf.bpm"]]];
function SearchField({search,onSearch}){
  useLanguage();return <label className="librarySearch"><Search size={20}/><input aria-label={translateUi("etudes.searchScores")} placeholder={translateUi("pdf.searchTitleOrArtist")} value={search} onChange={e=>onSearch(e.target.value)}/></label>;}
function SortField({sort,onSort}){
  useLanguage();const current=sorts.find(s=>s[0]===sort)??sorts[0];return <div className="librarySort" title={translateUi("pdf.sortValue1", { value1: localizeUi(current[2]) })}><ArrowDownWideNarrow size={20}/><span>{localizeUi(current[1])}</span><ChevronDown size={16}/><select aria-label={translateUi("pdf.sortScoresValue1", { value1: localizeUi(current[2]) })} value={sort} onChange={e=>onSort(e.target.value)}>{sorts.map(([key,,label])=><option key={key} value={key}>{localizeUi(label)}</option>)}</select></div>;}
function Filters({filter,onFilter}){
  useLanguage();return <nav className="libraryFilters" aria-label={translateUi("pdf.scoreListFilter")}>{[['all',ko["app.all"]],['recent',ko["pdf.recentPractice"]],['favorites',ko["etudes.favorites"]]].map(([key,label])=><button key={key} type="button" aria-pressed={filter===key} onClick={()=>onFilter(key)}>{localizeUi(label)}</button>)}</nav>;}
export function MobileLibraryTools(props){return <div className="libraryTools libraryTools--mobile"><SearchField {...props}/><Filters {...props}/><SortField {...props}/></div>;}
export function DesktopLibraryTools(props){return <div className="libraryTools libraryTools--desktop"><SearchField {...props}/><SortField {...props}/><Filters {...props}/></div>;}
export function LibraryStorage({children,mobile}){
  useLanguage();
 const [open,setOpen]=useState(false),ref=useRef(null);
 useEffect(()=>{if(open)ref.current.showModal();},[open]);
 const heading=<><HardDrive size={27}/><span><strong><Translation id="app.localStorageAndBackups" /></strong><small><Translation id="pdf.manageScoresOnThisDevice" /></small></span><ChevronRight size={20}/></>;
 if(!mobile)return <details className="libraryStorageCard"><summary>{heading}</summary><div>{children}</div></details>;
 return <><button type="button" className="libraryStorageCard" aria-haspopup="dialog" onClick={()=>setOpen(true)}>{heading}</button>{open&&<dialog ref={ref} className="pdfDialog" aria-label={translateUi("pdf.deviceStorageAndBackup")} onCancel={()=>setOpen(false)}><header className="libraryStorageHeading"><h2><Translation id="app.localStorageAndBackups" /></h2><button type="button" onClick={()=>setOpen(false)}><Translation id="common.close" /></button></header>{children}</dialog>}</>;
}
