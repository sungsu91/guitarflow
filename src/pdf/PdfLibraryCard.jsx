import {Trash2,FileText,FileMusic,ChevronRight,MoreVertical,Check} from 'lucide-react';
import {useEffect,useRef} from 'react';

// Both layouts use the same document identity and actions.
export default function PdfLibraryCard({item,mobile,busy,onOpen,onRename,onDelete,selecting=false,selected=false,onToggle,favorite=false,onFavorite}){
 const menu=useRef(null);
 const rawDate=item.record.updatedAt,date=rawDate&&Number.isFinite(Date.parse(rawDate))?new Date(rawDate).toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}):'—';
 useEffect(()=>{const close=e=>{if(menu.current&&!menu.current.contains(e.target))menu.current.open=false;};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
 const details=[item.type==='pdf'?'PDF':'편집 악보',Number.isFinite(item.count)&&item.count>0?`${item.count}${item.type==='pdf'?'페이지':'마디'}`:null,Number.isFinite(item.bpm)&&item.bpm>0?`${item.bpm} BPM`:null,item.unreadable?'읽기 오류':null].filter(Boolean).join(' · ');
 const symbol=selecting?<span className="librarySelection" aria-hidden="true">{selected&&<Check size={18}/>}</span>:<span className="libraryDocumentIcon" aria-hidden="true">{item.type==='pdf'?<FileText size={25}/>:<FileMusic size={25}/>}</span>;
 const name=<span className="libraryScoreName"><strong>{item.title}</strong><small>{details}</small>{item.position&&<small>최근 {item.position}</small>}</span>;
 const buttonProps={type:'button',disabled:busy||(!selecting&&item.unreadable),'aria-pressed':selecting?selected:undefined,'aria-label':`${item.title} ${selecting?'선택':'열기'}`,onClick:selecting?onToggle:onOpen};
 return <li className={`libraryScoreRow ${mobile?'libraryScoreRow--mobile':'libraryScoreRow--desktop'}`} data-document-type={item.type} data-selected={selected||undefined}>
  {mobile?<button {...buttonProps} className="libraryScoreOpen">{symbol}{name}{!selecting&&<ChevronRight size={20}/>}</button>:<button {...buttonProps} className="libraryScoreOpen libraryScoreOpen--desktop">{symbol}{name}<time dateTime={rawDate||undefined}>{date}</time>{!selecting&&<ChevronRight size={20}/>}</button>}
  {selecting&&<button type="button" className="libraryDelete" disabled={busy} aria-label={`${item.title} 삭제`} onClick={onDelete}><Trash2 size={18}/></button>}
  {(!mobile||selecting)&&<details ref={menu} className="libraryMenu" onKeyDown={e=>{if(e.key==='Escape'){menu.current.open=false;menu.current.querySelector('summary').focus();}}}>
   <summary aria-label={`${item.title} 관리`}><MoreVertical size={20}/></summary>
   <div>{onFavorite&&<button type="button" disabled={busy} onClick={()=>{menu.current.open=false;onFavorite();}}>{favorite?'즐겨찾기 해제':'즐겨찾기 추가'}</button>}<button type="button" disabled={busy} onClick={()=>{menu.current.open=false;onRename();}}>이름 변경</button><button type="button" disabled={busy} onClick={()=>{menu.current.open=false;onDelete();}}>삭제</button></div>
  </details>}
 </li>;
}
