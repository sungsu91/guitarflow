import {TAB_IMPORT_CONFIG as C,recognitionStatus} from './config.js';
import {isFretText,normalizeFretText} from './fretText.js';
import {meterTicks} from '../../etudes/scoreMeters.js';
import {HARMONICS} from '../../etudes/scoreTuning.js';
import {measureRecognitionDiagnostics} from './recognitionDiagnostics.js';
import {resolveTabConnections} from './imageTabConnections.js';

export function classifyFret(candidate,slot,staff,config=C){
  const reading=candidate.ocr,confidence={fret:reading?.confidence??0,string:0,rhythm:slot?.confidence??0},reasons=[];
  if(!reading||!isFretText(reading.text))reasons.push('not-a-fret');
  if(candidate.stringDistance>config.stringTolerance)reasons.push('ambiguous-string');
  else confidence.string=.99;
  if(!slot||Math.abs((candidate.slotX??candidate.cx)-slot.x)>staff.spacing*config.slotTolerance)reasons.push('slot-mismatch');
  // Apply the same optical rejection to alternatives as to the winning
  // reading. A "7" without its measured top cap cannot contradict an agreed
  // different digit. Retain the raw alternative for auditing; do not lower
  // OCR confidence thresholds or override a plausible competing glyph.
  if(reading?.alternatives?.some(a=>isFretText(a.text)&&!(normalizeFretText(a.text)==='7'&&candidate.sevenCap===false)&&normalizeFretText(a.text)!==normalizeFretText(reading.text)&&normalizeFretText(a.text).length===candidate.parts&&a.confidence>reading.confidence-config.candidateMargin))reasons.push('ambiguous-digit');
  // Exact native text already passed font-size/spacing checks in pdfText.
  // Raster ink-width limits reject valid wide-font text such as Courier "24".
  if(reading?.text?.length===2&&(candidate.parts!==2||!reading.method?.startsWith('pdf-text-on-tab-line')&&(candidate.width<staff.spacing*.40||candidate.width>staff.spacing*1.35)))reasons.push('ambiguous-double-digit');
  if(reading?.text?.length===1&&candidate.parts>1)reasons.push('overlapping-symbol');
  if(!reading?.agrees)reasons.push('ocr-disagreement');
  if(reading?.shapeRejected)reasons.push(reading.shapeRejected);
  if(candidate.narrowOneCandidate&&normalizeFretText(reading?.text)!=='1')reasons.push('narrow-glyph-not-one');
  if(candidate.harmonic&&!HARMONICS[Number(reading?.text)])reasons.push('unsupported-harmonic-position');
  const status=reasons.length?'rejected':recognitionStatus(Math.min(confidence.fret,confidence.string),config);
  const dead=normalizeFretText(reading?.text)==='X';
  return {candidateId:candidate.id,string:candidate.string,fret:status==='confirmed'?(dead?0:Number(reading.text)):null,...(dead?{dead:true}:{}),...(candidate.harmonic?{harmonic:true}:{}),status,confidence,reasons,source:{x:candidate.x,y:candidate.y,width:candidate.width,height:candidate.height},reading:reading?.text??''};
}

