import {drawTabImage} from './imageTabSource.js';
import {geometryInWorker} from './analyzeTabPage.js';
import {resolveImportTarget} from './importTarget.js';

function processPixels(action,pixels,scan,signal){
 signal?.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./paperScan.worker.js',import.meta.url),{type:'module'});
  let finished=false;
  const finish=(error,result)=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(result);};
  const abort=()=>finish(new DOMException('Aborted','AbortError'));
  const timer=setTimeout(()=>finish(Error('사진 보정 시간이 초과되었습니다. 원본으로 분석하거나 다시 시도해 주세요.')),30000);
  worker.onmessage=({data})=>finish(data.error?Error(data.error):null,data);
  worker.onerror=e=>{e.preventDefault?.();finish(Error(e.message||'사진 보정에 실패했습니다.'));};
  worker.onmessageerror=()=>finish(Error('사진 보정 결과를 읽지 못했습니다.'));
  signal?.addEventListener('abort',abort,{once:true});
  try{worker.postMessage({action,data:pixels.data,width:pixels.width,height:pixels.height,scan},[pixels.data.buffer]);}catch(e){finish(e);}
 });
}

export async function detectPhotoPaper(source,{signal}={}){
 const canvas=drawTabImage(source,0,Math.min(420,source.width));
 try{return await processPixels('detect',canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height),null,signal);}
 finally{canvas.width=canvas.height=0;}
}

export async function scanPhotoSource(source,scan,{signal,maxSide=3000}={}){
 if(!scan?.enabled)return source;
 const scale=Math.min(1,maxSide/Math.max(source.width,source.height),Math.sqrt(6000000/(source.width*source.height)));
 const raw=drawTabImage(source,0,Math.max(2,Math.round(source.width*scale)));
 try{
  const pixels=raw.getContext('2d',{willReadFrequently:true}).getImageData(0,0,raw.width,raw.height);
  const result=await processPixels('render',pixels,scan,signal);
  const canvas=document.createElement('canvas');canvas.width=result.width;canvas.height=result.height;
  canvas.getContext('2d').putImageData(new ImageData(result.data,result.width,result.height),0,0);
  return {image:canvas,width:canvas.width,height:canvas.height,fileName:source.fileName,photoScan:true,close(){canvas.width=canvas.height=0;}};
 }finally{raw.width=raw.height=0;}
}

// Structure comparison runs before expensive OCR. Equal coverage keeps the
// original recognition path. Manual cropping remains an explicit user choice.
export async function choosePhotoSource(original,corrected,{signal,rotation=0,target,sourceMode='auto',plain}={}){
 if(original===corrected)return {source:original,choice:'original'};
 const count=resolveImportTarget(target).tuning.length;
 const probe=async source=>{
  const results=[];
  for(const width of [2083,2678]){
   signal?.throwIfAborted();const canvas=drawTabImage(source,rotation,width);let pixels;
   try{pixels=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height);}finally{canvas.width=canvas.height=0;}
   const g=await geometryInWorker(pixels,1,signal,[],sourceMode,true,count,source.photoScan===true,false,true);
   // Partial fallback must not change the established original-vs-scan choice.
   // More rows alone cannot prove that a different image preserves known notes.
   results.push(g.photoRecoveryBaseline??(g.partialPhotoTracks?{staffs:0,bars:0}:{staffs:g.staffs.length+(g.notationSystems?.length??0),bars:g.staffs.reduce((s,r)=>s+(r.measures?.length??0),0)}));
  }
  return results.reduce((a,b)=>b.staffs>a.staffs||b.staffs===a.staffs&&b.bars>a.bars?b:a);
 };
 try{
 const before=await probe(original),enhanced=await probe(corrected),unbrightened=plain?await probe(plain):null;
 // When both see the same systems, preserve the original stroke contrast.
 // A stronger threshold can introduce an extra false barline or erase a dot.
 const preferPlain=unbrightened&&unbrightened.staffs>=enhanced.staffs;
 const after=preferPlain?unbrightened:enhanced,candidate=preferPlain?plain:corrected;
 const useCorrection=after.staffs>before.staffs&&after.bars>=before.bars;
 return {source:useCorrection?candidate:original,choice:useCorrection?'corrected':'original',variant:useCorrection?(preferPlain?'perspective':'lighting'):'original',coverage:{original:before,corrected:after,enhanced}};
 }catch(error){if(signal?.aborted||error.name==='AbortError')throw error;return {source:original,choice:'original',warning:error.message};}
}
