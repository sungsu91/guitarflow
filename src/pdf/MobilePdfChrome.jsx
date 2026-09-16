import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,MoreVertical} from 'lucide-react';
import './mobilePdfChrome.css';

export function MobilePdfHeader({title,editing,onBack,onDone,onAction,saveState,page,pageCount,original}){
 const [menu,setMenu]=useState(false),root=useRef(null);
 useEffect(()=>{const close=e=>{if(!root.current?.contains(e.target))setMenu(false);};document.addEventListener('pointerdown',close,true);return()=>document.removeEventListener('pointerdown',close,true);},[]);
 const act=name=>{setMenu(false);onAction(name);};
 return <header className="mobilePdfHud" ref={root}>
  <button type="button" aria-label="내 악보 보관함으로 돌아가기" onClick={onBack}><ArrowLeft size={21}/></button>
  <h1>{title}</h1>
  <button type="button" aria-label="PDF 문서 메뉴" aria-expanded={menu} onClick={()=>{setMenu(v=>!v);}}><MoreVertical size={19}/></button>
  <button type="button" aria-label="PDF 간단 편집" aria-pressed={editing} onClick={onDone}>{editing?'완료':'편집'}</button>
  {menu&&<div className="mobilePdfMenu" role="group" aria-label="PDF 문서 메뉴 항목">
   <small>{page} / {pageCount}페이지 · <span role="status">{saveState}</span></small>
   <button onClick={()=>act('info')}>문서 정보</button>
   <button onClick={()=>act('fit')}>너비 맞춤</button><button onClick={()=>act('reset')}>자르기 초기화</button>
   <button onClick={()=>act('original')}>{original?'편집본 보기':'원본 보기'}</button><button onClick={()=>act('fullscreen')}>전체화면</button>

  </div>}

 </header>;
}
export function MobilePdfTransport({page,pageCount,onPage,bpm,onBpm,playing,paused,onPlay,countIn,settings}){
 const [open,setOpen]=useState(false),bpmButton=useRef(null),popover=useRef(null);
 useEffect(()=>{const close=e=>{if(!popover.current?.contains(e.target)&&!bpmButton.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',close,true);return()=>document.removeEventListener('pointerdown',close,true);},[]);
 return <div className="mobilePdfTransport">
  <button aria-label="이전 PDF 페이지" disabled={page<=1} onClick={()=>onPage(page-1)}>‹ 이전</button>
  <button className="pdfPrimary" aria-label="PDF 연습 시작 정지" aria-pressed={playing} onClick={onPlay}>{playing?'Ⅱ 일시정지':paused?'▶ 계속 연습':'▶ 연습 시작'}</button>
  <button ref={bpmButton} aria-label="BPM 조절" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{countIn?'카운트인':`${bpm} BPM`}</button>
  <button aria-label="다음 PDF 페이지" disabled={page>=pageCount} onClick={()=>onPage(page+1)}>다음 ›</button>
  {open&&<div ref={popover} className="mobilePdfBpm" role="group" aria-label="BPM 및 연습 설정">
   <div className="mobilePdfBpmSteps"><button aria-label="BPM 10 감소" onClick={()=>onBpm(bpm-10)}>−10</button><button aria-label="BPM 1 감소" onClick={()=>onBpm(bpm-1)}>−1</button><output aria-label="현재 BPM">{bpm}<small>BPM</small></output><button aria-label="BPM 1 증가" onClick={()=>onBpm(bpm+1)}>+1</button><button aria-label="BPM 10 증가" onClick={()=>onBpm(bpm+10)}>+10</button></div>
   <details className="mobilePdfPracticeOptions"><summary>연습 설정</summary>{settings}</details>
  </div>}
 </div>;
}
