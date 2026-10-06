import {scoreInstrument} from '../etudes/scoreInstruments.js';
import {assignTab,soundingMidi} from '../etudes/scoreTuning.js';

// The destination is the existing guitar score editor. Invert its written
// octave when importing so staff -> TAB -> staff keeps the source position.
export const STAFF_GUITAR_OCTAVE_SHIFT=-12*scoreInstrument('guitar').octaveShift;

export function staffPitchRepairState(document){
  if(document.instrument!=='guitar'||document.pdfTabImport?.notation?.octaveShift!==0||document.pdfTabImport?.notation?.pitchConvention)return null;
  let count=0,edited=0;
  for(const measure of document.measures)for(const event of measure.events){
    if(!event.pdfImport?.source?.notation)continue;
    for(const note of event.notes){
      if(Number.isInteger(note.source?.writtenMidi)&&!note.dead&&!note.harmonic&&soundingMidi(document,note)===note.source.writtenMidi)count++;
      else edited++;
    }
  }
  return count||edited?{count,edited,canRepair:count>0&&edited===0}:null;
}

// Explicit editor action, never an automatic migration: an old zero-shift
// document may also contain deliberate edits. Keep those documents intact.
export function restoreStaffPitch(document){
  const state=staffPitchRepairState(document);
  if(!state)return document;
  if(!state.canRepair)throw Error('음높이를 수정한 음표가 있어 일괄 복원할 수 없습니다. 원본을 다시 불러와 주세요.');
  const destination={...document,autoTab:{mode:'range',min:0,max:4}};
  let previous=[];
  const measures=document.measures.map(measure=>{
    let changed=false;
    const events=measure.events.map(event=>{
      if(!event.pdfImport?.source?.notation)return event;
      const assigned=assignTab(destination,event.notes.map(note=>({...note,midi:note.source.writtenMidi+STAFF_GUITAR_OCTAVE_SHIFT,locked:false,spelling:undefined})),previous);
      previous=assigned;if(!assigned.length)return event;changed=true;
      // The range guides assignment only, as in a fresh staff import. Do not
      // turn a playable high note into a new editor preference warning.
      const notes=assigned.map(({outsidePreferred,...note})=>({...note,locked:true}));
      return {...event,notes,pdfImport:{...event.pdfImport,status:'unresolved',reviewedBy:undefined,candidates:notes.map(note=>({...note,method:'staff-omr',status:'confirmed'}))}};
    });
    return changed?{...measure,events,pdfImport:{...measure.pdfImport,needsReview:true,reviewedBy:undefined}}:measure;
  });
  const notation=document.pdfTabImport.notation;
  return {...document,measures,pdfTabImport:{...document.pdfTabImport,notation:{...notation,reviewed:false,octaveShift:STAFF_GUITAR_OCTAVE_SHIFT,pitchRepair:{version:1,from:0,to:STAFF_GUITAR_OCTAVE_SHIFT},systems:notation.systems?.map(system=>({...system,octaveShift:STAFF_GUITAR_OCTAVE_SHIFT}))}}};
}
