import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,FolderOpen,Check,Star,X,Search} from 'lucide-react';
import './etudePicker.css';

export default function EtudePicker({model,mobile}) {
  useLanguage();
 const [tab,setTab]=useState(null),[query,setQuery]=useState(''),[category,setCategory]=useState(ko["app.all"]),[picked,setPicked]=useState(null);
 const dialog=useRef(null),opener=useRef(null);
 const types=[...new Set(model.list.map(e=>e.type))];
 const entries=[...model.list.map(e=>({key:`score:etude:${e.id}`,id:e.id,title:e.english??e.title,type:e.type,saved:false})),...model.savedScores.map(r=>({key:`score:${r.document.id}`,id:r.document.id,title:r.document.title,type:ko["app.savedScores"],saved:true}))];
 const current=entries.find(e=>e.saved?e.id===model.savedId:!model.savedId&&e.id===model.selected.id);
 const open=(next,event)=>{opener.current=event.currentTarget;setQuery('');setCategory(ko["app.all"]);setPicked(next==='saved'&&!current?.saved?null:current?.key??null);setTab(next);};
 const close=()=>{setTab(null);opener.current?.focus({preventScroll:true});};
 useEffect(()=>{if(tab&&!dialog.current.open)dialog.current.showModal();},[tab]);
 const visible=entries.filter(e=>(tab==='saved'?e.saved:!e.saved)&&(category===ko["app.all"]||(category===ko["etudes.favorites"]?model.favorites[e.key]:e.type===category))&&`${e.title} ${e.type}`.toLowerCase().includes(query.trim().toLowerCase()));
 const chosen=entries.find(e=>e.key===picked);
 return <><div className="etudeQuickSelects">{[['types',ko["app.chooseAPracticeCategory"],model.savedId?ko["etudes.practiceCategories"]:model.selected.type],['saved',ko["app.savedScores"],model.savedId?current?.title:ko["etudes.chooseScore"]]].map(([key,label,value])=><div className="etudeSelect" key={key}><span>{localizeUi(label)}</span><button type="button" className="etudePickerTrigger" aria-label={localizeUi(label)} aria-haspopup="dialog" onClick={e=>open(key,e)}><span>{key==='saved'&&model.savedId?value:localizeUi(value)}</span><FolderOpen size={18} aria-hidden="true"/></button></div>)}</div>
 {tab&&<dialog ref={dialog} className={`etudePickerDialog ${mobile?'is-mobile':'is-desktop'}`} aria-label={translateUi("etudes.chooseScore")} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}}>
 <header><h2><Translation id="etudes.chooseScore" /></h2><button type="button" aria-label={translateUi("etudes.closeScorePicker")} onClick={close}><X size={22}/></button></header>
 <nav className="etudePickerTabs" aria-label={translateUi("etudes.scoreList")}>{[['types',ko["app.chooseAPracticeCategory"]],['saved',ko["app.savedScores"]]].map(([key,label])=><button key={key} type="button" aria-pressed={tab===key} onClick={()=>{setTab(key);setCategory(ko["app.all"]);setPicked(null);}}>{localizeUi(label)}</button>)}</nav>
 <label className="etudePickerSearch"><Search size={16}/><input autoFocus type="search" aria-label={translateUi("etudes.searchScores")} placeholder={translateUi("etudes.searchScores")} value={query} onChange={e=>setQuery(e.target.value)}/></label>
 {<nav className="etudePickerCategories" aria-label={translateUi("etudes.filterScores")}>{[ko["app.all"],ko["etudes.favorites"],...(tab==='types'?types:[])].map(type=><button type="button" key={type} aria-pressed={category===type} onClick={()=>{setCategory(type);setPicked(null);}}>{localizeUi(type)}</button>)}</nav>}
 <div className="etudePickerResults"><div className="etudePickerGrid">{visible.map(e=><button key={e.key} type="button" className="etudePickerCard" aria-pressed={picked===e.key} onClick={()=>setPicked(e.key)}><span><small>{localizeUi(e.type)}</small><strong>{e.title}</strong></span>{picked===e.key?<Check size={16}/>:model.favorites[e.key]?<Star size={15} fill="currentColor"/>:<ChevronDown size={15}/>}</button>)}</div>{!visible.length&&<p className="etudePickerEmpty">{localizeUi(query?translateUi("etudes.noResultsFound"):category===ko["etudes.favorites"]?translateUi("etudes.tapTheStarBesideAScoreToAddItToFavorites"):translateUi("etudes.noSavedScores"))}</p>}</div>
 <footer><span>{chosen?.title??translateUi("etudes.chooseAScore")}</span><button type="button" disabled={!chosen} onClick={()=>{chosen.saved?model.selectSaved(chosen.id):model.select(chosen.id);close();}}><Translation id="app.load" /></button></footer>
 </dialog>}</>;
}

