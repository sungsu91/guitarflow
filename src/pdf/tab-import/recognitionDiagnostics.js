import {isFretText} from './fretText.js';

// Persist compact evidence, not image buffers. A missing numeral and a
// detected-but-rejected numeral need different fixes on the next audit.
export function measureRecognitionDiagnostics(slots,orphan,candidates){
 const byId=new Map(candidates.map(c=>[c.id,c])),issues=[];
 for(const [event,slot] of slots.entries()){
  if(!slot.rest&&!slot.notes.length&&!slot.rejections.length)issues.push({stage:'candidate-not-found',event,source:slot.source});
  for(const note of [...slot.notes,...slot.rejections].filter(n=>n.status!=='confirmed'))record(note,event);
 }
 for(const note of orphan.filter(n=>isFretText(n.reading)))record(note,null);
 function record(note,event){
  const candidate=byId.get(note.candidateId),ocr=candidate?.ocr;
  const stage=event===null?'slot-alignment':ocr?.method==='geometry-rejected'?'geometry-rejected':
   !isFretText(note.reading)?'glyph-unread':!ocr?.agrees?'ocr-disagreement':note.reasons?.length?'validation-rejected':'low-confidence';
  issues.push({stage,event,candidateId:note.candidateId,string:note.string,source:note.source,reading:note.reading,
   confidence:ocr?.confidence??0,reasons:note.reasons??[],...(ocr?.preprocessAttempts?{preprocessAttempts:ocr.preprocessAttempts}:{})});
 }
 return issues;
}
