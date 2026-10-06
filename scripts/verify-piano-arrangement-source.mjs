import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
import {compileDocumentV2} from '../src/etudes/scoreModel.js';
import {scoreTimeline} from '../src/etudes/scorePlayback.js';
import {gripFeasible} from '../src/etudes/arrangement/voicing.js';
const out='artifacts/guitar-arrangement-20261006';await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const browser=await qualityBrowser();
const fullRow=process.argv.includes('--row');
const prior=process.argv.includes('--reuse-readings')?JSON.parse(await readFile(`${out}/${fullRow?'now-first-system':'now-first-measure-before-ties'}.json`)).readings:null;
try{
 const page=await browser.newPage();
 await page.route('**/__piano-source',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__piano-source`);
 const sources=JSON.parse(await readFile('artifacts/present-check-20261006/sources.json'));
 await page.locator('input').setInputFiles(sources.find(s=>s.id==='now').path);
 const result=await page.evaluate(async ({prior,fullRow})=>{
  const start=performance.now(),signal=AbortSignal.timeout(120000);
  const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js'),{geometryInWorker}=await import('/src/pdf/tab-import/analyzeTabPage.js');
  const {createStaffOmrClient}=await import('/src/omr/staffOmrClient.js'),{recognizePianoStaff}=await import('/src/omr/pianoStaffRecognition.js');
  const {attachPianoTieEvidence}=await import('/src/omr/pianoTieEvidence.js');
  const {groupGrandStaffReadings}=await import('/src/omr/grandStaffImport.js'),{staffSystemToAnalysis}=await import('/src/omr/staffTokens.js');
  const {analysisToDocument}=await import('/src/pdf/tab-import/scoreAdapter.js'),{summarizeAnalysis}=await import('/src/pdf/tab-import/recognition.js');
  const {arrangeGuitar}=await import('/src/etudes/arrangement/arrangeGuitar.js');
  const {compileDocumentV2}=await import('/src/etudes/scoreModel.js'),{scoreTimeline}=await import('/src/etudes/scorePlayback.js');
  const task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()),signal);let omr;
  try{
   const pdf=await task.promise,p=await pdf.getPage(1),viewport=p.getViewport({scale:3.5}),c=document.createElement('canvas');c.width=Math.ceil(viewport.width);c.height=Math.ceil(viewport.height);const ctx=c.getContext('2d',{willReadFrequently:true});await p.render({canvasContext:ctx,viewport}).promise;
   const geometry=await geometryInWorker(ctx.getImageData(0,0,c.width,c.height),1,signal,[],'grand',false,6);if(!prior)omr=await createStaffOmrClient(signal);const readings=[];
   for(const [index,clef] of [[1,'clef-G2'],[2,'clef-F4']]){
    const system=geometry.notationSystems[index];if(!fullRow)system.measures=system.measures.slice(0,1);
    const parsed=prior?attachPianoTieEvidence(system,prior[index-1]):await recognizePianoStaff(omr,system,{key:'G',meter:[4,4]},clef,{signal});readings.push({system,parsed});
   }
   const target={instrument:'piano',tuning:[],notationPitch:'concert'},rows=groupGrandStaffReadings(readings,target);
   const staffs=rows.map(r=>staffSystemToAnalysis(r.parsed,{system:r.system,page:1,width:c.width,height:c.height,target,octaveShift:0}).staff);
   const pages=[{page:1,width:c.width,height:c.height,staffs,notation:true,octaveShift:0}],doc=analysisToDocument({fileName:'NOW-first-measure.pdf',target,pages,summary:summarizeAnalysis(pages)});
   const arrangement=arrangeGuitar(doc,{mode:'voicing'}),audio=scoreTimeline(compileDocumentV2(doc).score,60);
   const crops=readings.map(({system:s})=>{const c=document.createElement('canvas');c.width=s.width;c.height=s.height;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(s.rgba),s.width,s.height),0,0);return c.toDataURL('image/png').split(',')[1];});
   return {ms:performance.now()-start,systems:readings.map(r=>({staff:r.system.staff,rect:r.system.rect,measures:r.system.measures.map(b=>({x:b.x,width:b.width}))})),readings:readings.map(r=>r.parsed),crops,document:doc,arrangement,audio:audio.events.map(n=>({midi:n.midi,start:n.start,duration:n.duration,voice:n.voice}))};
  }catch(e){return {ms:performance.now()-start,error:e.message,readings:e.pianoReadings};}finally{omr?.close();await task.destroy();}
 },{prior,fullRow});
 for(const [i,crop] of (result.crops??[]).entries())await writeFile(`${out}/now-staff-${i}.png`,Buffer.from(crop,'base64'));delete result.crops;
 result.validationMode=prior?'cached model tokens with fresh raster geometry':'fresh model recognition';
 await writeFile(`${out}/${fullRow?'now-first-system':'now-first-measure'}${prior?'-recheck':''}.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify({ms:result.ms,error:result.error,ties:result.readings?.map(r=>r.pianoTies),audioCount:result.audio?.length}));
 assert(!result.error,result.error);
 const performed=scoreTimeline(compileDocumentV2(result.arrangement.document).score,60).events;
 assert.deepEqual(performed.filter(n=>n.voice==='melody').map(n=>[n.midi,n.start,n.duration]),result.audio.filter(n=>n.voice==='right').map(n=>[n.midi,n.start,n.duration]));
 for(const t of new Set(performed.flatMap(n=>[n.start,n.start+n.duration])))assert(gripFeasible(performed.filter(n=>n.start<=t+1e-8&&n.start+n.duration>t+1e-8)),`actual sounding grip at ${t}`);
 const right=result.readings[0].measures[0],left=result.readings[1].measures[0];
 assert.deepEqual(right.events.map(e=>e.notes.map(n=>n.midi)),[71,69,64,71,71,64,71,69].map(n=>[n]));
 assert.deepEqual(right.events.map(e=>e.duration),Array(8).fill('8'));
 assert.deepEqual(left.events.map(e=>e.notes.map(n=>n.midi)),Array(9).fill([48,52,55,59]));
 assert.deepEqual(left.events.map(e=>[e.duration,!!e.dotted]),[['4',false],['8',true],['16',false],['16',false],['16',false],['8',false],['8',false],['16',false],['16',false]]);
 assert.deepEqual(right.events.flatMap((e,i)=>e.tieFromPrevious?[i]:[]),[4]);
 assert.deepEqual(left.events.flatMap((e,i)=>e.tieFromPrevious?[i]:[]),[3]);
 if(fullRow){
  assert.deepEqual(result.readings[0].measures[1].events.map(e=>e.notes.map(n=>n.midi)),[[69]]);
  assert.equal(result.readings[0].measures[1].events[0].tieFromPreviousBar,true);
  assert.deepEqual(result.audio.filter(n=>n.voice==='right').map(n=>[n.midi,n.start,n.duration]),[[71,0,.5],[69,.5,.5],[64,1,.5],[71,1.5,1],[64,2.5,.5],[71,3,.5],[69,3.5,4.5],[69,8,.5],[67,8.5,.5],[62,9,.5],[69,9.5,1],[62,10.5,.5],[66,11,1]]);
  const bassPitches=[Array(9).fill([48,52,55,59]),Array(9).fill([50,54,57]),[...Array(2).fill([52,55,59]),...Array(4).fill([50,55,57]),...Array(3).fill([50,54,57])]];
  const expectedBass=bassPitches.flatMap((chords,bar)=>chords.flatMap((pitches,i)=>i===3?[]:pitches.map(midi=>({midi,start:bar*4+[0,1,1.75,2,2.25,2.5,3,3.5,3.75][i],duration:[1,.75,.5,0,.25,.5,.5,.25,.25][i],voice:'left'}))));
  assert.deepEqual(result.audio.filter(n=>n.voice==='left'),expectedBass);
  assert.equal(result.audio.length,93);
 }else assert.equal(result.audio.length,39,'source ties must reduce actual attacks from 44 to 39');
 console.log(`PASS: ${fullRow?'first three bars, both hands including cross-bar tie':'first-bar excerpt only'} pitches and performed rhythm; this does not certify a full PDF.`);
}finally{await browser.close();await server.close();}
