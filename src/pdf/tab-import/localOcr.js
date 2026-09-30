import {createWorker,PSM,OEM} from 'tesseract.js';
import {TAB_IMPORT_CONFIG as C} from './config.js';
import {abortable} from './abortable.js';
import {glyphFeature,corroboratePageGlyphs} from './glyphConsensus.js';
import {isFretText,normalizeFretText} from './fretText.js';
const cropCache=new Map();let cacheBytes=0;
const MAX_CACHE_BYTES=32*1024*1024;
export const clearOcrCache=()=>{cropCache.clear();cacheBytes=0;};
function cacheReading(key,reading){
  const bytes=2*(key.length+JSON.stringify(reading).length);
  while(cropCache.size&&(cacheBytes+bytes>MAX_CACHE_BYTES||cropCache.size>=20000)){const oldest=cropCache.keys().next().value;cacheBytes-=cropCache.get(oldest).bytes;cropCache.delete(oldest);}
  cropCache.set(key,{reading:structuredClone(reading),bytes});cacheBytes+=bytes;
}

export function agreeReadings(reads){
  reads=reads.map(r=>({...r,text:normalizeFretText(r.text)}));
  const groups=new Map();
  for(const r of reads){const items=groups.get(r.text)??[];items.push(r);groups.set(r.text,items);}
  const ranked=[...groups].filter(([text])=>isFretText(text)).map(([text,items])=>({text,items:items.sort((a,b)=>b.confidence-a.confidence)})).sort((a,b)=>(b.items[1]?.confidence??0)-(a.items[1]?.confidence??0));
  const best=ranked[0],confidence=best?.items[1]?.confidence??0;
  const conflict=reads.some(r=>r.text!==best?.text&&isFretText(r.text)&&r.confidence>=C.confirmed);
  return {text:best?.text??reads[0]?.text??'',confidence,agrees:Boolean(best?.items.length>=2&&!conflict),alternatives:reads.filter(r=>r.text&&r.text!==best?.text).map(r=>({text:r.text,confidence:r.confidence})),wordConfidence:best?.items[0]?.wordConfidence??0};
}

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
  const features=new Map(candidates.flatMap(({candidate:c})=>{const feature=glyphFeature(c);return feature?[[c.id,feature]]:[];}));
  const crop=document.createElement('canvas'),small=document.createElement('canvas');crop.width=144;crop.height=112;
  const ctx=crop.getContext('2d');
  try{for(const [i,{candidate:c,staff}] of candidates.entries()){
    signal?.throwIfAborted();
    if(c.ocr?.method==='pdf-text-on-tab-line')continue;
    const overlapsBar=staff.bars.some(x=>x>=c.x-staff.spacing*.20&&x<=c.x+c.width+staff.spacing*.20);
    if(c.restSymbol||c.nonFretSymbol||c.stringDistance>C.stringTolerance||overlapsBar){c.ocr={text:'',confidence:0,agrees:false,method:'geometry-rejected'};}
    else {
      const cacheKey=`${c.width},${c.height},${c.parts}:`+btoa(String.fromCharCode(...c.grayscale));
      if(cropCache.has(cacheKey)){const hit=cropCache.get(cacheKey);cropCache.delete(cacheKey);cropCache.set(cacheKey,hit);c.ocr={...structuredClone(hit.reading),cacheHit:true};}
      else{
      small.width=c.width;small.height=c.height;const sctx=small.getContext('2d'),image=sctx.createImageData(c.width,c.height);
      for(let j=0;j<c.grayscale.length;j++){const v=c.grayscale[j];image.data.set([v,v,v,255],j*4);}sctx.putImageData(image,0,0);
      const reads=[];
      // Separate crop scales/segmentation modes must agree. Never concatenate
      // neighboring rhythmic slots into a two-digit fret.
      for(const [mode,targetHeight,threshold] of [[PSM.SINGLE_WORD,44,null],[PSM.RAW_LINE,52,null],[PSM.SINGLE_LINE,24,null],[c.parts===1?PSM.SINGLE_CHAR:PSM.SINGLE_LINE,36,null],[PSM.SINGLE_LINE,48,null],[c.parts===1?PSM.SINGLE_CHAR:PSM.SINGLE_WORD,72,145],[PSM.SINGLE_WORD,80,185]]){
        if(reads.length>=2&&agreeReadings(reads).agrees&&agreeReadings(reads).confidence>=C.confirmed)break;
        if(threshold){for(let j=0;j<c.grayscale.length;j++){const v=c.grayscale[j]<threshold?0:255;image.data.set([v,v,v,255],j*4);}sctx.putImageData(image,0,0);}
        // Keep the established white margin for the two original scales.
        // A larger box alone changes Tesseract's isolated-character scores.
        crop.width=threshold?144:112;crop.height=threshold?112:88;
        const scale=Math.min(targetHeight/c.height,110/c.width),w=c.width*scale,h=c.height*scale;
        ctx.fillStyle='white';ctx.fillRect(0,0,crop.width,crop.height);ctx.imageSmoothingEnabled=true;ctx.drawImage(small,(crop.width-w)/2,(crop.height-h)/2,w,h);
        await abortable(ocr.worker.setParameters({tessedit_pageseg_mode:mode}),signal);
        reads.push(reading((await abortable(ocr.worker.recognize(crop,{}, {blocks:true,text:true}),signal)).data));signal?.throwIfAborted();
      }
      c.ocr={...agreeReadings(reads),attempts:reads.length,enlarged:reads.length>2,method:'local-tesseract-character-multiscale'};
      cacheReading(cacheKey,c.ocr);
      }
      if(c.ocr.text==='7'&&c.sevenCap===false)c.ocr.shapeRejected='rest-like-seven';
    }
    delete c.bitmap;delete c.grayscale;
    if(i%10===0||i===candidates.length-1)onProgress?.((i+1)/candidates.length);
  }}finally{crop.width=crop.height=small.width=small.height=0;}
  corroboratePageGlyphs(geometry,features);
  return geometry;
}
