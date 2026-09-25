import PickerManageDialog from './PickerManageDialog.jsx';
import DifficultyStars from './DifficultyStars.jsx';
import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,FolderOpen,FolderPlus,Check,Star,X,Search} from 'lucide-react';
import './etudePicker.css';

export default function EtudePicker({model,mobile}) {
  useLanguage();
 const [tab,setTab]=useState(null),[query,setQuery]=useState(''),[category,setCategory]=useState(ko["app.all"]),[picked,setPicked]=useState(null);
 const [managing,setManaging]=useState(false),[selection,setSelection]=useState([]),[action,setAction]=useState(null),[manageError,setManageError]=useState('');
 const folders=model.folderData?.folders??[],folder=folders.find(f=>category===`folder:${f.id}`);
 const dialog=useRef(null),opener=useRef(null);
 const types=[...new Set(model.list.map(e=>e.type))];
 const entries=[...model.list.map(e=>({key:`score:etude:${e.id}`,id:e.id,title:e.english??e.title,type:e.type,score:e,saved:false})),...model.savedScores.map(r=>({key:`score:${r.document.id}`,id:r.document.id,title:r.document.title,type:ko["app.savedScores"],saved:true})),...(model.pdfScores??[]).map(r=>({key:`pdf:${r.id}`,id:r.id,title:r.title,type:'PDF',saved:true,pdf:r}))];
 const current=entries.find(e=>e.saved?e.id===model.savedId:!model.savedId&&e.id===model.selected.id);
 const open=(next,event)=>{opener.current=event.currentTarget;setManaging(false);setSelection([]);setManageError('');setQuery('');setCategory(ko["app.all"]);setPicked(next==='saved'&&!current?.saved?null:current?.key??null);setTab(next);};
 const close=()=>{setAction(null);setTab(null);opener.current?.focus({preventScroll:true});};
 useEffect(()=>{if(tab&&!dialog.current.open)dialog.current.showModal();},[tab]);
 const visible=entries.filter(e=>(tab==='saved'?e.saved:!e.saved)&&(category===ko["app.all"]||(folder?model.folderData?.locations[e.key]===folder.id:category===ko["etudes.favorites"]?model.favorites[e.key]:e.type===category))&&`${e.title} ${e.type}`.toLowerCase().includes(query.trim().toLowerCase()));
 const selected=entries.filter(e=>selection.includes(e.key)),keys=selected.map(e=>e.key);
 const toggle=key=>setSelection(old=>old.includes(key)?old.filter(k=>k!==key):[...old,key]);
 const organize=operation=>{try{model.organize(operation);setManageError('');}catch(e){setManageError(e.message);}};
 const applyAction=async action=>{
  if(action.type==='rename-score'||action.type==='delete-score'){await model.manageScore(action.type==='rename-score'?'rename':'delete',action.entry,action.name);if(action.type==='delete-score'){setPicked(null);setSelection([]);}}
  else {const id=action.id??crypto.randomUUID();model.organize({...action,id});if(action.type==='create')setCategory('folder:'+id);if(action.type==='remove')setCategory(ko['app.all']);if(action.type==='move')setSelection([]);}
 };
 const chosen=entries.find(e=>e.key===picked);
 const activeSource=current?(current.saved?'saved':'types'):null;
 return <><div className="etudeQuickSelects">{[['types',ko["app.chooseAPracticeCategory"],model.savedId?ko["etudes.practiceCategories"]:model.selected.type],['saved',ko["app.savedScores"],model.savedId?current?.title:ko["etudes.chooseScore"]]].map(([key,label,value])=>{
 const active=activeSource===key;
 return <div className="etudeSelect" key={key}><span>{localizeUi(label)}</span><button type="button" className={"etudePickerTrigger"+(active?" is-current-score":"")} aria-label={localizeUi(label)} aria-current={active?'true':undefined} aria-haspopup="dialog" title={active?current.title:undefined} onClick={e=>open(key,e)}><span>{active?current.title:localizeUi(value)}</span><FolderOpen size={18} aria-hidden="true"/></button></div>;
 })}</div>
 {tab&&<dialog ref={dialog} className={`etudePickerDialog ${mobile?'is-mobile':'is-desktop'}`} aria-label={translateUi("etudes.chooseScore")} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}}>
 <header><h2><Translation id="etudes.chooseScore" /></h2><button type="button" className="etudePickerEdit" aria-label={translateUi("score.organize")} aria-pressed={managing} disabled={!model.folderData} onClick={()=>{setManaging(v=>!v);setSelection([]);}}><Translation id={managing?"common.done":"common.edit"}/></button><button type="button" aria-label={translateUi("etudes.closeScorePicker")} onClick={close}><X size={22}/></button></header>
 <nav className="etudePickerTabs" aria-label={translateUi("etudes.scoreList")}>{[['types',ko["app.chooseAPracticeCategory"]],['saved',ko["app.savedScores"]]].map(([key,label])=><button key={key} type="button" aria-pressed={tab===key} onClick={()=>{setTab(key);setSelection([]);setCategory(ko["app.all"]);setPicked(null);}}>{localizeUi(label)}</button>)}</nav>
 <label className="etudePickerSearch"><Search size={16}/><input autoFocus type="search" aria-label={translateUi("etudes.searchScores")} placeholder={translateUi("etudes.searchScores")} value={query} onChange={e=>setQuery(e.target.value)}/></label>
 <nav className="etudePickerCategories" aria-label={translateUi("etudes.filterScores")}>
 {[ko["app.all"],ko["etudes.favorites"]].map(type=><button type="button" key={type} aria-pressed={category===type} onClick={()=>{setCategory(type);setPicked(null);setSelection([]);}}>{localizeUi(type)}</button>)}
 {folders.map(f=><button type="button" key={f.id} aria-pressed={folder?.id===f.id} onClick={()=>{setCategory('folder:'+f.id);setPicked(null);setSelection([]);}}><FolderOpen size={14}/>{f.name}</button>)}
 <button type="button" disabled={!model.folderData} onClick={()=>setAction({type:'create'})}><FolderPlus size={14}/><Translation id="pdf.newFolder"/></button>
 {(tab==='types'?types:[]).map(type=><button type="button" key={type} aria-pressed={category===type} onClick={()=>{setCategory(type);setPicked(null);setSelection([]);}}>{localizeUi(type)}</button>)}
 </nav>
 {managing&&<div className="etudePickerManage" role="group" aria-label={translateUi("score.organize")}>
 <button type="button" onClick={()=>setSelection(visible.map(e=>e.key))}><Translation id="app.selectAll"/></button>
 <button type="button" disabled={!keys.length} onClick={()=>setAction({type:'move',keys})}><Translation id="score.moveFolder"/> ({keys.length})</button>
 <button type="button" disabled={!keys.length} onClick={()=>organize({type:'favorite',keys,value:!selected.every(e=>model.favorites[e.key])})}><Star size={14}/><Translation id="etudes.favorites"/>{keys.length?(selected.every(e=>model.favorites[e.key])?' −':' +'):''}</button>
 {selected.length===1&&selected[0].saved&&<><button type="button" onClick={()=>setAction({type:'rename-score',entry:selected[0],name:selected[0].title})}><Translation id="audioStudio.rename"/></button><button type="button" onClick={()=>setAction({type:'delete-score',entry:selected[0]})}><Translation id="pdf.deleteScore"/></button></>}
 {folder&&<><button type="button" onClick={()=>setAction({type:'rename',id:folder.id,name:folder.name})}><Translation id="pdf.renameFolder"/></button><button type="button" onClick={()=>setAction({type:'remove',id:folder.id,name:folder.name})}><Translation id="pdf.deleteFolder"/></button></>}
 </div>}
 {manageError&&<p role="alert">{manageError}</p>}
 <div className="etudePickerResults"><div className="etudePickerGrid">{visible.map(e=><button key={e.key} type="button" className="etudePickerCard" aria-pressed={managing?selection.includes(e.key):picked===e.key} onClick={()=>managing?toggle(e.key):setPicked(e.key)}><span><small>{localizeUi(e.type)}</small><strong>{e.title}</strong>{!e.saved&&<DifficultyStars score={e.score}/>}</span>{(managing?selection.includes(e.key):picked===e.key)?<Check size={16}/>:model.favorites[e.key]?<Star size={15} fill="currentColor"/>:<ChevronDown size={15}/>}</button>)}</div>{!visible.length&&<p className="etudePickerEmpty">{localizeUi(query?translateUi("etudes.noResultsFound"):category===ko["etudes.favorites"]?translateUi("etudes.tapTheStarBesideAScoreToAddItToFavorites"):translateUi("etudes.noSavedScores"))}</p>}</div>
 <footer><span>{chosen?.title??translateUi("etudes.chooseAScore")}</span><button type="button" disabled={managing||!chosen} onClick={()=>{chosen.pdf?model.selectPdf(chosen.pdf):chosen.saved?model.selectSaved(chosen.id):model.select(chosen.id);close();}}><Translation id="app.load" /></button></footer>
 </dialog>}{action&&<PickerManageDialog key={action.type+(action.id??action.entry?.id??'')} action={action} folders={folders} onApply={applyAction} onClose={()=>setAction(null)}/>}</>;
}

