import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out=process.argv[2]??'artifacts/import-selection-20261006';await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const browser=await qualityBrowser();
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__deferred-scan',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__deferred-scan`);
 await page.locator('input').setInputFiles('artifacts/tab-photo/fixtures/score.png');
 const results={};
 for(const mode of ['eager','deferred','disabled']){
  const result=await page.evaluate(async mode=>{
   const {preparePhoto,importPhotoBatch}=await import('/src/pdf/tab-import/photoBatch.js');
   const {fullPaperQuad}=await import('/src/pdf/tab-import/paperScanGeometry.js');
   const {analysisToDocument}=await import('/src/pdf/tab-import/scoreAdapter.js');
   const file=document.querySelector('input').files[0],signal=AbortSignal.timeout(120000);
   const photo=await preparePhoto(file,{signal,scan:mode==='eager'});
   if(mode==='disabled')photo.scan={enabled:false,enhance:false,quad:fullPaperQuad(),version:1};
   const result=await importPhotoBatch([photo],{signal,sourceMode:'tab',autoScan:mode!=='eager',target:{instrument:'guitar',notationPitch:'concert'}});
   const doc=analysisToDocument(result);
   return {summary:result.summary,source:result.imageSources[0],fingerprint:doc.measures.map(m=>({rhythmVerified:m.pdfImport.rhythmVerified,events:m.events.map(e=>({onset:e.onset,duration:e.duration,dotted:!!e.dotted,rest:!!e.rest,blank:!!e.blank,notes:e.notes.map(n=>({string:n.string,fret:n.fret,midi:doc.tuning[n.string-1]+n.fret})),status:e.pdfImport.status,recognizedDuration:e.pdfImport.recognizedDuration}))}))};
  },mode);
  results[mode]=result;await writeFile(`${out}/scan-${mode}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({mode,summary:result.summary}));
 }
 assert.deepEqual(results.deferred.fingerprint,results.eager.fingerprint,'deferring scanning must retain every note, rest, onset and rhythm');
 assert.deepEqual(results.deferred.source.scan,results.eager.source.scan);assert.equal(results.deferred.source.scanChoice,results.eager.source.scanChoice);
 assert.equal(results.disabled.source.scan.enabled,false);assert.equal(results.disabled.source.scanChoice,'original');
 assert.equal(results.deferred.summary.measures,4);assert(results.deferred.summary.confirmed>=30);assert.deepEqual(errors,[]);
 await writeFile(`${out}/scan-regression.json`,JSON.stringify({passed:true,exactNotesAndRhythmPreserved:true,explicitDisabledCorrectionHonored:true,summary:results.deferred.summary,errors,scope:'Regresses movement of scanning from selection to Analyze; does not certify OCR accuracy on arbitrary scores.'},null,2));
}finally{await browser.close();await server.close();}
