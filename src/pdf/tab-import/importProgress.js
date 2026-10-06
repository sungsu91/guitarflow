import {t} from '../../i18n/core.js';

const scanMessages={
  staff:{structure:'editor.staffStructureProgress',symbols:'editor.staffSymbolsProgress'},
  tab:{structure:'editor.tabStructureProgress',symbols:'editor.tabSymbolsProgress'},
  auto:{structure:'editor.scoreStructureProgress',symbols:'editor.scoreSymbolsProgress'},
};

export function importElapsedTime(seconds=0){
 const total=Math.max(0,Math.floor(seconds)),s=String(total%60).padStart(2,'0'),m=String(Math.floor(total/60)%60).padStart(2,'0'),h=Math.floor(total/3600);
 return h?`${h}:${m}:${s}`:`${m}:${s}`;
}

// Report the selected input type independently of the eventual arrangement.
export function importScanMessage(sourceMode,{phase='structure',zoom=false,detail}={}){
  const phases={structure:'editor.importFindStructure',chords:'editor.importReadChords',model:'editor.importLoadModel',convert:'editor.importBuildScore'};
  let message=t(phases[detail?.phase]??(scanMessages[sourceMode==='grand'?'staff':sourceMode]??scanMessages.auto)[phase]);
  if(detail?.attempt)message+=` · ${t('editor.staffReadingDetail',{value1:detail.staff,value2:detail.total,value3:detail.attempt,value4:detail.seconds})}`;
  return zoom?`${t('editor.zoomAnalysisPrefix')} · ${message}`:message;
}
