import { localizeUi } from "./../i18n/core.js";
import ko from "./../i18n/locales/ko.js";
import { t as translateUi } from "./../i18n/core.js";
import { Translation, useLanguage } from "./../i18n/react.jsx";
import {useEffect,useState} from 'react';
import {Check,Pause,Play,Search,X} from 'lucide-react';
import {GROOVE_CATEGORIES} from '../metronome/recommendedGrooves.js';
import {useBackingGroovePreview} from '../backing-loop/useBackingGroovePreview.js';

export default function BackingGroovePicker({controller}) {
  useLanguage();
  const [tab,setTab]=useState('recommended'),[query,setQuery]=useState(''),[category,setCategory]=useState(ko["app.all"]),[selectedId,setSelectedId]=useState('');
  const preview=useBackingGroovePreview(controller.backingVolume);
  const packs=controller.library.filter(item=>item.sourceType==='groove');
  const visible=packs.filter(pack=>(tab==='recommended'?pack.builtin:!pack.builtin)&&(tab!=='recommended'||category===ko["app.all"]||pack.category===category)&&pack.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const selected=visible.find(pack=>pack.id===selectedId);
  const target=controller.savedPlaylists.find(list=>list.id===controller.playlistLibraryTargetId)||controller.activePlaylist;
  const added=new Set(target.itemIds);
  useEffect(()=>{preview.stop();},[tab,query,category]);
  useEffect(()=>{if(controller.isPlaying)preview.stop();},[controller.isPlaying]);
  useEffect(()=>{if(preview.active&&!packs.some(pack=>pack.id===preview.active))preview.stop();},[controller.library]);
  return <section className="backingLoopGroovePicker backingGrooveMini" aria-label={translateUi("components.chooseBackingGroovePack")}>
    <header><strong><Translation id="app.groovePacksApp" /></strong><button aria-label={translateUi("components.closeGroovePackPicker")} onClick={()=>controller.togglePlaylistLibraryPicker()} type="button"><X size={14}/></button></header>
    <div className="backingGrooveMiniTabs" role="group" aria-label={translateUi("components.packType")}>{[['recommended',ko["components.recommended"]],['saved',ko["components.myPacks"]]].map(([id,label])=><button type="button" key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setSelectedId('');setQuery('');setCategory(ko["app.all"]);}}>{localizeUi(label)}</button>)}</div>
    <label className="backingGrooveMiniSearch"><Search size={13}/><input type="search" aria-label={translateUi("components.searchBackingPacks")} placeholder={translateUi("components.searchPacks")} value={query} onChange={e=>setQuery(e.target.value)}/></label>
    {tab==='recommended'&&<div className="backingGrooveMiniCategories" aria-label={translateUi("components.packCategory")}>{GROOVE_CATEGORIES.map(c=><button type="button" key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{localizeUi(c===ko["components.popBallad"]?translateUi("components.pop"):c===ko["components.funkDisco"]?translateUi("components.funk"):c)}</button>)}</div>}
    <div className="backingGrooveMiniGrid">{visible.map(pack=><div className={`backingGrooveMiniRow ${selected?.id===pack.id?'is-selected':''}`} key={pack.id}>
      <button type="button" className="backingGrooveMiniPick" aria-label={translateUi("components.selectValue1", { value1: pack.title })} aria-pressed={selected?.id===pack.id} onClick={()=>setSelectedId(pack.id)}><span>{pack.title}</span>{added.has(pack.id)&&<Check size={11} aria-label={translateUi("components.alreadyInList")}/>}</button>
      <button type="button" className="backingGrooveMiniPreview" aria-label={`${pack.title} ${preview.active===pack.id?translateUi("components.stopPreview"):translateUi("components.preview")}`} aria-busy={preview.active===pack.id&&preview.loading} onClick={()=>{setSelectedId(pack.id);controller.pausePlayback();preview.play(pack.id);}}>{preview.active===pack.id?(preview.loading?'…':<Pause size={12}/>):<Play size={12}/>}</button>
    </div>)}{!visible.length&&<p>{query?translateUi("components.noResults"):tab==='saved'?translateUi("components.noSavedPacks"):translateUi("components.noMatchingPacks")}</p>}</div>
    {preview.error&&<small role="alert">{localizeUi(preview.error)}</small>}
    <footer><span>{selected?`${selected.title} · ${selected.bpm} BPM`:translateUi("components.choosePack")}</span><button className="primary" type="button" disabled={!selected||added.has(selected.id)} onClick={()=>{preview.stop();controller.addGrooveToPlaylist(selected.id);}}>{selected&&added.has(selected.id)?translateUi("components.alreadyInList"):translateUi("components.addToList")}</button></footer>
  </section>;
}
