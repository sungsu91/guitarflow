import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,MoreVertical} from 'lucide-react';
import './mobilePdfChrome.css';

export function MobilePdfHeader({title,editing,onBack,onDone,onAction,settings,saveState,page,pageCount,original}){
 const [menu,setMenu]=useState(false),[practice,setPractice]=useState(false),root=useRef(null);
 useEffect(()=>{const close=e=>{if(!root.current?.contains(e.target)){setMenu(false);setPractice(false);}};document.addEventListener('pointerdown',close,true);return()=>document.removeEventListener('pointerdown',close,true);},[]);
 const act=name=>{setMenu(false);setPractice(false);onAction(name);};
 return <header className="mobilePdfHud" ref={root}>
  <button type="button" aria-label="내 악보 보관함으로 돌아가기" onClick={onBack}><ArrowLeft size={21}/></button>
  <h1>{title}</h1>
  <button type="button" aria-label="PDF 문서 메뉴" aria-expanded={menu} onClick={()=>{setMenu(v=>!v);setPractice(false);}}><MoreVertical size={19}/></button>
  <button type="button" aria-label="PDF 간단 편집" aria-pressed={editing} onClick={onDone}>{editing?'완료':'편집'}</button>
  {menu&&<div className="mobilePdfMenu" role="group" aria-label="PDF 문서 메뉴 항목">
   <small>{page} / {pageCount}페이지 · <span role="status">{saveState}</span></small>
   <button onClick={()=>act('bar')}>마디 설정</button><button onClick={()=>act('info')}>문서 정보</button>
   <button onClick={()=>act('fit')}>너비 맞춤</button><button onClick={()=>act('reset')}>자르기 초기화</button>
   <button onClick={()=>act('original')}>{original?'편집본 보기':'원본 보기'}</button><button onClick={()=>act('fullscreen')}>전체화면</button>
   <button onClick={()=>{setMenu(false);setPractice(true);}}>연습 설정</button>
  </div>}
  {practice&&<section className="mobilePdfSettingsSheet" aria-label="PDF 연습 설정"><button className="mobilePdfSheetClose" onClick={()=>setPractice(false)}>닫기 ×</button>{settings}</section>}
 </header>;
}
export function MobilePdfTransport({page,pageCount,onPage,bpm,onBpm,playing,onPlay,countIn}){
 const [open,setOpen]=useState(false),root=useRef(null);
 useEffect(()=>{const close=e=>{if(!root.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',close,true);return()=>document.removeEventListener('pointerdown',close,true);},[]);
 return <div className="mobilePdfTransport" ref={root}>
  <button aria-label="이전 PDF 페이지" disabled={page<=1} onClick={()=>onPage(page-1)}>‹ 이전</button>
  <button className="pdfPrimary" aria-label="PDF 연습 시작 정지" aria-pressed={playing} onClick={onPlay}>{playing?'■ 정지':'▶ 연습 시작'}</button>
  <button aria-label="BPM 조절" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{countIn?'카운트인':`${bpm} BPM`}</button>
  <button aria-label="다음 PDF 페이지" disabled={page>=pageCount} onClick={()=>onPage(page+1)}>다음 ›</button>
  {open&&<div className="mobilePdfBpm" role="group" aria-label="BPM 조절창"><button aria-label="BPM 감소" onClick={()=>onBpm(bpm-1)}>−</button><input aria-label="PDF BPM 빠른 조절" type="number" min="30" max="240" value={bpm} onChange={e=>onBpm(Number(e.target.value))}/><button aria-label="BPM 증가" onClick={()=>onBpm(bpm+1)}>+</button><button onClick={()=>setOpen(false)}>완료</button></div>}
 </div>;
}
