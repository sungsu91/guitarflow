// Re-read every chord band, including raised names and small rhythm numerals.
// Old source-checked documents are regression references, not OCR input.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out=process.env.CHORD_AUDIT_OUT??'artifacts/ocr-review-focused-20261005/chord-regression';await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false,hmr:false}});await server.listen();
const browser=await qualityBrowser(),reports=[];
try{for(const [name,baseline] of [
 ['Let_It_Be(코드)','artifacts/omr-source-layout/let-it-be/after.json'],
 ['풀잎사랑(코드)','artifacts/omr-source-layout/pulip-final/after.json'],
 ['일어나(코드)','artifacts/ocr-review-focused-20261005/staff-after/after.json'],
]){
 const doc=JSON.parse(await readFile(baseline));
 for(const pageNumber of [1,2]){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.route('**/__chord-regression',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));
   await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__chord-regression`);
   await page.locator('input').setInputFiles(`C:/Users/User/Desktop/sheet music/${name}_페이지_${pageNumber}.jpg`);
   const results=await page.evaluate(async()=>{
    const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js');
    const {cropNotationSystems}=await import('/src/omr/staffSystems.js');
    const {chordRegions}=await import('/src/pdf/tab-import/chordGeometry.js');
    const {recognizePageChords}=await import('/src/pdf/tab-import/chordRecognition.js');
    const src=await loadTabImage(document.querySelector('input').files[0]);
    try{const c=drawTabImage(src),im=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height);
     const systems=cropNotationSystems(im.data,im.width,im.height);
     return (await recognizePageChords(chordRegions(im.data,im.width,im.height,systems.map(s=>s.staff))))
      .map(r=>({staff:r.staff,names:r.words.map(w=>w.name),triplets:r.triplets}));
    }finally{src.close();}
   });
   const rows=results.map(r=>({...r,expected:doc.measures.filter(m=>m.pdfImport.source.page===pageNumber&&m.pdfImport.source.staff===r.staff).flatMap(m=>(m.harmonyChanges??[]).map(c=>c.name))}));
   // The old document omitted this final row's labels; checked directly on
   // the supplied page, its printed names are G, Am, D7, G.
   if(name==='풀잎사랑(코드)'&&pageNumber===2)rows.find(r=>r.staff===10).expected=['G','Am','D7','G'];
   const regressions=rows.filter(r=>JSON.stringify(r.names)!==JSON.stringify(r.expected));
   if(name.startsWith('Let_It_Be')&&pageNumber===2)for(const staff of [2,3])assert.equal(results.find(r=>r.staff===staff).triplets.length,1,'printed triplets survive the chord filter');
   reports.push({name,page:pageNumber,rows,regressions,errors});
   console.log(JSON.stringify({name,page:pageNumber,chords:rows.reduce((n,r)=>n+r.names.length,0),regressions,errors}));
  }finally{await page.close();await writeFile(`${out}/results.json`,JSON.stringify(reports,null,2));}
 }
}}finally{await browser.close();await server.close();}
assert(reports.every(r=>!r.regressions.length&&!r.errors.length),'all previously verified chord names must survive');
