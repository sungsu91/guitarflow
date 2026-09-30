import {createBlankDocument,blankEvent,newId,ticksOf} from '../../etudes/scoreModel.js';
import {TAB_IMPORT_CONFIG as C} from './config.js';

export function analysisToDocument(analysis){
  const allMeasures=analysis.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures));
  const sourceMeasures=allMeasures;
  if(!sourceMeasures.length||sourceMeasures.length>C.maxMeasures)throw Error(`제작실은 한 악보에 1~${C.maxMeasures}마디를 지원합니다. 전체 페이지를 가져오지 못해 생성하지 않았습니다.`);
  const doc=createBlankDocument();
  doc.title=analysis.fileName.replace(/\.pdf$/i,'')+' · TAB 초안';doc.english=doc.title;
  doc.purpose='PDF TAB 자동 초안 · ? 위치와 원본 PDF를 검토해 주세요.';
  doc.pdfTabImport={version:C.version,fileName:analysis.fileName,summary:analysis.summary,assumedMeter:[4,4],unverifiedSettings:['tempo','key','tuning','capo'],coordinateSpace:'render-pixels'};
  doc.pdfTabImport.importRange={start:1,end:sourceMeasures.length,total:allMeasures.length};
  let pageStart=0;
  doc.pdfTabImport.pages=analysis.pages.map(p=>{const count=p.staffs.reduce((n,s)=>n+s.measures.length,0),range={page:p.page,start:pageStart,end:pageStart+count,count};pageStart+=count;return range;});
  doc.measures=sourceMeasures.map((measure,index)=>{
    let onset=0;
    // Pitch and rhythm are independent evidence. Keep verified fret/string
    // pairs even when the bar's rhythm requires review; compilation blocks play.
    const overflow=measure.slots.length>16,knownGrid=measure.rhythmValid&&!overflow;
    // Dense noise must not erase an entire bar of verified fret numbers. Keep
    // all pitched columns when they fit, then fill the remaining review cells.
    const pitched=measure.slots.filter(s=>s.notes.some(n=>n.status==='confirmed'));
    const selected=overflow&&pitched.length<=16?new Set([...pitched,...measure.slots.filter(s=>!pitched.includes(s)).slice(0,16-pitched.length)]):null;
    const mapped=selected?measure.slots.filter(s=>selected.has(s)):measure.slots;
    const slots=mapped.length&&mapped.length<=16?mapped:[{source:measure.source,notes:[],rejections:[],duration:null,status:'unresolved'}];
    const keepDurations=!overflow&&slots.every(s=>s.duration)&&slots.reduce((sum,s)=>sum+ticksOf(s),0)<=1920;
    const gridDuration=slots.length<=4?'4':slots.length<=8?'8':'16';
    const events=slots.map(slot=>{
      const duration=keepDurations?slot.duration:gridDuration,notes=slot.notes.filter(n=>n.status==='confirmed').map(n=>({id:newId('tone'),string:n.string,fret:n.fret,locked:true,confidence:n.confidence,source:{...slot.source,...n.source,measure:index+1}}));
      const event={...blankEvent(onset,duration),notes,rest:notes.length===0,blank:notes.length===0&&!slot.rest,...(keepDurations&&slot.tuplet?{tuplet:{...slot.tuplet,groupId:`${doc.id}-${index}-${slot.tuplet.groupId}`}}:{}),...(keepDurations&&slot.dotted?{dotted:true}:{})};onset+=ticksOf(event);
      event.pdfImport={status:overflow?'unresolved':slot.status,source:{...slot.source,measure:index+1},confidence:{fret:slot.notes.length?Math.min(...slot.notes.map(n=>n.confidence.fret)):0,string:slot.notes.length?Math.min(...slot.notes.map(n=>n.confidence.string)):0,rhythm:knownGrid?slot.confidence:0},recognizedDuration:slot.duration, rhythmVerified:knownGrid,
        pendingStrings:[...new Set([...slot.notes.filter(n=>n.status!=='confirmed'),...slot.rejections].map(n=>n.string))],candidates:[...slot.notes,...slot.rejections],placeholderOnly:!knownGrid};
      return event;
    });
    return {id:newId('bar'),chord:null,harmony:null,events,pdfImport:{needsReview:measure.needsReview||overflow,source:{...measure.source,measure:index+1},rhythmVerified:knownGrid,reasons:[...measure.reasons,...(overflow?['too-many-source-columns']:[])],orphan:measure.orphan,...(overflow?{unmappedSlots:measure.slots.filter(s=>!slots.includes(s))}: {})}};
  });
  return doc;
}