export function resolvePage(geometry,config=C){
  let measureNumber=0;
  let meter=geometry.meter??[4,4],meterEvidence=geometry.meterEvidence??null;
  const staffs=geometry.staffs.map(staff=>{let previousChord=null;if(staff.meterReading?.status==='confirmed'){meter=staff.meterReading.meter;meterEvidence={...staff.meterReading,page:geometry.page};}return {...staff,measures:staff.measures.map(measure=>{
    if(measure.pairedRhythm&&meter.join('/')!==measure.pairedRhythm.meter.join('/'))measure={...measure,rhythm:[],pairedRhythm:null};
    const source={page:geometry.page,staff:staff.id,measure:++measureNumber,x:measure.x,y:measure.y,width:measure.width,height:measure.height,coordinateSpace:'render-pixels',pageWidth:geometry.width,pageHeight:geometry.height};
    const candidates=staff.candidates.filter(c=>!c.restSymbol&&!c.nonFretSymbol&&c.cx>measure.x&&c.cx<measure.x+measure.width);
    const slots=measure.rhythm.map(r=>({...r,notes:[],rejections:[],source:{...source,x:r.x,width:staff.spacing,height:staff.height}}));
    // A confidently read number survives absent/unknown rhythm. Its source
    // column is a review position, never an inferred rhythmic duration.
    for(const c of candidates)if(c.ocr?.agrees&&!c.ocr.shapeRejected&&c.ocr.confidence>=config.confirmed&&isFretText(c.ocr.text)&&c.stringDistance<=config.stringTolerance&&!slots.some(s=>Math.abs(s.x-(c.slotX??c.cx))<=staff.spacing*config.slotTolerance))slots.push({x:c.cx,y:staff.y+staff.height,duration:null,confidence:0,notes:[],rejections:[],source:{...source,x:c.cx,width:staff.spacing,height:staff.height}});
    slots.sort((a,b)=>a.x-b.x);
    const orphan=[];
    for(const candidate of candidates){
      const at=candidate.slotX??candidate.cx,slot=slots.reduce((a,b)=>!a||Math.abs(at-b.x)<Math.abs(at-a.x)?b:a,null),note=classifyFret(candidate,slot,staff,config);
      Object.assign(candidate,{status:note.status,confidence:note.confidence,reasons:note.reasons});
      if(slot&&Math.abs(at-slot.x)<=staff.spacing*config.slotTolerance){
        (note.status==='rejected'?slot.rejections:slot.notes).push(note);
      }else orphan.push({...note,source:{...source,...note.source}});
    }
    // Conflicting same-string candidates invalidate both; no last-write-wins.
    for(const slot of slots)for(const note of slot.notes)if(slot.notes.filter(n=>n.string===note.string).length>1){note.status='unresolved';note.fret=null;note.reasons.push('duplicate-string');}
    for(let i=1;i<slots.length;i++){
      const target=slots[i],origin=slots[i-1],harmonic=target.harmonicTieContinuation;
      if(harmonic&&!target.rest&&!origin.rest&&!target.notes.length&&!target.rejections.length&&!origin.rejections.length&&Math.abs(origin.x-harmonic.fromX)<staff.spacing*.15&&origin.notes.length===harmonic.strings.length&&origin.notes.every(n=>n.status==='confirmed'&&n.harmonic&&!n.dead&&harmonic.strings.includes(n.string))){
        target.notes=origin.notes.map(n=>({...n,candidateId:`${n.candidateId}-tie-${target.x}`,source:{...n.source,x:target.x},method:harmonic.method}));target.tieFromPrevious=true;
      }
      const slot=slots[i],prior=slots[i-1],tie=slot.tieContinuation,note=prior.notes[0];
      if(!tie||slot.rest||prior.rest||slot.notes.length||slot.rejections.length||prior.notes.length!==1||prior.rejections.length||note.status!=='confirmed'||note.dead||Math.abs(prior.x-tie.fromX)>staff.spacing*.15||note.string!==tie.string)continue;
      slot.notes=[{...note,candidateId:`${note.candidateId}-tie-${slot.x}`,source:{...note.source,x:slot.x},method:tie.method}];
      slot.tieFromPrevious=true;
    }
    for(const slot of slots){
      if(slot.repeatPrevious&&previousChord&&!slot.notes.length&&!slot.rejections.length){
        slot.notes=previousChord.map(n=>({...n,candidateId:`${n.candidateId}-repeat-${source.measure}-${slot.x}`,source:{...n.source,x:slot.x,y:staff.lines[2],width:staff.spacing,height:staff.spacing},repeatedFrom:{...n.source},method:'tab-repeat-slash'}));
      }else{
        previousChord=!slot.rest&&slot.notes.length>=2&&slot.notes.every(n=>n.status==='confirmed'&&!n.dead)&&!slot.rejections.length?slot.notes:null;
      }
    }
    resolveTabConnections(slots,staff);
    const ticks=slots.reduce((n,s)=>n+(s.duration?1920/Number(s.duration)*(s.dotted?1.5:1)*(s.tuplet?s.tuplet.normalNotes/s.tuplet.actualNotes:1):0),0);
    const orphanDigits=orphan.filter(n=>isFretText(n.reading));
    const rhythmValid=slots.length>0&&slots.every(s=>s.duration&&s.confidence>=config.confirmed)&&ticks===meterTicks(meter)&&measure.boundariesKnown&&orphanDigits.length===0;
    for(const slot of slots){
      slot.status=rhythmValid&&(slot.rest||slot.notes.length>0)&&slot.notes.every(n=>n.status==='confirmed')&&!slot.rejections.length?'confirmed':'unresolved';
      for(const note of [...slot.notes,...slot.rejections]){const candidate=candidates.find(c=>c.id===note.candidateId);if(candidate){candidate.status=note.status;candidate.reasons=note.reasons;}}
    }
    return {...measure,meter,meterEvidence,source,slots,orphan,ticks,rhythmValid,diagnostics:measureRecognitionDiagnostics(slots,orphan,candidates),needsReview:!rhythmValid||slots.some(s=>s.status!=='confirmed'),reasons:[...(!measure.boundariesKnown?['missing-barline']:[]),...(!rhythmValid?['measure-rhythm-unverified']:[])]};
  })};});
  return {...geometry,staffs,endMeter:meter,endMeterEvidence:meterEvidence};
}

