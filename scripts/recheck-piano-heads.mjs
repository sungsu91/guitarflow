import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out='artifacts/chord-piano-followup-20261006';
const prior=JSON.parse(await readFile(`${out}/piano-wide-heads/now-p1-grand.json`)).analysis;
const source=JSON.parse(await readFile('artifacts/present-check-20261006/sources.json')).find(s=>s.id==='now');
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();const browser=await qualityBrowser();
try{const page=await browser.newPage();await page.route('**/__headcheck',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__headcheck`);await page.locator('input').setInputFiles(source.path);
 const results=await page.evaluate(async prior=>{
  const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js'),{geometryInWorker}=await import('/src/pdf/tab-import/analyzeTabPage.js'),{parsePianoTokens}=await import('/src/omr/pianoPolyphony.js');
  const {refinePianoChordHeads}=await import('/src/omr/pianoHeadEvidence.js'),{singleWholePianoReading,pianoMeasureConsensus}=await import('/src/omr/pianoStaffRecognition.js');
  const task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()));
  try{const pdf=await task.promise,p=await pdf.getPage(1),v=p.getViewport({scale:3.5}),c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);const ctx=c.getContext('2d',{willReadFrequently:true});await p.render({canvasContext:ctx,viewport:v}).promise;
   const geometry=await geometryInWorker(ctx.getImageData(0,0,c.width,c.height),1,undefined,[],'grand',false,6),results=[];
   const shape=bar=>JSON.stringify([bar.key,bar.meter,bar.events.map(e=>[e.rest,e.duration,!!e.dotted,e.notes.map(n=>n.midi),e.pianoTiePitchesFromPrevious])]);
   for(const staff of prior.staffs)for(const [hand,part] of staff.notation.parts.entries()){
    const system=geometry.notationSystems.find(s=>s.id===staff.id+hand);
    for(const [index,audit] of part.pianoMeasureRetry.entries()){
     const before=part.measures[index],readings=audit.raw.map(raw=>refinePianoChordHeads(singleWholePianoReading(parsePianoTokens(raw,before),system,index),system,index)),chosen=pianoMeasureConsensus(readings,part.clef);
     results.push({staff:system.id,bar:index+1,unchanged:Boolean(chosen)&&shape(chosen.measures[0])===shape(before),correctedReadings:readings.filter(r=>r.headEvidence).length});
    }
   }
   return results;
  }finally{await task.destroy();}
 },prior);
 await writeFile(`${out}/piano-head-regression.json`,JSON.stringify({mode:'previous decoder tokens with fresh original PDF pixels; not a new model run',results},null,2));
 assert(results.length===20);assert(results.every(r=>r.unchanged),JSON.stringify(results.filter(r=>!r.unchanged)));console.log('PASS: all 20 hand-bars from the source-verified first page unchanged with new head correction.');
}finally{await browser.close();await server.close();}
