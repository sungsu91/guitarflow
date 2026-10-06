// Private/external fixtures stay outside the repository. A manifest supplies
// {cases:[{id,path,expectedMeasures,pages?:[{expectedSystems}]}]}; none of these
// expected values enter the detector. Run: node scripts/verify-practice-pdfs.mjs
// <manifest.json> <output-directory>
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createCanvas} from '@napi-rs/canvas';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {detectPracticeMeasures,mergePracticeDetections,PRACTICE_DETECTION_VERSION} from '../src/pdf/autoMeasures.js';
const [manifestPath,output]=process.argv.slice(2);
if(!manifestPath||!output)throw Error('Provide manifest.json and an output directory.');
const manifest=JSON.parse(await readFile(manifestPath)),reports=[],root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(output,{recursive:true});
for(const item of manifest.cases){
 const bytes=await readFile(item.path),started=performance.now();
 const task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,isOffscreenCanvasSupported:false,isImageDecoderSupported:false,cMapUrl:resolve(root,'public/pdfjs/cmaps')+'/',cMapPacked:true,standardFontDataUrl:resolve(root,'public/pdfjs/standard_fonts')+'/',wasmUrl:resolve(root,'public/pdfjs/wasm')+'/'});
 try{
  const pdf=await task.promise,pages=[];
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n),base=page.getViewport({scale:1}),detections=[];
   try{for(const scale of [3.5,3]){
    const viewport=page.getViewport({scale:Math.min(scale,Math.sqrt(12000000/(base.width*base.height)))}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
    try{const ctx=canvas.getContext('2d');await page.render({canvasContext:ctx,viewport}).promise;const image=ctx.getImageData(0,0,canvas.width,canvas.height);detections.push(detectPracticeMeasures({rgba:image.data,width:image.width,height:image.height,page:n}));}
    finally{canvas.width=canvas.height=0;}
    if(detections.at(-1).source==='photo')break;
   }pages.push(detections.length===1?detections[0]:mergePracticeDetections(...detections));}
   finally{page.cleanup();}
  }
  const measures=pages.reduce((s,p)=>s+p.measures.length,0),counts=pages.map(p=>p.systems.map(s=>p.measures.filter(m=>m.system===s.system).length));
  const pass=measures===item.expectedMeasures&&counts.every((c,i)=>!item.pages?.[i]?.expectedSystems||JSON.stringify(c)===JSON.stringify(item.pages[i].expectedSystems));
  const report={id:item.id,sha256:createHash('sha256').update(bytes).digest('hex'),engine:PRACTICE_DETECTION_VERSION,measures,expectedMeasures:item.expectedMeasures,counts,pass,seconds:Math.round(performance.now()-started)/1000};
  await writeFile(resolve(output,`${item.id.replace(/[^a-z0-9_-]/gi,'_')}-result.json`),JSON.stringify({report,pages},null,2));reports.push(report);console.log(JSON.stringify(report));
 }finally{await task.destroy();}
}
await writeFile(resolve(output,'report.json'),JSON.stringify(reports,null,2));
if(reports.some(r=>!r.pass))process.exitCode=1;
