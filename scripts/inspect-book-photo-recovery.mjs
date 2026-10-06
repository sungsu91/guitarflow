import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const [out='artifacts/book-photo-followup-20261006/diagnostics',...ids]=process.argv.slice(2);
const manifest=JSON.parse(await readFile('artifacts/book-photo-20261005/manifest.json'));await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();
const browser=await qualityBrowser();
try{
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);await page.setContent('<input type="file">');
 for(const item of manifest.cases.filter(c=>!ids.length||ids.includes(c.id))){
  await page.locator('input').setInputFiles(item.path);
  const result=await page.evaluate(async()=>{
   const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js');
   const {normalizePhotoPaper,photoStaffTracks,rectifyPhotoStaffs,CAMERA_TAB_CONFIG}=await import('/src/pdf/tab-import/cameraPhotoGeometry.js');
   const {analyseGeometry,binaryPage,detectTabStaffs,detectBarlines,removeStaffRules,fretComponents}=await import('/src/pdf/tab-import/geometry.js');
   const source=await loadTabImage(document.querySelector('input').files[0]);
   try{
    const canvas=drawTabImage(source,0,2083),{width,height}=canvas,ctx=canvas.getContext('2d',{willReadFrequently:true});
    const normalized=normalizePhotoPaper(ctx.getImageData(0,0,width,height).data,width,height),tracks=photoStaffTracks(normalized,width,height);
    const rgba=rectifyPhotoStaffs(normalized,width,height,tracks),ink=binaryPage(rgba,width,height),lines=binaryPage(rgba,width,height,CAMERA_TAB_CONFIG.lineThreshold);
    const detected=detectTabStaffs(lines,width,height,{...CAMERA_TAB_CONFIG,minStaffWidth:.55});
    console.log("notation",detectTabStaffs(lines,width,height,{...CAMERA_TAB_CONFIG,minStaffWidth:.55},5)); const notation=detectTabStaffs(lines,width,height,{...CAMERA_TAB_CONFIG,minStaffWidth:.55},5);const stages=detected.map(s=>({...s,...detectBarlines(ink,width,s,{camera:true,ruleInk:lines}),parts:fretComponents(removeStaffRules(ink,width,height,s),width,height,s)}));
    const profile=tracks.map(t=>({center:t.center,spacing:t.spacing,rows:Array.from({length:t.spacing*7},(_,k)=>{const y=Math.round(t.center-t.spacing*3.5+k);let count=0;for(let x=0;x<width;x++)count+=lines[y*width+x];return [y,count];})}));
    ctx.putImageData(new ImageData(rgba,width,height),0,0);
    const recovered=analyseGeometry({rgba,width,height,page:1,config:CAMERA_TAB_CONFIG});
    return {width,height,tracks,notation,stages,profile,recovered:recovered.staffs.map(s=>({y:s.y,bars:s.measures.length,candidates:s.candidates.length})),png:canvas.toDataURL()};
   }finally{source.close();}
  });
  const {png,...data}=result;await writeFile(`${out}/${item.id}.png`,Buffer.from(png.split(',')[1],'base64'));await writeFile(`${out}/${item.id}.json`,JSON.stringify(data,null,2));
  console.log(JSON.stringify({id:item.id,tracks:data.tracks.length,stages:data.stages.map(s=>({y:s.y,spacing:s.spacing,thickness:s.thickness,bars:s.bars,parts:s.parts.length,aligned:s.parts.filter(p=>p.stringDistance<.22).length})),recovered:data.recovered}));
 }
}finally{await browser.close();await server.close();}


