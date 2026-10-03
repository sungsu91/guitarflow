import {unresolvedPositions,hasPdfImport,measureNeedsImportReview} from './scoreAdapter.js';

export function pdfTabReview(document,cursor,onSelect){
  const positions=unresolvedPositions(document),event=document.measures[cursor.bar]?.events[cursor.event];
  const pages=[...new Set(document.measures.map(m=>m.pdfImport?.source?.page).filter(Boolean))];
  const movePage=page=>{const bar=document.measures.findIndex(m=>m.pdfImport?.source?.page===page);if(bar>=0)onSelect({bar,event:0,string:document.measures[bar].events[0]?.notes[0]?.string??document.tuning.length,mode:'tab'});};
  const move=direction=>{
    const here=cursor.bar*100+cursor.event;
    const next=direction>0?positions.find(p=>p.bar*100+p.event>here)??positions[0]:positions.findLast(p=>p.bar*100+p.event<here)??positions.at(-1);
    if(next)onSelect(next);
  };
  return {imported:hasPdfImport(document),positions,event,source:event?.pdfImport?.source,pages,movePage,move,
    review:document.measures.filter(measureNeedsImportReview).length,
    canConfirm:Boolean(document.measures[cursor.bar]&&measureNeedsImportReview(document.measures[cursor.bar]))};
}
