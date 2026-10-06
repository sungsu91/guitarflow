import {repeatStructure} from '../../etudes/scoreNavigation.js';

// Repeat dots are independent of note OCR. If numbered endings were found,
// retain the evidence but do not apply a partial (and incorrect) repeat route.
export function applyImportedNavigation(document){
 const systems=document.pdfTabImport?.notation?.systems??[];
 const endings=systems.some(s=>s.endingBrackets?.length);
 const incomplete=repeatStructure(document.measures).issues.length>0;
 if(!endings&&!incomplete)return document;
 document.pdfTabImport.repeatNavigationPending=true;
 if(document.pdfTabImport.notation)document.pdfTabImport.notation.repeatNavigationPending=true;
 document.measures=document.measures.map(m=>{
  if(!m.repeatStart&&!m.repeatEnd)return m;
  const {repeatStart,repeatEnd,...rest}=m;
  return {...rest,pdfImport:{...m.pdfImport,repeatMarks:{...(repeatStart?{repeatStart:true}:{}),...(repeatEnd?{repeatEnd:true}:{})},reasons:[...(m.pdfImport?.reasons??[]),endings?'repeat-endings-unverified':'repeat-pair-unverified']}};
 });
 return document;
}
