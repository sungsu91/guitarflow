import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out='artifacts/chord-piano-followup-20261006/crops';await mkdir(out,{recursive:true});
const id=process.argv[2]??'now',systemId=Number(process.argv[3]??5),number=Number(process.argv[4]??1),raw=process.argv[5]??'clef-G2+keySignature-GM+note-D4_whole|note-E4_whole|note-G4_half+note-A4_half+barline';
const source=JSON.parse(await readFile('artifacts/present-check-20261006/sources.json')).find(s=>s.id===id);
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();const browser=await qualityBrowser();
try{const page=await browser.newPage();await page.route('**/__crops',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__crops`);await page.locator('input').setInputFiles(source.path);
 const r=await page.evaluate(async ({systemId,number,raw})=>{
  const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js'),{geometryInWorker}=await import('/src/pdf/tab-import/analyzeTabPage.js');
  const {parsePianoTokens}=await import('/src/omr/pianoPolyphony.js'),{pianoHeaderWidth,cropPianoMeasure}=await import('/src/omr/pianoStaffRecognition.js'),{wholePianoRestEvidence}=await import('/src/omr/pianoRestEvidence.js'),{attachPianoTieEvidence}=await import('/src/omr/pianoTieEvidence.js');
  const task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()));
  try{const pdf=await task.promise,p=await pdf.getPage(number),v=p.getViewport({scale:3.5}),c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);const ctx=c.getContext('2d',{willReadFrequently:true});await p.render({canvasContext:ctx,viewport:v}).promise;
   const geo=await geometryInWorker(ctx.getImageData(0,0,c.width,c.height),number,undefined,[],'grand',false,6),s=geo.notationSystems.find(s=>s.id===systemId),parsed=parsePianoTokens(raw,{meter:[4,4],key:'G'}),header=pianoHeaderWidth(s,parsed);
   const crops=s.measures.map((_,i)=>{const crop=cropPianoMeasure(s,i,.5,header),b=document.createElement('canvas');b.width=crop.width;b.height=crop.height;b.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(crop.rgba),crop.width,crop.height),0,0);return b.toDataURL().split(',')[1];});
   const whole=parsePianoTokens('clef-G2+keySignature-GM+note-D4_whole|note-E4_whole|note-G4_whole|note-D5_whole+barline',{meter:[4,4],key:'G'});
   const headAudit=whole.measures[0].events[0].notes.map(note=>attachPianoTieEvidence(s,{...whole,measures:[parsed.measures[0],{...whole.measures[0],events:[{...whole.measures[0].events[0],notes:[note]}]}]}).pianoTieAudit[1]);
   const wholeAudit=attachPianoTieEvidence(s,{...whole,measures:[parsed.measures[0],whole.measures[0]]}).pianoTieAudit[1];
   const stems=s.measures[0].stems.map(stem=>({x:stem.x,top:stem.top,bottom:stem.bottom,heads:stem.heads}));
   return {header,rest:s.measures.map((_,i)=>wholePianoRestEvidence(s,i)),headAudit,wholeAudit,stems,crops};
  }finally{await task.destroy();}
 },{systemId,number,raw});
 for(const [i,png] of r.crops.entries())await writeFile(`${out}/${id}-s${systemId}-m${i+1}.png`,Buffer.from(png,'base64'));delete r.crops;await writeFile(`${out}/${id}-s${systemId}.json`,JSON.stringify(r,null,2));console.log(r);
}finally{await browser.close();await server.close();}
