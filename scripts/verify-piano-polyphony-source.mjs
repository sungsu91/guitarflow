import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out='artifacts/chord-piano-followup-20261006/polyphony-source';await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false,hmr:false}});await server.listen();const browser=await qualityBrowser();
try{const page=await browser.newPage();await page.route('**/__source',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__source`);await page.locator('input').setInputFiles(JSON.parse(await readFile('artifacts/present-check-20261006/sources.json')).find(s=>s.id==='now').path);
 const r=await page.evaluate(async()=>{
  const start=performance.now(),signal=AbortSignal.timeout(120000);
  const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js'),{geometryInWorker}=await import('/src/pdf/tab-import/analyzeTabPage.js');
  const {createStaffOmrClient}=await import('/src/omr/staffOmrClient.js'),{recognizePianoStaff}=await import('/src/omr/pianoStaffRecognition.js'),{groupGrandStaffReadings}=await import('/src/omr/grandStaffImport.js'),{staffSystemToAnalysis}=await import('/src/omr/staffTokens.js');
  const {analysisToDocument}=await import('/src/pdf/tab-import/scoreAdapter.js'),{compileDocumentV2}=await import('/src/etudes/scoreModel.js'),{scoreTimeline}=await import('/src/etudes/scorePlayback.js'),{arrangeGuitar}=await import('/src/etudes/arrangement/arrangeGuitar.js');
  const task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()),signal);let omr;
  try{const pdf=await task.promise,p=await pdf.getPage(1),v=p.getViewport({scale:3.5}),c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);const ctx=c.getContext('2d',{willReadFrequently:true});await p.render({canvasContext:ctx,viewport:v}).promise;
   const geo=await geometryInWorker(ctx.getImageData(0,0,c.width,c.height),1,signal,[],'grand',false,6);omr=await createStaffOmrClient(signal);const readings=[];
   for(const [index,clef] of [[4,'clef-G2'],[5,'clef-F4']]){const system=geo.notationSystems[index];system.measures=system.measures.slice(0,1);readings.push({system,parsed:await recognizePianoStaff(omr,system,{key:'G',meter:[4,4]},clef,{signal})});}
   const target={instrument:'piano',tuning:[],notationPitch:'concert'},rows=groupGrandStaffReadings(readings),staffs=rows.map(r=>staffSystemToAnalysis(r.parsed,{system:r.system,page:1,width:c.width,height:c.height,target}).staff),doc=analysisToDocument({fileName:'NOW-bar4.pdf',target,pages:[{page:1,width:c.width,height:c.height,notation:true,octaveShift:0,staffs}],summary:{}});
   const compiled=compileDocumentV2(doc),arranged=arrangeGuitar(doc),audio=d=>scoreTimeline(compileDocumentV2(d).score,60).events.map(n=>[n.midi,n.start,n.duration,n.voice]);
   return {ms:performance.now()-start,readings:readings.map(r=>r.parsed),document:doc,arrangement:arranged,errors:compiled.errors,audio:audio(doc),guitarAudio:audio(arranged.document)};
  }catch(e){return {error:e.message,pianoReadings:e.pianoReadings};}finally{omr?.close();await task.destroy();}
 });await writeFile(`${out}/now-bar4.json`,JSON.stringify(r,null,2));console.log(JSON.stringify({ms:r.ms,error:r.error,audio:r.audio}));assert(!r.error,r.error);assert.deepEqual(r.errors,[]);
 assert.deepEqual(r.audio.filter(n=>n[3]==='right').map(n=>n.slice(0,3)),[[62,0,4],[64,0,4],[67,0,2],[69,2,2]]);
 assert.deepEqual(r.audio.filter(n=>n[3]==='left').map(n=>n.slice(0,3)),[[0,1],[1,.75],[1.75,.5],[2.25,.25],[2.5,.5],[3,.5],[3.5,.5]].flatMap(([at,length])=>[48,52,55].map(midi=>[midi,at,length])));
 assert.deepEqual(r.guitarAudio.filter(n=>n[3]==='melody').map(n=>n.slice(0,3)),[[67,0,2],[69,2,2]]);
 console.log('PASS: NOW printed bar 4 independent right-hand sustain and guitar melody; full-song certification requires every bar.');
}finally{await browser.close();await server.close();}
