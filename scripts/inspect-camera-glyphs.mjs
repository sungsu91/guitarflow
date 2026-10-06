import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const [file,out='artifacts/photo-improvement-20261005/glyphs']=process.argv.slice(2);
await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();
const browser=await qualityBrowser();
try{
 const page=await browser.newPage();await page.route('**/__glyph-audit',r=>r.fulfill({body:'<input type="file">',contentType:'text/html'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__glyph-audit`);
 await page.locator('input').setInputFiles({name:'camera.jpg',mimeType:'image/jpeg',buffer:await readFile(file)});
 const result=await page.evaluate(async()=>{
  const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js');
  const {normalizePhotoPaper,photoStaffTracks,rectifyPhotoStaffs,CAMERA_TAB_CONFIG}=await import('/src/pdf/tab-import/cameraPhotoGeometry.js');
  const {analyseGeometry}=await import('/src/pdf/tab-import/geometry.js');
  const {createLocalOcr,recognizeCandidates}=await import('/src/pdf/tab-import/localOcr.js');
  const src=await loadTabImage(document.querySelector('input').files[0]),canvas=drawTabImage(src),im=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);src.close();
  const norm=normalizePhotoPaper(im.data,im.width,im.height),tracks=photoStaffTracks(norm,im.width,im.height),fixed=rectifyPhotoStaffs(norm,im.width,im.height,tracks),original=rectifyPhotoStaffs(im.data,im.width,im.height,tracks);
  const geo=analyseGeometry({rgba:fixed,width:im.width,height:im.height,page:1,config:CAMERA_TAB_CONFIG});geo.staffs=geo.staffs.slice(0,1);
  const ocr=await createLocalOcr(),rows=[];
  try{
   for(const variant of ['existing','source-pad','normalized-pad']){
    const g=structuredClone(geo);
    if(variant!=='existing')for(const s of g.staffs)for(const c of s.candidates){
     const margin=Math.ceil(s.spacing*.22);c.y-=margin;c.height+=margin*2;c.x-=margin;c.width+=margin*2;
     const raw=variant==='normalized-pad'?fixed:original;
     const vals=[];for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const p=((c.y+y)*im.width+c.x+x)*4;vals.push(Math.round(raw[p]*.299+raw[p+1]*.587+raw[p+2]*.114));}
     const sorted=[...vals].sort((a,b)=>a-b),lo=sorted[Math.floor(sorted.length*.05)],hi=sorted[Math.floor(sorted.length*.9)];
     c.grayscale=Uint8Array.from(vals,v=>variant==='source'?v:Math.max(0,Math.min(255,(v-lo)*255/Math.max(20,hi-lo))));delete c.paddedGlyph;
    }
    const crops=g.staffs.flatMap(s=>s.candidates.map(c=>({id:c.id,x:c.cx,string:c.string,width:c.width,height:c.height,gray:Array.from(c.grayscale)})));
    await recognizeCandidates(g,ocr);rows.push({variant,crops,readings:g.staffs[0].candidates});
   }
  }finally{await ocr.close();}
  return {rows,staff:geo.staffs[0].lines};
 });await writeFile(`${out}/audit.json`,JSON.stringify(result));
 console.log(JSON.stringify(result.rows.map(r=>({variant:r.variant,readings:r.readings.map(c=>({id:c.id,s:c.string,x:c.cx,text:c.ocr?.text,confidence:c.ocr?.confidence,agrees:c.ocr?.agrees,alternatives:c.ocr?.alternatives}))})),null,2));
}finally{await browser.close();await server.close();}
