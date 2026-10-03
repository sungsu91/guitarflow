import {loadTabPdf} from './loadTabPdf.js';
import {abortable} from './abortable.js';
import {TAB_IMPORT_CONFIG as C} from './config.js';
import {createTabPageAnalyzer} from './analyzeTabPage.js';
import {summarizeAnalysis} from './recognition.js';
import {projectPdfText,hasRotatedTabText} from './pdfText.js';
import {combineZoomReadings} from './zoomConsensus.js';
import {STAFF_GUITAR_OCTAVE_SHIFT} from '../../omr/staffPitch.js';
import {projectChordText} from './chordRecognition.js';

export async function importPdfTab(file,{signal,onProgress=()=>{},debug=false,renderScale=C.renderScale,autoZoom=true,octaveShift=STAFF_GUITAR_OCTAVE_SHIFT,sourceMode='auto'}={}){
  if(!file||file.size>C.maxFileBytes)throw Error('40MB 이하의 기타 TAB PDF를 선택해 주세요.');
  if(!/\.pdf$/i.test(file.name))throw Error('PDF 파일을 선택해 주세요.');
  signal?.throwIfAborted();
  const bytes=await abortable(file.arrayBuffer(),signal);signal?.throwIfAborted();
  const task=loadTabPdf(new Uint8Array(bytes),signal),pages=[],previews=[];
  const analyzer=createTabPageAnalyzer(signal);
  let render,meter=[4,4],meterEvidence=null;
  const abort=()=>{render?.cancel();void task.destroy();};signal?.addEventListener('abort',abort,{once:true});
  try{
    onProgress({progress:0,message:'PDF 페이지 확인 중…'});
    const pdf=await task.wait(task.promise);signal?.throwIfAborted();
    if(pdf.numPages>C.maxPages)throw Error(`한 번에 ${C.maxPages}페이지까지 분석할 수 있습니다.`);
    for(let number=1;number<=pdf.numPages;number++){
      signal?.throwIfAborted();
      const page=await task.wait(pdf.getPage(number)),base=page.getViewport({scale:1}),canvas=document.createElement('canvas');
      try{
        const read=async(requestedScale,zoom=false)=>{
        const scale=Math.min(Math.max(2,Math.min(5,requestedScale)),Math.sqrt(C.maxPixels/(base.width*base.height))),viewport=page.getViewport({scale});
        canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
        onProgress({progress:(number-1+(zoom ? .55 : 0))/pdf.numPages,message:`${number} / ${pdf.numPages}페이지 · ${zoom?'확대 TAB':'TAB'} 6줄과 마디 분석 중…`});
        const ctx=canvas.getContext('2d',{willReadFrequently:true});render=page.render({canvasContext:ctx,viewport});await task.wait(render.promise);render=null;signal?.throwIfAborted();
        if(debug&&!zoom){const preview=document.createElement('canvas');preview.width=900;preview.height=Math.round(900*canvas.height/canvas.width);preview.getContext('2d').drawImage(canvas,0,0,preview.width,preview.height);previews.push(preview.toDataURL('image/jpeg',.8));preview.width=preview.height=0;}
        const content=await task.wait(page.getTextContent());
        if(hasRotatedTabText(content,viewport))throw Error(`${number}페이지의 TAB 숫자가 옆으로 또는 거꾸로 놓여 있습니다. PDF 방향을 바로잡은 후 다시 선택해 주세요.`);
        const glyphs=projectPdfText(content,viewport),chordText=projectChordText(content,viewport);
        const image=ctx.getImageData(0,0,canvas.width,canvas.height);
        canvas.width=canvas.height=0;
        return analyzer.analyze(image,{page:number,glyphs,chordText,meter,meterEvidence,octaveShift,sourceMode,onProgress:f=>onProgress({progress:(number-1+(zoom ? .55 : .1)+f*.4)/pdf.numPages,message:`${number} / ${pdf.numPages}페이지 · ${zoom?'확대하여 재확인':'악보의 음과 리듬 확인'} 중…`})});
        };
        let resolved=await read(renderScale);
        const summary=summarizeAnalysis([resolved]);
        // Native fret text can still have tiny/unreadable rhythm strokes. Also
        // retry a page whose staff geometry could not be found at the base size.
        if(autoZoom&&!resolved.notation&&renderScale<4.5&&(summary.needsReview||!summary.staffs)&&Math.sqrt(C.maxPixels/(base.width*base.height))>renderScale*1.1){
          resolved=combineZoomReadings(resolved,await read(4.5,true));
        }
        pages.push(resolved);
        meter=resolved.endMeter;meterEvidence=resolved.endMeterEvidence;
        onProgress({progress:number/pdf.numPages,message:`${number} / ${pdf.numPages}페이지 · 분석 완료`});
        if(debug)console.info('[PDF TAB]',`Page ${number}`,summarizeAnalysis([resolved]));
        await new Promise(resolve=>setTimeout(resolve,0));
      }finally{canvas.width=canvas.height=0;page.cleanup();}
    }
    const summary=summarizeAnalysis(pages);
    if(!summary.staffs)throw Error(sourceMode==='staff'?'오선보의 음을 찾지 못했습니다. TAB 숫자가 있는 악보라면 ‘TAB → TAB’을 선택해 주세요.':sourceMode==='tab'?'6현 TAB을 찾지 못했습니다. 음표로 된 악보라면 ‘오선보 → TAB’을 선택해 주세요.':'악보의 음을 찾지 못했습니다. 선명하고 수평인 악보 PDF가 필요합니다.');
    const result={version:C.version,fileName:file.name,pages,summary,...(debug?{previews}:{})};
    if(debug)console.info('[PDF TAB] Final',summary);
    onProgress({progress:1,message:'TAB 분석 완료'});return result;
  }finally{signal?.removeEventListener('abort',abort);await analyzer.close();await task.destroy();}
}
