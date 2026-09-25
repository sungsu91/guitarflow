import {pageVisibleHeight,retainedBands} from './pdfGapCuts.js';
import { localizeUi } from "../i18n/core.js";
import ko from "../i18n/locales/ko.js";
import { formatMessage } from "../i18n/format.js";
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {createPdfPageCache,pdfRasterKey} from './pdfPageCache.js';
import {canvasSize} from './pdfModel.js';
GlobalWorkerOptions.workerSrc=workerUrl;
export const loadPdfTask = data => getDocument({data,cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/',isEvalSupported:false,enableXfa:false,canvasMaxAreaInBytes:24000000});
export const pdfPageCache=createPdfPageCache({load:async blob=>{
 const task=loadPdfTask(new Uint8Array(await blob.arrayBuffer()));
 try{return await task.promise;}catch(error){await task.destroy();throw error;}
}});
const blobKeys=new WeakMap();let nextBlob=0;
export function pdfDocumentKey(blob,id){if(id)return id;if(!blobKeys.has(blob))blobKeys.set(blob,`blob:${++nextBlob}`);return blobKeys.get(blob);}
export function copyPdfCanvas(item){const canvas=document.createElement('canvas');canvas.width=item.canvas.width;canvas.height=item.canvas.height;canvas.getContext('2d').drawImage(item.canvas,0,0);canvas.setAttribute('aria-label',localizeUi(formatMessage(ko["pdf.pdfPageValue1"], { value1: item.pageNumber })));return canvas;}
export async function renderPdfPage(pdf,documentKey,pageNumber,options,signal){
 const key=pdfRasterKey(documentKey,pageNumber,options),cached=pdfPageCache.get(key);if(cached)return {...cached,cacheHit:true};
 signal?.throwIfAborted();const page=await pdf.getPage(pageNumber);signal?.throwIfAborted();
 const {width,height,zoom,mobile,crop,dpr}=options,base=page.getViewport({scale:1});
 const scale=mobile?width/(base.width*crop.width)*(Number(zoom)||100)/100:zoom==='page'?Math.min(width/(base.width*crop.width),Math.max(100,height)/(base.height*pageVisibleHeight(crop))):zoom==='fit'?width/(base.width*crop.width):Number(zoom)/100;
 const viewport=page.getViewport({scale}),size={width:viewport.width*crop.width,height:viewport.height*crop.height},dimensions=canvasSize(size.width,size.height,mobile?dpr:Math.max(2,dpr||1)),canvas=document.createElement('canvas');canvas.width=dimensions.width;canvas.height=dimensions.height;
 const task=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:[dimensions.ratio,0,0,dimensions.ratio,-crop.x*viewport.width*dimensions.ratio,-crop.y*viewport.height*dimensions.ratio]});
 const cancel=()=>task.cancel();signal?.addEventListener('abort',cancel,{once:true});pdfPageCache.stats.renders++;
 try{await task.promise;signal?.throwIfAborted();let output=canvas;
  if(crop.cuts?.length){output=document.createElement('canvas');output.width=canvas.width;output.height=Math.max(1,Math.round(viewport.height*pageVisibleHeight(crop)*dimensions.ratio));const ctx=output.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,output.width,output.height);let dest=0;
   for(const band of retainedBands(crop)){const top=(band.start-crop.y)*viewport.height*dimensions.ratio,length=(band.end-band.start)*viewport.height*dimensions.ratio;ctx.drawImage(canvas,0,top,canvas.width,length,0,dest,canvas.width,length);dest+=length;}
   size.height=viewport.height*pageVisibleHeight(crop);
  }
  const item={documentKey,pageNumber,cropKey:JSON.stringify(crop),size,canvas:output};pdfPageCache.put(key,item);return item;}
 finally{signal?.removeEventListener('abort',cancel);page.cleanup();}
}
export async function inspectPdf(blob) {
 const task=loadPdfTask(new Uint8Array(await blob.arrayBuffer()));
 try {
  const pdf=await task.promise,page=await pdf.getPage(1),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(220/base.width,320/base.height)}),canvas=document.createElement('canvas');
  canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  return {pageCount:pdf.numPages,thumbnail:canvas.toDataURL('image/jpeg',0.75)};
 } finally {await task.destroy();}
}
