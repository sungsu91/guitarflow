import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out=process.env.GRAND_COLOR_OUT??'artifacts/grand-color-20261006/inspect';await mkdir(out,{recursive:true});
const files=JSON.parse(await readFile(process.argv[2]));
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();const browser=await qualityBrowser();
try{for(const entry of files){
 const page=await browser.newPage();await page.route('**/__audit',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__audit`);await page.locator('input').setInputFiles(entry.path);
 const result=await page.evaluate(async entry=>{
  const {cropNotationSystems}=await import('/src/omr/staffSystems.js');
  const c=document.createElement('canvas');let close=()=>{};
  if(entry.path.endsWith('.pdf')){const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js');const task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()));close=()=>task.destroy();const pdf=await task.promise,p=await pdf.getPage(entry.page??1),v=p.getViewport({scale:3.5});c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;}
  else{const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js');const src=await loadTabImage(document.querySelector('input').files[0]),render=drawTabImage(src,0,entry.width??2083);c.width=render.width;c.height=render.height;c.getContext('2d').drawImage(render,0,0);src.close();}
  const ctx=c.getContext('2d',{willReadFrequently:true});let im=ctx.getImageData(0,0,c.width,c.height),preprocess;
  const baseline=cropNotationSystems(im.data,im.width,im.height);
  if(entry.color){const {normalizeNotationColors}=await import('/scripts/notation-colors-experiment.mjs');const r=normalizeNotationColors(im.data,im.width,im.height);preprocess=r?.evidence;if(r)im=new ImageData(r.rgba,im.width,im.height);}
  const systems=cropNotationSystems(im.data,im.width,im.height,{piano:entry.piano}),images=[],results=[];
  const png=(rgba,width,height)=>{const b=document.createElement('canvas');b.width=width;b.height=height;b.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba),width,height),0,0);return b.toDataURL().split(',')[1];};
  if(entry.color)images.push({name:'normalized',png:png(im.data,im.width,im.height)});
  let omr;
  try{for(const s of systems.filter(s=>!entry.staff||s.id===entry.staff)){
   images.push({name:`s${s.id}`,png:png(s.rgba,s.width,s.height)});
   if(entry.piano){const {cropPianoMeasure,pianoHeaderWidth}=await import('/src/omr/pianoStaffRecognition.js');const {parsePianoTokens}=await import('/src/omr/pianoPolyphony.js');const header=entry.raw?pianoHeaderWidth(s,parsePianoTokens(entry.raw,{key:entry.key??'G',meter:[4,4]})):null;
    if(entry.raw){const {attachPianoTieEvidence}=await import('/src/omr/pianoTieEvidence.js');results.push({header,headAudit:attachPianoTieEvidence(s,parsePianoTokens(entry.raw,{key:entry.key??'G',meter:[4,4]})).pianoTieAudit});}
    for(let i=0;i<s.measures.length;i++)if(!entry.bar||i===entry.bar-1){
     const crop=cropPianoMeasure(s,i,.5,header,{extended:entry.extended});images.push({name:`s${s.id}-m${i+1}`,png:png(crop.rgba,crop.width,crop.height)});
     if(entry.read){const {createStaffOmrClient}=await import('/src/omr/staffOmrClient.js');omr??=await createStaffOmrClient();const reads=[];for(const margin of [.5,2,1,3,0]){const read=await omr.recognize(cropPianoMeasure(s,i,margin,header,{extended:entry.extended}));reads.push({margin,text:read.text});}results.push({staff:s.id,bar:i+1,header,reads});}
    }
   }else if(entry.read){const {createStaffOmrClient}=await import('/src/omr/staffOmrClient.js');omr??=await createStaffOmrClient();const {recognizeStaffSystem}=await import('/src/omr/staffRecognition.js');results.push({staff:s.id,parsed:await recognizeStaffSystem(omr,s,{meter:[4,4],key:entry.key??'C'})});}
  }}finally{omr?.close();await close();}
  return {baseline:baseline.map(s=>({y:s.staff.y,bars:s.measures.length})),systems:systems.map(({rgba,extension,...s})=>s),preprocess,results,images};
 },entry);
 for(const i of result.images)await writeFile(`${out}/${entry.id}-${i.name}.png`,Buffer.from(i.png,'base64'));delete result.images;
 await writeFile(`${out}/${entry.id}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({id:entry.id,before:result.baseline.length,after:result.systems.length,preprocess:result.preprocess,results:result.results}));await page.close();
}}finally{await browser.close();await server.close();}

