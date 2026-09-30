import {resolvePage,summarizeAnalysis} from './recognition.js';

const frets=m=>m.slots.flatMap(s=>s.notes.filter(n=>n.status==='confirmed').map(n=>({string:n.string,fret:n.fret,x:(s.x-m.x)/m.width})));
const readable=c=>c?.ocr?.agrees&&!c.ocr.shapeRejected&&c.ocr.confidence>=.90&&/^\d{1,2}$/.test(c.ocr.text)&&Number(c.ocr.text)<=24&&!c.ocr.alternatives?.some(a=>a.confidence>=.85);

function transferReading(target,source,label){
  if(!readable(source)||source.status!=='confirmed'||source.ocr.confidence<.95||target.ocr?.shapeRejected||target.ocr?.method==='geometry-rejected'||readable(target)&&target.ocr.confidence>=.95)return;
  const conflicts=[{text:target.ocr?.text,confidence:target.ocr?.confidence??0},...(target.ocr?.alternatives??[])].some(r=>r.text&&r.text!==source.ocr.text&&r.confidence>=.85);
  if(!conflicts)target.ocr={...structuredClone(source.ocr),rawConfidence:target.ocr?.confidence??0,method:source.ocr.method+'-matched-'+label+'-crop',crossScale:{text:source.ocr.text,confidence:source.ocr.confidence,sourceCandidate:source.id}};
}

// Re-rendering supplies additional evidence, never additional score positions.
// Only matching bars/strings/columns can corroborate a reading. Two conflicting
// readings are never corroborated; an enlarged page must not drop known notes.
export function combineZoomReadings(original,enlarged){
  if(original.staffs.length!==enlarged.staffs.length||original.staffs.some((s,i)=>s.measures.length!==enlarged.staffs[i].measures.length))return {...original,zoom:{attempted:true,selected:false,reason:'layout-disagreement'}};
  const next=structuredClone(enlarged),base=structuredClone(original);
  for(const [i,s] of next.staffs.entries())for(const [j,m] of s.measures.entries()){
    const oldStaff=original.staffs[i],old=oldStaff.measures[j];
    for(const c of s.candidates.filter(c=>c.cx>m.x&&c.cx<m.x+m.width)){
      if(c.restSymbol)continue;
      const matches=oldStaff.candidates.filter(p=>p.string===c.string&&p.parts===c.parts&&p.cx>old.x&&p.cx<old.x+old.width&&Math.abs((p.cx-old.x)/old.width-(c.cx-m.x)/m.width)<Math.min(oldStaff.spacing/old.width,s.spacing/m.width)*.35);
      if(matches.length!==1||matches[0].restSymbol)continue;
      const p=matches[0];
      // One-to-one position matching lets a strong original reading survive a
      // weaker enlarged crop. This combines evidence, never score events. A
      // conflicting enlarged digit still prevents the transfer.
      const reverse= s.candidates.filter(q=>q.string===p.string&&q.parts===p.parts&&q.cx>m.x&&q.cx<m.x+m.width&&Math.abs((q.cx-m.x)/m.width-(p.cx-old.x)/old.width)<Math.min(oldStaff.spacing/old.width,s.spacing/m.width)*.35);
      if(reverse.length!==1)continue;
      const originalCopy=base.staffs[i].candidates.find(q=>q.id===p.id),enlargedSource=enlarged.staffs[i].candidates.find(q=>q.id===c.id);
      transferReading(originalCopy,enlargedSource,'enlarged');
      transferReading(c,p,'original');
      // Corroboration uses only the two unmodified source readings. Transferred
      // evidence must not count as a second independent OCR observation.
      if(!readable(p)||!readable(enlargedSource))continue;
      if(p.ocr.text!==enlargedSource.ocr.text){c.ocr={...c.ocr,agrees:false,zoomConflict:p.ocr.text};continue;}
      for(const [target,other] of [[c,p],[originalCopy,enlargedSource]])target.ocr={...target.ocr,rawConfidence:target.ocr.confidence,confidence:Math.max(.95,target.ocr.confidence),crossScale:{text:other.ocr.text,confidence:other.ocr.confidence},method:target.ocr.method+'-cross-scale'};
    }
  }
  const resolved=resolvePage(next),refinedOriginal=resolvePage(base);
  // Select one version of each complete measure; never concatenate detections.
  // Each selected measure retains its own render dimensions in source metadata.
  let selected=0;
  for(const [i,s] of resolved.staffs.entries())for(const [j,m] of s.measures.entries()){
    const old=refinedOriginal.staffs[i].measures[j],before=frets(old),after=frets(m),tolerance=s.spacing/m.width*.45;
    const preserved=before.every(n=>after.some(p=>p.string===n.string&&p.fret===n.fret&&Math.abs(p.x-n.x)<tolerance));
    const restsPreserved=old.slots.filter(r=>r.rest&&r.confidence>=.95).every(r=>m.slots.some(q=>q.rest&&q.duration===r.duration&&Math.abs((q.x-m.x)/m.width-(r.x-old.x)/old.width)<tolerance));
    if(preserved&&restsPreserved&&(!old.rhythmValid||m.rhythmValid)&&(after.length>before.length||m.rhythmValid&&!old.rhythmValid)){selected++;continue;}
    s.measures[j]=structuredClone(old);
  }
  const recoveredOnOriginal=summarizeAnalysis([refinedOriginal]).confirmed-summarizeAnalysis([original]).confirmed;
  return {...resolved,zoom:{attempted:true,selected:selected>0||recoveredOnOriginal>0,measures:selected,recoveredOnOriginal,confirmedBefore:summarizeAnalysis([original]).confirmed,confirmedAfter:summarizeAnalysis([resolved]).confirmed}};
}
