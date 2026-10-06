// Report only what the analysis proves. An absent candidate does not tell us
// whether cropping, segmentation or OCR was the original cause.
export function diagnoseNoteFailure({measure,slot,string,type,actual}){
 if(!measure)return {stage:'measure-not-found'};
 if(!slot)return {stage:'rhythm-position-not-found'};
 if(type==='fretErrors')return {stage:'fret-read-mismatch',reading:actual?.reading,confidence:actual?.confidence};
 if(type==='stringErrors')return {stage:'string-assignment-mismatch',source:actual?.source};
 const candidates=[...(slot.rejections??[]),...(slot.notes??[]).filter(n=>n.status!=='confirmed')].filter(n=>n.string===string);
 if(candidates.length)return {stage:'candidate-rejected',candidates:candidates.map(n=>({id:n.candidateId,reading:n.reading,reasons:n.reasons??[],confidence:n.confidence,source:n.source}))};
 return {stage:slot.rest?'position-classified-as-rest':'no-candidate-assigned-to-string',source:slot.source};
}
