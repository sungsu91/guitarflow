import {loadPdfTask} from '../pdfRenderer.js';
import {TAB_IMPORT_CONFIG as C} from './config.js';
import {createLocalOcr,recognizeCandidates} from './localOcr.js';
import {resolvePage,summarizeAnalysis} from './recognition.js';
import {projectPdfText} from './pdfText.js';

function geometryInWorker(image,page,signal,glyphs){
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./geometry.worker.js',import.meta.url),{type:'module'});
    const finish=(fn,value)=>{signal?.removeEventListener('abort',abort);worker.terminate();fn(value);};
    const abort=()=>finish(reject,new DOMException('분석 취소','AbortError'));
    signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage=({data})=>data.error?finish(reject,Error(data.error)):finish(resolve,data.result);
    worker.onerror=e=>finish(reject,Error(e.message||'TAB 분석 Worker 오류'));
    if(signal?.aborted){abort();return;}
    worker.postMessage({rgba:image.data.buffer,width:image.width,height:image.height,page,glyphs},[image.data.buffer]);
  });
}

export async function importPdfTab(file,{signal,onProgress=()=>{},debug=false}={}){
  if(!file||file.size>C.maxFileBytes)throw Error('40MB 이하의 기타 TAB PDF를 선택해 주세요.');
  if(!/\.pdf$/i.test(file.name))throw Error('PDF 파일을 선택해 주세요.');
  signal?.throwIfAborted();
  const task=loadPdfTask(new Uint8Array(await file.arrayBuffer())),pages=[],previews=[];
  let ocr,render;
  const abort=()=>{render?.cancel();void task.destroy();};signal?.addEventListener('abort',abort,{once:true});
  try{
    onProgress({progress:0,message:'PDF 페이지 확인 중…'});
    const pdf=await task.promise;signal?.throwIfAborted();
    if(pdf.numPages>C.maxPages)throw Error(`한 번에 ${C.maxPages}페이지까지 분석할 수 있습니다.`);
    for(let number=1;number<=pdf.numPages;number++){
      signal?.throwIfAborted();
      const page=await pdf.getPage(number),base=page.getViewport({scale:1}),scale=Math.min(C.renderScale,Math.sqrt(C.maxPixels/(base.width*base.height))),viewport=page.getViewport({scale}),canvas=document.createElement('canvas');
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      try{
        onProgress({progress:(number-1)/pdf.numPages,message:`${number} / ${pdf.numPages}페이지 · TAB 6줄과 마디 분석 중…`});
        const ctx=canvas.getContext('2d',{willReadFrequently:true});render=page.render({canvasContext:ctx,viewport});await render.promise;render=null;signal?.throwIfAborted();
        if(debug){const preview=document.createElement('canvas');preview.width=900;preview.height=Math.round(900*canvas.height/canvas.width);preview.getContext('2d').drawImage(canvas,0,0,preview.width,preview.height);previews.push(preview.toDataURL('image/jpeg',.8));preview.width=preview.height=0;}
        const glyphs=projectPdfText(await page.getTextContent(),viewport);
        const geometry=await geometryInWorker(ctx.getImageData(0,0,canvas.width,canvas.height),number,signal,glyphs);
        canvas.width=canvas.height=0;
        if(!ocr&&geometry.staffs.some(s=>s.candidates.some(c=>!c.ocr)))ocr=await createLocalOcr(signal);
        await recognizeCandidates(geometry,ocr,{signal,onProgress:f=>onProgress({progress:(number-1+.15+f*.8)/pdf.numPages,message:`${number} / ${pdf.numPages}페이지 · 프렛 후보 확인 중…`})});
        const resolved=resolvePage(geometry);pages.push(resolved);
        if(debug)console.info('[PDF TAB]',`Page ${number}`,summarizeAnalysis([resolved]));
        await new Promise(resolve=>setTimeout(resolve,0));
      }finally{canvas.width=canvas.height=0;page.cleanup();}
    }
    const summary=summarizeAnalysis(pages);
    if(!summary.staffs)throw Error('인식 가능한 6현 TAB 영역을 찾지 못했습니다. 선명하고 수평인 TAB PDF가 필요합니다.');
    const result={version:C.version,fileName:file.name,pages,summary,...(debug?{previews}:{})};
    if(debug)console.info('[PDF TAB] Final',summary);
    onProgress({progress:1,message:'TAB 분석 완료'});return result;
  }finally{signal?.removeEventListener('abort',abort);await ocr?.close();await task.destroy();}
}
