import { formatMessage } from "./../i18n/core.js";
import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {MobileLibraryTools,DesktopLibraryTools} from './LibraryChrome.jsx';
import {Folder,ChevronLeft,ChevronRight,MoreVertical,Plus} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import PdfLibraryCard from './PdfLibraryCard.jsx';
import {loadScoreFolders,updateScoreFolders,scoreFileKey,SCORE_FOLDERS_KEY} from './scoreFolders.js';
import './scoreFolders.css';

function read(){try{return {data:loadScoreFolders(localStorage),error:''};}catch(e){return {data:null,error:e.message};}}

function FolderDialog({action,folders,busy,onClose,onApply}){
  useLanguage();
 const ref=useRef(null),[name,setName]=useState(action.folder?.name??''),[target,setTarget]=useState('');
 useEffect(()=>{ref.current.showModal();},[]);
 const move=action.type==='move',remove=action.type==='remove',title=move?ko["pdf.moveSelectedScores"]:remove?ko["pdf.deleteFolder"]:action.type==='rename'?ko["pdf.renameFolder"]:ko["pdf.newFolder"];
 return <dialog ref={ref} className="pdfDialog" aria-label={title} onCancel={onClose}><form onSubmit={e=>{e.preventDefault();onApply({name,folderId:target});}}><h2>{title}</h2>
  {move?<><p>{action.keys.length}<Translation id="pdf.scoresMoveTo" /></p><label><Translation id="pdf.destinationFolder" /><select value={target} onChange={e=>setTarget(e.target.value)}><option value=""><Translation id="pdf.myScoresDefaultLocation" /></option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label></>:remove?<p>‘{action.folder.name}<Translation id="pdf.folderDeleteItItsScoresWillMoveToMyScoresAndWill" /></p>:<label><Translation id="pdf.folderName" /><input autoFocus required maxLength="100" value={name} onChange={e=>setName(e.target.value)}/></label>}
  {action.error&&<p role="alert">{localizeUi(action.error)}</p>}<footer><button type="button" disabled={busy} onClick={onClose}><Translation id="common.cancel" /></button><button type="submit" disabled={busy}>{move?translateUi("pdf.move"):remove?translateUi("pdf.deleteFolder"):translateUi("common.save")}</button></footer>
 </form></dialog>;
}

