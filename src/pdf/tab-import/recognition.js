import {TAB_IMPORT_CONFIG as C,recognitionStatus} from './config.js';
import {isFretText,normalizeFretText} from './fretText.js';
import {meterTicks} from '../../etudes/scoreMeters.js';

export function classifyFret(candidate,slot,staff,config=C){
  const reading=candidate.ocr,confidence={fret:reading?.confidence??0,string:0,rhythm:slot?.confidence??0},reasons=[];
  if(!reading||!isFretText(reading.text))reasons.push('not-a-fret');
  if(candidate.stringDistance>config.stringTolerance)reasons.push('ambiguous-string');
  else confidence.string=.99;
  if(!slot||Math.abs(candidate.cx-slot.x)>staff.spacing*config.slotTolerance)reasons.push('slot-mismatch');
  if(reading?.alternatives?.some(a=>isFretText(a.text)&&normalizeFretText(a.text)!==normalizeFretText(reading.text)&&normalizeFretText(a.text).length===candidate.parts&&a.confidence>reading.confidence-config.candidateMargin))reasons.push('ambiguous-digit');
  if(reading?.text?.length===2&&(candidate.parts!==2||candidate.width<staff.spacing*.40||candidate.width>staff.spacing*1.35))reasons.push('ambiguous-double-digit');
  if(reading?.text?.length===1&&candidate.parts>1)reasons.push('overlapping-symbol');
  if(!reading?.agrees)reasons.push('ocr-disagreement');
  if(reading?.shapeRejected)reasons.push(reading.shapeRejected);
  const status=reasons.length?'rejected':recognitionStatus(Math.min(confidence.fret,confidence.string),config);
  const dead=normalizeFretText(reading?.text)==='X';
  return {candidateId:candidate.id,string:candidate.string,fret:status==='confirmed'?(dead?0:Number(reading.text)):null,...(dead?{dead:true}:{}),status,confidence,reasons,source:{x:candidate.x,y:candidate.y,width:candidate.width,height:candidate.height},reading:reading?.text??''};
}

