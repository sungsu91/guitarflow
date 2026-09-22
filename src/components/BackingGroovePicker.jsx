import {useEffect,useState} from 'react';
import {Check,Pause,Play,Search,X} from 'lucide-react';
import {GROOVE_CATEGORIES} from '../metronome/recommendedGrooves.js';
import {useBackingGroovePreview} from '../backing-loop/useBackingGroovePreview.js';

export default function BackingGroovePicker({controller}) {
  const [tab,setTab]=useState('recommended'),[query,setQuery]=useState(''),[category,setCategory]=useState('전체'),[selectedId,setSelectedId]=useState('');
  const preview=useBackingGroovePreview(controller.backingVolume);
  const packs=controller.library.filter(item=>item.sourceType==='groove');
  const visible=packs.filter(pack=>(tab==='recommended'?pack.builtin:!pack.builtin)&&(tab!=='recommended'||category==='전체'||pack.category===category)&&pack.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const selected=visible.find(pack=>pack.id===selectedId);
  const target=controller.savedPlaylists.find(list=>list.id===controller.playlistLibraryTargetId)||controller.activePlaylist;
  const added=new Set(target.itemIds);
  useEffect(()=>{preview.stop();},[tab,query,category]);
  useEffect(()=>{if(controller.isPlaying)preview.stop();},[controller.isPlaying]);
  useEffect(()=>{if(preview.active&&!packs.some(pack=>pack.id===preview.active))preview.stop();},[controller.library]);
  return <section className="backingLoopGroovePicker backingGrooveMini" aria-label="백킹 그루브팩 선택">
    <header><strong>그루브팩</strong><button aria-label="그루브팩 선택 닫기" onClick={()=>controller.togglePlaylistLibraryPicker()} type="button"><X size={14}/></button></header>
    <div className="backingGrooveMiniTabs" role="group" aria-label="팩 종류">{[['recommended','추천 팩'],['saved','내 저장 팩']].map(([id,label])=><button type="button" key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setSelectedId('');setQuery('');setCategory('전체');}}>{label}</button>)}</div>
    <label className="backingGrooveMiniSearch"><Search size={13}/><input type="search" aria-label="백킹 팩 검색" placeholder="팩 검색" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    {tab==='recommended'&&<div className="backingGrooveMiniCategories" aria-label="팩 분류">{GROOVE_CATEGORIES.map(c=><button type="button" key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c==='팝·발라드'?'팝':c==='펑크·디스코'?'펑크':c}</button>)}</div>}
    <div className="backingGrooveMiniGrid">{visible.map(pack=><div className={`backingGrooveMiniRow ${selected?.id===pack.id?'is-selected':''}`} key={pack.id}>
      <button type="button" className="backingGrooveMiniPick" aria-label={`${pack.title} 선택`} aria-pressed={selected?.id===pack.id} onClick={()=>setSelectedId(pack.id)}><span>{pack.title}</span>{added.has(pack.id)&&<Check size={11} aria-label="목록에 있음"/>}</button>
      <button type="button" className="backingGrooveMiniPreview" aria-label={`${pack.title} ${preview.active===pack.id?'미리 듣기 정지':'미리 듣기'}`} aria-busy={preview.active===pack.id&&preview.loading} onClick={()=>{setSelectedId(pack.id);controller.pausePlayback();preview.play(pack.id);}}>{preview.active===pack.id?(preview.loading?'…':<Pause size={12}/>):<Play size={12}/>}</button>
    </div>)}{!visible.length&&<p>{query?'검색 결과 없음':tab==='saved'?'저장한 팩 없음':'해당 팩 없음'}</p>}</div>
    {preview.error&&<small role="alert">{preview.error}</small>}
    <footer><span>{selected?`${selected.title} · ${selected.bpm} BPM`:'팩 선택'}</span><button className="primary" type="button" disabled={!selected||added.has(selected.id)} onClick={()=>{preview.stop();controller.addGrooveToPlaylist(selected.id);}}>{selected&&added.has(selected.id)?'목록에 있음':'목록에 연결'}</button></footer>
  </section>;
}
