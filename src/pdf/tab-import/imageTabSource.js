import {resolveImportTarget,missingTabMessage} from './importTarget.js';
import {TAB_IMPORT_CONFIG as C} from './config.js';
import {abortable} from './abortable.js';
import {createTabPageAnalyzer} from './analyzeTabPage.js';
import {applyPairedNotationChecks} from './pairedNotation.js';
import {summarizeAnalysis} from './recognition.js';
import {combineZoomReadings} from './zoomConsensus.js';
import {importScanMessage} from './importProgress.js';
import {importSourcePreview} from './importActivity.js';

export const TAB_SOURCE_ACCEPT='.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
export const TAB_PHOTO_ACCEPT='.jpg,.jpeg,.png,image/jpeg,image/png';
export function tabSourceKind(file){
  if(!file||file.size>C.maxFileBytes)throw Error('40MB 이하의 PDF·JPG·PNG 파일을 선택해 주세요.');
  if(/\.pdf$/i.test(file.name))return 'pdf';
  if(/\.(jpe?g|png)$/i.test(file.name)||(!/\.[^.]+$/.test(file.name)&&['image/jpeg','image/png'].includes(file.type)))return 'image';
  throw Error('PDF·JPG·PNG 파일을 선택해 주세요. HEIC 사진은 JPG 또는 PNG로 저장해 주세요.');
}

// Reject decompression-sized input before asking the browser to decode pixels.
export function imageHeaderSize(bytes){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.length>=24&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)&&view.getUint32(12)===0x49484452)return {width:view.getUint32(16),height:view.getUint32(20)};
  if(bytes[0]===255&&bytes[1]===216){
    let i=2;
    while(i+3<bytes.length){
      if(bytes[i++]!==255)break;
      while(bytes[i]===255)i++;
      const marker=bytes[i++];if(marker===0xda||marker===0xd9)break;
      if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
      if(i+2>bytes.length)break;
      const size=view.getUint16(i);if(size<2||i+size>bytes.length)break;
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&size>=7)return {height:view.getUint16(i+3),width:view.getUint16(i+5)};
      i+=size;
    }
  }
  throw Error('사진 파일을 읽지 못했습니다. 원본을 JPG 또는 PNG로 다시 저장해 주세요.');
}

export async function loadTabImage(file,{signal,timeout=30000}={}){
  signal?.throwIfAborted();
  if(tabSourceKind(file)!=='image')throw Error('JPG·PNG 사진을 선택해 주세요.');
  const header=await abortable(file.slice(0,1024*1024).arrayBuffer(),signal);
  const {width,height}=imageHeaderSize(new Uint8Array(header));
  if(!width||!height||width*height>50000000||Math.max(width,height)>20000)throw Error('사진 크기가 너무 큽니다. 5천만 화소 이하로 줄이거나 악보 부분만 잘라 주세요.');
  signal?.throwIfAborted();
  const url=URL.createObjectURL(file),image=new Image();let closed=false;
  const close=()=>{if(closed)return;closed=true;image.src='';URL.revokeObjectURL(url);};
  try{
    await new Promise((resolve,reject)=>{
      const done=error=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);image.onload=image.onerror=null;error?reject(error):resolve();};
      const abort=()=>done(new DOMException('분석 취소','AbortError'));
      const timer=setTimeout(()=>done(Error('사진을 여는 시간이 초과되었습니다. 다시 선택해 주세요.')),timeout);
      image.onload=()=>done();image.onerror=()=>done(Error('사진 파일을 읽지 못했습니다. 원본을 JPG 또는 PNG로 다시 저장해 주세요.'));
      signal?.addEventListener('abort',abort,{once:true});image.src=url;
      if(signal?.aborted)abort();
    });
    signal?.throwIfAborted();
    return {image,url,fileName:file.name,width:image.naturalWidth,height:image.naturalHeight,close};
  }catch(error){close();throw error;}
}

export function drawTabImage(source,rotation=0,targetWidth=2083){
  const turns=((rotation%4)+4)%4,swap=turns%2;
  const width=swap?source.height:source.width,height=swap?source.width:source.height;
  const scale=Math.min(targetWidth/width,Math.sqrt(C.maxPixels/(width*height)),8192/Math.max(width,height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(width*scale));canvas.height=Math.max(1,Math.floor(height*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('사진을 처리할 메모리가 부족합니다. 사진 크기를 줄여 다시 선택해 주세요.');
  ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(turns*Math.PI/2);
  ctx.drawImage(source.image,-source.width*scale/2,-source.height*scale/2,source.width*scale,source.height*scale);
  return canvas;
}

export async function importImageTab(source,{signal,onProgress=()=>{},rotation=0,autoZoom=true,pageNumber=1,analyzer:sharedAnalyzer,includeSourcePreview=false,...options}={}){
  const target=resolveImportTarget(options.sourceMode==='grand'?{instrument:'piano',...options.target,notationPitch:'concert'}:options.target);
  signal?.throwIfAborted();const analyzer=sharedAnalyzer??createTabPageAnalyzer(signal);
  let progressSource={fileName:source.fileName,kind:'image',page:pageNumber,pages:1,preview:null};
  try{
    const read=async zoom=>{
      signal?.throwIfAborted();
      onProgress({progress:zoom?.55:0,message:importScanMessage(options.sourceMode,{zoom}),source:progressSource,detail:{phase:'structure'}});
      const canvas=drawTabImage(source,rotation,zoom?2678:2083);
      if(includeSourcePreview)progressSource={...progressSource,preview:importSourcePreview(canvas)};
      let pixels;
      try{pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);}finally{canvas.width=canvas.height=0;}
      return analyzer.analyze(pixels,{...options,target,cameraPhoto:true,photoScan:source.photoScan===true,page:pageNumber,onProgress:(f,detail)=>onProgress({progress:(zoom?.55:.1)+f*.4,message:importScanMessage(options.sourceMode,{phase:'symbols',zoom,detail}),source:progressSource,detail})});
    };
    let page=await read(false),summary=summarizeAnalysis([page]);
    if(autoZoom&&!page.notation&&(summary.needsReview||!summary.staffs))page=combineZoomReadings(page,await read(true));
    page=applyPairedNotationChecks(page,target);
    summary=summarizeAnalysis([page]);
    if(!summary.measures)throw Error(options.sourceMode==='staff'?'오선보의 음을 찾지 못했습니다. TAB 숫자가 있는 악보라면 ‘TAB → TAB’을 선택해 주세요.':options.sourceMode==='tab'?missingTabMessage(target):'악보의 음을 읽지 못했습니다. 오선보 또는 TAB의 줄과 음표가 선명하게 보이는 사진을 선택해 주세요.');
    onProgress({progress:1,message:'TAB 분석 완료',source:progressSource,detail:{phase:'complete'}});
    return {version:C.version,fileName:source.fileName,target,sourceType:'image',imageRotation:((rotation%4)+4)%4*90,pages:[page],summary};
  }finally{if(!sharedAnalyzer)await analyzer.close();}
}
