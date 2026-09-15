import {Folder} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import PdfLibraryCard from './PdfLibraryCard.jsx';
import {loadScoreFolders,updateScoreFolders,scoreFileKey,SCORE_FOLDERS_KEY} from './scoreFolders.js';
import './scoreFolders.css';

function read(){try{return {data:loadScoreFolders(localStorage),error:''};}catch(e){return {data:null,error:e.message};}}
function FolderIcon(){return <svg className="scoreFolderIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 6V4h8l2 2h10v14H2Z" fill="#f2dba6" stroke="#aa843b"/><path d="M2 8h20v12H2Z" fill="#edd098" stroke="#aa843b"/></svg>;}
function FolderDialog({action,folders,busy,onClose,onApply}){
 const ref=useRef(null),[name,setName]=useState(action.folder?.name??''),[target,setTarget]=useState('');
 useEffect(()=>{ref.current.showModal();},[]);
 const move=action.type==='move',remove=action.type==='remove',title=move?'선택 악보 이동':remove?'폴더 삭제':action.type==='rename'?'폴더 이름 변경':'새 폴더';
 return <dialog ref={ref} className="pdfDialog" aria-label={title} onCancel={onClose}><form onSubmit={e=>{e.preventDefault();onApply({name,folderId:target});}}><h2>{title}</h2>
  {move?<><p>{action.keys.length}개 악보를 이동할 위치</p><label>대상 폴더<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">내 악보 (기본 위치)</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label></>:remove?<p>‘{action.folder.name}’ 폴더를 삭제할까요? 안의 악보는 삭제하지 않고 내 악보 기본 위치로 옮깁니다.</p>:<label>폴더 이름<input autoFocus required maxLength="100" value={name} onChange={e=>setName(e.target.value)}/></label>}
  {action.error&&<p role="alert">{action.error}</p>}<footer><button type="button" disabled={busy} onClick={onClose}>취소</button><button type="submit" disabled={busy}>{move?'이동':remove?'폴더 삭제':'저장'}</button></footer>
 </form></dialog>;
}

export default function ScoreFolderList({items,allItems,search,mobile,busy,folderId,onFolderChange,filter='all',onFilterChange,onOpen,onRename,onDelete}){
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
 const favorite=item=>{try{const value=!data.favorites[scoreFileKey(item)],next=updateScoreFolders(localStorage,{type:'favorite',keys:[scoreFileKey(item)],value});setStore({data:next,error:''});setMessage(value?'즐겨찾기에 추가했습니다.':'즐겨찾기를 해제했습니다.');}catch(e){setMessage(`저장하지 못했습니다: ${e.message}`);}};
 const apply=values=>{try{const next=updateScoreFolders(localStorage,{...values,type:action.type,id:action.folder?.id??crypto.randomUUID(),keys:action.keys});setStore({data:next,error:''});if(action.type==='move'){setSelected([]);setSelecting(false);setMessage(`${action.keys.length}개 악보를 이동했습니다.`);}else setMessage(action.type==='remove'?'폴더를 삭제했습니다. 악보는 기본 위치에 보존됩니다.':'폴더를 저장했습니다.');setAction(null);}catch(e){setAction(old=>({...old,error:`저장하지 못했습니다: ${e.message}`}));}};
 const editButton=<button type="button" disabled={!data||busy} aria-label={selecting?'목록 편집 완료':'목록 편집'} aria-pressed={selecting} onClick={()=>{setSelecting(v=>!v);setSelected([]);}}>{selecting?'완료':'편집'}</button>;
 return <section className={mobile?'scoreFolderBrowser scoreFolderBrowser--mobile':'scoreFolderBrowser'}>
  <nav className="scoreListFilters" aria-label="악보 목록 필터">{[['all','전체'],['recent','최근 연습'],['favorites','즐겨찾기']].map(([value,label])=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>changeFilter(value)}>{label}</button>)}</nav>
  {mobile?current&&<nav className="mobileFolderCrumb" aria-label="내 악보 위치"><button type="button" onClick={()=>go(null)}>‹ 내 악보</button><span>/</span><strong>{current.name}</strong></nav>:<nav className="scoreFolderPath" aria-label="내 악보 위치"><button type="button" disabled={!current} onClick={()=>go(null)}>↑</button><button type="button" onClick={()=>go(null)}>내 악보</button>{current&&<><span>›</span><strong>{current.name}</strong></>}{globalView&&<small>전체 폴더에서 찾기</small>}</nav>}
  {mobile?<div className="scoreMobileSectionHeader"><h2>{showFolders?'폴더':'악보'}</h2>{editButton}</div>:<div className="scoreFolderTools"><button type="button" disabled={!data||busy} onClick={()=>setAction({type:'create'})}>새 폴더</button>{editButton}</div>}
  {selecting&&<div className="scoreFolderTools scoreManageTools">{mobile&&<button type="button" onClick={()=>setAction({type:'create'})}>새 폴더</button>}<button type="button" onClick={()=>setSelected(visible.map(scoreFileKey))}>전체 선택</button><button type="button" disabled={!selection.length} onClick={()=>setAction({type:'move',keys:selection})}>폴더로 이동 ({selection.length})</button></div>}
  {store.error&&<p role="alert">{store.error} 폴더 수정은 잠시 사용할 수 없습니다.</p>}{message&&<p className="scoreFolderMessage" role="status">{message}</p>}
  <div className={`scoreFilePane ${mobile?'scoreMobileList':''}`}>
   {!mobile&&<div className="scoreFileColumns" aria-hidden="true"><span>이름</span><span>파일 형식</span><span>내용</span><span>수정한 날짜</span><span/></div>}
   {showFolders&&<ul className="scoreFolderRows" aria-label="내 악보 폴더">{visibleFolders.map(folder=><li key={folder.id}><button type="button" className="scoreFolderOpen" aria-label={`${folder.name} 폴더 열기`} onClick={()=>go(folder.id)}>{mobile?<Folder className="scoreFolderLineIcon" size={27} strokeWidth={1.7}/>:<FolderIcon/>}<strong>{folder.name}</strong><small>{allItems.filter(item=>location(item)===folder.id).length}개</small>{mobile&&!selecting&&<span className="scoreRowArrow" aria-hidden="true">›</span>}</button>{(!mobile||selecting)&&<details className="scoreLibraryMenu"><summary aria-label={`${folder.name} 폴더 관리`}>⋮</summary><div><button type="button" onClick={e=>{e.currentTarget.closest('details').open=false;setAction({type:'rename',folder});}}>이름 변경</button><button type="button" onClick={e=>{e.currentTarget.closest('details').open=false;setAction({type:'remove',folder});}}>폴더 삭제</button></div></details>}</li>)}</ul>}
   {mobile&&showFolders&&!visibleFolders.length&&<div className="mobileFolderEmpty"><span>폴더가 없습니다.</span><button type="button" disabled={!data||busy} onClick={()=>setAction({type:'create'})}>+ 새 폴더</button></div>}
   {mobile&&showFolders&&<h3 className="scoreMobileScoresHeading">악보</h3>}
   <ul className="scoreLibraryList" aria-label="내 악보 목록">{visible.map(item=><PdfLibraryCard key={scoreFileKey(item)} item={item} mobile={mobile} busy={busy} selecting={selecting} selected={selection.includes(scoreFileKey(item))} favorite={Boolean(data?.favorites[scoreFileKey(item)])} onFavorite={data?()=>favorite(item):undefined} onToggle={()=>toggle(scoreFileKey(item))} onOpen={()=>onOpen(item)} onRename={()=>onRename(item)} onDelete={()=>onDelete(item)}/>)}</ul>
   {!visible.length&&<p className="scoreFolderEmpty">{search?'검색 결과가 없습니다.':filter==='favorites'?'즐겨찾기한 악보가 없습니다. 편집에서 추가할 수 있습니다.':filter==='recent'?'최근 연습한 악보가 없습니다.':!current&&!folders.length&&!allItems.length?'PDF를 불러오거나 간단 악보를 만들어 보세요.':'이 위치에 저장된 악보가 없습니다.'}</p>}
   {!mobile&&<div className="scoreFileStatus">{visible.length}개 악보{showFolders&&` · ${folders.length}개 폴더`}<span>이 기기에 보관</span></div>}
  </div>
  {action&&<FolderDialog action={action} folders={folders} busy={busy} onClose={()=>setAction(null)} onApply={apply}/>}
 </section>;
}
