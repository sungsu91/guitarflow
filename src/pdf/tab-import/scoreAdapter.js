import {createBlankDocument,blankEvent,newId,ticksOf} from '../../etudes/scoreModel.js';
import {meterTicks,measureMeters} from '../../etudes/scoreMeters.js';
import {TAB_IMPORT_CONFIG as C} from './config.js';
import {shapeForChordName} from '../../etudes/arpeggioChords.js';
import {applyImportedNavigation} from './importedNavigation.js';

export function analysisToDocument(analysis){
  const allMeasures=analysis.pages.flatMap(p=>p.staffs.flatMap(s=>s.measures));
  const sourceMeasures=allMeasures;
  if(!sourceMeasures.length||sourceMeasures.length>C.maxMeasures)throw Error(`제작실은 한 악보에 1~${C.maxMeasures}마디를 지원합니다. 전체 페이지를 가져오지 못해 생성하지 않았습니다.`);
  const doc=createBlankDocument();doc.meter=sourceMeasures[0].meter??[4,4];
  doc.title=analysis.fileName.replace(/\.(pdf|jpe?g|png)$/i,'')+' · TAB 초안';doc.english=doc.title;
  doc.purpose='TAB 자동 초안 · ? 위치와 원본 악보를 검토해 주세요.';
  doc.pdfTabImport={version:C.version,fileName:analysis.fileName,sourceType:analysis.sourceType??'pdf',...(analysis.sourceType==='image'?{imageRotation:analysis.imageRotation??0}:{}),summary:analysis.summary,...(sourceMeasures[0].meterEvidence?{recognizedMeter:doc.meter,meterEvidence:sourceMeasures[0].meterEvidence}:{assumedMeter:doc.meter}),unverifiedSettings:[...(!sourceMeasures[0].meterEvidence?['meter']:[]),'tempo','key','tuning','capo'],coordinateSpace:'render-pixels'};
  doc.pdfTabImport.importRange={start:1,end:sourceMeasures.length,total:allMeasures.length};
  if(analysis.imageSources)doc.pdfTabImport.imageSources=analysis.imageSources;
  const notationPages=analysis.pages.filter(p=>p.notation);
  if(notationPages.length){
    doc.keySignature={"F#":"Gb","C#":"Db",Cb:'B'}[sourceMeasures[0].key]??sourceMeasures[0].key??'C';
    doc.pdfTabImport.notation={reviewed:false,engine:'CrispEmbed/TrOMR Q8',octaveShift:notationPages[0].octaveShift,systems:notationPages.flatMap(p=>p.staffs.map(s=>({page:p.page,staff:s.id,...s.notation}))),unverified:['pitches','rhythm','ties','repeats']};
  }
  let pageStart=0;
  doc.pdfTabImport.pages=analysis.pages.map(p=>{const count=p.staffs.reduce((n,s)=>n+s.measures.length,0),range={page:p.page,start:pageStart,end:pageStart+count,count};pageStart+=count;return range;});
  let activeHarmony=null;
  doc.measures=sourceMeasures.map((measure,index)=>{
    let onset=0;const meter=measure.meter??doc.meter,capacity=meterTicks(meter),maxSlots=Math.max(16,Math.min(64,capacity/120));
    // Pitch and rhythm are independent evidence. Keep verified fret/string
    // pairs even when the bar's rhythm requires review. Preview playback uses
    // these entered frets without marking the recognition as reviewed.
    const overflow=measure.slots.length>(measure.notation?64:maxSlots),knownGrid=measure.rhythmValid&&!overflow;
    // Dense noise must not erase an entire bar of verified fret numbers. Keep
    // all pitched columns when they fit, then fill the remaining review cells.
    const pitched=measure.slots.filter(s=>s.notes.some(n=>n.status==='confirmed'));
    const selected=overflow&&pitched.length<=maxSlots?new Set([...pitched,...measure.slots.filter(s=>!pitched.includes(s)).slice(0,maxSlots-pitched.length)]):null;
    const mapped=selected?measure.slots.filter(s=>selected.has(s)):measure.slots;
    const slots=mapped.length&&mapped.length<=(measure.notation?64:maxSlots)?mapped:[{source:measure.source,notes:[],rejections:[],duration:null,status:'unresolved'}];
    const keepDurations=!overflow&&slots.every(s=>s.duration)&&(measure.notation||slots.reduce((sum,s)=>sum+ticksOf(s),0)<=capacity);
    const gridDuration=slots.length<=capacity/480?'4':slots.length<=capacity/240?'8':'16';
    const events=slots.map(slot=>{
      const changes=(measure.harmonyChanges??(measure.harmony?[{onset:0,name:measure.harmony}]:[])).filter(c=>c.onset<=onset);
      if(changes.length)activeHarmony=changes.at(-1);
      const slashShape=slot.rhythmSlash&&activeHarmony&&!activeHarmony.needsReview?shapeForChordName(doc,activeHarmony.name):null;
      const duration=keepDurations?slot.duration:measure.notation?(slot.duration??gridDuration):gridDuration;
      const notes=slashShape?.frets?slashShape.frets.flatMap((fret,i)=>fret===null?[]:[{id:newId('tone'),string:6-i,fret,locked:true,source:{...slot.source,measure:index+1,method:'rhythmic-slash-chord',chord:activeHarmony.name}}]):slot.notes.filter(n=>n.status==='confirmed').map(n=>({id:newId('tone'),string:n.string,fret:n.fret,...(n.unplaced?{unplaced:true,midi:n.midi}:{}),...(n.dead?{dead:true}:{}),locked:true,confidence:n.confidence,source:{...slot.source,...n.source,measure:index+1}}));
      const event={...blankEvent(onset,duration),notes,rest:notes.length===0,blank:notes.length===0&&!slot.rest,...(keepDurations&&slot.tuplet?{tuplet:{...slot.tuplet,groupId:`${doc.id}-${index}-${slot.tuplet.groupId}`}}:{}),...((keepDurations||measure.notation)&&slot.dotted?{dotted:true}:{})};onset+=ticksOf(event);
      if(slot.rhythmSlash)event.rhythmSlash=true;
      event.pdfImport={status:overflow?'unresolved':slot.status,source:{...slot.source,measure:index+1},confidence:{fret:slot.notes.length?Math.min(...slot.notes.map(n=>n.confidence.fret)):0,string:slot.notes.length?Math.min(...slot.notes.map(n=>n.confidence.string)):0,rhythm:knownGrid?slot.confidence:0},recognizedDuration:slot.duration, rhythmVerified:knownGrid,
        pendingStrings:[...new Set([...slot.notes.filter(n=>n.status!=='confirmed'),...slot.rejections].map(n=>n.string))],candidates:[...slot.notes,...slot.rejections],placeholderOnly:!knownGrid};
      // Keep every sounding string for playback and staff notation. The view
      // masks only contiguous identical confirmed grips; changes stay visible.
      if(slot.status==='confirmed'&&notes.length>=2&&notes.every(n=>!n.dead))event.tabRepeat=true;
      return event;
    });
    const lastChange=(measure.harmonyChanges??[]).at(-1);if(lastChange)activeHarmony=lastChange;
    return {id:newId('bar'),...(measure.repeatStart?{repeatStart:true}:{}),...(measure.repeatEnd?{repeatEnd:true}:{}),...(measure.endBarline?{endBarline:measure.endBarline}:{}),...(index&&meter.join('/')!==(sourceMeasures[index-1].meter??doc.meter).join('/')?{meter}:{}),chord:null,harmony:measure.harmony??null,...(measure.harmonyReview?{harmonyReview:measure.harmonyReview}:{}),...(measure.harmonyChanges?.length?{harmonyChanges:measure.harmonyChanges,chordNameMode:'manual'}:{}),events,pdfImport:{needsReview:measure.needsReview||overflow,source:{...measure.source,measure:index+1},rhythmVerified:knownGrid,reasons:[...measure.reasons,...(overflow?['too-many-source-columns']:[])],orphan:measure.orphan,...(overflow?{unmappedSlots:measure.slots.filter(s=>!slots.includes(s))}: {})}};
  });
  // Source systems are visual rows, never additional musical measures. Store
  // breaks by stable bar IDs so save/reload and later edits share one layout.
  const systems=analysis.pages.flatMap(p=>p.staffs.filter(s=>s.measures.length).map(s=>({page:p.page,staff:s.id,count:s.measures.length})));
  let start=0;
  doc.pdfTabImport.sourceSystems=systems.map(s=>{const row={...s,measureIds:doc.measures.slice(start,start+s.count).map(m=>m.id)};start+=s.count;return row;});
  doc.viewSettings={...doc.viewSettings,measuresPerRow:Math.max(1,...systems.map(s=>s.count)),systemBreaks:doc.pdfTabImport.sourceSystems.slice(1).map(s=>s.measureIds[0])};
  return applyImportedNavigation(doc);
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
      if(!meta||!prior||prior===e)return e;
      const changedStrings=e.notes.filter(n=>!prior.notes.some(p=>p.string===n.string&&p.fret===n.fret)).map(n=>n.string);
      const restEntered=e.rest&&!e.blank&&(prior.blank||!prior.rest);
      const clearSlash=e.rhythmSlash&&(changedStrings.length||e.notes.length!==prior.notes.length||restEntered);
      const {rhythmSlash,...plain}=e,edited=clearSlash?plain:e;
      if(clearSlash)touched=changed=true;
      if(meta.status!=='unresolved'||!changedStrings.length&&!restEntered)return edited;
      const pendingStrings=(meta.pendingStrings??[]).filter(s=>!changedStrings.includes(s));
      const confirmed=meta.rhythmVerified&&(restEntered||!pendingStrings.length&&e.notes.length>0);
      touched=changed=true;
      return {...edited,pdfImport:{...meta,pendingStrings,status:confirmed?'confirmed':'unresolved',reviewedBy:confirmed?'user':undefined}};
    });
    if(!touched)return m;
    return {...m,events,...(m.pdfImport?{pdfImport:{...m.pdfImport,needsReview:!m.pdfImport.rhythmVerified||events.some(e=>e.pdfImport?.status==='unresolved')}}:{})};
  });
  return changed?{...after,measures}:after;
}

export function confirmImportedMeasure(doc,bar){
  const m=doc.measures[bar];
  if(!m||!m.pdfImport&&!m.events.some(e=>e.pdfImport))return doc;
  const meter=measureMeters(doc)[bar],capacity=meterTicks(meter);let at=0;
  for(const e of m.events){if(e.blank||e.onset!==at)throw Error(`빈칸을 음표 또는 쉼표로 채우고 ${meter.join('/')} 박자를 맞춰 주세요.`);at+=ticksOf(e);}
  if(at!==capacity)throw Error(`마디의 음가 합계가 ${meter.join('/')} 한 마디와 맞아야 합니다.`);
  return {...doc,measures:doc.measures.map((item,i)=>i!==bar?item:{...item,pdfImport:{...item.pdfImport,needsReview:false,rhythmVerified:true,reviewedBy:'user'},events:item.events.map(e=>e.pdfImport?{...e,pdfImport:{...e.pdfImport,status:'confirmed',rhythmVerified:true,placeholderOnly:false,pendingStrings:[],reviewedBy:'user'}}:e)})};
}
