// A page supplies its own font examples. Only original, independently agreed
// OCR readings can teach this pass; recovered readings never teach each other.
import {TAB_IMPORT_CONFIG as C} from './config.js';

export function glyphFeature(candidate){
  const {grayscale:gray,width,height}=candidate;
  if(!gray?.length)return null;
  const values=new Float32Array(480);
  for(let y=0;y<24;y++)for(let x=0;x<20;x++){
    let sum=0,count=0;
    const x0=Math.floor(x*width/20),y0=Math.floor(y*height/24);
    for(let yy=y0;yy<Math.max(y0+1,Math.ceil((y+1)*height/24));yy++)for(let xx=x0;xx<Math.max(x0+1,Math.ceil((x+1)*width/20));xx++){
      sum+=(255-gray[yy*width+xx])/255;count++;
    }
    values[y*20+x]=sum/count;
  }
  return values;
}
export const glyphSimilarity=(a,b)=>1-a.reduce((sum,value,i)=>sum+Math.abs(value-b[i]),0)/a.length;

export function corroboratePageGlyphs(geometry,features){
  const candidates=geometry.staffs.flatMap(staff=>staff.candidates.filter(c=>!c.nonFretSymbol&&!c.restSymbol&&c.parts===1&&c.stringDistance<=C.stringTolerance&&features.has(c.id)&&staff.measures.some(m=>m.rhythm.some(r=>!r.rest&&Math.abs(r.x-c.cx)<=staff.spacing*C.slotTolerance))));
  const seeds=candidates.filter(c=>c.ocr?.agrees&&c.ocr.confidence>=C.confirmed&&!c.ocr.shapeRejected&&/^[0-9X]$/.test(c.ocr.text)&&!c.ocr.alternatives?.some(a=>a.text!==c.ocr.text&&a.confidence>=.85));
  for(const candidate of candidates){
    const reading=candidate.ocr;
    if(!reading||reading.shapeRejected||reading.method==='geometry-rejected'||reading.agrees&&reading.confidence>=C.confirmed||!/^[0-9X]$/.test(reading.text))continue;
    // Require an OCR suggestion and reject strong contradictory readings.
    if(reading.alternatives?.some(a=>a.text!==reading.text&&a.confidence>=.85))continue;
    const ranked=seeds.filter(s=>s.id!==candidate.id&&Math.abs(s.width/s.height-candidate.width/candidate.height)<.18)
      .map(s=>({id:s.id,text:s.ocr.text,score:glyphSimilarity(features.get(candidate.id),features.get(s.id))})).sort((a,b)=>b.score-a.score);
    const best=ranked[0],second=ranked.find(s=>s.text===best?.text&&s.id!==best.id),other=ranked.find(s=>s.text!==best?.text);
    if(!best||best.text!==reading.text||!second||best.score<.92||second.score<.90||best.score-(other?.score??0)<.06)continue;
    candidate.ocr={...reading,confidence:C.confirmed,agrees:true,rawConfidence:reading.confidence,
      method:reading.method+'-page-glyph-consensus',glyphEvidence:{examples:[best.id,second.id],similarity:best.score,secondSimilarity:second.score,margin:best.score-(other?.score??0)}};
  }
}
