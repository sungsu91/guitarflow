import {writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out='artifacts/import-source-20261006',server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();const browser=await qualityBrowser();
try{
 const page=await browser.newPage();await page.route('**/__probe',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__probe`);await page.locator('input').setInputFiles('C:/Users/User/Desktop/sheet music/(보컬)도레미파.pdf');
 const result=await page.evaluate(async()=>{
  const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js'),{cropNotationSystems}=await import('/src/omr/staffSystems.js'),{createStaffOmrClient}=await import('/src/omr/staffOmrClient.js'),{parseStaffTokens}=await import('/src/omr/staffTokens.js');
  const task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()));let omr;
  try{
   const pdf=await task.promise,p=await pdf.getPage(2),v=p.getViewport({scale:3.5}),c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;
   const im=c.getContext('2d').getImageData(0,0,c.width,c.height),systems=cropNotationSystems(im.data,im.width,im.height),s=systems[0],loadStart=performance.now();omr=await createStaffOmrClient();const loadMs=performance.now()-loadStart,start=performance.now();
   try{const raw=await omr.recognize({rgba:s.rgba,width:s.width,height:s.height});return {fileName:'(보컬)도레미파.pdf',page:2,staff:1,staffs:systems.length,loadMs,readMs:performance.now()-start,raw,parsed:parseStaffTokens(raw.text),geometryBars:s.measures.length};}
   catch(e){return {fileName:'(보컬)도레미파.pdf',page:2,staff:1,loadMs,readMs:performance.now()-start,error:e.message};}
  }finally{omr?.close();await task.destroy();}
 });
 await writeFile(`${out}/doremi-p2-first-read.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({loadMs:result.loadMs,readMs:result.readMs,error:result.error,raw:result.raw}));
}finally{await browser.close();await server.close();}
