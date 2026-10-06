import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const [manifestPath,out,...ids]=process.argv.slice(2);
const manifest=JSON.parse(await readFile(manifestPath));await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();
const browser=await qualityBrowser();
try{
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
 await page.setContent('<input type="file">');
 for(const item of manifest.cases.filter(c=>!ids.length||ids.includes(c.id))){
  await page.locator('input').setInputFiles(item.path);
  const result=await page.evaluate(async()=>{
   const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js');
   const {normalizePhotoPaper,photoStaffTracks,rectifyPhotoStaffs,CAMERA_TAB_CONFIG}=await import('/src/pdf/tab-import/cameraPhotoGeometry.js');
   const {analyseGeometry}=await import('/src/pdf/tab-import/geometry.js');
   const source=await loadTabImage(document.querySelector('input').files[0]);
   try{
    const canvas=drawTabImage(source,0,2083),{width,height}=canvas;
    const raw=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,width,height).data;
    const normalized=normalizePhotoPaper(raw,width,height),tracks=photoStaffTracks(normalized,width,height);
    const recovered=tracks.length?analyseGeometry({rgba:rectifyPhotoStaffs(normalized,width,height,tracks),width,height,page:1,config:CAMERA_TAB_CONFIG}):null;
    return {width,height,tracks,recovered:recovered?.staffs.map(s=>({y:s.y,spacing:s.spacing,bars:s.measures.length,candidates:s.candidates.length}))};
   }finally{source.close();}
  });
  await writeFile(`${out}/${item.id}.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify({id:item.id,tracks:result.tracks.map(t=>({center:t.center,points:t.points.length,spacing:t.spacing})),recovered:result.recovered}));
 }
}finally{await browser.close();await server.close();}
