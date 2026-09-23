import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import './groovePackBrowser.css';
import {useGroovePreview} from './useGroovePreview.js';
import {GROOVE_CATEGORIES} from './recommendedGrooves.js';
import {useEffect, useRef, useState} from 'react';
import {savePacks, subscribeGroovePacks, readPacks, defaults} from './groovePackLibrary.js';


export default function GroovePacks({mode, onClose, pattern, timeSignature, subdivision, onLoad, mobile, preparePreview, bpm}) {
  useLanguage();
  const dialog = useRef(null);
  const [packs,setPacks] = useState(readPacks);
  const [tab,setTab] = useState('recommended');
  const [query,setQuery] = useState('');
  const [category,setCategory] = useState(ko["app.all"]);
  const [sort,setSort] = useState(() => packs.some(p => Number.isFinite(p.order)) ? 'manual' : 'recent');
  const [selected,setSelected] = useState(null);
  const [menu,setMenu] = useState(null);
  const [renaming,setRenaming] = useState(null);
  const [renameTitle,setRenameTitle] = useState('');
  const original = packs.find(p => p.id === pattern.savedPackId);
  const [title,setTitle] = useState(original?.title || '');
  const [saveAsNew,setSaveAsNew] = useState(!original);
  const [error,setError] = useState('');
  const preview = useGroovePreview(preparePreview, bpm, setError);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => subscribeGroovePacks(() => setPacks(readPacks())), []);
  const source = tab === 'recommended' ? defaults : [...packs].reverse().sort((a,b) => sort === 'name' ? a.title.localeCompare(b.title,'ko') : sort === 'manual' ? (a.order ?? packs.length-1-packs.indexOf(a))-(b.order ?? packs.length-1-packs.indexOf(b)) : 0);
  const visible = source.filter(p => (tab!=='recommended' || category===ko["app.all"] || p.category===category) && p.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const choice = source.find(p => p.id === selected);
  const visibleIds=visible.map(p=>p.id).join('|');
  useEffect(()=>{if(preview.active && !visible.some(p=>p.id===preview.active))preview.stop();},[visibleIds,preview.active]);
  function closePanel(){preview.stop();onClose();}
  function persist(next) {
    try { savePacks(next); setPacks(next); setError(''); return true; }
    catch { setError(ko["metronome.storageIsUnavailableTryAgain"]); return false; }
  }
  function loadPack(pack) {
    preview.stop();
    const copy=structuredClone(pack);
    copy.applyBpm=false;
    if(!pack.builtin) copy.pattern={...copy.pattern,savedPackId:pack.id};
    onLoad(copy);onClose();
  }
  function movePack(id, delta) {
    const ordered=[...source];const from=ordered.findIndex(p=>p.id===id),to=from+delta;
    if(to<0 || to>=ordered.length)return;
    [ordered[from],ordered[to]]=[ordered[to],ordered[from]];
    persist(packs.map(p=>({...p,order:ordered.findIndex(item=>item.id===p.id)})));
    setSort('manual');
  }
  function changeTab(value) {
    preview.stop(); setTab(value); setSelected(null); setMenu(null); setRenaming(null); setQuery(''); setCategory(ko["app.all"]);
  }
  return <dialog ref={dialog} className={`groovePackDialog groovePackDialog--${mobile?'mobile':'desktop'} ${mode === 'save' ? '' : 'groovePackBrowser'}`} onCancel={closePanel} onClose={closePanel} aria-label={mode === 'save' ? translateUi("metronome.saveGroovePack") : translateUi("app.groovePacksApp")}>
    <header><h2>{mode === 'save' ? translateUi("metronome.saveGroovePack") : translateUi("app.groovePacksApp")}</h2><button className="groovePackClose" type="button" onClick={closePanel} aria-label={translateUi("metronome.closeGroovePacks")}>×</button></header>
    {mode === 'save' ? <form onSubmit={e => {
      e.preventDefault(); if(!title.trim()) return;
      const id=!saveAsNew && original ? original.id : crypto.randomUUID();
      const pack = {...(!saveAsNew ? original : {}),id,title:title.trim(),pattern:{...structuredClone(pattern),savedPackId:id},timeSignature,subdivision,bpm,createdAt:Date.now()};
      if(persist([...packs.filter(p=>p.id!==id),pack])) {onLoad(structuredClone(pack));onClose();}
    }}>{original && <label><Translation id="metronome.saveMode" /><select aria-label={translateUi("metronome.saveMode")} value={saveAsNew?'new':'update'} onChange={e=>setSaveAsNew(e.target.value==='new')}><option value="update"><Translation id="metronome.updateExistingPack" /></option><option value="new"><Translation id="metronome.saveAsNewPack" /></option></select></label>}<label><Translation id="metronome.packName" /><input autoFocus value={title} maxLength={40} required placeholder={translateUi("metronome.eGFunkPractice01")} onChange={e=>setTitle(e.target.value)}/></label><p>{pattern.rows.length}<Translation id="metronome.sounds" />{timeSignature}<Translation id="metronome.savesTheCurrentCheckedPattern" /></p><footer><button type="submit" disabled={!title.trim()}><Translation id="metronome.savePack" /></button></footer></form> : <>
      <div className="groovePackTabs" role="tablist" aria-label={translateUi("components.packType")}>{[['recommended',ko["components.recommended"]],['saved',ko["components.myPacks"]]].map(([id,label]) => <button type="button" role="tab" id={`groove-tab-${id}`} aria-controls="groove-pack-results" aria-selected={tab===id} tabIndex={tab===id?0:-1} key={id} onClick={()=>changeTab(id)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=id==='saved'?'recommended':'saved';changeTab(next);document.getElementById(`groove-tab-${next}`)?.focus();}}}>{localizeUi(label)}</button>)}</div>
      <div className="groovePackSearch"><span className="grooveSearchIcon" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg></span><input type="search" aria-label={translateUi("metronome.searchPackNames")} placeholder={translateUi("components.searchPacks")} value={query} onChange={e=>setQuery(e.target.value)}/>{tab === 'saved' && <div className="groovePackManageBar"><select aria-label={translateUi("metronome.sortSavedPacks")} value={sort} onChange={e=>setSort(e.target.value)}><option value="recent"><Translation id="metronome.recentlySaved" /></option><option value="name"><Translation id="metronome.name" /></option><option value="manual"><Translation id="metronome.customOrder" /></option></select></div>}</div>
      {tab==='recommended' && <div className="groovePackCategories" aria-label={translateUi("components.packCategory")}>{GROOVE_CATEGORIES.map(c=><button type="button" key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{localizeUi(c===ko["components.popBallad"]?translateUi("components.pop"):c===ko["components.funkDisco"]?translateUi("components.funk"):c)}</button>)}</div>}
      <div id="groove-pack-results" role="tabpanel" aria-labelledby={`groove-tab-${tab}`} className="groovePackResults">
        <div className="groovePackRows" role="group" aria-label={translateUi("metronome.groovePackList")}>{visible.map(p => <div className={`groovePackRow ${selected===p.id?'is-selected':''}`} key={p.id}>
          <button className="groovePackPick" type="button" aria-pressed={selected===p.id} onClick={()=>{setSelected(p.id);setMenu(null);}}><span className="groovePackCopy"><strong title={p.title}>{p.title}</strong></span></button>
          <button className="groovePackPreview" type="button" aria-label={preview.active===p.id ? p.title+translateUi("metronome.pausePreview") : p.title+translateUi("metronome.preview")} aria-pressed={preview.active===p.id} aria-busy={preview.active===p.id && preview.loading} onClick={()=>{setSelected(p.id);setMenu(null);setError('');preview.play(p);}}>{preview.active===p.id ? (preview.loading?'…':'Ⅱ') : '▶'}</button>
          {!p.builtin && <button className="groovePackMore" type="button" aria-label={translateUi("app.manageValue1", { value1: p.title })} aria-expanded={menu===p.id} onClick={()=>{setMenu(menu===p.id?null:p.id);setRenaming(null);}}>⋮</button>}
          {!p.builtin && menu===p.id && <div className="groovePackActions"><button type="button" onClick={()=>loadPack(p)}><Translation id="metronome.editPattern" /></button><button type="button" aria-label={p.title+translateUi("metronome.moveUp")} disabled={source[0]?.id===p.id} onClick={()=>movePack(p.id,-1)}>↑</button><button type="button" aria-label={p.title+translateUi("metronome.moveDown")} disabled={source.at(-1)?.id===p.id} onClick={()=>movePack(p.id,1)}>↓</button><button type="button" onClick={()=>{setRenaming(p.id);setRenameTitle(p.title);setMenu(null);}}><Translation id="audioStudio.rename" /></button><button type="button" onClick={()=>{if(persist(packs.filter(item=>item.id!==p.id))){if(preview.active===p.id)preview.stop();setMenu(null);if(selected===p.id)setSelected(null);}}}><Translation id="common.delete" /></button></div>}
          {renaming===p.id && <form className="groovePackRename" onSubmit={e=>{e.preventDefault();if(renameTitle.trim() && persist(packs.map(item=>item.id===p.id?{...item,title:renameTitle.trim()}:item)))setRenaming(null);}}><input autoFocus aria-label={translateUi("metronome.newPackName")} maxLength={40} value={renameTitle} onChange={e=>setRenameTitle(e.target.value)}/><button type="submit" disabled={!renameTitle.trim()}><Translation id="audioStudio.change" /></button><button type="button" onClick={()=>setRenaming(null)}><Translation id="common.cancel" /></button></form>}
        </div>)}</div>
        {!visible.length && <p className="groovePackEmpty">{query.trim()?translateUi("etudes.noResultsFound"): translateUi("metronome.noSavedPacksSaveOneFromTheEditor")}</p>}
      </div>
      <footer className="groovePackLoad"><span><strong>{choice?.title || translateUi("metronome.chooseAPack")}</strong></span><button type="button" disabled={!choice} onClick={()=>loadPack(choice)}><Translation id="app.load" /></button></footer>
    </>}
    {error && <p role="alert">{localizeUi(error)}</p>}
  </dialog>;
}
