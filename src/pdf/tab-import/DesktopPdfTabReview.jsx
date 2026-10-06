import PdfTabCoverageNotice from './PdfTabCoverageNotice.jsx';
import {pdfTabReview} from './pdfTabReview.js';
import {reviewTargetLabel} from './reviewTargetLabel.js';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {t} from '../../i18n/core.js';
import './desktopPdfTabImport.css';
import {useEffect,useRef,useState} from 'react';
export default function DesktopPdfTabReview({document,cursor,onSelect,onConfirm,pitchRepair,onRepairPitch}){
  const {imported,positions,current,currentIndex,event,source,review,pages,movePage,move,canConfirm}=pdfTabReview(document,cursor,onSelect);
  const [open,setOpen]=useState(false),root=useRef(null);
  useEffect(()=>{if(!open)return;const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};window.addEventListener('pointerdown',outside);return()=>window.removeEventListener('pointerdown',outside);},[open]);
  if(!imported)return null;
  return <div className="desktopSourceReview" ref={root} onKeyDown={e=>{if(open&&e.key==='Escape'){e.preventDefault();e.stopPropagation();setOpen(false);root.current?.querySelector('button')?.focus();}}}>
    <button type="button" className="desktopSourceReviewToggle" aria-expanded={open} aria-controls="desktop-source-review" onClick={()=>setOpen(v=>!v)}>원본 대조 <span aria-hidden="true">{open?'▴':'▾'}</span></button>
    <div className="desktopReviewQuick" role="group" aria-label={t('editor.reviewQuick')}>
      <button type="button" aria-label={t('editor.reviewPrevious')} disabled={!positions.length} onClick={()=>{move(-1);setOpen(false);}}><ChevronLeft size={18}/></button>
      <output aria-live="polite" aria-atomic="true"><strong>{current?reviewTargetLabel(current):t(positions.length?'editor.reviewRemaining':'editor.reviewComplete',{value1:positions.length})}</strong>{positions.length>0&&<span>{current?t('editor.reviewProgress',{value1:currentIndex+1,value2:positions.length}):t('editor.reviewArrowHint')}</span>}</output>
      <button type="button" aria-label={t('editor.reviewNext')} disabled={!positions.length} onClick={()=>{move(1);setOpen(false);}}><ChevronRight size={18}/></button>
    </div>
    {open&&<section id="desktop-source-review" className="desktopSourceReviewPanel" aria-label="원본 대조 도구">
      <div className="desktopSourceReviewTitle"><strong>원본 대조</strong><button type="button" aria-label="원본 대조 도구 닫기" onClick={()=>setOpen(false)}>×</button></div>
      <p>인식 결과를 확인할 위치로 이동합니다. 음표나 수정 내역은 바뀌지 않습니다.</p>
      <div className="desktopSourceReviewPosition"><label>원본 페이지 <select aria-label="원본 페이지로 이동" value={source?.page??pages[0]} onChange={e=>{movePage(Number(e.target.value));setOpen(false);}}>{pages.map(page=><option key={page} value={page}>{page} / {document.pdfTabImport?.summary.pages??pages.length}페이지</option>)}</select></label><span>현재 {cursor.bar+1}마디 · {cursor.event+1}번째 위치{event?.pdfImport?.placeholderOnly?' · 리듬 확인 필요':''}</span></div>
      <small>전체 {document.measures.length}마디 · 의심 구간 {review}마디</small>
      <div className="desktopSourceReviewConfirm"><p>원본과 비교해 음표·쉼표·리듬을 모두 확인했다면 이 마디를 완료로 표시하세요.</p><button type="button" disabled={!canConfirm} onClick={()=>{if(onConfirm()!==false)setOpen(false);}}>{cursor.bar+1}마디 확인 완료로 표시</button></div>
      {pitchRepair&&<div className="desktopStaffPitchRepair" role="status"><span>{t(pitchRepair.canRepair?'editor.staffPitchRepairHint':'editor.staffPitchRepairEdited')}</span><button type="button" disabled={!pitchRepair.canRepair} onClick={onRepairPitch}>{t('editor.staffPitchRepair')}</button></div>}
      <PdfTabCoverageNotice summary={document.pdfTabImport?.summary}/>
    </section>}
  </div>;
}
