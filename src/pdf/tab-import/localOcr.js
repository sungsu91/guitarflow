import {createWorker,PSM,OEM} from 'tesseract.js';
import {TAB_IMPORT_CONFIG as C} from './config.js';
import {abortable} from './abortable.js';

// Every asset is served locally. No PDF data or crop leaves the browser.
export async function createLocalOcr(signal){
  let worker,closed=false;
  let rejectEngine;
  const engineFailure=new Promise((_,reject)=>{rejectEngine=reject;});
  const pending=createWorker('eng',OEM.LSTM_ONLY,{workerPath:'/tab-ocr/worker.min.js',corePath:'/tab-ocr/core',langPath:'/tab-ocr/lang',workerBlobURL:false,cacheMethod:'none',errorHandler:error=>rejectEngine(Error(String(error)))});
  const loading=Promise.race([pending,engineFailure]);
  const abort=()=>{if(worker&&!closed){closed=true;void worker.terminate();}};signal?.addEventListener('abort',abort,{once:true});
  pending.then(w=>{if(signal?.aborted)void w.terminate();},()=>{});
  try{worker=await abortable(loading,signal);signal?.throwIfAborted();await abortable(worker.setParameters({tessedit_char_whitelist:'0123456789Xx',user_defined_dpi:'300',classify_enable_learning:'0'}),signal);}
  catch(error){worker?.terminate();signal?.removeEventListener('abort',abort);throw error;}
  return {worker,close:async()=>{signal?.removeEventListener('abort',abort);if(!closed){closed=true;await worker.terminate();}}};
}

function reading(data){
  const words=(data.blocks??[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words))),symbols=words.flatMap(w=>w.symbols);
  // Isolated glyphs use CHARACTER confidence. Word confidence is retained for
  // auditing; Tesseract scores these two different units differently.
  return {text:words.map(w=>w.text).join('').trim(),confidence:symbols.length?Math.min(...symbols.map(s=>s.confidence))/100:0,wordConfidence:data.confidence/100,
    alternatives:words.length===1?(words[0].choices??[]).map(c=>({text:c.text,confidence:c.confidence/100})):[]};
}

export async function recognizeCandidates(geometry,ocr,{signal,onProgress}={}){
  const candidates=geometry.staffs.flatMap(s=>s.candidates.map(c=>({candidate:c,staff:s})));
  if(candidates.length>C.maxCandidatesPerPage)throw Error('이 페이지의 기호가 너무 많습니다. TAB 영역만 있는 PDF로 다시 시도해 주세요.');
  const crop=document.createElement('canvas'),small=document.createElement('canvas');crop.width=112;crop.height=88;
  const ctx=crop.getContext('2d');
  try{for(const [i,{candidate:c,staff}] of candidates.entries()){
    signal?.throwIfAborted();
    if(c.ocr?.method==='pdf-text-on-tab-line')continue;
    const overlapsBar=staff.bars.some(x=>x>=c.x-staff.spacing*.20&&x<=c.x+c.width+staff.spacing*.20);
    if(c.stringDistance>C.stringTolerance||overlapsBar){c.ocr={text:'',confidence:0,agrees:false,method:'geometry-rejected'};}
    else {
      small.width=c.width;small.height=c.height;const sctx=small.getContext('2d'),image=sctx.createImageData(c.width,c.height);
      for(let j=0;j<c.grayscale.length;j++){const v=c.grayscale[j];image.data.set([v,v,v,255],j*4);}sctx.putImageData(image,0,0);
      const reads=[];
      // Separate crop scales/segmentation modes must agree. Never concatenate
      // neighboring rhythmic slots into a two-digit fret.
      for(const [mode,targetHeight] of [[PSM.SINGLE_WORD,44],[PSM.RAW_LINE,52]]){
        const scale=Math.min(targetHeight/c.height,76/c.width),w=c.width*scale,h=c.height*scale;
        ctx.fillStyle='white';ctx.fillRect(0,0,crop.width,crop.height);ctx.imageSmoothingEnabled=true;ctx.drawImage(small,(crop.width-w)/2,(crop.height-h)/2,w,h);
        await abortable(ocr.worker.setParameters({tessedit_pageseg_mode:mode}),signal);
        reads.push(reading((await abortable(ocr.worker.recognize(crop,{}, {blocks:true,text:true}),signal)).data));signal?.throwIfAborted();
      }
      c.ocr={text:reads[0].text,confidence:Math.min(...reads.map(r=>r.confidence)),wordConfidence:Math.min(...reads.map(r=>r.wordConfidence)),agrees:reads[0].text===reads[1].text,alternatives:reads.flatMap(r=>r.alternatives),method:'local-tesseract-character-two-scales'};
      if(c.ocr.text==='7'&&c.sevenCap===false)c.ocr.shapeRejected='rest-like-seven';
    }
    delete c.bitmap;delete c.grayscale;
    if(i%10===0||i===candidates.length-1)onProgress?.((i+1)/candidates.length);
  }}finally{crop.width=crop.height=small.width=small.height=0;}
  return geometry;
}
