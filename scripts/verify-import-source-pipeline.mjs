import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out='artifacts/import-source-20261006';
// Real PDF/photo rendering and adapters; stop at the unchanged OCR boundary.
const analyzer=`
 export const geometryInWorker=()=>{throw Error('Unexpected geometry probe');};
 export const createTabPageAnalyzer=()=>({close:async()=>{},analyze:async(image,options)=>{
  window.pixelHashes??=[];window.pixelHashes.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',image.data))).map(v=>v.toString(16).padStart(2,'0')).join(''));
  options.onProgress(0,{phase:'model'});
  options.onProgress(.5,{phase:'symbols',operation:'measure',staff:2,total:4,measure:3,attempt:2,seconds:0,region:{x:.1,y:.4,width:.2,height:.1}});
  return {page:options.page,notation:true,endMeter:[4,4],staffs:[{id:1,measures:[{slots:[],orphan:[],needsReview:true}]}]};
 }});
`;
const plugin={name:'pixels-before-ocr',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').endsWith('/analyzeTabPage.js'))return analyzer;}};
const server=await createServer({plugins:[plugin],logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();const browser=await qualityBrowser(),report={boundary:'real source rendering; controlled OCR results',runs:[]};
try{
 const page=await browser.newPage();await page.route('**/__pipeline',r=>r.fulfill({contentType:'text/html',body:'<input type="file" multiple>'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__pipeline`);
 for(const kind of ['pdf','photos']){
  await page.locator('input').setInputFiles(kind==='pdf'?'C:/Users/User/Desktop/sheet music/(보컬)NOW.pdf':[`${out}/doremi-p2-first-staff.png`,`${out}/light-p2-first-staff.png`]);
  let baseline;
  for(const includeSourcePreview of [false,true]){
   const result=await page.evaluate(async({kind,includeSourcePreview})=>{
    const updates=[];window.pixelHashes=[];
    const options={sourceMode:'staff',autoZoom:false,includeSourcePreview,onProgress:p=>updates.push(p)},files=[...document.querySelector('input').files];
    let result;
    if(kind==='pdf'){const {importPdfTab}=await import('/src/pdf/tab-import/importPdfTab.js');result=await importPdfTab(files[0],options);}
    else{const {preparePhoto,importPhotoBatch}=await import('/src/pdf/tab-import/photoBatch.js');const photos=await Promise.all(files.map(f=>preparePhoto(f)));photos.reverse();photos[0].rotation=1;result=await importPhotoBatch(photos,options);}
    return {updates:updates.map(p=>({...p,source:p.source?{...p.source,preview:p.source.preview?{width:p.source.preview.width,height:p.source.preview.height,bytes:p.source.preview.url.length}:null}:null})),hashes:window.pixelHashes,result};
   },{kind,includeSourcePreview});
   if(!baseline)baseline=result;else{assert.deepEqual(result.hashes,baseline.hashes,'preview must not alter a single recognition pixel');assert.deepEqual(result.result,baseline.result,'preview must not alter the imported result');}
   const readings=result.updates.filter(p=>p.detail?.phase==='symbols');assert.equal(readings.length,2);
   assert.deepEqual(readings.map(p=>[p.source.page,p.source.pages]),[[1,2],[2,2]]);
   if(kind==='photos')assert.deepEqual(readings.map(p=>p.source.fileName),['light-p2-first-staff.png','doremi-p2-first-staff.png']);
   for(const reading of readings){assert.equal(reading.detail.measure,3);assert.equal(Boolean(reading.source.preview),includeSourcePreview);if(includeSourcePreview)assert(reading.source.preview.width<=360&&reading.source.preview.height<=440);}
   const starts=result.updates.filter(p=>p.detail?.phase==='structure');assert(starts.every(p=>!p.source.preview),'page transitions cannot show the previous preview');
   report.runs.push({kind,includeSourcePreview,hashes:result.hashes,readings,pass:true});
  }
 }
 console.log(JSON.stringify({runs:report.runs.length,unchangedRecognitionPixels:true,unchangedResults:true,pdfPages:true,reorderedAndRotatedPhotos:true}));
}finally{await writeFile(`${out}/pipeline-report.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
