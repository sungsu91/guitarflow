import {analysisToDocument} from './scoreAdapter.js';
import {arrangeBass} from '../../etudes/arrangement/arrangeBass.js';
import {resolveImportTarget} from './importTarget.js';

// Grand Staff is read as two piano voices before adapting it to the selected
// bass. The user's destination tuning must not become the recognition target.
export function recognitionTarget(target,sourceMode){
 return sourceMode==='grand'&&target.instrument==='bass'?resolveImportTarget({instrument:'piano',notationPitch:'concert'}):target;
}

export function prepareInstrumentOutput(analysis,{target=analysis.target,part,allowPartial=false,sourceMode}={}){
 target=resolveImportTarget(target);
 const document=analysisToDocument(analysis,{part,allowPartial});
 const systems=document.pdfTabImport?.notation?.systems;
 const nativeBass=systems?.length&&systems.every(s=>s.clef==='clef-F4'&&!s.parts);
 const accompaniment=target.instrument==='bass'&&(sourceMode==='grand'||systems?.length&&!nativeBass);
 if(!accompaniment)return {document};
 try{
  const output=arrangeBass(document,{target,sourceCapo:0}).document;
  output.bassArrangement.automatic=true;
  output.bassArrangement.importCoverage=document.pdfTabImport?.pageCoverage??null;
  return {document:output};
 }catch(error){
  // Preserve recognized pages and open chord correction directly. Never fall
  // back to the old high-register melody while claiming a bass conversion.
  return {document,reviewInstrument:'bass',reviewMessage:error.message,target};
 }
}
