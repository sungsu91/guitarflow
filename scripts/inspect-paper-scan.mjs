import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const [manifestPath,out='artifacts/paper-scan-20261005/previews']=process.argv.slice(2),manifest=JSON.parse(await readFile(manifestPath));await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,open:false}});await server.listen();const browser=await qualityBrowser(),reports=[];
try{
 const page=await browser.newPage();await page.route('**/__paper',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__paper`);
 for(const item of manifest.cases){
  await page.locator('input').setInputFiles(item.path);
  const result=await page.evaluate(async()=>{
   const {loadTabImage,drawTabImage}=await import('/src/pdf/tab-import/imageTabSource.js'),{dominantPaperQuad,detectPaperQuad,warpPaperPixels,enhancePaperPixels}=await import('/src/pdf/tab-import/paperScanGeometry.js');
   const source=await loadTabImage(document.querySelector('input').files[0]),small=drawTabImage(source,0,420),ctx=small.getContext('2d',{willReadFrequently:true}),pixels=ctx.getImageData(0,0,small.width,small.height),detected=detectPaperQuad(pixels.data,small.width,small.height);
   const raw=drawTabImage(source,0,1080),r=raw.getContext('2d',{willReadFrequently:true}).getImageData(0,0,raw.width,raw.height),warped=warpPaperPixels(r.data,r.width,r.height,detected.quad),enhanced=enhancePaperPixels(warped.data,warped.width,warped.height),canvas=document.createElement('canvas');canvas.width=warped.width;canvas.height=warped.height;canvas.getContext('2d').putImageData(new ImageData(enhanced,warped.width,warped.height),0,0);
   ctx.resetTransform();ctx.strokeStyle='#ff3050';ctx.lineWidth=2;ctx.beginPath();detected.quad.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p.x*small.width,p.y*small.height));ctx.closePath();ctx.stroke();
   const value={detected,preview:small.toDataURL('image/png'),scanned:canvas.toDataURL('image/png')};source.close();return value;
  });
  for(const key of ['preview','scanned'])await writeFile(`${out}/${item.id}-${key}.png`,Buffer.from(result[key].split(',')[1],'base64'));
  reports.push({id:item.id,...result.detected});console.log(JSON.stringify(reports.at(-1)));
 }
}finally{await writeFile(out+'/report.json',JSON.stringify(reports,null,2));await browser.close();await server.close();}

