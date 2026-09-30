import {unresolvedPositions,hasPdfImport,measureNeedsImportReview} from './scoreAdapter.js';
import './desktopPdfTabImport.css';
export default function DesktopPdfTabReview({document,cursor,onSelect,onConfirm}){
  if(!hasPdfImport(document))return null;
  const positions=unresolvedPositions(document),event=document.measures[cursor.bar]?.events[cursor.event],source=event?.pdfImport?.source,review=document.measures.filter(measureNeedsImportReview).length;
  const pages=[...new Set(document.measures.map(m=>m.pdfImport?.source.page).filter(Boolean))];
  const movePage=page=>{const bar=document.measures.findIndex(m=>m.pdfImport?.source.page===page);if(bar>=0)onSelect({bar,event:0,string:document.measures[bar].events[0]?.notes[0]?.string??6,mode:'tab'});};
  const move=direction=>{
    const here=cursor.bar*100+cursor.event;
    const next=direction>0?positions.find(p=>p.bar*100+p.event>here)??positions[0]:positions.findLast(p=>p.bar*100+p.event<here)??positions.at(-1);
    if(next)onSelect(next);
  };
  return <div className="pdfTabReviewBar" aria-label="PDF TAB 검토"><label>원본 페이지 <select aria-label="원본 페이지로 이동" value={source?.page??pages[0]} onChange={e=>movePage(Number(e.target.value))}>{pages.map(page=><option key={page} value={page}>{page} / {document.pdfTabImport?.summary.pages??pages.length}페이지</option>)}</select></label><span>전체 {document.measures.length}마디 · 미확정 {positions.length}곳 · 검토 {review}마디 {source&&<small>{source.measure}마디{event.pdfImport.placeholderOnly?' · 리듬 미확정':''}</small>}</span><button type="button" disabled={!positions.length} onClick={()=>move(-1)}>이전 미확정</button><button type="button" disabled={!positions.length} onClick={()=>move(1)}>다음 미확정</button><button type="button" disabled={!document.measures[cursor.bar]||!measureNeedsImportReview(document.measures[cursor.bar])} title="원본과 비교해 현재 마디의 프렛·리듬·쉼표를 모두 확인한 후 확정합니다." onClick={onConfirm}>현재 마디 검토 완료</button></div>;
}
