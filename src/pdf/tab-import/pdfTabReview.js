import {hasPdfImport,measureNeedsImportReview} from './scoreAdapter.js';

// General source-verification flags are not detected errors. Keep those flags
// on the document, but stop once per bar only for concrete recognition issues.
export function importReviewTargets(document){
  return document.measures.flatMap((measure,bar)=>{
    const targets=new Map();
    const add=(event,reason)=>{
      const item=measure.events[event];if(!item)return;
      if(!targets.has(event))targets.set(event,{cursor:{bar,event,string:item.pdfImport?.pendingStrings?.[0]??item.notes?.[0]?.string??1,mode:document.instrument==='piano'?'staff':'tab',...(document.instrument==='piano'?{hand:item.voice,eventId:item.id,onset:item.onset}:{})},reasons:[]});
      const reasons=targets.get(event).reasons;if(!reasons.includes(reason))reasons.push(reason);
    };
    measure.events.forEach((event,index)=>{
      const meta=event.pdfImport;if(meta?.status!=='unresolved')return;
      if(event.blank||!event.rest&&meta.pendingStrings?.length)add(index,'notes');
      if(meta.placeholderOnly||meta.rhythmVerified===false)add(index,'rhythm');
      if(event.notes?.some(n=>n.unplaced)||meta.reviewReasons?.includes('pitch'))add(index,'notes');
    });
    const meta=measure.pdfImport;
    if(meta?.rhythmVerified===false)add(0,'rhythm');
    if(meta?.reviewedBy!=='user'){
      if(meta?.orphan?.some(n=>n.reading||n.status==='confirmed')||meta?.unmappedSlots?.length)add(0,'notes');
      if(meta?.reasons?.some(r=>['source-bar-count-mismatch','missing-barline','too-many-source-columns'].includes(r)))add(0,'layout');
    }
    if(measure.harmonyReview)add(0,'chord');
    for(const change of measure.harmonyChanges??[])if(change.needsReview){
      const event=measure.events.findIndex(e=>e.onset>=change.onset);add(event<0?0:event,'chord');
    }
    const ordered=[...targets.entries()].sort(([a],[b])=>a-b).map(([,target])=>target);
    const reasons=new Set(ordered.flatMap(t=>t.reasons));
    return ordered.length?[{cursor:ordered[0].cursor,reasons:['notes','rhythm','chord','layout'].filter(r=>reasons.has(r))}]:[];
  });
}

export function pdfTabReview(document,cursor,onSelect){
  const targets=importReviewTargets(document),positions=targets.map(t=>t.cursor),event=document.measures[cursor.bar]?.events[cursor.event];
  const currentIndex=targets.findIndex(t=>t.cursor.bar===cursor.bar);
  const pages=[...new Set(document.measures.map(m=>m.pdfImport?.source?.page).filter(Boolean))];
  const movePage=page=>{const bar=document.measures.findIndex(m=>m.pdfImport?.source?.page===page);if(bar>=0){const first=document.measures[bar].events[0];onSelect({bar,event:0,string:first?.notes[0]?.string??(document.tuning.length||1),mode:document.instrument==='piano'?'staff':'tab',...(document.instrument==='piano'?{hand:first?.voice,eventId:first?.id,onset:first?.onset}:{})});}};
  const move=direction=>{
    const compare=p=>p.bar-cursor.bar||p.event-cursor.event;
    const next=direction>0?targets.find(t=>compare(t.cursor)>0)??targets[0]:targets.findLast(t=>compare(t.cursor)<0)??targets.at(-1);
    if(next)onSelect(next.cursor,next);
  };
  return {imported:hasPdfImport(document),targets,positions,currentIndex,current:targets[currentIndex],event,source:event?.pdfImport?.source??document.measures[cursor.bar]?.pdfImport?.source,pages,movePage,move,
    review:new Set(targets.map(t=>t.cursor.bar)).size,
    canConfirm:Boolean(document.measures[cursor.bar]&&measureNeedsImportReview(document.measures[cursor.bar]))};
}
