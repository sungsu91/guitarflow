import {PSM} from 'tesseract.js';
import {createOcrWorker} from './ocrWorkerClient.js';
import {TAB_IMPORT_CONFIG as C} from './config.js';
import {abortable} from './abortable.js';
import {glyphFeature,corroboratePageGlyphs} from './glyphConsensus.js';
import {isFretText,normalizeFretText} from './fretText.js';
import {resolvePrintedMeter} from './printedMeter.js';
import {resolveImageTuplets} from './imageTuplets.js';
import {normalizeGlyphPixels} from './glyphPreprocessing.js';
import {trustedGlyphReading,acceptPhotoGlyphRetry} from './photoGlyphRetry.js';
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

export function corroborateMarginReadings(reads,marginReads){
  const margin=agreeReadings(marginReads);
  // A failed retry is not evidence against the original crop. In particular,
  // do not let a stray stem/line reading disable the existing page consensus.
  if(!margin.agrees||margin.confidence<C.confirmed||reads.some(r=>r.text&&normalizeFretText(r.text)!==margin.text&&r.confidence>=.85))return agreeReadings(reads);
  return {...agreeReadings([...reads,...marginReads]),marginRecovered:true};
}

// Every asset is served locally. No PDF data or crop leaves the browser.
export async function createLocalOcr(signal){
  const worker=await createOcrWorker(signal);
  try{await worker.setParameters({tessedit_char_whitelist:'0123456789Xx',user_defined_dpi:'300',classify_enable_learning:'0'});}
  catch(error){await worker.terminate();throw error;}
  return {worker,close:()=>worker.terminate()};
}

function reading(data){
  const words=(data.blocks??[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words))),symbols=words.flatMap(w=>w.symbols);
  // Isolated glyphs use CHARACTER confidence. Word confidence is retained for
  // auditing; Tesseract scores these two different units differently.
  return {text:words.map(w=>w.text).join('').trim(),confidence:symbols.length?Math.min(...symbols.map(s=>s.confidence))/100:0,wordConfidence:data.confidence/100,
    alternatives:words.length===1?(words[0].choices??[]).map(c=>({text:c.text,confidence:c.confidence/100})):[]};
}

