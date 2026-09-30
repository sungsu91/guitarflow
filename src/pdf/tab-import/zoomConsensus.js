import {resolvePage,summarizeAnalysis} from './recognition.js';

const frets=m=>m.slots.flatMap(s=>s.notes.filter(n=>n.status==='confirmed').map(n=>({string:n.string,fret:n.fret,x:(s.x-m.x)/m.width})));
const readable=c=>c?.ocr?.agrees&&!c.ocr.shapeRejected&&c.ocr.confidence>=.90&&/^\d{1,2}$/.test(c.ocr.text)&&Number(c.ocr.text)<=24&&!c.ocr.alternatives?.some(a=>a.confidence>=.85);

// Re-rendering supplies additional evidence, never additional score positions.
// Only matching bars/strings/columns can corroborate a reading. Two conflicting
// readings are never corroborated; an enlarged page must not drop known notes.
export function combineZoomReadings(original,enlarged){
  if(original.staffs.length!==enlarged.staffs.length||original.staffs.some((s,i)=>s.measures.length!==enlarged.staffs[i].measures.length))return {...original,zoom:{attempted:true,selected:false,reason:'layout-disagreement'}};
  const next=structuredClone(enlarged);
  for(const [i,s] of next.staffs.entries())for(const [j,m] of s.measures.entries()){
    const oldStaff=original.staffs[i],old=oldStaff.measures[j];
    for(const c of s.candidates.filter(c=>c.cx>m.x&&c.cx<m.x+m.width)){
      if(!readable(c))continue;
      const matches=oldStaff.candidates.filter(p=>p.string===c.string&&p.parts===c.parts&&p.cx>old.x&&p.cx<old.x+old.width&&Math.abs((p.cx-old.x)/old.width-(c.cx-m.x)/m.width)<Math.min(oldStaff.spacing/old.width,s.spacing/m.width)*.35);
      if(matches.length!==1||!readable(matches[0]))continue;
      const p=matches[0];
      if(p.ocr.text!==c.ocr.text){c.ocr={...c.ocr,agrees:false,zoomConflict:p.ocr.text};continue;}
      c.ocr={...c.ocr,rawConfidence:c.ocr.confidence,confidence:Math.max(.95,c.ocr.confidence),crossScale:{text:p.ocr.text,confidence:p.ocr.confidence},method:c.ocr.method+'-cross-scale'};
    }
  }
  const resolved=resolvePage(next);
  // Select one version of each complete measure; never concatenate detections.
  // Each selected measure retains its own render dimensions in source metadata.
  let selected=0;
  for(const [i,s] of resolved.staffs.entries())for(const [j,m] of s.measures.entries()){
    const old=original.staffs[i].measures[j],before=frets(old),after=frets(m),tolerance=s.spacing/m.width*.45;
    const preserved=before.every(n=>after.some(p=>p.string===n.string&&p.fret===n.fret&&Math.abs(p.x-n.x)<tolerance));
    if(preserved&&(after.length>before.length||m.rhythmValid&&!old.rhythmValid)){selected++;continue;}
    s.measures[j]=structuredClone(old);
  }
  return {...resolved,zoom:{attempted:true,selected:selected>0,measures:selected,confirmedBefore:summarizeAnalysis([original]).confirmed,confirmedAfter:summarizeAnalysis([resolved]).confirmed}};
}
