import './groovePackBrowser.css';
import {useGroovePreview} from './useGroovePreview.js';
import {GROOVE_CATEGORIES} from './recommendedGrooves.js';
import {useEffect, useRef, useState} from 'react';
import {savePacks, subscribeGroovePacks, readPacks, defaults} from './groovePackLibrary.js';


export default function GroovePacks({mode, onClose, pattern, timeSignature, subdivision, onLoad, mobile, preparePreview, bpm}) {
  const dialog = useRef(null);
  const [packs,setPacks] = useState(readPacks);
  const [tab,setTab] = useState('recommended');
  const [query,setQuery] = useState('');
  const [category,setCategory] = useState('전체');
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
  const visible = source.filter(p => (tab!=='recommended' || category==='전체' || p.category===category) && p.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const choice = source.find(p => p.id === selected);
  const visibleIds=visible.map(p=>p.id).join('|');
  useEffect(()=>{if(preview.active && !visible.some(p=>p.id===preview.active))preview.stop();},[visibleIds,preview.active]);
  function closePanel(){preview.stop();onClose();}
  function persist(next) {
    try { savePacks(next); setPacks(next); setError(''); return true; }
    catch { setError('저장 공간을 사용할 수 없습니다. 다시 시도해 주세요.'); return false; }
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
    preview.stop(); setTab(value); setSelected(null); setMenu(null); setRenaming(null); setQuery(''); setCategory('전체');
  }
  return <dialog ref={dialog} className={`groovePackDialog groovePackDialog--${mobile?'mobile':'desktop'} ${mode === 'save' ? '' : 'groovePackBrowser'}`} onCancel={closePanel} onClose={closePanel} aria-label={mode === 'save' ? '그루브팩 저장' : '그루브팩'}>
    <header><h2>{mode === 'save' ? '그루브팩 저장' : '그루브팩'}</h2><button className="groovePackClose" type="button" onClick={closePanel} aria-label="그루브팩 창 닫기">×</button></header>
    {mode === 'save' ? <form onSubmit={e => {
      e.preventDefault(); if(!title.trim()) return;
      const id=!saveAsNew && original ? original.id : crypto.randomUUID();
      const pack = {...(!saveAsNew ? original : {}),id,title:title.trim(),pattern:{...structuredClone(pattern),savedPackId:id},timeSignature,subdivision,bpm,createdAt:Date.now()};
      if(persist([...packs.filter(p=>p.id!==id),pack])) {onLoad(structuredClone(pack));onClose();}
    }}>{original && <label>저장 방식<select aria-label="저장 방식" value={saveAsNew?'new':'update'} onChange={e=>setSaveAsNew(e.target.value==='new')}><option value="update">기존 팩 수정</option><option value="new">새 팩으로 저장</option></select></label>}<label>팩 이름<input autoFocus value={title} maxLength={40} required placeholder="예: 펑크 연습 01" onChange={e=>setTitle(e.target.value)}/></label><p>{pattern.rows.length}개 음색 · {timeSignature} · 현재 체크 패턴을 저장합니다.</p><footer><button type="submit" disabled={!title.trim()}>팩 저장</button></footer></form> : <>
      <div className="groovePackTabs" role="tablist" aria-label="팩 종류">{[['recommended','추천 팩'],['saved','내 저장 팩']].map(([id,label]) => <button type="button" role="tab" id={`groove-tab-${id}`} aria-controls="groove-pack-results" aria-selected={tab===id} tabIndex={tab===id?0:-1} key={id} onClick={()=>changeTab(id)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=id==='saved'?'recommended':'saved';changeTab(next);document.getElementById(`groove-tab-${next}`)?.focus();}}}>{label}</button>)}</div>
      <div className="groovePackSearch"><span className="grooveSearchIcon" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg></span><input type="search" aria-label="팩 이름 검색" placeholder="팩 검색" value={query} onChange={e=>setQuery(e.target.value)}/>{tab === 'saved' && <div className="groovePackManageBar"><select aria-label="저장 팩 정렬" value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">최근 저장순</option><option value="name">이름순</option><option value="manual">직접 정렬</option></select></div>}</div>
      {tab==='recommended' && <div className="groovePackCategories" aria-label="팩 분류">{GROOVE_CATEGORIES.map(c=><button type="button" key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c==='팝·발라드'?'팝':c==='펑크·디스코'?'펑크':c}</button>)}</div>}
      <div id="groove-pack-results" role="tabpanel" aria-labelledby={`groove-tab-${tab}`} className="groovePackResults">
        <div className="groovePackRows" role="group" aria-label="그루브팩 목록">{visible.map(p => <div className={`groovePackRow ${selected===p.id?'is-selected':''}`} key={p.id}>
          <button className="groovePackPick" type="button" aria-pressed={selected===p.id} onClick={()=>{setSelected(p.id);setMenu(null);}}><span className="groovePackCopy"><strong title={p.title}>{p.title}</strong></span></button>
          <button className="groovePackPreview" type="button" aria-label={preview.active===p.id ? p.title+' 미리 듣기 일시정지' : p.title+' 미리 듣기'} aria-pressed={preview.active===p.id} aria-busy={preview.active===p.id && preview.loading} onClick={()=>{setSelected(p.id);setMenu(null);setError('');preview.play(p);}}>{preview.active===p.id ? (preview.loading?'…':'Ⅱ') : '▶'}</button>
          {!p.builtin && <button className="groovePackMore" type="button" aria-label={`${p.title} 관리`} aria-expanded={menu===p.id} onClick={()=>{setMenu(menu===p.id?null:p.id);setRenaming(null);}}>⋮</button>}
          {!p.builtin && menu===p.id && <div className="groovePackActions"><button type="button" onClick={()=>loadPack(p)}>패턴 편집</button><button type="button" aria-label={p.title+' 위로 이동'} disabled={source[0]?.id===p.id} onClick={()=>movePack(p.id,-1)}>↑</button><button type="button" aria-label={p.title+' 아래로 이동'} disabled={source.at(-1)?.id===p.id} onClick={()=>movePack(p.id,1)}>↓</button><button type="button" onClick={()=>{setRenaming(p.id);setRenameTitle(p.title);setMenu(null);}}>이름 변경</button><button type="button" onClick={()=>{if(persist(packs.filter(item=>item.id!==p.id))){if(preview.active===p.id)preview.stop();setMenu(null);if(selected===p.id)setSelected(null);}}}>삭제</button></div>}
          {renaming===p.id && <form className="groovePackRename" onSubmit={e=>{e.preventDefault();if(renameTitle.trim() && persist(packs.map(item=>item.id===p.id?{...item,title:renameTitle.trim()}:item)))setRenaming(null);}}><input autoFocus aria-label="새 팩 이름" maxLength={40} value={renameTitle} onChange={e=>setRenameTitle(e.target.value)}/><button type="submit" disabled={!renameTitle.trim()}>변경</button><button type="button" onClick={()=>setRenaming(null)}>취소</button></form>}
        </div>)}</div>
        {!visible.length && <p className="groovePackEmpty">{query.trim()?'검색 결과가 없습니다.': '저장한 팩이 없습니다. 편집 화면에서 저장해 주세요.'}</p>}
      </div>
      <footer className="groovePackLoad"><span><strong>{choice?.title || '팩을 선택해 주세요'}</strong></span><button type="button" disabled={!choice} onClick={()=>loadPack(choice)}>불러오기</button></footer>
    </>}
    {error && <p role="alert">{error}</p>}
  </dialog>;
}
