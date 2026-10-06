import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const [manifestPath,out,...ids]=process.argv.slice(2),manifest=JSON.parse(await readFile(manifestPath));await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const browser=await qualityBrowser();
try{
 const page=await browser.newPage();await page.route('**/__boundaries',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__boundaries`);
 for(const item of manifest.cases.filter(c=>!ids.length||ids.includes(c.id))){
  await page.locator('input').setInputFiles(item.path);
  const results=await page.evaluate(async keepGlyphs=>{
   const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js'),{detectPhotoPaper,scanPhotoSource,choosePhotoSource}=await import('/src/pdf/tab-import/paperScan.js'),{geometryInWorker}=await import('/src/pdf/tab-import/analyzeTabPage.js');
   const {normalizePhotoPaper,rectifyPhotoStaffs}=await import('/src/pdf/tab-import/cameraPhotoGeometry.js');
   const signal=AbortSignal.timeout(120000),original=await loadTabImage(document.querySelector('input').files[0]),scan=await detectPhotoPaper(original,{signal}),corrected=await scanPhotoSource(original,scan,{signal}),plain=await scanPhotoSource(original,{...scan,enhance:false},{signal});
   const chosen=await choosePhotoSource(original,corrected,{sourceMode:'tab',rotation:0,signal,plain}),source=chosen.source,rows=[];
   try{for(const width of [2083,2678]){
    const c=drawTabImage(source,0,width),ctx=c.getContext('2d',{willReadFrequently:true}),image=ctx.getImageData(0,0,c.width,c.height),raw=image.data.slice();
    const g=await geometryInWorker(image,1,signal,[],'tab',true,6,source.photoScan===true);
    if(g.cameraCorrection?.tracks)ctx.putImageData(new ImageData(rectifyPhotoStaffs(normalizePhotoPaper(raw,c.width,c.height),c.width,c.height,g.cameraCorrection.tracks),c.width,c.height),0,0);
    ctx.setTransform(1,0,0,1,0,0);const clean=c.toDataURL('image/png');ctx.strokeStyle='red';ctx.lineWidth=2;ctx.font='24px Arial';
    for(const s of g.staffs)for(const [i,m]of s.measures.entries()){ctx.strokeRect(m.x,m.y,m.width,m.height);ctx.fillText(String(i+1),m.x+8,m.y-12);}
    for(const s of g.staffs)for(const c of s.candidates){if(!keepGlyphs)delete c.grayscale;delete c.paddedGlyph;delete c.photoRetryGlyph;delete c.bitmap;}
    delete g.chordRegions;rows.push({width,choice:chosen.choice,geometry:g,clean,png:c.toDataURL('image/png')});c.width=c.height=0;
   }}finally{if(plain!==original&&plain!==corrected)plain.close();if(corrected!==original)corrected.close();original.close();}return rows;
  },process.env.KEEP_GLYPHS==='1');
  for(const result of results){for(const key of ['clean','png'])await writeFile(`${out}/${item.id}-${result.width}${key==='clean'?'-clean':''}.png`,Buffer.from(result[key].split(',')[1],'base64'));delete result.png;delete result.clean;}
  await writeFile(`${out}/${item.id}.json`,JSON.stringify(results));console.log(JSON.stringify({id:item.id,scales:results.map(r=>({width:r.width,correction:r.geometry.cameraCorrection?.method,bars:r.geometry.staffs.map(s=>s.measures.length)}))}));
 }
}finally{await browser.close();await server.close();}
