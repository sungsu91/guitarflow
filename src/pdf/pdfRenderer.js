import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=workerUrl;
export const loadPdfTask = data => getDocument({data,cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/',isEvalSupported:false,enableXfa:false,canvasMaxAreaInBytes:24000000});
export async function inspectPdf(blob) {
 const task=loadPdfTask(new Uint8Array(await blob.arrayBuffer()));
 try {
  const pdf=await task.promise,page=await pdf.getPage(1),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(220/base.width,320/base.height)}),canvas=document.createElement('canvas');
  canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  return {pageCount:pdf.numPages,thumbnail:canvas.toDataURL('image/jpeg',0.75)};
 } finally {await task.destroy();}
}