export async function recognizeCandidates(geometry,ocr,{signal,onProgress,photoRetry=true}={}){
  const candidates=geometry.staffs.flatMap(s=>[...s.candidates,...(s.meterCandidate?.digits??[]),...(s.tupletCandidates??[])].map(c=>({candidate:c,staff:s})));
  if(candidates.length>C.maxCandidatesPerPage)throw Error('이 페이지의 기호가 너무 많습니다. TAB 영역만 있는 PDF로 다시 시도해 주세요.');
  const features=new Map(candidates.flatMap(({candidate:c})=>{const feature=glyphFeature(c);return feature?[[c.id,feature]]:[];}));
  const crop=document.createElement('canvas'),small=document.createElement('canvas');crop.width=144;crop.height=112;
  const ctx=crop.getContext('2d',{willReadFrequently:true});
  try{for(const [i,{candidate:c,staff}] of candidates.entries()){
    signal?.throwIfAborted();
    if(c.ocr?.method==='pdf-text-on-tab-line')continue;
    const overlapsBar=staff.bars.some(x=>x>=c.x-staff.spacing*.20&&x<=c.x+c.width+staff.spacing*.20);
    if(c.restSymbol||c.nonFretSymbol||c.stringDistance>C.stringTolerance||overlapsBar){c.ocr={text:'',confidence:0,agrees:false,method:'geometry-rejected'};}
    else {
      const cacheKey=`${c.width},${c.height},${c.parts}:`+btoa(String.fromCharCode(...c.grayscale))+(c.paddedGlyph?':pad:'+btoa(String.fromCharCode(...c.paddedGlyph.grayscale)):'');
      if(cropCache.has(cacheKey)){const hit=cropCache.get(cacheKey);cropCache.delete(cacheKey);cropCache.set(cacheKey,hit);c.ocr={...structuredClone(hit.reading),cacheHit:true};}
      else{
      small.width=c.width;small.height=c.height;const sctx=small.getContext('2d');let image=sctx.createImageData(c.width,c.height);
      for(let j=0;j<c.grayscale.length;j++){const v=c.grayscale[j];image.data.set([v,v,v,255],j*4);}sctx.putImageData(image,0,0);
      const reads=[],marginReads=[];
      // Separate crop scales/segmentation modes must agree. Never concatenate
      // neighboring rhythmic slots into a two-digit fret.
      for(const [mode,targetHeight,threshold,padded] of [[PSM.SINGLE_WORD,44,null],[PSM.RAW_LINE,52,null],[PSM.SINGLE_LINE,24,null],[c.parts===1?PSM.SINGLE_CHAR:PSM.SINGLE_LINE,36,null],[PSM.SINGLE_LINE,48,null],[c.parts===1?PSM.SINGLE_CHAR:PSM.SINGLE_WORD,72,145],[PSM.SINGLE_WORD,80,185],...(c.paddedGlyph?[[PSM.SINGLE_WORD,44,null,true],[PSM.SINGLE_CHAR,72,null,true],[PSM.RAW_LINE,52,145,true]]:[])]){
        if(reads.length>=2&&agreeReadings(reads).agrees&&agreeReadings(reads).confidence>=C.confirmed)break;
        // Keep established readings. Only empty or weak tight crops may use
        // the surrounding anti-aliased pixels as an independent retry.
        if(padded&&reads.some(r=>r.text&&r.confidence>=.85))break;
        const source=padded?c.paddedGlyph:c;
        if(padded){small.width=source.width;small.height=source.height;image=sctx.createImageData(source.width,source.height);for(let j=0;j<source.grayscale.length;j++){const v=source.grayscale[j];image.data.set([v,v,v,255],j*4);}sctx.putImageData(image,0,0);}
        if(threshold){for(let j=0;j<source.grayscale.length;j++){const v=source.grayscale[j]<threshold?0:255;image.data.set([v,v,v,255],j*4);}sctx.putImageData(image,0,0);}
        // Keep the established white margin for the two original scales.
        // A larger box alone changes Tesseract's isolated-character scores.
        crop.width=threshold?144:112;crop.height=threshold?112:88;
        const scale=Math.min(targetHeight/source.height,110/source.width),w=source.width*scale,h=source.height*scale;
        ctx.fillStyle='white';ctx.fillRect(0,0,crop.width,crop.height);ctx.imageSmoothingEnabled=true;ctx.drawImage(small,(crop.width-w)/2,(crop.height-h)/2,w,h);
        await abortable(ocr.worker.setParameters({tessedit_pageseg_mode:mode}),signal);
        (padded?marginReads:reads).push(reading((await abortable(ocr.worker.recognize(crop,{}, {blocks:true,text:true}),signal)).data));signal?.throwIfAborted();
      }
      let consensus=corroborateMarginReadings(reads,marginReads),preprocessAttempts=0;
      // Retry only a weak, non-conflicting suggestion. Established readings
      // never change; two processed scales must support the original digit.
      if(!(consensus.agrees&&consensus.confidence>=C.confirmed)&&isFretText(consensus.text)&&
        [...reads,...marginReads].some(r=>normalizeFretText(r.text)===consensus.text&&r.confidence>=.75)&&
        ![...reads,...marginReads].some(r=>isFretText(r.text)&&normalizeFretText(r.text)!==consensus.text&&r.confidence>=.85)){
        small.width=c.width;small.height=c.height;image=sctx.createImageData(c.width,c.height);
        for(let j=0;j<c.grayscale.length;j++){const v=c.grayscale[j];image.data.set([v,v,v,255],j*4);}sctx.putImageData(image,0,0);
        for(const stroke of [-1,1]){
          const processed=[];
          for(const targetHeight of [48,64]){
            crop.width=144;crop.height=112;ctx.fillStyle='white';ctx.fillRect(0,0,144,112);
            const scale=Math.min(targetHeight/c.height,100/c.width),w=c.width*scale,h=c.height*scale;
            ctx.drawImage(small,(144-w)/2,(112-h)/2,w,h);
            ctx.putImageData(normalizeGlyphPixels(ctx.getImageData(0,0,144,112),{stroke}),0,0);
            await abortable(ocr.worker.setParameters({tessedit_pageseg_mode:c.parts===1?PSM.SINGLE_CHAR:PSM.SINGLE_WORD}),signal);
            processed.push(reading((await abortable(ocr.worker.recognize(crop,{}, {blocks:true,text:true}),signal)).data));preprocessAttempts++;signal?.throwIfAborted();
          }
          const retry=agreeReadings(processed);
          if(retry.agrees&&retry.text===consensus.text&&retry.confidence>=C.confirmed){consensus={...retry,preprocessed:stroke<0?'thin':'thicken',originalConfidence:consensus.confidence};break;}
        }
      }
      c.ocr={...consensus,attempts:reads.length+marginReads.length+preprocessAttempts,...(preprocessAttempts?{preprocessAttempts}:{}),enlarged:reads.length>2,method:'local-tesseract-character-multiscale'};
      cacheReading(cacheKey,c.ocr);
      }
      if(c.ocr.text==='7'&&c.sevenCap===false)c.ocr.shapeRejected='rest-like-seven';
    }
    delete c.bitmap;delete c.grayscale;delete c.paddedGlyph;
    if(i%10===0||i===candidates.length-1)onProgress?.((i+1)/candidates.length);
  }}finally{crop.width=crop.height=small.width=small.height=0;}
  corroboratePageGlyphs(geometry,features);
  if(photoRetry){
    const retries={...geometry,staffs:geometry.staffs.map(s=>({...s,meterCandidate:null,tupletCandidates:[],candidates:s.candidates.filter(c=>c.photoRetryGlyph&&!c.restSymbol&&!c.nonFretSymbol&&!trustedGlyphReading(c)&&c.ocr?.method!=='geometry-rejected').map(c=>({...c,...c.photoRetryGlyph,photoRetryGlyph:null,paddedGlyph:null,ocr:null}))}))};
    if(retries.staffs.some(s=>s.candidates.length)){
      await recognizeCandidates(retries,ocr,{signal,photoRetry:false});
      for(const s of retries.staffs)for(const retry of s.candidates){
        const c=geometry.staffs.find(staff=>staff.id===s.id).candidates.find(c=>c.id===retry.id);
        if(acceptPhotoGlyphRetry(c,retry))c.ocr={...retry.ocr,method:'local-camera-complete-glyph',previousReading:c.ocr.text,previousConfidence:c.ocr.confidence};
      }
    }
  }
  for(const s of geometry.staffs)for(const c of s.candidates)delete c.photoRetryGlyph;
  for(const staff of geometry.staffs){staff.meterReading=resolvePrintedMeter(staff.meterCandidate,C.confirmed);delete staff.meterCandidate;resolveImageTuplets(staff);}
  return geometry;
}
