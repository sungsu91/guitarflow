import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {qualityBrowser} from './quality-runtime.mjs';
const out='artifacts/import-source-20261006';await mkdir(out,{recursive:true});
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();const browser=await qualityBrowser(),reports=[];
try{for(const [id,name] of [['now','(보컬)NOW.pdf'],['light','(보컬)Into The Light.pdf'],['doremi','(보컬)도레미파.pdf']]){
 const path=`C:/Users/User/Desktop/sheet music/${name}`,page=await browser.newPage();
 await page.route('**/__vocal',r=>r.fulfill({contentType:'text/html',body:'<input type="file">'}));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__vocal`);await page.locator('input').setInputFiles(path);
 const result=await page.evaluate(async()=>{
  const {loadTabPdf}=await import('/src/pdf/tab-import/loadTabPdf.js'),{cropNotationSystems}=await import('/src/omr/staffSystems.js');
  const task=loadTabPdf(new Uint8Array(await document.querySelector('input').files[0].arrayBuffer()));
  const pdf=await task.promise,p=await pdf.getPage(2),v=p.getViewport({scale:3.5}),canvas=document.createElement('canvas');canvas.width=Math.ceil(v.width);canvas.height=Math.ceil(v.height);
  await p.render({canvasContext:canvas.getContext('2d'),viewport:v}).promise;
  const im=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),systems=cropNotationSystems(im.data,im.width,im.height),s=systems[0];
  const c=document.createElement('canvas');c.width=s.width;c.height=s.height;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(s.rgba),s.width,s.height),0,0);
  const report={pages:pdf.numPages,page2:{staffs:systems.length,measures:systems.map(s=>s.measures.length),firstStaff:c.toDataURL(),pagePreview:(await import('/src/pdf/tab-import/importActivity.js')).importSourcePreview(canvas)}};
  await task.destroy();return report;
 });
 await writeFile(`${out}/${id}-p2-first-staff.png`,Buffer.from(result.page2.firstStaff.split(',')[1],'base64'));delete result.page2.firstStaff;
 await writeFile(`${out}/${id}-p2-preview.json`,JSON.stringify(result.page2.pagePreview));delete result.page2.pagePreview;
 reports.push({id,path,sha256:createHash('sha256').update(await readFile(path)).digest('hex'),...result});console.log(JSON.stringify(reports.at(-1)));await page.close();
}}finally{await writeFile(`${out}/vocal-inputs.json`,JSON.stringify(reports,null,2));await browser.close();await server.close();}