export function unresolvedPositions(doc){
  return doc.measures.flatMap((m,bar)=>m.events.flatMap((e,event)=>e.pdfImport?.status==='unresolved'?[{bar,event,string:e.pdfImport.pendingStrings?.[0]??1,mode:'tab'}]:[]));
}

export const measureNeedsImportReview=m=>Boolean(m.pdfImport?.needsReview||m.events.some(e=>e.pdfImport?.status==='unresolved'));
export const hasPdfImport=doc=>Boolean(doc.pdfTabImport||doc.measures.some(m=>m.pdfImport||m.events.some(e=>e.pdfImport)));

// Called only at an editor commit. A pitch edit resolves the string actually
// entered, never all other strings in a partially recognized chord.
export function reconcileImportedEdits(before,after){
  if(!hasPdfImport(after))return after;
  const oldEvents=new Map(before.measures.flatMap(m=>m.events.map(e=>[e.id,e])));
  let changed=false;
  const measures=after.measures.map(m=>{
    let touched=false;
    const events=m.events.map(e=>{
      const meta=e.pdfImport,prior=oldEvents.get(e.id);
      if(!meta||meta.status!=='unresolved'||!prior||prior===e)return e;
      const changedStrings=e.notes.filter(n=>!prior.notes.some(p=>p.string===n.string&&p.fret===n.fret)).map(n=>n.string);
      const restEntered=e.rest&&!e.blank&&(prior.blank||!prior.rest);
      if(!changedStrings.length&&!restEntered)return e;
      const pendingStrings=(meta.pendingStrings??[]).filter(s=>!changedStrings.includes(s));
      const confirmed=meta.rhythmVerified&&(restEntered||!pendingStrings.length&&e.notes.length>0);
      touched=changed=true;
      return {...e,pdfImport:{...meta,pendingStrings,status:confirmed?'confirmed':'unresolved',reviewedBy:confirmed?'user':undefined}};
    });
    if(!touched)return m;
    return {...m,events,...(m.pdfImport?{pdfImport:{...m.pdfImport,needsReview:!m.pdfImport.rhythmVerified||events.some(e=>e.pdfImport?.status==='unresolved')}}:{})};
  });
  return changed?{...after,measures}:after;
}

export function confirmImportedMeasure(doc,bar){
  const m=doc.measures[bar];
  if(!m||!m.pdfImport&&!m.events.some(e=>e.pdfImport))return doc;
  let at=0;
  for(const e of m.events){if(e.blank||e.onset!==at)throw Error('빈칸을 음표 또는 쉼표로 채우고 4/4 박자를 맞춰 주세요.');at+=ticksOf(e);}
  if(at!==1920)throw Error('마디의 음가 합계가 정확히 4박이어야 합니다.');
  return {...doc,measures:doc.measures.map((item,i)=>i!==bar?item:{...item,pdfImport:{...item.pdfImport,needsReview:false,rhythmVerified:true,reviewedBy:'user'},events:item.events.map(e=>e.pdfImport?{...e,pdfImport:{...e.pdfImport,status:'confirmed',rhythmVerified:true,placeholderOnly:false,pendingStrings:[],reviewedBy:'user'}}:e)})};
}
