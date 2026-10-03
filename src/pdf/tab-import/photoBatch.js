import {TAB_IMPORT_CONFIG as C} from './config.js';
import {tabSourceKind,loadTabImage,drawTabImage,importImageTab} from './imageTabSource.js';
import {summarizeAnalysis} from './recognition.js';
import {createTabPageAnalyzer} from './analyzeTabPage.js';

const sameFile=(a,b)=>a.name===b.name&&a.size===b.size&&a.lastModified===b.lastModified;
export function photoFilesToAdd(existing,files){
  const added=[];
  for(const file of [...files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}))){
    if(tabSourceKind(file)!=='image')throw Error('사진 묶음에는 JPG·PNG만 추가할 수 있습니다. PDF는 하나씩 선택해 주세요.');
    if(![...existing,...added].some(old=>sameFile(old,file)))added.push(file);
  }
  const all=[...existing,...added];
  if(all.length>C.maxPages)throw Error(`사진은 한 번에 ${C.maxPages}장까지 가져올 수 있습니다.`);
  if(all.reduce((n,f)=>n+f.size,0)>C.maxFileBytes)throw Error('선택한 사진의 전체 용량을 40MB 이하로 줄여 주세요.');
  return added;
}
export async function preparePhoto(file,{signal}={}){
  const source=await loadTabImage(file,{signal});let canvas;
  try{
    canvas=drawTabImage(source,0,560);
    return {id:crypto.randomUUID(),file,fileName:file.name,width:source.width,height:source.height,preview:canvas.toDataURL('image/jpeg',.85),rotation:0};
  }finally{source.close();if(canvas)canvas.width=canvas.height=0;}
}
export async function importPhotoBatch(photos,{signal,onProgress=()=>{},...options}={}){
  if(!photos.length)throw Error('악보 사진을 선택해 주세요.');
  const pages=[],sources=[],analyzer=createTabPageAnalyzer(signal);
  try{
  for(const [index,photo] of photos.entries()){
    signal?.throwIfAborted();
    onProgress({progress:index/photos.length,message:`${index+1} / ${photos.length}페이지 · ${photo.fileName}`});
    const source=await loadTabImage(photo.file,{signal});
    try{
      const result=await importImageTab(source,{...options,signal,analyzer,rotation:photo.rotation,pageNumber:index+1,onProgress:p=>onProgress({...p,progress:(index+p.progress)/photos.length,message:`${index+1} / ${photos.length}페이지 · ${p.message}`})});
      pages.push(...result.pages);sources.push({page:index+1,fileName:photo.fileName,rotation:photo.rotation*90});
    }catch(error){if(error.name==='AbortError')throw error;error.message=`${index+1}페이지 (${photo.fileName}): ${error.message}`;throw error;}
    finally{source.close();}
  }
  return {version:C.version,fileName:photos[0].fileName,sourceType:'image',imageRotation:photos[0].rotation*90,imageSources:sources,pages,summary:summarizeAnalysis(pages)};
  }finally{await analyzer.close();}
}
