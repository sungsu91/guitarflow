import {useEffect,useRef} from 'react';
import ScoreFileIcon from './ScoreFileIcon.jsx';

// PDF and editable documents share list actions, while their storage stays separate.
export default function PdfLibraryCard({item,mobile,busy,onOpen,onRename,onDelete,selecting=false,selected=false,onToggle,favorite=false,onFavorite}){
 const menu=useRef(null);
 const rawDate=item.record.updatedAt,date=rawDate&&Number.isFinite(Date.parse(rawDate))?new Date(rawDate).toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}):'—';
 const extension=item.type==='pdf'?'.pdf':'.fretiva.json',filename=item.title.endsWith(extension)?item.title:`${item.title}${extension}`;
 useEffect(()=>{const close=e=>{if(menu.current&&!menu.current.contains(e.target))menu.current.open=false;};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
 const details=[item.type==='pdf'?'PDF':'편집 악보',Number.isFinite(item.count)&&item.count>0?`${item.count}${item.type==='pdf'?'페이지':'마디'}`:null,Number.isFinite(item.bpm)&&item.bpm>0?`${item.bpm} BPM`:null,item.position?`최근 ${item.position}`:null,item.unreadable?'읽기 오류':null].filter(Boolean).join(' · ');
 const mark=<span className={`scoreSelectionMark ${selected?'is-selected':''}`} aria-hidden="true">{selected?'✓':''}</span>;
 return <li className={`scoreLibraryRow ${mobile?'scoreMobileRow':''}`} data-document-type={item.type} data-selected={selected||undefined}>
  {mobile?<button type="button" className="scoreMobileOpen" disabled={busy||(!selecting&&item.unreadable)} aria-pressed={selecting?selected:undefined} aria-label={`${item.title} ${selecting?'선택':'열기'}`} onClick={selecting?onToggle:onOpen}>
   {selecting&&mark}<span className="scoreMobileName"><strong>{item.title}</strong><small>{details}</small></span>{!selecting&&<span className="scoreRowArrow" aria-hidden="true">›</span>}
  </button>:<button type="button" className="scoreLibraryOpen" disabled={busy||(!selecting&&item.unreadable)} aria-pressed={selecting?selected:undefined} aria-label={`${item.title} ${selecting?'선택':'열기'}`} onClick={selecting?onToggle:onOpen}>
   {selecting?mark:<ScoreFileIcon type={item.type}/>}
   <span className="scoreFileName"><strong title={filename}>{filename}</strong></span>
   <span className="scoreFileKind">{item.type==='pdf'?'PDF 문서':'FRETIVA 악보'}</span><span className="scoreFileDetail">{item.count}{item.type==='pdf'?'페이지':'마디'}{item.bpm>0&&` · ${item.bpm} BPM`}</span>
   <time className="scoreFileDate" dateTime={rawDate||undefined}>{date}</time>
  </button>}
  {(mobile?selecting:!selecting)&&<details ref={menu} className="scoreLibraryMenu" onKeyDown={e=>{if(e.key==='Escape'){menu.current.open=false;menu.current.querySelector('summary').focus();}}}>
   <summary aria-label={`${item.title} 관리`}>⋮</summary>
   <div>{onFavorite&&<button type="button" disabled={busy} onClick={()=>{menu.current.open=false;onFavorite();}}>{favorite?'즐겨찾기 해제':'즐겨찾기 추가'}</button>}<button type="button" disabled={busy} onClick={()=>{menu.current.open=false;onRename();}}>이름 변경</button><button type="button" disabled={busy} onClick={()=>{menu.current.open=false;onDelete();}}>삭제</button></div>
  </details>}
 </li>;
}
