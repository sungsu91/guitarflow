import {t} from '../../i18n/core.js';

// A small display copy only. Never resize or replace recognition pixels.
export function importSourcePreview(canvas){
  const scale=Math.min(1,360/canvas.width,440/canvas.height),copy=document.createElement('canvas');
  try{
    copy.width=Math.max(1,Math.round(canvas.width*scale));copy.height=Math.max(1,Math.round(canvas.height*scale));
    copy.getContext('2d').drawImage(canvas,0,0,copy.width,copy.height);
    return {url:copy.toDataURL('image/jpeg',.8),width:copy.width,height:copy.height};
  }catch{return null;}finally{copy.width=copy.height=0;}
}

export function importSourceRegion(rect,width,height){
  if(!rect||!(width>0&&height>0))return null;
  const x=Math.max(0,rect.x/width),y=Math.max(0,rect.y/height);
  return {x,y,width:Math.max(0,Math.min(1-x,rect.width/width)),height:Math.max(0,Math.min(1-y,rect.height/height))};
}

// Both layouts use the running job's source, never the selected photo tab.
export function importActivityDetails(progress,{pdfFile,photos=[]}={}){
  const source=progress.source??{},detail=progress.detail??{},preview=source.preview;
  const fileName=source.fileName??pdfFile?.name??photos[0]?.fileName??'';
  const pageLabel=source.page&&source.pages?t('editor.importSourcePage',{value1:source.page,value2:source.pages}):'';
  const location=detail.staff?t('editor.importSourceStaff',{value1:detail.staff,value2:detail.total}):'';
  const measure=detail.measure?t('editor.importSourceMeasure',{value1:detail.measure}):'';
  const operationKeys={system:'editor.importReadStaff',rhythm:'editor.importCheckRhythm',measure:'editor.importCheckMeasure',bars:'editor.importCheckBars'};
  const phaseKeys={structure:'editor.importFindStructure',chords:'editor.importReadChords',model:'editor.importLoadModel',convert:'editor.importBuildScore',complete:'editor.importPageDone'};
  const key=operationKeys[detail.operation]??phaseKeys[detail.phase];
  const region=preview&&detail.region?{x:detail.region.x*preview.width,y:detail.region.y*preview.height,width:detail.region.width*preview.width,height:detail.region.height*preview.height}:null;
  return {fileName,pageLabel,location:[location,measure].filter(Boolean).join(' · '),stage:key?t(key):'',preview,region,longWait:detail.phase==='symbols'&&detail.seconds>=30};
}
