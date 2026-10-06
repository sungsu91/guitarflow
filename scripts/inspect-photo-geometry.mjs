import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const [manifestPath,out,...ids]=process.argv.slice(2),manifest=JSON.parse(await readFile(manifestPath));await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const browser=await qualityBrowser();
try{for(const item of manifest.cases.filter(c=>ids.includes(c.id))){
 const page=await browser.newPage();await page.route('**/__geo',r=>r.fulfill({body:'<input type="file">',contentType:'text/html'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__geo`);await page.locator('input').setInputFiles(item.path);
 const result=await page.evaluate(async()=>{
  const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js');const {analyseGeometry,binaryPage,detectStaffs,detectTabStaffs,detectBarlines}=await import('/src/pdf/tab-import/geometry.js');
  const {normalizePhotoPaper,photoStaffTracks,rectifyPhotoStaffs,straightScanTrack,rectifyStraightScan,CAMERA_TAB_CONFIG}=await import('/src/pdf/tab-import/cameraPhotoGeometry.js');
  const src=await loadTabImage(document.querySelector('input').files[0]),canvas=drawTabImage(src),im=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);src.close();
  const norm=normalizePhotoPaper(im.data,im.width,im.height),tracks=photoStaffTracks(norm,im.width,im.height),straight=straightScanTrack(tracks,im.width,im.height),rows=[];
  const variants=[['original',im.data],['normalized',norm],...(tracks.length?[['curved',rectifyPhotoStaffs(norm,im.width,im.height,tracks)]]:[]),...(straight?[['rotated',rectifyStraightScan(im.data,im.width,im.height,straight).rgba],['rotated-normalized',rectifyStraightScan(norm,im.width,im.height,straight).rgba]]:[])];
  for(const [name,rgba]of variants){
   const ink=binaryPage(rgba,im.width,im.height),s=detectTabStaffs(binaryPage(rgba,im.width,im.height,230),im.width,im.height,CAMERA_TAB_CONFIG),g=analyseGeometry({rgba,width:im.width,height:im.height,page:1,config:CAMERA_TAB_CONFIG});
   rows.push({name,staffs:s.map(s=>({...s,...detectBarlines(ink,im.width,s)})),accepted:g.staffs.map(s=>({id:s.id,barCount:s.measures.length,candidates:s.candidates.length})),notation:detectStaffs(binaryPage(rgba,im.width,im.height,230),im.width,im.height,undefined,5)});
  }
  return {width:im.width,height:im.height,tracks,straight,rows};
 });await writeFile(`${out}/${item.id}.json`,JSON.stringify(result));console.log(item.id,JSON.stringify({tracks:result.tracks.length,straight:!!result.straight,rows:result.rows.map(r=>({name:r.name,staffs:r.staffs.length,accepted:r.accepted}))}));await page.close();
}}finally{await browser.close();await server.close();}
