import {resolveImportTarget,importOctaveShift,missingTabMessage} from './importTarget.js';
import {loadTabPdf} from './loadTabPdf.js';
import {abortable} from './abortable.js';
import {TAB_IMPORT_CONFIG as C} from './config.js';
import {createTabPageAnalyzer} from './analyzeTabPage.js';
import {summarizeAnalysis} from './recognition.js';
import {projectPdfText,hasRotatedTabText} from './pdfText.js';
import {combineZoomReadings} from './zoomConsensus.js';
import {projectChordText} from './chordRecognition.js';
import {importScanMessage} from './importProgress.js';
import {applyPairedNotationChecks} from './pairedNotation.js';
import {importSourcePreview} from './importActivity.js';
import {createImportCheckpoint,importFileKey,pageBatchEnd} from './importCheckpoint.js';

export async function importPdfTab(file,{signal,onProgress=()=>{},onCheckpoint,resume,pageLimit=Infinity,debug=false,includeSourcePreview=false,renderScale=C.renderScale,autoZoom=true,octaveShift,target:requestedTarget,sourceMode='auto',verifyNotation=false}={}){
  const target=resolveImportTarget(sourceMode==='grand'?{instrument:'piano',...requestedTarget,notationPitch:'concert'}:requestedTarget);octaveShift??=importOctaveShift(target);
  if(!file||file.size>C.maxFileBytes)throw Error('40MB 이하의 악보 PDF를 선택해 주세요.');
  if(!/\.pdf$/i.test(file.name))throw Error('PDF 파일을 선택해 주세요.');
  signal?.throwIfAborted();
  const bytes=await abortable(file.arrayBuffer(),signal);signal?.throwIfAborted();
  const task=loadTabPdf(new Uint8Array(bytes),signal),previews=[];
  let checkpoint,analyzer,render,meter=[4,4],meterEvidence=null;
  const abort=()=>{render?.cancel();void task.destroy();};signal?.addEventListener('abort',abort,{once:true});
  try{
    onProgress({progress:0,message:'PDF 페이지 확인 중…',source:{fileName:file.name,kind:'pdf'}});
    const pdf=await task.wait(task.promise);signal?.throwIfAborted();
    if(pdf.numPages>C.maxPages)throw Error(`한 번에 ${C.maxPages}페이지까지 분석할 수 있습니다.`);
    checkpoint=createImportCheckpoint({base:{version:C.version,fileName:file.name,target},keys:Array(pdf.numPages).fill(importFileKey(file)),settings:{version:C.version,target,sourceMode,verifyNotation,renderScale,autoZoom,octaveShift},resume,onCheckpoint});
    const saved=checkpoint.context;
    meter=saved.meter??meter;meterEvidence=saved.meterEvidence??null;
    analyzer=createTabPageAnalyzer(signal,saved.analyzer);
    checkpoint.publish();
    const end=pageBatchEnd(checkpoint.count,pdf.numPages,pageLimit);
    for(let number=checkpoint.count+1;number<=end;number++){
      signal?.throwIfAborted();
      const page=await task.wait(pdf.getPage(number)),base=page.getViewport({scale:1}),canvas=document.createElement('canvas');
      let source={fileName:file.name,kind:'pdf',page:number,pages:pdf.numPages,preview:null};
      try{
        const read=async(requestedScale,zoom=false)=>{
        const scale=Math.min(Math.max(2,Math.min(5,requestedScale)),Math.sqrt(C.maxPixels/(base.width*base.height))),viewport=page.getViewport({scale});
        canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
        onProgress({progress:(number-1+(zoom ? .55 : 0))/pdf.numPages,message:`${number} / ${pdf.numPages}페이지 · ${importScanMessage(sourceMode,{zoom})}`,source,detail:{phase:'structure'}});
        const ctx=canvas.getContext('2d',{willReadFrequently:true});render=page.render({canvasContext:ctx,viewport});await task.wait(render.promise);render=null;signal?.throwIfAborted();
        if(includeSourcePreview)source={...source,preview:importSourcePreview(canvas)};
        if(debug&&!zoom){const preview=document.createElement('canvas');preview.width=900;preview.height=Math.round(900*canvas.height/canvas.width);preview.getContext('2d').drawImage(canvas,0,0,preview.width,preview.height);previews.push(preview.toDataURL('image/jpeg',.8));preview.width=preview.height=0;}
        const content=await task.wait(page.getTextContent());
        if(hasRotatedTabText(content,viewport))throw Error(`${number}페이지의 TAB 숫자가 옆으로 또는 거꾸로 놓여 있습니다. PDF 방향을 바로잡은 후 다시 선택해 주세요.`);
        const glyphs=projectPdfText(content,viewport),chordText=projectChordText(content,viewport);
        const image=ctx.getImageData(0,0,canvas.width,canvas.height);
        canvas.width=canvas.height=0;
        return analyzer.analyze(image,{page:number,glyphs,chordText,meter,meterEvidence,octaveShift,target,sourceMode,verifyNotation,onProgress:(f,detail)=>onProgress({progress:(number-1+(zoom ? .55 : .1)+f*.4)/pdf.numPages,message:`${number} / ${pdf.numPages}페이지 · ${importScanMessage(sourceMode,{phase:'symbols',zoom,detail})}`,source,detail})});
        };
        let resolved=await read(renderScale);
        const summary=summarizeAnalysis([resolved]);
        // Native fret text can still have tiny/unreadable rhythm strokes. Also
        // retry a page whose staff geometry could not be found at the base size.
        if(autoZoom&&!resolved.notation&&renderScale<4.5&&(summary.needsReview||!summary.staffs)&&Math.sqrt(C.maxPixels/(base.width*base.height))>renderScale*1.1){
          resolved=combineZoomReadings(resolved,await read(4.5,true));
        }
        resolved=applyPairedNotationChecks(resolved,target);
        meter=resolved.endMeter;meterEvidence=resolved.endMeterEvidence;
        checkpoint.commit(resolved,{meter,meterEvidence,analyzer:analyzer.getContext()});
        onProgress({progress:number/pdf.numPages,message:`${number} / ${pdf.numPages}페이지 · 분석 완료`,source,detail:{phase:'complete'}});
        if(debug)console.info('[PDF TAB]',`Page ${number}`,summarizeAnalysis([resolved]));
        await new Promise(resolve=>setTimeout(resolve,0));
      }finally{canvas.width=canvas.height=0;page.cleanup();}
    }
    const result=checkpoint.snapshot(),summary=result.summary;
    if(!summary.staffs)throw Error(sourceMode==='staff'?'오선보의 음을 찾지 못했습니다. TAB 숫자가 있는 악보라면 ‘TAB → TAB’을 선택해 주세요.':sourceMode==='tab'?missingTabMessage(target):'악보의 음을 찾지 못했습니다. 선명하고 수평인 악보 PDF가 필요합니다.');
    if(debug)result.previews=previews;
    if(debug)console.info('[PDF TAB] Final',summary);
    onProgress({progress:result.completed/result.totalPages,message:result.complete?'TAB 분석 완료':`${result.completed} / ${result.totalPages}페이지 완료 · 이어서 분석할 수 있습니다.`});return result;
  }catch(error){
    // Keep completed pages available for diagnostics/retry without returning
    // a truncated score as a successful import. Originals remain untouched.
    if(checkpoint)error.partialAnalysis=checkpoint.snapshot();
    throw error;
  }finally{signal?.removeEventListener('abort',abort);try{await analyzer?.close();}finally{await task.destroy();}}
}
