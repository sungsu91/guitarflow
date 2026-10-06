import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
import assert from 'node:assert/strict';
const run=process.argv[2]??'baseline',id=process.argv[3]??'now',pageNumbers=(process.argv[4]??'1,5').split(',').map(Number);
const out=`artifacts/chord-piano-followup-20261006/${run}`;await mkdir(out,{recursive:true});
const source=JSON.parse(await readFile('artifacts/present-check-20261006/sources.json')).find(s=>s.id===id);
const oracle=JSON.parse(await readFile('tests/fixtures/piano-pdf-chord-labels.json'))[id];
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false,hmr:false}});await server.listen();const browser=await qualityBrowser();
try{const page=await browser.newPage();await page.route('**/__chords',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__chords`);await page.locator('input').setInputFiles(source.path);
 for(const number of pageNumbers){
  const result=await page.evaluate(async ({number,dumpSystems})=>{
   const begin=performance.now(),signal=AbortSignal.timeout(180000);
   const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js');const {geometryInWorker}=await import('/src/pdf/tab-import/analyzeTabPage.js');
   const {projectChordText,recognizePageChords}=await import('/src/pdf/tab-import/chordRecognition.js');
   const task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()),signal);
   try{const pdf=await task.promise,p=await pdf.getPage(number),v=p.getViewport({scale:3.5}),c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);const ctx=c.getContext('2d',{willReadFrequently:true});await p.render({canvasContext:ctx,viewport:v}).promise;
    const text=await p.getTextContent(),nativeWords=projectChordText(text,v),geometry=await geometryInWorker(ctx.getImageData(0,0,c.width,c.height),number,signal,[],'staff',false,6),readings=[];
    const regions=await recognizePageChords(geometry.chordRegions,nativeWords,{signal,onReading:r=>readings.push(r)});
    const bands=geometry.chordRegions.map(r=>{const b=document.createElement('canvas');b.width=r.width;b.height=r.height;b.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(r.rgba),r.width,r.height),0,0);return {staff:r.staff,png:b.toDataURL('image/png').split(',')[1]};});
    const systems=dumpSystems?geometry.notationSystems.map(s=>{const b=document.createElement('canvas');b.width=s.width;b.height=s.height;b.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(s.rgba),s.width,s.height),0,0);const {rgba,extension,...meta}=s;return {...meta,png:b.toDataURL('image/png').split(',')[1]};}):undefined;
    return {ms:performance.now()-begin,page:number,nativeWords,readings,regions,bands,systems};
   }finally{await task.destroy();}
  },{number,dumpSystems:process.argv.includes('--systems')});
  for(const b of result.bands)await writeFile(`${out}/${id}-p${number}-staff${b.staff}.png`,Buffer.from(b.png,'base64'));delete result.bands;
  for(const s of result.systems??[]){await writeFile(`${out}/${id}-p${number}-system${s.id}.png`,Buffer.from(s.png,'base64'));delete s.png;}
  await writeFile(`${out}/${id}-p${number}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({id,number,ms:result.ms,rows:result.regions.map(r=>({staff:r.staff,names:r.words.map(w=>w.name),unread:r.unresolvedGroups?.length,uncertain:r.unresolvedWords?.map(w=>w.text)}))}));
  if(process.argv.includes('--verify'))for(const [staff,names] of Object.entries(oracle[number])){
   const row=result.regions.find(r=>r.staff===Number(staff));assert(row,`${id} p${number} staff${staff}`);
   assert.deepEqual(row.words.map(w=>w.name),names,`${id} p${number} staff${staff} chord names`);
   assert.equal(row.unresolvedGroups?.length??0,0,`${id} p${number} staff${staff} unresolved ink`);
   assert.equal(row.unresolvedWords?.length??0,0,`${id} p${number} staff${staff} uncertain labels`);
  }
 }
}finally{await browser.close();await server.close();}