export function resolvePage(geometry,config=C){
  let measureNumber=0;
  let meter=geometry.meter??[4,4],meterEvidence=geometry.meterEvidence??null;
  const staffs=geometry.staffs.map(staff=>{let previousChord=null;if(staff.meterReading?.status==='confirmed'){meter=staff.meterReading.meter;meterEvidence={...staff.meterReading,page:geometry.page};}return {...staff,measures:staff.measures.map(measure=>{
    const source={page:geometry.page,staff:staff.id,measure:++measureNumber,x:measure.x,y:measure.y,width:measure.width,height:measure.height,coordinateSpace:'render-pixels',pageWidth:geometry.width,pageHeight:geometry.height};
    const candidates=staff.candidates.filter(c=>!c.restSymbol&&!c.nonFretSymbol&&c.cx>measure.x&&c.cx<measure.x+measure.width);
    const slots=measure.rhythm.map(r=>({...r,notes:[],rejections:[],source:{...source,x:r.x,width:staff.spacing,height:staff.height}}));
    // A confidently read number survives absent/unknown rhythm. Its source
    // column is a review position, never an inferred rhythmic duration.
    for(const c of candidates)if(c.ocr?.agrees&&!c.ocr.shapeRejected&&c.ocr.confidence>=config.confirmed&&isFretText(c.ocr.text)&&c.stringDistance<=config.stringTolerance&&!slots.some(s=>Math.abs(s.x-c.cx)<=staff.spacing*config.slotTolerance))slots.push({x:c.cx,y:staff.y+staff.height,duration:null,confidence:0,notes:[],rejections:[],source:{...source,x:c.cx,width:staff.spacing,height:staff.height}});
    slots.sort((a,b)=>a.x-b.x);
    const orphan=[];
    for(const candidate of candidates){
      const slot=slots.reduce((a,b)=>!a||Math.abs(candidate.cx-b.x)<Math.abs(candidate.cx-a.x)?b:a,null),note=classifyFret(candidate,slot,staff,config);
      Object.assign(candidate,{status:note.status,confidence:note.confidence,reasons:note.reasons});
      if(slot&&Math.abs(candidate.cx-slot.x)<=staff.spacing*config.slotTolerance){
        (note.status==='rejected'?slot.rejections:slot.notes).push(note);
      }else orphan.push({...note,source:{...source,...note.source}});
    }
    // Conflicting same-string candidates invalidate both; no last-write-wins.
    for(const slot of slots)for(const note of slot.notes)if(slot.notes.filter(n=>n.string===note.string).length>1){note.status='unresolved';note.fret=null;note.reasons.push('duplicate-string');}
    for(const slot of slots){
      if(slot.repeatPrevious&&previousChord&&!slot.notes.length&&!slot.rejections.length){
        slot.notes=previousChord.map(n=>({...n,candidateId:`${n.candidateId}-repeat-${source.measure}-${slot.x}`,source:{...n.source,x:slot.x,y:staff.lines[2],width:staff.spacing,height:staff.spacing},repeatedFrom:{...n.source},method:'tab-repeat-slash'}));
      }else{
        previousChord=!slot.rest&&slot.notes.length>=2&&slot.notes.every(n=>n.status==='confirmed'&&!n.dead)&&!slot.rejections.length?slot.notes:null;
      }
    }
    const ticks=slots.reduce((n,s)=>n+(s.duration?1920/Number(s.duration)*(s.dotted?1.5:1)*(s.tuplet?2/3:1):0),0);
    const orphanDigits=orphan.filter(n=>isFretText(n.reading));
    const rhythmValid=slots.length>0&&slots.every(s=>s.duration&&s.confidence>=config.confirmed)&&ticks===meterTicks(meter)&&measure.boundariesKnown&&orphanDigits.length===0;
    for(const slot of slots){
      slot.status=rhythmValid&&(slot.rest||slot.notes.length>0)&&slot.notes.every(n=>n.status==='confirmed')&&!slot.rejections.length?'confirmed':'unresolved';
      for(const note of [...slot.notes,...slot.rejections]){const candidate=candidates.find(c=>c.id===note.candidateId);if(candidate){candidate.status=note.status;candidate.reasons=note.reasons;}}
    }
    return {...measure,meter,meterEvidence,source,slots,orphan,ticks,rhythmValid,needsReview:!rhythmValid||slots.some(s=>s.status!=='confirmed'),reasons:[...(!measure.boundariesKnown?['missing-barline']:[]),...(!rhythmValid?['measure-rhythm-unverified']:[])]};
  })};});
  return {...geometry,staffs,endMeter:meter,endMeterEvidence:meterEvidence};
}

export function summarizeAnalysis(pages){
  const staffs=pages.flatMap(p=>p.staffs),measures=staffs.flatMap(s=>s.measures),slots=measures.flatMap(m=>m.slots);
  return {pages:pages.length,staffs:staffs.length,measures:measures.length,
    confirmed:slots.reduce((n,s)=>n+s.notes.filter(n=>n.status==='confirmed').length,0),
    repeatedFrets:slots.reduce((n,s)=>n+s.notes.filter(n=>n.status==='confirmed'&&n.method==='tab-repeat-slash').length,0),
    unresolved:slots.filter(s=>s.status==='unresolved').length+measures.filter(m=>!m.slots.length).length,
    rejected:measures.reduce((n,m)=>n+m.orphan.length+m.slots.reduce((n,s)=>n+s.rejections.length,0),0),
    needsReview:measures.filter(m=>m.needsReview).length,
    chords:slots.filter(s=>s.notes.filter(n=>n.status==='confirmed').length>1).length,
    eighths:slots.filter(s=>s.duration==='8'&&s.status==='confirmed').length,
    sixteenths:slots.filter(s=>s.duration==='16'&&s.status==='confirmed').length};
}