export default function ScoreFolderList({items,allItems,search,onSearch,sort,onSort,mobile,busy,folderId,onFolderChange,filter='all',onFilterChange,onOpen,onRename,onDelete}){
  useLanguage();
 const [store,setStore]=useState(read),[selecting,setSelecting]=useState(false),[selected,setSelected]=useState([]),[action,setAction]=useState(null),[message,setMessage]=useState('');
 const data=store.data,folders=data?.folders??[],current=folders.find(f=>f.id===folderId);
 const location=item=>data?.locations[scoreFileKey(item)]??null;
 const globalView=Boolean(search)||filter!=='all';
 const visible=items.filter(item=>(globalView||location(item)===(current?.id??null))&&(filter!=='recent'||Number.isFinite(Date.parse(item.practice)))&&(filter!=='favorites'||data?.favorites[scoreFileKey(item)]));
 if(filter==='recent')visible.sort((a,b)=>Date.parse(b.practice)-Date.parse(a.practice));
 const showFolders=!current&&!globalView,visibleFolders=showFolders?folders:[];
 const keys=new Set(allItems.map(scoreFileKey)),selection=selected.filter(key=>keys.has(key));
 useEffect(()=>{const update=e=>{if(e.key===SCORE_FOLDERS_KEY||e.key===null)setStore(read());};window.addEventListener('storage',update);return()=>window.removeEventListener('storage',update);},[]);
 const go=id=>{onFolderChange(id);setSelected([]);setSelecting(false);setMessage('');};
 const toggle=key=>setSelected(old=>old.includes(key)?old.filter(v=>v!==key):[...old,key]);
 const changeFilter=value=>{onFilterChange(value);setSelected([]);setSelecting(false);setMessage('');};
 const favorite=item=>{try{const value=!data.favorites[scoreFileKey(item)],next=updateScoreFolders(localStorage,{type:'favorite',keys:[scoreFileKey(item)],value});setStore({data:next,error:''});setMessage(value?ko["pdf.addedToFavorites"]:ko["pdf.removedFromFavorites"]);}catch(e){setMessage(formatMessage(ko["pdf.couldnTSaveValue1"], { value1: e.message }));}};
 const apply=values=>{try{const next=updateScoreFolders(localStorage,{...values,type:action.type,id:action.folder?.id??crypto.randomUUID(),keys:action.keys});setStore({data:next,error:''});if(action.type==='move'){setSelected([]);setSelecting(false);setMessage(formatMessage(ko["pdf.movedValue1Scores"], { value1: action.keys.length }));}else setMessage(action.type==='remove'?ko["pdf.folderDeletedScoresAreKeptInTheDefaultLocation"]:ko["pdf.folderSaved"]);setAction(null);}catch(e){setAction(old=>({...old,error:formatMessage(ko["pdf.couldnTSaveValue1"], { value1: e.message })}));}};
 const editButton=<button type="button" disabled={!data||busy} aria-label={selecting?translateUi("pdf.doneEditingList"):translateUi("pdf.editList")} aria-pressed={selecting} onClick={()=>{setSelecting(v=>!v);setSelected([]);}}>{selecting?translateUi("common.done"):translateUi("common.edit")}</button>;
 const tools={search,onSearch,sort,onSort,filter,onFilter:changeFilter};
 return <section className={`libraryBrowser ${mobile?'libraryBrowser--mobile':'libraryBrowser--desktop'}`}>
  {mobile?<MobileLibraryTools {...tools}/>:<DesktopLibraryTools {...tools}/>}
  {current&&<nav className="libraryCrumb" aria-label={translateUi("pdf.myScoresLocation")}><button type="button" onClick={()=>go(null)}><ChevronLeft size={20}/><Translation id="app.myScores" /></button><span>/</span><Folder size={19}/><strong title={current.name}>{current.name}</strong></nav>}
  {globalView&&current&&<p className="libraryNotice"><Translation id="pdf.searchAllFolders" /></p>}
  {store.error&&<p role="alert">{localizeUi(store.error)}<Translation id="pdf.folderEditingIsTemporarilyUnavailable" /></p>}{message&&<p className="libraryNotice" role="status">{localizeUi(message)}</p>}
  <div className="librarySectionHeading"><h2>{showFolders?translateUi("app.myScores"):translateUi("components.scores")} <span>{visibleFolders.length+visible.length}</span></h2><div className="libraryHeadingActions">{showFolders&&<button type="button" disabled={!data||busy} onClick={()=>setAction({type:'create'})}><Plus size={17}/><Translation id="pdf.newFolder" /></button>}{editButton}</div></div>
  {selecting&&<div className="libraryManage"><button type="button" onClick={()=>setSelected(visible.map(scoreFileKey))}><Translation id="app.selectAll" /></button><button type="button" disabled={!selection.length} onClick={()=>setAction({type:'move',keys:selection})}><Translation id="pdf.moveToFolder" />{selection.length})</button>{current&&<details className="libraryMenu"><summary aria-label={translateUi("pdf.manageCurrentFolder")}><MoreVertical size={20}/></summary><div><button type="button" disabled={busy} onClick={e=>{e.currentTarget.closest("details").open=false;setAction({type:"remove",folder:current});}}><Translation id="pdf.deleteThisFolder" /></button></div></details>}</div>}
  <ul className="libraryGroup libraryScores" aria-label={translateUi("pdf.myScoresList")}>{visibleFolders.map(folder=><li key={`folder:${folder.id}`} data-document-type="folder">
    <button type="button" className="libraryFolderOpen" aria-label={translateUi("pdf.openValue1Folder", { value1: folder.name })} onClick={()=>go(folder.id)}><span className="libraryDocumentIcon libraryFolderIcon"><Folder size={25}/></span><strong title={folder.name}>{folder.name}</strong><small>{allItems.filter(item=>location(item)===folder.id).length}<Translation id="app.items" /></small>{!selecting&&<ChevronRight size={20}/>}</button>
    <details className="libraryMenu"><summary aria-label={translateUi("pdf.manageValue1Folder", { value1: folder.name })}><MoreVertical size={20}/></summary><div><button type="button" onClick={e=>{e.currentTarget.closest('details').open=false;setAction({type:'rename',folder});}}><Translation id="audioStudio.rename" /></button><button type="button" onClick={e=>{e.currentTarget.closest('details').open=false;setAction({type:'remove',folder});}}><Translation id="pdf.deleteFolder" /></button></div></details>
   </li>)}{visible.map(item=><PdfLibraryCard key={scoreFileKey(item)} item={item} mobile={mobile} busy={busy} selecting={selecting} selected={selection.includes(scoreFileKey(item))} favorite={Boolean(data?.favorites[scoreFileKey(item)])} onFavorite={data?()=>favorite(item):undefined} onToggle={()=>toggle(scoreFileKey(item))} onOpen={()=>onOpen(item)} onRename={()=>onRename(item)} onDelete={()=>onDelete(item)}/>)}</ul>
  {!visible.length&&!visibleFolders.length&&<div className="libraryEmpty"><p>{search?translateUi("etudes.noResultsFound"):filter==='favorites'?translateUi("pdf.noFavoriteScoresAddThemInEdit"):filter==='recent'?translateUi("pdf.noRecentlyPracticedScores"):!current&&!allItems.length?translateUi("pdf.noSavedScoresYet"):translateUi("pdf.noScoresInThisLocation")}</p>{!search&&filter==='all'&&!allItems.length&&<small><Translation id="pdf.importAPdfOrCreateAScore" /></small>}</div>}
  {action&&<FolderDialog action={action} folders={folders} busy={busy} onClose={()=>setAction(null)} onApply={apply}/>}
 </section>;
}
