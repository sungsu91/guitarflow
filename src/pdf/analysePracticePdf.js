import {mergePracticeDetections,PRACTICE_DETECTION_VERSION} from './autoMeasures.js';
import {t} from '../i18n/core.js';
import {loadPdfTask} from './pdfRenderer.js';

function analyse(image,page,signal){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./autoMeasures.worker.js',import.meta.url),{type:'module'});
  const finish=(fn,value)=>{signal?.removeEventListener('abort',abort);worker.terminate();fn(value);};
  const abort=()=>finish(reject,new DOMException('분석 취소','AbortError'));
  signal?.addEventListener('abort',abort,{once:true});
  worker.onmessage=({data})=>{
   if(data.error)finish(reject,Error(data.error));
   else if(data.result.engineVersion!==PRACTICE_DETECTION_VERSION)finish(reject,Error(t('pdf.autoDetectorMismatch')));
   else finish(resolve,data.result);
  };
  worker.onerror=e=>finish(reject,Error(e.message));
  if(signal?.aborted){abort();return;}
  worker.postMessage({rgba:image.data.buffer,width:image.width,height:image.height,page},[image.data.buffer]);
 });
}
export async function analysePracticePdf(blob,{signal,onProgress=()=>{}}={}){
 signal?.throwIfAborted();
 const bytes=new Uint8Array(await blob.arrayBuffer());
 const sourceHash=globalThis.crypto?.subtle?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join(''):null;
 // Analyse original image data. Native image resizing can soften or remove
 // thin TAB rules differently from the PDF displayed in another browser.
 const task=loadPdfTask(bytes,{analysis:true}),pages=[];
 let render;
 const abort=()=>{render?.cancel();void task.destroy();};signal?.addEventListener('abort',abort,{once:true});
 try{
  const pdf=await task.promise;
  for(let n=1;n<=pdf.numPages;n++){
   signal?.throwIfAborted();onProgress(t('pdf.autoPageProgress',{page:n,pages:pdf.numPages}));
   const page=await pdf.getPage(n),base=page.getViewport({scale:1}),detections=[];
   try{
    for(const requestedScale of [3.5,3]){
     const viewport=page.getViewport({scale:Math.min(requestedScale,Math.sqrt(12000000/(base.width*base.height)))}),canvas=document.createElement('canvas');
     try{
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      render=page.render({canvasContext:ctx,viewport});await render.promise;render=null;
      signal?.throwIfAborted();detections.push(await analyse(ctx.getImageData(0,0,canvas.width,canvas.height),n,signal));
     }finally{canvas.width=canvas.height=0;}
    }
    pages.push(mergePracticeDetections(...detections));
   }finally{page.cleanup();}
  }
  return {engineVersion:PRACTICE_DETECTION_VERSION,sourceHash,sourceBytes:blob.size,pages,summary:{pages:pages.length,systems:pages.reduce((s,p)=>s+p.systems.length,0),measures:pages.reduce((s,p)=>s+p.measures.length,0),review:pages.reduce((s,p)=>s+p.measures.filter(m=>m.confidence<.9).length,0)}};
 }finally{signal?.removeEventListener('abort',abort);await task.destroy();}
}
