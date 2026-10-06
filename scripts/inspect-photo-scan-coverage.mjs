import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const [manifestPath,out,...ids]=process.argv.slice(2),manifest=JSON.parse(await readFile(manifestPath));await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const browser=await qualityBrowser(),reports=[];
try{
 const page=await browser.newPage();await page.route('**/__coverage',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__coverage`);
 for(const item of manifest.cases.filter(c=>!ids.length||ids.includes(c.id))){
  await page.locator('input').setInputFiles(item.path);
  const result=await page.evaluate(async()=>{
   const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js'),{scanPhotoSource,detectPhotoPaper}=await import('/src/pdf/tab-import/paperScan.js'),{geometryInWorker}=await import('/src/pdf/tab-import/analyzeTabPage.js');
   const signal=AbortSignal.timeout(120000),source=await loadTabImage(document.querySelector('input').files[0]),scan=await detectPhotoPaper(source,{signal}),results=[];
   try{for(const enhance of [false,true]){
    const corrected=await scanPhotoSource(source,{...scan,enabled:true,enhance},{signal});
    try{const canvas=drawTabImage(corrected,0,2083),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);canvas.width=canvas.height=0;
     const result=await geometryInWorker(pixels,1,signal,[],'tab',true,6,true);
     results.push({enhance,staffs:result.staffs.map(s=>({y:s.y,bars:s.measures.length,candidates:s.candidates.length})),correction:result.cameraCorrection?.method});
    }finally{corrected.close();}
   }}finally{source.close();}return {scan,results};
  });reports.push({id:item.id,...result});console.log(JSON.stringify(reports.at(-1)));await writeFile(out+'/report.json',JSON.stringify(reports,null,2));
 }
}finally{await browser.close();await server.close();}