export function summarizeAnalysis(pages){
  const staffs=pages.flatMap(p=>p.staffs),measures=staffs.flatMap(s=>s.measures),slots=measures.flatMap(m=>m.slots);
  const incompletePhotoPages=pages.flatMap(p=>{
    if(p.partialPhotoTracks)return [{page:p.page,...p.partialPhotoTracks}];
    const rows=(p.partLayout?.rows??[]).filter(r=>!p.selectedPart||r.part===p.selectedPart),missing=rows.filter(r=>r.staffId===null);
    return missing.length?[{page:p.page,detected:rows.length,recovered:rows.length-missing.length,missing:missing.map(r=>({track:r.row,center:(r.top+r.bottom)/2,spacing:r.spacing,part:r.part,system:r.system}))}]:[];
  });
  const barCountMismatches=pages.flatMap(p=>p.staffs.filter(s=>s.notation?.barCountRetry&&!s.notation.barCountRetry.accepted).map(s=>({page:p.page,staff:s.id,recognized:s.notation.barCountRetry.originalCount,detected:s.notation.barCountRetry.sourceCount})));
  return {pages:pages.length,pagesWithoutTab:pages.filter(p=>!p.staffs.some(s=>s.measures.length)).map(p=>p.page),staffs:staffs.length,measures:measures.length,
    ...(pages.some(p=>p.cameraCorrection)?{correctedPhotoPages:pages.filter(p=>p.cameraCorrection).map(p=>p.page)}:{}),
    ...(incompletePhotoPages.length?{incompletePhotoPages}:{}),
    ...(barCountMismatches.length?{barCountMismatches}:{}),
    confirmed:slots.reduce((n,s)=>n+s.notes.filter(n=>n.status==='confirmed').length,0),
    repeatedFrets:slots.reduce((n,s)=>n+s.notes.filter(n=>n.status==='confirmed'&&n.method==='tab-repeat-slash').length,0),
    unresolved:slots.filter(s=>s.status==='unresolved').length+measures.filter(m=>!m.slots.length).length,
    rejected:measures.reduce((n,m)=>n+m.orphan.length+m.slots.reduce((n,s)=>n+s.rejections.length,0),0),
    needsReview:measures.filter(m=>m.needsReview).length,
    diagnostics:measures.flatMap(m=>m.diagnostics??[]).reduce((counts,item)=>{counts[item.stage]=(counts[item.stage]??0)+1;return counts;},{}),
    chords:slots.filter(s=>s.notes.filter(n=>n.status==='confirmed').length>1).length,
    eighths:slots.filter(s=>s.duration==='8'&&s.status==='confirmed').length,
    sixteenths:slots.filter(s=>s.duration==='16'&&s.status==='confirmed').length};
}
